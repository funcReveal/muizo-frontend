import React from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import TipsAndUpdatesRoundedIcon from "@mui/icons-material/TipsAndUpdatesRounded";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import PublicRoundedIcon from "@mui/icons-material/PublicRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import VideoLibraryRoundedIcon from "@mui/icons-material/VideoLibraryRounded";
import PlaylistAddCheckRoundedIcon from "@mui/icons-material/PlaylistAddCheckRounded";
import PublishedWithChangesRoundedIcon from "@mui/icons-material/PublishedWithChangesRounded";
import { useState } from "react";

import type { GameState, PlaylistSuggestion } from "../../model/types";
import type { YoutubePlaylist } from "../../model/RoomContext";
import RoomLobbyStatusStrip from "./RoomLobbyStatusStrip";
import type { CollectionOption } from "./roomLobbyPanelTypes";
import { normalizeDisplayText } from "./roomLobbyPanelUtils";

interface RoomLobbyHostControlsProps {
  isHostPanelExpanded: boolean;
  hasNewSuggestions: boolean;
  playlistSuggestions: PlaylistSuggestion[];
  gameStatus?: GameState["status"];
  hostSourceType: "suggestions" | "playlist" | "collection" | "youtube";
  setHostSourceType: (
    next: "suggestions" | "playlist" | "collection" | "youtube",
  ) => void;
  markSuggestionsSeen: () => void;
  isApplyingHostSuggestion: boolean;
  hostSuggestionHint: string;
  selectedSuggestionKey: string;
  setSelectedSuggestionKey: (value: string) => void;
  requestApplyHostSuggestion: (suggestion: PlaylistSuggestion) => void;
  hostPlaylistPrimaryText: string;
  playlistUrl: string;
  onPlaylistUrlChange: (value: string) => void;
  onPlaylistPaste: (event: React.ClipboardEvent<HTMLInputElement>) => void;
  isGoogleAuthed: boolean;
  collectionScope: "public" | "owner";
  setCollectionScope: (scope: "public" | "owner") => void;
  onSelectCollection: (collectionId: string | null) => void;
  selectedCollectionId: string | null;
  collections: CollectionOption[];
  collectionsLoading: boolean;
  collectionItemsLoading: boolean;
  isHostCollectionEmptyNotice: boolean;
  hostCollectionPrimaryText: string;
  visibleCollectionsError: string | null;
  collectionItemsError: string | null;
  onLoadCollectionItems: (
    collectionId: string,
    options?: { readToken?: string | null },
  ) => Promise<void>;
  isHostYoutubeEmptyNotice: boolean;
  isHostYoutubeMissingNotice: boolean;
  hostYoutubePrimaryText: string;
  visibleHostYoutubeError: string | null;
  youtubePlaylists: YoutubePlaylist[];
  youtubePlaylistsLoading: boolean;
  selectedYoutubePlaylistId: string | null;
  setSelectedYoutubePlaylistId: (playlistId: string | null) => void;
  onImportYoutubePlaylist: (playlistId: string) => Promise<void>;
  openConfirmModal: (
    title: string,
    detail: string | undefined,
    action: () => void,
  ) => void;
  playlistLoadNotice: string | null;
  playlistError?: string | null;
  playlistItemsForChangeLength: number;
  playlistLoading: boolean;
  onChangePlaylist: () => Promise<void>;
}

const getSuggestionKey = (suggestion: PlaylistSuggestion) =>
  `${suggestion.clientId}-${suggestion.suggestedAt}`;

const RoomLobbyHostControls: React.FC<RoomLobbyHostControlsProps> = ({
  isHostPanelExpanded,
  hasNewSuggestions,
  playlistSuggestions,
  gameStatus,
  hostSourceType,
  setHostSourceType,
  markSuggestionsSeen,
  isApplyingHostSuggestion,
  hostSuggestionHint,
  selectedSuggestionKey,
  setSelectedSuggestionKey,
  requestApplyHostSuggestion,
  playlistUrl,
  onPlaylistUrlChange,
  onPlaylistPaste,
  isGoogleAuthed,
  collectionScope,
  setCollectionScope,
  onSelectCollection,
  selectedCollectionId,
  collections,
  collectionsLoading,
  collectionItemsLoading,
  isHostCollectionEmptyNotice,
  visibleCollectionsError,
  collectionItemsError,
  onLoadCollectionItems,
  isHostYoutubeEmptyNotice,
  isHostYoutubeMissingNotice,
  visibleHostYoutubeError,
  youtubePlaylists,
  youtubePlaylistsLoading,
  selectedYoutubePlaylistId,
  setSelectedYoutubePlaylistId,
  onImportYoutubePlaylist,
  openConfirmModal,
  playlistLoadNotice,
  playlistError,
  playlistItemsForChangeLength,
  playlistLoading,
  onChangePlaylist,
}) => {
  const hostSourceUsesFlatSelectCard = true;
  const [applyPending, setApplyPending] = useState(false);

  const markApplyPending = () => {
    setApplyPending(true);
  };

  const switchSourceType = (
    nextType: "suggestions" | "playlist" | "collection" | "youtube",
  ) => {
    if (
      isHostPanelExpanded &&
      hostSourceType === "suggestions" &&
      nextType !== "suggestions"
    ) {
      markSuggestionsSeen();
    }

    if (nextType !== hostSourceType) {
      markApplyPending();
    }

    setHostSourceType(nextType);
  };

  const googleAuthStatusMessage = "\u8acb\u5148\u767b\u5165 Google";

  const sourceSelectionReady =
    hostSourceType === "suggestions"
      ? Boolean(selectedSuggestionKey)
      : hostSourceType === "playlist"
        ? playlistUrl.trim().length > 0
        : hostSourceType === "collection"
          ? Boolean(selectedCollectionId)
          : Boolean(selectedYoutubePlaylistId);

  const hostSourceStatus = (() => {
    if (hostSourceType === "suggestions") {
      if (hostSuggestionHint) {
        return {
          message: hostSuggestionHint,
          tone: "info",
          loading: isApplyingHostSuggestion,
        } as const;
      }

      if (isApplyingHostSuggestion) {
        return {
          message: "\u8b80\u53d6\u5efa\u8b70\u4e2d",
          tone: "info",
          loading: true,
        } as const;
      }

      return {
        message:
          playlistSuggestions.length === 0
            ? "\u5c1a\u7121\u5efa\u8b70"
            : selectedSuggestionKey
              ? "\u5efa\u8b70\u5f85\u5957\u7528"
              : "\u9078\u64c7\u5efa\u8b70",
        tone:
          playlistSuggestions.length === 0
            ? "neutral"
            : selectedSuggestionKey
              ? "warning"
              : "neutral",
        loading: false,
      } as const;
    }

    if (hostSourceType === "playlist") {
      return {
        message: playlistUrl.trim()
          ? "\u9023\u7d50\u5f85\u5957\u7528"
          : "\u8cbc\u4e0a YouTube \u9023\u7d50",
        tone: playlistUrl.trim() ? "warning" : "neutral",
        loading: playlistLoading,
      } as const;
    }

    if (hostSourceType === "collection") {
      if (visibleCollectionsError || collectionItemsError) {
        return {
          message: visibleCollectionsError ?? collectionItemsError,
          tone: "error",
          loading: false,
        } as const;
      }

      return {
        message: isHostCollectionEmptyNotice
          ? collectionScope === "public"
            ? "\u5c1a\u7121\u516c\u958b\u6536\u85cf\u5eab"
            : "\u5c1a\u7121\u500b\u4eba\u6536\u85cf\u5eab"
          : selectedCollectionId
            ? collectionScope === "public"
              ? "\u516c\u958b\u6536\u85cf\u5eab\u5f85\u5957\u7528"
              : "\u500b\u4eba\u6536\u85cf\u5eab\u5f85\u5957\u7528"
            : collectionScope === "public"
              ? "\u9078\u64c7\u516c\u958b\u6536\u85cf\u5eab"
              : "\u9078\u64c7\u500b\u4eba\u6536\u85cf\u5eab",
        tone:
          isHostCollectionEmptyNotice
            ? "warning"
            : selectedCollectionId
              ? "warning"
              : "neutral",
        loading: collectionsLoading || collectionItemsLoading,
      } as const;
    }

    if (!isGoogleAuthed) {
      return {
        message: googleAuthStatusMessage,
        tone: "warning",
        loading: false,
      } as const;
    }

    if (visibleHostYoutubeError) {
      return {
        message: visibleHostYoutubeError,
        tone: "error",
        loading: false,
      } as const;
    }

    return {
      message:
        isHostYoutubeEmptyNotice || isHostYoutubeMissingNotice
          ? "\u5c1a\u7121 YouTube \u64ad\u653e\u6e05\u55ae"
          : selectedYoutubePlaylistId
            ? "YouTube \u5f85\u5957\u7528"
            : "\u9078\u64c7 YouTube",
      tone:
        isHostYoutubeEmptyNotice || isHostYoutubeMissingNotice
          ? "warning"
          : selectedYoutubePlaylistId
            ? "warning"
            : "neutral",
      loading: youtubePlaylistsLoading,
    } as const;
  })();

  const hostFooterStatus = (() => {
    if (playlistError) {
      return {
        message: playlistError,
        tone: "error",
        loading: false,
      } as const;
    }

    if (playlistLoadNotice) {
      return {
        message: playlistLoadNotice,
        tone: "info",
        loading:
          playlistLoading || collectionItemsLoading || youtubePlaylistsLoading,
      } as const;
    }

    if (gameStatus === "playing") {
      return {
        message: "\u904a\u6232\u9032\u884c\u4e2d",
        tone: "warning",
        loading: false,
      } as const;
    }

    return {
      message: null,
      tone: "neutral",
      loading: false,
    } as const;
  })();

  const isApplyPendingVisible =
    applyPending &&
    sourceSelectionReady &&
    !playlistLoading &&
    !collectionItemsLoading &&
    !collectionsLoading &&
    !youtubePlaylistsLoading &&
    !isApplyingHostSuggestion;

  const activeSourceStatus = (() => {
    if (hostFooterStatus.message || hostFooterStatus.loading) {
      return hostFooterStatus;
    }

    if (isApplyPendingVisible && playlistItemsForChangeLength > 0) {
      return {
        message: `\u5f85\u5957\u7528 ${playlistItemsForChangeLength} \u9996`,
        tone: "error",
        loading: false,
      } as const;
    }

    if (hostSourceStatus.message || hostSourceStatus.loading) {
      return hostSourceStatus;
    }

    return hostFooterStatus;
  })();

  return (
    <Accordion
      disableGutters
      className="border border-slate-800/80 bg-slate-950/40 room-lobby-host-accordion room-lobby-host-accordion-fixed"
      expanded={isHostPanelExpanded}
    >
      <AccordionSummary>
        <div className="room-lobby-host-heading">
          <span className="room-lobby-host-heading__icon" aria-hidden="true">
            <TuneRoundedIcon fontSize="small" />
          </span>
          <Typography variant="subtitle2" className="text-slate-200">
            {"\u64ad\u653e\u6e05\u55ae\u4f86\u6e90"}
          </Typography>
          {hasNewSuggestions && (
            <span className="room-lobby-host-heading__badge">
              {playlistSuggestions.length}
            </span>
          )}
        </div>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={1.5}>
          <div className="room-lobby-mobile-panel-heading" aria-hidden="true">
            <div className="room-lobby-host-heading">
              <span className="room-lobby-host-heading__icon">
                <TuneRoundedIcon fontSize="small" />
              </span>
              <Typography variant="subtitle2" className="text-slate-200">
                {"\u64ad\u653e\u6e05\u55ae\u4f86\u6e90"}
              </Typography>
            </div>
          </div>
          <Box className="room-lobby-host-controls">
            <Stack
              spacing={1.1}
              className={`room-lobby-source-panel room-lobby-source-panel--host ${
                hostSourceType === "suggestions"
                  ? "room-lobby-source-panel-suggestions"
                  : "room-lobby-source-panel-fixed"
              }`}
            >
              <Stack
                direction="row"
                className="room-lobby-mode-row room-lobby-mode-row--host"
              >
                <Button
                  size="small"
                  variant={
                    hostSourceType === "suggestions" ? "contained" : "outlined"
                  }
                  className="room-lobby-mode-button room-lobby-mode-button--suggestions"
                  startIcon={<TipsAndUpdatesRoundedIcon fontSize="small" />}
                  onClick={() => switchSourceType("suggestions")}
                >
                  {"\u63a8\u85a6"}
                </Button>
                <Button
                  size="small"
                  variant={
                    hostSourceType === "collection" &&
                    collectionScope === "public"
                      ? "contained"
                      : "outlined"
                  }
                  className="room-lobby-mode-button room-lobby-mode-button--public"
                  startIcon={<PublicRoundedIcon fontSize="small" />}
                  onClick={() => {
                    if (
                      hostSourceType === "collection" &&
                      collectionScope !== "public"
                    ) {
                      markApplyPending();
                    }
                    switchSourceType("collection");
                    setCollectionScope("public");
                    onSelectCollection(null);
                  }}
                >
                  {"\u516c\u958b"}
                </Button>
                <Button
                  size="small"
                  variant={
                    hostSourceType === "collection" &&
                    collectionScope === "owner"
                      ? "contained"
                      : "outlined"
                  }
                  className="room-lobby-mode-button room-lobby-mode-button--owner"
                  startIcon={<LockRoundedIcon fontSize="small" />}
                  onClick={() => {
                    if (
                      hostSourceType === "collection" &&
                      collectionScope !== "owner"
                    ) {
                      markApplyPending();
                    }
                    switchSourceType("collection");
                    setCollectionScope("owner");
                    onSelectCollection(null);
                  }}
                  disabled={!isGoogleAuthed}
                >
                  {"\u500b\u4eba"}
                </Button>
                <Button
                  size="small"
                  variant={
                    hostSourceType === "youtube" ? "contained" : "outlined"
                  }
                  className="room-lobby-mode-button room-lobby-mode-button--youtube"
                  startIcon={<VideoLibraryRoundedIcon fontSize="small" />}
                  onClick={() => switchSourceType("youtube")}
                >
                  {"YouTube"}
                </Button>
                <Button
                  size="small"
                  variant={
                    hostSourceType === "playlist" ? "contained" : "outlined"
                  }
                  className="room-lobby-mode-button room-lobby-mode-button--playlist"
                  startIcon={<LinkRoundedIcon fontSize="small" />}
                  onClick={() => switchSourceType("playlist")}
                >
                  {"\u9023\u7d50"}
                </Button>
              </Stack>

              <div
                className={`room-lobby-source-card ${
                  hostSourceUsesFlatSelectCard
                    ? "room-lobby-source-card--flat-select"
                    : ""
                }`}
              >
                <Stack spacing={1} className="room-lobby-source-view">
                  <RoomLobbyStatusStrip
                    className="room-lobby-source-status-inline"
                    message={activeSourceStatus.message}
                    tone={activeSourceStatus.tone}
                    loading={activeSourceStatus.loading}
                    reserveSpace
                  />

                  {hostSourceType === "suggestions" && (
                    <TextField
                      select
                      size="small"
                      value={selectedSuggestionKey}
                      onChange={(event) => {
                        const nextKey = event.target.value;
                        setSelectedSuggestionKey(nextKey);
                        if (!nextKey) {
                          setApplyPending(false);
                          return;
                        }
                        const suggestion = playlistSuggestions.find(
                          (item) => getSuggestionKey(item) === nextKey,
                        );
                        if (!suggestion) return;
                        markApplyPending();
                        requestApplyHostSuggestion(suggestion);
                      }}
                      disabled={isApplyingHostSuggestion}
                      fullWidth
                      SelectProps={{
                        displayEmpty: true,
                        renderValue: (selected) => {
                          const key = String(selected ?? "");
                          if (!key) {
                            return "\u9078\u64c7\u5efa\u8b70";
                          }
                          const selectedSuggestion = playlistSuggestions.find(
                            (suggestion) => getSuggestionKey(suggestion) === key,
                          );
                          if (!selectedSuggestion) {
                            return "\u8a72\u5efa\u8b70\u5df2\u4e0d\u5b58\u5728";
                          }
                          const label =
                            selectedSuggestion.title ?? selectedSuggestion.value;
                          const count =
                            selectedSuggestion.totalCount ??
                            selectedSuggestion.items?.length;
                          return `${selectedSuggestion.username} \u00b7 ${label}${
                            count ? ` (${count})` : ""
                          }`;
                        },
                      }}
                    >
                      <MenuItem value="">
                        {"\u9078\u64c7\u5efa\u8b70"}
                      </MenuItem>
                      {playlistSuggestions.map((suggestion) => {
                        const optionKey = getSuggestionKey(suggestion);
                        const displayLabel = suggestion.title ?? suggestion.value;
                        const displayCount =
                          suggestion.totalCount ?? suggestion.items?.length;
                        const sourceLabel =
                          suggestion.type === "playlist"
                            ? "\u64ad\u653e\u6e05\u55ae"
                            : "\u6536\u85cf\u5eab";
                        const snapshotLabel = suggestion.items?.length
                          ? " \u00b7 \u5feb\u7167"
                          : "";

                        return (
                          <MenuItem key={optionKey} value={optionKey}>
                            <Stack spacing={0.25} sx={{ width: "100%", minWidth: 0 }}>
                              <Typography variant="body2" noWrap>
                                {`${suggestion.username} \u00b7 ${sourceLabel}${snapshotLabel}`}
                              </Typography>
                              <Typography
                                variant="caption"
                                className="text-slate-400"
                                noWrap
                              >
                                {`${displayLabel}${
                                  displayCount ? ` (${displayCount})` : ""
                                }`}
                              </Typography>
                            </Stack>
                          </MenuItem>
                        );
                      })}
                    </TextField>
                  )}

                  {hostSourceType === "playlist" && (
                    <TextField
                      size="small"
                      value={playlistUrl}
                      onChange={(event) => {
                        const nextValue = event.target.value;
                        setApplyPending(Boolean(nextValue.trim()));
                        onPlaylistUrlChange(nextValue);
                      }}
                      onPaste={onPlaylistPaste}
                      placeholder={"\u8cbc\u4e0a YouTube URL"}
                      disabled={playlistLoading || gameStatus === "playing"}
                      fullWidth
                    />
                  )}

                  {hostSourceType === "collection" && (
                    <TextField
                      select
                      size="small"
                      value={selectedCollectionId ?? ""}
                      onChange={(event) => {
                        const nextId = event.target.value || null;
                        if (!nextId) {
                          setApplyPending(false);
                          onSelectCollection(null);
                          return;
                        }
                        const selected = collections.find(
                          (item) => item.id === nextId,
                        );
                        const label = selected
                          ? normalizeDisplayText(
                              selected.title,
                              "\u672a\u547d\u540d\u6536\u85cf\u5eab",
                            )
                          : nextId;
                        openConfirmModal(
                          "\u5957\u7528\u9019\u500b\u6536\u85cf\u5eab\uff1f",
                          label,
                          () => {
                            markApplyPending();
                            onSelectCollection(nextId);
                            void onLoadCollectionItems(nextId);
                          },
                        );
                      }}
                      disabled={
                        collectionsLoading ||
                        collectionItemsLoading ||
                        gameStatus === "playing"
                      }
                      fullWidth
                      SelectProps={{
                        displayEmpty: true,
                        renderValue: (selected) => {
                          const selectedId = String(selected ?? "");
                          if (!selectedId) {
                            return collectionScope === "public"
                              ? "\u9078\u64c7\u516c\u958b"
                              : "\u9078\u64c7\u79c1\u4eba";
                          }
                          const selectedOption = collections.find(
                            (item) => item.id === selectedId,
                          );
                          if (!selectedOption) return selectedId;
                          return normalizeDisplayText(
                            selectedOption.title,
                            "\u672a\u547d\u540d\u6536\u85cf\u5eab",
                          );
                        },
                      }}
                    >
                      <MenuItem value="">
                        {collectionScope === "public"
                          ? "\u9078\u64c7\u516c\u958b"
                          : "\u9078\u64c7\u79c1\u4eba"}
                      </MenuItem>
                      {collections.map((collection) => (
                        <MenuItem key={collection.id} value={collection.id}>
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate">
                              {normalizeDisplayText(
                                collection.title,
                                "\u672a\u547d\u540d\u6536\u85cf\u5eab",
                              )}
                            </span>
                            <span className="text-xs text-slate-400">
                              {"\u4f7f\u7528\u6b21\u6578 "}
                              {Math.max(0, Number(collection.use_count ?? 0))}
                            </span>
                          </div>
                        </MenuItem>
                      ))}
                    </TextField>
                  )}

                  {hostSourceType === "youtube" && (
                    <TextField
                      select
                      size="small"
                      value={selectedYoutubePlaylistId ?? ""}
                      onChange={(event) => {
                        const nextId = event.target.value || null;
                        if (!nextId) {
                          setApplyPending(false);
                          setSelectedYoutubePlaylistId(null);
                          return;
                        }
                        const selected = youtubePlaylists.find(
                          (item) => item.id === nextId,
                        );
                        const label = selected
                          ? `${normalizeDisplayText(
                              selected.title,
                              "\u672a\u547d\u540d YouTube \u64ad\u653e\u6e05\u55ae",
                            )} (${selected.itemCount})`
                          : nextId;
                        openConfirmModal(
                          "\u532f\u5165\u9019\u4efd YouTube \u64ad\u653e\u6e05\u55ae\uff1f",
                          label,
                          () => {
                            markApplyPending();
                            setSelectedYoutubePlaylistId(nextId);
                            void onImportYoutubePlaylist(nextId);
                          },
                        );
                      }}
                      disabled={
                        youtubePlaylistsLoading ||
                        !isGoogleAuthed ||
                        gameStatus === "playing"
                      }
                      fullWidth
                      SelectProps={{
                        displayEmpty: true,
                        renderValue: (selected) => {
                          const selectedId = String(selected ?? "");
                          if (!selectedId) {
                            return "\u9078\u64c7 YouTube";
                          }
                          const selectedOption = youtubePlaylists.find(
                            (item) => item.id === selectedId,
                          );
                          if (!selectedOption) return selectedId;
                          return `${normalizeDisplayText(
                            selectedOption.title,
                            "\u672a\u547d\u540d YouTube \u64ad\u653e\u6e05\u55ae",
                          )} (${selectedOption.itemCount})`;
                        },
                      }}
                    >
                      <MenuItem value="">
                        {"\u9078\u64c7 YouTube"}
                      </MenuItem>
                      {youtubePlaylists.map((playlist) => (
                        <MenuItem key={playlist.id} value={playlist.id}>
                          {normalizeDisplayText(
                            playlist.title,
                            "\u672a\u547d\u540d YouTube \u64ad\u653e\u6e05\u55ae",
                          )}{" "}
                          ({playlist.itemCount})
                        </MenuItem>
                      ))}
                    </TextField>
                  )}

                  <Button
                    size="small"
                    variant="contained"
                    color="success"
                    className={`room-lobby-apply-button room-lobby-apply-button--field-action ${
                      isApplyPendingVisible
                        ? "room-lobby-apply-button--pending"
                        : ""
                    }`}
                    aria-label={"\u5957\u7528\u5230\u623f\u9593"}
                    startIcon={
                      isApplyPendingVisible ? (
                        <PublishedWithChangesRoundedIcon fontSize="small" />
                      ) : (
                        <PlaylistAddCheckRoundedIcon fontSize="small" />
                      )
                    }
                    onClick={async () => {
                      await onChangePlaylist();
                      setApplyPending(false);
                    }}
                    disabled={
                      !sourceSelectionReady ||
                      playlistItemsForChangeLength === 0 ||
                      playlistLoading ||
                      collectionItemsLoading ||
                      youtubePlaylistsLoading ||
                      isApplyingHostSuggestion ||
                      gameStatus === "playing"
                    }
                  >
                    {"\u5957\u7528"}
                  </Button>
                </Stack>
              </div>
            </Stack>
          </Box>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
};

export default RoomLobbyHostControls;
