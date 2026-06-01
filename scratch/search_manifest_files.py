import os
import json

turbo_dir = r"c:\Users\jahan\Outskill\Projects\TakeAwayPOS\.turbo\cache"

if os.path.exists(turbo_dir):
    for entry in os.listdir(turbo_dir):
        if entry.endswith("-manifest.json"):
            full_path = os.path.join(turbo_dir, entry)
            try:
                with open(full_path, 'r', encoding='utf-8') as f:
                    manifest = json.load(f)
                files = manifest.get('files', {})
                if isinstance(files, dict):
                    for path_key in files.keys():
                        if "apps/admin" in path_key or "apps\\admin" in path_key:
                            print(f"Manifest {entry} contains admin file: {path_key}")
            except Exception as e:
                print(f"Error parsing {entry}: {e}")
else:
    print("Turbo cache directory not found")
