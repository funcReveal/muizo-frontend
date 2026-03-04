import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  List as MUIList,
  ListItem,
  MenuItem,
  Popover,
  Stack,
  Switch,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import { List as VirtualList, type RowComponentProps } from "react-window";
import type {
  ChatMessage,
  GameState,
  PlaylistItem,
  PlaylistSuggestion,
  RoomParticipant,
  RoomState,
} from "../../model/types";
import type { YoutubePlaylist } from "../../model/RoomContext";
import {
  clampPlayDurationSec,
  clampQuestionCount,
  clampRevealDurationSec,
  clampStartOffsetSec,
  getQuestionMax,
} from "../../model/roomUtils";
import {
  DEFAULT_PLAY_DURATION_SEC,
  DEFAULT_REVEAL_DURATION_SEC,
  DEFAULT_START_OFFSET_SEC,
  PLAYER_MAX,
  PLAYER_MIN,
  PLAY_DURATION_MAX,
  PLAY_DURATION_MIN,
  QUESTION_MIN,
  QUESTION_STEP,
  REVEAL_DURATION_MAX,
  REVEAL_DURATION_MIN,
  START_OFFSET_MAX,
  START_OFFSET_MIN,
} from "../../model/roomConstants";
import QuestionCountControls from "./QuestionCountControls";
import RoomAccessSettingsFields from "./RoomAccessSettingsFields";

const formatTime = (timestamp: number) => {
  const d = new Date(timestamp);
  return d.toLocaleTimeString();
};

const normalizeDisplayText = (value: string | null | undefined, fallback: string) => {
  const text = (value ?? "").trim();
  if (!text) return fallback;
  const replacementCount = (text.match(/\uFFFD/g) ?? []).length;
  const questionCount = (text.match(/\?/g) ?? []).length;
  const looksBroken =
    replacementCount > 0 ||
    (questionCount >= 3 && questionCount / Math.max(1, text.length) > 0.15);
  return looksBroken ? fallback : text;
};

const SETTLEMENT_REVIEW_MESSAGE_ID_PREFIX = "settlement-review:";

type CollectionOption = {
  id: string;
  title: string;
  description?: string | null;
  visibility?: "private" | "public";
  use_count?: number;
};

interface SuggestionPanelProps {
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
    options?: { useSnapshot?: boolean; sourceId?: string | null; title?: string | null },
  ) => Promise<{ ok: boolean; error?: string }>;
  extractPlaylistId: (url: string) => string | null;
}

const SuggestionPanel: React.FC<SuggestionPanelProps> = ({
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
  const [suggestType, setSuggestType] = useState<
    "playlist" | "collection" | "youtube"
  >("playlist");
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
  const SUGGESTION_COOLDOWN_MS = 5000;
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
  const isSuggestCollectionEmptyNotice =
    !collectionsLoading &&
    collections.length === 0 &&
    !(collectionScope === "owner" && !isGoogleAuthed);
  const suggestPlaylistPrimaryText = "貼上播放清單連結，將歌單推薦給房主。";
  const suggestCollectionPrimaryText = (() => {
    const scopeLabel = collectionScope === "public" ? "公開" : "私人";
    if (collectionScope === "owner" && !isGoogleAuthed) {
      return "請先登入 Google 才能使用私人收藏庫。";
    }
    if (collectionsLoading) {
      return `正在讀取${scopeLabel}收藏庫...`;
    }
    if (collections.length === 0) {
      return `目前沒有可用的${scopeLabel}收藏庫。`;
    }
    return `請選擇要推薦的${scopeLabel}收藏庫。`;
  })();
  const isSuggestYoutubeEmptyNotice =
    isGoogleAuthed &&
    !youtubePlaylistsLoading &&
    youtubePlaylists.length === 0 &&
    !youtubePlaylistsError;
  const isSuggestYoutubeMissingNotice = Boolean(
    youtubePlaylistsError &&
    (
      youtubePlaylistsError.toLowerCase().includes("youtube") ||
      youtubePlaylistsError.includes("YouTube")
    ),
  );
  const visibleSuggestYoutubeError =
    youtubePlaylistsError && !isSuggestYoutubeMissingNotice
      ? youtubePlaylistsError
      : null;
  const suggestYoutubePrimaryText = (() => {
    if (!isGoogleAuthed) {
      return "請先登入 Google 以載入 YouTube 播放清單。";
    }
    if (youtubePlaylistsLoading) {
      return "正在讀取 YouTube 播放清單...";
    }
    if (isSuggestYoutubeMissingNotice) {
      return "目前尚未取得可用的 YouTube 播放清單。";
    }
    if (isSuggestYoutubeEmptyNotice) {
      return "你的帳號目前沒有可用的 YouTube 播放清單。";
    }
    return "選擇 YouTube 播放清單後即可送出推薦。";
  })();

  useEffect(() => {
    if (suggestType !== "collection") {
      return;
    }
    if (lastCollectionRequestScopeRef.current === collectionScope) {
      return;
    }
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

  return (
    <Accordion
      disableGutters
      expanded
      className="border border-slate-800/80 bg-slate-950/40 room-lobby-suggestion-accordion"
    >
      <AccordionSummary>
        <Typography variant="subtitle2" className="text-slate-200">
          推薦歌單給房主
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={1}>
          <Stack direction="row" className="room-lobby-mode-row">
            <Button
              size="small"
              variant={suggestType === "playlist" ? "contained" : "outlined"}
              className="room-lobby-mode-button"
              onClick={() => {
                setSuggestType("playlist");
                if (suggestError) {
                  setSuggestError(null);
                }
              }}
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
              onClick={() => {
                setSuggestType("collection");
                onCollectionScopeChange("public");
                setSuggestCollectionId(null);
                if (suggestError) {
                  setSuggestError(null);
                }
              }}
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
              onClick={() => {
                setSuggestType("collection");
                onCollectionScopeChange("owner");
                setSuggestCollectionId(null);
                if (suggestError) {
                  setSuggestError(null);
                }
              }}
              disabled={isSubmitting || !isGoogleAuthed}
            >
              私人收藏庫
            </Button>
            <Button
              size="small"
              variant={suggestType === "youtube" ? "contained" : "outlined"}
              className="room-lobby-mode-button"
              onClick={() => {
                setSuggestType("youtube");
                if (suggestError) {
                  setSuggestError(null);
                }
              }}
              disabled={isSubmitting}
            >
              我的播放清單
            </Button>
          </Stack>
          {suggestType === "playlist" && (
            <>
              <Typography variant="caption" className="text-slate-400">
                {suggestPlaylistPrimaryText}
              </Typography>
              <TextField
                size="small"
                value={suggestPlaylistUrl}
                onChange={(e) => {
                  setSuggestPlaylistUrl(e.target.value);
                  if (suggestError) {
                    setSuggestError(null);
                  }
                  if (suggestNotice && !isCooldownActive) {
                    setSuggestNotice(null);
                  }
                }}
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
                onChange={(e) => {
                  setSuggestCollectionId(
                    e.target.value ? e.target.value : null,
                  );
                  if (suggestError) {
                    setSuggestError(null);
                  }
                  if (suggestNotice && !isCooldownActive) {
                    setSuggestNotice(null);
                  }
                }}
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
                    return normalizeDisplayText(
                      selectedOption.title,
                      "未命名收藏庫",
                    );
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
                onChange={(e) => {
                  setSuggestYoutubePlaylistId(
                    e.target.value ? e.target.value : null,
                  );
                  if (suggestError) {
                    setSuggestError(null);
                  }
                  if (suggestNotice && !isCooldownActive) {
                    setSuggestNotice(null);
                  }
                }}
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
                    {normalizeDisplayText(playlist.title, "未命名播放清單")} ({playlist.itemCount})
                  </MenuItem>
                ))}
              </TextField>
            </>
          )}
          {suggestError && (
            <Typography variant="caption" className="text-rose-300">
              {suggestError}
            </Typography>
          )}
          {suggestType === "collection" && suggestCollectionId && (
            <Typography
              variant="caption"
              className={
                isSuggestCollectionPrivate
                  ? "text-amber-200"
                  : "text-emerald-300"
              }
            >
              {isSuggestCollectionPrivate
                ? "此推薦來自私人收藏庫，會以快照方式送出。"
                : "此推薦來自公開收藏庫，會以來源連結送出。"}
            </Typography>
          )}
          {(suggestNotice || isCooldownActive) && (
            <Typography variant="caption" className="text-emerald-300">
              {isCooldownActive
                ? `冷卻中，請等待 ${remainingCooldownSeconds}s 後再推薦。`
                : suggestNotice}
            </Typography>
          )}
          <Button
            size="small"
            variant="contained"
            disabled={
              isSubmitting ||
              isCooldownActive ||
              (suggestType === "playlist" && !suggestPlaylistUrl.trim()) ||
              (suggestType === "collection" && !suggestCollectionId) ||
              (suggestType === "youtube" && !suggestYoutubePlaylistId)
            }
            onClick={async () => {
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
                let result: { ok: boolean; error?: string } | null = null;
                if (suggestType === "playlist") {
                  const trimmed = suggestPlaylistUrl.trim();
                  const playlistId = extractPlaylistId(trimmed);
                  if (!playlistId) {
                    setSuggestError("請輸入有效的 YouTube 播放清單 URL");
                    setSuggestNotice(null);
                    return;
                  }
                  result = await onSuggestPlaylist("playlist", trimmed, {
                    useSnapshot: false,
                    sourceId: playlistId,
                  });
                } else if (suggestType === "youtube") {
                  if (!suggestYoutubePlaylistId) {
                    setSuggestError("請先選擇 YouTube 播放清單。");
                    setSuggestNotice(null);
                    return;
                  }
                  const selected = youtubePlaylists.find(
                    (playlist) => playlist.id === suggestYoutubePlaylistId,
                  );
                  result = await onSuggestPlaylist(
                    "playlist",
                    suggestYoutubePlaylistId,
                    {
                      useSnapshot: true,
                      sourceId: suggestYoutubePlaylistId,
                      title: selected?.title ?? null,
                    },
                  );
                } else if (suggestCollectionId) {
                  result = await onSuggestPlaylist(
                    "collection",
                    suggestCollectionId,
                    {
                      useSnapshot: isSuggestCollectionPrivate,
                      sourceId: suggestCollectionId,
                      title: selectedSuggestCollection?.title ?? null,
                    },
                  );
                }
                if (!result?.ok) {
                  setSuggestError(result?.error ?? "提交推薦失敗");
                  setSuggestNotice(null);
                  return;
                }
                setCooldownUntil(Date.now() + SUGGESTION_COOLDOWN_MS);
                setSuggestNotice("推薦已送出");
              } finally {
                setIsSubmitting(false);
              }
            }}
          >
            {isSubmitting
              ? "送出中..."
              : isCooldownActive
                ? `冷卻 ${Math.max(1, remainingCooldownSeconds)}s`
                : "推薦給房主"}
          </Button>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
};

interface RoomLobbyPanelProps {
  currentRoom: RoomState["room"] | null;
  participants: RoomParticipant[];
  messages: ChatMessage[];
  username: string | null;
  roomPassword?: string | null;
  messageInput: string;
  playlistItems: PlaylistItem[];
  playlistHasMore: boolean;
  playlistLoadingMore: boolean;
  playlistProgress: { received: number; total: number; ready: boolean };
  playlistSuggestions: PlaylistSuggestion[];
  playlistUrl: string;
  playlistItemsForChange: PlaylistItem[];
  playlistError?: string | null;
  playlistLoading?: boolean;
  collections: CollectionOption[];
  collectionsLoading: boolean;
  collectionsError: string | null;
  selectedCollectionId: string | null;
  collectionItemsLoading: boolean;
  collectionItemsError: string | null;
  isGoogleAuthed?: boolean;
  youtubePlaylists: YoutubePlaylist[];
  youtubePlaylistsLoading: boolean;
  youtubePlaylistsError: string | null;
  isHost: boolean;
  gameState?: GameState | null;
  canStartGame: boolean;
  hasLastSettlement?: boolean;
  onLeave: () => void;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onLoadMorePlaylist: () => void;
  onStartGame: () => void;
  onUpdateRoomSettings: (payload: {
    name?: string;
    visibility?: "public" | "private";
    password?: string | null;
    questionCount?: number;
    playDurationSec?: number;
    revealDurationSec?: number;
    startOffsetSec?: number;
    allowCollectionClipTiming?: boolean;
    maxPlayers?: number | null;
  }) => Promise<boolean>;
  onOpenLastSettlement?: () => void;
  onOpenSettlementByRoundKey?: (roundKey: string) => void;
  onOpenGame?: () => void;
  /** Invite handler that returns Promise<void>; surface errors via throw or status text */
  onInvite: () => Promise<void>;
  onKickPlayer: (clientId: string, durationMs?: number | null) => void;
  onTransferHost: (clientId: string) => void;
  onSuggestPlaylist: (
    type: "collection" | "playlist",
    value: string,
    options?: { useSnapshot?: boolean; sourceId?: string | null; title?: string | null },
  ) => Promise<{ ok: boolean; error?: string }>;
  onApplySuggestionSnapshot: (suggestion: PlaylistSuggestion) => Promise<void>;
  onChangePlaylist: () => Promise<void>;
  onPlaylistUrlChange: (value: string) => void;
  onFetchPlaylistByUrl: (url: string) => void;
  onFetchCollections: (scope?: "owner" | "public") => void;
  onSelectCollection: (collectionId: string | null) => void;
  onLoadCollectionItems: (
    collectionId: string,
    options?: { readToken?: string | null },
  ) => Promise<void>;
  onFetchYoutubePlaylists: () => void;
  onImportYoutubePlaylist: (playlistId: string) => Promise<void>;
}

const RoomLobbyPanel: React.FC<RoomLobbyPanelProps> = ({
  currentRoom,
  participants,
  messages,
  username,
  roomPassword,
  messageInput,
  playlistItems,
  playlistHasMore,
  playlistLoadingMore,
  playlistProgress,
  playlistSuggestions,
  playlistUrl,
  playlistItemsForChange,
  playlistError,
  playlistLoading = false,
  collections,
  collectionsLoading,
  collectionsError,
  selectedCollectionId,
  collectionItemsLoading,
  collectionItemsError,
  isGoogleAuthed = false,
  youtubePlaylists,
  youtubePlaylistsLoading,
  youtubePlaylistsError,
  isHost,
  gameState,
  canStartGame,
  hasLastSettlement = false,
  onLeave,
  onInputChange,
  onSend,
  onLoadMorePlaylist,
  onStartGame,
  onUpdateRoomSettings,
  onOpenLastSettlement,
  onOpenSettlementByRoundKey,
  onOpenGame,
  onInvite,
  onKickPlayer,
  onTransferHost,
  onSuggestPlaylist,
  onApplySuggestionSnapshot,
  onChangePlaylist,
  onPlaylistUrlChange,
  onFetchPlaylistByUrl,
  onFetchCollections,
  onSelectCollection,
  onLoadCollectionItems,
  onFetchYoutubePlaylists,
  onImportYoutubePlaylist,
}) => {
  const rowCount = playlistItems.length + (playlistHasMore ? 1 : 0);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [showRoomPassword, setShowRoomPassword] = useState(false);
  const [hostSourceType, setHostSourceType] = useState<
    "suggestions" | "playlist" | "collection" | "youtube"
  >("suggestions");
  const [selectedSuggestionKey, setSelectedSuggestionKey] = useState("");
  const [isApplyingHostSuggestion, setIsApplyingHostSuggestion] = useState(false);
  const [hostSuggestionHint, setHostSuggestionHint] = useState(
    "請先選擇來源並套用，開始前可隨時調整。",
  );
  const [collectionScope, setCollectionScope] = useState<"public" | "owner">(
    "public",
  );
  const lastRequestedScopeRef = useRef<"public" | "owner" | null>(null);
  const lastFetchedScopeRef = useRef<"public" | "owner" | null>(null);
  const lastRequestedYoutubeRef = useRef(false);
  const hasAttemptedYoutubeFetchRef = useRef(false);
  const [selectedYoutubePlaylistId, setSelectedYoutubePlaylistId] = useState<
    string | null
  >(null);
  const hostCollectionAutoRequestKeyRef = useRef<string | null>(null);
  const hostYoutubeAutoRequestedRef = useRef(false);
  const isCompactLobbyLayout = useMediaQuery("(max-width:1180px)");
  const isMobileLobbyLayout = useMediaQuery("(max-width:640px)");
  const isHostPanelCollapsible = false;
  const isHostPanelExpanded = true;
  const [lastSuggestionSeenAt, setLastSuggestionSeenAt] = useState(0);
  const [actionAnchorEl, setActionAnchorEl] = useState<HTMLElement | null>(
    null,
  );
  const [actionTargetId, setActionTargetId] = useState<string | null>(null);
  const confirmActionRef = useRef<null | (() => void)>(null);
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    detail?: string;
  } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsName, setSettingsName] = useState("");
  const [settingsVisibility, setSettingsVisibility] = useState<
    "public" | "private"
  >("public");
  const [settingsPassword, setSettingsPassword] = useState("");
  const [settingsPasswordDirty, setSettingsPasswordDirty] = useState(false);
  const [settingsQuestionCount, setSettingsQuestionCount] =
    useState(QUESTION_MIN);
  const [settingsPlayDurationSec, setSettingsPlayDurationSec] = useState(
    DEFAULT_PLAY_DURATION_SEC,
  );
  const [settingsRevealDurationSec, setSettingsRevealDurationSec] = useState(
    DEFAULT_REVEAL_DURATION_SEC,
  );
  const [settingsStartOffsetSec, setSettingsStartOffsetSec] = useState(
    DEFAULT_START_OFFSET_SEC,
  );
  const [settingsAllowCollectionClipTiming, setSettingsAllowCollectionClipTiming] =
    useState(true);
  const [settingsMaxPlayers, setSettingsMaxPlayers] = useState("");
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const maskedRoomPassword = roomPassword
    ? "*".repeat(roomPassword.length)
    : "";
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const playlistListContainerRef = useRef<HTMLDivElement | null>(null);
  const [playlistListHeight, setPlaylistListHeight] = useState(280);

  useEffect(() => {
    const container = chatScrollRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [messages.length]);

  useLayoutEffect(() => {
    const container = playlistListContainerRef.current;
    if (!container) return;

    const measure = () => {
      const next = Math.max(180, Math.floor(container.clientHeight));
      setPlaylistListHeight((prev) => (Math.abs(prev - next) <= 1 ? prev : next));
    };

    measure();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => {
        window.removeEventListener("resize", measure);
      };
    }

    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => {
      observer.disconnect();
    };
  }, [playlistItems.length, isCompactLobbyLayout, isMobileLobbyLayout]);

  const playlistListHeightCap = isMobileLobbyLayout
    ? 220
    : isCompactLobbyLayout
      ? 320
      : null;
  const playlistListViewportHeight =
    playlistListHeightCap === null
      ? playlistListHeight
      : Math.min(playlistListHeight, playlistListHeightCap);
  const playlistListShellClassName = isCompactLobbyLayout
    ? "min-h-0"
    : "min-h-0 flex-1";
  const playlistListShellStyle =
    playlistListHeightCap === null
      ? undefined
      : ({ maxHeight: playlistListHeightCap } as React.CSSProperties);
  const playlistLoadNotice = (() => {
    if (playlistLoading || collectionItemsLoading) {
      return "正在載入歌單資料...";
    }
    if (playlistError || collectionItemsError) {
      return `歌單載入失敗：${playlistError ?? collectionItemsError}`;
    }
    if (playlistItemsForChange.length === 0) {
      return null;
    }
    return `目前可用歌曲：${playlistItemsForChange.length} 首`;
  })();
  const hostPlaylistPrimaryText =
    "可貼上播放清單連結，或從收藏庫 / YouTube 匯入歌曲。";
  const isHostCollectionEmptyNotice =
    hostSourceType === "collection" &&
    !collectionsLoading &&
    collections.length === 0 &&
    !(collectionScope === "owner" && !isGoogleAuthed);
  const hostCollectionPrimaryText = (() => {
    const scopeLabel = collectionScope === "public" ? "公開" : "私人";
    if (collectionScope === "owner" && !isGoogleAuthed) {
      return "請先登入 Google 才能使用私人收藏庫。";
    }
    if (collectionsLoading) {
      return `正在讀取${scopeLabel}收藏庫...`;
    }
    if (collections.length === 0) {
      return `目前沒有可用的${scopeLabel}收藏庫。`;
    }
    return `請選擇要套用的${scopeLabel}收藏庫。`;
  })();
  const isHostYoutubeEmptyNotice =
    hostSourceType === "youtube" &&
    isGoogleAuthed &&
    !youtubePlaylistsLoading &&
    youtubePlaylists.length === 0 &&
    !youtubePlaylistsError;
  const isHostYoutubeMissingNotice =
    hostSourceType === "youtube" &&
    Boolean(
      youtubePlaylistsError &&
      (youtubePlaylistsError.toLowerCase().includes("youtube") ||
        youtubePlaylistsError.includes("YouTube")),
    );
  const visibleHostYoutubeError =
    youtubePlaylistsError && !isHostYoutubeMissingNotice
      ? youtubePlaylistsError
      : null;
  const hostYoutubePrimaryText = (() => {
    if (!isGoogleAuthed) {
      return "請先登入 Google 以載入 YouTube 播放清單。";
    }
    if (youtubePlaylistsLoading) {
      return "正在讀取 YouTube 播放清單...";
    }
    if (isHostYoutubeMissingNotice) {
      return "目前尚未取得可用的 YouTube 播放清單。";
    }
    if (youtubePlaylists.length === 0 && !youtubePlaylistsError) {
      return "你的帳號目前沒有可用的 YouTube 播放清單。";
    }
    return "可從 YouTube 播放清單選擇並套用到房間。";
  })();
  const questionMaxLimit = getQuestionMax(
    currentRoom?.playlist.totalCount ?? 0,
  );
  const questionMinLimit = Math.min(QUESTION_MIN, questionMaxLimit);
  const settingsDisabled = gameState?.status === "playing";
  const settingsSourceItems =
    playlistItemsForChange.length > 0 ? playlistItemsForChange : playlistItems;
  const settingsUseCollectionSource = settingsSourceItems.some(
    (item) =>
      item.provider === "collection" ||
      typeof item.collectionClipStartSec === "number" ||
      typeof item.collectionClipEndSec === "number" ||
      item.collectionHasExplicitStartSec === true ||
      item.collectionHasExplicitEndSec === true,
  );
  const useCollectionTimingForSettings =
    settingsUseCollectionSource && settingsAllowCollectionClipTiming;
  const [startCountdownNow, setStartCountdownNow] = useState(() => Date.now());
  useEffect(() => {
    if (gameState?.status !== "playing") return;
    const remainingMs = gameState.startedAt - Date.now();
    if (remainingMs <= 0) return;
    setStartCountdownNow(Date.now());
    const timer = window.setInterval(() => {
      setStartCountdownNow(Date.now());
    }, 250);
    return () => window.clearInterval(timer);
  }, [gameState?.startedAt, gameState?.status]);
  const startBroadcastRemainingSec =
    gameState?.status === "playing"
      ? Math.max(0, Math.ceil((gameState.startedAt - startCountdownNow) / 1000))
      : 0;
  const isStartBroadcastActive =
    gameState?.status === "playing" && startBroadcastRemainingSec > 0;
  const roomPlayDurationSec = clampPlayDurationSec(
    currentRoom?.gameSettings?.playDurationSec ?? DEFAULT_PLAY_DURATION_SEC,
  );
  const roomRevealDurationSec = clampRevealDurationSec(
    currentRoom?.gameSettings?.revealDurationSec ?? DEFAULT_REVEAL_DURATION_SEC,
  );
  const roomStartOffsetSec = clampStartOffsetSec(
    currentRoom?.gameSettings?.startOffsetSec ?? DEFAULT_START_OFFSET_SEC,
  );
  const roomAllowCollectionClipTiming =
    currentRoom?.gameSettings?.allowCollectionClipTiming ?? true;

  const extractPlaylistId = (url: string) => {
    try {
      const parsed = new URL(url.trim());
      const listId = parsed.searchParams.get("list");
      if (listId) return listId;
      const segments = parsed.pathname.split("/");
      const last = segments[segments.length - 1];
      return last || null;
    } catch {
      return null;
    }
  };
  const handlePlaylistPaste = (
    event: React.ClipboardEvent<HTMLInputElement>,
  ) => {
    const pasted = event.clipboardData.getData("text");
    if (!pasted) return;
    const trimmed = pasted.trim();
    if (!trimmed) return;
    openConfirmModal("確認匯入此播放清單？", trimmed, () => {
      onFetchPlaylistByUrl(trimmed);
    });
  };
  const isCollectionsEmptyNotice = Boolean(
    collectionsError &&
    (collectionsError.toLowerCase().includes("no collections") ||
      collectionsError.includes("沒有收藏庫")),
  );
  const visibleCollectionsError = React.useMemo(() => {
    if (!collectionsError || isCollectionsEmptyNotice) {
      return null;
    }
    return collectionsError;
  }, [collectionsError, isCollectionsEmptyNotice]);

  useEffect(() => {
    if (collectionsLoading) return;
    const requested = lastRequestedScopeRef.current;
    if (!requested) return;
    if (!collectionsError || isCollectionsEmptyNotice) {
      lastFetchedScopeRef.current = requested;
    }
  }, [collectionsError, collectionsLoading, isCollectionsEmptyNotice]);

  const shouldFetchCollections = React.useCallback(
    (scope: "public" | "owner") => {
      if (collectionsLoading) return false;
      if (collectionsError && !isCollectionsEmptyNotice) return true;
      if (lastFetchedScopeRef.current !== scope) return true;
      return false;
    },
    [collectionsError, collectionsLoading, isCollectionsEmptyNotice],
  );

  const requestCollections = React.useCallback(
    (scope: "public" | "owner") => {
      if (!shouldFetchCollections(scope)) return;
      lastRequestedScopeRef.current = scope;
      onFetchCollections(scope);
    },
    [onFetchCollections, shouldFetchCollections],
  );

  useEffect(() => {
    if (youtubePlaylistsLoading) return;
    if (!lastRequestedYoutubeRef.current) return;
    hasAttemptedYoutubeFetchRef.current = true;
  }, [youtubePlaylistsLoading]);

  const shouldFetchYoutube = React.useCallback(() => {
    if (!isGoogleAuthed || youtubePlaylistsLoading) return false;
    return !hasAttemptedYoutubeFetchRef.current;
  }, [isGoogleAuthed, youtubePlaylistsLoading]);

  const requestYoutubePlaylists = React.useCallback((force = false) => {
    if (!isGoogleAuthed) return;
    if (!force && !shouldFetchYoutube()) return;
    lastRequestedYoutubeRef.current = true;
    hasAttemptedYoutubeFetchRef.current = true;
    onFetchYoutubePlaylists();
  }, [isGoogleAuthed, onFetchYoutubePlaylists, shouldFetchYoutube]);

  useEffect(() => {
    if (isGoogleAuthed) return;
    lastRequestedYoutubeRef.current = false;
    hasAttemptedYoutubeFetchRef.current = false;
    hostYoutubeAutoRequestedRef.current = false;
  }, [isGoogleAuthed]);

  useEffect(() => {
    if (hostSourceType !== "collection") return;
    const requestKey = collectionScope;
    if (hostCollectionAutoRequestKeyRef.current === requestKey) return;
    hostCollectionAutoRequestKeyRef.current = requestKey;
    requestCollections(collectionScope);
  }, [collectionScope, hostSourceType, requestCollections]);

  useEffect(() => {
    if (hostSourceType !== "youtube") return;
    if (hostYoutubeAutoRequestedRef.current) return;
    hostYoutubeAutoRequestedRef.current = true;
    requestYoutubePlaylists();
  }, [hostSourceType, isGoogleAuthed, requestYoutubePlaylists]);

  useEffect(() => {
    if (hostSourceType !== "collection") {
      hostCollectionAutoRequestKeyRef.current = null;
    }
    if (hostSourceType !== "youtube") {
      hostYoutubeAutoRequestedRef.current = false;
    }
  }, [hostSourceType]);

  const latestSuggestionAt = playlistSuggestions.reduce(
    (max, suggestion) => Math.max(max, suggestion.suggestedAt),
    0,
  );
  const hostSuggestionApplyingRef = useRef(false);
  const lastHostSuggestionRequestRef = useRef<{
    key: string;
    at: number;
  } | null>(null);
  const HOST_SUGGESTION_REQUEST_GAP_MS = 1200;
  const getSuggestionKey = React.useCallback(
    (suggestion: PlaylistSuggestion) =>
      `${suggestion.clientId}-${suggestion.suggestedAt}`,
    [],
  );

  useEffect(() => {
    if (playlistSuggestions.length === 0) {
      setSelectedSuggestionKey("");
      setHostSuggestionHint("目前還沒有玩家提交歌單建議。");
      return;
    }
    setHostSuggestionHint("可套用玩家建議，並在開始前調整題庫。");
    setSelectedSuggestionKey((prev) => {
      if (!prev) return "";
      const stillExists = playlistSuggestions.some(
        (suggestion) => getSuggestionKey(suggestion) === prev,
      );
      return stillExists ? prev : "";
    });
  }, [getSuggestionKey, playlistSuggestions]);

  const markSuggestionsSeen = () => {
    if (latestSuggestionAt > 0) {
      setLastSuggestionSeenAt(latestSuggestionAt);
    }
  };
  const hasNewSuggestions =
    isHost &&
    !(isHostPanelExpanded && hostSourceType === "suggestions") &&
    latestSuggestionAt > lastSuggestionSeenAt;

  useEffect(() => {
    if (!isHost) return;
    if (isHostPanelCollapsible) return;
    if (hostSourceType !== "suggestions") return;
    if (latestSuggestionAt <= lastSuggestionSeenAt) return;
    setLastSuggestionSeenAt(latestSuggestionAt);
  }, [
    hostSourceType,
    isHost,
    isHostPanelCollapsible,
    lastSuggestionSeenAt,
    latestSuggestionAt,
  ]);

  const closeActionMenu = () => {
    setActionAnchorEl(null);
    setActionTargetId(null);
  };

  const openSettingsModal = () => {
    if (!currentRoom) return;
    setSettingsName(currentRoom.name);
    setSettingsVisibility(currentRoom.visibility ?? "public");
    setSettingsPassword(roomPassword ?? "");
    setSettingsPasswordDirty(false);
    const baseQuestion =
      currentRoom.gameSettings?.questionCount ?? QUESTION_MIN;
    setSettingsQuestionCount(
      clampQuestionCount(baseQuestion, questionMaxLimit),
    );
    const basePlayDurationSec =
      currentRoom.gameSettings?.playDurationSec ?? DEFAULT_PLAY_DURATION_SEC;
    const baseRevealDurationSec =
      currentRoom.gameSettings?.revealDurationSec ?? DEFAULT_REVEAL_DURATION_SEC;
    const baseStartOffsetSec =
      currentRoom.gameSettings?.startOffsetSec ?? DEFAULT_START_OFFSET_SEC;
    const baseAllowCollectionClipTiming =
      currentRoom.gameSettings?.allowCollectionClipTiming ?? true;
    setSettingsPlayDurationSec(clampPlayDurationSec(basePlayDurationSec));
    setSettingsRevealDurationSec(clampRevealDurationSec(baseRevealDurationSec));
    setSettingsStartOffsetSec(clampStartOffsetSec(baseStartOffsetSec));
    setSettingsAllowCollectionClipTiming(baseAllowCollectionClipTiming);
    setSettingsMaxPlayers(
      currentRoom.maxPlayers && currentRoom.maxPlayers > 0
        ? String(currentRoom.maxPlayers)
        : "",
    );
    setSettingsError(null);
    setSettingsOpen(true);
  };

  const closeSettingsModal = () => {
    setSettingsOpen(false);
    setSettingsError(null);
  };

  const handleSaveSettings = async () => {
    if (settingsDisabled) return;
    const trimmedName = settingsName.trim();
    if (!trimmedName) {
      setSettingsError("房間名稱不可為空。");
      return;
    }
    const parsedMaxPlayers = settingsMaxPlayers.trim()
      ? Number(settingsMaxPlayers)
      : null;
    if (parsedMaxPlayers !== null && !Number.isFinite(parsedMaxPlayers)) {
      setSettingsError("玩家上限必須是有效數字。");
      return;
    }
    const normalizedMaxPlayers =
      parsedMaxPlayers !== null ? Math.floor(parsedMaxPlayers) : null;
    const effectiveMaxPlayers =
      normalizedMaxPlayers && normalizedMaxPlayers > 0
        ? normalizedMaxPlayers
        : null;
    if (
      effectiveMaxPlayers !== null &&
      (effectiveMaxPlayers < PLAYER_MIN || effectiveMaxPlayers > PLAYER_MAX)
    ) {
      setSettingsError(`玩家上限需介於 ${PLAYER_MIN} - ${PLAYER_MAX} 之間。`);
      return;
    }

    const nextMaxPlayers = effectiveMaxPlayers;
    const nextQuestionCount = clampQuestionCount(
      settingsQuestionCount,
      questionMaxLimit,
    );
    const nextPlayDurationSec = clampPlayDurationSec(settingsPlayDurationSec);
    const nextRevealDurationSec = clampRevealDurationSec(settingsRevealDurationSec);
    const nextStartOffsetSec = clampStartOffsetSec(settingsStartOffsetSec);
    const payload = {
      name: trimmedName,
      visibility: settingsVisibility,
      questionCount: nextQuestionCount,
      playDurationSec: nextPlayDurationSec,
      revealDurationSec: nextRevealDurationSec,
      startOffsetSec: nextStartOffsetSec,
      allowCollectionClipTiming: settingsAllowCollectionClipTiming,
      maxPlayers: nextMaxPlayers,
      ...(settingsPasswordDirty ? { password: settingsPassword } : {}),
    };
    const success = await onUpdateRoomSettings(payload);
    if (success) {
      closeSettingsModal();
    }
  };

  const openConfirmModal = (title: string, detail: string | undefined, action: () => void) => {
    confirmActionRef.current = action;
    setConfirmModal({ title, detail });
  };

  const closeConfirmModal = () => {
    setConfirmModal(null);
    confirmActionRef.current = null;
  };

  const handleConfirmSwitch = () => {
    const action = confirmActionRef.current;
    closeConfirmModal();
    action?.();
  };

  const handleApplyHostSuggestion = async (suggestion: PlaylistSuggestion) => {
    const suggestionKey = getSuggestionKey(suggestion);
    const now = Date.now();
    const lastRequest = lastHostSuggestionRequestRef.current;
    if (hostSuggestionApplyingRef.current) {
      setHostSuggestionHint("正在套用建議中，請稍候...");
      return;
    }
    if (
      lastRequest &&
      lastRequest.key === suggestionKey &&
      now - lastRequest.at < HOST_SUGGESTION_REQUEST_GAP_MS
    ) {
      setHostSuggestionHint("你剛剛已點擊過這個建議，請稍候後再試。");
      return;
    }

    lastHostSuggestionRequestRef.current = { key: suggestionKey, at: now };
    hostSuggestionApplyingRef.current = true;
    setIsApplyingHostSuggestion(true);
    setHostSuggestionHint("正在套用房主建議...");

    try {
      const isSnapshot = Boolean(suggestion.items?.length);
      if (isSnapshot) {
        await onApplySuggestionSnapshot(suggestion);
        setHostSuggestionHint("已套用建議快照。");
        return;
      }

      if (suggestion.type === "playlist") {
        onFetchPlaylistByUrl(suggestion.value);
        setHostSuggestionHint("已開始匯入播放清單。");
        return;
      }

      onSelectCollection(suggestion.value);
      await onLoadCollectionItems(suggestion.value, {
        readToken: suggestion.readToken ?? null,
      });
      setHostSuggestionHint("已載入收藏庫內容。");
    } catch (error) {
      console.error(error);
      setHostSuggestionHint("套用建議失敗，請稍後再試。");
    } finally {
      window.setTimeout(() => {
        hostSuggestionApplyingRef.current = false;
        setIsApplyingHostSuggestion(false);
      }, HOST_SUGGESTION_REQUEST_GAP_MS);
    }
  };

  const requestApplyHostSuggestion = (suggestion: PlaylistSuggestion) => {
    const isSnapshot = Boolean(suggestion.items?.length);
    const displayLabel = suggestion.title ?? suggestion.value;
    openConfirmModal(
      suggestion.type === "playlist"
        ? "套用播放清單建議？"
        : "套用收藏庫建議？",
      displayLabel,
      () => {
        void handleApplyHostSuggestion(suggestion);
      },
    );
    setHostSuggestionHint(
      isSnapshot
        ? "此建議包含完整快照，套用後會直接覆蓋目前題庫。"
        : "確認後將以此建議更新房間題庫。",
    );
  };

  const suggestionResetKey =
    gameState?.status === "ended"
      ? `ended-${gameState?.startedAt ?? 0}`
      : "not-ended";

  const PlaylistRow = ({ index, style, ariaAttributes }: RowComponentProps) => {
    if (index >= playlistItems.length) {
      if (playlistHasMore && !playlistLoadingMore) {
        onLoadMorePlaylist();
      }
      return (
        <Box
          style={style}
          {...ariaAttributes}
          className="text-center text-slate-400 text-xs py-2"
        >
          {playlistHasMore ? "載入更多歌曲中..." : "已顯示全部歌曲"}
        </Box>
      );
    }

    const item = playlistItems[index];
    const displayTitle = normalizeDisplayText(item.title, `未命名歌曲 ${index + 1}`);
    const displayUploader = normalizeDisplayText(item.uploader ?? "", "Unknown");

    return (
      <div style={style}>
        <div className="room-lobby-playlist-row px-3 py-2 flex items-center gap-2 border-b border-slate-800/60">
          <div className="flex flex-1 min-w-0 items-center gap-2 overflow-x-hidden">
            <Avatar
              variant="rounded"
              src={item.thumbnail}
              sx={{
                bgcolor: "#1f2937",
                width: 56,
                height: 56,
                fontSize: 14,
                border: "1px solid rgba(148,163,184,0.18)",
                boxShadow:
                  "0 10px 22px -18px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.03)",
              }}
            >
              {index + 1}
            </Avatar>
            <div className="flex-1 min-w-0">
              <Typography
                variant="body2"
                className="max-w-99/100 truncate text-slate-400 "
              >
                <a
                  className="room-lobby-playlist-row-link text-slate-100 hover:text-sky-300 transition-colors duration-300"
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  title={displayTitle}
                >
                  {displayTitle}
                </a>
              </Typography>

              <p className="text-[11px] text-slate-400">
                {displayUploader}
                {item.duration ? ` · ${item.duration}` : ""}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card
      variant="outlined"
      className="w-full lg:w-4/5 bg-slate-900/70 border-slate-700 text-slate-50 room-lobby-card"
      sx={{
        height: isCompactLobbyLayout ? "auto" : "min(820px, calc(100dvh - 132px))",
        maxHeight: isCompactLobbyLayout ? "none" : 820,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <CardHeader
        title={
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="subtitle1" className="text-slate-100">
              {normalizeDisplayText(currentRoom?.name, "未命名房間")}
            </Typography>
            <Chip
              size="small"
              label={
                currentRoom?.maxPlayers
                  ? `${participants.length}/${currentRoom.maxPlayers} 人`
                  : `${participants.length} 人`
              }
              color="success"
              variant="outlined"
            />
            {isHost && currentRoom?.hasPassword && (
              <Box>
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  flexWrap="wrap"
                >
                  <Typography variant="subtitle2" className="text-slate-200">
                    房間密碼
                  </Typography>
                  {roomPassword ? (
                    <>
                      <TextField
                        size="small"
                        value={
                          showRoomPassword ? roomPassword : maskedRoomPassword
                        }
                        InputProps={{ readOnly: true }}
                        sx={{ minWidth: 180 }}
                      />
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => setShowRoomPassword((prev) => !prev)}
                      >
                        {showRoomPassword ? "隱藏" : "顯示"}
                      </Button>
                    </>
                  ) : (
                    <Typography variant="caption" className="text-slate-500">
                      此房間目前未設定密碼
                    </Typography>
                  )}
                </Stack>
              </Box>
            )}
          </Stack>
        }
        action={
          <Stack direction="row" spacing={1}>
            {hasLastSettlement && (
              <Button
                variant="outlined"
                color="inherit"
                size="small"
                onClick={() => onOpenLastSettlement?.()}
              >
                查看上一輪結算
              </Button>
            )}
            {gameState?.status === "playing" && (
              <Button
                variant="contained"
                color="success"
                size="small"
                onClick={() => onOpenGame?.()}
              >
                回到遊戲
              </Button>
            )}
            {isHost && (
              <Button
                variant="contained"
                color="warning"
                size="small"
                disabled={
                  !canStartGame ||
                  gameState?.status === "playing"
                }
                onClick={onStartGame}
              >
                {isStartBroadcastActive
                  ? `廣播中 ${startBroadcastRemainingSec}s`
                  : "開始遊戲"}
              </Button>
            )}
            {isHost && (
              <IconButton
                size="small"
                color="inherit"
                onClick={openSettingsModal}
              >
                <SettingsOutlinedIcon fontSize="small" />
              </IconButton>
            )}
            {isHost && (
              <Button
                variant="contained"
                color={inviteSuccess ? "success" : "info"}
                size="small"
                sx={{
                  transition: "color 150ms ease, box-shadow 150ms ease",
                  boxShadow: inviteSuccess ? 3 : "none",
                }}
                onClick={() => {
                  void (async () => {
                    try {
                      await onInvite();
                      setInviteSuccess(true);
                      setTimeout(() => setInviteSuccess(false), 1000);
                    } catch (e) {
                      console.log(e);
                    }
                  })();
                }}
              >
                {inviteSuccess ? "已複製" : "邀請"}
              </Button>
            )}
            {currentRoom && (
              <Button
                variant="outlined"
                color="inherit"
                size="small"
                onClick={onLeave}
              >
                離開
              </Button>
            )}
          </Stack>
        }
      />
      <CardContent
        className="room-lobby-content"
        sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 1.5 }}
      >
        <div className="room-lobby-top-grid">
          <Box className="room-lobby-participants">
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              flexWrap="wrap"
              mb={1}
            >
              <Typography variant="subtitle2" className="text-slate-200">
                房間設定
              </Typography>
              <Chip
                size="small"
                variant="outlined"
                label={`題數 ${currentRoom?.gameSettings?.questionCount ?? "-"}`}
                className="text-slate-200 border-slate-600"
              />
              <Chip
                size="small"
                variant="outlined"
                label={`公布答案 ${roomRevealDurationSec} 秒`}
                className="text-slate-200 border-slate-600"
              />
              {!roomAllowCollectionClipTiming && (
                <Chip
                  size="small"
                  variant="outlined"
                  label={`作答時間 ${roomPlayDurationSec} 秒`}
                  className="text-slate-200 border-slate-600"
                />
              )}
              {!roomAllowCollectionClipTiming && (
                <Chip
                  size="small"
                  variant="outlined"
                  label={`起始 ${roomStartOffsetSec} 秒`}
                  className="text-slate-200 border-slate-600"
                />
              )}
              <Chip
                size="small"
                variant="outlined"
                label={
                  roomAllowCollectionClipTiming
                    ? "收藏庫時間：開啟"
                    : "收藏庫時間：關閉"
                }
                className="text-slate-200 border-slate-600"
              />
              <Chip
                size="small"
                variant="outlined"
                label={`歌單 ${currentRoom?.playlist.totalCount ?? "-"} 首`}
                className="text-slate-200 border-slate-600"
              />
              <Chip
                size="small"
                variant="outlined"
                label={playlistProgress.ready ? "歌單已準備" : "歌單同步中"}
                className="text-slate-200 border-slate-600"
              />
              {currentRoom?.hasPassword && (
                <Chip
                  size="small"
                  variant="outlined"
                  label="有密碼"
                  className="text-slate-200 border-slate-600"
                />
              )}
              {currentRoom?.visibility === "private" && (
                <Chip
                  size="small"
                  variant="outlined"
                  label="私人"
                  className="text-slate-200 border-slate-600"
                />
              )}
            </Stack>

            <Typography
              variant="subtitle2"
              className="text-slate-200"
              gutterBottom
            >
              成員
            </Typography>
            {participants.length === 0 ? (
              <Typography variant="body2" className="text-slate-500">
                目前沒有其他人
              </Typography>
            ) : (
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {participants.map((p) => {
                  const isSelf = p.username === username;
                  const host = p.clientId === currentRoom?.hostClientId;
                  const isActionOpen =
                    Boolean(actionAnchorEl) && actionTargetId === p.clientId;
                  const showActions = isHost && !isSelf;
                  return (
                    <Box key={p.clientId} className="flex items-center gap-1">
                      <Chip
                        label={
                          <Stack
                            display={"flex"}
                            direction="row"
                            spacing={0.5}
                            alignItems="center"
                          >
                            <Badge
                              variant="dot"
                              color={p.isOnline ? "success" : "default"}
                              overlap="circular"
                            >
                              <Box className="h-1.5 w-1.5 rounded-full" />
                            </Badge>
                            <span>{p.username}</span>
                            {host && (
                              <span className="text-amber-200 text-[10px]">
                                房主
                              </span>
                            )}
                            {isSelf && (
                              <span className="opacity-80 text-[10px]">(我)</span>
                            )}
                            {showActions && (
                              <IconButton
                                size="small"
                                color="inherit"
                                sx={{
                                  width: 22,
                                  height: 22,
                                  borderRadius: "999px",
                                  "&:hover": {
                                    backgroundColor: "rgba(148,163,184,0.25)",
                                  },
                                }}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setActionAnchorEl(event.currentTarget);
                                  setActionTargetId(p.clientId);
                                }}
                              >
                                ...
                              </IconButton>
                            )}
                          </Stack>
                        }
                        variant="outlined"
                        color={isSelf ? "info" : "default"}
                        className={
                          isSelf
                            ? "text-sky-100 border-sky-500/60"
                            : "text-slate-200"
                        }
                      />
                      {showActions && (
                        <Popover
                          open={isActionOpen}
                          anchorEl={actionAnchorEl}
                          onClose={closeActionMenu}
                          anchorOrigin={{
                            vertical: "bottom",
                            horizontal: "left",
                          }}
                        >
                          <MUIList dense>
                            <ListItem>
                              <Button
                                size="small"
                                variant="text"
                                color="info"
                                disabled={!p.isOnline}
                                onClick={() => {
                                  onTransferHost(p.clientId);
                                  closeActionMenu();
                                }}
                              >
                                轉移房主
                              </Button>
                            </ListItem>
                            <ListItem>
                              <Button
                                size="small"
                                variant="text"
                                color="warning"
                                onClick={() => {
                                  onKickPlayer(p.clientId);
                                  closeActionMenu();
                                }}
                              >
                                踢出並封鎖
                              </Button>
                            </ListItem>
                            <ListItem>
                              <Button
                                size="small"
                                variant="text"
                                color="warning"
                                onClick={() => {
                                  onKickPlayer(p.clientId, null);
                                  closeActionMenu();
                                }}
                              >
                                踢出玩家
                              </Button>
                            </ListItem>
                          </MUIList>
                        </Popover>
                      )}
                    </Box>
                  );
                })}
              </Stack>
            )}
          </Box>

          {isHost && (
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
                  {gameState?.status === "playing" && (
                    <Typography variant="caption" className="text-slate-400">
                      遊戲進行中無法切換來源或套用新題庫。
                    </Typography>
                  )}
                  <Box className="room-lobby-host-controls">
                    <Stack
                      spacing={1}
                      className={`room-lobby-source-panel room-lobby-source-panel--host ${hostSourceType === "suggestions"
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
                            hostSourceType === "suggestions"
                              ? "contained"
                              : "outlined"
                          }
                          className="room-lobby-mode-button"
                          onClick={() => {
                            if (
                              isHostPanelExpanded &&
                              hostSourceType !== "suggestions"
                            ) {
                              markSuggestionsSeen();
                            }
                            setHostSourceType("suggestions");
                          }}
                        >
                          玩家推薦
                        </Button>
                        <Button
                          size="small"
                          variant={
                            hostSourceType === "playlist" ? "contained" : "outlined"
                          }
                          className="room-lobby-mode-button"
                          onClick={() => {
                            if (
                              isHostPanelExpanded &&
                              hostSourceType === "suggestions"
                            ) {
                              markSuggestionsSeen();
                            }
                            setHostSourceType("playlist");
                          }}
                        >
                          貼上連結
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
                            if (
                              isHostPanelExpanded &&
                              hostSourceType === "suggestions"
                            ) {
                              markSuggestionsSeen();
                            }
                            setHostSourceType("collection");
                            setCollectionScope("public");
                            onSelectCollection(null);
                          }}
                        >
                          公開收藏庫
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
                            if (
                              isHostPanelExpanded &&
                              hostSourceType === "suggestions"
                            ) {
                              markSuggestionsSeen();
                            }
                            setHostSourceType("collection");
                            setCollectionScope("owner");
                            onSelectCollection(null);
                          }}
                          disabled={!isGoogleAuthed}
                        >
                          私人收藏庫
                        </Button>
                        <Button
                          size="small"
                          variant={
                            hostSourceType === "youtube" ? "contained" : "outlined"
                          }
                          className="room-lobby-mode-button"
                          onClick={() => {
                            if (
                              isHostPanelExpanded &&
                              hostSourceType === "suggestions"
                            ) {
                              markSuggestionsSeen();
                            }
                            setHostSourceType("youtube");
                          }}
                        >
                          我的播放清單
                        </Button>
                      </Stack>

                      <Stack spacing={1} className="room-lobby-source-view">
                        {hostSourceType === "suggestions" && (
                          <Stack spacing={1}>
                            <Typography
                              variant="caption"
                              className={
                                isApplyingHostSuggestion
                                  ? "text-amber-200"
                                  : "text-slate-400"
                              }
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
                                    (suggestion) =>
                                      getSuggestionKey(suggestion) === key,
                                  );
                                  if (!selectedSuggestion) {
                                    return "建議已不存在";
                                  }
                                  const label =
                                    selectedSuggestion.title ??
                                    selectedSuggestion.value;
                                  const count =
                                    selectedSuggestion.totalCount ??
                                    selectedSuggestion.items?.length;
                                  return `${selectedSuggestion.username} · ${label}${count ? ` (${count})` : ""}`;
                                },
                              }}
                            >
                              <MenuItem value="">請選擇要套用的建議</MenuItem>
                              {playlistSuggestions.map((suggestion) => {
                                const optionKey = getSuggestionKey(suggestion);
                                const displayLabel =
                                  suggestion.title ?? suggestion.value;
                                const displayCount =
                                  suggestion.totalCount ?? suggestion.items?.length;
                                const sourceLabel =
                                  suggestion.type === "playlist" ? "播放清單" : "收藏庫";
                                const snapshotLabel = suggestion.items?.length
                                  ? " · 快照"
                                  : "";
                                return (
                                  <MenuItem key={optionKey} value={optionKey}>
                                    <Stack
                                      spacing={0.25}
                                      sx={{ width: "100%", minWidth: 0 }}
                                    >
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
                              onPaste={handlePlaylistPaste}
                              placeholder="貼上 YouTube 播放清單 URL"
                              disabled={
                                playlistLoading || gameState?.status === "playing"
                              }
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
                              <Typography
                                variant="caption"
                                className="text-slate-400"
                              >
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
                                const selected = collections.find(
                                  (item) => item.id === nextId,
                                );
                                const label = selected
                                  ? normalizeDisplayText(selected.title, "未命名收藏庫")
                                  : nextId;
                                openConfirmModal("套用這個收藏庫？", label, () => {
                                  onSelectCollection(nextId);
                                  void onLoadCollectionItems(nextId);
                                });
                              }}
                              disabled={
                                collectionsLoading || gameState?.status === "playing"
                              }
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
                                  return normalizeDisplayText(
                                    selectedOption.title,
                                    "未命名收藏庫",
                                  );
                                },
                              }}
                            >
                              <MenuItem value="">未選擇</MenuItem>
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
                                      熱門度{" "}
                                      {Math.max(0, Number(collection.use_count ?? 0))}
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
                                const selected = youtubePlaylists.find(
                                  (item) => item.id === nextId,
                                );
                                const label = selected
                                  ? `${normalizeDisplayText(selected.title, "未命名 YouTube 播放清單")} (${selected.itemCount})`
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
                                  {normalizeDisplayText(
                                    playlist.title,
                                    "未命名 YouTube 播放清單",
                                  )} ({playlist.itemCount})
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
                              playlistError || collectionItemsError
                                ? "text-rose-300"
                                : "text-slate-400"
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
                            playlistItemsForChange.length === 0 ||
                            playlistLoading ||
                            gameState?.status === "playing"
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
          )}

          {!isHost && gameState?.status !== "playing" && (
            <SuggestionPanel
              key={suggestionResetKey}
              collectionScope={collectionScope}
              onCollectionScopeChange={setCollectionScope}
              collections={collections}
              collectionsLoading={collectionsLoading}
              isGoogleAuthed={isGoogleAuthed}
              youtubePlaylists={youtubePlaylists}
              youtubePlaylistsLoading={youtubePlaylistsLoading}
              youtubePlaylistsError={youtubePlaylistsError}
              requestCollections={requestCollections}
              requestYoutubePlaylists={requestYoutubePlaylists}
              onSuggestPlaylist={onSuggestPlaylist}
              extractPlaylistId={extractPlaylistId}
            />
          )}
        </div>

        <Box
          className="room-lobby-chat-log"
          ref={chatScrollRef}
          sx={{
            flex: 1,
            border: "1px solid rgba(245,158,11,0.14)",
            borderRadius: 2,
            background:
              "radial-gradient(260px 160px at 8% 0%, rgba(245,158,11,0.05), transparent 70%), linear-gradient(180deg, rgba(8,12,19,0.92), rgba(6,10,16,0.9))",
            p: 1.5,
            maxHeight: "150px",
            overflowY: "auto",
            overflowX: "hidden",
          }}
        >
          {messages.length === 0 ? (
            <Typography
              variant="body2"
              className="text-slate-500"
              align="center"
            >
              尚無聊天訊息，輸入訊息開始互動吧。
            </Typography>
          ) : (
            <MUIList dense disablePadding>
              {messages.map((msg) => {
                // const isSelf = msg.username === username;
                const isPresenceSystemMessage = msg.userId === "system:presence";
                const settlementRoundKey =
                  msg.userId === "system:settlement-review" &&
                    msg.id.startsWith(SETTLEMENT_REVIEW_MESSAGE_ID_PREFIX)
                    ? msg.id.slice(SETTLEMENT_REVIEW_MESSAGE_ID_PREFIX.length)
                    : null;
                const canOpenSettlementReview = Boolean(
                  settlementRoundKey && onOpenSettlementByRoundKey,
                );
                if (isPresenceSystemMessage) {
                  return (
                    <ListItem key={msg.id} sx={{ justifyContent: "center" }}>
                      <Box
                        sx={{
                          mx: "auto",
                          maxWidth: "100%",
                          borderRadius: 999,
                          px: 1.25,
                          py: 0.5,
                          border: "1px solid rgba(148,163,184,0.18)",
                          background: "rgba(15,23,42,0.58)",
                          color: "rgba(226,232,240,0.9)",
                          fontSize: 11,
                          lineHeight: 1.35,
                        }}
                      >
                        <Box component="span" sx={{ color: "rgba(248,250,252,0.95)", fontWeight: 600 }}>
                          {msg.content}
                        </Box>
                        <Box component="span" sx={{ ml: 1, color: "rgba(148,163,184,0.85)" }}>
                          {formatTime(msg.timestamp)}
                        </Box>
                      </Box>
                    </ListItem>
                  );
                }
                return (
                  <ListItem
                    key={msg.id}
                    sx={
                      {
                        // justifyContent: isSelf ? "flex-end" : "flex-start",
                        // textAlign: isSelf ? "right" : "left",
                      }
                    }
                  >
                    <Box
                      className="room-lobby-chat-message"
                      sx={{
                        maxWidth: "100%",
                        borderRadius: 1,
                        px: 1,
                        py: 0.75,
                        border: "none",
                        borderLeft: "2px solid rgba(148,163,184,0.16)",
                        background: "transparent",
                        boxShadow: "none",
                        color: "white",
                        // whiteSpace: "wrap",
                      }}
                    >
                      <Stack
                        direction="row"
                        spacing={1}
                      // justifyContent="space-between"
                      >
                        <Typography variant="caption" fontWeight={600}>
                          {normalizeDisplayText(msg.username, "玩家")}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="rgba(255,255,255,0.7)"
                        >
                          {formatTime(msg.timestamp)}
                        </Typography>
                      </Stack>
                      <Typography
                        variant="body2"
                        sx={{
                          mt: 0.5,
                          overflowWrap: "anywhere",
                          wordBreak: "break-word",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {msg.content}
                      </Typography>
                      {canOpenSettlementReview && settlementRoundKey && (
                        <Button
                          size="small"
                          variant="outlined"
                          color="inherit"
                          sx={{ mt: 1, borderColor: "rgba(148,163,184,0.6)" }}
                          onClick={() =>
                            onOpenSettlementByRoundKey?.(settlementRoundKey)
                          }
                        >
                          查看結算
                        </Button>
                      )}
                    </Box>
                  </ListItem>
                );
              })}
            </MUIList>
          )}
        </Box>

        <Stack direction="row" spacing={1} className="room-lobby-chat-input">
          <TextField
            autoComplete="off"
            fullWidth
            size="small"
            placeholder="輸入聊天訊息，按 Enter 送出"
            value={messageInput}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onSend();
              }
            }}
          />
          <Button variant="contained" onClick={onSend}>
            送出
          </Button>
        </Stack>

        <Divider className="room-lobby-divider" />

        <Box className="room-lobby-playlist-panel">
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            mb={1}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="subtitle2" className="text-slate-200">
                房間歌單同步進度
              </Typography>
              <Chip
                size="small"
                variant="outlined"
                label={`${playlistProgress.received}/${playlistProgress.total}${playlistProgress.ready ? " 已準備" : ""}`}
                className="text-slate-200 border-slate-600"
              />
            </Stack>
          </Stack>
          {playlistItems.length === 0 ? (
            <div
              ref={playlistListContainerRef}
              className={playlistListShellClassName}
              style={playlistListShellStyle}
            >
              <div className="flex h-full min-h-[140px] items-center justify-center rounded border border-slate-800 bg-slate-900/60 px-3">
                <Typography
                  variant="body2"
                  className="text-slate-500"
                  align="center"
                >
                  目前歌單為空，請先選擇來源並匯入歌曲。
                </Typography>
              </div>
            </div>
          ) : (
            <div
              ref={playlistListContainerRef}
              className={playlistListShellClassName}
              style={playlistListShellStyle}
            >
              <div className="h-full min-h-0 w-full overflow-hidden rounded border border-slate-800 bg-slate-900/60">
                <VirtualList
                  style={{ height: playlistListViewportHeight, width: "100%" }}
                  rowCount={rowCount}
                  rowHeight={75}
                  rowProps={{}}
                  rowComponent={PlaylistRow}
                />
              </div>
            </div>
          )}
        </Box>
      </CardContent>
      <Dialog
        open={settingsOpen}
        onClose={closeSettingsModal}
        fullWidth
        maxWidth="lg"
        PaperProps={{
          sx: {
            borderRadius: 3,
            border: "1px solid rgba(56,189,248,0.28)",
            background:
              "radial-gradient(680px 240px at 12% 0%, rgba(56,189,248,0.12), transparent 70%), radial-gradient(520px 220px at 88% 0%, rgba(34,197,94,0.10), transparent 68%), linear-gradient(180deg, rgba(2,6,23,0.98), rgba(2,8,26,0.97))",
            boxShadow: "0 26px 72px -38px rgba(2,132,199,0.55)",
          },
        }}
      >
        <DialogTitle
          sx={{
            pb: 1.5,
            borderBottom: "1px solid rgba(56,189,248,0.18)",
          }}
        >
          <Stack spacing={1}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", sm: "center" }}
            >
              <Typography variant="h6" className="font-semibold text-slate-100">
                房主設定
              </Typography>
              <Stack direction="row" spacing={0.75} flexWrap="wrap">
                <Chip
                  size="small"
                  variant="outlined"
                  label={`題數 ${settingsQuestionCount}`}
                  className="border-slate-500/60 text-slate-200"
                />
                <Chip
                  size="small"
                  variant="outlined"
                  label={
                    useCollectionTimingForSettings
                      ? `收藏庫時間 / 揭曉 ${settingsRevealDurationSec}s`
                      : `${settingsPlayDurationSec}s / ${settingsStartOffsetSec}s / ${settingsRevealDurationSec}s`
                  }
                  className="border-cyan-500/40 text-cyan-200"
                />
              </Stack>
            </Stack>
            <Typography variant="caption" className="text-slate-400">
              調整房間規則與題庫節奏，儲存後立即套用到本房間。
            </Typography>
          </Stack>
        </DialogTitle>
        <DialogContent
          dividers
          sx={{
            borderColor: "rgba(56,189,248,0.16)",
            py: 2,
            maxHeight: {
              xs: "72vh",
              md: "78vh",
            },
            overflowY: "auto",
          }}
        >
          <Stack spacing={1.75}>
            {settingsDisabled && (
              <Box className="rounded-lg border border-amber-400/45 bg-amber-500/12 px-3 py-2">
                <Typography variant="caption" className="text-amber-200">
                  遊戲進行中時無法儲存設定；請於下一輪開始前調整。
                </Typography>
              </Box>
            )}
            <Box className="grid gap-1.75 lg:grid-cols-2">
              <Box className="rounded-xl border border-slate-700/70 bg-slate-950/55 p-3">
                <Stack spacing={1.25}>
                  <Typography variant="subtitle2" className="text-slate-100">
                    基本資料與權限
                  </Typography>
                  <TextField
                    label="房間名稱"
                    value={settingsName}
                    onChange={(e) => {
                      setSettingsName(e.target.value);
                      if (settingsError) {
                        setSettingsError(null);
                      }
                    }}
                    disabled={settingsDisabled}
                    fullWidth
                  />
                  <RoomAccessSettingsFields
                    visibility={settingsVisibility}
                    password={settingsPassword}
                    disabled={settingsDisabled}
                    allowPasswordWhenPublic
                    onVisibilityChange={(nextVisibility) => {
                      setSettingsVisibility(nextVisibility);
                      if (settingsError) {
                        setSettingsError(null);
                      }
                    }}
                    onPasswordChange={(value) => {
                      setSettingsPassword(value);
                      setSettingsPasswordDirty(true);
                      if (settingsError) {
                        setSettingsError(null);
                      }
                    }}
                    onPasswordClear={() => {
                      setSettingsPassword("");
                      setSettingsPasswordDirty(true);
                      if (settingsError) {
                        setSettingsError(null);
                      }
                    }}
                    classes={{
                      helperText: "text-slate-400",
                      noteText: "text-slate-400",
                    }}
                  />
                  <Stack spacing={0.75}>
                    <TextField
                      label="玩家上限"
                      type="number"
                      value={settingsMaxPlayers}
                      onChange={(e) => {
                        const next = e.target.value;
                        if (!/^\d*$/.test(next)) return;
                        setSettingsMaxPlayers(next);
                        if (settingsError) {
                          setSettingsError(null);
                        }
                      }}
                      inputProps={{ min: PLAYER_MIN, max: PLAYER_MAX, inputMode: "numeric" }}
                      placeholder="留空則使用房間預設"
                      disabled={settingsDisabled}
                      fullWidth
                    />
                    <Typography variant="caption" className="text-slate-400">
                      玩家上限可設定為 {PLAYER_MIN} - {PLAYER_MAX} 人
                    </Typography>
                  </Stack>
                </Stack>
              </Box>

              <Stack spacing={1.75} className="min-w-0">
                <Box className="rounded-xl border border-slate-700/70 bg-slate-950/55 p-3">
                  <Stack spacing={1.25}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="subtitle2" className="text-slate-100">
                        題數設定
                      </Typography>
                      <Chip
                        size="small"
                        variant="outlined"
                        label={`${settingsQuestionCount} 題`}
                        className="border-slate-600 text-slate-200"
                      />
                    </Stack>
                    <QuestionCountControls
                      value={settingsQuestionCount}
                      min={questionMinLimit}
                      max={questionMaxLimit}
                      step={QUESTION_STEP}
                      disabled={settingsDisabled}
                      onChange={(nextValue) => {
                        setSettingsQuestionCount(nextValue);
                        if (settingsError) {
                          setSettingsError(null);
                        }
                      }}
                    />
                  </Stack>
                </Box>

                <Box className="rounded-xl border border-slate-700/70 bg-slate-950/55 p-3">
                  <Stack spacing={1.25}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="subtitle2" className="text-slate-100">
                        時間設定
                      </Typography>
                      <Chip
                        size="small"
                        variant="outlined"
                        label={
                          useCollectionTimingForSettings
                            ? `揭曉 ${settingsRevealDurationSec}s（收藏庫片段）`
                            : `揭曉 ${settingsRevealDurationSec}s / 作答 ${settingsPlayDurationSec}s / 起始 ${settingsStartOffsetSec}s`
                        }
                        className="border-slate-600 text-slate-200"
                      />
                    </Stack>
                    <TextField
                      label="公布答案時間 (秒)"
                      type="number"
                      value={settingsRevealDurationSec}
                      onChange={(e) => {
                        const next = Number(e.target.value);
                        if (!Number.isFinite(next)) return;
                        setSettingsRevealDurationSec(next);
                        if (settingsError) {
                          setSettingsError(null);
                        }
                      }}
                      inputProps={{
                        min: REVEAL_DURATION_MIN,
                        max: REVEAL_DURATION_MAX,
                        inputMode: "numeric",
                      }}
                      disabled={settingsDisabled}
                      fullWidth
                    />
                    {settingsUseCollectionSource && (
                      <FormControlLabel
                        control={
                          <Switch
                            size="small"
                            checked={settingsAllowCollectionClipTiming}
                            onChange={(_event, checked) => {
                              setSettingsAllowCollectionClipTiming(checked);
                              if (settingsError) {
                                setSettingsError(null);
                              }
                            }}
                            disabled={settingsDisabled}
                          />
                        }
                        label="使用收藏庫設定的時間"
                      />
                    )}
                    {useCollectionTimingForSettings ? (
                      <Typography variant="caption" className="text-cyan-200/90">
                        已啟用收藏庫時間，作答時間與起始時間已隱藏。
                      </Typography>
                    ) : (
                      <Stack spacing={1}>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                          <TextField
                            label="作答時間設定"
                            type="number"
                            value={settingsPlayDurationSec}
                            onChange={(e) => {
                              const next = Number(e.target.value);
                              if (!Number.isFinite(next)) return;
                              setSettingsPlayDurationSec(next);
                              if (settingsError) {
                                setSettingsError(null);
                              }
                            }}
                            inputProps={{
                              min: PLAY_DURATION_MIN,
                              max: PLAY_DURATION_MAX,
                              inputMode: "numeric",
                            }}
                            disabled={settingsDisabled}
                            fullWidth
                          />
                          <TextField
                            label="起始時間 (秒)"
                            type="number"
                            value={settingsStartOffsetSec}
                            onChange={(e) => {
                              const next = Number(e.target.value);
                              if (!Number.isFinite(next)) return;
                              setSettingsStartOffsetSec(next);
                              if (settingsError) {
                                setSettingsError(null);
                              }
                            }}
                            inputProps={{
                              min: START_OFFSET_MIN,
                              max: START_OFFSET_MAX,
                              inputMode: "numeric",
                            }}
                            disabled={settingsDisabled}
                            fullWidth
                          />
                        </Stack>
                        <Typography variant="caption" className="text-slate-400">
                          若超過歌曲長度，系統會依據起始時間做循環裁切。
                        </Typography>
                      </Stack>
                    )}
                  </Stack>
                </Box>
              </Stack>
            </Box>
            {settingsError && (
              <Typography variant="caption" className="text-rose-300">
                {settingsError}
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions
          sx={{
            borderTop: "1px solid rgba(56,189,248,0.12)",
            px: 2.5,
            py: 1.5,
          }}
        >
          <Button onClick={closeSettingsModal} variant="text">
            取消
          </Button>
          <Button
            onClick={() => void handleSaveSettings()}
            variant="contained"
            disabled={settingsDisabled}
          >
            儲存
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={Boolean(confirmModal)} onClose={closeConfirmModal}>
        <DialogTitle>{confirmModal?.title ?? "切換播放清單"}</DialogTitle>
        <DialogContent>
          {confirmModal?.detail && (
            <Typography variant="body2" className="text-slate-600">
              {confirmModal.detail}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeConfirmModal} variant="text">
            取消
          </Button>
          <Button
            onClick={handleConfirmSwitch}
            variant="contained"
            color="warning"
          >
            切換
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default RoomLobbyPanel;
