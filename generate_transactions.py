import requests
import random
from datetime import datetime, timedelta
import json

API_URL = "http://localhost:8000"

# Realistic vendor data
VENDORS = {
    "Office Supplies": ["Staples Inc", "Office Depot", "Amazon Business", "Quill Corporation"],
    "Software License": ["Adobe Systems", "Microsoft Corporation", "Salesforce", "Oracle", "SAP"],
    "Travel": ["Delta Airlines", "United Airlines", "Marriott Hotels", "Hilton Hotels", "Enterprise Rent-a-Car"],
    "Meals": ["Restaurant XYZ", "Catering Co", "Coffee Shop Inc", "Lunch Spot", "Conference Center Dining"],
    "Training": ["Udemy Business", "Coursera", "LinkedIn Learning", "Training Vendor Inc"],
    "Equipment": ["Dell Technologies", "HP Enterprise", "Lenovo", "Tech Supply Co", "Office Equipment Inc"],
    "Consulting": ["Accenture", "Deloitte", "McKinsey & Company", "Consulting Firm LLC", "Strategy Partners"],
    "Marketing": ["Google Ads", "Facebook Business", "Marketing Agency Inc", "Print Shop Co"],
    "Utilities": ["Electric Company", "Internet Provider", "Phone Service Inc", "Water District"],
    "Maintenance": ["Facility Services", "Cleaning Co", "HVAC Specialists", "Building Maintenance Inc"]
}

# Suspicious vendors for anomalies
SUSPICIOUS_VENDORS = [
    "Suspicious Vendor LLC",
    "Unknown Tech Supply",
    "Offshore Consulting Ltd",
    "Shell Company Inc",
    "Questionable Services",
    "Sketchy Supplier Co"
]

DEPARTMENTS = ["Operations", "IT", "Sales", "Finance", "Marketing", "HR", "Engineering", "Legal"]
PAYMENT_METHODS = ["Corporate Card", "Wire Transfer", "Check", "ACH Transfer"]

def generate_normal_transaction(txn_id, base_date):
    """Generate a normal transaction"""
    category = random.choice(list(VENDORS.keys()))
    vendor = random.choice(VENDORS[category])
    department = random.choice(DEPARTMENTS)
    
    # Normal business hours (8 AM - 6 PM on weekdays)
    hours_offset = random.randint(0, 10 * 24)  # Within 10 days
    business_hour = random.randint(8, 18)
    timestamp = base_date + timedelta(hours=hours_offset, minutes=random.randint(0, 59))
    timestamp = timestamp.replace(hour=business_hour)
    
    # Amount ranges based on category
    amount_ranges = {
        "Office Supplies": (50, 3000),
        "Software License": (500, 50000),
        "Travel": (200, 2500),
        "Meals": (20, 500),
        "Training": (100, 2000),
        "Equipment": (500, 15000),
        "Consulting": (2000, 75000),
        "Marketing": (500, 20000),
        "Utilities": (100, 5000),
        "Maintenance": (200, 3000)
    }
    
    min_amt, max_amt = amount_ranges[category]
    amount = round(random.uniform(min_amt, max_amt), 2)
    
    # Payment method based on amount
    if amount > 10000:
        payment_method = random.choice(["Wire Transfer", "ACH Transfer"])
    else:
        payment_method = random.choice(["Corporate Card", "Check"])
    
    return {
        "transaction_id": txn_id,
        "timestamp": timestamp.isoformat(),
        "amount": amount,
        "category": category,
        "vendor": vendor,
        "department": department,
        "payment_method": payment_method
    }

def generate_anomalous_transaction(txn_id, base_date):
    """Generate an anomalous transaction"""
    anomaly_type = random.choice([
        "high_amount",
        "suspicious_vendor", 
        "odd_time",
        "unusual_category_amount",
        "weekend_large"
    ])
    
    category = random.choice(list(VENDORS.keys()))
    department = random.choice(DEPARTMENTS)
    
    hours_offset = random.randint(0, 10 * 24)
    timestamp = base_date + timedelta(hours=hours_offset)
    
    if anomaly_type == "high_amount":
        # Unusually high amount for category
        amount = round(random.uniform(100000, 250000), 2)
        vendor = random.choice(VENDORS[category])
        timestamp = timestamp.replace(hour=random.randint(9, 17))
        
    elif anomaly_type == "suspicious_vendor":
        # Suspicious vendor name
        amount = round(random.uniform(50000, 150000), 2)
        vendor = random.choice(SUSPICIOUS_VENDORS)
        timestamp = timestamp.replace(hour=random.randint(9, 17))
        
    elif anomaly_type == "odd_time":
        # Transaction at odd hours (late night/early morning)
        amount = round(random.uniform(30000, 100000), 2)
        vendor = random.choice(VENDORS[category])
        timestamp = timestamp.replace(hour=random.choice([0, 1, 2, 3, 22, 23]))
        
    elif anomaly_type == "unusual_category_amount":
        # Small category with huge amount (e.g., $80k in office supplies)
        category = random.choice(["Office Supplies", "Meals", "Maintenance"])
        amount = round(random.uniform(75000, 120000), 2)
        vendor = random.choice(VENDORS[category])
        timestamp = timestamp.replace(hour=random.randint(9, 17))
        
    else:  # weekend_large
        # Large transaction on weekend
        amount = round(random.uniform(60000, 150000), 2)
        vendor = random.choice(VENDORS[category])
        # Make it a weekend
        while timestamp.weekday() < 5:  # 0-4 is Mon-Fri
            timestamp += timedelta(days=1)
        timestamp = timestamp.replace(hour=random.randint(0, 23))
    
    payment_method = random.choice(["Wire Transfer", "Check"])
    
    return {
        "transaction_id": txn_id,
        "timestamp": timestamp.isoformat(),
        "amount": amount,
        "category": category,
        "vendor": vendor,
        "department": department,
        "payment_method": payment_method
    }

def generate_transactions(count=500):
    """Generate a mix of normal and anomalous transactions"""
    transactions = []
    base_date = datetime(2024, 2, 1, 9, 0, 0)
    
    # 90% normal, 10% anomalous (realistic ratio)
    normal_count = int(count * 0.9)
    anomalous_count = count - normal_count
    
    print(f"Generating {normal_count} normal and {anomalous_count} anomalous transactions...")
    
    # Generate normal transactions
    for i in range(normal_count):
        txn_id = f"TXN{str(i+1).zfill(4)}"
        txn = generate_normal_transaction(txn_id, base_date)
        transactions.append(txn)
    
    # Generate anomalous transactions
    for i in range(anomalous_count):
        txn_id = f"TXN{str(normal_count + i + 1).zfill(4)}"
        txn = generate_anomalous_transaction(txn_id, base_date)
        transactions.append(txn)
    
    # Shuffle to mix normal and anomalous
    random.shuffle(transactions)
    
    return transactions

def ingest_transactions(transactions):
    """Send transactions to the API"""
    successful = 0
    failed = 0
    
    print(f"\nIngesting {len(transactions)} transactions to {API_URL}/transactions/ingest...")
    
    for i, txn in enumerate(transactions):
        try:
            response = requests.post(
                f"{API_URL}/transactions/ingest",
                json=txn,
                timeout=10
            )
            
            if response.status_code in [200, 201]:
                successful += 1
            else:
                failed += 1
                print(f"Failed to ingest {txn['transaction_id']}: {response.status_code} - {response.text}")
            
            # Progress indicator
            if (i + 1) % 50 == 0:
                print(f"Progress: {i + 1}/{len(transactions)} transactions processed...")
                
        except Exception as e:
            failed += 1
            print(f"Error ingesting {txn['transaction_id']}: {str(e)}")
    
    print(f"\n✓ Successfully ingested: {successful}")
    print(f"✗ Failed: {failed}")
    return successful, failed

def save_to_file(transactions, filename="transactions_backup.json"):
    """Save transactions to JSON file as backup"""
    with open(filename, 'w') as f:
        json.dump(transactions, f, indent=2)
    print(f"\n💾 Transactions saved to {filename}")

if __name__ == "__main__":
    print("=" * 60)
    print("Transaction Generator & Ingestion Script")
    print("=" * 60)
    
    # Generate transactions
    transactions = generate_transactions(count=500)
    
    # Save backup
    save_to_file(transactions)
    
    # Ingest to API
    successful, failed = ingest_transactions(transactions)
    
    print("\n" + "=" * 60)
    print("Summary:")
    print(f"  Total generated: {len(transactions)}")
    print(f"  Successfully ingested: {successful}")
    print(f"  Failed: {failed}")
    print("=" * 60)
    
    if successful > 0:
        print("\n✓ Ready for next steps:")
        print("  1. POST /ml/train - Train the anomaly detection model")
        print("  2. GET /ml/score - Score all transactions")
        print("  3. POST /agent/investigate/{transaction_id} - Investigate anomalies")
