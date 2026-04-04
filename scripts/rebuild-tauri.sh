#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FRONTEND="$REPO_ROOT/frontend"
TAURI="$FRONTEND/src-tauri"
RELEASES_ROOT="$REPO_ROOT/releases"

OS_NAME="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH_NAME="$(uname -m | tr '[:upper:]' '[:lower:]')"
PLATFORM_TAG="${OS_NAME}-${ARCH_NAME}"

# Parse flags
FRESH=false
EXPORT_RELEASE=true
TARGET=""

NEXT_IS_TARGET=false
for arg in "$@"; do
  if $NEXT_IS_TARGET; then
    TARGET="$arg"
    NEXT_IS_TARGET=false
    continue
  fi

  case "$arg" in
    --fresh) FRESH=true ;;
    --no-export) EXPORT_RELEASE=false ;;
    --target)
      NEXT_IS_TARGET=true
      ;;
    --target=*)
      TARGET="${arg#*=}"
      ;;
    -h|--help)
      echo "Usage: rebuild-tauri.sh [--fresh] [--target <triple>] [--no-export]"
      echo "  --fresh  Clear WebView cache & localStorage (forces onboarding)"
      echo "  --target Build for a specific Rust/Tauri target triple"
      echo "  --no-export Do not copy artifacts into releases/<platform>/v<version>/"
      exit 0
      ;;
  esac
done

if $NEXT_IS_TARGET; then
  echo "Error: --target requires a value"
  exit 1
fi

# Tauri app identifier — must match tauri.conf.json → identifier
TAURI_ID="space.tryambakam.fmrl"

# Read current version from Cargo.toml
CURRENT_VERSION=$(grep '^version' "$TAURI/Cargo.toml" | head -1 | sed 's/.*"\(.*\)"/\1/')

STEP_COUNT=5
if $FRESH; then STEP_COUNT=6; fi

echo "╔══════════════════════════════════════════╗"
echo "║  FMRL Tauri Rebuild — Clean & Fresh      ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "  Current version: $CURRENT_VERSION"
if $FRESH; then
  echo "  Mode: FRESH (WebView cache will be cleared)"
fi
if [ -n "$TARGET" ]; then
  echo "  Target: $TARGET"
fi
echo ""

# --- Step 0 (optional): Clear WebView cache & localStorage ---
if $FRESH; then
  # Kill any running FMRL instance first — WebKit will re-persist in-memory state on exit
  if pgrep -x "FMRL" > /dev/null 2>&1; then
    echo "⟐ Killing running FMRL instance..."
    pkill -x "FMRL" 2>/dev/null || true
    sleep 2  # wait for WebKit to fully exit and release file locks
    echo "  ✓ FMRL process terminated"
  fi

  echo "⟐ Step 1/$STEP_COUNT: Clearing WebView cache & localStorage..."
  WEBKIT_DIR="$HOME/Library/WebKit/$TAURI_ID"
  CACHE_DIR="$HOME/Library/Caches/$TAURI_ID"
  HTTP_STORAGE="$HOME/Library/HTTPStorages/${TAURI_ID}.binarycookies"
  # Also clear legacy identifier if present
  LEGACY_WEBKIT="$HOME/Library/WebKit/com.fmrl.app"
  LEGACY_CACHE="$HOME/Library/Caches/com.fmrl.app"
  LEGACY_HTTP="$HOME/Library/HTTPStorages/com.fmrl.app.binarycookies"

  for dir in "$WEBKIT_DIR" "$CACHE_DIR" "$LEGACY_WEBKIT" "$LEGACY_CACHE"; do
    if [ -d "$dir" ]; then
      rm -rf "$dir"
      echo "  ✓ Removed $dir"
    fi
  done
  for f in "$HTTP_STORAGE" "$LEGACY_HTTP"; do
    if [ -f "$f" ]; then
      rm -f "$f"
      echo "  ✓ Removed $f"
    fi
  done
  echo "  ✓ WebView state cleared — onboarding will run on next launch"
fi

# --- Step 1: Clean old builds ---
STEP_BASE=1
if $FRESH; then STEP_BASE=2; fi
echo "⟐ Step $STEP_BASE/$STEP_COUNT: Cleaning old builds..."
rm -rf "$TAURI/target/release/bundle"
rm -rf "$TAURI/target/release/build"
rm -rf "$TAURI/target/release/deps"
rm -rf "$TAURI/target/release/.fingerprint"
rm -f "$TAURI/target/release/fmrl-desktop" "$TAURI/target/release/fmrl_desktop"
rm -rf "$FRONTEND/dist"
echo "  ✓ Old .app, .dmg, and build artifacts removed"

# --- Step: Install frontend deps ---
echo "⟐ Step $((STEP_BASE+1))/$STEP_COUNT: Installing frontend dependencies..."
cd "$FRONTEND"
npm install --silent 2>&1 | tail -1
echo "  ✓ Dependencies up to date"

# --- Step: Build frontend ---
echo "⟐ Step $((STEP_BASE+2))/$STEP_COUNT: Building frontend (Vite)..."
npm run build 2>&1 | tail -3
echo "  ✓ Frontend built to dist/"

# --- Step: Build Tauri app ---
echo "⟐ Step $((STEP_BASE+3))/$STEP_COUNT: Building Tauri .app + .dmg..."
cd "$FRONTEND"
if [ -n "$TARGET" ]; then
  npx tauri build --target "$TARGET" 2>&1 | tail -5
else
  npx tauri build 2>&1 | tail -5
fi
echo "  ✓ Tauri build complete"

# --- Step: Report results ---
echo ""
echo "⟐ Step $STEP_COUNT/$STEP_COUNT: Build artifacts:"
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

if $EXPORT_RELEASE; then
  RELEASE_DIR="$RELEASES_ROOT/$PLATFORM_TAG/v$VERSION"
  mkdir -p "$RELEASE_DIR"

  COPIED=0
  while IFS= read -r artifact; do
    cp -R "$artifact" "$RELEASE_DIR/"
    COPIED=$((COPIED + 1))
  done < <(find "$TAURI/target/release/bundle" -type f \( -name '*.dmg' -o -name '*.exe' -o -name '*.msi' -o -name '*.AppImage' -o -name '*.deb' -o -name '*.rpm' \))

  while IFS= read -r app_bundle; do
    cp -R "$app_bundle" "$RELEASE_DIR/"
    COPIED=$((COPIED + 1))
  done < <(find "$TAURI/target/release/bundle" -type d -name '*.app')

  if [ "$COPIED" -gt 0 ]; then
    echo "  📁 Exported $COPIED artifact(s) to: $RELEASE_DIR"
  else
    echo "  ⚠  No artifacts found to export in $TAURI/target/release/bundle"
  fi
fi

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  Build complete — v$VERSION              "
echo "╚══════════════════════════════════════════╝"
