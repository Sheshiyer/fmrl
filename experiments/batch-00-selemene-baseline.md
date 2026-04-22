# Batch 00: Selemene Integration Baseline

**Goal**: Verify FMRL → Selemene Engine integration works end-to-end  
**Success Metric**: All 5 integration tests pass  
**Timeline**: 30 minutes  
**Focus**: Establish working baseline before optimizing metrics

---

## Integration Architecture Summary

From `selemene-integration-spec.md`:

```
┌──────────────────────────┐         ┌──────────────────────────┐
│   FMRL (Biofield)        │         │   Selemene Engine        │
│   Desktop App            │         │   (Rust API)             │
│                          │         │                          │
│  PIP Camera → Shader     │         │  engine-biofield crate   │
│       ↓                  │         │       ↓                  │
│  FastAPI Backend         │  WRITE  │  sqlx queries            │
│       ↓                  │ ──────► │       ↓                  │
│  Supabase PostgreSQL ────┼─────────┼───────┘                  │
│  (biofield_* tables)     │  READ   │                          │
│       ↓                  │ ◄───────┤                          │
│  readings table          │         │                          │
│  (engine_id='biofield-   │         │                          │
│   mirror')               │         │                          │
└──────────────────────────┘         └──────────────────────────┘
```

**Key Points**:
1. Both systems share same Supabase database (`qjnqdhvlxdmezxdnlrbj`)
2. FMRL writes to `biofield_*` tables
3. Selemene reads them via `engine-biofield` crate
4. Auth is unified (same Supabase JWT)

---

## Baseline Test 1: Verify API Endpoint Reachability

**Question**: Is the Selemene API up and responding?

**Test**:
```bash
cd /Volumes/madara/2026/twc-vault/01-Projects/BV-PIP/Biofield-mirror
python3 scripts/test_selemene.py
```

**Expected Output**:
```
✓ GET /health → 200 OK
✓ API version: v1
✓ Server: selemene-engine
```

**Failure Modes**:
- Connection refused → Railway deployment down
- 502/503 → Service starting/crashed
- SSL error → Certificate issue

**Metric**: API availability (pass/fail)

---

## Baseline Test 2: Verify Authentication Flow

**Question**: Can FMRL obtain valid Selemene JWT?

**Test**:
```bash
python3 scripts/test_auth.py
```

**Expected Flow**:
1. Sign in to Supabase with test user
2. Extract JWT from session
3. Call Selemene API with `Authorization: Bearer <jwt>`
4. Verify 200 response (not 401 Unauthorized)

**Expected Output**:
```
✓ Supabase login successful
✓ JWT token obtained
✓ Selemene API accepts JWT
✓ User ID matches: <uuid>
```

**Failure Modes**:
- 401 Unauthorized → JWT validation broken
- 403 Forbidden → RLS policy issue
- Different user_id in response → Identity mismatch

**Metric**: Auth success rate (pass/fail)

---

## Baseline Test 3: Check Engine Catalog

**Question**: Are all 16 engines listed in Selemene API?

**Test**:
```bash
# Use existing test script or curl
curl -s https://selemene.tryambakam.space/api/v1/engines | python3 -m json.tool
```

**Expected Engines**:
- `panchanga` (Vedic Calendar)
- `numerology` (Pythagorean/Chaldean)
- `biorhythm` (23/28/33-day cycles)
- `human-design` (Body Graph)
- `gene-keys` (Hologenetic Profile)
- `vimshottari` (Dasha periods)
- `vedic-clock` (Live temporal metrics)
- **`biofield`** ← TARGET ENGINE
- `face-reading`
- `nadabrahman` (Sound consciousness)
- `transits` (Planetary movements)
- `tarot`, `i-ching`, `sacred-geometry`, `sigil-forge`, `enneagram`

**Expected Output**:
```json
{
  "engines": [
    {
      "id": "biofield",
      "name": "Biofield Analysis",
      "status": "available",
      "required_inputs": ["birth_data"],
      "optional_inputs": ["biofield_session_id"]
    }
    // ... other engines
  ]
}
```

**Failure Mode**: `biofield` engine missing or status = "unavailable"

**Metric**: Engine availability (16/16 or X/16)

---

## Baseline Test 4: Test Biofield Engine Call (Mock Data)

**Question**: Can we successfully call the biofield engine endpoint?

**Context**: Per integration spec, `engine-biofield` crate currently returns **mock data** because it's not yet connected to FMRL's real sessions. This test verifies the API contract works.

**Test**:
```bash
# Create test payload
cat > /tmp/biofield_test.json <<'EOF'
{
  "birth_data": {
    "date": "1990-01-15",
    "time": "14:30:00",
    "timezone": "America/New_York",
    "latitude": 40.7128,
    "longitude": -74.0060
  },
  "options": {
    "consciousness_level": 0
  }
}
EOF

# Call Selemene API
curl -X POST https://selemene.tryambakam.space/api/v1/calculate/biofield \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -d @/tmp/biofield_test.json \
  | python3 -m json.tool
```

**Expected Response Structure**:
```json
{
  "engine_id": "biofield",
  "result": {
    "scores": {
      "energy": 75,
      "symmetry": 68,
      "coherence": 82,
      "complexity": 71,
      "regulation": 79,
      "color_balance": 85
    },
    "metrics": {
      "fractal_dimension": 1.52,
      "entropy": 0.68,
      "vitality_index": 0.75
    },
    "chakra_readings": [ /* 7 chakras */ ],
    "vedic_overlay": { /* birth chart correlation */ }
  },
  "witness_prompt": "What patterns emerge when...",
  "consciousness_level": 0,
  "metadata": {
    "calculation_time_ms": 42.3,
    "backend": "mock",
    "engine_version": "3.0.0"
  }
}
```

**Key Indicators**:
- `metadata.backend` = "mock" → Engine not yet reading FMRL data
- `scores` object present with 6 fields
- `witness_prompt` is a valid question

**Failure Modes**:
- 404 Not Found → Engine not registered
- 500 Internal Server Error → Engine panic/crash
- Invalid JSON → Serialization bug

**Metric**: API call success + response validation (pass/fail)

---

## Baseline Test 5: Verify FMRL Frontend Integration

**Question**: Does FMRL frontend have working Selemene client code?

**Test**:
```typescript
// Check in browser console or via test harness
import { SelemeneClient } from './services/SelemeneClient';

const client = new SelemeneClient({
  apiUrl: 'https://selemene.tryambakam.space',
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY
});

// Test health check
const health = await client.health();
console.log('Selemene health:', health);

// Test engine list
const engines = await client.listEngines();
console.log('Available engines:', engines.length);

// Test biofield engine call
const result = await client.calculate('biofield', {
  birth_data: { /* ... */ }
});
console.log('Biofield result:', result);
```

**Expected Output**:
```
Selemene health: { status: 'ok', version: 'v1' }
Available engines: 16
Biofield result: { engine_id: 'biofield', scores: {...} }
```

**Failure Modes**:
- CORS error → CSP/Tauri capability misconfigured
- Network error → API URL wrong
- Auth error → JWT not sent correctly

**Metric**: Frontend client functionality (pass/fail)

---

## Baseline Test 6: Check Database Write Path (FMRL → Supabase)

**Question**: Can FMRL successfully write biofield session data to Supabase?

**Prerequisites**:
1. Start FMRL desktop app
2. Run a 30-second PIP capture session
3. Check Supabase tables for data

**Test**:
```sql
-- Connect to Supabase PostgreSQL (via Supabase Studio or psql)

-- Check if session was created
SELECT id, user_id, status, started_at, ended_at, duration_seconds
FROM biofield_sessions
WHERE user_id = '<test-user-uuid>'
ORDER BY started_at DESC
LIMIT 1;

-- Check if timeline points were written
SELECT COUNT(*) as point_count
FROM biofield_timeline_points
WHERE session_id = '<session-id-from-above>';

-- Check score data structure
SELECT 
  sample_index,
  sample_time_ms,
  score_vector->>'energy' as energy,
  score_vector->>'symmetry' as symmetry,
  score_vector->>'coherence' as coherence
FROM biofield_timeline_points
WHERE session_id = '<session-id>'
ORDER BY sample_index
LIMIT 5;

-- Check if reading was written
SELECT id, engine_id, result_data->>'scores'
FROM readings
WHERE user_id = '<test-user-uuid>'
  AND engine_id = 'biofield-mirror'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Results**:
- Session record exists with `status = 'completed'`
- Timeline has 20-40 points (30s session at ~1 sample/sec)
- Score vectors have valid JSON structure
- Reading record exists with `engine_id = 'biofield-mirror'`

**Failure Modes**:
- Empty tables → FMRL backend not writing
- NULL score_vector → Metrics calculation failing
- RLS errors → Auth not properly set

**Metric**: Data persistence integrity (pass/fail)

---

## Baseline Test 7: Check Database Read Path (Selemene → Supabase)

**Question**: Can Selemene engine-biofield crate read FMRL session data?

**Context**: This requires the Rust backend to be updated with `SqlxMirrorProvider` (per spec Section 8.3). If not yet implemented, this test will fail gracefully.

**Test** (via Selemene backend logs or SQL query):

```sql
-- Simulate what engine-biofield will query

-- 1. Latest completed session
SELECT s.id, s.status, s.started_at, s.ended_at, s.duration_seconds
FROM biofield_sessions s
WHERE s.user_id = '<test-user-uuid>'
  AND s.status = 'completed'
ORDER BY s.ended_at DESC
LIMIT 1;

-- 2. Session statistics (aggregate)
SELECT
  session_id,
  COUNT(*) as point_count,
  AVG((score_vector->>'energy')::float) as avg_energy,
  AVG((score_vector->>'symmetry')::float) as avg_symmetry,
  AVG((score_vector->>'coherence')::float) as avg_coherence,
  AVG((score_vector->>'complexity')::float) as avg_complexity,
  AVG((score_vector->>'regulation')::float) as avg_regulation,
  AVG((score_vector->>'colorBalance')::float) as avg_color_balance,
  MAX(sample_time_ms) as duration_ms
FROM biofield_timeline_points
WHERE session_id = '<session-id>'
GROUP BY session_id;

-- 3. Active baseline
SELECT id, baseline_scores, created_at
FROM biofield_baselines
WHERE user_id = '<test-user-uuid>'
  AND is_active = true;
```

**Expected Results**:
- Query 1 returns a session record
- Query 2 returns aggregate scores (e.g., avg_energy ≈ 70-80)
- Query 3 may be NULL if no baseline set yet

**Current State**: Likely **PASS** (database structure exists)

**Future State**: engine-biofield Rust code should execute these queries automatically

**Metric**: Query success + valid data (pass/fail)

---

## Summary Checklist

Run all tests and record results:

| # | Test | Status | Notes |
|---|------|--------|-------|
| 1 | API Reachability | ⬜ | Railway deployment status |
| 2 | Authentication | ⬜ | JWT validation |
| 3 | Engine Catalog | ⬜ | 16/16 engines listed? |
| 4 | Biofield API Call | ⬜ | Mock data response |
| 5 | Frontend Client | ⬜ | SelemeneClient works? |
| 6 | FMRL → Supabase Write | ⬜ | Session data persisted? |
| 7 | Selemene → Supabase Read | ⬜ | Queries work? |

**Overall Baseline Status**:
- ✅ **PASS** if all 7 tests pass
- ⚠️ **PARTIAL** if 5-6 tests pass (identify gaps)
- ❌ **FAIL** if <5 tests pass (integration broken)

---

## Expected Outcomes

### Scenario A: All Tests Pass ✅

Integration architecture is sound. Next steps:
1. Proceed to Batch 01 (fix stuck metrics in FMRL)
2. Then implement `SqlxMirrorProvider` in Selemene to replace mock data
3. End-to-end flow: FMRL captures → Selemene analyzes → User sees correlated insights

### Scenario B: API Tests Fail (1-4) ❌

Selemene backend deployment issue. Debug priorities:
1. Check Railway logs for crashes
2. Verify environment variables (Supabase connection string)
3. Test local Selemene API before FMRL changes

### Scenario C: Database Tests Fail (6-7) ❌

Data persistence issue. Debug priorities:
1. Check FMRL backend logs for errors
2. Verify Supabase connection string in `.env`
3. Test manual SQL writes to confirm RLS policies
4. Check if tables exist (`biofield_sessions`, `biofield_timeline_points`)

### Scenario D: Frontend Test Fails (5) ❌

FMRL client integration issue. Debug priorities:
1. Check browser console for CORS/CSP errors
2. Verify `.env.example` has correct `VITE_SELEMENE_API_URL`
3. Test API calls via `curl` first (bypass frontend)
4. Check Tauri capability allows Selemene domain

---

## Next Actions Based on Baseline

After running these tests, we'll know:

1. **Is the integration working at all?** (Tests 1-7)
2. **Where is the bottleneck?** (API vs DB vs Frontend)
3. **What should we fix first?** (Metrics vs Integration)

Then we can decide:
- **Option A**: Integration works → Focus on Batch 01 (metric fixes)
- **Option B**: Integration broken → Fix integration before metrics
- **Option C**: Partial → Fix critical path first

---

## Test Execution Plan

**Duration**: 30 minutes total

**Order**:
1. Tests 1-3 (API health) - 5 min
2. Test 6 (FMRL write test) - 10 min (requires running app)
3. Test 4 (Biofield API call) - 5 min
4. Test 5 (Frontend client) - 5 min
5. Test 7 (Database read) - 5 min

**Tools Needed**:
- Terminal (for Python scripts)
- FMRL desktop app (for capture session)
- Supabase Studio (for SQL queries)
- Browser DevTools (for frontend test)
- `curl` / `httpie` (for API calls)

**Ready to start?**
