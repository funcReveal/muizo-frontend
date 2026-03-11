import React, { useEffect, useRef, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import type { YoutubePlaylist } from "../../model/RoomContext";
import RoomLobbyStatusStrip from "./RoomLobbyStatusStrip";
import type { CollectionOption } from "./roomLobbyPanelTypes";
import { normalizeDisplayText } from "./roomLobbyPanelUtils";
import SuggestionStatusMessages from "./roomLobbySuggestionPanel/SuggestionStatusMessages";

type SuggestType = "playlist" | "collection" | "youtube";

export interface SuggestionPanelProps {
  collectionScope: "public" | "owner";
  onCollectionScopeChange: (scope: "public" | "owner") => void;
  collections: CollectionOption[];
  collectionsLoading: boolean;
  isGoogleAuthed: boolean;
  youtubePlaylists: YoutubePlaylist[];
  youtubePlaylistsLoading: boolean;
  youtubePlaylistsError: string | null;
  requestCollections: (scope: "public" | "owner") => void;
  requestYoutubePlaylists: (force?: boolean) => void;
  onSuggestPlaylist: (
    type: "collection" | "playlist",
    value: string,
    options?: {
      useSnapshot?: boolean;
      sourceId?: string | null;
      title?: string | null;
    },
  ) => Promise<{ ok: boolean; error?: string }>;
  extractPlaylistId: (url: string) => string | null;
}

const SUGGESTION_COOLDOWN_MS = 5000;

const RoomLobbySuggestionPanel: React.FC<SuggestionPanelProps> = ({
  collectionScope,
  onCollectionScopeChange,
  collections,
  collectionsLoading,
  isGoogleAuthed,
  youtubePlaylists,
  youtubePlaylistsLoading,
  youtubePlaylistsError,
  requestCollections,
  requestYoutubePlaylists,
  onSuggestPlaylist,
  extractPlaylistId,
}) => {
  const [suggestType, setSuggestType] = useState<SuggestType>("playlist");
  const [suggestPlaylistUrl, setSuggestPlaylistUrl] = useState("");
  const [suggestCollectionId, setSuggestCollectionId] = useState<string | null>(
    null,
  );
  const [suggestYoutubePlaylistId, setSuggestYoutubePlaylistId] = useState<
    string | null
  >(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [cooldownNow, setCooldownNow] = useState(() => Date.now());
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [suggestNotice, setSuggestNotice] = useState<string | null>(null);

  const lastCollectionRequestScopeRef = useRef<"public" | "owner" | null>(null);
  const hasRequestedYoutubeRef = useRef(false);
  const cooldownTimerRef = useRef<number | null>(null);
  const cooldownIntervalRef = useRef<number | null>(null);

  const selectedSuggestCollection = collections.find(
    (item) => item.id === suggestCollectionId,
  );
  const isSuggestCollectionPrivate =
    selectedSuggestCollection?.visibility === "private";
  const isCooldownActive =
    typeof cooldownUntil === "number" && cooldownUntil > Date.now();
  const remainingCooldownSeconds = cooldownUntil
    ? Math.max(0, Math.ceil((cooldownUntil - cooldownNow) / 1000))
    : 0;

  useEffect(() => {
    if (suggestType !== "collection") return;
    if (lastCollectionRequestScopeRef.current === collectionScope) return;
    lastCollectionRequestScopeRef.current = collectionScope;
    requestCollections(collectionScope);
  }, [collectionScope, requestCollections, suggestType]);

  useEffect(() => {
    if (suggestType !== "youtube") return;
    if (!isGoogleAuthed) return;
    if (hasRequestedYoutubeRef.current) return;
    hasRequestedYoutubeRef.current = true;
    requestYoutubePlaylists();
  }, [isGoogleAuthed, requestYoutubePlaylists, suggestType]);

  useEffect(() => {
    if (suggestType !== "youtube") {
      hasRequestedYoutubeRef.current = false;
    }
  }, [suggestType]);

  useEffect(() => {
    if (isGoogleAuthed) return;
    hasRequestedYoutubeRef.current = false;
  }, [isGoogleAuthed]);

  useEffect(() => {
    if (cooldownTimerRef.current) {
      window.clearTimeout(cooldownTimerRef.current);
      cooldownTimerRef.current = null;
    }
    if (cooldownIntervalRef.current) {
      window.clearInterval(cooldownIntervalRef.current);
      cooldownIntervalRef.current = null;
    }

    if (!cooldownUntil) return;

    const remaining = cooldownUntil - Date.now();
    if (remaining <= 0) {
      setCooldownUntil(null);
      setSuggestNotice(null);
      return;
    }

    setCooldownNow(Date.now());
    cooldownIntervalRef.current = window.setInterval(() => {
      setCooldownNow(Date.now());
    }, 500);
    cooldownTimerRef.current = window.setTimeout(() => {
      setCooldownUntil(null);
      setSuggestNotice(null);
    }, remaining);

    return () => {
      if (cooldownTimerRef.current) {
        window.clearTimeout(cooldownTimerRef.current);
        cooldownTimerRef.current = null;
      }
      if (cooldownIntervalRef.current) {
        window.clearInterval(cooldownIntervalRef.current);
        cooldownIntervalRef.current = null;
      }
    };
  }, [cooldownUntil]);

  const clearSuggestError = () => {
    if (suggestError) {
      setSuggestError(null);
    }
  };

  const clearSuggestNoticeIfAllowed = () => {
    if (suggestNotice && !isCooldownActive) {
      setSuggestNotice(null);
    }
  };

  const handleSubmitSuggestion = async () => {
    if (isCooldownActive) {
      const remaining = Math.max(
        1,
        Math.ceil(((cooldownUntil ?? Date.now()) - Date.now()) / 1000),
      );
      setSuggestNotice(`\u8acb\u7b49\u5f85 ${remaining}s \u5f8c\u518d\u9001\u51fa\u4e0b\u4e00\u6b21\u63a8\u85a6\u3002`);
      return;
    }

    setIsSubmitting(true);
    setSuggestError(null);
    setSuggestNotice(null);

    try {
      let result: { ok: boolean; error?: string } | null = null;

      if (suggestType === "playlist") {
        const trimmed = suggestPlaylistUrl.trim();
        const playlistId = extractPlaylistId(trimmed);
        if (!playlistId) {
          setSuggestError(
            "\u8acb\u8f38\u5165\u6709\u6548\u7684 YouTube \u64ad\u653e\u6e05\u55ae URL\u3002",
          );
          return;
        }

        result = await onSuggestPlaylist("playlist", trimmed, {
          useSnapshot: false,
          sourceId: playlistId,
        });
      } else if (suggestType === "youtube") {
        if (!suggestYoutubePlaylistId) {
          setSuggestError(
            "\u8acb\u5148\u9078\u64c7 YouTube \u64ad\u653e\u6e05\u55ae\u3002",
          );
          return;
        }

        const selected = youtubePlaylists.find(
          (playlist) => playlist.id === suggestYoutubePlaylistId,
        );
        result = await onSuggestPlaylist("playlist", suggestYoutubePlaylistId, {
          useSnapshot: true,
          sourceId: suggestYoutubePlaylistId,
          title: selected?.title ?? null,
        });
      } else if (suggestCollectionId) {
        result = await onSuggestPlaylist("collection", suggestCollectionId, {
          useSnapshot: isSuggestCollectionPrivate,
          sourceId: suggestCollectionId,
          title: selectedSuggestCollection?.title ?? null,
        });
      }

      if (!result?.ok) {
        setSuggestError(result?.error ?? "\u63d0\u4ea4\u63a8\u85a6\u5931\u6557\u3002");
        return;
      }

      setCooldownUntil(Date.now() + SUGGESTION_COOLDOWN_MS);
      setSuggestNotice("\u63a8\u85a6\u5df2\u9001\u51fa\u3002");
    } finally {
      setIsSubmitting(false);
    }
  };

  const googleAuthStatusMessage =
    "\u8acb\u5148\u767b\u5165 Google \u624d\u80fd\u8b80\u53d6 YouTube \u64ad\u653e\u6e05\u55ae\u3002";

  const suggestionSourceStatus = (() => {
    if (suggestType === "playlist") {
      return {
        message:
          "\u53ef\u8cbc\u4e0a YouTube \u64ad\u653e\u6e05\u55ae\u9023\u7d50\uff0c\u5c07\u6574\u4efd\u6b4c\u55ae\u63a8\u85a6\u7d66\u623f\u4e3b\u3002",
        tone: "neutral",
        loading: false,
      } as const;
    }

    if (suggestType === "collection") {
      if (collectionScope === "owner" && !isGoogleAuthed) {
        return {
          message: googleAuthStatusMessage,
          tone: "warning",
          loading: false,
        } as const;
      }

      return {
        message:
          collectionScope === "public"
            ? "\u8acb\u9078\u64c7\u8981\u63a8\u85a6\u7684\u516c\u958b\u6536\u85cf\u5eab\u3002"
            : "\u8acb\u9078\u64c7\u8981\u63a8\u85a6\u7684\u79c1\u4eba\u6536\u85cf\u5eab\u3002",
        tone: collections.length === 0 ? "warning" : "neutral",
        loading: collectionsLoading,
      } as const;
    }

    if (!isGoogleAuthed) {
      return {
        message: googleAuthStatusMessage,
        tone: "warning",
        loading: false,
      } as const;
    }

    if (youtubePlaylistsError) {
      return {
        message: youtubePlaylistsError,
        tone: "error",
        loading: false,
      } as const;
    }

    return {
      message:
        "\u8acb\u9078\u64c7\u8981\u63a8\u85a6\u7684 YouTube \u64ad\u653e\u6e05\u55ae\u3002",
      tone: youtubePlaylists.length === 0 ? "warning" : "neutral",
      loading: youtubePlaylistsLoading,
    } as const;
  })();

  return (
    <Accordion
      disableGutters
      expanded
      className="border border-slate-800/80 bg-slate-950/40 room-lobby-suggestion-accordion"
    >
      <AccordionSummary>
        <Typography variant="subtitle2" className="text-slate-200">
          {"\u63a8\u85a6\u6b4c\u55ae\u7d66\u623f\u4e3b"}
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Stack
          spacing={1.2}
          className="room-lobby-source-panel room-lobby-source-panel--host room-lobby-source-panel-fixed room-lobby-source-panel--suggestion"
        >
          <Stack direction="row" className="room-lobby-mode-row room-lobby-mode-row--host">
            <Button
              size="small"
              variant={suggestType === "playlist" ? "contained" : "outlined"}
              className="room-lobby-mode-button"
              onClick={() => {
                setSuggestType("playlist");
                clearSuggestError();
              }}
              disabled={isSubmitting}
            >
              {"\u8cbc\u4e0a\u9023\u7d50"}
            </Button>
            <Button
              size="small"
              variant={
                suggestType === "collection" && collectionScope === "public"
                  ? "contained"
                  : "outlined"
              }
              className="room-lobby-mode-button"
              onClick={() => {
                setSuggestType("collection");
                onCollectionScopeChange("public");
                setSuggestCollectionId(null);
                clearSuggestError();
              }}
              disabled={isSubmitting}
            >
              {"\u516c\u958b\u6536\u85cf\u5eab"}
            </Button>
            <Button
              size="small"
              variant={
                suggestType === "collection" && collectionScope === "owner"
                  ? "contained"
                  : "outlined"
              }
              className="room-lobby-mode-button"
              onClick={() => {
                setSuggestType("collection");
                onCollectionScopeChange("owner");
                setSuggestCollectionId(null);
                clearSuggestError();
              }}
              disabled={isSubmitting || !isGoogleAuthed}
            >
              {"\u79c1\u4eba\u6536\u85cf\u5eab"}
            </Button>
            <Button
              size="small"
              variant={suggestType === "youtube" ? "contained" : "outlined"}
              className="room-lobby-mode-button"
              onClick={() => {
                setSuggestType("youtube");
                clearSuggestError();
              }}
              disabled={isSubmitting}
            >
              {"\u6211\u7684\u64ad\u653e\u6e05\u55ae"}
            </Button>
          </Stack>

          <div className="room-lobby-source-card room-lobby-source-card--suggestion room-lobby-source-card--flat-select">
            <Stack spacing={1} className="room-lobby-source-view">
              <RoomLobbyStatusStrip
                message={suggestionSourceStatus.message}
                tone={suggestionSourceStatus.tone}
                loading={suggestionSourceStatus.loading}
                reserveSpace
              />

              {suggestType === "playlist" && (
                <TextField
                  size="small"
                  value={suggestPlaylistUrl}
                  onChange={(event) => {
                    setSuggestPlaylistUrl(event.target.value);
                    clearSuggestError();
                    clearSuggestNoticeIfAllowed();
                  }}
                  placeholder={"\u8cbc\u4e0a YouTube \u64ad\u653e\u6e05\u55ae URL"}
                  disabled={isSubmitting}
                  fullWidth
                />
              )}

              {suggestType === "collection" && (
                <TextField
                  select
                  size="small"
                  value={suggestCollectionId ?? ""}
                  onChange={(event) => {
                    setSuggestCollectionId(event.target.value || null);
                    clearSuggestError();
                    clearSuggestNoticeIfAllowed();
                  }}
                  disabled={
                    isSubmitting ||
                    collectionsLoading ||
                    (collectionScope === "owner" && !isGoogleAuthed)
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

              {suggestType === "youtube" && (
                <TextField
                  select
                  size="small"
                  value={suggestYoutubePlaylistId ?? ""}
                  onChange={(event) => {
                    setSuggestYoutubePlaylistId(event.target.value || null);
                    clearSuggestError();
                    clearSuggestNoticeIfAllowed();
                  }}
                  disabled={isSubmitting || !isGoogleAuthed || youtubePlaylistsLoading}
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
                color="warning"
                className="room-lobby-apply-button room-lobby-apply-button--suggestion"
                aria-label={"\u63a8\u85a6\u7d66\u623f\u4e3b"}
                disabled={
                  isSubmitting ||
                  isCooldownActive ||
                  (suggestType === "playlist" && !suggestPlaylistUrl.trim()) ||
                  (suggestType === "collection" && !suggestCollectionId) ||
                  (suggestType === "youtube" && !suggestYoutubePlaylistId)
                }
                onClick={() => void handleSubmitSuggestion()}
              >
                {"\u63a8\u85a6\u7d66\u623f\u4e3b"}
              </Button>
            </Stack>
          </div>

          <Stack
            spacing={0.75}
            className="room-lobby-source-footer room-lobby-source-footer--suggestion"
          >
            <SuggestionStatusMessages
              suggestError={suggestError}
              suggestNotice={suggestNotice}
              isCooldownActive={isCooldownActive}
              remainingCooldownSeconds={remainingCooldownSeconds}
            />
          </Stack>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
};

export default RoomLobbySuggestionPanel;
