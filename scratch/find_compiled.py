import os

workspace_root = r"c:\Users\jahan\Outskill\Projects\TakeAwayPOS"

for root, dirs, files in os.walk(workspace_root):
    # Only search in build/dist/turbo
    if not any(x in root for x in ["dist", "build", ".turbo"]):
        continue
    for file in files:
        if file.endswith(".js") or file.endswith(".json") or file.endswith(".map"):
            full_path = os.path.join(root, file)
            # Only print if size is substantial
            size = os.path.getsize(full_path)
            if size > 10000:
                print(f"Found compiled/cache file: {full_path} ({size} bytes)")
