import requests
import re

xml_req = """<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Export Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <EXPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>List of Accounts</REPORTNAME>
        <STATICVARIABLES>
          <SVCOMPANY>SMRIDHI SPONGE LIMITED - (from 1-Apr-24) - (from 1-Apr-25)</SVCOMPANY>
          <ACCOUNTTYPE>Groups</ACCOUNTTYPE>
        </STATICVARIABLES>
      </REQUESTDESC>
    </EXPORTDATA>
  </BODY>
</ENVELOPE>"""

res = requests.post("http://localhost:9000", data=xml_req)
text = res.text

# We can use regex to find <GROUP NAME="..."> and its <PARENT>...</PARENT>
groups = re.findall(r'<GROUP\s+NAME="([^"]+)"[^>]*>.*?<PARENT>([^<]+)</PARENT>', text, re.DOTALL)
print(f"Found {len(groups)} groups with parent tags!")
for name, parent in groups[:15]:
    print(f"  {name} -> {parent}")
