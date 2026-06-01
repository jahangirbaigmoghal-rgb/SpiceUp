import os
import json

prev_log_path = r"C:\Users\jahan\.gemini\antigravity\brain\3e79befb-effe-4731-a575-17e052ae185e\.system_generated\logs\transcript.jsonl"

def scan_prev_logs():
    if not os.path.exists(prev_log_path):
        print("Prev log not found")
        return
    
    with open(prev_log_path, 'r', encoding='utf-8', errors='ignore') as f:
        for idx, line in enumerate(f):
            if "App.tsx" in line:
                try:
                    obj = json.loads(line)
                    t = obj.get('type')
                    src = obj.get('source')
                    status = obj.get('status')
                    print(f"Line {idx}: type={t}, source={src}, status={status}")
                    
                    # check if this contains a tool call argument with CodeContent or similar
                    tcs = obj.get('tool_calls', [])
                    for tc in tcs:
                        tc_name = tc.get('name')
                        args = tc.get('arguments', {})
                        for k, v in args.items():
                            if isinstance(v, str) and ("App.tsx" in v or len(v) > 2000):
                                print(f"  Tool {tc_name} arg {k} length: {len(v)}")
                                if "import" in v and "React" in v:
                                    print(f"  FOUND IMPORT/React in arg {k}")
                    
                    # check if this is the output of some tool
                    content = obj.get('content', '')
                    if content and len(content) > 1000:
                        print(f"  Content length: {len(content)}")
                        if "import" in content and "React" in content:
                            print(f"  FOUND IMPORT/React in content")
                except Exception as e:
                    pass

scan_prev_logs()
