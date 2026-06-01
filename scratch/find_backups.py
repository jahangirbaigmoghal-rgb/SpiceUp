import os
import json

prev_log_path = r"C:\Users\jahan\.gemini\antigravity\brain\3e79befb-effe-4731-a575-17e052ae185e\.system_generated\logs\transcript.jsonl"
curr_log_path = r"C:\Users\jahan\.gemini\antigravity\brain\c68c7e34-8b01-4a64-a133-e15f952d2d3d\.system_generated\logs\transcript.jsonl"

def find_app_tsx(log_path, label):
    print(f"Checking {label} logs...")
    if not os.path.exists(log_path):
        print(f"Log path does not exist: {log_path}")
        return
    
    with open(log_path, 'r', encoding='utf-8', errors='ignore') as f:
        for line_num, line in enumerate(f):
            if "apps/admin/src/App.tsx" in line or "apps\\admin\\src\\App.tsx" in line:
                try:
                    obj = json.loads(line)
                    # Print information about the step where we see the file
                    print(f"Line {line_num}: type={obj.get('type')}, source={obj.get('source')}, status={obj.get('status')}")
                    # Let's check if there is an output field or content field or tool_calls
                    if 'tool_calls' in obj:
                        for tc in obj['tool_calls']:
                            if 'view_file' in tc.get('name', '') or 'write_to_file' in tc.get('name', '') or 'replace_file_content' in tc.get('name', ''):
                                print(f"  Tool call: {tc.get('name')} with arguments keys: {list(tc.get('arguments', {}).keys())}")
                    if 'output' in obj:
                        out_val = obj['output']
                        if isinstance(out_val, str) and len(out_val) > 1000:
                            print(f"  Has output string of length {len(out_val)}")
                    if 'content' in obj:
                        c_val = obj['content']
                        if isinstance(c_val, str) and len(c_val) > 1000:
                            print(f"  Has content string of length {len(c_val)}")
                except Exception as e:
                    print(f"  Failed to parse line {line_num}: {e}")

find_app_tsx(prev_log_path, "Previous")
find_app_tsx(curr_log_path, "Current")
