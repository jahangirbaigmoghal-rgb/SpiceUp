import os

history_dir = os.path.expandvars(r"%APPDATA%\Code\User\History")
print(f"Checking VS Code history directory: {history_dir}")

if os.path.exists(history_dir):
    found_any = False
    for root, dirs, files in os.walk(history_dir):
        for file in files:
            # VS Code history files are stored without extensions but often retain metadata or are search-able.
            # Let's inspect files containing specific keywords like "takeaway-pos-pro" or "gbp" or "reportsApi".
            full_path = os.path.join(root, file)
            try:
                # Limit size to search efficiently
                size = os.path.getsize(full_path)
                if 20000 < size < 150000:
                    with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                        head = f.read(500)
                    if "import" in head and ("gbp" in head or "reportsApi" in head or "UK_VAT_RATES" in head or "type Section =" in head):
                        print(f"Found candidate in VS Code history: {full_path} (size: {size} bytes)")
                        found_any = True
            except Exception as e:
                pass
    if not found_any:
        print("No candidates found in VS Code history.")
else:
    print("VS Code history directory does not exist.")
