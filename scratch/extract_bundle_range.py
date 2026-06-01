import os

js_path = r"c:\Users\jahan\Outskill\Projects\TakeAwayPOS\scratch\index-Byk5BKE-.js"
out_path = r"c:\Users\jahan\Outskill\Projects\TakeAwayPOS\scratch\bundle_admin_extract.js"

if os.path.exists(js_path):
    with open(js_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # Extract lines 14000 to 17000 (0-indexed: 13999 to 16999)
    extracted = lines[13900:16800]
    with open(out_path, 'w', encoding='utf-8') as out:
        out.writelines(extracted)
    print(f"Extracted {len(extracted)} lines to {out_path}")
else:
    print("Beautified bundle not found.")
