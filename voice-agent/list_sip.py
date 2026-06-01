import os
import asyncio
from dotenv import load_dotenv
from livekit import api
from livekit.protocol.sip import ListSIPInboundTrunkRequest, ListSIPDispatchRuleRequest

load_dotenv(r'c:\Users\jahan\Outskill\Projects\AIMate\bridge-server\.env')

async def main():
    url = os.getenv("LIVEKIT_URL")
    key = os.getenv("LIVEKIT_API_KEY")
    secret = os.getenv("LIVEKIT_API_SECRET")
    print(f"Connecting to: {url}")
    print(f"API Key: {key}")
    
    lkapi = api.LiveKitAPI(url, key, secret)
    try:
        trunks = await lkapi.sip.list_inbound_trunk(ListSIPInboundTrunkRequest())
        print("\n--- INBOUND TRUNKS ---")
        for t in trunks.items:
            print(f"Trunk ID: {t.sip_trunk_id}")
            print(f"  Name: {t.name}")
            print(f"  Numbers: {list(t.numbers)}")
            print(f"  Auth Username: {t.auth_username}")
            print(f"  Auth Password: {'[SET]' if t.auth_password else 'N/A'}")
            print(f"  Allowed IPs: {list(t.allowed_addresses)}")
            print(f"  Allowed Numbers: {list(t.allowed_numbers)}")
            
        rules = await lkapi.sip.list_dispatch_rule(ListSIPDispatchRuleRequest())
        print("\n--- DISPATCH RULES ---")
        for r in rules.items:
            print(f"Rule ID: {r.sip_dispatch_rule_id}")
            print(f"  Name: {r.name}")
            print(f"  Trunk IDs: {list(r.trunk_ids)}")
            # Inspect rule details
            rule_type = r.rule.WhichOneof("rule")
            print(f"  Rule Type: {rule_type}")
            if rule_type == "dispatch_rule_direct":
                print(f"    Room Name: {r.rule.dispatch_rule_direct.room_name}")
            elif rule_type == "dispatch_rule_individual":
                print(f"    Room Prefix: {r.rule.dispatch_rule_individual.room_prefix}")
            
    except Exception as e:
        print("Error listing SIP resources:", e)
    finally:
        await lkapi.aclose()

if __name__ == "__main__":
    asyncio.run(main())
