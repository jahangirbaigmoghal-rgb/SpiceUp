import os

search_paths = [
    r"c:\Users\jahan\Documents",
    r"c:\Users\jahan"
]

for base_path in search_paths:
    print(f"Scanning {base_path}...")
    if not os.path.exists(base_path):
        continue
    # For user home directory, walk only 2 levels deep to prevent slow-down, or skip AppData/AppData-like system folders
    for root, dirs, files in os.walk(base_path):
        # Exclude AppData and node_modules, etc.
        if any(x in root for x in ["AppData", "node_modules", ".git", ".turbo", "dist", "build", "Local Settings", "Application Data"]):
            dirs.clear() # don't recurse
            continue
        # Limit recursion depth for home directory
        if base_path == r"c:\Users\jahan":
            depth = root[len(base_path):].count(os.sep)
            if depth > 2:
                dirs.clear()
                continue
        for file in files:
            if any(term in file.lower() for term in ["takeaway", "pos", "outskill"]) and (file.endswith(".zip") or file.endswith(".rar") or file.endswith(".7z") or file.endswith(".tar.gz")):
                full_path = os.path.join(root, file)
                print(f"Found archive: {full_path} ({os.path.getsize(full_path)} bytes)")
