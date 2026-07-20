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
        if not ledgers:
            return {"status": "success", "processed": 0}
            
        data_list = []
        for ledger in ledgers:
            data = ledger.model_dump()
            data["company_id"] = company_id
            data_list.append(data)
            
        supabase.table("ledgers").upsert(
            data_list, 
            on_conflict="tally_guid"
        ).execute()
        
        return {"status": "success", "processed": len(ledgers)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/sync/vouchers")
def sync_vouchers(vouchers: List[VoucherSync], company_id: str, supabase: Client = Depends(get_supabase)):
    try:
        if not vouchers:
            return {"status": "success", "processed": 0}
            
        voucher_data_list = []
        for voucher in vouchers:
            voucher_data = voucher.model_dump(exclude={"ledgers", "inventory"})
            voucher_data["company_id"] = company_id
            voucher_data_list.append(voucher_data)
            
        v_res = supabase.table("vouchers").upsert(
            voucher_data_list,
            on_conflict="tally_guid"
        ).execute()
        
        if v_res.data:
            guid_to_id = {row["tally_guid"]: row["id"] for row in v_res.data if row.get("tally_guid")}
            voucher_ids = list(guid_to_id.values())
            
            if voucher_ids:
                supabase.table("voucher_ledgers").delete().in_("voucher_id", voucher_ids).execute()
                supabase.table("voucher_inventory").delete().in_("voucher_id", voucher_ids).execute()
                
            ledger_entries = []
            inv_entries = []
            
            for voucher in vouchers:
                v_db_id = guid_to_id.get(voucher.tally_guid)
                if not v_db_id:
                    continue
                    
                if voucher.ledgers:
                    for l in voucher.ledgers:
                        ledger_entries.append({**l.model_dump(), "voucher_id": v_db_id})
                        
                if voucher.inventory:
                    for i in voucher.inventory:
                        inv_entries.append({**i.model_dump(), "voucher_id": v_db_id})
                        
            BATCH_SIZE = 1000
            for i in range(0, len(ledger_entries), BATCH_SIZE):
                supabase.table("voucher_ledgers").insert(ledger_entries[i:i+BATCH_SIZE]).execute()
            for i in range(0, len(inv_entries), BATCH_SIZE):
                supabase.table("voucher_inventory").insert(inv_entries[i:i+BATCH_SIZE]).execute()
                
        return {"status": "success", "processed": len(vouchers)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/sync/godowns")
def sync_godowns(godowns: List[GodownSync], company_id: str, supabase: Client = Depends(get_supabase)):
    try:
        if not godowns:
            return {"status": "success", "processed": 0}
            
        data_list = []
        for godown in godowns:
            data = godown.model_dump()
            data["company_id"] = company_id
            data_list.append(data)
            
        supabase.table("godowns").upsert(
            data_list,
            on_conflict="tally_guid"
        ).execute()
            
        return {"status": "success", "processed": len(godowns)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/sync/cost_centres")
def sync_cost_centres(cost_centres: List[CostCentreSync], company_id: str, supabase: Client = Depends(get_supabase)):
    try:
        if not cost_centres:
            return {"status": "success", "processed": 0}
            
        data_list = []
        for cc in cost_centres:
            data = cc.model_dump()
            data["company_id"] = company_id
            data_list.append(data)
            
        supabase.table("cost_centres").upsert(
            data_list,
            on_conflict="tally_guid"
        ).execute()
            
        return {"status": "success", "processed": len(cost_centres)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/sync/edit_log")
def sync_edit_log(edit_logs: List[EditLogSync], company_id: str, supabase: Client = Depends(get_supabase)):
    try:
        entries = []
        for log in edit_logs:
            data = log.model_dump()
            data["company_id"] = company_id
            entries.append(data)
            
        if entries:
            BATCH_SIZE = 1000
            for i in range(0, len(entries), BATCH_SIZE):
                supabase.table("edit_log_entries").insert(entries[i:i+BATCH_SIZE]).execute()
            
        return {"status": "success", "processed": len(edit_logs)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
