import requests
import xml.etree.ElementTree as ET

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
print("Response Status:", res.status_code)
# Print first 500 characters of response
print("Snippet:")
print(res.text[:500])

# Parse to find parents
try:
    root = ET.fromstring(res.content)
    # Tally usually returns groups inside ONSITEGROUPS or similar tag, let's inspect the tags
    tags = set([elem.tag for elem in root.iter()])
    print("Tags found:", list(tags)[:30])
except Exception as e:
    print("Error parsing:", e)
