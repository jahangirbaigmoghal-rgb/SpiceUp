import os
import json

prev_log_path = r"C:\Users\jahan\.gemini\antigravity\brain\3e79befb-effe-4731-a575-17e052ae185e\.system_generated\logs\transcript.jsonl"

def search_writes():
    if not os.path.exists(prev_log_path):
        print("Not found")
        return
    with open(prev_log_path, 'r', encoding='utf-8', errors='ignore') as f:
        for idx, line in enumerate(f):
            if "write_to_file" in line or "replace_file_content" in line:
                try:
                    obj = json.loads(line)
                    tcs = obj.get('tool_calls', [])
                    for tc in tcs:
                        name = tc.get('name')
                        if name in ['write_to_file', 'replace_file_content', 'multi_replace_file_content']:
                            args = tc.get('args', {})
                            target = args.get('TargetFile') or args.get('Target') or args.get('AbsolutePath')
                            # The paths might have extra quotes or escape chars
                            target_str = str(target).replace('"', '').replace('\\\\', '\\')
                            if "apps/admin/src/App.tsx" in target_str or "apps\\admin\\src\\App.tsx" in target_str:
                                print(f"Line {idx}: {name} -> {target_str}")
                except Exception as e:
                    pass

search_writes()
