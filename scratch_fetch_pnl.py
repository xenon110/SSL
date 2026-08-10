import requests
import xml.etree.ElementTree as ET
import re

company = 'SMRIDHI SPONGE LIMITED - (from 1-Apr-24) - (from 1-Apr-25)'

xml = f"""<ENVELOPE>
  <HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
  <BODY>
    <EXPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Profit and Loss</REPORTNAME>
        <STATICVARIABLES>
          <SVCOMPANY>{company}</SVCOMPANY>
          <SVFROMDATE>20240401</SVFROMDATE>
          <SVTODATE>20270331</SVTODATE>
          <EXPLODEFLAG>Yes</EXPLODEFLAG>
        </STATICVARIABLES>
      </REQUESTDESC>
    </EXPORTDATA>
  </BODY>
</ENVELOPE>"""

res = requests.post("http://localhost:9000", data=xml.encode('utf-8'))
text = res.text
print("Full P&L Response:")
print(text)
print("\n\n=== Parsing P&L entries ===")

# Extract all DSPACCNAME+PLAMT pairs
names = re.findall(r'<DSPDISPNAME>([^<]+)</DSPDISPNAME>', text)
main_amts = re.findall(r'<BSMAINAMT>([^<]*)</BSMAINAMT>', text)
sub_amts = re.findall(r'<PLSUBAMT>([^<]*)</PLSUBAMT>', text)

print(f"\nFound {len(names)} name rows")
print(f"Found {len(main_amts)} main amount rows")
for i, (name, main, sub) in enumerate(zip(names, main_amts, sub_amts)):
    print(f"  [{i:02d}] Name={name:<35} MainAmt={main:<20} SubAmt={sub:<20}")
