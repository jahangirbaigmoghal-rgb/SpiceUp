import os

js_path = r"c:\Users\jahan\Outskill\Projects\TakeAwayPOS\scratch\index-Byk5BKE-.js"

if os.path.exists(js_path):
    with open(js_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    print(f"Total lines in beautified JS bundle: {len(lines)}")
    
    keywords = ["toPounds", "reportsApi", "blankProductForm", "todaySales", "manualProducts", "shorthands", "productTimes", "SaveButton"]
    for kw in keywords:
        found = []
        for idx, line in enumerate(lines):
            if kw in line:
                found.append(idx + 1)
        print(f"Keyword '{kw}' found on lines: {found[:10]}")
else:
    print("Beautified bundle not found.")
