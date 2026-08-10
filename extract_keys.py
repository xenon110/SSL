import os
import re

app_dir = r"c:\Users\yashs\Downloads\Tally\frontend\src\app"
dashboards = {}

for folder in os.listdir(app_dir):
    page_path = os.path.join(app_dir, folder, "page.tsx")
    if os.path.exists(page_path):
        with open(page_path, "r", encoding="utf-8") as f:
            content = f.read()
            if "mockData" in content and "GenericDashboardView" in content:
                # Extract mockData block
                match = re.search(r"const mockData = \{([\s\S]*?)\};", content)
                if match:
                    mock_block = match.group(1)
                    # extract keys
                    keys = re.findall(r'"([^"]+)"\s*:', mock_block)
                    dashboards[folder] = keys

for k, v in dashboards.items():
    print(f"'{k}': {v},")
