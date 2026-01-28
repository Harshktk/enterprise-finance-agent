def map_risk_level(anomaly_score: float) -> str:
    if anomaly_score < 0.02:
        return "Low"
    elif anomaly_score < 0.06:
        return "Medium"
    else:
        return "High"
