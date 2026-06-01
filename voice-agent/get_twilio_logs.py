import os
from twilio.rest import Client
from dotenv import load_dotenv

load_dotenv(r'c:\Users\jahan\Outskill\Projects\AIMate\bridge-server\.env')

def get_logs():
    account_sid = os.environ.get("TWILIO_ACCOUNT_SID")
    auth_token = os.environ.get("TWILIO_AUTH_TOKEN")
    
    print(f"Using Account SID: {account_sid}")
    client = Client(account_sid, auth_token)
    
    # Get last 5 calls
    print("\n--- Recent Calls ---")
    calls = client.calls.list(limit=5)
    for call in calls:
        print(f"Call SID: {call.sid}")
        print(f"  From: {call.from_formatted}")
        print(f"  To: {call.to_formatted}")
        print(f"  Status: {call.status}")
        print(f"  Start Time: {call.start_time}")
        print(f"  Duration: {call.duration}s")
        print(f"  Failure Reason: {call.queue_time}")
        
    # Get recent alerts/errors
    print("\n--- Recent Debugger Alerts ---")
    alerts = client.monitor.alerts.list(limit=5)
    for alert in alerts:
        print(f"Alert SID: {alert.sid}")
        print(f"  Timestamp: {alert.alert_text}")
        print(f"  Resource SID: {alert.resource_sid}")
        print(f"  Error Code: {alert.error_code}")
        print(f"  More info: https://www.twilio.com/docs/errors/{alert.error_code}")
        print(f"  Description: {alert.more_info}")

if __name__ == "__main__":
    get_logs()
