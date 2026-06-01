import os
import json

curr_log_path = r"C:\Users\jahan\.gemini\antigravity\brain\c68c7e34-8b01-4a64-a133-e15f952d2d3d\.system_generated\logs\transcript.jsonl"

def search_all_curr_writes():
    if not os.path.exists(curr_log_path):
        print("Not found")
        return
    with open(curr_log_path, 'r', encoding='utf-8', errors='ignore') as f:
        for idx, line in enumerate(f):
            if "write_to_file" in line or "replace_file_content" in line or "multi_replace_file_content" in line:
                try:
                    obj = json.loads(line)
                    tcs = obj.get('tool_calls', [])
                    for tc in tcs:
                        name = tc.get('name')
                        if name in ['write_to_file', 'replace_file_content', 'multi_replace_file_content']:
                            args = tc.get('args', {})
                            target = args.get('TargetFile') or args.get('Target') or args.get('AbsolutePath')
                            print(f"Line {idx}: {name} -> {target}")
                except Exception as e:
                    pass

search_all_curr_writes()
