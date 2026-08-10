import os
import requests

tally_url = "https://restrictions-relatives-diff-waters.trycloudflare.com"
print(f"Pinging Tally at: {tally_url}")

xml_request = """<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Collection</TYPE>
    <ID>AllCompanies</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="AllCompanies" ISINITIALIZE="Yes">
            <TYPE>Company</TYPE>
            <FETCH>Name</FETCH>
          </COLLECTION>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>"""

try:
    res = requests.post(tally_url, data=xml_request.encode('utf-8'), headers={'Content-Type': 'text/xml'}, timeout=15)
    print(f"Status Code: {res.status_code}")
    if res.status_code == 200:
        print("Success! Tally responded with data:")
        print(res.text[:300] + "...\n[TRUNCATED]")
    else:
        print("Failed. Response:")
        print(res.text)
except Exception as e:
    print(f"Error connecting to Tally: {e}")
