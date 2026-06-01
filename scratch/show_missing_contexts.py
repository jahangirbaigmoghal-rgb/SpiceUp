with open(r"c:\Users\jahan\Outskill\Projects\TakeAwayPOS\apps\admin\src\App.tsx", 'r', encoding='utf-8') as f:
    lines = f.readlines()

def print_context(start_idx, end_idx):
    print(f"\n--- Context for missing lines {start_idx}-{end_idx} ---")
    # print 5 lines before
    before = max(0, start_idx - 6)
    for idx in range(before, start_idx - 1):
        print(f"{idx+1:4d}: {lines[idx]}", end="")
    print("      ...")
    for idx in range(start_idx - 1, end_idx):
        print(f"{idx+1:4d}: {lines[idx]}", end="")
    print("      ...")
    # print 5 lines after
    after = min(len(lines), end_idx + 5)
    for idx in range(end_idx, after):
        print(f"{idx+1:4d}: {lines[idx]}", end="")

# Let's print context for a few missing line blocks
print_context(74, 91)
print_context(165, 189)
print_context(216, 248)
