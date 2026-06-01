import os
import json

prev_log_path = r"C:\Users\jahan\.gemini\antigravity\brain\3e79befb-effe-4731-a575-17e052ae185e\.system_generated\logs\transcript.jsonl"
curr_log_path = r"C:\Users\jahan\.gemini\antigravity\brain\c68c7e34-8b01-4a64-a133-e15f952d2d3d\.system_generated\logs\transcript.jsonl"

def print_line(log_path, line_idx):
    if not os.path.exists(log_path):
        print("Not found")
        return
    with open(log_path, 'r', encoding='utf-8', errors='ignore') as f:
        for idx, line in enumerate(f):
            if idx == line_idx:
                try:
                    obj = json.loads(line)
                    print(f"Index {idx} keys: {list(obj.keys())}")
                    # Print some truncated values to see structure
                    for k, v in obj.items():
                        s = str(v)
                        print(f"  {k}: {s[:400]}")
                except Exception as e:
                    print(f"Failed to parse or print: {e}")
                    print(line[:500])

print("--- CURRENT LINE 32 ---")
print_line(curr_log_path, 32)
print("--- CURRENT LINE 33 ---")
print_line(curr_log_path, 33)
print("--- CURRENT LINE 35 ---")
print_line(curr_log_path, 35)
