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
                # Let's check what fields exist in the manifest to see what it is
                print(f"Manifest {entry}: keys={list(manifest.keys())}")
                # Print output files or other details
                outputs = manifest.get('outputs', [])
                if outputs:
                    print(f"  Outputs: {outputs}")
            except Exception as e:
                print(f"Error reading {entry}: {e}")
else:
    print("Turbo cache directory not found")
