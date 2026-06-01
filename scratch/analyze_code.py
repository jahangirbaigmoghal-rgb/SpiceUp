with open(r"c:\Users\jahan\Outskill\Projects\TakeAwayPOS\apps\admin\src\App.tsx", 'r', encoding='utf-8') as f:
    lines = f.readlines()

total = len(lines)
missing_count = sum(1 for line in lines if "missing line" in line)
markdown_count = sum(1 for line in lines if line.strip().startswith(("#", "*", "-", "1.", ">", "####")))
empty_count = sum(1 for line in lines if not line.strip())

print(f"Total lines: {total}")
print(f"Missing lines: {missing_count}")
print(f"Markdown/Doc lines: {markdown_count}")
print(f"Empty lines: {empty_count}")
print(f"Valid code lines: {total - missing_count - markdown_count - empty_count}")
