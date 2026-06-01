import os

search_dir = r"C:\Users\jahan\.gemini\antigravity"
print(f"Scanning {search_dir} for any .tsx or backup files...")

found = []
for root, dirs, files in os.walk(search_dir):
    if "node_modules" in root or "worktrees" in root or ".git" in root:
        dirs.clear()
        continue
    for file in files:
        if file.endswith(".tsx") or "app" in file.lower() or "backup" in file.lower():
            full_path = os.path.join(root, file)
            try:
                size = os.path.getsize(full_path)
                found.append((full_path, size))
            except Exception:
                pass

found.sort(key=lambda x: x[1], reverse=True)
for fp, sz in found[:40]:
    print(f"  {fp} ({sz} bytes)")
