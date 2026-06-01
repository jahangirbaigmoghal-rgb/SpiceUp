"""Persist call recordings and metadata to MongoDB (GridFS)."""

import io
import logging
import struct
import wave
from datetime import datetime, timezone

import audioop
from bson import ObjectId
from gridfs import GridFS

logger = logging.getLogger(__name__)

GEMINI_SAMPLE_RATE = 24000
USER_SAMPLE_RATE = 16000
OUTPUT_SAMPLE_RATE = 16000


def _read_wav_pcm(path):
    with wave.open(path, "rb") as w:
        params = w.getparams()
        frames = w.readframes(w.getnframes())
    return frames, params


def _resample_pcm(pcm_bytes, sample_width, channels, in_rate, out_rate, state=None):
    if in_rate == out_rate:
        return pcm_bytes, state
    converted, new_state = audioop.ratecv(
        pcm_bytes, sample_width, channels, in_rate, out_rate, state
    )
    return converted, new_state


def _build_stereo_wav(user_path, agent_path):
    """Left channel = caller, right channel = AI (Retell-style multichannel)."""
    user_pcm, user_params = _read_wav_pcm(user_path)
    agent_pcm, agent_params = _read_wav_pcm(agent_path)

    user_pcm, _ = _resample_pcm(
        user_pcm, user_params.sampwidth, user_params.nchannels, user_params.framerate, OUTPUT_SAMPLE_RATE
    )
    agent_pcm, _ = _resample_pcm(
        agent_pcm, agent_params.sampwidth, agent_params.nchannels, agent_params.framerate, OUTPUT_SAMPLE_RATE
    )

    sample_width = 2
    user_len = len(user_pcm) // sample_width
    agent_len = len(agent_pcm) // sample_width
    max_len = max(user_len, agent_len)

    if user_len < max_len:
        user_pcm += b"\x00\x00" * (max_len - user_len)
    if agent_len < max_len:
        agent_pcm += b"\x00\x00" * (max_len - agent_len)

    fmt = f"<{max_len}h"
    user_samples = struct.unpack(fmt, user_pcm[: max_len * sample_width])
    agent_samples = struct.unpack(fmt, agent_pcm[: max_len * sample_width])
    stereo_frames = b"".join(
        struct.pack("<hh", u, a) for u, a in zip(user_samples, agent_samples)
    )

    buf = io.BytesIO()
    with wave.open(buf, "wb") as out:
        out.setnchannels(2)
        out.setsampwidth(sample_width)
        out.setframerate(OUTPUT_SAMPLE_RATE)
        out.writeframes(stereo_frames)
    buf.seek(0)
    return buf.read()


def _upload_wav(fs, filename, content_type, data):
    return fs.put(data, filename=filename, content_type=content_type)


def save_call_recording(
    db,
    *,
    call_sid,
    profile,
    user_wav_path,
    agent_wav_path,
    started_at,
    ended_at,
    user_transcript="",
    agent_transcript="",
    caller_number=None,
    stream_sid=None,
    status="completed",
    transcript_timeline=None,
    input_tokens=0,
    output_tokens=0,
    latency_data=None,
):
    """Upload WAV files to GridFS and insert callRecordings document."""
    if db is None:
        logger.warning("No database — skipping recording upload for %s", call_sid)
        return None

    existing = db.callRecordings.find_one({"callSid": call_sid})
    if existing:
        logger.info("Recording already saved for call %s", call_sid)
        return existing.get("_id")

    fs = GridFS(db, collection="callRecordingFiles")

    try:
        with open(user_wav_path, "rb") as f:
            user_data = f.read()
        with open(agent_wav_path, "rb") as f:
            agent_data = f.read()
    except FileNotFoundError as e:
        logger.error("Recording file missing for %s: %s", call_sid, e)
        return None

    stereo_data = _build_stereo_wav(user_wav_path, agent_wav_path)

    user_file_id = _upload_wav(fs, f"user_{call_sid}.wav", "audio/wav", user_data)
    agent_file_id = _upload_wav(fs, f"agent_{call_sid}.wav", "audio/wav", agent_data)
    stereo_file_id = _upload_wav(fs, f"stereo_{call_sid}.wav", "audio/wav", stereo_data)

    duration_seconds = 0
    if started_at and ended_at:
        duration_seconds = max(0, int((ended_at - started_at).total_seconds()))

    # Build timeline if not provided
    if transcript_timeline is None:
        transcript_timeline = []
        if user_transcript.strip():
            transcript_timeline.append({
                "role": "user",
                "text": user_transcript.strip(),
                "timestamp": 0.0
            })
        if agent_transcript.strip():
            transcript_timeline.append({
                "role": "agent",
                "text": agent_transcript.strip(),
                "timestamp": 1.0
            })

    # Format timeline with timestamps for Gemini analysis
    timeline_str = ""
    for line in transcript_timeline:
        role_label = "User" if line.get("role") == "user" else "Agent"
        timeline_str += f"[{line.get('timestamp', 0.0):.1f}s] {role_label}: {line.get('text', '')}\n"

    customer_name = None
    issue_summary = None
    sentiment = "Neutral"
    action_items = []
    crucial_events = []

    import os
    api_key = os.environ.get("GEMINI_API_KEY")
    if api_key and timeline_str.strip():
        try:
            import json
            from google import genai
            from google.genai import types
            
            client = genai.Client(api_key=api_key)
            prompt = (
                f"Analyze the following call transcript between a customer (User) and an AI agent. "
                f"The transcript has timestamps indicating when each line was spoken.\n\n"
                f"Transcript:\n{timeline_str}\n\n"
                f"Please extract the following information and return it in JSON format:\n"
                f"1. customerName: The customer's name, only if explicitly mentioned (e.g. 'John Doe'). Otherwise null.\n"
                f"2. summary: A brief 1-sentence summary of the call's main topic or issue.\n"
                f"3. sentiment: Customer's overall sentiment towards the conversation (must be exactly 'Positive', 'Neutral', or 'Negative').\n"
                f"4. actionItems: A list of strings representing next steps, promises, or commitments made by either the AI agent or the customer.\n"
                f"5. crucialEvents: A list of key events that occurred during the call. Each event must be an object with:\n"
                f"   - timestamp: The time in seconds when this event or topic was discussed (match it closely to the timeline timestamps, as a float).\n"
                f"   - event: A short description of the key moment (e.g. 'Customer reported master bathroom leak', 'Agent initiated WhatsApp confirmation').\n"
                f"   - type: A string classification from: ['info', 'request', 'action', 'sentiment_shift', 'tool_call']\n\n"
                f"Return ONLY valid JSON matching this schema."
            )
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            data = json.loads(response.text)
            customer_name = data.get("customerName")
            issue_summary = data.get("summary")
            extracted_sentiment = data.get("sentiment")
            if extracted_sentiment in ["Positive", "Neutral", "Negative"]:
                sentiment = extracted_sentiment
            action_items = data.get("actionItems", [])
            crucial_events = data.get("crucialEvents", [])
            logger.info(f"Extracted call info: customerName={customer_name}, issueSummary={issue_summary}, sentiment={sentiment}, actionItemsCount={len(action_items)}, crucialEventsCount={len(crucial_events)}")
        except Exception as e:
            logger.error(f"Error extracting call info using Gemini: {e}")

    # CRM Contact Auto-Linking / Creation
    contact_id = None
    if db is not None and caller_number:
        try:
            clean_number = caller_number.replace("+", "").replace(" ", "")
            contact = db.contacts.find_one(
                {
                    "$or": [
                        {"phoneNumber": caller_number},
                        {"phoneNumber": clean_number},
                        {"phoneNumber": { "$regex": clean_number }}
                    ]
                }
            )
            
            resolved_name = customer_name or "Unknown Caller"
            
            if not contact:
                # Create a new CRM contact automatically!
                contact_doc = {
                    "name": resolved_name,
                    "phoneNumber": caller_number,
                    "email": "",
                    "company": "",
                    "notes": f"Created automatically from call {call_sid}.",
                    "createdAt": datetime.now(timezone.utc),
                    "updatedAt": datetime.now(timezone.utc),
                }
                res_contact = db.contacts.insert_one(contact_doc)
                contact_id = res_contact.inserted_id
                logger.info(f"Automatically registered new CRM contact: {resolved_name} for number {caller_number}")
            else:
                contact_id = contact.get("_id")
                # If the contact exists but was registered as "Unknown Caller" and we now have a resolved name, update it!
                if contact.get("name") == "Unknown Caller" and customer_name:
                    db.contacts.update_one(
                        {"_id": contact_id},
                        {"$set": {"name": customer_name, "updatedAt": datetime.now(timezone.utc)}}
                    )
                    logger.info(f"Updated CRM contact name from 'Unknown Caller' to '{customer_name}'")
        except Exception as e:
            logger.error(f"Error auto-linking CRM contact: {e}")

    # Cost breakdown calculations
    # Twilio Cost: Inbound Voice is $0.014/min; Media Stream is $0.004/min -> Total $0.018/min
    billable_minutes = max(1, -(-duration_seconds // 60)) if duration_seconds > 0 else 0
    twilio_voice_cost = round(billable_minutes * 0.014, 4)
    twilio_stream_cost = round(billable_minutes * 0.004, 4)
    twilio_cost = round(twilio_voice_cost + twilio_stream_cost, 4)

    # Gemini Cost: Audio Input $0.0007 / 1K tokens ($0.70/1M); Audio Output $0.012 / 1K tokens ($12.00/1M)
    gemini_input_cost = round((input_tokens / 1000.0) * 0.0007, 4)
    gemini_output_cost = round((output_tokens / 1000.0) * 0.012, 4)
    gemini_cost = round(gemini_input_cost + gemini_output_cost, 4)

    total_cost = round(twilio_cost + gemini_cost, 4)

    if latency_data is None:
        latency_data = {
            "setupDelay": None,
            "averageTtfw": 0,
            "turnLatencies": []
        }

    profile_id = profile.get("_id") if profile else None
    doc = {
        "callSid": call_sid,
        "streamSid": stream_sid,
        "profileId": profile_id,
        "contactId": contact_id,  # Link to CRM Contact
        "businessName": (profile or {}).get("businessName", "Unknown"),
        "industry": (profile or {}).get("industry"),
        "geminiVoice": (profile or {}).get("geminiVoice"),
        "callerNumber": caller_number,
        "customerName": customer_name,
        "issueSummary": issue_summary,
        "sentiment": sentiment,
        "status": status,
        "startedAt": started_at or datetime.now(timezone.utc),
        "endedAt": ended_at or datetime.now(timezone.utc),
        "durationSeconds": duration_seconds,
        "userTranscript": user_transcript.strip(),
        "agentTranscript": agent_transcript.strip(),
        "userAudioFileId": user_file_id,
        "agentAudioFileId": agent_file_id,
        "stereoAudioFileId": stereo_file_id,
        
        # Enterprise Fields
        "inputTokens": input_tokens,
        "outputTokens": output_tokens,
        "twilioCost": twilio_cost,
        "twilioVoiceCost": twilio_voice_cost,
        "twilioStreamCost": twilio_stream_cost,
        "geminiCost": gemini_cost,
        "geminiInputCost": gemini_input_cost,
        "geminiOutputCost": gemini_output_cost,
        "totalCost": total_cost,
        "latencyData": latency_data,
        "actionItems": action_items,
        "crucialEvents": crucial_events,
        "transcript": transcript_timeline,
        
        "createdAt": datetime.now(timezone.utc),
    }

    result = db.callRecordings.insert_one(doc)
    logger.info("Saved call recording %s to MongoDB (_id=%s) with total cost $%s", call_sid, result.inserted_id, total_cost)
    return result.inserted_id
