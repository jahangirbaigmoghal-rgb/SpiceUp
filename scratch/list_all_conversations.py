import os

brain_dir = r"C:\Users\jahan\.gemini\antigravity\brain"

if os.path.exists(brain_dir):
    for entry in os.listdir(brain_dir):
        full_path = os.path.join(brain_dir, entry)
        if os.path.isdir(full_path):
            print(f"Conversation ID: {entry}")
else:
    print("Brain directory not found")
