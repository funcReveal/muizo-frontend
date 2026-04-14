import { useCallback, useEffect, useRef, useState } from "react";

import { isNativeApp } from "../../../shared/platform/isNativeApp";
import {
  signOutNativeGoogle,
  startNativeGoogleLogin,
} from "./nativeGoogleAuth";

import type { AuthUser } from "../../../shared/auth/AuthContext";
import {
  clearNativeRefreshToken,
  getNativeRefreshToken,
  setNativeRefreshToken,
} from "../../../shared/auth/nativeTokenStorage";
import {
  apiAuthGoogleNative,
  apiAuthGoogleWeb,
  apiLogout,
  apiRefreshAuthToken,
  apiUpsertCurrentUser,
} from "./roomApi";
import { USERNAME_MAX } from "./roomConstants";
import { isProfileConfirmed, setProfileConfirmed } from "./roomStorage";
import {
  clearTokenExpiry,
  persistTokenExpiry,
} from "../../../shared/auth/token";
import { trackEvent } from "../../../shared/analytics/track";

const AUTH_SESSION_HINT_KEY = "hasAuthSession";

type UseRoomAuthOptions = {
  apiUrl: string;
  username: string | null;
  persistUsername: (name: string) => void;
  setStatusText: (value: string | null) => void;
  onClearAuth: () => void;
};

export type UseRoomAuthResult = {
  authToken: string | null;
  authUser: AuthUser | null;
  authLoading: boolean;
  authExpired: boolean;
  needsNicknameConfirm: boolean;
  nicknameDraft: string;
  isProfileEditorOpen: boolean;
  setNicknameDraft: (value: string) => void;
  refreshAuthToken: () => Promise<string | null>;
  confirmNickname: () => Promise<boolean>;
  openProfileEditor: () => void;
  closeProfileEditor: () => void;
  loginWithGoogle: () => void;
  logout: () => void;
};

export const useRoomAuth = ({
  apiUrl,
  username,
  persistUsername,
  setStatusText,
  onClearAuth,
}: UseRoomAuthOptions): UseRoomAuthResult => {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authExpired, setAuthExpired] = useState(false);
  const [needsNicknameConfirm, setNeedsNicknameConfirm] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState("");
  const [isProfileEditorOpen, setIsProfileEditorOpen] = useState(false);

  const googleCodeClientRef = useRef<GoogleCodeClient | null>(null);
  const googleScriptPromiseRef = useRef<Promise<void> | null>(null);
  const lastHandledAuthCodeRef = useRef<string | null>(null);
  const initialRefreshRef = useRef(false);
  const refreshInFlightRef = useRef<Promise<string | null> | null>(null);
  const lastRefreshFailAtRef = useRef<number | null>(null);

  const webRedirectUri =
    import.meta.env.VITE_GOOGLE_WEB_REDIRECT_URI ??
    `${window.location.origin}/auth/callback`;

  useEffect(() => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
  }, []);

  const hasStoredAuthSessionHint = useCallback(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(AUTH_SESSION_HINT_KEY) === "1";
  }, []);

  const clearAuth = useCallback(() => {
    setAuthToken(null);
    setAuthUser(null);
    setAuthExpired(false);
    setNeedsNicknameConfirm(false);
    setNicknameDraft("");
    setIsProfileEditorOpen(false);
    clearTokenExpiry();
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(AUTH_SESSION_HINT_KEY);
    }
    onClearAuth();
  }, [onClearAuth]);

  const persistAuth = useCallback(
    async (
      token: string,
      user: AuthUser,
      options?: {
        refreshToken?: string | null;
        clientType?: "web" | "native";
      },
    ) => {
      setAuthToken(token);
      setAuthUser(user);
      setAuthExpired(false);
      persistTokenExpiry(token);

      if (options?.clientType === "native" && options.refreshToken) {
        await setNativeRefreshToken(options.refreshToken);
      }

      if (typeof window !== "undefined") {
        window.localStorage.setItem(AUTH_SESSION_HINT_KEY, "1");
      }

      const confirmed = isProfileConfirmed(user.id);
      if (!confirmed) {
        setNicknameDraft((user.display_name ?? "").slice(0, USERNAME_MAX));
        setNeedsNicknameConfirm(true);
      }

      if (user.display_name) {
        persistUsername(user.display_name.slice(0, USERNAME_MAX));
      }
    },
    [persistUsername],
  );

  const refreshAuthToken = useCallback(async () => {
    if (!apiUrl) return null;

    if (lastRefreshFailAtRef.current) {
      const elapsed = Date.now() - lastRefreshFailAtRef.current;
      if (elapsed < 30_000) return null;
    }

    if (refreshInFlightRef.current) {
      return refreshInFlightRef.current;
    }

    const run = async () => {
      const startedAt = performance.now();
      const clientType = isNativeApp() ? "native" : "web";

      try {
        const nativeRefreshToken =
          clientType === "native" ? await getNativeRefreshToken() : null;

        if (clientType === "native" && !nativeRefreshToken) {
          setAuthExpired(true);
          lastRefreshFailAtRef.current = Date.now();
          return null;
        }

        const { ok, payload } = await apiRefreshAuthToken(apiUrl, {
          clientType,
          refreshToken: nativeRefreshToken,
        });

        if (!ok || !payload?.token || !payload.user) {
          setAuthExpired(true);
          lastRefreshFailAtRef.current = Date.now();

          if (clientType === "native") {
            await clearNativeRefreshToken();
          }

          return null;
        }

        lastRefreshFailAtRef.current = null;
        setAuthExpired(false);

        await persistAuth(payload.token, payload.user, {
          clientType,
          refreshToken:
            clientType === "native"
              ? (payload.refreshToken ?? nativeRefreshToken)
              : null,
        });

        return payload.token;
      } catch (error) {
        console.error("[mq-auth] refresh failed", {
          elapsedMs: Math.round(performance.now() - startedAt),
          error: error instanceof Error ? error.message : String(error),
        });
        setAuthExpired(true);
        lastRefreshFailAtRef.current = Date.now();
        return null;
      } finally {
        refreshInFlightRef.current = null;
      }
    };

    refreshInFlightRef.current = run();
    return refreshInFlightRef.current;
  }, [apiUrl, persistAuth]);

  const confirmNickname = useCallback(async () => {
    const trimmed = nicknameDraft.trim();

    if (!trimmed) {
      setStatusText("請先輸入暱稱");
      return false;
    }

    if (trimmed.length > USERNAME_MAX) {
      setStatusText(`暱稱最多 ${USERNAME_MAX} 個字`);
      return false;
    }

    if (apiUrl && authToken && authUser?.id) {
      const run = async (token: string, allowRetry: boolean) => {
        const { ok, status, payload } = await apiUpsertCurrentUser(
          apiUrl,
          token,
          {
            display_name: trimmed,
            email: authUser.email ?? null,
            avatar_url: authUser.avatar_url ?? null,
          },
        );

        if (ok) {
          return payload?.data ?? null;
        }

        if (status === 401 && allowRetry) {
          const refreshed = await refreshAuthToken();
          if (refreshed) {
            return run(refreshed, false);
          }
        }

        throw new Error(payload?.error ?? "更新暱稱失敗");
      };

      try {
        const nextUser = await run(authToken, true);
        setAuthUser((prev) =>
          prev
            ? {
                ...prev,
                ...(nextUser ?? {}),
                display_name: trimmed,
              }
            : prev,
        );
      } catch (error) {
        setStatusText(error instanceof Error ? error.message : "更新暱稱失敗");
        return false;
      }
    } else {
      setAuthUser((prev) => (prev ? { ...prev, display_name: trimmed } : prev));
    }

    persistUsername(trimmed);

    if (authUser?.id) {
      setProfileConfirmed(authUser.id);
    }

    setNeedsNicknameConfirm(false);
    setIsProfileEditorOpen(false);
    setStatusText("暱稱已設定");
    return true;
  }, [
    apiUrl,
    authToken,
    authUser,
    nicknameDraft,
    persistUsername,
    refreshAuthToken,
    setStatusText,
  ]);

  const openProfileEditor = useCallback(() => {
    const fallbackName = authUser?.display_name ?? username ?? "";
    setNicknameDraft(fallbackName.slice(0, USERNAME_MAX));
    setIsProfileEditorOpen(true);
  }, [authUser?.display_name, username]);

  const closeProfileEditor = useCallback(() => {
    setIsProfileEditorOpen(false);
  }, []);

  const exchangeGoogleWebCode = useCallback(
    async (code: string, redirectUri: string) => {
      if (!apiUrl) {
        setStatusText("尚未設定 API 位置 (API_URL)");
        return;
      }

      setAuthLoading(true);

      try {
        const { ok, payload } = await apiAuthGoogleWeb(apiUrl, {
          code,
          redirectUri,
        });

        if (!ok || !payload?.token || !payload.user) {
          throw new Error(payload?.error ?? "Google 登入失敗");
        }

        await persistAuth(payload.token, payload.user, {
          clientType: "web",
        });

        trackEvent("login_google_success", {
          provider: "google",
          user_type: "google",
          platform: "web",
        });

        setStatusText("Google 登入成功");
      } catch (error) {
        trackEvent("login_google_failed", {
          reason: error instanceof Error ? error.message : "unknown_error",
        });

        setStatusText(
          error instanceof Error ? error.message : "Google 登入失敗",
        );
      } finally {
        setAuthLoading(false);
      }
    },
    [apiUrl, persistAuth, setStatusText],
  );

  const loginWithGoogle = useCallback(() => {
    trackEvent("login_google_click", {
      entry: "google_oauth",
    });

    if (!apiUrl) {
      setStatusText("尚未設定 API 位置 (API_URL)");
      return;
    }

    if (isNativeApp()) {
      const run = async () => {
        setAuthLoading(true);

        try {
          const nativeAuth = await startNativeGoogleLogin();

          const { ok, payload } = await apiAuthGoogleNative(apiUrl, {
            serverAuthCode: nativeAuth.serverAuthCode!,
            idToken: nativeAuth.idToken,
          });

          if (
            !ok ||
            !payload?.token ||
            !payload.user ||
            !payload.refreshToken
          ) {
            throw new Error(payload?.error ?? "Google 原生登入失敗");
          }

          await persistAuth(payload.token, payload.user, {
            clientType: "native",
            refreshToken: payload.refreshToken,
          });

          trackEvent("login_google_success", {
            provider: "google",
            user_type: "google",
            platform: "native",
          });

          setStatusText("Google 登入成功");
        } catch (error) {
          trackEvent("login_google_failed", {
            reason: error instanceof Error ? error.message : "unknown_error",
          });

          setStatusText(
            error instanceof Error ? error.message : "Google 登入失敗",
          );
        } finally {
          setAuthLoading(false);
        }
      };

      void run();
      return;
    }

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    if (!clientId) {
      setStatusText("尚未設定 Google Client ID");
      return;
    }

    const uxMode: "popup" | "redirect" = "redirect";

    const ensureGoogleScript = () => {
      if (window.google?.accounts?.oauth2) return Promise.resolve();
      if (googleScriptPromiseRef.current) return googleScriptPromiseRef.current;

      googleScriptPromiseRef.current = new Promise<void>((resolve, reject) => {
        const existing = document.querySelector(
          "script[data-google-identity]",
        ) as HTMLScriptElement | null;

        if (existing) {
          existing.addEventListener("load", () => resolve(), { once: true });
          existing.addEventListener(
            "error",
            () => reject(new Error("Failed to load Google script")),
            { once: true },
          );
          return;
        }

        const script = document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        script.dataset.googleIdentity = "true";
        script.onload = () => resolve();
        script.onerror = () =>
          reject(new Error("Failed to load Google script"));
        document.head.appendChild(script);
      });

      return googleScriptPromiseRef.current;
    };

    void ensureGoogleScript()
      .then(() => {
        const oauth2 = window.google?.accounts?.oauth2;
        if (!oauth2) {
          setStatusText("Google 登入尚未準備完成");
          return;
        }

        const codeClient =
          googleCodeClientRef.current ??
          oauth2.initCodeClient({
            client_id: clientId,
            scope:
              "openid email profile https://www.googleapis.com/auth/youtube.readonly",
            ux_mode: uxMode,
            redirect_uri: webRedirectUri,
            access_type: "offline",
            prompt: "consent",
            include_granted_scopes: true,
            callback: (response: { code?: string; error?: string }) => {
              if (!response?.code) {
                setStatusText(response?.error ?? "Google 登入失敗");
                return;
              }
              void exchangeGoogleWebCode(response.code, webRedirectUri);
            },
          });

        googleCodeClientRef.current = codeClient;
        codeClient.requestCode();
      })
      .catch((error) => {
        setStatusText(
          error instanceof Error ? error.message : "Google 登入失敗",
        );
      });
  }, [
    apiUrl,
    exchangeGoogleWebCode,
    persistAuth,
    setStatusText,
    webRedirectUri,
  ]);

  const logout = useCallback(() => {
    const run = async () => {
      if (apiUrl) {
        const clientType = isNativeApp() ? "native" : "web";
        const nativeRefreshToken =
          clientType === "native" ? await getNativeRefreshToken() : null;

        await apiLogout(apiUrl, {
          clientType,
          refreshToken: nativeRefreshToken,
        }).catch(() => null);
      }

      await clearNativeRefreshToken();
      await signOutNativeGoogle();
      clearAuth();
      setStatusText("已登出");
    };

    void run();
  }, [apiUrl, clearAuth, setStatusText]);

  useEffect(() => {
    if (!apiUrl || initialRefreshRef.current) return;

    initialRefreshRef.current = true;

    if (!hasStoredAuthSessionHint()) {
      setAuthLoading(false);
      return;
    }

    setAuthLoading(true);
    refreshAuthToken().finally(() => setAuthLoading(false));
  }, [apiUrl, hasStoredAuthSessionHint, refreshAuthToken]);

  useEffect(() => {
    if (isNativeApp()) return;

    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");

    if (!code && !error) return;

    const signature = code ? `code:${code}` : `error:${error ?? ""}`;
    if (lastHandledAuthCodeRef.current === signature) return;
    lastHandledAuthCodeRef.current = signature;

    url.searchParams.delete("code");
    url.searchParams.delete("error");
    window.history.replaceState({}, document.title, url.toString());

    if (error) {
      setStatusText(error);
      return;
    }

    if (!code) return;

    void exchangeGoogleWebCode(code, webRedirectUri);
  }, [exchangeGoogleWebCode, setStatusText, webRedirectUri]);

  return {
    authToken,
    authUser,
    authLoading,
    authExpired,
    needsNicknameConfirm,
    nicknameDraft,
    isProfileEditorOpen,
    setNicknameDraft,
    refreshAuthToken,
    confirmNickname,
    openProfileEditor,
    closeProfileEditor,
    loginWithGoogle,
    logout,
  };
};
