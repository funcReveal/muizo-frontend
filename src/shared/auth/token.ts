const AUTH_EXP_STORAGE_KEY = "authExp";

const decodeBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  );
  try {
    return atob(padded);
  } catch {
    return null;
  }
};

export const getTokenExpiryMs = (token: string | null): number | null => {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;
  const decoded = decodeBase64Url(parts[1]);
  if (!decoded) return null;
  try {
    const payload = JSON.parse(decoded) as { exp?: number };
    if (typeof payload.exp === "number") {
      return payload.exp * 1000;
    }
  } catch {
    return null;
  }
  return null;
};

export const persistTokenExpiry = (token: string | null) => {
  if (typeof window === "undefined") return;
  const expMs = getTokenExpiryMs(token);
  if (!expMs) return;
  window.localStorage.setItem(AUTH_EXP_STORAGE_KEY, String(expMs));
};

export const clearTokenExpiry = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_EXP_STORAGE_KEY);
};

export const getStoredTokenExpiry = () => {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(AUTH_EXP_STORAGE_KEY);
  const parsed = stored ? Number(stored) : NaN;
  if (!Number.isFinite(parsed)) return null;
  return parsed;
};

export const isTokenFresh = (
  token: string | null,
  leewayMs = 60_000,
): boolean => {
  const expMs = getTokenExpiryMs(token) ?? getStoredTokenExpiry();
  if (!expMs) return false;
  return Date.now() < expMs - leewayMs;
};

export const ensureFreshAuthToken = async (opts: {
  token: string | null;
  refreshAuthToken: () => Promise<string | null>;
  leewayMs?: number;
}) => {
  const { token, refreshAuthToken, leewayMs } = opts;
  if (!token) return null;
  if (isTokenFresh(token, leewayMs)) return token;
  const refreshed = await refreshAuthToken();
  return refreshed ?? null;
};
