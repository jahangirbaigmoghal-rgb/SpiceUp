"""
Pipecat Voice Agent Blueprint.
Orchestrates high-performance voice pipelines (Twilio WebSocket Stream <--> Silero VAD <--> Gemini LLM <--> ElevenLabs TTS).
Usage:
    pip install pipecat-ai pipecat-ai-google pipecat-ai-twilio python-dotenv
    python pipecat_agent.py
"""

import os
import sys
import asyncio
import logging
from dotenv import load_dotenv

# Load configuration keys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
BRIDGE_DIR = Path(__file__).resolve().parent
load_dotenv(ROOT / ".env.local")
load_dotenv(ROOT / ".env")
load_dotenv(BRIDGE_DIR / ".env", override=True)

# Map GOOGLE_API_KEY to GEMINI_API_KEY fallback
if not os.getenv("GEMINI_API_KEY") and os.getenv("GOOGLE_API_KEY"):
    os.environ["GEMINI_API_KEY"] = os.getenv("GOOGLE_API_KEY")


from pipecat.frames.frames import EndFrame
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineTask
from pipecat.processors.aggregators.llm_response import (
    LLMUserResponseAggregator,
    LLMAssistantResponseAggregator,
)
from pipecat.services.gemini import GeminiLLMService
from pipecat.services.elevenlabs import ElevenLabsTTSService
from pipecat.transports.network.fastapi_websocket import FastAPIWebsocketTransport
from pipecat.vad.silero import SileroVADAnalyzer

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("pipecat-voice-agent")


async def run_agent(websocket, stream_sid):
    # 1. Initialize Transport
    # Handles raw audio stream parsing, buffering, and packetization for Twilio WebSockets
    transport = FastAPIWebsocketTransport(
        websocket=websocket,
        stream_sid=stream_sid,
        params=FastAPIWebsocketTransport.SerializerParams(
            sample_rate=8000,          # Twilio telephonic sample rate
            input_channels=1,
            output_channels=1
        )
    )

    # 2. Initialize AI Services (Gemini LLM & ElevenLabs TTS)
    llm = GeminiLLMService(
        api_key=os.environ.get("GEMINI_API_KEY"),
        model="gemini-2.5-flash",
        system_instruction="You are a helpful phone dispatcher. Keep answers concise, sweet, and to the point."
    )

    tts = ElevenLabsTTSService(
        api_key=os.environ.get("ELEVENLABS_API_KEY"),
        voice_id="21m00Tcm4TlvDq8ikWAM",  # Rachel voice
    )

    # 3. Assemble the Pipecat pipeline
    # Frame progression: Inbound Audio -> VAD Analyzer -> Prompt Aggregator -> LLM Response Generator -> TTS Output -> Outbound Audio
    pipeline = Pipeline([
        transport.input(),
        SileroVADAnalyzer(),
        LLMUserResponseAggregator(),
        llm,
        tts,
        LLMAssistantResponseAggregator(),
        transport.output(),
    ])

    task = PipelineTask(pipeline)

    # Clean up when the Twilio call drops
    @transport.on_client_disconnected
    async def on_client_disconnected(transport):
        logger.info("Twilio media stream WebSocket disconnected. Stopping pipeline...")
        await task.queue_frame(EndFrame())

    # Boot runner
    runner = PipelineRunner()
    await runner.run([task])


if __name__ == "__main__":
    print("Pipecat agent ready for FastAPI route import. Import run_agent in your FastAPI main.py.")
