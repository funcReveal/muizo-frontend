import type { AuthUser } from "../../../shared/auth/AuthContext";
import type { RoomSummary } from "./types";

export type ApiResult<T> = {
  ok: boolean;
  status: number;
  payload: T | null;
};

export type AuthClientType = "web" | "native";

export type AuthErrorDetail =
  | {
      access_token?: string;
      refresh_token?: string;
      id_token?: string;
      expires_in?: number;
      token_type?: string;
      scope?: string;
    }
  | {
      ok?: boolean;
      data?: AuthUser | null;
      error?: string;
    };

export type AuthPayload = {
  ok?: boolean;
  token?: string;
  refreshToken?: string;
  user?: AuthUser | null;
  error?: string;
  error_code?: string;
  detail?: AuthErrorDetail;
};

export type UserProfilePayload = {
  ok?: boolean;
  data?: AuthUser | null;
  error?: string;
};

export type RoomListPayload = {
  rooms?: RoomSummary[];
  error?: string;
};

export type RoomByIdPayload = {
  room?: RoomSummary;
  error?: string;
  error_code?: string;
};

export type SitePresenceHttpPayload = {
  onlineCount?: number;
  updatedAt?: number;
  error?: string;
};

const API_REQUEST_TIMEOUT_MS = 15_000;

const fetchJson = async <T>(
  url: string,
  options?: RequestInit,
): Promise<ApiResult<T>> => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    API_REQUEST_TIMEOUT_MS,
  );

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    const payload = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, payload };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return {
        ok: false,
        status: 408,
        payload: { error: "請求逾時，請稍後再試" } as T,
      };
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
};

export const apiRefreshAuthToken = (
  apiUrl: string,
  params: {
    clientType: AuthClientType;
    refreshToken?: string | null;
  },
) =>
  fetchJson<AuthPayload>(`${apiUrl}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: params.clientType === "web" ? "include" : "omit",
    body: JSON.stringify({
      clientType: params.clientType,
      refreshToken:
        params.clientType === "native"
          ? (params.refreshToken ?? null)
          : undefined,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? null,
    }),
  });

export const apiUpsertCurrentUser = (
  apiUrl: string,
  token: string,
  payload: {
    display_name: string;
    email?: string | null;
    avatar_url?: string | null;
  },
) =>
  fetchJson<UserProfilePayload>(`${apiUrl}/api/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

export const apiFetchRooms = (apiUrl: string) =>
  fetchJson<RoomListPayload>(`${apiUrl}/api/rooms`);

export const apiFetchRoomById = (apiUrl: string, roomId: string) =>
  fetchJson<RoomByIdPayload>(`${apiUrl}/api/rooms/${roomId}`);

export const apiFetchSitePresence = (apiUrl: string) =>
  fetchJson<SitePresenceHttpPayload>(`${apiUrl}/api/site-presence`);

export const apiAuthGoogleWeb = (
  apiUrl: string,
  params: {
    code: string;
    redirectUri: string;
  },
) =>
  fetchJson<AuthPayload>(`${apiUrl}/api/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      code: params.code,
      redirectUri: params.redirectUri,
      clientType: "web",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? null,
    }),
  });

export const apiAuthGoogleNative = (
  apiUrl: string,
  params: {
    serverAuthCode: string;
    idToken?: string | null;
  },
) =>
  fetchJson<AuthPayload>(`${apiUrl}/api/auth/google/native`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "omit",
    body: JSON.stringify({
      serverAuthCode: params.serverAuthCode,
      idToken: params.idToken ?? null,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? null,
    }),
  });

export const apiLogout = (
  apiUrl: string,
  params: {
    clientType: AuthClientType;
    refreshToken?: string | null;
  },
) =>
  fetchJson<{ ok?: boolean; error?: string }>(`${apiUrl}/api/auth/logout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: params.clientType === "web" ? "include" : "omit",
    body: JSON.stringify({
      clientType: params.clientType,
      refreshToken:
        params.clientType === "native"
          ? (params.refreshToken ?? null)
          : undefined,
    }),
  });

