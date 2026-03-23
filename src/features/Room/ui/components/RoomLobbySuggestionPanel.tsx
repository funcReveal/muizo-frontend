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
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import PublicRoundedIcon from "@mui/icons-material/PublicRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import YouTubeIcon from "@mui/icons-material/YouTube";
import TipsAndUpdatesRoundedIcon from "@mui/icons-material/TipsAndUpdatesRounded";
import { useEffect, useRef, useState } from "react";

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
  openConfirmModal: (
    title: string,
    detail: string | undefined,
    action: () => void,
  ) => void;
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
  openConfirmModal,
}) => {
  const [suggestType, setSuggestType] = useState<SuggestType>("playlist");
  const [suggestPlaylistUrl, setSuggestPlaylistUrl] = useState("");
  const [suggestCollectionId, setSuggestCollectionId] = useState<string | null>(null);
  const [suggestYoutubePlaylistId, setSuggestYoutubePlaylistId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [cooldownNow, setCooldownNow] = useState(() => Date.now());
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [suggestNotice, setSuggestNotice] = useState<string | null>(null);

  const lastCollectionRequestScopeRef = useRef<"public" | "owner" | null>(null);
  const hasRequestedYoutubeRef = useRef(false);
  const cooldownTimerRef = useRef<number | null>(null);
  const cooldownIntervalRef = useRef<number | null>(null);

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
    if (suggestError) setSuggestError(null);
  };

  const clearSuggestNoticeIfAllowed = () => {
    if (suggestNotice && !isCooldownActive) {
      setSuggestNotice(null);
    }
  };

  const submitSuggestion = async (
    type: "collection" | "playlist",
    value: string,
    options?: {
      useSnapshot?: boolean;
      sourceId?: string | null;
      title?: string | null;
    },
  ) => {
    if (isCooldownActive) {
      const remaining = Math.max(
        1,
        Math.ceil(((cooldownUntil ?? Date.now()) - Date.now()) / 1000),
      );
      setSuggestNotice(`請等待 ${remaining}s 後再送出下一次推薦。`);
      return;
    }

    setIsSubmitting(true);
    setSuggestError(null);
    setSuggestNotice(null);

    try {
      const result = await onSuggestPlaylist(type, value, options);
      if (!result?.ok) {
        setSuggestError(result?.error ?? "提交推薦失敗。");
        return;
      }
      setCooldownUntil(Date.now() + SUGGESTION_COOLDOWN_MS);
      setSuggestNotice("推薦已送出。");
    } finally {
      setIsSubmitting(false);
    }
  };

  const googleAuthStatusMessage = "請先登入 Google";

  const suggestionSourceStatus = (() => {
    if (suggestType === "playlist") {
      return {
        message: suggestPlaylistUrl.trim()
          ? "按 Enter 後確認，會直接推薦給房主"
          : "貼上 YouTube 連結",
        tone: suggestPlaylistUrl.trim() ? "info" : "neutral",
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
          suggestCollectionId
            ? "確認後會直接推薦給房主"
            : collectionScope === "public"
              ? "選擇公開收藏庫"
              : "選擇個人收藏庫",
        tone: collections.length === 0 ? "warning" : suggestCollectionId ? "info" : "neutral",
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
      message: suggestYoutubePlaylistId
        ? "確認後會直接推薦給房主"
        : "選擇 YouTube 播放清單",
      tone: youtubePlaylists.length === 0 ? "warning" : suggestYoutubePlaylistId ? "info" : "neutral",
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
        <div className="room-lobby-host-heading">
          <span className="room-lobby-host-heading__icon" aria-hidden="true">
            <TipsAndUpdatesRoundedIcon fontSize="small" />
          </span>
          <Typography variant="subtitle2" className="text-slate-200">
            推薦播放清單
          </Typography>
        </div>
      </AccordionSummary>
      <AccordionDetails>
        <Stack
          spacing={1.2}
          className="room-lobby-source-panel room-lobby-source-panel--host room-lobby-source-panel-fixed room-lobby-source-panel--suggestion"
        >
          <div className="room-lobby-mobile-panel-heading" aria-hidden="true">
            <div className="room-lobby-host-heading">
              <span className="room-lobby-host-heading__icon">
                <TipsAndUpdatesRoundedIcon fontSize="small" />
              </span>
              <Typography variant="subtitle2" className="text-slate-200">
                推薦播放清單
              </Typography>
            </div>
          </div>

          <Stack direction="row" className="room-lobby-mode-row room-lobby-mode-row--host">
            <Button
              size="small"
              variant={
                suggestType === "collection" && collectionScope === "public"
                  ? "contained"
                  : "outlined"
              }
              className="room-lobby-mode-button room-lobby-mode-button--public"
              startIcon={<PublicRoundedIcon fontSize="small" />}
              onClick={() => {
                setSuggestType("collection");
                onCollectionScopeChange("public");
                setSuggestCollectionId(null);
                clearSuggestError();
              }}
              disabled={isSubmitting}
            >
              公開
            </Button>
            <Button
              size="small"
              variant={
                suggestType === "collection" && collectionScope === "owner"
                  ? "contained"
                  : "outlined"
              }
              className="room-lobby-mode-button room-lobby-mode-button--owner"
              startIcon={<LockRoundedIcon fontSize="small" />}
              onClick={() => {
                setSuggestType("collection");
                onCollectionScopeChange("owner");
                setSuggestCollectionId(null);
                clearSuggestError();
              }}
              disabled={isSubmitting || !isGoogleAuthed}
            >
              個人
            </Button>
            <Button
              size="small"
              variant={suggestType === "youtube" ? "contained" : "outlined"}
              className="room-lobby-mode-button room-lobby-mode-button--youtube"
              startIcon={<YouTubeIcon fontSize="small" />}
              onClick={() => {
                setSuggestType("youtube");
                clearSuggestError();
              }}
              disabled={isSubmitting}
            >
              YouTube
            </Button>
            <Button
              size="small"
              variant={suggestType === "playlist" ? "contained" : "outlined"}
              className="room-lobby-mode-button room-lobby-mode-button--playlist"
              startIcon={<LinkRoundedIcon fontSize="small" />}
              onClick={() => {
                setSuggestType("playlist");
                clearSuggestError();
              }}
              disabled={isSubmitting}
            >
              連結
            </Button>
          </Stack>

          <div className="room-lobby-source-card room-lobby-source-card--suggestion room-lobby-source-card--flat-select">
            <Stack spacing={1} className="room-lobby-source-view">
              <RoomLobbyStatusStrip
                className="room-lobby-source-status-inline"
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
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") return;
                    event.preventDefault();
                    const trimmed = suggestPlaylistUrl.trim();
                    const playlistId = extractPlaylistId(trimmed);
                    if (!playlistId) {
                      setSuggestError("請輸入有效的 YouTube 播放清單 URL。");
                      return;
                    }
                    openConfirmModal("要推薦這個播放清單給房主嗎？", trimmed, () => {
                      void submitSuggestion("playlist", trimmed, {
                        useSnapshot: false,
                        sourceId: playlistId,
                      });
                    });
                  }}
                  placeholder="貼上 YouTube 播放清單 URL"
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
                    const nextId = event.target.value || null;
                    setSuggestCollectionId(nextId);
                    clearSuggestError();
                    clearSuggestNoticeIfAllowed();
                    if (!nextId) return;
                    const selected = collections.find((item) => item.id === nextId);
                    const label = selected
                      ? normalizeDisplayText(selected.title, "未命名收藏庫")
                      : nextId;
                    openConfirmModal("要推薦這個收藏庫給房主嗎？", label, () => {
                      void submitSuggestion("collection", nextId, {
                        useSnapshot: selected?.visibility === "private",
                        sourceId: nextId,
                        title: selected?.title ?? null,
                      });
                    });
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
                          ? "選擇公開收藏庫"
                          : "選擇私人收藏庫";
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
                    {collectionScope === "public" ? "選擇公開收藏庫" : "選擇私人收藏庫"}
                  </MenuItem>
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
              )}

              {suggestType === "youtube" && (
                <TextField
                  select
                  size="small"
                  value={suggestYoutubePlaylistId ?? ""}
                  onChange={(event) => {
                    const nextId = event.target.value || null;
                    setSuggestYoutubePlaylistId(nextId);
                    clearSuggestError();
                    clearSuggestNoticeIfAllowed();
                    if (!nextId) return;
                    const selected = youtubePlaylists.find(
                      (item) => item.id === nextId,
                    );
                    const label = selected
                      ? `${normalizeDisplayText(
                          selected.title,
                          "未命名 YouTube 播放清單",
                        )} (${selected.itemCount})`
                      : nextId;
                    openConfirmModal("要推薦這份 YouTube 播放清單給房主嗎？", label, () => {
                      void submitSuggestion("playlist", nextId, {
                        useSnapshot: true,
                        sourceId: nextId,
                        title: selected?.title ?? null,
                      });
                    });
                  }}
                  disabled={isSubmitting || !isGoogleAuthed || youtubePlaylistsLoading}
                  fullWidth
                  SelectProps={{
                    displayEmpty: true,
                    renderValue: (selected) => {
                      const selectedId = String(selected ?? "");
                      if (!selectedId) {
                        return "選擇 YouTube 播放清單";
                      }
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
                  <MenuItem value="">選擇 YouTube 播放清單</MenuItem>
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

          <Stack
            spacing={0.75}
            className="room-lobby-source-footer room-lobby-source-footer--suggestion"
          >
            <SuggestionStatusMessages
              className="room-lobby-source-status-inline room-lobby-source-status-inline--footer"
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
