import os
import json

prev_log_path = r"C:\Users\jahan\.gemini\antigravity\brain\3e79befb-effe-4731-a575-17e052ae185e\.system_generated\logs\transcript.jsonl"

def scan_prev_reads():
    if not os.path.exists(prev_log_path):
        print("Prev log not found")
        return
    with open(prev_log_path, 'r', encoding='utf-8', errors='ignore') as f:
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
                    
                    # If this is the output step (e.g. status=DONE and type=VIEW_FILE)
                    if obj.get('type') == 'VIEW_FILE' and obj.get('status') == 'DONE':
                        content = obj.get('content', '')
                        # check if it contains admin App.tsx references
                        if "apps/admin/src/App.tsx" in content or "apps\\admin\\src\\App.tsx" in content:
                            print(f"Line {idx} VIEW_FILE output, content size: {len(content)}")
                            if "truncated" in content:
                                print("    Contains 'truncated'!")
                except Exception as e:
                    pass

scan_prev_reads()
