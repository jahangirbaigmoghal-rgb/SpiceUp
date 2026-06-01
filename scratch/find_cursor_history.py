import os

history_dir = os.path.expandvars(r"%APPDATA%\Cursor\User\History")
print(f"Checking Cursor history directory: {history_dir}")

if os.path.exists(history_dir):
    found_any = False
    for root, dirs, files in os.walk(history_dir):
        for file in files:
            full_path = os.path.join(root, file)
            try:
                size = os.path.getsize(full_path)
                if 20000 < size < 150000:
                    with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                        head = f.read(500)
                    if "import" in head and ("gbp" in head or "reportsApi" in head or "UK_VAT_RATES" in head or "type Section =" in head):
                        print(f"Found candidate in Cursor history: {full_path} (size: {size} bytes)")
                        found_any = True
            except Exception as e:
                pass
    if not found_any:
        print("No candidates found in Cursor history.")
else:
    print("Cursor history directory does not exist.")
