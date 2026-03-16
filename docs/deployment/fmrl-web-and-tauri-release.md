# FMRL Web Deployment and Tauri Release

This repo now supports a public web deployment where the frontend serves from a real domain and proxies API traffic to the backend through nginx.

## Web target

- Public web URL: `https://fmrl.tryambakam.space`
- Backend stays behind the same nginx host via `/api/*`, `/ws/*`, and `/health`
- Frontend runtime now defaults to the current origin in production when `VITE_API_URL` is not set, so the public web build no longer falls back to `http://localhost:8000`

## Required infrastructure inputs

1. Point the DNS `A` record for `fmrl.tryambakam.space` to the production droplet IP.
2. In GitHub repository variables, set `APP_DOMAIN=fmrl.tryambakam.space`.
3. Ensure the droplet has a certificate at:
   - `/etc/letsencrypt/live/fmrl.tryambakam.space/fullchain.pem`
   - `/etc/letsencrypt/live/fmrl.tryambakam.space/privkey.pem`

## GitHub Actions deploy path

The current workflow at `.github/workflows/deploy.yml` now:

1. Builds and pushes backend/frontend images.
2. Copies `docker-compose.prod.yml` to the droplet.
3. Writes `.env.production` on the droplet with:
   - `DOCKER_REGISTRY`
   - `IMAGE_TAG`
   - `APP_DOMAIN`
4. Runs:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml pull
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --force-recreate
```

## Supabase and Discord auth settings

For the deployed web app, add this redirect URL in Supabase Auth URL configuration:

- `https://fmrl.tryambakam.space/`

Keep the Discord OAuth callback pointed at Supabase:

- `https://qjnqdhvlxdmezxdnlrbj.supabase.co/auth/v1/callback`

The app domain does not replace the Discord callback URL. It only needs to be present in Supabase redirect configuration so Supabase can send the browser back to the deployed site after auth.

Recommended Supabase redirect URLs to keep:

- `http://localhost:5173/`
- `https://fmrl.tryambakam.space/`
- `https://tauri.localhost/`

## Tauri public release path

For the desktop app, the web deployment and the macOS release are separate tracks:

- The web app ships to `fmrl.tryambakam.space`
- The macOS Tauri app is a signed and notarized `.app` / `.dmg` built from `frontend/src-tauri`

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
