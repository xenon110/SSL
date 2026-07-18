import re

file_path = "c:\\Users\\yashs\\Downloads\\Tally\\sync_agent\\raw_stock_items.xml"

with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
    xml_content = f.read()

target_names = [
    "307 DT Led 2nd Operation Die",
    "404 DT Led 2nd Operation Die",
    "Buretle",
    "Bush",
    "BINS (OLD & USED)",
    "Diacetone Alchole"
]

print("=== REGEX PARSING FOR TARGET ITEMS ===")
# Find all <STOCKITEM>...</STOCKITEM> blocks
matches = re.findall(r'<STOCKITEM[^>]*>([\s\S]*?)<\/STOCKITEM>', xml_content)
print(f"Found {len(matches)} STOCKITEM blocks in XML.")

for block in matches:
    # Try to find NAME attribute or tag
    name_m = re.search(r'NAME="([^"]*)"', block)
    name = name_m.group(1) if name_m else None
    if not name:
        name_t = re.search(r'<NAME>([^<]*)</NAME>', block)
        name = name_t.group(1) if name_t else None
        
    if name in target_names:
        print(f"\nName: {name}")
        parent = re.search(r'<PARENT>([^<]*)</PARENT>', block)
        opening_bal = re.search(r'<OPENINGBALANCE>([^<]*)</OPENINGBALANCE>', block)
        opening_val = re.search(r'<OPENINGVALUE>([^<]*)</OPENINGVALUE>', block)
        
        print(f"  Parent: {parent.group(1) if parent else 'None'}")
        print(f"  Opening Balance: {opening_bal.group(1) if opening_bal else 'None'}")
        print(f"  Opening Value: {opening_val.group(1) if opening_val else 'None'}")
