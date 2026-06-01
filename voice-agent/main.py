import os
import json
import logging
import asyncio
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, WebSocket, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pymongo import MongoClient

from gemini_session import GeminiLiveSession

ROOT = Path(__file__).resolve().parent.parent
BRIDGE_DIR = Path(__file__).resolve().parent

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load environment configs
load_dotenv(ROOT / ".env.local")
load_dotenv(ROOT / ".env")
load_dotenv(BRIDGE_DIR / ".env", override=True)

# Map GOOGLE_API_KEY to GEMINI_API_KEY fallback
if not os.getenv("GEMINI_API_KEY") and os.getenv("GOOGLE_API_KEY"):
    os.environ["GEMINI_API_KEY"] = os.getenv("GOOGLE_API_KEY")

# Global MongoDB Client
mongo_client = None
db = None
active_sessions = {}

def check_outside_operating_hours(tenant):
    """
    Returns True if the current local time is outside the restaurant's opening hours.
    """
    if not tenant or not tenant.get("settings"):
        return False
        
    settings = tenant.get("settings")
    if not settings.get("isOpen", True):
        # Manual override closed
        return True
        
    opening_hours = settings.get("openingHours", [])
    if not opening_hours:
        return False
        
    # Get current time in London timezone
    tz_name = settings.get("timezone", "Europe/London")
    now_utc = datetime.now(timezone.utc)
    
    tz = None
    try:
        from zoneinfo import ZoneInfo
        tz = ZoneInfo(tz_name)
    except Exception:
        try:
            import pytz
            tz = pytz.timezone(tz_name)
        except Exception:
            pass
            
    now_tz = now_utc.astimezone(tz) if tz else now_utc
    
    # Check weekday (Sunday=0, Saturday=6 in JS/Tenant settings)
    py_weekday = now_tz.weekday() # Monday=0, Sunday=6
    ui_weekday = (py_weekday + 1) % 7 # Monday=1, Sunday=0, Saturday=6
    
    # Find matching day schedule
    day_schedule = next((h for h in opening_hours if h.get("day") == ui_weekday), None)
    if not day_schedule or day_schedule.get("isClosed", False):
        logger.info(f"Operating hours check: closed on weekday {ui_weekday}")
        return True
        
    # Check hour range
    try:
        start_str = day_schedule.get("open", "16:00")
        end_str = day_schedule.get("close", "23:00")
        current_time_str = now_tz.strftime("%H:%M")
        
        # Handle overnight hours (e.g. open 12:00, close 01:00 next day)
        if end_str < start_str:
            is_open = current_time_str >= start_str or current_time_str <= end_str
            is_outside = not is_open
        else:
            is_outside = current_time_str < start_str or current_time_str > end_str
            
        logger.info(f"Operating hours check: timezone={tz_name}, time={current_time_str}, range={start_str}-{end_str}. Outside={is_outside}")
        return is_outside
    except Exception as e:
        logger.error(f"Error checking operating hours: {e}")
        return False

@asynccontextmanager
async def lifespan(app: FastAPI):
    global mongo_client, db
    
    # Enable high-precision timer on Windows
    winmm = None
    import sys
    if sys.platform == 'win32':
        try:
            import ctypes
            winmm = ctypes.WinDLL('winmm')
            winmm.timeBeginPeriod(1)
            logger.info("Set Windows timer resolution to 1ms")
        except Exception as e:
            logger.warning(f"Failed to set Windows timer resolution: {e}")
            winmm = None

    if not os.getenv("GEMINI_API_KEY"):
        logger.error("GEMINI_API_KEY is not set. Calls cannot be bridged to Gemini Live.")

    mongo_uri = os.getenv("MONGODB_URI")
    if mongo_uri:
        try:
            mongo_client = MongoClient(mongo_uri, serverSelectionTimeoutMS=800)
            mongo_client.admin.command('ping')
            db = mongo_client.get_database() # Uses default db in uri
            logger.info(f"Connected to MongoDB successfully: {db.name}")
        except Exception as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            db = None
    yield
    if mongo_client is not None:
        mongo_client.close()
        
    # Restore Windows timer resolution
    if winmm is not None:
        try:
            winmm.timeEndPeriod(1)
            logger.info("Restored Windows timer resolution")
        except Exception as e:
            logger.error(f"Failed to restore Windows timer resolution: {e}")

app = FastAPI(lifespan=lifespan)

allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001,http://localhost:3002").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in allowed_origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_agent_profile(dialed_number=None):
    """Fetch the active tenant profile from the tenants collection."""
    if db is None:
        logger.warning("No database connection. Using fallback profile.")
        return None

    try:
        if dialed_number:
            clean_number = dialed_number.replace("+", "").replace(" ", "")
            profile = db.tenants.find_one(
                {
                    "isActive": True,
                    "$or": [
                        {"phone": dialed_number},
                        {"phone": clean_number},
                        {"twilioPhoneNumber": dialed_number},
                        {"twilioPhoneNumber": clean_number}
                    ]
                },
                sort=[("createdAt", -1)]
            )
            if profile:
                logger.info(f"Matched incoming call to tenant: {profile.get('businessName')} via phone number {dialed_number}")
                return profile

        # Fallback to the first tenant
        profile = db.tenants.find_one(
            {"isActive": True},
            sort=[("createdAt", -1)]
        )
        return profile
    except Exception as e:
        logger.error(f"Error fetching profile: {e}")
        return None

@app.get("/health")
async def health():
    active_profile = await asyncio.to_thread(get_agent_profile) if db is not None else None
    return {
        "ok": bool(os.getenv("GEMINI_API_KEY")),
        "geminiConfigured": bool(os.getenv("GEMINI_API_KEY")),
        "mongoConfigured": db is not None,
        "database": db.name if db is not None else None,
        "activeProfile": active_profile.get("businessName") if active_profile else None,
    }

@app.post("/incoming-call")
async def incoming_call(request: Request):
    """
    Twilio Voice Webhook.
    Serves TwiML connecting the call to our WebSocket stream.
    Checks operating hours before routing.
    """
    consent_msg = os.getenv("RECORDING_CONSENT_MESSAGE", "This call may be recorded for quality and training purposes. An automated AI assistant will take your order.")

    if not os.getenv("GEMINI_API_KEY"):
        logger.error("Rejecting incoming call because GEMINI_API_KEY is not configured.")
        twiml = """<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say>Sorry, this AI assistant is not configured yet. Please try again later.</Say>
</Response>"""
        return Response(content=twiml, media_type="text/xml", status_code=503)

    form_data = await request.form()
    caller_number = form_data.get("From", "")
    dialed_number = form_data.get("To", "")

    profile = await asyncio.to_thread(get_agent_profile, dialed_number)
    
    if profile:
        # Check operating hours
        if check_outside_operating_hours(profile):
            logger.info("Restaurant is closed. Playing after-hours message.")
            twiml = """<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say>Thank you for calling. We are currently closed. Our opening hours are listed on our website. Goodbye.</Say>
    <Hangup/>
</Response>"""
            return Response(content=twiml, media_type="text/xml")
            
        if not profile.get("voiceAgentEnabled", True):
            logger.info(f"Voice agent disabled for tenant {profile.get('businessName')}. Forwarding to staff.")
            transfer_num = profile.get("phone") or "+441942555123"
            twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say>Connecting your call to the restaurant staff.</Say>
    <Dial>{transfer_num}</Dial>
</Response>"""
            return Response(content=twiml, media_type="text/xml")

    # Connect to custom WebSocket bridge
    host = request.headers.get("host")
    protocol = request.headers.get("x-forwarded-proto", "http")
    ws_protocol = "wss" if protocol == "https" or "ngrok" in host else "ws"
    ws_url = f"{ws_protocol}://{host}/media-stream"
    
    logger.info(f"Directing custom websocket bridge call to {ws_url}")
    
    twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say>{consent_msg}</Say>
    <Connect>
        <Stream url="{ws_url}">
            <Parameter name="callerNumber" value="{caller_number}" />
            <Parameter name="dialedNumber" value="{dialed_number}" />
        </Stream>
    </Connect>
</Response>"""
    return Response(content=twiml, media_type="text/xml")

def _fetch_caller_history_sync(db, caller_number):
    customer = db.customers.find_one({"phone": caller_number})
    customer_name = customer.get("name") if customer else None
    contact_notes = customer.get("notes") if customer else None

    active_profile = db.tenants.find_one(
        {"isActive": True},
        sort=[("createdAt", -1)],
    )

    # Search voice call logs
    cursor = db.voicecalllogs.find({"callerNumber": caller_number}).sort("createdAt", -1).limit(3)
    calls = list(cursor)
    return active_profile, customer_name, contact_notes, calls

async def get_caller_history_context(db, caller_number):
    if db is None or not caller_number:
        return ""
    try:
        active_profile, customer_name, contact_notes, calls = await asyncio.to_thread(
            _fetch_caller_history_sync, db, caller_number
        )
        
        if not customer_name and not contact_notes and not calls:
            return ""

        name_part = f"Customer Name: {customer_name}" if customer_name else "Customer Name: Unknown (Returning caller)"
        notes_part = f"CRM Profile Notes: {contact_notes}" if contact_notes else ""
        
        history_parts = []
        for call in calls:
            date_str = call.get("createdAt").strftime("%Y-%m-%d %H:%M") if call.get("createdAt") else "Unknown Date"
            user_tx = call.get("userTranscript", "").strip()
            agent_tx = call.get("agentTranscript", "").strip()
            
            summary = f"- Call on {date_str} (Duration: {call.get('durationSeconds', 0)}s):"
            if user_tx:
                summary += f"\n    Customer: \"{user_tx[:120]}...\""
            if agent_tx:
                summary += f"\n    Agent: \"{agent_tx[:120]}...\""
            history_parts.append(summary)
            
        history_text = "\n".join(history_parts)
        
        injected_context = f"\n\n[System Info: Returning Customer. Phone number is {caller_number}.\n"
        injected_context += f"{name_part}.\n"
        if notes_part:
            injected_context += f"{notes_part}.\n"
        if history_text:
            injected_context += f"Here is the history of their last {len(calls)} call(s):\n{history_text}\n"
        injected_context += "Greet them back contextually.]"
        
        return injected_context
    except Exception as e:
        logger.error(f"Error fetching caller history context: {e}")
        return ""

@app.websocket("/media-stream")
async def media_stream(websocket: WebSocket):
    await websocket.accept()
    logger.info("Twilio Media Stream WebSocket connected.")
    if not os.getenv("GEMINI_API_KEY"):
        await websocket.close(code=1011)
        return
    
    gemini_session = None
    stream_sid = None
    caller_number = None

    try:
        while True:
            message = await websocket.receive_text()
            data = json.loads(message)
            event = data.get("event")

            if event == "start":
                stream_sid = data["start"]["streamSid"]
                call_sid = data["start"]["callSid"]
                custom_params = data["start"].get("customParameters", {})
                caller_number = custom_params.get("callerNumber", "")
                dialed_number = custom_params.get("dialedNumber", "")
                logger.info(f"Stream started. StreamSid: {stream_sid}, CallSid: {call_sid}, Caller: {caller_number}, Dialed: {dialed_number}")
                
                profile = await asyncio.to_thread(get_agent_profile, dialed_number)
                if profile:
                    system_prompt_base = profile.get("voiceAgentPrompt") or "You are a warm ordering assistant for Papa's Pizza & Grill. Help the customer order."
                    voice_name = profile.get("voiceAgentVoice") or "Aoede"
                    
                    settings = profile.get("settings", {})
                    address_dict = profile.get("address", {})
                    addr_str = f"{address_dict.get('line1', '')}, {address_dict.get('city', '')}, {address_dict.get('postcode', '')}"
                    hours_desc = "Open daily from afternoon till late night."
                    
                    try:
                        system_prompt = system_prompt_base.format(
                            RESTAURANT_NAME=profile.get("businessName", "Papa's Pizza & Grill"),
                            RESTAURANT_ADDRESS=addr_str,
                            RESTAURANT_PHONE=profile.get("phone", ""),
                            OPERATING_HOURS=hours_desc,
                            DELIVERY_TIME=str(settings.get("deliveryLeadMinutes", 45)),
                            COLLECTION_TIME=str(settings.get("collectionLeadMinutes", 20))
                        )
                    except Exception:
                        system_prompt = system_prompt_base
                else:
                    system_prompt = "You are an AI order-taking assistant for Papa's Pizza & Grill. Help the customer place their order."
                    voice_name = "Aoede"
                
                # Append operational instructions for handling existing order actions
                instructions_suffix = """\n
Guidelines for managing orders:
1. To look up or check the status of an order, call the 'get_order' tool.
2. To cancel an order, verify the order details using 'get_order', verify that the status is 'placed' or 'confirmed' (do NOT cancel if it is 'preparing' or later), and then call 'cancel_order'.
3. To modify an order, verify the order using 'get_order' first. If the status is 'preparing' or later, inform the customer that their order is already being prepared/cooked and call 'transfer_to_human'. Otherwise, call 'modify_order' with the updated items array, and summarize the new total.
4. Transfer calls to a human using 'transfer_to_human' if the customer requests a human, is confused, or has a complaint.
"""
                history_context = ""
                if db is not None and caller_number:
                    history_context = await get_caller_history_context(db, caller_number)
                
                active_prompt = system_prompt + instructions_suffix
                if history_context:
                    active_prompt += "\n" + history_context
                
                gemini_session = GeminiLiveSession(
                    websocket=websocket,
                    stream_sid=stream_sid,
                    system_prompt=active_prompt,
                    voice_name=voice_name,
                    call_sid=call_sid,
                    caller_number=caller_number,
                    db=db,
                    profile=profile,
                )
                await gemini_session.start()
                
                active_sessions[call_sid] = {
                    "call_sid": call_sid,
                    "stream_sid": stream_sid,
                    "caller_number": caller_number,
                    "dialed_number": dialed_number,
                    "started_at": datetime.now(timezone.utc).isoformat(),
                    "business_name": profile.get("businessName") if profile else "Papa's Pizza & Grill",
                    "status": "in-progress",
                    "gemini_session": gemini_session
                }

            elif event == "media":
                payload = data["media"]["payload"]
                if gemini_session:
                    await gemini_session.receive_audio(payload)

            elif event == "stop":
                logger.info(f"Stream {stream_sid} stopped.")
                if gemini_session:
                    await gemini_session.stop()
                    gemini_session = None
                break

    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        if gemini_session:
            await gemini_session.stop()
        if 'call_sid' in locals() and call_sid in active_sessions:
            del active_sessions[call_sid]
        logger.info("WebSocket connection closed.")

@app.get("/api/active-calls")
async def get_active_calls():
    active_list = []
    for sid, sess in active_sessions.items():
        gemini_sess = sess.get("gemini_session")
        active_list.append({
            "callSid": sess["call_sid"],
            "callerNumber": sess["caller_number"],
            "dialedNumber": sess["dialed_number"],
            "startedAt": sess["started_at"],
            "businessName": sess["business_name"],
            "status": sess["status"],
            "transcript": gemini_sess.transcript_timeline if gemini_sess else []
        })
    return active_list

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
