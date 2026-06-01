import os
import json

manifest_path = r"c:\Users\jahan\Outskill\Projects\TakeAwayPOS\.turbo\cache\002768497236c969-manifest.json"

if os.path.exists(manifest_path):
    with open(manifest_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    print("Keys of data:", list(data.keys()))
    files = data.get('files', {})
    print("Type of files:", type(files))
    if isinstance(files, dict):
        print(f"Number of keys in files: {len(files)}")
        print("First 20 keys in files:")
        for k in list(files.keys())[:20]:
            print(f"  {k}: {str(files[k])[:100]}")
    elif isinstance(files, list):
        print(f"Number of items in files: {len(files)}")
        print("First 20 items in files:")
        for item in files[:20]:
            print(f"  {item}")
else:
    print("Manifest file not found.")
