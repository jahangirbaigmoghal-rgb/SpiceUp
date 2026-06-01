import os

workspace_root = r"c:\Users\jahan\Outskill\Projects\TakeAwayPOS"
files_to_check = ["PRD_IMPLEMENTATION_REPORT.md", "PRODUCTION_IMPLEMENTATION_PLAN.md"]

for fn in files_to_check:
    fp = os.path.join(workspace_root, fn)
    if os.path.exists(fp):
        print(f"\n--- Checking {fn} ---")
        with open(fp, 'r', encoding='utf-8') as f:
            content = f.read()
        print(f"File size: {len(content)} bytes")
        # Search for code blocks containing App.tsx
        lines = content.splitlines()
        for idx, line in enumerate(lines):
            if "App.tsx" in line:
                print(f"Line {idx}: {line}")
                # Print around it
                start = max(0, idx - 5)
                end = min(len(lines), idx + 20)
                print("\n".join(lines[start:end]))
                print("-" * 40)
