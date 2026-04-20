import { useEffect, useRef } from "react";

import type {
  PlaylistPreviewItem,
} from "../components/source/PlaylistPreviewRows";
import {
  EMPTY_PLAYLIST_ISSUE_SUMMARY,
  type PlaylistIssueSummary,
} from "@features/PlaylistSource";

type UsePlaylistImportUiArgs = {
  createLibraryTab: "public" | "personal" | "youtube" | "link";
  roomCreateSourceMode: string;
  playlistUrlDraft: string;
  setPlaylistUrlDraft: (value: string) => void;
  playlistPreviewError: string | null;
  setPlaylistPreviewError: (value: string | null) => void;
  playlistError: string | null;
  playlistLoading: boolean;
  lastFetchedPlaylistTitle: string | null;
  playlistItemsLength: number;
  playlistPreviewItems: PlaylistPreviewItem[];
  playlistIssueSummary: PlaylistIssueSummary;
  handleFetchPlaylistByUrl: (value: string) => Promise<unknown>;
  handleResetPlaylist: () => void;
  setRoomCreateSourceMode: (value: "publicCollection" | "privateCollection" | "youtube" | "link") => void;
  setSelectedCreateCollectionId: (value: string | null) => void;
  setSelectedCreateYoutubeId: (value: string | null) => void;
  setSharedCollectionMeta: (value: null) => void;
  setCreateLeftTab: (value: "library" | "settings") => void;
};

export const canAttemptPlaylistPreview = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    return Boolean(parsed.searchParams.get("list"));
  } catch {
    return false;
  }
};

export const usePlaylistImportUi = ({
  createLibraryTab,
  roomCreateSourceMode,
  playlistUrlDraft,
  setPlaylistUrlDraft,
  playlistPreviewError,
  setPlaylistPreviewError,
  playlistError,
  playlistLoading,
  lastFetchedPlaylistTitle,
  playlistItemsLength,
  playlistPreviewItems,
  playlistIssueSummary,
  handleFetchPlaylistByUrl,
  handleResetPlaylist,
  setRoomCreateSourceMode,
  setSelectedCreateCollectionId,
  setSelectedCreateYoutubeId,
  setSharedCollectionMeta,
  setCreateLeftTab,
}: UsePlaylistImportUiArgs) => {
  const lastAutoPreviewUrlRef = useRef("");

  const isLinkSourceActive = roomCreateSourceMode === "link";
  const trimmedPlaylistUrlDraft = playlistUrlDraft.trim();
  const playlistUrlLooksValid = canAttemptPlaylistPreview(trimmedPlaylistUrlDraft);
  const linkPreviewLocked =
    isLinkSourceActive &&
    ((playlistLoading && playlistUrlLooksValid) ||
      Boolean(lastFetchedPlaylistTitle) ||
      playlistItemsLength > 0);
  const linkPlaylistTitle = isLinkSourceActive ? lastFetchedPlaylistTitle : null;
  const linkPlaylistPreviewItems = isLinkSourceActive ? playlistPreviewItems : [];
  const linkPlaylistIssueSummary = isLinkSourceActive
    ? playlistIssueSummary
    : EMPTY_PLAYLIST_ISSUE_SUMMARY;

  const handlePreviewPlaylistByUrl = async () => {
    const trimmed = playlistUrlDraft.trim();
    if (!canAttemptPlaylistPreview(trimmed)) {
      setPlaylistPreviewError(null);
      return;
    }
    setPlaylistPreviewError(null);
    try {
      await handleFetchPlaylistByUrl(trimmed);
    } catch {
      setPlaylistPreviewError("清單預覽失敗，請確認連結格式。");
    }
  };

  const handleCancelLinkPreview = () => {
    handleResetPlaylist();
    setPlaylistUrlDraft("");
    setPlaylistPreviewError(null);
    lastAutoPreviewUrlRef.current = "";
  };

  const handleClearPlaylistUrlInput = () => {
    if (linkPreviewLocked) {
      handleCancelLinkPreview();
      return;
    }
    setPlaylistUrlDraft("");
    setPlaylistPreviewError(null);
    lastAutoPreviewUrlRef.current = "";
  };

  useEffect(() => {
    if (createLibraryTab !== "link" || !isLinkSourceActive) return;
    const trimmed = playlistUrlDraft.trim();
    if (
      !canAttemptPlaylistPreview(trimmed) ||
      trimmed === lastAutoPreviewUrlRef.current
    ) {
      return;
    }
    const timer = window.setTimeout(() => {
      lastAutoPreviewUrlRef.current = trimmed;
      void handleFetchPlaylistByUrl(trimmed).catch(() => {
        setPlaylistPreviewError("清單預覽失敗，請確認連結格式。");
      });
    }, 450);
    return () => window.clearTimeout(timer);
  }, [
    createLibraryTab,
    handleFetchPlaylistByUrl,
    isLinkSourceActive,
    playlistUrlDraft,
    setPlaylistPreviewError,
  ]);

  const playlistUrlFormatWarning =
    trimmedPlaylistUrlDraft &&
    !canAttemptPlaylistPreview(trimmedPlaylistUrlDraft)
      ? "請輸入有效的 YouTube 播放清單連結"
      : null;
  const playlistUrlErrorMessage = playlistPreviewError || playlistError || null;
  const showPlaylistUrlError =
    Boolean(trimmedPlaylistUrlDraft) && Boolean(playlistUrlErrorMessage);
  const showPlaylistUrlWarning =
    Boolean(trimmedPlaylistUrlDraft) &&
    !showPlaylistUrlError &&
    Boolean(playlistUrlFormatWarning);
  const playlistUrlTooltipMessage: string = showPlaylistUrlError
    ? playlistUrlErrorMessage ?? ""
    : showPlaylistUrlWarning
      ? playlistUrlFormatWarning ?? ""
      : "";
  const linkPlaylistCount = linkPlaylistPreviewItems.length;

  const handleActivateLinkSource = () => {
    setRoomCreateSourceMode("link");
    setSelectedCreateCollectionId(null);
    setSelectedCreateYoutubeId(null);
    setSharedCollectionMeta(null);
    handleResetPlaylist();
    setPlaylistPreviewError(null);
    lastAutoPreviewUrlRef.current = "";
  };

  const handlePickLinkSource = () => {
    setRoomCreateSourceMode("link");
    setSelectedCreateCollectionId(null);
    setSelectedCreateYoutubeId(null);
    setSharedCollectionMeta(null);
    setPlaylistUrlDraft("");
    setPlaylistPreviewError(null);
    lastAutoPreviewUrlRef.current = "";
    setCreateLeftTab("settings");
  };

  return {
    isLinkSourceActive,
    trimmedPlaylistUrlDraft,
    playlistUrlLooksValid,
    linkPreviewLocked,
    linkPlaylistTitle,
    linkPlaylistPreviewItems,
    linkPlaylistIssueSummary,
    handlePreviewPlaylistByUrl,
    handleClearPlaylistUrlInput,
    showPlaylistUrlError,
    showPlaylistUrlWarning,
    playlistUrlTooltipMessage,
    linkPlaylistCount,
    handleActivateLinkSource,
    handlePickLinkSource,
    lastAutoPreviewUrlRef,
  };
};
