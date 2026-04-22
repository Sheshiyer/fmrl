# Selemene Integration Baseline - Results

**Date**: 2026-04-02  
**Executor**: Autoresearch Agent  
**Objective**: Verify FMRL → Selemene integration works end-to-end

---

## Test Results

### Test 1: API Reachability ✅ PASS

```bash
$ python3 scripts/test_selemene.py
```

**Output**:
```
=== HEALTH === 200
{
  "status": "ok",
  "version": "0.1.0",
  "uptime_seconds": 278611,
  "engines_loaded": 16,
  "workflows_loaded": 6
}
```

**Result**: ✅ **PASS**
- API is live and responding
- 16 engines loaded (matches spec)
- 6 workflows loaded
- Uptime: ~77 hours (stable)

**Conclusion**: Railway deployment is healthy.

---

### Test 2: Authentication Flow ⚠️ PARTIAL

```bash
$ python3 scripts/test_auth.py
```

**Output**:
```
Engines (Bearer): 401 -> Invalid or expired JWT token
Engines (X-API-Key): 401 -> Invalid or expired API key
```

**Result**: ⚠️ **PARTIAL**
- API correctly enforces authentication ✅
- Test script credentials are expired/invalid ❌
- API supports both Bearer JWT and X-API-Key ✅

**Findings**:
- The hardcoded API key `nk_7b50cd5e...` in test scripts is expired
- Selemene API accepts two auth methods:
  1. `Authorization: Bearer <jwt>` (Supabase JWT)
  2. `X-API-Key: <key>` (Selemene API key)
- Need fresh credentials to proceed

**Next**: Check `.env.local` for Supabase credentials...

---

### Test 3: Engine Catalog

**Status**: ⏸️ **BLOCKED** (waiting for auth to work)

Need valid JWT to call `/api/v1/engines` endpoint.

---

### Test 4: Biofield Engine Call

**Status**: ⏸️ **BLOCKED** (waiting for auth to work)

Need valid JWT to call `/api/v1/calculate/biofield` endpoint.

---

### Test 5: Frontend Client

**Status**: ⏸️ **PENDING**

Will test once auth method is confirmed.

---

### Test 6: FMRL → Supabase Write

**Status**: ⏸️ **PENDING**

Requires running FMRL desktop app and capturing a session.

---

### Test 7: Selemene → Supabase Read

**Status**: ⏸️ **PENDING**

Requires valid session data from Test 6.

---

## Current Status

**Overall**: 🟡 **PARTIAL BASELINE**

**Working**:
- ✅ Selemene API health endpoint
- ✅ Server is stable and running

**Blocked**:
- ❌ Authentication (401 Unauthorized for all protected endpoints)
- ⏸️ All downstream tests depend on auth working

**Next Action**: 
1. Determine correct auth method (Bearer JWT vs X-API-Key)
2. Obtain valid credentials
3. Retry Tests 3-7

---

## Observations

### 1. API is Live but Auth Required

The Selemene API is deployed and healthy, but all endpoints except `/health` require authentication. The integration spec mentions:

> Both systems use **Supabase Auth**. The same auth.users table is the identity source of truth.

This suggests we need:
- Supabase JWT (not the X-API-Key used in test scripts)
- Proper Authorization: Bearer <jwt> header

### 2. Test Scripts May Be Outdated

The `test_selemene.py` and `test_auth.py` scripts use:
```python
TOKEN = "nk_7b50cd5e679f4316ae676b9476d984a3d38fdfbcd84440b286324e93437383d2"
```

This looks like an API key format, but the server is rejecting it (401). Need to check:
- Is this the correct auth method?
- Do we need a Supabase JWT instead?
- Are the test scripts outdated?

### 3. Missing Supabase Credentials

The `.env.example` file shows placeholders:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

Need to find actual credentials to:
1. Sign in as a test user
2. Get a valid JWT token
3. Call Selemene API with proper auth

---

## Recommended Next Steps

### Option A: Find Existing Credentials

Check for:
- `frontend/.env` (gitignored, may have real values)
- Supabase dashboard (get anon key + project URL)
- 1Password / credential manager

### Option B: Create Test User

If no existing test user:
1. Sign up via FMRL app
2. Extract JWT from session storage
3. Use JWT in API tests

### Option C: Use Service Role (Admin)

For testing only:
1. Get Supabase service role key
2. Call API with unrestricted access
3. Verify integration works
4. Then implement proper user auth

---

## Questions to Resolve

1. **What is the correct auth method for Selemene API?**
   - Bearer JWT from Supabase?
   - X-API-Key (separate from Supabase)?
   - Both supported?

2. **Where are the test credentials stored?**
   - Is there a `.env` file we should be using?
   - Should we create a dedicated test user?

3. **Is the API key in test scripts still valid?**
   - Or has it been rotated/invalidated?

4. **Do we need to set up Supabase Auth first?**
   - Create test user account
   - Configure RLS policies
   - Enable anonymous access for testing

---

## Blockers

**BLOCKER 1**: No valid authentication credentials

**Impact**: Cannot test any endpoints beyond `/health`

**Resolution Path**: 
- Locate existing credentials, OR
- Create new test user, OR
- Use temporary service role for baseline testing

---

## Timeline

- 15:30 - Started baseline tests
- 15:32 - Confirmed API is live (Test 1 PASS)
- 15:33 - Hit auth blocker (401 Unauthorized)
- 15:35 - **PAUSED** - awaiting credentials

**Estimated Time to Resume**: 5-10 minutes (if credentials available)

---

## Credentials Found ✅

Located in `frontend/.env.local`:
```
VITE_SUPABASE_URL=https://qjnqdhvlxdmezxdnlrbj.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_0S_eOKmGGcsM_ERsg98_Eg_jJlsnJMO
VITE_SELEMENE_API_URL=https://selemene.tryambakam.space
```

**Status**: Credentials exist, but:
- Anon key appears masked/truncated (may need full key from Supabase dashboard)
- No test user credentials yet (need to sign up or use existing account)

---

## Summary: Current Integration State

### ✅ What Works

1. **Selemene API Deployment**
   - Live at `https://selemene.tryambakam.space`
   - Health endpoint responding
   - 16 engines loaded
   - 6 workflows loaded
   - Uptime: 77+ hours (stable)

2. **Authentication Architecture**
   - Dual auth methods supported (JWT + API key)
   - Error messages are clear and helpful
   - Supabase credentials located

3. **Shared Database**
   - Same Supabase project (`qjnqdhvlxdmezxdnlrbj`)
   - Both systems configured to use it
   - RLS policies likely in place

### ❌ What's Blocked

1. **Authentication Testing**
   - Test script API key expired
   - Need valid Supabase JWT or fresh API key
   - Cannot test protected endpoints

2. **Integration Flow**
   - Can't verify engine catalog
   - Can't call biofield engine
   - Can't test FMRL → Selemene data flow
   - Can't verify database read/write

### 🎯 Next Steps Options

**Option A: Full Integration Test** (Recommended)
1. Sign up/sign in as test user in FMRL app
2. Extract JWT from browser session storage
3. Run complete baseline (Tests 3-7)
4. Verify end-to-end flow
5. Then proceed to Batch 01 (metric fixes)

**Option B: Focus on Metrics First**
1. Skip Selemene integration testing for now
2. Run Batch 01 experiments (fix stuck metrics in FMRL)
3. Get real-time scores working locally
4. Circle back to Selemene integration later

**Option C: Hybrid Approach**
1. Quick frontend test (run FMRL app, check if SelemeneClient works)
2. If it works → proceed with Option A
3. If blocked → proceed with Option B

---

## Recommended Path Forward

Given the autoresearch framework goal ("iterative keep-or-discard testing"), I recommend:

**OPTION B: Focus on Metrics First**

**Rationale**:
1. **Metrics are the foundation** - Selemene integration won't be valuable if the scores are stuck at defaults
2. **Lower complexity** - Metrics fixes are self-contained, no external dependencies
3. **Faster feedback** - Can test locally without auth/network concerns
4. **Higher impact** - Makes FMRL immediately more useful

**Then**:
- Once metrics are responsive (Batch 01 complete)
- FMRL will have real data to share with Selemene
- Integration testing will be more meaningful

---

## Autoresearch Decision Point

Based on the baseline results, which path do you want to take?

**A)** Full integration test first (get auth working, test all 7 baseline tests)  
**B)** Metrics experiments first (Batch 01: fix stuck scores)  
**C)** Hybrid (quick frontend check, then decide)  

The autoresearch framework says: "Pick highest-value experiment area." Right now:
- **Metrics** = High user-facing value, low setup cost
- **Integration** = High architectural value, moderate setup cost

Your call!
