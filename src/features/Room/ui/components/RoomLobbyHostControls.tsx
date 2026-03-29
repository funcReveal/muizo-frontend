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
import PlaylistPlayRoundedIcon from "@mui/icons-material/PlaylistPlayRounded";
import TipsAndUpdatesRoundedIcon from "@mui/icons-material/TipsAndUpdatesRounded";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import PublicRoundedIcon from "@mui/icons-material/PublicRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import BookmarkBorderRoundedIcon from "@mui/icons-material/BookmarkBorderRounded";
import YouTubeIcon from "@mui/icons-material/YouTube";
import { useEffect, useState } from "react";

import type { GameState, PlaylistSuggestion } from "../../model/types";
import type { YoutubePlaylist } from "../../model/RoomContext";
import RoomLobbyStatusStrip from "./RoomLobbyStatusStrip";
import RoomUiTooltip from "../../../../shared/ui/RoomUiTooltip";
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
  isHostYoutubeEmptyNotice: boolean;
  isHostYoutubeMissingNotice: boolean;
  hostYoutubePrimaryText: string;
  visibleHostYoutubeError: string | null;
  youtubePlaylists: YoutubePlaylist[];
  youtubePlaylistsLoading: boolean;
  selectedYoutubePlaylistId: string | null;
  setSelectedYoutubePlaylistId: (playlistId: string | null) => void;
  openConfirmModal: (
    title: string,
    detail: string | undefined,
    action: () => void,
  ) => void;
  playlistLoadNotice: string | null;
  playlistError?: string | null;
  playlistLoading: boolean;
  onApplyPlaylistUrlDirect: (url: string) => Promise<boolean>;
  onApplyCollectionDirect: (
    collectionId: string,
    title?: string | null,
  ) => Promise<boolean>;
  onApplyYoutubePlaylistDirect: (
    playlistId: string,
    title?: string | null,
  ) => Promise<boolean>;
  onRequestGoogleLogin: () => void;
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
  isHostYoutubeEmptyNotice,
  isHostYoutubeMissingNotice,
  hostYoutubePrimaryText,
  visibleHostYoutubeError,
  youtubePlaylists,
  youtubePlaylistsLoading,
  selectedYoutubePlaylistId,
  setSelectedYoutubePlaylistId,
  openConfirmModal,
  playlistLoadNotice,
  playlistError,
  playlistLoading,
  onApplyPlaylistUrlDirect,
  onApplyCollectionDirect,
  onApplyYoutubePlaylistDirect,
  onRequestGoogleLogin,
}) => {
  const [playlistDraftUrl, setPlaylistDraftUrl] = useState(playlistUrl);

  useEffect(() => {
    setPlaylistDraftUrl(playlistUrl);
  }, [playlistUrl]);

  useEffect(() => {
    if (isGoogleAuthed) return;
    if (hostSourceType === "youtube") {
      setHostSourceType("playlist");
      return;
    }
    if (hostSourceType === "collection" && collectionScope === "owner") {
      setCollectionScope("public");
      onSelectCollection(null);
    }
  }, [
    collectionScope,
    hostSourceType,
    isGoogleAuthed,
    onSelectCollection,
    setCollectionScope,
    setHostSourceType,
  ]);

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

  const hostSourceStatus = (() => {
    if (hostSourceType === "suggestions") {
      if (hostSuggestionHint) {
        return {
          message: hostSuggestionHint,
          tone: "info",
          loading: isApplyingHostSuggestion,
        } as const;
      }
      return {
        message:
          playlistSuggestions.length === 0
            ? "尚無建議"
            : "選擇建議後會直接詢問並套用",
        tone: playlistSuggestions.length === 0 ? "neutral" : "info",
        loading: false,
      } as const;
    }

    if (hostSourceType === "playlist") {
      return {
        message: playlistDraftUrl.trim()
          ? "貼上後按 Enter，確認後直接套用"
          : hostPlaylistPrimaryText,
        tone: playlistDraftUrl.trim() ? "info" : "neutral",
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
            ? "尚無公開收藏庫"
            : "尚無個人收藏庫"
          : selectedCollectionId
            ? "確認後直接套用收藏庫"
            : hostCollectionPrimaryText,
        tone: isHostCollectionEmptyNotice
          ? "warning"
          : selectedCollectionId
            ? "info"
            : "neutral",
        loading: collectionsLoading || collectionItemsLoading,
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
          ? "尚無 YouTube 播放清單"
          : selectedYoutubePlaylistId
            ? "確認後直接匯入並套用"
            : hostYoutubePrimaryText,
      tone:
        isHostYoutubeEmptyNotice || isHostYoutubeMissingNotice
          ? "warning"
          : selectedYoutubePlaylistId
            ? "info"
            : "neutral",
      loading: youtubePlaylistsLoading,
    } as const;
  })();

  const footerStatus = (() => {
    if (playlistError) {
      return { message: playlistError, tone: "error", loading: false } as const;
    }
    if (playlistLoadNotice) {
      return { message: playlistLoadNotice, tone: "info", loading: true } as const;
    }
    if (gameStatus === "playing") {
      return { message: "遊戲進行中", tone: "warning", loading: false } as const;
    }
    return hostSourceStatus;
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
            <PlaylistPlayRoundedIcon fontSize="small" />
          </span>
          <Typography variant="subtitle2" className="text-slate-200">
            播放清單來源
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
                <PlaylistPlayRoundedIcon fontSize="small" />
              </span>
              <Typography variant="subtitle2" className="text-slate-200">
                播放清單來源
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
              <Stack direction="row" className="room-lobby-mode-row room-lobby-mode-row--host">
                <Button
                  size="small"
                  variant={hostSourceType === "suggestions" ? "contained" : "outlined"}
                  className="room-lobby-mode-button room-lobby-mode-button--suggestions"
                  startIcon={<TipsAndUpdatesRoundedIcon fontSize="small" />}
                  onClick={() => switchSourceType("suggestions")}
                >
                  推薦
                </Button>
                <Button
                  size="small"
                  variant={
                    hostSourceType === "collection" && collectionScope === "public"
                      ? "contained"
                      : "outlined"
                  }
                  className="room-lobby-mode-button room-lobby-mode-button--public"
                  startIcon={<PublicRoundedIcon fontSize="small" />}
                  onClick={() => {
                    switchSourceType("collection");
                    setCollectionScope("public");
                    onSelectCollection(null);
                  }}
                >
                  公開
                </Button>
                <RoomUiTooltip
                  title={!isGoogleAuthed ? "點擊即可登入解鎖" : undefined}
                  wrapperClassName="inline-flex"
                >
                  <Button
                    size="small"
                    variant={
                      hostSourceType === "collection" && collectionScope === "owner"
                        ? "contained"
                        : "outlined"
                    }
                    className={`room-lobby-mode-button room-lobby-mode-button--owner${!isGoogleAuthed ? " room-lobby-mode-button--auth-required" : ""}`}
                    startIcon={<BookmarkBorderRoundedIcon fontSize="small" />}
                    onClick={() => {
                      if (!isGoogleAuthed) {
                        onRequestGoogleLogin();
                        return;
                      }
                      switchSourceType("collection");
                      setCollectionScope("owner");
                      onSelectCollection(null);
                    }}
                  >
                    <span className="room-lobby-mode-button__content">
                      個人
                      {!isGoogleAuthed ? (
                        <span className="room-lobby-mode-button__lock-badge" aria-hidden="true">
                          <LockRoundedIcon fontSize="inherit" />
                        </span>
                      ) : null}
                    </span>
                  </Button>
                </RoomUiTooltip>
                <RoomUiTooltip
                  title={!isGoogleAuthed ? "點擊即可登入解鎖" : undefined}
                  wrapperClassName="inline-flex"
                >
                  <Button
                    size="small"
                    variant={hostSourceType === "youtube" ? "contained" : "outlined"}
                    className={`room-lobby-mode-button room-lobby-mode-button--youtube${!isGoogleAuthed ? " room-lobby-mode-button--auth-required" : ""}`}
                    startIcon={<YouTubeIcon fontSize="small" />}
                    onClick={() => {
                      if (!isGoogleAuthed) {
                        onRequestGoogleLogin();
                        return;
                      }
                      switchSourceType("youtube");
                    }}
                  >
                    <span className="room-lobby-mode-button__content">
                      YouTube
                      {!isGoogleAuthed ? (
                        <span className="room-lobby-mode-button__lock-badge" aria-hidden="true">
                          <LockRoundedIcon fontSize="inherit" />
                        </span>
                      ) : null}
                    </span>
                  </Button>
                </RoomUiTooltip>
                <Button
                  size="small"
                  variant={hostSourceType === "playlist" ? "contained" : "outlined"}
                  className="room-lobby-mode-button room-lobby-mode-button--playlist"
                  startIcon={<LinkRoundedIcon fontSize="small" />}
                  onClick={() => switchSourceType("playlist")}
                >
                  連結
                </Button>
              </Stack>

              <div className="room-lobby-source-card room-lobby-source-card--flat-select">
                <Stack spacing={1} className="room-lobby-source-view">
                  <RoomLobbyStatusStrip
                    className="room-lobby-source-status-inline"
                    message={footerStatus.message}
                    tone={footerStatus.tone}
                    loading={footerStatus.loading}
                    reserveSpace
                  />

                  {hostSourceType === "suggestions" && (
                    <TextField
                      select
                      size="small"
                      value={selectedSuggestionKey}
                      onChange={(event) => {
                        const nextKey = event.target.value;
                        if (!nextKey) {
                          setSelectedSuggestionKey("");
                          return;
                        }
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
                          if (!key) return "選擇建議";
                          const selectedSuggestion = playlistSuggestions.find(
                            (suggestion) => getSuggestionKey(suggestion) === key,
                          );
                          if (!selectedSuggestion) return "該建議已不存在";
                          const label =
                            selectedSuggestion.title ?? selectedSuggestion.value;
                          const count =
                            selectedSuggestion.totalCount ??
                            selectedSuggestion.items?.length;
                          return `${selectedSuggestion.username} · ${label}${
                            count ? ` (${count})` : ""
                          }`;
                        },
                      }}
                    >
                      <MenuItem value="">選擇建議</MenuItem>
                      {playlistSuggestions.map((suggestion) => {
                        const optionKey = getSuggestionKey(suggestion);
                        const displayLabel = suggestion.title ?? suggestion.value;
                        const displayCount =
                          suggestion.totalCount ?? suggestion.items?.length;
                        const sourceLabel =
                          suggestion.type === "playlist" ? "播放清單" : "收藏庫";
                        const snapshotLabel = suggestion.items?.length ? " · 快照" : "";

                        return (
                          <MenuItem key={optionKey} value={optionKey}>
                            <Stack spacing={0.25} sx={{ width: "100%", minWidth: 0 }}>
                              <Typography variant="body2" noWrap>
                                {`${suggestion.username} · ${sourceLabel}${snapshotLabel}`}
                              </Typography>
                              <Typography
                                variant="caption"
                                className="text-slate-400"
                                noWrap
                              >
                                {`${displayLabel}${displayCount ? ` (${displayCount})` : ""}`}
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
                      value={playlistDraftUrl}
                      onChange={(event) => setPlaylistDraftUrl(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter") return;
                        event.preventDefault();
                        const trimmed = playlistDraftUrl.trim();
                        if (!trimmed) return;
                        openConfirmModal("要套用這個歌單連結嗎？", trimmed, () => {
                          onPlaylistUrlChange(trimmed);
                          void onApplyPlaylistUrlDirect(trimmed);
                        });
                      }}
                      placeholder="貼上 YouTube URL"
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
                        const selected = collections.find((item) => item.id === nextId);
                        const label = selected
                          ? normalizeDisplayText(
                              selected.title,
                              "未命名收藏庫",
                            )
                          : nextId;
                        openConfirmModal("套用這個收藏庫？", label, () => {
                          onSelectCollection(nextId);
                          void onApplyCollectionDirect(nextId, selected?.title ?? null);
                        });
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
                              ? "選擇公開"
                              : "選擇私人";
                          }
                          const selectedOption = collections.find(
                            (item) => item.id === selectedId,
                          );
                          if (!selectedOption) return selectedId;
                          return normalizeDisplayText(
                            selectedOption.title,
                            "未命名收藏庫",
                          );
                        },
                      }}
                    >
                      <MenuItem value="">
                        {collectionScope === "public" ? "選擇公開" : "選擇私人"}
                      </MenuItem>
                      {collections.map((collection) => (
                        <MenuItem key={collection.id} value={collection.id}>
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate">
                              {normalizeDisplayText(
                                collection.title,
                                "未命名收藏庫",
                              )}
                            </span>
                            <span className="text-xs text-slate-400">
                              使用次數 {Math.max(0, Number(collection.use_count ?? 0))}
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
                              "未命名 YouTube 播放清單",
                            )} (${selected.itemCount})`
                          : nextId;
                        openConfirmModal("匯入這份 YouTube 播放清單？", label, () => {
                          setSelectedYoutubePlaylistId(nextId);
                          void onApplyYoutubePlaylistDirect(
                            nextId,
                            selected?.title ?? null,
                          );
                        });
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
                          if (!selectedId) return "選擇 YouTube";
                          const selectedOption = youtubePlaylists.find(
                            (item) => item.id === selectedId,
                          );
                          if (!selectedOption) return selectedId;
                          return `${normalizeDisplayText(
                            selectedOption.title,
                            "未命名 YouTube 播放清單",
                          )} (${selectedOption.itemCount})`;
                        },
                      }}
                    >
                      <MenuItem value="">選擇 YouTube</MenuItem>
                      {youtubePlaylists.map((playlist) => (
                        <MenuItem key={playlist.id} value={playlist.id}>
                          {normalizeDisplayText(
                            playlist.title,
                            "未命名 YouTube 播放清單",
                          )}{" "}
                          ({playlist.itemCount})
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
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
