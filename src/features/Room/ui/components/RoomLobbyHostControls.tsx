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
  const switchSourceType = (
    nextType: "suggestions" | "playlist" | "collection" | "youtube",
  ) => {
    if (isHostPanelExpanded && hostSourceType === "suggestions" && nextType !== "suggestions") {
      markSuggestionsSeen();
    }
    setHostSourceType(nextType);
  };

  return (
    <Accordion
      disableGutters
      className="border border-slate-800/80 bg-slate-950/40 room-lobby-host-accordion room-lobby-host-accordion-fixed"
      expanded={isHostPanelExpanded}
    >
      <AccordionSummary>
        <div className="flex items-center gap-2">
          <Typography variant="subtitle2" className="text-slate-200">
            房主控制
          </Typography>
          {hasNewSuggestions && (
            <Chip
              size="small"
              color="warning"
              label={`新建議 ${playlistSuggestions.length}`}
            />
          )}
        </div>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={2}>
          {gameStatus === "playing" && (
            <Typography variant="caption" className="text-slate-400">
              遊戲進行中無法切換來源或套用新題庫。
            </Typography>
          )}
          <Box className="room-lobby-host-controls">
            <Stack
              spacing={1}
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
                  className="room-lobby-mode-button"
                  onClick={() => switchSourceType("suggestions")}
                >
                  玩家推薦
                </Button>
                <Button
                  size="small"
                  variant={hostSourceType === "playlist" ? "contained" : "outlined"}
                  className="room-lobby-mode-button"
                  onClick={() => switchSourceType("playlist")}
                >
                  貼上連結
                </Button>
                <Button
                  size="small"
                  variant={
                    hostSourceType === "collection" && collectionScope === "public"
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
                  公開收藏庫
                </Button>
                <Button
                  size="small"
                  variant={
                    hostSourceType === "collection" && collectionScope === "owner"
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
                  私人收藏庫
                </Button>
                <Button
                  size="small"
                  variant={hostSourceType === "youtube" ? "contained" : "outlined"}
                  className="room-lobby-mode-button"
                  onClick={() => switchSourceType("youtube")}
                >
                  我的播放清單
                </Button>
              </Stack>

              <Stack spacing={1} className="room-lobby-source-view">
                {hostSourceType === "suggestions" && (
                  <Stack spacing={1}>
                    <Typography
                      variant="caption"
                      className={isApplyingHostSuggestion ? "text-amber-200" : "text-slate-400"}
                    >
                      {hostSuggestionHint}
                    </Typography>
                    <TextField
                      select
                      size="small"
                      value={selectedSuggestionKey}
                      onChange={(e) => {
                        const nextKey = e.target.value;
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
                            return "請選擇要套用的建議";
                          }
                          const selectedSuggestion = playlistSuggestions.find(
                            (suggestion) => getSuggestionKey(suggestion) === key,
                          );
                          if (!selectedSuggestion) {
                            return "建議已不存在";
                          }
                          const label = selectedSuggestion.title ?? selectedSuggestion.value;
                          const count =
                            selectedSuggestion.totalCount ?? selectedSuggestion.items?.length;
                          return `${selectedSuggestion.username} · ${label}${
                            count ? ` (${count})` : ""
                          }`;
                        },
                      }}
                    >
                      <MenuItem value="">請選擇要套用的建議</MenuItem>
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
                              <Typography variant="caption" className="text-slate-400" noWrap>
                                {`${displayLabel}${displayCount ? ` (${displayCount})` : ""}`}
                              </Typography>
                            </Stack>
                          </MenuItem>
                        );
                      })}
                    </TextField>
                  </Stack>
                )}

                {hostSourceType === "playlist" && (
                  <>
                    <Typography variant="caption" className="text-slate-400">
                      {hostPlaylistPrimaryText}
                    </Typography>
                    <TextField
                      size="small"
                      value={playlistUrl}
                      onChange={(e) => {
                        onPlaylistUrlChange(e.target.value);
                      }}
                      onPaste={onPlaylistPaste}
                      placeholder="貼上 YouTube 播放清單 URL"
                      disabled={playlistLoading || gameStatus === "playing"}
                      fullWidth
                    />
                  </>
                )}

                {hostSourceType === "collection" && (
                  <>
                    <Typography
                      variant="caption"
                      className={
                        isHostCollectionEmptyNotice ? "text-rose-300" : "text-slate-400"
                      }
                    >
                      {hostCollectionPrimaryText}
                    </Typography>
                    {!isGoogleAuthed && collectionScope === "owner" && (
                      <Typography variant="caption" className="text-slate-400">
                        登入後可讀取你的私人收藏庫。
                      </Typography>
                    )}
                    <TextField
                      select
                      size="small"
                      value={selectedCollectionId ?? ""}
                      onChange={(e) => {
                        const nextId = e.target.value || null;
                        if (!nextId) {
                          onSelectCollection(null);
                          return;
                        }
                        const selected = collections.find((item) => item.id === nextId);
                        const label = selected
                          ? normalizeDisplayText(selected.title, "未命名收藏庫")
                          : nextId;
                        openConfirmModal("套用這個收藏庫？", label, () => {
                          onSelectCollection(nextId);
                          void onLoadCollectionItems(nextId);
                        });
                      }}
                      disabled={collectionsLoading || gameStatus === "playing"}
                      fullWidth
                      placeholder="選擇收藏庫"
                      SelectProps={{
                        displayEmpty: true,
                        renderValue: (selected) => {
                          const selectedId = String(selected ?? "");
                          if (!selectedId) return "請選擇收藏庫";
                          const selectedOption = collections.find(
                            (item) => item.id === selectedId,
                          );
                          if (!selectedOption) return selectedId;
                          return normalizeDisplayText(selectedOption.title, "未命名收藏庫");
                        },
                      }}
                    >
                      <MenuItem value="">未選擇</MenuItem>
                      {collections.map((collection) => (
                        <MenuItem key={collection.id} value={collection.id}>
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate">
                              {normalizeDisplayText(collection.title, "未命名收藏庫")}
                            </span>
                            <span className="text-xs text-slate-400">
                              熱門度 {Math.max(0, Number(collection.use_count ?? 0))}
                            </span>
                          </div>
                        </MenuItem>
                      ))}
                    </TextField>
                    {visibleCollectionsError && (
                      <Typography variant="caption" className="text-rose-300">
                        {visibleCollectionsError}
                      </Typography>
                    )}
                    {collectionItemsError && (
                      <Typography variant="caption" className="text-rose-300">
                        {collectionItemsError}
                      </Typography>
                    )}
                  </>
                )}

                {hostSourceType === "youtube" && (
                  <>
                    <Typography
                      variant="caption"
                      className={
                        isHostYoutubeEmptyNotice || isHostYoutubeMissingNotice
                          ? "text-rose-300"
                          : "text-slate-400"
                      }
                    >
                      {hostYoutubePrimaryText}
                    </Typography>
                    {visibleHostYoutubeError && (
                      <Typography variant="caption" className="text-rose-300">
                        {visibleHostYoutubeError}
                      </Typography>
                    )}
                    <TextField
                      select
                      size="small"
                      value={selectedYoutubePlaylistId ?? ""}
                      onChange={(e) => {
                        const nextId = e.target.value || null;
                        if (!nextId) {
                          setSelectedYoutubePlaylistId(null);
                          return;
                        }
                        const selected = youtubePlaylists.find((item) => item.id === nextId);
                        const label = selected
                          ? `${normalizeDisplayText(
                              selected.title,
                              "未命名 YouTube 播放清單",
                            )} (${selected.itemCount})`
                          : nextId;
                        openConfirmModal("匯入這份 YouTube 播放清單？", label, () => {
                          setSelectedYoutubePlaylistId(nextId);
                          void onImportYoutubePlaylist(nextId);
                        });
                      }}
                      disabled={youtubePlaylistsLoading || !isGoogleAuthed}
                      fullWidth
                      SelectProps={{
                        displayEmpty: true,
                        renderValue: (selected) => {
                          const selectedId = String(selected ?? "");
                          if (!selectedId) return "請選擇 YouTube 播放清單";
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
                      <MenuItem value="">未選擇</MenuItem>
                      {youtubePlaylists.map((playlist) => (
                        <MenuItem key={playlist.id} value={playlist.id}>
                          {normalizeDisplayText(playlist.title, "未命名 YouTube 播放清單")} (
                          {playlist.itemCount})
                        </MenuItem>
                      ))}
                    </TextField>
                  </>
                )}
              </Stack>

              <Stack spacing={0.75} className="room-lobby-source-footer">
                {playlistLoadNotice && (
                  <Typography
                    variant="caption"
                    className={
                      playlistError || collectionItemsError ? "text-rose-300" : "text-slate-400"
                    }
                  >
                    {playlistLoadNotice}
                  </Typography>
                )}
                <Button
                  size="small"
                  variant="contained"
                  color="success"
                  className="room-lobby-apply-button"
                  onClick={() => void onChangePlaylist()}
                  disabled={
                    playlistItemsForChangeLength === 0 ||
                    playlistLoading ||
                    gameStatus === "playing"
                  }
                >
                  套用到房間
                </Button>
              </Stack>
            </Stack>
          </Box>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
};

export default RoomLobbyHostControls;
