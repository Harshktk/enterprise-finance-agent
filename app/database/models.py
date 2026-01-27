from sqlalchemy import Column, String, Float, DateTime, Integer
from datetime import datetime
from app.database.session import Base

class Transaction(Base):
    __tablename__ = "transactions"

    transaction_id = Column(String, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    amount = Column(Float, nullable=False)
    category = Column(String)
    vendor = Column(String)
    department = Column(String)
    payment_method = Column(String)

    # NEW
    anomaly_score = Column(Float, nullable=True)
    is_anomaly = Column(Integer, nullable=True)
