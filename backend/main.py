from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from typing import List
from schemas import VoucherSync, LedgerSync, GodownSync, CostCentreSync, EditLogSync
from database import get_supabase
from supabase import Client

app = FastAPI(title="TallyPrime Financial Dashboard API")

@app.get("/")
def read_root():
    return {"message": "TallyPrime Sync API is running"}

@app.post("/api/v1/sync/ledgers")
def sync_ledgers(ledgers: List[LedgerSync], company_id: str, supabase: Client = Depends(get_supabase)):
    try:
        # Upsert ledgers to Supabase
        # We need to map tally_guid to unique records
        for ledger in ledgers:
            data = ledger.model_dump()
            data["company_id"] = company_id
            
            # Upsert by tally_guid and company_id (Supabase doesn't support complex unique constraints in upsert natively without RPC, 
            # but we can match on tally_guid if it's uniquely defined in the DB).
            # Assuming tally_guid is unique globally in our schema as defined.
            response = supabase.table("ledgers").upsert(
                data, 
                on_conflict="tally_guid"
            ).execute()
        
        return {"status": "success", "processed": len(ledgers)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/sync/vouchers")
def sync_vouchers(vouchers: List[VoucherSync], company_id: str, supabase: Client = Depends(get_supabase)):
    try:
        for voucher in vouchers:
            voucher_data = voucher.model_dump(exclude={"ledgers", "inventory"})
            voucher_data["company_id"] = company_id
            
            # Upsert voucher header
            v_res = supabase.table("vouchers").upsert(
                voucher_data,
                on_conflict="tally_guid"
            ).execute()
            
            if not v_res.data:
                continue
                
            voucher_id = v_res.data[0]["id"]
            
            # Delete existing ledger/inventory entries for this voucher (to replace them)
            supabase.table("voucher_ledgers").delete().eq("voucher_id", voucher_id).execute()
            supabase.table("voucher_inventory").delete().eq("voucher_id", voucher_id).execute()
            
            # Insert ledgers
            if voucher.ledgers:
                ledger_entries = [
                    {**l.model_dump(), "voucher_id": voucher_id} 
                    for l in voucher.ledgers
                ]
                supabase.table("voucher_ledgers").insert(ledger_entries).execute()
                
            # Insert inventory
            if voucher.inventory:
                inv_entries = [
                    {**i.model_dump(), "voucher_id": voucher_id}
                    for i in voucher.inventory
                ]
                supabase.table("voucher_inventory").insert(inv_entries).execute()
                
        return {"status": "success", "processed": len(vouchers)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/sync/godowns")
def sync_godowns(godowns: List[GodownSync], company_id: str, supabase: Client = Depends(get_supabase)):
    try:
        for godown in godowns:
            data = godown.model_dump()
            data["company_id"] = company_id
            
            supabase.table("godowns").upsert(
                data,
                on_conflict="tally_guid"
            ).execute()
            
        return {"status": "success", "processed": len(godowns)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/sync/cost_centres")
def sync_cost_centres(cost_centres: List[CostCentreSync], company_id: str, supabase: Client = Depends(get_supabase)):
    try:
        for cc in cost_centres:
            data = cc.model_dump()
            data["company_id"] = company_id
            
            supabase.table("cost_centres").upsert(
                data,
                on_conflict="tally_guid"
            ).execute()
            
        return {"status": "success", "processed": len(cost_centres)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/sync/edit_log")
def sync_edit_log(edit_logs: List[EditLogSync], company_id: str, supabase: Client = Depends(get_supabase)):
    try:
        # Edit logs shouldn't conflict heavily, but we can match on entity_type + alter_id or tally_guid + alter_id if needed. 
        # For simple inserts:
        entries = []
        for log in edit_logs:
            data = log.model_dump()
            data["company_id"] = company_id
            entries.append(data)
            
        if entries:
            # Note: Depending on scale, batch inserts may be preferred.
            supabase.table("edit_log_entries").insert(entries).execute()
            
        return {"status": "success", "processed": len(edit_logs)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
