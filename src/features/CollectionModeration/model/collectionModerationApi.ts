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

    const payload = (await response.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
      code?: string;
    } | null;

    if (!response.ok || !payload?.ok) {
      throw new CollectionModerationApiError(
        payload?.error ?? "送出審核失敗",
        response.status,
        payload?.code,
      );
    }
  },
};
