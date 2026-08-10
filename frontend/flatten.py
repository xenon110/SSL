import os
import re

files_to_flatten = [
    r"c:\Users\yashs\Downloads\Tally\frontend\src\app\sales\page.tsx",
    r"c:\Users\yashs\Downloads\Tally\frontend\src\app\purchases\page.tsx"
]

for filepath in files_to_flatten:
    if not os.path.exists(filepath):
        print(f"Not found: {filepath}")
        continue
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    idx1 = content.find("{/* Row 4:")
    if idx1 == -1:
        idx1 = content.find("All Transactions Ledger")

    if idx1 != -1:
        # Backtrack to the start of the <Card> or comment
        idx1 = content.rfind("<Card", 0, idx1)
        if idx1 == -1:
            idx1 = content.find("{/* Row 4:")
        
        # We want to keep the closing elements. 
        # Looking at sales/page.tsx line 1712 onwards:
        #       </div>
        #       )}
        #     </div>
        #   );
        # }
        
        # A robust way is to just look for the last 5 closing lines.
        tail = """      </div>
      )}
    </div>
  );
}
"""
        new_content = content[:idx1] + "\n" + tail
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Flattened {filepath}")
    else:
        print(f"Could not find Row 4 in {filepath}")
