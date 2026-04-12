import pandas as pd
import shap
from sklearn.ensemble import IsolationForest
from app.ml.feature_engineering import build_features

class AnomalyDetector:
    def __init__(self):
        self.model = IsolationForest(
            n_estimators=100,
            contamination=0.15,  # 15% — spreads scores wider, extreme anomalies hit High clearly
            random_state=42
        )
        self.explainer = None
        self.feature_names = None
        self.feature_df = None
        self.original_df = None
        self.is_trained = False

    def train(self, df: pd.DataFrame):
        features = build_features(df)
        self.feature_names = features.columns.tolist()
        self.feature_df = features
        self.original_df = df.copy()
        self.model.fit(features)
        self.explainer = shap.TreeExplainer(self.model)
        self.is_trained = True

    def score(self, df: pd.DataFrame) -> pd.DataFrame:
        if not self.is_trained:
            raise RuntimeError("Model not trained")
        features = build_features(df)
        scores = self.model.decision_function(features)
        anomalies = self.model.predict(features)
        df = df.copy()
        df["anomaly_score"] = scores
        df["is_anomaly"] = (anomalies == -1).astype(int)
        return df

    def explain(self, df: pd.DataFrame, transaction_id: str) -> dict:
        if not self.is_trained:
            raise RuntimeError("Model not trained")
        features = build_features(df)
        row = df[df["transaction_id"] == transaction_id]
        if row.empty:
            raise ValueError("Transaction not found")
        X = features.loc[row.index]
        shap_values = self.explainer.shap_values(X)[0]
        return {
            feature: float(value)
            for feature, value in zip(self.feature_names, shap_values)
        }
