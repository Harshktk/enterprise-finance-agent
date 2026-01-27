from pydantic import BaseModel
from datetime import datetime

class TransactionIn(BaseModel):
    transaction_id: str
    timestamp: datetime
    amount: float
    category: str
    vendor: str
    department: str
    payment_method: str
