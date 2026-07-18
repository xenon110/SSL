import os
import re

app_dir = r"c:\Users\yashs\Downloads\Tally\frontend\src\app"

state_replacement = """  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const today = new Date();
    return {
      from: new Date(today.getFullYear(), today.getMonth(), 1),
      to: new Date(today.getFullYear(), today.getMonth() + 1, 0)
    };
  });"""

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content
    
    # We replace the previous patch
    content = re.sub(
        r"const\s+\[dateRange,\s*setDateRange\]\s*=\s*useState<DateRange\s*\|\s*undefined>\(\(\)\s*=>\s*\{[^}]*from:[^}]*to:[^}]*\}\s*\);\s*}\);",
        state_replacement,
        content,
        flags=re.DOTALL
    )
    # Also catch the one without the double }); in case regex was slightly off
    content = re.sub(
        r"const\s+\[dateRange,\s*setDateRange\]\s*=\s*useState<DateRange\s*\|\s*undefined>\(\(\)\s*=>\s*\{.*?return\s*\{\s*from:.*?to:.*?\};\s*\}\);",
        state_replacement,
        content,
        flags=re.DOTALL
    )

    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated: {filepath}")

for root, _, files in os.walk(app_dir):
    for f in files:
        if f == "page.tsx":
            process_file(os.path.join(root, f))
