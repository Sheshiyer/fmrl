#!/usr/bin/env python3
"""Quick one-shot API test."""
import http.client
import json
import os
import ssl
import sys

HOST = "selemene.tryambakam.space"
KEY = os.getenv("SELEMENE_API_KEY")
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"

if not KEY:
    print("SELEMENE_API_KEY is not set", file=sys.stderr)
    sys.exit(1)

ctx = ssl.create_default_context()

endpoints = [
    ("GET", "/health", None),
    ("GET", "/api/v1/engines", None),
    ("GET", "/api/v1/workflows", None),
    ("GET", "/api/v1/users/me", None),
    ("GET", "/api/v1/readings?limit=3", None),
    ("POST", "/api/v1/engines/panchanga/calculate", {
        "birth_data": {"date": "1990-01-15", "time": "06:30", "latitude": 12.9716, "longitude": 77.5946, "timezone": "Asia/Kolkata"},
        "current_time": "2026-03-26T10:00:00+05:30",
    }),
]

for method, path, body in endpoints:
    conn = http.client.HTTPSConnection(HOST, timeout=10, context=ctx)
    hdrs = {"X-API-Key": KEY, "User-Agent": UA, "Content-Type": "application/json"}
    payload = json.dumps(body) if body else None
    try:
        conn.request(method, path, body=payload, headers=hdrs)
        resp = conn.getresponse()
        data = resp.read().decode()[:1500]
        print(f"\n{'='*60}")
        print(f"{method} {path} -> {resp.status}")
        print(data)
    except Exception as e:
        print(f"\n{method} {path} -> ERROR: {e}")
    finally:
        conn.close()
