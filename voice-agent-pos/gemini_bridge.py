import os
import json
import base64
import audioop
import asyncio
import logging
from datetime import datetime, timezone
from google import genai
from google.genai import types
from twilio.rest import Client

from config import Config
import pos_tools
from call_recorder import CallRecorder

logger = logging.getLogger(__name__)

TWILIO_SAMPLE_RATE = 8000
GEMINI_SAMPLE_RATE_IN = 16000
GEMINI_SAMPLE_RATE_OUT = 24000

class GeminiBridge:
    def __init__(self, twilio_ws, stream_sid: str, call_sid: str, caller_number: str, system_prompt: str, config: Config, db, profile: dict | None = None):
        self.twilio_ws = twilio_ws
        self.stream_sid = stream_sid
        self.call_sid = call_sid
        self.caller_number = caller_number
        self.system_prompt = system_prompt
        self.config = config
        self.db = db
        self.profile = profile or {}
        
        self.client = genai.Client(api_key=config.gemini_api_key)
        self.session = None
        self.session_ctx = None
        self.is_running = False
        self.started_at = datetime.now(timezone.utc)
        
        self.user_transcript_parts = []
        self.agent_transcript_parts = []
        self.transcript_timeline = []
        
        self.in_rate_state = None
        self.out_rate_state = None
        self.outbound_queue = asyncio.Queue()
        self.listeners = []
        
        # Token usage and latency tracking
        self.input_tokens = 0
        self.output_tokens = 0
        self.first_audio_received_at = None
        self.user_finished_speaking_at = None
        self.latency_data = {
            "setupDelay": None,
            "averageTtfw": 0,
            "turnLatencies": []
        }
        
        # Initialize Twilio REST Client for call redirection
        self.twilio_client = Client(config.twilio_account_sid, config.twilio_auth_token)
        self.recorder = None

    async def start(self):
        self.is_running = True
        logger.info(f"Starting Gemini Live session for CallSid={self.call_sid} with voice={self.config.gemini_voice}")
        
        # Define Gemini function declarations
        takeaway_pos_tools = types.Tool(
            function_declarations=[
                types.FunctionDeclaration(
                    name="get_full_menu",
                    description="Retrieves the full menu grouped by category, including item prices, modifier groups, and options. Always call this when the customer asks what is available or starts ordering.",
                    parameters=types.Schema(type="OBJECT", properties={}, required=[])
                ),
                types.FunctionDeclaration(
                    name="search_menu",
                    description="Searches for menu items matching a keyword query.",
                    parameters=types.Schema(
                        type="OBJECT",
                        properties={
                            "query": types.Schema(type="STRING", description="Search term, e.g. 'Pizza', 'Kebab', 'Chips'")
                        },
                        required=["query"]
                    )
                ),
                types.FunctionDeclaration(
                    name="get_item_details",
                    description="Retrieves details for a specific menu item including variations and options by item ID.",
                    parameters=types.Schema(
                        type="OBJECT",
                        properties={
                            "item_id": types.Schema(type="STRING", description="Unique menu item ID")
                        },
                        required=["item_id"]
                    )
                ),
                types.FunctionDeclaration(
                    name="check_delivery_zone",
                    description="Checks if delivery is available to a postcode prefix. Returns the delivery charge and minimum order limit.",
                    parameters=types.Schema(
                        type="OBJECT",
                        properties={
                            "postcode": types.Schema(type="STRING", description="UK Postcode prefix or outward code, e.g., 'ST6', 'ST1'")
                        },
                        required=["postcode"]
                    )
                ),
                types.FunctionDeclaration(
                    name="place_order",
                    description="Places a confirmed order. Only call this after confirming the full list of items, sizes, modifiers, payment method, and customer details.",
                    parameters=types.Schema(
                        type="OBJECT",
                        properties={
                            "order_type": types.Schema(type="STRING", description="Must be 'delivery' or 'collection'"),
                            "customer_name": types.Schema(type="STRING"),
                            "customer_phone": types.Schema(type="STRING"),
                            "items": types.Schema(
                                type="ARRAY",
                                description="List of ordered items with modifiers",
                                items=types.Schema(
                                    type="OBJECT",
                                    properties={
                                        "menu_item_id": types.Schema(type="STRING"),
                                        "variation_id": types.Schema(type="STRING", description="Optional variation ID, e.g. for portion sizes or builds"),
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
                                    },
                                    required=["menu_item_id", "quantity"]
                                )
                            ),
                            "payment_method": types.Schema(type="STRING", description="Must be 'card_link' or 'cash_on_delivery'"),
                            "delivery_address": types.Schema(type="STRING", description="Full address line. Required for delivery."),
                            "delivery_postcode": types.Schema(type="STRING", description="Delivery postcode. Required for delivery."),
                            "notes": types.Schema(type="STRING", description="Special kitchen notes or delivery instructions")
                        },
                        required=["order_type", "customer_name", "customer_phone", "items", "payment_method"]
                    )
                ),
                types.FunctionDeclaration(
                    name="send_payment_link",
                    description="Generates Stripe payment link and sends it via SMS. Call this after place_order() or modify_order() if payment_method is 'card_link' and they have a card balance.",
                    parameters=types.Schema(
                        type="OBJECT",
                        properties={
                            "order_reference": types.Schema(type="STRING", description="Order reference sequence, e.g. ORD-20260601-0001"),
                            "amount_pence": types.Schema(type="INTEGER", description="The price in pence to pay"),
                            "phone_number": types.Schema(type="STRING", description="Customer phone number")
                        },
                        required=["order_reference", "amount_pence", "phone_number"]
                    )
                ),
                types.FunctionDeclaration(
                    name="get_order_status",
                    description="Retrieves status and details of an existing order by its reference sequence.",
                    parameters=types.Schema(
                        type="OBJECT",
                        properties={
                            "order_reference": types.Schema(type="STRING", description="Order reference sequence, e.g. ORD-20260601-0001")
                        },
                        required=["order_reference"]
                    )
                ),
                types.FunctionDeclaration(
                    name="modify_order",
                    description="Modifies the items in an existing order. Only allowed if status is 'placed' or 'confirmed'.",
                    parameters=types.Schema(
                        type="OBJECT",
                        properties={
                            "order_reference": types.Schema(type="STRING"),
                            "items": types.Schema(
                                type="ARRAY",
                                items=types.Schema(
                                    type="OBJECT",
                                    properties={
                                        "menu_item_id": types.Schema(type="STRING"),
                                        "variation_id": types.Schema(type="STRING", description="Optional variation ID, e.g. for portion sizes or builds"),
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
                                    },
                                    required=["menu_item_id", "quantity"]
                                )
                            ),
                            "notes": types.Schema(type="STRING", description="Updated notes")
                        },
                        required=["order_reference", "items"]
                    )
                ),
                types.FunctionDeclaration(
                    name="cancel_order",
                    description="Cancels an order by reference sequence. Only allowed if status is 'placed' or 'confirmed'.",
                    parameters=types.Schema(
                        type="OBJECT",
                        properties={
                            "order_reference": types.Schema(type="STRING"),
                            "reason": types.Schema(type="STRING", description="Reason for cancellation")
                        },
                        required=["order_reference"]
                    )
                ),
                types.FunctionDeclaration(
                    name="calculate_order_price",
                    description="Calculates the subtotal, delivery charge, and final total price of the items. Always call this to get the exact total before summarizing the order for the customer.",
                    parameters=types.Schema(
                        type="OBJECT",
                        properties={
                            "order_type": types.Schema(type="STRING", description="Must be 'delivery' or 'collection'"),
                            "delivery_postcode": types.Schema(type="STRING", description="UK Postcode prefix, e.g. ST6. Required for delivery."),
                            "items": types.Schema(
                                type="ARRAY",
                                description="List of items to calculate price for",
                                items=types.Schema(
                                    type="OBJECT",
                                    properties={
                                        "menu_item_id": types.Schema(type="STRING"),
                                        "variation_id": types.Schema(type="STRING", description="Optional variation ID, e.g. for portion sizes or builds"),
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
                                    },
                                    required=["menu_item_id", "quantity"]
                                )
                            )
                        },
                        required=["order_type", "items"]
                    )
                ),
                types.FunctionDeclaration(
                    name="send_bill_sms",
                    description="Sends a beautiful space-aligned, tabular formatted receipt SMS bill to the customer for a placed order.",
                    parameters=types.Schema(
                        type="OBJECT",
                        properties={
                            "order_reference": types.Schema(type="STRING", description="Order reference sequence, e.g. ORD-20260601-0001")
                        },
                        required=["order_reference"]
                    )
                ),
                types.FunctionDeclaration(
                    name="transfer_to_human",
                    description="Redirects/transfers the phone call to the restaurant staff. Call this if customer asks to speak to staff or if there is an unresolvable issue.",
                    parameters=types.Schema(type="OBJECT", properties={}, required=[])
                )
            ]
        )

        # Configure Live Session
        live_config = types.LiveConnectConfig(
            response_modalities=["AUDIO"],
            system_instruction=types.Content(parts=[types.Part(text=self.system_prompt)]),
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=self.config.gemini_voice)
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

        # Connect to Gemini Live API
        try:
            self.session_ctx = self.client.aio.live.connect(model=self.config.gemini_model, config=live_config)
            self.session = await self.session_ctx.__aenter__()
            
            # Start Call Recorder if enabled
            if self.config.enable_recording:
                self.recorder = CallRecorder(self.call_sid, self.config, self.db)
                
            # Launch background loops
            self.receive_task = asyncio.create_task(self._receive_from_gemini())
            self.pacer_task = asyncio.create_task(self._outbound_pacer())
            
            # Send initial greeting trigger instructions to model
            greeting_msg = (
                f"The customer has joined the call. Greet them warmly as {self.config.restaurant_name} ordering assistant. "
                "Ask if they want delivery or collection, and guide them through the menu ordering. Let them know they can speak naturally."
            )
            await self.session.send_realtime_input(text=greeting_msg)
            logger.info("Gemini session connected and greeting sent.")
        except Exception as e:
            logger.error(f"Error starting Gemini Live session: {e}")
            self.is_running = False

    async def receive_audio(self, base64_payload: str):
        if not self.session or not self.is_running:
            return

        try:
            ulaw_bytes = base64.b64decode(base64_payload)
            # Convert µ-law to PCM 8kHz 16-bit
            pcm_8k = audioop.ulaw2lin(ulaw_bytes, 2)
            # Upsample 8kHz -> 16kHz
            pcm_16k, self.in_rate_state = audioop.ratecv(
                pcm_8k, 2, 1, TWILIO_SAMPLE_RATE, GEMINI_SAMPLE_RATE_IN, self.in_rate_state
            )
            
            # Write to CallRecorder
            if self.recorder:
                self.recorder.write_user_audio(pcm_16k)
                
            # Stream inbound audio to visual dashboard listeners
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

            # Send PCM to Gemini Live API
            await self.session.send_realtime_input(
                audio=types.Blob(data=pcm_16k, mime_type="audio/pcm;rate=16000")
            )
        except Exception as e:
            logger.error(f"Error streaming user audio to Gemini: {e}")

    async def _receive_from_gemini(self):
        try:
            while self.is_running:
                async for response in self.session.receive():
                    if not self.is_running:
                        break

                    # 1. Capture API billing token counts
                    if getattr(response, "usage_metadata", None) is not None:
                        metadata = response.usage_metadata
                        self.input_tokens = getattr(metadata, "prompt_token_count", self.input_tokens)
                        self.output_tokens = getattr(metadata, "candidates_token_count", self.output_tokens)

                    # 2. Handle Interruption (Barge-in)
                    if response.server_content is not None and response.server_content.interrupted:
                        logger.info("Barge-in: clearing outbound queue and Twilio audio buffer.")
                        while not self.outbound_queue.empty():
                            try:
                                self.outbound_queue.get_nowait()
                                self.outbound_queue.task_done()
                            except Exception:
                                break
                        # Send clear buffer to Twilio
                        await self.twilio_ws.send_text(json.dumps({
                            "event": "clear",
                            "streamSid": self.stream_sid
                        }))

                    # 3. Stream agent audio and process transcript text
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

                    # 4. Latency Tracking
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

                    # 5. Handle Tool Call executions
                    tool_call = response.tool_call
                    if tool_call is not None:
                        for function_call in tool_call.function_calls:
                            logger.info(f"Received tool call from Gemini: {function_call.name}")
                            res_payload = await self._handle_tool_call(function_call)
                            
                            # Stream response back to Gemini session
                            await self.session.send_tool_response(
                                function_responses=[
                                    types.FunctionResponse(
                                        name=function_call.name,
                                        id=function_call.id,
                                        response=res_payload
                                    )
                                ]
                            )
                            logger.info(f"Returned tool response for {function_call.name} to Gemini.")

        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Error in Gemini receive loop: {e}")

    async def _send_audio_to_twilio(self, pcm_24k_bytes: bytes):
        try:
            # Write agent audio to wav recorder
            if self.recorder:
                self.recorder.write_agent_audio(pcm_24k_bytes)

            # Resample 24kHz -> 8kHz
            pcm_8k, self.out_rate_state = audioop.ratecv(
                pcm_24k_bytes, 2, 1, GEMINI_SAMPLE_RATE_OUT, TWILIO_SAMPLE_RATE, self.out_rate_state
            )
            
            # Boost voice volume by 1.3x to improve phone audibility without clipping
            boosted_pcm = audioop.mul(pcm_8k, 2, 1.3)
            ulaw_bytes = audioop.lin2ulaw(boosted_pcm, 2)
            await self.outbound_queue.put(ulaw_bytes)
        except Exception as e:
            logger.error(f"Error resampling agent audio: {e}")

    async def _outbound_pacer(self):
        try:
            start_time = asyncio.get_event_loop().time()
            sent_chunks = 0
            while self.is_running:
                ulaw_bytes = await self.outbound_queue.get()
                chunk_size = 160 # 20ms of 8kHz µ-law audio (8000 * 0.02 = 160 bytes)
                for i in range(0, len(ulaw_bytes), chunk_size):
                    if not self.is_running:
                        break
                    chunk = ulaw_bytes[i:i + chunk_size]
                    if len(chunk) < chunk_size:
                        chunk = chunk + b'\xff' * (chunk_size - len(chunk)) # Pad with silence
                        
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
                    
                    # Stream outbound audio to visual dashboard listeners
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
            logger.error(f"Error in Twilio pacing loop: {e}")

    async def _handle_tool_call(self, function_call) -> dict:
        name = function_call.name
        args = function_call.args
        res_payload = {"success": False}
        
        try:
            if name == "get_full_menu":
                res_payload = await pos_tools.get_full_menu()
            elif name == "search_menu":
                res_payload = await pos_tools.search_menu(args.get("query", ""))
            elif name == "get_item_details":
                res_payload = await pos_tools.get_item_details(args.get("item_id", ""))
            elif name == "check_delivery_zone":
                res_payload = await pos_tools.check_delivery_zone(args.get("postcode", ""))
            elif name == "place_order":
                res_payload = await pos_tools.place_order(
                    order_type=args.get("order_type"),
                    customer_name=args.get("customer_name"),
                    customer_phone=args.get("customer_phone"),
                    items=args.get("items"),
                    payment_method=args.get("payment_method"),
                    delivery_address=args.get("delivery_address"),
                    delivery_postcode=args.get("delivery_postcode"),
                    notes=args.get("notes"),
                    call_sid=self.call_sid
                )
            elif name == "send_payment_link":
                res_payload = await pos_tools.send_payment_link(
                    order_reference=args.get("order_reference"),
                    amount_pence=args.get("amount_pence"),
                    phone_number=args.get("phone_number")
                )
            elif name == "calculate_order_price":
                res_payload = await pos_tools.calculate_order_price(
                    order_type=args.get("order_type"),
                    items=args.get("items"),
                    delivery_postcode=args.get("delivery_postcode")
                )
            elif name == "send_bill_sms":
                res_payload = await pos_tools.send_bill_sms(
                    order_reference=args.get("order_reference")
                )
            elif name == "get_order_status":
                res_payload = await pos_tools.get_order_status(args.get("order_reference"))
            elif name == "modify_order":
                res_payload = await pos_tools.modify_order(
                    order_reference=args.get("order_reference"),
                    items=args.get("items"),
                    notes=args.get("notes")
                )
            elif name == "cancel_order":
                res_payload = await pos_tools.cancel_order(
                    order_reference=args.get("order_reference"),
                    reason=args.get("reason")
                )
            elif name == "transfer_to_human":
                res_payload = await pos_tools.transfer_to_human(
                    self.call_sid, self.config.restaurant_phone, self.twilio_client
                )
        except Exception as e:
            logger.error(f"Failed to execute tool {name}: {e}")
            res_payload = {"success": False, "error": str(e)}
            
        return res_payload

    def _append_transcript(self, server_content):
        if server_content is None:
            return
            
        elapsed = round(max(0.0, (datetime.now(timezone.utc) - self.started_at).total_seconds()), 2)
        
        # User input text
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
                if self.recorder:
                    self.recorder.add_transcript("user", text, elapsed)
                asyncio.create_task(self._relay_transcript("user", text, elapsed))

        # Agent response text
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
                if self.recorder:
                    self.recorder.add_transcript("agent", text, elapsed)
                asyncio.create_task(self._relay_transcript("agent", text, elapsed))

    async def _relay_transcript(self, role: str, text: str, elapsed: float):
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

    async def stop(self, status: str = "completed"):
        if not self.is_running:
            return

        self.is_running = False
        logger.info(f"Stopping GeminiLive session for CallSid={self.call_sid}")
        
        # Finalize WAV recording & save logs
        if self.recorder:
            try:
                await asyncio.shield(
                    self.recorder.finalize(
                        status=status,
                        user_transcript_parts=self.user_transcript_parts,
                        agent_transcript_parts=self.agent_transcript_parts,
                        transcript_timeline=self.transcript_timeline,
                        input_tokens=self.input_tokens,
                        output_tokens=self.output_tokens,
                        latency_data=self.latency_data,
                        caller_number=self.caller_number,
                        stream_sid=self.stream_sid
                    )
                )
            except Exception as e:
                logger.error(f"Error finalizing recording: {e}")
            self.recorder = None

        # Terminate background tasks
        if hasattr(self, 'receive_task') and self.receive_task:
            self.receive_task.cancel()
            try:
                await self.receive_task
            except asyncio.CancelledError:
                pass
            self.receive_task = None
            
        if hasattr(self, 'pacer_task') and self.pacer_task:
            self.pacer_task.cancel()
            try:
                await self.pacer_task
            except asyncio.CancelledError:
                pass
            self.pacer_task = None

        # Close Live API Connection Context
        if self.session_ctx:
            try:
                await asyncio.wait_for(self.session_ctx.__aexit__(None, None, None), timeout=2.0)
            except Exception as e:
                logger.warning(f"Error closing Gemini websocket context: {e}")
            finally:
                self.session_ctx = None
                self.session = None
