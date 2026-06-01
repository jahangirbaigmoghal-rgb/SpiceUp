import zipfile

zip_path = r"c:\Users\jahan\Downloads\foodhub-epos.zip"

try:
    with zipfile.ZipFile(zip_path, 'r') as z:
        print(f"Total files in zip: {len(z.namelist())}")
        print("First 50 files:")
        for name in z.namelist()[:50]:
            print(f"  {name}")
except Exception as e:
    print(f"Error reading zip: {e}")
