import requests
import json
import xml.etree.ElementTree as ET

TALLY_URL = "http://localhost:9000"

def get_tally_report(report_name, company_name, start_date, end_date):
    xml_request = f"""<ENVELOPE>
        <HEADER>
            <TALLYREQUEST>Export Data</TALLYREQUEST>
        </HEADER>
        <BODY>
            <EXPORTDATA>
                <REQUESTDESC>
                    <REPORTNAME>{report_name}</REPORTNAME>
                    <STATICVARIABLES>
                        <SVCOMPANY>{company_name}</SVCOMPANY>
                        <SVFROMDATE>{start_date}</SVFROMDATE>
                        <SVTODATE>{end_date}</SVTODATE>
                        <EXPLODEFLAG>Yes</EXPLODEFLAG>
                    </STATICVARIABLES>
                </REQUESTDESC>
            </EXPORTDATA>
        </BODY>
    </ENVELOPE>"""

    headers = {'Content-Type': 'text/xml;charset=utf-8'}
    response = requests.post(TALLY_URL, data=xml_request.encode('utf-8'), headers=headers)
    return response.text

if __name__ == "__main__":
    company = "SMRIDHI SPONGE LIMITED - (from 1-Apr-24) - (from 1-Apr-25)"
    bs_xml = get_tally_report("Balance Sheet", company, "20240401", "20270331")
    
    with open("bs_response.xml", "w", encoding="utf-8") as f:
        f.write(bs_xml)
        
    pnl_xml = get_tally_report("Profit & Loss", company, "20240401", "20270331")
    with open("pnl_response.xml", "w", encoding="utf-8") as f:
        f.write(pnl_xml)
        
    print("Exported Balance Sheet and PNL to XML files.")
