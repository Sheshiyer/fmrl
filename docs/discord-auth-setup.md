# Discord Auth Setup

## Discord Developer Portal

Create or open your Discord application, then configure:

- `OAuth2 > General`
- `Redirects`

Add this provider callback URL:

- `https://qjnqdhvlxdmezxdnlrbj.supabase.co/auth/v1/callback`

## Supabase Dashboard

In your Supabase project, configure:

- `Authentication > Providers > Discord`
- Enable the Discord provider
- Paste the Discord `Client ID`
- Paste the Discord `Client Secret`

Then update:

- `Authentication > URL Configuration`

Recommended redirect URLs:

- `http://localhost:5173/` for Vite/Tauri dev
- `https://tauri.localhost/` for the bundled Tauri desktop app

You can optionally force the frontend redirect target with:

- `VITE_SUPABASE_AUTH_REDIRECT_URL`

If that variable is unset, the app falls back to the current window origin.

## Frontend Runtime

Set these variables in `frontend/.env.local`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_URL`
- optional `VITE_SUPABASE_AUTH_REDIRECT_URL`

## App Behavior

The frontend now:

- exposes `Continue with Discord` in the auth modal
- uses a configurable OAuth redirect target
- syncs the authenticated Supabase user into the persistence user ID automatically
- preserves manually configured persistence IDs unless auth explicitly claimed them
