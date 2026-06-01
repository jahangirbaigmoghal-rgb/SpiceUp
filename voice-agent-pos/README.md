# Rypeyal Express AI Voice Agent

Dedicated production-grade AI Voice ordering agent for **Rypeyal Express**, powered by the Google Gemini Live API (WebSockets) and Twilio. It is fully integrated with the TakeAwayPOS system APIs to browse menus, check delivery zones, place orders, and email/SMS confirmation links.

## Architecture

The system is built as a lightweight FastAPI application that hooks directly into Twilio Media Streams:

```
                  +------------------+
                  |  Customer Phone  |
                  +--------+---------+
                           |  (PSTN Call)
                           v
                  +--------+---------+
                  |  Twilio Gateway  |
                  +--------+---------+
                           |  (WebSocket /media-stream)
                           v
       +-------------------+-------------------+
       |          FastAPI Voice Gateway        |
       |             (this service)            |
       +-----+---------------------------+-----+
             |                           |
             | (Bi-directional Audio)    | (JSON API HTTP calls)
             v                           v
+------------+------------+     +--------+--------+
| Google Gemini Live API  |     |  TakeAwayPOS    |
| (gemini-2.0-flash-live) |     |  NodeJS Server  |
+-------------------------+     +-----------------+
```

## Prerequisites

- **Python 3.11+**
- **Twilio account** with a phone number (e.g. `+441782288662`)
- **Google Gemini API Key** (supporting Realtime/Live WebSockets)
- **MongoDB** (to read/write call transcripts and customer profiles)
- Running instance of **TakeAwayPOS Backend**

## Quick Start

1. **Install dependencies**:
   ```bash
   cd voice-agent-pos
   pip install -r requirements.txt
   ```

2. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```
   Open the `.env` file and fill in your Gemini API key, Twilio account SID, auth token, and database URI.

3. **Start the voice agent**:
   ```bash
   python main.py
   ```
   The service will launch on port `5050` by default.

## Local Development (with ngrok)

To test the agent with an actual phone call locally, you need to expose your FastAPI app to the internet:

1. **Start ngrok**:
   ```bash
   ngrok http 5050
   ```
2. **Configure Twilio Webhook**:
   - Go to the Twilio Console -> Active Numbers.
   - Select your number (e.g. `+441782288662`).
   - Under "Voice & Fax", set "A CALL COMES IN" to Webhook and enter:
     `https://<your-ngrok-subdomain>.ngrok-free.app/incoming-call`
   - Save your settings.

Now dial `+441782288662` to speak to the AI Ordering Assistant!

## Deployment on Render

This project is fully ready for deployment on **Render**:

1. Create a new **Web Service** on Render.
2. Connect your Git repository.
3. Configure the following settings:
   - **Environment**: `Python`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Add all environment variables from `.env` (Gemini API keys, Twilio credentials, Mongo URI, and Backend URL).
5. Update your Twilio webhook URL to your Render deployment domain (`https://takeawaypos-voice.onrender.com/incoming-call`).

## Available Tools

The voice agent is equipped with the following 10 real-time tools:

1. `get_full_menu`: Retrieves the active menu grouped by category with item IDs, modifier options, and prices.
2. `search_menu`: Searches for specific items using a text query.
3. `get_item_details`: Gets detailed configurations for an item (e.g., modifier options and pricing).
4. `check_delivery_zone`: Validates if a UK postcode outward prefix is eligible for delivery.
5. `place_order`: Commits a confirmed order containing customer name, phone, address, items, modifiers, and payment selection.
6. `send_payment_link`: Requests Stripe checkout link generation and sends it via SMS.
7. `get_order_status`: Retrieves details and fulfillment status of an order using its reference string.
8. `modify_order`: Modifies items for an order if it is in "placed" or "confirmed" status.
9. `cancel_order`: Cancels an order before prep starts.
10. `transfer_to_human`: Instantly redirects the caller to human staff.

## API Endpoints

- `GET /health`: Diagnostic check verifying Gemini status, MongoDB connection, and configuration.
- `POST /incoming-call`: Webhook parsing caller details, enforcing store opening hours, and serving stream-connection TwiML.
- `WS /media-stream`: Bidirectional websocket endpoint receiving Twilio media audio packets and pacing agent audio back.
- `GET /api/active-calls`: Retrieves a list of all ongoing phone calls with metadata and live transcripts.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GEMINI_API_KEY` | Google Gemini API credentials | *(Required)* |
| `GEMINI_MODEL` | Gemini Live API model | `gemini-2.0-flash-live-001` |
| `GEMINI_VOICE` | Prebuilt voice profile | `Charon` (Male UK) |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID | *(Required)* |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token | *(Required)* |
| `TWILIO_PHONE_NUMBER` | Active Twilio phone number | `+441782288662` |
| `BACKEND_URL` | Base URL of the TakeAwayPOS API | `http://localhost:5001` |
| `VOICE_AGENT_API_KEY` | Internal auth token shared with POS | `dev_voice_agent_key` |
| `MONGODB_URI` | Connection URI for customer & call log storage | *(Required)* |
| `RESTAURANT_NAME` | Display name of the restaurant | `Rypeyal Express` |
| `RESTAURANT_PHONE` | Fallback transfer target phone number | `+441782288662` |
| `PORT` | Local server port | `5050` |
| `ENABLE_RECORDING` | Toggles call WAV file saving | `True` |
