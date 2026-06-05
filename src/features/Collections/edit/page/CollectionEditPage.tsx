import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CategoryDrawerPanel,
  useCategoryAutoDetect,
} from "@features/CollectionCategory";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@mui/material";
import ConfirmDialog from "../../../../shared/ui/ConfirmDialog";
import LoadingPage from "../../../../shared/ui/LoadingPage";
import { useAuth } from "../../../../shared/auth/AuthContext";
import { usePlaylistSource } from "@features/PlaylistSource";
import { isAdminRole } from "../../../../shared/auth/roles";
import type { DbCollection, EditableItem } from "../utils/editTypes";
import { buildEditableItemsFromDb } from "../utils/editMappers";
import { useCollectionEditor } from "../hooks/useCollectionEditor";
import { useCollectionLoader } from "../hooks/useCollectionLoader";
import { useCollectionEditAiBatch } from "../hooks/useCollectionEditAiBatch";
import { useCollectionEditImport } from "../hooks/useCollectionEditImport";
import { useCollectionEditPlayer } from "../hooks/useCollectionEditPlayer";
import { useCollectionEditSelection } from "../hooks/useCollectionEditSelection";
import { collectionsApi } from "../../shared/api/collectionsApi";
import {
  MAX_PRIVATE_COLLECTIONS_PER_USER,
  resolveCollectionItemLimit,
} from "../../shared/model/collectionLimits";
import { ensureFreshAuthToken } from "../../../../shared/auth/token";
import CollectionPopover from "../components/playlist/CollectionPopover";
import ClipEditorPanel from "../components/player/ClipEditorPanel";
import BulkPlaybackRangeDrawer from "../../shared/components/BulkPlaybackRangeDrawer";
import AnswerPanel from "../components/answer/AnswerPanel";
import EditHeader from "../components/header/EditHeader";
import PlaylistListPanel from "../components/playlist/PlaylistListPanel";
import PlaylistSourceModal from "../components/playlist/PlaylistSourceModal";
import PlayerPanel from "../components/player/PlayerPanel";
import CollectionEditAiBatchDrawer from "../components/ai/CollectionEditAiBatchDrawer";
import {
  createServerId,
  extractVideoId,
  formatSeconds,
  getPlaylistItemKey,
  parseDurationToSeconds,
  parseTimeInput,
} from "../utils/editUtils";
import {
  buildBulkPlaybackPreviewItems,
  DEFAULT_BULK_PLAYBACK_DRAFT,
  type BulkPlaybackDraft,
} from "../../shared/model/bulkPlaybackRange";
import {
  ANSWER_MAX_LENGTH,
  CLIP_DURATION_LABEL,
  COLLECTION_SELECT_LABEL,
  END_TIME_LABEL,
  NEW_COLLECTION_LABEL,
  PAUSE_LABEL,
  PLAY_LABEL,
  SAVED_LABEL,
  SAVE_ERROR_LABEL,
  SAVING_LABEL,
  START_TIME_LABEL,
  TEXT,
  UNSAVED_PROMPT,
  VOLUME_LABEL,
} from "../utils/editConstants";

const CollectionEditPage = () => {
  const navigate = useNavigate();
  const { collectionId } = useParams<{ collectionId?: string }>();

  const {
    authToken,
    authUser,
    displayUsername,
    refreshAuthToken,
    authLoading,
    authExpired,
  } = useAuth();

  const {
    playlistUrl,
    playlistItems: fetchedPlaylistItems,
    lastFetchedPlaylistTitle,
    playlistError,
    playlistLoading,
    handleFetchPlaylist,
    handleResetPlaylist,
    setPlaylistUrl,
  } = usePlaylistSource();

  const [collections, setCollections] = useState<DbCollection[]>([]);
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(
    null,
  );
  const [collectionsLoading, setCollectionsLoading] = useState(false);
  const [collectionsError, setCollectionsError] = useState<string | null>(null);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsError, setItemsError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [autoSaveNotice, setAutoSaveNotice] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const autoSaveTimerRef = useRef<number | null>(null);
  const saveInFlightRef = useRef(false);
  const skipRouteResetOnNextParamRef = useRef<string | null>(null);
  const baselineSnapshotRef = useRef<string>("");
  const baselineReadyRef = useRef(false);
  const dirtyCounterRef = useRef(0);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);

  const [collectionTitle, setCollectionTitle] = useState("");
  const [collectionDescription, setCollectionDescription] = useState("");
  const [collectionTitleTouched, setCollectionTitleTouched] = useState(false);
  const [collectionVisibility, setCollectionVisibility] = useState<
    "private" | "public"
  >("private");

  // Category state — auto-saved when changed by user
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [subTagKeys, setSubTagKeys] = useState<string[]>([]);
  const [categorySaving, setCategorySaving] = useState(false);
  // Tracks the last values actually persisted to the server for this collection
  const lastSavedCategoryRef = useRef<{
    categoryId: string | null;
    subTagKeys: string[];
  } | null>(null);
  const categoryAutoSaveTimerRef = useRef<number | null>(null);
  const [confirmPublicOpen, setConfirmPublicOpen] = useState(false);
  const [pendingVisibility, setPendingVisibility] = useState<
    "private" | "public" | null
  >(null);
  const [visibilityUpdating, setVisibilityUpdating] = useState(false);
  const [isTitleEditing, setIsTitleEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [collectionMenuOpen, setCollectionMenuOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [collectionAnchor, setCollectionAnchor] = useState<HTMLElement | null>(
    null,
  );
  const [bulkPlaybackOpen, setBulkPlaybackOpen] = useState(false);
  const [bulkPlaybackDraft, setBulkPlaybackDraft] =
    useState<BulkPlaybackDraft>(DEFAULT_BULK_PLAYBACK_DRAFT);
  const [bulkPlaybackApplying, setBulkPlaybackApplying] = useState(false);
  const [bulkPlaybackProgress, setBulkPlaybackProgress] = useState<{
    completed: number;
    total: number;
    label?: string;
  } | null>(null);
  const pendingBulkPreviewRef = useRef<{
    id: string;
    startSec: number;
  } | null>(null);

  const shareFeedbackTimerRef = useRef<number | null>(null);
  const [playlistItems, setPlaylistItems] = useState<EditableItem[]>([]);

  const [highlightIndex, setHighlightIndex] = useState<number | null>(null);
  const [pendingScrollIndex, setPendingScrollIndex] = useState<number | null>(
    null,
  );
  const listContainerRef = useRef<HTMLDivElement | null>(null);
  const highlightTimerRef = useRef<number | null>(null);

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const pendingSelectedIndexRef = useRef<number | null>(null);
  const reorderRef = useRef(false);
  const reorderSelectedIdRef = useRef<string | null>(null);
  const lastSelectedIdRef = useRef<string | null>(null);

  const dirtyItemIdsRef = useRef<Set<string>>(new Set());
  const fullItemResyncRef = useRef(false);

  const hasResetPlaylistRef = useRef(false);

  const markDirty = useCallback(() => {
    dirtyCounterRef.current += 1;
    setHasUnsavedChanges(true);
    setSaveStatus((prev) => (prev !== "idle" ? "idle" : prev));
    setSaveError((prev) => (prev ? null : prev));
  }, []);

  const markItemDirty = useCallback(
    (localId: string) => {
      dirtyItemIdsRef.current.add(localId);
      markDirty();
    },
    [markDirty],
  );

  const markItemsDirty = useCallback(
    (localIds: string[]) => {
      localIds.forEach((localId) => {
        dirtyItemIdsRef.current.add(localId);
      });
      markDirty();
    },
    [markDirty],
  );

  const resetPendingItemSyncState = useCallback(() => {
    dirtyItemIdsRef.current.clear();
    fullItemResyncRef.current = false;
  }, []);

  const buildSnapshot = useCallback(
    (
      items: EditableItem[],
      title: string,
      description: string,
      deletes: string[],
    ): string => {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        visibility: collectionVisibility,
        items: items.map((item, idx) => ({
          key: item.dbId ?? item.localId,
          sort: idx,
          provider:
            item.sourceProvider ??
            (extractVideoId(item.url) ? "youtube" : "manual"),
          sourceId:
            item.sourceId ??
            extractVideoId(item.url) ??
            item.url ??
            item.dbId ??
            item.localId ??
            "",
          title: item.title ?? "",
          uploader: item.uploader ?? "",
          channelId: item.channelId ?? "",
          startSec: Math.floor(item.startSec ?? 0),
          endSec: Math.floor(item.endSec ?? 0),
          answerText: item.answerText ?? "",
        })),
        deletes: [...deletes].sort(),
      };

      return JSON.stringify(payload);
    },
    [collectionVisibility],
  );

  const showAutoSaveNotice = (type: "success" | "error", message: string) => {
    setAutoSaveNotice({ type, message });
    if (autoSaveTimerRef.current) {
      window.clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = window.setTimeout(() => {
      setAutoSaveNotice(null);
    }, 2500);
  };

  const ownerId = authUser?.id ?? null;
  const isAdmin = isAdminRole(authUser?.role);
  const privateCollectionsCount = collections.filter(
    (item) => item.visibility !== "public",
  ).length;
  const activeCollection =
    collections.find((item) => item.id === activeCollectionId) ?? null;
  const activeCollectionStoredVisibility = activeCollection?.visibility ?? null;
  const activeCollectionItemLimit = resolveCollectionItemLimit({
    role: authUser?.role,
    plan: authUser?.plan,
    itemLimitOverride: activeCollection?.item_limit_override ?? null,
  });

  const resetBaseline = useCallback(() => {
    baselineSnapshotRef.current = buildSnapshot(
      playlistItems,
      collectionTitle,
      collectionDescription,
      pendingDeleteIds,
    );
    baselineReadyRef.current = true;
  }, [
    buildSnapshot,
    collectionDescription,
    collectionTitle,
    pendingDeleteIds,
    playlistItems,
  ]);

  const handleSavedBaseline = useCallback(() => {
    window.setTimeout(() => {
      resetBaseline();
      resetPendingItemSyncState();
    }, 0);
  }, [resetBaseline, resetPendingItemSyncState]);

  useCollectionLoader({
    authToken,
    ownerId,
    collectionId,
    authUser,
    displayUsername,
    refreshAuthToken,
    setCollections,
    setCollectionsLoading,
    setCollectionsError,
    setActiveCollectionId,
    setCollectionTitle,
    setCollectionDescription,
    setCollectionVisibility,
    buildEditableItemsFromDb,
    setPlaylistItems,
    setItemsLoading,
    setItemsError,
    setHasUnsavedChanges,
    setSaveStatus,
    setSaveError,
    dirtyCounterRef,
  });

  const { handleSaveCollection } = useCollectionEditor({
    authToken,
    ownerId,
    authRole: authUser?.role,
    authPlan: authUser?.plan,
    authExpired,
    collectionTitle,
    collectionDescription,
    collectionVisibility,
    activeCollectionId,
    activeCollectionStoredTitle: activeCollection?.title ?? null,
    activeCollectionStoredDescription: activeCollection?.description ?? null,
    activeCollectionStoredVisibility,
    activeCollectionItemLimitOverride:
      activeCollection?.item_limit_override ?? null,
    collectionsCount: collections.length,
    privateCollectionsCount,
    playlistItems,
    pendingDeleteIds,
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
    dirtyItemIdsRef,
    fullItemResyncRef,
    navigateToEdit: (id) => {
      skipRouteResetOnNextParamRef.current = id;
      navigate(`/collections/${id}/edit`, { replace: true });
    },
    refreshAuthToken,
    onAuthExpired: () => {
      setSaveStatus("error");
      setSaveError("登入已過期，請重新登入");
      showAutoSaveNotice("error", "登入已過期，請重新登入");
    },
    onSaved: handleSavedBaseline,
  });

  const isReadOnly = !authToken || authExpired;

  // Category auto-detect (runs when collection has no category yet)
  const { suggestion: categoryDetectSuggestion, isDetecting: categoryDetecting, hasRun: categoryDetectRan, runDetect: runCategoryDetect } =
    useCategoryAutoDetect({ collectionId: activeCollectionId, token: authToken });

  useEffect(() => {
    if (!activeCollectionId || !authToken) return;
    if (activeCollection?.category?.id) return; // already has category
    if (categoryDetectRan) return;
    runCategoryDetect();
  }, [activeCollectionId, authToken, activeCollection?.category?.id, categoryDetectRan, runCategoryDetect]);

  // Saves the given category/subtag values to the server.
  // Accepts explicit values to avoid stale closure issues inside auto-save timers.
  const saveCategoryToServer = useCallback(
    async (cid: string | null, tags: string[]) => {
      if (!activeCollectionId || !authToken || isReadOnly) return;
      setCategorySaving(true);
      try {
        const token = await ensureFreshAuthToken({
          token: authToken,
          refreshAuthToken,
        });
        if (!token) return;
        await collectionsApi.updateCollection(token, activeCollectionId, {
          category_id: cid,
          sub_tag_keys: tags,
        });
        // Update the "last saved" reference so the auto-save effect doesn't fire again
        lastSavedCategoryRef.current = { categoryId: cid, subTagKeys: tags };
      } catch (err) {
        console.error("[category] save failed:", err);
      } finally {
        setCategorySaving(false);
      }
    },
    [activeCollectionId, authToken, isReadOnly, refreshAuthToken],
  );

  useEffect(() => {
    if (collectionId && skipRouteResetOnNextParamRef.current === collectionId) {
      skipRouteResetOnNextParamRef.current = null;
      setActiveCollectionId(collectionId);
      return;
    }

    if (collectionId) {
      setActiveCollectionId(collectionId);
    } else {
      setActiveCollectionId(null);
      setCollectionTitle("");
      setCollectionDescription("");
      setCollectionVisibility("private");
    }

    resetPendingItemSyncState();
    baselineReadyRef.current = false;
    baselineSnapshotRef.current = "";
    setPlaylistItems([]);
    setPendingDeleteIds([]);
    setSelectedItemId(null);
    pendingSelectedIndexRef.current = 0;
    setHasUnsavedChanges(false);
    setSaveStatus("idle");
    setSaveError(null);
    setAutoSaveNotice(null);
    setTitleDraft("");
    setDescriptionDraft("");
    setIsTitleEditing(false);
    dirtyCounterRef.current = 0;
  }, [collectionId, resetPendingItemSyncState]);

  useEffect(() => {
    if (itemsLoading || itemsError) return;
    if (!baselineReadyRef.current) {
      resetBaseline();
    }
  }, [itemsLoading, itemsError, resetBaseline]);

  // Sync category state when active collection changes.
  // Also reset the "last saved" ref so the auto-save effect doesn't fire on load.
  useEffect(() => {
    if (!activeCollection) return;
    const loadedCategoryId = activeCollection.category?.id ?? null;
    const loadedSubTagKeys = activeCollection.sub_tag_keys ?? [];
    setCategoryId(loadedCategoryId);
    setSubTagKeys(loadedSubTagKeys);
    // Record what the server already has so we only save on genuine user changes
    lastSavedCategoryRef.current = {
      categoryId: loadedCategoryId,
      subTagKeys: loadedSubTagKeys,
    };
    // Cancel any pending auto-save timer from the previous collection
    if (categoryAutoSaveTimerRef.current !== null) {
      window.clearTimeout(categoryAutoSaveTimerRef.current);
      categoryAutoSaveTimerRef.current = null;
    }
  }, [activeCollection?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save: fires 500ms after user changes category or sub-tags.
  // Skips save if values match what's already on the server.
  useEffect(() => {
    if (!lastSavedCategoryRef.current) return; // collection not loaded yet

    const saved = lastSavedCategoryRef.current;
    const categoryChanged = categoryId !== saved.categoryId;
    const tagsChanged =
      JSON.stringify([...subTagKeys].sort()) !==
      JSON.stringify([...saved.subTagKeys].sort());

    if (!categoryChanged && !tagsChanged) return;
    if (!activeCollectionId || !authToken || isReadOnly) return;

    if (categoryAutoSaveTimerRef.current !== null) {
      window.clearTimeout(categoryAutoSaveTimerRef.current);
    }
    categoryAutoSaveTimerRef.current = window.setTimeout(() => {
      categoryAutoSaveTimerRef.current = null;
      void saveCategoryToServer(categoryId, subTagKeys);
    }, 500);

    return () => {
      if (categoryAutoSaveTimerRef.current !== null) {
        window.clearTimeout(categoryAutoSaveTimerRef.current);
      }
    };
  }, [categoryId, subTagKeys, activeCollectionId, authToken, isReadOnly, saveCategoryToServer]);

  useEffect(() => {
    if (!baselineReadyRef.current) return;

    const snapshot = buildSnapshot(
      playlistItems,
      collectionTitle,
      collectionDescription,
      pendingDeleteIds,
    );
    const isDirty = snapshot !== baselineSnapshotRef.current;

    if (isDirty && dirtyCounterRef.current === 0) {
      baselineSnapshotRef.current = snapshot;
      if (hasUnsavedChanges) {
        setHasUnsavedChanges(false);
      }
      return;
    }

    if (isDirty !== hasUnsavedChanges) {
      setHasUnsavedChanges(isDirty);
    }

    if (!isDirty) {
      dirtyCounterRef.current = 0;
    }
  }, [
    playlistItems,
    collectionDescription,
    collectionTitle,
    pendingDeleteIds,
    buildSnapshot,
    hasUnsavedChanges,
  ]);

  useEffect(() => {
    if (!lastFetchedPlaylistTitle) return;
    if (collectionTitleTouched) return;
    if (collectionTitle.trim()) return;
    setCollectionTitle(lastFetchedPlaylistTitle);
  }, [collectionTitle, collectionTitleTouched, lastFetchedPlaylistTitle]);

  useEffect(() => {
    if (isTitleEditing) return;
    setTitleDraft(collectionTitle);
    setDescriptionDraft(collectionDescription);
  }, [collectionDescription, collectionTitle, isTitleEditing]);

  const collectionCount = collections.length;

  const {
    selectedIndex,
    selectedItem,
    answerText,
    startSec,
    endSec,
    startTimeInput,
    endTimeInput,
    maxSec,
    effectiveEnd,
    selectedClipDurationSec,
    updateItemAtIndex,
    updateSelectedAnswerText,
    handleSelectIndex,
    handleStartInputChange,
    handleEndInputChange,
    handleStartChange,
    handleEndChange,
    handleRangeChange,
    handleRangeCommit,
  } = useCollectionEditSelection({
    playlistItems,
    selectedItemId,
    setSelectedItemId,
    setPlaylistItems,
    markItemDirty,
    hasUnsavedChanges,
    onAutoSaveCurrent: () => {
      void handleSaveCollection("auto");
    },
    onBeforeSelect: () => {
      setSaveStatus("idle");
    },
  });

  const syncDurationFromPlayer = useCallback(
    (durationSec: number, targetId?: string | null) => {
      if (!Number.isFinite(durationSec) || durationSec <= 0) return;

      const cap = Math.max(1, Math.floor(durationSec));
      const activeId = targetId ?? selectedItemId ?? null;

      setPlaylistItems((prev) =>
        prev.map((item) => {
          if (!activeId || item.localId !== activeId) return item;

          let nextEnd = item.endSec;
          if (!Number.isFinite(nextEnd) || nextEnd > cap) {
            nextEnd = cap;
          }
          if (nextEnd <= item.startSec) {
            nextEnd = Math.min(cap, item.startSec + 1);
          }

          const prevDurationSec = parseDurationToSeconds(item.duration) ?? null;
          const shouldUpdateDuration =
            prevDurationSec === null || Math.abs(cap - prevDurationSec) >= 2;

          const nextDuration = shouldUpdateDuration
            ? formatSeconds(cap)
            : item.duration;

          return shouldUpdateDuration
            ? { ...item, duration: nextDuration, endSec: nextEnd }
            : { ...item, endSec: nextEnd };
        }),
      );
    },
    [selectedItemId],
  );

  const selectedVideoId = extractVideoId(selectedItem?.url);

  const bulkPlaybackPreviewItems = useMemo(() => {
    return buildBulkPlaybackPreviewItems({
      items: playlistItems.map((item) => ({ ...item, id: item.localId })),
      draft: bulkPlaybackDraft,
      parseDurationToSeconds,
      parseTimeInput,
    });
  }, [bulkPlaybackDraft, playlistItems]);

  const bulkPlaybackAffectedItems = useMemo(
    () => bulkPlaybackPreviewItems.filter((item) => item.isShortened),
    [bulkPlaybackPreviewItems],
  );

  const activeBulkPlaybackPreviewItem = useMemo(() => {
    if (!bulkPlaybackOpen || !selectedItem) return null;
    return (
      bulkPlaybackPreviewItems.find((item) => item.id === selectedItem.localId) ??
      null
    );
  }, [bulkPlaybackOpen, bulkPlaybackPreviewItems, selectedItem]);

  const playbackStartSec = activeBulkPlaybackPreviewItem?.startSec ?? startSec;
  const playbackEffectiveEnd =
    activeBulkPlaybackPreviewItem?.endSec ?? effectiveEnd;
  const playbackClipDurationSec = Math.max(
    1,
    playbackEffectiveEnd - playbackStartSec,
  );
  const playbackSelectedClipDurationSec =
    activeBulkPlaybackPreviewItem?.clipLengthSec ?? selectedClipDurationSec;

  const {
    playerContainerRef,
    isPlayerReady,
    isPlaying,
    volume,
    isMuted,
    autoPlayOnSwitch,
    loopEnabled,
    currentTimeSec,
    setCurrentTimeSec,
    pausePlayback,
    togglePlayback,
    handleVolumeChange,
    handleVolumeCommit,
    handleToggleMute,
    handleAutoPlayToggle,
    handleLoopToggle,
    handleProgressChange,
    getPlayerCurrentTimeSec,
    preparePlaybackStart,
    queuePreviewFromStart,
    previewFromStart,
    previewBeforeEnd,
  } = useCollectionEditPlayer({
    selectedVideoId,
    selectedItemLocalId: selectedItem?.localId ?? null,
    selectedItemStartSec: selectedItem?.startSec ?? 0,
    itemsLoading,
    collectionsLoading,
    startSec: playbackStartSec,
    effectiveEnd: playbackEffectiveEnd,
    onDurationResolved: syncDurationFromPlayer,
  });

  const canApplyBulkPlayback =
    playlistItems.length > 0 && bulkPlaybackPreviewItems.length > 0;

  const handleBulkPlaybackPreviewItem = useCallback(
    (id: string, previewStartSec: number) => {
      const nextIndex = playlistItems.findIndex(
        (item) => item.localId === id,
      );
      if (nextIndex < 0) return;

      pendingBulkPreviewRef.current = { id, startSec: previewStartSec };
      if (selectedItem?.localId === id && isPlayerReady) {
        previewFromStart(previewStartSec);
      } else {
        queuePreviewFromStart(previewStartSec);
      }
      handleSelectIndex(nextIndex);
      setCurrentTimeSec(previewStartSec);

      if (selectedItem?.localId === id && isPlayerReady) {
        pendingBulkPreviewRef.current = null;
      }
    },
    [
      handleSelectIndex,
      isPlayerReady,
      playlistItems,
      queuePreviewFromStart,
      previewFromStart,
      selectedItem?.localId,
      setCurrentTimeSec,
    ],
  );

  useEffect(() => {
    const pending = pendingBulkPreviewRef.current;
    if (!pending) return;
    if (selectedItem?.localId !== pending.id) return;
    if (!isPlayerReady) return;

    pendingBulkPreviewRef.current = null;
    previewFromStart(pending.startSec);
  }, [isPlayerReady, previewFromStart, selectedItem?.localId]);

  const handleApplyBulkPlayback = useCallback(async () => {
    if (bulkPlaybackApplying) return;
    const previewById = new Map(
      bulkPlaybackPreviewItems.map((item) => [item.id, item]),
    );
    const changedIds = playlistItems
      .filter((item) => {
        const preview = previewById.get(item.localId);
        return Boolean(
          preview &&
            (item.startSec !== preview.startSec ||
              item.endSec !== preview.endSec),
        );
      })
      .map((item) => item.localId);

    if (changedIds.length <= 0) {
      setBulkPlaybackOpen(false);
      return;
    }

    setBulkPlaybackApplying(true);
    setBulkPlaybackProgress({
      completed: 0,
      total: changedIds.length,
      label: "正在套用播放區間",
    });

    let processedIds: string[] = [];
    let nextItems = playlistItems;

    for (let start = 0; start < changedIds.length; start += 80) {
      const batchIds = new Set(changedIds.slice(start, start + 80));
      processedIds = [...processedIds, ...batchIds];
      nextItems = nextItems.map((item) => {
        if (!batchIds.has(item.localId)) return item;
        const preview = previewById.get(item.localId);
        if (!preview) return item;
        return {
          ...item,
          startSec: preview.startSec,
          endSec: preview.endSec,
        };
      });
      setPlaylistItems(() => nextItems);
      setBulkPlaybackProgress({
        completed: processedIds.length,
        total: changedIds.length,
        label: "正在套用播放區間",
      });
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    }

    markItemsDirty(changedIds);
    setBulkPlaybackProgress({
      completed: 0,
      total: 0,
      label: "正在寫入資料庫",
    });
    const saved = await handleSaveCollection("manual", nextItems);
    setBulkPlaybackApplying(false);
    setBulkPlaybackProgress(null);

    if (saved) {
      const selectedPreview = selectedItem?.localId
        ? previewById.get(selectedItem.localId)
        : null;
      pausePlayback();
      if (selectedPreview) {
        preparePlaybackStart(selectedPreview.startSec, selectedPreview.endSec);
      }
      setBulkPlaybackOpen(false);
    }
  }, [
    bulkPlaybackApplying,
    bulkPlaybackPreviewItems,
    handleSaveCollection,
    markItemsDirty,
    pausePlayback,
    preparePlaybackStart,
    playlistItems,
    selectedItem?.localId,
    setPlaylistItems,
  ]);

  const clipCurrentSec = Math.min(
    Math.max(currentTimeSec - playbackStartSec, 0),
    playbackClipDurationSec,
  );

  const handleStartChangeWithPreview = useCallback(
    (value: number) => {
      const next = Math.min(Math.max(0, value), maxSec);
      handleStartChange(next);
      setCurrentTimeSec(next);
      previewFromStart(next);
    },
    [handleStartChange, maxSec, previewFromStart, setCurrentTimeSec],
  );

  const handleEndChangeWithPreview = useCallback(
    (value: number) => {
      const next = Math.min(Math.max(0, value), maxSec);
      const nextStart = next < startSec ? next : startSec;

      handleEndChange(next);
      setCurrentTimeSec((prev) => Math.min(Math.max(prev, nextStart), next));
    },
    [handleEndChange, maxSec, setCurrentTimeSec, startSec],
  );

  const handleRangeChangeWithPreview = useCallback(
    (value: number[], activeThumb: number) => {
      const [rawStart, rawEnd] = value;
      const nextStart = Math.min(Math.max(0, rawStart), maxSec);
      const nextEnd = Math.min(Math.max(0, rawEnd), maxSec);

      handleRangeChange([nextStart, nextEnd]);

      if (activeThumb === 0) {
        setCurrentTimeSec(nextStart);
        previewFromStart(nextStart);
      } else {
        setCurrentTimeSec((prev) =>
          Math.min(Math.max(prev, nextStart), nextEnd),
        );
        previewBeforeEnd(nextStart, nextEnd);
      }
    },
    [
      handleRangeChange,
      maxSec,
      previewBeforeEnd,
      previewFromStart,
      setCurrentTimeSec,
    ],
  );

  const handleRangeCommitWithPreview = useCallback(
    (value: number[], activeThumb: number) => {
      if (activeThumb !== 0) return;

      const [rawStart, rawEnd] = value;
      const nextStart = Math.min(Math.max(0, rawStart), maxSec);
      const nextEnd = Math.min(Math.max(0, rawEnd), maxSec);

      handleRangeCommit([nextStart, nextEnd]);
      setCurrentTimeSec(nextStart);
    },
    [handleRangeCommit, maxSec, setCurrentTimeSec],
  );

  const handleStartThumbPressWithPreview = useCallback(() => {
    previewFromStart(startSec);
  }, [previewFromStart, startSec]);

  const handleEndThumbPressWithPreview = useCallback(() => {
    previewBeforeEnd(startSec, endSec);
  }, [endSec, previewBeforeEnd, startSec]);

  const renderPlayerPanel = (showAutoPlayControl: boolean) => (
    <PlayerPanel
      selectedVideoId={selectedVideoId}
      selectedTitle={selectedItem?.title ?? TEXT.selectSong}
      selectedUploader={selectedItem?.uploader ?? ""}
      selectedChannelId={selectedItem?.channelId}
      selectedDuration={selectedItem?.duration}
      selectedClipDurationLabel={CLIP_DURATION_LABEL}
      selectedClipDurationSec={formatSeconds(playbackSelectedClipDurationSec)}
      clipCurrentSec={formatSeconds(clipCurrentSec)}
      clipDurationSec={formatSeconds(playbackClipDurationSec)}
      startSec={playbackStartSec}
      effectiveEnd={playbackEffectiveEnd}
      currentTimeSec={currentTimeSec}
      getPlayerCurrentTimeSec={getPlayerCurrentTimeSec}
      onProgressChange={handleProgressChange}
      onTogglePlayback={togglePlayback}
      isPlayerReady={isPlayerReady}
      isPlaying={isPlaying}
      onVolumeChange={handleVolumeChange}
      onVolumeCommit={handleVolumeCommit}
      volume={volume}
      isMuted={isMuted}
      onToggleMute={handleToggleMute}
      autoPlayOnSwitch={autoPlayOnSwitch}
      onAutoPlayChange={handleAutoPlayToggle}
      autoPlayLabel="切換自動播放"
      showAutoPlayControl={showAutoPlayControl}
      loopEnabled={loopEnabled}
      onLoopChange={handleLoopToggle}
      loopLabel="循環播放"
      playLabel={PLAY_LABEL}
      pauseLabel={PAUSE_LABEL}
      volumeLabel={VOLUME_LABEL}
      noSelectionLabel={TEXT.noSelection}
      playerContainerRef={playerContainerRef}
      thumbnail={selectedItem?.thumbnail}
    />
  );
  const playerPanelNode = renderPlayerPanel(false);
  const drawerPlayerPanelNode = renderPlayerPanel(false);

  const closeBulkPlaybackDrawer = useCallback(() => {
    if (bulkPlaybackApplying) return;

    pausePlayback();
    setBulkPlaybackOpen(false);
    window.requestAnimationFrame(() => {
      preparePlaybackStart(startSec, endSec);
    });
  }, [
    bulkPlaybackApplying,
    endSec,
    pausePlayback,
    preparePlaybackStart,
    startSec,
  ]);

  const {
    aiProviderLabel,
    aiBatchModalOpen,
    openAiBatchModal,
    closeAiBatchModal,
    aiBatchPageIndex,
    setAiBatchPageIndex,
    aiJsonDrafts,
    aiAppliedPages,
    aiAppliedBatchRecords,
    currentAiJsonDraft,
    setCurrentAiJsonDraft,
    aiBatchWriteState,
    resetAiBatchWriteState,
    aiPromptPages,
    aiPromptSettings,
    updateAiPromptSettings,
    updateAiSplitField,
    addAiSplitField,
    removeAiSplitField,
    reorderAiSplitField,
    aiPromptText,
    aiParsedResult,
    aiPreview,
    aiPageStatuses,
    canApplyAiBatch,
    pendingAiBatchSave,
    canCloseAiBatchModal,
    aiBatchSaveProgressLabel,
    aiBatchSaveStepLabel,
    handleCopyAiPrompt,
    handleOpenAiAssistant,
    handleApplyAiBatch,
    handleRetryAiBatchWrite,
  } = useCollectionEditAiBatch({
    playlistItems,
    setPlaylistItems,
    markDirty,
    markItemsDirty,
    handleSaveCollection,
    saveError,
  });

  const confirmLeave = () => {
    if (!hasUnsavedChanges) return true;
    return window.confirm(UNSAVED_PROMPT);
  };

  const applyVisibilityChange = useCallback(
    async (value: "private" | "public") => {
      if (
        !isAdmin &&
        value === "private" &&
        activeCollectionStoredVisibility !== "private" &&
        privateCollectionsCount >= MAX_PRIVATE_COLLECTIONS_PER_USER
      ) {
        setSaveError(
          `一般使用者最多只能建立 ${MAX_PRIVATE_COLLECTIONS_PER_USER} 個私人收藏庫`,
        );
        return;
      }

      if (!authToken || !activeCollectionId) {
        setCollectionVisibility(value);
        return;
      }

      setVisibilityUpdating(true);
      try {
        const token = await ensureFreshAuthToken({
          token: authToken,
          refreshAuthToken,
        });
        if (!token) {
          throw new Error("Unauthorized");
        }

        await collectionsApi.updateCollection(token, activeCollectionId, {
          visibility: value,
        });
        setCollectionVisibility(value);
        setCollections((prev) =>
          prev.map((item) =>
            item.id === activeCollectionId
              ? { ...item, visibility: value }
              : item,
          ),
        );

        if (!hasUnsavedChanges) {
          resetBaseline();
        }
      } catch {
        setSaveError("更新公開狀態失敗");
      } finally {
        setVisibilityUpdating(false);
      }
    },
    [
      activeCollectionId,
      activeCollectionStoredVisibility,
      authToken,
      hasUnsavedChanges,
      isAdmin,
      privateCollectionsCount,
      refreshAuthToken,
      resetBaseline,
    ],
  );

  const handleShareCollection = useCallback(async () => {
    if (!authToken || !activeCollectionId) {
      setSaveError("請先登入並選擇收藏庫後再分享");
      return;
    }
    if (collectionVisibility !== "public") {
      setSaveError("請先將收藏庫設為公開後再分享");
      return;
    }

    try {
      const shareUrl = new URL("/rooms", window.location.origin);
      shareUrl.searchParams.set("sharedCollection", activeCollectionId);
      const shareUrlString = shareUrl.toString();
      const shareData = {
        title: collectionTitle.trim() || "收藏庫",
        text: collectionTitle.trim()
          ? `來看看這個收藏庫：${collectionTitle.trim()}`
          : "來看看這個收藏庫",
        url: shareUrlString,
      };

      if (
        typeof navigator.share === "function" &&
        (!("canShare" in navigator) ||
          navigator.canShare?.({ url: shareUrlString }))
      ) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareUrlString);
      }

      if (shareFeedbackTimerRef.current !== null) {
        window.clearTimeout(shareFeedbackTimerRef.current);
      }
      setShareCopied(true);
      shareFeedbackTimerRef.current = window.setTimeout(() => {
        setShareCopied(false);
        shareFeedbackTimerRef.current = null;
      }, 1400);
      setSaveError(null);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      setSaveError(error instanceof Error ? error.message : "建立分享連結失敗");
    }
  }, [activeCollectionId, authToken, collectionTitle, collectionVisibility]);

  useEffect(() => {
    return () => {
      if (shareFeedbackTimerRef.current !== null) {
        window.clearTimeout(shareFeedbackTimerRef.current);
      }
    };
  }, []);

  const appendItems = useCallback(
    (
      incoming: EditableItem[],
      options?: { selectLast?: boolean; scrollToLast?: boolean },
    ) => {
      if (!incoming.length) return { added: 0, duplicates: 0 };

      let addedCount = 0;
      let duplicateCount = 0;
      let firstAddedIndex: number | null = null;
      let lastAddedLocalId: string | null = null;

      fullItemResyncRef.current = true;
      setPlaylistItems((prev) => {
        const existingKeys = new Set(
          prev.map((item) => getPlaylistItemKey(item)).filter(Boolean),
        );
        const next = [...prev];

        incoming.forEach((item) => {
          const key = getPlaylistItemKey(item);
          if (key && existingKeys.has(key)) {
            duplicateCount += 1;
            return;
          }

          if (key) existingKeys.add(key);
          if (firstAddedIndex === null) firstAddedIndex = next.length;
          next.push(item);
          lastAddedLocalId = item.localId;
          addedCount += 1;
        });

        return next;
      });

      if (addedCount > 0) {
        markDirty();
        if (options?.selectLast && lastAddedLocalId) {
          setSelectedItemId(lastAddedLocalId);
        }
        if (options?.scrollToLast && firstAddedIndex !== null) {
          setPendingScrollIndex(firstAddedIndex + addedCount - 1);
        }
      }

      return { added: addedCount, duplicates: duplicateCount };
    },
    [markDirty],
  );

  const {
    sourceModalOpen,
    setSourceModalOpen,
    sourceModalMode,
    setSourceModalMode,
    openPlaylistImportModal,
    playlistAddError,
    setPlaylistAddError,
    singleTrackUrl,
    singleTrackTitle,
    singleTrackAnswer,
    singleTrackError,
    singleTrackLoading,
    duplicateIndex,
    isDuplicate,
    canEditSingleMeta,
    handleImportPlaylist,
    handleSingleTrackUrlChange,
    handleSingleTrackTitleChange,
    handleSingleTrackAnswerChange,
    handleSingleTrackCancel,
    handleAddSingleTrack,
  } = useCollectionEditImport({
    authToken,
    playlistLoading,
    playlistError,
    fetchedPlaylistItems,
    playlistItems,
    handleFetchPlaylist,
    handleResetPlaylist,
    appendItems,
  });

  useEffect(() => {
    if (hasResetPlaylistRef.current) return;
    hasResetPlaylistRef.current = true;
    handleResetPlaylist();
  }, [handleResetPlaylist]);

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        window.clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedChanges]);

  const saveReviewStatusImmediately = useCallback(() => {
    const persist = async () => {
      let attempts = 0;
      while (saveInFlightRef.current && attempts < 20) {
        attempts += 1;
        await new Promise((resolve) => window.setTimeout(resolve, 150));
      }
      await handleSaveCollection("auto");
    };

    window.setTimeout(() => {
      void persist();
    }, 0);
  }, [handleSaveCollection]);

  const saveCollectionMetadataImmediately = useCallback(
    async (
      nextTitle: string,
      nextDescription: string,
      previousTitle: string,
      previousDescription: string,
      wasCleanBeforeTitleSave: boolean,
    ) => {
      if (!authToken || !activeCollectionId) {
        setCollectionTitle(previousTitle);
        setCollectionDescription(previousDescription);
        setTitleDraft(previousTitle);
        setDescriptionDraft(previousDescription);
        setSaveStatus("error");
        setSaveError("請先登入並選擇收藏庫後再修改資訊");
        return;
      }

      setSaveStatus("saving");
      setSaveError(null);

      try {
        const token = await ensureFreshAuthToken({
          token: authToken,
          refreshAuthToken,
        });
        if (!token) {
          throw new Error("登入已過期，請重新登入");
        }

        await collectionsApi.updateCollection(token, activeCollectionId, {
          title: nextTitle,
          description: nextDescription || null,
        });

        setCollections((prev) =>
          prev.map((item) =>
            item.id === activeCollectionId
              ? {
                  ...item,
                  title: nextTitle,
                  description: nextDescription || null,
                }
              : item,
          ),
        );

        if (wasCleanBeforeTitleSave) {
          window.setTimeout(() => {
            resetBaseline();
            setHasUnsavedChanges(false);
          }, 0);
        }

        setSaveStatus("saved");
      } catch (error) {
        setCollectionTitle(previousTitle);
        setCollectionDescription(previousDescription);
        setTitleDraft(previousTitle);
        setDescriptionDraft(previousDescription);
        setSaveStatus("error");
        setSaveError(error instanceof Error ? error.message : String(error));
      }
    },
    [
      activeCollectionId,
      authToken,
      refreshAuthToken,
      resetBaseline,
      setHasUnsavedChanges,
    ],
  );

  const toggleItemNoChange = useCallback(
    (index: number) => {
      const target = playlistItems[index];
      if (!target || target.answerStatus !== "original") return;

      updateItemAtIndex(index, {
        answerStatus: "manual_reviewed",
      });
      saveReviewStatusImmediately();
    },
    [playlistItems, saveReviewStatusImmediately, updateItemAtIndex],
  );

  const applyPlaylistTitle = () => {
    if (!lastFetchedPlaylistTitle) return;
    setCollectionTitle(lastFetchedPlaylistTitle);
    setCollectionTitleTouched(true);
    markDirty();
  };

  useEffect(() => {
    if (pendingScrollIndex === null) return;
    setHighlightIndex(pendingScrollIndex);
    setPendingScrollIndex(null);
  }, [pendingScrollIndex]);

  useEffect(() => {
    if (duplicateIndex === null) return;
    setHighlightIndex(duplicateIndex);
  }, [duplicateIndex]);

  useEffect(() => {
    if (highlightTimerRef.current) {
      window.clearTimeout(highlightTimerRef.current);
    }
    if (highlightIndex === null) return;

    highlightTimerRef.current = window.setTimeout(() => {
      setHighlightIndex(null);
    }, 1400);
  }, [highlightIndex]);

  const moveItem = useCallback(
    (fromIndex: number, toIndex: number) => {
      reorderRef.current = true;
      reorderSelectedIdRef.current = lastSelectedIdRef.current;

      if (
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= playlistItems.length ||
        toIndex >= playlistItems.length ||
        fromIndex === toIndex
      ) {
        return;
      }

      setPlaylistItems((prev) => {
        const next = [...prev];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, moved);
        return next;
      });
      markDirty();
    },
    [markDirty, playlistItems.length],
  );

  const removeItem = useCallback(
    async (index: number) => {
      const target = playlistItems[index];
      if (!target) return;

      dirtyItemIdsRef.current.delete(target.localId);

      const nextItems = playlistItems.filter((_item, idx) => idx !== index);
      const nextSelectedId =
        target.localId === selectedItem?.localId
          ? (playlistItems[index + 1]?.localId ??
            playlistItems[index - 1]?.localId ??
            null)
          : (selectedItem?.localId ?? null);

      if (!target.dbId || !activeCollectionId || !authToken) {
        markDirty();
        setPlaylistItems(nextItems);
        if (nextSelectedId !== (selectedItem?.localId ?? null)) {
          setSelectedItemId(nextSelectedId);
        }
        return;
      }

      const previousItems = playlistItems;
      const previousSelectedId = selectedItemId;
      const hadUnsavedChanges = hasUnsavedChanges;

      setSaveStatus("saving");
      setSaveError(null);
      setPlaylistItems(nextItems);
      if (nextSelectedId !== selectedItemId) {
        setSelectedItemId(nextSelectedId);
      }

      try {
        const token = await ensureFreshAuthToken({
          token: authToken,
          refreshAuthToken,
        });
        if (!token) {
          throw new Error("登入已過期，請重新登入");
        }

        await collectionsApi.deleteCollectionItem(token, target.dbId);
        setPendingDeleteIds((ids) => ids.filter((id) => id !== target.dbId));
        setCollections((prev) =>
          prev.map((item) =>
            item.id === activeCollectionId
              ? {
                  ...item,
                  item_count: Math.max(
                    0,
                    (item.item_count ?? previousItems.length) - 1,
                  ),
                }
              : item,
          ),
        );

        if (hadUnsavedChanges) {
          setSaveStatus("idle");
        } else {
          baselineSnapshotRef.current = buildSnapshot(
            nextItems,
            collectionTitle,
            collectionDescription,
            pendingDeleteIds.filter((id) => id !== target.dbId),
          );
          baselineReadyRef.current = true;
          dirtyCounterRef.current = 0;
          setHasUnsavedChanges(false);
          setSaveStatus("saved");
        }
      } catch (error) {
        setPlaylistItems(previousItems);
        setSelectedItemId(previousSelectedId);
        setSaveStatus("error");
        setSaveError(error instanceof Error ? error.message : String(error));
      }
    },
    [
      activeCollectionId,
      authToken,
      buildSnapshot,
      collectionDescription,
      collectionTitle,
      hasUnsavedChanges,
      markDirty,
      pendingDeleteIds,
      playlistItems,
      refreshAuthToken,
      selectedItem?.localId,
      selectedItemId,
    ],
  );

  if (authLoading) {
    return (
      <div className="flex flex-col w-95/100 space-y-4">
        <div className="text-xs text-[var(--mc-text-muted)]">載入中...</div>
        <div className="rounded-lg border border-[var(--mc-border)] bg-[var(--mc-surface)]/70 p-4 text-sm text-[var(--mc-text-muted)]">
          正在確認登入狀態
        </div>
      </div>
    );
  }

  if (collectionsLoading || itemsLoading) {
    return (
      <div className="mx-auto flex w-full max-w-none flex-col gap-3 overflow-x-hidden min-h-0">
        <LoadingPage
          title="載入收藏庫中"
          subtitle="正在準備收藏庫內容，請稍候..."
        />
      </div>
    );
  }

  if (!authToken) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <div className="rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface)]/80 p-5 text-sm text-[var(--mc-text)]">
          請先使用 Google 登入後再編輯收藏庫。
        </div>
        <div className="text-sm text-[var(--mc-text-muted)]">
          目前為訪客模式，無法使用收藏庫功能。
        </div>
        <div>
          <Button
            variant="outlined"
            size="small"
            onClick={() => navigate("/collections", { replace: true })}
          >
            {TEXT.backRooms}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-none flex-col gap-3 overflow-x-hidden min-h-0 mb-0">
      <EditHeader
        title={collectionTitle}
        titleDraft={titleDraft}
        descriptionDraft={descriptionDraft}
        isTitleEditing={isTitleEditing}
        onTitleDraftChange={(value) => setTitleDraft(value)}
        onDescriptionDraftChange={(value) => setDescriptionDraft(value)}
        onTitleSave={() => {
          const nextTitle = titleDraft.trim();
          const nextDescription = descriptionDraft.trim();
          if (!nextTitle) {
            setIsTitleEditing(false);
            setTitleDraft(collectionTitle);
            setDescriptionDraft(collectionDescription);
            return;
          }
          if (
            nextTitle === collectionTitle.trim() &&
            nextDescription === collectionDescription.trim()
          ) {
            setIsTitleEditing(false);
            setTitleDraft(collectionTitle);
            setDescriptionDraft(collectionDescription);
            return;
          }

          const previousTitle = collectionTitle;
          const previousDescription = collectionDescription;
          const wasCleanBeforeTitleSave = !hasUnsavedChanges;

          setCollectionTitle(nextTitle);
          setCollectionDescription(nextDescription);
          if (!collectionTitleTouched) {
            setCollectionTitleTouched(true);
          }
          setIsTitleEditing(false);

          void saveCollectionMetadataImmediately(
            nextTitle,
            nextDescription,
            previousTitle,
            previousDescription,
            wasCleanBeforeTitleSave,
          );
        }}
        onTitleCancel={() => {
          setTitleDraft(collectionTitle);
          setDescriptionDraft(collectionDescription);
          setIsTitleEditing(false);
        }}
        onStartEdit={() => {
          setTitleDraft(collectionTitle);
          setDescriptionDraft(collectionDescription);
          setIsTitleEditing(true);
        }}
        showApplyPlaylistTitle={
          !!lastFetchedPlaylistTitle &&
          lastFetchedPlaylistTitle !== collectionTitle.trim()
        }
        onApplyPlaylistTitle={applyPlaylistTitle}
        onBack={() => {
          if (!confirmLeave()) return;
          navigate("/collections", { replace: true });
        }}
        onSave={() => handleSaveCollection("manual")}
        isSaving={saveStatus === "saving"}
        isReadOnly={isReadOnly}
        savingLabel={SAVING_LABEL}
        savedLabel={SAVED_LABEL}
        saveErrorLabel={SAVE_ERROR_LABEL}
        saveStatus={saveStatus}
        saveError={saveError}
        autoSaveNotice={autoSaveNotice}
        hasUnsavedChanges={hasUnsavedChanges}
        visibility={collectionVisibility}
        onVisibilityChange={(value) => {
          if (visibilityUpdating) return;
          if (value !== collectionVisibility) {
            setPendingVisibility(value);
            setConfirmPublicOpen(true);
            return;
          }
          void applyVisibilityChange(value);
        }}
        collectionCount={collectionCount}
        onShare={() => {
          void handleShareCollection();
        }}
        shareCopied={shareCopied}
        shareDisabled={
          !activeCollectionId || isReadOnly || collectionVisibility !== "public"
        }
        onCollectionButtonClick={(event) => {
          setCollectionAnchor(event.currentTarget);
          setCollectionMenuOpen((prev) => !prev);
        }}
        collectionMenuOpen={collectionMenuOpen}
        hasCategorySet={!!categoryId}
        collectionIsPublic={collectionVisibility === "public"}
        categorySaving={categorySaving}
        categoryDrawerContent={
          activeCollectionId && !isReadOnly ? (
            <CategoryDrawerPanel
              categoryId={categoryId}
              subTagKeys={subTagKeys}
              visibility={collectionVisibility}
              isSaving={categorySaving}
              detectSuggestion={categoryDetectSuggestion}
              detectIsRunning={categoryDetecting}
              detectHasRun={categoryDetectRan}
              onCategoryChange={setCategoryId}
              onSubTagsChange={setSubTagKeys}
            />
          ) : undefined
        }
      />

      {/* Category section is now in EditHeader's drawer (LabelOutlined button) */}

      <CollectionPopover
        open={collectionMenuOpen}
        anchorEl={collectionAnchor}
        onClose={() => setCollectionMenuOpen(false)}
        label={COLLECTION_SELECT_LABEL}
        newLabel={NEW_COLLECTION_LABEL}
        collections={collections}
        activeCollectionId={activeCollectionId}
        onCreateNew={() => {
          if (!confirmLeave()) return;
          setCollectionMenuOpen(false);
          navigate("/collections/new");
        }}
        onSelect={(id) => {
          if (!confirmLeave()) return;
          setCollectionMenuOpen(false);
          navigate(`/collections/${id}/edit`);
          setActiveCollectionId(id);
          const selected = collections.find((item) => item.id === id);
          setCollectionTitle(selected?.title ?? "");
          setCollectionDescription(selected?.description ?? "");
          setCollectionVisibility(selected?.visibility ?? "private");
          setCategoryId((selected as Record<string, unknown> & { category?: { id?: string | null } | null })?.category?.id ?? null);
          setSubTagKeys((selected as Record<string, unknown> & { sub_tag_keys?: string[] })?.sub_tag_keys ?? []);
          resetPendingItemSyncState();
          setPlaylistItems([]);
          setPlaylistAddError(null);
          setPendingDeleteIds([]);
          setSelectedItemId(null);
          pendingSelectedIndexRef.current = 0;
          setHasUnsavedChanges(false);
          setSaveStatus("idle");
          setSaveError(null);
          dirtyCounterRef.current = 0;
        }}
      />

      <ConfirmDialog
        open={confirmPublicOpen}
        title={pendingVisibility === "private" ? "設為私人？" : "設為公開？"}
        description={
          pendingVisibility === "private"
            ? "切換為私人後，只有你能瀏覽此收藏庫內容。確定要設為私人嗎？"
            : "切換為公開後，任何人都能瀏覽此收藏庫內容。確定要公開嗎？"
        }
        confirmLabel={pendingVisibility === "private" ? "設為私人" : "設為公開"}
        onConfirm={() => {
          if (pendingVisibility) {
            void applyVisibilityChange(pendingVisibility);
          }
          setPendingVisibility(null);
          setConfirmPublicOpen(false);
        }}
        onCancel={() => {
          setPendingVisibility(null);
          setConfirmPublicOpen(false);
        }}
      />

      <PlaylistSourceModal
        open={sourceModalOpen}
        mode={sourceModalMode}
        onClose={() => {
          setSourceModalOpen(false);
          handleSingleTrackCancel();
        }}
        onModeChange={setSourceModalMode}
        playlistUrl={playlistUrl}
        onChangePlaylistUrl={(value) => {
          setPlaylistUrl(value);
          if (playlistAddError) setPlaylistAddError(null);
        }}
        onImportPlaylist={handleImportPlaylist}
        playlistLoading={playlistLoading}
        playlistError={playlistError}
        playlistAddError={playlistAddError}
        singleTrackUrl={singleTrackUrl}
        singleTrackTitle={singleTrackTitle}
        singleTrackAnswer={singleTrackAnswer}
        singleTrackError={singleTrackError}
        singleTrackLoading={singleTrackLoading}
        isDuplicate={isDuplicate}
        canEditSingleMeta={canEditSingleMeta}
        onSingleTrackUrlChange={handleSingleTrackUrlChange}
        onSingleTrackTitleChange={handleSingleTrackTitleChange}
        onSingleTrackAnswerChange={handleSingleTrackAnswerChange}
        onAddSingle={handleAddSingleTrack}
      />

      <div
        className={` p-1 shadow-[0_24px_60px_-36px_rgba(2,6,23,0.9)] overflow-hidden min-h-0 ${
          isReadOnly ? "pointer-events-none opacity-60" : ""
        }`}
      >
        {(collectionsError || itemsError) && (
          <div className="m-2 rounded-xl border border-rose-500/40 bg-rose-950/35 px-3 py-2 text-xs text-rose-200">
            {collectionsError || itemsError}
          </div>
        )}

        <div className="mt-2 grid gap-3 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="order-2 lg:order-2 min-w-0">
            <PlaylistListPanel
              items={playlistItems}
              maxItems={activeCollectionItemLimit}
              selectedIndex={selectedIndex}
              onSelect={handleSelectIndex}
              onRemove={removeItem}
              onReorder={moveItem}
              onToggleNoChange={toggleItemNoChange}
              listRef={listContainerRef}
              highlightIndex={highlightIndex}
              clipDurationLabel={CLIP_DURATION_LABEL}
              formatSeconds={formatSeconds}
              onOpenSourceModal={openPlaylistImportModal}
              sourceModalOpen={sourceModalOpen}
              autoPlayOnSwitch={autoPlayOnSwitch}
              onAutoPlayChange={handleAutoPlayToggle}
            />
          </div>

          <div className="order-1 lg:order-1 min-w-0 space-y-2">
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_220px]">
              {bulkPlaybackOpen ? (
                <div className="hidden p-2.5 md:block">
                  <div className="flex aspect-16/6 w-full items-center justify-center rounded-xl border border-[var(--mc-border)] bg-[var(--mc-surface)]/45 text-sm text-[var(--mc-text-muted)]">
                    播放器已移到批量預覽面板。
                  </div>
                  <div className="mt-2 flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="h-4 w-2/3 rounded-full bg-[var(--mc-surface-strong)]/60" />
                      <div className="h-3 w-1/3 rounded-full bg-[var(--mc-surface-strong)]/40" />
                    </div>
                    <div className="h-7 w-24 rounded-full bg-[var(--mc-surface-strong)]/40" />
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-[var(--mc-surface-strong)]/45" />
                </div>
              ) : (
                playerPanelNode
              )}

              <AnswerPanel
                title={TEXT.answer}
                value={answerText}
                placeholder={TEXT.answerPlaceholder}
                disabled={!selectedItem}
                maxLength={ANSWER_MAX_LENGTH}
                onChange={(value) => {
                  updateSelectedAnswerText(value);
                }}
                actionLabel="AI 修改答案"
                actionDisabled={playlistItems.length === 0}
                onActionClick={openAiBatchModal}
              />
            </div>

            <ClipEditorPanel
              title={TEXT.editTime}
              startLabel={TEXT.start}
              endLabel={TEXT.end}
              startTimeLabel={START_TIME_LABEL}
              endTimeLabel={END_TIME_LABEL}
              startSec={startSec}
              endSec={endSec}
              maxSec={maxSec}
              onRangeChange={handleRangeChangeWithPreview}
              onRangeCommit={handleRangeCommitWithPreview}
              onStartThumbPress={handleStartThumbPressWithPreview}
              onEndThumbPress={handleEndThumbPressWithPreview}
              formatSeconds={formatSeconds}
              startTimeInput={startTimeInput}
              endTimeInput={endTimeInput}
              onStartInputChange={handleStartInputChange}
              onEndInputChange={handleEndInputChange}
              onStartBlur={() => {
                const parsed = parseTimeInput(startTimeInput);
                if (parsed === null) {
                  handleStartInputChange(formatSeconds(startSec));
                  return;
                }
                if (parsed === startSec) {
                  handleStartInputChange(formatSeconds(startSec));
                  return;
                }
                handleStartChangeWithPreview(parsed);
              }}
              onEndBlur={() => {
                const parsed = parseTimeInput(endTimeInput);
                if (parsed === null) {
                  handleEndInputChange(formatSeconds(endSec));
                  return;
                }
                if (parsed === endSec) {
                  handleEndInputChange(formatSeconds(endSec));
                  return;
                }
                handleEndChangeWithPreview(parsed);
              }}
              onStartKeyDown={(e) => {
                if (e.key === "Enter") {
                  (e.target as HTMLInputElement).blur();
                }
              }}
              onEndKeyDown={(e) => {
                if (e.key === "Enter") {
                  (e.target as HTMLInputElement).blur();
                }
              }}
              actionLabel="一鍵套用播放區間"
              actionDisabled={
                playlistItems.length === 0 || isReadOnly || bulkPlaybackApplying
              }
              onActionClick={() => setBulkPlaybackOpen(true)}
            />
          </div>
        </div>
      </div>

      <CollectionEditAiBatchDrawer
        open={aiBatchModalOpen}
        onClose={closeAiBatchModal}
        aiProviderLabel={aiProviderLabel}
        playlistItemsCount={playlistItems.length}
        aiPromptPages={aiPromptPages}
        aiBatchPageIndex={aiBatchPageIndex}
        onAiBatchPageChange={setAiBatchPageIndex}
        aiJsonDrafts={aiJsonDrafts}
        aiAppliedPages={aiAppliedPages}
        aiAppliedBatchRecords={aiAppliedBatchRecords}
        currentAiJsonDraft={currentAiJsonDraft}
        onCurrentAiJsonDraftChange={setCurrentAiJsonDraft}
        aiParsedResult={aiParsedResult}
        aiPreview={aiPreview}
        aiPageStatuses={aiPageStatuses}
        aiPromptSettings={aiPromptSettings}
        onAiPromptSettingsChange={updateAiPromptSettings}
        onAiSplitFieldChange={updateAiSplitField}
        onAddAiSplitField={addAiSplitField}
        onRemoveAiSplitField={removeAiSplitField}
        onReorderAiSplitField={reorderAiSplitField}
        aiPromptText={aiPromptText}
        onCopyAiPrompt={handleCopyAiPrompt}
        onOpenAiAssistant={handleOpenAiAssistant}
        canApplyAiBatch={canApplyAiBatch}
        onApplyAiBatch={handleApplyAiBatch}
        aiBatchWriteState={aiBatchWriteState}
        pendingAiBatchSave={pendingAiBatchSave}
        canCloseAiBatchModal={canCloseAiBatchModal}
        aiBatchSaveProgressLabel={aiBatchSaveProgressLabel}
        aiBatchSaveStepLabel={aiBatchSaveStepLabel}
        onRetryAiBatchWrite={handleRetryAiBatchWrite}
        onBackToPreview={resetAiBatchWriteState}
      />

      <BulkPlaybackRangeDrawer
        open={bulkPlaybackOpen}
        draft={bulkPlaybackDraft}
        previewItems={bulkPlaybackPreviewItems}
        affectedItems={bulkPlaybackAffectedItems}
        canApply={canApplyBulkPlayback && !isReadOnly}
        isApplying={bulkPlaybackApplying}
        applyProgress={bulkPlaybackProgress}
        applyLabel="套用並寫入資料庫"
        previewContent={drawerPlayerPanelNode}
        formatSeconds={formatSeconds}
        onClose={closeBulkPlaybackDrawer}
        onDraftChange={setBulkPlaybackDraft}
        onPreviewItem={handleBulkPlaybackPreviewItem}
        onApply={handleApplyBulkPlayback}
      />

      {autoSaveNotice && (
        <div
          className={`fixed bottom-4 right-4 z-50 rounded-md px-3 py-2 text-xs text-white shadow ${
            autoSaveNotice.type === "success"
              ? "bg-emerald-500/90"
              : "bg-rose-500/90"
          }`}
        >
          {autoSaveNotice.message}
        </div>
      )}
    </div>
  );
};

export default CollectionEditPage;

