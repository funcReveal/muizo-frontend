import { useCallback, useState } from "react";
import { collectionsApi } from "../../shared/api/collectionsApi";
import { ensureFreshAuthToken } from "../../../../shared/auth/token";
import { trackEvent } from "../../../../shared/analytics/track";
import { extractVideoId } from "../../../../shared/utils/youtube";
import type { DraftPlaylistItem } from "../utils/createCollectionImport";

const DEFAULT_DURATION_SEC = 30;

const parseDurationToSeconds = (duration?: string): number | null => {
  if (!duration) return null;
  const parts = duration.split(":").map((part) => Number(part));
  if (parts.some((value) => Number.isNaN(value))) return null;

  if (parts.length === 2) {
    const [m, s] = parts;
    return m * 60 + s;
  }

  if (parts.length === 3) {
    const [h, m, s] = parts;
    return h * 3600 + m * 60 + s;
  }

  return null;
};

const createServerId = () =>
  crypto.randomUUID?.() ??
  `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;

type RefreshAuthToken = Parameters<
  typeof ensureFreshAuthToken
>[0]["refreshAuthToken"];

type AuthToken = Parameters<typeof ensureFreshAuthToken>[0]["token"];

type UseCollectionCreateSubmitArgs = {
  apiUrl: string;
  authToken: AuthToken;
  ownerId: string | null;
  refreshAuthToken: RefreshAuthToken;
  collectionTitle: string;
  visibility: "private" | "public";
  draftPlaylistItems: DraftPlaylistItem[];
  reachedCollectionLimit: boolean;
  reachedPrivateCollectionLimit: boolean;
  maxCollectionsPerUser: number;
  maxPrivateCollectionsPerUser: number;
  isDraftOverflow: boolean;
  draftOverflowCount: number;
  playlistSource: "url" | "youtube";
  onDraftOverflow: () => void;
  onCreated: (collectionId: string) => void;
};

export function useCollectionCreateSubmit({
  apiUrl,
  authToken,
  ownerId,
  refreshAuthToken,
  collectionTitle,
  visibility,
  draftPlaylistItems,
  reachedCollectionLimit,
  reachedPrivateCollectionLimit,
  maxCollectionsPerUser,
  maxPrivateCollectionsPerUser,
  isDraftOverflow,
  draftOverflowCount,
  playlistSource,
  onDraftOverflow,
  onCreated,
}: UseCollectionCreateSubmitArgs) {
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createStageLabel, setCreateStageLabel] = useState<string | null>(null);
  const [createProgress, setCreateProgress] = useState<{
    completed: number;
    total: number;
  } | null>(null);

  const handleCreateCollection = useCallback(async () => {
    if (!apiUrl) {
      setCreateError("尚未設定收藏 API 位址（VITE_API_URL）");
      return;
    }

    if (!authToken || !ownerId) {
      setCreateError("請先使用 Google 登入後再建立收藏");
      return;
    }

    if (!collectionTitle.trim()) {
      setCreateError("請輸入收藏標題");
      return;
    }

    if (draftPlaylistItems.length === 0) {
      setCreateError("請先匯入播放清單");
      return;
    }

    if (reachedCollectionLimit) {
      setCreateError(
        `你目前最多只能建立 ${maxCollectionsPerUser} 個收藏庫，請先刪除或整理現有收藏。`,
      );
      return;
    }

    if (visibility === "private" && reachedPrivateCollectionLimit) {
      setCreateError(
        `私人收藏最多只能建立 ${maxPrivateCollectionsPerUser} 個，請改為公開收藏或先整理現有私人收藏。`,
      );
      return;
    }

    if (isDraftOverflow) {
      setCreateError(
        `目前超過收藏庫上限，請先移除 ${draftOverflowCount} 首歌曲後再建立。`,
      );
      onDraftOverflow();
      return;
    }

    setCreateError(null);
    setIsCreating(true);
    setCreateStageLabel("正在建立收藏庫");
    setCreateProgress({ completed: 0, total: 3 });

    try {
      const token = await ensureFreshAuthToken({
        token: authToken,
        refreshAuthToken,
      });

      if (!token) {
        throw new Error("Unauthorized");
      }

      setCreateStageLabel("正在整理歌曲資料");
      setCreateProgress({ completed: 1, total: 3 });

      const insertItems = draftPlaylistItems.map((item, idx) => {
        const durationSec =
          parseDurationToSeconds(item.duration) ?? DEFAULT_DURATION_SEC;
        const safeDuration = Math.max(1, durationSec);
        const endSec = Math.min(DEFAULT_DURATION_SEC, safeDuration);
        const id = createServerId();
        const videoId = extractVideoId(item.url ?? "");
        const provider = videoId ? "youtube" : "manual";
        const sourceId = videoId ?? id;

        return {
          id,
          sort: idx,
          provider,
          source_id: sourceId,
          title: item.title || item.answerText || "Untitled",
          channel_title: item.uploader ?? null,
          channel_id: item.channelId ?? null,
          start_sec: 0,
          end_sec: Math.max(1, endSec),
          answer_text: item.answerText || item.title || "Untitled",
          ...(durationSec ? { duration_sec: durationSec } : {}),
        };
      });

      setCreateStageLabel("正在建立收藏庫並寫入歌曲資料");
      setCreateProgress({ completed: 2, total: 3 });

      const created = await collectionsApi.createCollectionWithItems(token, {
        owner_id: ownerId,
        title: collectionTitle.trim(),
        description: null,
        visibility,
        items: insertItems,
      });

      if (!created?.id) {
        throw new Error("Missing collection id");
      }

      setCreateStageLabel("正在開啟收藏編輯頁");
      setCreateProgress({ completed: 3, total: 3 });

      trackEvent("collection_create_success", {
        collection_id: created.id,
        collection_visibility: visibility,
        item_count: insertItems.length,
        import_source: playlistSource,
      });

      onCreated(created.id);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "建立收藏失敗");
    } finally {
      setIsCreating(false);
      setCreateStageLabel(null);
      setCreateProgress(null);
    }
  }, [
    apiUrl,
    authToken,
    ownerId,
    collectionTitle,
    draftPlaylistItems,
    reachedCollectionLimit,
    maxCollectionsPerUser,
    visibility,
    reachedPrivateCollectionLimit,
    maxPrivateCollectionsPerUser,
    isDraftOverflow,
    draftOverflowCount,
    onDraftOverflow,
    refreshAuthToken,
    playlistSource,
    onCreated,
  ]);

  return {
    createError,
    isCreating,
    createStageLabel,
    createProgress,
    handleCreateCollection,
  };
}
