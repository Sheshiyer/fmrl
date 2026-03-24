#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FRONTEND="$REPO_ROOT/frontend"
TAURI="$FRONTEND/src-tauri"

# Read current version from Cargo.toml
CURRENT_VERSION=$(grep '^version' "$TAURI/Cargo.toml" | head -1 | sed 's/.*"\(.*\)"/\1/')

echo "╔══════════════════════════════════════════╗"
echo "║  FMRL Tauri Rebuild — Clean & Fresh      ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "  Current version: $CURRENT_VERSION"
echo ""

# --- Step 1: Clean old builds ---
echo "⟐ Step 1/5: Cleaning old builds..."
rm -rf "$TAURI/target/release/bundle"
rm -rf "$TAURI/target/release/build"
rm -rf "$TAURI/target/release/deps"
rm -rf "$TAURI/target/release/.fingerprint"
rm -f "$TAURI/target/release/fmrl-desktop" "$TAURI/target/release/fmrl_desktop"
rm -rf "$FRONTEND/dist"
echo "  ✓ Old .app, .dmg, and build artifacts removed"

# --- Step 2: Install frontend deps ---
echo "⟐ Step 2/5: Installing frontend dependencies..."
cd "$FRONTEND"
npm install --silent 2>&1 | tail -1
echo "  ✓ Dependencies up to date"

# --- Step 3: Build frontend ---
echo "⟐ Step 3/5: Building frontend (Vite)..."
npm run build 2>&1 | tail -3
echo "  ✓ Frontend built to dist/"

# --- Step 4: Build Tauri app ---
echo "⟐ Step 4/5: Building Tauri .app + .dmg..."
cd "$FRONTEND"
npx tauri build 2>&1 | tail -5
echo "  ✓ Tauri build complete"

# --- Step 5: Report results ---
echo ""
echo "⟐ Step 5/5: Build artifacts:"
VERSION=$(grep '^version' "$TAURI/Cargo.toml" | head -1 | sed 's/.*"\(.*\)"/\1/')
DMG="$TAURI/target/release/bundle/dmg/FMRL_${VERSION}_aarch64.dmg"
APP="$TAURI/target/release/bundle/macos/FMRL.app"

if [ -f "$DMG" ]; then
  DMG_SIZE=$(du -h "$DMG" | cut -f1)
  echo "  📦 DMG: $DMG ($DMG_SIZE)"
else
  echo "  ⚠  DMG not found at expected path"
fi

if [ -d "$APP" ]; then
  APP_SIZE=$(du -sh "$APP" | cut -f1)
  echo "  📱 APP: $APP ($APP_SIZE)"
else
  echo "  ⚠  APP not found at expected path"
fi

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  Build complete — v$VERSION              "
echo "╚══════════════════════════════════════════╝"
