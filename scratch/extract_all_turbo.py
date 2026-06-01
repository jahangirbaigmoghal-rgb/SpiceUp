import os
import subprocess

turbo_dir = r"c:\Users\jahan\Outskill\Projects\TakeAwayPOS\.turbo\cache"
temp_extract_dir = r"c:\Users\jahan\Outskill\Projects\TakeAwayPOS\scratch\extracted_cache"

if not os.path.exists(temp_extract_dir):
    os.makedirs(temp_extract_dir)

if os.path.exists(turbo_dir):
    for entry in os.listdir(turbo_dir):
        if entry.endswith(".tar.zst"):
            hash_name = entry.replace(".tar.zst", "")
            target_dir = os.path.join(temp_extract_dir, hash_name)
            if not os.path.exists(target_dir):
                os.makedirs(target_dir)
            tar_path = os.path.join(turbo_dir, entry)
            print(f"Extracting {entry} to {hash_name}...")
            try:
                # Use Windows native tar
                subprocess.run(["tar", "-xf", tar_path, "-C", target_dir], check=True)
            except Exception as e:
                print(f"Failed to extract {entry}: {e}")
                
    # Now let's search the extracted files for App.tsx
    print("\nSearching extracted caches for App.tsx...")
    for root, dirs, files in os.walk(temp_extract_dir):
        for file in files:
            if "App.tsx" in file:
                full_path = os.path.join(root, file)
                print(f"FOUND: {full_path} ({os.path.getsize(full_path)} bytes)")
else:
    print("Turbo cache directory not found")
