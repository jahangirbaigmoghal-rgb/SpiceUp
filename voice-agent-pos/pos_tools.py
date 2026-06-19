import os
import logging
import asyncio
import httpx
from twilio.rest import Client

logger = logging.getLogger(__name__)

# Load config values (these can also be accessed via context or direct environment vars)
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:5001").rstrip("/")
VOICE_AGENT_API_KEY = os.getenv("VOICE_AGENT_API_KEY", "dev_voice_agent_key")

async def _api_request(endpoint: str, method: str = "GET", data: dict | None = None, use_voice_key: bool = True) -> dict:
    url = f"{BACKEND_URL}{endpoint}"
    headers = {}
    if use_voice_key:
        headers["x-voice-agent-key"] = VOICE_AGENT_API_KEY

    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            if method == "GET":
                response = await client.get(url, headers=headers)
            elif method == "POST":
                response = await client.post(url, headers=headers, json=data)
            else:
                return {"success": False, "error": f"Unsupported method: {method}"}
            
            logger.info(f"API request {method} {url} returned status {response.status_code}")
            
            if response.status_code >= 400:
                try:
                    err_msg = response.json().get("error", response.text)
                except Exception:
                    err_msg = response.text
                return {"success": False, "error": f"API Error ({response.status_code}): {err_msg}"}
                
            try:
                return response.json()
            except Exception as e:
                logger.error(f"Failed to parse JSON response from {url}: {e}. Response text: {response.text[:200]}")
                return {"success": False, "error": f"Invalid JSON response: {e}"}
        except Exception as exc:
            logger.error(f"HTTP request error during {method} {url}: {exc}")
            return {"success": False, "error": f"Connection error: {exc}"}


async def get_full_menu() -> dict:
    """
    Retrieves the full menu from POS system and formats it to be voice-agent-friendly.
    """
    res = await _api_request("/api/voice/menu", "GET", use_voice_key=True)
    if not res or "menu" not in res:
        return {"success": False, "error": "Invalid menu response from backend", "menu_summary": "Menu unavailable"}
    
    raw_menu = res["menu"]
    
    # Format a summary for Gemini context
    summary_parts = []
    for item in raw_menu:
        name = item.get("name", "")
        category = item.get("category", "General")
        price_pounds = item.get("pricePence", 0) / 100.0
        desc = item.get("description", "")
        dietary = item.get("dietaryTags", [])
        
        dietary_str = f" ({', '.join(dietary)})" if dietary else ""
        item_str = f"- Category: {category} | Name: {name} | Price: £{price_pounds:.2f}{dietary_str} | ID: {item.get('itemId')}"
        if desc:
            item_str += f" | Desc: {desc}"
            
        # Modifiers
        mods = item.get("modifierGroups", [])
        if mods:
            mod_strs = []
            for mod in mods:
                opt_strs = [f"{o.get('name')} (+£{o.get('priceDeltaPence', 0)/100.0:.2f})" for o in mod.get("options", [])]
                mod_strs.append(f"{mod.get('name')} [{mod.get('type')}]: {', '.join(opt_strs)}")
            item_str += f" | Options: {'; '.join(mod_strs)}"
            
        summary_parts.append(item_str)
        
    menu_summary = "\n".join(summary_parts)
    return {
        "success": True,
        "menu_summary": menu_summary,
        "raw_menu": raw_menu
    }

async def search_menu(query: str) -> dict:
    """
    Searches for menu items by keyword query.
    """
    res = await _api_request(f"/api/voice/menu/search?q={query}", "GET", use_voice_key=True)
    return res

async def get_item_details(item_id: str) -> dict:
    """
    Retrieves full details of a specific item (using public channel=website endpoint).
    """
    res = await _api_request(f"/api/menu/items/{item_id}?channel=website", "GET", use_voice_key=False)
    return res

async def check_delivery_zone(postcode: str) -> dict:
    """
    Checks if delivery is available to a postcode prefix.
    """
    res = await _api_request("/api/voice/validate-zone", "POST", {"postcode": postcode}, use_voice_key=True)
    return res

async def place_order(
    order_type: str,
    customer_name: str,
    customer_phone: str,
    items: list,
    payment_method: str,
    delivery_address: str | None = None,
    delivery_postcode: str | None = None,
    notes: str | None = None,
    call_sid: str | None = None
) -> dict:
    """
    Submits a new order to the backend POS.
    """
    payload = {
        "order_type": order_type,
        "customer_name": customer_name,
        "customer_phone": customer_phone,
        "items": items,
        "payment_method": payment_method,
        "delivery_address": delivery_address,
        "delivery_postcode": delivery_postcode,
        "notes": notes,
        "call_sid": call_sid
    }
    res = await _api_request("/api/voice/orders", "POST", payload, use_voice_key=True)
    return res

async def send_payment_link(order_reference: str, amount_pence: int, phone_number: str) -> dict:
    """
    Sends a payment link via SMS for an order.
    """
    payload = {
        "order_reference": order_reference,
        "amount_pence": amount_pence,
        "phone_number": phone_number
    }
    res = await _api_request("/api/voice/payment-link", "POST", payload, use_voice_key=True)
    return res

async def get_order_status(order_reference: str) -> dict:
    """
    Retrieves the status and details of an order by reference.
    """
    res = await _api_request(f"/api/voice/orders/{order_reference}", "GET", use_voice_key=True)
    return res

async def modify_order(order_reference: str, items: list, notes: str | None = None) -> dict:
    """
    Modifies the items or details of an existing order.
    """
    payload = {
        "items": items,
        "notes": notes
    }
    res = await _api_request(f"/api/voice/orders/{order_reference}/modify", "POST", payload, use_voice_key=True)
    return res

async def cancel_order(order_reference: str, reason: str | None = None) -> dict:
    """
    Cancels an order before preparation starts.
    """
    payload = {
        "reason": reason
    }
    res = await _api_request(f"/api/voice/orders/{order_reference}/cancel", "POST", payload, use_voice_key=True)
    return res

async def get_store_settings() -> dict:
    """
    Retrieves public store settings (operating hours, fees, etc.).
    """
    res = await _api_request("/api/settings/public", "GET", use_voice_key=False)
    return res

async def transfer_to_human(call_sid: str, transfer_number: str, twilio_client: Client) -> dict:
    """
    Redirects/transfers an active Twilio call to the restaurant or staff number.
    """
    logger.info(f"Initiating call transfer for Sid={call_sid} to {transfer_number}")
    
    def _twilio_redirect():
        # Generate TwiML to Dial the transfer number
        twiml = f"<Response><Dial>{transfer_number}</Dial></Response>"
        call = twilio_client.calls(call_sid).update(twiml=twiml)
        return call.sid

    try:
        # Run Twilio REST client operation in a separate thread since it's blocking
        loop = asyncio.get_running_loop()
        redirect_sid = await loop.run_in_executor(None, _twilio_redirect)
        return {"success": True, "message": "Call successfully redirected", "call_sid": redirect_sid}
    except Exception as e:
        logger.error(f"Error transferring call {call_sid} to {transfer_number}: {e}")
        return {"success": False, "error": str(e)}


def strip_none(d):
    """
    Recursively strips None values from dictionaries and lists to prevent Zod validation errors.
    """
    if isinstance(d, dict):
        return {k: strip_none(v) for k, v in d.items() if v is not None}
    elif isinstance(d, list):
        return [strip_none(v) for v in d]
    else:
        return d


async def calculate_order_price(order_type: str, items: list, delivery_postcode: str | None = None) -> dict:
    """
    Calculates final pricing breakdown for order items.
    """
    payload = {
        "order_type": order_type,
        "items": items,
        "delivery_postcode": delivery_postcode
    }
    cleaned = strip_none(payload)
    res = await _api_request("/api/voice/calculate-price", "POST", cleaned, use_voice_key=True)
    return res


async def send_bill_sms(order_reference: str) -> dict:
    """
    Sends a receipt summary bill via SMS Twilio.
    """
    payload = {
        "order_reference": order_reference
    }
    res = await _api_request("/api/voice/orders/send-bill-sms", "POST", payload, use_voice_key=True)
    return res

