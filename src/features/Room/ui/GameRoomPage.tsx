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
import ForumRoundedIcon from "@mui/icons-material/ForumRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import MyLocationRoundedIcon from "@mui/icons-material/MyLocationRounded";
import ManageAccountsRoundedIcon from "@mui/icons-material/ManageAccountsRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import SwapHorizRoundedIcon from "@mui/icons-material/SwapHorizRounded";
import PersonRemoveRoundedIcon from "@mui/icons-material/PersonRemoveRounded";
import BlockRoundedIcon from "@mui/icons-material/BlockRounded";
import HowToVoteRoundedIcon from "@mui/icons-material/HowToVoteRounded";
import type {
  ChatMessage,
  GameState,
  PlaylistItem,
  PlaybackExtensionMode,
  RoomState,
  SubmitAnswerResult,
} from "../model/types";
import {
  DEFAULT_CLIP_SEC,
  DEFAULT_PLAYBACK_EXTENSION_MODE,
  DEFAULT_PLAY_DURATION_SEC,
  DEFAULT_START_OFFSET_SEC,
} from "../model/roomConstants";
import {
  normalizePlaybackExtensionMode,
  normalizeRoomDisplayText,
} from "../model/roomProviderUtils";
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
  buildRevealChoicePickMap,
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
import { useRoom } from "../model/useRoom";

interface GameRoomPageProps {
  room: RoomState["room"];
  gameState: GameState;
  playlist: PlaylistItem[];
  onExitGame: () => void;
  onBackToLobby?: () => void;
  onSubmitChoice: (choiceIndex: number) => Promise<SubmitAnswerResult>;
  onRequestPlaybackExtensionVote?: () => Promise<boolean>;
  onCastPlaybackExtensionVote?: (
    vote: "approve" | "reject",
  ) => Promise<boolean>;
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

const MOBILE_SCOREBOARD_MIN_HEIGHT_VH = 42;
const MOBILE_SCOREBOARD_MAX_HEIGHT_VH = 72;
const MOBILE_SCOREBOARD_DEFAULT_HEIGHT_VH = 60;

const MOBILE_CHAT_MIN_HEIGHT_VH = 42;
const MOBILE_CHAT_MAX_HEIGHT_VH = 68;
const MOBILE_CHAT_DEFAULT_HEIGHT_VH = 50;
const GAME_ROOM_CHAT_ALERTS_STORAGE_KEY = "mq_game_room_chat_alerts_enabled";
const GAME_ROOM_GUESS_ANCHOR_STORAGE_KEY = "mq_game_room_guess_anchor_enabled";
const ROOM_CHAT_LAST_READ_MESSAGE_KEY_PREFIX = "mq_room_chat_last_read_message:";

const MOBILE_SPLIT_STACK_MAX_TOTAL_VH = 100;

const clampMobileVh = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const normalizeMobileSplitHeights = (scoreboardHeight: number) => {
  let nextScoreboardHeight = clampMobileVh(
    scoreboardHeight,
    MOBILE_SCOREBOARD_MIN_HEIGHT_VH,
    MOBILE_SCOREBOARD_MAX_HEIGHT_VH,
  );
  const totalHeight = 32 + nextScoreboardHeight;
  if (totalHeight > MOBILE_SPLIT_STACK_MAX_TOTAL_VH) {
    const scale = MOBILE_SPLIT_STACK_MAX_TOTAL_VH / totalHeight;
    nextScoreboardHeight = clampMobileVh(
      nextScoreboardHeight * scale,
      MOBILE_SCOREBOARD_MIN_HEIGHT_VH,
      MOBILE_SCOREBOARD_MAX_HEIGHT_VH,
    );
  }
  return {
    scoreboardHeight: Number(nextScoreboardHeight.toFixed(2)),
  };
};

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

const readInitialGameRoomChatAlertsEnabled = () => {
  if (typeof window === "undefined") return false;
  const stored = window.localStorage.getItem(GAME_ROOM_CHAT_ALERTS_STORAGE_KEY);
  if (stored === "0") return false;
  if (stored === "1") return true;
  return false;
};

const readInitialGameRoomGuessAnchorEnabled = () => {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(GAME_ROOM_GUESS_ANCHOR_STORAGE_KEY) === "1";
};

const GameRoomPage: React.FC<GameRoomPageProps> = ({
  room,
  gameState,
  playlist,
  onExitGame,
  onBackToLobby,
  onSubmitChoice,
  onRequestPlaybackExtensionVote,
  onCastPlaybackExtensionVote,
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
  const { setStatusText } = useRoom();
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
  const [mobileChatAlertsEnabled, setMobileChatAlertsEnabled] = useState(
    readInitialGameRoomChatAlertsEnabled,
  );
  const [mobileGuessAnchorEnabled, setMobileGuessAnchorEnabled] = useState(
    readInitialGameRoomGuessAnchorEnabled,
  );
  const [hostManagementOpen, setHostManagementOpen] = useState(false);
  const [hostManagementConfirm, setHostManagementConfirm] =
    useState<HostManagementAction | null>(null);
  const [playbackVoteDialogOpen, setPlaybackVoteDialogOpen] = useState(false);
  const [playbackVoteRequestPending, setPlaybackVoteRequestPending] =
    useState(false);
  const [playbackVoteSubmitPending, setPlaybackVoteSubmitPending] = useState<
    "approve" | "reject" | null
  >(null);
  const { keyBindings } = useKeyBindings();
  const legacyClipWarningShownRef = useRef(false);
  const lastPreStartCountdownSfxKeyRef = useRef<string | null>(null);
  const lastGuessUrgencySfxKeyRef = useRef<string | null>(null);
  const lastCountdownGoSfxKeyRef = useRef<string | null>(null);
  const lastRevealResultSfxKeyRef = useRef<string | null>(null);
  const lastComboStateSfxKeyRef = useRef<string | null>(null);
  const previousPhaseRef = useRef<GameState["phase"]>(gameState.phase);
  const lastAutoOverlayTransitionAtRef = useRef(0);
  const lastPlaybackVotePromptKeyRef = useRef<string | null>(null);
  const lastPlaybackVoteActiveKeyRef = useRef<string | null>(null);
  const lastPlaybackVoteResolvedKeyRef = useRef<string | null>(null);
  const lastAutoPlaybackExtensionNoticeRef = useRef<string | null>(null);
  const answerPanelRef = useRef<HTMLDivElement | null>(null);
  const mobilePlaybackPanelRef = useRef<HTMLDivElement | null>(null);
  const lastUnreadGameMessageIdRef = useRef<string | null>(null);
  const mobileChatUnreadSeededRoomRef = useRef<string | null>(null);
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
  const normalizedSplitHeights = useMemo(
    () => normalizeMobileSplitHeights(mobileScoreboardHeight),
    [mobileScoreboardHeight],
  );
  const handleScoreboardHeightChange = useCallback((nextHeight: number) => {
    const clampedNext = clampMobileVh(
      nextHeight,
      MOBILE_SCOREBOARD_MIN_HEIGHT_VH,
      MOBILE_SCOREBOARD_MAX_HEIGHT_VH,
    );
    setMobileScoreboardHeight(clampedNext);
  }, []);
  const handleChatHeightChange = useCallback((nextHeight: number) => {
    setMobileChatHeight(
      clampMobileVh(
        nextHeight,
        MOBILE_CHAT_MIN_HEIGHT_VH,
        MOBILE_CHAT_MAX_HEIGHT_VH,
      ),
    );
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
  const getLatestUnreadGameMessageId = useCallback(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      if (!message) continue;
      if (message.userId.startsWith("system:") || message.userId === meClientId) {
        continue;
      }
      return message.id;
    }
    return null;
  }, [meClientId, messages]);
  const markGameChatRead = useCallback(
    (messageId: string | null = getLatestUnreadGameMessageId()) => {
      setMobileChatUnread(0);
      mobileChatUnreadSeededRoomRef.current = room.id;
      lastUnreadGameMessageIdRef.current = messageId;
      writeRoomChatLastReadMessageId(room.id, messageId);
    },
    [getLatestUnreadGameMessageId, room.id],
  );
  const handleToggleMobileChat = useCallback(() => {
    markGameChatRead();
    setMobileScoreboardSwapArmed(false);
    setMobileBottomPanel((current) => (current === "chat" ? null : "chat"));
  }, [markGameChatRead]);
  const handleOpenMobileChat = useCallback(() => {
    markGameChatRead();
    setMobileScoreboardSwapArmed(false);
    setMobileBottomPanel("chat");
  }, [markGameChatRead]);
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
  const mobileHostManageDragDismiss = useMobileDrawerDragDismiss({
    open: hostManagementOpen,
    direction: "down",
    onDismiss: handleCloseHostManagement,
    height: 58,
    minHeight: 48,
    maxHeight: 72,
    threshold: 32,
  });
  const mobileHostManageDismissState = mobileHostManageDragDismiss.canDismiss
    ? "ready"
    : mobileHostManageDragDismiss.isDismissArmed
      ? "armed"
      : "idle";
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
    const target = normalizeRoomDisplayText(
      hostManagementConfirm.targetName,
      "玩家",
    );
    if (hostManagementConfirm.type === "transfer") {
      return {
        title: `\u8981\u5c07\u623f\u4e3b\u8f49\u79fb\u7d66 ${target} \u55ce\uff1f`,
        description:
          "\u8f49\u79fb\u5f8c\u4f60\u5c07\u5931\u53bb\u623f\u4e3b\u7ba1\u7406\u6b0a\u9650\uff0c\u5c0d\u65b9\u6703\u7acb\u523b\u63a5\u624b\u623f\u9593\u8a2d\u5b9a\u8207\u73a9\u5bb6\u7ba1\u7406\u529f\u80fd\u3002",
        confirmLabel: "\u78ba\u8a8d\u8f49\u79fb\u623f\u4e3b",
      };
    }
    if (hostManagementConfirm.type === "ban") {
      return {
        title: `\u8981\u8e22\u51fa\u4e26\u5c01\u9396 ${target} \u55ce\uff1f`,
        description:
          "\u9019\u4f4d\u73a9\u5bb6\u6703\u7acb\u523b\u96e2\u958b\u623f\u9593\uff0c\u4e26\u5728\u5c01\u9396\u671f\u9593\u7121\u6cd5\u518d\u6b21\u52a0\u5165\u9019\u500b\u623f\u9593\u3002",
        confirmLabel: "\u78ba\u8a8d\u8e22\u51fa\u4e26\u5c01\u9396",
      };
    }
    return {
      title: `\u8981\u8e22\u51fa ${target} \u55ce\uff1f`,
      description: "\u9019\u4f4d\u73a9\u5bb6\u6703\u7acb\u523b\u96e2\u958b\u623f\u9593\uff0c\u4f46\u4e4b\u5f8c\u4ecd\u53ef\u900f\u904e\u9080\u8acb\u6216\u91cd\u65b0\u52a0\u5165\u56de\u5230\u623f\u9593\u3002",
      confirmLabel: "\u78ba\u8a8d\u8e22\u51fa\u73a9\u5bb6",
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
  const playbackExtensionVote = gameState.playbackExtensionVote ?? null;
  const playbackExtensionMode: PlaybackExtensionMode =
    normalizePlaybackExtensionMode(
      room.gameSettings?.playbackExtensionMode ?? DEFAULT_PLAYBACK_EXTENSION_MODE,
    );
  const isManualPlaybackExtensionMode = playbackExtensionMode === "manual_vote";
  const isAutoPlaybackExtensionMode = playbackExtensionMode === "auto_once";
  const playbackVoteApproveCount =
    playbackExtensionVote?.approveClientIds.length ?? 0;
  const playbackVoteRejectCount =
    playbackExtensionVote?.rejectClientIds.length ?? 0;
  const playbackVoteEligibleCount =
    playbackExtensionVote?.eligibleClientIds.length ?? 0;
  const playbackVoteMajorityCount =
    playbackVoteEligibleCount > 0
      ? Math.floor(playbackVoteEligibleCount / 2) + 1
      : 0;
  const playbackVoteRemainingMs =
    playbackExtensionVote?.status === "active"
      ? Math.max(0, playbackExtensionVote.endsAt - nowMs)
      : 0;
  const playbackExtensionSeconds = Math.max(
    0,
    Math.round((gameState.playbackExtensionMs ?? 0) / 1000),
  );
  const myPlaybackVote = useMemo(() => {
    if (!playbackExtensionVote || !meClientId) return null;
    if (playbackExtensionVote.approveClientIds.includes(meClientId)) {
      return "approve";
    }
    if (playbackExtensionVote.rejectClientIds.includes(meClientId)) {
      return "reject";
    }
    return null;
  }, [meClientId, playbackExtensionVote]);
  const playbackVoteRequesterName =
    normalizeRoomDisplayText(playbackExtensionVote?.requestedByUsername, "玩家");
  const playbackVoteProposalSeconds = Math.max(
    0,
    Math.round((playbackExtensionVote?.extendMs ?? 0) / 1000),
  );
  const playbackVoteResolvedSeconds = Math.max(
    playbackExtensionSeconds,
    playbackVoteProposalSeconds,
  );
  const playbackVoteButtonLabel = playbackVoteRequestPending
    ? "\u767c\u8d77\u6295\u7968\u4e2d..."
    : playbackExtensionVote?.status === "active"
      ? myPlaybackVote === null
        ? `\u5ef6\u9577\u6295\u7968 ${playbackVoteApproveCount}/${playbackVoteMajorityCount}`
        : `\u5df2\u6295\u7968 ${playbackVoteApproveCount}/${playbackVoteMajorityCount}`
      : playbackExtensionVote?.status === "approved" && playbackVoteResolvedSeconds > 0
        ? `\u5df2\u5ef6\u9577 ${playbackVoteResolvedSeconds} \u79d2`
        : playbackExtensionVote?.status === "rejected"
          ? "\u6295\u7968\u672a\u901a\u904e"
          : playbackExtensionSeconds > 0
            ? `\u5df2\u5ef6\u9577 ${playbackExtensionSeconds} \u79d2`
            : "\u5ef6\u9577\u64ad\u653e";
  const playbackVoteRemainingSeconds = Math.max(
    0,
    Math.ceil(playbackVoteRemainingMs / 1000),
  );
  const effectiveMobileScoreboardHeight = clampMobileVh(
    normalizedSplitHeights.scoreboardHeight,
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
  const mobileScoreboardDismissState = mobileScoreboardDragDismiss.canDismiss
    ? "ready"
    : mobileScoreboardDragDismiss.isDismissArmed
      ? "armed"
      : "idle";
  const isMobileDrawerGestureActive =
    mobileScoreboardDragDismiss.isDragging || mobileChatDragging;
  const mobileSubdockActionCount =
    (isHostInGame ? 1 : 0) +
    (gameState.status === "playing" && isManualPlaybackExtensionMode ? 1 : 0) +
    3;
  useGameRoomAnswerPanelAutoScroll({
    answerPanelRef,
    scrollTargetRef: mobilePlaybackPanelRef,
    initialScrollKey:
      isMobileGameViewport &&
        gameState.status === "playing" &&
        (gameState.trackCursor ?? 0) === 0
        ? `${room.id}:${gameState.startedAt}:initial`
        : null,
    autoScrollKey:
      isMobileGameViewport &&
        mobileGuessAnchorEnabled &&
        gameState.status === "playing" &&
        gameState.phase === "guess"
        ? `${room.id}:${gameState.startedAt}:${gameState.trackCursor ?? 0}:guess`
        : null,
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
  const resolvedAnswerTitle = normalizeRoomDisplayText(
    gameState.answerTitle?.trim() ||
    item?.answerText?.trim() ||
    item?.title?.trim(),
    "未提供歌名",
  );
  const resolvedRoomName = normalizeRoomDisplayText(room.name, "未命名房間");

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
  const canRequestPlaybackExtensionVote =
    isManualPlaybackExtensionMode &&
    gameState.status === "playing" &&
    gameState.phase === "guess" &&
    !waitingToStart &&
    !isEnded &&
    !allAnsweredReadyForReveal &&
    !playbackExtensionVote;
  const canOpenPlaybackVotePrompt =
    isManualPlaybackExtensionMode &&
    playbackExtensionVote?.status === "active" &&
    myPlaybackVote === null;
  const playbackVoteButtonDisabled =
    playbackVoteRequestPending ||
    playbackVoteSubmitPending !== null ||
    (canRequestPlaybackExtensionVote && !onRequestPlaybackExtensionVote) ||
    (canOpenPlaybackVotePrompt && !onCastPlaybackExtensionVote) ||
    (!canRequestPlaybackExtensionVote && !canOpenPlaybackVotePrompt);
  const shouldHideVideoInGuessPhase =
    gameState.phase === "guess" && !isEnded;
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
  const reduceGuessVideoDisplayCost =
    isMobileGameViewport &&
    showGuessMask &&
    !showPreStartMask &&
    !isReveal;
  const correctChoiceIndex = currentTrackIndex;
  const sortedParticipants = useMemo(
    () => sortParticipantsByScore(participants),
    [participants],
  );
  const revealChoicePickMap = useMemo(
    () =>
      buildRevealChoicePickMap({
        phase: gameState.phase,
        answersByClientId: gameState.questionStats?.answersByClientId,
        participants,
        meClientId,
      }),
    [
      gameState.phase,
      gameState.questionStats?.answersByClientId,
      participants,
      meClientId,
    ],
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
    setPlaybackVoteDialogOpen(false);
    setPlaybackVoteRequestPending(false);
    setPlaybackVoteSubmitPending(null);
    lastPlaybackVotePromptKeyRef.current = null;
    lastPlaybackVoteActiveKeyRef.current = null;
    lastPlaybackVoteResolvedKeyRef.current = null;
    lastAutoPlaybackExtensionNoticeRef.current = null;
  }, [trackSessionKey]);

  useEffect(() => {
    setPlaybackVoteDialogOpen(false);
    if (!isManualPlaybackExtensionMode) return;
    if (!playbackExtensionVote || playbackExtensionVote.status !== "active") return;
    if (!meClientId || myPlaybackVote !== null) return;
    const promptKey = `${trackSessionKey}:${playbackExtensionVote.startedAt}`;
    if (lastPlaybackVotePromptKeyRef.current === promptKey) return;
    lastPlaybackVotePromptKeyRef.current = promptKey;
  }, [
    isManualPlaybackExtensionMode,
    meClientId,
    myPlaybackVote,
    playbackExtensionVote,
    trackSessionKey,
  ]);

  useEffect(() => {
    if (!playbackExtensionVote || playbackExtensionVote.status !== "active") {
      return;
    }
    if (!isManualPlaybackExtensionMode) {
      return;
    }
    const activeKey = `${trackSessionKey}:${playbackExtensionVote.startedAt}:active`;
    if (lastPlaybackVoteActiveKeyRef.current === activeKey) return;
    lastPlaybackVoteActiveKeyRef.current = activeKey;
    setStatusText(
      `${playbackVoteRequesterName} \u63d0\u8b70\u5c07\u672c\u984c\u591a\u64ad\u653e ${playbackVoteProposalSeconds} \u79d2\uff0c\u8acb\u5118\u5feb\u6295\u7968\u3002`,
    );
  }, [
    isManualPlaybackExtensionMode,
    playbackExtensionVote,
    playbackVoteProposalSeconds,
    playbackVoteRequesterName,
    setStatusText,
    trackSessionKey,
  ]);

  useEffect(() => {
    if (
      !playbackExtensionVote ||
      (playbackExtensionVote.status !== "approved" &&
        playbackExtensionVote.status !== "rejected")
    ) {
      return;
    }
    const resolvedKey = `${trackSessionKey}:${playbackExtensionVote.startedAt}:${playbackExtensionVote.status}:${playbackVoteResolvedSeconds}`;
    if (lastPlaybackVoteResolvedKeyRef.current === resolvedKey) return;
    lastPlaybackVoteResolvedKeyRef.current = resolvedKey;
    if (
      playbackExtensionVote.status === "approved" &&
      playbackVoteResolvedSeconds > 0
    ) {
      setStatusText(`\u5ef6\u9577\u64ad\u653e\u6295\u7968\u901a\u904e\uff0c\u672c\u984c\u5df2\u5ef6\u9577 ${playbackVoteResolvedSeconds} \u79d2`);
      return;
    }
    setStatusText("\u5ef6\u9577\u64ad\u653e\u6295\u7968\u672a\u901a\u904e\uff0c\u672c\u984c\u7dad\u6301\u539f\u64ad\u653e\u9577\u5ea6");
  }, [
    isManualPlaybackExtensionMode,
    playbackExtensionVote,
    playbackVoteResolvedSeconds,
    setStatusText,
    trackSessionKey,
  ]);

  useEffect(() => {
    if (!isAutoPlaybackExtensionMode) {
      return;
    }
    if (gameState.phase !== "guess" || gameState.status !== "playing") {
      return;
    }
    if (playbackExtensionSeconds <= 0) {
      return;
    }
    const autoNoticeKey = `${trackSessionKey}:${playbackExtensionSeconds}`;
    if (lastAutoPlaybackExtensionNoticeRef.current === autoNoticeKey) {
      return;
    }
    lastAutoPlaybackExtensionNoticeRef.current = autoNoticeKey;
    setStatusText(
      `\u4ecd\u6709\u73a9\u5bb6\u672a\u4f5c\u7b54\uff0c\u7cfb\u7d71\u5df2\u81ea\u52d5\u5ef6\u9577 ${playbackExtensionSeconds} \u79d2`,
    );
  }, [
    gameState.phase,
    gameState.status,
    isAutoPlaybackExtensionMode,
    playbackExtensionSeconds,
    setStatusText,
    trackSessionKey,
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
    ? "\u5df2\u7d50\u675f"
    : gameState.phase === "guess" && !allAnsweredReadyForReveal
      ? "\u731c\u6b4c\u4e2d"
      : "\u516c\u5e03\u7b54\u6848";

  const activePhaseDurationMs =
    gameState.phase === "guess"
      ? effectiveGuessDurationMs
      : gameState.revealDurationMs;
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

  const handleRequestPlaybackVote = useCallback(async () => {
    if (canOpenPlaybackVotePrompt) {
      setPlaybackVoteDialogOpen(true);
      return;
    }
    if (!canRequestPlaybackExtensionVote || !onRequestPlaybackExtensionVote) return;
    setPlaybackVoteRequestPending(true);
    try {
      await onRequestPlaybackExtensionVote();
    } finally {
      setPlaybackVoteRequestPending(false);
    }
  }, [
    canOpenPlaybackVotePrompt,
    canRequestPlaybackExtensionVote,
    onRequestPlaybackExtensionVote,
  ]);

  const handleCastPlaybackVote = useCallback(
    async (vote: "approve" | "reject") => {
      if (!canOpenPlaybackVotePrompt || !onCastPlaybackExtensionVote) return;
      setPlaybackVoteSubmitPending(vote);
      try {
        const ok = await onCastPlaybackExtensionVote(vote);
        if (ok) {
          setPlaybackVoteDialogOpen(false);
        }
      } finally {
        setPlaybackVoteSubmitPending(null);
      }
    },
    [canOpenPlaybackVotePrompt, onCastPlaybackExtensionVote],
  );

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

  const recentMessages = useMemo(() => messages.slice(-80), [messages]);
  const isUnreadGameChatMessage = useCallback(
    (message: ChatMessage) =>
      !message.userId.startsWith("system:") && message.userId !== meClientId,
    [meClientId],
  );
  const unreadGameChatMessages = useMemo(
    () => messages.filter(isUnreadGameChatMessage),
    [isUnreadGameChatMessage, messages],
  );
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
  const handleShowVideoChange = useCallback((show: boolean) => {
    setShowVideoOverride(show);
  }, []);

  useEffect(() => {
    lastUnreadGameMessageIdRef.current = readRoomChatLastReadMessageId(room.id);
    mobileChatUnreadSeededRoomRef.current = null;
    setMobileChatUnread(0);
  }, [room.id]);

  useEffect(() => {
    const targets = [desktopChatScrollRef.current, mobileChatScrollRef.current];
    targets.forEach((container) => {
      if (!container) return;
      container.scrollTop = container.scrollHeight;
    });
  }, [messages.length, mobileChatOpen]);

  useEffect(() => {
    const roomId = room.id;
    const latestUnreadMessageId =
      unreadGameChatMessages[unreadGameChatMessages.length - 1]?.id ?? null;

    if (!isMobileGameViewport || mobileChatOpen) {
      markGameChatRead(latestUnreadMessageId);
      return;
    }

    const lastSeenMessageId =
      lastUnreadGameMessageIdRef.current ?? readRoomChatLastReadMessageId(roomId);

    if (mobileChatUnreadSeededRoomRef.current !== roomId) {
      setMobileChatUnread(
        lastSeenMessageId
          ? Math.max(
            0,
            unreadGameChatMessages.length -
            (unreadGameChatMessages.findIndex(
              (message) => message.id === lastSeenMessageId,
            ) + 1),
          )
          : unreadGameChatMessages.length,
      );
      mobileChatUnreadSeededRoomRef.current = roomId;
      return;
    }

    if (!latestUnreadMessageId) {
      setMobileChatUnread(0);
      lastUnreadGameMessageIdRef.current = null;
      writeRoomChatLastReadMessageId(roomId, null);
      return;
    }

    const lastSeenIndex =
      lastSeenMessageId === null
        ? -1
        : unreadGameChatMessages.findIndex(
          (message) => message.id === lastSeenMessageId,
        );

    if (lastSeenIndex < 0) {
      setMobileChatUnread(unreadGameChatMessages.length);
    } else {
      setMobileChatUnread(
        Math.max(0, unreadGameChatMessages.length - (lastSeenIndex + 1)),
      );
    }
  }, [
    isMobileGameViewport,
    markGameChatRead,
    mobileChatOpen,
    room.id,
    unreadGameChatMessages,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      GAME_ROOM_CHAT_ALERTS_STORAGE_KEY,
      mobileChatAlertsEnabled ? "1" : "0",
    );
  }, [mobileChatAlertsEnabled]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      GAME_ROOM_GUESS_ANCHOR_STORAGE_KEY,
      mobileGuessAnchorEnabled ? "1" : "0",
    );
  }, [mobileGuessAnchorEnabled]);

  useEffect(() => {
    if (!isMobileGameViewport) {
      const clearId = window.setTimeout(() => {
        setMobileBottomPanel(null);
        setMobileScoreboardSwapArmed(false);
        markGameChatRead(
          unreadGameChatMessages[unreadGameChatMessages.length - 1]?.id ?? null,
        );
      }, 0);
      return () => {
        window.clearTimeout(clearId);
      };
    }
  }, [isMobileGameViewport, markGameChatRead, unreadGameChatMessages]);

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
            setMobileBottomPanel("scoreboard");
          }
          if (shouldCloseRevealOverlay) {
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
  const playbackVoteButton =
    gameState.status === "playing" && isManualPlaybackExtensionMode ? (
      <Button
        type="button"
        variant={canOpenPlaybackVotePrompt ? "contained" : "outlined"}
        color={canOpenPlaybackVotePrompt ? "warning" : "info"}
        size="small"
        startIcon={<HowToVoteRoundedIcon />}
        className={`game-room-extend-vote-btn max-[760px]:!w-full max-[760px]:!px-2 max-[760px]:!py-1 max-[760px]:!text-xs ${playbackExtensionVote?.status === "active"
          ? "game-room-extend-vote-btn--active"
          : playbackExtensionVote?.status === "approved"
            ? "game-room-extend-vote-btn--approved"
            : playbackExtensionVote?.status === "rejected"
              ? "game-room-extend-vote-btn--rejected"
              : ""
          } ${canOpenPlaybackVotePrompt ? "game-room-extend-vote-btn--prompt" : ""}`}
        disabled={playbackVoteButtonDisabled}
        onClick={handleRequestPlaybackVote}
      >
        {playbackVoteButtonLabel}
      </Button>
    ) : null;
  const playbackHeaderActions =
    isHostInGame || playbackVoteButton ? (
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
            {"\u623f\u4e3b\u7ba1\u7406"}
          </Button>
        )}
        {playbackVoteButton}
      </Stack>
    ) : null;
  const hostManagementPanelContent = (
    <Stack spacing={1.1} className="game-room-host-manage-list">
      {hostManageParticipants.length === 0 ? (
        <Typography variant="body2" className="text-slate-300">
          {"\u76ee\u524d\u6c92\u6709\u53ef\u7ba1\u7406\u7684\u73a9\u5bb6\u3002"}
        </Typography>
      ) : (
        hostManageParticipants.map((participant, index) => {
          const participantPingText =
            typeof participant.pingMs === "number"
              ? `${Math.max(0, Math.round(participant.pingMs))} ms`
              : participant.isOnline
                ? "\u5728\u7dda"
                : "\u96e2\u7dda";
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
                    {normalizeRoomDisplayText(
                      participant.username,
                      `玩家 ${index + 1}`,
                    )}
                  </Typography>
                  <Typography variant="caption" className="text-slate-400">
                    {`\u5206\u6578 ${participant.score.toLocaleString()} \u00b7 ${participantPingText}`}
                  </Typography>
                </div>
                <Chip
                  size="small"
                  label={participant.isOnline ? "\u5728\u7dda" : "\u96e2\u7dda"}
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
                  {"\u8f49\u79fb\u623f\u4e3b"}
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="warning"
                  startIcon={<PersonRemoveRoundedIcon />}
                  onClick={() => requestHostManagementAction("kick", participant)}
                >
                  {"\u53ea\u8e22\u51fa"}
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  color="error"
                  startIcon={<BlockRoundedIcon />}
                  onClick={() => requestHostManagementAction("ban", participant)}
                >
                  {"\u8e22\u51fa\u5c01\u9396"}
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
      <div className="game-room-grid grid w-full grid-cols-1 gap-3 pb-20 lg:grid-cols-[minmax(320px,360px)_minmax(0,1fr)] lg:pb-0 xl:grid-cols-[minmax(360px,400px)_minmax(0,1fr)] 2xl:grid-cols-[minmax(400px,440px)_minmax(0,1fr)] lg:h-[calc(100vh-140px)] lg:items-stretch">
        <div className="hidden lg:block lg:h-full">
          <GameRoomLeftSidebar
            scoreboardRows={scoreboardRows}
            answeredClientIdSet={answeredClientIdSet}
            answeredRankByClientId={answeredRankByClientId}
            scorePartsByClientId={scorePartsByClientId}
            isReveal={isReveal}
            meClientId={meClientId}
            topTwoSwapState={topTwoSwapState}
            danmuEnabled={danmuEnabled}
            onDanmuEnabledChange={setDanmuEnabled}
            recentMessages={recentMessages}
            messageInput={messageInput}
            onMessageChange={onMessageChange}
            onSendMessage={onSendMessage}
            chatScrollRef={desktopChatScrollRef}
          />
        </div>
        {/* ????????????????????????? + ?????? */}
        <section className="game-room-main-section flex min-h-0 flex-col gap-2 lg:h-full lg:overflow-hidden">
          {isMobileGameViewport ? (
            <GameRoomPlaybackPanel
              rootRef={mobilePlaybackPanelRef}
              isMobileView
              isCompactMobile
              isRevealPhase={isReveal}
              revealAnswerTitle={resolvedAnswerTitle}
              roomName={resolvedRoomName}
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
              reduceGuessVideoDisplayCost={reduceGuessVideoDisplayCost}
              showVideo={showVideo}
              onShowVideoChange={handleShowVideoChange}
              gameVolume={gameVolume}
              onGameVolumeChange={setGameVolume}
            />
          ) : (
            <GameRoomPlaybackPanel
              isRevealPhase={isReveal}
              revealAnswerTitle={resolvedAnswerTitle}
              roomName={resolvedRoomName}
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
              reduceGuessVideoDisplayCost={reduceGuessVideoDisplayCost}
              showVideo={showVideo}
              onShowVideoChange={handleShowVideoChange}
              gameVolume={gameVolume}
              onGameVolumeChange={setGameVolume}
            />
          )}
          <GameRoomAnswerPanel
            isMobileView={isMobileGameViewport}
            answerPanelRef={answerPanelRef}
            isInitialCountdown={isInitialCountdown}
            countdownTone={countdownTone}
            isReveal={isReveal}
            revealTone={revealTone}
            isInterTrackWait={isInterTrackWait}
            phaseLabel={phaseLabel}
            activePhaseDurationMs={activePhaseDurationMs}
            phaseEndsAt={phaseEndsAt}
            gamePhase={gameState.phase}
            startedAt={gameState.startedAt}
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
            revealEndsAt={gameState.revealEndsAt}
            resolvedAnswerTitle={resolvedAnswerTitle}
            onOpenExitConfirm={openExitConfirm}
            isPendingFeedbackCard={isPendingFeedbackCard}
            allAnsweredReadyForReveal={allAnsweredReadyForReveal}
            isRevealPendingServerSync={isRevealPendingServerSync}
            isRevealPendingOptimisticSync={isRevealPendingOptimisticSync}
            revealChoicePickMap={revealChoicePickMap}
            serverOffsetMs={serverOffsetMs}
          />
          {isMobileGameViewport && (
            <div
              className={`game-room-mobile-action-dock lg:hidden ${mobileAutoOverlayTransition !== "idle"
                ? `game-room-mobile-action-dock--${mobileAutoOverlayTransition}`
                : ""
                }`}
            >
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
                className={`game-room-mobile-action-btn game-room-mobile-action-btn--icon ${mobileChatOpen ? "game-room-mobile-action-btn--active" : ""
                  } ${mobileChatUnread > 0 ? "game-room-mobile-action-btn--unread" : ""
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
                className={`game-room-mobile-action-subdock col-span-2 ${mobileSubdockActionCount <= 1
                  ? "game-room-mobile-action-subdock--compact"
                  : ""
                  }`}
              >
                {isHostInGame && (
                  <button
                    type="button"
                    className={`game-room-mobile-toggle-chip game-room-mobile-toggle-chip--compact game-room-mobile-toggle-chip--primary game-room-mobile-toggle-chip--host ${hostManagementOpen ? "game-room-mobile-toggle-chip--active" : ""
                      }`}
                    onClick={handleOpenHostManagement}
                  >
                    <span className="game-room-mobile-action-icon" aria-hidden>
                      <ManageAccountsRoundedIcon fontSize="inherit" />
                    </span>
                    <span>{"\u623f\u4e3b\u7ba1\u7406"}</span>
                    <span className="game-room-mobile-action-meta">
                      {`${hostManageParticipants.length} \u4eba`}
                    </span>
                  </button>
                )}
                {gameState.status === "playing" && isManualPlaybackExtensionMode && (
                  <button
                    type="button"
                    className={`game-room-mobile-toggle-chip game-room-mobile-toggle-chip--compact game-room-mobile-toggle-chip--primary game-room-mobile-toggle-chip--vote ${playbackExtensionVote?.status === "active" || canOpenPlaybackVotePrompt
                      ? "game-room-mobile-toggle-chip--active"
                      : ""
                      } ${canOpenPlaybackVotePrompt ? "game-room-mobile-toggle-chip--vote-prompt" : ""
                      }`}
                    onClick={handleRequestPlaybackVote}
                    disabled={playbackVoteButtonDisabled}
                  >
                    <span className="game-room-mobile-action-icon" aria-hidden>
                      <HowToVoteRoundedIcon fontSize="inherit" />
                    </span>
                    <span>{playbackVoteButtonLabel}</span>
                    <span className="game-room-mobile-action-meta">
                      {playbackExtensionVote?.status === "active"
                        ? `\u5269 ${playbackVoteRemainingSeconds} \u79d2`
                        : playbackExtensionVote?.status === "approved" &&
                          playbackVoteResolvedSeconds > 0
                          ? `+${playbackVoteResolvedSeconds} \u79d2`
                          : "\u7b49\u5f85\u7d50\u679c"}
                    </span>
                  </button>
                )}
                <button
                  type="button"
                  className={`game-room-mobile-toggle-chip game-room-mobile-toggle-chip--minor game-room-mobile-toggle-chip--anchor ${mobileGuessAnchorEnabled
                    ? "game-room-mobile-toggle-chip--active"
                    : ""
                    }`}
                  onClick={() =>
                    setMobileGuessAnchorEnabled((current) => !current)
                  }
                  aria-pressed={mobileGuessAnchorEnabled}
                >
                  <span className="game-room-mobile-action-icon" aria-hidden>
                    <MyLocationRoundedIcon fontSize="inherit" />
                  </span>
                  <span>{"猜歌時自動對齊"}</span>
                  <span className="game-room-mobile-action-meta">
                    {mobileGuessAnchorEnabled ? "ON" : "OFF"}
                  </span>
                </button>
                <button
                  type="button"
                  className={`game-room-mobile-toggle-chip game-room-mobile-toggle-chip--minor game-room-mobile-toggle-chip--overlay ${mobileRevealAutoOverlayEnabled
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
                  <span>{"\u81ea\u52d5\u5f48\u51fa\u5206\u6578\u699c"}</span>
                  <span className="game-room-mobile-action-meta">
                    {mobileRevealAutoOverlayEnabled ? "ON" : "OFF"}
                  </span>
                </button>
              </div>
              <button
                type="button"
                className="game-room-mobile-toggle-chip game-room-mobile-toggle-chip--leave col-span-2"
                onClick={openExitConfirm}
              >
                <span className="game-room-mobile-action-icon" aria-hidden>
                  <LogoutRoundedIcon fontSize="inherit" />
                </span>
                <span>離開房間</span>
                <span className="game-room-mobile-action-meta">返回大廳</span>
              </button>
            </div>
          )}
        </section>
        {isMobileGameViewport && (
          <>
            {mobileBottomPanel !== null && isMobileDrawerGestureActive && (
              <div
                className="game-room-mobile-overlay-blocker"
                aria-hidden="true"
              />
            )}
            <SwipeableDrawer
              className={`game-room-mobile-drawer-root game-room-mobile-drawer-root--scoreboard lg:!hidden ${mobileAutoOverlayTransition !== "idle"
                ? `game-room-mobile-drawer-root--${mobileAutoOverlayTransition}`
                : ""
                }`}
              anchor="bottom"
              open={mobileScoreboardOpen}
              onOpen={handleOpenMobileScoreboard}
              onClose={handleCloseMobileScoreboard}
              disableSwipeToOpen
              disableDiscovery
              allowSwipeInChildren
              swipeAreaWidth={0}
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
                className: `game-room-mobile-scoreboard-drawer game-room-mobile-scoreboard-drawer--single ${
                  mobileScoreboardOpen
                    ? "game-room-mobile-scoreboard-drawer--open"
                    : "game-room-mobile-scoreboard-drawer--closed"
                }`,
                style: {
                  ...mobileScoreboardDragDismiss.paperStyle,
                  pointerEvents: mobileScoreboardOpen ? "auto" : "none",
                  visibility: mobileScoreboardOpen ? "visible" : "hidden",
                },
              }}
            >
              <div
                className="game-room-mobile-drawer-head game-room-mobile-drawer-head--scoreboard"
                role="presentation"
                aria-label="Drag down to collapse scoreboard"
              >
                <div
                  className={`game-room-mobile-drawer-handle-wrap game-room-mobile-drawer-handle-wrap--draggable game-room-mobile-drawer-handle-wrap--${mobileScoreboardDismissState}`}
                  aria-hidden="true"
                  {...mobileScoreboardDragDismiss.dragHandleProps}
                >
                  <span className="game-room-mobile-drawer-handle-bar" />
                </div>
                <div className="game-room-mobile-scoreboard-headline">
                  <div className="game-room-mobile-scoreboard-title-group">
                    <span className="game-room-mobile-scoreboard-title">排行榜</span>
                  </div>
                  <div className="game-room-mobile-scoreboard-actions">
                    <span className="game-room-mobile-scoreboard-answered-pill">
                      已答 {answeredCount}/{participants.length || 0}
                    </span>
                    <button
                      type="button"
                      className="game-room-mobile-drawer-close game-room-mobile-drawer-close--scoreboard-inline"
                      onClick={handleCloseMobileScoreboard}
                      aria-label="收合分數榜"
                    >
                      收合
                    </button>
                  </div>
                </div>
              </div>
              <div className="relative min-h-0 flex-1 overflow-hidden p-2">
                <GameRoomLeftSidebar
                  scoreboardRows={mobileScoreboardRows}
                  answeredClientIdSet={answeredClientIdSet}
                  answeredRankByClientId={answeredRankByClientId}
                  scorePartsByClientId={scorePartsByClientId}
                  isReveal={isReveal}
                  meClientId={meClientId}
                  topTwoSwapState={topTwoSwapState}
                  danmuEnabled={danmuEnabled}
                  onDanmuEnabledChange={setDanmuEnabled}
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
              showFab={
                isMobileGameViewport &&
                mobileChatAlertsEnabled &&
                !mobileChatOpen &&
                mobileChatUnread > 0
              }
              chatAlertsEnabled={mobileChatAlertsEnabled}
              onChatAlertsEnabledChange={setMobileChatAlertsEnabled}
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
              recentMessages={recentMessages}
              messageInput={messageInput}
              onMessageChange={onMessageChange}
              onSendMessage={onSendMessage}
              chatScrollRef={mobileChatScrollRef}
            />
          </>
        )}
        <Dialog
          open={playbackVoteDialogOpen && canOpenPlaybackVotePrompt}
          onClose={() => {
            if (playbackVoteSubmitPending !== null) return;
            setPlaybackVoteDialogOpen(false);
          }}
          maxWidth="xs"
          fullWidth
          PaperProps={{
            className: "game-room-playback-vote-dialog",
          }}
        >
          <DialogTitle>延長播放投票</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={1.2}>
              <Typography variant="body2" className="text-slate-200">
                {playbackVoteRequesterName}{" "}
                {`\u63d0\u8b70\u5c07\u672c\u984c\u591a\u64ad\u653e ${playbackVoteProposalSeconds} \u79d2\uff0c\u8acb\u5728\u6642\u9650\u5167\u8868\u614b\u3002`}
              </Typography>
              <div className="game-room-playback-vote-dialog__stats">
                <span>{`\u540c\u610f ${playbackVoteApproveCount}/${playbackVoteMajorityCount}`}</span>
                <span>{`\u4e0d\u540c\u610f ${playbackVoteRejectCount}`}</span>
                <span>{`\u5269 ${playbackVoteRemainingSeconds} \u79d2`}</span>
              </div>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => handleCastPlaybackVote("reject")}
              variant="outlined"
              color="inherit"
              disabled={playbackVoteSubmitPending !== null}
            >
              {playbackVoteSubmitPending === "reject"
                ? "\u9001\u51fa\u4e2d..."
                : "\u7dad\u6301\u539f\u64ad\u653e\u9577\u5ea6"}
            </Button>
            <Button
              onClick={() => handleCastPlaybackVote("approve")}
              variant="contained"
              color="warning"
              disabled={playbackVoteSubmitPending !== null}
            >
              {playbackVoteSubmitPending === "approve"
                ? "\u9001\u51fa\u4e2d..."
                : `\u5ef6\u9577 ${playbackVoteProposalSeconds} \u79d2`}
            </Button>
          </DialogActions>
        </Dialog>
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
            <DialogTitle>房主管理</DialogTitle>
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
              style: mobileHostManageDragDismiss.paperStyle,
            }}
          >
            <div
              className="game-room-mobile-host-manage-head"
              role="presentation"
              aria-label="Drag down to collapse host management"
              {...mobileHostManageDragDismiss.dragHandleProps}
            >
              <div
                className={`game-room-mobile-drawer-handle-wrap game-room-mobile-drawer-handle-wrap--draggable game-room-mobile-drawer-handle-wrap--${mobileHostManageDismissState}`}
                aria-hidden="true"
              >
                <span className="game-room-mobile-drawer-handle-bar" />
              </div>
              <Typography variant="subtitle2">{"\u623f\u4e3b\u7ba1\u7406"}</Typography>
              <Typography variant="caption" className="text-slate-400">
                {`\u53ef\u7ba1\u7406 ${hostManageParticipants.length} \u4f4d\u73a9\u5bb6`}
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
                {"\u95dc\u9589"}
              </Button>
            </div>
          </SwipeableDrawer>
        )}
        <ConfirmDialog
          open={isHostInGame && Boolean(hostManagementConfirm)}
          title={hostManagementConfirmText?.title ?? ""}
          description={hostManagementConfirmText?.description ?? ""}
          confirmLabel={hostManagementConfirmText?.confirmLabel ?? "\u78ba\u8a8d"}
          cancelLabel="\u53d6\u6d88"
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

