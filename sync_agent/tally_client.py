import requests
import xml.etree.ElementTree as ET
from datetime import datetime
import re

def clean_xml(xml_str):
    if not xml_str: return xml_str
    
    # 1. Remove literal unprintable control characters
    cleaned = re.sub(r'[^\x09\x0A\x0D\x20-\x7E\x85\xA0-\uD7FF\uE000-\uFFFD]', '', xml_str)
    
    # 2. Remove escaped invalid XML entities (like &#x4; or &#28;)
    def remove_invalid_entities(match):
        val = match.group(1)
        try:
            num = int(val[1:], 16) if val.startswith('x') or val.startswith('X') else int(val)
            # If it's a control character (except tab, newline, carriage return), remove it
            if num < 32 and num not in (9, 10, 13):
                return ''
        except ValueError:
            pass
        return match.group(0)
        
    cleaned = re.sub(r'&#([xX]?[0-9a-fA-F]+);', remove_invalid_entities, cleaned)
    
    # 3. Fix Tally's UDF namespace prefix - inject xmlns:UDF if UDF: tags exist but declaration is missing
    if 'UDF:' in cleaned and 'xmlns:UDF' not in cleaned:
        cleaned = cleaned.replace('<ENVELOPE>', '<ENVELOPE xmlns:UDF="TallyUDF">', 1)
        # If no ENVELOPE tag, try COLLECTION or root tag
        if 'xmlns:UDF' not in cleaned:
            cleaned = re.sub(r'<(\w+)([ >])', r'<\1 xmlns:UDF="TallyUDF"\2', cleaned, count=1)
    
    return cleaned

class TallyClient:
    def __init__(self, url="http://localhost:9000", company_name=""):
        self.url = url
        self.company_name = company_name

    def _send_request(self, xml_data):
        try:
            response = requests.post(self.url, data=xml_data, headers={'Content-Type': 'text/xml'})
            response.raise_for_status()
            return response.text
        except requests.exceptions.RequestException as e:
            print(f"Error connecting to Tally: {e}")
            return None

    def export_ledgers(self, from_date: str = None):
        """
        Fetch all Ledgers using a custom TDL collection.
        This method reliably returns all ledger masters.
        """
        xml_request = f"""
        <ENVELOPE>
            <HEADER>
                <VERSION>1</VERSION>
                <TALLYREQUEST>Export</TALLYREQUEST>
                <TYPE>Collection</TYPE>
                <ID>AllLedgers</ID>
            </HEADER>
            <BODY>
                <DESC>
                    <STATICVARIABLES>
                        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
                        {f'<SVCURRENTCOMPANY>{self.company_name}</SVCURRENTCOMPANY>' if self.company_name else ''}
                    </STATICVARIABLES>
                    <TDL>
                        <TDLMESSAGE>
                            <COLLECTION NAME="AllLedgers" ISINITIALIZE="Yes">
                                <TYPE>Ledger</TYPE>
                                <FETCH>NAME, PARENT, GUID, OPENINGBALANCE, CLOSINGBALANCE, ISDEEMEDPOSITIVE, GSTREGISTRATIONTYPE, PARTYGSTIN, LEDSTATENAME, LEDGERMOBILE, LEDGERCONTACT, EMAIL, CREDITDAYS, ALTERID</FETCH>
                            </COLLECTION>
                        </TDLMESSAGE>
                    </TDL>
                </DESC>
            </BODY>
        </ENVELOPE>
        """
        return self._send_request(xml_request)

    def export_vouchers(self, from_date: str = None, to_date: str = None):
        """
        Fetch all vouchers using a custom TDL collection.
        This reliably returns ALL vouchers in the date range.
        """
        if not from_date:
            from_date = "20000401"  # Very early date to catch all history
        if not to_date:
            to_date = "20990331"    # Far future date

        xml_request = f"""
        <ENVELOPE>
            <HEADER>
                <VERSION>1</VERSION>
                <TALLYREQUEST>Export</TALLYREQUEST>
                <TYPE>Collection</TYPE>
                <ID>AllVouchers</ID>
            </HEADER>
            <BODY>
                <DESC>
                    <STATICVARIABLES>
                        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
                        {f'<SVCURRENTCOMPANY>{self.company_name}</SVCURRENTCOMPANY>' if self.company_name else ''}
                        <SVFROMDATE>{from_date}</SVFROMDATE>
                        <SVTODATE>{to_date}</SVTODATE>
                    </STATICVARIABLES>
                    <TDL>
                        <TDLMESSAGE>
                            <COLLECTION NAME="AllVouchers" ISINITIALIZE="Yes">
                                <TYPE>Voucher</TYPE>
                                <FETCH>DATE, GUID, VOUCHERTYPENAME, VOUCHERNUMBER, PARTYLEDGERNAME, AMOUNT, NARRATION, REFERENCE, ISCANCELLED, ISOPTIONAL, ISDELETED, ALTERID</FETCH>
                                <FETCH>ALLLEDGERENTRIES.LIST.LEDGERNAME, ALLLEDGERENTRIES.LIST.AMOUNT, ALLLEDGERENTRIES.LIST.ISDEEMEDPOSITIVE</FETCH>
                                <FETCH>INVENTORYENTRIES.LIST.STOCKITEMNAME, INVENTORYENTRIES.LIST.BILLEDQTY, INVENTORYENTRIES.LIST.RATE, INVENTORYENTRIES.LIST.AMOUNT, INVENTORYENTRIES.LIST.ACTUALQTY</FETCH>
                                <FETCH>ALLINVENTORYENTRIES.LIST.STOCKITEMNAME, ALLINVENTORYENTRIES.LIST.BILLEDQTY, ALLINVENTORYENTRIES.LIST.RATE, ALLINVENTORYENTRIES.LIST.AMOUNT, ALLINVENTORYENTRIES.LIST.ACTUALQTY</FETCH>
                                <FETCH>INVENTORYENTRIESIN.LIST.STOCKITEMNAME, INVENTORYENTRIESIN.LIST.BILLEDQTY, INVENTORYENTRIESIN.LIST.RATE, INVENTORYENTRIESIN.LIST.AMOUNT, INVENTORYENTRIESIN.LIST.ACTUALQTY</FETCH>
                                <FETCH>INVENTORYENTRIESOUT.LIST.STOCKITEMNAME, INVENTORYENTRIESOUT.LIST.BILLEDQTY, INVENTORYENTRIESOUT.LIST.RATE, INVENTORYENTRIESOUT.LIST.AMOUNT, INVENTORYENTRIESOUT.LIST.ACTUALQTY</FETCH>
                                <FETCH>LEDGERENTRIES.LIST.LEDGERNAME, LEDGERENTRIES.LIST.AMOUNT, LEDGERENTRIES.LIST.ISDEEMEDPOSITIVE</FETCH>
                            </COLLECTION>
                        </TDLMESSAGE>
                    </TDL>
                </DESC>
            </BODY>
        </ENVELOPE>
        """
        return self._send_request(xml_request)

    def export_vouchers_by_alterid(self, last_alter_id: int = 0):
        """
        Fetch incremental vouchers using ALTERID.
        """
        xml_request = f"""
        <ENVELOPE>
            <HEADER>
                <VERSION>1</VERSION>
                <TALLYREQUEST>Export</TALLYREQUEST>
                <TYPE>Collection</TYPE>
                <ID>IncrementalVouchers</ID>
            </HEADER>
            <BODY>
                <DESC>
                    <STATICVARIABLES>
                        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
                        {f'<SVCURRENTCOMPANY>{self.company_name}</SVCURRENTCOMPANY>' if self.company_name else ''}
                    </STATICVARIABLES>
                    <TDL>
                        <TDLMESSAGE>
                            <COLLECTION NAME="IncrementalVouchers" ISINITIALIZE="Yes">
                                <TYPE>Voucher</TYPE>
                                <FETCH>DATE, GUID, VOUCHERTYPENAME, VOUCHERNUMBER, PARTYLEDGERNAME, AMOUNT, NARRATION, REFERENCE, ISCANCELLED, ISOPTIONAL, ISDELETED, ALTERID</FETCH>
                                <FETCH>ALLLEDGERENTRIES.LIST.LEDGERNAME, ALLLEDGERENTRIES.LIST.AMOUNT, ALLLEDGERENTRIES.LIST.ISDEEMEDPOSITIVE</FETCH>
                                <FETCH>INVENTORYENTRIES.LIST.STOCKITEMNAME, INVENTORYENTRIES.LIST.BILLEDQTY, INVENTORYENTRIES.LIST.RATE, INVENTORYENTRIES.LIST.AMOUNT, INVENTORYENTRIES.LIST.ACTUALQTY</FETCH>
                                <FETCH>ALLINVENTORYENTRIES.LIST.STOCKITEMNAME, ALLINVENTORYENTRIES.LIST.BILLEDQTY, ALLINVENTORYENTRIES.LIST.RATE, ALLINVENTORYENTRIES.LIST.AMOUNT, ALLINVENTORYENTRIES.LIST.ACTUALQTY</FETCH>
                                <FETCH>INVENTORYENTRIESIN.LIST.STOCKITEMNAME, INVENTORYENTRIESIN.LIST.BILLEDQTY, INVENTORYENTRIESIN.LIST.RATE, INVENTORYENTRIESIN.LIST.AMOUNT, INVENTORYENTRIESIN.LIST.ACTUALQTY</FETCH>
                                <FETCH>INVENTORYENTRIESOUT.LIST.STOCKITEMNAME, INVENTORYENTRIESOUT.LIST.BILLEDQTY, INVENTORYENTRIESOUT.LIST.RATE, INVENTORYENTRIESOUT.LIST.AMOUNT, INVENTORYENTRIESOUT.LIST.ACTUALQTY</FETCH>
                                <FETCH>LEDGERENTRIES.LIST.LEDGERNAME, LEDGERENTRIES.LIST.AMOUNT, LEDGERENTRIES.LIST.ISDEEMEDPOSITIVE</FETCH>
                                <FILTER>AltIdFilter</FILTER>
                            </COLLECTION>
                            <SYSTEM TYPE="Formulae" NAME="AltIdFilter">$$NumValue:$ALTERID &gt; {last_alter_id}</SYSTEM>
                        </TDLMESSAGE>
                    </TDL>
                </DESC>
            </BODY>
        </ENVELOPE>
        """
        return self._send_request(xml_request)

    def export_stock_summary(self, from_date: str = None, to_date: str = None):
        """
        Request Stock Summary report for Closing Stock and Valuation.
        """
        xml_request = f"""
        <ENVELOPE>
            <HEADER>
                <TALLYREQUEST>Export Data</TALLYREQUEST>
            </HEADER>
            <BODY>
                <EXPORTDATA>
                    <REQUESTDESC>
                        <REPORTNAME>Stock Summary</REPORTNAME>
                        <STATICVARIABLES>
                            <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
                            {f'<SVFROMDATE>{from_date}</SVFROMDATE>' if from_date else ''}
                            {f'<SVTODATE>{to_date}</SVTODATE>' if to_date else ''}
                        </STATICVARIABLES>
                    </REQUESTDESC>
                </EXPORTDATA>
            </BODY>
        </ENVELOPE>
        """
        return self._send_request(xml_request)

    def export_profit_and_loss(self, from_date: str = None, to_date: str = None):
        """
        Request Profit & Loss A/c report.
        """
        xml_request = f"""
        <ENVELOPE>
            <HEADER>
                <TALLYREQUEST>Export Data</TALLYREQUEST>
            </HEADER>
            <BODY>
                <EXPORTDATA>
                    <REQUESTDESC>
                        <REPORTNAME>Profit &amp; Loss A/c</REPORTNAME>
                        <STATICVARIABLES>
                            <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
                            {f'<SVFROMDATE>{from_date}</SVFROMDATE>' if from_date else ''}
                            {f'<SVTODATE>{to_date}</SVTODATE>' if to_date else ''}
                        </STATICVARIABLES>
                    </REQUESTDESC>
                </EXPORTDATA>
            </BODY>
        </ENVELOPE>
        """
        return self._send_request(xml_request)

    def export_outstandings(self, report_type: str = "Receivables"):
        """
        Request Outstandings report (Receivables or Payables).
        report_type can be 'Receivables' or 'Payables'
        """
        report_name = "Bills Receivable" if report_type == "Receivables" else "Bills Payable"
        xml_request = f"""
        <ENVELOPE>
            <HEADER>
                <TALLYREQUEST>Export Data</TALLYREQUEST>
            </HEADER>
            <BODY>
                <EXPORTDATA>
                    <REQUESTDESC>
                        <REPORTNAME>{report_name}</REPORTNAME>
                        <STATICVARIABLES>
                            <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
                            {f'<SVCURRENTCOMPANY>{self.company_name}</SVCURRENTCOMPANY>' if self.company_name else ''}
                        </STATICVARIABLES>
                    </REQUESTDESC>
                </EXPORTDATA>
            </BODY>
        </ENVELOPE>
        """
        return self._send_request(xml_request)

    def export_master_by_alterid(self, master_type: str, last_alter_id: int = 0):
        """
        Fetch masters (Ledger, Godown, CostCentre) filtered by ALTERID to support incremental syncing.
        """
        xml_request = f"""
        <ENVELOPE>
            <HEADER>
                <VERSION>1</VERSION>
                <TALLYREQUEST>Export</TALLYREQUEST>
                <TYPE>Collection</TYPE>
                <ID>IncrementalMasters</ID>
            </HEADER>
            <BODY>
                <DESC>
                    <STATICVARIABLES>
                        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
                    </STATICVARIABLES>
                    <TDL>
                        <TDLMESSAGE>
                            <COLLECTION NAME="IncrementalMasters" ISINITIALIZE="Yes">
                                <TYPE>{master_type}</TYPE>
                                <FETCH>NAME, PARENT, GUID, OPENINGBALANCE, CLOSINGBALANCE, ALTERID, CREDITLIMIT, BILLCREDITPERIOD, LEDGERPHONE, LEDGERMOBILE, LEDGERCONTACT, EMAIL, LEDSTATENAME, PARTYGSTIN, ISREVENUE, ISDEEMEDPOSITIVE</FETCH>
                                <FILTER>AltIdFilter</FILTER>
                            </COLLECTION>
                            <SYSTEM TYPE="Formulae" NAME="AltIdFilter">$$NumValue:$ALTERID &gt; {last_alter_id}</SYSTEM>
                        </TDLMESSAGE>
                    </TDL>
                </DESC>
            </BODY>
        </ENVELOPE>
        """
        return self._send_request(xml_request)

    def export_stock_items(self):
        """
        Fetch all Stock Items using a custom TDL collection.
        This fetches the true Opening Balance, Base Units, and Parent Group.
        """
        xml_request = """
        <ENVELOPE>
            <HEADER>
                <VERSION>1</VERSION>
                <TALLYREQUEST>Export</TALLYREQUEST>
                <TYPE>Collection</TYPE>
                <ID>AllStockItems</ID>
            </HEADER>
            <BODY>
                <DESC>
                    <STATICVARIABLES>
                        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
                    </STATICVARIABLES>
                    <TDL>
                        <TDLMESSAGE>
                            <COLLECTION NAME="AllStockItems" ISINITIALIZE="Yes">
                                <TYPE>StockItem</TYPE>
                                <FETCH>NAME, PARENT, GUID, BASEUNITS, OPENINGBALANCE, OPENINGVALUE, CLOSINGBALANCE, CLOSINGVALUE, ALTERID</FETCH>
                            </COLLECTION>
                        </TDLMESSAGE>
                    </TDL>
                </DESC>
            </BODY>
        </ENVELOPE>
        """
        return self._send_request(xml_request)


    def parse_ledgers(self, xml_response):
        """Parse ledger data from Tally XML response."""
        ledgers = []
        if not xml_response: return ledgers
        try:
            cleaned_xml = clean_xml(xml_response)
            root = ET.fromstring(cleaned_xml)
            # Try multiple possible tag names Tally might use
            for ledger_node in root.findall('.//LEDGER'):
                name = ledger_node.get("NAME") or ledger_node.findtext("NAME") or ledger_node.findtext("LEDGERNAME")
                guid = ledger_node.findtext("GUID") or ledger_node.get("REMOTEID")
                if not name:
                    continue
                    
                opening_str = ledger_node.findtext("OPENINGBALANCE") or "0"
                # Tally sometimes formats numbers with commas or Dr/Cr
                opening_clean = re.sub(r'[^0-9.\-]', '', opening_str.split()[0] if opening_str.strip() else "0")
                
                ledgers.append({
                    "name": name,
                    "parent_group": ledger_node.findtext("PARENT") or ledger_node.findtext("PARENTGROUP"),
                    "tally_guid": guid or f"ledger-{name}",
                    "opening_balance": float(opening_clean) if opening_clean else 0.0,
                    "closing_balance": float(re.sub(r'[^0-9.\-]', '', (ledger_node.findtext("CLOSINGBALANCE") or "0").split()[0] or "0") or "0"),
                    "credit_limit": float(re.sub(r'[^0-9.\-]', '', (ledger_node.findtext("CREDITLIMIT") or "0").split()[0] or "0") or "0"),
                    "credit_days": int(re.sub(r'[^0-9]', '', (ledger_node.findtext("BILLCREDITPERIOD") or "0").split()[0] or "0") or "0"),
                    "gstin": ledger_node.findtext("PARTYGSTIN"),
                    "state": ledger_node.findtext("LEDSTATENAME"),
                    "phone": ledger_node.findtext("LEDGERPHONE") or ledger_node.findtext("LEDGERMOBILE"),
                    "contact_person": ledger_node.findtext("LEDGERCONTACT"),
                    "email": ledger_node.findtext("EMAIL"),
                    "is_revenue": ledger_node.findtext("ISREVENUE") == "Yes",
                    "is_deemed_positive": ledger_node.findtext("ISDEEMEDPOSITIVE") == "Yes",
                })
        except Exception as e:
            print(f"Failed to parse ledgers XML: {e}")
        return ledgers

    def parse_outstandings(self, xml_response, report_type="Receivables"):
        """Parse outstandings report data from Tally XML response."""
        bills = []
        if not xml_response: return bills
        try:
            cleaned_xml = clean_xml(xml_response)
            root = ET.fromstring(cleaned_xml)
            
            # Tally exports each bill's core info in <BILLFIXED> and the dynamic amounts as siblings.
            # E.g.
            # <BILLFIXED><BILLDATE>...</BILLDATE><BILLREF>...</BILLREF><BILLPARTY>...</BILLPARTY></BILLFIXED>
            # <BILLCL>...</BILLCL><BILLDUE>...</BILLDUE>
            
            children = list(root)
            for i, node in enumerate(children):
                if node.tag == 'BILLFIXED':
                    bill_date = node.findtext("BILLDATE")
                    bill_ref = node.findtext("BILLREF")
                    party = node.findtext("BILLPARTY")
                    
                    # Next sibling nodes usually contain BILLCL, BILLDUE, etc.
                    pending_amount_str = "0"
                    due_date = bill_date
                    for j in range(i+1, min(i+10, len(children))):
                        if children[j].tag == 'BILLFIXED':
                            break # Reached next bill
                        if children[j].tag == 'BILLCL':
                            pending_amount_str = children[j].text or "0"
                        if children[j].tag == 'BILLDUE':
                            due_date = children[j].text or due_date
                    
                    pending_amount = float(re.sub(r'[^0-9.\-]', '', pending_amount_str.split()[0] if pending_amount_str.strip() else "0") or "0")
                    if report_type == "Receivables":
                        # Tally exports receivables (Debits) as negative. Standardize to positive.
                        pending_amount = -pending_amount

                    # Determine Bill Type based on heuristics
                    bill_type = "new_ref"
                    if not bill_ref or bill_ref.lower().strip() == "on account":
                        bill_type = "on_account"
                    elif pending_amount < 0:
                        bill_type = "advance"
                        
                    if bill_date and party:
                        bills.append({
                            "party_ledger": party,
                            "bill_ref": bill_ref or "On Account",
                            "bill_type": bill_type,
                            "bill_date": bill_date,
                            "due_date": due_date,
                            "pending_amount": pending_amount
                        })
        except Exception as e:
            print(f"Failed to parse outstandings XML: {e}")
        return bills


    def parse_stock_items(self, xml_response):
        """Parse stock item data from Tally XML response."""
        stock_items = []
        if not xml_response: return stock_items
        try:
            cleaned_xml = clean_xml(xml_response)
            root = ET.fromstring(cleaned_xml)
            for item_node in root.findall('.//STOCKITEM'):
                name = item_node.get("NAME") or item_node.findtext("NAME") or item_node.findtext("STOCKITEMNAME")
                guid = item_node.findtext("GUID") or item_node.get("REMOTEID")
                if not name:
                    continue
                    
                # Clean quantities and values
                qty_str = item_node.findtext("OPENINGBALANCE") or "0"
                qty_clean = re.sub(r'[^0-9.\-]', '', qty_str.split()[0] if qty_str.strip() else "0")
                
                val_str = item_node.findtext("OPENINGVALUE") or "0"
                val_clean = re.sub(r'[^0-9.\-]', '', val_str.split()[0] if val_str.strip() else "0")
                
                rate_str = item_node.findtext("OPENINGRATE") or "0"
                rate_clean = re.sub(r'[^0-9.\-]', '', rate_str.split('/')[0] if '/' in rate_str else rate_str)
                
                closing_qty_str = item_node.findtext("CLOSINGBALANCE") or "0"
                closing_qty_clean = re.sub(r'[^0-9.\-]', '', closing_qty_str.split()[0] if closing_qty_str.strip() else "0")
                
                closing_val_str = item_node.findtext("CLOSINGVALUE") or "0"
                closing_val_clean = re.sub(r'[^0-9.\-]', '', closing_val_str.split()[0] if closing_val_str.strip() else "0")
                
                stock_items.append({
                    "name": name,
                    "parent_group": item_node.findtext("PARENT") or item_node.findtext("PARENTGROUP"),
                    "tally_guid": guid or f"stockitem-{name}",
                    "base_units": item_node.findtext("BASEUNITS") or "nos",
                    "opening_balance_qty": float(qty_clean) if qty_clean else 0.0,
                    "opening_balance_value": float(val_clean) if val_clean else 0.0,
                    "opening_rate": float(rate_clean) if rate_clean else 0.0,
                    "closing_balance_qty": float(closing_qty_clean) if closing_qty_clean else 0.0,
                    "closing_balance_value": float(closing_val_clean) if closing_val_clean else 0.0,
                })
        except Exception as e:
            print(f"Failed to parse stock items XML: {e}")
            import traceback
            traceback.print_exc()
        return stock_items


    def parse_vouchers(self, xml_response):
        """Parse voucher data from Tally XML response."""
        vouchers = []
        if not xml_response: return vouchers
        try:
            cleaned_xml = clean_xml(xml_response)
            root = ET.fromstring(cleaned_xml)
            for voucher_node in root.findall('.//VOUCHER'):
                raw_date = voucher_node.findtext("DATE")
                # Tally sends date as YYYYMMDD (e.g. 20260705). Convert to YYYY-MM-DD
                if raw_date and len(raw_date) >= 8:
                    formatted_date = f"{raw_date[:4]}-{raw_date[4:6]}-{raw_date[6:8]}"
                else:
                    formatted_date = raw_date
                
                # Skip invalid empty vouchers from Tally that lack a date
                if not formatted_date:
                    continue
                
                guid = voucher_node.findtext("GUID") or voucher_node.get("REMOTEID") or ""
                voucher_type = voucher_node.findtext("VOUCHERTYPENAME") or voucher_node.get("VCHTYPE") or "Unknown"
                voucher_number = voucher_node.findtext("VOUCHERNUMBER") or voucher_node.findtext("VCHNO")
                party = voucher_node.findtext("PARTYLEDGERNAME")
                narration = voucher_node.findtext("NARRATION")
                reference = voucher_node.findtext("REFERENCE")
                
                is_cancelled = (voucher_node.findtext("ISCANCELLED") or "").strip().lower() == "yes"
                is_deleted = (voucher_node.findtext("ISDELETED") or "").strip().lower() == "yes"
                is_optional = (voucher_node.findtext("ISOPTIONAL") or "").strip().lower() == "yes"
                alter_id = voucher_node.findtext("ALTERID") or voucher_node.get("ALTERID") or "0"
                
                entered_by = voucher_node.findtext("ENTEREDBY") or ""
                altered_by = voucher_node.findtext("ALTEREDBY") or ""
                
                # Extract Ledger Entries
                ledgers = []
                
                # Check top-level AMOUNT first
                top_amt_str = voucher_node.findtext("AMOUNT")
                if top_amt_str:
                    amt_clean = re.sub(r'[^0-9.\-]', '', top_amt_str.split('/')[0] if '/' in top_amt_str else top_amt_str)
                    total_amount = abs(float(amt_clean)) if amt_clean else 0.0
                else:
                    total_amount = 0.0
                
                ledger_lists = voucher_node.findall('.//ALLLEDGERENTRIES.LIST')
                if not ledger_lists:
                    ledger_lists = voucher_node.findall('.//LEDGERENTRIES.LIST')
                
                for idx, ledger_node_entry in enumerate(ledger_lists):
                    ledger_name = ledger_node_entry.findtext("LEDGERNAME") or ""
                    amt_str = ledger_node_entry.findtext("AMOUNT") or "0"
                    # Clean amount string - remove everything except digits, dot, minus
                    amt_clean = re.sub(r'[^0-9.\-]', '', amt_str.split('/')[0] if '/' in amt_str else amt_str)
                    amt = float(amt_clean) if amt_clean else 0.0
                    
                    # In Tally, negative means debit (money going out)
                    is_debit = amt < 0
                    abs_amt = abs(amt)
                    
                    if idx == 0 and total_amount == 0.0:
                        total_amount = abs_amt
                    
                    ledgers.append({
                        "ledger_name": ledger_name,
                        "amount": abs_amt,
                        "is_debit": is_debit
                    })
                    
                # Extract Inventory Entries
                inventory = []
                inv_lists = voucher_node.findall('.//ALLINVENTORYENTRIES.LIST')
                if not inv_lists:
                    inv_lists = voucher_node.findall('.//INVENTORYENTRIES.LIST')
                if not inv_lists:
                    inv_lists = (
                        voucher_node.findall('.//INVENTORYENTRIESIN.LIST') + 
                        voucher_node.findall('.//INVENTORYENTRIESOUT.LIST')
                    )
                
                for inv_node in inv_lists:
                    item_name = inv_node.findtext("STOCKITEMNAME")
                    if not item_name:
                        continue
                    
                    # Parse quantity - Tally format can be "234 Pcs" or just "234"
                    qty_str = inv_node.findtext("BILLEDQTY") or inv_node.findtext("ACTUALQTY") or "0"
                    qty_val = re.sub(r'[^0-9.\-]', '', qty_str.split()[0] if qty_str.strip() else "0")
                    qty = abs(float(qty_val)) if qty_val else 0.0
                    
                    # Parse rate - Tally format can be "76.20/Pcs" or just "76.20"
                    rate_str = inv_node.findtext("RATE") or "0"
                    rate_val = re.sub(r'[^0-9.\-]', '', rate_str.split('/')[0] if '/' in rate_str else rate_str)
                    rate = abs(float(rate_val)) if rate_val else 0.0
                    
                    # Parse amount
                    inv_amt_str = inv_node.findtext("AMOUNT") or "0"
                    inv_amt_clean = re.sub(r'[^0-9.\-]', '', inv_amt_str.split('/')[0] if '/' in inv_amt_str else inv_amt_str)
                    inv_amt = abs(float(inv_amt_clean)) if inv_amt_clean else 0.0

                    # CRITICAL FIX: If amount is 0 but qty and rate are present, calculate it
                    if inv_amt == 0.0 and qty > 0 and rate > 0:
                        inv_amt = qty * rate
                    
                    # Determine if inward (purchase) or outward (sale)
                    vtype_lower = voucher_type.lower()
                    is_inward = 'purchase' in vtype_lower or 'receipt' in vtype_lower or 'debit note' in vtype_lower
                    
                    inventory.append({
                        "stock_item_name": item_name,
                        "billed_qty": qty,
                        "rate": rate,
                        "amount": inv_amt,
                        "is_inward": is_inward
                    })

                # Use the voucher's AMOUNT field if available, otherwise use the first ledger amount
                voucher_amount_str = voucher_node.findtext("AMOUNT") or "0"
                voucher_amount_clean = re.sub(r'[^0-9.\-]', '', voucher_amount_str)
                voucher_amount = abs(float(voucher_amount_clean)) if voucher_amount_clean else total_amount

                if not party and ledgers:
                    party = ledgers[0]["ledger_name"]

                vouchers.append({
                    "tally_guid": guid,
                    "voucher_type_name": voucher_type,
                    "voucher_number": voucher_number,
                    "party_ledger_name": party or "Cash",
                    "date": formatted_date,
                    "amount": voucher_amount if voucher_amount > 0 else total_amount,
                    "narration": narration,
                    "reference": reference,
                    "is_cancelled": is_cancelled,
                    "is_deleted": is_deleted,
                    "is_optional": is_optional,
                    "alter_id": alter_id,
                    "entered_by": entered_by,
                    "altered_by": altered_by,
                    "ledgers": ledgers,
                    "inventory": inventory
                })
        except Exception as e:
            print(f"Failed to parse vouchers XML: {e}")
            import traceback
            traceback.print_exc()
        return vouchers
