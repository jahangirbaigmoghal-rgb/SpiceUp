import os
import json
import urllib.request
import logging

logger = logging.getLogger(__name__)

# Backend API configuration loaded from environment variables
BACKEND_URL = os.environ.get("BACKEND_URL") or os.environ.get("VITE_API_URL") or "http://localhost:5001"
VOICE_AGENT_API_KEY = os.environ.get("VOICE_AGENT_API_KEY", "dev_voice_agent_key")

def call_backend_api(endpoint: str, method: str = "GET", data: dict = None) -> dict:
    """Helper to send HTTP requests to the backend /api/voice/ endpoints."""
    url = f"{BACKEND_URL.rstrip('/')}/api/voice/{endpoint.lstrip('/')}"
    headers = {
        "Content-Type": "application/json",
        "x-voice-agent-key": VOICE_AGENT_API_KEY
    }

    try:
        req_data = None
        if data is not None:
            req_data = json.dumps(data).encode("utf-8")

        req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
        with urllib.request.urlopen(req, timeout=10) as response:
            res_body = response.read().decode("utf-8")
            return json.loads(res_body)
    except urllib.error.HTTPError as e:
        try:
            err_body = e.read().decode("utf-8")
            err_json = json.loads(err_body)
            logger.error(f"HTTPError calling backend {method} {url}: {e.code} - {err_json.get('error', err_body)}")
            return {"error": err_json.get("error", f"HTTP Error {e.code}"), "status": e.code}
        except Exception:
            logger.error(f"HTTPError calling backend {method} {url}: {e.code} - {e.reason}")
            return {"error": f"HTTP Error {e.code}: {e.reason}", "status": e.code}
    except Exception as e:
        logger.error(f"Exception calling backend {method} {url}: {str(e)}")
        return {"error": f"API Connection failed: {str(e)}", "status": 500}

# ─── TakeawayPOS API Wrappers ───────────────────────────────────────────────

def get_menu() -> dict:
    """Retrieves the current available menu items grouped by category."""
    logger.info("Voice Tool: get_menu() called")
    res = call_backend_api("menu", "GET")
    if "error" in res:
        return {"success": False, "error": res["error"]}
    return {"success": True, "menu": res.get("menu", [])}

def check_delivery_zone(postcode: str) -> dict:
    """Validates whether a UK postcode prefix is in the delivery zone."""
    logger.info(f"Voice Tool: check_delivery_zone('{postcode}') called")
    res = call_backend_api("validate-zone", "POST", {"postcode": postcode})
    if "error" in res:
        return {"success": False, "error": res["error"]}
    return res # Returns {"valid": True/False, "deliveryChargePence": X, etc.}

def place_order(
    order_type: str,
    customer_name: str,
    customer_phone: str,
    delivery_address: str = None,
    delivery_postcode: str = None,
    items: list = None,
    payment_method: str = "card_link",
    notes: str = None,
    call_sid: str = None
) -> dict:
    """Places a confirmed order into the POS system."""
    logger.info(f"Voice Tool: place_order(type={order_type}, name={customer_name}) called")
    payload = {
        "order_type": order_type,
        "customer_name": customer_name,
        "customer_phone": customer_phone,
        "delivery_address": delivery_address,
        "delivery_postcode": delivery_postcode,
        "items": items,
        "payment_method": payment_method,
        "notes": notes,
        "call_sid": call_sid
    }
    res = call_backend_api("orders", "POST", payload)
    if "error" in res:
        return {"success": False, "error": res["error"]}
    return {"success": True, "order": res}

def send_payment_link(order_reference: str, amount_pence: int, phone_number: str) -> dict:
    """Generates a Stripe Payment Link and dispatches it to the customer via SMS."""
    logger.info(f"Voice Tool: send_payment_link(ref={order_reference}, amt={amount_pence}) called")
    payload = {
        "order_reference": order_reference,
        "amount_pence": amount_pence,
        "phone_number": phone_number
    }
    res = call_backend_api("payment-link", "POST", payload)
    if "error" in res:
        return {"success": False, "error": res["error"]}
    return res # Returns {"success": True, "paymentLink": URL, "smsSent": True}

def get_order(order_reference: str) -> dict:
    """Retrieves the details of an existing order by its reference sequence."""
    logger.info(f"Voice Tool: get_order('{order_reference}') called")
    res = call_backend_api(f"orders/{order_reference}", "GET")
    if "error" in res:
        return {"success": False, "error": res["error"]}
    return res

def cancel_order(order_reference: str, reason: str = None) -> dict:
    """Cancels an existing order by its reference if it hasn't been prepared yet."""
    logger.info(f"Voice Tool: cancel_order('{order_reference}') called")
    payload = {"reason": reason or "Requested by customer via voice agent"}
    res = call_backend_api(f"orders/{order_reference}/cancel", "POST", payload)
    if "error" in res:
        return {"success": False, "error": res["error"]}
    return res

def modify_order(order_reference: str, items: list, notes: str = None) -> dict:
    """Modifies an existing order's items and notes. Only call after checking status and confirmation."""
    logger.info(f"Voice Tool: modify_order('{order_reference}') called")
    payload = {
        "items": items,
        "notes": notes
    }
    res = call_backend_api(f"orders/{order_reference}/modify", "POST", payload)
    if "error" in res:
        return {"success": False, "error": res["error"]}
    return res
