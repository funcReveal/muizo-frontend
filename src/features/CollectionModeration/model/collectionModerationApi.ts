import { API_URL } from "@domain/room/constants";
import { ensureFreshAuthToken } from "@shared/auth/token";

type RequestReviewParams = {
  collectionId: string;
  authToken: string | null;
  refreshAuthToken: () => Promise<string | null>;
};

export class CollectionModerationApiError extends Error {
  status: number;
  code: string | null;

  constructor(message: string, status: number, code?: string | null) {
    super(message);
    this.status = status;
    this.code = code ?? null;
  }
}

export const collectionModerationApi = {
  /**
   * Owner resubmits a flagged collection for admin review
   * (action_required -> under_review).
   */
  async requestReview({
    collectionId,
    authToken,
    refreshAuthToken,
  }: RequestReviewParams): Promise<void> {
    if (!API_URL) {
      throw new Error("API_URL 未設定");
    }

    const trimmedCollectionId = collectionId.trim();
    if (!trimmedCollectionId) {
      throw new Error("collectionId is required");
    }

    if (!authToken) {
      throw new CollectionModerationApiError(
        "請先登入後再送出審核",
        401,
        "UNAUTHORIZED",
      );
    }

    const token = await ensureFreshAuthToken({
      token: authToken,
      refreshAuthToken,
    });

    const response = await fetch(
      `${API_URL}/api/collections/${encodeURIComponent(
        trimmedCollectionId,
      )}/request-review`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
    );

    const raw = (await response.json().catch(() => null)) as {
      ok?: boolean;
      success?: boolean;
      error?: string | { code?: string; message?: string };
      code?: string;
    } | null;

    // Tolerate both the legacy { ok, error: string } and the migrated
    // { success, error: { code, message } } shapes.
    const ok = raw?.ok ?? raw?.success;
    const errorObject =
      raw?.error && typeof raw.error === "object" ? raw.error : null;

    if (!response.ok || !ok) {
      throw new CollectionModerationApiError(
        (errorObject ? errorObject.message : (raw?.error as string | undefined)) ??
          "送出審核失敗",
        response.status,
        errorObject ? errorObject.code : raw?.code,
      );
    }
  },
};
