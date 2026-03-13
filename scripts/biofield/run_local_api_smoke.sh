#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE_URL:-http://127.0.0.1:8010}"
OUT="${OUT_DIR:-./tmp/local-api-smoke}"
IMG="${SAMPLE_IMAGE_PATH:-}"
USER_ID="${USER_ID:-11111111-1111-1111-1111-111111111111}"

if [[ -z "$IMG" || ! -f "$IMG" ]]; then
  echo "SAMPLE_IMAGE_PATH must point to an existing image file" >&2
  exit 1
fi

mkdir -p "$OUT"

curl -sf "$BASE/health" | tee "$OUT/health.json" >/dev/null

SESSION_JSON=$(curl -sf -X POST "$BASE/api/v1/sessions" \
  -H 'Content-Type: application/json' \
  -d "{\"user_id\":\"$USER_ID\",\"analysis_mode\":\"fullBody\",\"analysis_region\":\"full\",\"source_kind\":\"live-estimate\",\"metadata\":{\"source\":\"local-safe-validation\"}}")
printf '%s\n' "$SESSION_JSON" > "$OUT/session-create.json"
SESSION_ID=$(printf '%s' "$SESSION_JSON" | python3 -c 'import sys,json; print(json.load(sys.stdin)["id"])')

CAPTURE_JSON=$(curl -sf -X POST "$BASE/api/v1/analysis/capture" \
  -F image=@"$IMG" \
  -F mode=fullBody \
  -F region=full \
  -F user_id="$USER_ID" \
  -F session_id="$SESSION_ID")
printf '%s\n' "$CAPTURE_JSON" > "$OUT/capture.json"
READING_ID=$(printf '%s' "$CAPTURE_JSON" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("persisted_reading_id") or "")')

TIMELINE_JSON=$(curl -sf -X POST "$BASE/api/v1/timeline/batch" \
  -H 'Content-Type: application/json' \
  -d "{\"session_id\":\"$SESSION_ID\",\"user_id\":\"$USER_ID\",\"points\":[{\"sample_index\":0,\"sample_time_ms\":0,\"score_vector\":{\"energy\":60,\"symmetry\":70,\"coherence\":65,\"complexity\":40,\"regulation\":55,\"colorBalance\":75},\"metric_vector\":{\"avgIntensity\":128,\"lqd\":0.42}}]}")
printf '%s\n' "$TIMELINE_JSON" > "$OUT/timeline-batch.json"

curl -sf "$BASE/api/v1/timeline/$SESSION_ID" | tee "$OUT/timeline-get.json" >/dev/null

SNAPSHOT_JSON=$(curl -sf -X POST "$BASE/api/v1/snapshots" \
  -H 'Content-Type: application/json' \
  -d "{\"user_id\":\"$USER_ID\",\"session_id\":\"$SESSION_ID\",\"reading_id\":\"$READING_ID\",\"label\":\"Local Smoke Snapshot\"}")
printf '%s\n' "$SNAPSHOT_JSON" > "$OUT/snapshot-create.json"
SNAPSHOT_ID=$(printf '%s' "$SNAPSHOT_JSON" | python3 -c 'import sys,json; print(json.load(sys.stdin)["id"])')

curl -sf "$BASE/api/v1/snapshots/$SNAPSHOT_ID" | tee "$OUT/snapshot-get.json" >/dev/null
curl -sf -X POST "$BASE/api/v1/sessions/$SESSION_ID/pause" | tee "$OUT/session-pause.json" >/dev/null
curl -sf -X POST "$BASE/api/v1/sessions/$SESSION_ID/resume" | tee "$OUT/session-resume.json" >/dev/null
curl -sf "$BASE/api/v1/sessions/$SESSION_ID" | tee "$OUT/session-get.json" >/dev/null
curl -sf -X POST "$BASE/api/v1/sessions/$SESSION_ID/complete?duration_seconds=120&summary_reading_id=$READING_ID" | tee "$OUT/session-complete.json" >/dev/null
curl -sf "$BASE/api/v1/sessions?user_id=$USER_ID&limit=20&offset=0" | tee "$OUT/session-list.json" >/dev/null

BASELINE_JSON=$(curl -sf -X POST "$BASE/api/v1/baseline/create" \
  -H 'Content-Type: application/json' \
  -d "{\"user_id\":\"$USER_ID\",\"session_id\":\"$SESSION_ID\",\"source_snapshot_id\":\"$SNAPSHOT_ID\",\"source_reading_id\":\"$READING_ID\",\"name\":\"Local Safe Validation Baseline\",\"baseline_scores\":{\"energy\":60,\"symmetry\":70,\"coherence\":65,\"complexity\":40,\"regulation\":55,\"colorBalance\":75},\"baseline_metrics\":{\"avgIntensity\":128,\"lqd\":0.42},\"provenance\":{\"source\":\"local-safe-validation\"}}")
printf '%s\n' "$BASELINE_JSON" > "$OUT/baseline-create.json"
BASELINE_ID=$(printf '%s' "$BASELINE_JSON" | python3 -c 'import sys,json; print(json.load(sys.stdin)["id"])')

curl -sf -X PUT "$BASE/api/v1/baseline/$BASELINE_ID/activate?user_id=$USER_ID" | tee "$OUT/baseline-activate.json" >/dev/null
curl -sf "$BASE/api/v1/baseline/current?user_id=$USER_ID" | tee "$OUT/baseline-current.json" >/dev/null
curl -sf "$BASE/api/v1/analysis/history?user_id=$USER_ID&limit=20&offset=0" | tee "$OUT/history.json" >/dev/null

echo "Smoke complete: $OUT"
