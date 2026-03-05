import React from "react";
import { MenuItem, TextField, Typography } from "@mui/material";

import type { YoutubePlaylist } from "../../../model/RoomContext";
import type { CollectionOption } from "../roomLobbyPanelTypes";
import { normalizeDisplayText } from "../roomLobbyPanelUtils";
import type { SuggestType } from "./types";

interface SuggestionSourceFieldsProps {
  suggestType: SuggestType;
  suggestPlaylistPrimaryText: string;
  suggestPlaylistUrl: string;
  onSuggestPlaylistUrlChange: (value: string) => void;
  suggestCollectionPrimaryText: string;
  isSuggestCollectionEmptyNotice: boolean;
  isGoogleAuthed: boolean;
  collectionScope: "public" | "owner";
  suggestCollectionId: string | null;
  collections: CollectionOption[];
  onSuggestCollectionIdChange: (value: string | null) => void;
  suggestYoutubePrimaryText: string;
  isSuggestYoutubeEmptyNotice: boolean;
  isSuggestYoutubeMissingNotice: boolean;
  visibleSuggestYoutubeError: string | null;
  suggestYoutubePlaylistId: string | null;
  youtubePlaylists: YoutubePlaylist[];
  onSuggestYoutubePlaylistIdChange: (value: string | null) => void;
  isSubmitting: boolean;
}

const SuggestionSourceFields: React.FC<SuggestionSourceFieldsProps> = ({
  suggestType,
  suggestPlaylistPrimaryText,
  suggestPlaylistUrl,
  onSuggestPlaylistUrlChange,
  suggestCollectionPrimaryText,
  isSuggestCollectionEmptyNotice,
  isGoogleAuthed,
  collectionScope,
  suggestCollectionId,
  collections,
  onSuggestCollectionIdChange,
  suggestYoutubePrimaryText,
  isSuggestYoutubeEmptyNotice,
  isSuggestYoutubeMissingNotice,
  visibleSuggestYoutubeError,
  suggestYoutubePlaylistId,
  youtubePlaylists,
  onSuggestYoutubePlaylistIdChange,
  isSubmitting,
}) => (
  <>
    {suggestType === "playlist" && (
      <>
        <Typography variant="caption" className="text-slate-400">
          {suggestPlaylistPrimaryText}
        </Typography>
        <TextField
          size="small"
          value={suggestPlaylistUrl}
          onChange={(event) => onSuggestPlaylistUrlChange(event.target.value)}
          placeholder="貼上 YouTube 播放清單 URL"
          disabled={isSubmitting}
          fullWidth
        />
      </>
    )}
    {suggestType === "collection" && (
      <>
        <Typography
          variant="caption"
          className={
            isSuggestCollectionEmptyNotice ? "text-rose-300" : "text-slate-400"
          }
        >
          {suggestCollectionPrimaryText}
        </Typography>
        {!isGoogleAuthed && collectionScope === "owner" && (
          <Typography variant="caption" className="text-slate-400">
            登入後可使用私人收藏庫
          </Typography>
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
          disabled={isSubmitting}
          fullWidth
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
          <MenuItem value="">請選擇收藏庫</MenuItem>
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
      </>
    )}
    {suggestType === "youtube" && (
      <>
        <Typography
          variant="caption"
          className={
            isSuggestYoutubeEmptyNotice || isSuggestYoutubeMissingNotice
              ? "text-rose-300"
              : "text-slate-400"
          }
        >
          {suggestYoutubePrimaryText}
        </Typography>
        {visibleSuggestYoutubeError && (
          <Typography variant="caption" className="text-rose-300">
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
          disabled={isSubmitting || !isGoogleAuthed}
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
              return `${normalizeDisplayText(selectedOption.title, "未命名播放清單")} (${selectedOption.itemCount})`;
            },
          }}
        >
          <MenuItem value="">請選擇 YouTube 播放清單</MenuItem>
          {youtubePlaylists.map((playlist) => (
            <MenuItem key={playlist.id} value={playlist.id}>
              {normalizeDisplayText(playlist.title, "未命名播放清單")} (
              {playlist.itemCount})
            </MenuItem>
          ))}
        </TextField>
      </>
    )}
  </>
);

export default SuggestionSourceFields;
