import os
import logging
from dataclasses import dataclass
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

@dataclass
class Config:
    gemini_api_key: str
    gemini_model: str
    gemini_voice: str
    twilio_account_sid: str
    twilio_auth_token: str
    twilio_phone_number: str
    backend_url: str
    voice_agent_api_key: str
    mongodb_uri: str
    restaurant_name: str
    restaurant_phone: str
    host: str
    port: int
    enable_recording: bool
    recording_consent_message: str
    s3_bucket_name: str | None = None
    aws_access_key_id: str | None = None
    aws_secret_access_key: str | None = None

    @classmethod
    def from_env(cls) -> "Config":
        # Load environment variables from .env file if it exists
        load_dotenv()

        gemini_api_key = os.getenv("GEMINI_API_KEY")
        if not gemini_api_key:
            raise ValueError("GEMINI_API_KEY environment variable is required")

        twilio_account_sid = os.getenv("TWILIO_ACCOUNT_SID")
        if not twilio_account_sid:
            raise ValueError("TWILIO_ACCOUNT_SID environment variable is required")

        twilio_auth_token = os.getenv("TWILIO_AUTH_TOKEN")
        if not twilio_auth_token:
            raise ValueError("TWILIO_AUTH_TOKEN environment variable is required")

        voice_agent_api_key = os.getenv("VOICE_AGENT_API_KEY")
        if not voice_agent_api_key:
            raise ValueError("VOICE_AGENT_API_KEY environment variable is required")

        mongodb_uri = os.getenv("MONGODB_URI")
        if not mongodb_uri:
            raise ValueError("MONGODB_URI environment variable is required")

        gemini_model = os.getenv("GEMINI_MODEL", "gemini-2.0-flash-live-001")
        gemini_voice = os.getenv("GEMINI_VOICE", "Charon")
        twilio_phone_number = os.getenv("TWILIO_PHONE_NUMBER", "+441782288662")
        backend_url = os.getenv("BACKEND_URL", "http://localhost:5001").rstrip("/")
        restaurant_name = os.getenv("RESTAURANT_NAME", "Rupeyal Express")
        restaurant_phone = os.getenv("RESTAURANT_PHONE", "+441782288662")
        
        host = os.getenv("HOST", "0.0.0.0")
        try:
            port = int(os.getenv("PORT", "5050"))
        except ValueError:
            port = 5050

        enable_recording = os.getenv("ENABLE_RECORDING", "True").lower() in ("true", "1", "yes")
        
        recording_consent_message = os.getenv(
            "RECORDING_CONSENT_MESSAGE", 
            "This call may be recorded for quality and training purposes."
        )

        s3_bucket_name = os.getenv("S3_BUCKET_NAME")
        aws_access_key_id = os.getenv("AWS_ACCESS_KEY_ID")
        aws_secret_access_key = os.getenv("AWS_SECRET_ACCESS_KEY")

        return cls(
            gemini_api_key=gemini_api_key,
            gemini_model=gemini_model,
            gemini_voice=gemini_voice,
            twilio_account_sid=twilio_account_sid,
            twilio_auth_token=twilio_auth_token,
            twilio_phone_number=twilio_phone_number,
            backend_url=backend_url,
            voice_agent_api_key=voice_agent_api_key,
            mongodb_uri=mongodb_uri,
            restaurant_name=restaurant_name,
            restaurant_phone=restaurant_phone,
            host=host,
            port=port,
            enable_recording=enable_recording,
            recording_consent_message=recording_consent_message,
            s3_bucket_name=s3_bucket_name,
            aws_access_key_id=aws_access_key_id,
            aws_secret_access_key=aws_secret_access_key
        )
