// Beta access gate — a SOFT, client-side gate (the app is BYOK, so bypassing it gains nothing
// costly). It controls who enters the private beta, not anything paid. For real gating we'd
// validate server-side and issue a token; this is deliberately lightweight for the invite beta.

const KEY = "fopm.access";

// The invite password(s) that unlock the beta. Client-side, so treat as an invite code, not a
// secret — anyone can read it from the bundle. Swap to a server check when that matters.
const INVITE_PASSWORDS = ["Godzilla"];

export function hasAccess(): boolean {
  try {
    return localStorage.getItem(KEY) === "granted";
  } catch {
    return false;
  }
}

export function grantAccess(): void {
  try {
    localStorage.setItem(KEY, "granted");
  } catch {
    // ignore
  }
}

/** True if the entered password matches an invite code (trimmed, case-sensitive). */
export function checkPassword(input: string): boolean {
  const v = input.trim();
  return INVITE_PASSWORDS.some((p) => p === v);
}
