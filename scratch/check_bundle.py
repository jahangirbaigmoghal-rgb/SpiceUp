import os

js_path = r"c:\Users\jahan\Outskill\Projects\TakeAwayPOS\scratch\extracted_cache\836170e243cc3e7f\apps\admin\dist\assets\index-Byk5BKE-.js"

if os.path.exists(js_path):
    with open(js_path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    print("Bundle size:", len(content))
    # Let's search for some strings
    terms = ["Dashboard", "Drawer", "useMemo", "ModifierGroup", "Category", "gbp"]
    for term in terms:
        count = content.count(term)
        print(f"Term '{term}' occurs {count} times")
else:
    print("Bundle file not found")
