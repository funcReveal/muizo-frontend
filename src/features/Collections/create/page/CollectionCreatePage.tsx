import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import ArrowBackIosNew from "@mui/icons-material/ArrowBackIosNew";
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
} from "@mui/material";
import { useAuth } from "../../../../shared/auth/AuthContext";
import { isAdminRole } from "../../../../shared/auth/roles";
import { isGoogleReauthRequired } from "../../../../shared/auth/providerAuth";
import { appToast } from "../../../../shared/ui/toastApi";
import { usePlaylistSource } from "@features/PlaylistSource";
import { useCollectionContent } from "@features/CollectionContent";
import {
  MAX_COLLECTIONS_PER_USER,
  MAX_PRIVATE_COLLECTIONS_PER_USER,
  resolveCollectionItemLimit,
} from "../../shared/model/collectionLimits";
import CollectionCreateActionBar from "../components/CollectionCreateActionBar";
import CollectionCreateReviewPanel from "../components/CollectionCreateReviewPanel";
import CollectionCreatePublishPanel from "../components/CollectionCreatePublishPanel";
import CollectionCreateSourcePanel from "../components/CollectionCreateSourcePanel";
import CollectionCreateStepNav from "../components/CollectionCreateStepNav";
import CollectionPlaylistIssueDrawer from "../components/CollectionPlaylistIssueDrawer";
import CollectionDuplicateDrawer from "../components/CollectionDuplicateDrawer";
import CollectionClearPlaylistDialog from "../components/CollectionClearPlaylistDialog";
import CollectionItemLimitDialog from "../components/CollectionItemLimitDialog";
import CollectionCreateProgressOverlay from "../components/CollectionCreateProgressOverlay";
import BulkPlaybackRangeDrawer from "../../shared/components/BulkPlaybackRangeDrawer";
import CollectionEditAiBatchDrawer from "../../edit/components/ai/CollectionEditAiBatchDrawer";
import { useCollectionCreateDraft } from "../hooks/useCollectionCreateDraft";
import { useCollectionCreateSubmit } from "../hooks/useCollectionCreateSubmit";
import { useCollectionEditAiBatch } from "../../edit/hooks/useCollectionEditAiBatch";
import { useCollectionCreateImportSources } from "../hooks/useCollectionCreateImportSources";
import { useEditableCollectionTitle } from "../hooks/useEditableCollectionTitle";
import { useCollectionCreateAutoImport } from "../hooks/useCollectionCreateAutoImport";
import {
  useCollectionCreateReadiness,
  type CollectionCreateStep,
} from "../hooks/useCollectionCreateReadiness";
import {
  dedupePlaylistItems,
  type DraftPlaylistItem,
} from "../utils/createCollectionImport";
import {
  buildBulkPlaybackPreviewItems,
  DEFAULT_BULK_PLAYBACK_DRAFT,
  type BulkPlaybackDraft,
} from "../../shared/model/bulkPlaybackRange";
import {
  formatSeconds,
  parseDurationToSeconds,
  parseTimeInput,
  createLocalId,
} from "../../edit/utils/editUtils";
import type { EditableItem } from "../../edit/utils/editTypes";

const API_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" ? window.location.origin : "");

const LONG_DURATION_THRESHOLD_SEC = 600;

const CollectionCreatePage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation("collectionCreate");

  const {
    authToken,
    authUser,
    authLoading,
    refreshAuthToken,
    loginWithGoogle,
  } = useAuth();

  const {
    playlistUrl,
    playlistItems,
    playlistLocked,
    lastFetchedPlaylistId,
    lastFetchedPlaylistTitle,
    playlistError,
    playlistLoading,
    playlistProgress,
    playlistPreviewMeta,
    handleFetchPlaylist,
    handleResetPlaylist,
    setPlaylistUrl,
    youtubePlaylists,
    youtubePlaylistsLoading,
    youtubePlaylistsError,
    fetchYoutubePlaylists,
    importYoutubePlaylist,
  } = usePlaylistSource();

  const { collections, collectionScope, fetchCollections } =
    useCollectionContent();

  const [createStep, setCreateStep] = useState<CollectionCreateStep>("source");
  const [collectionDescription, setCollectionDescription] = useState("");
  const [visibility, setVisibility] = useState<"private" | "public">("public");
  const [playlistSource, setPlaylistSource] = useState<"url" | "youtube">(
    "url",
  );

  const youtubeFetchedRef = useRef(false);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const lastAutoImportUrlRef = useRef("");
  const pageRootRef = useRef<HTMLDivElement | null>(null);
  const previousCreateStepRef = useRef<CollectionCreateStep>("source");

  const [selectedYoutubePlaylistId, setSelectedYoutubePlaylistId] =
    useState("");
  const [isImportingYoutubePlaylist, setIsImportingYoutubePlaylist] =
    useState(false);
  const [youtubeActionError, setYoutubeActionError] = useState<string | null>(
    null,
  );
  const [isPlaylistUrlFocused, setIsPlaylistUrlFocused] = useState(false);
  const [playlistIssueDrawerOpen, setPlaylistIssueDrawerOpen] = useState(false);
  const [duplicateDrawerOpen, setDuplicateDrawerOpen] = useState(false);
  const [clearPlaylistDialogOpen, setClearPlaylistDialogOpen] = useState(false);
  const [pendingRemoveItem, setPendingRemoveItem] =
    useState<DraftPlaylistItem | null>(null);
  const [draftBatchEdits, setDraftBatchEdits] = useState<
    Record<
      string,
      {
        startSec?: number;
        endSec?: number;
        answerText?: string;
        answerStatus?: EditableItem["answerStatus"];
        answerAiProvider?: EditableItem["answerAiProvider"];
        answerAiUpdatedAt?: number | null;
        answerAiBatchKey?: string | null;
      }
    >
  >({});
  const [bulkPlaybackOpen, setBulkPlaybackOpen] = useState(false);
  const [bulkPlaybackDraft, setBulkPlaybackDraft] = useState<BulkPlaybackDraft>(
    DEFAULT_BULK_PLAYBACK_DRAFT,
  );
  const [bulkPlaybackApplying, setBulkPlaybackApplying] = useState(false);
  const [bulkPlaybackProgress, setBulkPlaybackProgress] = useState<{
    completed: number;
    total: number;
    label?: string;
  } | null>(null);

  const [skipRemoveItemConfirm, setSkipRemoveItemConfirm] = useState(false);
  const [pendingSkipRemoveItemConfirm, setPendingSkipRemoveItemConfirm] =
    useState(false);

  const needsGoogleReauth = isGoogleReauthRequired({
    error: youtubePlaylistsError ?? youtubeActionError,
  });

  const ownerId = authUser?.id ?? null;
  const isAdmin = isAdminRole(authUser?.role);

  const collectionItemLimit = resolveCollectionItemLimit({
    role: authUser?.role,
    plan: authUser?.plan,
  });

  const {
    title: collectionTitle,
    draft: titleDraft,
    isEditing: isTitleEditing,
    setTitle: setCollectionTitle,
    setDraft: setTitleDraft,
    startEdit: handleStartEditTitle,
    save: handleTitleSave,
    cancel: handleTitleCancel,
    reset: resetCollectionTitle,
    initializeIfEmpty: initializeCollectionTitleIfEmpty,
  } = useEditableCollectionTitle();

  const {
    importSources,
    importedPlaylistItems,
    removedImportItems,
    skippedImportItems,
    totalImportedItemCount,
    totalSkippedItemCount,
    removedImportItemCount,
    addImportSource,
    removeImportSource,
    resetImportSources,
    removeImportItem,
    restoreImportItem,
  } = useCollectionCreateImportSources();

  const removedDraftPlaylistItems = useMemo(
    () => dedupePlaylistItems(removedImportItems).items,
    [removedImportItems],
  );

  const {
    draftPlaylistItems,
    removedDuplicateGroups,
    removedDuplicateCount,
    hasDraftPlaylistItems,
    normalDraftPlaylistItems,
    longDraftPlaylistItems,
    isDraftOverflow,
    draftOverflowCount,
    limitDialogOpen,
    setLimitDialogOpen,
    selectedRemovalKeys,
    remainingAfterRemovalCount,
    canApplyRemoval,
    toggleRemovalKey,
    handleApplySelectedRemovals,
    handleReselectOverflowItems,
    handleSelectLongTracksOnly,
    handleClearRemovalSelection,
  } = useCollectionCreateDraft({
    playlistItems: importedPlaylistItems,
    collectionItemLimit,
    longDurationThresholdSec: LONG_DURATION_THRESHOLD_SEC,
  });

  const decorateDraftItem = useCallback(
    (item: DraftPlaylistItem): DraftPlaylistItem => ({
      ...item,
      ...draftBatchEdits[item.draftKey],
    }),
    [draftBatchEdits],
  );

  const batchEditedDraftPlaylistItems =
    draftPlaylistItems.map(decorateDraftItem);

  const batchEditedNormalDraftPlaylistItems =
    normalDraftPlaylistItems.map(decorateDraftItem);

  const batchEditedLongDraftPlaylistItems =
    longDraftPlaylistItems.map(decorateDraftItem);

  const bulkPlaybackPreviewItems = useMemo(
    () =>
      buildBulkPlaybackPreviewItems({
        items: batchEditedDraftPlaylistItems.map((item) => ({
          ...item,
          id: item.draftKey,
        })),
        draft: bulkPlaybackDraft,
        parseDurationToSeconds,
        parseTimeInput,
      }),
    [batchEditedDraftPlaylistItems, bulkPlaybackDraft],
  );

  const bulkPlaybackAffectedItems = useMemo(
    () => bulkPlaybackPreviewItems.filter((item) => item.isShortened),
    [bulkPlaybackPreviewItems],
  );

  const handleApplyCreateBulkPlayback = useCallback(async () => {
    if (bulkPlaybackApplying) return;
    const previewById = new Map(
      bulkPlaybackPreviewItems.map((item) => [item.id, item]),
    );

    const changedItems = batchEditedDraftPlaylistItems.filter((item) => {
      const preview = previewById.get(item.draftKey);
      return Boolean(
        preview &&
        (item.startSec !== preview.startSec || item.endSec !== preview.endSec),
      );
    });

    if (changedItems.length <= 0) {
      setBulkPlaybackOpen(false);
      return;
    }

    setBulkPlaybackApplying(true);
    setBulkPlaybackProgress({
      completed: 0,
      total: changedItems.length,
      label: "正在套用播放區間",
    });

    for (let start = 0; start < changedItems.length; start += 80) {
      const batch = changedItems.slice(start, start + 80);
      setDraftBatchEdits((prev) => {
        const next = { ...prev };
        batch.forEach((item) => {
          const preview = previewById.get(item.draftKey);
          if (!preview) return;
          next[item.draftKey] = {
            ...next[item.draftKey],
            startSec: preview.startSec,
            endSec: preview.endSec,
          };
        });
        return next;
      });
      setBulkPlaybackProgress({
        completed: Math.min(start + batch.length, changedItems.length),
        total: changedItems.length,
        label: "正在套用播放區間",
      });
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    }

    setBulkPlaybackApplying(false);
    setBulkPlaybackProgress(null);
    setBulkPlaybackOpen(false);
  }, [
    batchEditedDraftPlaylistItems,
    bulkPlaybackApplying,
    bulkPlaybackPreviewItems,
  ]);

  const createAiEditableItems = useMemo<EditableItem[]>(
    () =>
      batchEditedDraftPlaylistItems.map((item) => {
        const durationSec =
          parseDurationToSeconds(item.duration) ?? item.durationSec ?? 30;
        const safeDuration = Math.max(1, durationSec);
        const startSec = Math.min(
          Math.max(0, Math.floor(item.startSec ?? 0)),
          safeDuration - 1,
        );
        const endSec = Math.min(
          safeDuration,
          Math.max(
            startSec + 1,
            Math.floor(item.endSec ?? Math.min(30, safeDuration)),
          ),
        );

        return {
          ...item,
          localId: item.draftKey || createLocalId(),
          title: item.title || item.answerText || "Untitled",
          url: item.url ?? "",
          channelId: item.channelId ?? undefined,
          startSec,
          endSec,
          answerText: item.answerText || item.title || "Untitled",
          answerStatus: item.answerStatus ?? "original",
          answerAiProvider: item.answerAiProvider ?? null,
          answerAiUpdatedAt: item.answerAiUpdatedAt ?? null,
          answerAiBatchKey: item.answerAiBatchKey ?? null,
        };
      }),
    [batchEditedDraftPlaylistItems],
  );

  const setCreateAiEditableItems = useCallback<
    Dispatch<SetStateAction<EditableItem[]>>
  >(
    (action) => {
      const nextItems =
        typeof action === "function" ? action(createAiEditableItems) : action;

      setDraftBatchEdits((prev) => {
        const next = { ...prev };
        nextItems.forEach((item) => {
          next[item.localId] = {
            ...next[item.localId],
            answerText: item.answerText,
            answerStatus: item.answerStatus,
            answerAiProvider: item.answerAiProvider,
            answerAiUpdatedAt: item.answerAiUpdatedAt,
            answerAiBatchKey: item.answerAiBatchKey,
          };
        });
        return next;
      });
    },
    [createAiEditableItems],
  );

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
    playlistItems: createAiEditableItems,
    setPlaylistItems: setCreateAiEditableItems,
    markDirty: () => undefined,
    markItemsDirty: () => undefined,
    handleSaveCollection: async () => true,
    saveError: null,
  });

  const trimmedPlaylistUrl = playlistUrl.trim();

  const playlistUrlLooksValid = useMemo(() => {
    if (!trimmedPlaylistUrl) return false;

    try {
      const parsed = new URL(trimmedPlaylistUrl);
      return Boolean(parsed.searchParams.get("list"));
    } catch {
      return false;
    }
  }, [trimmedPlaylistUrl]);

  const showPlaylistUrlError = Boolean(
    trimmedPlaylistUrl && !playlistUrlLooksValid,
  );

  const hasResolvedPlaylist = Boolean(
    playlistLocked && lastFetchedPlaylistId && playlistItems.length > 0,
  );

  const playlistUrlReadOnly =
    playlistSource === "url" &&
    !playlistError &&
    (playlistLoading || hasResolvedPlaylist);

  const playlistUrlTooltipMessage = showPlaylistUrlError
    ? t("source.invalidPlaylistUrl")
    : "";

  const effectiveCollectionTitle = (
    collectionTitle ||
    lastFetchedPlaylistTitle ||
    ""
  ).trim();

  const hasImportedItems = draftPlaylistItems.length > 0;

  const {
    reachedCollectionLimit,
    reachedPrivateCollectionLimit,
    canGoReview,
    canGoPublish,
    canGoNext,
  } = useCollectionCreateReadiness({
    collections,
    isAdmin,
    createStep,
    hasImportedItems,
    playlistLoading,
    isImportingYoutubePlaylist,
    isDraftOverflow,
    effectiveCollectionTitle,
  });

  const effectiveVisibility =
    reachedPrivateCollectionLimit && visibility === "private"
      ? "public"
      : visibility;

  const {
    createError,
    isCreating,
    createStageLabel,
    createProgress,
    handleCreateCollection,
  } = useCollectionCreateSubmit({
    apiUrl: API_URL,
    authToken,
    ownerId,
    refreshAuthToken,
    collectionTitle,
    collectionDescription,
    visibility: effectiveVisibility,
    draftPlaylistItems: batchEditedDraftPlaylistItems,
    reachedCollectionLimit,
    reachedPrivateCollectionLimit,
    maxCollectionsPerUser: MAX_COLLECTIONS_PER_USER,
    maxPrivateCollectionsPerUser: MAX_PRIVATE_COLLECTIONS_PER_USER,
    isDraftOverflow,
    draftOverflowCount,
    playlistSource,
    onDraftOverflow: () => setLimitDialogOpen(true),
    onCreated: (collectionId) => {
      navigate(`/collections/${collectionId}/edit`, { replace: true });
    },
  });

  const canCreateCollection =
    canGoPublish &&
    !isCreating &&
    !authLoading &&
    Boolean(authToken) &&
    !reachedCollectionLimit &&
    !isDraftOverflow;

  const collectionPreview = useMemo(() => {
    if (!hasDraftPlaylistItems) return null;

    return {
      title: effectiveCollectionTitle || t("review.untitledCollection"),
      count: batchEditedDraftPlaylistItems.length,
    };
  }, [
    batchEditedDraftPlaylistItems.length,
    effectiveCollectionTitle,
    hasDraftPlaylistItems,
    t,
  ]);

  const importProgressPercent = useMemo(() => {
    if (playlistProgress.total <= 0) return null;

    return Math.min(
      100,
      Math.round((playlistProgress.received / playlistProgress.total) * 100),
    );
  }, [playlistProgress.received, playlistProgress.total]);

  const importProgressLabel = useMemo(() => {
    if (!playlistLoading) return null;

    if (playlistProgress.total > 0) {
      return t("importProgress.processed", {
        received: playlistProgress.received,
        total: playlistProgress.total,
      });
    }

    return playlistSource === "youtube"
      ? t("importProgress.youtubeFallback")
      : t("importProgress.urlFallback");
  }, [
    playlistLoading,
    playlistProgress.received,
    playlistProgress.total,
    playlistSource,
    t,
  ]);

  const activePlaylistIssueTotal = playlistPreviewMeta?.skippedCount ?? 0;

  const playlistIssueTotal =
    importSources.length > 0 ? totalSkippedItemCount : activePlaylistIssueTotal;

  const resetPlaylistSelection = useCallback(() => {
    handleResetPlaylist();
    lastAutoImportUrlRef.current = "";
    setSelectedYoutubePlaylistId("");
    setYoutubeActionError(null);
  }, [handleResetPlaylist]);

  const scrollCreatePageToTop = useCallback(() => {
    window.requestAnimationFrame(() => {
      pageRootRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });

      document.scrollingElement?.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    });
  }, []);

  useCollectionCreateAutoImport({
    hasResolvedPlaylist,
    lastFetchedPlaylistId,
    lastFetchedPlaylistTitle,
    playlistItems,
    playlistPreviewMeta,
    playlistSource,
    trimmedPlaylistUrl,
    youtubePlaylists,
    untitledSourceLabel: t("source.untitledSource"),
    addImportSource,
    resetPlaylistSelection,
    initializeCollectionTitleIfEmpty,
  });

  useEffect(() => {
    if (previousCreateStepRef.current === createStep) return;

    previousCreateStepRef.current = createStep;
    scrollCreatePageToTop();
  }, [createStep, scrollCreatePageToTop]);

  useEffect(() => {
    handleResetPlaylist();

    return () => {
      handleResetPlaylist();
    };
  }, [handleResetPlaylist]);

  useEffect(() => {
    if (!authToken || !authUser?.id) return;
    if (collectionScope === "owner") return;

    void fetchCollections("owner");
  }, [authToken, authUser?.id, collectionScope, fetchCollections]);

  useEffect(() => {
    if (!isTitleEditing) return;

    window.requestAnimationFrame(() => {
      const input = titleInputRef.current;
      if (!input) return;

      input.focus();
      const end = input.value.length;
      input.setSelectionRange(end, end);
    });
  }, [isTitleEditing]);

  useEffect(() => {
    if (playlistSource !== "url") return;
    if (!playlistUrlLooksValid) return;
    if (playlistLoading) return;
    if (trimmedPlaylistUrl === lastAutoImportUrlRef.current) return;

    const timer = window.setTimeout(() => {
      lastAutoImportUrlRef.current = trimmedPlaylistUrl;

      void handleFetchPlaylist({ url: trimmedPlaylistUrl }).catch(() => {
        // Errors are surfaced through playlistError in room state.
      });
    }, 450);

    return () => window.clearTimeout(timer);
  }, [
    handleFetchPlaylist,
    playlistLoading,
    playlistSource,
    playlistUrlLooksValid,
    trimmedPlaylistUrl,
  ]);

  useEffect(() => {
    if (playlistSource !== "youtube") return;
    if (!authUser) return;
    if (youtubeFetchedRef.current) return;

    youtubeFetchedRef.current = true;
    void fetchYoutubePlaylists();
  }, [playlistSource, authUser, fetchYoutubePlaylists]);

  const handleGoNextStep = () => {
    if (createStep === "source") {
      if (!canGoReview) return;
      setCreateStep("review");
      return;
    }

    if (createStep === "review") {
      if (!canGoPublish) return;
      setCreateStep("publish");
    }
  };

  const handleGoPreviousStep = () => {
    if (createStep === "publish") {
      setCreateStep("review");
      return;
    }

    if (createStep === "review") {
      setCreateStep("source");
    }
  };

  const ensureYoutubePlaylists = () => {
    if (!authUser) return;
    if (youtubeFetchedRef.current) return;

    youtubeFetchedRef.current = true;
    void fetchYoutubePlaylists();
  };

  const handleImportSelectedYoutubePlaylist = async (playlistId: string) => {
    if (!playlistId) {
      setYoutubeActionError(t("source.selectPlaylistFirst"));
      return;
    }

    setYoutubeActionError(null);
    setIsImportingYoutubePlaylist(true);

    try {
      await importYoutubePlaylist(playlistId);
    } catch {
      setYoutubeActionError(t("source.importFailed"));
    } finally {
      setIsImportingYoutubePlaylist(false);
    }
  };

  const handleRequestClearPlaylistUrl = () => {
    if (hasResolvedPlaylist) {
      setClearPlaylistDialogOpen(true);
      return;
    }

    resetPlaylistSelection();
  };

  const handleConfirmClearPlaylist = () => {
    resetPlaylistSelection();
    resetCollectionTitle();
    setCreateStep("source");
    setClearPlaylistDialogOpen(false);
  };

  const handleRequestRemoveImportItem = (item: DraftPlaylistItem) => {
    const itemKey = item.importItemKey ?? item.draftKey;

    if (skipRemoveItemConfirm) {
      removeImportItem(itemKey);
      return;
    }

    setPendingRemoveItem(item);
    setPendingSkipRemoveItemConfirm(false);
  };

  const handleCancelRemoveImportItem = () => {
    setPendingRemoveItem(null);
    setPendingSkipRemoveItemConfirm(false);
  };

  const handleConfirmRemoveImportItem = () => {
    if (!pendingRemoveItem) return;

    removeImportItem(
      pendingRemoveItem.importItemKey ?? pendingRemoveItem.draftKey,
    );

    if (pendingSkipRemoveItemConfirm) {
      setSkipRemoveItemConfirm(true);
    }

    setPendingRemoveItem(null);
    setPendingSkipRemoveItemConfirm(false);
  };

  const handleVisibilityChange = (nextVisibility: "private" | "public") => {
    if (nextVisibility === "private" && reachedPrivateCollectionLimit) {
      appToast.warning(
        t("publish.visibility.privateLimitToast", {
          count: MAX_PRIVATE_COLLECTIONS_PER_USER,
        }),
        { id: "private-collection-limit" },
      );
      return;
    }

    setVisibility(nextVisibility);
  };

  return (
    <Box
      ref={pageRootRef}
      className="mx-auto w-full max-w-6xl px-3 pb-5 pt-3 sm:px-4 sm:pb-6 sm:pt-4"
    >
      <Box className="relative overflow-visible p-0 text-[var(--mc-text)] sm:p-5">
        {isCreating && (
          <CollectionCreateProgressOverlay
            createStageLabel={createStageLabel}
            createProgress={createProgress}
          />
        )}

        <div className="relative">
          <button
            type="button"
            onClick={() => navigate("/collections")}
            aria-label={t("page.backToCollections")}
            className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[var(--mc-surface-strong)]/40 text-[var(--mc-text)] transition hover:bg-[var(--mc-surface-strong)]/60"
          >
            <ArrowBackIosNew fontSize="small" />
          </button>

          {!authToken && !authLoading && (
            <div className="mt-3 rounded-xl border border-amber-400/40 bg-amber-950/40 px-3 py-2 text-xs text-amber-200">
              {t("page.loginRequired")}
            </div>
          )}

          <div className="mt-5 space-y-4">
            <CollectionCreateStepNav
              currentStep={createStep}
              onStepChange={setCreateStep}
              canOpenReview={canGoReview}
              canOpenPublish={canGoPublish}
            />

            <div className="grid gap-4">
              <div className="min-w-0 space-y-3">
                {createStep === "source" && (
                  <CollectionCreateSourcePanel
                    authUserExists={Boolean(authUser)}
                    needsGoogleReauth={needsGoogleReauth}
                    onLoginWithGoogle={loginWithGoogle}
                    playlistSource={playlistSource}
                    onPlaylistSourceChange={setPlaylistSource}
                    sourceSwitchDisabled={
                      playlistLoading || isImportingYoutubePlaylist
                    }
                    playlistUrl={playlistUrl}
                    trimmedPlaylistUrl={trimmedPlaylistUrl}
                    showPlaylistUrlError={showPlaylistUrlError}
                    playlistUrlTooltipMessage={playlistUrlTooltipMessage}
                    isPlaylistUrlFocused={isPlaylistUrlFocused}
                    onPlaylistUrlFocusChange={setIsPlaylistUrlFocused}
                    onPlaylistUrlChange={setPlaylistUrl}
                    onFetchPlaylist={() => {
                      void handleFetchPlaylist();
                    }}
                    onClearPlaylistUrl={handleRequestClearPlaylistUrl}
                    playlistUrlReadOnly={playlistUrlReadOnly}
                    hasResolvedPlaylist={hasResolvedPlaylist}
                    playlistLoading={playlistLoading}
                    playlistError={playlistError}
                    youtubePlaylistsLoading={youtubePlaylistsLoading}
                    youtubePlaylistsError={youtubePlaylistsError}
                    youtubePlaylists={youtubePlaylists}
                    selectedYoutubePlaylistId={selectedYoutubePlaylistId}
                    onSelectedYoutubePlaylistIdChange={
                      setSelectedYoutubePlaylistId
                    }
                    youtubeActionError={youtubeActionError}
                    isImportingYoutubePlaylist={isImportingYoutubePlaylist}
                    onEnsureYoutubePlaylists={ensureYoutubePlaylists}
                    onImportSelectedYoutubePlaylist={
                      handleImportSelectedYoutubePlaylist
                    }
                    importSources={importSources}
                    totalImportedItemCount={totalImportedItemCount}
                    onRemoveImportSource={removeImportSource}
                    onClearImportSources={resetImportSources}
                  />
                )}

                {createStep === "review" && (
                  <CollectionCreateReviewPanel
                    playlistLoading={playlistLoading}
                    isImportingYoutubePlaylist={isImportingYoutubePlaylist}
                    importProgressPercent={importProgressPercent}
                    importProgressLabel={importProgressLabel}
                    playlistSource={playlistSource}
                    playlistProgressTotal={playlistProgress.total}
                    collectionPreview={collectionPreview}
                    isTitleEditing={isTitleEditing}
                    titleDraft={titleDraft}
                    titleInputRef={titleInputRef}
                    onTitleDraftChange={setTitleDraft}
                    onStartEditTitle={handleStartEditTitle}
                    onSaveTitle={handleTitleSave}
                    onCancelTitle={handleTitleCancel}
                    isAdmin={isAdmin}
                    collectionItemLimit={collectionItemLimit}
                    importSources={importSources}
                    normalDraftPlaylistItems={
                      batchEditedNormalDraftPlaylistItems
                    }
                    longDraftPlaylistItems={batchEditedLongDraftPlaylistItems}
                    removedImportItems={removedDraftPlaylistItems}
                    removedImportItemCount={removedImportItemCount}
                    onRemoveImportSource={removeImportSource}
                    onRequestRemoveImportItem={handleRequestRemoveImportItem}
                    onRestoreImportItem={restoreImportItem}
                    removedDuplicateCount={removedDuplicateCount}
                    onOpenDuplicateDialog={() => setDuplicateDrawerOpen(true)}
                    isDraftOverflow={isDraftOverflow}
                    draftOverflowCount={draftOverflowCount}
                    onOpenLimitDialog={() => setLimitDialogOpen(true)}
                    playlistIssueTotal={playlistIssueTotal}
                    onOpenPlaylistIssueDialog={() => {
                      setPlaylistIssueDrawerOpen(true);
                    }}
                    onOpenBulkPlayback={() => setBulkPlaybackOpen(true)}
                    onOpenAiBatch={openAiBatchModal}
                  />
                )}

                {createStep === "publish" && (
                  <CollectionCreatePublishPanel
                    title={collectionTitle}
                    onTitleChange={(value) => {
                      setCollectionTitle(value);
                      setTitleDraft(value);
                    }}
                    description={collectionDescription}
                    onDescriptionChange={setCollectionDescription}
                    visibility={effectiveVisibility}
                    onVisibilityChange={handleVisibilityChange}
                    reachedPrivateCollectionLimit={
                      reachedPrivateCollectionLimit
                    }
                    reachedCollectionLimit={reachedCollectionLimit}
                    maxPrivateCollectionsPerUser={
                      MAX_PRIVATE_COLLECTIONS_PER_USER
                    }
                    readyItems={batchEditedDraftPlaylistItems.length}
                    longItems={batchEditedLongDraftPlaylistItems.length}
                    skippedItems={playlistIssueTotal}
                    removedDuplicateCount={removedDuplicateCount}
                    isDraftOverflow={isDraftOverflow}
                    draftOverflowCount={draftOverflowCount}
                    isReadyToCreate={canCreateCollection}
                  />
                )}

                <CollectionCreateActionBar
                  currentStep={createStep}
                  canGoNext={canGoNext}
                  canCreate={canCreateCollection}
                  isCreating={isCreating}
                  onBack={handleGoPreviousStep}
                  onNext={handleGoNextStep}
                  onCreate={() => void handleCreateCollection()}
                />

                {createError && (
                  <div className="rounded-xl border border-rose-400/35 bg-rose-950/30 px-3 py-2 text-xs leading-5 text-rose-100">
                    {createError}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <CollectionPlaylistIssueDrawer
          open={playlistIssueDrawerOpen}
          onClose={() => setPlaylistIssueDrawerOpen(false)}
          skippedItems={skippedImportItems}
          skippedCount={playlistIssueTotal}
        />

        <CollectionDuplicateDrawer
          open={duplicateDrawerOpen}
          onClose={() => setDuplicateDrawerOpen(false)}
          removedDuplicateCount={removedDuplicateCount}
          removedDuplicateGroups={removedDuplicateGroups}
        />

        <CollectionClearPlaylistDialog
          open={clearPlaylistDialogOpen}
          onClose={() => setClearPlaylistDialogOpen(false)}
          onConfirm={handleConfirmClearPlaylist}
        />

        <Dialog
          open={Boolean(pendingRemoveItem)}
          onClose={handleCancelRemoveImportItem}
          fullWidth
          maxWidth="xs"
          PaperProps={{
            sx: {
              m: { xs: 1.5, sm: 3 },
              borderRadius: 3,
              border: "1px solid rgba(148, 163, 184, 0.22)",
              background:
                "linear-gradient(180deg, rgba(8,13,24,0.98), rgba(2,6,23,0.98))",
              color: "var(--mc-text)",
            },
          }}
        >
          <DialogTitle sx={{ pb: 1 }}>
            <div className="text-base font-semibold">移除這首歌曲？</div>
          </DialogTitle>

          <DialogContent sx={{ pt: 1 }}>
            <div className="text-sm leading-6 text-[var(--mc-text-muted)]">
              這首歌會從本次建立收藏庫的清單中移除，但不會影響原本的 YouTube
              播放清單。
            </div>

            {pendingRemoveItem && (
              <div className="mt-3 rounded-xl border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/35 px-3 py-2">
                <div className="overflow-hidden text-sm font-semibold leading-5 text-[var(--mc-text)] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                  {pendingRemoveItem.title ||
                    pendingRemoveItem.answerText ||
                    "未命名歌曲"}
                </div>

                <div className="mt-1 truncate text-xs text-[var(--mc-text-muted)]">
                  {pendingRemoveItem.uploader || "未知上傳者"}
                  {pendingRemoveItem.duration
                    ? ` ・ ${pendingRemoveItem.duration}`
                    : ""}
                </div>
              </div>
            )}
            <FormControlLabel
              sx={{
                mt: 2,
                alignItems: "flex-start",
                color: "var(--mc-text-muted)",
                "& .MuiFormControlLabel-label": {
                  fontSize: 12,
                  lineHeight: 1.7,
                },
              }}
              control={
                <Checkbox
                  size="small"
                  checked={pendingSkipRemoveItemConfirm}
                  onChange={(event) =>
                    setPendingSkipRemoveItemConfirm(event.target.checked)
                  }
                  sx={{
                    mt: -0.25,
                    color: "rgba(148, 163, 184, 0.8)",
                    "&.Mui-checked": {
                      color: "#67e8f9",
                    },
                  }}
                />
              }
              label="本次建立流程不要再提醒"
            />
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={handleCancelRemoveImportItem} variant="outlined">
              取消
            </Button>
            <Button
              onClick={handleConfirmRemoveImportItem}
              variant="contained"
              color="error"
            >
              移除
            </Button>
          </DialogActions>
        </Dialog>

        <CollectionItemLimitDialog
          open={limitDialogOpen}
          onClose={() => setLimitDialogOpen(false)}
          limit={collectionItemLimit}
          totalCount={draftPlaylistItems.length}
          overflowCount={draftOverflowCount}
          selectedRemovalCount={selectedRemovalKeys.length}
          remainingCount={remainingAfterRemovalCount}
          canApply={canApplyRemoval}
          normalItems={normalDraftPlaylistItems}
          longItems={longDraftPlaylistItems}
          selectedRemovalKeys={selectedRemovalKeys}
          onToggleItem={toggleRemovalKey}
          onApply={handleApplySelectedRemovals}
          onReselectSuggested={handleReselectOverflowItems}
          onSelectLongOnly={handleSelectLongTracksOnly}
          onClearSelection={handleClearRemovalSelection}
        />

        <BulkPlaybackRangeDrawer
          open={bulkPlaybackOpen}
          draft={bulkPlaybackDraft}
          previewItems={bulkPlaybackPreviewItems}
          affectedItems={bulkPlaybackAffectedItems}
          canApply={batchEditedDraftPlaylistItems.length > 0}
          isApplying={bulkPlaybackApplying}
          applyProgress={bulkPlaybackProgress}
          applyLabel="套用到建立清單"
          formatSeconds={formatSeconds}
          onClose={() => {
            if (!bulkPlaybackApplying) setBulkPlaybackOpen(false);
          }}
          onDraftChange={setBulkPlaybackDraft}
          onApply={handleApplyCreateBulkPlayback}
        />

        <CollectionEditAiBatchDrawer
          open={aiBatchModalOpen}
          onClose={closeAiBatchModal}
          aiProviderLabel={aiProviderLabel}
          playlistItemsCount={createAiEditableItems.length}
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
      </Box>
    </Box>
  );
};

export default CollectionCreatePage;
