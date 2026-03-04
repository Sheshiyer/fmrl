#!/usr/bin/env python3
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ART = ROOT / "scripts" / "parity" / "artifacts"
REPORT = ART / "parity_report.json"
TREND = ART / "parity_drift_history.json"


def git_sha():
    try:
      return subprocess.check_output(["git", "rev-parse", "--short", "HEAD"], cwd=ROOT, text=True).strip()
    except Exception:
      return "unknown"


def main():
    if not REPORT.exists():
        raise SystemExit("parity report missing")

    report = json.loads(REPORT.read_text())
    history = []
    if TREND.exists():
        history = json.loads(TREND.read_text()).get("history", [])

    history.append({
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "commit": git_sha(),
        "comparedFrames": report.get("comparedFrames", 0),
        "failingFields": report.get("failingFields", 0),
        "approved": report.get("approved", False),
    })

    TREND.write_text(json.dumps({"history": history[-120:]}, indent=2))
    print(f"drift history updated: {TREND}")


if __name__ == "__main__":
    main()
