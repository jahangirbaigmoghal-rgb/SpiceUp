import os
import json

curr_log_path = r"C:\Users\jahan\.gemini\antigravity\brain\c68c7e34-8b01-4a64-a133-e15f952d2d3d\.system_generated\logs\transcript.jsonl"

def search_curr_writes():
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
                        args = tc.get('args', {})
                        target = args.get('TargetFile') or args.get('Target') or args.get('AbsolutePath')
                        target_str = str(target).replace('"', '').replace('\\\\', '\\')
                        if "App.tsx" in target_str:
                            print(f"Line {idx}: {name} -> {target_str}")
                            # Print args snippet
                            print(f"  Args: {list(args.keys())}")
                            if 'CodeContent' in args:
                                print(f"  CodeContent length: {len(args['CodeContent'])}")
                            if 'ReplacementContent' in args:
                                print(f"  ReplacementContent length: {len(args['ReplacementContent'])}")
                except Exception as e:
                    pass

search_curr_writes()
