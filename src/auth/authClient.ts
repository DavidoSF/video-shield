const LOGIN_URL = import.meta.env.VITE_STREAMIX_AUTH_LOGIN_URL ?? "https://localhost:3001/auth/login";

const EXPIRY_SAFETY_MARGIN_MS = 5_000;
const STORAGE_KEY = "videoshield.session";

type Session = {
  token: string;
  email: string;
  expiresAt: number;
};

// The long-lived login session is persisted so a page refresh keeps the user
// signed in (like any web app). The short-lived HLS *key* token is NOT stored
// here — that one stays in module memory only (see streamix/streamixClient.ts),
// per the security team's rule.
let session: Session | null = restoreSession();

function restoreSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Session;
    if (!parsed.token || parsed.expiresAt <= Date.now()) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function persistSession(next: Session | null): void {
  try {
    if (next) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Ignore storage failures (private mode, quota) — session still works in memory.
  }
}

export async function login(email: string, password: string): Promise<string> {
  const response = await fetch(LOGIN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ reason: "login_failed" }));
    throw new Error(body.reason ?? "login_failed");
  }

  const data = await response.json();

  session = {
    token: data.session_token,
    email: data.email,
    expiresAt: Date.now() + data.expires_in * 1000 - EXPIRY_SAFETY_MARGIN_MS,
  };

  persistSession(session);

  return session.email;
}

export function logout(): void {
  session = null;
  persistSession(null);
}

export function getSessionToken(): string | null {
  if (session && session.expiresAt > Date.now()) {
    return session.token;
  }

  // Expired: clear so the app falls back to the login screen.
  if (session) {
    logout();
  }

  return null;
}

export function getSessionEmail(): string | null {
  if (session && session.expiresAt > Date.now()) {
    return session.email;
  }
  return null;
}

// True if a non-expired session was restored (used to skip the login screen on load).
export function hasValidSession(): boolean {
  return getSessionToken() !== null;
}
