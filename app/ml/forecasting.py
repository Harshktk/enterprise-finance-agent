import pandas as pd
from statsmodels.tsa.arima.model import ARIMA

def prepare_time_series(df, department):
    if df.empty or "department" not in df.columns:
        return None

    dept_df = df[df["department"] == department].copy()

    if dept_df.empty:
        return None

    dept_df["timestamp"] = pd.to_datetime(dept_df["timestamp"])
    return dept_df.set_index("timestamp")["amount"]



def forecast_spend(series, days):
    # Ensure time series is sorted and daily
    series = (
        series
        .sort_index()
        .resample("D")
        .sum()
    )

    # Fallback for insufficient data
    if len(series) < 3:
        last_value = float(series.iloc[-1])
        return {i + 1: last_value for i in range(days)}

    # Convert explicitly to 1D float array
    values = series.values.astype(float)

    model = ARIMA(values, order=(1, 1, 1))
    fitted = model.fit()

    forecast = fitted.forecast(steps=days)

    return {i + 1: float(v) for i, v in enumerate(forecast)}

