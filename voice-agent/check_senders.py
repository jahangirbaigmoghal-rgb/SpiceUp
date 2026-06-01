import requests
import os
import json
from dotenv import load_dotenv

load_dotenv(r'c:\Users\jahan\Outskill\Projects\AIMate\bridge-server\.env')

auth = (os.getenv('TWILIO_ACCOUNT_SID'), os.getenv('TWILIO_AUTH_TOKEN'))
url = 'https://channels.twilio.com/v2/Channels/Senders'

r = requests.get(url, auth=auth)
print('Status:', r.status_code)
try:
    data = r.json()
    print(json.dumps(data, indent=2))
except Exception as e:
    print('Error parsing JSON:', e)
    print(r.text)
