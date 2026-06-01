import os
import json

curr_log_path = r"C:\Users\jahan\.gemini\antigravity\brain\c68c7e34-8b01-4a64-a133-e15f952d2d3d\.system_generated\logs\transcript.jsonl"

with open(curr_log_path, 'r', encoding='utf-8', errors='ignore') as f:
    for idx, line in enumerate(f):
        if idx == 33:
            obj = json.loads(line)
            content = obj.get('content', '')
            print(f"Content length: {len(content)}")
            with open("scratch/line_33_content.txt", "w", encoding="utf-8") as out:
                out.write(content)
            print("Wrote content to scratch/line_33_content.txt")
