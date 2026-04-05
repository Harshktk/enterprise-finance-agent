def map_risk_level(anomaly_score: float) -> str:
    """
    IsolationForest decision_function returns negative scores for anomalies.
    More negative = more anomalous = higher risk.

    Typical ranges:
      Normal:          0.05  to  0.15  (positive)
      Mild anomaly:   -0.01  to -0.05
      Medium anomaly: -0.05  to -0.10
      High anomaly:   -0.10  and below
    """
    if anomaly_score < -0.10:
        return "High"
    elif anomaly_score < -0.05:
        return "Medium"
    else:
        return "Low"
