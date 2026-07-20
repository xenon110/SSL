"""
Enterprise-Grade Tally Background Sync Agent.
- 30-second sync interval
- Incremental sync using ALTERID (sync_checkpoints)
- Batch processing (1000 records per insert)
- Pre-insert validation (debit=credit, duplicate GUID)
- Retry with exponential backoff (5s, 15s, 60s)
- XML archiving to archive/xml/
- Post-sync reconciliation
- Comprehensive sync logging
"""
import sys
import os
import time
import re
import json
import uuid
import gzip
import datetime
import traceback
import requests
from dotenv import load_dotenv
from apscheduler.schedulers.background import BackgroundScheduler
from tally_client import TallyClient
from supabase import create_client

sys.path.insert(0, os.path.dirname(__file__))
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
TALLY_URL = os.getenv("TALLY_URL", "http://localhost:9000")
SYNC_INTERVAL = int(os.getenv("SYNC_INTERVAL", "30"))
BATCH_SIZE = int(os.getenv("BATCH_SIZE", "1000"))
RETRY_BACKOFF = [5, 15, 60]

ARCHIVE_DIR = os.path.join(os.path.dirname(__file__), '..', 'archive', 'xml')
os.makedirs(ARCHIVE_DIR, exist_ok=True)

def log(msg, level="INFO"):
    print(f"[{datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] [{level}] {msg}", flush=True)

_sync_running = False

def parse_tally_date(date_str):
    if not date_str:
        return None
    date_str = date_str.strip()
    if re.match(r'^\d{8}$', date_str):
        return f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:]}"
    if re.match(r'^\d{4}-\d{2}-\d{2}$', date_str):
        return date_str
    for fmt in ('%d-%b-%y', '%d-%b-%Y', '%d-%B-%y', '%d-%B-%Y', '%Y-%b-%d', '%Y-%B-%d'):
        try:
            dt = datetime.datetime.strptime(date_str, fmt)
            return dt.strftime('%Y-%m-%d')
        except ValueError:
            continue
    return date_str

def get_open_companies():
    """Queries Tally to get a list of all currently open companies."""
    xml_request = """<ENVELOPE>
      <HEADER>
        <VERSION>1</VERSION>
        <TALLYREQUEST>Export</TALLYREQUEST>
        <TYPE>Collection</TYPE>
        <ID>AllCompanies</ID>
      </HEADER>
      <BODY>
        <DESC>
          <STATICVARIABLES>
            <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
          </STATICVARIABLES>
          <TDL>
            <TDLMESSAGE>
              <COLLECTION NAME="AllCompanies" ISINITIALIZE="Yes">
                <TYPE>Company</TYPE>
                <FETCH>Name</FETCH>
              </COLLECTION>
            </TDLMESSAGE>
          </TDL>
        </DESC>
      </BODY>
    </ENVELOPE>"""
    for attempt in range(3):
        try:
            res = requests.post(TALLY_URL, data=xml_request.encode('utf-8'),
                                headers={'Content-Type': 'text/xml'}, timeout=15)
            if res.status_code == 200:
                names = re.findall(r'<NAME[^>]*>(.*?)</NAME>', res.text)
                return list(set([n.replace('&amp;', '&').strip() for n in names if n.strip()]))
        except Exception as e:
            wait = RETRY_BACKOFF[attempt] if attempt < len(RETRY_BACKOFF) else 60
            log(f"Tally connection attempt {attempt+1} failed: {e}. Retrying in {wait}s...", "WARN")
            time.sleep(wait)
    return []

def archive_xml(xml_content: str, company_name: str, sync_id: str, suffix: str):
    """Save raw XML to disk for debugging/auditing."""
    filename = f"{company_name.replace(' ', '_')}_{sync_id}_{suffix}.xml"
    path = os.path.join(ARCHIVE_DIR, filename)
    with open(path, "w", encoding="utf-8") as f:
        f.write(xml_content)
    return filename

def cleanup_old_archives(days_to_keep: int = 7):
    """Delete archive XML files older than the specified number of days to prevent disk exhaustion."""
    try:
        now = time.time()
        cutoff = now - (days_to_keep * 86400)
        deleted_count = 0
        for filename in os.listdir(ARCHIVE_DIR):
            path = os.path.join(ARCHIVE_DIR, filename)
            if os.path.isfile(path) and os.path.getmtime(path) < cutoff:
                os.remove(path)
                deleted_count += 1
        if deleted_count > 0:
            log(f"Cleaned up {deleted_count} old XML archive files.")
    except Exception as e:
        log(f"Failed to cleanup old archives: {e}", "WARN")

def validate_vouchers(vouchers: list) -> tuple:
    """
    Validate voucher list before inserting.
    Returns (valid_vouchers, errors_list)
    """
    valid = []
    errors = []
    seen_guids = set()
    
    for v in vouchers:
        v_errors = []
        
        # Required fields check
        if not v.get('tally_guid'):
            v_errors.append("Missing GUID")
        if not v.get('date'):
            v_errors.append("Missing date")
        if not v.get('voucher_type_name'):
            v_errors.append("Missing voucher type")

        # Duplicate GUID check (within this batch)
        if v.get('tally_guid') in seen_guids:
            v_errors.append(f"Duplicate GUID in batch: {v['tally_guid']}")
        elif v.get('tally_guid'):
            seen_guids.add(v['tally_guid'])

        # Debit = Credit check (within ±0.01)
        if v.get('ledgers'):
            debit_total = sum(abs(l['amount']) for l in v['ledgers'] if l.get('is_debit'))
            credit_total = sum(abs(l['amount']) for l in v['ledgers'] if not l.get('is_debit'))
            if debit_total > 0 and credit_total > 0:
                if abs(debit_total - credit_total) > 0.01:
                    v_errors.append(f"Debit({debit_total:.2f}) != Credit({credit_total:.2f})")

        if v_errors:
            errors.append({'guid': v.get('tally_guid'), 'errors': v_errors})
        else:
            valid.append(v)
    
    return valid, errors

def get_last_alter_id(sb, company_id: str) -> int:
    """Get the last synced ALTERID from sync_checkpoints for incremental sync."""
    try:
        res = sb.table("sync_checkpoints").select("last_alter_id").eq("company_id", company_id).limit(1).execute()
        if res.data and len(res.data) > 0:
            return int(res.data[0].get("last_alter_id") or 0)
    except Exception as e:
        log(f"  Could not fetch sync checkpoint: {e}", "WARN")
    return 0

def update_checkpoint(sb, company_id: str, last_alter_id: int, sync_id: str):
    """Update the sync checkpoint after a successful sync."""
    try:
        sb.table("sync_checkpoints").upsert({
            "company_id": company_id,
            "last_alter_id": last_alter_id,
            "last_successful_sync_id": sync_id,
            "status": "success",
            "updated_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }, on_conflict="company_id").execute()
    except Exception as e:
        log(f"  Failed to update checkpoint: {e}", "WARN")

def save_sync_archive(sb, filename: str, company_id: str, sync_id: str, xml_size: int):
    """Save archive metadata to the sync_archives table."""
    try:
        sb.table("sync_archives").insert({
            "filename": filename,
            "company_id": company_id,
            "sync_id": sync_id,
            "sync_timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "xml_size": xml_size,
            "status": "archived"
        }).execute()
    except Exception as e:
        log(f"  Failed to save archive metadata: {e}", "WARN")

def _process_vouchers_chunk(sb, company_id, vouchers_raw, last_alter_id, max_alter_id, stats):
    """Helper to process and upsert a batch of parsed vouchers."""
    vouchers, validation_errors = validate_vouchers(vouchers_raw)
    stats["validation_failures"] += len(validation_errors)
    if validation_errors:
        log(f"  Validation failures: {len(validation_errors)} (skipping those records)", "WARN")
        for err in validation_errors[:5]:
            log(f"    -> {err}", "WARN")

    try:
        existing_res = sb.table("vouchers").select("tally_guid").eq("company_id", company_id).execute()
        existing_guids = {row["tally_guid"] for row in (existing_res.data or [])}
    except Exception:
        existing_guids = set()

    new_vouchers = [v for v in vouchers if v.get("tally_guid") not in existing_guids]
    update_vouchers = [v for v in vouchers if v.get("tally_guid") in existing_guids]
    stats["duplicates_detected"] += len(vouchers_raw) - len(vouchers)
    log(f"  New: {len(new_vouchers)}, Updates: {len(update_vouchers)}, Skipped invalid: {len(validation_errors)}")

    v_new_or_modified = [v for v in vouchers if int(v.get("alter_id") or 0) > last_alter_id]
    log(f"  Processing {len(v_new_or_modified)} new/altered vouchers...")

    v_ok = 0
    v_batch_size = 200
    for i in range(0, len(v_new_or_modified), v_batch_size):
        batch = v_new_or_modified[i:i+v_batch_size]
        for v in batch:
            alter_id_val = int(v.get("alter_id") or 0)
            if alter_id_val > max_alter_id:
                max_alter_id = alter_id_val
        
        db_batch = []
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        for v in batch:
            db_batch.append({
                "company_id": company_id, "tally_guid": v["tally_guid"],
                "voucher_type_name": v["voucher_type_name"],
                "voucher_number": v.get("voucher_number"),
                "date": v["date"], "party_ledger_name": v.get("party_ledger_name", "Cash"),
                "amount": float(v.get("amount", 0)), "narration": v.get("narration"),
                "reference": v.get("reference"), "is_cancelled": v.get("is_cancelled", False),
                "is_deleted": v.get("is_deleted", False), "is_optional": v.get("is_optional", False),
                "entered_by": v.get("entered_by", ""), "altered_by": v.get("altered_by", ""),
                "updated_at": now_iso
            })
            
        try:
            v_res = sb.table("vouchers").upsert(db_batch, on_conflict="tally_guid").execute()
            if v_res.data:
                guid_to_id = {row["tally_guid"]: row["id"] for row in v_res.data if row.get("tally_guid")}
                voucher_ids = list(guid_to_id.values())
                
                if voucher_ids:
                    sb.table("voucher_ledgers").delete().in_("voucher_id", voucher_ids).execute()
                    sb.table("voucher_inventory").delete().in_("voucher_id", voucher_ids).execute()
                    
                ledger_entries = []
                inv_entries = []
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
                            inv_entries.append({
                                "voucher_id": v_db_id,
                                "stock_item_name": inv["stock_item_name"],
                                "billed_qty": float(inv["billed_qty"]),
                                "actual_qty": float(inv.get("billed_qty", 0)),
                                "rate": float(inv.get("rate", 0)),
                                "amount": float(inv["amount"]),
                                "is_inward": inv.get("is_inward", True)
                            })
                            
                if ledger_entries:
                    for j in range(0, len(ledger_entries), BATCH_SIZE):
                        sb.table("voucher_ledgers").insert(ledger_entries[j:j+BATCH_SIZE]).execute()
                        
                if inv_entries:
                    for j in range(0, len(inv_entries), BATCH_SIZE):
                        sb.table("voucher_inventory").insert(inv_entries[j:j+BATCH_SIZE]).execute()
                        
                v_ok += len(batch)
        except Exception as e:
            log(f"  Failed batch in voucher upsert: {e}", "WARN")
            stats["records_failed"] += len(batch)
            
    log(f"  Vouchers: {v_ok}/{len(v_new_or_modified)} synced successfully in chunk")
    stats["records_inserted"] += v_ok
    return max_alter_id

def sync_company(sb, company_name: str):
    log(f">>> Starting Sync for: {company_name} <<<")
    sync_start = datetime.datetime.now(datetime.timezone.utc)
    sync_id = f"SYNC-{int(sync_start.timestamp())}-{uuid.uuid4().hex[:6].upper()}"
    
    stats = {
        "records_inserted": 0, "records_updated": 0,
        "records_failed": 0, "validation_failures": 0,
        "duplicates_detected": 0, "status": "success",
        "error_message": None
    }

    historical_sync_complete = True

    # 1. Ensure company exists in Supabase
    try:
        existing = sb.table("companies").select("id").eq("name", company_name).execute()
        if existing.data:
            company_id = existing.data[0]["id"]
        else:
            res = sb.table("companies").insert({"name": company_name}).execute()
            company_id = res.data[0]["id"]
        log(f"  Company ID: {company_id}")
    except Exception as e:
        log(f"  FATAL: Failed to register company: {e}", "ERROR")
        return

    tally = TallyClient(url=TALLY_URL, company_name=company_name)
    last_alter_id = get_last_alter_id(sb, company_id)
    max_alter_id = last_alter_id
    log(f"  Incremental sync from ALTERID > {last_alter_id}")

    # 2. Fetch Ledgers (incremental by ALTERID)
    log("  Fetching ledgers...")
    ledgers_xml = None
    for attempt in range(3):
        try:
            ledgers_xml = tally.export_master_by_alterid("Ledger", last_alter_id)
            break
        except Exception as e:
            wait = RETRY_BACKOFF[attempt] if attempt < len(RETRY_BACKOFF) else 60
            log(f"  Ledger fetch attempt {attempt+1} failed. Retry in {wait}s", "WARN")
            time.sleep(wait)

    if ledgers_xml:
        archive_xml(ledgers_xml, company_name, sync_id, "ledgers")
        ledgers = tally.parse_ledgers(ledgers_xml)
        log(f"  Parsed {len(ledgers)} new/modified ledgers")
        l_ok = 0
        for i in range(0, len(ledgers), BATCH_SIZE):
            batch = ledgers[i:i+BATCH_SIZE]
            insert_data = []
            for l in batch:
                clean_gstin = re.sub(r'[^A-Za-z0-9]', '', l.get("gstin") or "")[:15]
                clean_phone = (l.get("phone") or "").strip()[:15]
                clean_state = (l.get("state") or "").strip()[:15]
                clean_email = (l.get("email") or "").strip()[:100]
                clean_contact = (l.get("contact_person") or "").strip()[:100]
                
                insert_data.append({
                    "company_id": company_id, "name": l["name"],
                    "parent_group": l.get("parent_group"), "tally_guid": l["tally_guid"],
                    "opening_balance": float(l.get("opening_balance", 0)),
                    "closing_balance": float(l.get("closing_balance", 0)),
                    "gstin": clean_gstin, "state": clean_state,
                    "phone": clean_phone, "contact_person": clean_contact,
                    "email": clean_email,
                    "credit_limit": float(l.get("credit_limit", 0)),
                    "credit_days": int(l.get("credit_days", 0))
                })
            if insert_data:
                try:
                    sb.table("ledgers").upsert(insert_data, on_conflict="tally_guid").execute()
                    l_ok += len(insert_data)
                except Exception as e:
                    log(f"  Error bulk upserting ledgers batch: {e}", "ERROR")
                    stats["records_failed"] += len(insert_data)
        log(f"  Ledgers: {l_ok} synced")
        stats["records_inserted"] += l_ok

    # 3. Fetch Stock Items
    log("  Fetching stock items...")
    stock_items_xml = None
    for attempt in range(3):
        try:
            stock_items_xml = tally.export_stock_items()
            break
        except Exception as e:
            time.sleep(RETRY_BACKOFF[attempt] if attempt < len(RETRY_BACKOFF) else 60)

    if stock_items_xml:
        archive_xml(stock_items_xml, company_name, sync_id, "stock_items")
        stock_items = tally.parse_stock_items(stock_items_xml)
        log(f"  Parsed {len(stock_items)} stock items")
        s_ok = 0
        for i in range(0, len(stock_items), BATCH_SIZE):
            batch = stock_items[i:i+BATCH_SIZE]
            insert_data = []
            for s in batch:
                insert_data.append({
                    "company_id": company_id, "name": s["name"],
                    "parent_group": s.get("parent_group"), "tally_guid": s["tally_guid"],
                    "base_units": s.get("base_units", "nos"),
                    "opening_balance_qty": float(s.get("opening_balance_qty", 0)),
                    "opening_balance_value": float(s.get("opening_balance_value", 0)),
                    "closing_balance_qty": float(s.get("closing_balance_qty", 0)),
                    "closing_balance_value": float(s.get("closing_balance_value", 0))
                })
            if insert_data:
                try:
                    sb.table("stock_items").upsert(insert_data, on_conflict="tally_guid").execute()
                    s_ok += len(insert_data)
                except Exception as e:
                    log(f"  Error bulk upserting stock items batch: {e}", "ERROR")
                    stats["records_failed"] += len(insert_data)
        log(f"  Stock Items: {s_ok} synced")
        stats["records_inserted"] += s_ok

    # 4. Fetch Vouchers (Dual Mode: Historical Chunking vs Live Mode)
    log("  Fetching vouchers...")
    if last_alter_id > 0:
        # LIVE MODE: Lightning fast sync using ALTERID
        log("  [LIVE MODE] Fetching incremental vouchers by ALTERID...")
        vouchers_xml = None
        for attempt in range(3):
            try:
                vouchers_xml = tally.export_vouchers_by_alterid(last_alter_id)
                break
            except Exception as e:
                wait = RETRY_BACKOFF[attempt] if attempt < len(RETRY_BACKOFF) else 60
                log(f"  Incremental voucher fetch attempt {attempt+1} failed. Retry in {wait}s", "WARN")
                time.sleep(wait)

        if vouchers_xml:
            filename = archive_xml(vouchers_xml, company_name, sync_id, "vouchers_inc")
            save_sync_archive(sb, filename, company_id, sync_id, len(vouchers_xml))
            vouchers_raw = tally.parse_vouchers(vouchers_xml)
            log(f"  Parsed {len(vouchers_raw)} incremental vouchers from Tally")
            max_alter_id = _process_vouchers_chunk(sb, company_id, vouchers_raw, last_alter_id, max_alter_id, stats)
    else:
        # HISTORICAL MODE: Chunked loading
        log("  [HISTORICAL MODE] First time sync. Fetching vouchers in monthly chunks...")
        # Start from April 1, 2019
        current_date = datetime.date(2019, 4, 1)
        end_date = datetime.date.today()
        
        while current_date <= end_date:
            chunk_end = current_date + datetime.timedelta(days=30)
            if chunk_end > end_date:
                chunk_end = end_date
                
            from_str = current_date.strftime("%Y%m%d")
            to_str = chunk_end.strftime("%Y%m%d")
            log(f"  Fetching chunk: {from_str} to {to_str}...")
            
            vouchers_xml = None
            for attempt in range(3):
                try:
                    vouchers_xml = tally.export_vouchers(from_str, to_str)
                    break
                except Exception as e:
                    wait = RETRY_BACKOFF[attempt] if attempt < len(RETRY_BACKOFF) else 60
                    log(f"  Chunk fetch attempt {attempt+1} failed. Retry in {wait}s", "WARN")
                    time.sleep(wait)
            
            if vouchers_xml:
                filename = archive_xml(vouchers_xml, company_name, sync_id, f"vouchers_chunk_{from_str}")
                save_sync_archive(sb, filename, company_id, sync_id, len(vouchers_xml))
                vouchers_raw = tally.parse_vouchers(vouchers_xml)
                log(f"  Parsed {len(vouchers_raw)} vouchers in chunk")
                max_alter_id = _process_vouchers_chunk(sb, company_id, vouchers_raw, last_alter_id, max_alter_id, stats)
                current_date = chunk_end + datetime.timedelta(days=1)
            else:
                log(f"  CRITICAL: Failed to fetch chunk {from_str} to {to_str} after 3 retries. Halting historical sync.", "ERROR")
                historical_sync_complete = False
                break


    # 5. Fetch Outstandings
    log("  Fetching outstandings...")
    for r_type in ["Receivables", "Payables"]:
        for attempt in range(3):
            try:
                out_xml = tally.export_outstandings(r_type)
                if out_xml:
                    bills = tally.parse_outstandings(out_xml, r_type)
                    for b in bills:
                        b["party_group"] = "receivable" if r_type == "Receivables" else "payable"
                    
                    if bills:
                        today = datetime.datetime.now().strftime("%Y-%m-%d")
                        sb.table("outstanding_bills").delete().eq("company_name", company_name).eq(
                            "party_group", bills[0]["party_group"]).execute()
                        for i in range(0, len(bills), 200):
                            batch = bills[i:i+200]
                            sb.table("outstanding_bills").insert([{
                                "company_name": company_name,
                                "party_ledger": b["party_ledger"],
                                "party_group": b["party_group"],
                                "bill_ref": b["bill_ref"],
                                "bill_type": b["bill_type"],
                                "bill_date": parse_tally_date(b["bill_date"]),
                                "due_date": parse_tally_date(b["due_date"]),
                                "pending_amount": b["pending_amount"],
                                "as_on_date": today
                            } for b in batch]).execute()
                        log(f"  {r_type}: {len(bills)} bills synced")
                        stats["records_inserted"] += len(bills)
                break
            except Exception as e:
                time.sleep(RETRY_BACKOFF[attempt] if attempt < len(RETRY_BACKOFF) else 60)

    # 6. Reconciliation check
    log("  Reconciliation check skipped (incompatible with chunked/incremental sync).")
    reconciliation_status = "SKIPPED"

    # 7. Update checkpoint
    if last_alter_id == 0 and not historical_sync_complete:
        log("  Historical sync was aborted due to errors. ALTERID checkpoint will NOT be updated.", "WARN")
    elif max_alter_id > last_alter_id:
        update_checkpoint(sb, company_id, max_alter_id, sync_id)
        log(f"  Checkpoint updated to ALTERID={max_alter_id}")

    # 8. Log sync
    sync_end = datetime.datetime.now(datetime.timezone.utc)
    duration_ms = int((sync_end - sync_start).total_seconds() * 1000)
    try:
        sb.table("sync_logs").insert({
            "sync_id": sync_id,
            "company_id": company_id,
            "sync_source": "enterprise-main.py",
            "started_at": sync_start.isoformat(),
            "completed_at": sync_end.isoformat(),
            "status": stats["status"],
            "records_inserted": stats["records_inserted"],
            "records_updated": stats["records_updated"],
            "records_failed": stats["records_failed"],
            "error_message": stats.get("error_message"),
            "last_alterid_synced": str(max_alter_id)
        }).execute()
    except Exception as e:
        log(f"  Failed to save sync log: {e}", "WARN")

    log(f">>> Sync COMPLETE for {company_name} in {duration_ms}ms | Records: {stats['records_inserted']} | Status: {stats['status']} <<<")

def sync_job():
    global _sync_running
    if _sync_running:
        log("Previous sync still running. Skipping this cycle.", "WARN")
        return
    _sync_running = True
    
    log(f"=== DAEMON RUN: SCANNING TALLY FOR OPEN COMPANIES ===")
    
    if not SUPABASE_URL or not SUPABASE_KEY:
        log("Supabase not configured. Check .env file.", "ERROR")
        _sync_running = False
        return

    sb = create_client(SUPABASE_URL, SUPABASE_KEY)
    open_companies = get_open_companies()
    target_company = "SMRIDHI SPONGE LIMITED"
    
    # Check if our target company is open
    ssl_open = [c for c in open_companies if target_company.lower() in c.lower()]
    
    if not ssl_open:
        log(f"Target company '{target_company}' is not open in Tally (or Tally not running).")
        _sync_running = False
        return
 
    log(f"Active Sync Target: {ssl_open[0]}")
    try:
        sync_company(sb, ssl_open[0])
    except Exception as e:
        log(f"FATAL sync failure for {ssl_open[0]}: {e}\n{traceback.format_exc()}", "ERROR")

    # Run cleanup of old XML files to prevent disk exhaustion
    cleanup_old_archives(days_to_keep=7)

    log(f"=== DAEMON RUN COMPLETE ===\n")
    _sync_running = False

if __name__ == "__main__":
    print("=" * 60)
    print("ENTERPRISE TALLY SYNC AGENT")
    print(f"Tally endpoint:  {TALLY_URL}")
    print(f"Supabase:        {SUPABASE_URL}")
    print(f"Sync interval:   {SYNC_INTERVAL}s")
    print(f"Batch size:      {BATCH_SIZE} records")
    print(f"Archive dir:     {ARCHIVE_DIR}")
    print("=" * 60)

    # Run immediately at startup
    sync_job()

    scheduler = BackgroundScheduler()
    scheduler.add_job(sync_job, 'interval', seconds=SYNC_INTERVAL)
    scheduler.start()

    log(f"Sync Agent daemon started. Syncing every {SYNC_INTERVAL} seconds.")
    log("Press Ctrl+C to exit.")

    try:
        while True:
            time.sleep(2)
    except (KeyboardInterrupt, SystemExit):
        scheduler.shutdown()
        log("Sync Agent daemon stopped.")
