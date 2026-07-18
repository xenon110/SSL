import requests
import re

TALLY_URL = "http://localhost:9000"

xml_request = """<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Collection</TYPE>
    <ID>AllCompaniesDetails</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="AllCompaniesDetails" ISINITIALIZE="Yes">
            <TYPE>Company</TYPE>
            <FETCH>NAME, STARTINGFROM, BOOKSFROM</FETCH>
          </COLLECTION>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>"""

try:
    res = requests.post(TALLY_URL, data=xml_request.encode('utf-8'), headers={'Content-Type': 'text/xml'}, timeout=10)
    text = res.text
    
    # Match each <COMPANY> block
    companies = re.findall(r'<COMPANY[^>]*NAME="([^"]*)"[^>]*>([\s\S]*?)<\/COMPANY>', text)
    print("Open Companies details from Tally:")
    for name, block in companies:
        starting = re.search(r'<STARTINGFROM[^>]*>([^<]*)</STARTINGFROM>', block)
        books = re.search(r'<BOOKSFROM[^>]*>([^<]*)</BOOKSFROM>', block)
        print(f"Name: {name}")
        print(f"  Starting (FY Start Date): {starting.group(1) if starting else 'N/A'}")
        print(f"  Books Beginning From:     {books.group(1) if books else 'N/A'}")
except Exception as e:
    print("Error:", e)
