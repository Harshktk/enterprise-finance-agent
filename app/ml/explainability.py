import shap
import pandas as pd

def get_shap_for_transaction(transaction_id: str, model, df: pd.DataFrame):
    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(df)

    row = df[df["transaction_id"] == transaction_id].index[0]

    contributions = {
        df.columns[i]: float(shap_values[row][i])
        for i in range(len(df.columns))
        if df.columns[i] not in ["transaction_id"]
    }

    return contributions
