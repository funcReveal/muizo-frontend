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

const CREATE_DRAFT_SESSION_KEY = "muizo:collection-create:draft";

type PersistedDraft = { collectionId: string; itemFingerprint: string; batchKey: string };

const readPersistedDraft = (): PersistedDraft | null => {
  try {
    const raw = sessionStorage.getItem(CREATE_DRAFT_SESSION_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<PersistedDraft>;
    return typeof value.collectionId === "string" && typeof value.itemFingerprint === "string" && typeof value.batchKey === "string"
      ? (value as PersistedDraft)
      : null;
  } catch {
    return null;
  }
};

const persistDraft = (value: PersistedDraft) => {
  try { sessionStorage.setItem(CREATE_DRAFT_SESSION_KEY, JSON.stringify(value)); } catch { /* private browsing storage is optional */ }
};

const clearPersistedDraft = () => {
  try { sessionStorage.removeItem(CREATE_DRAFT_SESSION_KEY); } catch { /* no-op */ }
};

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
  collectionDescription: string;
  visibility: "private" | "public";
  draftPlaylistItems: DraftPlaylistItem[];
  reachedCollectionLimit: boolean;
  reachedPrivateCollectionLimit: boolean;
  maxCollectionsPerUser: number;
  maxPrivateCollectionsPerUser: number;
  isDraftOverflow: boolean;
  draftOverflowCount: number;
  playlistSource: "url" | "youtube" | "favorites";
  categoryId: string | null;
  subTagKeys: string[];
  onDraftOverflow: () => void;
  onCreated: (collectionId: string) => void;
};

export function useCollectionCreateSubmit({
  apiUrl,
  authToken,
  ownerId,
  refreshAuthToken,
  collectionTitle,
  collectionDescription,
  visibility,
  draftPlaylistItems,
  reachedCollectionLimit,
  reachedPrivateCollectionLimit,
  maxCollectionsPerUser,
  maxPrivateCollectionsPerUser,
  isDraftOverflow,
  draftOverflowCount,
  playlistSource,
  categoryId,
  subTagKeys,
  onDraftOverflow,
  onCreated,
}: UseCollectionCreateSubmitArgs) {
  const [createError, setCreateError] = useState<string | null>(null);
  const [recoverableDraftId, setRecoverableDraftId] = useState<string | null>(null);
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
      setCreateError("請先登入或建立帳號後再建立收藏");
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
    setRecoverableDraftId(null);
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
        const defaultEndSec = Math.min(DEFAULT_DURATION_SEC, safeDuration);
        const startSec = Math.min(
          Math.max(0, Math.floor(item.startSec ?? 0)),
          safeDuration - 1,
        );
        const endSec = Math.min(
          safeDuration,
          Math.max(startSec + 1, Math.floor(item.endSec ?? defaultEndSec)),
        );
        const id = createServerId();
        const videoId = extractVideoId(item.url ?? "");
        const provider = videoId ? "youtube" : "manual";
        // A draft key survives a reload; do not use the random database id as the source identity.
        // The server uses provider + source_id to make a retried batch deduplicate correctly.
        const sourceId = videoId ?? item.draftKey ?? id;

        return {
          id,
          sort: idx,
          provider,
          source_id: sourceId,
          title: item.title || item.answerText || "Untitled",
          channel_title: item.uploader ?? null,
          channel_id: item.channelId ?? null,
          start_sec: startSec,
          end_sec: endSec,
          answer_text: item.answerText || item.title || "Untitled",
          answer_status: item.answerStatus ?? "original",
          answer_ai_provider: item.answerAiProvider ?? null,
          answer_ai_updated_at:
            item.answerAiUpdatedAt !== null &&
            item.answerAiUpdatedAt !== undefined
              ? new Date(item.answerAiUpdatedAt * 1000).toISOString()
              : null,
          answer_ai_batch_key: item.answerAiBatchKey ?? null,
          ...(durationSec ? { duration_sec: durationSec } : {}),
        };
      });

      setCreateStageLabel("正在建立可恢復的草稿");
      setCreateProgress({ completed: 2, total: 3 });

      const normalizedDescription = collectionDescription.trim();
      const itemFingerprint = JSON.stringify(insertItems);
      const persisted = readPersistedDraft();
      const draft = persisted
        ? { id: persisted.collectionId }
        : await collectionsApi.createDraft(token, collectionTitle.trim());
      if (!draft?.id) {
        throw new Error("Missing collection id");
      }
      const batchKey = persisted?.itemFingerprint === itemFingerprint
        ? persisted.batchKey
        : createServerId();
      persistDraft({ collectionId: draft.id, itemFingerprint, batchKey });
      setRecoverableDraftId(draft.id);

      await collectionsApi.updateCollection(token, draft.id, {
        title: collectionTitle.trim(),
        description: normalizedDescription.length > 0 ? normalizedDescription : null,
        visibility,
        category_id: categoryId ?? null,
        sub_tag_keys: subTagKeys ?? [],
      });

      setCreateStageLabel("正在安全儲存歌曲資料");
      await collectionsApi.saveDraftItems(token, draft.id, batchKey, insertItems);

      setCreateStageLabel(visibility === "public" ? "正在檢查並公開題庫" : "正在完成私人題庫");
      await collectionsApi.publishDraft(token, draft.id, visibility);
      clearPersistedDraft();
      setRecoverableDraftId(null);

      setCreateStageLabel("正在開啟收藏編輯頁");
      setCreateProgress({ completed: 3, total: 3 });

      trackEvent("collection_create_success", {
        collection_id: draft.id,
        collection_visibility: visibility,
        item_count: insertItems.length,
        import_source: playlistSource,
      });

      onCreated(draft.id);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "建立收藏失敗";
      setCreateError(readPersistedDraft()
        ? `${detail}。草稿已安全保留，可重新嘗試或前往編輯。`
        : detail);
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
    collectionDescription,
    draftPlaylistItems,
    categoryId,
    subTagKeys,
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
    recoverableDraftId,
    isCreating,
    createStageLabel,
    createProgress,
    handleCreateCollection,
  };
}
