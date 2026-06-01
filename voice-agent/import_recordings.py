"""
Import local WAV files from scratch/recordings into MongoDB.
Run: python bridge-server/import_recordings.py
"""

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from pymongo import MongoClient

from call_store import save_call_record

ROOT = Path(__file__).resolve().parent.parent
RECORDINGS_DIR = ROOT / "scratch" / "recordings"


def get_db():
    mongo_uri = os.getenv("MONGODB_URI")
    if not mongo_uri or "<" in mongo_uri or ">" in mongo_uri:
        raise RuntimeError("Set MONGODB_URI in .env.local (project root) or bridge-server/.env")
    client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
    db_name = os.getenv("MONGODB_DB")
    if db_name:
        return client.get_database(db_name)
    try:
        return client.get_default_database()
    except Exception:
        return client.get_database("aimate")


def wav_duration_seconds(path):
    import wave

    with wave.open(str(path), "rb") as w:
        return int(w.getnframes() / w.getframerate())


def discover_pairs():
    if not RECORDINGS_DIR.is_dir():
        return {}

    users = {}
    agents = {}

    for path in RECORDINGS_DIR.glob("user_*.wav"):
        call_sid = path.name[len("user_") : -len(".wav")]
        if call_sid:
            users[call_sid] = path

    for path in RECORDINGS_DIR.glob("gemini_*.wav"):
        call_sid = path.name[len("gemini_") : -len(".wav")]
        if call_sid:
            agents[call_sid] = path

    pairs = {}
    for call_sid, user_path in users.items():
        agent_path = agents.get(call_sid)
        if agent_path:
            pairs[call_sid] = (user_path, agent_path)
    return pairs


def import_all(force=False):
    load_dotenv(ROOT / ".env.local")
    load_dotenv(ROOT / ".env")
    load_dotenv(ROOT / "bridge-server" / ".env")

    # Map GOOGLE_API_KEY to GEMINI_API_KEY fallback
    if not os.getenv("GEMINI_API_KEY") and os.getenv("GOOGLE_API_KEY"):
        os.environ["GEMINI_API_KEY"] = os.getenv("GOOGLE_API_KEY")


    db = get_db()
    pairs = discover_pairs()

    profile = db.businessProfiles.find_one({"status": "active"}, sort=[("createdAt", -1)])

    imported = []
    skipped = []
    errors = []

    for call_sid, (user_path, agent_path) in sorted(pairs.items()):
        existing = db.callRecordings.find_one({"callSid": call_sid})
        if existing and not force:
            skipped.append({"callSid": call_sid, "reason": "already_in_database"})
            continue

        try:
            user_stat = user_path.stat()
            agent_stat = agent_path.stat()
            started_at = datetime.fromtimestamp(
                min(user_stat.st_mtime, agent_stat.st_ctime), tz=timezone.utc
            )
            ended_at = datetime.fromtimestamp(
                max(user_stat.st_mtime, agent_stat.st_mtime), tz=timezone.utc
            )

            try:
                duration = max(wav_duration_seconds(user_path), wav_duration_seconds(agent_path))
            except Exception:
                duration = max(0, int((ended_at - started_at).total_seconds()))

            if existing and force:
                db.callRecordings.delete_one({"callSid": call_sid})

            result_id = save_call_record(
                db,
                call_sid=call_sid,
                profile=profile,
                user_wav_path=str(user_path),
                agent_wav_path=str(agent_path),
                started_at=started_at,
                ended_at=ended_at,
                status="completed",
                voice_gateway_provider="websocket",
            )

            if result_id:
                db.callRecordings.update_one(
                    {"callSid": call_sid},
                    {"$set": {"durationSeconds": duration, "importedFromLocal": True}},
                )
                imported.append(call_sid)
            else:
                errors.append({"callSid": call_sid, "error": "save_failed"})
        except Exception as e:
            errors.append({"callSid": call_sid, "error": str(e)})

    all_users = (
        {p.name[len("user_") : -len(".wav")] for p in RECORDINGS_DIR.glob("user_*.wav")}
        if RECORDINGS_DIR.is_dir()
        else set()
    )
    all_gemini = (
        {p.name[len("gemini_") : -len(".wav")] for p in RECORDINGS_DIR.glob("gemini_*.wav")}
        if RECORDINGS_DIR.is_dir()
        else set()
    )

    return {
        "imported": imported,
        "skipped": skipped,
        "errors": errors,
        "missingAgentFile": sorted(all_users - all_gemini),
        "missingUserFile": sorted(all_gemini - all_users),
        "foundPairs": len(pairs),
    }


if __name__ == "__main__":
    force = "--force" in sys.argv
    try:
        summary = import_all(force=force)
        print(json.dumps(summary))
    except Exception as e:
        print(json.dumps({"error": str(e), "imported": [], "skipped": [], "errors": []}))
        sys.exit(1)
