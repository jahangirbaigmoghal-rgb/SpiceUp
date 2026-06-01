import os
import json
import base64
import audioop
import asyncio
import logging
import wave
from datetime import datetime, timezone
from google import genai
from google.genai import types
from twilio.rest import Client

from call_store import save_call_record
import takeaway_tools

logger = logging.getLogger(__name__)

# Audio formatting constants
TWILIO_SAMPLE_RATE = 8000
GEMINI_SAMPLE_RATE_IN = 16000
GEMINI_SAMPLE_RATE_OUT = 24000

class GeminiLiveSession:
    def __init__(self, websocket, stream_sid, system_prompt, voice_name, call_sid, caller_number=None, db=None, profile=None):
        api_key = os.environ.get("GEMINI_API_KEY")
        self.client = genai.Client(api_key=api_key)
        self.model = "gemini-2.0-flash-exp" # standard Live API model
        self.twilio_ws = websocket
        self.stream_sid = stream_sid
        self.caller_number = caller_number
        
        # Inject caller_number into the system prompt if present, so Gemini is aware of it
        if caller_number:
            system_prompt = f"{system_prompt}\n\n[System Info: The caller's phone number is {caller_number}.]"
            
        self.system_prompt = system_prompt
        self.voice_name = voice_name
        self.call_sid = call_sid
        self.db = db
        self.profile = profile or {}
        
        self.session = None
        self.receive_task = None
        self.is_running = False
        self.started_at = datetime.now(timezone.utc)
        self.user_transcript_parts = []
        self.agent_transcript_parts = []
        self.user_wav_path = None
        self.agent_wav_path = None
        self._recording_persisted = False
        self.listeners = []
        
        self.user_wav = None
        self.gemini_wav = None
        self.in_rate_state = None
        self.out_rate_state = None
        self.outbound_queue = asyncio.Queue()
        self.pacer_task = None

        # Enterprise Metrics Tracking
        self.input_tokens = 0
        self.output_tokens = 0
        self.transcript_timeline = []
        self.first_audio_received_at = None
        self.user_finished_speaking_at = None
        self.latency_data = {
            "setupDelay": None,
            "averageTtfw": 0,
            "turnLatencies": []
        }
        
        # Initialize Twilio Client
        self.twilio_client = None
        if os.environ.get("TWILIO_ACCOUNT_SID") and os.environ.get("TWILIO_AUTH_TOKEN"):
            self.twilio_client = Client(
                os.environ.get("TWILIO_ACCOUNT_SID"),
                os.environ.get("TWILIO_AUTH_TOKEN")
            )

    async def start(self):
        """Initializes the connection to Gemini Live API."""
        self.is_running = True
        logger.info(f"Starting Gemini Live session with voice {self.voice_name}")
        
        # Define the TakeawayPOS tool suite
        takeaway_pos_tools = types.Tool(
            function_declarations=[
                types.FunctionDeclaration(
                    name="get_menu",
                    description="Retrieves the current available menu items grouped by category. Call this at the start of every ordering conversation.",
                    parameters=types.Schema(type="OBJECT", properties={}, required=[])
                ),
                types.FunctionDeclaration(
                    name="check_delivery_zone",
                    description="Validates whether a UK postcode is within the restaurant's delivery zone. Always call before confirming a delivery order.",
                    parameters=types.Schema(
                        type="OBJECT",
                        properties={
                            "postcode": types.Schema(type="STRING", description="UK postcode to validate, e.g. 'WN1 1AA'")
                        },
                        required=["postcode"]
                    )
                ),
                types.FunctionDeclaration(
                    name="place_order",
                    description="Places a confirmed order into the POS system. Only call after confirming all items, modifiers, and customer details.",
                    parameters=types.Schema(
                        type="OBJECT",
                        properties={
                            "order_type": types.Schema(type="STRING", description="'delivery' or 'collection'"),
                            "customer_name": types.Schema(type="STRING"),
                            "customer_phone": types.Schema(type="STRING"),
                            "delivery_address": types.Schema(type="STRING", description="Full address including postcode. Only for delivery orders."),
                            "delivery_postcode": types.Schema(type="STRING", description="Postcode. Only for delivery orders."),
                            "items": types.Schema(
                                type="ARRAY",
                                description="List of ordered items with modifiers",
                                items=types.Schema(
                                    type="OBJECT",
                                    properties={
                                        "menu_item_id": types.Schema(type="STRING"),
                                        "name": types.Schema(type="STRING"),
                                        "quantity": types.Schema(type="INTEGER"),
                                        "modifiers": types.Schema(
                                            type="ARRAY",
                                            items=types.Schema(
                                                type="OBJECT",
                                                properties={
                                                    "groupId": types.Schema(type="STRING"),
                                                    "groupName": types.Schema(type="STRING"),
                                                    "optionId": types.Schema(type="STRING"),
                                                    "optionName": types.Schema(type="STRING")
                                                }
                                            )
                                        )
                                    }
                                )
                            ),
                            "payment_method": types.Schema(type="STRING", description="'card_link' or 'cash_on_delivery'"),
                            "notes": types.Schema(type="STRING", description="Any special instructions")
                        },
                        required=["order_type", "customer_name", "customer_phone", "items", "payment_method"]
                    )
                ),
                types.FunctionDeclaration(
                    name="send_payment_link",
                    description="Generates a Stripe Payment Link for the order amount and sends it via SMS. Call after place_order() if payment_method is 'card_link'.",
                    parameters=types.Schema(
                        type="OBJECT",
                        properties={
                            "order_reference": types.Schema(type="STRING"),
                            "amount_pence": types.Schema(type="INTEGER"),
                            "phone_number": types.Schema(type="STRING", description="Customer phone in E.164 format")
                        },
                        required=["order_reference", "amount_pence", "phone_number"]
                    )
                ),
                types.FunctionDeclaration(
                    name="transfer_to_human",
                    description="Transfers the call to a human staff member. Use when customer requests human, is confused, or has a complaint.",
                    parameters=types.Schema(type="OBJECT", properties={}, required=[])
                ),
                types.FunctionDeclaration(
                    name="get_order",
                    description="Retrieves the details of an existing order by its reference sequence (e.g. 'ORD-20260531-0001'). Call this when customer wants to check status, modify, or cancel their order.",
                    parameters=types.Schema(
                        type="OBJECT",
                        properties={
                            "order_reference": types.Schema(type="STRING", description="Order reference sequence")
                        },
                        required=["order_reference"]
                    )
                ),
                types.FunctionDeclaration(
                    name="cancel_order",
                    description="Cancels an existing order by its reference sequence. Only call if the customer explicitly requests cancellation and after verifying the order details via get_order.",
                    parameters=types.Schema(
                        type="OBJECT",
                        properties={
                            "order_reference": types.Schema(type="STRING", description="Order reference sequence"),
                            "reason": types.Schema(type="STRING", description="Optional reason for cancellation")
                        },
                        required=["order_reference"]
                    )
                ),
                types.FunctionDeclaration(
                    name="modify_order",
                    description="Modifies an existing order's items and notes. Only call after checking the order via get_order, verifying the status is 'placed' or 'confirmed' (not preparing/dispatched), and confirming the new items and total price with the customer.",
                    parameters=types.Schema(
                        type="OBJECT",
                        properties={
                            "order_reference": types.Schema(type="STRING"),
                            "items": types.Schema(
                                type="ARRAY",
                                description="List of modified items with modifiers",
                                items=types.Schema(
                                    type="OBJECT",
                                    properties={
                                        "menu_item_id": types.Schema(type="STRING"),
                                        "name": types.Schema(type="STRING"),
                                        "quantity": types.Schema(type="INTEGER"),
                                        "modifiers": types.Schema(
                                            type="ARRAY",
                                            items=types.Schema(
                                                type="OBJECT",
                                                properties={
                                                    "groupId": types.Schema(type="STRING"),
                                                    "groupName": types.Schema(type="STRING"),
                                                    "optionId": types.Schema(type="STRING"),
                                                    "optionName": types.Schema(type="STRING")
                                                }
                                            )
                                        )
                                    }
                                )
                            ),
                            "notes": types.Schema(type="STRING", description="Any updated special instructions")
                        },
                        required=["order_reference", "items"]
                    )
                )
            ]
        )

        config = types.LiveConnectConfig(
            response_modalities=["AUDIO"],
            system_instruction=types.Content(parts=[types.Part(text=self.system_prompt)]),
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=self.voice_name)
                )
            ),
            realtime_input_config=types.RealtimeInputConfig(
                automatic_activity_detection=types.AutomaticActivityDetection(
                    disabled=False,
                    start_of_speech_sensitivity=types.StartSensitivity.START_SENSITIVITY_LOW,
                    end_of_speech_sensitivity=types.EndSensitivity.END_SENSITIVITY_LOW,
                    prefix_padding_ms=300,
                    silence_duration_ms=700,
                )
            ),
            input_audio_transcription=types.AudioTranscriptionConfig(),
            output_audio_transcription=types.AudioTranscriptionConfig(),
            tools=[takeaway_pos_tools]
        )

        try:
            self.session_ctx = self.client.aio.live.connect(model=self.model, config=config)
            self.session = await self.session_ctx.__aenter__()
            
            # Open local audio recording files
            try:
                recordings_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "scratch", "recordings")
                os.makedirs(recordings_dir, exist_ok=True)
                
                # User audio (16kHz PCM)
                self.user_wav_path = os.path.join(recordings_dir, f"user_{self.call_sid}.wav")
                self.user_wav = wave.open(self.user_wav_path, "wb")
                self.user_wav.setnchannels(1)
                self.user_wav.setsampwidth(2)
                self.user_wav.setframerate(GEMINI_SAMPLE_RATE_IN)
                
                # Gemini audio (24kHz PCM)
                self.agent_wav_path = os.path.join(recordings_dir, f"gemini_{self.call_sid}.wav")
                self.gemini_wav = wave.open(self.agent_wav_path, "wb")
                self.gemini_wav.setnchannels(1)
                self.gemini_wav.setsampwidth(2)
                self.gemini_wav.setframerate(GEMINI_SAMPLE_RATE_OUT)
                
                logger.info(f"Recording call to {self.user_wav_path} and {self.agent_wav_path}")
            except Exception as e:
                logger.error(f"Failed to initialize call recording: {e}")

            # Start background tasks
            self.receive_task = asyncio.create_task(self._receive_from_gemini())
            self.pacer_task = asyncio.create_task(self._outbound_pacer())
            logger.info("Gemini Live session connected and outbound pacer started.")

            # Trigger Gemini greeting
            greeting_msg = f"The customer has joined the call. Greet them warmly as Papa's Pizza & Grill. Let them know they can ask if we deliver to their postcode, hear the menu, and place their order. Please mention you are an AI order assistant."
            await self.session.send_realtime_input(text=greeting_msg)
            logger.info("Sent initial greeting trigger to Gemini.")
        except Exception as e:
            logger.error(f"Failed to connect to Gemini: {e}")
            self.is_running = False

    async def stop(self):
        """Stops the session and cleans up."""
        if not self.is_running and self.session is None and getattr(self, 'session_ctx', None) is None:
            return

        self.is_running = False
        
        # Close audio files
        if self.user_wav:
            try: self.user_wav.close()
            except Exception: pass
            self.user_wav = None
        if self.gemini_wav:
            try: self.gemini_wav.close()
            except Exception: pass
            self.gemini_wav = None

        # Persist recording
        try:
            await asyncio.shield(self._persist_recording(status="completed"))
        except Exception as e:
            logger.error(f"Error persisting recording: {e}")

        # Clean up background tasks
        if self.receive_task:
            self.receive_task.cancel()
            try: await self.receive_task
            except asyncio.CancelledError: pass
            self.receive_task = None
        if self.pacer_task:
            self.pacer_task.cancel()
            try: await self.pacer_task
            except asyncio.CancelledError: pass
            self.pacer_task = None

        # Close session context
        if hasattr(self, 'session_ctx') and self.session_ctx:
            try:
                await asyncio.wait_for(self.session_ctx.__aexit__(None, None, None), timeout=2.0)
            except Exception as e:
                logger.warning(f"Error during Gemini session context close: {e}")
            finally:
                self.session_ctx = None
                self.session = None

        logger.info("Gemini session stopped.")

    async def _relay_transcript(self, role, text, elapsed):
        for ws in list(self.listeners):
            try:
                await ws.send_text(json.dumps({
                    "event": "transcript",
                    "role": role,
                    "text": text,
                    "timestamp": elapsed
                }))
            except Exception:
                if ws in self.listeners:
                    self.listeners.remove(ws)

    def _append_transcript(self, server_content):
        if server_content is None:
            return
        elapsed = round(max(0.0, (datetime.now(timezone.utc) - self.started_at).total_seconds()), 2)
        input_tx = getattr(server_content, "input_transcription", None)
        if input_tx is not None:
            text = getattr(input_tx, "text", None) or (input_tx if isinstance(input_tx, str) else None)
            if text and (not self.user_transcript_parts or self.user_transcript_parts[-1] != text):
                self.user_transcript_parts.append(text)
                self.transcript_timeline.append({
                    "role": "user",
                    "text": text,
                    "timestamp": elapsed
                })
                asyncio.create_task(self._relay_transcript("user", text, elapsed))
        output_tx = getattr(server_content, "output_transcription", None)
        if output_tx is not None:
            text = getattr(output_tx, "text", None) or (output_tx if isinstance(output_tx, str) else None)
            if text and (not self.agent_transcript_parts or self.agent_transcript_parts[-1] != text):
                self.agent_transcript_parts.append(text)
                self.transcript_timeline.append({
                    "role": "agent",
                    "text": text,
                    "timestamp": elapsed
                })
                asyncio.create_task(self._relay_transcript("agent", text, elapsed))

    async def _persist_recording(self, status="completed"):
        if self._recording_persisted:
            return
        if not self.user_wav_path or not self.agent_wav_path:
            return
        if not os.path.isfile(self.user_wav_path) or not os.path.isfile(self.agent_wav_path):
            return

        self._recording_persisted = True
        ended_at = datetime.now(timezone.utc)

        try:
            await asyncio.to_thread(
                save_call_record,
                self.db,
                call_sid=self.call_sid,
                profile=self.profile,
                user_wav_path=self.user_wav_path,
                agent_wav_path=self.agent_wav_path,
                started_at=self.started_at,
                ended_at=ended_at,
                user_transcript=" ".join(self.user_transcript_parts),
                agent_transcript=" ".join(self.agent_transcript_parts),
                caller_number=self.caller_number,
                stream_sid=self.stream_sid,
                status=status,
                transcript_timeline=self.transcript_timeline,
                input_tokens=self.input_tokens,
                output_tokens=self.output_tokens,
                latency_data=self.latency_data,
                voice_gateway_provider="websocket",
            )
        except Exception as e:
            logger.error("Failed to persist recording to MongoDB: %s", e)

    async def receive_audio(self, base64_payload):
        if not self.session or not self.is_running:
            return

        try:
            ulaw_bytes = base64.b64decode(base64_payload)
            pcm_8k = audioop.ulaw2lin(ulaw_bytes, 2)
            pcm_16k, self.in_rate_state = audioop.ratecv(pcm_8k, 2, 1, TWILIO_SAMPLE_RATE, GEMINI_SAMPLE_RATE_IN, self.in_rate_state)
            
            if self.user_wav:
                self.user_wav.writeframes(pcm_16k)

            for ws in list(self.listeners):
                try:
                    await ws.send_text(json.dumps({
                        "event": "audio",
                        "track": "inbound",
                        "payload": base64_payload
                    }))
                except Exception:
                    if ws in self.listeners:
                        self.listeners.remove(ws)

            await self.session.send_realtime_input(
                audio=types.Blob(data=pcm_16k, mime_type="audio/pcm;rate=16000")
            )
        except Exception as e:
            logger.error(f"Error processing inbound audio: {e}")

    async def _receive_from_gemini(self):
        try:
            while self.is_running:
                async for response in self.session.receive():
                    if not self.is_running:
                        break

                    if getattr(response, "usage_metadata", None) is not None:
                        metadata = response.usage_metadata
                        self.input_tokens = getattr(metadata, "prompt_token_count", self.input_tokens)
                        self.output_tokens = getattr(metadata, "candidates_token_count", self.output_tokens)

                    # Interruption (Barge-in)
                    if response.server_content is not None and response.server_content.interrupted:
                        logger.info("Gemini was interrupted by the user. Clearing outbound queue and Twilio buffer.")
                        while not self.outbound_queue.empty():
                            try:
                                self.outbound_queue.get_nowait()
                                self.outbound_queue.task_done()
                            except Exception:
                                break
                        clear_message = {
                            "event": "clear",
                            "streamSid": self.stream_sid
                        }
                        await self.twilio_ws.send_text(json.dumps(clear_message))

                    audio_received = False
                    server_content = response.server_content
                    if server_content is not None:
                        self._append_transcript(server_content)
                        model_turn = server_content.model_turn
                        if model_turn is not None:
                            for part in model_turn.parts:
                                if part.inline_data and part.inline_data.data:
                                    audio_received = True
                                    await self._send_audio_to_twilio(part.inline_data.data)

                    # Latency tracking
                    if audio_received:
                        now = datetime.now(timezone.utc)
                        if self.first_audio_received_at is None:
                            self.first_audio_received_at = now
                            self.latency_data["setupDelay"] = round((now - self.started_at).total_seconds(), 3)
                        
                        if self.user_finished_speaking_at is not None:
                            turn_lat = round((now - self.user_finished_speaking_at).total_seconds(), 3)
                            self.latency_data["turnLatencies"].append(turn_lat)
                            lats = self.latency_data["turnLatencies"]
                            self.latency_data["averageTtfw"] = round(sum(lats) / len(lats), 3) if lats else 0
                            self.user_finished_speaking_at = None

                    if server_content is not None and getattr(server_content, "input_transcription", None) is not None:
                        if self.user_finished_speaking_at is None:
                            self.user_finished_speaking_at = datetime.now(timezone.utc)

                    # Handle TakeawayPOS Tool Calls
                    tool_call = response.tool_call
                    if tool_call is not None:
                        for function_call in tool_call.function_calls:
                            logger.info(f"Tool call received: {function_call.name}")
                            args = function_call.args
                            res_payload = {"success": False}

                            # Tool 1: get_menu
                            if function_call.name == "get_menu":
                                res_payload = await asyncio.to_thread(takeaway_tools.get_menu)

                            # Tool 2: check_delivery_zone
                            elif function_call.name == "check_delivery_zone":
                                postcode = args.get("postcode", "")
                                res_payload = await asyncio.to_thread(takeaway_tools.check_delivery_zone, postcode)

                            # Tool 3: place_order
                            elif function_call.name == "place_order":
                                res_payload = await asyncio.to_thread(
                                    takeaway_tools.place_order,
                                    order_type=args.get("order_type"),
                                    customer_name=args.get("customer_name"),
                                    customer_phone=args.get("customer_phone"),
                                    delivery_address=args.get("delivery_address"),
                                    delivery_postcode=args.get("delivery_postcode"),
                                    items=args.get("items"),
                                    payment_method=args.get("payment_method"),
                                    notes=args.get("notes"),
                                    call_sid=self.call_sid
                                )

                            # Tool 4: send_payment_link
                            elif function_call.name == "send_payment_link":
                                res_payload = await asyncio.to_thread(
                                    takeaway_tools.send_payment_link,
                                    order_reference=args.get("order_reference"),
                                    amount_pence=args.get("amount_pence"),
                                    phone_number=args.get("phone_number")
                                )

                            # Tool 5: transfer_to_human
                            elif function_call.name == "transfer_to_human":
                                success = False
                                if self.twilio_client and self.call_sid:
                                    try:
                                        # Pull restaurant phone from profile or fallback
                                        transfer_num = self.profile.get("phone") or os.environ.get("RESTAURANT_TRANSFER_PHONE", "+441942555123")
                                        logger.info(f"Transferring Twilio Call {self.call_sid} to {transfer_num}")
                                        
                                        # Use thread pool for blocking twilio client redirect call
                                        def redirect_call():
                                            self.twilio_client.calls(self.call_sid).update(
                                                twiml=f'<Response><Say>Please hold while I connect you to the restaurant.</Say><Dial>{transfer_num}</Dial></Response>'
                                            )
                                        await asyncio.to_thread(redirect_call)
                                        success = True
                                    except Exception as tx_err:
                                        logger.error(f"Failed to redirect call: {tx_err}")
                                res_payload = {"success": success, "status": "Call transferred to human staff" if success else "Failed to redirect call"}

                            # Tool 6: get_order
                            elif function_call.name == "get_order":
                                order_reference = args.get("order_reference")
                                res_payload = await asyncio.to_thread(
                                    takeaway_tools.get_order,
                                    order_reference=order_reference
                                )

                            # Tool 7: cancel_order
                            elif function_call.name == "cancel_order":
                                order_reference = args.get("order_reference")
                                reason = args.get("reason")
                                res_payload = await asyncio.to_thread(
                                    takeaway_tools.cancel_order,
                                    order_reference=order_reference,
                                    reason=reason
                                )

                            # Tool 8: modify_order
                            elif function_call.name == "modify_order":
                                order_reference = args.get("order_reference")
                                items = args.get("items")
                                notes = args.get("notes")
                                res_payload = await asyncio.to_thread(
                                    takeaway_tools.modify_order,
                                    order_reference=order_reference,
                                    items=items,
                                    notes=notes
                                )

                            # Send response back to Gemini
                            await self.session.send_tool_response(
                                function_responses=[
                                    types.FunctionResponse(
                                        name=function_call.name,
                                        id=function_call.id,
                                        response=res_payload
                                    )
                                ]
                            )
                            logger.info(f"Sent tool response for {function_call.name} to Gemini.")

                    if (response.server_content is not None
                            and hasattr(response.server_content, 'turn_complete')
                            and response.server_content.turn_complete):
                        logger.info("Model turn complete. Waiting for next user input...")

        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Error in Gemini receive loop: {e}")

    async def _send_audio_to_twilio(self, pcm_24k_bytes):
        try:
            # Boost the volume of the recorded audio by 1.4x
            louder_recording_pcm = audioop.mul(pcm_24k_bytes, 2, 1.4)
            if self.gemini_wav:
                self.gemini_wav.writeframes(louder_recording_pcm)

            pcm_8k, self.out_rate_state = audioop.ratecv(pcm_24k_bytes, 2, 1, GEMINI_SAMPLE_RATE_OUT, TWILIO_SAMPLE_RATE, self.out_rate_state)
            louder_pcm = audioop.mul(pcm_8k, 2, 1.4)
            ulaw_bytes = audioop.lin2ulaw(louder_pcm, 2)
            await self.outbound_queue.put(ulaw_bytes)
        except Exception as e:
            logger.error(f"Error preparing audio for Twilio: {e}")

    async def _outbound_pacer(self):
        try:
            start_time = asyncio.get_event_loop().time()
            sent_chunks = 0
            while self.is_running:
                ulaw_bytes = await self.outbound_queue.get()
                chunk_size = 160
                for i in range(0, len(ulaw_bytes), chunk_size):
                    if not self.is_running:
                        break
                    chunk = ulaw_bytes[i:i + chunk_size]
                    if len(chunk) < chunk_size:
                        chunk = chunk + b'\xff' * (chunk_size - len(chunk))
                        
                    payload = base64.b64encode(chunk).decode('utf-8')
                    message = {
                        "event": "media",
                        "streamSid": self.stream_sid,
                        "media": {
                            "track": "outbound",
                            "payload": payload
                        }
                    }
                    await self.twilio_ws.send_text(json.dumps(message))
                    
                    for ws in list(self.listeners):
                        try:
                            await ws.send_text(json.dumps({
                                "event": "audio",
                                "track": "outbound",
                                "payload": payload
                            }))
                        except Exception:
                            if ws in self.listeners:
                                self.listeners.remove(ws)
                                
                    sent_chunks += 1
                    last_send_time = asyncio.get_event_loop().time()
                    target_time = start_time + (sent_chunks * 0.02)
                    sleep_dur = target_time - last_send_time
                    if sleep_dur > 0.001:
                        await asyncio.sleep(sleep_dur)
                    
                self.outbound_queue.task_done()
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Error in outbound pacer: {e}")
