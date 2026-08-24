#!/usr/bin/env python3
"""
validate_data.py — Sanity-check bubble-dashboard data files before committing.

Compares the working copy against the last committed version (via `git show HEAD:<path>`)
and flags any indicator whose value jumped more than a sane threshold. This won't catch
every mistake, but it catches the kind of error that already happened once in this project
(pasting in a stale AAII reading from months earlier).

Usage:
    python3 validate_data.py data/bubble-data-us.json
    python3 validate_data.py data/bubble-data-th.json
    python3 validate_data.py           # checks both

Exit code is 0 even on warnings (this is advisory, not a hard gate) — read the output
before you commit.
"""
import json
import subprocess
import sys

# Max sane month-over-month % change per indicator key. Tune these as you learn what's
# normal — VIX can legitimately double in a crisis week, CAPE almost never moves >10% in
# a month outside a crash.
MAX_PCT_CHANGE = {
    "cape": 15,
    "yieldCurve": 200,       # can flip sign near zero, % change is not meaningful there
    "vix": 80,
    "marginDebt": 40,
    "sentiment": 500,        # spread can flip sign easily, % change not very meaningful
    "setPE": 15,
    "foreignFlow": 1000,
    "creditBalance": 60,
    "retailShare": 40,
}

DEFAULT_FILES = ["data/bubble-data-us.json", "data/bubble-data-th.json"]


def get_previous_version(path):
    try:
        result = subprocess.run(
            ["git", "show", f"HEAD:{path}"],
            capture_output=True, text=True, check=True,
        )
        return json.loads(result.stdout)
    except Exception:
        return None  # no previous commit to compare against — that's fine


def check_file(path):
    print(f"\n--- {path} ---")
    with open(path) as f:
        current = json.load(f)

    previous = get_previous_version(path)
    if previous is None:
        print("  (no committed previous version to compare against — skipping diff check)")
        return

    warnings = []
    for key, ind in current.get("indicators", {}).items():
        prev_ind = previous.get("indicators", {}).get(key)
        if not prev_ind:
            continue
        old_val, new_val = prev_ind.get("value"), ind.get("value")
        if old_val is None or new_val is None or old_val == 0:
            continue
        pct_change = abs((new_val - old_val) / old_val) * 100
        limit = MAX_PCT_CHANGE.get(key, 50)
        if pct_change > limit:
            warnings.append(
                f"  ⚠ {ind.get('label', key)}: {old_val} → {new_val} "
                f"({pct_change:.0f}% change, limit {limit}%) — double-check this isn't a typo "
                f"or a stale/wrong-period figure"
            )
        # flag if asOf date didn't change but value did (possible stale copy-paste elsewhere)
        if old_val != new_val and ind.get("asOf") == prev_ind.get("asOf"):
            warnings.append(
                f"  ⚠ {ind.get('label', key)}: value changed but 'asOf' date is identical "
                f"to the previous commit — did you forget to update the source date?"
            )

    if warnings:
        print("\n".join(warnings))
    else:
        print("  ✓ no suspicious jumps detected")


if __name__ == "__main__":
    files = sys.argv[1:] if len(sys.argv) > 1 else DEFAULT_FILES
    for f in files:
        try:
            check_file(f)
        except FileNotFoundError:
            print(f"\n--- {f} ---\n  (file not found, skipping)")
    print("\nDone. This is advisory only — review warnings, then commit if they're expected.")
