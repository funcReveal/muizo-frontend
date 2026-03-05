import React from "react";
import { Button, Stack } from "@mui/material";

import type { SuggestType } from "./types";

interface SuggestionModeButtonsProps {
  suggestType: SuggestType;
  collectionScope: "public" | "owner";
  isSubmitting: boolean;
  isGoogleAuthed: boolean;
  onSelectPlaylist: () => void;
  onSelectPublicCollection: () => void;
  onSelectOwnerCollection: () => void;
  onSelectYoutube: () => void;
}

const SuggestionModeButtons: React.FC<SuggestionModeButtonsProps> = ({
  suggestType,
  collectionScope,
  isSubmitting,
  isGoogleAuthed,
  onSelectPlaylist,
  onSelectPublicCollection,
  onSelectOwnerCollection,
  onSelectYoutube,
}) => (
  <Stack direction="row" className="room-lobby-mode-row">
    <Button
      size="small"
      variant={suggestType === "playlist" ? "contained" : "outlined"}
      className="room-lobby-mode-button"
      onClick={onSelectPlaylist}
      disabled={isSubmitting}
    >
      貼上連結
    </Button>
    <Button
      size="small"
      variant={
        suggestType === "collection" && collectionScope === "public"
          ? "contained"
          : "outlined"
      }
      className="room-lobby-mode-button"
      onClick={onSelectPublicCollection}
      disabled={isSubmitting}
    >
      公開收藏庫
    </Button>
    <Button
      size="small"
      variant={
        suggestType === "collection" && collectionScope === "owner"
          ? "contained"
          : "outlined"
      }
      className="room-lobby-mode-button"
      onClick={onSelectOwnerCollection}
      disabled={isSubmitting || !isGoogleAuthed}
    >
      私人收藏庫
    </Button>
    <Button
      size="small"
      variant={suggestType === "youtube" ? "contained" : "outlined"}
      className="room-lobby-mode-button"
      onClick={onSelectYoutube}
      disabled={isSubmitting}
    >
      我的播放清單
    </Button>
  </Stack>
);

export default SuggestionModeButtons;
