"""
LiveKit Voice Agent Blueprint.
Connects real-time WebRTC audio rooms to Google Gemini models using the livekit-agents SDK.
Usage:
    python livekit_agent.py dev
"""

import os
import asyncio
import logging
import json
from datetime import datetime, timezone
from dotenv import load_dotenv
from pymongo import MongoClient
from bson import ObjectId
from twilio.rest import Client as TwilioClient
from typing import Annotated
from call_store import save_call_record
from s3_store import is_s3_configured
from audio_splitter import split_stereo_ogg

from livekit import rtc
from livekit.agents import (
    AgentSession,
    Agent,
    JobContext,
    WorkerOptions,
    cli,
    llm,
    function_tool,
    AutoSubscribe,
    JobProcess,
    JobRequest,
)
from livekit.plugins.google.beta import realtime

# Load configurations
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
BRIDGE_DIR = Path(__file__).resolve().parent
load_dotenv(ROOT / ".env.local")
load_dotenv(ROOT / ".env")
load_dotenv(BRIDGE_DIR / ".env", override=True)

# Map GOOGLE_API_KEY to GEMINI_API_KEY fallback
if not os.getenv("GEMINI_API_KEY") and os.getenv("GOOGLE_API_KEY"):
    os.environ["GEMINI_API_KEY"] = os.getenv("GOOGLE_API_KEY")


# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("livekit-voice-agent")

# Connect to MongoDB
mongodb_uri = os.environ.get("MONGODB_URI")
mongodb_db = os.environ.get("MONGODB_DB", "aimate")
if mongodb_uri:
    try:
        client = MongoClient(mongodb_uri)
        db = client[mongodb_db]
        logger.info("Connected to MongoDB successfully.")
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        db = None
else:
    db = None

# Initialize Twilio Client
twilio_sid = os.environ.get("TWILIO_ACCOUNT_SID")
twilio_auth = os.environ.get("TWILIO_AUTH_TOKEN")
if twilio_sid and twilio_auth:
    twilio_client = TwilioClient(twilio_sid, twilio_auth)
    logger.info("Twilio client initialized.")
else:
    twilio_client = None


def get_agent_profile(db, dialed_number=None):
    """Fetch the active agent profile, matching by dialed number if provided, with fallback."""
    if db is None:
        return None
    try:
        if dialed_number:
            clean_number = dialed_number.replace("+", "").replace(" ", "")
            profile = db.businessProfiles.find_one(
                {
                    "status": "active",
                    "$or": [
                        {"phoneNumber": dialed_number},
                        {"phoneNumber": clean_number},
                        {"config.phoneNumber": dialed_number},
                        {"config.phoneNumber": clean_number}
                    ]
                },
                sort=[("activatedAt", -1), ("createdAt", -1)],
            )
            if profile:
                return profile
        
        # Fallback to the most recently activated profile
        profile = db.businessProfiles.find_one(
            {"status": "active"},
            sort=[("activatedAt", -1), ("createdAt", -1)],
        )
        return profile
    except Exception as e:
        logger.error(f"Error fetching profile: {e}")
        return None


async def get_caller_history_context(db, caller_number):
    """Retrieve returning customer CRM info and past calls context."""
    if db is None or not caller_number:
        return ""
    try:
        clean_number = caller_number.replace("+", "").replace(" ", "")
        
        # Query contact record
        def fetch_contact():
            return db.contacts.find_one(
                {
                    "$or": [
                        {"phoneNumber": caller_number},
                        {"phoneNumber": clean_number},
                        {"phoneNumber": { "$regex": clean_number }}
                    ]
                }
            )
        contact = await asyncio.to_thread(fetch_contact)
        customer_name = contact.get("name") if contact else None
        contact_notes = contact.get("notes") if contact else None

        # Query past calls
        def fetch_calls():
            cursor = db.callRecordings.find({"callerNumber": caller_number}).sort("startedAt", -1).limit(3)
            return list(cursor)
        calls = await asyncio.to_thread(fetch_calls)

        if not customer_name:
            for call in calls:
                if call.get("customerName"):
                    customer_name = call.get("customerName")
                    break

        if not customer_name and not contact_notes and not calls:
            return ""

        name_part = f"Customer Name: {customer_name}" if customer_name else "Customer Name: Unknown (Returning caller)"
        notes_part = f"CRM Profile Notes: {contact_notes}" if contact_notes else ""
        
        history_parts = []
        for call in calls:
            date_str = call.get("startedAt").strftime("%Y-%m-%d %H:%M") if call.get("startedAt") else "Unknown Date"
            user_tx = call.get("userTranscript", "").strip()
            agent_tx = call.get("agentTranscript", "").strip()
            issue = call.get("issueSummary", "").strip()
            
            summary = f"- Call on {date_str} (Duration: {call.get('durationSeconds', 0)}s):"
            if issue:
                summary += f" Issue: {issue}."
            else:
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
            injected_context += f"Past Conversation History:\n{history_text}\n"
        injected_context += "Use this profile and past history to personalize your responses. If they mention their name or previous issue, acknowledge it naturally.]"
        return injected_context
    except Exception as e:
        logger.error(f"Error fetching caller history context: {e}")
        return ""


class AIMateVoiceAgent(Agent):
    """Custom Agent with system instructions and WhatsApp tools."""
    def __init__(self, instructions, twilio_client, caller_number, llm):
        super().__init__(
            instructions=instructions,
            llm=llm
        )
        self.twilio_client = twilio_client
        self.caller_number = caller_number

    @function_tool()
    async def send_whatsapp_message(
        self,
        message_content: str,
        phone_number: str,
    ) -> str:
        """Sends a WhatsApp message to the customer with appointment details, pricing summaries, or conversation notes.

        Args:
            message_content: The exact text content of the message to send to the customer via WhatsApp.
            phone_number: The customer's phone number in E.164 format (e.g. +14155552671). Ask the customer for their WhatsApp number if you don't know it.
        """
        logger.info(f"send_whatsapp_message tool called for {phone_number}")
        if not self.twilio_client:
            return "Error: Twilio client not configured on server."

        whatsapp_from = os.environ.get("TWILIO_WHATSAPP_NUMBER", "whatsapp:+447446498803")
        whatsapp_to = phone_number
        if not whatsapp_to.startswith("whatsapp:"):
            if not whatsapp_to.startswith("+"):
                whatsapp_to = "+" + whatsapp_to
            whatsapp_to = f"whatsapp:{whatsapp_to}"

        try:
            def send_msg():
                return self.twilio_client.messages.create(
                    from_=whatsapp_from,
                    body=message_content,
                    to=whatsapp_to
                )
            message = await asyncio.to_thread(send_msg)
            logger.info(f"WhatsApp message SID: {message.sid}")

            # Poll status for immediate delivery failure
            fallback_needed = False
            for _ in range(6):
                await asyncio.sleep(0.5)
                def check_status():
                    return self.twilio_client.messages(message.sid).fetch()
                fetched = await asyncio.to_thread(check_status)
                if fetched.status in ["failed", "undelivered"]:
                    fallback_needed = True
                    break
                elif fetched.status == "delivered":
                    break

            if fallback_needed:
                sms_success = await self._send_fallback_sms(phone_number, message_content)
                return "WhatsApp failed, fell back to SMS." if sms_success else "WhatsApp failed and SMS fallback failed."

            return "Message sent successfully via WhatsApp."
        except Exception as e:
            logger.error(f"WhatsApp tool error: {e}")
            sms_success = await self._send_fallback_sms(phone_number, message_content)
            return "WhatsApp error, fell back to SMS." if sms_success else f"WhatsApp error: {e}"

    async def _send_fallback_sms(self, phone_number, content):
        sms_from = os.environ.get("TWILIO_PHONE_NUMBER")
        if not sms_from or not self.twilio_client:
            return False
        clean_to = phone_number.replace("whatsapp:", "")
        if not clean_to.startswith("+"):
            clean_to = "+" + clean_to
        try:
            def send_sms():
                return self.twilio_client.messages.create(
                    from_=sms_from,
                    body=content,
                    to=clean_to
                )
            await asyncio.to_thread(send_sms)
            return True
        except Exception as e:
            logger.error(f"Fallback SMS failed: {e}")
            return False

async def entrypoint(ctx: JobContext):
    logger.info(f"Starting LiveKit voice agent session for job: {ctx.job.id}")
    
    # Wait for the SIP/RTC participant to join so attributes are loaded
    participant = await ctx.wait_for_participant()
    
    caller_number = "unknown"
    dialed_number = None
    
    if participant:
        caller_number = participant.attributes.get("sip.phoneNumber", "unknown")
        dialed_number = participant.attributes.get("sip.trunkPhoneNumber", None)
        logger.info(f"Detected caller phone number: {caller_number}, Dialed number: {dialed_number}")

    # Resolve agent profile
    profile = await asyncio.to_thread(get_agent_profile, db, dialed_number)
    if profile:
        system_prompt = profile.get("generatedPrompt", "You are a professional voice agent. Keep answers extremely conversational, warm, and concise.")
        voice_name = profile.get("geminiVoice", "Puck")
        logger.info(f"Loaded agent profile for: {profile.get('businessName')} using voice {voice_name}")
    else:
        system_prompt = "You are a helpful customer service assistant. You can use the send_whatsapp_message tool to send information to the caller's phone."
        voice_name = "Puck"
        logger.info("Using default fallback agent profile.")

    # Fetch history CRM context
    history_context = ""
    if db is not None and caller_number != "unknown":
        history_context = await get_caller_history_context(db, caller_number)

    active_prompt = system_prompt
    if history_context:
        active_prompt = f"{system_prompt}\n{history_context}"
        logger.info("Injected CRM caller history context into system prompt.")

    # Establish WebRTC room connection
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
    
    custom_key = profile.get("config", {}).get("geminiApiKey")
    if custom_key and isinstance(custom_key, str) and custom_key.strip():
        agent_api_key = custom_key.strip()
    else:
        agent_api_key = os.environ.get("GEMINI_API_KEY")

    # Initialize realtime Multimodal Model
    model = realtime.RealtimeModel(
        model="gemini-2.0-flash-exp",
        voice=voice_name,
        api_key=agent_api_key,
    )

    # Initialize custom Agent class with tools
    my_agent = AIMateVoiceAgent(
        instructions=active_prompt,
        twilio_client=twilio_client,
        caller_number=caller_number,
        llm=model
    )

    # Initialize AgentSession container
    session = AgentSession(llm=model)
    
    started_at = datetime.now(timezone.utc)

    # Set up Egress if S3 and credentials are configured
    lk_api = None
    egress_id = None
    use_s3 = is_s3_configured()
    
    if use_s3 and os.environ.get("LIVEKIT_API_KEY") and os.environ.get("LIVEKIT_API_SECRET"):
        try:
            from livekit import api as lkapi
            lk_url = os.environ.get("LIVEKIT_URL")
            if lk_url:
                lk_url = lk_url.replace("wss://", "https://").replace("ws://", "http://")
            
            lk_api = lkapi.LiveKitAPI(
                url=lk_url,
                api_key=os.environ.get("LIVEKIT_API_KEY"),
                api_secret=os.environ.get("LIVEKIT_API_SECRET")
            )
            
            s3_upload = lkapi.S3Upload(
                access_key=os.environ.get("AWS_ACCESS_KEY_ID"),
                secret=os.environ.get("AWS_SECRET_ACCESS_KEY"),
                bucket=os.environ.get("S3_BUCKET_NAME"),
                region=os.environ.get("AWS_REGION", "us-east-1"),
            )
            if os.environ.get("S3_ENDPOINT_URL"):
                s3_upload.endpoint = os.environ.get("S3_ENDPOINT_URL")

            output = lkapi.EncodedFileOutput(
                file_type=lkapi.EncodedFileType.OGG,
                filepath=f"recordings/{ctx.job.id}/raw_stereo.ogg",
                s3=s3_upload
            )

            request = lkapi.RoomCompositeEgressRequest(
                room_name=ctx.room.name,
                audio_only=True,
                file_outputs=[output]
            )

            egress_info = await lk_api.egress.start_room_composite_egress(request)
            egress_id = egress_info.egress_id
            logger.info("Started LiveKit audio egress recording (egress_id: %s)", egress_id)
        except Exception as e:
            logger.error("Failed to start LiveKit audio egress: %s", e)

    try:
        # Start the session in the room
        await session.start(room=ctx.room, agent=my_agent)
        logger.info("AgentSession successfully started. Awaiting caller audio...")

        # Wait for session completion
        while ctx.room.is_connected():
            await asyncio.sleep(1)
            
        logger.info("LiveKit session closed.")
        ended_at = datetime.now(timezone.utc)

        # Stop Egress if active
        if lk_api and egress_id:
            try:
                from livekit import api as lkapi
                logger.info("Stopping LiveKit audio egress recording (egress_id: %s)...", egress_id)
                await lk_api.egress.stop_egress(lkapi.StopEgressRequest(egress_id=egress_id))
            except Exception as e:
                logger.info("Egress stop request completed (or was already stopped): %s", e)

        # Extract final conversation history from session history
        transcript_timeline = []
        if session.history and session.history.messages:
            for message in session.history.messages:
                role = message.role
                text = message.text_content
                
                # Skip empty or system messages
                role_str = "user" if "user" in str(role).lower() else "agent" if "assistant" in str(role).lower() else "system"
                if role_str == "system" or not text.strip():
                    continue
                    
                elapsed = 0.0
                if getattr(message, "created_at", None):
                    elapsed = (message.created_at - started_at).total_seconds()
                    
                transcript_timeline.append({
                    "role": role_str,
                    "text": text.strip(),
                    "timestamp": round(max(0.0, elapsed), 2)
                })

        # Process and download audio recording from S3
        temp_user_path = None
        temp_agent_path = None
        if use_s3 and egress_id:
            temp_ogg_path = f"temp_{ctx.job.id}_raw.ogg"
            temp_user_path = f"temp_{ctx.job.id}_user.wav"
            temp_agent_path = f"temp_{ctx.job.id}_agent.wav"
            temp_stereo_path = f"temp_{ctx.job.id}_stereo.wav"
            
            download_success = False
            from s3_store import get_s3_client
            s3_client = get_s3_client()
            s3_bucket = os.environ.get("S3_BUCKET_NAME")
            ogg_key = f"recordings/{ctx.job.id}/raw_stereo.ogg"
            
            if s3_client and s3_bucket:
                # Poll S3 for up to 15 seconds to allow egress to finish uploading
                for attempt in range(5):
                    try:
                        logger.info("Attempting to download egress OGG from S3 (attempt %d)...", attempt + 1)
                        s3_client.download_file(s3_bucket, ogg_key, temp_ogg_path)
                        download_success = True
                        logger.info("Successfully downloaded egress OGG from S3.")
                        break
                    except Exception as e:
                        logger.warning("Egress file not ready yet: %s", e)
                        await asyncio.sleep(attempt + 1)

            if download_success:
                logger.info("Splitting downloaded stereo OGG into mono channels...")
                split_success = split_stereo_ogg(temp_ogg_path, temp_user_path, temp_agent_path, temp_stereo_path)
                if split_success:
                    logger.info("Audio splitting succeeded.")
                else:
                    logger.error("Audio splitting failed.")
                    temp_user_path = None
                    temp_agent_path = None
                
                # Cleanup temp OGG
                if os.path.exists(temp_ogg_path):
                    try:
                        os.remove(temp_ogg_path)
                    except Exception as e:
                        logger.warning("Failed to remove temp OGG file: %s", e)
                
                # Cleanup S3 raw OGG
                try:
                    s3_client.delete_object(Bucket=s3_bucket, Key=ogg_key)
                    logger.info("Cleaned up raw egress OGG from S3: %s", ogg_key)
                except Exception as e:
                    logger.warning("Failed to delete raw egress OGG from S3: %s", e)

        if len(transcript_timeline) > 0:
            user_transcript = " ".join([t["text"] for t in transcript_timeline if t["role"] == "user"])
            agent_transcript = " ".join([t["text"] for t in transcript_timeline if t["role"] == "agent"])
            
            await asyncio.to_thread(
                save_call_record,
                db,
                call_sid=ctx.job.id,
                profile=profile,
                started_at=started_at,
                ended_at=ended_at,
                user_transcript=user_transcript,
                agent_transcript=agent_transcript,
                caller_number=caller_number,
                transcript_timeline=transcript_timeline,
                voice_gateway_provider="livekit",
                user_wav_path=temp_user_path,
                agent_wav_path=temp_agent_path,
            )

        # Cleanup local WAV files
        for path in [temp_user_path, temp_agent_path, f"temp_{ctx.job.id}_stereo.wav"]:
            if path and os.path.exists(path):
                try:
                    os.remove(path)
                    logger.info("Removed temporary WAV file: %s", path)
                except Exception as e:
                    logger.warning("Failed to remove temporary WAV file %s: %s", path, e)

    finally:
        if lk_api:
            await lk_api.aclose()
            logger.info("Closed LiveKitAPI client.")


def request_fnc(req: JobRequest) -> None:
    req.accept()


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            request_fnc=request_fnc,
        )
    )
