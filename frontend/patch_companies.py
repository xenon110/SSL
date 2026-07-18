import os

src_dir = r"c:\Users\yashs\Downloads\Tally\frontend\src"

replacements = [
    ("BKM INDUSTRIES LIMITED", "SMRIDHI SPONGE LIMITED - (from 1-Apr-24) - (from 1-Apr-25)"),
    ("BKM%20INDUSTRIES%20LIMITED", "SMRIDHI%20SPONGE%20LIMITED%20-%20%28from%201-Apr-24%29%20-%20%28from%201-Apr-25%29"),
    ("BKM <span className=\"font-light\">Industries</span>", "Samridhi <span className=\"font-light\">Sponge</span>"),
    ("BKM<span className=\"text-indigo-600 font-bold\">Prime</span>", "Samridhi<span className=\"text-indigo-600 font-bold\">Prime</span>"),
    ("BKM<span className=\"text-indigo-200\">Prime</span>", "Samridhi<span className=\"text-indigo-200\">Prime</span>"),
    ("BKM Prime", "Samridhi Prime"),
    ("BKMPrime", "SamridhiPrime"),
    ("BKM Industries", "Samridhi Sponge")
]

def process_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except UnicodeDecodeError:
        # Ignore binary or non-utf-8 files
        return

    original_content = content
    for old, new in replacements:
        content = content.replace(old, new)

    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Patched: {filepath}")

for root, _, files in os.walk(src_dir):
    for f in files:
        if f.endswith(('.ts', '.tsx', '.js', '.jsx', '.json')):
            process_file(os.path.join(root, f))
