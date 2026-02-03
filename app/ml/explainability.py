import shap
import pandas as pd
from app.ml.feature_engineering import build_features

def get_shap_for_transaction(transaction_id: str, model, original_df: pd.DataFrame):
    """
    Get SHAP values for a specific transaction.
    
    Args:
        transaction_id: The transaction ID to explain
        model: The trained IsolationForest model
        original_df: The original dataframe with transaction_id column
    
    Returns:
        Dictionary of feature contributions
    """
    # Find the transaction
    row = original_df[original_df["transaction_id"] == transaction_id]
    
    if row.empty:
        raise ValueError(f"Transaction {transaction_id} not found")
    
    # Build features for this transaction
    features = build_features(row)
    
    # Get SHAP explainer
    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(features)
    
    # Return feature contributions
    contributions = {
        feature: float(shap_values[0][i])
        for i, feature in enumerate(features.columns)
    }
    
    return contributions
