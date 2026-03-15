# Tauri macOS Release Runbook

This app is a Tauri v2 desktop app under `frontend/src-tauri`.

## Current State

- Tauri bundle config: `frontend/src-tauri/tauri.conf.json`
- macOS metadata: `frontend/src-tauri/Info.plist`
- Entitlements: `frontend/src-tauri/Entitlements.plist` (camera, microphone, network client/server, file access)
- App icons: present for all required sizes
- Bundle identifier: `com.biofield.mirror`

## Certificate Types

| Certificate | Purpose | Status |
|-------------|---------|--------|
| Apple Development | Local dev/testing on your own devices | Installed (9C5B2K432D) |
| Developer ID Application | Distribute outside App Store (signed + notarized) | **Needed** |
| Mac App Store | Distribute via Mac App Store | Not planned |

## Quick Local Build (Dev Signing)

For testing on your own machine with your Apple Development cert:

```bash
cd frontend
APPLE_SIGNING_IDENTITY="Apple Development: Sheshnarayan Cumbipuram Nateshan (9C5B2K432D)" \
  npm run tauri:build
```

The resulting `.app` works on YOUR machine but not on other users' machines (Gatekeeper will block it).

## Production Release Build (Developer ID)

### Step 1: Create Developer ID Application Certificate

1. Go to [developer.apple.com](https://developer.apple.com) → Certificates, IDs & Profiles
2. Click "+" → Select "Developer ID Application"
3. Create CSR: Keychain Access → Certificate Assistant → Request a Certificate From a Certificate Authority
4. Upload CSR, download certificate, double-click to install
5. Verify: `security find-identity -v -p codesigning` should show "Developer ID Application: ..."

### Step 2: Create App Store Connect API Key (for notarization)

1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com) → Users and Access → Integrations → App Store Connect API
2. Click "+" → Name: "Biofield Notarization" → Access: "Developer"
3. Download the `.p8` key file (one-time download!)
4. Note the **Key ID** and **Issuer ID**

### Step 3: Set Environment Variables

Create `.env.signing` (gitignored):

```bash
APPLE_SIGNING_IDENTITY="Developer ID Application: Your Name (TEAMID)"
APPLE_API_ISSUER="your-issuer-uuid"
APPLE_API_KEY="your-key-id"
APPLE_API_KEY_PATH="/path/to/AuthKey_KEYID.p8"
```

### Step 4: Build

```bash
cd frontend
source ../.env.signing
npm run tauri:build
```

Tauri v2 will automatically:
1. Sign the `.app` with your Developer ID
2. Submit to Apple for notarization (~2-5 min)
3. Staple the notarization ticket to `.app` and `.dmg`

### Step 5: Verify

```bash
# Check code signature
codesign -dvvv "/path/to/Biofield Mirror.app"

# Check notarization (Gatekeeper)
spctl -a -vvv "/path/to/Biofield Mirror.app"
# Expected: "accepted" + "source=Notarized Developer ID"

# Check DMG
spctl -a -t open --context context:primary-signature "Biofield Mirror_0.3.0_aarch64.dmg"
```

## Entitlements

Current entitlements in `Entitlements.plist`:

| Entitlement | Reason |
|-------------|--------|
| `com.apple.security.device.camera` | Biofield analysis via webcam |
| `com.apple.security.device.microphone` | Audio entrainment features |
| `com.apple.security.network.client` | Supabase, Discord OAuth, CDN |
| `com.apple.security.network.server` | Local Python backend (localhost:8000) |
| `com.apple.security.files.user-selected.read-write` | PDF/CSV/image exports |

## Release Verification Checklist

- [ ] App launches outside dev mode
- [ ] Onboarding completes (all 5 steps)
- [ ] Discord OAuth returns to the signed app correctly
- [ ] Camera permission prompt appears and works
- [ ] Dashboard shows live biofield analysis
- [ ] Capture produces analysis results
- [ ] Session persistence works (if backend connected)
- [ ] PDF/CSV export works
- [ ] `spctl -a -vvv` reports "accepted" + "Notarized Developer ID"

## Architecture Note

- Frontend: React + Vite → bundled as Tauri webview
- Backend: Python FastAPI → will be bundled as sidecar binary (Phase 4A)
- Desktop: Tauri v2 (Rust) → native macOS `.app`
- This is NOT an Expo/React Native app
