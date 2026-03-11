import React from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

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
  hostPlaylistPrimaryText,
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
  hostCollectionPrimaryText,
  visibleCollectionsError,
  collectionItemsError,
  onLoadCollectionItems,
  isHostYoutubeEmptyNotice,
  isHostYoutubeMissingNotice,
  hostYoutubePrimaryText,
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
    setHostSourceType(nextType);
  };

  const googleAuthStatusMessage =
    "\u8acb\u5148\u767b\u5165 Google \u624d\u80fd\u8b80\u53d6 YouTube \u64ad\u653e\u6e05\u55ae\u3002";

  const hostSourceStatus = (() => {
    if (hostSourceType === "suggestions") {
      return {
        message:
          hostSuggestionHint ||
          "\u76ee\u524d\u9084\u6c92\u6709\u73a9\u5bb6\u63d0\u4ea4\u6b4c\u55ae\u5efa\u8b70\u3002",
        tone:
          playlistSuggestions.length === 0 && !isApplyingHostSuggestion
            ? "neutral"
            : "info",
        loading: isApplyingHostSuggestion,
      } as const;
    }

    if (hostSourceType === "playlist") {
      return {
        message:
          hostPlaylistPrimaryText ||
          "\u8cbc\u4e0a YouTube \u64ad\u653e\u6e05\u55ae\u9023\u7d50\uff0c\u76f4\u63a5\u66ff\u63db\u623f\u9593\u6b4c\u55ae\u3002",
        tone: "neutral",
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
        message:
          hostCollectionPrimaryText ||
          (collectionScope === "public"
            ? "\u8acb\u9078\u64c7\u8981\u5957\u7528\u7684\u516c\u958b\u6536\u85cf\u5eab\u3002"
            : "\u8acb\u9078\u64c7\u8981\u5957\u7528\u7684\u79c1\u4eba\u6536\u85cf\u5eab\u3002"),
        tone: isHostCollectionEmptyNotice ? "warning" : "neutral",
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
        hostYoutubePrimaryText ||
        "\u8acb\u9078\u64c7\u8981\u5957\u7528\u7684 YouTube \u64ad\u653e\u6e05\u55ae\u3002",
      tone:
        isHostYoutubeEmptyNotice || isHostYoutubeMissingNotice
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
        message:
          "\u904a\u6232\u9032\u884c\u4e2d\uff0c\u66ab\u6642\u7121\u6cd5\u5957\u7528\u4f86\u6e90\u3002",
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

  return (
    <Accordion
      disableGutters
      className="border border-slate-800/80 bg-slate-950/40 room-lobby-host-accordion room-lobby-host-accordion-fixed"
      expanded={isHostPanelExpanded}
    >
      <AccordionSummary>
        <div className="flex items-center gap-2">
          <Typography variant="subtitle2" className="text-slate-200">
            {"\u623f\u4e3b\u63a7\u5236"}
          </Typography>
          {hasNewSuggestions && (
            <Chip
              size="small"
              color="warning"
              label={`\u65b0\u5efa\u8b70 ${playlistSuggestions.length}`}
            />
          )}
        </div>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={1.5}>
          {gameStatus === "playing" && (
            <Typography variant="caption" className="hidden text-slate-400">
              {
                "\u904a\u6232\u9032\u884c\u4e2d\uff0c\u66ab\u6642\u7121\u6cd5\u5207\u63db\u4f86\u6e90\u6216\u5957\u7528\u65b0\u6b4c\u55ae\u3002"
              }
            </Typography>
          )}

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
                  className="room-lobby-mode-button"
                  onClick={() => switchSourceType("suggestions")}
                >
                  {"\u73a9\u5bb6\u63a8\u85a6"}
                </Button>
                <Button
                  size="small"
                  variant={
                    hostSourceType === "playlist" ? "contained" : "outlined"
                  }
                  className="room-lobby-mode-button"
                  onClick={() => switchSourceType("playlist")}
                >
                  {"\u8cbc\u4e0a\u9023\u7d50"}
                </Button>
                <Button
                  size="small"
                  variant={
                    hostSourceType === "collection" &&
                    collectionScope === "public"
                      ? "contained"
                      : "outlined"
                  }
                  className="room-lobby-mode-button"
                  onClick={() => {
                    switchSourceType("collection");
                    setCollectionScope("public");
                    onSelectCollection(null);
                  }}
                >
                  {"\u516c\u958b\u6536\u85cf\u5eab"}
                </Button>
                <Button
                  size="small"
                  variant={
                    hostSourceType === "collection" &&
                    collectionScope === "owner"
                      ? "contained"
                      : "outlined"
                  }
                  className="room-lobby-mode-button"
                  onClick={() => {
                    switchSourceType("collection");
                    setCollectionScope("owner");
                    onSelectCollection(null);
                  }}
                  disabled={!isGoogleAuthed}
                >
                  {"\u79c1\u4eba\u6536\u85cf\u5eab"}
                </Button>
                <Button
                  size="small"
                  variant={
                    hostSourceType === "youtube" ? "contained" : "outlined"
                  }
                  className="room-lobby-mode-button"
                  onClick={() => switchSourceType("youtube")}
                >
                  {"\u6211\u7684\u64ad\u653e\u6e05\u55ae"}
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
                    message={hostSourceStatus.message}
                    tone={hostSourceStatus.tone}
                    loading={hostSourceStatus.loading}
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
                        if (!nextKey) return;
                        const suggestion = playlistSuggestions.find(
                          (item) => getSuggestionKey(item) === nextKey,
                        );
                        if (!suggestion) return;
                        requestApplyHostSuggestion(suggestion);
                      }}
                      disabled={isApplyingHostSuggestion}
                      fullWidth
                      SelectProps={{
                        displayEmpty: true,
                        renderValue: (selected) => {
                          const key = String(selected ?? "");
                          if (!key) {
                            return "\u8acb\u9078\u64c7\u8981\u5957\u7528\u7684\u5efa\u8b70";
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
                        {"\u8acb\u9078\u64c7\u8981\u5957\u7528\u7684\u5efa\u8b70"}
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
                        onPlaylistUrlChange(event.target.value);
                      }}
                      onPaste={onPlaylistPaste}
                      placeholder={"\u8cbc\u4e0a YouTube \u64ad\u653e\u6e05\u55ae URL"}
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
                              ? "\u9078\u64c7\u516c\u958b\u6536\u85cf\u5eab"
                              : "\u9078\u64c7\u79c1\u4eba\u6536\u85cf\u5eab";
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
                          ? "\u9078\u64c7\u516c\u958b\u6536\u85cf\u5eab"
                          : "\u9078\u64c7\u79c1\u4eba\u6536\u85cf\u5eab"}
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
                            return "\u9078\u64c7 YouTube \u64ad\u653e\u6e05\u55ae";
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
                        {"\u9078\u64c7 YouTube \u64ad\u653e\u6e05\u55ae"}
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
                    className="room-lobby-apply-button room-lobby-apply-button--field-action"
                    aria-label={"\u5957\u7528\u5230\u623f\u9593"}
                    onClick={() => void onChangePlaylist()}
                    disabled={
                      playlistItemsForChangeLength === 0 ||
                      playlistLoading ||
                      gameStatus === "playing"
                    }
                  >
                    {"\u5957\u7528\u5230\u623f\u9593"}
                  </Button>
                </Stack>
              </div>

              <Stack spacing={0.75} className="room-lobby-source-footer">
                <RoomLobbyStatusStrip
                  message={hostFooterStatus.message}
                  tone={hostFooterStatus.tone}
                  loading={hostFooterStatus.loading}
                />
              </Stack>
            </Stack>
          </Box>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
};

export default RoomLobbyHostControls;
