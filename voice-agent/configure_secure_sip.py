import os
import asyncio
from dotenv import load_dotenv
from livekit import api
from livekit.protocol import sip

load_dotenv(r'c:\Users\jahan\Outskill\Projects\AIMate\bridge-server\.env')

async def main():
    url = os.getenv("LIVEKIT_URL")
    key = os.getenv("LIVEKIT_API_KEY")
    secret = os.getenv("LIVEKIT_API_SECRET")
    print(f"Connecting to: {url}")
    print(f"API Key: {key}")
    
    lkapi = api.LiveKitAPI(url, key, secret)
    try:
        # 1. Clean up existing trunks named 'Twilio Trunk' or matching our numbers
        trunks = await lkapi.sip.list_inbound_trunk(sip.ListSIPInboundTrunkRequest())
        number_variants = ["+447446498803", "447446498803", "07446498803", "7446498803"]
        
        for t in trunks.items:
            # Delete if name matches or any target number overlaps
            overlap = any(num in t.numbers for num in number_variants)
            if t.name == "Twilio Trunk" or t.name == "Twilio Secure Trunk" or overlap:
                print(f"Deleting existing trunk: {t.sip_trunk_id} ({t.name})")
                await lkapi.sip.delete_trunk(sip.DeleteSIPTrunkRequest(sip_trunk_id=t.sip_trunk_id))
                
        # 2. Clean up existing dispatch rules named 'Twilio Trunk'
        rules = await lkapi.sip.list_dispatch_rule(sip.ListSIPDispatchRuleRequest())
        for r in rules.items:
            if r.name == "Twilio Trunk":
                print(f"Deleting existing dispatch rule: {r.sip_dispatch_rule_id} ({r.name})")
                await lkapi.sip.delete_dispatch_rule(sip.DeleteSIPDispatchRuleRequest(sip_dispatch_rule_id=r.sip_dispatch_rule_id))
                
        # 3. Create new secure inbound trunk with number variations
        auth_user = os.getenv("LIVEKIT_SIP_USERNAME", "aimate_twilio")
        auth_pass = os.getenv("LIVEKIT_SIP_PASSWORD", "secure_password_12345!")
        print(f"\nCreating secure trunk for numbers {number_variants}...")
        trunk_info = sip.SIPInboundTrunkInfo(
            name="Twilio Trunk",
            numbers=number_variants,
            auth_username=auth_user,
            auth_password=auth_pass,
            allowed_addresses=["0.0.0.0/0"]
        )
        new_trunk = await lkapi.sip.create_inbound_trunk(sip.CreateSIPInboundTrunkRequest(trunk=trunk_info))
        print(f"Secure Trunk created successfully! ID: {new_trunk.sip_trunk_id}")
        
        # 4. Create dispatch rule matching all trunks (empty trunk_ids list)
        print("\nCreating global dispatch rule matching all trunks...")
        dispatch_rule = sip.SIPDispatchRule(
            dispatch_rule_individual=sip.SIPDispatchRuleIndividual(room_prefix="call_786")
        )
        new_rule = await lkapi.sip.create_dispatch_rule(sip.CreateSIPDispatchRuleRequest(
            name="Twilio Trunk",
            rule=dispatch_rule,
            trunk_ids=[] # Match all trunks globally
        ))
        print(f"Dispatch Rule created successfully! ID: {new_rule.sip_dispatch_rule_id}")
        
    except Exception as e:
        print("Error during configuration:", e)
    finally:
        await lkapi.aclose()

if __name__ == "__main__":
    asyncio.run(main())
