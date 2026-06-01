import os
import json

prev_log_path = r"C:\Users\jahan\.gemini\antigravity\brain\3e79befb-effe-4731-a575-17e052ae185e\.system_generated\logs\transcript.jsonl"

def print_line_465():
    if not os.path.exists(prev_log_path):
        print("Not found")
        return
    with open(prev_log_path, 'r', encoding='utf-8', errors='ignore') as f:
        for idx, line in enumerate(f):
            if idx == 465:
                obj = json.loads(line)
                tcs = obj.get('tool_calls', [])
                for tc in tcs:
                    args = tc.get('args', {})
                    code = args.get('CodeContent', '')
                    print(f"Line 465: tool={tc.get('name')}, code length={len(code)}")
                    if "truncated" in code:
                        print("  Code contains word 'truncated'!")

print_line_465()
