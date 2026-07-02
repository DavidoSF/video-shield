const LOGIN_URL = import.meta.env.VITE_STREAMIX_AUTH_LOGIN_URL ?? "https://localhost:3001/auth/login";

const EXPIRY_SAFETY_MARGIN_MS = 5_000;

type Session = {
  token: string;
  email: string;
  expiresAt: number;
};

// Session lives only in module memory: never in the URL, never in localStorage.
let session: Session | null = null;

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

  return session.email;
}

export function logout(): void {
  session = null;
}

export function getSessionToken(): string | null {
  if (session && session.expiresAt > Date.now()) {
    return session.token;
  }
  return null;
}

export function getSessionEmail(): string | null {
  return session?.email ?? null;
}
