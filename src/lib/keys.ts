// Key management: store, retrieve, validate, and clear provider API keys.
// Keys live in memory always; optionally in sessionStorage (default) or localStorage ("remember").
// The key value never travels to our backend — validation goes directly to the provider.

import { setMode } from "./mode";

export type Provider = "gemini" | "openai" | "anthropic";

interface StoredKey {
  provider: Provider;
  key: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

const STORAGE_KEY = "ovando_provider_key";

// ── In-memory store ───────────────────────────────────────────────────────────

let _key: StoredKey | null = null;

function readStorage(): StoredKey | null {
  for (const store of [sessionStorage, localStorage]) {
    const raw = store.getItem(STORAGE_KEY);
    if (raw) { try { return JSON.parse(raw) as StoredKey; } catch {} }
  }
  return null;
}

// Initialise from storage on module load — if a key exists, switch to live mode immediately.
_key = readStorage();
if (_key) setMode("live");

// ── Public API ────────────────────────────────────────────────────────────────

export function getKey(): StoredKey | null { return _key; }

/**
 * Store a key. Always writes to sessionStorage; also to localStorage when persist = true.
 * Switches the app to live mode automatically.
 */
export function setKey(provider: Provider, key: string, persist: boolean): void {
  _key = { provider, key };
  const serialised = JSON.stringify(_key);
  sessionStorage.setItem(STORAGE_KEY, serialised);
  if (persist) localStorage.setItem(STORAGE_KEY, serialised);
  else localStorage.removeItem(STORAGE_KEY);
  setMode("live");
}

/** Remove the key from memory and all storage. Switches back to replay mode. */
export function clearKey(): void {
  _key = null;
  sessionStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(STORAGE_KEY);
  setMode("replay");
}

// ── Validation ────────────────────────────────────────────────────────────────
// Each call goes directly to the provider — never touches our backend.

function friendlyError(status: number, body: unknown): string {
  const msg = (body as { error?: { message?: string }; message?: string } | null)?.error?.message
    ?? (body as { message?: string } | null)?.message;
  if (status === 400) return "Invalid request — check the key format.";
  if (status === 401 || status === 403) return "Key rejected — check for typos or revoked credentials.";
  if (status === 429) return "Rate limited — key looks valid but quota is exhausted.";
  return msg ?? `Unexpected response (${status}).`;
}

export async function validateKey(provider: Provider, key: string): Promise<ValidationResult> {
  try {
    let res: Response;

    if (provider === "gemini") {
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`,
        { signal: AbortSignal.timeout(8000) },
      );
    } else if (provider === "openai") {
      res = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(8000),
      });
    } else {
      // anthropic — requires the special browser-access header
      res = await fetch("https://api.anthropic.com/v1/models", {
        headers: {
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        signal: AbortSignal.timeout(8000),
      });
    }

    if (res.ok) return { valid: true };
    const body = await res.json().catch(() => null);
    return { valid: false, error: friendlyError(res.status, body) };
  } catch (e) {
    if (e instanceof DOMException && (e.name === "TimeoutError" || e.name === "AbortError")) {
      return { valid: false, error: "Validation timed out — check your connection." };
    }
    return { valid: false, error: e instanceof Error ? e.message : "Validation failed." };
  }
}
