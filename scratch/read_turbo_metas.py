import os
import json

turbo_dir = r"c:\Users\jahan\Outskill\Projects\TakeAwayPOS\.turbo\cache"

if os.path.exists(turbo_dir):
    for entry in os.listdir(turbo_dir):
        if entry.endswith("-meta.json"):
            full_path = os.path.join(turbo_dir, entry)
            try:
                with open(full_path, 'r', encoding='utf-8') as f:
                    meta = json.load(f)
                print(f"Meta {entry}: hash={meta.get('hash')}")
                # Print details of the meta json
                for k, v in meta.items():
                    print(f"  {k}: {v}")
            except Exception as e:
                print(f"Error reading {entry}: {e}")
else:
    print("Turbo cache directory not found")
