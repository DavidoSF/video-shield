import { getSessionToken } from "../auth/authClient";

const TOKEN_URL = import.meta.env.VITE_STREAMIX_TOKEN_URL ?? "https://localhost:3001/token";

// Safety margin so we refresh slightly before the key-server actually expires the token.
const EXPIRY_SAFETY_MARGIN_MS = 5_000;

type StreamixToken = {
  token: string;
  expiresAt: number;
};

// Token lives only in module memory, per the security team's rule: never in the URL,
// never in video.m3u8, never persisted to storage.
let cachedToken: StreamixToken | null = null;
let inFlight: Promise<string> | null = null;

async function requestToken(): Promise<StreamixToken> {
  const sessionToken = getSessionToken();

  if (!sessionToken) {
    throw new Error("Not authenticated with Streamix");
  }

  const response = await fetch(TOKEN_URL, {
    headers: {
      Authorization: `Bearer ${sessionToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Streamix token request failed: ${response.status}`);
  }

  const data = await response.json();

  return {
    token: data.token as string,
    expiresAt: Date.now() + data.expires_in * 1000 - EXPIRY_SAFETY_MARGIN_MS,
  };
}

export async function getStreamixToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  if (!inFlight) {
    inFlight = requestToken()
      .then((result) => {
        cachedToken = result;
        return result.token;
      })
      .finally(() => {
        inFlight = null;
      });
  }

  return inFlight;
}

// Synchronous read of whatever token is currently cached, for use inside hls.js's
// synchronous xhrSetup hook (which cannot await getStreamixToken()).
export function peekStreamixToken(): string | null {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  return null;
}

// Called on logout: the HLS key token is tied to the user session that just ended.
export function resetStreamixToken(): void {
  cachedToken = null;
  inFlight = null;
}
