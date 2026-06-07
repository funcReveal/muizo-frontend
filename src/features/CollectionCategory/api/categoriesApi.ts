const API_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" ? window.location.origin : "");

export type CategoryTreeItem = {
  id: string;
  key: string;
  label: string;
  sort: number;
  children: Array<{
    id: string;
    key: string;
    label: string;
    sort: number;
  }>;
};

export type SubTagItem = {
  key: string;
  label: string;
  sort: number;
};

export type CategoryDetectResult = {
  categoryKey: string | null;
  subTagKeys: string[];
  confidence: "high" | "medium" | "low" | "none";
};

export type DetectItemInput = {
  channelId?: string | null;
  channelTitle?: string | null;
  title?: string | null;
  answerText?: string | null;
};

export const categoriesApi = {
  async getCategories(): Promise<CategoryTreeItem[]> {
    const res = await fetch(`${API_URL}/api/categories`);
    if (!res.ok) throw new Error(`Failed to load categories (${res.status})`);
    const json = await res.json().catch(() => null);
    return json?.data ?? [];
  },

  async getSubTags(): Promise<SubTagItem[]> {
    const res = await fetch(`${API_URL}/api/sub-tags`);
    if (!res.ok) throw new Error(`Failed to load sub-tags (${res.status})`);
    const json = await res.json().catch(() => null);
    return json?.data ?? [];
  },

  /** Detect from a saved collection (edit flow) */
  async detectCategory(
    token: string,
    collectionId: string,
  ): Promise<CategoryDetectResult> {
    const res = await fetch(
      `${API_URL}/api/collections/${collectionId}/category-detect`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    if (!res.ok) throw new Error(`Detection failed (${res.status})`);
    const json = await res.json().catch(() => null);
    return json?.data ?? { categoryKey: null, subTagKeys: [], confidence: "none" };
  },

  /** Detect from draft items (create flow — no collectionId needed) */
  async detectCategoryFromItems(
    token: string,
    items: DetectItemInput[],
  ): Promise<CategoryDetectResult> {
    const res = await fetch(`${API_URL}/api/category-detect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ items }),
    });
    if (!res.ok) throw new Error(`Detection failed (${res.status})`);
    const json = await res.json().catch(() => null);
    return json?.data ?? { categoryKey: null, subTagKeys: [], confidence: "none" };
  },
};
