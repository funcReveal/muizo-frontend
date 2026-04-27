import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import ArrowBackIosNew from "@mui/icons-material/ArrowBackIosNew";
import { Box } from "@mui/material";
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
import CollectionCreateInspectorPanel from "../components/CollectionCreateInspectorPanel";
import CollectionCreateReviewPanel from "../components/CollectionCreateReviewPanel";
import CollectionCreatePublishPanel from "../components/CollectionCreatePublishPanel";
import CollectionCreateSourcePanel from "../components/CollectionCreateSourcePanel";
import CollectionCreateStepNav from "../components/CollectionCreateStepNav";
import CollectionPlaylistIssueDrawer from "../components/CollectionPlaylistIssueDrawer";
import CollectionDuplicateDrawer from "../components/CollectionDuplicateDrawer";
import CollectionClearPlaylistDialog from "../components/CollectionClearPlaylistDialog";
import CollectionItemLimitDialog from "../components/CollectionItemLimitDialog";
import CollectionCreateProgressOverlay from "../components/CollectionCreateProgressOverlay";
import { useCollectionCreateDraft } from "../hooks/useCollectionCreateDraft";
import { useCollectionCreateSubmit } from "../hooks/useCollectionCreateSubmit";
import { useCollectionCreateImportSources } from "../hooks/useCollectionCreateImportSources";
import { useEditableCollectionTitle } from "../hooks/useEditableCollectionTitle";
import { useCollectionCreateAutoImport } from "../hooks/useCollectionCreateAutoImport";
import {
  useCollectionCreateReadiness,
  type CollectionCreateStep,
} from "../hooks/useCollectionCreateReadiness";

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
    : playlistUrlReadOnly
      ? t("source.playlistLockedHint")
      : "";

  const effectiveCollectionTitle = (
    collectionTitle ||
    lastFetchedPlaylistTitle ||
    ""
  ).trim();

  const hasImportedItems = draftPlaylistItems.length > 0;

  const {
    privateCollectionsCount,
    remainingCollectionSlots,
    remainingPrivateCollectionSlots,
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
      count: draftPlaylistItems.length,
    };
  }, [
    draftPlaylistItems.length,
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
      className="mx-auto w-full max-w-6xl px-3 pb-[calc(7.5rem+env(safe-area-inset-bottom))] pt-3 sm:px-4 sm:pb-6 sm:pt-4"
    >
      <Box className="relative overflow-visible p-0 text-[var(--mc-text)] sm:p-5">
        {isCreating && (
          <CollectionCreateProgressOverlay
            createStageLabel={createStageLabel}
            createProgress={createProgress}
          />
        )}

        <div className="relative">
          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <button
                type="button"
                onClick={() => navigate("/collections")}
                aria-label={t("page.backToCollections")}
                className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[var(--mc-surface-strong)]/40 text-[var(--mc-text)] transition hover:bg-[var(--mc-surface-strong)]/60"
              >
                <ArrowBackIosNew fontSize="small" />
              </button>

              <div className="min-w-0">
                <div className="text-xl font-semibold leading-none text-[var(--mc-text)] sm:text-2xl">
                  {t("page.title")}
                </div>
                <div className="mt-2 max-w-2xl text-sm leading-6 text-[var(--mc-text-muted)]">
                  {t("page.description")}
                </div>
              </div>
            </div>
          </div>

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

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="min-w-0">
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
                    normalDraftPlaylistItems={normalDraftPlaylistItems}
                    longDraftPlaylistItems={longDraftPlaylistItems}
                    removedImportItems={removedImportItems}
                    removedImportItemCount={removedImportItemCount}
                    onRemoveImportSource={removeImportSource}
                    onRemoveImportItem={removeImportItem}
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
                totalImportedItems={totalImportedItemCount}
                selectedItems={importedPlaylistItems.length}
                removedItems={removedImportItemCount}
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
                visibility={effectiveVisibility}
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
