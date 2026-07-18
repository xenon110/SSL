import os
import requests

TALLY_URL = "http://localhost:9000"
COMPANY_NAME = "SMRIDHI SPONGE LIMITED - (from 1-Apr-24) - (from 1-Apr-25)"

xml_request = f"""<ENVELOPE>
    <HEADER>
        <TALLYREQUEST>Export Data</TALLYREQUEST>
    </HEADER>
    <BODY>
        <EXPORTDATA>
            <REQUESTDESC>
                <REPORTNAME>Cash Flow</REPORTNAME>
                <STATICVARIABLES>
                    <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
                    <SVCURRENTCOMPANY>{COMPANY_NAME}</SVCURRENTCOMPANY>
                    <SVFROMDATE>20240401</SVFROMDATE>
                    <SVTODATE>20250331</SVTODATE>
                </STATICVARIABLES>
            </REQUESTDESC>
        </EXPORTDATA>
    </BODY>
</ENVELOPE>"""

try:
    print("Sending request to Tally...")
    response = requests.post(TALLY_URL, data=xml_request, headers={'Content-Type': 'text/xml'})
    response.raise_for_status()
    text = response.text
    print("Response length:", len(text))
    # Print the first 500 characters
    print("Response Preview:")
    print(text[:1000])
    
    with open("tally_raw_cash_flow.xml", "w", encoding="utf-8") as f:
        f.write(text)
    print("Saved response to tally_raw_cash_flow.xml")
except Exception as e:
    print("Error:", e)
