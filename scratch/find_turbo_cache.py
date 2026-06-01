import os

turbo_dir = r"c:\Users\jahan\Outskill\Projects\TakeAwayPOS\.turbo\cache"
print(f"Checking Turbo cache directory: {turbo_dir}")

if os.path.exists(turbo_dir):
    for entry in os.listdir(turbo_dir):
        full_path = os.path.join(turbo_dir, entry)
        if os.path.isfile(full_path):
            print(f"Cache file: {entry} ({os.path.getsize(full_path)} bytes)")
else:
    print("Turbo cache directory does not exist.")
