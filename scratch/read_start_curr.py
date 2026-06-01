import os
import json

curr_log_path = r"C:\Users\jahan\.gemini\antigravity\brain\c68c7e34-8b01-4a64-a133-e15f952d2d3d\.system_generated\logs\transcript.jsonl"

def read_start():
    if not os.path.exists(curr_log_path):
        print("Not found")
        return
    with open(curr_log_path, 'r', encoding='utf-8', errors='ignore') as f:
        for idx, line in enumerate(f):
            if idx < 45:
                try:
                    obj = json.loads(line)
                    t = obj.get('type')
                    src = obj.get('source')
                    print(f"Line {idx}: type={t}, source={src}")
                    if t == 'USER_INPUT':
                        print(f"  User input: {obj.get('content')}")
                    if 'tool_calls' in obj:
                        for tc in obj['tool_calls']:
                            print(f"  Tool: {tc.get('name')}, args={list(tc.get('args', {}).keys())}")
                except Exception as e:
                    pass

read_start()
