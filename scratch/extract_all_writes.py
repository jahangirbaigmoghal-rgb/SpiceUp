import os
import json

prev_log_path = r"C:\Users\jahan\.gemini\antigravity\brain\3e79befb-effe-4731-a575-17e052ae185e\.system_generated\logs\transcript.jsonl"
output_dir = r"c:\Users\jahan\Outskill\Projects\TakeAwayPOS\scratch"

if not os.path.exists(output_dir):
    os.makedirs(output_dir)

with open(prev_log_path, 'r', encoding='utf-8', errors='ignore') as f:
    for idx, line in enumerate(f):
        if idx in [465, 762, 1854]:
            obj = json.loads(line)
            tcs = obj.get('tool_calls', [])
            for tc_idx, tc in enumerate(tcs):
                args = tc.get('arguments', {}) or tc.get('args', {})
                code = args.get('CodeContent') or args.get('code_content') or args.get('Content') or args.get('content')
                if code:
                    out_filename = f"write_{idx}_{tc_idx}.tsx"
                    out_path = os.path.join(output_dir, out_filename)
                    with open(out_path, 'w', encoding='utf-8') as out_f:
                        out_f.write(code)
                    print(f"Index {idx}: tool={tc.get('name')}, content length={len(code)}, saved to {out_filename}")
                else:
                    print(f"Index {idx}: tool={tc.get('name')} has no content in args. Keys: {list(args.keys())}")
