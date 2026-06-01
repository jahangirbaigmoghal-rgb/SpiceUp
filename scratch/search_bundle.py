import os

files = [
    r"c:\Users\jahan\Outskill\Projects\TakeAwayPOS\scratch\bundle_admin_extract.js",
    r"c:\Users\jahan\Outskill\Projects\TakeAwayPOS\scratch\bundle_admin_extract_part2.js"
]

query = "save"
# Let's search for "create" or "update" or "modifierGroup" or "group"
print(f"Searching for occurrences containing 'api' or 'update' or 'delete' or 'create' or 'Group'...")

for fp in files:
    if not os.path.exists(fp):
        print(f"File not found: {fp}")
        continue
    print(f"\n--- Matches in {os.path.basename(fp)} ---")
    with open(fp, 'r', encoding='utf-8') as f:
        for idx, line in enumerate(f):
            # check for keywords in line
            line_lower = line.lower()
            if "modifier" in line_lower or "api." in line_lower or "create" in line_lower or "update" in line_lower:
                if len(line.strip()) < 200:
                    print(f"Line {idx+1}: {line.strip()}")
                else:
                    print(f"Line {idx+1}: {line.strip()[:150]}... (truncated)")
