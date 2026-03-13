# API Smoke Guide — Biofield Persistence

_Last updated: 2026-03-08_

## Purpose
This guide provides concrete API-level smoke checks for the new guarded persistence-aware backend surfaces.

---

## 1. Health
```bash
curl -s http://localhost:8000/health | jq
```

Expected when disabled:
- `status: healthy`
- `persistence.enabled: false`

Expected when enabled against a valid safe DB:
- `status: healthy`
- `persistence.enabled: true`
- `persistence.healthy: true`

---

## 2. Create session
```bash
curl -s -X POST http://localhost:8000/api/v1/sessions \
  -H 'Content-Type: application/json' \
  -d '{
    "user_id": "<user-uuid>",
    "analysis_mode": "fullBody",
    "analysis_region": "full",
    "source_kind": "live-estimate",
    "metadata": {"source": "safe-validation"}
  }' | jq
```

Expected when enabled:
- response contains `id`
- response contains `user_id`
- response `status` is `active`

Expected when disabled:
- HTTP 503 with feature-gate explanation

---

## 3. Capture + persist
```bash
curl -s -X POST http://localhost:8000/api/v1/analysis/capture \
  -F image=@/absolute/path/to/sample.png \
  -F mode=fullBody \
  -F region=full \
  -F user_id=<user-uuid> \
  -F session_id=<session-uuid> | jq
```

Expected when enabled:
- analysis response still includes `metrics`, `scores`, and `images`
- response contains `persistence_state`
- `persistence_state` is `persisted`
- `persisted_reading_id` is non-null

Expected when disabled:
- response still succeeds for analysis
- `persistence_state` is `disabled`
- `persisted_reading_id` is `null`

---

## 4. Create baseline
```bash
curl -s -X POST http://localhost:8000/api/v1/baseline/create \
  -H 'Content-Type: application/json' \
  -d '{
    "user_id": "<user-uuid>",
    "session_id": "<session-uuid>",
    "name": "Safe Validation Baseline",
    "baseline_scores": {"energy": 60, "symmetry": 70, "coherence": 65, "complexity": 40, "regulation": 55, "colorBalance": 75},
    "baseline_metrics": {"avgIntensity": 128, "lqd": 0.42},
    "provenance": {"source": "safe-validation"}
  }' | jq
```

Expected when enabled:
- response contains real baseline id
- response returns submitted baseline metrics

Expected when disabled:
- placeholder-compatible response is returned

---

## 5. Activate baseline
```bash
curl -s -X PUT "http://localhost:8000/api/v1/baseline/<baseline-uuid>/activate?user_id=<user-uuid>" | jq
```

Expected when enabled:
- returns `status: activated`
- the selected baseline becomes the active one for that user

---

## 6. Get current baseline
```bash
curl -s "http://localhost:8000/api/v1/baseline/current?user_id=<user-uuid>" | jq
```

Expected when enabled:
- returns active baseline row

Expected when disabled or absent:
- returns no-active-baseline message

---

## 7. List sessions
```bash
curl -s "http://localhost:8000/api/v1/sessions?user_id=<user-uuid>&limit=20&offset=0" | jq
```

Expected when enabled:
- response contains `items`
- recently created session appears in list

---

## 8. Pause / resume / complete session
```bash
curl -s -X POST http://localhost:8000/api/v1/sessions/<session-uuid>/pause | jq
curl -s -X POST http://localhost:8000/api/v1/sessions/<session-uuid>/resume | jq
curl -s -X POST "http://localhost:8000/api/v1/sessions/<session-uuid>/complete?duration_seconds=120" | jq
```

Expected when enabled:
- pause sets `status` to `paused`
- resume sets `status` back to `active`
- complete sets `status` to `completed`

---

## 9. Timeline batch write
```bash
curl -s -X POST http://localhost:8000/api/v1/timeline/batch \
  -H 'Content-Type: application/json' \
  -d '{
    "session_id": "<session-uuid>",
    "user_id": "<user-uuid>",
    "points": [
      {
        "sample_index": 0,
        "sample_time_ms": 0,
        "score_vector": {"energy": 60, "symmetry": 70, "coherence": 65},
        "metric_vector": {"avgIntensity": 128, "lqd": 0.42}
      }
    ]
  }' | jq
```

Expected when enabled:
- `count` is at least 1
- returned row references the target session

---

## 10. Timeline query
```bash
curl -s http://localhost:8000/api/v1/timeline/<session-uuid> | jq
```

Expected when enabled:
- `items` contains persisted timeline points in sample order

---

## 11. Snapshot create + fetch
```bash
curl -s -X POST http://localhost:8000/api/v1/snapshots \
  -H 'Content-Type: application/json' \
  -d '{
    "user_id": "<user-uuid>",
    "session_id": "<session-uuid>",
    "reading_id": "<reading-uuid>",
    "label": "Smoke Snapshot"
  }' | jq

curl -s http://localhost:8000/api/v1/snapshots/<snapshot-uuid> | jq
```

Expected when enabled:
- create returns a snapshot id
- fetch returns snapshot detail

---

## 12. Reading history
```bash
curl -s "http://localhost:8000/api/v1/analysis/history?user_id=<user-uuid>&limit=20&offset=0" | jq
```

Expected when enabled:
- returns persisted reading items
- items may include `session_id` and `snapshot_id` when linked

---

## 13. Failure cases to check
- invalid UUID for `user_id`
- enabled persistence without applied schema
- enabled persistence with cross-user baseline activation attempt
- `/api/v1/analysis/history` route precedence remains correct over `/{analysis_id}`
- upload path policy mismatch in storage-backed artifact follow-up work
