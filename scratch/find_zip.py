import os

search_paths = [
    r"c:\Users\jahan\Downloads",
    r"c:\Users\jahan\Desktop",
    r"c:\Users\jahan\Outskill"
]

for base_path in search_paths:
    print(f"Scanning {base_path}...")
    if not os.path.exists(base_path):
        continue
    for root, dirs, files in os.walk(base_path):
        if "node_modules" in root or ".git" in root or ".turbo" in root:
            continue
        for file in files:
            if any(term in file.lower() for term in ["takeaway", "pos", "outskill"]) and (file.endswith(".zip") or file.endswith(".rar") or file.endswith(".7z") or file.endswith(".tar.gz")):
                full_path = os.path.join(root, file)
                print(f"Found archive: {full_path} ({os.path.getsize(full_path)} bytes)")
