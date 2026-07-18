"""
Full diagnostic: fetch ALL data from Tally using the new TDL collection approach, 
then push everything to Supabase using high-performance batch upserts.
"""
import sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
os.environ['PYTHONIOENCODING'] = 'utf-8'

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '..', 'backend', '.env'))

from tally_client import TallyClient
import datetime

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

sync_start = datetime.datetime.now(datetime.timezone.utc).isoformat()

print("=" * 60)
print("FULL TALLY SYNC TEST (Batched TDL Collection Method)")
print("=" * 60)

target_company = ""
if len(sys.argv) > 1:
    target_company = " ".join(sys.argv[1:])
    print(f"Targeting specific company: {target_company}")

tally = TallyClient(url="http://localhost:9000", company_name=target_company)

# --- Fetch Vouchers ---
print("\n[1] Fetching ALL vouchers from Tally...")
vouchers_xml = tally.export_vouchers()
if not vouchers_xml:
    print("  FAILED: No response from Tally. Is it running on port 9000?")
    sys.exit(1)

print(f"  Got XML: {len(vouchers_xml)} chars")

with open("raw_vouchers_v2.xml", "w", encoding="utf-8") as f:
    f.write(vouchers_xml)

vouchers = tally.parse_vouchers(vouchers_xml)
print(f"  Parsed: {len(vouchers)} vouchers")

# Show voucher type breakdown
type_counts = {}
for v in vouchers:
    t = v['voucher_type_name']
    type_counts[t] = type_counts.get(t, 0) + 1
print(f"\n  Voucher Types:")
for t, c in sorted(type_counts.items(), key=lambda x: -x[1]):
    print(f"    {t}: {c}")

# Show first 3
if vouchers:
    print(f"\n  Sample vouchers:")
    for i, v in enumerate(vouchers[:3]):
        print(f"    [{i+1}] {v['voucher_type_name']} | {v['date']} | {v['party_ledger_name']} | amt={v['amount']}")

# --- Fetch Ledgers ---
print(f"\n[2] Fetching ALL ledgers from Tally...")
ledgers_xml = tally.export_ledgers()
if ledgers_xml:
    with open("raw_ledgers_v2.xml", "w", encoding="utf-8") as f:
        f.write(ledgers_xml)
    print(f"  Got XML: {len(ledgers_xml)} chars")
    ledgers = tally.parse_ledgers(ledgers_xml)
    print(f"  Parsed: {len(ledgers)} ledgers")
    if ledgers:
        for i, l in enumerate(ledgers[:5]):
            print(f"    [{i+1}] {l['name']} | group={l.get('parent_group','')} | bal={l.get('opening_balance',0)}")
else:
    ledgers = []
    print("  No ledger data received")

# --- Fetch Stock Items ---
print(f"\n[2.5] Fetching ALL Stock Items from Tally...")
stock_items_xml = tally.export_stock_items()
if stock_items_xml:
    with open("raw_stock_items.xml", "w", encoding="utf-8") as f:
        f.write(stock_items_xml)
    print(f"  Got XML: {len(stock_items_xml)} chars")
    stock_items = tally.parse_stock_items(stock_items_xml)
    print(f"  Parsed: {len(stock_items)} stock items")
    if stock_items:
        for i, s in enumerate(stock_items[:5]):
            print(f"    [{i+1}] {s['name']} | group={s.get('parent_group','')} | bal={s.get('opening_balance_qty',0)}")
else:
    stock_items = []

# --- Fetch Outstandings ---
print(f"\n[2.8] Fetching Outstandings from Tally...")
rec_xml = tally.export_outstandings("Receivables")
pay_xml = tally.export_outstandings("Payables")
outstandings = []
if rec_xml:
    r_bills = tally.parse_outstandings(rec_xml, "Receivables")
    for b in r_bills: b["party_group"] = "receivable"
    outstandings.extend(r_bills)
if pay_xml:
    p_bills = tally.parse_outstandings(pay_xml, "Payables")
    for b in p_bills: b["party_group"] = "payable"
    outstandings.extend(p_bills)
print(f"  Parsed: {len(outstandings)} outstanding bills")


# --- Push to Supabase ---
if not SUPABASE_URL or not SUPABASE_KEY:
    print("\n[3] Supabase not configured, skipping push.")
    sys.exit(0)

print(f"\n[3] Pushing to Supabase ({SUPABASE_URL})...")
from supabase import create_client
sb = create_client(SUPABASE_URL, SUPABASE_KEY)

# Ensure company exists
sync_company_name = tally.company_name or "Demo Company"
existing = sb.table("companies").select("id").eq("name", sync_company_name).execute()
if existing.data and len(existing.data) > 0:
    company_id = existing.data[0]["id"]
    print(f"  Using company: {company_id} ({sync_company_name})")
else:
    res = sb.table("companies").insert({"name": sync_company_name}).execute()
    company_id = res.data[0]["id"]
    print(f"  Created company: {company_id} ({sync_company_name})")

# Push ledgers in batches
print(f"\n  Pushing {len(ledgers)} ledgers in batches...")
l_ok = 0
batch_size = 200
for i in range(0, len(ledgers), batch_size):
    batch = ledgers[i:i+batch_size]
    db_batch = []
    for l in batch:
        db_batch.append({
            "company_id": company_id,
            "name": l["name"],
            "parent_group": l.get("parent_group"),
            "tally_guid": l["tally_guid"],
            "opening_balance": float(l.get("opening_balance", 0)),
            "closing_balance": float(l.get("closing_balance", 0)),
            "gstin": l.get("gstin"),
            "state": l.get("state"),
            "phone": l.get("phone"),
            "contact_person": l.get("contact_person"),
            "email": l.get("email"),
        })
    try:
        sb.table("ledgers").upsert(db_batch, on_conflict="tally_guid").execute()
        l_ok += len(batch)
    except Exception as e:
        print(f"    Batch ledgers insert failed at index {i}: {e}")
print(f"  Ledgers synced successfully: {l_ok}/{len(ledgers)}")

# Push stock items in batches
print(f"\n  Pushing {len(stock_items)} stock items in batches...")
s_ok = 0
for i in range(0, len(stock_items), batch_size):
    batch = stock_items[i:i+batch_size]
    db_batch = []
    for s in batch:
        db_batch.append({
            "company_id": company_id,
            "name": s["name"],
            "parent_group": s.get("parent_group"),
            "tally_guid": s["tally_guid"],
            "base_units": s.get("base_units", "nos"),
            "opening_balance_qty": float(s.get("opening_balance_qty", 0)),
            "opening_balance_value": float(s.get("opening_balance_value", 0))
        })
    try:
        sb.table("stock_items").upsert(db_batch, on_conflict="tally_guid").execute()
        s_ok += len(batch)
    except Exception as e:
        print(f"    Batch stock items insert failed at index {i}: {e}")
print(f"  Stock Items synced successfully: {s_ok}/{len(stock_items)}")

# Push vouchers in batches
print(f"\n  Pushing {len(vouchers)} vouchers in batches...")
v_ok = 0
v_batch_size = 100
for i in range(0, len(vouchers), v_batch_size):
    batch = vouchers[i:i+v_batch_size]
    db_batch = []
    for v in batch:
        db_batch.append({
            "company_id": company_id,
            "tally_guid": v["tally_guid"],
            "voucher_type_name": v["voucher_type_name"],
            "voucher_number": v.get("voucher_number"),
            "date": v["date"],
            "party_ledger_name": v.get("party_ledger_name", "Cash"),
            "amount": float(v.get("amount", 0)),
            "narration": v.get("narration"),
            "reference": v.get("reference"),
            "is_cancelled": v.get("is_cancelled", False),
            "is_deleted": v.get("is_deleted", False),
            "is_optional": v.get("is_optional", False),
            "entered_by": v.get("entered_by", ""),
            "altered_by": v.get("altered_by", ""),
            "updated_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
        })
    try:
        v_res = sb.table("vouchers").upsert(db_batch, on_conflict="tally_guid").execute()
        if v_res.data:
            guid_to_id = {row["tally_guid"]: row["id"] for row in v_res.data}
            
            ledger_entries = []
            inventory_entries = []
            voucher_ids_in_batch = list(guid_to_id.values())
            
            # Wipe existing child entries for the vouchers in this batch
            if voucher_ids_in_batch:
                sb.table("voucher_ledgers").delete().in_("voucher_id", voucher_ids_in_batch).execute()
                sb.table("voucher_inventory").delete().in_("voucher_id", voucher_ids_in_batch).execute()
            
            for v in batch:
                v_db_id = guid_to_id.get(v["tally_guid"])
                if not v_db_id:
                    continue
                
                if v.get("ledgers"):
                    for l in v["ledgers"]:
                        ledger_entries.append({
                            "voucher_id": v_db_id,
                            "ledger_name": l["ledger_name"],
                            "amount": float(l["amount"]),
                            "is_debit": l.get("is_debit", False)
                        })
                
                if v.get("inventory"):
                    for inv in v["inventory"]:
                        inventory_entries.append({
                            "voucher_id": v_db_id,
                            "stock_item_name": inv["stock_item_name"],
                            "billed_qty": float(inv["billed_qty"]),
                            "actual_qty": float(inv.get("billed_qty", 0)),
                            "rate": float(inv.get("rate", 0)),
                            "amount": float(inv["amount"]),
                            "is_inward": inv.get("is_inward", True)
                        })
            
            if ledger_entries:
                sb.table("voucher_ledgers").insert(ledger_entries).execute()
            if inventory_entries:
                sb.table("voucher_inventory").insert(inventory_entries).execute()
                
            v_ok += len(batch)
    except Exception as e:
        print(f"    Batch vouchers insert failed at index {i}: {e}")
print(f"  Vouchers synced successfully: {v_ok}/{len(vouchers)}")

# Push outstandings
print(f"\n  Pushing {len(outstandings)} outstanding bills...")
ok_count = 0
if outstandings:
    today = datetime.datetime.now().strftime("%Y-%m-%d")
    try:
        sb.table("outstanding_bills").delete().eq("company_name", sync_company_name).execute()
        
        batch_size = 500
        for i in range(0, len(outstandings), batch_size):
            batch = outstandings[i:i+batch_size]
            db_batch = []
            for b in batch:
                db_batch.append({
                    "company_name": sync_company_name,
                    "party_ledger": b["party_ledger"],
                    "party_group": b["party_group"],
                    "bill_ref": b["bill_ref"],
                    "bill_type": b["bill_type"],
                    "bill_date": b["bill_date"],
                    "due_date": b["due_date"],
                    "pending_amount": b["pending_amount"],
                    "as_on_date": today
                })
            res = sb.table("outstanding_bills").insert(db_batch).execute()
            if res.data:
                ok_count += len(res.data)
        print(f"  Outstandings: {ok_count} inserted")
    except Exception as e:
        print(f"  Failed to push outstandings: {e}")

# Verify
print(f"\n[4] VERIFICATION:")
vc = sb.table("vouchers").select("id", count="exact").execute()
lc = sb.table("ledgers").select("id", count="exact").execute()
sc = sb.table("stock_items").select("id", count="exact").execute()
print(f"  Total Vouchers in DB: {vc.count}")
print(f"  Total Ledgers in DB:  {lc.count}")
print(f"  Total Stock Items in DB: {sc.count}")

sales = sb.table("vouchers").select("id", count="exact").ilike("voucher_type_name", "%sale%").execute()
purchases = sb.table("vouchers").select("id", count="exact").ilike("voucher_type_name", "%purchase%").execute()
print(f"  Sales vouchers:    {sales.count}")
print(f"  Purchase vouchers: {purchases.count}")

print("\n" + "=" * 60)
print("DONE! Refresh your website to see the data.")
print("=" * 60)

# Log the sync
try:
    sb.table("sync_logs").insert({
        "sync_id": f"SYNC-{int(datetime.datetime.now().timestamp())}",
        "company_id": company_id,
        "sync_source": "test_sync.py",
        "started_at": sync_start,
        "completed_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "status": "SUCCESS",
        "records_inserted": v_ok + l_ok + s_ok + ok_count,
        "records_updated": 0
    }).execute()
    print("  -> Sync log saved.")
except Exception as e:
    print(f"  -> Failed to save sync log: {e}")
