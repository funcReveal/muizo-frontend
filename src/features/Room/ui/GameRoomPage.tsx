import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Avatar,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  SwipeableDrawer,
  Typography,
} from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";
import LeaderboardRoundedIcon from "@mui/icons-material/LeaderboardRounded";
import SmartDisplayRoundedIcon from "@mui/icons-material/SmartDisplayRounded";
import ForumRoundedIcon from "@mui/icons-material/ForumRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import ManageAccountsRoundedIcon from "@mui/icons-material/ManageAccountsRounded";
import SwapHorizRoundedIcon from "@mui/icons-material/SwapHorizRounded";
import PersonRemoveRoundedIcon from "@mui/icons-material/PersonRemoveRounded";
import BlockRoundedIcon from "@mui/icons-material/BlockRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import type {
  ChatMessage,
  GameState,
  PlaylistItem,
  RoomState,
  SubmitAnswerResult,
} from "../model/types";
import {
  DEFAULT_CLIP_SEC,
  DEFAULT_PLAY_DURATION_SEC,
  DEFAULT_START_OFFSET_SEC,
} from "../model/roomConstants";
import {
  resolveCorrectResultSfxEvent,
  resolveCountdownSfxEvent,
  resolveGuessDeadlineSfxEvent,
} from "../model/sfx/gameSfxEngine";
import { useKeyBindings } from "../../Setting/ui/components/useKeyBindings";
import { useSfxSettings } from "../../Setting/ui/components/useSfxSettings";
import { useGameSfx } from "./hooks/useGameSfx";
import LiveSettlementShowcase from "./components/LiveSettlementShowcase";
import GameRoomAnswerPanel from "./components/gameRoomPage/GameRoomAnswerPanel";
import GameRoomLeftSidebar from "./components/gameRoomPage/GameRoomLeftSidebar";
import GameRoomMobileChatPopover from "./components/gameRoomPage/GameRoomMobileChatPopover";
import GameRoomPlaybackPanel from "./components/gameRoomPage/GameRoomPlaybackPanel";
import {
  AudioGestureOverlayPortal,
  StartBroadcastOverlayPortal,
} from "./components/gameRoomPage/GameRoomPortalOverlays";
import {
  extractYouTubeId,
  isMobileDevice,
  SILENT_AUDIO_SRC,
  triggerHapticFeedback,
} from "./components/gameRoomPage/gameRoomPageUtils";
import {
  buildScoreboardRows,
  sortParticipantsByScore,
} from "./components/gameRoomPage/gameRoomPageDerivations";
import GameRoomExitDialog from "./components/gameRoomPage/GameRoomExitDialog";
import useGameRoomPlayerSync from "./components/gameRoomPage/useGameRoomPlayerSync";
import useGameRoomAnswerFlow from "./components/gameRoomPage/useGameRoomAnswerFlow";
import useGameRoomRecaps from "./components/gameRoomPage/useGameRoomRecaps";
import useGameRoomStats from "./components/gameRoomPage/useGameRoomStats";
import useSettlementSnapshot from "./components/gameRoomPage/useSettlementSnapshot";
import useTopTwoSwapState from "./components/gameRoomPage/useTopTwoSwapState";
import useGameRoomDanmu from "./components/gameRoomPage/useGameRoomDanmu";
import useGameRoomChoiceHotkeys from "./components/gameRoomPage/useGameRoomChoiceHotkeys";
import useGameRoomAnswerPanelAutoScroll from "./components/gameRoomPage/useGameRoomAnswerPanelAutoScroll";
import useMobileDrawerDragDismiss from "./components/gameRoomPage/useMobileDrawerDragDismiss";
import type { SettlementQuestionRecap } from "./components/GameSettlementPanel";
import ConfirmDialog from "../../../shared/ui/ConfirmDialog";

interface GameRoomPageProps {
  room: RoomState["room"];
  gameState: GameState;
  playlist: PlaylistItem[];
  onExitGame: () => void;
  onBackToLobby?: () => void;
  onSubmitChoice: (choiceIndex: number) => Promise<SubmitAnswerResult>;
  onKickPlayer?: (clientId: string, durationMs?: number | null) => void;
  onTransferHost?: (clientId: string) => void;
  participants?: RoomState["participants"];
  meClientId?: string;
  messages?: ChatMessage[];
  messageInput?: string;
  onMessageChange?: (value: string) => void;
  onSendMessage?: () => void;
  username?: string | null;
  serverOffsetMs?: number;
  onSettlementRecapChange?: (recaps: SettlementQuestionRecap[]) => void;
}

type MobileBottomPanel = "scoreboard" | "chat" | null;
type HostManagementActionType = "transfer" | "kick" | "ban";
type HostManagementAction = {
  type: HostManagementActionType;
  targetClientId: string;
  targetName: string;
  targetOnline: boolean;
};

const MOBILE_PLAYBACK_MIN_HEIGHT_VH = 26;
const MOBILE_PLAYBACK_MAX_HEIGHT_VH = 62;
const MOBILE_PLAYBACK_DEFAULT_HEIGHT_VH = 40;

const MOBILE_SCOREBOARD_MIN_HEIGHT_VH = 42;
const MOBILE_SCOREBOARD_MAX_HEIGHT_VH = 72;
const MOBILE_SCOREBOARD_DEFAULT_HEIGHT_VH = 60;

const MOBILE_CHAT_MIN_HEIGHT_VH = 42;
const MOBILE_CHAT_MAX_HEIGHT_VH = 68;
const MOBILE_CHAT_DEFAULT_HEIGHT_VH = 50;

const MOBILE_SPLIT_STACK_MAX_TOTAL_VH = 100;

const clampMobileVh = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const normalizeMobileSplitHeights = (
  playbackHeight: number,
  scoreboardHeight: number,
) => {
  let nextPlaybackHeight = clampMobileVh(
    playbackHeight,
    MOBILE_PLAYBACK_MIN_HEIGHT_VH,
    MOBILE_PLAYBACK_MAX_HEIGHT_VH,
  );
  let nextScoreboardHeight = clampMobileVh(
    scoreboardHeight,
    MOBILE_SCOREBOARD_MIN_HEIGHT_VH,
    MOBILE_SCOREBOARD_MAX_HEIGHT_VH,
  );
  const totalHeight = nextPlaybackHeight + nextScoreboardHeight;
  if (totalHeight > MOBILE_SPLIT_STACK_MAX_TOTAL_VH) {
    const scale = MOBILE_SPLIT_STACK_MAX_TOTAL_VH / totalHeight;
    nextPlaybackHeight = clampMobileVh(
      nextPlaybackHeight * scale,
      MOBILE_PLAYBACK_MIN_HEIGHT_VH,
      MOBILE_PLAYBACK_MAX_HEIGHT_VH,
    );
    nextScoreboardHeight = clampMobileVh(
      nextScoreboardHeight * scale,
      MOBILE_SCOREBOARD_MIN_HEIGHT_VH,
      MOBILE_SCOREBOARD_MAX_HEIGHT_VH,
    );
  }
  return {
    playbackHeight: Number(nextPlaybackHeight.toFixed(2)),
    scoreboardHeight: Number(nextScoreboardHeight.toFixed(2)),
  };
};

const GameRoomPage: React.FC<GameRoomPageProps> = ({
  room,
  gameState,
  playlist,
  onExitGame,
  onBackToLobby,
  onSubmitChoice,
  onKickPlayer,
  onTransferHost,
  participants = [],
  meClientId,
  messages = [],
  messageInput = "",
  onMessageChange,
  onSendMessage,
  serverOffsetMs = 0,
  onSettlementRecapChange,
}) => {
  const { danmuEnabled, setDanmuEnabled, danmuItems } = useGameRoomDanmu({
    roomId: room.id,
    messages,
  });
  const { gameVolume, setGameVolume, sfxEnabled, sfxVolume, sfxPreset } =
    useSfxSettings();
  const requiresAudioGesture = useMemo(() => {
    if (typeof window === "undefined") return false;
    return isMobileDevice();
  }, []);
  const [nowMs, setNowMs] = useState(() => Date.now() + serverOffsetMs);
  const [showVideoOverride, setShowVideoOverride] = useState<boolean | null>(
    null,
  );
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  const isMobileGameViewport = useMediaQuery("(max-width: 1023.95px)");
  const [mobileBottomPanel, setMobileBottomPanel] =
    useState<MobileBottomPanel>(null);
  const [mobileChatUnread, setMobileChatUnread] = useState(0);
  const [mobilePlaybackOpen, setMobilePlaybackOpen] = useState(false);
  const [mobilePlaybackHeight, setMobilePlaybackHeight] = useState(
    MOBILE_PLAYBACK_DEFAULT_HEIGHT_VH,
  );
  const [mobileScoreboardHeight, setMobileScoreboardHeight] = useState(
    MOBILE_SCOREBOARD_DEFAULT_HEIGHT_VH,
  );
  const [mobileChatHeight, setMobileChatHeight] = useState(
    MOBILE_CHAT_DEFAULT_HEIGHT_VH,
  );
  const [mobileScoreboardSwapReplayToken, setMobileScoreboardSwapReplayToken] =
    useState(0);
  const [mobileScoreboardSwapArmed, setMobileScoreboardSwapArmed] =
    useState(false);
  const [mobileRevealAutoOverlayEnabled, setMobileRevealAutoOverlayEnabled] =
    useState(true);
  const [mobileAutoOverlayTransition, setMobileAutoOverlayTransition] =
    useState<"idle" | "opening" | "closing">("idle");
  const [mobileChatDragging, setMobileChatDragging] = useState(false);
  const [hostManagementOpen, setHostManagementOpen] = useState(false);
  const [hostManagementConfirm, setHostManagementConfirm] =
    useState<HostManagementAction | null>(null);
  const { keyBindings } = useKeyBindings();
  const legacyClipWarningShownRef = useRef(false);
  const lastPreStartCountdownSfxKeyRef = useRef<string | null>(null);
  const lastGuessUrgencySfxKeyRef = useRef<string | null>(null);
  const lastCountdownGoSfxKeyRef = useRef<string | null>(null);
  const lastRevealResultSfxKeyRef = useRef<string | null>(null);
  const lastComboStateSfxKeyRef = useRef<string | null>(null);
  const previousPhaseRef = useRef<GameState["phase"]>(gameState.phase);
  const lastAutoOverlayTransitionAtRef = useRef(0);
  const answerPanelRef = useRef<HTMLDivElement | null>(null);
  const { primeSfxAudio, playGameSfx } = useGameSfx({
    enabled: sfxEnabled,
    volume: Math.round((sfxVolume * gameVolume) / 100),
    preset: sfxPreset,
  });
  const isHostInGame = room.hostClientId === meClientId;
  const hostManageParticipants = useMemo(
    () =>
      sortParticipantsByScore(participants).filter(
        (participant) => participant.clientId !== meClientId,
      ),
    [meClientId, participants],
  );

  const openExitConfirm = () => setExitConfirmOpen(true);
  const closeExitConfirm = () => setExitConfirmOpen(false);
  const handleExitConfirm = () => {
    setExitConfirmOpen(false);
    onExitGame();
  };
  const getServerNowMs = useCallback(
    () => Date.now() + serverOffsetMs,
    [serverOffsetMs],
  );
  const mobileScoreboardOpen = mobileBottomPanel === "scoreboard";
  const mobileChatOpen = mobileBottomPanel === "chat";
  const mobileRevealSplitMode =
    isMobileGameViewport &&
    gameState.phase === "reveal" &&
    mobilePlaybackOpen &&
    mobileScoreboardOpen;
  const normalizedSplitHeights = useMemo(
    () => normalizeMobileSplitHeights(mobilePlaybackHeight, mobileScoreboardHeight),
    [mobilePlaybackHeight, mobileScoreboardHeight],
  );
  const handlePlaybackHeightChange = useCallback((nextHeight: number) => {
    const clampedNext = clampMobileVh(
      nextHeight,
      MOBILE_PLAYBACK_MIN_HEIGHT_VH,
      MOBILE_PLAYBACK_MAX_HEIGHT_VH,
    );
    if (mobileRevealSplitMode) {
      const normalized = normalizeMobileSplitHeights(
        clampedNext,
        mobileScoreboardHeight,
      );
      setMobilePlaybackHeight(normalized.playbackHeight);
      setMobileScoreboardHeight(normalized.scoreboardHeight);
      return;
    }
    setMobilePlaybackHeight(clampedNext);
  }, [mobileRevealSplitMode, mobileScoreboardHeight]);
  const handleScoreboardHeightChange = useCallback((nextHeight: number) => {
    const clampedNext = clampMobileVh(
      nextHeight,
      MOBILE_SCOREBOARD_MIN_HEIGHT_VH,
      MOBILE_SCOREBOARD_MAX_HEIGHT_VH,
    );
    if (mobileRevealSplitMode) {
      const normalized = normalizeMobileSplitHeights(
        mobilePlaybackHeight,
        clampedNext,
      );
      setMobilePlaybackHeight(normalized.playbackHeight);
      setMobileScoreboardHeight(normalized.scoreboardHeight);
      return;
    }
    setMobileScoreboardHeight(clampedNext);
  }, [mobilePlaybackHeight, mobileRevealSplitMode]);
  const handleChatHeightChange = useCallback((nextHeight: number) => {
    setMobileChatHeight(
      clampMobileVh(
        nextHeight,
        MOBILE_CHAT_MIN_HEIGHT_VH,
        MOBILE_CHAT_MAX_HEIGHT_VH,
      ),
    );
  }, []);
  const handleToggleMobilePlayback = useCallback(() => {
    setMobilePlaybackOpen((current) => !current);
  }, []);
  const handleCloseMobilePlayback = useCallback(() => {
    setMobilePlaybackOpen(false);
  }, []);
  const handleOpenMobilePlayback = useCallback(() => {
    setMobilePlaybackOpen(true);
  }, []);
  const handleToggleMobileScoreboard = useCallback(() => {
    setMobileScoreboardSwapArmed(false);
    setMobileBottomPanel((current) =>
      current === "scoreboard" ? null : "scoreboard",
    );
  }, []);
  const handleCloseMobileScoreboard = useCallback(() => {
    setMobileScoreboardSwapArmed(false);
    setMobileBottomPanel((current) =>
      current === "scoreboard" ? null : current,
    );
  }, []);
  const handleOpenMobileScoreboard = useCallback(() => {
    setMobileScoreboardSwapArmed(false);
    setMobileBottomPanel("scoreboard");
  }, []);
  const handleToggleMobileChat = useCallback(() => {
    setMobileChatUnread(0);
    setMobileScoreboardSwapArmed(false);
    setMobileBottomPanel((current) => (current === "chat" ? null : "chat"));
  }, []);
  const handleOpenMobileChat = useCallback(() => {
    setMobileChatUnread(0);
    setMobileScoreboardSwapArmed(false);
    setMobileBottomPanel("chat");
  }, []);
  const handleCloseMobileChat = useCallback(() => {
    setMobileBottomPanel((current) => (current === "chat" ? null : current));
  }, []);
  const handleMobileChatDraggingChange = useCallback((isDragging: boolean) => {
    setMobileChatDragging(isDragging);
  }, []);
  const handleOpenHostManagement = useCallback(() => {
    if (!isHostInGame) return;
    setHostManagementOpen(true);
  }, [isHostInGame]);
  const handleCloseHostManagement = useCallback(() => {
    setHostManagementOpen(false);
  }, []);
  const requestHostManagementAction = useCallback(
    (type: HostManagementActionType, participant: RoomState["participants"][number]) => {
      if (!isHostInGame) return;
      setHostManagementConfirm({
        type,
        targetClientId: participant.clientId,
        targetName: participant.username,
        targetOnline: participant.isOnline,
      });
    },
    [isHostInGame],
  );
  const hostManagementConfirmText = useMemo(() => {
    if (!hostManagementConfirm) return null;
    const target = hostManagementConfirm.targetName || "此玩家";
    if (hostManagementConfirm.type === "transfer") {
      return {
        title: `轉移房主給 ${target}？`,
        description:
          "轉移後你會變成一般玩家。若要重新取得房主權限，需由新房主再轉移回來。",
        confirmLabel: "確認轉移",
      };
    }
    if (hostManagementConfirm.type === "ban") {
      return {
        title: `踢出並封鎖 ${target}？`,
        description: "此操作會立刻將玩家移出房間，並套用伺服器預設的封鎖時長。",
        confirmLabel: "確認踢出並封鎖",
      };
    }
    return {
      title: `踢出 ${target}？`,
      description: "此操作會立刻將玩家移出房間，但不會額外封鎖。",
      confirmLabel: "確認踢出",
    };
  }, [hostManagementConfirm]);
  const handleConfirmHostManagementAction = useCallback(() => {
    if (!hostManagementConfirm) return;
    if (!isHostInGame) {
      setHostManagementConfirm(null);
      return;
    }
    if (hostManagementConfirm.type === "transfer") {
      onTransferHost?.(hostManagementConfirm.targetClientId);
    } else if (hostManagementConfirm.type === "kick") {
      onKickPlayer?.(hostManagementConfirm.targetClientId, null);
    } else {
      onKickPlayer?.(hostManagementConfirm.targetClientId);
    }
    setHostManagementConfirm(null);
  }, [hostManagementConfirm, isHostInGame, onKickPlayer, onTransferHost]);
  const effectiveMobilePlaybackHeight = mobileRevealSplitMode
    ? normalizedSplitHeights.playbackHeight
    : clampMobileVh(
        mobilePlaybackHeight,
        MOBILE_PLAYBACK_MIN_HEIGHT_VH,
        MOBILE_PLAYBACK_MAX_HEIGHT_VH,
      );
  const effectiveMobileScoreboardHeight = mobileRevealSplitMode
    ? normalizedSplitHeights.scoreboardHeight
    : clampMobileVh(
        mobileScoreboardHeight,
        MOBILE_SCOREBOARD_MIN_HEIGHT_VH,
        MOBILE_SCOREBOARD_MAX_HEIGHT_VH,
      );
  useEffect(() => {
    if (!mobileScoreboardOpen || mobileScoreboardSwapArmed) return;
    const replayTimer = window.setTimeout(() => {
      setMobileScoreboardSwapReplayToken((current) => current + 1);
      setMobileScoreboardSwapArmed(true);
    }, 180);
    return () => {
      window.clearTimeout(replayTimer);
    };
  }, [mobileScoreboardOpen, mobileScoreboardSwapArmed]);
  const mobilePlaybackDragDismiss = useMobileDrawerDragDismiss({
    open: mobilePlaybackOpen,
    direction: "up",
    onDismiss: handleCloseMobilePlayback,
    height: effectiveMobilePlaybackHeight,
    minHeight: MOBILE_PLAYBACK_MIN_HEIGHT_VH,
    maxHeight: MOBILE_PLAYBACK_MAX_HEIGHT_VH,
    onHeightChange: handlePlaybackHeightChange,
    threshold: 34,
  });
  const mobileScoreboardDragDismiss = useMobileDrawerDragDismiss({
    open: mobileScoreboardOpen,
    direction: "down",
    onDismiss: handleCloseMobileScoreboard,
    height: effectiveMobileScoreboardHeight,
    minHeight: MOBILE_SCOREBOARD_MIN_HEIGHT_VH,
    maxHeight: MOBILE_SCOREBOARD_MAX_HEIGHT_VH,
    onHeightChange: handleScoreboardHeightChange,
    threshold: 34,
  });
  const isMobileDrawerGestureActive =
    mobilePlaybackDragDismiss.isDragging ||
    mobileScoreboardDragDismiss.isDragging ||
    mobileChatDragging;

  useGameRoomAnswerPanelAutoScroll({
    roomId: room.id,
    gameStatus: gameState.status,
    gameStartedAt: gameState.startedAt,
    answerPanelRef,
  });

  const effectiveTrackOrder = useMemo(() => {
    if (gameState.trackOrder?.length) {
      return gameState.trackOrder;
    }
    return playlist.map((_, idx) => idx);
  }, [gameState.trackOrder, playlist]);

  const trackCursor = Math.max(0, gameState.trackCursor ?? 0);
  const trackOrderLength = effectiveTrackOrder.length || playlist.length || 0;
  const boundedCursor = Math.min(
    trackCursor,
    Math.max(trackOrderLength - 1, 0),
  );
  const backendTrackIndex = effectiveTrackOrder[boundedCursor];
  const currentTrackIndex =
    backendTrackIndex ??
    gameState.currentIndex ??
    effectiveTrackOrder[0] ??
    0;
  const waitingToStart = gameState.startedAt > nowMs;
  const remainingToStartMs = Math.max(0, gameState.startedAt - nowMs);
  const startCountdownSec = Math.max(
    1,
    Math.ceil(remainingToStartMs / 1000),
  );
  const isInitialCountdown = waitingToStart && trackCursor === 0;
  const isInterTrackWait = waitingToStart && !isInitialCountdown;
  const isFinalCountdown = isInitialCountdown && startCountdownSec <= 3;
  const countdownTone = isFinalCountdown
    ? "border-rose-400/70 bg-rose-500/20 text-rose-100 shadow-[0_0_35px_rgba(244,63,94,0.45)]"
    : "border-amber-400/60 bg-amber-400/15 text-amber-100 shadow-[0_0_28px_rgba(251,191,36,0.35)]";

  const item = useMemo(() => {
    return playlist[currentTrackIndex] ?? playlist[0];
  }, [playlist, currentTrackIndex]);
  const resolvedAnswerTitle =
    gameState.answerTitle?.trim() ||
    item?.answerText?.trim() ||
    item?.title?.trim() ||
    "未命名答案";

  const roomPlayDurationSec = Math.max(
    1,
    room.gameSettings?.playDurationSec ?? DEFAULT_PLAY_DURATION_SEC,
  );
  const configuredGuessDurationMs = Math.max(
    1000,
    Math.floor(roomPlayDurationSec * 1000),
  );
  const serverGuessDurationMs =
    Number.isFinite(gameState.guessDurationMs) && gameState.guessDurationMs > 0
      ? Math.max(1000, Math.floor(gameState.guessDurationMs))
      : null;
  const effectiveGuessDurationMs =
    serverGuessDurationMs ?? configuredGuessDurationMs;
  const roomStartOffsetSec = Math.max(
    0,
    room.gameSettings?.startOffsetSec ?? DEFAULT_START_OFFSET_SEC,
  );
  const hasExplicitEndSec = Boolean(
    item &&
      (typeof item.hasExplicitEndSec === "boolean"
        ? item.hasExplicitEndSec
        : (typeof item.endSec === "number" &&
            Math.abs(
              item.endSec -
                ((typeof item.startSec === "number" ? item.startSec : 0) +
                  DEFAULT_CLIP_SEC),
            ) > 0.001)),
  );
  const hasExplicitStartSec = Boolean(
    item &&
      (typeof item.hasExplicitStartSec === "boolean"
        ? item.hasExplicitStartSec
        : (typeof item.startSec === "number" && item.startSec > 0) ||
          hasExplicitEndSec),
  );
  const itemTimingSource =
    item?.timingSource === "room_settings" || item?.timingSource === "track_clip"
      ? item.timingSource
      : null;
  const fallbackClipSource: "room_settings" | "track_clip" =
    itemTimingSource ??
    (!hasExplicitStartSec && !hasExplicitEndSec ? "room_settings" : "track_clip");
  const serverClipSource =
    gameState.clipSource === "room_settings" || gameState.clipSource === "track_clip"
      ? gameState.clipSource
      : null;
  const effectiveClipSource = serverClipSource ?? fallbackClipSource;
  const derivedClipStartSec = fallbackClipSource === "room_settings"
    ? Math.max(0, item?.startSec ?? roomStartOffsetSec)
    : Math.max(0, item?.startSec ?? 0);
  const fallbackDurationSec = Math.max(1, Math.floor(effectiveGuessDurationMs / 1000));
  const derivedClipEndSec =
    fallbackClipSource === "room_settings"
      ? typeof item?.endSec === "number" && item.endSec > derivedClipStartSec
        ? item.endSec
        : derivedClipStartSec + fallbackDurationSec
      : typeof item?.endSec === "number" && item.endSec > derivedClipStartSec
        ? item.endSec
        : derivedClipStartSec + DEFAULT_CLIP_SEC;
  const serverClipStartSec =
    typeof gameState.clipStartSec === "number" && gameState.clipStartSec >= 0
      ? gameState.clipStartSec
      : null;
  const serverClipEndSec =
    typeof gameState.clipEndSec === "number" && gameState.clipEndSec > 0
      ? gameState.clipEndSec
      : null;
  const clipStartSec = serverClipStartSec ?? derivedClipStartSec;
  const clipEndSec =
    serverClipEndSec !== null && serverClipEndSec > clipStartSec
      ? serverClipEndSec
      : derivedClipEndSec;
  const shouldLoopRoomSettingsClip = effectiveClipSource === "room_settings";

  const videoId = item ? extractYouTubeId(item.url, item.videoId) : null;
  const phaseEndsAt =
    gameState.phase === "guess"
      ? gameState.startedAt + effectiveGuessDurationMs
      : gameState.revealEndsAt;
  const phaseRemainingMs = Math.max(0, phaseEndsAt - nowMs);
  const revealCountdownMs = Math.max(0, gameState.revealEndsAt - nowMs);
  const isEnded = gameState.status === "ended";
  const isReveal = gameState.phase === "reveal";
  const showVideo = showVideoOverride ?? gameState.showVideo ?? true;
  const clipIdentityStartSec = Math.round(clipStartSec * 1000) / 1000;
  const clipIdentityEndSec = Math.round(clipEndSec * 1000) / 1000;
  const trackLoadKey = `${videoId ?? "none"}:${clipIdentityStartSec}-${clipIdentityEndSec}`;
  const trackSessionKey = `${gameState.startedAt}:${trackCursor}:${currentTrackIndex}`;
  const {
    audioUnlocked,
    isPlayerReady,
    playerVideoId,
    iframeRef,
    silentAudioRef,
    handleGestureOverlayTrigger,
    handlePlaybackIframeLoad,
  } = useGameRoomPlayerSync({
    serverOffsetMs,
    getServerNowMs,
    setNowMs,
    gameVolume,
    requiresAudioGesture,
    startedAt: gameState.startedAt,
    phase: gameState.phase,
    revealEndsAt: gameState.revealEndsAt,
    revealDurationMs: gameState.revealDurationMs,
    effectiveGuessDurationMs,
    fallbackDurationSec,
    shouldLoopRoomSettingsClip,
    clipStartSec,
    clipEndSec,
    waitingToStart,
    isEnded,
    isReveal,
    trackLoadKey,
    trackSessionKey,
    videoId,
    currentTrackIndex,
    primeSfxAudio,
  });
  const shouldShowGestureOverlay =
    !isEnded && requiresAudioGesture && !audioUnlocked;
  const participantCount = participants.length;
  const participantClientIdSet = useMemo(
    () => new Set(participants.map((participant) => participant.clientId)),
    [participants],
  );
  const questionParticipantCount =
    typeof gameState.questionStats?.participantCount === "number" &&
    Number.isFinite(gameState.questionStats.participantCount)
      ? Math.max(0, Math.floor(gameState.questionStats.participantCount))
      : participantCount;
  const requiredAnswerCount =
    participantCount > 0 && questionParticipantCount > 0
      ? Math.min(participantCount, questionParticipantCount)
      : Math.max(participantCount, questionParticipantCount);
  const serverAnsweredCount =
    typeof gameState.questionStats?.answeredCount === "number" &&
    Number.isFinite(gameState.questionStats.answeredCount)
      ? Math.max(0, Math.floor(gameState.questionStats.answeredCount))
      : Array.isArray(gameState.questionStats?.answerOrderLatest)
        ? gameState.questionStats.answerOrderLatest.length
        : 0;
  const serverAnsweredCurrentParticipantCount = useMemo(() => {
    const answersByClientId = gameState.questionStats?.answersByClientId;
    if (
      answersByClientId &&
      typeof answersByClientId === "object" &&
      participantClientIdSet.size > 0
    ) {
      return Object.entries(answersByClientId).reduce((count, [clientId, answer]) => {
        if (!participantClientIdSet.has(clientId)) return count;
        const hasChoiceIndex =
          typeof answer?.choiceIndex === "number" &&
          Number.isFinite(answer.choiceIndex);
        const hasResolvedResult =
          answer?.result === "correct" || answer?.result === "wrong";
        return hasChoiceIndex || hasResolvedResult ? count + 1 : count;
      }, 0);
    }
    const answerOrderLatest = gameState.questionStats?.answerOrderLatest;
    if (Array.isArray(answerOrderLatest) && participantClientIdSet.size > 0) {
      const seen = new Set<string>();
      let count = 0;
      answerOrderLatest.forEach((clientId) => {
        if (!participantClientIdSet.has(clientId) || seen.has(clientId)) return;
        seen.add(clientId);
        count += 1;
      });
      return count;
    }
    return serverAnsweredCount;
  }, [
    gameState.questionStats?.answerOrderLatest,
    gameState.questionStats?.answersByClientId,
    participantClientIdSet,
    serverAnsweredCount,
  ]);
  const allAnsweredByServer =
    gameState.phase === "guess" &&
    requiredAnswerCount > 0 &&
    serverAnsweredCurrentParticipantCount >= requiredAnswerCount;
  const canAnswerNow =
    gameState.status === "playing" &&
    gameState.phase === "guess" &&
    !waitingToStart &&
    !isReveal &&
    !isEnded &&
    !allAnsweredByServer &&
    !shouldShowGestureOverlay;
  const {
    selectedChoiceState,
    selectedChoice,
    choiceCommitFxState,
    myHasChangedAnswer,
    submitChoiceWithFeedback,
    answeredOrderForCurrentParticipants,
    answeredClientIdSet,
    answeredRankByClientId,
    answeredCount,
    scorePartsByClientId,
  } = useGameRoomAnswerFlow({
    gameState,
    participants,
    meClientId,
    currentTrackIndex,
    trackSessionKey,
    canAnswerNow,
    onSubmitChoice,
    getServerNowMs,
    primeSfxAudio,
    playGameSfx,
  });
  const allAnsweredByLocalSnapshot =
    gameState.phase === "guess" &&
    requiredAnswerCount > 0 &&
    answeredCount >= requiredAnswerCount;
  const allAnsweredReadyForReveal =
    gameState.phase === "guess" &&
    (allAnsweredByServer || (requiredAnswerCount === 1 && allAnsweredByLocalSnapshot));
  const isRevealPendingServerSync = allAnsweredReadyForReveal && !isReveal;
  const isRevealPendingOptimisticSync =
    gameState.phase === "guess" &&
    requiredAnswerCount > 0 &&
    !isReveal &&
    allAnsweredByLocalSnapshot &&
    !allAnsweredByServer;
  const displayedPhaseRemainingMs = allAnsweredReadyForReveal
    ? 0
    : phaseRemainingMs;
  const shouldHideVideoInGuessPhase = gameState.phase === "guess" && !isEnded;
  const showGuessMask =
    shouldHideVideoInGuessPhase &&
    !allAnsweredReadyForReveal &&
    !isEnded &&
    !waitingToStart;
  const showPreStartMask =
    waitingToStart &&
    !isEnded &&
    !shouldShowGestureOverlay;
  const showLoadingMask =
    false;
  const shouldHideVideoFrame =
    shouldShowGestureOverlay ||
    showPreStartMask ||
    showLoadingMask ||
    showGuessMask ||
    shouldHideVideoInGuessPhase;
  const showAudioOnlyMask = !shouldHideVideoFrame && !showVideo;
  const correctChoiceIndex = currentTrackIndex;
  const sortedParticipants = useMemo(
    () => sortParticipantsByScore(participants),
    [participants],
  );
  const { topTwoSwapState, resetTopTwoSwapState } =
    useTopTwoSwapState(sortedParticipants);
  const { questionRecaps, resetQuestionRecaps } = useGameRoomRecaps({
    isReveal,
    trackSessionKey,
    trackCursor,
    currentTrackIndex,
    correctChoiceIndex,
    choices: gameState.choices,
    questionStats: gameState.questionStats,
    meClientId,
    selectedChoiceState,
    answeredOrderForCurrentParticipants,
    answeredClientIdSet,
    scorePartsByClientId,
    participants,
    resolvedAnswerTitle,
    item,
    playlist,
    onSettlementRecapChange,
  });

  useEffect(() => {
    resetTopTwoSwapState();
    resetQuestionRecaps();
  }, [resetQuestionRecaps, resetTopTwoSwapState, room.id]);

  useEffect(() => {
    if (gameState.status !== "playing") return;
    if (gameState.phase !== "guess") return;
    if (!waitingToStart || trackCursor !== 0) return;
    resetTopTwoSwapState();
    resetQuestionRecaps();
  }, [
    gameState.phase,
    gameState.status,
    resetQuestionRecaps,
    resetTopTwoSwapState,
    trackCursor,
    waitingToStart,
  ]);

  useEffect(() => {
    if (legacyClipWarningShownRef.current) return;
    if (
      typeof gameState.clipStartSec === "number" &&
      typeof gameState.clipEndSec === "number" &&
      (gameState.clipSource === "room_settings" ||
        gameState.clipSource === "track_clip")
    ) {
      return;
    }
    legacyClipWarningShownRef.current = true;
    console.warn(
      "[GameRoomPage] gameState clip fields are missing; using local fallback clip calculation.",
    );
  }, [gameState.clipEndSec, gameState.clipSource, gameState.clipStartSec]);

  useGameRoomChoiceHotkeys({
    enabled: canAnswerNow,
    choices: gameState.choices,
    keyBindings,
    onSubmitChoice: submitChoiceWithFeedback,
  });

  const effectivePlayerVideoId = playerVideoId ?? videoId;
  const iframeSrc = effectivePlayerVideoId
    ? `https://www.youtube-nocookie.com/embed/${effectivePlayerVideoId}?autoplay=0&controls=0&fs=0&disablekb=1&modestbranding=1&iv_load_policy=3&enablejsapi=1&rel=0&playsinline=1`
    : null;
  const shouldShowVideo = showVideo;

  const phaseLabel = isEnded
    ? "已結束"
    : gameState.phase === "guess" && !allAnsweredReadyForReveal
      ? "猜歌中"
      : "公布答案";

  const activePhaseDurationMs =
    gameState.phase === "guess"
      ? effectiveGuessDurationMs
      : gameState.revealDurationMs;
  const progressPct =
    phaseEndsAt === gameState.startedAt || activePhaseDurationMs <= 0
      ? 0
      : allAnsweredReadyForReveal
        ? 100
      : ((activePhaseDurationMs - phaseRemainingMs) / activePhaseDurationMs) *
      100;
  const isGuessUrgency =
    gameState.phase === "guess" &&
    !allAnsweredReadyForReveal &&
    !isInterTrackWait &&
    !isEnded &&
    phaseRemainingMs > 0 &&
    phaseRemainingMs <= 3000;
  const phaseCountdownSec =
    !isInterTrackWait &&
    !isEnded &&
    !allAnsweredReadyForReveal &&
    phaseRemainingMs > 0 &&
    phaseRemainingMs <= 3999
      ? Math.min(3, Math.ceil(phaseRemainingMs / 1000))
      : null;
  const preStartCountdownSfxSec = startCountdownSec;
  const phaseElapsedMs = Math.max(0, activePhaseDurationMs - phaseRemainingMs);

  useEffect(() => {
    // Inter-track prep is usually very short; keep only the guess-start "go" sound
    // to avoid stacked cues between reveal end and next track start.
    if (isEnded || !waitingToStart || isInterTrackWait) return;
    const sfxKey = `${trackSessionKey}:prestart:${preStartCountdownSfxSec}`;
    if (lastPreStartCountdownSfxKeyRef.current === sfxKey) return;
    lastPreStartCountdownSfxKeyRef.current = sfxKey;
    playGameSfx(resolveCountdownSfxEvent(preStartCountdownSfxSec));
  }, [
    isEnded,
    isInterTrackWait,
    playGameSfx,
    preStartCountdownSfxSec,
    trackSessionKey,
    waitingToStart,
  ]);

  useEffect(() => {
    if (
      gameState.phase !== "guess" ||
      isEnded ||
      waitingToStart ||
      phaseCountdownSec === null ||
      phaseCountdownSec > 3
    ) {
      return;
    }
    const sfxKey = `${trackSessionKey}:${gameState.phase}:countdown:${phaseCountdownSec}`;
    if (lastGuessUrgencySfxKeyRef.current === sfxKey) return;
    lastGuessUrgencySfxKeyRef.current = sfxKey;
    playGameSfx(resolveGuessDeadlineSfxEvent(phaseCountdownSec));
  }, [
    gameState.phase,
    isEnded,
    playGameSfx,
    phaseCountdownSec,
    trackSessionKey,
    waitingToStart,
  ]);

  useEffect(() => {
    if (isEnded || waitingToStart) return;
    if (gameState.phase !== "guess") return;
    if (phaseElapsedMs > 220) return;
    const sfxKey = `${trackSessionKey}:guess:go:${gameState.startedAt}`;
    if (lastCountdownGoSfxKeyRef.current === sfxKey) return;
    lastCountdownGoSfxKeyRef.current = sfxKey;
    playGameSfx("go");
  }, [
    gameState.phase,
    gameState.startedAt,
    isEnded,
    phaseElapsedMs,
    playGameSfx,
    trackSessionKey,
    waitingToStart,
  ]);

  const {
    myHasAnswered,
    myIsCorrect,
    myResolvedScoreBreakdown,
    myComboNow,
    myComboTier,
    myComboMilestone,
    hasActiveComboStreak,
    comboBreakTier,
    isComboBreakThisQuestion,
    myFeedback,
    revealTone,
    isPendingFeedbackCard,
  } = useGameRoomStats({
    participants,
    meClientId,
    scorePartsByClientId,
    answeredRankByClientId,
    answeredClientIdSet,
    answeredCount,
    selectedChoice,
    correctChoiceIndex,
    questionStats: gameState.questionStats,
    gamePhase: gameState.phase,
    isReveal,
    isInterTrackWait,
    isGuessUrgency,
    startCountdownSec,
    myHasChangedAnswer,
  });

  useEffect(() => {
    if (!isReveal || isInterTrackWait || waitingToStart || isEnded) return;
    if (!meClientId) return;

    let resultSfxEvent:
      | "correct"
      | "correctCombo1"
      | "correctCombo2"
      | "correctCombo3"
      | "correctCombo4"
      | "correctCombo5"
      | "wrong"
      | "unanswered";
    let comboBonusKey = 0;

    if (!myHasAnswered || selectedChoice === null) {
      resultSfxEvent = "unanswered";
    } else if (myIsCorrect) {
      if (!myResolvedScoreBreakdown) return;
      comboBonusKey = Math.max(
        0,
        Math.floor(myResolvedScoreBreakdown.comboBonusPoints ?? 0),
      );
      resultSfxEvent = resolveCorrectResultSfxEvent(comboBonusKey) as
        | "correct"
        | "correctCombo1"
        | "correctCombo2"
        | "correctCombo3"
        | "correctCombo4"
        | "correctCombo5";
    } else {
      resultSfxEvent = "wrong";
    }

    const sfxKey = `${trackSessionKey}:reveal:result:${resultSfxEvent}:${comboBonusKey}`;
    if (lastRevealResultSfxKeyRef.current === sfxKey) return;
    lastRevealResultSfxKeyRef.current = sfxKey;
    playGameSfx(resultSfxEvent);
    if (resultSfxEvent === "wrong") {
      triggerHapticFeedback("wrong");
      return;
    }
    if (resultSfxEvent === "unanswered") {
      return;
    }
    triggerHapticFeedback("correct");
  }, [
    isEnded,
    isInterTrackWait,
    isReveal,
    meClientId,
    myHasAnswered,
    myIsCorrect,
    myResolvedScoreBreakdown,
    playGameSfx,
    selectedChoice,
    trackSessionKey,
    waitingToStart,
  ]);

  useEffect(() => {
    if (!isReveal || isInterTrackWait || waitingToStart || isEnded) return;
    if (!meClientId) return;
    let timerId: number | null = null;
    if (isComboBreakThisQuestion && comboBreakTier > 0) {
      const sfxKey = `${trackSessionKey}:combo-break:${comboBreakTier}`;
      if (lastComboStateSfxKeyRef.current === sfxKey) return;
      lastComboStateSfxKeyRef.current = sfxKey;
      timerId = window.setTimeout(() => {
        playGameSfx("comboBreak");
        triggerHapticFeedback("comboBreak");
      }, 110);
      return () => {
        if (timerId !== null) {
          window.clearTimeout(timerId);
        }
      };
    }
    if (!myIsCorrect || !myComboMilestone || myComboTier <= 0) return;
    const sfxKey = `${trackSessionKey}:combo-up:${myComboNow}:${myComboTier}`;
    if (lastComboStateSfxKeyRef.current === sfxKey) return;
    lastComboStateSfxKeyRef.current = sfxKey;
    timerId = window.setTimeout(() => {
      playGameSfx("combo");
      triggerHapticFeedback("combo");
    }, 120);
    return () => {
      if (timerId !== null) {
        window.clearTimeout(timerId);
      }
    };
  }, [
    comboBreakTier,
    isComboBreakThisQuestion,
    isEnded,
    isInterTrackWait,
    isReveal,
    meClientId,
    myComboMilestone,
    myComboNow,
    myComboTier,
    myIsCorrect,
    playGameSfx,
    trackSessionKey,
    waitingToStart,
  ]);

  const playedQuestionCount = trackOrderLength || room.gameSettings?.questionCount || 0;
  const scoreboardRows = useMemo(
    () => buildScoreboardRows(sortedParticipants, meClientId),
    [meClientId, sortedParticipants],
  );
  const mobileScoreboardRows = useMemo(
    () => buildScoreboardRows(sortedParticipants, meClientId, 6),
    [meClientId, sortedParticipants],
  );

  const recentMessages = messages.slice(-80);
  const { settlementSnapshot } = useSettlementSnapshot({
    room,
    participants,
    messages,
    playlist,
    trackOrder: gameState.trackOrder,
    playedQuestionCount,
    startedAt: gameState.startedAt,
    isEnded,
    questionRecaps,
    serverOffsetMs,
  });

  const desktopChatScrollRef = useRef<HTMLDivElement | null>(null);
  const mobileChatScrollRef = useRef<HTMLDivElement | null>(null);
  const lastMessageCountRef = useRef(messages.length);

  useEffect(() => {
    const targets = [desktopChatScrollRef.current, mobileChatScrollRef.current];
    targets.forEach((container) => {
      if (!container) return;
      container.scrollTop = container.scrollHeight;
    });
  }, [messages.length, mobileChatOpen]);

  useEffect(() => {
    const previousCount = lastMessageCountRef.current;
    if (
      isMobileGameViewport &&
      !mobileChatOpen &&
      messages.length > previousCount
    ) {
      setMobileChatUnread((current) => current + (messages.length - previousCount));
    }
    lastMessageCountRef.current = messages.length;
  }, [isMobileGameViewport, messages.length, mobileChatOpen]);

  useEffect(() => {
    if (!isMobileGameViewport) {
      const clearId = window.setTimeout(() => {
        setMobilePlaybackOpen(false);
        setMobileBottomPanel(null);
        setMobileScoreboardSwapArmed(false);
        setMobileChatUnread(0);
      }, 0);
      return () => {
        window.clearTimeout(clearId);
      };
    }
  }, [isMobileGameViewport]);

  useEffect(() => {
    let desktopResetTimer: number | null = null;
    if (!isMobileGameViewport) {
      previousPhaseRef.current = gameState.phase;
      desktopResetTimer = window.setTimeout(() => {
        setMobileAutoOverlayTransition("idle");
      }, 0);
      return () => {
        if (desktopResetTimer !== null) {
          window.clearTimeout(desktopResetTimer);
        }
      };
    }
    const previousPhase = previousPhaseRef.current;
    const currentPhase = gameState.phase;
    let phaseTransitionTimer: number | null = null;
    let transitionResetTimer: number | null = null;
    if (previousPhase !== currentPhase) {
      const shouldOpenRevealOverlay =
        currentPhase === "reveal" && mobileRevealAutoOverlayEnabled;
      const shouldCloseRevealOverlay =
        currentPhase === "guess" && previousPhase === "reveal";
      if (
        (shouldOpenRevealOverlay || shouldCloseRevealOverlay) &&
        !isMobileDrawerGestureActive
      ) {
        const now = Date.now();
        const throttleMs = Math.max(
          0,
          180 - (now - lastAutoOverlayTransitionAtRef.current),
        );
        phaseTransitionTimer = window.setTimeout(() => {
          setMobileAutoOverlayTransition(
            shouldOpenRevealOverlay ? "opening" : "closing",
          );
          if (shouldOpenRevealOverlay) {
            setMobileScoreboardSwapArmed(false);
            setMobilePlaybackOpen(true);
            setMobileBottomPanel("scoreboard");
          }
          if (shouldCloseRevealOverlay) {
            setMobilePlaybackOpen(false);
            setMobileBottomPanel(null);
            setMobileScoreboardSwapArmed(false);
          }
          lastAutoOverlayTransitionAtRef.current = Date.now();
          transitionResetTimer = window.setTimeout(() => {
            setMobileAutoOverlayTransition("idle");
          }, 260);
        }, throttleMs);
      }
    }
    if (!isMobileDrawerGestureActive) {
      previousPhaseRef.current = currentPhase;
    }
    return () => {
      if (desktopResetTimer !== null) {
        window.clearTimeout(desktopResetTimer);
      }
      if (phaseTransitionTimer !== null) {
        window.clearTimeout(phaseTransitionTimer);
      }
      if (transitionResetTimer !== null) {
        window.clearTimeout(transitionResetTimer);
      }
    };
  }, [
    gameState.phase,
    isMobileDrawerGestureActive,
    isMobileGameViewport,
    mobileRevealAutoOverlayEnabled,
  ]);

  const exitGameDialog = (
    <GameRoomExitDialog
      open={exitConfirmOpen}
      onCancel={closeExitConfirm}
      onConfirm={handleExitConfirm}
    />
  );
  const audioGestureOverlay = (
    <AudioGestureOverlayPortal
      visible={shouldShowGestureOverlay}
      isPlayerReady={isPlayerReady}
      onTrigger={handleGestureOverlayTrigger}
    />
  );
  const startBroadcastOverlay = (
    <StartBroadcastOverlayPortal
      visible={isInitialCountdown}
      startCountdownSec={startCountdownSec}
    />
  );
  const playbackHeaderActions =
    isHostInGame ? (
      <Stack
        direction="row"
        spacing={1}
        className="max-[760px]:w-full max-[760px]:grid max-[760px]:grid-cols-1"
      >
        {isHostInGame && (
          <Button
            type="button"
            variant="outlined"
            color="info"
            size="small"
            startIcon={<ManageAccountsRoundedIcon />}
            className="game-room-host-manage-btn max-[760px]:!w-full max-[760px]:!px-2 max-[760px]:!py-1 max-[760px]:!text-xs"
            onClick={handleOpenHostManagement}
          >
            房主管理
          </Button>
        )}
      </Stack>
    ) : null;
  const hostManagementPanelContent = (
    <Stack spacing={1.1} className="game-room-host-manage-list">
      {hostManageParticipants.length === 0 ? (
        <Typography variant="body2" className="text-slate-300">
          目前沒有可管理的玩家。
        </Typography>
      ) : (
        hostManageParticipants.map((participant, index) => {
          const participantPingText =
            typeof participant.pingMs === "number"
              ? `${Math.max(0, Math.round(participant.pingMs))} ms`
              : participant.isOnline
                ? "在線"
                : "離線";
          return (
            <Stack
              key={participant.clientId}
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              alignItems={{ xs: "stretch", sm: "center" }}
              className="game-room-host-manage-item"
            >
              <Stack direction="row" spacing={1} alignItems="center" className="min-w-0 flex-1">
                <Avatar
                  sx={{
                    width: 30,
                    height: 30,
                    fontSize: 12,
                    bgcolor: "rgba(30,41,59,0.75)",
                    color: "rgba(226,232,240,0.95)",
                    border: "1px solid rgba(148,163,184,0.25)",
                  }}
                >
                  {index + 1}
                </Avatar>
                <div className="min-w-0">
                  <Typography variant="body2" className="truncate text-slate-100">
                    {participant.username}
                  </Typography>
                  <Typography variant="caption" className="text-slate-400">
                    分數 {participant.score.toLocaleString()} · {participantPingText}
                  </Typography>
                </div>
                <Chip
                  size="small"
                  label={participant.isOnline ? "在線" : "離線"}
                  color={participant.isOnline ? "success" : "default"}
                  variant="outlined"
                />
              </Stack>
              <Stack
                direction="row"
                spacing={0.7}
                alignItems="center"
                className="game-room-host-manage-actions"
              >
                <Button
                  size="small"
                  variant="outlined"
                  color="info"
                  startIcon={<SwapHorizRoundedIcon />}
                  disabled={!participant.isOnline}
                  onClick={() =>
                    requestHostManagementAction("transfer", participant)
                  }
                >
                  轉移
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="warning"
                  startIcon={<PersonRemoveRoundedIcon />}
                  onClick={() => requestHostManagementAction("kick", participant)}
                >
                  踢出
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  color="error"
                  startIcon={<BlockRoundedIcon />}
                  onClick={() => requestHostManagementAction("ban", participant)}
                >
                  封鎖
                </Button>
              </Stack>
            </Stack>
          );
        })
      )}
    </Stack>
  );

  if (isEnded) {
    return (
      <div className="game-room-shell">
        <LiveSettlementShowcase
          room={settlementSnapshot?.room ?? room}
          participants={settlementSnapshot?.participants ?? participants}
          messages={settlementSnapshot?.messages ?? messages}
          playlistItems={settlementSnapshot?.playlistItems ?? playlist}
          trackOrder={settlementSnapshot?.trackOrder ?? gameState.trackOrder}
          playedQuestionCount={
            settlementSnapshot?.playedQuestionCount ?? playedQuestionCount
          }
          startedAt={settlementSnapshot?.startedAt ?? gameState.startedAt}
          endedAt={settlementSnapshot?.endedAt}
          meClientId={meClientId}
          questionRecaps={settlementSnapshot?.questionRecaps ?? questionRecaps}
          onBackToLobby={onBackToLobby}
          onRequestExit={openExitConfirm}
        />
        {exitGameDialog}
      </div>
    );
  }

  return (
    <div className="game-room-shell">
      <div className="game-room-grid grid w-full grid-cols-1 gap-3 pb-20 lg:grid-cols-[400px_1fr] lg:pb-0 xl:grid-cols-[440px_1fr] lg:h-[calc(100vh-140px)] lg:items-stretch">
        <div className="hidden lg:block lg:h-full">
          <GameRoomLeftSidebar
            answeredCount={answeredCount}
            participantCount={participants.length}
            scoreboardRows={scoreboardRows}
            answeredClientIdSet={answeredClientIdSet}
            answeredRankByClientId={answeredRankByClientId}
            scorePartsByClientId={scorePartsByClientId}
            isReveal={isReveal}
            meClientId={meClientId}
            topTwoSwapState={topTwoSwapState}
            danmuEnabled={danmuEnabled}
            onDanmuEnabledChange={setDanmuEnabled}
            messagesLength={messages.length}
            recentMessages={recentMessages}
            messageInput={messageInput}
            onMessageChange={onMessageChange}
            onSendMessage={onSendMessage}
            chatScrollRef={desktopChatScrollRef}
          />
        </div>
        {/* 右側：播放區 + 答題區 */}
        <section className="game-room-main-section flex min-h-0 flex-col gap-2 lg:h-full lg:overflow-hidden">
          {!isMobileGameViewport && (
            <GameRoomPlaybackPanel
              isRevealPhase={isReveal}
              revealAnswerTitle={resolvedAnswerTitle}
              roomName={room.name}
              boundedCursor={boundedCursor}
              trackOrderLength={trackOrderLength}
              onOpenExitConfirm={openExitConfirm}
              headerActions={playbackHeaderActions}
              iframeSrc={iframeSrc}
              shouldHideVideoFrame={shouldHideVideoFrame}
              shouldShowVideo={shouldShowVideo}
              iframeRef={iframeRef}
              onIframeLoad={handlePlaybackIframeLoad}
              silentAudioRef={silentAudioRef}
              silentAudioSrc={SILENT_AUDIO_SRC}
              danmuEnabled={danmuEnabled}
              danmuItems={danmuItems}
              showGuessMask={showGuessMask}
              showPreStartMask={showPreStartMask}
              showLoadingMask={showLoadingMask}
              showAudioOnlyMask={showAudioOnlyMask}
              showVideo={showVideo}
              onShowVideoChange={(show) => setShowVideoOverride(show)}
              gameVolume={gameVolume}
              onGameVolumeChange={setGameVolume}
            />
          )}
          <GameRoomAnswerPanel
            isMobileView={isMobileGameViewport}
            answerPanelRef={answerPanelRef}
            isInitialCountdown={isInitialCountdown}
            countdownTone={countdownTone}
            startCountdownSec={startCountdownSec}
            isReveal={isReveal}
            revealTone={revealTone}
            isInterTrackWait={isInterTrackWait}
            phaseLabel={phaseLabel}
            phaseRemainingMs={displayedPhaseRemainingMs}
            gamePhase={gameState.phase}
            isGuessUrgency={isGuessUrgency}
            progressPct={progressPct}
            choices={gameState.choices}
            selectedChoice={selectedChoice}
            correctChoiceIndex={correctChoiceIndex}
            isEnded={isEnded}
            playlist={playlist}
            choiceCommitFxState={choiceCommitFxState}
            trackSessionKey={trackSessionKey}
            hasActiveComboStreak={hasActiveComboStreak}
            myComboTier={myComboTier}
            myComboNow={myComboNow}
            isComboBreakThisQuestion={isComboBreakThisQuestion}
            myIsCorrect={myIsCorrect}
            myComboMilestone={myComboMilestone}
            comboBreakTier={comboBreakTier}
            waitingToStart={waitingToStart}
            shouldShowGestureOverlay={shouldShowGestureOverlay}
            canAnswerNow={canAnswerNow}
            onSubmitChoice={submitChoiceWithFeedback}
            keyBindings={keyBindings}
            myHasChangedAnswer={myHasChangedAnswer}
            myFeedback={myFeedback}
            gameStatus={gameState.status}
            revealCountdownMs={revealCountdownMs}
            resolvedAnswerTitle={resolvedAnswerTitle}
            onOpenExitConfirm={openExitConfirm}
            isPendingFeedbackCard={isPendingFeedbackCard}
            allAnsweredReadyForReveal={allAnsweredReadyForReveal}
            isRevealPendingServerSync={isRevealPendingServerSync}
            isRevealPendingOptimisticSync={isRevealPendingOptimisticSync}
          />
          {isMobileGameViewport && (
            <div
              className={`game-room-mobile-action-dock lg:hidden ${
                mobileRevealSplitMode ? "game-room-mobile-action-dock--hidden" : ""
              } ${
                mobileAutoOverlayTransition !== "idle"
                  ? `game-room-mobile-action-dock--${mobileAutoOverlayTransition}`
                  : ""
              }`}
            >
              <button
                type="button"
                className="game-room-mobile-action-btn game-room-mobile-action-btn--icon"
                onClick={handleToggleMobilePlayback}
              >
                <span className="game-room-mobile-action-icon" aria-hidden>
                  <SmartDisplayRoundedIcon fontSize="inherit" />
                </span>
                <span className="game-room-mobile-action-label">影片</span>
                <span className="game-room-mobile-action-meta">
                  {isReveal ? "公布答案" : `第 ${boundedCursor + 1} 題`}
                </span>
              </button>
              <button
                type="button"
                className="game-room-mobile-action-btn game-room-mobile-action-btn--icon"
                onClick={handleToggleMobileScoreboard}
              >
                <span className="game-room-mobile-action-icon" aria-hidden>
                  <LeaderboardRoundedIcon fontSize="inherit" />
                </span>
                <span className="game-room-mobile-action-label">分數榜</span>
                <span className="game-room-mobile-action-meta">
                  已答 {answeredCount}/{participants.length || 0}
                </span>
              </button>
              <button
                type="button"
                className={`game-room-mobile-action-btn game-room-mobile-action-btn--icon ${
                  mobileChatOpen ? "game-room-mobile-action-btn--active" : ""
                } ${
                  mobileChatUnread > 0 ? "game-room-mobile-action-btn--unread" : ""
                }`}
                onClick={handleToggleMobileChat}
              >
                <span className="game-room-mobile-action-icon" aria-hidden>
                  <ForumRoundedIcon fontSize="inherit" />
                </span>
                <span className="game-room-mobile-action-label">聊天室</span>
                <span className="game-room-mobile-action-meta">
                  {mobileChatUnread > 0
                    ? `未讀 ${mobileChatUnread > 99 ? "99+" : mobileChatUnread}`
                    : "開啟"}
                </span>
              </button>
              <div
                className="game-room-mobile-action-subdock col-span-3"
              >
                {isHostInGame && (
                  <button
                    type="button"
                    className={`game-room-mobile-toggle-chip game-room-mobile-toggle-chip--half ${
                      hostManagementOpen ? "game-room-mobile-toggle-chip--active" : ""
                    }`}
                    onClick={handleOpenHostManagement}
                  >
                    <span className="game-room-mobile-action-icon" aria-hidden>
                      <ManageAccountsRoundedIcon fontSize="inherit" />
                    </span>
                    <span>房主管理</span>
                    <span className="game-room-mobile-action-meta">
                      {hostManageParticipants.length} 人
                    </span>
                  </button>
                )}
                <button
                  type="button"
                  className={`game-room-mobile-toggle-chip ${
                    isHostInGame ? "game-room-mobile-toggle-chip--half " : ""
                  }${
                    mobileRevealAutoOverlayEnabled
                      ? "game-room-mobile-toggle-chip--active"
                      : ""
                  }`}
                  onClick={() =>
                    setMobileRevealAutoOverlayEnabled((current) => !current)
                  }
                  aria-pressed={mobileRevealAutoOverlayEnabled}
                >
                  <span className="game-room-mobile-action-icon" aria-hidden>
                    <AutoAwesomeRoundedIcon fontSize="inherit" />
                  </span>
                  <span>公布答案自動彈出影片與分數榜</span>
                  <span className="game-room-mobile-action-meta">
                    {mobileRevealAutoOverlayEnabled ? "ON" : "OFF"}
                  </span>
                </button>
              </div>
            </div>
          )}
        </section>
        {isMobileGameViewport && (
          <>
            {(mobilePlaybackOpen || mobileBottomPanel !== null) &&
              isMobileDrawerGestureActive && (
              <div
                className="game-room-mobile-overlay-blocker"
                aria-hidden="true"
              />
            )}
            <SwipeableDrawer
              className={`game-room-mobile-drawer-root game-room-mobile-drawer-root--playback lg:!hidden ${
                mobileAutoOverlayTransition !== "idle"
                  ? `game-room-mobile-drawer-root--${mobileAutoOverlayTransition}`
                  : ""
              }`}
              anchor="top"
              open={mobilePlaybackOpen}
              onOpen={handleOpenMobilePlayback}
              onClose={handleCloseMobilePlayback}
              disableSwipeToOpen={false}
              allowSwipeInChildren
              swipeAreaWidth={26}
              keepMounted
              ModalProps={{
                keepMounted: true,
                hideBackdrop: true,
                disableAutoFocus: true,
                disableEnforceFocus: true,
                disableRestoreFocus: true,
                disableScrollLock: true,
              }}
              PaperProps={{
                className: `game-room-mobile-playback-drawer ${
                  mobileRevealSplitMode
                    ? "game-room-mobile-playback-drawer--split"
                    : "game-room-mobile-playback-drawer--single"
                }`,
                style: mobilePlaybackDragDismiss.paperStyle,
              }}
            >
              <div
                className={`relative min-h-0 flex-1 overflow-hidden ${
                  mobileRevealSplitMode ? "p-1.5 pt-1" : "p-2"
                }`}
              >
                <button
                  type="button"
                  className="game-room-mobile-drawer-close game-room-mobile-drawer-close--icon game-room-mobile-drawer-close-fab"
                  onClick={handleCloseMobilePlayback}
                  aria-label="關閉影片視窗"
                >
                  <CloseRoundedIcon fontSize="inherit" />
                </button>
                <GameRoomPlaybackPanel
                  isMobileView
                  isOverlayMode
                  isRevealPhase={isReveal}
                  revealAnswerTitle={resolvedAnswerTitle}
                  roomName={room.name}
                  boundedCursor={boundedCursor}
                  trackOrderLength={trackOrderLength}
                  onOpenExitConfirm={openExitConfirm}
                  headerActions={playbackHeaderActions}
                  iframeSrc={iframeSrc}
                  shouldHideVideoFrame={shouldHideVideoFrame}
                  shouldShowVideo={shouldShowVideo}
                  iframeRef={iframeRef}
                  onIframeLoad={handlePlaybackIframeLoad}
                  silentAudioRef={silentAudioRef}
                  silentAudioSrc={SILENT_AUDIO_SRC}
                  danmuEnabled={danmuEnabled}
                  danmuItems={danmuItems}
                  showGuessMask={showGuessMask}
                  showPreStartMask={showPreStartMask}
                  showLoadingMask={showLoadingMask}
                  showAudioOnlyMask={showAudioOnlyMask}
                  showVideo={showVideo}
                  onShowVideoChange={(show) => setShowVideoOverride(show)}
                  gameVolume={gameVolume}
                  onGameVolumeChange={setGameVolume}
                />
              </div>
              <div
                className="game-room-mobile-drawer-foot game-room-mobile-drawer-foot--playback"
                role="presentation"
                aria-label="由下往上拖曳收合影片視窗"
                {...mobilePlaybackDragDismiss.dragHandleProps}
              >
                <div
                  className="game-room-mobile-drawer-handle-wrap game-room-mobile-drawer-handle-wrap--draggable"
                  aria-hidden="true"
                >
                  <span className="game-room-mobile-drawer-handle-bar" />
                  <span className="game-room-mobile-drawer-handle-direction">
                    由下往上拖曳收合
                  </span>
                </div>
              </div>
            </SwipeableDrawer>
            <SwipeableDrawer
              className={`game-room-mobile-drawer-root game-room-mobile-drawer-root--scoreboard lg:!hidden ${
                mobileAutoOverlayTransition !== "idle"
                  ? `game-room-mobile-drawer-root--${mobileAutoOverlayTransition}`
                  : ""
              }`}
              anchor="bottom"
              open={mobileScoreboardOpen}
              onOpen={handleOpenMobileScoreboard}
              onClose={handleCloseMobileScoreboard}
              disableSwipeToOpen={false}
              allowSwipeInChildren
              swipeAreaWidth={26}
              keepMounted
              ModalProps={{
                keepMounted: true,
                hideBackdrop: true,
                disableAutoFocus: true,
                disableEnforceFocus: true,
                disableRestoreFocus: true,
                disableScrollLock: true,
              }}
              PaperProps={{
                className: `game-room-mobile-scoreboard-drawer ${
                  mobileRevealSplitMode
                    ? "game-room-mobile-scoreboard-drawer--split"
                    : "game-room-mobile-scoreboard-drawer--single"
                }`,
                style: mobileScoreboardDragDismiss.paperStyle,
              }}
            >
              <div
                className="game-room-mobile-drawer-head game-room-mobile-drawer-head--scoreboard"
                role="presentation"
                aria-label="向下拖曳收合分數榜"
                {...mobileScoreboardDragDismiss.dragHandleProps}
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
                <div className="game-room-mobile-scoreboard-headline">
                  <div className="game-room-mobile-scoreboard-title-group">
                    <span className="game-room-mobile-scoreboard-kicker">SCOREBOARD</span>
                    <span className="game-room-mobile-scoreboard-title">分數榜</span>
                  </div>
                  <div className="game-room-mobile-scoreboard-actions">
                    <button
                      type="button"
                      className="game-room-mobile-drawer-close game-room-mobile-drawer-close--icon game-room-mobile-drawer-close--scoreboard-inline"
                      onClick={handleCloseMobileScoreboard}
                      aria-label="關閉分數榜"
                    >
                      <CloseRoundedIcon fontSize="inherit" />
                    </button>
                    <span className="game-room-mobile-scoreboard-answered-pill">
                      已答 {answeredCount}/{participants.length || 0}
                    </span>
                  </div>
                </div>
              </div>
              <div
                className={`relative min-h-0 flex-1 overflow-hidden ${
                  mobileRevealSplitMode ? "p-1.5 pb-1" : "p-2"
                }`}
              >
                <GameRoomLeftSidebar
                  answeredCount={answeredCount}
                  participantCount={participants.length}
                  scoreboardRows={mobileScoreboardRows}
                  answeredClientIdSet={answeredClientIdSet}
                  answeredRankByClientId={answeredRankByClientId}
                  scorePartsByClientId={scorePartsByClientId}
                  isReveal={isReveal}
                  meClientId={meClientId}
                  topTwoSwapState={topTwoSwapState}
                  danmuEnabled={danmuEnabled}
                  onDanmuEnabledChange={setDanmuEnabled}
                  messagesLength={messages.length}
                  recentMessages={recentMessages}
                  messageInput={messageInput}
                  onMessageChange={onMessageChange}
                  onSendMessage={onSendMessage}
                  chatScrollRef={mobileChatScrollRef}
                  className="game-room-mobile-scoreboard-shell !h-full"
                  showChat={false}
                  mobileOverlayMode
                  mobileMinimalHeader
                  swapAnimationEnabled={
                    mobileScoreboardOpen && mobileScoreboardSwapArmed
                  }
                  swapReplayToken={mobileScoreboardSwapReplayToken}
                />
              </div>
            </SwipeableDrawer>
            <GameRoomMobileChatPopover
              open={mobileChatOpen}
              unreadCount={mobileChatUnread}
              onOpen={handleOpenMobileChat}
              onClose={handleCloseMobileChat}
              showFab={false}
              heightVh={clampMobileVh(
                mobileChatHeight,
                MOBILE_CHAT_MIN_HEIGHT_VH,
                MOBILE_CHAT_MAX_HEIGHT_VH,
              )}
              minHeightVh={MOBILE_CHAT_MIN_HEIGHT_VH}
              maxHeightVh={MOBILE_CHAT_MAX_HEIGHT_VH}
              onHeightChange={handleChatHeightChange}
              onDraggingChange={handleMobileChatDraggingChange}
              danmuEnabled={danmuEnabled}
              onDanmuEnabledChange={setDanmuEnabled}
              messagesLength={messages.length}
              recentMessages={recentMessages}
              messageInput={messageInput}
              onMessageChange={onMessageChange}
              onSendMessage={onSendMessage}
              chatScrollRef={mobileChatScrollRef}
            />
          </>
        )}
        {isHostInGame && !isMobileGameViewport && (
          <Dialog
            open={hostManagementOpen}
            onClose={handleCloseHostManagement}
            maxWidth="sm"
            fullWidth
            PaperProps={{
              className: "game-room-host-manage-dialog",
            }}
          >
            <DialogTitle>房主管理面板</DialogTitle>
            <DialogContent dividers>{hostManagementPanelContent}</DialogContent>
            <DialogActions>
              <Button onClick={handleCloseHostManagement} variant="outlined" color="inherit">
                關閉
              </Button>
            </DialogActions>
          </Dialog>
        )}
        {isHostInGame && isMobileGameViewport && (
          <SwipeableDrawer
            className="game-room-mobile-drawer-root game-room-mobile-drawer-root--host-manage lg:!hidden"
            anchor="bottom"
            open={hostManagementOpen}
            onOpen={handleOpenHostManagement}
            onClose={handleCloseHostManagement}
            disableSwipeToOpen={false}
            swipeAreaWidth={26}
            keepMounted
            ModalProps={{
              keepMounted: true,
              hideBackdrop: true,
              disableAutoFocus: true,
              disableEnforceFocus: true,
              disableRestoreFocus: true,
              disableScrollLock: true,
            }}
            PaperProps={{
              className: "game-room-mobile-host-manage-drawer",
            }}
          >
            <div className="game-room-mobile-host-manage-head">
              <span className="game-room-mobile-drawer-handle-bar" />
              <Typography variant="subtitle2">房主管理</Typography>
              <Typography variant="caption" className="text-slate-400">
                可操作 {hostManageParticipants.length} 位玩家
              </Typography>
            </div>
            <div className="game-room-mobile-host-manage-body">
              {hostManagementPanelContent}
            </div>
            <div className="game-room-mobile-host-manage-foot">
              <Button
                fullWidth
                variant="outlined"
                color="inherit"
                onClick={handleCloseHostManagement}
              >
                完成
              </Button>
            </div>
          </SwipeableDrawer>
        )}
        <ConfirmDialog
          open={isHostInGame && Boolean(hostManagementConfirm)}
          title={hostManagementConfirmText?.title ?? ""}
          description={hostManagementConfirmText?.description ?? ""}
          confirmLabel={hostManagementConfirmText?.confirmLabel ?? "確認"}
          cancelLabel="取消"
          onConfirm={handleConfirmHostManagementAction}
          onCancel={() => setHostManagementConfirm(null)}
        />
        {audioGestureOverlay}
        {startBroadcastOverlay}
        {exitGameDialog}
      </div>
    </div>
  );
};

export default GameRoomPage;


