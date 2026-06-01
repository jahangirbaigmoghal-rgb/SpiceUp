import os
import json

curr_msg_dir = r"C:\Users\jahan\.gemini\antigravity\brain\c68c7e34-8b01-4a64-a133-e15f952d2d3d\.system_generated\messages"

if os.path.exists(curr_msg_dir):
    for root, dirs, files in os.walk(curr_msg_dir):
        for file in files:
            if file.endswith(".json"):
                full_path = os.path.join(root, file)
                try:
                    with open(full_path, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                    data_str = json.dumps(data)
                    if "App.tsx" in data_str:
                        print(f"Found reference in: {file} (size: {len(data_str)})")
                        # print keys or snippet
                        if isinstance(data, dict):
                            print(f"  Keys: {list(data.keys())}")
                        # Check for code keywords
                        if "gbp" in data_str:
                            print("  Contains 'gbp'!")
                except Exception as e:
                    print(f"Error reading {file}: {e}")
