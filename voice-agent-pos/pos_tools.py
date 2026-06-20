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


def component_visible_on_voice(option, components_map) -> bool:
    comp_id = str(option.get("component")) if option.get("component") else None
    if not comp_id:
        return True
    if comp_id not in components_map:
        return True
    component = components_map[comp_id]
    return component.get("isActive") != False and component.get("channels", {}).get("voice") != False

def format_voice_group(group, labels_map, components_map) -> dict:
    allowed_labels = []
    for label_ref in group.get("allowedLabelIds", []):
        label_id_str = str(label_ref)
        if label_id_str in labels_map:
            lbl = labels_map[label_id_str]
            allowed_labels.append({
                "labelId": label_id_str,
                "name": lbl.get("name") or "",
                "kitchenText": lbl.get("kitchenText") or lbl.get("name") or ""
            })
            
    options = []
    for opt in group.get("options", []):
        if opt.get("isAvailable") == False:
            continue
        if not component_visible_on_voice(opt, components_map):
            continue
        options.append(opt)
        
    options.sort(key=lambda x: x.get("sortOrder", 0))
    
    formatted_options = []
    for opt in options:
        opt_id_str = str(opt["_id"])
        comp_id = str(opt.get("component")) if opt.get("component") else None
        comp_kitchen_name = None
        if comp_id and comp_id in components_map:
            comp_kitchen_name = components_map[comp_id].get("kitchenName")
            
        kitchen_name = comp_kitchen_name or opt.get("name")
        price_delta_pence = group.get("samePricePence", 0) if group.get("samePrice") else opt.get("priceDeltaPence", 0)
        
        formatted_options.append({
            "optionId": opt_id_str,
            "name": opt.get("name"),
            "kitchenName": kitchen_name,
            "priceDeltaPence": price_delta_pence
        })
        
    return {
        "groupId": str(group["_id"]),
        "name": group.get("name"),
        "displayName": group.get("displayName") or group.get("name"),
        "type": group.get("type", "optional"),
        "selectionType": group.get("selectionType", "single"),
        "minSelections": group.get("minSelections") or 0,
        "maxSelections": group.get("maxSelections") or 1,
        "labelsEnabled": group.get("staticLabelsEnabled") != False,
        "allowedLabels": allowed_labels,
        "options": formatted_options
    }

def voice_groups_for_item(item, modifier_groups_map) -> list:
    assignments = []
    for assignment in item.get("groupAssignments", []):
        if assignment.get("isEnabled") == False:
            continue
        if assignment.get("showOnVoice") == False:
            continue
        group_id = str(assignment.get("group")) if assignment.get("group") else None
        if not group_id or group_id not in modifier_groups_map:
            continue
        group = modifier_groups_map[group_id]
        if group.get("isActive") == False:
            continue
            
        required_override = assignment.get("requiredOverride")
        min_selections = group.get("minSelections") or 0
        if required_override == True and not min_selections:
            min_selections = 1
            
        group_type = group.get("type", "optional")
        if required_override == True:
            group_type = "required"
        elif required_override == False:
            group_type = "optional"
            
        copied_group = dict(group)
        copied_group["type"] = group_type
        copied_group["minSelections"] = min_selections
        copied_group["voiceOrder"] = assignment.get("voiceOrder") or 0
        assignments.append(copied_group)
        
    if assignments:
        assignments.sort(key=lambda x: x.get("voiceOrder", 0))
        return assignments
        
    fallback_groups = []
    for m_id in item.get("modifierGroups", []):
        m_id_str = str(m_id)
        if m_id_str in modifier_groups_map:
            group = modifier_groups_map[m_id_str]
            if group.get("isActive") != False and group.get("showOnVoice") != False:
                fallback_groups.append(group)
    fallback_groups.sort(key=lambda x: x.get("sortOrder", 0))
    return fallback_groups

def sync_get_menu_from_db(db) -> list:
    active_tenant = db.tenants.find_one({"isActive": True})
    tenant_id = active_tenant["_id"] if active_tenant else None
    
    categories = list(db.categories.find({}))
    departments = list(db.departments.find({}))
    variations = list(db.variations.find({"isActive": {"$ne": False}}))
    modifier_groups = list(db.modifiergroups.find({"isActive": {"$ne": False}}))
    labels = list(db.labels.find({"isActive": {"$ne": False}}))
    components = list(db.components.find({"isActive": {"$ne": False}}))
    
    categories_map = {str(c["_id"]): c for c in categories}
    departments_map = {str(d["_id"]): d for d in departments}
    modifier_groups_map = {str(m["_id"]): m for m in modifier_groups}
    labels_map = {str(l["_id"]): l for l in labels}
    components_map = {str(c["_id"]): c for c in components}
    
    variations_by_item = {}
    for v in variations:
        item_id = str(v.get("menuItem"))
        variations_by_item.setdefault(item_id, []).append(v)
        
    query = {
        "isAvailable": True,
        "holdStatus": {"$ne": True},
        "publishStatus": "published",
        "channels.voice": {"$ne": False}
    }
    if tenant_id:
        query["tenant"] = tenant_id
    items = list(db.menuitems.find(query))
    
    formatted_menu = []
    for item in items:
        cat_id = str(item.get("category")) if item.get("category") else None
        if not cat_id or cat_id not in categories_map:
            continue
        category = categories_map[cat_id]
        if category.get("isActive") == False or category.get("channels", {}).get("voice") == False:
            continue
            
        parent_id = str(category.get("parent")) if category.get("parent") else None
        parent_cat = None
        if parent_id:
            if parent_id not in categories_map:
                continue
            parent_cat = categories_map[parent_id]
            if parent_cat.get("isActive") == False or parent_cat.get("channels", {}).get("voice") == False:
                continue
                
        item_id_str = str(item["_id"])
        item_variations = variations_by_item.get(item_id_str, [])
        item_variations = [v for v in item_variations if v.get("isActive") != False]
        item_variations.sort(key=lambda x: (x.get("sortOrder", 0), x.get("priceDeltaPence", 0)))
        
        formatted_variations = []
        for var in item_variations:
            formatted_variations.append({
                "variationId": str(var["_id"]),
                "name": var.get("name"),
                "sku": var.get("sku"),
                "priceDeltaPence": var.get("priceDeltaPence", 0),
                "isDefault": var.get("isDefault") == True
            })
            
        groups = voice_groups_for_item(item, modifier_groups_map)
        formatted_groups = []
        for group in groups:
            formatted_g = format_voice_group(group, labels_map, components_map)
            if formatted_g["options"]:
                formatted_groups.append(formatted_g)
                
        category_name = category.get("name") if category else "General"
        parent_category_name = parent_cat.get("name") if parent_cat else None
        
        dept_ref = item.get("department") or (category.get("department") if category else None)
        dept_id_str = str(dept_ref) if dept_ref else None
        department_name = departments_map[dept_id_str].get("name") if (dept_id_str and dept_id_str in departments_map) else None
        
        formatted_menu.append({
            "itemId": item_id_str,
            "name": item.get("name"),
            "shortName": item.get("shortName") or item.get("menuCode") or item.get("name"),
            "kitchenName": item.get("kitchenName") or item.get("shortName") or item.get("name"),
            "menuCode": item.get("menuCode") or "",
            "category": category_name,
            "parentCategory": parent_category_name,
            "department": department_name,
            "pricePence": item.get("basePricePence"),
            "description": item.get("description") or "",
            "dietaryTags": item.get("dietaryTags") or [],
            "allergens": item.get("allergens") or [],
            "variations": formatted_variations,
            "modifierGroups": formatted_groups
        })
        
    return formatted_menu

async def get_menu_from_db(db) -> list:
    return await asyncio.to_thread(sync_get_menu_from_db, db)


async def get_full_menu(db=None) -> dict:
    """
    Retrieves the full menu from POS system and formats it to be voice-agent-friendly.
    """
    raw_menu = None
    if db is not None:
        try:
            logger.info("Fetching menu directly from MongoDB...")
            raw_menu = await get_menu_from_db(db)
            logger.info(f"Direct MongoDB fetch succeeded: retrieved {len(raw_menu)} items.")
        except Exception as e:
            logger.error(f"Failed to fetch menu directly from DB: {e}. Falling back to API...", exc_info=True)
            
    if raw_menu is None:
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
    cleaned = strip_none(payload)
    res = await _api_request("/api/voice/orders", "POST", cleaned, use_voice_key=True)
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
    cleaned = strip_none(payload)
    res = await _api_request(f"/api/voice/orders/{order_reference}/modify", "POST", cleaned, use_voice_key=True)
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

