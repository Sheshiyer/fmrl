#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ARTIFACT_DIR="$ROOT/scripts/parity/artifacts"
mkdir -p "$ARTIFACT_DIR"
DATASET="$ARTIFACT_DIR/golden_frames.json"
RUST_OUT="$ARTIFACT_DIR/rust_metrics.json"

if [ ! -f "$DATASET" ]; then
  python3 "$ROOT/scripts/parity/generate_golden_dataset.py"
fi

cd "$ROOT/frontend/src-tauri"
PARITY_DATASET_PATH="$DATASET" PARITY_RUST_OUTPUT="$RUST_OUT" cargo test parity_export_rust_metrics -- --nocapture

echo "rust metrics written: $RUST_OUT"
