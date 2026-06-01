import os
import wave
import audioop
import struct
import io
import logging
import json
from datetime import datetime, timezone
from bson import ObjectId
from gridfs import GridFS
from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

class CallRecorder:
    def __init__(self, call_sid: str, config, db):
        self.call_sid = call_sid
        self.config = config
        self.db = db
        self.started_at = datetime.now(timezone.utc)
        
        # Create local recordings directory
        self.recordings_dir = os.path.join(os.getcwd(), "recordings")
        os.makedirs(self.recordings_dir, exist_ok=True)
        
        self.user_path = os.path.join(self.recordings_dir, f"user_{call_sid}.wav")
        self.agent_path = os.path.join(self.recordings_dir, f"agent_{call_sid}.wav")
        self.stereo_path = os.path.join(self.recordings_dir, f"stereo_{call_sid}.wav")
        
        # Open user WAV (16kHz PCM mono 16-bit)
        self.user_wav = wave.open(self.user_path, "wb")
        self.user_wav.setnchannels(1)
        self.user_wav.setsampwidth(2)
        self.user_wav.setframerate(16000)
        
        # Open agent WAV (24kHz PCM mono 16-bit)
        self.agent_wav = wave.open(self.agent_path, "wb")
        self.agent_wav.setnchannels(1)
        self.agent_wav.setsampwidth(2)
        self.agent_wav.setframerate(24000)
        
        self.timeline = []
        self.closed = False

    def write_user_audio(self, pcm_bytes: bytes):
        if not self.closed:
            try:
                self.user_wav.writeframes(pcm_bytes)
            except Exception as e:
                logger.error(f"Error writing user audio for call {self.call_sid}: {e}")

    def write_agent_audio(self, pcm_bytes: bytes):
        if not self.closed:
            try:
                self.agent_wav.writeframes(pcm_bytes)
            except Exception as e:
                logger.error(f"Error writing agent audio for call {self.call_sid}: {e}")

    def add_transcript(self, role: str, text: str, elapsed_seconds: float):
        self.timeline.append({
            "role": role,
            "text": text,
            "timestamp": elapsed_seconds
        })

    def close_files(self):
        if not self.closed:
            try:
                self.user_wav.close()
                self.agent_wav.close()
            except Exception as e:
                logger.error(f"Error closing WAV files: {e}")
            self.closed = True

    def _resample_pcm(self, pcm_bytes, sample_width, channels, in_rate, out_rate):
        if in_rate == out_rate:
            return pcm_bytes
        converted, _ = audioop.ratecv(
            pcm_bytes, sample_width, channels, in_rate, out_rate, None
        )
        return converted

    def _build_stereo_wav(self) -> bytes | None:
        """Left channel = caller (16kHz), right channel = agent (16kHz resampled from 24kHz)."""
        try:
            self.close_files()
            
            with wave.open(self.user_path, "rb") as w:
                user_frames = w.readframes(w.getnframes())
                user_rate = w.getframerate()
                
            with wave.open(self.agent_path, "rb") as w:
                agent_frames = w.readframes(w.getnframes())
                agent_rate = w.getframerate()

            # Resample both to 16000Hz
            user_pcm = self._resample_pcm(user_frames, 2, 1, user_rate, 16000)
            agent_pcm = self._resample_pcm(agent_frames, 2, 1, agent_rate, 16000)

            sample_width = 2
            user_len = len(user_pcm) // sample_width
            agent_len = len(agent_pcm) // sample_width
            max_len = max(user_len, agent_len)

            if user_len < max_len:
                user_pcm += b"\x00\x00" * (max_len - user_len)
            if agent_len < max_len:
                agent_pcm += b"\x00\x00" * (max_len - agent_len)

            fmt = f"<{max_len}h"
            user_samples = struct.unpack(fmt, user_pcm[:max_len * sample_width])
            agent_samples = struct.unpack(fmt, agent_pcm[:max_len * sample_width])
            
            stereo_frames = b"".join(
                struct.pack("<hh", u, a) for u, a in zip(user_samples, agent_samples)
            )

            buf = io.BytesIO()
            with wave.open(buf, "wb") as out:
                out.setnchannels(2)
                out.setsampwidth(sample_width)
                out.setframerate(16000)
                out.writeframes(stereo_frames)
            buf.seek(0)
            return buf.read()
        except Exception as e:
            logger.error(f"Error building stereo WAV: {e}")
            return None

    async def finalize(
        self,
        status: str,
        user_transcript_parts: list,
        agent_transcript_parts: list,
        transcript_timeline: list,
        input_tokens: int,
        output_tokens: int,
        latency_data: dict,
        caller_number: str,
        stream_sid: str
    ):
        self.close_files()
        ended_at = datetime.now(timezone.utc)
        duration_seconds = max(0, int((ended_at - self.started_at).total_seconds()))

        user_transcript = " ".join(user_transcript_parts)
        agent_transcript = " ".join(agent_transcript_parts)

        # Build formatted transcript timeline for analysis
        timeline_str = ""
        for turn in transcript_timeline:
            role_label = "User" if turn.get("role") == "user" else "Agent"
            timeline_str += f"[{turn.get('timestamp', 0.0):.1f}s] {role_label}: {turn.get('text', '')}\n"

        # 1. Post-call Analysis using Gemini (Non-realtime model)
        post_call_analysis = {}
        if self.config.gemini_api_key and timeline_str.strip():
            try:
                # Use standard 2.0 or 2.5 Flash model for analysis
                client = genai.Client(api_key=self.config.gemini_api_key)
                prompt = f"""
                Analyze the following call transcript between a takeaway customer (User) and an AI ordering assistant (Agent).
                The transcript has timestamps indicating when each line was spoken.
                
                Transcript:
                {timeline_str}
                
                Please extract the following information and return it in JSON format:
                1. customerName: The customer's name, only if explicitly mentioned (e.g. 'John Doe'). Otherwise null.
                2. summary: A brief 1-sentence summary of the call's main outcome (e.g. 'Placed delivery order for a large Pepperoni Pizza and chips').
                3. sentiment: Customer's overall sentiment towards the conversation (must be exactly 'Positive', 'Neutral', or 'Negative').
                4. actionItems: A list of strings representing next steps (e.g. 'Prepare and deliver order ORD-20260601-0001', 'Verify payment via SMS link').
                5. crucialEvents: A list of key events that occurred during the call. Each event must be an object with:
                   - timestamp: The time in seconds when this event or topic was discussed (as a float).
                   - event: A short description of the key moment (e.g. 'POSTCODE check successful', 'Placed order ORD-12345').
                   - type: A string classification from: ['info', 'request', 'action', 'sentiment_shift', 'tool_call']
                   
                Return ONLY valid JSON matching this schema.
                """
                response = client.models.generate_content(
                    model="gemini-2.0-flash",
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json"
                    )
                )
                post_call_analysis = json.loads(response.text)
                logger.info(f"Extracted call analysis details successfully for CallSid={self.call_sid}")
            except Exception as e:
                logger.error(f"Error during post-call Gemini analysis: {e}")

        # 2. Upload WAV files to GridFS (or S3 if configured)
        user_file_id = None
        agent_file_id = None
        stereo_file_id = None
        
        if self.db is not None:
            try:
                fs = GridFS(self.db, collection="fs")
                
                # Upload user audio
                if os.path.exists(self.user_path) and os.path.getsize(self.user_path) > 44:
                    with open(self.user_path, "rb") as f:
                        user_file_id = fs.put(f, filename=f"user_{self.call_sid}.wav", content_type="audio/wav")
                
                # Upload agent audio
                if os.path.exists(self.agent_path) and os.path.getsize(self.agent_path) > 44:
                    with open(self.agent_path, "rb") as f:
                        agent_file_id = fs.put(f, filename=f"agent_{self.call_sid}.wav", content_type="audio/wav")
                
                # Build & upload stereo audio
                stereo_data = self._build_stereo_wav()
                if stereo_data:
                    stereo_file_id = fs.put(stereo_data, filename=f"stereo_{self.call_sid}.wav", content_type="audio/wav")

                logger.info(f"Uploaded audio recordings to GridFS bucket for CallSid={self.call_sid}")
            except Exception as e:
                logger.error(f"Error saving audio files to GridFS: {e}")

        # 3. Save call log to MongoDB 'voicecalllogs'
        if self.db is not None:
            try:
                # Find default tenant ID
                tenant_doc = self.db.tenants.find_one()
                tenant_id = tenant_doc["_id"] if tenant_doc else ObjectId("000000000000000000000001")

                # Parse customer order references if placed
                # We search the transcript or timeline for pattern ORD-YYYYMMDD-XXXX
                import re
                order_refs = re.findall(r"ORD-\d{8}-\d{4}", user_transcript + " " + agent_transcript)
                order_ref = order_refs[0] if order_refs else None
                order_id = None
                
                if order_ref:
                    order_doc = self.db.orders.find_one({"reference": order_ref})
                    if order_doc:
                        order_id = order_doc["_id"]

                # Resolve customer name
                cust_name = post_call_analysis.get("customerName") or "Unknown Customer"

                call_log_doc = {
                    "tenant": tenant_id,
                    "callSid": self.call_sid,
                    "callerNumber": caller_number,
                    "dialedNumber": self.config.twilio_phone_number,
                    "startedAt": self.started_at,
                    "endedAt": ended_at,
                    "durationSeconds": duration_seconds,
                    "status": status,
                    "orderId": order_id,
                    "orderReference": order_ref,
                    "paymentLinkSent": "payment-link" in agent_transcript.lower() or "sms" in agent_transcript.lower(),
                    "paymentLinkPaid": False,
                    "userTranscript": user_transcript,
                    "agentTranscript": agent_transcript,
                    "transcriptTimeline": transcript_timeline,
                    "humanTransferred": status == "transferred",
                    "inputTokens": input_tokens,
                    "outputTokens": output_tokens,
                    "latencyData": latency_data,
                    "postCallAnalysis": post_call_analysis,
                    "userAudioFileId": user_file_id,
                    "agentAudioFileId": agent_file_id,
                    "stereoAudioFileId": stereo_file_id,
                    "voiceGatewayProvider": "websocket",
                }

                # Insert call log
                self.db.voicecalllogs.update_one(
                    {"callSid": self.call_sid, "tenant": tenant_id},
                    {"$set": call_log_doc},
                    upsert=True
                )
                logger.info(f"Successfully saved voiceCallLog to MongoDB for call {self.call_sid}")
            except Exception as e:
                logger.error(f"Error inserting voiceCallLog into MongoDB: {e}")

        # 4. Clean up local WAV files
        for path in [self.user_path, self.agent_path, self.stereo_path]:
            try:
                if os.path.exists(path):
                    os.remove(path)
            except Exception as e:
                logger.error(f"Failed to clean up local file {path}: {e}")
