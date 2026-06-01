import sys

try:
    import zstandard
    print("zstandard is installed")
except ImportError:
    print("zstandard is NOT installed")

try:
    import pyzstd
    print("pyzstd is installed")
except ImportError:
    print("pyzstd is NOT installed")

# Let's print python version and packages
print("Python version:", sys.version)
