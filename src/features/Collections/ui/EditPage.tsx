import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import CheckCircleOutlineRounded from "@mui/icons-material/CheckCircleOutlineRounded";
import MoreHorizRounded from "@mui/icons-material/MoreHorizRounded";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";
import ConfirmDialog from "../../../shared/ui/ConfirmDialog";
import LoadingPage from "../../../shared/ui/LoadingPage";
import { useRoom } from "../../Room/model/useRoom";
import type { DbCollection, EditableItem } from "./lib/editTypes";
import {
  buildEditableItems,
  buildEditableItemsFromDb,
} from "./lib/editMappers";
import { useCollectionEditor } from "../model/useCollectionEditor";
import { useCollectionLoader } from "../model/useCollectionLoader";
import { collectionsApi } from "../model/collectionsApi";
import {
  isAdminRole,
  MAX_PRIVATE_COLLECTIONS_PER_USER,
  resolveCollectionItemLimit,
} from "../model/collectionLimits";
import { ensureFreshAuthToken } from "../../../shared/auth/token";
import CollectionPopover from "./components/playlist/CollectionPopover";
import ClipEditorPanel from "./components/player/ClipEditorPanel";
import AnswerPanel from "./components/answer/AnswerPanel";
import EditHeader from "./components/header/EditHeader";
import PlaylistListPanel from "./components/playlist/PlaylistListPanel";
import PlaylistSourceModal from "./components/playlist/PlaylistSourceModal";
import PlayerPanel from "./components/player/PlayerPanel";
import {
  DEFAULT_DURATION_SEC,
  createLocalId,
  createServerId,
  extractVideoId,
  formatSeconds,
  getPlaylistItemKey,
  parseDurationToSeconds,
  parseTimeInput,
  thumbnailFromId,
} from "./lib/editUtils";
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
} from "./lib/editConstants";
type YTPlayer = YT.Player;
type YTPlayerEvent = YT.PlayerEvent;
type YTPlayerStateEvent = YT.OnStateChangeEvent;
const AI_BATCH_PAGE_SIZE = 100;
const MAX_AI_ASSISTANT_URL_LENGTH = 45000;
const AI_PROVIDER = "perplexity";
const AI_PROVIDER_LABEL = "Perplexity";
const AI_PROVIDER_BASE_URL = "https://www.perplexity.ai/search/new";
type AiAnswerUpdate = {
  id: string;
  answerText: string;
};

const EditPage = () => {
  const navigate = useNavigate();
  const { collectionId } = useParams<{ collectionId?: string }>();

  const {
    authToken,
    authUser,
    displayUsername,
    refreshAuthToken,
    playlistUrl,
    playlistItems: fetchedPlaylistItems,
    lastFetchedPlaylistTitle,
    playlistError,
    playlistLoading,
    handleFetchPlaylist,
    handleResetPlaylist,
    setPlaylistUrl,
    authLoading,
    authExpired,
  } = useRoom();

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
  const [aiBatchModalOpen, setAiBatchModalOpen] = useState(false);
  const [aiBatchPageIndex, setAiBatchPageIndex] = useState(0);
  const [aiJsonDrafts, setAiJsonDrafts] = useState<Record<number, string>>({});
  const [aiAppliedPages, setAiAppliedPages] = useState<Record<number, boolean>>(
    {},
  );
  const [aiHelperNotice, setAiHelperNotice] = useState<string | null>(null);
  const [pendingAiBatchSave, setPendingAiBatchSave] = useState<{
    pageIndex: number;
    count: number;
  } | null>(null);
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
  const aiPromptPages = useMemo(() => {
    const pages: Array<{
      pageIndex: number;
      start: number;
      end: number;
      items: Array<{
        id: string;
        title: string;
        uploader: string;
        answerText: string;
      }>;
    }> = [];

    for (
      let start = 0;
      start < playlistItems.length;
      start += AI_BATCH_PAGE_SIZE
    ) {
      const end = Math.min(start + AI_BATCH_PAGE_SIZE, playlistItems.length);
      pages.push({
        pageIndex: pages.length,
        start,
        end,
        items: playlistItems.slice(start, end).map((item) => ({
          id: item.dbId ?? item.localId,
          title: item.title ?? "",
          uploader: item.uploader ?? "",
          answerText: item.answerText ?? "",
        })),
      });
    }

    return pages;
  }, [playlistItems]);
  const currentAiPromptPage =
    aiPromptPages[aiBatchPageIndex] ??
    aiPromptPages[Math.max(0, aiPromptPages.length - 1)] ??
    null;
  const currentAiJsonDraft = aiJsonDrafts[aiBatchPageIndex] ?? "";
  const aiPromptPayload = useMemo(
    () =>
      JSON.stringify(
        {
          items: currentAiPromptPage?.items ?? [],
        },
        null,
        2,
      ),
    [currentAiPromptPage],
  );
  const aiPromptText = useMemo(
    () =>
      [
        "You are a music quiz answer normalization assistant.",
        "Use each item's song title and uploader to revise answerText into the most official and commonly recognized song title.",
        "",
        "Rules:",
        "1. Return exactly one ```json``` code block and nothing else.",
        "2. Keep every original id. Do not add or remove items.",
        "3. Return only answerText for each item. Do not output any other fields.",
        "4. Preserve the song title's original dominant language whenever possible. Do not translate the title unless the translated form is clearly the official/common primary title.",
        "5. If the title is mixed-language, prefer the most official and widely recognized primary form.",
        "6. If you are uncertain, keep the original answerText unchanged.",
        '7. The output format must be {"items":[{"id":"...","answerText":"..."}]}.',
        "",
        "Items to normalize:",
        aiPromptPayload,
      ].join("\n"),
    [aiPromptPayload],
  );
  const aiPromptUrl = useMemo(() => {
    const encoded = encodeURIComponent(aiPromptText);
    return `${AI_PROVIDER_BASE_URL}?q=${encoded}`;
  }, [aiPromptText]);
  const aiDirectOpenState = useMemo(() => {
    const promptUrlLength = aiPromptUrl?.length ?? 0;
    if (aiPromptUrl.length > MAX_AI_ASSISTANT_URL_LENGTH) {
      const exceededBy = aiPromptUrl.length - MAX_AI_ASSISTANT_URL_LENGTH;
      return {
        tone: "warn" as const,
        title: `${AI_PROVIDER_LABEL} 這次不會直接帶入`,
        description: `目前長度 ${promptUrlLength} / ${MAX_AI_ASSISTANT_URL_LENGTH}，超出 ${exceededBy}。點擊開啟時會先複製內容，再開該服務首頁。`,
      };
    }
    return {
      tone: "ready" as const,
      title: `${AI_PROVIDER_LABEL} 目前會直接帶入 prompt`,
      description: `目前長度 ${promptUrlLength} / ${MAX_AI_ASSISTANT_URL_LENGTH}。點擊開啟後會用 query 參數建立新分頁，通常可直接看到已填入內容。`,
    };
  }, [aiPromptUrl]);
  const aiParsedResult = useMemo(() => {
    if (!currentAiJsonDraft.trim()) {
      return {
        error: null as string | null,
        updates: [] as AiAnswerUpdate[],
      };
    }

    try {
      const normalizedDraft = currentAiJsonDraft
        .trim()
        .replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/i, "$1");
      const parsed = JSON.parse(normalizedDraft) as { items?: unknown };
      if (
        !parsed ||
        typeof parsed !== "object" ||
        !Array.isArray(parsed.items)
      ) {
        return {
          error: "JSON 格式不正確，請確認最外層包含 items 陣列。",
          updates: [] as AiAnswerUpdate[],
        };
      }

      const seenIds = new Set<string>();
      const updates: AiAnswerUpdate[] = [];

      for (const rawItem of parsed.items) {
        if (!rawItem || typeof rawItem !== "object") {
          return {
            error: "items 內每一筆都必須是物件。",
            updates: [] as AiAnswerUpdate[],
          };
        }
        const candidateId = "id" in rawItem ? rawItem.id : null;
        const candidateAnswer =
          "answerText" in rawItem ? rawItem.answerText : null;
        const id = typeof candidateId === "string" ? candidateId.trim() : "";
        const answerText =
          typeof candidateAnswer === "string" ? candidateAnswer.trim() : "";

        if (!id || !answerText) {
          return {
            error: "每一筆都需要有效的 id 與 answerText。",
            updates: [] as AiAnswerUpdate[],
          };
        }
        if (seenIds.has(id)) {
          return {
            error: `JSON 內出現重複 id：${id}`,
            updates: [] as AiAnswerUpdate[],
          };
        }
        seenIds.add(id);
        updates.push({ id, answerText });
      }

      return {
        error: null as string | null,
        updates,
      };
    } catch {
      return {
        error: "JSON 解析失敗，請確認格式正確。",
        updates: [] as AiAnswerUpdate[],
      };
    }
  }, [currentAiJsonDraft]);
  const aiPreview = useMemo(() => {
    const lookup = new Map(
      (currentAiPromptPage?.items ?? []).map(
        (item) => [item.id, item] as const,
      ),
    );
    const missingIds: string[] = [];
    const unchangedIds: string[] = [];
    const changedItems: Array<{
      id: string;
      title: string;
      oldAnswer: string;
      newAnswer: string;
    }> = [];

    for (const update of aiParsedResult.updates) {
      const target = lookup.get(update.id);
      if (!target) {
        missingIds.push(update.id);
        continue;
      }
      const currentAnswer = (target.answerText ?? "").trim();
      if (currentAnswer === update.answerText) {
        unchangedIds.push(update.id);
        continue;
      }
      changedItems.push({
        id: update.id,
        title: target.title ?? "未命名題目",
        oldAnswer: target.answerText ?? "",
        newAnswer: update.answerText,
      });
    }

    return {
      missingIds,
      unchangedIds,
      changedItems,
    };
  }, [aiParsedResult.updates, currentAiPromptPage]);
  const aiPageStatuses = useMemo(
    () =>
      aiPromptPages.map((page) => {
        const completedCount = playlistItems
          .slice(page.start, page.end)
          .filter((item) => item.answerAiBatchKey !== null).length;
        return {
          pageIndex: page.pageIndex,
          completedCount,
          totalCount: page.items.length,
          isComplete:
            page.items.length > 0 && completedCount === page.items.length,
          isPartial: completedCount > 0 && completedCount < page.items.length,
        };
      }),
    [aiPromptPages, playlistItems],
  );
  const canApplyAiBatch =
    !aiParsedResult.error && aiPreview.changedItems.length > 0;

  useEffect(() => {
    if (aiPromptPages.length === 0) {
      if (aiBatchPageIndex !== 0) {
        setAiBatchPageIndex(0);
      }
      return;
    }
    if (aiBatchPageIndex > aiPromptPages.length - 1) {
      setAiBatchPageIndex(aiPromptPages.length - 1);
    }
  }, [aiBatchPageIndex, aiPromptPages.length]);

  const confirmLeave = () => {
    if (!hasUnsavedChanges) return true;
    return window.confirm(UNSAVED_PROMPT);
  };

  const handleCopyAiPrompt = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(aiPromptText);
      setAiHelperNotice("Prompt 已複製，可以直接貼到 AI。");
    } catch {
      setAiHelperNotice("無法自動複製，請手動複製下方內容。");
    }
  }, [aiPromptText]);

  const handleOpenAiAssistant = useCallback(async () => {
    if (aiPromptUrl && aiPromptUrl.length <= MAX_AI_ASSISTANT_URL_LENGTH) {
      window.open(aiPromptUrl, "_blank", "noopener,noreferrer");
      return;
    }

    try {
      await navigator.clipboard.writeText(aiPromptText);
      setAiHelperNotice(
        `Prompt 過長，這次不會自動帶入 ${AI_PROVIDER_LABEL}，已改為複製內容並開啟首頁，請直接貼上。`,
      );
    } catch {
      setAiHelperNotice(
        `Prompt 過長，這次不會自動帶入 ${AI_PROVIDER_LABEL}。若未自動複製，請手動複製下方內容。`,
      );
    }

    window.open(AI_PROVIDER_BASE_URL, "_blank", "noopener,noreferrer");
  }, [aiPromptText, aiPromptUrl]);
  const handleForceOpenAiAssistant = useCallback(() => {
    window.open(aiPromptUrl, "_blank", "noopener,noreferrer");
    setAiHelperNotice(
      `已強制用 query 開啟 ${AI_PROVIDER_LABEL}，可直接測試目前長度是否仍能帶入。`,
    );
  }, [aiPromptUrl]);

  const handleApplyAiBatch = useCallback(() => {
    if (!canApplyAiBatch) return;
    const changedCount = aiPreview.changedItems.length;
    const appliedPageIndex = aiBatchPageIndex;
    const batchKey = `ai_${AI_PROVIDER}_${Date.now()}_p${appliedPageIndex + 1}`;
    const updatedAt = Math.floor(Date.now() / 1000);
    const updates = new Map(
      aiPreview.changedItems.map((item) => [item.id, item.newAnswer] as const),
    );
    setPlaylistItems((prev) =>
      prev.map((item) => {
        const key = item.dbId ?? item.localId;
        const nextAnswer = updates.get(key);
        if (!nextAnswer) return item;
        return {
          ...item,
          answerText: nextAnswer,
          answerStatus: "ai_modified",
          answerAiProvider: AI_PROVIDER,
          answerAiUpdatedAt: updatedAt,
          answerAiBatchKey: batchKey,
        };
      }),
    );
    if (selectedItem) {
      const selectedKey = selectedItem.dbId ?? selectedItem.localId;
      const selectedNextAnswer = updates.get(selectedKey);
      if (selectedNextAnswer !== undefined) {
        setAnswerText(selectedNextAnswer);
      }
    }
    markDirty();
    setSaveStatus("saving");
    setAiJsonDrafts((prev) => ({
      ...prev,
      [aiBatchPageIndex]: "",
    }));
    setAiAppliedPages((prev) => ({
      ...prev,
      [aiBatchPageIndex]: true,
    }));
    setAiHelperNotice(
      `已套用第 ${appliedPageIndex + 1} 批的 ${changedCount} 筆答案，正在自動寫入。`,
    );
    setPendingAiBatchSave({
      pageIndex: appliedPageIndex,
      count: changedCount,
    });
    if (aiBatchPageIndex < aiPromptPages.length - 1) {
      setAiBatchPageIndex(aiBatchPageIndex + 1);
    }
  }, [
    aiBatchPageIndex,
    aiPreview.changedItems,
    aiPromptPages.length,
    canApplyAiBatch,
    markDirty,
    selectedItem,
  ]);

  useEffect(() => {
    if (!pendingAiBatchSave) return;

    const persistAiBatchUpdates = async () => {
      await handleSaveCollection("auto");
      setAiHelperNotice(
        `已套用第 ${pendingAiBatchSave.pageIndex + 1} 批的 ${pendingAiBatchSave.count} 筆答案，已送出寫入。`,
      );
      setPendingAiBatchSave(null);
    };

    void persistAiBatchUpdates();
  }, [handleSaveCollection, pendingAiBatchSave]);

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
    playerRef.current.setVolume?.(isMuted ? 0 : volume);
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
    setDuplicateIndex(null);
    setSourceModalOpen(false);
  }, [
    appendItems,
    playlistItems,
    singleTrackAnswer,
    singleTrackDuration,
    singleTrackTitle,
    singleTrackUploader,
    singleTrackUrl,
  ]);

  const fetchOEmbedMeta = async (url: string) => {
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
      thumbnail_url?: string;
    };
    return data;
  };

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
  }, [singleTrackAnswer, singleTrackLoading, singleTrackUrl]);

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
      isMutedRef.current = true;
      setIsMuted(true);
    } else {
      const restored = Math.max(
        10,
        lastVolumeRef.current || volumeRef.current || volume || 10,
      );
      player?.unMute?.();
      player?.setVolume?.(restored);
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
        onPlaylistButtonClick={() => {
          setSourceModalMode("playlist");
          setSourceModalOpen(true);
        }}
        onAiBatchEditClick={() => {
          setAiHelperNotice(null);
          setAiBatchPageIndex(0);
          setAiBatchModalOpen(true);
        }}
        aiBatchDisabled={playlistItems.length === 0}
        collectionMenuOpen={collectionMenuOpen}
        playlistMenuOpen={sourceModalOpen}
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
        title={
          pendingVisibility === "private" ? "設為私人？" : "設為公開？"
        }
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
            {playlistItems.length > 0 && (
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
              />
            )}
          </div>
          <div className="order-1 lg:order-1 min-w-0 space-y-2">
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_220px]">
              <PlayerPanel
                selectedVideoId={selectedVideoId}
                selectedTitle={selectedItem?.title ?? TEXT.selectSong}
                selectedUploader={selectedItem?.uploader ?? ""}
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
      <Dialog
        open={aiBatchModalOpen}
        onClose={() => setAiBatchModalOpen(false)}
        fullWidth
        maxWidth="md"
        PaperProps={{
          className:
            "!rounded-3xl !border !border-[var(--mc-border)] !bg-[#08111f] !text-[var(--mc-text)]",
        }}
      >
        <DialogTitle className="!px-6 !pt-6 !pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="mt-1 text-lg font-semibold text-[var(--mc-text)]">
                AI 批次修正答案
              </div>
            </div>

            <div className="mt-1 text-xl font-semibold text-[var(--mc-text)]">
              {playlistItems.length} 題
            </div>
          </div>
        </DialogTitle>
        <DialogContent className="!px-6 !pb-4">
          <div className="space-y-4">
            <section className="rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface)]/60 p-4">
              <div className="mb-4">
                <div className="text-sm font-semibold text-[var(--mc-text)]">
                  批次分頁
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {aiPromptPages.map((page) => {
                    const active = page.pageIndex === aiBatchPageIndex;
                    const hasDraft = Boolean(
                      aiJsonDrafts[page.pageIndex]?.trim(),
                    );
                    const isApplied = aiAppliedPages[page.pageIndex] === true;
                    const pageStatus = aiPageStatuses[page.pageIndex];
                    return (
                      <button
                        key={`${page.start}-${page.end}`}
                        type="button"
                        onClick={() => {
                          setAiHelperNotice(null);
                          setAiBatchPageIndex(page.pageIndex);
                        }}
                        className={`rounded-full border px-3 py-1.5 text-xs transition ${
                          active
                            ? "border-[var(--mc-accent)] bg-[var(--mc-accent)]/12 text-[var(--mc-text)]"
                            : "border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/40 text-[var(--mc-text-muted)] hover:border-[var(--mc-accent)]/50 hover:text-[var(--mc-text)]"
                        }`}
                      >
                        第 {page.pageIndex + 1} 批
                        <span className="ml-2 text-[10px] opacity-75">
                          {page.start + 1}-{page.end}
                        </span>
                        {isApplied || pageStatus?.isComplete ? (
                          <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-emerald-300">
                            <CheckCircleOutlineRounded sx={{ fontSize: 14 }} />
                            已套用
                          </span>
                        ) : pageStatus?.isPartial ? (
                          <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-cyan-200">
                            <MoreHorizRounded sx={{ fontSize: 14 }} />
                            {pageStatus.completedCount}/{pageStatus.totalCount}
                          </span>
                        ) : hasDraft ? (
                          <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-amber-200">
                            <MoreHorizRounded sx={{ fontSize: 14 }} />
                            已貼回
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-[var(--mc-text)]">
                    Step 1. 產生 Prompt
                  </div>
                </div>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => void handleCopyAiPrompt()}
                  className="!border-[var(--mc-border)] !text-[var(--mc-text)] hover:!border-[var(--mc-accent)]/60"
                >
                  複製 Prompt
                </Button>
              </div>
              <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--mc-border)] bg-[#050b14]">
                <div className="border-b border-[var(--mc-border)] px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-[var(--mc-text-muted)]">
                  Prompt Preview
                </div>
                <div className="max-h-80 overflow-y-auto px-4 py-4">
                  <pre className="whitespace-pre-wrap break-words font-mono text-[12px] leading-6 text-slate-200">
                    {aiPromptText}
                  </pre>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface)]/60 p-4">
              <div className="text-sm font-semibold text-[var(--mc-text)]">
                Step 2. 選擇 AI
              </div>
              <div className="mt-1 text-xs text-[var(--mc-text-muted)]">
                目前固定使用 Perplexity。若網址過長，介面會提示這次未帶入
                prompt，並改為複製後開首頁。
              </div>
              <div
                className={`mt-3 rounded-2xl border px-3 py-2 text-sm ${
                  aiDirectOpenState.tone === "ready"
                    ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-100"
                    : aiDirectOpenState.tone === "warn"
                      ? "border-amber-500/30 bg-amber-950/20 text-amber-100"
                      : "border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/30 text-[var(--mc-text-muted)]"
                }`}
              >
                <div className="font-medium">{aiDirectOpenState.title}</div>
                <div className="mt-1 text-xs opacity-85">
                  {aiDirectOpenState.description}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleOpenAiAssistant}
                  className="!bg-[var(--mc-accent)] !text-slate-950 hover:!bg-[var(--mc-accent)]/90"
                >
                  在 {AI_PROVIDER_LABEL} 開啟
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleForceOpenAiAssistant}
                  className="!border-[var(--mc-border)] !text-[var(--mc-text)] hover:!border-[var(--mc-accent)]/60"
                >
                  強制帶入測試
                </Button>
              </div>
            </section>

            <section className="rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface)]/60 p-4">
              <div className="text-sm font-semibold text-[var(--mc-text)]">
                Step 3. 貼回 JSON 並預覽
              </div>
              <div className="mt-1 text-xs text-[var(--mc-text-muted)]">
                請貼上 AI 回傳內容。支援純 JSON，也支援包在 ```json code block
                內的格式。
              </div>
              <TextField
                value={currentAiJsonDraft}
                onChange={(event) => {
                  setAiHelperNotice(null);
                  setAiJsonDrafts((prev) => ({
                    ...prev,
                    [aiBatchPageIndex]: event.target.value,
                  }));
                  setAiAppliedPages((prev) => ({
                    ...prev,
                    [aiBatchPageIndex]: false,
                  }));
                }}
                multiline
                minRows={8}
                maxRows={14}
                fullWidth
                margin="normal"
                placeholder={
                  '```json\n{"items":[{"id":"item-id","answerText":"正式答案"}]}\n```'
                }
              />
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/30 p-3">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--mc-text-muted)]">
                    會更新
                  </div>
                  <div className="mt-1 text-2xl font-semibold text-[var(--mc-text)]">
                    {aiPreview.changedItems.length}
                  </div>
                </div>
                <div className="rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/30 p-3">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--mc-text-muted)]">
                    無變更
                  </div>
                  <div className="mt-1 text-2xl font-semibold text-[var(--mc-text)]">
                    {aiPreview.unchangedIds.length}
                  </div>
                </div>
                <div className="rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/30 p-3">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--mc-text-muted)]">
                    對不到 ID
                  </div>
                  <div className="mt-1 text-2xl font-semibold text-[var(--mc-text)]">
                    {aiPreview.missingIds.length}
                  </div>
                </div>
              </div>
              {aiParsedResult.error && (
                <div className="mt-3 rounded-2xl border border-rose-500/40 bg-rose-950/30 px-3 py-2 text-sm text-rose-200">
                  {aiParsedResult.error}
                </div>
              )}
              {aiHelperNotice && (
                <div className="mt-3 rounded-2xl border border-emerald-500/30 bg-emerald-950/25 px-3 py-2 text-sm text-emerald-200">
                  {aiHelperNotice}
                </div>
              )}
              {aiPreview.missingIds.length > 0 && !aiParsedResult.error && (
                <div className="mt-3 rounded-2xl border border-amber-500/30 bg-amber-950/20 px-3 py-2 text-sm text-amber-100">
                  以下 id 在目前題庫中找不到：
                  {aiPreview.missingIds.slice(0, 8).join(", ")}
                  {aiPreview.missingIds.length > 8 ? " ..." : ""}
                </div>
              )}
              <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
                {aiPreview.changedItems.length === 0 &&
                !aiParsedResult.error ? (
                  <div className="rounded-2xl border border-dashed border-[var(--mc-border)] px-3 py-4 text-sm text-[var(--mc-text-muted)]">
                    貼上有效 JSON 後，這裡會顯示即將更新的答案差異。
                  </div>
                ) : (
                  aiPreview.changedItems.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/30 p-3"
                    >
                      <div className="text-sm font-semibold text-[var(--mc-text)]">
                        {item.title}
                      </div>
                      <div className="mt-2 grid gap-2 md:grid-cols-2">
                        <div className="rounded-xl border border-[var(--mc-border)]/80 bg-[var(--mc-surface)]/60 px-3 py-2">
                          <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--mc-text-muted)]">
                            原答案
                          </div>
                          <div className="mt-1 text-sm text-[var(--mc-text)]">
                            {item.oldAnswer || "未填寫"}
                          </div>
                        </div>
                        <div className="rounded-xl border border-[var(--mc-accent)]/35 bg-[var(--mc-accent)]/8 px-3 py-2">
                          <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--mc-text-muted)]">
                            新答案
                          </div>
                          <div className="mt-1 text-sm text-[var(--mc-text)]">
                            {item.newAnswer}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </DialogContent>
        <DialogActions className="!px-6 !pb-5 !pt-0">
          <Button
            onClick={() => setAiBatchModalOpen(false)}
            className="!text-[var(--mc-text-muted)]"
          >
            關閉
          </Button>
          <Button
            variant="contained"
            onClick={handleApplyAiBatch}
            disabled={!canApplyAiBatch || pendingAiBatchSave !== null}
            className="!bg-[var(--mc-accent)] !text-slate-950 hover:!bg-[var(--mc-accent)]/90 disabled:!bg-slate-700 disabled:!text-slate-300"
          >
            {pendingAiBatchSave !== null
              ? "寫入中..."
              : `套用並寫入 ${aiPreview.changedItems.length} 筆變更`}
          </Button>
        </DialogActions>
      </Dialog>
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

export default EditPage;
