import os
import json

prev_log_path = r"C:\Users\jahan\.gemini\antigravity\brain\3e79befb-effe-4731-a575-17e052ae185e\.system_generated\logs\transcript.jsonl"
curr_log_path = r"C:\Users\jahan\.gemini\antigravity\brain\c68c7e34-8b01-4a64-a133-e15f952d2d3d\.system_generated\logs\transcript.jsonl"

# We want to find writes/updates to apps/admin/src/App.tsx that were clean.
# Let's search in reverse order or inspect all writes.

def find_writes(log_path, label):
    print(f"\n--- WRITES IN {label} LOG ---")
    if not os.path.exists(log_path):
        print(f"Not found: {log_path}")
        return
    with open(log_path, 'r', encoding='utf-8', errors='ignore') as f:
        for idx, line in enumerate(f):
            if "apps/admin/src/App.tsx" in line:
                try:
                    obj = json.loads(line)
                    # Look at tool calls or content
                    tcs = obj.get('tool_calls', [])
                    for tc in tcs:
                        name = tc.get('name')
                        args = tc.get('arguments', {})
                        target = args.get('TargetFile') or args.get('Target') or args.get('AbsolutePath')
                        if target and ("apps/admin/src/App.tsx" in target or "apps\\admin\\src\\App.tsx" in target):
                            if name in ['write_to_file', 'replace_file_content', 'multi_replace_file_content']:
                                content_len = len(args.get('CodeContent', '') or args.get('ReplacementContent', ''))
                                print(f"Index {idx}: {name} to {target}, length {content_len}")
                                # Print snippet of what was written
                                if 'CodeContent' in args:
                                    snippet = args['CodeContent'][:200] + "..."
                                    print(f"  CodeContent Snippet: {snippet}")
                                elif 'ReplacementContent' in args:
                                    snippet = args['ReplacementContent'][:200] + "..."
                                    print(f"  ReplacementContent Snippet: {snippet}")
                except Exception as e:
                    pass

find_writes(prev_log_path, "Previous")
find_writes(curr_log_path, "Current")
