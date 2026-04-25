import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";

import ArrowBackIosNew from "@mui/icons-material/ArrowBackIosNew";
import CloseRounded from "@mui/icons-material/CloseRounded";
import PlaylistAddRounded from "@mui/icons-material/PlaylistAddRounded";
import {
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Tab,
  Tabs,
} from "@mui/material";
import { useAuth } from "../../../../shared/auth/AuthContext";
import { isAdminRole } from "../../../../shared/auth/roles";
import { isGoogleReauthRequired } from "../../../../shared/auth/providerAuth";
import { fadeInUp } from "../../../../shared/motion/motionPresets";
import { appToast } from "../../../../shared/ui/toastApi";
import { usePlaylistSource } from "@features/PlaylistSource";
import { useCollectionContent } from "@features/CollectionContent";
import {
  MAX_COLLECTIONS_PER_USER,
  MAX_PRIVATE_COLLECTIONS_PER_USER,
  resolveCollectionItemLimit,
} from "../../shared/model/collectionLimits";
import CollectionCreateActionBar from "../components/CollectionCreateActionBar";
import CollectionCreateInspectorPanel from "../components/CollectionCreateInspectorPanel";
import CollectionCreateReviewPanel from "../components/CollectionCreateReviewPanel";
import CollectionCreatePublishPanel from "../components/CollectionCreatePublishPanel";
import CollectionCreateSourcePanel from "../components/CollectionCreateSourcePanel";
import CollectionCreateStepNav from "../components/CollectionCreateStepNav";
import CollectionItemLimitDialog from "../components/CollectionItemLimitDialog";
import { useCollectionCreateDraft } from "../hooks/useCollectionCreateDraft";
import { useCollectionCreateSubmit } from "../hooks/useCollectionCreateSubmit";

const API_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" ? window.location.origin : "");

const LONG_DURATION_THRESHOLD_SEC = 600;

type CreateStep = "source" | "review" | "publish";

type PlaylistIssueTab =
  | "duplicate"
  | "removed"
  | "privateRestricted"
  | "embedBlocked"
  | "unavailable";

const CollectionCreatePage = () => {
  const navigate = useNavigate();
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

  const [createStep, setCreateStep] = useState<CreateStep>("source");
  const [collectionTitle, setCollectionTitle] = useState("");
  const [collectionDescription, setCollectionDescription] = useState("");
  const [visibility, setVisibility] = useState<"private" | "public">("public");
  const [playlistSource, setPlaylistSource] = useState<"url" | "youtube">(
    "url",
  );
  const youtubeFetchedRef = useRef(false);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const lastAutoImportUrlRef = useRef("");
  const [selectedYoutubePlaylistId, setSelectedYoutubePlaylistId] =
    useState("");
  const [isImportingYoutubePlaylist, setIsImportingYoutubePlaylist] =
    useState(false);
  const [isTitleEditing, setIsTitleEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [youtubeActionError, setYoutubeActionError] = useState<string | null>(
    null,
  );
  const [isPlaylistUrlFocused, setIsPlaylistUrlFocused] = useState(false);
  const [playlistIssueDialogOpen, setPlaylistIssueDialogOpen] = useState(false);
  const [playlistIssueTab, setPlaylistIssueTab] =
    useState<PlaylistIssueTab>("removed");
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);

  const needsGoogleReauth = isGoogleReauthRequired({
    error: youtubePlaylistsError ?? youtubeActionError,
  });

  const ownerId = authUser?.id ?? null;
  const isAdmin = isAdminRole(authUser?.role);

  const privateCollectionsCount = collections.filter(
    (item) => item.visibility !== "public",
  ).length;

  const remainingCollectionSlots = Math.max(
    0,
    MAX_COLLECTIONS_PER_USER - collections.length,
  );

  const remainingPrivateCollectionSlots = Math.max(
    0,
    MAX_PRIVATE_COLLECTIONS_PER_USER - privateCollectionsCount,
  );

  const reachedCollectionLimit =
    !isAdmin && collections.length >= MAX_COLLECTIONS_PER_USER;

  const reachedPrivateCollectionLimit =
    !isAdmin && privateCollectionsCount >= MAX_PRIVATE_COLLECTIONS_PER_USER;

  const collectionItemLimit = resolveCollectionItemLimit({
    role: authUser?.role,
    plan: authUser?.plan,
  });

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
    playlistItems,
    collectionItemLimit,
    longDurationThresholdSec: LONG_DURATION_THRESHOLD_SEC,
  });

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
    visibility,
    draftPlaylistItems,
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

  const playlistUrlTooltipMessage = showPlaylistUrlError
    ? "請貼上有效的 YouTube 播放清單連結，例如含有 list 參數的網址。"
    : "";

  useEffect(() => {
    handleResetPlaylist();

    return () => {
      handleResetPlaylist();
    };
  }, [handleResetPlaylist]);

  useEffect(() => {
    if (!lastFetchedPlaylistTitle) return;
    setCollectionTitle(lastFetchedPlaylistTitle);
    setTitleDraft(lastFetchedPlaylistTitle);
  }, [lastFetchedPlaylistTitle]);

  useEffect(() => {
    if (!authToken || !authUser?.id) return;
    if (collectionScope === "owner") return;
    void fetchCollections("owner");
  }, [authToken, authUser?.id, collectionScope, fetchCollections]);

  useEffect(() => {
    setTitleDraft(collectionTitle);
  }, [collectionTitle]);

  useEffect(() => {
    if (!reachedPrivateCollectionLimit) return;
    setVisibility((current) => (current === "private" ? "public" : current));
  }, [reachedPrivateCollectionLimit]);

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

  const effectiveCollectionTitle = (
    collectionTitle ||
    lastFetchedPlaylistTitle ||
    ""
  ).trim();

  const collectionPreview = useMemo(() => {
    if (!hasDraftPlaylistItems) return null;

    return {
      title: effectiveCollectionTitle || "未命名收藏",
      count: draftPlaylistItems.length,
    };
  }, [
    effectiveCollectionTitle,
    hasDraftPlaylistItems,
    draftPlaylistItems.length,
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
      return `目前已處理 ${playlistProgress.received} / ${playlistProgress.total} 首`;
    }

    return playlistSource === "youtube"
      ? "正在整理 YouTube 播放清單內容..."
      : "正在載入播放清單內容...";
  }, [
    playlistLoading,
    playlistProgress.received,
    playlistProgress.total,
    playlistSource,
  ]);

  const createProgressPercent = useMemo(() => {
    if (!createProgress || createProgress.total <= 0) return null;

    return Math.min(
      100,
      Math.round((createProgress.completed / createProgress.total) * 100),
    );
  }, [createProgress]);

  const playlistIssueSummary = useMemo(() => {
    if (playlistPreviewMeta?.skippedItems?.length) {
      const removed: string[] = [];
      const duplicate: string[] = [];
      const privateRestricted: string[] = [];
      const embedBlocked: string[] = [];
      const unavailable: string[] = [];
      const unknown: string[] = [];

      playlistPreviewMeta.skippedItems.forEach((item) => {
        const label = item.title?.trim() || item.videoId || "未知項目";

        if (item.status === "duplicate") {
          duplicate.push(label);
          return;
        }

        if (item.status === "removed") {
          removed.push(label);
          return;
        }

        if (item.status === "private") {
          privateRestricted.push(label);
          return;
        }

        if (item.status === "blocked") {
          embedBlocked.push(label);
          return;
        }

        if (item.status === "unavailable") {
          unavailable.push(label);
          return;
        }

        unknown.push(label);
      });

      return {
        removed,
        duplicate,
        privateRestricted,
        embedBlocked,
        unavailable,
        unknown,
        unknownCount: 0,
      };
    }

    return {
      removed: [] as string[],
      duplicate: [] as string[],
      privateRestricted: [] as string[],
      embedBlocked: [] as string[],
      unavailable: [] as string[],
      unknown: [] as string[],
      unknownCount: playlistPreviewMeta?.skippedCount ?? 0,
    };
  }, [playlistPreviewMeta]);

  const playlistIssueTotal =
    playlistIssueSummary.removed.length +
    playlistIssueSummary.duplicate.length +
    playlistIssueSummary.privateRestricted.length +
    playlistIssueSummary.embedBlocked.length +
    playlistIssueSummary.unavailable.length +
    playlistIssueSummary.unknown.length +
    playlistIssueSummary.unknownCount;

  const playlistIssueGroups = useMemo(
    () => [
      {
        key: "duplicate" as const,
        label: "重複略過",
        count: playlistIssueSummary.duplicate.length,
        items: playlistIssueSummary.duplicate,
        className: "border-emerald-300/30 bg-emerald-300/10 text-emerald-100",
      },
      {
        key: "removed" as const,
        label: "已移除",
        count: playlistIssueSummary.removed.length,
        items: playlistIssueSummary.removed,
        className: "border-amber-300/30 bg-amber-300/10 text-amber-100",
      },
      {
        key: "privateRestricted" as const,
        label: "隱私限制",
        count: playlistIssueSummary.privateRestricted.length,
        items: playlistIssueSummary.privateRestricted,
        className: "border-fuchsia-300/30 bg-fuchsia-300/10 text-fuchsia-100",
      },
      {
        key: "embedBlocked" as const,
        label: "嵌入限制",
        count: playlistIssueSummary.embedBlocked.length,
        items: playlistIssueSummary.embedBlocked,
        className: "border-rose-300/30 bg-rose-300/10 text-rose-100",
      },
      {
        key: "unavailable" as const,
        label: "其他不可用",
        count:
          playlistIssueSummary.unavailable.length +
          playlistIssueSummary.unknown.length +
          playlistIssueSummary.unknownCount,
        items: [
          ...playlistIssueSummary.unavailable,
          ...playlistIssueSummary.unknown,
        ],
        fallback:
          playlistIssueSummary.unknownCount > 0
            ? `共 ${playlistIssueSummary.unknownCount} 首，後端未提供明細`
            : "無",
        className: "border-red-300/30 bg-red-300/10 text-red-100",
      },
    ],
    [
      playlistIssueSummary.duplicate,
      playlistIssueSummary.removed,
      playlistIssueSummary.privateRestricted,
      playlistIssueSummary.embedBlocked,
      playlistIssueSummary.unavailable,
      playlistIssueSummary.unknown,
      playlistIssueSummary.unknownCount,
    ],
  );

  const activePlaylistIssueGroup =
    playlistIssueGroups.find((group) => group.key === playlistIssueTab) ??
    playlistIssueGroups[0];

  useEffect(() => {
    if (!playlistIssueDialogOpen) return;

    const firstGroupWithItems = playlistIssueGroups.find(
      (group) => group.count > 0,
    );

    if (firstGroupWithItems) {
      setPlaylistIssueTab(firstGroupWithItems.key);
    }
  }, [playlistIssueDialogOpen, playlistIssueGroups]);

  useEffect(() => {
    if (playlistSource !== "youtube") return;
    if (!authUser) return;
    if (youtubeFetchedRef.current) return;

    youtubeFetchedRef.current = true;
    void fetchYoutubePlaylists();
  }, [playlistSource, authUser, fetchYoutubePlaylists]);

  const hasImportedItems = draftPlaylistItems.length > 0;

  const canGoReview =
    hasImportedItems && !playlistLoading && !isImportingYoutubePlaylist;

  const canGoPublish =
    canGoReview &&
    !isDraftOverflow &&
    !reachedCollectionLimit &&
    Boolean(effectiveCollectionTitle);

  const canCreateCollection =
    canGoPublish &&
    !isCreating &&
    !authLoading &&
    Boolean(authToken) &&
    !reachedCollectionLimit &&
    !isDraftOverflow;

  const canGoNext = createStep === "source" ? canGoReview : canGoPublish;

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
      setYoutubeActionError("請先選擇 YouTube 播放清單");
      return;
    }

    setYoutubeActionError(null);
    setIsImportingYoutubePlaylist(true);

    try {
      await importYoutubePlaylist(playlistId);
    } catch {
      setYoutubeActionError("匯入失敗，請稍後再試");
    } finally {
      setIsImportingYoutubePlaylist(false);
    }
  };

  const handleTitleSave = () => {
    const nextTitle = titleDraft.trim();

    if (!nextTitle) {
      setTitleDraft(collectionTitle);
      setIsTitleEditing(false);
      return;
    }

    setCollectionTitle(nextTitle);
    setTitleDraft(nextTitle);
    setIsTitleEditing(false);
  };

  const handleTitleCancel = () => {
    setTitleDraft(collectionTitle);
    setIsTitleEditing(false);
  };

  const handleClearPlaylistUrl = () => {
    setPlaylistUrl("");
    lastAutoImportUrlRef.current = "";
  };

  const handleVisibilityChange = (nextVisibility: "private" | "public") => {
    if (nextVisibility === "private" && reachedPrivateCollectionLimit) {
      appToast.warning(
        `私人收藏最多只能建立 ${MAX_PRIVATE_COLLECTIONS_PER_USER} 個，請改為公開收藏或先整理現有私人收藏。`,
        { id: "private-collection-limit" },
      );
      return;
    }

    setVisibility(nextVisibility);
  };

  return (
    <Box className="mx-auto w-full max-w-7xl px-4 pb-6 pt-4">
      <Box className="relative overflow-hidden text-[var(--mc-text)]">
        {isCreating && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-[rgba(2,6,23,0.72)] backdrop-blur-md">
            <div className="w-full max-w-md rounded-[28px] border border-cyan-300/20 bg-[linear-gradient(180deg,rgba(8,15,28,0.96),rgba(10,18,32,0.9))] p-6 shadow-[0_32px_120px_-48px_rgba(34,211,238,0.5)]">
              <div className="flex items-center gap-4">
                <div className="relative inline-flex h-16 w-16 items-center justify-center">
                  <CircularProgress
                    size={56}
                    thickness={4}
                    variant={
                      createProgressPercent === null
                        ? "indeterminate"
                        : "determinate"
                    }
                    value={createProgressPercent ?? undefined}
                    sx={{ color: "#67e8f9" }}
                  />
                  <PlaylistAddRounded
                    sx={{
                      position: "absolute",
                      fontSize: 24,
                      color: "#cffafe",
                    }}
                  />
                </div>

                <div className="min-w-0">
                  <div className="text-lg font-semibold text-[var(--mc-text)]">
                    {createStageLabel ?? "正在建立收藏庫"}
                  </div>
                  <div className="mt-1 text-sm text-[var(--mc-text-muted)]">
                    這一步會一次建立收藏庫並寫入歌曲資料，若中途失敗不會留下不完整的收藏庫。
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <div className="h-2 overflow-hidden rounded-full bg-slate-800/80">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#38bdf8,#67e8f9,#f59e0b)] transition-[width] duration-300 ease-out"
                    style={{ width: `${createProgressPercent ?? 16}%` }}
                  />
                </div>

                <div className="mt-2 flex items-center justify-between text-xs text-[var(--mc-text-muted)]">
                  <span>{createStageLabel ?? "準備中"}</span>
                  <span>
                    {createProgress
                      ? `${createProgress.completed}/${createProgress.total}`
                      : "0/0"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <button
                type="button"
                onClick={() => navigate("/collections")}
                aria-label="返回收藏列表"
                className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[var(--mc-surface-strong)]/40 text-[var(--mc-text)] transition hover:bg-[var(--mc-surface-strong)]/60"
              >
                <ArrowBackIosNew fontSize="small" />
              </button>

              <div className="min-w-0">
                <div className="text-2xl font-semibold leading-none text-[var(--mc-text)]">
                  Create Collection
                </div>
                <div className="mt-2 max-w-2xl text-sm leading-6 text-[var(--mc-text-muted)]">
                  Import a YouTube playlist, review the playable items, then
                  publish it as a collection.
                </div>
              </div>
            </div>
          </div>

          {!authToken && !authLoading && (
            <div className="mt-3 rounded-xl border border-amber-400/40 bg-amber-950/40 px-3 py-2 text-xs text-amber-200">
              請先使用 Google 登入後再建立收藏
            </div>
          )}

          <div className="mt-5 space-y-4">
            <CollectionCreateStepNav
              currentStep={createStep}
              onStepChange={setCreateStep}
              canOpenReview={canGoReview}
              canOpenPublish={canGoPublish}
            />

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="min-w-0">
                {createStep === "source" && (
                  <CollectionCreateSourcePanel
                    authUserExists={Boolean(authUser)}
                    needsGoogleReauth={needsGoogleReauth}
                    onLoginWithGoogle={loginWithGoogle}
                    playlistSource={playlistSource}
                    onPlaylistSourceChange={setPlaylistSource}
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
                    onClearPlaylistUrl={handleClearPlaylistUrl}
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
                    onStartEditTitle={() => setIsTitleEditing(true)}
                    onSaveTitle={handleTitleSave}
                    onCancelTitle={handleTitleCancel}
                    isAdmin={isAdmin}
                    collectionItemLimit={collectionItemLimit}
                    normalDraftPlaylistItems={normalDraftPlaylistItems}
                    longDraftPlaylistItems={longDraftPlaylistItems}
                    removedDuplicateCount={removedDuplicateCount}
                    onOpenDuplicateDialog={() => setDuplicateDialogOpen(true)}
                    isDraftOverflow={isDraftOverflow}
                    draftOverflowCount={draftOverflowCount}
                    onOpenLimitDialog={() => setLimitDialogOpen(true)}
                    playlistIssueTotal={playlistIssueTotal}
                    onOpenPlaylistIssueDialog={() =>
                      setPlaylistIssueDialogOpen(true)
                    }
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
                    visibility={visibility}
                    onVisibilityChange={handleVisibilityChange}
                    reachedPrivateCollectionLimit={
                      reachedPrivateCollectionLimit
                    }
                    reachedCollectionLimit={reachedCollectionLimit}
                    maxPrivateCollectionsPerUser={
                      MAX_PRIVATE_COLLECTIONS_PER_USER
                    }
                    readyItems={draftPlaylistItems.length}
                    longItems={longDraftPlaylistItems.length}
                    skippedItems={playlistIssueTotal}
                    removedDuplicateCount={removedDuplicateCount}
                    isDraftOverflow={isDraftOverflow}
                    draftOverflowCount={draftOverflowCount}
                    isReadyToCreate={canCreateCollection}
                  />
                )}
              </div>

              <CollectionCreateInspectorPanel
                totalItems={playlistItems.length}
                readyItems={draftPlaylistItems.length}
                longItems={longDraftPlaylistItems.length}
                removedDuplicateCount={removedDuplicateCount}
                skippedCount={playlistIssueTotal}
                isDraftOverflow={isDraftOverflow}
                draftOverflowCount={draftOverflowCount}
                collectionItemLimit={collectionItemLimit}
                collectionsCount={collections.length}
                privateCollectionsCount={privateCollectionsCount}
                remainingCollectionSlots={remainingCollectionSlots}
                remainingPrivateCollectionSlots={
                  remainingPrivateCollectionSlots
                }
                maxCollectionsPerUser={MAX_COLLECTIONS_PER_USER}
                maxPrivateCollectionsPerUser={MAX_PRIVATE_COLLECTIONS_PER_USER}
                reachedCollectionLimit={reachedCollectionLimit}
                reachedPrivateCollectionLimit={reachedPrivateCollectionLimit}
                isAdmin={isAdmin}
                visibility={visibility}
                createError={createError}
              />
            </div>

            <CollectionCreateActionBar
              currentStep={createStep}
              canGoNext={canGoNext}
              canCreate={canCreateCollection}
              isCreating={isCreating}
              onBack={handleGoPreviousStep}
              onNext={handleGoNextStep}
              onCreate={() => void handleCreateCollection()}
            />
          </div>
        </div>

        <Dialog
          open={duplicateDialogOpen}
          onClose={() => setDuplicateDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              border: "1px solid rgba(148, 163, 184, 0.22)",
              background:
                "linear-gradient(180deg, rgba(8,13,24,0.98), rgba(2,6,23,0.98))",
              color: "var(--mc-text)",
            },
          }}
        >
          <DialogTitle sx={{ pb: 1 }}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-base font-semibold">
                  已自動移除的重複歌曲
                </div>
                <div className="mt-1 text-xs text-[var(--mc-text-muted)]">
                  共自動移除 {removedDuplicateCount}{" "}
                  首重複項目，建立時不會再被重複擋下
                </div>
              </div>

              <IconButton
                size="small"
                onClick={() => setDuplicateDialogOpen(false)}
                aria-label="關閉重複歌曲明細"
                sx={{ color: "var(--mc-text-muted)" }}
              >
                <CloseRounded fontSize="small" />
              </IconButton>
            </div>
          </DialogTitle>

          <DialogContent>
            <div className="space-y-3">
              {removedDuplicateGroups.map((group) => (
                <div
                  key={group.key}
                  className="rounded-xl border border-emerald-400/25 bg-emerald-950/20 px-3 py-3"
                >
                  <div className="text-sm font-semibold text-[var(--mc-text)]">
                    {group.title}
                  </div>

                  <div className="mt-1 text-xs text-[var(--mc-text-muted)]">
                    {group.uploader || "未知上傳者"}
                  </div>

                  <div className="mt-2 text-xs text-emerald-100">
                    原清單共出現 {group.totalCount} 次，已保留第{" "}
                    {group.keptIndex + 1} 首，另外移除 {group.removedCount} 首
                  </div>

                  <div className="mt-1 text-[11px] text-emerald-200">
                    已移除位置：第{" "}
                    {group.removedIndexes.map((index) => index + 1).join("、")}{" "}
                    首
                  </div>

                  {group.url && (
                    <a
                      href={group.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 block break-all text-[11px] text-cyan-300 underline"
                    >
                      {group.url}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog
          open={playlistIssueDialogOpen}
          onClose={() => setPlaylistIssueDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          sx={{
            "& .MuiDialog-container": {
              alignItems: "flex-start",
            },
          }}
          PaperProps={{
            sx: {
              borderRadius: 3,
              border: "1px solid rgba(148, 163, 184, 0.22)",
              background:
                "linear-gradient(180deg, rgba(8,13,24,0.98), rgba(2,6,23,0.98))",
              color: "var(--mc-text)",
              mt: { xs: 12, sm: 14 },
            },
          }}
        >
          <DialogTitle sx={{ pb: 1 }}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-base font-semibold">未成功匯入原因</div>
                <div className="mt-1 text-xs text-[var(--mc-text-muted)]">
                  共 {playlistIssueTotal} 首未能匯入收藏庫
                </div>
              </div>

              <IconButton
                size="small"
                onClick={() => setPlaylistIssueDialogOpen(false)}
                aria-label="關閉未成功匯入原因"
                sx={{ color: "var(--mc-text-muted)" }}
              >
                <CloseRounded fontSize="small" />
              </IconButton>
            </div>
          </DialogTitle>

          <DialogContent sx={{ pt: 1 }}>
            <Tabs
              value={playlistIssueTab}
              onChange={(_, value: PlaylistIssueTab) =>
                setPlaylistIssueTab(value)
              }
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                minHeight: 36,
                borderBottom: "1px solid rgba(148, 163, 184, 0.16)",
                "& .MuiTabs-indicator": {
                  height: 2,
                  borderRadius: 999,
                  backgroundColor: "var(--mc-accent)",
                },
                "& .MuiTab-root": {
                  minHeight: 36,
                  px: 1.5,
                  color: "var(--mc-text-muted)",
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: "none",
                },
                "& .Mui-selected": {
                  color: "var(--mc-text)",
                },
              }}
            >
              {playlistIssueGroups.map((group) => (
                <Tab
                  key={group.key}
                  value={group.key}
                  label={`${group.label} ${group.count}`}
                />
              ))}
            </Tabs>

            <div className="min-h-[180px] pb-2 pt-3">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activePlaylistIssueGroup.key}
                  variants={fadeInUp}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  layout
                  style={{ originY: 0 }}
                  transition={{
                    layout: {
                      duration: 0.2,
                      ease: [0.22, 1, 0.36, 1],
                    },
                  }}
                  className={`rounded-2xl border px-4 py-3 ${activePlaylistIssueGroup.className}`}
                >
                  <div className="flex items-center justify-between gap-3 text-sm font-semibold">
                    <span>{activePlaylistIssueGroup.label}</span>
                    <span>{activePlaylistIssueGroup.count} 首</span>
                  </div>

                  <div className="mt-3 max-h-64 overflow-y-auto pr-1">
                    {activePlaylistIssueGroup.items.length > 0 ? (
                      <div className="space-y-1.5">
                        {activePlaylistIssueGroup.items.map((item, index) => (
                          <div
                            key={`${activePlaylistIssueGroup.key}-${item}-${index}`}
                            className="flex items-center gap-3 rounded-xl border border-white/8 bg-black/15 px-3 py-2"
                          >
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/8 text-[11px] font-semibold">
                              {index + 1}
                            </div>

                            <div className="min-w-0 flex-1 truncate text-xs leading-5">
                              {item}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-white/8 bg-black/15 px-3 py-3 text-xs opacity-90">
                        {activePlaylistIssueGroup.fallback ?? "無"}
                      </div>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </DialogContent>
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
      </Box>
    </Box>
  );
};

export default CollectionCreatePage;
