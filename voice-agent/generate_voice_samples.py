import os
import asyncio
import wave
from dotenv import load_dotenv
from google import genai
from google.genai import types

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


async def generate_voice_sample(voice_name, text_greeting, output_path):
    print(f"Generating voice sample for {voice_name}...")
    client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
    config = types.LiveConnectConfig(
        response_modalities=["AUDIO"],
        system_instruction=types.Content(parts=[types.Part(text=f"You are {voice_name}, a helpful customer service AI. You must greet the user by saying exactly: '{text_greeting}'")]),
        speech_config=types.SpeechConfig(
            voice_config=types.VoiceConfig(
                prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=voice_name)
            )
        )
    )
    
    pcm_chunks = []
    
    try:
        async with client.aio.live.connect(model="gemini-3.1-flash-live-preview", config=config) as session:
            # Wait for the connection to stabilize to prevent audio stuttering/duplication
            await asyncio.sleep(1.0)
            # Trigger greeting using a directive command
            await session.send_realtime_input(text="Please say your introduction greeting now.")
            
            # Receive events
            async for response in session.receive():
                # Check for direct audio
                if getattr(response, "data", None):
                    pcm_chunks.append(response.data)
                
                # Check for audio in model_turn parts
                if response.server_content and response.server_content.model_turn:
                    for part in response.server_content.model_turn.parts:
                        if part.inline_data and part.inline_data.data:
                            pcm_chunks.append(part.inline_data.data)
                
                # Exit when turn is complete
                if response.server_content and response.server_content.turn_complete:
                    print(f"Turn complete for {voice_name}")
                    break
                    
    except Exception as e:
        print(f"Error generating sample for {voice_name}: {e}")
        return False
        
    if not pcm_chunks:
        print(f"No audio received for {voice_name}!")
        return False
        
    # Write to WAV file (24kHz, 16-bit PCM, Mono)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with wave.open(output_path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(24000)
        w.writeframes(b"".join(pcm_chunks))
        
    print(f"Saved sample to {output_path} (size: {os.path.getsize(output_path)} bytes)")
    return True

async def main():
    samples = [
        ("Charon", "Hello! I am Charon, your plumbing and heating support agent. How can I help you today?", "charon.wav"),
        ("Aoede", "Hi! I am Aoede, your hospitality host. How can I help you today?", "aoede.wav"),
        ("Kore", "Hello, I am Kore, your medical office assistant. How can I assist you?", "kore.wav"),
        ("Fenrir", "Good day, I am Fenrir, your corporate office receptionist. How can I direct your call?", "fenrir.wav"),
    ]
    
    public_audio_dir = r"C:\Users\jahan\Outskill\Projects\AIMate\public\audio"
    
    for voice, text, filename in samples:
        out_path = os.path.join(public_audio_dir, filename)
        success = await generate_voice_sample(voice, text, out_path)
        if not success:
            print(f"Warning: Failed to generate {voice}")
            
if __name__ == "__main__":
    asyncio.run(main())
