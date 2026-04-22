/**
 * SelemeneAuthBridge — Bridges Supabase auth to Selemene's own auth system.
 *
 * When a user signs into FMRL via Supabase, this service auto-registers/logs
 * them into the Selemene Engine API so the app can make authenticated engine calls.
 *
 * Flow:
 * 1. Supabase SIGNED_IN fires with user email
 * 2. Attempt login on Selemene with stored credentials
 * 3. If login fails (no account), auto-register then login
 * 4. Store Selemene JWT + bridge credentials in localStorage
 * 5. Re-authenticate automatically on page reload
 */
import { SelemeneClient, SelemeneApiError } from './SelemeneClient';
import type { SelemeneAuthResponse } from '../types/selemene';

const STORAGE_KEY = 'fmrl_selemene_bridge';

interface BridgeCredentials {
  email: string;
  password: string;
}

export type SelemeneConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

export interface SelemeneAuthState {
  status: SelemeneConnectionStatus;
  token: string | null;
  userId: string | null;
  tier: string | null;
  error: string | null;
}

function generateBridgePassword(email: string): string {
  // Deterministic-ish password that meets Selemene's rules (8+ chars, upper, lower, digit)
  // Uses a prefix + base64 of the email to create a unique-per-user password
  const encoded = btoa(email).replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);
  return `Fmrl1_${encoded}`;
}

function loadCredentials(): BridgeCredentials | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BridgeCredentials;
  } catch {
    return null;
  }
}

function saveCredentials(creds: BridgeCredentials): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(creds));
}

function clearCredentials(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Attempt to authenticate with Selemene using stored or generated credentials.
 * Auto-registers if the account doesn't exist yet.
 */
export async function bridgeAuthenticate(
  client: SelemeneClient,
  supabaseEmail: string,
  supabaseDisplayName?: string,
): Promise<SelemeneAuthState> {
  // 1. Check for stored bridge credentials
  const stored = loadCredentials();
  const email = stored?.email ?? supabaseEmail;
  const password = stored?.password ?? generateBridgePassword(supabaseEmail);

  // 2. Try login first (fast path for returning users)
  try {
    const resp = await client.login(email, password);
    saveCredentials({ email, password });
    return authResponseToState(resp);
  } catch (err) {
    if (!(err instanceof SelemeneApiError)) {
      return errorState(`Network error: ${err instanceof Error ? err.message : 'unknown'}`);
    }

    // Not a 401/auth issue — might be rate limited, server down, etc.
    if (err.statusCode !== 401 && err.statusCode !== 422) {
      return errorState(`Selemene API error: ${err.message}`);
    }
  }

  // 3. Login failed — try to register
  try {
    await client.register(
      supabaseEmail,
      generateBridgePassword(supabaseEmail),
      supabaseDisplayName || supabaseEmail.split('@')[0],
    );
  } catch (err) {
    const isAlreadyExists =
      (err instanceof SelemeneApiError && err.statusCode === 409) ||
      (err instanceof Error && /already exists/i.test(err.message));

    if (isAlreadyExists) {
      // Account exists — stored password may be stale. Clear and retry login
      // with a freshly generated password.
      clearCredentials();
      const freshPassword = generateBridgePassword(supabaseEmail);
      try {
        const resp = await client.login(supabaseEmail, freshPassword);
        saveCredentials({ email: supabaseEmail, password: freshPassword });
        return authResponseToState(resp);
      } catch {
        // Login still fails — credentials genuinely mismatched; fall through
        // so the caller can use the fallback API key instead of blocking.
        return errorState('Selemene bridge auth failed — will use fallback key if available');
      }
    }
    if (err instanceof SelemeneApiError) {
      return errorState(`Registration failed: ${err.message}`);
    }
    return errorState(`Registration error: ${err instanceof Error ? err.message : 'unknown'}`);
  }

  // 4. Registration succeeded — now login
  try {
    const newPassword = generateBridgePassword(supabaseEmail);
    const resp = await client.login(supabaseEmail, newPassword);
    saveCredentials({ email: supabaseEmail, password: newPassword });
    return authResponseToState(resp);
  } catch (err) {
    return errorState(`Login after registration failed: ${err instanceof Error ? err.message : 'unknown'}`);
  }
}

/**
 * Clear the bridge state (on sign-out).
 */
export function bridgeDisconnect(): SelemeneAuthState {
  // Keep credentials for next login — only clear the token state
  return {
    status: 'disconnected',
    token: null,
    userId: null,
    tier: null,
    error: null,
  };
}

/**
 * Full reset — clears stored credentials too.
 */
export function bridgeReset(): void {
  clearCredentials();
}

function authResponseToState(resp: SelemeneAuthResponse): SelemeneAuthState {
  return {
    status: 'connected',
    token: resp.token,
    userId: resp.user_id,
    tier: resp.tier,
    error: null,
  };
}

function errorState(message: string): SelemeneAuthState {
  console.warn('[SelemeneAuthBridge]', message);
  return {
    status: 'error',
    token: null,
    userId: null,
    tier: null,
    error: message,
  };
}
