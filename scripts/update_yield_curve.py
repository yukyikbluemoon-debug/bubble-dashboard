#!/usr/bin/env python3
"""
update_yield_curve.py — Pulls the latest 10Y-2Y Treasury spread from FRED's public
CSV export and updates data/bubble-data-us.json in place.

This is the ONE indicator in this project that's safe to fully automate:
- FRED publishes fredgraph.csv without requiring an API key.
- Run server-side (e.g. GitHub Actions), it never hits a browser CORS block —
  CORS only restricts requests made from browser JavaScript, not from a server/runner.
- The other four indicators (CAPE, VIX, Margin Debt, AAII Sentiment) don't have
  comparable no-key public CSV endpoints, so they stay manual — see README.

riskScore is recomputed with the same linear scale used elsewhere in this file
(scaleMin/scaleMid/scaleMax -> 0/50/100), so the gauge and this script never drift apart.
"""
import json
import sys
import urllib.request
from datetime import datetime, timezone

FRED_CSV_URL = "https://fred.stlouisfed.org/graph/fredgraph.csv?id=T10Y2Y"
DATA_PATH = "data/bubble-data-us.json"


def fetch_latest_value():
    with urllib.request.urlopen(FRED_CSV_URL, timeout=15) as resp:
        text = resp.read().decode("utf-8")
    lines = [l.strip() for l in text.strip().splitlines() if l.strip()]
    # CSV format: header row "observation_date,T10Y2Y" then rows; FRED marks missing days as "."
    for line in reversed(lines[1:]):
        date_str, value_str = line.split(",")
        if value_str != ".":
            return date_str, float(value_str)
    raise RuntimeError("No non-missing observations found in FRED CSV")


def compute_risk_score(value, scale_min, scale_mid, scale_max):
    if value <= scale_mid:
        return round((value - scale_min) / (scale_mid - scale_min) * 50)
    return round(50 + (value - scale_mid) / (scale_max - scale_mid) * 50)


def main():
    date_str, value = fetch_latest_value()
    print(f"FRED T10Y2Y latest: {date_str} = {value}")

    with open(DATA_PATH) as f:
        data = json.load(f)

    ind = data["indicators"]["yieldCurve"]
    old_value = ind["value"]
    ind["value"] = value
    ind["asOf"] = date_str
    ind["riskScore"] = compute_risk_score(value, ind["scaleMin"], ind["scaleMid"], ind["scaleMax"])
    ind["history"][-1] = value
    ind["note"] = (
        f"{value}% ณ {date_str} (ดึงอัตโนมัติจาก FRED T10Y2Y) "
        "อยู่กึ่งกลางสเกลถือว่ายังไม่ส่งสัญญาณอันตรายชัดเจน หากติดลบ (inverted) ควรจับตาเป็นพิเศษ"
    )

    data["lastUpdated"] = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    with open(DATA_PATH, "w") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")

    if old_value == value:
        print("Value unchanged — no update needed.")
        sys.exit(0)  # still exit 0; workflow checks git diff to decide whether to commit
    print(f"Updated yieldCurve.value: {old_value} -> {value}")


if __name__ == "__main__":
    main()
