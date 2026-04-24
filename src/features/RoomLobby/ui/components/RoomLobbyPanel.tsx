import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Switch,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useCallback } from "react";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import HistoryEduRoundedIcon from "@mui/icons-material/HistoryEduRounded";
import ChairRoundedIcon from "@mui/icons-material/ChairRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import FastForwardRoundedIcon from "@mui/icons-material/FastForwardRounded";
import SportsEsportsRoundedIcon from "@mui/icons-material/SportsEsportsRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import HourglassTopRoundedIcon from "@mui/icons-material/HourglassTopRounded";
import LibraryMusicRoundedIcon from "@mui/icons-material/LibraryMusicRounded";
import PlaylistPlayRoundedIcon from "@mui/icons-material/PlaylistPlayRounded";
import QuizRoundedIcon from "@mui/icons-material/QuizRounded";
import TimerRoundedIcon from "@mui/icons-material/TimerRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import KeyRoundedIcon from "@mui/icons-material/KeyRounded";
import ScienceRoundedIcon from "@mui/icons-material/ScienceRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import ShareRoundedIcon from "@mui/icons-material/ShareRounded";
import IosShareRoundedIcon from "@mui/icons-material/IosShareRounded";
import type { RowComponentProps } from "react-window";
import type {
  GameState,
  PlaylistItem,
  PlaybackExtensionMode,
  PlaylistSuggestion,
  RoomParticipant,
  RoomState,
} from "@features/RoomSession";
import type {
  PlaylistPreviewMeta,
  YoutubePlaylist,
} from "@features/PlaylistSource";
import {
  clampPlayDurationSec,
  clampQuestionCount,
  clampRevealDurationSec,
  clampStartOffsetSec,
  getQuestionMax,
} from "@features/RoomSession";
import { normalizePlaybackExtensionMode } from "@features/RoomSession";
import { resolveSettlementTrackLink } from "@features/Settlement/model/settlementLinks";
import {
  DEFAULT_PLAYBACK_EXTENSION_MODE,
  DEFAULT_PLAY_DURATION_SEC,
  DEFAULT_REVEAL_DURATION_SEC,
  DEFAULT_START_OFFSET_SEC,
  PLAYER_MAX,
  PLAYER_MIN,
  QUESTION_MIN,
} from "@domain/room/constants";
import {
  getLeaderboardProfileKey,
  type LeaderboardVariantKey,
  type RoomPlayMode,
} from "@features/RoomHub/model/leaderboardChallengeOptions";
import RoomLobbySettingsDialog from "./RoomLobbySettingsDialog";
import CurrentPlaylistCard from "./CurrentPlaylistCard";
import PlaylistSelectorModal from "./PlaylistSelectorModal";
import RoomUiTooltip from "@shared/ui/RoomUiTooltip";

import { useGameSfx } from "@shared/hooks/useGameSfx";
import {
  DEFAULT_AVATAR_EFFECT_LEVEL_VALUE,
  DEFAULT_BGM_VOLUME,
  DEFAULT_GAME_VOLUME,
  DEFAULT_SFX_ENABLED,
  DEFAULT_SFX_PRESET,
  DEFAULT_SFX_VOLUME,
  SettingsModelContext,
} from "@features/Setting/model/settingsContext";
import type { CollectionOption } from "./roomLobbyPanelTypes";
import { normalizeDisplayText } from "./roomLobbyDisplayUtils";
import { pushRoomLobbyPlaylistSourceHistory } from "./roomLobbyPlaylistSourceHistory";
import RoomLobbyMetaGrid, { type RoomMetaItem } from "./RoomLobbyMetaGrid";
import RoomLobbyParticipantsPanel from "./RoomLobbyParticipantsPanel";
import RoomLobbyPlaylistPanel from "./RoomLobbyPlaylistPanel";

interface RoomLobbyPanelProps {
  currentRoom: RoomState["room"] | null;
  participants: RoomParticipant[];
  selfClientId: string;
  roomPassword?: string | null;
  selfAvatarUrl?: string | null;
  playlistItems: PlaylistItem[];
  playlistHasMore: boolean;
  playlistLoadingMore: boolean;
  playlistProgress: { received: number; total: number; ready: boolean };
  playlistSuggestions: PlaylistSuggestion[];
  playlistUrl: string;
  playlistItemsForChange: PlaylistItem[];
  playlistPreviewMeta: PlaylistPreviewMeta | null;
  playlistError?: string | null;
  playlistLoading?: boolean;
  collections: CollectionOption[];
  collectionsLoading: boolean;
  collectionsLoadingMore?: boolean;
  collectionsHasMore?: boolean;
  collectionsError: string | null;
  collectionItemsLoading: boolean;
  collectionItemsError: string | null;
  isGoogleAuthed?: boolean;
  onRequestGoogleLogin?: () => void;
  youtubePlaylists: YoutubePlaylist[];
  youtubePlaylistsLoading: boolean;
  youtubePlaylistsError: string | null;
  isHost: boolean;
  gameState?: GameState | null;
  canStartGame: boolean;
  hasLastSettlement?: boolean;
  latestSettlementRoundKey?: string | null;
  onLeave: () => void;
  onLoadMorePlaylist: () => void;
  onStartGame: () => void;
  onUpdateRoomSettings: (payload: {
    name?: string;
    visibility?: "public" | "private";
    password?: string | null;
    pin?: string | null;
    questionCount?: number;
    playDurationSec?: number;
    revealDurationSec?: number;
    startOffsetSec?: number;
    allowCollectionClipTiming?: boolean;
    allowParticipantInvite?: boolean;
    playbackExtensionMode?: PlaybackExtensionMode;
    maxPlayers?: number | null;
    leaderboardProfileKey?: string | null;
    leaderboardRuleVersion?: number | null;
    leaderboardModeKey?: string | null;
    leaderboardVariantKey?: string | null;
    leaderboardTargetQuestionCount?: number | null;
    leaderboardTimeLimitSec?: number | null;
    leaderboardRankingMetric?: string | null;
  }) => Promise<boolean>;
  onOpenLastSettlement?: () => void;
  onOpenHistoryDrawer?: () => void;
  onOpenSettlementByRoundKey?: (roundKey: string) => void;
  onOpenTestSettlement?: () => void;
  onOpenGame?: () => void;
  onKickPlayer: (clientId: string, durationMs?: number | null) => void;
  onTransferHost: (clientId: string) => void;
  onSuggestPlaylist: (
    type: "collection" | "playlist",
    value: string,
    options?: {
      useSnapshot?: boolean;
      sourceId?: string | null;
      title?: string | null;
    },
  ) => Promise<{ ok: boolean; error?: string }>;
  onApplySuggestionSnapshot: (suggestion: PlaylistSuggestion) => Promise<void>;
  onApplyPlaylistUrlDirect?: (url: string) => Promise<boolean>;
  onApplyCollectionDirect?: (
    collectionId: string,
    title?: string | null,
  ) => Promise<boolean>;
  onApplyYoutubePlaylistDirect?: (
    playlistId: string,
    title?: string | null,
  ) => Promise<boolean>;
  onPlaylistUrlChange: (value: string) => void;
  onFetchPlaylistByUrl: (url: string) => void;
  onResetPlaylist: () => void;
  onFetchCollections: (
    scope?: "owner" | "public",
    options?: { query?: string },
  ) => void;
  onLoadMoreCollections?: () => Promise<void>;
  onFetchYoutubePlaylists: () => void;
}

const LOBBY_INTERACTIVE_SELECTOR =
  "button, [role='button'], [role='tab'], .MuiButtonBase-root";
const ROOM_LOBBY_BGM_PATH = "/room-lobby-bgm.mp3";
const ROOM_LOBBY_BGM_FADE_IN_MS = 1200;

const noop = () => undefined;

const RoomLobbyPanel: React.FC<RoomLobbyPanelProps> = ({
  currentRoom,
  participants,
  selfClientId,
  roomPassword,
  selfAvatarUrl,
  playlistItems,
  playlistHasMore,
  playlistLoadingMore,
  playlistProgress,
  playlistSuggestions,
  playlistUrl,
  playlistItemsForChange,
  playlistPreviewMeta,
  playlistError,
  playlistLoading = false,
  collections,
  collectionsLoading,
  collectionsLoadingMore = false,
  collectionsHasMore = false,
  collectionsError,
  collectionItemsLoading,
  collectionItemsError,
  isGoogleAuthed = false,
  onRequestGoogleLogin,
  youtubePlaylists,
  youtubePlaylistsLoading,
  youtubePlaylistsError,
  isHost,
  gameState,
  canStartGame,
  onLeave,
  onLoadMorePlaylist,
  onStartGame,
  onUpdateRoomSettings,
  onOpenHistoryDrawer,
  onOpenTestSettlement,
  onOpenGame,
  onKickPlayer,
  onTransferHost,
  onSuggestPlaylist,
  onApplySuggestionSnapshot,
  onApplyPlaylistUrlDirect = async () => false,
  onApplyCollectionDirect = async () => false,
  onApplyYoutubePlaylistDirect = async () => false,
  onPlaylistUrlChange,
  onFetchPlaylistByUrl,
  onResetPlaylist,
  onFetchCollections,
  onLoadMoreCollections,
  onFetchYoutubePlaylists,
}) => {
  type MobileLobbyTab = "members" | "host" | "playlist";
  const rowCount = playlistItems.length + (playlistHasMore ? 1 : 0);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [roomCodeCopied, setRoomCodeCopied] = useState(false);
  const [inviteLinkCopied, setInviteLinkCopied] = useState(false);
  const [shareBlockedNotice, setShareBlockedNotice] = useState(false);
  const [sharePermissionSaving, setSharePermissionSaving] = useState(false);
  const [shareActionRunning, setShareActionRunning] = useState(false);
  const [showRoomPassword, setShowRoomPassword] = useState(false);
  const [selectorModalOpen, setSelectorModalOpen] = useState(false);
  const [selectorInitialTab, setSelectorInitialTab] = useState<
    "suggestions" | "public"
  >("public");
  const lastRequestedScopeRef = useRef<"public" | "owner" | null>(null);
  const lastFetchedScopeRef = useRef<"public" | "owner" | null>(null);
  const lastRequestedYoutubeRef = useRef(false);
  const hasAttemptedYoutubeFetchRef = useRef(false);
  const isCompactLobbyLayout = useMediaQuery("(max-width:1180px)");
  const isMobileLobbyLayout = useMediaQuery("(max-width:640px)");
  const isMobileTabletLobbyLayout = useMediaQuery("(max-width:1024px)");
  const settingsModel = React.useContext(SettingsModelContext);
  const gameVolume = settingsModel?.gameVolume ?? DEFAULT_GAME_VOLUME;
  const bgmVolume = settingsModel?.bgmVolume ?? DEFAULT_BGM_VOLUME;
  const sfxEnabled = settingsModel?.sfxEnabled ?? DEFAULT_SFX_ENABLED;
  const sfxVolume = settingsModel?.sfxVolume ?? DEFAULT_SFX_VOLUME;
  const sfxPreset = settingsModel?.sfxPreset ?? DEFAULT_SFX_PRESET;
  const avatarEffectLevel =
    settingsModel?.avatarEffectLevel ?? DEFAULT_AVATAR_EFFECT_LEVEL_VALUE;
  const { primeSfxAudio, playGameSfx } = useGameSfx({
    enabled: sfxEnabled,
    volume: Math.round((sfxVolume * gameVolume) / 100),
    preset: sfxPreset,
  });
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
  const lobbyBgmRef = useRef<HTMLAudioElement | null>(null);
  const lobbyBgmFadeFrameRef = useRef<number | null>(null);
  const lobbyBgmFadeStartedRef = useRef(false);
  const lobbyBgmFadeDoneRef = useRef(false);
  const lobbyBgmTargetVolumeRef = useRef(
    Math.max(0, Math.min(1, bgmVolume / 100)),
  );
  const [settingsName, setSettingsName] = useState("");
  const [settingsVisibility, setSettingsVisibility] = useState<
    "public" | "private"
  >("public");
  const [settingsPassword, setSettingsPassword] = useState("");
  const [settingsPasswordDirty, setSettingsPasswordDirty] = useState(false);
  const [settingsModeDraft, setSettingsModeDraft] = useState<{
    roomPlayMode: RoomPlayMode;
    leaderboardVariant: LeaderboardVariantKey;
  }>({
    roomPlayMode: "casual",
    leaderboardVariant: "30q",
  });
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
  const [
    settingsAllowCollectionClipTiming,
    setSettingsAllowCollectionClipTiming,
  ] = useState(true);
  const [settingsPlaybackExtensionMode, setSettingsPlaybackExtensionMode] =
    useState<PlaybackExtensionMode>(DEFAULT_PLAYBACK_EXTENSION_MODE);
  const [settingsMaxPlayers, setSettingsMaxPlayers] = useState("");
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const settingsRoomPlayMode = settingsModeDraft.roomPlayMode;
  const settingsLeaderboardVariant = settingsModeDraft.leaderboardVariant;
  const formattedRoomCode = currentRoom?.roomCode
    ? `${currentRoom.roomCode.slice(0, 3)}-${currentRoom.roomCode.slice(3)}`
    : null;
  const [mobileLobbyTab, setMobileLobbyTab] =
    useState<MobileLobbyTab>("members");
  const lastLobbyHoverAtRef = useRef(0);
  const lastLobbyHoverTargetRef = useRef<HTMLElement | null>(null);
  const maskedRoomPassword = roomPassword
    ? "*".repeat(roomPassword.length)
    : "";
  const playlistRowHeight = isMobileLobbyLayout ? 72 : 84;
  const desktopPlaylistVisibleRows = 5.5;
  const playlistViewportMinHeight = isMobileLobbyLayout
    ? 340
    : isCompactLobbyLayout
      ? 300
      : desktopPlaylistVisibleRows * playlistRowHeight;
  const playlistViewportMaxHeight = isMobileLobbyLayout
    ? 480
    : isCompactLobbyLayout
      ? 360
      : desktopPlaylistVisibleRows * playlistRowHeight;
  const playlistListViewportHeight = Math.min(
    playlistViewportMaxHeight,
    Math.max(
      playlistViewportMinHeight,
      Math.max(rowCount, isMobileLobbyLayout ? 2 : desktopPlaylistVisibleRows) *
        playlistRowHeight,
    ),
  );
  const playlistListShellStyle = (
    isMobileLobbyLayout
      ? {
          minHeight: playlistViewportMinHeight,
          height: playlistListViewportHeight,
        }
      : {
          height: playlistListViewportHeight,
        }
  ) as React.CSSProperties;
  const playlistListViewportStyle = {
    height: playlistListViewportHeight,
    width: "100%",
  } as React.CSSProperties;
  const displayRoomName = normalizeDisplayText(currentRoom?.name, "未命名房間");
  const isPrivateRoom = currentRoom?.visibility === "private";
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

  useEffect(() => {
    if (typeof window === "undefined" || typeof Audio === "undefined") return;

    const audio = new Audio(ROOM_LOBBY_BGM_PATH);
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = 0;
    lobbyBgmRef.current = audio;
    lobbyBgmFadeStartedRef.current = false;
    lobbyBgmFadeDoneRef.current = false;
    const cancelFadeFrame = () => {
      if (lobbyBgmFadeFrameRef.current !== null) {
        window.cancelAnimationFrame(lobbyBgmFadeFrameRef.current);
        lobbyBgmFadeFrameRef.current = null;
      }
    };

    const runInitialFadeIn = () => {
      if (lobbyBgmFadeDoneRef.current) {
        audio.volume = lobbyBgmTargetVolumeRef.current;
        return;
      }
      if (lobbyBgmFadeStartedRef.current) return;
      lobbyBgmFadeStartedRef.current = true;
      cancelFadeFrame();
      const startedAt = performance.now();
      const tick = (now: number) => {
        const progress = Math.max(
          0,
          Math.min(1, (now - startedAt) / ROOM_LOBBY_BGM_FADE_IN_MS),
        );
        audio.volume = lobbyBgmTargetVolumeRef.current * progress;
        if (progress >= 1) {
          lobbyBgmFadeDoneRef.current = true;
          lobbyBgmFadeFrameRef.current = null;
          return;
        }
        lobbyBgmFadeFrameRef.current = window.requestAnimationFrame(tick);
      };
      lobbyBgmFadeFrameRef.current = window.requestAnimationFrame(tick);
    };

    const playLobbyBgm = () => {
      if (document.hidden) return;

      let playResult: Promise<void> | undefined;
      try {
        playResult = audio.play() as Promise<void> | undefined;
      } catch {
        return;
      }

      if (!playResult) {
        if (!lobbyBgmFadeStartedRef.current) {
          runInitialFadeIn();
        }
        return;
      }

      void playResult
        .then(() => {
          if (lobbyBgmFadeDoneRef.current) {
            audio.volume = lobbyBgmTargetVolumeRef.current;
            return;
          }
          if (!lobbyBgmFadeStartedRef.current) {
            runInitialFadeIn();
          }
        })
        .catch(() => {
          // Browser autoplay policy may block until the next user gesture.
        });
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        audio.pause();
        return;
      }
      playLobbyBgm();
    };

    const handleWindowBlur = () => {
      audio.pause();
    };

    const handleWindowFocus = () => {
      playLobbyBgm();
    };

    playLobbyBgm();
    window.addEventListener("pointerdown", playLobbyBgm, { passive: true });
    window.addEventListener("keydown", playLobbyBgm);
    window.addEventListener("focus", handleWindowFocus);
    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelFadeFrame();
      window.removeEventListener("pointerdown", playLobbyBgm);
      window.removeEventListener("keydown", playLobbyBgm);
      window.removeEventListener("focus", handleWindowFocus);
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      try {
        audio.pause();
        audio.currentTime = 0;
        audio.src = "";
      } catch {
        // Media element teardown can fail in non-browser environments.
      }
      lobbyBgmRef.current = null;
    };
  }, []);

  useEffect(() => {
    const nextVolume = Math.max(0, Math.min(1, bgmVolume / 100));
    lobbyBgmTargetVolumeRef.current = nextVolume;
    if (!lobbyBgmRef.current || !lobbyBgmFadeDoneRef.current) return;
    lobbyBgmRef.current.volume = nextVolume;
  }, [bgmVolume]);

  const questionMaxLimit = getQuestionMax(
    currentRoom?.playlist.totalCount ?? 0,
  );
  const questionMinLimit = Math.min(QUESTION_MIN, questionMaxLimit);
  const settingsDisabled = gameState?.status === "playing" || !isHost;
  const settingsSourceItems =
    playlistItemsForChange.length > 0 ? playlistItemsForChange : playlistItems;
  const settingsUseCollectionSource = useMemo(
    () =>
      settingsSourceItems.some(
        (item) =>
          item.provider === "collection" ||
          typeof item.collectionClipStartSec === "number" ||
          typeof item.collectionClipEndSec === "number" ||
          item.collectionHasExplicitStartSec === true ||
          item.collectionHasExplicitEndSec === true,
      ),
    [settingsSourceItems],
  );
  const currentRoomLeaderboardVariant =
    useMemo<LeaderboardVariantKey | null>(() => {
      const variantKey = currentRoom?.gameSettings?.leaderboardVariantKey;
      if (
        variantKey === "30q" ||
        variantKey === "50q" ||
        variantKey === "15m"
      ) {
        return variantKey;
      }
      const profileKey = currentRoom?.gameSettings?.leaderboardProfileKey;
      if (profileKey === "classic_50") return "50q";
      if (profileKey === "time_attack_15m") return "15m";
      if (profileKey === "classic_30") return "30q";
      return null;
    }, [
      currentRoom?.gameSettings?.leaderboardProfileKey,
      currentRoom?.gameSettings?.leaderboardVariantKey,
    ]);
  const currentRoomPlayMode = currentRoomLeaderboardVariant
    ? "leaderboard"
    : "casual";
  const isLeaderboardRoom = Boolean(
    currentRoom?.gameSettings?.leaderboardProfileKey,
  );
  const leaderboardCollectionOnlyReason = "排行挑戰僅支援收藏庫";
  const canUseLeaderboard30 = questionMaxLimit >= 30;
  const canUseLeaderboard50 = questionMaxLimit >= 50;
  const canUseLeaderboard15m = participants.length <= 1;
  const leaderboardQuestionHelpText = !canUseLeaderboard30
    ? "目前歌單少於 30 首，因此排行榜預設模式會受到限制。"
    : !canUseLeaderboard50
      ? "目前歌單少於 50 首，因此暫時無法使用 50 題挑戰。"
      : "排行榜房間的題數模式只允許 30 題、50 題或 15 分鐘限時。";
  const normalizeLeaderboardVariant = React.useCallback(
    (
      preferredVariant: LeaderboardVariantKey | null | undefined,
    ): LeaderboardVariantKey => {
      if (preferredVariant === "15m" && canUseLeaderboard15m) return "15m";
      if (preferredVariant === "50q" && canUseLeaderboard50) return "50q";
      if (preferredVariant === "30q" && canUseLeaderboard30) return "30q";
      if (canUseLeaderboard30) return "30q";
      if (canUseLeaderboard50) return "50q";
      if (canUseLeaderboard15m) return "15m";
      return "30q";
    },
    [canUseLeaderboard15m, canUseLeaderboard30, canUseLeaderboard50],
  );
  const [startCountdownNow, setStartCountdownNow] = useState(() => Date.now());
  useEffect(() => {
    if (gameState?.status !== "playing") return;
    const remainingMs = gameState.startedAt - Date.now();
    if (remainingMs <= 0) return;
    let timerId: number | null = null;
    const tick = () => {
      const now = Date.now();
      setStartCountdownNow(now);
      const nextRemainingMs = Math.max(0, gameState.startedAt - now);
      if (nextRemainingMs <= 0) return;
      timerId = window.setTimeout(tick, nextRemainingMs <= 5000 ? 250 : 1000);
    };
    tick();
    return () => {
      if (timerId !== null) window.clearTimeout(timerId);
    };
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

  const extractPlaylistId = React.useCallback((url: string) => {
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
  }, []);
  const isCollectionsEmptyNotice = Boolean(
    collectionsError &&
    (collectionsError.toLowerCase().includes("no collections") ||
      collectionsError.includes("收藏庫")),
  );
  useEffect(() => {
    if (collectionsLoading) return;
    const requested = lastRequestedScopeRef.current;
    if (!requested) return;
    if (!collectionsError || isCollectionsEmptyNotice) {
      lastFetchedScopeRef.current = requested;
    }
  }, [collectionsError, collectionsLoading, isCollectionsEmptyNotice]);

  useEffect(() => {
    if (youtubePlaylistsLoading) return;
    if (!lastRequestedYoutubeRef.current) return;
    hasAttemptedYoutubeFetchRef.current = true;
  }, [youtubePlaylistsLoading]);

  const shouldFetchYoutube = React.useCallback(() => {
    if (!isGoogleAuthed || youtubePlaylistsLoading) return false;
    return !hasAttemptedYoutubeFetchRef.current;
  }, [isGoogleAuthed, youtubePlaylistsLoading]);

  const requestYoutubePlaylists = React.useCallback(
    (force = false) => {
      if (!isGoogleAuthed) return;
      if (!force && !shouldFetchYoutube()) return;
      lastRequestedYoutubeRef.current = true;
      hasAttemptedYoutubeFetchRef.current = true;
      onFetchYoutubePlaylists();
    },
    [isGoogleAuthed, onFetchYoutubePlaylists, shouldFetchYoutube],
  );

  useEffect(() => {
    if (isGoogleAuthed) return;
    lastRequestedYoutubeRef.current = false;
    hasAttemptedYoutubeFetchRef.current = false;
  }, [isGoogleAuthed]);

  const latestSuggestionAt = playlistSuggestions.reduce(
    (max, suggestion) => Math.max(max, suggestion.suggestedAt),
    0,
  );
  const markSuggestionsSeen = React.useCallback(() => {
    if (latestSuggestionAt > 0) {
      setLastSuggestionSeenAt(latestSuggestionAt);
    }
  }, [latestSuggestionAt]);
  const newSuggestionCount = useMemo(
    () =>
      playlistSuggestions.reduce(
        (count, suggestion) =>
          suggestion.suggestedAt > lastSuggestionSeenAt ? count + 1 : count,
        0,
      ),
    [lastSuggestionSeenAt, playlistSuggestions],
  );
  const hasNewSuggestions = isHost && newSuggestionCount > 0;

  const closeActionMenu = React.useCallback(() => {
    setActionAnchorEl(null);
    setActionTargetId(null);
  }, []);

  const openSettingsModal = React.useCallback(() => {
    if (!currentRoom) return;
    setSettingsSaving(false);
    setSettingsName(currentRoom.name);
    setSettingsVisibility(currentRoom.visibility ?? "public");
    setSettingsPassword(roomPassword ?? "");
    setSettingsPasswordDirty(false);
    const baseQuestion =
      currentRoom.gameSettings?.questionCount ?? QUESTION_MIN;
    setSettingsModeDraft({
      roomPlayMode: currentRoomPlayMode,
      leaderboardVariant: normalizeLeaderboardVariant(
        currentRoomLeaderboardVariant,
      ),
    });
    setSettingsQuestionCount(
      clampQuestionCount(baseQuestion, questionMaxLimit),
    );
    const basePlayDurationSec =
      currentRoom.gameSettings?.playDurationSec ?? DEFAULT_PLAY_DURATION_SEC;
    const baseRevealDurationSec =
      currentRoom.gameSettings?.revealDurationSec ??
      DEFAULT_REVEAL_DURATION_SEC;
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
  }, [
    currentRoom,
    currentRoomLeaderboardVariant,
    currentRoomPlayMode,
    normalizeLeaderboardVariant,
    questionMaxLimit,
    roomPassword,
  ]);

  const closeSettingsModal = React.useCallback(() => {
    if (settingsSaving) return;
    setSettingsOpen(false);
    setSettingsError(null);
  }, [settingsSaving]);

  React.useEffect(() => {
    if (!settingsOpen) return;
    if (settingsRoomPlayMode !== "leaderboard") return;
    const normalizedVariant = normalizeLeaderboardVariant(
      settingsLeaderboardVariant,
    );
    if (normalizedVariant === settingsLeaderboardVariant) return;
    setSettingsModeDraft((current) =>
      current.roomPlayMode === "leaderboard" &&
      current.leaderboardVariant !== normalizedVariant
        ? {
            ...current,
            leaderboardVariant: normalizedVariant,
          }
        : current,
    );
  }, [
    settingsLeaderboardVariant,
    settingsOpen,
    settingsRoomPlayMode,
    normalizeLeaderboardVariant,
  ]);

  React.useEffect(() => {
    if (!settingsOpen) return;
    if (isHost) return;
    setSettingsOpen(false);
    setSettingsSaving(false);
    setSettingsError(null);
  }, [isHost, settingsOpen]);

  const handleSettingsRoomPlayModeChange = React.useCallback(
    (value: RoomPlayMode) => {
      if (settingsError) {
        setSettingsError(null);
      }
      if (value === "casual") {
        setSettingsModeDraft((current) => ({
          ...current,
          roomPlayMode: "casual",
        }));
        return;
      }
      setSettingsModeDraft((current) => ({
        roomPlayMode: "leaderboard",
        leaderboardVariant: normalizeLeaderboardVariant(
          current.leaderboardVariant,
        ),
      }));
    },
    [normalizeLeaderboardVariant, settingsError],
  );

  const handleSettingsLeaderboardVariantChange = React.useCallback(
    (value: LeaderboardVariantKey) => {
      const normalizedVariant = normalizeLeaderboardVariant(value);
      if (normalizedVariant === "15m" && participants.length > 1) {
        setSettingsError("15 分鐘限時挑戰僅能在房內只有你自己時使用。");
        return;
      }
      if (settingsError) {
        setSettingsError(null);
      }
      setSettingsModeDraft({
        roomPlayMode: "leaderboard",
        leaderboardVariant: normalizedVariant,
      });
    },
    [normalizeLeaderboardVariant, participants.length, settingsError],
  );

  const handleSaveSettings = React.useCallback(async () => {
    if (settingsDisabled || settingsSaving) return;
    const trimmedName = settingsName.trim();
    if (!trimmedName) {
      setSettingsError("請輸入房間名稱。");
      return;
    }
    const parsedMaxPlayers = settingsMaxPlayers.trim()
      ? Number(settingsMaxPlayers)
      : null;
    if (parsedMaxPlayers !== null && !Number.isFinite(parsedMaxPlayers)) {
      setSettingsError("人數上限格式不正確。");
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
      setSettingsError(
        `人數上限必須介於 ${PLAYER_MIN} 到 ${PLAYER_MAX} 之間。`,
      );
      return;
    }

    const normalizedPin = settingsPassword.trim();
    if (normalizedPin && !/^\d{4}$/.test(normalizedPin)) {
      setSettingsError("PIN 必須為 4 碼數字。");
      return;
    }

    const basePayload = {
      name: trimmedName,
      visibility: settingsVisibility,
      maxPlayers:
        settingsRoomPlayMode === "leaderboard" &&
        settingsLeaderboardVariant === "15m"
          ? 1
          : effectiveMaxPlayers,
      ...(settingsPasswordDirty ? { pin: normalizedPin } : {}),
    };

    const payload =
      settingsRoomPlayMode === "leaderboard"
        ? {
            ...basePayload,
            ...(settingsLeaderboardVariant === "15m"
              ? {}
              : {
                  questionCount: clampQuestionCount(
                    settingsLeaderboardVariant === "50q" ? 50 : 30,
                    questionMaxLimit,
                  ),
                }),
            leaderboardProfileKey: getLeaderboardProfileKey(
              settingsLeaderboardVariant === "15m" ? "time_attack" : "classic",
              settingsLeaderboardVariant,
            ),
            leaderboardModeKey:
              settingsLeaderboardVariant === "15m" ? "time_attack" : "classic",
            leaderboardVariantKey: settingsLeaderboardVariant,
            leaderboardTargetQuestionCount:
              settingsLeaderboardVariant === "15m"
                ? null
                : settingsLeaderboardVariant === "50q"
                  ? 50
                  : 30,
            leaderboardTimeLimitSec:
              settingsLeaderboardVariant === "15m" ? 15 * 60 : null,
            leaderboardRuleVersion: null,
            leaderboardRankingMetric: null,
          }
        : {
            ...basePayload,
            questionCount: clampQuestionCount(
              settingsQuestionCount,
              questionMaxLimit,
            ),
            playDurationSec: clampPlayDurationSec(settingsPlayDurationSec),
            revealDurationSec: clampRevealDurationSec(
              settingsRevealDurationSec,
            ),
            startOffsetSec: clampStartOffsetSec(settingsStartOffsetSec),
            allowCollectionClipTiming: settingsAllowCollectionClipTiming,
            playbackExtensionMode: settingsPlaybackExtensionMode,
            leaderboardProfileKey: null,
            leaderboardRuleVersion: null,
            leaderboardModeKey: null,
            leaderboardVariantKey: null,
            leaderboardTargetQuestionCount: null,
            leaderboardTimeLimitSec: null,
            leaderboardRankingMetric: null,
          };

    if (settingsRoomPlayMode === "leaderboard") {
      if (settingsLeaderboardVariant === "15m" && participants.length > 1) {
        setSettingsError("15 分鐘限時挑戰僅能在房內只有你自己時使用。");
        return;
      }
      if (settingsLeaderboardVariant === "30q" && !canUseLeaderboard30) {
        setSettingsError("目前歌單不足 30 首，無法使用 30 題挑戰。");
        return;
      }
      if (settingsLeaderboardVariant === "50q" && !canUseLeaderboard50) {
        setSettingsError("目前歌單不足 50 首，無法使用 50 題挑戰。");
        return;
      }
    }

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
  }, [
    canUseLeaderboard30,
    canUseLeaderboard50,
    onUpdateRoomSettings,
    questionMaxLimit,
    settingsAllowCollectionClipTiming,
    settingsDisabled,
    settingsLeaderboardVariant,
    settingsMaxPlayers,
    settingsName,
    settingsPassword,
    settingsPasswordDirty,
    settingsPlaybackExtensionMode,
    settingsPlayDurationSec,
    settingsQuestionCount,
    settingsRevealDurationSec,
    settingsRoomPlayMode,
    settingsSaving,
    settingsStartOffsetSec,
    settingsVisibility,
    participants.length,
  ]);

  const handleSaveSettingsClick = React.useCallback(() => {
    void handleSaveSettings();
  }, [handleSaveSettings]);

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

  const handleToggleShowRoomPassword = React.useCallback(
    () => setShowRoomPassword((prev) => !prev),
    [],
  );

  const handleOpenPlaylistItem = React.useCallback((url?: string | null) => {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  const playlistRowProps = React.useMemo<Record<string, never>>(() => ({}), []);

  const PlaylistRow = React.useCallback(
    ({ index, style, ariaAttributes }: RowComponentProps) => {
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
      const displayUploader = normalizeDisplayText(
        item.uploader ?? "",
        "Unknown",
      );
      const playlistAuthorHref = resolveSettlementTrackLink({
        provider: item.provider,
        sourceId: item.sourceId ?? null,
        channelId: item.channelId ?? undefined,
        videoId: item.videoId,
        url: item.url ?? "",
        title: item.title ?? "",
        answerText: item.answerText ?? item.title ?? "",
        uploader: item.uploader ?? displayUploader,
      }).authorHref;

      return (
        <div style={style}>
          <div className="room-lobby-playlist-row px-3.5 py-2.5 flex items-center gap-3 border-b border-slate-800/60">
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
                      className="mq-title-link mq-title-link--list room-lobby-playlist-row-link room-lobby-playlist-row-link--button"
                      onClick={() => handleOpenPlaylistItem(item.url)}
                      aria-label={`開啟歌曲：${displayTitle}`}
                    >
                      {displayTitle}
                    </button>
                  ) : (
                    <span className="mq-title-link mq-title-link--list room-lobby-playlist-row-link">
                      {displayTitle}
                    </span>
                  )}
                </Typography>

                <p className="text-[11px] text-slate-400">
                  {playlistAuthorHref ? (
                    <a
                      href={playlistAuthorHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={playlistAuthorHref}
                      data-author-href={playlistAuthorHref}
                      className="mq-author-link mq-author-link--subtle"
                    >
                      {displayUploader}
                    </a>
                  ) : (
                    displayUploader
                  )}
                  {item.duration ? ` · ${item.duration}` : ""}
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    },
    [
      handleOpenPlaylistItem,
      onLoadMorePlaylist,
      playlistHasMore,
      playlistItems,
      playlistLoadingMore,
    ],
  );

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
  const allowParticipantInvite =
    currentRoom?.gameSettings?.allowParticipantInvite ?? false;
  const canUseShareInvite = isHost || allowParticipantInvite;
  const shareButtonLabel = canUseShareInvite ? "分享邀請" : "分享邀請未開放";
  const inviteLink = React.useMemo(() => {
    const inviteReference = currentRoom?.roomCode?.trim() || currentRoom?.id;
    if (!inviteReference || typeof window === "undefined") return "";
    const url = new URL(window.location.href);
    url.pathname = `/invited/${inviteReference}`;
    url.search = "";
    return url.toString();
  }, [currentRoom?.id, currentRoom?.roomCode]);
  const shareMessage = React.useMemo(() => {
    const roomName = currentRoom?.name?.trim() || "一起來猜歌";
    const code = currentRoom?.roomCode?.trim() || "--";
    const segments = [`${roomName}`, `房號：${code}`];
    if (inviteLink) {
      segments.push(`邀請連結：${inviteLink}`);
    }
    if (roomPassword) {
      segments.push(`房間密碼：${roomPassword}`);
    }
    return segments.join("\n");
  }, [currentRoom?.name, currentRoom?.roomCode, inviteLink, roomPassword]);
  const canUseNativeShare =
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    Boolean(shareMessage);

  const flashCopiedState = React.useCallback(
    (kind: "roomCode" | "inviteLink") => {
      if (kind === "roomCode") {
        setRoomCodeCopied(true);
        window.setTimeout(() => setRoomCodeCopied(false), 1800);
        return;
      }
      setInviteLinkCopied(true);
      window.setTimeout(() => setInviteLinkCopied(false), 1800);
    },
    [],
  );

  const copyText = React.useCallback(
    async (value: string, kind: "roomCode" | "inviteLink") => {
      if (!value) return;
      try {
        await navigator.clipboard.writeText(value);
        flashCopiedState(kind);
      } catch {
        if (kind === "roomCode") {
          setRoomCodeCopied(false);
          return;
        }
        setInviteLinkCopied(false);
      }
    },
    [flashCopiedState],
  );

  const handleCopyRoomCode = React.useCallback(() => {
    if (!currentRoom?.roomCode) return;
    void copyText(currentRoom.roomCode, "roomCode");
  }, [copyText, currentRoom?.roomCode]);

  const handleCopyInviteLink = React.useCallback(() => {
    if (!inviteLink) return;
    void copyText(inviteLink, "inviteLink");
  }, [copyText, inviteLink]);
  const handleNativeShare = React.useCallback(async () => {
    if (!canUseNativeShare || !currentRoom) return;
    try {
      setShareActionRunning(true);
      await navigator.share({
        title: currentRoom.name || "分享邀請",
        text: shareMessage,
        url: inviteLink || undefined,
      });
    } catch {
      // Ignore cancelled native share.
    } finally {
      setShareActionRunning(false);
    }
  }, [canUseNativeShare, currentRoom, inviteLink, shareMessage]);

  const handleOpenShareDialog = React.useCallback(() => {
    if (!canUseShareInvite) {
      setShareBlockedNotice(true);
      window.setTimeout(() => setShareBlockedNotice(false), 1800);
      return;
    }
    setShareDialogOpen(true);
  }, [canUseShareInvite]);

  const handleToggleInvitePermission = React.useCallback(
    async (nextValue: boolean) => {
      if (!isHost || sharePermissionSaving) return;
      setSharePermissionSaving(true);
      await onUpdateRoomSettings({
        allowParticipantInvite: nextValue,
      });
      setSharePermissionSaving(false);
    },
    [isHost, onUpdateRoomSettings, sharePermissionSaving],
  );

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
      ...(onOpenTestSettlement
        ? [
            {
              key: "test-settlement",
              label: "測試結算",
              compactLabel: "測試",
              icon: <ScienceRoundedIcon fontSize="small" />,
              onClick: () => onOpenTestSettlement(),
              disabled: false,
              tone: "normal" as const,
              title: "使用假資料直接開啟結算頁",
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
      onOpenTestSettlement,
      requestLeaveRoom,
      settingsActionDisabledReason,
      isHost,
    ],
  );
  const mobileBottomActionButtons = useMemo(
    () =>
      Array.from(
        new Map(
          mobileActionButtons.map((action) => [action.key, action]),
        ).values(),
      ),
    [mobileActionButtons],
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
    [isHost, requestLeaveRoom, openSettingsModal, settingsActionDisabledReason],
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
  const roomMax =
    currentRoom?.maxPlayers && currentRoom.maxPlayers > 0
      ? Math.min(
          Math.max(
            currentRoom.maxPlayers,
            Math.max(participants.length, PLAYER_MIN),
          ),
          PLAYER_MAX,
        )
      : Math.min(Math.max(participants.length, PLAYER_MIN), PLAYER_MAX);
  const openSlotCount = Math.max(0, roomMax - participants.length);
  const canIncreasePlayers = isHost && roomMax < PLAYER_MAX;
  const canDecreasePlayers =
    isHost && roomMax > Math.max(PLAYER_MIN, participants.length);
  const updateRoomMaxPlayers = useCallback(
    async (nextMaxPlayers: number) => {
      if (!currentRoom) return;
      const normalizedMaxPlayers = Math.min(
        PLAYER_MAX,
        Math.max(PLAYER_MIN, Math.floor(nextMaxPlayers)),
      );
      await onUpdateRoomSettings({ maxPlayers: normalizedMaxPlayers });
    },
    [currentRoom, onUpdateRoomSettings],
  );
  const handleAddPlayerSlot = useCallback(() => {
    if (!canIncreasePlayers) return;
    void updateRoomMaxPlayers(roomMax + 1);
  }, [canIncreasePlayers, roomMax, updateRoomMaxPlayers]);
  const handleRemovePlayerSlot = useCallback(() => {
    if (!canDecreasePlayers) return;
    void updateRoomMaxPlayers(roomMax - 1);
  }, [canDecreasePlayers, roomMax, updateRoomMaxPlayers]);
  const handleOpenPlayerAction = useCallback(
    (targetId: string, anchor: HTMLElement) => {
      setActionAnchorEl(anchor);
      setActionTargetId(targetId);
    },
    [],
  );
  const hasRoomPassword = Boolean(
    currentRoom?.hasPin ?? currentRoom?.hasPassword,
  );
  const hasPassedPinVerification = Boolean(roomPassword);
  const canToggleRoomPassword = isHost || hasPassedPinVerification;
  const visibleRoomPassword = roomPassword
    ? showRoomPassword
      ? roomPassword
      : maskedRoomPassword
    : "****";
  const roomMetaItems: RoomMetaItem[] = [
    {
      key: "mode",
      label: "遊戲模式",
      value: isLeaderboardRoom ? "排行挑戰" : "休閒派對",
      icon: isLeaderboardRoom ? (
        <EmojiEventsRoundedIcon fontSize="small" />
      ) : (
        <ChairRoundedIcon fontSize="small" />
      ),
      tone: isLeaderboardRoom ? "amber" : "cyan",
    },
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
      value:
        isLeaderboardRoom || roomAllowCollectionClipTiming
          ? "依收藏庫設定"
          : `${roomPlayDurationSec}s`,
      icon: <HourglassTopRoundedIcon fontSize="small" />,
      tone: "cyan",
    },
    {
      key: "start-offset",
      label: "起始時間",
      value:
        isLeaderboardRoom || roomAllowCollectionClipTiming
          ? "依收藏庫設定"
          : `${roomStartOffsetSec}s`,
      icon: <FastForwardRoundedIcon fontSize="small" />,
      tone: "cyan",
    },
    {
      key: "reveal",
      label: "公布時間",
      value: `${roomRevealDurationSec}s`,
      icon: <TimerRoundedIcon fontSize="small" />,
      tone: "cyan",
    },
  ];
  if (hasRoomPassword) {
    roomMetaItems.push({
      key: "password",
      label: "房間密碼",
      value: visibleRoomPassword,
      icon: <KeyRoundedIcon fontSize="small" />,
      tone: "password",
      trailing: canToggleRoomPassword ? (
        <RoomUiTooltip
          title={showRoomPassword ? "隱藏房間 PIN" : "顯示房間 PIN"}
        >
          <button
            type="button"
            className="room-lobby-metric-trailing-icon room-lobby-metric-trailing-icon--toggle"
            aria-label={showRoomPassword ? "隱藏房間 PIN" : "顯示房間 PIN"}
            onClick={handleToggleShowRoomPassword}
          >
            {showRoomPassword ? (
              <VisibilityOffRoundedIcon fontSize="small" />
            ) : (
              <VisibilityRoundedIcon fontSize="small" />
            )}
          </button>
        </RoomUiTooltip>
      ) : undefined,
    });
  }

  const inviteToolbarButton = (
    <Button
      variant="outlined"
      size="small"
      color="inherit"
      className={`room-lobby-toolbar-history-btn room-lobby-toolbar-icon-btn room-lobby-action-btn--invite room-lobby-toolbar-icon-btn--invite ${
        !canUseShareInvite ? "room-lobby-action-btn--invite-locked" : ""
      }`}
      aria-disabled={!canUseShareInvite}
      aria-label={shareButtonLabel}
      onClick={handleOpenShareDialog}
    >
      <span className="room-lobby-toolbar-icon-btn__icon" aria-hidden="true">
        <ShareRoundedIcon fontSize="small" />
      </span>
      <span className="room-lobby-sr-only">{shareButtonLabel}</span>
      <span className="room-lobby-toolbar-floating-label" aria-hidden="true">
        {!canUseShareInvite && shareBlockedNotice
          ? "房主未開放"
          : !canUseShareInvite
            ? "已鎖定"
            : "分享"}
      </span>
    </Button>
  );
  const shareBlockedToast =
    shareBlockedNotice && !canUseShareInvite ? (
      <div className="room-lobby-share-toast" role="status" aria-live="polite">
        房主尚未開啟玩家邀請權限
      </div>
    ) : null;

  const participantsPanel = (
    <RoomLobbyParticipantsPanel
      hostClientId={currentRoom?.hostClientId}
      participants={participants}
      selfClientId={selfClientId}
      selfAvatarUrl={selfAvatarUrl}
      isHost={isHost}
      avatarEffectLevel={avatarEffectLevel}
      playerCountLabel={playerCountLabel}
      openSlotCount={openSlotCount}
      canDecreasePlayers={canDecreasePlayers}
      canIncreasePlayers={canIncreasePlayers}
      actionAnchorEl={actionAnchorEl}
      actionTargetId={actionTargetId}
      closeActionMenu={closeActionMenu}
      onOpenPlayerAction={handleOpenPlayerAction}
      onTransferHost={onTransferHost}
      onKickPlayer={onKickPlayer}
      onRemovePlayerSlot={handleRemovePlayerSlot}
      onAddPlayerSlot={handleAddPlayerSlot}
    />
  );

  const desktopCombinedPlaylistPanel = !isMobileTabletLobbyLayout ? (
    <div className="room-lobby-current-playlist-list">
      <RoomLobbyPlaylistPanel
        playlistProgress={playlistProgress}
        playlistItems={playlistItems}
        playlistListShellStyle={playlistListShellStyle}
        playlistListViewportStyle={playlistListViewportStyle}
        rowCount={rowCount}
        playlistRowHeight={playlistRowHeight}
        playlistRowProps={playlistRowProps}
        playlistRowComponent={PlaylistRow}
        showHeader={false}
      />
    </div>
  ) : null;

  const handleRecordSourceApplied = React.useCallback(
    (entry: {
      sourceType:
        | "public_collection"
        | "private_collection"
        | "youtube_google_import"
        | "youtube_pasted_link";
      title: string;
      sourceId?: string | null;
      url?: string | null;
      thumbnailUrl?: string | null;
      itemCount?: number | null;
    }) => {
      pushRoomLobbyPlaylistSourceHistory(entry);
    },
    [],
  );

  const hostPanel = isHost ? (
    <div className="room-lobby-current-playlist-stack">
      <CurrentPlaylistCard
        room={currentRoom}
        playlistCount={
          playlistProgress.total > 0
            ? playlistProgress.total
            : playlistItems.length
        }
        isHost={isHost}
        pendingSuggestionCount={newSuggestionCount}
        collectionOnlyMode={isLeaderboardRoom}
        collectionOnlyReason={leaderboardCollectionOnlyReason}
        onChange={(initialTab = "public") => {
          // Only mark suggestions seen when the host explicitly opens the
          // "推薦" tab via the suggestion chip — not on every modal open.
          if (initialTab === "suggestions") markSuggestionsSeen();
          setSelectorInitialTab(initialTab);
          setSelectorModalOpen(true);
        }}
        changeDisabled={gameState?.status === "playing"}
        actionLabel="更換題庫"
      />
      {desktopCombinedPlaylistPanel}
    </div>
  ) : (
    <div className="room-lobby-current-playlist-stack">
      <CurrentPlaylistCard
        room={currentRoom}
        playlistCount={
          playlistProgress.total > 0
            ? playlistProgress.total
            : playlistItems.length
        }
        isHost={false}
        pendingSuggestionCount={0}
        collectionOnlyMode={isLeaderboardRoom}
        collectionOnlyReason={leaderboardCollectionOnlyReason}
        onChange={(initialTab = "public") => {
          setSelectorInitialTab(initialTab);
          setSelectorModalOpen(true);
        }}
        changeDisabled={gameState?.status === "playing"}
        actionLabel="推薦題庫"
      />
      {desktopCombinedPlaylistPanel}
    </div>
  );

  const playlistSelectorModal = (
    <PlaylistSelectorModal
      open={selectorModalOpen}
      onClose={() => setSelectorModalOpen(false)}
      isHost={isHost}
      isGoogleAuthed={isGoogleAuthed}
      playlistUrl={playlistUrl}
      playlistItemsForChange={playlistItemsForChange}
      playlistPreviewMeta={playlistPreviewMeta}
      playlistError={playlistError}
      playlistLoading={playlistLoading}
      playlistSuggestions={playlistSuggestions}
      collections={collections}
      collectionsLoading={collectionsLoading}
      collectionsLoadingMore={collectionsLoadingMore}
      collectionsHasMore={collectionsHasMore}
      collectionsError={collectionsError}
      collectionItemsLoading={collectionItemsLoading}
      collectionItemsError={collectionItemsError}
      youtubePlaylists={youtubePlaylists}
      youtubePlaylistsLoading={youtubePlaylistsLoading}
      youtubePlaylistsError={youtubePlaylistsError}
      onPlaylistUrlChange={onPlaylistUrlChange}
      onPreviewPlaylistUrl={onFetchPlaylistByUrl}
      onResetPlaylist={onResetPlaylist}
      onApplyPlaylistUrlDirect={onApplyPlaylistUrlDirect}
      onApplyCollectionDirect={onApplyCollectionDirect}
      onApplyYoutubePlaylistDirect={onApplyYoutubePlaylistDirect}
      onApplySuggestionSnapshot={onApplySuggestionSnapshot}
      onFetchCollections={onFetchCollections}
      onLoadMoreCollections={() => {
        void onLoadMoreCollections?.();
      }}
      onFetchYoutubePlaylists={requestYoutubePlaylists}
      onRequestGoogleLogin={onRequestGoogleLogin ?? noop}
      onSuggestPlaylist={onSuggestPlaylist}
      extractPlaylistId={extractPlaylistId}
      openConfirmModal={openConfirmModal}
      onMarkSuggestionsSeen={markSuggestionsSeen}
      initialTab={selectorInitialTab}
      leaderboardCollectionOnlyMode={isLeaderboardRoom}
      leaderboardCollectionOnlyReason={leaderboardCollectionOnlyReason}
      onRecordSourceApplied={handleRecordSourceApplied}
      currentSourceType={
        currentRoom?.playlistSourceType ??
        currentRoom?.playlist?.sourceType ??
        null
      }
      currentSourceIds={[
        currentRoom?.playlist?.id ?? null,
        currentRoom?.playlistId ?? null,
        currentRoom?.playlistCoverSourceId ?? null,
      ].filter((value): value is string => Boolean(value))}
    />
  );

  const controlPanel = hostPanel ?? null;

  const playlistPanel = (
    <div>
      <RoomLobbyPlaylistPanel
        playlistProgress={playlistProgress}
        playlistItems={playlistItems}
        playlistListShellStyle={playlistListShellStyle}
        playlistListViewportStyle={playlistListViewportStyle}
        rowCount={rowCount}
        playlistRowHeight={playlistRowHeight}
        playlistRowProps={playlistRowProps}
        playlistRowComponent={PlaylistRow}
        showHeader
      />
    </div>
  );

  return (
    <Box
      className="w-full lg:w-4/5 text-slate-50 room-lobby-shell"
      onPointerOverCapture={handleLobbyPointerEnter}
      onPointerDownCapture={handleLobbyPointerDown}
      sx={{
        minHeight: "auto",
        height: "auto",
        maxHeight: "none",
        display: "flex",
        flexDirection: "column",
        width: "100%",
        maxWidth: "1320px",
        marginInline: "auto",
      }}
    >
      <div className="room-lobby-card-header room-lobby-page-header">
        <div className="MuiCardHeader-content">
          <Stack spacing={1.25} className="room-lobby-header-stack">
            <div className="room-lobby-header-identity">
              <div className="room-lobby-header-copy">
                <Typography
                  variant="h6"
                  className="room-lobby-header-title  gap-2"
                >
                  {isPrivateRoom && (
                    <LockRoundedIcon
                      sx={{
                        fontSize: 20,
                        color: "#fbbf24",
                        flexShrink: 0,
                        mr: 1,
                      }}
                    />
                  )}
                  {displayRoomName}
                </Typography>
              </div>

              <RoomLobbyMetaGrid roomMetaItems={roomMetaItems} />
            </div>
          </Stack>
        </div>
        {!isMobileTabletLobbyLayout ? (
          <div className="MuiCardHeader-action">
            <div
              className="room-lobby-toolbar"
              role="toolbar"
              aria-label="房間操作"
            >
              <div
                className={`room-lobby-toolbar-shell ${
                  isSoloLeaveToolbar
                    ? "room-lobby-toolbar-shell--solo-leave"
                    : ""
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
                      <span
                        className="room-lobby-toolbar-icon-btn__icon"
                        aria-hidden="true"
                      >
                        <SportsEsportsRoundedIcon fontSize="small" />
                      </span>
                      <span className="room-lobby-sr-only">返回遊戲</span>
                      <span
                        className="room-lobby-toolbar-floating-label"
                        aria-hidden="true"
                      >
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
                      <span
                        className="room-lobby-toolbar-icon-btn__icon"
                        aria-hidden="true"
                      >
                        <PlayArrowRoundedIcon fontSize="small" />
                      </span>
                      <span className="room-lobby-sr-only">
                        {isStartBroadcastActive
                          ? `即將開始 ${startBroadcastRemainingSec} 秒`
                          : "開始遊戲"}
                      </span>
                      <span
                        className="room-lobby-toolbar-floating-label"
                        aria-hidden="true"
                      >
                        {isStartBroadcastActive
                          ? `即將開始 ${startBroadcastRemainingSec}s`
                          : "開始遊戲"}
                      </span>
                    </Button>
                  )}
                </div>
                <div className="room-lobby-toolbar-group room-lobby-toolbar-group--history room-lobby-toolbar-group--share-anchor">
                  {onOpenHistoryDrawer && (
                    <Button
                      variant="outlined"
                      color="inherit"
                      size="small"
                      aria-label="對戰資訊"
                      className="room-lobby-toolbar-history-btn room-lobby-toolbar-icon-btn"
                      onClick={() => onOpenHistoryDrawer?.()}
                    >
                      <span
                        className="room-lobby-toolbar-icon-btn__icon"
                        aria-hidden="true"
                      >
                        <HistoryEduRoundedIcon fontSize="small" />
                      </span>
                      <span className="room-lobby-sr-only">對戰資訊</span>
                      <span
                        className="room-lobby-toolbar-floating-label"
                        aria-hidden="true"
                      >
                        對戰資訊
                      </span>
                    </Button>
                  )}
                  {onOpenTestSettlement && (
                    <Button
                      variant="outlined"
                      color="inherit"
                      size="small"
                      aria-label="開啟測試結算畫面"
                      className="room-lobby-toolbar-history-btn room-lobby-toolbar-icon-btn"
                      onClick={() => onOpenTestSettlement()}
                    >
                      <span
                        className="room-lobby-toolbar-icon-btn__icon"
                        aria-hidden="true"
                      >
                        <ScienceRoundedIcon fontSize="small" />
                      </span>
                      <span className="room-lobby-sr-only">測試結算</span>
                      <span
                        className="room-lobby-toolbar-floating-label"
                        aria-hidden="true"
                      >
                        測試結算
                      </span>
                    </Button>
                  )}
                  {gameState?.status !== "playing" && inviteToolbarButton}
                  {shareBlockedToast}
                </div>
                <div className="room-lobby-toolbar-group room-lobby-toolbar-group--utility">
                  {desktopUtilityActions.map((action) => (
                    <Button
                      key={action.key}
                      variant={action.variant}
                      color="inherit"
                      size="small"
                      className={`room-lobby-toolbar-utility-btn room-lobby-toolbar-icon-btn ${
                        action.key === "settings"
                          ? "room-lobby-toolbar-settings-btn"
                          : ""
                      } ${
                        action.key === "leave"
                          ? "room-lobby-toolbar-leave-btn"
                          : ""
                      }`}
                      disabled={action.disabled}
                      aria-label={action.ariaLabel}
                      onClick={action.onClick}
                    >
                      <span
                        className="room-lobby-toolbar-icon-btn__icon"
                        aria-hidden="true"
                      >
                        {action.icon}
                      </span>
                      <span className="room-lobby-sr-only">
                        {action.ariaLabel}
                      </span>
                      <span
                        className="room-lobby-toolbar-floating-label"
                        aria-hidden="true"
                      >
                        {action.label}
                      </span>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
      <Box
        className={`room-lobby-content room-lobby-content--shell-less ${
          isMobileTabletLobbyLayout ? "room-lobby-content--mobile-redesign" : ""
        }`}
        sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 1 }}
      >
        {playlistSelectorModal}
        {isMobileTabletLobbyLayout ? (
          <>
            <div className="room-lobby-mobile-shell">
              <div className="room-lobby-mobile-top-actions">
                <div className="room-lobby-mobile-actions-card">
                  {/* Resume if game is playing */}
                  {mobilePrimaryActions.filter((a) => a.key === "resume")
                    .length > 0 && (
                    <div className="room-lobby-mobile-primary-actions room-lobby-mobile-primary-actions--single">
                      {mobilePrimaryActions
                        .filter((a) => a.key === "resume")
                        .map((action) => (
                          <Button
                            key={action.key}
                            variant="contained"
                            color="success"
                            size="small"
                            className="room-lobby-action-btn room-lobby-action-btn--mobile room-lobby-mobile-primary-action room-lobby-mobile-primary-action--resume"
                            onClick={action.onClick}
                            disabled={action.disabled}
                            aria-label={action.label}
                          >
                            <span
                              className="room-lobby-mobile-action-icon"
                              aria-hidden="true"
                            >
                              {action.icon}
                            </span>
                            <span className="room-lobby-sr-only">
                              {action.label}
                            </span>
                          </Button>
                        ))}
                    </div>
                  )}
                  {/* Start Game: full-width primary row for host */}
                  {isHost && gameState?.status !== "playing" && (
                    <div className="room-lobby-mobile-start-row">
                      <Button
                        variant="contained"
                        color="inherit"
                        size="small"
                        className="room-lobby-action-btn room-lobby-action-btn--mobile room-lobby-action-btn--start room-lobby-mobile-start-btn"
                        disabled={Boolean(startActionDisabledReason)}
                        onClick={onStartGame}
                        aria-label={
                          isStartBroadcastActive
                            ? `即將開始 ${startBroadcastRemainingSec} 秒`
                            : "開始遊戲"
                        }
                      >
                        <span
                          className="room-lobby-mobile-action-icon"
                          aria-hidden="true"
                        >
                          <PlayArrowRoundedIcon fontSize="small" />
                        </span>
                        <span>
                          {isStartBroadcastActive
                            ? `即將開始 ${startBroadcastRemainingSec}s`
                            : "開始遊戲"}
                        </span>
                      </Button>
                    </div>
                  )}
                  {/* Secondary icon-only row: History + Invite + Settings + Leave */}
                  <div className="room-lobby-mobile-bottom-actions room-lobby-toolbar-group--share-anchor">
                    {onOpenHistoryDrawer && (
                      <Button
                        variant="text"
                        color="inherit"
                        size="small"
                        className="room-lobby-mobile-bottom-action"
                        aria-label="對戰資訊"
                        onClick={() => onOpenHistoryDrawer?.()}
                      >
                        <span
                          className="room-lobby-mobile-bottom-action__icon"
                          aria-hidden="true"
                        >
                          <HistoryEduRoundedIcon fontSize="small" />
                        </span>
                      </Button>
                    )}
                    {gameState?.status !== "playing" && (
                      <Button
                        variant="text"
                        color="inherit"
                        size="small"
                        className={`room-lobby-mobile-bottom-action room-lobby-action-btn--invite ${
                          !canUseShareInvite
                            ? "room-lobby-action-btn--invite-locked"
                            : ""
                        }`}
                        aria-disabled={!canUseShareInvite}
                        aria-label={shareButtonLabel}
                        onClick={handleOpenShareDialog}
                      >
                        <span
                          className="room-lobby-mobile-bottom-action__icon"
                          aria-hidden="true"
                        >
                          <ShareRoundedIcon fontSize="small" />
                        </span>
                      </Button>
                    )}
                    {mobileBottomActionButtons.map((action) => (
                      <Button
                        key={`mobile-bottom-${action.key}`}
                        variant="text"
                        color="inherit"
                        size="small"
                        className={`room-lobby-mobile-bottom-action ${action.key === "leave" ? "room-lobby-mobile-bottom-action--leave" : ""}`}
                        disabled={action.disabled}
                        aria-label={action.label}
                        onClick={action.onClick}
                      >
                        <span
                          className="room-lobby-mobile-bottom-action__icon"
                          aria-hidden="true"
                        >
                          {action.icon}
                        </span>
                      </Button>
                    ))}
                    {shareBlockedToast}
                  </div>
                </div>
              </div>
              <div
                className="room-lobby-mobile-tabs"
                role="tablist"
                aria-label="房間分頁"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={mobileLobbyTab === "members"}
                  aria-label="玩家"
                  className={`room-lobby-mobile-tab ${
                    mobileLobbyTab === "members" ? "is-active" : ""
                  }`}
                  onClick={() => setMobileLobbyTab("members")}
                >
                  <span
                    className="room-lobby-mobile-tab__icon"
                    aria-hidden="true"
                  >
                    <GroupsRoundedIcon fontSize="inherit" />
                  </span>
                  <span className="room-lobby-mobile-tab__label">玩家</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mobileLobbyTab === "host"}
                  aria-label="操作"
                  className={`room-lobby-mobile-tab ${
                    mobileLobbyTab === "host" ? "is-active" : ""
                  }`}
                  onClick={() => {
                    setMobileLobbyTab("host");
                    if (isHost) {
                      markSuggestionsSeen();
                    }
                  }}
                >
                  <span
                    className="room-lobby-mobile-tab__icon"
                    aria-hidden="true"
                  >
                    <PlaylistPlayRoundedIcon fontSize="inherit" />
                    {hasNewSuggestions && (
                      <span className="room-lobby-mobile-tab__badge">
                        {newSuggestionCount > 99 ? "99+" : newSuggestionCount}
                      </span>
                    )}
                  </span>
                  <span className="room-lobby-mobile-tab__label">操作</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mobileLobbyTab === "playlist"}
                  aria-label="播放清單"
                  className={`room-lobby-mobile-tab ${
                    mobileLobbyTab === "playlist" ? "is-active" : ""
                  }`}
                  onClick={() => setMobileLobbyTab("playlist")}
                >
                  <span
                    className="room-lobby-mobile-tab__icon"
                    aria-hidden="true"
                  >
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
          </>
        ) : (
          <>
            <div className="room-lobby-column room-lobby-column--social">
              <div className="room-lobby-column-section room-lobby-column-section--participants">
                {participantsPanel}
              </div>
            </div>
            <div
              className={`room-lobby-column room-lobby-column--music ${isHost ? "room-lobby-column--music-host-combined" : ""}`}
            >
              <div className="room-lobby-column-section room-lobby-column-section--control">
                {controlPanel}
              </div>
              {isMobileTabletLobbyLayout ? (
                <>
                  <div
                    className="room-lobby-column-divider hidden"
                    aria-hidden="true"
                  />
                  <div className="room-lobby-column-section room-lobby-column-section--playlist">
                    {playlistPanel}
                  </div>
                </>
              ) : null}
            </div>
          </>
        )}
      </Box>
      <Dialog
        open={shareDialogOpen}
        onClose={() => setShareDialogOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          className: "room-lobby-share-modal",
        }}
      >
        <DialogTitle className="room-lobby-share-modal__title">
          <span
            className="room-lobby-share-modal__title-icon"
            aria-hidden="true"
          >
            <ShareRoundedIcon fontSize="small" />
          </span>
          <span>分享邀請</span>
        </DialogTitle>
        <DialogContent className="room-lobby-share-modal__content">
          <div className="room-lobby-share-modal__section room-lobby-share-modal__section--toggle">
            <div className="room-lobby-share-modal__section-copy">
              <strong>允許其他玩家透過代碼邀請</strong>
            </div>
            <div className="room-lobby-share-modal__toggle-wrap">
              <Switch
                checked={allowParticipantInvite}
                onChange={(_, checked) => {
                  void handleToggleInvitePermission(checked);
                }}
                disabled={!isHost || sharePermissionSaving}
              />
              <span className="room-lobby-share-modal__toggle-state">
                {allowParticipantInvite ? "已開啟" : "未開啟"}
              </span>
            </div>
          </div>
          {!isHost && !allowParticipantInvite ? (
            <div className="room-lobby-share-modal__locked-note">
              房主尚未開啟玩家邀請權限
            </div>
          ) : null}
          <div className="room-lobby-share-list">
            <button
              type="button"
              className={`room-lobby-share-row ${roomCodeCopied ? "is-copied" : ""}`}
              onClick={handleCopyRoomCode}
              disabled={!currentRoom?.roomCode}
            >
              <span className="room-lobby-share-row__icon" aria-hidden="true">
                {roomCodeCopied ? (
                  <span className="room-lobby-share-row__copied-tip">
                    已複製
                  </span>
                ) : null}
                {roomCodeCopied ? (
                  <CheckRoundedIcon fontSize="small" />
                ) : (
                  <ContentCopyRoundedIcon fontSize="small" />
                )}
              </span>
              <span className="room-lobby-share-row__value">
                {formattedRoomCode ?? "--"}
              </span>
            </button>
            <button
              type="button"
              className={`room-lobby-share-row room-lobby-share-row--link ${
                inviteLinkCopied ? "is-copied" : ""
              }`}
              onClick={handleCopyInviteLink}
              disabled={!inviteLink}
            >
              <span className="room-lobby-share-row__icon" aria-hidden="true">
                {inviteLinkCopied ? (
                  <span className="room-lobby-share-row__copied-tip">
                    已複製
                  </span>
                ) : null}
                {inviteLinkCopied ? (
                  <CheckRoundedIcon fontSize="small" />
                ) : (
                  <ContentCopyRoundedIcon fontSize="small" />
                )}
              </span>
              <span className="room-lobby-share-row__value room-lobby-share-row__value--link">
                {inviteLink || "未提供"}
              </span>
            </button>
          </div>
          <div className="room-lobby-share-actions-grid">
            <button
              type="button"
              className={`room-lobby-share-action-card ${
                shareActionRunning ? "is-pending" : ""
              }`}
              onClick={() => {
                void handleNativeShare();
              }}
              disabled={!canUseNativeShare || shareActionRunning}
            >
              <span
                className="room-lobby-share-action-card__icon"
                aria-hidden="true"
              >
                <IosShareRoundedIcon fontSize="small" />
              </span>
              <span className="room-lobby-share-action-card__copy">
                <strong>分享</strong>
              </span>
            </button>
          </div>
        </DialogContent>
        <DialogActions className="room-lobby-share-modal__actions">
          <Button
            onClick={() => setShareDialogOpen(false)}
            variant="text"
            className="room-lobby-share-modal__close-btn"
          >
            關閉
          </Button>
        </DialogActions>
      </Dialog>
      <RoomLobbySettingsDialog
        open={settingsOpen}
        settingsDisabled={settingsDisabled}
        settingsSaving={settingsSaving}
        roomPlayMode={settingsRoomPlayMode}
        onRoomPlayModeChange={handleSettingsRoomPlayModeChange}
        leaderboardVariant={settingsLeaderboardVariant}
        onLeaderboardVariantChange={handleSettingsLeaderboardVariantChange}
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
        settingsPlayDurationSec={settingsPlayDurationSec}
        onSettingsPlayDurationSecChange={(value) => {
          if (!Number.isFinite(value)) return;
          setSettingsPlayDurationSec(value);
          if (settingsError) {
            setSettingsError(null);
          }
        }}
        settingsStartOffsetSec={settingsStartOffsetSec}
        onSettingsStartOffsetSecChange={(value) => {
          if (!Number.isFinite(value)) return;
          setSettingsStartOffsetSec(value);
          if (settingsError) {
            setSettingsError(null);
          }
        }}
        canUseLeaderboard30={canUseLeaderboard30}
        canUseLeaderboard50={canUseLeaderboard50}
        canUseLeaderboard15m={participants.length <= 1}
        leaderboardQuestionHelpText={leaderboardQuestionHelpText}
        settingsError={settingsError}
        onClose={closeSettingsModal}
        onSave={handleSaveSettingsClick}
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
    </Box>
  );
};

export default React.memo(RoomLobbyPanel);
