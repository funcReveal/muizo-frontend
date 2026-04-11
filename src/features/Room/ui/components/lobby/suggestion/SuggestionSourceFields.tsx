import React from "react";
import { MenuItem, TextField, Typography } from "@mui/material";

import type { YoutubePlaylist } from "../../../../model/RoomContext";
import RoomLobbyLoadingState from "../../RoomLobbyLoadingState";
import type { CollectionOption } from "../../../lib/roomLobbyPanelTypes";
import { normalizeDisplayText } from "../../../lib/roomLobbyPanelUtils";
import type { SuggestType } from "../../roomLobbySuggestionPanel/types";

interface SuggestionSourceFieldsProps {
  suggestType: SuggestType;
  suggestPlaylistUrl: string;
  onSuggestPlaylistUrlChange: (value: string) => void;
  suggestCollectionId: string | null;
  collections: CollectionOption[];
  collectionsLoading: boolean;
  onSuggestCollectionIdChange: (value: string | null) => void;
  isGoogleAuthed: boolean;
  collectionScope: "public" | "owner";
  visibleSuggestYoutubeError: string | null;
  suggestYoutubePlaylistId: string | null;
  youtubePlaylists: YoutubePlaylist[];
  youtubePlaylistsLoading: boolean;
  onSuggestYoutubePlaylistIdChange: (value: string | null) => void;
  isSubmitting: boolean;
}

const SuggestionSourceFields: React.FC<SuggestionSourceFieldsProps> = ({
  suggestType,
  suggestPlaylistUrl,
  onSuggestPlaylistUrlChange,
  suggestCollectionId,
  collections,
  collectionsLoading,
  onSuggestCollectionIdChange,
  isGoogleAuthed,
  collectionScope,
  visibleSuggestYoutubeError,
  suggestYoutubePlaylistId,
  youtubePlaylists,
  youtubePlaylistsLoading,
  onSuggestYoutubePlaylistIdChange,
  isSubmitting,
}) => (
  <>
    {suggestType === "playlist" && (
      <TextField
        size="small"
        value={suggestPlaylistUrl}
        onChange={(event) => onSuggestPlaylistUrlChange(event.target.value)}
        placeholder="貼上 YouTube 播放清單 URL"
        disabled={isSubmitting}
        fullWidth
      />
    )}

    {suggestType === "collection" && (
      <>
        {collectionsLoading && (
          <RoomLobbyLoadingState
            className="hidden"
            label="正在讀取收藏庫"
            detail={`整理${collectionScope === "public" ? "公開" : "私人"}歌單來源中...`}
          />
        )}
        <TextField
          select
          size="small"
          value={suggestCollectionId ?? ""}
          onChange={(event) =>
            onSuggestCollectionIdChange(
              event.target.value ? event.target.value : null,
            )
          }
          disabled={isSubmitting || collectionsLoading}
          fullWidth
          SelectProps={{
            displayEmpty: true,
            renderValue: (selected) => {
              const selectedId = String(selected ?? "");
              if (!selectedId) return "選擇要推薦的收藏庫";
              const selectedOption = collections.find(
                (item) => item.id === selectedId,
              );
              if (!selectedOption) return selectedId;
              return normalizeDisplayText(selectedOption.title, "未命名收藏庫");
            },
          }}
        >
          <MenuItem value="">選擇要推薦的收藏庫</MenuItem>
          {collections.map((collection) => (
            <MenuItem key={collection.id} value={collection.id}>
              <div className="flex min-w-0 flex-col">
                <span className="truncate">
                  {normalizeDisplayText(collection.title, "未命名收藏庫")}
                </span>
                <span className="text-xs text-slate-400">
                  使用次數 {Math.max(0, Number(collection.use_count ?? 0))}
                </span>
              </div>
            </MenuItem>
          ))}
        </TextField>
      </>
    )}

    {suggestType === "youtube" && (
      <>
        {!isGoogleAuthed && (
          <Typography variant="caption" className="hidden room-lobby-field-notice">
            請先登入 Google 才能讀取 YouTube 播放清單。
          </Typography>
        )}
        {youtubePlaylistsLoading && isGoogleAuthed && (
          <RoomLobbyLoadingState
            className="hidden"
            label="正在讀取 YouTube 播放清單"
            detail="同步你的雲端播放清單中..."
          />
        )}
        {visibleSuggestYoutubeError && (
          <Typography variant="caption" className="hidden text-rose-300">
            {visibleSuggestYoutubeError}
          </Typography>
        )}
        <TextField
          select
          size="small"
          value={suggestYoutubePlaylistId ?? ""}
          onChange={(event) =>
            onSuggestYoutubePlaylistIdChange(
              event.target.value ? event.target.value : null,
            )
          }
          disabled={isSubmitting || !isGoogleAuthed || youtubePlaylistsLoading}
          fullWidth
          SelectProps={{
            displayEmpty: true,
            renderValue: (selected) => {
              const selectedId = String(selected ?? "");
              if (!selectedId) return "選擇 YouTube 播放清單";
              const selectedOption = youtubePlaylists.find(
                (item) => item.id === selectedId,
              );
              if (!selectedOption) return selectedId;
              return `${normalizeDisplayText(selectedOption.title, "未命名 YouTube 播放清單")} (${selectedOption.itemCount})`;
            },
          }}
        >
          <MenuItem value="">選擇 YouTube 播放清單</MenuItem>
          {youtubePlaylists.map((playlist) => (
            <MenuItem key={playlist.id} value={playlist.id}>
              {normalizeDisplayText(playlist.title, "未命名 YouTube 播放清單")} (
              {playlist.itemCount})
            </MenuItem>
          ))}
        </TextField>
      </>
    )}
  </>
);

export default SuggestionSourceFields;
