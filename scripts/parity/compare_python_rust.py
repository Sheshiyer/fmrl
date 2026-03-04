#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ART = ROOT / "scripts" / "parity" / "artifacts"
TOL_PATH = ROOT / "scripts" / "parity" / "tolerances.json"
RUST_PATH = ART / "rust_metrics.json"
PY_PATH = ART / "python_metrics.json"
OUT_PATH = ART / "parity_report.json"


def flatten(prefix, obj, out):
    for k, v in obj.items():
        key = f"{prefix}.{k}" if prefix else k
        if isinstance(v, dict):
            flatten(key, v, out)
        else:
            out[key] = v


def load_outputs(path):
    data = json.loads(path.read_text())
    items = data.get("outputs", data)
    by_id = {}
    for item in items:
        flat = {}
        flatten("", item, flat)
        by_id[item["id"]] = flat
    return by_id


def main():
    tolerances = json.loads(TOL_PATH.read_text())
    rust = load_outputs(RUST_PATH)
    py = load_outputs(PY_PATH)

    failures = []
    compared = 0

    metric_tols = tolerances.get("metrics", {})
    score_tols = tolerances.get("scores", {})

    for frame_id, py_values in py.items():
        rust_values = rust.get(frame_id)
        if not rust_values:
            failures.append({"id": frame_id, "field": "_frame", "reason": "missing rust output"})
            continue

        compared += 1

        for field, tol in metric_tols.items():
            p = float(py_values.get(field, 0.0))
            r = float(rust_values.get(field, 0.0))
            delta = abs(p - r)
            if delta > float(tol):
                failures.append({"id": frame_id, "field": field, "python": p, "rust": r, "delta": delta, "tol": tol})

        for field, tol in score_tols.items():
            p = float(py_values.get(f"scores.{field}", 0.0))
            r = float(rust_values.get(f"scores.{field}", 0.0))
            delta = abs(p - r)
            if delta > float(tol):
                failures.append({"id": frame_id, "field": f"scores.{field}", "python": p, "rust": r, "delta": delta, "tol": tol})

    result = {
        "comparedFrames": compared,
        "failingFields": len(failures),
        "approved": len(failures) <= int(tolerances.get("maxFailingFields", 0)),
        "failures": failures[:200],
    }

    OUT_PATH.write_text(json.dumps(result, indent=2))
    print(json.dumps(result, indent=2))
    raise SystemExit(0 if result["approved"] else 2)


if __name__ == "__main__":
    main()
