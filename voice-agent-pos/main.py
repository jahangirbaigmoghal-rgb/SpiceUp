import os
import json
import logging
import asyncio
import sys
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient

from config import Config
from gemini_bridge import GeminiBridge
from system_prompt import build_system_prompt, format_operating_hours
import pos_tools

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

# Active session tracking
active_sessions = {}
mongo_client = None
db = None

def check_outside_operating_hours(settings: dict) -> bool:
    """
    Checks if the current UK time is outside the store's opening hours.
    """
    if not settings:
        return False
        
    if not settings.get("storeIsOpen", True):
        logger.info("Operating hours check: storeIsOpen is manually toggled false.")
        return True # Store is manually set to closed
        
    open_time_str = settings.get("storeOpenTime", "16:00")
    close_time_str = settings.get("storeCloseTime", "23:30")
    
    try:
        from zoneinfo import ZoneInfo
        london_tz = ZoneInfo("Europe/London")
    except Exception:
        try:
            import pytz
            london_tz = pytz.timezone("Europe/London")
        except Exception:
            london_tz = None
            
    now_utc = datetime.now(timezone.utc)
    now_local = now_utc.astimezone(london_tz) if london_tz else now_utc
    current_time_str = now_local.strftime("%H:%M")
    
    if close_time_str < open_time_str:
        # Overnight hours, e.g. open 16:00, close 01:30 (next day)
        is_open = current_time_str >= open_time_str or current_time_str <= close_time_str
        is_outside = not is_open
    else:
        is_open = open_time_str <= current_time_str <= close_time_str
        is_outside = not is_open
        
    logger.info(f"Operating hours check: time={current_time_str}, range={open_time_str}-{close_time_str}, Outside={is_outside}")
    return is_outside

async def get_caller_history_context(database, caller_number: str) -> str:
    """
    Queries database for customer records and previous call transcripts.
    """
    if database is None or not caller_number:
        return ""
        
    try:
        def _sync_lookup():
            # Lookup customer by phone
            customer = database.customers.find_one({"phone": caller_number})
            
            # Lookup last 3 voice logs
            voice_logs = list(
                database.voicecalllogs.find({"callerNumber": caller_number})
                .sort("createdAt", -1)
                .limit(3)
            )
            return customer, voice_logs

        customer, voice_logs = await asyncio.to_thread(_sync_lookup)
        
        if not customer and not voice_logs:
            return ""
            
        context_parts = []
        if customer:
            name = customer.get("name", "Unknown")
            addresses = customer.get("addresses", [])
            addr_strs = [f"{a.get('line1', '')} ({a.get('postcode', '')})" for a in addresses if a.get("isDefault")]
            addr_str = addr_strs[0] if addr_strs else "No default address"
            context_parts.append(f"Customer Name: {name}\nCustomer Default Address: {addr_str}")
            
        if voice_logs:
            context_parts.append("History of last call(s):")
            for log in voice_logs:
                created_at = log.get("createdAt")
                date_str = created_at.strftime("%Y-%m-%d %H:%M") if created_at else "Unknown Date"
                summary = log.get("postCallAnalysis", {}).get("summary", "No call summary")
                order_ref = log.get("orderReference")
                order_status = f"(Order Ref: {order_ref})" if order_ref else ""
                
                context_parts.append(f"- Date: {date_str} {order_status} | Summary: {summary}")
                
        history_context = "\n".join(context_parts)
        logger.info(f"Retrieved caller history context for phone {caller_number}")
        return f"\n\nCALLER PROFILE & HISTORY:\n{history_context}"
    except Exception as e:
        logger.error(f"Error fetching caller history context: {e}")
        return ""

@asynccontextmanager
async def lifespan(app: FastAPI):
    global mongo_client, db
    
    # Load config settings
    config = Config.from_env()
    app.state.config = config
    
    # Enable high-precision Windows timer resolution if on Windows
    winmm = None
    if sys.platform == 'win32':
        try:
            import ctypes
            winmm = ctypes.WinDLL('winmm')
            winmm.timeBeginPeriod(1)
            logger.info("Set Windows timer resolution to 1ms for pacing accuracy.")
        except Exception as e:
            logger.warning(f"Could not adjust Windows timer resolution: {e}")

    # Establish MongoDB Connection
    try:
        mongo_client = MongoClient(config.mongodb_uri, serverSelectionTimeoutMS=2000)
        mongo_client.admin.command('ping')
        
        # Try getting default database
        try:
            db = mongo_client.get_database()
            db_name = db.name if db is not None else None
        except Exception as db_err:
            logger.warning(f"Could not get default database, trying to list: {db_err}")
            db_name = None
            
        # Force "test" database to align with the active Vercel production backend database
        db_name = "test"
                
        db = mongo_client[db_name]
        logger.info(f"MongoDB connection established on database: {db.name}")
        app.state.db = db
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        db = None
        app.state.db = None
        
    yield
    
    # Close resources
    if mongo_client:
        mongo_client.close()
        logger.info("MongoDB connection closed.")
        
    if winmm is not None:
        try:
            winmm.timeEndPeriod(1)
            logger.info("Restored standard Windows timer resolution.")
        except Exception:
            pass

app = FastAPI(lifespan=lifespan)

# CORS Middleware setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health(request: Request):
    database = request.app.state.db
    mongo_configured = database is not None
    database_name = database.name if mongo_configured else None
    
    active_profile = None
    if mongo_configured:
        try:
            tenant = database.tenants.find_one({"isActive": True})
            if tenant:
                active_profile = tenant.get("businessName")
        except Exception as e:
            logger.error(f"Error querying active tenant profile: {e}")
            
    return {
        "ok": True,
        "mongoConfigured": mongo_configured,
        "database": database_name,
        "activeProfile": active_profile,
    }

@app.post("/incoming-call")
async def incoming_call(request: Request):
    """
    Twilio voice incoming call webhook. Validates operating hours, plays consent message, 
    and bridges connection to websocket stream.
    """
    config = request.app.state.config
    
    if not config.gemini_api_key:
        logger.error("Incoming call rejected: GEMINI_API_KEY is not configured.")
        twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
        <Response>
            <Say>Sorry, the voice ordering assistant is currently unconfigured. Please try again later.</Say>
        </Response>"""
        return Response(content=twiml, media_type="text/xml", status_code=503)

    # Parse incoming webhook params
    form_data = await request.form()
    caller_number = form_data.get("From", "")
    dialed_number = form_data.get("To", "")
    call_sid = form_data.get("CallSid", "")
    
    logger.info(f"Incoming call webhook received. Caller: {caller_number}, Dialed: {dialed_number}, CallSid: {call_sid}")

    # Fetch store settings from POS backend public API
    settings_res = await pos_tools.get_store_settings()
    settings = settings_res.get("settings", {})
    
    # Check if voice agent is enabled (connect/disconnect toggle)
    voice_agent_enabled = settings.get("voiceAgentEnabled", True)
    if not voice_agent_enabled:
        logger.info("Incoming call rejected: Voice agent is deactivated in settings.")
        store_name = settings.get("storeName", config.restaurant_name)
        twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
        <Response>
            <Say>Thank you for calling {store_name}. Our AI ordering assistant is currently offline. Please call back later or order online. Goodbye.</Say>
            <Hangup/>
        </Response>"""
        return Response(content=twiml, media_type="text/xml")
        
    # Check if restaurant is closed (commented out to allow pre-orders via media_stream websocket prompt injection)
    # if check_outside_operating_hours(settings):
    #     store_name = settings.get("storeName", config.restaurant_name)
    #     open_time = settings.get("storeOpenTime", "16:00")
    #     twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
    #     <Response>
    #         <Say>Thank you for calling {store_name}. We are currently closed. Our opening hours are daily from {open_time} onwards. Goodbye.</Say>
    #         <Hangup/>
    #     </Response>"""
    #     return Response(content=twiml, media_type="text/xml")

    # Generate WebSocket url pointing to /media-stream
    host = request.headers.get("host")
    protocol = request.headers.get("x-forwarded-proto", "http")
    ws_protocol = "wss" if protocol == "https" or "ngrok" in host else "ws"
    ws_url = f"{ws_protocol}://{host}/media-stream"

    logger.info(f"Routing Twilio stream connection to websocket path: {ws_url}")
    
    # Generate TwiML response connecting straight to media stream
    twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
    <Response>
        <Connect>
            <Stream url="{ws_url}">
                <Parameter name="callerNumber" value="{caller_number}" />
                <Parameter name="dialedNumber" value="{dialed_number}" />
            </Stream>
        </Connect>
    </Response>"""
    return Response(content=twiml, media_type="text/xml")

@app.websocket("/media-stream")
async def media_stream(websocket: WebSocket):
    await websocket.accept()
    logger.info("WebSocket media stream connection accepted.")
    
    config = websocket.app.state.config
    database = websocket.app.state.db
    
    bridge = None
    stream_sid = None
    call_sid = None
    caller_number = None

    try:
        while True:
            msg = await websocket.receive_text()
            data = json.loads(msg)
            event = data.get("event")

            if event == "start":
                stream_sid = data["start"]["streamSid"]
                call_sid = data["start"]["callSid"]
                custom_params = data["start"].get("customParameters", {})
                caller_number = custom_params.get("callerNumber", "")
                dialed_number = custom_params.get("dialedNumber", "")
                
                logger.info(f"Media stream start event. CallSid={call_sid}, StreamSid={stream_sid}")
                
                # Fetch settings from public API
                settings_res = await pos_tools.get_store_settings()
                settings = settings_res.get("settings", {})
                
                store_name = settings.get("storeName", config.restaurant_name)
                store_phone = settings.get("storePhone", config.restaurant_phone)
                store_address = settings.get("storeAddress", "123 High Street, Tunstall, Stoke-on-Trent, ST6 5EP")
                delivery_time = settings.get("estimatedDeliveryMinutes", 45)
                collection_time = settings.get("estimatedCollectionMinutes", 20)
                
                operating_hours_text = format_operating_hours(settings)
                
                # Get caller history
                caller_history = await get_caller_history_context(database, caller_number)
                
                # Check if restaurant is closed to handle pre-orders
                is_closed = check_outside_operating_hours(settings)
                
                # Resolve active model, voice and barge-in settings from database
                db_model = settings.get("voiceAgentModel")
                db_voice = settings.get("voiceAgentVoice")
                db_barge_in = settings.get("voiceAgentBargeInEnabled")
                
                from dataclasses import replace
                call_config = config
                if db_model:
                    call_config = replace(call_config, gemini_model=db_model)
                if db_voice:
                    call_config = replace(call_config, gemini_voice=db_voice)
                if db_barge_in is not None:
                    call_config = replace(call_config, barge_in_enabled=bool(db_barge_in))
                
                # Build system prompt dynamically
                system_prompt = build_system_prompt(
                    restaurant_name=store_name,
                    restaurant_phone=store_phone,
                    restaurant_address=store_address,
                    operating_hours_text=operating_hours_text,
                    delivery_time_mins=delivery_time,
                    collection_time_mins=collection_time,
                    caller_history_context=caller_history,
                    voice_name=call_config.gemini_voice
                )
                
                if is_closed:
                    open_time = settings.get("storeOpenTime", "16:00")
                    closed_instructions = (
                        f"\n\nCRITICAL SYSTEM NOTE: The restaurant is currently CLOSED. "
                        f"However, you MUST still take pre-orders for the next opening time ({open_time}). "
                        f"Inform the customer politely that the restaurant is closed right now but they can pre-order. "
                        f"If they place an order, you MUST append 'PRE-ORDER: {open_time}' to the notes field of the order."
                    )
                    system_prompt += closed_instructions
                
                # Create and start Gemini audio bridge
                bridge = GeminiBridge(
                    twilio_ws=websocket,
                    stream_sid=stream_sid,
                    call_sid=call_sid,
                    caller_number=caller_number,
                    system_prompt=system_prompt,
                    config=call_config,
                    db=database
                )
                await bridge.start()
                
                # Register in active sessions mapping
                active_sessions[call_sid] = {
                    "call_sid": call_sid,
                    "stream_sid": stream_sid,
                    "caller_number": caller_number,
                    "dialed_number": dialed_number,
                    "started_at": datetime.now(timezone.utc).isoformat(),
                    "store_name": store_name,
                    "bridge": bridge
                }
                logger.info(f"CallSid={call_sid} registered as active session.")

            elif event == "media":
                if bridge and bridge.is_running:
                    payload = data["media"]["payload"]
                    await bridge.receive_audio(payload)

            elif event == "stop":
                logger.info(f"WebSocket media stream stop event for streamSid={stream_sid}")
                if bridge:
                    await bridge.stop(status="completed")
                    bridge = None
                break

    except Exception as e:
        logger.error(f"WebSocket exception in media-stream: {e}")
    finally:
        if bridge:
            await bridge.stop(status="failed")
        if call_sid and call_sid in active_sessions:
            del active_sessions[call_sid]
        logger.info("WebSocket media-stream connection finalized and cleaned up.")

@app.get("/api/active-calls")
async def get_active_calls():
    calls_list = []
    for sid, session in active_sessions.items():
        bridge = session.get("bridge")
        calls_list.append({
            "callSid": session["call_sid"],
            "streamSid": session["stream_sid"],
            "callerNumber": session["caller_number"],
            "dialedNumber": session["dialed_number"],
            "startedAt": session["started_at"],
            "restaurantName": session["store_name"],
            "status": "in-progress" if (bridge and bridge.is_running) else "completed",
            "transcriptTimeline": bridge.transcript_timeline if bridge else []
        })
    return calls_list

if __name__ == "__main__":
    import uvicorn
    # Load config to resolve host and port
    cfg = Config.from_env()
    logger.info(f"Launching FastAPI application on {cfg.host}:{cfg.port}")
    uvicorn.run("main:app", host=cfg.host, port=cfg.port, reload=False)
