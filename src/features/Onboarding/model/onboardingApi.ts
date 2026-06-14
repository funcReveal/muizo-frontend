import { API_URL } from "@domain/room/constants";
import { ensureFreshAuthToken } from "@shared/auth/token";

export type OnboardingState = {
  emailVerified: boolean;
  onboardingCompleted: boolean;
  gender: string | null;
  birthDate: string | null;
  age: number | null;
  ageRestricted: boolean;
  marketingConsent: boolean;
  interestedCategories: string[];
};

export type OnboardingGender =
  | "male"
  | "female"
  | "non_binary"
  | "other"
  | "prefer_not_to_say";

type AuthParams = {
  authToken: string | null;
  refreshAuthToken: () => Promise<string | null>;
};

// Tolerates the Spring ApiEnvelope ({ success, data, error: { code, message } }) and the
// looser legacy { ok, error } shape, matching the other migrated API clients.
type Envelope<T> = {
  ok?: boolean;
  success?: boolean;
  data?: T;
  error?: string | { code?: string; message?: string } | null;
};

const isOk = (payload: Envelope<unknown> | null): boolean =>
  Boolean(payload?.success ?? payload?.ok);

const errorMessage = (
  error: Envelope<unknown>["error"] | undefined,
): string | null => {
  if (!error) return null;
  if (typeof error === "string") return error;
  return error.message ?? null;
};

const request = async <T>(
  path: string,
  method: "GET" | "PATCH" | "PUT",
  auth: AuthParams,
  body?: unknown,
): Promise<T> => {
  if (!API_URL) {
    throw new Error("尚未設定 API 位址（VITE_API_URL）");
  }
  const token = await ensureFreshAuthToken({
    token: auth.authToken,
    refreshAuthToken: auth.refreshAuthToken,
  });
  if (!token) {
    throw new Error("請先登入");
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => null)) as Envelope<T> | null;
  if (!response.ok || !isOk(payload)) {
    throw new Error(errorMessage(payload?.error) ?? "操作失敗，請稍後再試");
  }
  return payload?.data as T;
};

export const onboardingApi = {
  get: (auth: AuthParams) => request<OnboardingState>("/api/me/onboarding", "GET", auth),

  updateProfile: (
    auth: AuthParams,
    input: { gender: OnboardingGender; birthDate: string; marketingConsent?: boolean },
  ) => request<OnboardingState>("/api/me/profile", "PATCH", auth, input),

  updateInterests: (auth: AuthParams, categoryKeys: string[]) =>
    request<OnboardingState>("/api/me/interested-categories", "PUT", auth, { categoryKeys }),

  updateConsent: (auth: AuthParams, marketingConsent: boolean) =>
    request<OnboardingState>("/api/me/consent", "PATCH", auth, { marketingConsent }),
};
