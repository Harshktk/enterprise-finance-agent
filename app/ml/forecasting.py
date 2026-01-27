import pandas as pd
from statsmodels.tsa.arima.model import ARIMA

def prepare_time_series(df: pd.DataFrame, department: str) -> pd.Series:
    dept_df = df[df["department"] == department].copy()

    if dept_df.empty:
        raise ValueError("No data for department")

    dept_df["date"] = dept_df["timestamp"].dt.date

    daily_spend = (
        dept_df.groupby("date")["amount"]
        .sum()
        .sort_index()
    )

    return daily_spend


def forecast_spend(series: pd.Series, days: int = 7):
    model = ARIMA(series, order=(1, 1, 1))
    fitted = model.fit()

    forecast = fitted.forecast(steps=days)

    return forecast
