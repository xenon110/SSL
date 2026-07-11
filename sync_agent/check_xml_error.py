"""Check what's at line 844 of the vouchers XML"""
with open("raw_vouchers_v2.xml", "r", encoding="utf-8") as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")
print(f"\nLines around 844:")
for i in range(max(0, 840), min(len(lines), 850)):
    print(f"  {i+1}: {lines[i].rstrip()[:120]}")
