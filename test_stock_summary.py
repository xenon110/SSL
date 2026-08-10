import requests

TALLY_URL = "http://localhost:9000"

def get_tally_report(report_name, company_name):
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
                        <SVFROMDATE>20240401</SVFROMDATE>
                        <SVTODATE>20270331</SVTODATE>
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
    names = ["Stock Summary"]
    
    for name in names:
        res = get_tally_report(name, company)
        if "LINEERROR" not in res and "Unknown Request" not in res:
            print(f"SUCCESS with name: {name}")
            with open("stock_summary_response.xml", "w", encoding="utf-8") as f:
                f.write(res)
            break
        else:
            print(f"Failed: {name}")
