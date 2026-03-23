import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List as MUIList,
  ListItem,
  Popover,
  Stack,
  SwipeableDrawer,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useCallback } from "react";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import PersonAddAlt1RoundedIcon from "@mui/icons-material/PersonAddAlt1Rounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import HistoryEduRoundedIcon from "@mui/icons-material/HistoryEduRounded";
import SportsEsportsRoundedIcon from "@mui/icons-material/SportsEsportsRounded";
import ChatBubbleRoundedIcon from "@mui/icons-material/ChatBubbleRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import LibraryMusicRoundedIcon from "@mui/icons-material/LibraryMusicRounded";
import PlaylistPlayRoundedIcon from "@mui/icons-material/PlaylistPlayRounded";
import QuizRoundedIcon from "@mui/icons-material/QuizRounded";
import TimerRoundedIcon from "@mui/icons-material/TimerRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import KeyRoundedIcon from "@mui/icons-material/KeyRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import MoreHorizRoundedIcon from "@mui/icons-material/MoreHorizRounded";
import { List as VirtualList, type RowComponentProps } from "react-window";
import type {
  ChatMessage,
  GameState,
  PlaylistItem,
  PlaybackExtensionMode,
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
import { normalizePlaybackExtensionMode } from "../../model/roomProviderUtils";
import {
  DEFAULT_PLAYBACK_EXTENSION_MODE,
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
import { useGameSfx } from "../hooks/useGameSfx";
import {
  DEFAULT_GAME_VOLUME,
  DEFAULT_SFX_ENABLED,
  DEFAULT_SFX_PRESET,
  DEFAULT_SFX_VOLUME,
  SettingsModelContext,
} from "../../../Setting/model/settingsContext";
import type { CollectionOption } from "./roomLobbyPanelTypes";
import { normalizeDisplayText } from "./roomLobbyPanelUtils";

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
    playbackExtensionMode?: PlaybackExtensionMode;
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

const ROOM_CHAT_LAST_READ_MESSAGE_KEY_PREFIX = "mq_room_chat_last_read_message:";

const readRoomChatLastReadMessageId = (roomId: string | null): string | null => {
  if (!roomId || typeof window === "undefined") return null;
  const stored = window.sessionStorage.getItem(
    `${ROOM_CHAT_LAST_READ_MESSAGE_KEY_PREFIX}${roomId}`,
  );
  return stored?.trim() ? stored : null;
};

const writeRoomChatLastReadMessageId = (
  roomId: string | null,
  messageId: string | null,
) => {
  if (!roomId || typeof window === "undefined") return;
  const storageKey = `${ROOM_CHAT_LAST_READ_MESSAGE_KEY_PREFIX}${roomId}`;
  if (!messageId) {
    window.sessionStorage.removeItem(storageKey);
    return;
  }
  window.sessionStorage.setItem(storageKey, messageId);
};

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
  onLeave,
  onInputChange,
  onSend,
  onLoadMorePlaylist,
  onStartGame,
  onUpdateRoomSettings,
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
  const MOBILE_LOBBY_CHAT_MIN_HEIGHT_VH = 36;
  const MOBILE_LOBBY_CHAT_MAX_HEIGHT_VH = 72;
  const MOBILE_LOBBY_CHAT_DEFAULT_HEIGHT_VH = 44;
  type MobileLobbyTab = "members" | "host" | "playlist";
  const LOBBY_INTERACTIVE_SELECTOR =
    "button, [role='button'], [role='tab'], .MuiButtonBase-root";
  const rowCount = playlistItems.length + (playlistHasMore ? 1 : 0);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [roomCodeCopied, setRoomCodeCopied] = useState(false);
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
  const settingsModel = React.useContext(SettingsModelContext);
  const gameVolume = settingsModel?.gameVolume ?? DEFAULT_GAME_VOLUME;
  const sfxEnabled = settingsModel?.sfxEnabled ?? DEFAULT_SFX_ENABLED;
  const sfxVolume = settingsModel?.sfxVolume ?? DEFAULT_SFX_VOLUME;
  const sfxPreset = settingsModel?.sfxPreset ?? DEFAULT_SFX_PRESET;
  const { primeSfxAudio, playGameSfx } = useGameSfx({
    enabled: sfxEnabled,
    volume: Math.round((sfxVolume * gameVolume) / 100),
    preset: sfxPreset,
  });
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
  const [settingsPlaybackExtensionMode, setSettingsPlaybackExtensionMode] =
    useState<PlaybackExtensionMode>(DEFAULT_PLAYBACK_EXTENSION_MODE);
  const [settingsMaxPlayers, setSettingsMaxPlayers] = useState("");
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const formattedRoomCode = currentRoom?.roomCode
    ? `${currentRoom.roomCode.slice(0, 3)}-${currentRoom.roomCode.slice(3)}`
    : null;
  const [mobileLobbyTab, setMobileLobbyTab] =
    useState<MobileLobbyTab>("members");
  const [mobileChatDrawerOpen, setMobileChatDrawerOpen] = useState(false);
  const [mobileChatUnread, setMobileChatUnread] = useState(0);
  const lastLobbyHoverAtRef = useRef(0);
  const lastLobbyHoverTargetRef = useRef<HTMLElement | null>(null);
  const [mobileChatHeight, setMobileChatHeight] = useState(
    MOBILE_LOBBY_CHAT_DEFAULT_HEIGHT_VH,
  );
  const lastUnreadMobileChatMessageIdRef = useRef<string | null>(null);
  const mobileChatUnreadSeededRoomRef = useRef<string | null>(null);
  const maskedRoomPassword = roomPassword
    ? "*".repeat(roomPassword.length)
    : "";
  const playlistRowHeight = isMobileLobbyLayout ? 72 : 84;
  const desktopPlaylistVisibleRows = 4;
  const playlistViewportMinHeight = isMobileLobbyLayout
    ? 300
    : isCompactLobbyLayout
      ? 248
      : desktopPlaylistVisibleRows * playlistRowHeight;
  const playlistViewportMaxHeight = isMobileLobbyLayout
    ? 460
    : isCompactLobbyLayout
      ? 360
      : desktopPlaylistVisibleRows * playlistRowHeight;
  const playlistListViewportHeight = Math.min(
    playlistViewportMaxHeight,
    Math.max(
      playlistViewportMinHeight,
      Math.max(rowCount, isMobileLobbyLayout ? 2 : 4) * playlistRowHeight,
    ),
  );
  const playlistListShellStyle = (
    isMobileLobbyLayout
      ? {
        minHeight: playlistViewportMinHeight,
        height: "100%",
      }
      : {
        height: playlistListViewportHeight,
      }
  ) as React.CSSProperties;
  const playlistListViewportStyle = {
    height: isMobileLobbyLayout ? "100%" : playlistListViewportHeight,
    width: "100%",
  } as React.CSSProperties;
  const playlistLoadNotice = (() => {
    if (playlistLoading || collectionItemsLoading) {
      return "讀取歌單中";
    }
    return null;
  })();
  const displayRoomName = normalizeDisplayText(currentRoom?.name, "未命名房間");
  const hostPlaylistPrimaryText =
    "推薦播放清單會優先作為預設焦點；你也可以切換成公開、個人、YouTube 或連結來源後再套用到房間。";
  const isHostCollectionEmptyNotice =
    hostSourceType === "collection" &&
    !collectionsLoading &&
    collections.length === 0 &&
    !(collectionScope === "owner" && !isGoogleAuthed);
  const findInteractiveTarget = useCallback((target: EventTarget | null) => {
    if (!(target instanceof Element)) return null;
    return target.closest(LOBBY_INTERACTIVE_SELECTOR) as HTMLElement | null;
  }, []);

  const handleLobbyPointerEnter = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.pointerType !== "mouse") return;
      const target = findInteractiveTarget(event.target);
      if (!target) return;
      const relatedTarget = event.relatedTarget;
      if (relatedTarget instanceof Node && target.contains(relatedTarget)) {
        return;
      }
      const now =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      if (
        target === lastLobbyHoverTargetRef.current &&
        now - lastLobbyHoverAtRef.current < 220
      ) {
        return;
      }
      lastLobbyHoverTargetRef.current = target;
      lastLobbyHoverAtRef.current = now;
      primeSfxAudio();
      void playGameSfx("reveal");
    },
    [findInteractiveTarget, playGameSfx, primeSfxAudio],
  );

  const handleLobbyPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const target = findInteractiveTarget(event.target);
      if (!target) return;
      primeSfxAudio();
      if (
        target.closest(
          ".room-lobby-action-btn--start, .room-lobby-toolbar-history-btn, .room-lobby-apply-button, .room-lobby-suggestion-submit-btn",
        )
      ) {
        void playGameSfx("go");
        return;
      }
      void playGameSfx("lock");
    },
    [findInteractiveTarget, playGameSfx, primeSfxAudio],
  );

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
      setHostSuggestionHint("尚無建議");
      return;
    }
    setHostSuggestionHint("可直接套用");
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
    setSettingsSaving(false);
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
    const basePlaybackExtensionMode = normalizePlaybackExtensionMode(
      currentRoom.gameSettings?.playbackExtensionMode,
    );
    setSettingsPlayDurationSec(clampPlayDurationSec(basePlayDurationSec));
    setSettingsRevealDurationSec(clampRevealDurationSec(baseRevealDurationSec));
    setSettingsStartOffsetSec(clampStartOffsetSec(baseStartOffsetSec));
    setSettingsAllowCollectionClipTiming(baseAllowCollectionClipTiming);
    setSettingsPlaybackExtensionMode(basePlaybackExtensionMode);
    setSettingsMaxPlayers(
      currentRoom.maxPlayers && currentRoom.maxPlayers > 0
        ? String(currentRoom.maxPlayers)
        : "",
    );
    setSettingsError(null);
    setSettingsOpen(true);
  }, [currentRoom, questionMaxLimit, roomPassword]);

  const closeSettingsModal = () => {
    if (settingsSaving) return;
    setSettingsOpen(false);
    setSettingsError(null);
  };

  const handleSaveSettings = async () => {
    if (settingsDisabled || settingsSaving) return;
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
    const normalizedPin = settingsPassword.trim();
    if (normalizedPin && !/^\d{4}$/.test(normalizedPin)) {
      setSettingsError("PIN 需為 4 位數字");
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
      playbackExtensionMode: settingsPlaybackExtensionMode,
      maxPlayers: nextMaxPlayers,
      ...(settingsPasswordDirty ? { pin: normalizedPin } : {}),
    };
    setSettingsSaving(true);
    try {
      const success = await onUpdateRoomSettings(payload);
      if (success) {
        setSettingsOpen(false);
        setSettingsError(null);
      }
    } finally {
      setSettingsSaving(false);
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
      setHostSuggestionHint("套用中");
      return;
    }
    if (
      lastRequest &&
      lastRequest.key === suggestionKey &&
      now - lastRequest.at < HOST_SUGGESTION_REQUEST_GAP_MS
    ) {
      setHostSuggestionHint("請稍後再試");
      return;
    }

    lastHostSuggestionRequestRef.current = { key: suggestionKey, at: now };
    hostSuggestionApplyingRef.current = true;
    setIsApplyingHostSuggestion(true);
    setHostSuggestionHint("套用中");

    try {
      const isSnapshot = Boolean(suggestion.items?.length);
      if (isSnapshot) {
        await onApplySuggestionSnapshot(suggestion);
        setHostSuggestionHint("已套用快照");
        return;
      }

      if (suggestion.type === "playlist") {
        onFetchPlaylistByUrl(suggestion.value);
        setHostSuggestionHint("已套用連結");
        return;
      }

      onSelectCollection(suggestion.value);
      await onLoadCollectionItems(suggestion.value, {
        readToken: suggestion.readToken ?? null,
      });
      setHostSuggestionHint("已套用收藏庫");
    } catch (error) {
      console.error(error);
      setHostSuggestionHint("套用失敗");
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
      isSnapshot ? "即將套用快照" : "即將套用來源",
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
    const displayTitle = normalizeDisplayText(
      item.title || item.answerText?.trim(),
      `歌曲 ${index + 1}`,
    );
    const displayUploader = normalizeDisplayText(item.uploader ?? "", "Unknown");

    return (
      <div style={style}>
        <div
          className="room-lobby-playlist-row px-3.5 py-2.5 flex items-center gap-3 border-b border-slate-800/60"
        >
          <div className="flex flex-1 min-w-0 items-center gap-2 overflow-x-hidden">
            <Avatar
              variant="rounded"
              src={item.thumbnail}
              sx={{
                bgcolor: "#1f2937",
                width: 60,
                height: 60,
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
                {canOpenItem ? (
                  <button
                    type="button"
                    className="room-lobby-playlist-row-link room-lobby-playlist-row-link--button"
                    onClick={() => handleOpenPlaylistItem(item.url)}
                    aria-label={`開啟歌曲：${displayTitle}`}
                    title={displayTitle}
                  >
                    {displayTitle}
                  </button>
                ) : (
                  <span className="room-lobby-playlist-row-link">
                    {displayTitle}
                  </span>
                )}
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

  useEffect(() => {
    const roomId = currentRoom?.id ?? null;
    mobileChatUnreadSeededRoomRef.current = null;
    lastUnreadMobileChatMessageIdRef.current = readRoomChatLastReadMessageId(roomId);
    setMobileChatUnread(0);
  }, [currentRoom?.id]);

  const isUnreadMobileChatMessage = React.useCallback(
    (message: ChatMessage) =>
      !message.userId.startsWith("system:") && message.userId !== selfClientId,
    [selfClientId],
  );

  const unreadMobileChatMessages = useMemo(
    () => messages.filter(isUnreadMobileChatMessage),
    [isUnreadMobileChatMessage, messages],
  );

  useEffect(() => {
    const roomId = currentRoom?.id ?? null;
    const latestUnreadMessageId =
      unreadMobileChatMessages[unreadMobileChatMessages.length - 1]?.id ?? null;

    if (!isMobileTabletLobbyLayout || mobileChatDrawerOpen) {
      setMobileChatUnread(0);
      mobileChatUnreadSeededRoomRef.current = roomId;
      lastUnreadMobileChatMessageIdRef.current = latestUnreadMessageId;
      writeRoomChatLastReadMessageId(roomId, latestUnreadMessageId);
      return;
    }

    if (!roomId) {
      setMobileChatUnread(0);
      lastUnreadMobileChatMessageIdRef.current = latestUnreadMessageId;
      return;
    }

    const lastSeenMessageId =
      lastUnreadMobileChatMessageIdRef.current ??
      readRoomChatLastReadMessageId(roomId);

    if (mobileChatUnreadSeededRoomRef.current !== roomId) {
      setMobileChatUnread(
        lastSeenMessageId
          ? Math.max(
            0,
            unreadMobileChatMessages.length -
            (unreadMobileChatMessages.findIndex(
              (message) => message.id === lastSeenMessageId,
            ) + 1),
          )
          : unreadMobileChatMessages.length,
      );
      mobileChatUnreadSeededRoomRef.current = roomId;
      return;
    }

    if (!latestUnreadMessageId) {
      setMobileChatUnread(0);
      lastUnreadMobileChatMessageIdRef.current = null;
      writeRoomChatLastReadMessageId(roomId, null);
      return;
    }

    const lastSeenIndex =
      lastSeenMessageId === null
        ? -1
        : unreadMobileChatMessages.findIndex(
          (message) => message.id === lastSeenMessageId,
        );

    if (lastSeenIndex < 0) {
      setMobileChatUnread(unreadMobileChatMessages.length);
    } else {
      setMobileChatUnread(
        Math.max(0, unreadMobileChatMessages.length - (lastSeenIndex + 1)),
      );
    }
  }, [
    currentRoom?.id,
    isMobileTabletLobbyLayout,
    messages,
    mobileChatDrawerOpen,
    unreadMobileChatMessages,
  ]);

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
        setTimeout(() => setInviteSuccess(false), 1500);
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
  const latestUnreadLobbyMessageId =
    unreadMobileChatMessages[unreadMobileChatMessages.length - 1]?.id ?? null;
  const markLobbyChatRead = React.useCallback(() => {
    setMobileChatUnread(0);
    mobileChatUnreadSeededRoomRef.current = currentRoom?.id ?? null;
    lastUnreadMobileChatMessageIdRef.current = latestUnreadLobbyMessageId;
    writeRoomChatLastReadMessageId(
      currentRoom?.id ?? null,
      latestUnreadLobbyMessageId,
    );
  }, [currentRoom?.id, latestUnreadLobbyMessageId]);

  const mobileActionButtons = useMemo(
    () => [
      ...(isHost
        ? [
          {
            key: "settings",
            label: "設定",
            compactLabel: "設定",
            icon: <SettingsOutlinedIcon fontSize="small" />,
            onClick: openSettingsModal,
            disabled: Boolean(settingsActionDisabledReason),
            tone: "normal" as const,
            title: settingsActionDisabledReason ?? "調整房間設定",
          },
        ]
        : []),
      {
        key: "leave",
        label: "離開",
        compactLabel: "離開",
        icon: <LogoutRoundedIcon fontSize="small" />,
        onClick: requestLeaveRoom,
        disabled: false,
        tone: "normal" as const,
        title: "離開房間",
      },
    ],
    [
      openSettingsModal,
      requestLeaveRoom,
      settingsActionDisabledReason,
      isHost,
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
      ...(onOpenHistoryDrawer
        ? [
          {
            key: "history",
            label: "對戰資訊",
            icon: <HistoryEduRoundedIcon fontSize="small" />,
            onClick: () => onOpenHistoryDrawer?.(),
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
      isHost,
      isStartBroadcastActive,
      onOpenGame,
      onOpenHistoryDrawer,
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
            label: "設定",
            ariaLabel: "開啟房主設定",
            icon: <SettingsOutlinedIcon fontSize="small" />,
            onClick: openSettingsModal,
            disabled: Boolean(settingsActionDisabledReason),
            tone: "normal" as const,
            title: settingsActionDisabledReason ?? "調整房間設定",
            variant: "outlined" as const,
          },
        ]
        : []),
      {
        key: "leave",
        label: "離開",
        ariaLabel: "離開房間",
        icon: <LogoutRoundedIcon fontSize="small" />,
        onClick: requestLeaveRoom,
        disabled: false,
        tone: "normal" as const,
        title: "離開房間",
        variant: "outlined" as const,
      },
    ],
    [
      isHost,
      requestLeaveRoom,
      openSettingsModal,
      settingsActionDisabledReason,
    ],
  );
  const gameStatus = gameState?.status as string | undefined;
  const hasDesktopPrimaryAction =
    gameStatus === "playing" || (isHost && gameStatus !== "playing");
  const hasDesktopHistoryAction = Boolean(onOpenHistoryDrawer);
  const isSoloLeaveToolbar =
    !hasDesktopPrimaryAction &&
    !hasDesktopHistoryAction &&
    desktopUtilityActions.length === 1 &&
    desktopUtilityActions[0]?.key === "leave";
  const playerCountLabel = currentRoom?.maxPlayers
    ? `${participants.length}/${currentRoom.maxPlayers}`
    : String(participants.length);
  const roomMetricCards = [
    {
      key: "questions",
      label: "題數",
      value: String(currentRoom?.gameSettings?.questionCount ?? "-"),
      icon: <QuizRoundedIcon fontSize="small" />,
      tone: "amber",
    },
    {
      key: "timing",
      label: "作答時間",
      value: roomAllowCollectionClipTiming ? "依收藏庫設定" : `${roomPlayDurationSec}s`,
      icon: <TimerRoundedIcon fontSize="small" />,
      tone: "cyan",
    },
  ] as const;
  const showRoomAccessStrip =
    Boolean(formattedRoomCode) ||
    (isHost && Boolean(currentRoom?.hasPin ?? currentRoom?.hasPassword));
  const showInlineRoomAccess = showRoomAccessStrip;
  const visibleRoomPassword = roomPassword
    ? showRoomPassword
      ? roomPassword
      : maskedRoomPassword
    : "未設定";

  const handleCopyRoomCode = async () => {
    if (!currentRoom?.roomCode) return;
    try {
      await navigator.clipboard.writeText(currentRoom.roomCode);
      setRoomCodeCopied(true);
      window.setTimeout(() => setRoomCodeCopied(false), 1800);
    } catch {
      setRoomCodeCopied(false);
    }
  };

  const roomAccessActions = (
    <>
      {formattedRoomCode ? (
        <button
          type="button"
          className={`room-lobby-access-chip room-lobby-access-chip--code ${roomCodeCopied ? "is-copied" : ""
            }`}
          aria-label="複製房間代碼"
          title="複製房間代碼"
          onClick={() => {
            void handleCopyRoomCode();
          }}
        >
          <ContentCopyRoundedIcon fontSize="small" />
          {roomCodeCopied ? (
            <span className="room-lobby-access-copied-badge">已複製</span>
          ) : null}
          <div className="room-lobby-access-copy">
            <strong>{formattedRoomCode}</strong>
          </div>
        </button>
      ) : null}
      {isHost ? (
        <Button
          variant="contained"
          size="small"
          color="inherit"
          className={`room-lobby-access-btn ${inviteSuccess
            ? "room-lobby-action-btn--invite-success"
            : "room-lobby-action-btn--invite"
            } room-lobby-access-btn--icon-only`}
          disabled={Boolean(inviteActionDisabledReason)}
          title={inviteSuccess ? "邀請連結已複製" : inviteActionDisabledReason ?? "複製邀請連結"}
          aria-label={inviteSuccess ? "邀請連結已複製" : "複製邀請連結"}
          onClick={runInvite}
        >
          <span className="room-lobby-access-btn__icon" aria-hidden="true">
            {inviteSuccess ? (
              <CheckRoundedIcon fontSize="small" />
            ) : (
              <PersonAddAlt1RoundedIcon fontSize="small" />
            )}
          </span>
          <span className="room-lobby-sr-only">
            {inviteSuccess ? "邀請連結已複製" : "複製邀請連結"}
          </span>
          {inviteSuccess ? (
            <span className="room-lobby-access-success-badge" aria-hidden="true">
              已複製
            </span>
          ) : null}
          <span className="room-lobby-toolbar-floating-label" aria-hidden="true">
            {inviteSuccess ? "邀請連結已複製" : "邀請"}
          </span>
        </Button>
      ) : null}
      {isHost && (currentRoom?.hasPin ?? currentRoom?.hasPassword) ? (
        <button
          type="button"
          className="room-lobby-access-chip room-lobby-access-chip--pin"
          title={showRoomPassword ? "隱藏房間 PIN" : "顯示房間 PIN"}
          onClick={() => setShowRoomPassword((prev) => !prev)}
        >
          <KeyRoundedIcon fontSize="small" />
          <div className="room-lobby-access-copy">
            <strong>{visibleRoomPassword}</strong>
          </div>
          {showRoomPassword ? (
            <VisibilityOffRoundedIcon fontSize="small" />
          ) : (
            <VisibilityRoundedIcon fontSize="small" />
          )}
        </button>
      ) : null}
    </>
  );

  const participantsPanel = (
    <Box className="room-lobby-participants">
      <div className="room-lobby-panel-head">
        <div className="room-lobby-panel-title">
          <GroupsRoundedIcon fontSize="small" />
          <Typography variant="subtitle2" className="text-slate-100">
            玩家
          </Typography>
        </div>
        <div className="room-lobby-panel-counter">{playerCountLabel}</div>
      </div>

      <div className="room-lobby-player-list">
        {participants.length === 0 ? (
          <div className="room-lobby-roster-empty">
            <Typography variant="body2" className="text-slate-400">
              目前尚無玩家
            </Typography>
          </div>
        ) : (
          <div className="room-lobby-player-list-inner">
            {participants.map((p) => {
              const isSelf = p.clientId === selfClientId;
              const host = p.clientId === currentRoom?.hostClientId;
              const isActionOpen =
                Boolean(actionAnchorEl) && actionTargetId === p.clientId;
              const showActions = isHost && !isSelf;
              const participantInitial = normalizeDisplayText(p.username, "玩")
                .trim()
                .slice(0, 1)
                .toUpperCase();
              return (
                <Box
                  key={p.clientId}
                  className={`room-lobby-player-row ${isSelf ? "is-self" : ""
                    } ${p.isOnline ? "is-online" : "is-offline"} ${showActions ? "has-actions" : ""
                    }`}
                >
                  <div className="room-lobby-player-row-main">
                    <Badge
                      variant="dot"
                      color={p.isOnline ? "success" : "default"}
                      overlap="circular"
                      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                    >
                      <Avatar className="room-lobby-player-avatar">
                        {participantInitial || "P"}
                      </Avatar>
                    </Badge>
                    <div className="room-lobby-player-copy">
                      <div className="room-lobby-player-title-row">
                        <strong>{normalizeDisplayText(p.username, "玩家")}</strong>
                      </div>
                      <div className="room-lobby-player-tags">
                        {host ? (
                          <span className="room-lobby-player-tag is-host">
                            房主
                          </span>
                        ) : (
                          <span className="room-lobby-player-tag is-player">
                            玩家
                          </span>
                        )}
                        {!p.isOnline && (
                          <span className="room-lobby-player-tag is-muted">
                            暫離
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="room-lobby-player-side">
                    <span
                      className={`room-lobby-player-status ${p.isOnline ? "is-online" : "is-offline"
                        }`}
                    >
                      {p.isOnline ? "在線" : "離線"}
                    </span>
                    {showActions && (
                      <IconButton
                        size="small"
                        color="inherit"
                        className="room-lobby-player-action"
                        aria-label="玩家操作"
                        title="玩家操作"
                        sx={{
                          width: 30,
                          height: 30,
                          borderRadius: "999px",
                          "&:hover": {
                            backgroundColor: "rgba(148,163,184,0.12)",
                          },
                        }}
                        onClick={(event) => {
                          event.stopPropagation();
                          setActionAnchorEl(event.currentTarget);
                          setActionTargetId(p.clientId);
                        }}
                        >
                          <MoreHorizRoundedIcon fontSize="small" />
                          <span className="room-lobby-toolbar-floating-label" aria-hidden="true">
                            玩家操作
                          </span>
                        </IconButton>
                      )}
                  </div>
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
          </div>
        )}
      </div>
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
  const controlPanel = hostPanel ?? (
    <Box className="room-lobby-control-placeholder">
      <div className="room-lobby-panel-title">
        <PlaylistPlayRoundedIcon fontSize="small" />
        <Typography variant="subtitle2" className="text-slate-100">
          操作已鎖定
        </Typography>
      </div>
      <Typography variant="body2" className="text-slate-300">
        遊戲進行中
      </Typography>
    </Box>
  );

  const chatPanel = (
    <RoomLobbyChatPanel
      messages={messages}
      messageInput={messageInput}
      onInputChange={onInputChange}
      onSend={onSend}
      onChatInteraction={markLobbyChatRead}
      latestSettlementRoundKey={latestSettlementRoundKey}
      onOpenHistoryDrawer={onOpenHistoryDrawer}
      onOpenSettlementByRoundKey={onOpenSettlementByRoundKey}
    />
  );
  const chatPanelStage = (
    <Box className="room-lobby-chat-stage">
      <div className="room-lobby-panel-head">
        <div className="room-lobby-panel-title">
          <ChatBubbleRoundedIcon fontSize="small" />
          <Typography variant="subtitle2" className="text-slate-100">
            聊天室
          </Typography>
        </div>
      </div>
      {chatPanel}
    </Box>
  );
  const playlistPanel = (
    <Box className="room-lobby-playlist-panel">
      <div className="room-lobby-panel-head room-lobby-playlist-head">
        <div className="room-lobby-panel-title">
          <LibraryMusicRoundedIcon fontSize="small" />
          <Typography variant="subtitle2" className="text-slate-200">
            播放清單
          </Typography>
        </div>
        <div className="room-lobby-panel-counter">
          {playlistProgress.total > 0 ? playlistProgress.total : playlistItems.length}
        </div>
      </div>
      {playlistItems.length === 0 ? (
        <div className="room-lobby-playlist-shell" style={playlistListShellStyle}>
          <div className="flex h-full min-h-[140px] items-center justify-center rounded border border-slate-800 bg-slate-900/60 px-3">
            <Typography
              variant="body2"
              className="text-slate-500"
              align="center"
            >
              目前沒有歌曲
            </Typography>
          </div>
        </div>
      ) : (
        <div className="room-lobby-playlist-shell" style={playlistListShellStyle}>
          <div className="h-full min-h-0 w-full overflow-hidden rounded border border-slate-800 bg-slate-900/60">
            <VirtualList
              style={playlistListViewportStyle}
              rowCount={rowCount}
              rowHeight={playlistRowHeight}
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
      onPointerOverCapture={handleLobbyPointerEnter}
      onPointerDownCapture={handleLobbyPointerDown}
      sx={{
        minHeight: isCompactLobbyLayout ? "auto" : "min(860px, calc(100dvh - 120px))",
        height: "auto",
        maxHeight: "none",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <CardHeader
        className="room-lobby-card-header"
        title={
          <Stack spacing={1.25} className="room-lobby-header-stack">
            <div className="room-lobby-header-identity">
              <div className="room-lobby-header-copy">
                <Typography
                  variant="h6"
                  className="room-lobby-header-title"
                  title={displayRoomName}
                >
                  {displayRoomName}
                </Typography>
                {showInlineRoomAccess ? (
                  <div className="room-lobby-header-inline-actions room-lobby-header-inline-actions--title">
                    {roomAccessActions}
                  </div>
                ) : null}
              </div>

              <div className="room-lobby-header-info-band">
                <div className="room-lobby-metric-grid">
                  {roomMetricCards.map((card) => (
                    <div
                      key={card.key}
                      className={`room-lobby-metric-card room-lobby-metric-card--${card.tone}`}
                    >
                      <span className="room-lobby-metric-icon">{card.icon}</span>
                      <div className="room-lobby-metric-copy">
                        <small>{card.label}</small>
                        <strong>{card.value}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Stack>
        }
        action={
          !isMobileTabletLobbyLayout ? (
            <div className="room-lobby-toolbar" role="toolbar" aria-label="房間操作">
              <div
                className={`room-lobby-toolbar-shell ${isSoloLeaveToolbar ? "room-lobby-toolbar-shell--solo-leave" : ""
                  }`}
              >
                <div className="room-lobby-toolbar-group room-lobby-toolbar-group--cta">
                  {gameState?.status === "playing" && (
                    <Button
                      variant="contained"
                      color="success"
                      size="small"
                      aria-label="返回遊戲"
                      className="room-lobby-action-btn room-lobby-action-btn--desktop-main room-lobby-toolbar-icon-btn room-lobby-toolbar-icon-btn--resume"
                      onClick={() => onOpenGame?.()}
                    >
                      <span className="room-lobby-toolbar-icon-btn__icon" aria-hidden="true">
                        <SportsEsportsRoundedIcon fontSize="small" />
                      </span>
                      <span className="room-lobby-sr-only">返回遊戲</span>
                      <span className="room-lobby-toolbar-floating-label" aria-hidden="true">
                        返回遊戲
                      </span>
                    </Button>
                  )}
                  {isHost && gameState?.status !== "playing" && (
                    <Button
                      variant="contained"
                      color="inherit"
                      size="small"
                      aria-label={
                        isStartBroadcastActive
                          ? `即將開始 ${startBroadcastRemainingSec} 秒`
                          : "開始遊戲"
                      }
                      className="room-lobby-action-btn room-lobby-action-btn--desktop-main room-lobby-action-btn--start room-lobby-toolbar-icon-btn room-lobby-toolbar-icon-btn--start"
                      disabled={Boolean(startActionDisabledReason)}
                      onClick={onStartGame}
                    >
                      <span className="room-lobby-toolbar-icon-btn__icon" aria-hidden="true">
                        <PlayArrowRoundedIcon fontSize="small" />
                      </span>
                      <span className="room-lobby-sr-only">
                        {isStartBroadcastActive
                          ? `即將開始 ${startBroadcastRemainingSec} 秒`
                          : "開始遊戲"}
                      </span>
                      <span className="room-lobby-toolbar-floating-label" aria-hidden="true">
                        {isStartBroadcastActive
                          ? `即將開始 ${startBroadcastRemainingSec}s`
                          : "開始遊戲"}
                      </span>
                    </Button>
                  )}
                </div>
                <div className="room-lobby-toolbar-group room-lobby-toolbar-group--history">
                  {onOpenHistoryDrawer && (
                    <Button
                      variant="outlined"
                      color="inherit"
                      size="small"
                      aria-label="對戰資訊"
                      className="room-lobby-toolbar-history-btn room-lobby-toolbar-icon-btn"
                      onClick={() => onOpenHistoryDrawer?.()}
                    >
                      <span className="room-lobby-toolbar-icon-btn__icon" aria-hidden="true">
                        <HistoryEduRoundedIcon fontSize="small" />
                      </span>
                      <span className="room-lobby-sr-only">對戰資訊</span>
                      <span className="room-lobby-toolbar-floating-label" aria-hidden="true">
                        對戰資訊
                      </span>
                    </Button>
                  )}
                </div>
                <div className="room-lobby-toolbar-group room-lobby-toolbar-group--utility">
                  {desktopUtilityActions.map((action) => (
                    <Button
                      key={action.key}
                      variant={action.variant}
                      color="inherit"
                      size="small"
                      className={`room-lobby-toolbar-utility-btn room-lobby-toolbar-icon-btn ${action.key === "settings"
                        ? "room-lobby-toolbar-settings-btn"
                        : ""
                        } ${action.key === "leave"
                          ? "room-lobby-toolbar-leave-btn"
                          : ""
                        }`}
                      disabled={action.disabled}
                      aria-label={action.ariaLabel}
                      onClick={action.onClick}
                    >
                      <span className="room-lobby-toolbar-icon-btn__icon" aria-hidden="true">
                        {action.icon}
                      </span>
                      <span className="room-lobby-sr-only">{action.ariaLabel}</span>
                      <span className="room-lobby-toolbar-floating-label" aria-hidden="true">
                        {action.label}
                      </span>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ) : null
        }
      />
      <CardContent
        className={`room-lobby-content ${isMobileTabletLobbyLayout ? "room-lobby-content--mobile-redesign" : ""
          }`}
        sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 1.5 }}
      >
        {isMobileTabletLobbyLayout ? (
          <>
            <div className="room-lobby-mobile-shell">
              <div className="room-lobby-mobile-top-actions">
                <div className="room-lobby-mobile-actions-card">
                  {mobilePrimaryActions.length > 0 && (
                    <div
                      className={`room-lobby-mobile-primary-actions ${mobilePrimaryActions.length === 1
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
                          className={`room-lobby-action-btn room-lobby-action-btn--mobile room-lobby-mobile-primary-action ${action.tone === "start"
                            ? "room-lobby-action-btn--start room-lobby-mobile-start-btn"
                            : action.tone === "history"
                              ? "room-lobby-mobile-primary-action--history"
                              : "room-lobby-mobile-primary-action--resume"
                            }`}
                          onClick={action.onClick}
                          disabled={action.disabled}
                          aria-label={action.label}
                          title={action.label}
                        >
                          <span className="room-lobby-mobile-action-icon" aria-hidden="true">
                            {action.icon}
                          </span>
                          <span className="room-lobby-sr-only">{action.label}</span>
                        </Button>
                      ))}
                    </div>
                  )}
                  <div
                    className={`room-lobby-mobile-secondary-actions ${mobileActionButtons.length === 1
                      ? "room-lobby-mobile-secondary-actions--single"
                      : ""
                      }`}
                  >
                    {mobileActionButtons.map((action) => (
                      <Button
                        key={`mobile-${action.key}`}
                        variant={action.key === "leave" ? "outlined" : "contained"}
                        color="inherit"
                        className={`room-lobby-action-btn room-lobby-action-btn--mobile room-lobby-mobile-secondary-action ${action.key === "settings" ? "room-lobby-mobile-secondary-action--settings" : ""
                          } ${action.key === "leave" ? "room-lobby-mobile-secondary-action--leave" : ""
                          }`}
                        aria-label={action.label}
                        disabled={action.disabled}
                        title={action.label}
                        onClick={action.onClick}
                      >
                        <span className="room-lobby-mobile-secondary-action__icon">
                          {action.icon}
                        </span>
                        <span className="room-lobby-sr-only">{action.label}</span>
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
                  aria-label="玩家"
                  title="玩家"
                  className={`room-lobby-mobile-tab ${mobileLobbyTab === "members" ? "is-active" : ""
                    }`}
                  onClick={() => setMobileLobbyTab("members")}
                >
                  <span className="room-lobby-mobile-tab__icon" aria-hidden="true">
                    <GroupsRoundedIcon fontSize="inherit" />
                  </span>
                  <span className="room-lobby-mobile-tab__label">玩家</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mobileLobbyTab === "host"}
                  aria-label="操作"
                  title="操作"
                  className={`room-lobby-mobile-tab ${mobileLobbyTab === "host" ? "is-active" : ""
                    }`}
                  onClick={() => setMobileLobbyTab("host")}
                >
                  <span className="room-lobby-mobile-tab__icon" aria-hidden="true">
                    <PlaylistPlayRoundedIcon fontSize="inherit" />
                  </span>
                  <span className="room-lobby-mobile-tab__label">操作</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mobileLobbyTab === "playlist"}
                  aria-label="播放清單"
                  title="播放清單"
                  className={`room-lobby-mobile-tab ${mobileLobbyTab === "playlist" ? "is-active" : ""
                    }`}
                  onClick={() => setMobileLobbyTab("playlist")}
                >
                  <span className="room-lobby-mobile-tab__icon" aria-hidden="true">
                    <LibraryMusicRoundedIcon fontSize="inherit" />
                  </span>
                  <span className="room-lobby-mobile-tab__label">播放清單</span>
                </button>
              </div>
              <div className="room-lobby-mobile-panel">
                {mobileLobbyTab === "members" && participantsPanel}
                {mobileLobbyTab === "host" && controlPanel}
                {mobileLobbyTab === "playlist" && playlistPanel}
              </div>
            </div>
            <div className="room-lobby-mobile-chat-trigger-wrap">
              <Button
                variant="outlined"
                color="info"
                fullWidth
                onClick={() => {
                  markLobbyChatRead();
                  setMobileChatDrawerOpen(true);
                }}
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
              onOpen={() => {
                markLobbyChatRead();
                setMobileChatDrawerOpen(true);
              }}
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
                    className={`game-room-mobile-drawer-handle-wrap game-room-mobile-drawer-handle-wrap--draggable game-room-mobile-drawer-handle-wrap--${mobileChatDragDismiss.canDismiss
                      ? "ready"
                      : mobileChatDragDismiss.isDismissArmed
                        ? "armed"
                        : "idle"
                      }`}
                    aria-hidden="true"
                  >
                    <span className="game-room-mobile-drawer-handle-bar" />
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
            {!mobileChatDrawerOpen && mobileChatUnread > 0 ? (
              <button
                type="button"
                className="room-lobby-mobile-chat-fab"
                onClick={() => setMobileChatDrawerOpen(true)}
                aria-label={`開啟聊天室，目前有 ${mobileChatUnread} 則未讀訊息`}
              >
                <span className="room-lobby-mobile-chat-fab__icon">
                  <ChatBubbleRoundedIcon fontSize="inherit" />
                </span>
                <span className="room-lobby-mobile-chat-fab__content">
                  <span className="room-lobby-mobile-chat-fab__label">聊天室</span>
                  <span className="room-lobby-mobile-chat-fab__hint">
                    {mobileChatUnread === 1
                      ? "有 1 則未讀訊息"
                      : `有 ${mobileChatUnread > 99 ? "99+" : mobileChatUnread} 則未讀訊息`}
                  </span>
                </span>
                <span className="room-lobby-mobile-chat-fab__count">
                  {mobileChatUnread > 99 ? "99+" : mobileChatUnread}
                </span>
              </button>
            ) : null}
          </>
        ) : (
          <>
            <div className="room-lobby-column room-lobby-column--social">
              <div className="room-lobby-column-section room-lobby-column-section--participants">
                {participantsPanel}
              </div>
              <div className="room-lobby-column-divider" aria-hidden="true" />
              <div className="room-lobby-column-section room-lobby-column-section--chat">
                {chatPanelStage}
              </div>
            </div>
            <div className="room-lobby-column room-lobby-column--music">
              <div className="room-lobby-column-section room-lobby-column-section--control">
                {controlPanel}
              </div>
              <div className="room-lobby-column-divider" aria-hidden="true" />
              <div className="room-lobby-column-section room-lobby-column-section--playlist">
                {playlistPanel}
              </div>
            </div>
          </>
        )}
      </CardContent>
      <RoomLobbySettingsDialog
        open={settingsOpen}
        settingsDisabled={settingsDisabled}
        settingsSaving={settingsSaving}
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
        settingsPlaybackExtensionMode={settingsPlaybackExtensionMode}
        onSettingsPlaybackExtensionModeChange={(value) => {
          setSettingsPlaybackExtensionMode(value);
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
        fullWidth
        maxWidth="xs"
        PaperProps={{
          sx: {
            width: "min(92vw, 440px)",
            borderRadius: 4,
            border: "1px solid rgba(56, 189, 248, 0.32)",
            color: "#f8fafc",
            background:
              "radial-gradient(900px 420px at -8% -18%, rgba(56,189,248,0.20), transparent 62%), linear-gradient(180deg, rgba(2,6,23,0.98), rgba(2,6,23,0.92))",
            boxShadow:
              "0 34px 88px -44px rgba(2,6,23,0.95), 0 0 0 1px rgba(255,255,255,0.03)",
            overflow: "hidden",
          },
        }}
      >
        <DialogTitle className="!px-6 !pt-6 !pb-2 !text-xl !font-extrabold !tracking-[-0.02em] !text-slate-50">
          {confirmModal?.title ?? "確認操作"}
        </DialogTitle>
        <DialogContent className="!px-6 !pt-1 !pb-0">
          {confirmModal?.detail && (
            <Typography
              variant="body1"
              className="rounded-2xl border border-sky-400/15 bg-slate-950/45 px-4 py-3 text-slate-100"
            >
              {confirmModal.detail}
            </Typography>
          )}
        </DialogContent>
        <DialogActions className="!px-6 !pb-5 !pt-4">
          <Button
            onClick={closeConfirmModal}
            variant="text"
            className="!min-h-[44px] !rounded-2xl !px-4"
          >
            取消
          </Button>
          <Button
            onClick={handleConfirmSwitch}
            variant="contained"
            color="warning"
            className="!min-h-[46px] !rounded-2xl !px-5 !font-extrabold"
          >
            確認
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default RoomLobbyPanel;

