#!/usr/bin/env python3
"""Test Selemene API auth formats."""
import urllib.request
import urllib.error

BASE = "https://selemene.tryambakam.space"
KEY = "nk_7b50cd5e679f4316ae676b9476d984a3d38fdfbcd84440b286324e93437383d2"


def try_request(label, url, headers=None):
    h = headers or {}
    h["User-Agent"] = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
    try:
        req = urllib.request.Request(url, headers=h)
        with urllib.request.urlopen(req, timeout=10) as r:
            body = r.read().decode()[:500]
            print(f"{label}: {r.status} OK -> {body}")
    except urllib.error.HTTPError as e:
        body = e.read().decode()[:500]
        print(f"{label}: {e.code} -> {body}")
    except Exception as e:
        print(f"{label}: ERROR -> {e}")


# 1. Health with no auth
try_request("Health (no auth)", f"{BASE}/health")

# 2. Health with Bearer
try_request("Health (Bearer)", f"{BASE}/health", {"Authorization": f"Bearer {KEY}"})

# 3. Engines with Bearer
try_request("Engines (Bearer)", f"{BASE}/api/v1/engines", {"Authorization": f"Bearer {KEY}"})

# 4. Engines with X-API-Key
try_request("Engines (X-API-Key)", f"{BASE}/api/v1/engines", {"X-API-Key": KEY})

# 5. Engines with api_key query param
try_request("Engines (?api_key)", f"{BASE}/api/v1/engines?api_key={KEY}")

# 6. Engines with no auth at all
try_request("Engines (no auth)", f"{BASE}/api/v1/engines")

# 7. Root
try_request("Root /", f"{BASE}/")

# 8. OpenAPI docs
try_request("Docs", f"{BASE}/docs")
try_request("Swagger", f"{BASE}/swagger-ui")
try_request("Redoc", f"{BASE}/redoc")
