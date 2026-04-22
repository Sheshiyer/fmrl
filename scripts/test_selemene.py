#!/usr/bin/env python3
"""Quick test of Selemene API endpoints."""
import urllib.request
import json
import sys

BASE = "https://selemene.tryambakam.space"
TOKEN = "nk_7b50cd5e679f4316ae676b9476d984a3d38fdfbcd84440b286324e93437383d2"
HEADERS = {
    "X-API-Key": TOKEN,
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
}


def api(path, method="GET", body=None):
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(f"{BASE}{path}", headers=HEADERS, data=data, method=method)
    with urllib.request.urlopen(req, timeout=15) as r:
        return r.status, json.loads(r.read().decode())


# 1. Health
try:
    status, data = api("/health")
    print(f"=== HEALTH === {status}")
    print(json.dumps(data, indent=2))
except Exception as e:
    print(f"HEALTH ERROR: {e}")

# 2. Engines
try:
    status, engines = api("/api/v1/engines")
    print(f"\n=== ENGINES ({len(engines)}) ===")
    for eng in engines:
        print(f"  {eng.get('engine_id', '?'):20s}  phase={eng.get('required_phase', '?')}  {eng.get('engine_name', '')}")
except Exception as e:
    print(f"ENGINES ERROR: {e}")

# 3. Workflows
try:
    status, wf = api("/api/v1/workflows")
    print(f"\n=== WORKFLOWS ({len(wf)}) ===")
    for w in wf:
        print(f"  {w.get('workflow_id', '?'):20s}  {w.get('name', '')}")
except Exception as e:
    print(f"WORKFLOWS ERROR: {e}")

# 4. User profile
try:
    status, profile = api("/api/v1/users/me")
    print("\n=== USER PROFILE ===")
    print(json.dumps(profile, indent=2))
except Exception as e:
    print(f"USER PROFILE ERROR: {e}")

# 5. Test calculate — panchanga
try:
    body = {
        "birth_data": {
            "date": "1990-01-15",
            "time": "06:30",
            "latitude": 12.9716,
            "longitude": 77.5946,
            "timezone": "Asia/Kolkata",
        },
        "current_time": "2026-03-26T10:00:00+05:30",
    }
    status, result = api("/api/v1/engines/panchanga/calculate", "POST", body)
    print("\n=== PANCHANGA CALCULATE ===")
    print(json.dumps(result, indent=2)[:2000])
except Exception as e:
    print(f"PANCHANGA ERROR: {e}")

# 6. Test calculate — vedic-clock
try:
    status, result = api("/api/v1/engines/vedic-clock/calculate", "POST", body)
    print("\n=== VEDIC-CLOCK CALCULATE ===")
    print(json.dumps(result, indent=2)[:2000])
except Exception as e:
    print(f"VEDIC-CLOCK ERROR: {e}")

# 7. Readings
try:
    status, readings = api("/api/v1/readings?limit=3")
    print(f"\n=== READINGS ({len(readings)}) ===")
    for r in readings[:3]:
        print(f"  engine={r.get('engine_id', '?')}  created={r.get('created_at', '?')}")
except Exception as e:
    print(f"READINGS ERROR: {e}")
