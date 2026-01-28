def feedback_summary(decisions):
    return {
        "total": len(decisions),
        "false_positives": sum(d.feedback == "false_positive" for d in decisions),
        "missed": sum(d.feedback == "missed" for d in decisions),
        "correct": sum(d.feedback == "correct" for d in decisions),
    }
