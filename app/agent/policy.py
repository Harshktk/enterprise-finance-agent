def decide_action(risk_level: str, anomaly_score: float):
    """
    Anomaly scores are negative — more negative = more anomalous.
    High risk OR score below -0.10 threshold → BLOCK.
    """
    if risk_level == "High" or anomaly_score < -0.10:
        return "BLOCK_AND_ALERT"
    if risk_level == "Medium":
        return "REVIEW_REQUIRED"
    return "AUTO_APPROVE"

def apply_policy(risk_level: str) -> str:
    if risk_level == "High":
        return "FLAG_AND_ALERT"
    elif risk_level == "Medium":
        return "REVIEW_REQUIRED"
    else:
        return "LOG_ONLY"
