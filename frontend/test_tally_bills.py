import requests
import xml.etree.ElementTree as ET

TALLY_URL = "http://localhost:9000"

xml = f"""<ENVELOPE>
    <HEADER>
        <TALLYREQUEST>Export Data</TALLYREQUEST>
    </HEADER>
    <BODY>
        <EXPORTDATA>
            <REQUESTDESC>
                <REPORTNAME>Bills Receivable</REPORTNAME>
                <STATICVARIABLES>
                    <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
                    <SVCURRENTCOMPANY>SMRIDHI SPONGE LIMITED</SVCURRENTCOMPANY>
                </STATICVARIABLES>
            </REQUESTDESC>
        </EXPORTDATA>
    </BODY>
</ENVELOPE>"""

try:
    response = requests.post(TALLY_URL, data=xml.encode('utf-8'))
    with open('tally_bills_response.xml', 'w') as f:
        f.write(response.text)
    print("Bills response saved to tally_bills_response.xml")
except Exception as e:
    print(f"Error: {e}")
