import os

extracted_dir = r"c:\Users\jahan\Outskill\Projects\TakeAwayPOS\scratch\extracted_cache"

found = []
if os.path.exists(extracted_dir):
    for root, dirs, files in os.walk(extracted_dir):
        for file in files:
            if file.endswith(".js") and "assets" in root:
                full_path = os.path.join(root, file)
                size = os.path.getsize(full_path)
                found.append((full_path, size))

# Sort by size descending
found.sort(key=lambda x: x[1], reverse=True)

print("Found compiled JS assets:")
for fp, sz in found:
    # Print the parent directory name (which is the cache hash) and relative path
    rel = os.path.relpath(fp, extracted_dir)
    print(f"  {rel} ({sz} bytes)")
