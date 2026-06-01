with open(r"c:\Users\jahan\Outskill\Projects\TakeAwayPOS\apps\admin\src\App.tsx", 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Total lines in App.tsx: {len(lines)}")
missing_blocks = []
current_block = []

for i, line in enumerate(lines):
    if "missing line" in line:
        current_block.append(i + 1)
    else:
        if current_block:
            missing_blocks.append((current_block[0], current_block[-1]))
            current_block = []
if current_block:
    missing_blocks.append((current_block[0], current_block[-1]))

print("Missing line ranges (1-indexed):")
for start, end in missing_blocks:
    print(f"  Lines {start}-{end} (count: {end - start + 1})")
