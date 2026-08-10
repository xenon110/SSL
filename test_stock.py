import requests
import json

url = "http://localhost:9000"
xml = """<ENVELOPE>
  <HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
  <BODY>
    <EXPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Stock Summary</REPORTNAME>
        <STATICVARIABLES>
          <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
          <ISITEMWISE>No</ISITEMWISE>
          <EXPLODEFLAG>Yes</EXPLODEFLAG>
          <EXPLODEALLLEVELS>Yes</EXPLODEALLLEVELS>
          <ISINWARD>Yes</ISINWARD>
          <ISOUTWARD>Yes</ISOUTWARD>
          <SVSHOWINWARD>Yes</SVSHOWINWARD>
          <SVSHOWOUTWARD>Yes</SVSHOWOUTWARD>
          <DSPSHOWINWARDS>Yes</DSPSHOWINWARDS>
          <DSPSHOWOUTWARDS>Yes</DSPSHOWOUTWARDS>
          <SHOWVALUE>Yes</SHOWVALUE>
        </STATICVARIABLES>
      </REQUESTDESC>
    </EXPORTDATA>
  </BODY>
</ENVELOPE>"""

try:
    r = requests.post(url, data=xml, timeout=30)
    with open("stock_summary.xml", "w", encoding="utf-8") as f:
        f.write(r.text)
    print("Saved stock_summary.xml. Size:", len(r.text))
except Exception as e:
    print(f"Error: {e}")
