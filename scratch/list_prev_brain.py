import os

prev_brain_dir = r"C:\Users\jahan\.gemini\antigravity\brain\3e79befb-effe-4731-a575-17e052ae185e"

for root, dirs, files in os.walk(prev_brain_dir):
    for file in files:
        full_path = os.path.join(root, file)
        print(f"{full_path} (size: {os.path.getsize(full_path)} bytes)")
