# Autoresearch Framework - Baseline Complete ✅

**Project**: FMRL (Biofield-mirror)  
**Mode**: Thoughtseed Business Research Loop (adapted for product experiments)  
**Date**: 2026-04-02  
**Agent**: Codex with autoresearch skill

---

## 📋 What We Built

### 1. Experiment Framework `/experiments/`

```
experiments/
├── README.md                      # Framework docs (5 experiment areas)
├── experiments.tsv                # Experiment log (TSV format)
├── batch-00-selemene-baseline.md  # Integration baseline tests (7 tests)
├── batch-01-quick-wins.md         # Metric fixes (5 experiments)
└── baseline-results.md            # Actual baseline test results
```

### 2. Baseline Tests Completed

| # | Test | Result | Status |
|---|------|--------|--------|
| 1 | API Reachability | ✅ PASS | Selemene API live, 16 engines loaded |
| 2 | Authentication | ⚠️ PARTIAL | Auth works, test creds expired |
| 3-7 | Integration tests | ⏸️ BLOCKED | Need valid JWT to proceed |

### 3. Key Findings

**✅ What Works**:
- Selemene API is stable (77+ hours uptime)
- Dual auth supported (JWT + API key)
- Shared Supabase database configured
- FMRL has Supabase credentials

**❌ What's Blocked**:
- Test script API key expired
- Can't test protected endpoints without auth
- Integration flow verification pending

---

## 🎯 Decision Point

You now have **3 options** for proceeding:

### Option A: Full Integration Test First
**Time**: 1-2 hours  
**Value**: Verify entire FMRL ↔ Selemene architecture  
**Blocker**: Need to sign in and get JWT  

**Steps**:
1. Run FMRL app and sign up/sign in
2. Extract JWT from browser session
3. Complete baseline tests 3-7
4. Verify biofield engine reads FMRL data
5. Then fix metrics (Batch 01)

**Choose if**: You want architectural confidence before touching code

---

### Option B: Metrics Experiments First (RECOMMENDED)
**Time**: 1-2 hours  
**Value**: Make FMRL immediately more useful  
**Blocker**: None (all local)  

**Steps**:
1. Skip integration testing for now
2. Run Batch 01 (5 metric fix experiments)
3. Get real-time scores responding to user movement
4. Circle back to Selemene integration later

**Choose if**: You want fast user-facing improvements

**Why Recommended**:
- Metrics are the foundation (Selemene needs good data)
- Self-contained (no external dependencies)
- Faster feedback loop
- Higher immediate impact

---

### Option C: Hybrid Approach
**Time**: 15 minutes quick check + 1-2 hours experiments  
**Value**: Best of both worlds  

**Steps**:
1. Quick test: Run FMRL app, check if SelemeneClient works
2. If it works → proceed with Option A
3. If blocked → proceed with Option B

**Choose if**: You want to validate before committing to a path

---

## 📊 Experiment Batches Ready to Execute

### Batch 01: Quick Wins (Metric Fixes)
**File**: `experiments/batch-01-quick-wins.md`

5 experiments targeting stuck metrics:
1. Fix sampling rate (random → deterministic)
2. Add saturation mean calculation
3. Estimate fractal dimension
4. Estimate Hurst exponent
5. Fix symmetry state propagation

**Expected Outcome**: Score variance increases from <5% to >20%

**Code Changes**: 
- `PIPShader.tsx` (~50 lines)
- `useRealTimeMetrics.ts` (~100 lines)

---

## 🔍 Current System State

### FMRL Architecture

```
PIPShader.tsx (WebGL)
    ↓ onFrameData callback (only 20% of frames!)
    ↓ { brightness, colorEntropy, horizontalSymmetry, verticalSymmetry }
    ↓
useRealTimeMetrics.ts
    ↓ ScoreCalculator
    ↓
MetricsScoresPanel.tsx (STUCK SCORES)
```

**Root Cause**: Most advanced metrics hardcoded to defaults
- `fractalDimension` = 1.5 (never changes)
- `hurstExponent` = 0.5 (never changes)
- `lyapunovExponent` = 0 (never computed)

### Selemene Integration

```
FMRL Desktop App
    ↓ writes sessions to
Supabase PostgreSQL (biofield_* tables)
    ↓ read by
Selemene engine-biofield crate
    ↓ returns
Biofield Analysis Result
```

**Current State**: Mock data (engine-biofield not yet reading real sessions)

---

## 📁 Files to Review

1. **Experiment Plans**:
   - `experiments/batch-01-quick-wins.md` - Detailed experiment specs
   
2. **Baseline Results**:
   - `experiments/baseline-results.md` - Test results and next steps

3. **Context Docs**:
   - `METRICS_IMPLEMENTATION_STATUS.md` - Current metric implementation
   - `docs/design/selemene-integration-spec.md` - Integration architecture

4. **Test Scripts**:
   - `scripts/test_selemene.py` - API health check
   - `scripts/test_auth.py` - Auth method testing

---

## 🚀 Ready to Start?

**Recommended**: Start with **Option B** (Metrics First)

Run your first experiment:
```bash
# Experiment 01: Fix sampling rate
cd /Volumes/madara/2026/twc-vault/01-Projects/BV-PIP/Biofield-mirror
code frontend/src/components/PIPCanvas/PIPShader.tsx

# Find line ~473:
# if (onFrameData && Math.random() < 0.2) {

# Replace with:
# if (onFrameData && frameCount % 3 === 0) {
```

Log result to `experiments/experiments.tsv` and iterate!

---

## 📝 Experiment Log Format

After each experiment, add a row to `experiments.tsv`:

```
id	area	question	baseline	change	metric	result	decision	notes	timestamp
01	Sampling	Does deterministic sampling improve lag?	Random 20%	Every 3rd frame	Perceived lag (ms)	280ms→180ms	keep	FPS stable	2026-04-02T15:45:00
```

---

## 🎓 Autoresearch Principles Applied

1. ✅ **One change per experiment** - Each batch item is atomic
2. ✅ **Define success metric before running** - Each experiment has clear metrics
3. ✅ **Keep or discard based on results** - Decision criteria explicit
4. ✅ **Log every run** - TSV log ready
5. ✅ **Bounded batches** - Batch 01 has exactly 5 experiments

---

## 🤝 Your Turn

**What do you want to do next?**

Type:
- **"A"** to run full integration baseline first
- **"B"** to start Batch 01 metric experiments (recommended)
- **"C"** to do quick hybrid check
- Or ask questions about the framework/experiments

I'm ready to execute whichever path you choose! 🚀
