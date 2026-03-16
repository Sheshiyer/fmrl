# fmrl.tryambakam.space Deployment Runbook

This project already has a Docker-based deployment path for a single-host web app plus backend API. The repo changes in this branch make the hostname configurable so the stack can be deployed at `fmrl.tryambakam.space` instead of the legacy `biofield.live`.

## Web deployment target

- Public web app: `https://fmrl.tryambakam.space`
- Backend API: same origin, proxied by nginx from `/api/*` and `/ws/*`
- Supabase auth redirect URL for web: `https://fmrl.tryambakam.space/`

## GitHub Actions inputs

Set these before running the deploy workflow:

- Repository secret `DOCKER_USERNAME`
- Repository secret `DOCKER_PASSWORD`
- Repository secret `DROPLET_SSH_KEY`
- Repository variable `APP_DOMAIN=fmrl.tryambakam.space`

The workflow now syncs `docker-compose.prod.yml` to the droplet and writes `/opt/pip-analysis/.env.production` before restarting the stack.

## DNS and TLS

1. Point `fmrl.tryambakam.space` to the droplet IP.
2. Issue a Let's Encrypt certificate on the droplet for `fmrl.tryambakam.space`.
3. Confirm the certificate files exist at:
   - `/etc/letsencrypt/live/fmrl.tryambakam.space/fullchain.pem`
   - `/etc/letsencrypt/live/fmrl.tryambakam.space/privkey.pem`

The frontend container expects the certificate path to match `APP_DOMAIN`.

## Supabase auth settings

In Supabase Auth:

- Keep the provider callback URL for Discord as:
  - `https://qjnqdhvlxdmezxdnlrbj.supabase.co/auth/v1/callback`
- Add these redirect URLs:
  - `http://localhost:5173/`
  - `https://tauri.localhost/`
  - `https://fmrl.tryambakam.space/`

Without the deployed web redirect URL, Discord login can succeed at the provider and still fail on the way back into the app.

## Manual production deploy

If you want to deploy without GitHub Actions:

1. Copy `.env.production.example` to `.env.production`
2. Set `APP_DOMAIN=fmrl.tryambakam.space`
3. Run:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml pull
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --force-recreate
```

## Tauri macOS release path

This repo already has a Tauri v2 desktop app in `frontend/src-tauri`.

For a public macOS build you still need:

- Apple Developer Program access for the team that will sign the app
- signing certificates installed on the release machine
- notarization credentials configured for the Tauri build
- a production test of camera permissions, Discord login, and backend bootstrap in the signed bundle

Expo is not part of this release path. This app is built with Tauri, not Expo/React Native.
