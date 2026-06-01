import os

workspace_root = r"c:\Users\jahan\Outskill"

for root, dirs, files in os.walk(workspace_root):
    # Exclude typical ignored directories to speed up
    if any(ignored in root for ignored in ["node_modules", ".git", ".turbo", "dist", "build"]):
        continue
    for file in files:
        if "App.tsx" in file or "App_backup" in file or "App.bak" in file:
            full_path = os.path.join(root, file)
            print(f"Found file: {full_path} (size: {os.path.getsize(full_path)} bytes)")
