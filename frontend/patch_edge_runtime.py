import os

api_dir = r"c:\Users\yashs\Downloads\Tally\frontend\src\app\api"
edge_runtime_line = "export const runtime = 'edge';\n"

patched_count = 0

for root, _, files in os.walk(api_dir):
    for f in files:
        if f == "route.ts":
            filepath = os.path.join(root, f)
            with open(filepath, 'r', encoding='utf-8') as file:
                content = file.read()
            
            # Check if runtime is already set
            if "export const runtime" not in content:
                # Add it to the top of the file, right after imports, or just at the very top.
                # It's safest to just put it at the very top, or after the last import.
                # Actually, putting it at the very top or bottom doesn't matter much in Next.js, 
                # but conventionally it's put at the top or bottom. Let's append to the top.
                
                # However, if there are 'use server' directives (unlikely in route.ts), they must be first.
                # Let's just append it to the bottom of the file to be safe.
                
                with open(filepath, 'a', encoding='utf-8') as file:
                    file.write("\n" + edge_runtime_line)
                patched_count += 1
                print(f"Patched: {filepath}")

print(f"Total files patched: {patched_count}")
