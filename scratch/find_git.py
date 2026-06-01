import os

search_paths = [
    r"c:\Users\jahan\Outskill\Projects",
    r"c:\Users\jahan\Outskill"
]

for base_path in search_paths:
    print(f"Scanning {base_path} for .git...")
    if not os.path.exists(base_path):
        continue
    for root, dirs, files in os.walk(base_path):
        if ".git" in dirs:
            print(f"Found git repository: {os.path.join(root, '.git')}")
            # Don't recurse into this directory's children to speed up
            dirs.remove(".git")
