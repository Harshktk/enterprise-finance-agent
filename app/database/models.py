from sqlalchemy import Column, String, Float, DateTime, Integer, JSON, Text
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

class AgentDecision(Base):
    __tablename__ = "agent_decisions"

    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(String, index=True)
    risk_level = Column(String)
    summary = Column(Text)
    action_taken = Column(String)
    policy_action = Column(String)
    signals = Column(JSON)
    recommended_action = Column(String)
    model_version = Column(String)
    policy_version = Column(String)
    llm_model = Column(String)
    feedback = Column(String)        # correct | false_positive | missed
    feedback_notes = Column(Text)
    feedback_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    