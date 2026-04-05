import requests
import random
from datetime import datetime, timedelta
import json

API_URL = "https://enterprise-finance-agent.onrender.com"

VENDORS = {
    "Office Supplies":  ["Staples Inc", "Office Depot", "Amazon Business", "Quill Corporation"],
    "Software License": ["Adobe Systems", "Microsoft Corporation", "Salesforce", "Oracle", "SAP"],
    "Travel":           ["Delta Airlines", "United Airlines", "Marriott Hotels", "Hilton Hotels"],
    "Meals":            ["Restaurant XYZ", "Catering Co", "Coffee Shop Inc", "Conference Center Dining"],
    "Training":         ["Udemy Business", "Coursera", "LinkedIn Learning"],
    "Equipment":        ["Dell Technologies", "HP Enterprise", "Lenovo", "Tech Supply Co"],
    "Consulting":       ["Accenture", "Deloitte", "McKinsey & Company", "Strategy Partners"],
    "Marketing":        ["Google Ads", "Meta Business", "Marketing Agency Inc"],
    "Utilities":        ["Electric Company", "Internet Provider", "Phone Service Inc"],
    "Maintenance":      ["Facility Services", "Cleaning Co", "HVAC Specialists"],
}

# Clearly suspicious vendors — model will learn these as anomalous
SUSPICIOUS_VENDORS = [
    "Offshore Consulting Ltd",
    "Unknown Tech Supply",
    "Shell Company Inc",
    "Questionable Services LLC",
    "Sketchy Supplier Co",
    "Unregistered Vendor",
    "Anonymous Consulting",
    "Shadow Finance Ltd",
    "Phantom Services Inc",
    "Unnamed Contractor",
]

DEPARTMENTS  = ["Operations", "IT", "Sales", "Finance", "Marketing", "HR", "Engineering", "Legal"]
PAYMENT_METHODS = ["corporate_card", "wire_transfer", "check", "ach_transfer"]

AMOUNT_RANGES = {
    "Office Supplies":  (50,    2000),
    "Software License": (500,   30000),
    "Travel":           (200,   3000),
    "Meals":            (20,    500),
    "Training":         (100,   2000),
    "Equipment":        (500,   15000),
    "Consulting":       (2000,  50000),
    "Marketing":        (500,   20000),
    "Utilities":        (100,   5000),
    "Maintenance":      (200,   3000),
}

def rand(arr):  return arr[random.randint(0, len(arr) - 1)]
def jitter(dt): return dt + timedelta(minutes=random.randint(0, 59))


# ── Normal transaction ─────────────────────────────────────────────────────
def normal(i, base):
    cat    = rand(list(VENDORS.keys()))
    lo, hi = AMOUNT_RANGES[cat]
    amount = round(random.uniform(lo, hi), 2)
    ts     = base + timedelta(hours=random.randint(0, 20 * 24))
    ts     = jitter(ts.replace(hour=random.randint(8, 17)))        # business hours
    if ts.weekday() >= 5:                                          # push weekend to Monday
        ts += timedelta(days=7 - ts.weekday())
    return {
        "transaction_id": f"TXN{str(i).zfill(4)}",
        "timestamp":      ts.isoformat(),
        "amount":         amount,
        "category":       cat,
        "vendor":         rand(VENDORS[cat]),
        "department":     rand(DEPARTMENTS),
        "payment_method": "corporate_card" if amount < 10000 else rand(["wire_transfer", "ach_transfer"]),
    }


# ── HIGH-RISK anomalies (guaranteed to score anomalous) ───────────────────
def high_risk(i, base):
    """Extreme amounts + suspicious vendors + odd hours — clearly anomalous."""
    cat    = rand(list(VENDORS.keys()))
    ts     = base + timedelta(hours=random.randint(0, 20 * 24))
    ts     = jitter(ts.replace(hour=rand([0, 1, 2, 3, 22, 23])))  # midnight / 3 AM
    return {
        "transaction_id": f"TXN{str(i).zfill(4)}",
        "timestamp":      ts.isoformat(),
        "amount":         round(random.uniform(180000, 450000), 2),  # $180k–$450k
        "category":       cat,
        "vendor":         rand(SUSPICIOUS_VENDORS),
        "department":     rand(DEPARTMENTS),
        "payment_method": rand(["wire_transfer", "check"]),
    }


# ── MEDIUM-RISK anomalies ─────────────────────────────────────────────────
def medium_risk(i, base):
    """Elevated amounts in low-spend categories at odd hours."""
    cat = rand(["Office Supplies", "Meals", "Maintenance", "Training"])
    ts  = base + timedelta(hours=random.randint(0, 20 * 24))
    ts  = jitter(ts.replace(hour=rand([5, 6, 20, 21])))            # early morning / evening
    return {
        "transaction_id": f"TXN{str(i).zfill(4)}",
        "timestamp":      ts.isoformat(),
        "amount":         round(random.uniform(60000, 175000), 2),  # $60k–$175k
        "category":       cat,
        "vendor":         rand(VENDORS[cat]),
        "department":     rand(DEPARTMENTS),
        "payment_method": rand(["wire_transfer", "check"]),
    }


# ── Weekend large ─────────────────────────────────────────────────────────
def weekend_large(i, base):
    ts = base + timedelta(days=random.randint(0, 60))
    while ts.weekday() < 5:
        ts += timedelta(days=1)
    ts = jitter(ts.replace(hour=random.randint(0, 23)))
    cat = rand(list(VENDORS.keys()))
    return {
        "transaction_id": f"TXN{str(i).zfill(4)}",
        "timestamp":      ts.isoformat(),
        "amount":         round(random.uniform(80000, 200000), 2),
        "category":       cat,
        "vendor":         rand(SUSPICIOUS_VENDORS),
        "department":     rand(DEPARTMENTS),
        "payment_method": "wire_transfer",
    }


def generate(count=1000):
    base   = datetime(2024, 1, 1, 9, 0, 0)
    txns   = []

    # Distribution: 75% normal, 10% high-risk, 8% medium-risk, 7% weekend-large
    n_normal  = int(count * 0.75)
    n_high    = int(count * 0.10)
    n_medium  = int(count * 0.08)
    n_weekend = count - n_normal - n_high - n_medium

    print(f"Generating {n_normal} normal, {n_high} high-risk, {n_medium} medium-risk, {n_weekend} weekend-large...")

    idx = 1
    for _ in range(n_normal):  txns.append(normal(idx, base));  idx += 1
    for _ in range(n_high):    txns.append(high_risk(idx, base)); idx += 1
    for _ in range(n_medium):  txns.append(medium_risk(idx, base)); idx += 1
    for _ in range(n_weekend): txns.append(weekend_large(idx, base)); idx += 1

    random.shuffle(txns)
    return txns


def clear_and_reingest(transactions):
    print(f"\nIngesting {len(transactions)} transactions to {API_URL}...")
    ok = fail = dupe = 0

    for i, txn in enumerate(transactions):
        try:
            r = requests.post(f"{API_URL}/transactions/ingest", json=txn, timeout=15)
            if r.status_code in (200, 201): ok += 1
            elif r.status_code == 409:      dupe += 1
            else:                           fail += 1; print(f"  FAIL {txn['transaction_id']}: {r.text}")
        except Exception as e:
            fail += 1; print(f"  ERR  {txn['transaction_id']}: {e}")

        if (i + 1) % 100 == 0:
            print(f"  Progress: {i+1}/{len(transactions)}")

    print(f"\n✓ Ingested: {ok}  |  Dupes skipped: {dupe}  |  Failed: {fail}")
    return ok


if __name__ == "__main__":
    print("=" * 60)
    print("Finance Agent — Transaction Generator (1000 txns)")
    print("=" * 60)

    print("""
IMPORTANT — clear existing data first.
Run this SQL on your Render PostgreSQL before proceeding:

  TRUNCATE TABLE agent_decisions;
  TRUNCATE TABLE transactions;

You can do this via:
  Render → your PostgreSQL → Shell tab → paste the commands above

Press ENTER when done, or Ctrl+C to cancel.
""")
    input()

    txns = generate(1000)

    with open("transactions_backup.json", "w") as f:
        json.dump(txns, f, indent=2)
    print("Backup saved to transactions_backup.json")

    ok = clear_and_reingest(txns)

    print("\n" + "=" * 60)
    print(f"Done. {ok} transactions in database.")
    print("""
Next steps:
  1. ML Pipeline → Train
  2. ML Pipeline → Score
  3. Agent Decisions → Run Auto-Monitor
  4. Check Overview — you should see High / Medium / Blocked counts
""")
    print("=" * 60)
