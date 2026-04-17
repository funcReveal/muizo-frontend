import {
  useCallback,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";

import type { DbCollection, EditableItem } from "../utils/editTypes";
import { collectionsApi } from "../../shared/api/collectionsApi";
import { isAdminRole } from "../../../../shared/auth/roles";
import { ensureFreshAuthToken } from "../../../../shared/auth/token";
import { trackEvent } from "../../../../shared/analytics/track";
import {
  MAX_COLLECTIONS_PER_USER,
  MAX_PRIVATE_COLLECTIONS_PER_USER,
  resolveCollectionItemLimit,
} from "../../shared/model/collectionLimits";

const resolveItemSource = (
  item: EditableItem,
  extractVideoId: (url?: string | null) => string | null,
) => {
  const videoId = extractVideoId(item.url);
  if (videoId) {
    return { provider: "youtube", source_id: videoId };
  }
  if (item.sourceProvider && item.sourceId) {
    return { provider: item.sourceProvider, source_id: item.sourceId };
  }
  if (item.sourceProvider) {
    const fallback =
      item.sourceId ?? item.url ?? item.dbId ?? item.localId ?? "";
    return {
      provider: item.sourceProvider,
      source_id: fallback || item.localId,
    };
  }
  if (item.url) {
    return { provider: "manual", source_id: item.url };
  }
  if (item.dbId) {
    return { provider: "manual", source_id: item.dbId };
  }
  return { provider: "manual", source_id: item.localId };
};

type UseCollectionEditorParams = {
  authToken: string | null;
  ownerId: string | null;
  authRole?: string | null;
  authPlan?: string | null;
  authExpired?: boolean;
  collectionTitle: string;
  collectionVisibility: "private" | "public";
  activeCollectionId: string | null;
  activeCollectionStoredTitle?: string | null;
  activeCollectionStoredVisibility?: "private" | "public" | null;
  activeCollectionItemLimitOverride?: number | null;
  collectionsCount: number;
  privateCollectionsCount: number;
  playlistItems: EditableItem[];
  pendingDeleteIds: string[];
  dirtyItemIdsRef: MutableRefObject<Set<string>>;
  fullItemResyncRef: MutableRefObject<boolean>;
  createServerId: () => string;
  parseDurationToSeconds: (duration?: string) => number | null;
  extractVideoId: (url?: string | null) => string | null;
  setCollections: Dispatch<SetStateAction<DbCollection[]>>;
  setActiveCollectionId: (id: string | null) => void;
  setPendingDeleteIds: (ids: string[]) => void;
  setPlaylistItems: (updater: (prev: EditableItem[]) => EditableItem[]) => void;
  setSaveStatus: (value: "idle" | "saving" | "saved" | "error") => void;
  setSaveError: (value: string | null) => void;
  showAutoSaveNotice: (type: "success" | "error", message: string) => void;
  setHasUnsavedChanges: (value: boolean) => void;
  dirtyCounterRef: React.RefObject<number>;
  saveInFlightRef: React.RefObject<boolean>;
  navigateToEdit: (id: string) => void;
  refreshAuthToken: () => Promise<string | null>;
  onAuthExpired?: () => void;
  onSaved?: () => void;
};

export const useCollectionEditor = ({
  authToken,
  ownerId,
  authRole,
  authPlan,
  authExpired,
  collectionTitle,
  collectionVisibility,
  activeCollectionId,
  activeCollectionStoredTitle,
  activeCollectionStoredVisibility,
  activeCollectionItemLimitOverride,
  collectionsCount,
  privateCollectionsCount,
  playlistItems,
  pendingDeleteIds,
  dirtyItemIdsRef,
  fullItemResyncRef,
  createServerId,
  parseDurationToSeconds,
  extractVideoId,
  setCollections,
  setActiveCollectionId,
  setPendingDeleteIds,
  setPlaylistItems,
  setSaveStatus,
  setSaveError,
  showAutoSaveNotice,
  setHasUnsavedChanges,
  dirtyCounterRef,
  saveInFlightRef,
  navigateToEdit,
  refreshAuthToken,
  onAuthExpired,
  onSaved,
}: UseCollectionEditorParams) => {
  const isAdmin = isAdminRole(authRole);
  const effectiveItemLimit = resolveCollectionItemLimit({
    role: authRole,
    plan: authPlan,
    itemLimitOverride: activeCollectionItemLimitOverride,
  });

  const isAuthError = (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    return message.includes("Unauthorized") || message.includes("401");
  };

  const syncItemsToDb = useCallback(
    async (collectionId: string, token: string) => {
      const shouldResyncAllItems = fullItemResyncRef.current;
      const dirtyItemIds = dirtyItemIdsRef.current;

      const updatePayloads = playlistItems.map((item, idx) => {
        const source = resolveItemSource(item, extractVideoId);
        return {
          localId: item.localId,
          id: item.dbId,
          sort: idx,
          provider: source.provider,
          source_id: source.source_id,
          title: item.title || item.answerText || "Untitled",
          channel_title: item.uploader ?? null,
          channel_id: item.channelId ?? null,
          start_sec: item.startSec,
          end_sec: item.endSec,
          answer_text: item.answerText || item.title || "Untitled",
          answer_status: item.answerStatus ?? "original",
          answer_ai_provider: item.answerAiProvider ?? null,
          answer_ai_updated_at:
            item.answerAiUpdatedAt !== null &&
            item.answerAiUpdatedAt !== undefined
              ? new Date(item.answerAiUpdatedAt * 1000).toISOString()
              : null,
          answer_ai_batch_key: item.answerAiBatchKey ?? null,
          duration_sec: (() => {
            const parsed = parseDurationToSeconds(item.duration ?? "");
            return parsed && parsed > 0 ? parsed : undefined;
          })(),
        };
      });

      const toUpdate = updatePayloads
        .filter(
          (item) =>
            item.id && (shouldResyncAllItems || dirtyItemIds.has(item.localId)),
        )
        .map((item) => ({
          id: item.id,
          sort: item.sort,
          provider: item.provider,
          source_id: item.source_id,
          title: item.title,
          channel_title: item.channel_title,
          channel_id: item.channel_id,
          start_sec: item.start_sec,
          end_sec: item.end_sec,
          answer_text: item.answer_text,
          answer_status: item.answer_status,
          answer_ai_provider: item.answer_ai_provider,
          answer_ai_updated_at: item.answer_ai_updated_at,
          answer_ai_batch_key: item.answer_ai_batch_key,
          ...(item.duration_sec !== undefined
            ? { duration_sec: item.duration_sec }
            : {}),
        }));

      const insertItems = updatePayloads
        .filter((item) => !item.id)
        .map((item) => ({
          id: createServerId(),
          local_id: item.localId,
          sort: item.sort,
          provider: item.provider,
          source_id: item.source_id,
          title: item.title,
          channel_title: item.channel_title,
          channel_id: item.channel_id,
          start_sec: item.start_sec,
          end_sec: item.end_sec,
          answer_text: item.answer_text,
          answer_status: item.answer_status,
          answer_ai_provider: item.answer_ai_provider,
          answer_ai_updated_at: item.answer_ai_updated_at,
          answer_ai_batch_key: item.answer_ai_batch_key,
          ...(item.duration_sec !== undefined
            ? { duration_sec: item.duration_sec }
            : {}),
        }));

      const deleteIds = [...pendingDeleteIds];

      if (
        toUpdate.length === 0 &&
        insertItems.length === 0 &&
        deleteIds.length === 0
      ) {
        return;
      }

      await collectionsApi.syncCollectionItems(token, collectionId, {
        updates: toUpdate,
        inserts: insertItems,
        deletes: deleteIds,
      });

      if (insertItems.length > 0) {
        const idMap = new Map<string, string>();
        insertItems.forEach((item) => {
          if (typeof item.local_id === "string" && item.local_id) {
            idMap.set(item.local_id, item.id);
          }
        });

        setPlaylistItems((prev) =>
          prev.map((item) =>
            item.dbId ? item : { ...item, dbId: idMap.get(item.localId) },
          ),
        );
      }

      if (deleteIds.length > 0) {
        setPendingDeleteIds([]);
      }
    },
    [
      createServerId,
      dirtyItemIdsRef,
      extractVideoId,
      fullItemResyncRef,
      parseDurationToSeconds,
      pendingDeleteIds,
      playlistItems,
      setPendingDeleteIds,
      setPlaylistItems,
    ],
  );

  const handleSaveCollection = useCallback(
    async (mode: "manual" | "auto" = "manual") => {
      if (saveInFlightRef.current) return false;
      if (!authToken || !ownerId || authExpired) {
        if (mode === "auto") {
          showAutoSaveNotice("error", "登入已失效，請重新登入後再試。");
        } else {
          setSaveStatus("error");
          setSaveError("登入已失效，請重新登入後再試。");
        }
        return false;
      }
      if (!collectionTitle.trim()) {
        if (mode === "auto") {
          showAutoSaveNotice("error", "請先輸入收藏庫標題。");
        } else {
          setSaveStatus("error");
          setSaveError("title is required");
        }
        return false;
      }
      if (
        !isAdmin &&
        !activeCollectionId &&
        collectionsCount >= MAX_COLLECTIONS_PER_USER
      ) {
        const limitMessage = `一般使用者最多只能建立 ${MAX_COLLECTIONS_PER_USER} 個收藏庫`;
        if (mode === "auto") {
          showAutoSaveNotice("error", limitMessage);
        } else {
          setSaveStatus("error");
          setSaveError(limitMessage);
        }
        return false;
      }
      if (
        !isAdmin &&
        collectionVisibility === "private" &&
        (!activeCollectionId ||
          activeCollectionStoredVisibility !== "private") &&
        privateCollectionsCount >= MAX_PRIVATE_COLLECTIONS_PER_USER
      ) {
        const message = `一般使用者最多只能建立 ${MAX_PRIVATE_COLLECTIONS_PER_USER} 個私人收藏庫`;
        if (mode === "auto") {
          showAutoSaveNotice("error", message);
        } else {
          setSaveStatus("error");
          setSaveError(message);
        }
        return false;
      }
      if (
        effectiveItemLimit !== null &&
        playlistItems.length > effectiveItemLimit
      ) {
        const limitMessage =
          `一般使用者每個收藏庫最多只能保留 ${effectiveItemLimit}` + ` 題`;
        if (mode === "auto") {
          showAutoSaveNotice("error", limitMessage);
        } else {
          setSaveStatus("error");
          setSaveError(limitMessage);
        }
        return false;
      }

      const dirtySnapshot = dirtyCounterRef.current;
      saveInFlightRef.current = true;
      if (mode === "manual") {
        setSaveStatus("saving");
      }
      setSaveError(null);

      try {
        const token = await ensureFreshAuthToken({
          token: authToken,
          refreshAuthToken,
        });
        if (!token) {
          if (mode === "auto") {
            showAutoSaveNotice("error", "登入已失效，請重新登入後再試。");
          } else {
            setSaveStatus("error");
            setSaveError("登入已失效，請重新登入後再試。");
          }
          onAuthExpired?.();
          return false;
        }

        let collectionId = activeCollectionId;
        const run = async (
          nextToken: string,
          allowRetry: boolean,
        ): Promise<DbCollection | null> => {
          let created: DbCollection | null = null;

          if (!collectionId) {
            try {
              created = await collectionsApi.createCollection(nextToken, {
                owner_id: ownerId,
                title: collectionTitle.trim(),
                description: null,
                visibility: collectionVisibility,
              });
            } catch (error) {
              if (allowRetry && isAuthError(error)) {
                const refreshed = await refreshAuthToken();
                if (refreshed) {
                  return run(refreshed, false);
                }
              }
              throw error;
            }

            if (!created?.id) {
              throw new Error("Missing collection id");
            }
            collectionId = created.id;
          } else {
            try {
              const nextTitle = collectionTitle.trim();
              const shouldUpdateCollection =
                nextTitle !== (activeCollectionStoredTitle ?? "").trim() ||
                collectionVisibility !== activeCollectionStoredVisibility;

              if (shouldUpdateCollection) {
                await collectionsApi.updateCollection(nextToken, collectionId, {
                  title: nextTitle,
                  visibility: collectionVisibility,
                });
              }
            } catch (error) {
              if (allowRetry && isAuthError(error)) {
                const refreshed = await refreshAuthToken();
                if (refreshed) {
                  return run(refreshed, false);
                }
              }
              throw error;
            }

            setCollections((prev) =>
              prev.map((item) =>
                item.id === collectionId
                  ? {
                      ...item,
                      title: collectionTitle.trim(),
                      visibility: collectionVisibility,
                    }
                  : item,
              ),
            );
          }

          if (collectionId) {
            const hasPendingItemChanges =
              pendingDeleteIds.length > 0 ||
              fullItemResyncRef.current ||
              playlistItems.some(
                (item) =>
                  !item.dbId || dirtyItemIdsRef.current.has(item.localId),
              );

            if (hasPendingItemChanges) {
              try {
                await syncItemsToDb(collectionId, nextToken);
              } catch (error) {
                if (allowRetry && isAuthError(error)) {
                  const refreshed = await refreshAuthToken();
                  if (refreshed) {
                    return run(refreshed, false);
                  }
                }
                throw error;
              }
            }
          }

          return created;
        };

        const createdCollection = await run(token, true);

        if (createdCollection) {
          trackEvent("collection_create_success", {
            collection_id: createdCollection.id,
            collection_visibility:
              createdCollection.visibility ?? collectionVisibility,
            item_count: playlistItems.length,
            import_source: "editor",
          });
          setActiveCollectionId(createdCollection.id);
          setCollections((prev) => [createdCollection, ...prev]);
          navigateToEdit(createdCollection.id);
        }

        const noNewChanges = dirtyCounterRef.current === dirtySnapshot;
        trackEvent("collection_save_success", {
          collection_id: collectionId ?? createdCollection?.id ?? "new",
          collection_visibility: collectionVisibility,
          item_count: playlistItems.length,
          mode,
        });

        if (noNewChanges) {
          dirtyItemIdsRef.current.clear();
          fullItemResyncRef.current = false;
          setHasUnsavedChanges(false);
          dirtyCounterRef.current = 0;
          onSaved?.();
          if (mode === "auto") {
            setSaveStatus("idle");
            showAutoSaveNotice("success", "已自動儲存。");
          } else {
            setSaveStatus("saved");
          }
        } else {
          setSaveStatus("idle");
        }

        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setSaveStatus("error");
        setSaveError(message);
        if (mode === "auto") {
          showAutoSaveNotice("error", `自動儲存失敗：${message}`);
        }
        return false;
      } finally {
        saveInFlightRef.current = false;
      }
    },
    [
      activeCollectionId,
      activeCollectionStoredTitle,
      activeCollectionStoredVisibility,
      authExpired,
      authToken,
      collectionVisibility,
      collectionTitle,
      collectionsCount,
      privateCollectionsCount,
      dirtyCounterRef,
      dirtyItemIdsRef,
      effectiveItemLimit,
      fullItemResyncRef,
      playlistItems,
      refreshAuthToken,
      navigateToEdit,
      onAuthExpired,
      ownerId,
      isAdmin,
      setActiveCollectionId,
      setCollections,
      setHasUnsavedChanges,
      setSaveError,
      setSaveStatus,
      showAutoSaveNotice,
      syncItemsToDb,
      saveInFlightRef,
      onSaved,
      pendingDeleteIds.length,
    ],
  );

  return { handleSaveCollection, syncItemsToDb };
};
