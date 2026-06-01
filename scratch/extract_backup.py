import os
import json

prev_log_path = r"C:\Users\jahan\.gemini\antigravity\brain\3e79befb-effe-4731-a575-17e052ae185e\.system_generated\logs\transcript.jsonl"
output_path = r"c:\Users\jahan\Outskill\Projects\TakeAwayPOS\apps\admin\src\App.tsx.backup"

def extract_backup():
    if not os.path.exists(prev_log_path):
        print("Prev log not found")
        return
    with open(prev_log_path, 'r', encoding='utf-8', errors='ignore') as f:
        for idx, line in enumerate(f):
            if idx == 1854:
                obj = json.loads(line)
                tcs = obj.get('tool_calls', [])
                for tc in tcs:
                    args = tc.get('args', {})
                    code = args.get('CodeContent', '')
                    print(f"Found code length: {len(code)}")
                    with open(output_path, 'w', encoding='utf-8') as out_f:
                        out_f.write(code)
                    print(f"Wrote backup to {output_path} (size: {os.path.getsize(output_path)} bytes)")

extract_backup()
