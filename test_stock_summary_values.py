import requests

TALLY_URL = "http://localhost:9000"

def get_tally_report():
    xml_request = f"""<ENVELOPE>
        <HEADER>
            <TALLYREQUEST>Export Data</TALLYREQUEST>
        </HEADER>
        <BODY>
            <EXPORTDATA>
                <REQUESTDESC>
                    <REPORTNAME>Stock Summary</REPORTNAME>
                    <STATICVARIABLES>
                        <SVCOMPANY>SMRIDHI SPONGE LIMITED - (from 1-Apr-24) - (from 1-Apr-25)</SVCOMPANY>
                        <SVFROMDATE>20240401</SVFROMDATE>
                        <SVTODATE>20270331</SVTODATE>
                        <EXPLODEFLAG>Yes</EXPLODEFLAG>
                        <EXPLODEALLLEVELS>Yes</EXPLODEALLLEVELS>
                        <SVSHOWINWARD>Yes</SVSHOWINWARD>
                        <SVSHOWOUTWARD>Yes</SVSHOWOUTWARD>
                        <SVSHOWVALUE>Yes</SVSHOWVALUE>
                    </STATICVARIABLES>
                </REQUESTDESC>
            </EXPORTDATA>
        </BODY>
    </ENVELOPE>"""

    headers = {'Content-Type': 'text/xml;charset=utf-8'}
    response = requests.post(TALLY_URL, data=xml_request.encode('utf-8'), headers=headers)
    return response.text

if __name__ == "__main__":
    res = get_tally_report()
    with open("stock_summary_with_values.xml", "w", encoding="utf-8") as f:
        f.write(res)
