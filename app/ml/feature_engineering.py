import pandas as pd
import numpy as np

def build_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    # Time-based features
    df["hour"] = df["timestamp"].dt.hour
    df["day_of_week"] = df["timestamp"].dt.dayofweek
    df["is_weekend"] = df["day_of_week"].isin([5, 6]).astype(int)

    # Amount transforms
    df["log_amount"] = df["amount"].apply(lambda x: 0 if x <= 0 else np.log(x))

    # Simple aggregations (baseline behavior)
    df["dept_avg_amount"] = df.groupby("department")["amount"].transform("mean")
    df["vendor_txn_count"] = df.groupby("vendor")["transaction_id"].transform("count")

    feature_cols = [
        "amount",
        "log_amount",
        "hour",
        "day_of_week",
        "is_weekend",
        "dept_avg_amount",
        "vendor_txn_count"
    ]

    return df[feature_cols]
