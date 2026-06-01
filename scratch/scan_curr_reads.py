import os
import json

curr_log_path = r"C:\Users\jahan\.gemini\antigravity\brain\c68c7e34-8b01-4a64-a133-e15f952d2d3d\.system_generated\logs\transcript.jsonl"

def scan_curr_reads():
    if not os.path.exists(curr_log_path):
        print("Current log not found")
        return
    with open(curr_log_path, 'r', encoding='utf-8', errors='ignore') as f:
        for idx, line in enumerate(f):
            if "App.tsx" in line:
                try:
                    obj = json.loads(line)
                    tcs = obj.get('tool_calls', [])
                    for tc in tcs:
                        args = tc.get('args', {})
                        target = args.get('AbsolutePath') or args.get('TargetFile')
                        if target:
                            target_str = str(target).lower().replace('\\', '/')
                            if "apps/admin/src/app.tsx" in target_str:
                                print(f"Line {idx}: {tc.get('name')} -> {target}")
                                print(f"  Args: {list(args.keys())} -> Start={args.get('StartLine')}, End={args.get('EndLine')}")
                    
                    if obj.get('type') == 'VIEW_FILE' and obj.get('status') == 'DONE':
                        content = obj.get('content', '')
                        if "apps/admin/src/App.tsx" in content or "apps\\admin\\src\\App.tsx" in content:
                            print(f"Line {idx} VIEW_FILE output, content size: {len(content)}")
                            if "truncated" in content:
                                print("    Contains 'truncated'!")
                except Exception as e:
                    pass

scan_curr_reads()
