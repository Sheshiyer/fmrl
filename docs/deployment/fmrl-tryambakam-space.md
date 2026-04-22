# fmrl.tryambakam.space Deployment Runbook

This runbook is retained for domain context, but the active system architecture is Tauri desktop + Selemene API on Railway + Supabase.

## Canonical Runtime Target

- Selemene engines API: `https://selemene.tryambakam.space`
- Supabase project: `qjnqdhvlxdmezxdnlrbj`
- Desktop shell: Tauri app under `frontend/src-tauri`

## Environment Inputs

Set these in local development and release environments:

- `VITE_SELEMENE_API_URL=https://selemene.tryambakam.space`
- `VITE_SUPABASE_URL=https://qjnqdhvlxdmezxdnlrbj.supabase.co`
- `VITE_SUPABASE_ANON_KEY=<anon-key>`

For Selemene on Railway, ensure `DATABASE_URL` is a valid Supabase session-pooler URL on port `5432`.

## Supabase auth settings

In Supabase Auth keep:

- Provider callback URL for Discord:
  - `https://qjnqdhvlxdmezxdnlrbj.supabase.co/auth/v1/callback`
- Redirect URLs:
  - `http://localhost:5173/`
  - `https://tauri.localhost/`

This ensures OAuth can complete correctly in both local web and Tauri flows.

## Tauri macOS release path

This repo already has a Tauri v2 desktop app in `frontend/src-tauri`.

For a public macOS build you still need:

- Apple Developer Program access for the team that will sign the app
- signing certificates installed on the release machine
- notarization credentials configured for the Tauri build
- a production test of camera permissions, Discord login, and backend bootstrap in the signed bundle

Expo is not part of this release path. This app is built with Tauri, not Expo/React Native.
