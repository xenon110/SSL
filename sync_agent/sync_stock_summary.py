import os
import requests
import json
import xmltodict
import datetime
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
TALLY_URL = os.environ.get("TALLY_URL", "http://localhost:9000")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Supabase credentials missing.")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

COMPANY_NAME = 'SMRIDHI SPONGE LIMITED - (from 1-Apr-24) - (from 1-Apr-25)'

def sync_stock_summary(from_date="2026-04-01", to_date="2027-03-31"):
    print(f"Syncing Stock Summary for {from_date} to {to_date}...")
    
    # 1. Fetch Company ID from Supabase
    comp_res = supabase.table("companies").select("id").eq("name", COMPANY_NAME).execute()
    if not comp_res.data:
        print(f"Company {COMPANY_NAME} not found in DB.")
        return
    company_id = comp_res.data[0]['id']

    from_str = from_date.replace("-", "")
    to_str = to_date.replace("-", "")

    xml_request = f"""<ENVELOPE>
      <HEADER>
        <TALLYREQUEST>Export Data</TALLYREQUEST>
      </HEADER>
      <BODY>
        <EXPORTDATA>
          <REQUESTDESC>
            <REPORTNAME>Stock Summary</REPORTNAME>
            <STATICVARIABLES>
              <SVCOMPANY>{COMPANY_NAME}</SVCOMPANY>
              <SVFROMDATE>{from_str}</SVFROMDATE>
              <SVTODATE>{to_str}</SVTODATE>
              <EXPLODEFLAG>Yes</EXPLODEFLAG>
              <EXPLODEALLLEVELS>Yes</EXPLODEALLLEVELS>
              <ISINWARD>Yes</ISINWARD>
              <ISOUTWARD>Yes</ISOUTWARD>
              <SVSHOWINWARD>Yes</SVSHOWINWARD>
              <SVSHOWOUTWARD>Yes</SVSHOWOUTWARD>
              <DSPSHOWINWARDS>Yes</DSPSHOWINWARDS>
              <DSPSHOWOUTWARDS>Yes</DSPSHOWOUTWARDS>
              <SHOWVALUE>Yes</SHOWVALUE>
              <ISVALUE>Yes</ISVALUE>
              <ISRATE>Yes</ISRATE>
              <SVSHOWVALUE>Yes</SVSHOWVALUE>
            </STATICVARIABLES>
          </REQUESTDESC>
        </EXPORTDATA>
      </BODY>
    </ENVELOPE>"""

    try:
        res = requests.post(TALLY_URL, data=xml_request, headers={'Content-Type': 'text/xml;charset=utf-8'})
        res.raise_for_status()
        raw_xml = res.text
    except Exception as e:
        print("Failed to fetch from Tally:", e)
        return

    # Phase 2: Universal XML Extraction & Phase 4: Complete JSON Conversion
    try:
        parsed_json = xmltodict.parse(raw_xml)
    except Exception as e:
        print("Failed to parse XML:", e)
        return

    # Phase 3 & 4: Archive Raw XML and JSON to Supabase
    data = {
        "company_id": company_id,
        "from_date": from_date,
        "to_date": to_date,
        "raw_xml": raw_xml,
        "json_data": parsed_json,
        "last_synced_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }

    try:
        # Upsert based on unique constraint (company_id, from_date, to_date)
        # In supabase-py, upsert requires the conflict resolution if not using PK. 
        # But we can just use delete & insert if upsert doesn't work out of the box with unique constraints.
        supabase.table("tally_stock_summary").delete().eq("company_id", company_id).eq("from_date", from_date).eq("to_date", to_date).execute()
        supabase.table("tally_stock_summary").insert(data).execute()
        print(f"Successfully synced Stock Summary for {from_date} to {to_date}")
    except Exception as e:
        print("Database insertion failed:", e)

if __name__ == "__main__":
    # Sync for Current FY
    sync_stock_summary("2026-04-01", "2027-03-31")
    # Sync for Previous FY
    sync_stock_summary("2025-04-01", "2026-03-31")
