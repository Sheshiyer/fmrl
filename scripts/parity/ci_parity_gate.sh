#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

python3 "$ROOT/scripts/parity/generate_golden_dataset.py"
python3 "$ROOT/scripts/parity/export_python_metrics.py"
bash "$ROOT/scripts/parity/export_rust_metrics.sh"
python3 "$ROOT/scripts/parity/compare_python_rust.py"
python3 "$ROOT/scripts/parity/track_drift.py"

echo "Parity gate passed"
