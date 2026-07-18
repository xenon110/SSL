import os
import re

app_dir = r"c:\Users\yashs\Downloads\Tally\frontend\src\app"

state_replacement = """  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const today = new Date();
    const year = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
    return {
      from: new Date(year, 3, 1),
      to: new Date(year + 1, 2, 31)
    };
  });"""

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content
    
    # 1. Replace the useState initialization
    # It might be `const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);`
    content = re.sub(
        r"const\s+\[dateRange,\s*setDateRange\]\s*=\s*useState<DateRange\s*\|\s*undefined>\(undefined\);",
        state_replacement,
        content
    )

    # 2. Remove the auto-alignment block
    # It usually looks like:
    # // Auto-align calendar...
    # if (!dateRange && ...) { ... }
    
    # We can use a regex to match the comment and the if block
    # Since it varies slightly, we can match 'if (!dateRange &&' and remove the block
    content = re.sub(
        r"//\s*Auto-align.*?if\s*\(!dateRange\s*&&\s*.*?\{.*?setDateRange\(.*?\);.*?\}",
        "",
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
