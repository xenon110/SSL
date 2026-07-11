from pydantic import BaseModel
from typing import List, Optional
from datetime import date

class GodownSync(BaseModel):
    name: str
    parent: Optional[str] = None
    tally_guid: str
    alter_id: Optional[int] = None

class CostCentreSync(BaseModel):
    name: str
    parent: Optional[str] = None
    tally_guid: str
    alter_id: Optional[int] = None

class EditLogSync(BaseModel):
    entity_type: str
    tally_guid: str
    alter_id: int
    action_type: str
    username: Optional[str] = None
    tally_timestamp: Optional[str] = None

class VoucherLedgerSync(BaseModel):
    ledger_name: str
    amount: float
    is_debit: bool

class VoucherInventorySync(BaseModel):
    stock_item_name: str
    billed_qty: float
    actual_qty: Optional[float] = None
    rate: Optional[float] = None
    amount: float
    is_inward: bool

class VoucherSync(BaseModel):
    tally_guid: str
    voucher_type_name: str
    voucher_number: Optional[str] = None
    date: date
    reference: Optional[str] = None
    narration: Optional[str] = None
    party_ledger_name: Optional[str] = None
    amount: float
    is_cancelled: bool = False
    is_optional: bool = False
    is_deleted: bool = False
    alter_id: Optional[int] = None
    ledgers: List[VoucherLedgerSync] = []
    inventory: List[VoucherInventorySync] = []

class LedgerSync(BaseModel):
    name: str
    parent_group: Optional[str] = None
    tally_guid: str
    opening_balance: float = 0.0
    closing_balance: float = 0.0
    is_debit: bool = False
    gstin: Optional[str] = None
    state: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    contact_person: Optional[str] = None
    credit_days: int = 0
    alter_id: Optional[int] = None
