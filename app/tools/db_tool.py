import pandas as pd
from sqlalchemy.orm import Session
from app.database.models import Transaction

def fetch_transactions(db: Session) -> pd.DataFrame:
    records = db.query(Transaction).all()

    data = [
        {
            "transaction_id": r.transaction_id,
            "timestamp": r.timestamp,
            "amount": r.amount,
            "category": r.category,
            "vendor": r.vendor,
            "department": r.department,
            "payment_method": r.payment_method
        }
        for r in records
    ]

    return pd.DataFrame(data)
