import os
import json

prev_log_path = r"C:\Users\jahan\.gemini\antigravity\brain\3e79befb-effe-4731-a575-17e052ae185e\.system_generated\logs\transcript.jsonl"

with open(prev_log_path, 'r', encoding='utf-8', errors='ignore') as f:
    for idx, line in enumerate(f):
        if idx == 1854:
            obj = json.loads(line)
            print("Keys of obj:", list(obj.keys()))
            print("type:", obj.get("type"))
            print("source:", obj.get("source"))
            print("status:", obj.get("status"))
            
            # Print tool calls
            tcs = obj.get("tool_calls", [])
            print("Number of tool calls:", len(tcs))
            for i, tc in enumerate(tcs):
                print(f"  TC {i} name:", tc.get("name"))
                args = tc.get("arguments", {})
                print(f"  TC {i} args keys:", list(args.keys()))
                for k, v in args.items():
                    if isinstance(v, str):
                        print(f"    Arg {k} length: {len(v)}")
                        print(f"    Arg {k} start: {v[:100]}")
                        print(f"    Arg {k} end: {v[-100:]}")
                    else:
                        print(f"    Arg {k} type: {type(v)}")
