import os
import re

api_dir = r"c:\Users\yashs\Downloads\Tally\frontend\src\app\api"

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content
    
    # Fix groups.map -> (groups || []).map
    content = re.sub(r"\bgroups\.map\(", "(groups || []).map(", content)
    
    # Fix ledgers.forEach -> (ledgers || []).forEach
    content = re.sub(r"\bledgers\.forEach\(", "(ledgers || []).forEach(", content)

    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated: {filepath}")

for root, _, files in os.walk(api_dir):
    for f in files:
        if f == "route.ts":
            process_file(os.path.join(root, f))
