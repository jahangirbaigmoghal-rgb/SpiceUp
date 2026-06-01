import shutil
import os
import subprocess

src_js = r"c:\Users\jahan\Outskill\Projects\TakeAwayPOS\scratch\extracted_cache\836170e243cc3e7f\apps\admin\dist\assets\index-Byk5BKE-.js"
dest_js = r"c:\Users\jahan\Outskill\Projects\TakeAwayPOS\scratch\index-Byk5BKE-.js"

if os.path.exists(src_js):
    shutil.copy(src_js, dest_js)
    print(f"Copied to {dest_js}")
    # Now run Prettier
    try:
        print("Running prettier...")
        subprocess.run(["npx", "prettier", "--write", dest_js], check=True, shell=True)
        print("Prettier formatting finished successfully!")
    except Exception as e:
        print(f"Prettier failed: {e}")
else:
    print(f"Source file not found: {src_js}")
