import os

workspace_root = r"c:\Users\jahan\Outskill\Projects\TakeAwayPOS"

for root, dirs, files in os.walk(workspace_root):
    if "node_modules" in root or ".git" in root or ".turbo" in root:
        continue
    for file in files:
        if file.endswith(".md"):
            full_path = os.path.join(root, file)
            try:
                with open(full_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                if "### 4. Admin Management Controls" in content:
                    print(f"Found header in: {full_path}")
            except Exception as e:
                pass
