import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
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
  IconButton,
  List as MUIList,
  ListItem,
  Popover,
  Stack,
  SwipeableDrawer,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import PersonAddAlt1RoundedIcon from "@mui/icons-material/PersonAddAlt1Rounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import HistoryEduRoundedIcon from "@mui/icons-material/HistoryEduRounded";
import SportsEsportsRoundedIcon from "@mui/icons-material/SportsEsportsRounded";
import ChatBubbleRoundedIcon from "@mui/icons-material/ChatBubbleRounded";
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
  QUESTION_MIN,
} from "../../model/roomConstants";
import RoomLobbyChatPanel from "./RoomLobbyChatPanel";
import RoomLobbyHostControls from "./RoomLobbyHostControls";
import RoomLobbySettingsDialog from "./RoomLobbySettingsDialog";
import RoomLobbySuggestionPanel from "./RoomLobbySuggestionPanel";
import useMobileDrawerDragDismiss from "./gameRoomPage/useMobileDrawerDragDismiss";
import type { CollectionOption } from "./roomLobbyPanelTypes";
import {
  normalizeDisplayText,
} from "./roomLobbyPanelUtils";

interface RoomLobbyPanelProps {
  currentRoom: RoomState["room"] | null;
  participants: RoomParticipant[];
  messages: ChatMessage[];
  selfClientId: string;
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
  latestSettlementRoundKey?: string | null;
  onOpenHistoryDrawer?: () => void;
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
  selfClientId,
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
  latestSettlementRoundKey,
  onOpenHistoryDrawer,
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
  const MOBILE_LOBBY_CHAT_MIN_HEIGHT_VH = 42;
  const MOBILE_LOBBY_CHAT_MAX_HEIGHT_VH = 78;
  const MOBILE_LOBBY_CHAT_DEFAULT_HEIGHT_VH = 50;
  type MobileLobbyTab = "members" | "host" | "playlist";
  const rowCount = playlistItems.length + (playlistHasMore ? 1 : 0);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [showRoomPassword, setShowRoomPassword] = useState(false);
  const [hostSourceType, setHostSourceType] = useState<
    "suggestions" | "playlist" | "collection" | "youtube"
  >("suggestions");
  const [selectedSuggestionKey, setSelectedSuggestionKey] = useState("");
  const [isApplyingHostSuggestion, setIsApplyingHostSuggestion] = useState(false);
  const [hostSuggestionHint, setHostSuggestionHint] = useState(
    "請選擇來源並套用歌單，變更會立即同步到房間。",
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
  const isMobileTabletLobbyLayout = useMediaQuery("(max-width:1024px)");
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
  const [mobileLobbyTab, setMobileLobbyTab] =
    useState<MobileLobbyTab>("members");
  const [mobileChatDrawerOpen, setMobileChatDrawerOpen] = useState(false);
  const [mobileChatUnread, setMobileChatUnread] = useState(0);
  const [mobileChatPreview, setMobileChatPreview] = useState<{
    username: string;
    content: string;
  } | null>(null);
  const [mobileChatHeight, setMobileChatHeight] = useState(
    MOBILE_LOBBY_CHAT_DEFAULT_HEIGHT_VH,
  );
  const lastMobileChatMessageCountRef = useRef(messages.length);
  const maskedRoomPassword = roomPassword
    ? "*".repeat(roomPassword.length)
    : "";
  const playlistListContainerRef = useRef<HTMLDivElement | null>(null);
  const [playlistListHeight, setPlaylistListHeight] = useState(280);

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
      return "正在載入可套用歌單...";
    }
    if (playlistError || collectionItemsError) {
      return `載入失敗：${playlistError ?? collectionItemsError}`;
    }
    if (playlistItemsForChange.length === 0) {
      return null;
    }
    return `已載入 ${playlistItemsForChange.length} 首可套用歌曲`;
  })();
  const hostPlaylistPrimaryText =
    "請先選擇來源，再將歌單套用到房間。支援玩家推薦、貼上連結、收藏庫與 YouTube。";
  const isHostCollectionEmptyNotice =
    hostSourceType === "collection" &&
    !collectionsLoading &&
    collections.length === 0 &&
    !(collectionScope === "owner" && !isGoogleAuthed);
  const hostCollectionPrimaryText = (() => {
    const scopeLabel = collectionScope === "public" ? "公開收藏庫" : "私人收藏庫";
    if (collectionScope === "owner" && !isGoogleAuthed) {
      return "請先連動 Google 帳號後再讀取私人收藏庫。";
    }
    if (collectionsLoading) {
      return `正在載入 ${scopeLabel}...`;
    }
    if (collections.length === 0) {
      return `${scopeLabel} 目前沒有可用清單。`;
    }
    return `已取得 ${scopeLabel}，可直接選擇並套用到房間。`;
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
      return "請先連動 Google 帳號，再讀取 YouTube 播放清單。";
    }
    if (youtubePlaylistsLoading) {
      return "正在載入 YouTube 播放清單...";
    }
    if (isHostYoutubeMissingNotice) {
      return "找不到可匯入的 YouTube 播放清單，請檢查連結與權限。";
    }
    if (youtubePlaylists.length === 0 && !youtubePlaylistsError) {
      return "目前沒有可匯入的 YouTube 播放清單。";
    }
    return "已取得 YouTube 播放清單，可直接選擇匯入。";
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
    openConfirmModal("要套用這個歌單連結嗎？", trimmed, () => {
      onFetchPlaylistByUrl(trimmed);
    });
  };
  const isCollectionsEmptyNotice = Boolean(
    collectionsError &&
    (collectionsError.toLowerCase().includes("no collections") ||
      collectionsError.includes("收藏庫")),
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
    setHostSuggestionHint("可選擇建議並一鍵套用到目前房間。");
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

  const openSettingsModal = React.useCallback(() => {
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
  }, [currentRoom, questionMaxLimit, roomPassword]);

  const closeSettingsModal = () => {
    setSettingsOpen(false);
    setSettingsError(null);
  };

  const handleSaveSettings = async () => {
    if (settingsDisabled) return;
    const trimmedName = settingsName.trim();
    if (!trimmedName) {
      setSettingsError("房間名稱不能為空");
      return;
    }
    const parsedMaxPlayers = settingsMaxPlayers.trim()
      ? Number(settingsMaxPlayers)
      : null;
    if (parsedMaxPlayers !== null && !Number.isFinite(parsedMaxPlayers)) {
      setSettingsError("最大人數必須是有效數字");
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
      setSettingsError(`最大人數需介於 ${PLAYER_MIN} - ${PLAYER_MAX}`);
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

  const openConfirmModal = React.useCallback(
    (title: string, detail: string | undefined, action: () => void) => {
      confirmActionRef.current = action;
      setConfirmModal({ title, detail });
    },
    [],
  );

  const closeConfirmModal = React.useCallback(() => {
    setConfirmModal(null);
    confirmActionRef.current = null;
  }, []);

  const handleConfirmSwitch = React.useCallback(() => {
    const action = confirmActionRef.current;
    closeConfirmModal();
    action?.();
  }, [closeConfirmModal]);

  const requestLeaveRoom = React.useCallback(() => {
    openConfirmModal(
      "要離開房間嗎？",
      "離開後會返回房間列表；若要再次加入，請重新使用邀請連結。",
      onLeave,
    );
  }, [onLeave, openConfirmModal]);

  const handleApplyHostSuggestion = async (suggestion: PlaylistSuggestion) => {
    const suggestionKey = getSuggestionKey(suggestion);
    const now = Date.now();
    const lastRequest = lastHostSuggestionRequestRef.current;
    if (hostSuggestionApplyingRef.current) {
      setHostSuggestionHint("正在套用建議，請稍候...");
      return;
    }
    if (
      lastRequest &&
      lastRequest.key === suggestionKey &&
      now - lastRequest.at < HOST_SUGGESTION_REQUEST_GAP_MS
    ) {
      setHostSuggestionHint("同一筆建議短時間內重複操作，請稍後再試。");
      return;
    }

    lastHostSuggestionRequestRef.current = { key: suggestionKey, at: now };
    hostSuggestionApplyingRef.current = true;
    setIsApplyingHostSuggestion(true);
    setHostSuggestionHint("正在套用建議...");

    try {
      const isSnapshot = Boolean(suggestion.items?.length);
      if (isSnapshot) {
        await onApplySuggestionSnapshot(suggestion);
        setHostSuggestionHint("已套用玩家提供的快照歌單。");
        return;
      }

      if (suggestion.type === "playlist") {
        onFetchPlaylistByUrl(suggestion.value);
        setHostSuggestionHint("已套用播放清單連結。");
        return;
      }

      onSelectCollection(suggestion.value);
      await onLoadCollectionItems(suggestion.value, {
        readToken: suggestion.readToken ?? null,
      });
      setHostSuggestionHint("已套用收藏庫建議。");
    } catch (error) {
      console.error(error);
      setHostSuggestionHint("套用建議失敗，請稍後重試。");
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
        ? "要套用這個播放清單連結嗎？"
        : "要套用這個收藏庫建議嗎？",
      displayLabel,
      () => {
        void handleApplyHostSuggestion(suggestion);
      },
    );
    setHostSuggestionHint(
      isSnapshot
        ? "將套用快照歌單，歌單內容會立即更新。"
        : "確認後會改用該建議來源，並同步更新房間歌單。",
    );
  };

  const suggestionResetKey =
    gameState?.status === "ended"
      ? `ended-${gameState?.startedAt ?? 0}`
      : "not-ended";

  const handleOpenPlaylistItem = React.useCallback((url?: string | null) => {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  const playlistRowProps = React.useMemo<Record<string, never>>(() => ({}), []);

  const PlaylistRow = React.useCallback(({ index, style, ariaAttributes }: RowComponentProps) => {
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
          {playlistHasMore ? "正在載入更多歌曲..." : "目前已載入全部歌曲"}
        </Box>
      );
    }

    const item = playlistItems[index];
    const canOpenItem = Boolean(item.url);
    const displayTitle = normalizeDisplayText(item.title, `歌曲 ${index + 1}`);
    const displayUploader = normalizeDisplayText(item.uploader ?? "", "Unknown");

    return (
      <div style={style}>
        <div
          className={`room-lobby-playlist-row px-3 py-2 flex items-center gap-2 border-b border-slate-800/60 ${
            canOpenItem ? "cursor-pointer" : ""
          }`}
          role={canOpenItem ? "button" : undefined}
          tabIndex={canOpenItem ? 0 : -1}
          onClick={() => handleOpenPlaylistItem(item.url)}
          onKeyDown={(event) => {
            if (!canOpenItem) return;
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            handleOpenPlaylistItem(item.url);
          }}
        >
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
                <span
                  className="room-lobby-playlist-row-link block w-full truncate text-left text-slate-100 hover:text-sky-300 transition-colors duration-300"
                >
                  {displayTitle}
                </span>
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
  }, [handleOpenPlaylistItem, onLoadMorePlaylist, playlistHasMore, playlistItems, playlistLoadingMore]);

  useEffect(() => {
    if (!isMobileTabletLobbyLayout) {
      setMobileChatDrawerOpen(false);
    }
  }, [isMobileTabletLobbyLayout]);

  const isUnreadMobileChatMessage = React.useCallback(
    (message: ChatMessage) =>
      !message.userId.startsWith("system:") && message.userId !== selfClientId,
    [selfClientId],
  );

  useEffect(() => {
    const previousCount = lastMobileChatMessageCountRef.current;
    if (messages.length < previousCount) {
      setMobileChatUnread(0);
      setMobileChatPreview(null);
    }
    if (
      isMobileTabletLobbyLayout &&
      !mobileChatDrawerOpen &&
      messages.length > previousCount
    ) {
      const unreadMessages = messages
        .slice(previousCount)
        .filter(isUnreadMobileChatMessage);
      if (unreadMessages.length > 0) {
        const latestMessage = unreadMessages[unreadMessages.length - 1];
        setMobileChatUnread((current) => current + unreadMessages.length);
        setMobileChatPreview({
          username: normalizeDisplayText(latestMessage.username, "玩家"),
          content:
            latestMessage.content.replace(/\s+/g, " ").trim() || "有新訊息",
        });
      }
    }
    lastMobileChatMessageCountRef.current = messages.length;
  }, [
    isMobileTabletLobbyLayout,
    isUnreadMobileChatMessage,
    messages,
    messages.length,
    mobileChatDrawerOpen,
  ]);

  useEffect(() => {
    if (!isMobileTabletLobbyLayout || mobileChatDrawerOpen) {
      setMobileChatUnread(0);
      setMobileChatPreview(null);
    }
  }, [isMobileTabletLobbyLayout, mobileChatDrawerOpen]);

  const startActionDisabledReason = !isHost
    ? "只有房主可以開始遊戲"
    : gameState?.status === "playing"
      ? "遊戲進行中"
      : !canStartGame
        ? "歌單尚未同步完成"
        : undefined;
  const settingsActionDisabledReason = !isHost
    ? "只有房主可以調整設定"
    : gameState?.status === "playing"
      ? "遊戲進行中不可更改"
      : undefined;
  const inviteActionDisabledReason = !isHost ? "只有房主可以邀請玩家" : undefined;

  const runInvite = React.useCallback(() => {
    if (!isHost) return;
    void (async () => {
      try {
        await onInvite();
        setInviteSuccess(true);
        setTimeout(() => setInviteSuccess(false), 1000);
      } catch (e) {
        console.log(e);
      }
    })();
  }, [isHost, onInvite]);

  const mobileChatDragDismiss = useMobileDrawerDragDismiss({
    open: mobileChatDrawerOpen,
    direction: "down",
    onDismiss: () => setMobileChatDrawerOpen(false),
    height: mobileChatHeight,
    minHeight: MOBILE_LOBBY_CHAT_MIN_HEIGHT_VH,
    maxHeight: MOBILE_LOBBY_CHAT_MAX_HEIGHT_VH,
    onHeightChange: (nextHeight) => {
      setMobileChatHeight(nextHeight);
    },
    threshold: 36,
  });

  const mobileActionButtons = useMemo(
    () => [
      {
        key: "settings",
        label: "房主設定",
        compactLabel: "設定",
        icon: <SettingsOutlinedIcon fontSize="small" />,
        onClick: openSettingsModal,
        disabled: Boolean(settingsActionDisabledReason),
        tone: "normal" as const,
        title: settingsActionDisabledReason ?? "調整房間設定",
      },
      {
        key: "invite",
        label: inviteSuccess ? "已複製" : "邀請",
        compactLabel: inviteSuccess ? "已複製" : "邀請",
        icon: <PersonAddAlt1RoundedIcon fontSize="small" />,
        onClick: runInvite,
        disabled: Boolean(inviteActionDisabledReason),
        tone: inviteSuccess ? ("success" as const) : ("info" as const),
        title: inviteActionDisabledReason ?? "複製邀請連結",
      },
      {
        key: "leave",
        label: "離開",
        compactLabel: "離開",
        icon: <LogoutRoundedIcon fontSize="small" />,
        onClick: requestLeaveRoom,
        disabled: false,
        tone: !isHost ? ("exitPrimary" as const) : ("normal" as const),
        title: "離開房間",
      },
    ],
    [
      inviteActionDisabledReason,
      inviteSuccess,
      isHost,
      openSettingsModal,
      requestLeaveRoom,
      runInvite,
      settingsActionDisabledReason,
    ],
  );
  const mobilePrimaryActions = useMemo(
    () => [
      ...(isHost && gameState?.status !== "playing"
        ? [
            {
              key: "start",
              label: isStartBroadcastActive
                ? `即將開始 ${startBroadcastRemainingSec}s`
                : "開始遊戲",
              icon: <PlayArrowRoundedIcon fontSize="small" />,
              onClick: onStartGame,
              disabled: Boolean(startActionDisabledReason),
              tone: "start" as const,
            },
          ]
        : []),
      ...(hasLastSettlement
        ? [
            {
              key: "history",
              label: "查看上一局",
              icon: <HistoryEduRoundedIcon fontSize="small" />,
              onClick: () => onOpenLastSettlement?.(),
              disabled: false,
              tone: "history" as const,
            },
          ]
        : []),
      ...(gameState?.status === "playing"
        ? [
            {
              key: "resume",
              label: "返回遊戲",
              icon: <SportsEsportsRoundedIcon fontSize="small" />,
              onClick: () => onOpenGame?.(),
              disabled: false,
              tone: "resume" as const,
            },
          ]
        : []),
    ],
    [
      gameState?.status,
      hasLastSettlement,
      isHost,
      isStartBroadcastActive,
      onOpenGame,
      onOpenLastSettlement,
      onStartGame,
      startActionDisabledReason,
      startBroadcastRemainingSec,
    ],
  );
  const desktopUtilityActions = useMemo(
    () => [
      ...(isHost
        ? [
            {
              key: "settings",
              label: "房主設定",
              icon: <SettingsOutlinedIcon fontSize="small" />,
              onClick: openSettingsModal,
              disabled: Boolean(settingsActionDisabledReason),
              tone: "normal" as const,
              title: settingsActionDisabledReason ?? "調整房間設定",
              variant: "outlined" as const,
            },
            {
              key: "invite",
              label: inviteSuccess ? "已複製" : "邀請",
              icon: <PersonAddAlt1RoundedIcon fontSize="small" />,
              onClick: runInvite,
              disabled: Boolean(inviteActionDisabledReason),
              tone: inviteSuccess ? ("success" as const) : ("info" as const),
              title: inviteActionDisabledReason ?? "複製邀請連結",
              variant: "contained" as const,
            },
          ]
        : []),
      {
        key: "leave",
        label: "離開",
        icon: <LogoutRoundedIcon fontSize="small" />,
        onClick: requestLeaveRoom,
        disabled: false,
        tone: !isHost ? ("exitPrimary" as const) : ("normal" as const),
        title: "離開房間",
        variant: "outlined" as const,
      },
    ],
    [
      inviteActionDisabledReason,
      inviteSuccess,
      isHost,
      requestLeaveRoom,
      openSettingsModal,
      runInvite,
      settingsActionDisabledReason,
    ],
  );
  const hasDesktopPrimaryAction =
    gameState?.status === "playing" || (isHost && gameState?.status !== "playing");
  const hasDesktopHistoryAction = Boolean(hasLastSettlement);
  const isSoloLeaveToolbar =
    !hasDesktopPrimaryAction &&
    !hasDesktopHistoryAction &&
    desktopUtilityActions.length === 1 &&
    desktopUtilityActions[0]?.key === "leave";

  const roomSettingChips = (
    <Stack
      direction="row"
      spacing={0.75}
      alignItems="center"
      flexWrap="wrap"
      className="room-lobby-room-meta"
    >
      <Chip
        size="small"
        variant="outlined"
        label={`題數 ${currentRoom?.gameSettings?.questionCount ?? "-"}`}
        className="text-slate-200 border-slate-600"
      />
      <Chip
        size="small"
        variant="outlined"
        label={`公布 ${roomRevealDurationSec}s`}
        className="text-slate-200 border-slate-600"
      />
      {!roomAllowCollectionClipTiming && (
        <Chip
          size="small"
          variant="outlined"
          label={`作答 ${roomPlayDurationSec}s`}
          className="text-slate-200 border-slate-600"
        />
      )}
      {!roomAllowCollectionClipTiming && (
        <Chip
          size="small"
          variant="outlined"
          label={`起始 ${roomStartOffsetSec}s`}
          className="text-slate-200 border-slate-600"
        />
      )}
      <Chip
        size="small"
        variant="outlined"
        label={roomAllowCollectionClipTiming ? "收藏庫時間 ON" : "收藏庫時間 OFF"}
        className="text-slate-200 border-slate-600"
      />
      <Chip
        size="small"
        variant="outlined"
        label={`曲目 ${currentRoom?.playlist.totalCount ?? "-"} 首`}
        className="text-slate-200 border-slate-600"
      />
      <Chip
        size="small"
        variant="outlined"
        label={playlistProgress.ready ? "同步完成" : "同步中"}
        className="text-slate-200 border-slate-600"
      />
      {currentRoom?.hasPassword && (
        <Chip
          size="small"
          variant="outlined"
          label="需密碼"
          className="text-slate-200 border-slate-600"
        />
      )}
      {currentRoom?.visibility === "private" && (
        <Chip
          size="small"
          variant="outlined"
          label="私人房"
          className="text-slate-200 border-slate-600"
        />
      )}
    </Stack>
  );

  const participantsPanel = (
    <Box className="room-lobby-participants">
      <Typography variant="subtitle2" className="text-slate-300" gutterBottom>
        玩家
      </Typography>
      {participants.length === 0 ? (
        <Typography variant="body2" className="text-slate-500">
          目前尚無玩家
        </Typography>
      ) : (
        <Stack direction="row" spacing={1} flexWrap="wrap">
          {participants.map((p) => {
            const isSelf = p.clientId === selfClientId;
            const host = p.clientId === currentRoom?.hostClientId;
            const isActionOpen =
              Boolean(actionAnchorEl) && actionTargetId === p.clientId;
            const showActions = isHost && !isSelf;
            const participantPingText =
              typeof p.pingMs === "number"
                ? `${Math.max(0, Math.round(p.pingMs))}ms`
                : p.isOnline
                  ? "在線"
                  : "--";
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
                      <span className="opacity-85 text-[10px]">
                        {participantPingText}
                      </span>
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
                          只踢出玩家
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
  );

  const hostPanel = isHost ? (
    <RoomLobbyHostControls
      isHostPanelExpanded={isHostPanelExpanded}
      hasNewSuggestions={hasNewSuggestions}
      playlistSuggestions={playlistSuggestions}
      gameStatus={gameState?.status}
      hostSourceType={hostSourceType}
      setHostSourceType={setHostSourceType}
      markSuggestionsSeen={markSuggestionsSeen}
      isApplyingHostSuggestion={isApplyingHostSuggestion}
      hostSuggestionHint={hostSuggestionHint}
      selectedSuggestionKey={selectedSuggestionKey}
      setSelectedSuggestionKey={setSelectedSuggestionKey}
      requestApplyHostSuggestion={requestApplyHostSuggestion}
      hostPlaylistPrimaryText={hostPlaylistPrimaryText}
      playlistUrl={playlistUrl}
      onPlaylistUrlChange={onPlaylistUrlChange}
      onPlaylistPaste={handlePlaylistPaste}
      isGoogleAuthed={isGoogleAuthed}
      collectionScope={collectionScope}
      setCollectionScope={setCollectionScope}
      onSelectCollection={onSelectCollection}
      selectedCollectionId={selectedCollectionId}
      collections={collections}
      collectionsLoading={collectionsLoading}
      collectionItemsLoading={collectionItemsLoading}
      isHostCollectionEmptyNotice={isHostCollectionEmptyNotice}
      hostCollectionPrimaryText={hostCollectionPrimaryText}
      visibleCollectionsError={visibleCollectionsError}
      collectionItemsError={collectionItemsError}
      onLoadCollectionItems={onLoadCollectionItems}
      isHostYoutubeEmptyNotice={isHostYoutubeEmptyNotice}
      isHostYoutubeMissingNotice={isHostYoutubeMissingNotice}
      hostYoutubePrimaryText={hostYoutubePrimaryText}
      visibleHostYoutubeError={visibleHostYoutubeError}
      youtubePlaylists={youtubePlaylists}
      youtubePlaylistsLoading={youtubePlaylistsLoading}
      selectedYoutubePlaylistId={selectedYoutubePlaylistId}
      setSelectedYoutubePlaylistId={setSelectedYoutubePlaylistId}
      onImportYoutubePlaylist={onImportYoutubePlaylist}
      openConfirmModal={openConfirmModal}
      playlistLoadNotice={playlistLoadNotice}
      playlistError={playlistError}
      playlistItemsForChangeLength={playlistItemsForChange.length}
      playlistLoading={playlistLoading}
      onChangePlaylist={onChangePlaylist}
    />
  ) : gameState?.status !== "playing" ? (
    <RoomLobbySuggestionPanel
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
  ) : null;

  const chatPanel = (
    <RoomLobbyChatPanel
      messages={messages}
      messageInput={messageInput}
      onInputChange={onInputChange}
      onSend={onSend}
      latestSettlementRoundKey={latestSettlementRoundKey}
      onOpenHistoryDrawer={onOpenHistoryDrawer}
      onOpenSettlementByRoundKey={onOpenSettlementByRoundKey}
    />
  );

  const playlistPanel = (
    <Box className="room-lobby-playlist-panel">
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={1}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="subtitle2" className="text-slate-200">
            房間歌單
          </Typography>
          <Chip
            size="small"
            variant="outlined"
            label={`${playlistProgress.received}/${playlistProgress.total}${playlistProgress.ready ? " 已同步" : ""}`}
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
              目前沒有可顯示的歌單內容。請先同步房間歌單或套用新的來源。
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
              rowProps={playlistRowProps}
              rowComponent={PlaylistRow}
            />
          </div>
        </div>
      )}
    </Box>
  );

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
          <Stack spacing={1} className="room-lobby-header-stack">
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
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
            </Stack>
            {roomSettingChips}
            {isHost && currentRoom?.hasPassword && (
              <Box>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                  <Typography variant="caption" className="text-slate-300">
                    房間密碼
                  </Typography>
                  {roomPassword ? (
                    <>
                      <TextField
                        size="small"
                        value={showRoomPassword ? roomPassword : maskedRoomPassword}
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
                      此私人房目前未設定密碼
                    </Typography>
                  )}
                </Stack>
              </Box>
            )}
          </Stack>
        }
        action={
          !isMobileTabletLobbyLayout ? (
            <div className="room-lobby-toolbar" role="toolbar" aria-label="房間操作">
              <div
                className={`room-lobby-toolbar-shell ${
                  isSoloLeaveToolbar ? "room-lobby-toolbar-shell--solo-leave" : ""
                }`}
              >
                <div className="room-lobby-toolbar-group room-lobby-toolbar-group--cta">
                  {gameState?.status === "playing" && (
                    <Button
                      variant="contained"
                      color="success"
                      size="small"
                      startIcon={<SportsEsportsRoundedIcon fontSize="small" />}
                      className="room-lobby-action-btn room-lobby-action-btn--desktop-main"
                      onClick={() => onOpenGame?.()}
                    >
                      返回遊戲
                    </Button>
                  )}
                  {isHost && gameState?.status !== "playing" && (
                    <Button
                      variant="contained"
                      color="inherit"
                      size="small"
                      startIcon={<PlayArrowRoundedIcon fontSize="small" />}
                      className="room-lobby-action-btn room-lobby-action-btn--desktop-main room-lobby-action-btn--start"
                      disabled={Boolean(startActionDisabledReason)}
                      title={startActionDisabledReason ?? "開始遊戲"}
                      onClick={onStartGame}
                    >
                      {isStartBroadcastActive
                        ? `即將開始 ${startBroadcastRemainingSec}s`
                        : "開始遊戲"}
                    </Button>
                  )}
                </div>
                <div className="room-lobby-toolbar-group room-lobby-toolbar-group--history">
                  {hasLastSettlement && (
                    <Button
                      variant="outlined"
                      color="inherit"
                      size="small"
                      startIcon={<HistoryEduRoundedIcon fontSize="small" />}
                      className="room-lobby-toolbar-secondary-btn"
                      onClick={() => onOpenLastSettlement?.()}
                    >
                      查看上一局
                    </Button>
                  )}
                </div>
                <div className="room-lobby-toolbar-group room-lobby-toolbar-group--utility">
                  {desktopUtilityActions.map((action) => (
                    <Button
                      key={action.key}
                      variant={action.variant}
                      color={
                        action.key === "invite"
                          ? "inherit"
                          : action.tone === "info"
                          ? "info"
                          : action.tone === "success"
                            ? "success"
                            : "inherit"
                      }
                      size="small"
                      className={`room-lobby-toolbar-utility-btn ${
                        action.key === "settings"
                          ? "room-lobby-toolbar-settings-btn"
                          : ""
                      } ${
                        action.key === "invite"
                          ? action.tone === "success"
                            ? "room-lobby-action-btn--invite-success"
                            : "room-lobby-action-btn--invite"
                          : ""
                      } ${
                        action.tone === "exitPrimary"
                          ? "room-lobby-action-btn--leave-primary"
                          : ""
                      }`}
                      disabled={action.disabled}
                      title={action.title}
                      startIcon={action.icon}
                      aria-label={
                        action.key === "settings" ? "開啟房主設定" : undefined
                      }
                      onClick={action.onClick}
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ) : null
        }
      />
      <CardContent
        className={`room-lobby-content ${
          isMobileTabletLobbyLayout ? "room-lobby-content--mobile-redesign" : ""
        }`}
        sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 1.5 }}
      >
        {isMobileTabletLobbyLayout ? (
          <>
            <div className="room-lobby-mobile-shell">
              <div className="room-lobby-mobile-top-actions">
                <div className="room-lobby-mobile-actions-card">
                  <div className="room-lobby-mobile-actions-head">
                    <span className="room-lobby-mobile-actions-kicker">Quick Access</span>
                  </div>
                  {mobilePrimaryActions.length > 0 && (
                    <div
                      className={`room-lobby-mobile-primary-actions ${
                        mobilePrimaryActions.length === 1
                          ? "room-lobby-mobile-primary-actions--single"
                          : ""
                      }`}
                    >
                      {mobilePrimaryActions.map((action) => (
                        <Button
                          key={action.key}
                          variant={action.tone === "history" ? "outlined" : "contained"}
                          color={action.tone === "resume" ? "success" : "inherit"}
                          size="small"
                          startIcon={action.icon}
                          className={`room-lobby-action-btn room-lobby-action-btn--mobile room-lobby-mobile-primary-action ${
                            action.tone === "start"
                              ? "room-lobby-action-btn--start"
                              : action.tone === "history"
                                ? "room-lobby-mobile-primary-action--history"
                                : "room-lobby-mobile-primary-action--resume"
                          }`}
                          onClick={action.onClick}
                          disabled={action.disabled}
                        >
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  )}
                  <div className="room-lobby-mobile-secondary-actions">
                    {mobileActionButtons.map((action) => (
                      <Button
                        key={`mobile-${action.key}`}
                        variant={action.key === "leave" ? "outlined" : "contained"}
                        color="inherit"
                        className={`room-lobby-action-btn room-lobby-action-btn--mobile room-lobby-mobile-secondary-action ${
                          action.key === "invite"
                            ? action.tone === "success"
                              ? "room-lobby-action-btn--invite-success"
                              : "room-lobby-action-btn--invite"
                            : ""
                        } ${
                          action.tone === "exitPrimary"
                            ? "room-lobby-action-btn--leave-primary"
                            : ""
                        }`}
                        disabled={action.disabled}
                        title={action.title}
                        onClick={action.onClick}
                      >
                        <span className="room-lobby-mobile-secondary-action__icon">
                          {action.icon}
                        </span>
                        <span className="room-lobby-mobile-secondary-action__label">
                          {action.compactLabel}
                        </span>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="room-lobby-mobile-tabs" role="tablist" aria-label="房間分頁">
                <button
                  type="button"
                  role="tab"
                  aria-selected={mobileLobbyTab === "members"}
                  className={`room-lobby-mobile-tab ${
                    mobileLobbyTab === "members" ? "is-active" : ""
                  }`}
                  onClick={() => setMobileLobbyTab("members")}
                >
                  玩家
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mobileLobbyTab === "host"}
                  className={`room-lobby-mobile-tab ${
                    mobileLobbyTab === "host" ? "is-active" : ""
                  }`}
                  onClick={() => setMobileLobbyTab("host")}
                >
                  操作
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mobileLobbyTab === "playlist"}
                  className={`room-lobby-mobile-tab ${
                    mobileLobbyTab === "playlist" ? "is-active" : ""
                  }`}
                  onClick={() => setMobileLobbyTab("playlist")}
                >
                  曲目
                </button>
              </div>
              <div className="room-lobby-mobile-panel">
                {mobileLobbyTab === "members" && participantsPanel}
                {mobileLobbyTab === "host" &&
                  (hostPanel ?? (
                    <div className="room-lobby-mobile-empty-panel">
                      <Typography variant="body2" className="text-slate-400">
                        目前沒有可顯示的主持內容。
                      </Typography>
                    </div>
                  ))}
                {mobileLobbyTab === "playlist" && playlistPanel}
              </div>
            </div>
            <div className="room-lobby-mobile-chat-trigger-wrap">
              <Button
                variant="outlined"
                color="info"
                fullWidth
                onClick={() => setMobileChatDrawerOpen(true)}
              >
                <span className="room-lobby-mobile-chat-trigger-copy">
                  <span>開啟聊天室</span>
                  {mobileChatUnread > 0 ? (
                    <span className="room-lobby-mobile-chat-trigger-count">
                      {mobileChatUnread > 99 ? "99+" : mobileChatUnread}
                    </span>
                  ) : null}
                </span>
              </Button>
            </div>
            <SwipeableDrawer
              className="room-lobby-mobile-chat-drawer-root"
              anchor="bottom"
              open={mobileChatDrawerOpen}
              onOpen={() => setMobileChatDrawerOpen(true)}
              onClose={() => setMobileChatDrawerOpen(false)}
              disableSwipeToOpen={false}
              allowSwipeInChildren
              swipeAreaWidth={26}
              ModalProps={{
                keepMounted: true,
                hideBackdrop: true,
                disableAutoFocus: true,
                disableEnforceFocus: true,
                disableRestoreFocus: true,
                disableScrollLock: true,
              }}
              PaperProps={{
                className: "room-lobby-mobile-chat-drawer-paper",
                style: mobileChatDragDismiss.paperStyle,
              }}
            >
              <div className="room-lobby-mobile-chat-drawer">
                <div
                  className="room-lobby-mobile-chat-drawer-head"
                  role="presentation"
                  aria-label="向下拖曳收合聊天室"
                  {...mobileChatDragDismiss.dragHandleProps}
                >
                  <div
                    className="game-room-mobile-drawer-handle-wrap game-room-mobile-drawer-handle-wrap--draggable"
                    aria-hidden="true"
                  >
                    <span className="game-room-mobile-drawer-handle-bar" />
                    <span className="game-room-mobile-drawer-handle-direction">
                      向下拖曳收合
                    </span>
                  </div>
                  <div className="room-lobby-mobile-chat-drawer-headline">
                    <Typography variant="subtitle2" className="text-slate-100">
                      房間聊天室
                    </Typography>
                    <Button
                      size="small"
                      variant="text"
                      color="inherit"
                      onClick={() => setMobileChatDrawerOpen(false)}
                    >
                      收合
                    </Button>
                  </div>
                </div>
                <div className="room-lobby-mobile-chat-drawer-body">
                  {chatPanel}
                </div>
              </div>
            </SwipeableDrawer>
            {!mobileChatDrawerOpen && mobileChatUnread > 0 && mobileChatPreview ? (
              <button
                type="button"
                className="room-lobby-mobile-chat-fab"
                onClick={() => setMobileChatDrawerOpen(true)}
                aria-label={`開啟聊天室，目前有 ${mobileChatUnread} 則未讀訊息`}
              >
                <span className="room-lobby-mobile-chat-fab__badge">
                  未讀 {mobileChatUnread > 99 ? "99+" : mobileChatUnread}
                </span>
                <span className="room-lobby-mobile-chat-fab__sender">
                  <ChatBubbleRoundedIcon fontSize="inherit" />
                  {mobileChatPreview.username}
                </span>
                <span className="room-lobby-mobile-chat-fab__message">
                  {mobileChatPreview.content}
                </span>
              </button>
            ) : null}
          </>
        ) : (
          <>
            <div className="room-lobby-top-grid">
              {participantsPanel}
              {hostPanel}
            </div>

            {chatPanel}

            <Divider className="room-lobby-divider" />

            {playlistPanel}
          </>
        )}
      </CardContent>
      <RoomLobbySettingsDialog
        open={settingsOpen}
        settingsDisabled={settingsDisabled}
        settingsName={settingsName}
        onSettingsNameChange={(value) => {
          setSettingsName(value);
          if (settingsError) {
            setSettingsError(null);
          }
        }}
        settingsVisibility={settingsVisibility}
        settingsPassword={settingsPassword}
        onSettingsVisibilityChange={(nextVisibility) => {
          setSettingsVisibility(nextVisibility);
          if (settingsError) {
            setSettingsError(null);
          }
        }}
        onSettingsPasswordChange={(value) => {
          setSettingsPassword(value);
          setSettingsPasswordDirty(true);
          if (settingsError) {
            setSettingsError(null);
          }
        }}
        onSettingsPasswordClear={() => {
          setSettingsPassword("");
          setSettingsPasswordDirty(true);
          if (settingsError) {
            setSettingsError(null);
          }
        }}
        settingsMaxPlayers={settingsMaxPlayers}
        onSettingsMaxPlayersChange={(value) => {
          if (!/^\d*$/.test(value)) return;
          setSettingsMaxPlayers(value);
          if (settingsError) {
            setSettingsError(null);
          }
        }}
        settingsQuestionCount={settingsQuestionCount}
        questionMinLimit={questionMinLimit}
        questionMaxLimit={questionMaxLimit}
        onSettingsQuestionCountChange={(value) => {
          setSettingsQuestionCount(value);
          if (settingsError) {
            setSettingsError(null);
          }
        }}
        settingsRevealDurationSec={settingsRevealDurationSec}
        onSettingsRevealDurationSecChange={(value) => {
          setSettingsRevealDurationSec(value);
          if (settingsError) {
            setSettingsError(null);
          }
        }}
        settingsUseCollectionSource={settingsUseCollectionSource}
        settingsAllowCollectionClipTiming={settingsAllowCollectionClipTiming}
        onSettingsAllowCollectionClipTimingChange={(value) => {
          setSettingsAllowCollectionClipTiming(value);
          if (settingsError) {
            setSettingsError(null);
          }
        }}
        useCollectionTimingForSettings={useCollectionTimingForSettings}
        settingsPlayDurationSec={settingsPlayDurationSec}
        onSettingsPlayDurationSecChange={(value) => {
          setSettingsPlayDurationSec(value);
          if (settingsError) {
            setSettingsError(null);
          }
        }}
        settingsStartOffsetSec={settingsStartOffsetSec}
        onSettingsStartOffsetSecChange={(value) => {
          setSettingsStartOffsetSec(value);
          if (settingsError) {
            setSettingsError(null);
          }
        }}
        settingsError={settingsError}
        onClose={closeSettingsModal}
        onSave={() => void handleSaveSettings()}
      />
      <Dialog
        open={Boolean(confirmModal)}
        onClose={closeConfirmModal}
        PaperProps={{
          sx: {
            borderRadius: 3,
            border: "1px solid rgba(56, 189, 248, 0.32)",
            color: "#f8fafc",
            background:
              "radial-gradient(900px 420px at -8% -18%, rgba(56,189,248,0.20), transparent 62%), linear-gradient(180deg, rgba(2,6,23,0.98), rgba(2,6,23,0.92))",
            boxShadow:
              "0 34px 88px -44px rgba(2,6,23,0.95), 0 0 0 1px rgba(255,255,255,0.03)",
          },
        }}
      >
        <DialogTitle className="!pb-2 !text-base !font-extrabold !text-slate-50">
          {confirmModal?.title ?? "確認操作"}
        </DialogTitle>
        <DialogContent className="!pt-0">
          {confirmModal?.detail && (
            <Typography variant="body2" className="text-slate-100">
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
            確認
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default RoomLobbyPanel;

