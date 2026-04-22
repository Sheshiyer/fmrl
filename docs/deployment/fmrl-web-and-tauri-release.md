# FMRL Web Deployment and Tauri Release

This repository is now aligned to a Tauri-first architecture where the Biofield app acts as the front-end client for Selemene engines.

## Active Architecture Target

- Desktop app: Tauri v2 client in `frontend/src-tauri`
- Engines backend: Selemene API on Railway (`https://selemene.tryambakam.space`)
- User/Auth/Data: Supabase (`qjnqdhvlxdmezxdnlrbj`)

## Runtime Configuration

1. Set frontend env values:
   - `VITE_SELEMENE_API_URL=https://selemene.tryambakam.space`
   - `VITE_SUPABASE_URL=https://qjnqdhvlxdmezxdnlrbj.supabase.co`
   - `VITE_SUPABASE_ANON_KEY=<anon-key>`
2. Keep Selemene Railway env values valid:
   - `DATABASE_URL` must use Supabase session pooler on port `5432`
   - `REDIS_URL` must point to Railway Redis service

## Supabase and Discord auth settings

For local web/dev and desktop auth round-trips, keep these redirect URLs in Supabase Auth:

- `http://localhost:5173/`
- `https://tauri.localhost/`

Keep the Discord OAuth callback pointed at Supabase:

- `https://qjnqdhvlxdmezxdnlrbj.supabase.co/auth/v1/callback`

The desktop app and local dev UI should rely on Supabase redirect handling, not a legacy proxy-backend path.

## Tauri public release path

The macOS Tauri app is a signed and notarized `.app` / `.dmg` built from `frontend/src-tauri`.

What is already in place:

- `frontend/src-tauri/tauri.conf.json` has bundle output enabled.
- macOS-specific `Info.plist` and `Entitlements.plist` exist.
- The app already declares camera and microphone usage descriptions.

What is still required for a public macOS release:

1. Apple signing credentials for your company Apple Developer account.
2. Tauri/macOS signing and notarization environment configured in CI or on the release machine.
3. A release process for distributables such as `.dmg` or `.app`.
4. Optional but recommended: an updater/release channel strategy if you want in-app updates later.

## Expo note

Expo is not the deployment path for this repo.

- Expo applies to React Native / Expo apps.
- This project’s published desktop app path is Tauri.
- Your Apple Developer account is relevant for Tauri macOS signing and notarization.
- Your Expo setup would only matter if you decide to build a separate React Native mobile client.
