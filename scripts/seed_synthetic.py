#!/usr/bin/env python3
"""
Synthetic seed data for the Pharmaceutical Supply Chain Agentic AI.

Generates drugs, multi-branch inventory, and 365 days of per-branch sales
history directly into MongoDB — no CSV/XLSX files needed. Unlike the original
load_datasets.py (single MAIN_BRANCH, 100 days), this creates several branches
with deliberate surplus/deficit imbalances so the inventory-matching, routing,
and monitoring agents actually have transfers/alerts to produce, and a year of
seasonal sales so Prophet/LSTM forecasting has real signal.

Schema matches exactly what utils/database.py and the agents query:
  drugs          : id, name, generic_name, manufacturer, price, ...
  inventory      : drug_id, drug_name, branch_id, current_stock,
                   optimal_stock, safe_stock, demand_forecast, ...
  sales_history  : drug_id, drug_name, branch_id, quantity, date, ...

Usage:
  MONGODB_URL=... DATABASE_NAME=pharma_supply_chain python scripts/seed_synthetic.py
"""

import os
import math
import random
from datetime import datetime, timedelta

from pymongo import MongoClient

SEED = 42
DAYS = 365

# (name, generic, manufacturer, disease_category, unit_price, rx_required, monthly_demand_base)
DRUGS = [
    ("Amoxicillin 500mg", "Amoxicillin", "Cipla", "Bacterial Infection", 4.50, True, 9000),
    ("Metformin 850mg", "Metformin HCl", "Sun Pharma", "Type 2 Diabetes", 3.20, True, 12000),
    ("Atorvastatin 20mg", "Atorvastatin", "Pfizer", "Hypercholesterolemia", 6.80, True, 7000),
    ("Amlodipine 5mg", "Amlodipine Besylate", "Novartis", "Hypertension", 2.90, True, 10000),
    ("Omeprazole 20mg", "Omeprazole", "Dr. Reddy's", "Acid Reflux", 5.10, False, 8000),
    ("Salbutamol Inhaler", "Salbutamol Sulfate", "GSK", "Asthma", 12.40, True, 4000),
    ("Paracetamol 500mg", "Acetaminophen", "Tehran Darou", "Pain / Fever", 1.20, False, 20000),
    ("Ibuprofen 400mg", "Ibuprofen", "Abidi", "Inflammation", 1.80, False, 15000),
    ("Losartan 50mg", "Losartan Potassium", "Merck", "Hypertension", 5.60, True, 6500),
    ("Insulin Glargine", "Insulin Glargine", "Sanofi", "Diabetes", 38.00, True, 2500),
    ("Ciprofloxacin 500mg", "Ciprofloxacin", "Bayer", "Bacterial Infection", 7.30, True, 5000),
    ("Levothyroxine 100mcg", "Levothyroxine Sodium", "Aspen", "Hypothyroidism", 4.10, True, 5500),
]

# (branch_id, name, city, lat, lon, demand_multiplier)
BRANCHES = [
    ("BR-TEHRAN-01", "Tehran Central Depot", "Tehran", 35.6892, 51.3890, 1.6),
    ("BR-TABRIZ-01", "Tabriz Regional", "Tabriz", 38.0800, 46.2919, 0.8),
    ("BR-MASHHAD-01", "Mashhad East Hub", "Mashhad", 36.2605, 59.6168, 1.1),
    ("BR-ISFAHAN-01", "Isfahan Distribution", "Isfahan", 32.6539, 51.6660, 0.9),
    ("BR-SHIRAZ-01", "Shiraz South", "Shiraz", 29.5918, 52.5837, 0.7),
]


def drug_id_of(name: str) -> str:
    return name.lower().replace(" ", "_")


def build_drugs() -> list[dict]:
    now = datetime.utcnow()
    out = []
    for name, generic, mfr, disease, price, rx, _ in DRUGS:
        out.append({
            "id": drug_id_of(name),
            "name": name,
            "generic_name": generic,
            "manufacturer": mfr,
            "manufacturer_origin": "Various",
            "price": price,
            "prescription_required": rx,
            "drug_content": name.split(" ", 1)[-1],
            "disease_category": disease,
            "img_urls": "",
            "created_at": now,
            "updated_at": now,
        })
    return out


def build_inventory(rng: random.Random) -> list[dict]:
    """One record per drug x branch, with intentional surplus/deficit spread."""
    now = datetime.utcnow()
    out = []
    for name, _, _, _, _, _, monthly_base in DRUGS:
        did = drug_id_of(name)
        # Pre-pick which branches are over/understocked so matching has work.
        branch_states = ["surplus", "deficit", "normal", "normal", "low"]
        rng.shuffle(branch_states)
        for (bid, bname, city, *_rest, mult), state in zip(BRANCHES, branch_states):
            monthly_demand = int(monthly_base * mult / len(BRANCHES))
            optimal = max(60, int(monthly_demand * 1.5))   # ~1.5 months cover
            safe = int(optimal * 0.2)
            if state == "surplus":
                current = int(optimal * rng.uniform(1.55, 1.9))   # well above optimal
            elif state == "deficit":
                current = int(safe * rng.uniform(0.3, 0.8))       # below safety stock
            elif state == "low":
                current = int(safe * rng.uniform(1.0, 1.4))       # near safety stock
            else:
                current = int(optimal * rng.uniform(0.85, 1.15))  # around optimal
            out.append({
                "drug_id": did,
                "drug_name": name,
                "branch_id": bid,
                "branch_name": bname,
                "city": city,
                "current_stock": current,
                "optimal_stock": optimal,
                "safe_stock": safe,
                "demand_forecast": monthly_demand,
                "avg_daily_demand": max(1, round(monthly_demand / 30)),
                "restocking_strategy": rng.choice(["Weekly", "Bi-Weekly", "Monthly"]),
                "lead_time_days": rng.randint(3, 14),
                "unit_cost": round(next(d[4] for d in DRUGS if d[0] == name) * 0.7, 2),
                "last_updated": now,
            })
    return out


def build_sales(rng: random.Random) -> list[dict]:
    """365 days of daily sales per drug x branch with seasonality + weekly cycle + trend."""
    out = []
    base_date = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=DAYS)
    for name, _, _, _, price, _, monthly_base in DRUGS:
        did = drug_id_of(name)
        for (bid, bname, city, *_rest, mult) in BRANCHES:
            daily_base = (monthly_base * mult / len(BRANCHES)) / 30.0
            for i in range(DAYS):
                d = base_date + timedelta(days=i)
                month = d.month
                # Seasonality: respiratory/infection meds peak in winter; mild otherwise.
                seasonal = 1.30 if month in (11, 12, 1, 2) else (0.85 if month in (6, 7, 8) else 1.0)
                weekly = 0.55 if d.weekday() >= 5 else 1.0          # weekends lower
                trend = 1 + (i / DAYS) * 0.12                        # ~12% yearly growth
                noise = rng.gauss(0, daily_base * 0.18)
                qty = max(0, int(daily_base * seasonal * weekly * trend + noise))
                out.append({
                    "drug_id": did,
                    "drug_name": name,
                    "branch_id": bid,
                    "quantity": qty,
                    "date": d,
                    "unit_price": price,
                    "total_amount": round(qty * price, 2),
                })
    return out


def main():
    uri = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    db_name = os.getenv("DATABASE_NAME", "pharma_supply_chain")
    rng = random.Random(SEED)

    print(f"Connecting to {db_name} ...")
    client = MongoClient(uri, serverSelectionTimeoutMS=20000)
    client.admin.command("ping")
    db = client[db_name]
    print("Connected.")

    print("Clearing existing collections (drugs, inventory, sales_history) ...")
    db.drugs.drop()
    db.inventory.drop()
    db.sales_history.drop()

    drugs = build_drugs()
    inventory = build_inventory(rng)
    sales = build_sales(rng)

    db.drugs.insert_many(drugs)
    db.inventory.insert_many(inventory)
    # batch the large sales insert
    for k in range(0, len(sales), 5000):
        db.sales_history.insert_many(sales[k:k + 5000])

    print("Creating indexes ...")
    db.sales_history.create_index([("drug_id", 1), ("branch_id", 1), ("date", -1)])
    db.sales_history.create_index([("branch_id", 1), ("date", -1)])
    db.inventory.create_index([("drug_id", 1), ("branch_id", 1)])
    db.drugs.create_index([("id", 1)])
    db.drugs.create_index([("name", 1)])

    print("\n=== Seed complete ===")
    print(f"  drugs:         {db.drugs.count_documents({})}")
    print(f"  inventory:     {db.inventory.count_documents({})}")
    print(f"  sales_history: {db.sales_history.count_documents({})}")
    print("\nSample drug_ids for the API (item_id):")
    for d in drugs[:5]:
        print(f"  {d['id']}")
    print("\nBranch ids (entity_id / depot_id / destinations):")
    for b in BRANCHES:
        print(f"  {b[0]}  ({b[2]})")
    client.close()


if __name__ == "__main__":
    main()
