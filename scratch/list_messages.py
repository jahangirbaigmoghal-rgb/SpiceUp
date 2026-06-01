import os

curr_msg_dir = r"C:\Users\jahan\.gemini\antigravity\brain\c68c7e34-8b01-4a64-a133-e15f952d2d3d\.system_generated\messages"

if os.path.exists(curr_msg_dir):
    for root, dirs, files in os.walk(curr_msg_dir):
        for file in files:
            full_path = os.path.join(root, file)
            print(f"{full_path} (size: {os.path.getsize(full_path)} bytes)")
else:
    print("Messages directory not found")
