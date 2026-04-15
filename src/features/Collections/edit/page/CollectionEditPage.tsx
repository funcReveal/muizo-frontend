import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@mui/material";
import ConfirmDialog from "../../../../shared/ui/ConfirmDialog";
import LoadingPage from "../../../../shared/ui/LoadingPage";
import { useAuth } from "../../../../shared/auth/AuthContext";
import { useRoomPlaylist } from "../../../Room/model/RoomPlaylistContext";
import { isAdminRole } from "../../../../shared/auth/roles";
import type { DbCollection, EditableItem } from "../utils/editTypes";
import {
  buildEditableItems,
  buildEditableItemsFromDb,
} from "../utils/editMappers";
import { useCollectionEditor } from "../hooks/useCollectionEditor";
import { useCollectionLoader } from "../hooks/useCollectionLoader";
import { useCollectionEditAiBatch } from "../hooks/useCollectionEditAiBatch";
import { collectionsApi } from "../../shared/api/collectionsApi";
import {
  MAX_PRIVATE_COLLECTIONS_PER_USER,
  resolveCollectionItemLimit,
} from "../../shared/model/collectionLimits";
import { ensureFreshAuthToken } from "../../../../shared/auth/token";
import CollectionPopover from "../components/playlist/CollectionPopover";
import ClipEditorPanel from "../components/player/ClipEditorPanel";
import AnswerPanel from "../components/answer/AnswerPanel";
import EditHeader from "../components/header/EditHeader";
import PlaylistListPanel from "../components/playlist/PlaylistListPanel";
import PlaylistSourceModal from "../components/playlist/PlaylistSourceModal";
import PlayerPanel from "../components/player/PlayerPanel";
import CollectionEditAiBatchDialog from "../components/ai/CollectionEditAiBatchDialog";
import {
  DEFAULT_DURATION_SEC,
  createLocalId,
  createServerId,
  extractVideoId,
  extractYoutubeChannelId,
  formatSeconds,
  getPlaylistItemKey,
  parseDurationToSeconds,
  parseTimeInput,
  thumbnailFromId,
} from "../utils/editUtils";
import {
  ANSWER_MAX_LENGTH,
  CLIP_DURATION_LABEL,
  COLLECTION_SELECT_LABEL,
  DUPLICATE_SONG_ERROR,
  EDIT_AUTOPLAY_STORAGE_KEY,
  EDIT_LOOP_STORAGE_KEY,
  EDIT_MUTE_STORAGE_KEY,
  EDIT_VOLUME_STORAGE_KEY,
  END_TIME_LABEL,
  LEGACY_ID_KEY,
  LEGACY_VOLUME_STORAGE_KEY,
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
type YTPlayer = YT.Player;
type YTPlayerEvent = YT.PlayerEvent;
type YTPlayerStateEvent = YT.OnStateChangeEvent;
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
  } = useRoomPlaylist();

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
  // When we create a new collection, we update the URL to include the new id.
  // That route-param change used to trigger a full local-state reset, which
  // looks like a page refresh. This ref lets us treat that specific param
  // change as a URL sync only.
  const skipRouteResetOnNextParamRef = useRef<string | null>(null);
  const progressRafRef = useRef<number | null>(null);
  const baselineSnapshotRef = useRef<string>("");
  const baselineReadyRef = useRef(false);
  const dirtyCounterRef = useRef(0);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);

  const [collectionTitle, setCollectionTitle] = useState("");
  const [collectionTitleTouched, setCollectionTitleTouched] = useState(false);
  const [collectionVisibility, setCollectionVisibility] = useState<
    "private" | "public"
  >("private");
  const [confirmPublicOpen, setConfirmPublicOpen] = useState(false);
  const [pendingVisibility, setPendingVisibility] = useState<
    "private" | "public" | null
  >(null);
  const [visibilityUpdating, setVisibilityUpdating] = useState(false);
  const [isTitleEditing, setIsTitleEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [collectionMenuOpen, setCollectionMenuOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [sourceModalOpen, setSourceModalOpen] = useState(false);
  const [sourceModalMode, setSourceModalMode] = useState<"playlist" | "single">(
    "playlist",
  );
  const [collectionAnchor, setCollectionAnchor] = useState<HTMLElement | null>(
    null,
  );
  const shareFeedbackTimerRef = useRef<number | null>(null);
  const [playlistItems, setPlaylistItems] = useState<EditableItem[]>([]);
  // const [playlistLoading, setPlaylistLoading] = useState(false);
  // const [playlistError, setPlaylistError] = useState<string | null>(null);
  const [playlistAddError, setPlaylistAddError] = useState<string | null>(null);
  const [pendingPlaylistImport, setPendingPlaylistImport] = useState(false);
  const [singleTrackUrl, setSingleTrackUrl] = useState("");
  const [singleTrackTitle, setSingleTrackTitle] = useState("");
  const [singleTrackDuration, setSingleTrackDuration] = useState("");
  const [singleTrackAnswer, setSingleTrackAnswer] = useState("");
  const [singleTrackUploader, setSingleTrackUploader] = useState("");
  const [singleTrackChannelId, setSingleTrackChannelId] = useState("");
  const [singleTrackError, setSingleTrackError] = useState<string | null>(null);
  const [singleTrackLoading, setSingleTrackLoading] = useState(false);
  const lastResolvedUrlRef = useRef<string | null>(null);
  const [duplicateIndex, setDuplicateIndex] = useState<number | null>(null);
  const [highlightIndex, setHighlightIndex] = useState<number | null>(null);
  const [pendingScrollIndex, setPendingScrollIndex] = useState<number | null>(
    null,
  );
  const listContainerRef = useRef<HTMLDivElement | null>(null);
  const highlightTimerRef = useRef<number | null>(null);
  const lastUrlRef = useRef<string>("");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const pendingSelectedIndexRef = useRef<number | null>(null);
  const selectedIndexRef = useRef(0);
  const reorderRef = useRef(false);
  const reorderSelectedIdRef = useRef<string | null>(null);
  const lastSelectedIdRef = useRef<string | null>(null);
  const lastSelectedVideoIdRef = useRef<string | null>(null);
  const [startSec, setStartSec] = useState(0);
  const [startTimeInput, setStartTimeInput] = useState(formatSeconds(0));
  const [endSec, setEndSec] = useState(DEFAULT_DURATION_SEC);
  const [endTimeInput, setEndTimeInput] = useState(
    formatSeconds(DEFAULT_DURATION_SEC),
  );
  const [answerText, setAnswerText] = useState("");
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const currentVideoItemIdRef = useRef<string | null>(null);
  const playRequestedRef = useRef(false);
  const shouldSeekToStartRef = useRef(false);
  const selectedStartRef = useRef(0);
  const pendingAutoStartRef = useRef<number | null>(null);
  const autoPlaySeekedRef = useRef(false);
  const hasResetPlaylistRef = useRef(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const isPlayingRef = useRef<boolean>(false);
  const [volume, setVolume] = useState(() => {
    if (typeof window === "undefined") return 50;
    const stored =
      window.localStorage.getItem(EDIT_VOLUME_STORAGE_KEY) ??
      window.localStorage.getItem(LEGACY_VOLUME_STORAGE_KEY);
    const parsed = stored ? Number(stored) : NaN;
    if (!Number.isFinite(parsed)) return 50;
    return Math.min(100, Math.max(0, parsed));
  });
  const [isMuted, setIsMuted] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(EDIT_MUTE_STORAGE_KEY) === "1";
  });
  const volumeRef = useRef<number>(volume);
  const isMutedRef = useRef<boolean>(isMuted);
  const lastVolumeRef = useRef<number>(volume);
  const lastAppliedPlayerVolumeRef = useRef<number | null>(null);
  const lastAppliedPlayerMutedRef = useRef<boolean | null>(null);
  const [autoPlayOnSwitch, setAutoPlayOnSwitch] = useState(() => {
    if (typeof window === "undefined") return false;
    const saved = window.localStorage.getItem(EDIT_AUTOPLAY_STORAGE_KEY);
    if (saved === "1") return true;
    if (saved === "0") return false;
    return false;
  });
  const [loopEnabled, setLoopEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    const saved = window.localStorage.getItem(EDIT_LOOP_STORAGE_KEY);
    if (saved === "1") return true;
    if (saved === "0") return false;
    return true;
  });
  const autoPlayRef = useRef(false);
  useEffect(() => {
    autoPlayRef.current = autoPlayOnSwitch;
  }, [autoPlayOnSwitch]);
  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);
  const [ytReady, setYtReady] = useState(false);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);

  const markDirty = useCallback(() => {
    dirtyCounterRef.current += 1;
    setHasUnsavedChanges(true);
    setSaveStatus((prev) => (prev !== "idle" ? "idle" : prev));
    setSaveError((prev) => (prev ? null : prev));
  }, []);

  const buildSnapshot = useCallback(
    (items: EditableItem[], title: string, deletes: string[]): string => {
      const payload = {
        title: title.trim(),
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
      pendingDeleteIds,
    );
    baselineReadyRef.current = true;
  }, [buildSnapshot, collectionTitle, pendingDeleteIds, playlistItems]);
  const handleSavedBaseline = useCallback(() => {
    window.setTimeout(() => {
      resetBaseline();
    }, 0);
  }, [resetBaseline]);
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
    collectionVisibility,
    activeCollectionId,
    activeCollectionStoredTitle: activeCollection?.title ?? null,
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
    navigateToEdit: (id) => {
      skipRouteResetOnNextParamRef.current = id;
      navigate(`/collections/${id}/edit`, { replace: true });
    },
    markDirty,
    refreshAuthToken,
    onAuthExpired: () => {
      setSaveStatus("error");
      setSaveError("登入已過期，請重新登入");
      showAutoSaveNotice("error", "登入已過期，請重新登入");
    },
    onSaved: handleSavedBaseline,
  });
  const isReadOnly = !authToken || authExpired;
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
      setCollectionVisibility("private");
    }
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
    dirtyCounterRef.current = 0;
  }, [collectionId]);

  useEffect(() => {
    if (itemsLoading || itemsError) return;
    if (!baselineReadyRef.current) {
      resetBaseline();
    }
  }, [itemsLoading, itemsError, resetBaseline]);

  useEffect(() => {
    if (!baselineReadyRef.current) return;
    const snapshot = buildSnapshot(
      playlistItems,
      collectionTitle,
      pendingDeleteIds,
    );
    const isDirty = snapshot !== baselineSnapshotRef.current;
    if (isDirty && dirtyCounterRef.current === 0) {
      // Data just loaded or normalized by the server; treat as baseline.
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
  }, [collectionTitle, isTitleEditing]);

  useEffect(() => {
    if (!playlistItems.length) {
      setSelectedItemId(null);
      pendingSelectedIndexRef.current = null;
      return;
    }
    if (pendingSelectedIndexRef.current !== null) {
      const idx = pendingSelectedIndexRef.current;
      pendingSelectedIndexRef.current = null;
      const item = playlistItems[idx];
      selectedStartRef.current = item?.startSec ?? 0;
      pendingAutoStartRef.current = selectedStartRef.current;
      shouldSeekToStartRef.current = true;
      setSelectedItemId(item ? item.localId : playlistItems[0].localId);
      autoPlaySeekedRef.current = false;
      return;
    }
    if (!selectedItemId) {
      selectedStartRef.current = playlistItems[0]?.startSec ?? 0;
      pendingAutoStartRef.current = selectedStartRef.current;
      shouldSeekToStartRef.current = true;
      setSelectedItemId(playlistItems[0].localId);
      autoPlaySeekedRef.current = false;
      return;
    }
    const exists = playlistItems.some(
      (item) => item.localId === selectedItemId,
    );
    if (!exists) {
      selectedStartRef.current = playlistItems[0]?.startSec ?? 0;
      pendingAutoStartRef.current = selectedStartRef.current;
      shouldSeekToStartRef.current = true;
      setSelectedItemId(playlistItems[0].localId);
      autoPlaySeekedRef.current = false;
    }
  }, [playlistItems, selectedItemId]);

  const selectedIndex = useMemo(() => {
    if (!playlistItems.length) return 0;
    if (!selectedItemId) return 0;
    const idx = playlistItems.findIndex(
      (item) => item.localId === selectedItemId,
    );
    return idx >= 0 ? idx : 0;
  }, [playlistItems, selectedItemId]);
  useEffect(() => {
    selectedIndexRef.current = selectedIndex;
  }, [selectedIndex]);
  const selectedItem = playlistItems[selectedIndex] ?? null;
  const durationSec = useMemo(() => {
    return (
      parseDurationToSeconds(selectedItem?.duration) ?? DEFAULT_DURATION_SEC
    );
  }, [selectedItem?.duration]);
  const maxSec = Math.max(1, durationSec);
  const canEditSingleMeta = singleTrackUrl.trim().length > 0;
  const isDuplicate = duplicateIndex !== null;
  const collectionCount = collections.length;
  const selectedVideoId = extractVideoId(selectedItem?.url);
  const effectiveEnd = Math.max(endSec, startSec + 1);
  const clipDurationSec = Math.max(1, effectiveEnd - startSec);
  const clipCurrentSec = Math.min(
    Math.max(currentTimeSec - startSec, 0),
    clipDurationSec,
  );
  const selectedClipDurationSec = selectedItem
    ? Math.max(0, selectedItem.endSec - selectedItem.startSec)
    : 0;

  const {
    aiProviderLabel,
    aiBatchModalOpen,
    openAiBatchModal,
    closeAiBatchModal,
    aiBatchPageIndex,
    setAiBatchPageIndex,
    aiJsonDrafts,
    aiAppliedPages,
    aiHelperNotice,
    currentAiJsonDraft,
    setCurrentAiJsonDraft,
    aiBatchWriteState,
    resetAiBatchWriteState,
    aiPromptPages,
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
    selectedItem,
    setAnswerText,
    markDirty,
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
      setCollections,
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
    [markDirty, setPlaylistItems],
  );

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

  useEffect(() => {
    if (!pendingPlaylistImport) return;
    if (playlistLoading) return;
    if (playlistError) {
      setPendingPlaylistImport(false);
      return;
    }
    if (fetchedPlaylistItems.length === 0) return;

    const incoming = buildEditableItems(fetchedPlaylistItems);
    const { duplicates } = appendItems(incoming);

    if (duplicates > 0) {
      setPlaylistAddError(DUPLICATE_SONG_ERROR);
    }

    setPendingPlaylistImport(false);
    handleResetPlaylist();
  }, [
    pendingPlaylistImport,
    playlistLoading,
    playlistError,
    fetchedPlaylistItems,
    handleResetPlaylist,
    appendItems,
  ]);

  useEffect(() => {
    if (window.YT?.Player) {
      setYtReady(true);
      return;
    }

    let mounted = true;
    const callback = () => {
      if (!mounted) return;
      setYtReady(true);
    };
    const prev = window.onYouTubeIframeAPIReady;

    const existing = document.querySelector(
      "script[data-yt-iframe-api]",
    ) as HTMLScriptElement | null;
    if (existing) {
      if (window.YT?.Player) {
        setYtReady(true);
      } else {
        window.onYouTubeIframeAPIReady = callback;
      }
      return () => {
        mounted = false;
        // Avoid leaking a callback that closes over this component instance.
        if (window.onYouTubeIframeAPIReady === callback) {
          window.onYouTubeIframeAPIReady = prev;
        }
      };
    }
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    tag.async = true;
    tag.dataset.ytIframeApi = "true";
    window.onYouTubeIframeAPIReady = callback;
    document.body.appendChild(tag);

    return () => {
      mounted = false;
      // Avoid leaking a callback that closes over this component instance.
      if (window.onYouTubeIframeAPIReady === callback) {
        window.onYouTubeIframeAPIReady = prev;
      }
    };
  }, []);

  const syncDurationFromPlayer = useCallback(
    (durationSec: number, targetId?: string | null) => {
      if (!Number.isFinite(durationSec) || durationSec <= 0) return;
      const cap = Math.max(1, Math.floor(durationSec));
      const activeId = targetId ?? currentVideoItemIdRef.current;
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
    [],
  );

  useEffect(() => {
    if (!ytReady || itemsLoading || collectionsLoading) return;
    if (reorderRef.current && selectedVideoId && playerRef.current) {
      const videoData = playerRef.current.getVideoData?.() as
        | unknown
        | undefined;
      const data = videoData as Record<string, unknown> | undefined;
      const sourceId =
        typeof data?.source_id === "string" ? data.source_id : undefined;
      const fallbackId =
        typeof data?.[LEGACY_ID_KEY] === "string"
          ? data[LEGACY_ID_KEY]
          : undefined;
      const currentId = sourceId ?? fallbackId;
      if (currentId && currentId === selectedVideoId) {
        reorderRef.current = false;
        return;
      }
    }
    if (!selectedVideoId || !playerContainerRef.current) {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
      setIsPlayerReady(false);
      setIsPlaying(false);
      return;
    }

    playRequestedRef.current = autoPlayRef.current;
    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
    }
    setIsPlayerReady(false);
    setIsPlaying(false);

    const yt = window.YT;
    if (!yt?.Player) return;
    const player = new yt.Player(playerContainerRef.current, {
      videoId: selectedVideoId,
      playerVars: {
        autoplay: 0,
        controls: 1,
        rel: 0,
        playsinline: 1,
        start: Math.floor(selectedStartRef.current),
      },
      events: {
        onReady: (event: YTPlayerEvent) => {
          setIsPlayerReady(true);
          event.target.setVolume?.(isMutedRef.current ? 0 : volumeRef.current);
          const initialStart = Math.floor(selectedStartRef.current);
          if (autoPlayRef.current) {
            playRequestedRef.current = true;
            event.target.loadVideoById?.({
              videoId: selectedVideoId,
              startSeconds: initialStart,
            });
            const pendingStart = pendingAutoStartRef.current;
            if (pendingStart !== null && Number.isFinite(pendingStart)) {
              window.setTimeout(() => {
                event.target.seekTo?.(pendingStart, true);
              }, 0);
              pendingAutoStartRef.current = null;
            }
          } else {
            playRequestedRef.current = false;
            event.target.cueVideoById?.({
              videoId: selectedVideoId,
              startSeconds: initialStart,
            });
            event.target.pauseVideo?.();
          }
          const boundItemId = currentVideoItemIdRef.current;
          let attempts = 0;
          const trySync = () => {
            const duration = event.target.getDuration?.();
            if (duration && duration > 0) {
              syncDurationFromPlayer(duration, boundItemId);
              return;
            }
            attempts += 1;
            if (attempts < 5) {
              window.setTimeout(trySync, 300);
            }
          };
          trySync();
        },
        onStateChange: (event: YTPlayerStateEvent) => {
          const state = window.YT?.PlayerState;
          if (!state) return;
          if (event.data === state.PLAYING) {
            playRequestedRef.current = true;
            if (autoPlayRef.current && !autoPlaySeekedRef.current) {
              const targetStart = selectedStartRef.current;
              const current = event.target.getCurrentTime?.();
              if (
                typeof current === "number" &&
                targetStart > 0 &&
                current < targetStart - 0.2
              ) {
                event.target.seekTo?.(targetStart, true);
                autoPlaySeekedRef.current = true;
              }
            }
            setIsPlaying(true);
          } else if (
            event.data === state.PAUSED ||
            event.data === state.ENDED
          ) {
            playRequestedRef.current = false;
            setIsPlaying(false);
          }
        },
      },
    });

    playerRef.current = player;
    lastSelectedVideoIdRef.current = selectedVideoId;

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [
    ytReady,
    itemsLoading,
    collectionsLoading,
    selectedVideoId,
    syncDurationFromPlayer,
  ]);

  useEffect(() => {
    if (!isPlayerReady || !playerRef.current) return;
    if (autoPlayRef.current) return;
    playerRef.current.seekTo?.(startSec, true);
    setCurrentTimeSec(startSec);
  }, [startSec, isPlayerReady, selectedVideoId]);

  useEffect(() => {
    if (!isPlayerReady || !playerRef.current) return;
    const player = playerRef.current;

    if (lastAppliedPlayerMutedRef.current !== isMuted) {
      if (isMuted) {
        player.mute?.();
      } else {
        player.unMute?.();
      }
      lastAppliedPlayerMutedRef.current = isMuted;
    }

    if (!isMuted && lastAppliedPlayerVolumeRef.current !== volume) {
      player.setVolume?.(volume);
      lastAppliedPlayerVolumeRef.current = volume;
    }
  }, [volume, isMuted, isPlayerReady]);

  useEffect(() => {
    if (!isPlayerReady || !playerRef.current) return;

    const syncPlayerVolumeState = () => {
      const player = playerRef.current;
      if (!player) return;

      const nextMuted = player.isMuted?.() ?? false;
      const rawVolume = player.getVolume?.();
      const nextVolume = Number.isFinite(rawVolume)
        ? Math.min(100, Math.max(0, Math.round(rawVolume)))
        : null;

      if (typeof nextVolume === "number" && nextVolume !== volumeRef.current) {
        volumeRef.current = nextVolume;
        lastAppliedPlayerVolumeRef.current = nextVolume;
        setVolume(nextVolume);
        if (nextVolume > 0) {
          lastVolumeRef.current = nextVolume;
        }
        if (typeof window !== "undefined") {
          window.localStorage.setItem(
            EDIT_VOLUME_STORAGE_KEY,
            String(nextVolume),
          );
        }
      }

      if (nextMuted !== isMutedRef.current) {
        isMutedRef.current = nextMuted;
        lastAppliedPlayerMutedRef.current = nextMuted;
        setIsMuted(nextMuted);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(
            EDIT_MUTE_STORAGE_KEY,
            nextMuted ? "1" : "0",
          );
        }
      }
    };

    syncPlayerVolumeState();
    const intervalId = window.setInterval(syncPlayerVolumeState, 250);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isPlayerReady, selectedVideoId]);

  useEffect(() => {
    if (!autoPlayRef.current) return;
    if (!isPlayerReady || !playerRef.current) return;
    if (!selectedItemId) return;
    playRequestedRef.current = true;
    if (shouldSeekToStartRef.current) {
      shouldSeekToStartRef.current = false;
      playerRef.current.seekTo?.(selectedStartRef.current, true);
      setCurrentTimeSec(selectedStartRef.current);
    }
    if (pendingAutoStartRef.current !== null) {
      const pendingStart = pendingAutoStartRef.current;
      pendingAutoStartRef.current = null;
      playerRef.current.seekTo?.(pendingStart, true);
      setCurrentTimeSec(pendingStart);
    }
    if (!isPlayingRef.current) {
      playerRef.current.playVideo?.();
    }
  }, [isPlayerReady, selectedItemId]);

  useEffect(() => {
    if (!isPlayerReady || !playerRef.current) return;
    // When paused/idle, continuously polling currentTime via rAF causes the entire
    // EditPage (and the virtualized list) to re-render every frame. Only keep
    // the progress loop running while actively playing.
    if (!isPlaying) return;
    let mounted = true;
    let lastEmitTs = 0;

    const tick = (ts: number) => {
      if (!mounted) return;
      const player = playerRef.current;
      if (player && typeof player.getCurrentTime === "function") {
        const current = player.getCurrentTime();
        // Throttle to reduce expensive UI re-renders while keeping the progress smooth.
        if (ts - lastEmitTs >= 66) {
          lastEmitTs = ts;
          setCurrentTimeSec(current);
        }
        if (isPlaying && current >= effectiveEnd - 0.2) {
          if (loopEnabled) {
            player.seekTo?.(startSec, true);
            if (isPlaying) {
              player.playVideo?.();
            } else {
              player.pauseVideo?.();
            }
          } else {
            player.seekTo?.(effectiveEnd, true);
            player.pauseVideo?.();
          }
        }
      }
      progressRafRef.current = window.requestAnimationFrame(tick);
    };

    progressRafRef.current = window.requestAnimationFrame(tick);
    return () => {
      mounted = false;
      if (progressRafRef.current) {
        window.cancelAnimationFrame(progressRafRef.current);
        progressRafRef.current = null;
      }
    };
  }, [
    isPlayerReady,
    startSec,
    effectiveEnd,
    isPlaying,
    selectedVideoId,
    loopEnabled,
  ]);

  useEffect(() => {
    if (!selectedItem) {
      lastSelectedIdRef.current = null;
      return;
    }
    currentVideoItemIdRef.current = selectedItem.localId;
    const nextId = selectedItem.localId;
    if (lastSelectedIdRef.current === nextId) return;
    if (reorderRef.current && reorderSelectedIdRef.current === nextId) {
      reorderRef.current = false;
      return;
    }
    lastSelectedIdRef.current = nextId;
    reorderRef.current = false;
    const nextStart = Math.min(selectedItem.startSec, maxSec);
    const nextEnd = Math.min(
      Math.max(selectedItem.endSec, nextStart + 1),
      maxSec,
    );
    setStartSec(nextStart);
    setEndSec(nextEnd);
    setStartTimeInput(formatSeconds(nextStart));
    setEndTimeInput(formatSeconds(nextEnd));
    setAnswerText(selectedItem.answerText);
    setCurrentTimeSec(nextStart);
    shouldSeekToStartRef.current = true;
    selectedStartRef.current = nextStart;
  }, [selectedItemId, selectedItem, maxSec]);

  useEffect(() => {
    if (!selectedItem) return;
    const nextStart = Math.min(selectedItem.startSec, maxSec);
    const nextEnd = Math.min(
      Math.max(selectedItem.endSec, nextStart + 1),
      maxSec,
    );
    if (nextStart !== startSec) {
      setStartSec(nextStart);
      setStartTimeInput(formatSeconds(nextStart));
    }
    if (nextEnd !== endSec) {
      setEndSec(nextEnd);
      setEndTimeInput(formatSeconds(nextEnd));
    }
  }, [selectedItem, maxSec, startSec, endSec]);

  const updateSelectedItem = useCallback(
    (updates: Partial<EditableItem>) => {
      setPlaylistItems((prev) =>
        prev.map((item, idx) =>
          idx === selectedIndex ? { ...item, ...updates } : item,
        ),
      );
      markDirty();
    },
    [markDirty, selectedIndex],
  );

  const updateItemAtIndex = useCallback(
    (index: number, updates: Partial<EditableItem>) => {
      setPlaylistItems((prev) =>
        prev.map((item, idx) =>
          idx === index ? { ...item, ...updates } : item,
        ),
      );
      markDirty();
    },
    [markDirty],
  );

  const updateSelectedAnswerText = useCallback(
    (value: string) => {
      setAnswerText(value);
      if (!selectedItem) return;
      const nextStatus =
        value === selectedItem.answerText
          ? (selectedItem.answerStatus ?? "original")
          : "manual_reviewed";
      updateSelectedItem({
        answerText: value,
        answerStatus: nextStatus,
      });
    },
    [selectedItem, updateSelectedItem],
  );

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

  const saveTitleImmediately = useCallback(
    async (nextTitle: string, previousTitle: string) => {
      if (!authToken || !activeCollectionId) {
        setCollectionTitle(previousTitle);
        setTitleDraft(previousTitle);
        setSaveStatus("error");
        setSaveError("請先登入並選擇收藏庫後再修改名稱");
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
        });

        setCollections((prev) =>
          prev.map((item) =>
            item.id === activeCollectionId
              ? { ...item, title: nextTitle }
              : item,
          ),
        );
        setSaveStatus("saved");
      } catch (error) {
        setCollectionTitle(previousTitle);
        setTitleDraft(previousTitle);
        setSaveStatus("error");
        setSaveError(error instanceof Error ? error.message : String(error));
      }
    },
    [activeCollectionId, authToken, refreshAuthToken, setCollections],
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

  const handleSelectIndex = useCallback(
    (nextIndex: number) => {
      if (nextIndex === selectedIndex) return;
      if (hasUnsavedChanges) {
        void handleSaveCollection("auto");
      }
      setSaveStatus("idle");
      const target = playlistItems[nextIndex];
      selectedStartRef.current = target?.startSec ?? 0;
      pendingAutoStartRef.current = selectedStartRef.current;
      shouldSeekToStartRef.current = true;
      setSelectedItemId(target ? target.localId : null);
      autoPlaySeekedRef.current = false;
    },
    [handleSaveCollection, hasUnsavedChanges, playlistItems, selectedIndex],
  );

  const handleImportPlaylist = () => {
    if (playlistLoading) return;
    setPlaylistAddError(null);
    setPendingPlaylistImport(true);
    handleFetchPlaylist();
  };

  const applyPlaylistTitle = () => {
    if (!lastFetchedPlaylistTitle) return;
    setCollectionTitle(lastFetchedPlaylistTitle);
    setCollectionTitleTouched(true);
    markDirty();
  };

  const handleAddSingleTrack = useCallback(() => {
    setSingleTrackError(null);
    const url = singleTrackUrl.trim();
    const title = singleTrackTitle.trim();
    if (!url && !title) {
      setSingleTrackError("請輸入 YouTube 連結或歌曲名稱");
      return;
    }
    const candidateKey = getPlaylistItemKey({ url, title });
    if (candidateKey) {
      const existingKeys = new Set(
        playlistItems.map((item) => getPlaylistItemKey(item)).filter(Boolean),
      );
      if (existingKeys.has(candidateKey)) {
        setSingleTrackError(DUPLICATE_SONG_ERROR);
        return;
      }
    }

    const durationSec =
      parseDurationToSeconds(singleTrackDuration) ?? DEFAULT_DURATION_SEC;
    const safeDuration = Math.max(1, durationSec);
    const videoId = extractVideoId(url);
    const thumbnail = videoId ? thumbnailFromId(videoId) : undefined;
    const resolvedTitle = title || url;
    const localId = createLocalId();
    const provider = videoId ? "youtube" : "manual";
    const sourceId = videoId ?? localId;
    const newItem: EditableItem = {
      localId,
      sourceProvider: provider,
      sourceId,
      title: resolvedTitle,
      url: url || "",
      thumbnail,
      uploader: singleTrackUploader.trim(),
      channelId: singleTrackChannelId.trim() || undefined,
      duration: formatSeconds(safeDuration),
      startSec: 0,
      endSec: Math.max(1, Math.min(DEFAULT_DURATION_SEC, safeDuration)),
      answerText: singleTrackAnswer.trim() || resolvedTitle,
    };

    appendItems([newItem], { selectLast: true, scrollToLast: true });
    setSingleTrackUrl("");
    setSingleTrackTitle("");
    setSingleTrackDuration("");
    setSingleTrackAnswer("");
    setSingleTrackUploader("");
    setSingleTrackChannelId("");
    setDuplicateIndex(null);
    setSourceModalOpen(false);
  }, [
    appendItems,
    playlistItems,
    singleTrackAnswer,
    singleTrackChannelId,
    singleTrackDuration,
    singleTrackTitle,
    singleTrackUploader,
    singleTrackUrl,
  ]);

  const fetchOEmbedMeta = useCallback(async (url: string) => {
    const endpoint = `https://www.youtube.com/oembed?url=${encodeURIComponent(
      url,
    )}&format=json`;
    const res = await fetch(endpoint);
    if (!res.ok) {
      throw new Error("無法解析影片資訊，請確認連結是否正確或可公開瀏覽");
    }
    const data = (await res.json()) as {
      title?: string;
      author_name?: string;
      author_url?: string;
      thumbnail_url?: string;
    };
    return data;
  }, []);

  const handleSingleTrackResolve = useCallback(async () => {
    const url = singleTrackUrl.trim();
    if (!url) {
      setSingleTrackError("請先貼上 YouTube 影片連結");
      return;
    }
    if (singleTrackLoading) return;
    if (lastResolvedUrlRef.current === url) return;
    setSingleTrackLoading(true);
    setSingleTrackError(null);
    try {
      const meta = await fetchOEmbedMeta(url);
      if (meta.title) {
        setSingleTrackTitle(meta.title);
      }
      if (meta.author_name) {
        setSingleTrackUploader(meta.author_name);
      }
      const resolvedChannelId =
        (authToken
          ? await collectionsApi.resolveYoutubeChannelId(authToken, {
              videoUrl: url,
              channelUrl: meta.author_url,
            })
          : null) ?? extractYoutubeChannelId(meta.author_url);
      if (resolvedChannelId) {
        setSingleTrackChannelId(resolvedChannelId);
      }
      if (!singleTrackAnswer && meta.title) {
        setSingleTrackAnswer(meta.title);
      }
    } catch (error) {
      setSingleTrackError(
        error instanceof Error ? error.message : "解析失敗，請稍後再試",
      );
    } finally {
      lastResolvedUrlRef.current = url;
      setSingleTrackLoading(false);
    }
  }, [
    authToken,
    fetchOEmbedMeta,
    singleTrackAnswer,
    singleTrackLoading,
    singleTrackUrl,
  ]);

  useEffect(() => {
    const url = singleTrackUrl.trim();
    if (!url) return;
    if (!/youtu\.be|youtube\.com/.test(url)) return;
    void handleSingleTrackResolve();
  }, [handleSingleTrackResolve, singleTrackUrl]);

  useEffect(() => {
    const url = singleTrackUrl.trim();
    if (url === lastUrlRef.current) return;
    lastUrlRef.current = url;
    if (!url) {
      setDuplicateIndex(null);
      setSingleTrackError(null);
      return;
    }
    setSingleTrackTitle("");
    setSingleTrackAnswer("");
    setSingleTrackUploader("");
    setSingleTrackChannelId("");
    setSingleTrackError(null);
    const key = getPlaylistItemKey({ url });
    if (!key) {
      setDuplicateIndex(null);
      return;
    }
    const matchIndex = playlistItems.findIndex(
      (item) => getPlaylistItemKey(item) === key,
    );
    setDuplicateIndex(matchIndex >= 0 ? matchIndex : null);
  }, [playlistItems, singleTrackUrl]);

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

  const handleStartChange = (value: number) => {
    const next = Math.min(Math.max(0, value), maxSec);
    const nextEnd = next > endSec ? next : endSec;
    setStartSec(next);
    selectedStartRef.current = next;
    pendingAutoStartRef.current = next;
    setEndSec(nextEnd);
    setStartTimeInput(formatSeconds(next));
    setEndTimeInput(formatSeconds(nextEnd));
    setCurrentTimeSec(next);
    updateSelectedItem({ startSec: next, endSec: nextEnd });
    if (isPlayerReady && playerRef.current) {
      playRequestedRef.current = true;
      shouldSeekToStartRef.current = false;
      playerRef.current.seekTo?.(next, true);
      playerRef.current.playVideo?.();
    }
  };

  const handleEndChange = (value: number) => {
    const next = Math.min(Math.max(0, value), maxSec);
    const nextStart = next < startSec ? next : startSec;
    setEndSec(next);
    if (next < startSec) {
      setStartSec(nextStart);
      setStartTimeInput(formatSeconds(nextStart));
    }
    setEndTimeInput(formatSeconds(next));
    setCurrentTimeSec((prev) => Math.min(Math.max(prev, nextStart), next));
    updateSelectedItem({ startSec: nextStart, endSec: next });
  };

  const handleRangeChange = (value: number[], activeThumb: number) => {
    const [rawStart, rawEnd] = value;
    const nextStart = Math.min(Math.max(0, rawStart), maxSec);
    const nextEnd = Math.min(Math.max(0, rawEnd), maxSec);
    setStartSec(nextStart);
    selectedStartRef.current = nextStart;
    pendingAutoStartRef.current = nextStart;
    setEndSec(nextEnd);
    setStartTimeInput(formatSeconds(nextStart));
    setEndTimeInput(formatSeconds(nextEnd));
    if (activeThumb === 0) {
      setCurrentTimeSec(nextStart);
      if (isPlayerReady && playerRef.current) {
        playRequestedRef.current = true;
        shouldSeekToStartRef.current = false;
        playerRef.current.seekTo?.(nextStart, true);
        playerRef.current.playVideo?.();
      }
      selectedStartRef.current = nextStart;
      pendingAutoStartRef.current = nextStart;
    } else {
      setCurrentTimeSec((prev) => Math.min(Math.max(prev, nextStart), nextEnd));
      if (isPlayerReady && playerRef.current) {
        const previewStart = Math.max(nextStart, nextEnd - 3);
        playRequestedRef.current = true;
        shouldSeekToStartRef.current = false;
        playerRef.current.seekTo?.(previewStart, true);
        playerRef.current.playVideo?.();
      }
    }
    updateSelectedItem({ startSec: nextStart, endSec: nextEnd });
  };

  const handleRangeCommit = (value: number[], activeThumb: number) => {
    if (activeThumb !== 0) return;
    const [rawStart, rawEnd] = value;
    const nextStart = Math.min(Math.max(0, rawStart), maxSec);
    const nextEnd = Math.min(Math.max(0, rawEnd), maxSec);
    setStartSec(nextStart);
    setEndSec(nextEnd);
    setStartTimeInput(formatSeconds(nextStart));
    setEndTimeInput(formatSeconds(nextEnd));
    setCurrentTimeSec(nextStart);
    updateSelectedItem({ startSec: nextStart, endSec: nextEnd });
  };

  const handleStartThumbPress = () => {
    if (!isPlayerReady || !playerRef.current) return;
    playRequestedRef.current = true;
    shouldSeekToStartRef.current = false;
    playerRef.current.seekTo?.(startSec, true);
    playerRef.current.playVideo?.();
  };

  const handleEndThumbPress = () => {
    if (!isPlayerReady || !playerRef.current) return;
    const previewStart = Math.max(startSec, endSec - 3);
    playRequestedRef.current = true;
    shouldSeekToStartRef.current = false;
    playerRef.current.seekTo?.(previewStart, true);
    playerRef.current.playVideo?.();
  };

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

      const nextItems = playlistItems.filter((_item, idx) => idx !== index);
      const nextSelectedId =
        target.localId === selectedItemId
          ? (playlistItems[index + 1]?.localId ??
            playlistItems[index - 1]?.localId ??
            null)
          : selectedItemId;

      if (!target.dbId || !activeCollectionId || !authToken) {
        markDirty();
        setPlaylistItems(nextItems);
        if (nextSelectedId !== selectedItemId) {
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
      collectionTitle,
      hasUnsavedChanges,
      markDirty,
      pendingDeleteIds,
      playlistItems,
      refreshAuthToken,
      selectedItemId,
    ],
  );

  const handleSingleTrackUrlChange = useCallback((value: string) => {
    setSingleTrackUrl(value);
  }, []);

  const handleSingleTrackTitleChange = useCallback((value: string) => {
    setSingleTrackTitle(value);
  }, []);

  const handleSingleTrackAnswerChange = useCallback((value: string) => {
    setSingleTrackAnswer(value);
  }, []);

  const handleSingleTrackCancel = useCallback(() => {
    setSingleTrackError(null);
  }, []);

  const togglePlayback = () => {
    const player = playerRef.current;
    if (!player) return;
    const state = player.getPlayerState?.();
    const playingState = window.YT?.PlayerState?.PLAYING;
    if (playingState !== undefined && state === playingState) {
      player.pauseVideo?.();
      playRequestedRef.current = false;
    } else {
      playRequestedRef.current = true;
      if (shouldSeekToStartRef.current) {
        shouldSeekToStartRef.current = false;
        player.seekTo?.(selectedStartRef.current, true);
      }
      player.playVideo?.();
    }
  };

  const handleVolumeChange = (value: number) => {
    const clamped = Math.min(100, Math.max(0, value));
    volumeRef.current = clamped;
    const player = playerRef.current;
    if (player) {
      if (clamped > 0 && isMutedRef.current) {
        player.unMute?.();
        isMutedRef.current = false;
        setIsMuted(false);
      }
      player.setVolume?.(clamped);
    }
    if (clamped > 0) {
      lastVolumeRef.current = clamped;
    }
    if (typeof window !== "undefined") {
      window.localStorage.setItem(EDIT_VOLUME_STORAGE_KEY, String(clamped));
    }
  };

  const handleVolumeCommit = (value: number) => {
    const clamped = Math.min(100, Math.max(0, value));
    volumeRef.current = clamped;
    setVolume(clamped);
    if (clamped > 0) {
      lastVolumeRef.current = clamped;
      if (isMuted) {
        isMutedRef.current = false;
        setIsMuted(false);
      }
    }
    if (typeof window !== "undefined") {
      window.localStorage.setItem(EDIT_VOLUME_STORAGE_KEY, String(clamped));
    }
  };

  const handleToggleMute = () => {
    const player = playerRef.current;
    const nextMuted = !isMutedRef.current;

    if (nextMuted) {
      const currentAudibleVolume = Math.max(0, volumeRef.current || volume);
      if (currentAudibleVolume > 0) {
        lastVolumeRef.current = currentAudibleVolume;
      }
      player?.mute?.();
      lastAppliedPlayerMutedRef.current = true;
      isMutedRef.current = true;
      setIsMuted(true);
    } else {
      const restored = Math.max(
        10,
        lastVolumeRef.current || volumeRef.current || volume || 10,
      );
      player?.unMute?.();
      player?.setVolume?.(restored);
      lastAppliedPlayerMutedRef.current = false;
      lastAppliedPlayerVolumeRef.current = restored;
      volumeRef.current = restored;
      isMutedRef.current = false;
      setVolume(restored);
      setIsMuted(false);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(EDIT_VOLUME_STORAGE_KEY, String(restored));
      }
    }

    if (typeof window !== "undefined") {
      window.localStorage.setItem(EDIT_MUTE_STORAGE_KEY, nextMuted ? "1" : "0");
    }
  };

  const handleAutoPlayToggle = (value: boolean) => {
    setAutoPlayOnSwitch(value);
    autoPlayRef.current = value;
    if (typeof window !== "undefined") {
      window.localStorage.setItem(EDIT_AUTOPLAY_STORAGE_KEY, value ? "1" : "0");
    }
  };

  const handleLoopToggle = (value: boolean) => {
    setLoopEnabled(value);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(EDIT_LOOP_STORAGE_KEY, value ? "1" : "0");
    }
  };

  const handleProgressChange = (value: number) => {
    const clamped = Math.min(effectiveEnd, Math.max(startSec, value));
    setCurrentTimeSec(clamped);
    if (playerRef.current) {
      shouldSeekToStartRef.current = false;
      playerRef.current.seekTo?.(clamped, true);
      if (!isPlaying) {
        playerRef.current.pauseVideo?.();
      }
    }
  };

  const getPlayerCurrentTimeSec = useCallback((): number | null => {
    const player = playerRef.current;
    if (!player) return null;
    const t = player.getCurrentTime?.();
    return typeof t === "number" && Number.isFinite(t) ? t : null;
  }, []);

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
      {/* <div className="w-full md:w-full lg:w-3/5 mx-auto space-y-4"> */}
      <EditHeader
        title={collectionTitle}
        titleDraft={titleDraft}
        isTitleEditing={isTitleEditing}
        onTitleDraftChange={(value) => setTitleDraft(value)}
        onTitleSave={() => {
          const nextTitle = titleDraft.trim();
          if (!nextTitle || nextTitle === collectionTitle.trim()) {
            setIsTitleEditing(false);
            setTitleDraft(collectionTitle);
            return;
          }
          const previousTitle = collectionTitle;
          setCollectionTitle(nextTitle);
          if (!collectionTitleTouched) {
            setCollectionTitleTouched(true);
          }
          setIsTitleEditing(false);
          void saveTitleImmediately(nextTitle, previousTitle);
        }}
        onTitleCancel={() => {
          setTitleDraft(collectionTitle);
          setIsTitleEditing(false);
        }}
        onStartEdit={() => {
          setTitleDraft(collectionTitle);
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
        onAiBatchEditClick={openAiBatchModal}
        aiBatchDisabled={playlistItems.length === 0}
        collectionMenuOpen={collectionMenuOpen}
      />
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
          setCollectionVisibility(selected?.visibility ?? "private");
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
              onOpenSourceModal={() => {
                setSourceModalMode("playlist");
                setSourceModalOpen(true);
              }}
              sourceModalOpen={sourceModalOpen}
            />
          </div>
          <div className="order-1 lg:order-1 min-w-0 space-y-2">
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_220px]">
              <PlayerPanel
                selectedVideoId={selectedVideoId}
                selectedTitle={selectedItem?.title ?? TEXT.selectSong}
                selectedUploader={selectedItem?.uploader ?? ""}
                selectedChannelId={selectedItem?.channelId}
                selectedDuration={selectedItem?.duration}
                selectedClipDurationLabel={CLIP_DURATION_LABEL}
                selectedClipDurationSec={formatSeconds(selectedClipDurationSec)}
                clipCurrentSec={formatSeconds(clipCurrentSec)}
                clipDurationSec={formatSeconds(clipDurationSec)}
                startSec={startSec}
                effectiveEnd={effectiveEnd}
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
              <AnswerPanel
                title={TEXT.answer}
                value={answerText}
                placeholder={TEXT.answerPlaceholder}
                disabled={!selectedItem}
                maxLength={ANSWER_MAX_LENGTH}
                onChange={(value) => {
                  updateSelectedAnswerText(value);
                }}
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
              onRangeChange={handleRangeChange}
              onRangeCommit={handleRangeCommit}
              onStartThumbPress={handleStartThumbPress}
              onEndThumbPress={handleEndThumbPress}
              formatSeconds={formatSeconds}
              startTimeInput={startTimeInput}
              endTimeInput={endTimeInput}
              onStartInputChange={(value) => setStartTimeInput(value)}
              onEndInputChange={(value) => setEndTimeInput(value)}
              onStartBlur={() => {
                const parsed = parseTimeInput(startTimeInput);
                if (parsed === null) {
                  setStartTimeInput(formatSeconds(startSec));
                  return;
                }
                if (parsed === startSec) {
                  setStartTimeInput(formatSeconds(startSec));
                  return;
                }
                handleStartChange(parsed);
              }}
              onEndBlur={() => {
                const parsed = parseTimeInput(endTimeInput);
                if (parsed === null) {
                  setEndTimeInput(formatSeconds(endSec));
                  return;
                }
                if (parsed === endSec) {
                  setEndTimeInput(formatSeconds(endSec));
                  return;
                }
                handleEndChange(parsed);
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
            />
          </div>
        </div>
      </div>

      <CollectionEditAiBatchDialog
        open={aiBatchModalOpen}
        onClose={closeAiBatchModal}
        aiProviderLabel={aiProviderLabel}
        playlistItemsCount={playlistItems.length}
        aiPromptPages={aiPromptPages}
        aiBatchPageIndex={aiBatchPageIndex}
        onAiBatchPageChange={setAiBatchPageIndex}
        aiJsonDrafts={aiJsonDrafts}
        aiAppliedPages={aiAppliedPages}
        currentAiJsonDraft={currentAiJsonDraft}
        onCurrentAiJsonDraftChange={setCurrentAiJsonDraft}
        aiHelperNotice={aiHelperNotice}
        aiParsedResult={aiParsedResult}
        aiPreview={aiPreview}
        aiPageStatuses={aiPageStatuses}
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
    // </div>
  );
};

export default CollectionEditPage;
