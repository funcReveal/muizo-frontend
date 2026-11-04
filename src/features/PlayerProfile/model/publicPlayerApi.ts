export type PublicPlayer = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string;
  joinedAt: string;
  totalMatches: number;
  bestCombo: number;
  publicCollectionCount: number;
  canEdit: boolean;
};

export type PublicCollection = {
  id: string;
  title: string;
  description: string | null;
  coverThumbnailUrl: string | null;
  itemCount: number;
  useCount: number;
};

export type PublicCollectionPage = { items: PublicCollection[]; page: number; pageSize: number; total: number };

const API_URL = import.meta.env.VITE_API_URL || window.location.origin;

export class PlayerProfileError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 12_000);
  const signal = options.signal ? AbortSignal.any([options.signal, controller.signal]) : controller.signal;
  try {
    const response = await fetch(`${API_URL}${path}`, { ...options, signal });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.data) throw new PlayerProfileError(
      payload?.error?.message || "目前無法載入玩家資料，請稍後再試", response.status,
    );
    return payload.data as T;
  } finally { window.clearTimeout(timer); }
}

export const playerProfilePath = (reference: string) => `/players/${encodeURIComponent(reference)}`;
export const playerQueryKey = (reference: string, viewerId?: string | null) => ["public-player", reference, viewerId ?? "public"] as const;

export const fetchPublicPlayer = (reference: string, signal?: AbortSignal, token?: string | null) =>
  request<PublicPlayer>(`/api/players/${encodeURIComponent(reference)}`, { signal, headers: token ? { Authorization: `Bearer ${token}` } : undefined });

export const fetchPublicCollections = (reference: string, page: number, signal?: AbortSignal) =>
  request<PublicCollectionPage>(`/api/players/${encodeURIComponent(reference)}/collections?page=${page}&pageSize=12`, { signal });

export const savePublicBio = (token: string, bio: string) => request<PublicPlayer>("/api/players/me/bio", {
  method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ bio }),
});
