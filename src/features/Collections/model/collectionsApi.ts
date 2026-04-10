const API_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" ? window.location.origin : "");

const COLLECTIONS_REQUEST_TIMEOUT_MS = 15_000;

const fetchWithTimeout = async (url: string, options?: RequestInit) => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    COLLECTIONS_REQUEST_TIMEOUT_MS,
  );

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("收藏庫載入逾時，請重新整理後再試");
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
};

const buildAuthHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
});

const buildJsonHeaders = (token: string) => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`,
});

const readErrorMessage = async (res: Response, fallback: string) => {
  const text = await res.text().catch(() => "");
  if (!text) return `${fallback} (${res.status})`;
  try {
    const json = JSON.parse(text) as { error?: unknown };
    return typeof json.error === "string"
      ? `${json.error} (${res.status})`
      : `${fallback} (${res.status})`;
  } catch {
    return `${fallback} (${res.status}): ${text.slice(0, 160)}`;
  }
};

export const collectionsApi = {
  buildAuthHeaders,
  buildJsonHeaders,
  async fetchCollections(token: string, ownerId: string) {
    if (!API_URL) {
      throw new Error("尚未設定收藏庫 API 位置 (API_URL)");
    }
    const res = await fetchWithTimeout(
      `${API_URL}/api/collections?owner_id=${encodeURIComponent(ownerId)}`,
      { headers: buildAuthHeaders(token) },
    );
    if (!res.ok) {
      throw new Error(
        await readErrorMessage(res, "Failed to load collections"),
      );
    }
    const payload = await res.json().catch(() => null);
    const data = payload?.data ?? payload?.items ?? payload;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.items)) return data.items;
    return [];
  },
  async fetchCollectionItems(token: string, collectionId: string) {
    if (!API_URL) {
      throw new Error("API_URL is missing");
    }
    const res = await fetchWithTimeout(
      `${API_URL}/api/collections/${collectionId}/items/all`,
      { headers: buildAuthHeaders(token) },
    );
    if (!res.ok) {
      throw new Error(await readErrorMessage(res, "Failed to load items"));
    }
    const payload = await res.json().catch(() => null);
    const data = payload?.data ?? payload?.items ?? payload;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.items)) return data.items;
    return [];
  },
  async createCollectionReadToken(token: string, collectionId: string) {
    if (!API_URL) {
      throw new Error("尚未設定收藏庫 API 位置 (API_URL)");
    }
    const res = await fetch(`${API_URL}/api/collections/${collectionId}/read-token`, {
      method: "POST",
      headers: buildJsonHeaders(token),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(
        typeof json?.error === "string"
          ? `${json.error} (${res.status})`
          : `Failed to create collection read token (${res.status})`,
      );
    }
    return json?.data ?? null;
  },
  async createCollection(
    token: string,
    payload: {
      owner_id: string;
      title: string;
      description?: string | null;
      visibility?: string;
    },
  ) {
    if (!API_URL) {
      throw new Error("尚未設定收藏庫 API 位置 (API_URL)");
    }
    const res = await fetch(`${API_URL}/api/collections`, {
      method: "POST",
      headers: buildJsonHeaders(token),
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(
        typeof json?.error === "string"
          ? `${json.error} (${res.status})`
          : `Failed to create collection (${res.status})`,
      );
    }
    return json?.data ?? null;
  },
  async updateCollection(
    token: string,
    collectionId: string,
    payload: { title?: string; visibility?: "private" | "public" },
  ) {
    if (!API_URL) {
      throw new Error("尚未設定收藏庫 API 位置 (API_URL)");
    }
    const res = await fetch(`${API_URL}/api/collections/${collectionId}`, {
      method: "PATCH",
      headers: buildJsonHeaders(token),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(
        await readErrorMessage(res, "Failed to update collection"),
      );
    }
    return null;
  },
  async insertCollectionItems(
    token: string,
    collectionId: string,
    items: Array<Record<string, unknown>>,
  ) {
    if (!API_URL) {
      throw new Error("尚未設定收藏庫 API 位置 (API_URL)");
    }
    const res = await fetch(
      `${API_URL}/api/collections/${collectionId}/items`,
      {
        method: "POST",
        headers: buildJsonHeaders(token),
        body: JSON.stringify({ items }),
      },
    );
    if (!res.ok) {
      throw new Error(await readErrorMessage(res, "Failed to insert items"));
    }
    return null;
  },
  async updateCollectionItem(
    token: string,
    itemId: string,
    payload: Record<string, unknown>,
  ) {
    if (!API_URL) {
      throw new Error("尚未設定收藏庫 API 位置 (API_URL)");
    }
    const res = await fetch(`${API_URL}/api/collection-items/${itemId}`, {
      method: "PATCH",
      headers: buildJsonHeaders(token),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(await readErrorMessage(res, "Failed to update items"));
    }
    return null;
  },
  async deleteCollectionItem(token: string, itemId: string) {
    if (!API_URL) {
      throw new Error("尚未設定收藏庫 API 位置 (API_URL)");
    }
    const res = await fetch(`${API_URL}/api/collection-items/${itemId}`, {
      method: "DELETE",
      headers: buildAuthHeaders(token),
    });
    if (!res.ok) {
      throw new Error(await readErrorMessage(res, "Failed to delete items"));
    }
    return null;
  },
  async resolveYoutubeChannelId(
    token: string,
    payload: { videoUrl?: string; channelUrl?: string; value?: string },
  ) {
    if (!API_URL) {
      throw new Error("尚未設定收藏庫 API 位置 (API_URL)");
    }
    const res = await fetch(`${API_URL}/api/youtube/resolve-channel-id`, {
      method: "POST",
      headers: buildJsonHeaders(token),
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(json?.error ?? "Failed to resolve channel id");
    }
    return json?.data?.channelId ?? null;
  },
};
