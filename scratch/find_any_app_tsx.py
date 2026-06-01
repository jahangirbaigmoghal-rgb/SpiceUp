import os

search_roots = [
    r"C:\Users\jahan\.gemini\antigravity",
    r"c:\Users\jahan\Outskill",
    r"C:\Users\jahan\AppData\Roaming\Code"
]

print("Searching for App.tsx files...")
for base in search_roots:
    if os.path.exists(base):
        print(f"Scanning {base}...")
        for root, dirs, files in os.walk(base):
            # Skip node_modules or large irrelevant dirs
            if "node_modules" in root or ".turbo" in root or "dist" in root:
                continue
            for file in files:
                if file.lower() == "app.tsx":
                    full_path = os.path.join(root, file)
                    size = os.path.getsize(full_path)
                    print(f"Found App.tsx: {full_path} ({size} bytes)")
