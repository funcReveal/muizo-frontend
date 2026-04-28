import React, {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ComponentProps,
} from "react";
import {
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  Stack,
  Typography,
} from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";
import LeaderboardRoundedIcon from "@mui/icons-material/LeaderboardRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import MyLocationRoundedIcon from "@mui/icons-material/MyLocationRounded";
import ManageAccountsRoundedIcon from "@mui/icons-material/ManageAccountsRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import SwapHorizRoundedIcon from "@mui/icons-material/SwapHorizRounded";
import PersonRemoveRoundedIcon from "@mui/icons-material/PersonRemoveRounded";
import BlockRoundedIcon from "@mui/icons-material/BlockRounded";
import HowToVoteRoundedIcon from "@mui/icons-material/HowToVoteRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import type {
  GameState,
  PlaylistItem,
  RestartGameVoteAction,
  RestartGameVoteState,
  RoomState,
  SubmitAnswerResult,
} from "@features/RoomSession";
import {
  getStoredShowVideoPreference,
  setStoredShowVideoPreference,
} from "@features/RoomSession";
import { normalizeRoomDisplayText } from "../../../shared/utils/text";
import { blurActiveInteractiveElement } from "../../../shared/utils/dom";
import { useGameRoomSfxEffects } from "../model/useGameRoomSfxEffects";
import { useGameRoomVoteDialogEffects } from "../model/useGameRoomVoteDialogEffects";
import { useKeyBindings } from "../../Setting/ui/components/useKeyBindings";
import { useSfxSettings } from "../../Setting/ui/components/useSfxSettings";
import {
  DEFAULT_AVATAR_EFFECT_LEVEL_VALUE,
  useSettingsModel,
} from "../../Setting/model/settingsContext";
import type { AvatarEffectLevel } from "../../../shared/ui/playerAvatar/playerAvatarTheme";
import { useGameSfx } from "../model/useGameSfx";
import GameRoomAnswerPanel from "./components/GameRoomAnswerPanel";
import GameRoomLeftSidebar from "./components/GameRoomLeftSidebar";
import GameRoomPlaybackPanel from "./components/GameRoomPlaybackPanel";
import {
  AudioGestureOverlayPortal,
  StartBroadcastOverlayPortal,
} from "./components/GameRoomPortalOverlays";
import { isMobileDevice, SILENT_AUDIO_SRC } from "../model/gameRoomUtils";
import {
  buildScoreboardRows,
  sortParticipantsByScore,
} from "../model/gameRoomDerivations";
import GameRoomExitDialog from "./components/GameRoomExitDialog";
import useGameRoomPlayerSync from "../model/useGameRoomPlayerSync";
import useGameRoomAnswerFlow from "../model/useGameRoomAnswerFlow";
import useGameRoomQuestionDerivedState from "../model/useGameRoomQuestionDerivedState";
import useGameRoomRecaps from "../model/useGameRoomRecaps";
import useGameRoomStats from "../model/useGameRoomStats";
import useTopTwoSwapState from "../model/useTopTwoSwapState";
import PlayerAvatar from "../../../shared/ui/playerAvatar/PlayerAvatar";
import useGameRoomChoiceHotkeys from "./lib/useGameRoomChoiceHotkeys";
import useGameRoomAnswerPanelAutoScroll from "./lib/useGameRoomAnswerPanelAutoScroll";
import useMobileDrawerDragDismiss from "@shared/hooks/useMobileDrawerDragDismiss";
import { appToast } from "@shared/ui/toastApi";
import type { SettlementQuestionRecap } from "../../Settlement/model/types";
import ConfirmDialog from "../../../shared/ui/ConfirmDialog";
import { useGameRoomPlaybackState } from "../model/useGameRoomPlaybackState";
import { useGameRoomVoteState } from "../model/useGameRoomVoteState";
import FloatingChatWindow from "@features/RoomChat";
import GameRoomDanmuProviderBridge from "./components/GameRoomDanmuProviderBridge";
interface GameRoomPageProps {
  room: RoomState["room"];
  gameState: GameState;
  playlist: PlaylistItem[];
  onExitGame: () => void;
  onBackToLobby?: () => void;
  onSubmitChoice: (choiceIndex: number) => Promise<SubmitAnswerResult>;
  onRequestPlaybackExtensionVote?: (remainingMs?: number) => Promise<boolean>;
  onCastPlaybackExtensionVote?: (
    vote: "approve" | "reject",
  ) => Promise<boolean>;
  onKickPlayer?: (clientId: string, durationMs?: number | null) => void;
  onTransferHost?: (clientId: string) => void;
  onRequestRestartGameVote?: (
    action: RestartGameVoteAction,
  ) => Promise<boolean>;
  onCastRestartGameVote?: (vote: "approve" | "reject") => Promise<boolean>;
  participants?: RoomState["participants"];
  meClientId?: string;
  username?: string | null;
  serverOffsetMs?: number;
  onRestartGame?: () => void;
  onSettlementRecapChange?: (recaps: SettlementQuestionRecap[]) => void;
  /** True while socket is disconnected and a resumeSession is in-flight.
   *  GameRoomPage keeps the frozen game UI visible but overlays it with a
   *  recovery indicator so players don't see a stuck 0-second countdown. */
  isRecoveringConnection?: boolean;
  /** Human-readable text describing the current recovery stage. */
  recoveryStatusText?: string | null;
}

type MobileBottomPanel = "scoreboard" | null;
type HostManagementActionType = "transfer" | "kick" | "ban";
type HostManagementAction = {
  type: HostManagementActionType;
  targetClientId: string;
  targetName: string;
  targetOnline: boolean;
};

const MOBILE_SCOREBOARD_MIN_HEIGHT_VH = 34;
const MOBILE_SCOREBOARD_MAX_HEIGHT_VH = 72;
const MOBILE_SCOREBOARD_DEFAULT_HEIGHT_VH = 60;

const GAME_ROOM_GUESS_ANCHOR_STORAGE_KEY = "game_room_guess_anchor_enabled";
const GAME_ROOM_REVEAL_AUTO_OVERLAY_STORAGE_KEY =
  "game_room_reveal_auto_overlay_enabled";

const MOBILE_SPLIT_STACK_MAX_TOTAL_VH = 100;
const MOBILE_SCOREBOARD_PARTICLE_COUNT_CAP = 4;

const PLAYBACK_VOTE_DIALOG_PAPER_PROPS = {
  className: "game-room-playback-vote-dialog",
} as const;
const RESTART_VOTE_DIALOG_PAPER_PROPS = {
  className: "game-room-restart-vote-dialog",
} as const;
const HOST_MANAGE_DIALOG_PAPER_PROPS = {
  className: "game-room-host-manage-dialog",
} as const;
type MuiDrawerPaperProps = NonNullable<
  ComponentProps<typeof Drawer>["PaperProps"]
>;

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

const readInitialGameRoomGuessAnchorEnabled = () => {
  if (typeof window === "undefined") return false;
  return (
    window.localStorage.getItem(GAME_ROOM_GUESS_ANCHOR_STORAGE_KEY) === "1"
  );
};

const readInitialGameRoomRevealAutoOverlayEnabled = () => {
  if (typeof window === "undefined") return true;
  return (
    window.localStorage.getItem(GAME_ROOM_REVEAL_AUTO_OVERLAY_STORAGE_KEY) !==
    "0"
  );
};

const GAME_ROOM_HOST_DRAWER_MODAL_PROPS = {
  hideBackdrop: true,
  keepMounted: true,
  disableAutoFocus: true,
  disableEnforceFocus: true,
  disableRestoreFocus: true,
  disableScrollLock: true,
} as const;

const GAME_ROOM_SCOREBOARD_DRAWER_MODAL_PROPS = {
  hideBackdrop: true,
  keepMounted: false,
  disableAutoFocus: true,
  disableEnforceFocus: true,
  disableRestoreFocus: true,
  disableScrollLock: true,
} as const;

const useGameRoomGuessUrgencyFlag = ({
  getServerNowMs,
  phase,
  phaseEndsAt,
  isEnded,
  waitingToStart,
  allAnsweredReadyForReveal,
  trackSessionKey,
}: {
  getServerNowMs: () => number;
  phase: GameState["phase"];
  phaseEndsAt: number;
  isEnded: boolean;
  waitingToStart: boolean;
  allAnsweredReadyForReveal: boolean;
  trackSessionKey: string;
}) => {
  const [, forceUrgencyTick] = useState(0);

  const nowMs = getServerNowMs();
  const remainingMs = phaseEndsAt - nowMs;

  const isUrgent =
    !isEnded &&
    !waitingToStart &&
    phase === "guess" &&
    !allAnsweredReadyForReveal &&
    remainingMs > 0 &&
    remainingMs <= 3000;

  useEffect(() => {
    if (
      isEnded ||
      waitingToStart ||
      phase !== "guess" ||
      allAnsweredReadyForReveal
    ) {
      return;
    }

    const currentNowMs = getServerNowMs();
    const currentRemainingMs = phaseEndsAt - currentNowMs;
    if (currentRemainingMs <= 0) return;

    const timerIds: number[] = [];

    if (currentRemainingMs > 3000) {
      timerIds.push(
        window.setTimeout(() => {
          forceUrgencyTick((value) => value + 1);
        }, currentRemainingMs - 3000),
      );
    }

    timerIds.push(
      window.setTimeout(() => {
        forceUrgencyTick((value) => value + 1);
      }, currentRemainingMs),
    );

    return () => {
      timerIds.forEach((timerId) => window.clearTimeout(timerId));
    };
  }, [
    allAnsweredReadyForReveal,
    getServerNowMs,
    isEnded,
    phase,
    phaseEndsAt,
    trackSessionKey,
    waitingToStart,
  ]);

  return isUrgent;
};

const useGameRoomUiClock = ({
  getServerNowMs,
  startedAt,
}: {
  getServerNowMs: () => number;
  startedAt: number;
}) => {
  const [nowMs, setNowMs] = useState(getServerNowMs);
  const renderNowMs = Math.max(nowMs, getServerNowMs());

  useEffect(() => {
    const currentNowMs = renderNowMs;
    let timerId: number | null = null;

    const scheduleTick = (delayMs: number) => {
      timerId = window.setTimeout(
        () => {
          startTransition(() => {
            setNowMs(getServerNowMs());
          });
        },
        Math.max(40, delayMs),
      );
    };

    if (currentNowMs < startedAt) {
      const remainingMs = startedAt - currentNowMs;
      const nextDelay =
        remainingMs > 1000 ? remainingMs % 1000 || 1000 : remainingMs;

      scheduleTick(nextDelay);
    }

    return () => {
      if (timerId !== null) {
        window.clearTimeout(timerId);
      }
    };
  }, [getServerNowMs, renderNowMs, startedAt]);

  return renderNowMs;
};

const GameRoomPage: React.FC<GameRoomPageProps> = ({
  room,
  gameState,
  playlist,
  onExitGame,
  onSubmitChoice,
  onRequestPlaybackExtensionVote,
  onCastPlaybackExtensionVote,
  onKickPlayer,
  onTransferHost,
  onRequestRestartGameVote,
  onCastRestartGameVote,
  participants = [],
  meClientId,
  serverOffsetMs = 0,
  onSettlementRecapChange,
  isRecoveringConnection = false,
  recoveryStatusText = null,
}) => {
  const { gameVolume, setGameVolume, sfxEnabled, sfxVolume, sfxPreset } =
    useSfxSettings();
  const {
    avatarEffectLevel = DEFAULT_AVATAR_EFFECT_LEVEL_VALUE,
    scoreboardBorderEnabled,
    scoreboardBorderMaskEnabled,
    scoreboardBorderAnimation,
    scoreboardBorderLineStyle,
    scoreboardBorderTheme,
    scoreboardBorderParticleCount,
  } = useSettingsModel();
  const isLeaderboardRoom = Boolean(room.gameSettings?.leaderboardProfileKey);
  const requiresAudioGesture = useMemo(() => {
    if (typeof window === "undefined") return false;
    return isMobileDevice();
  }, []);
  const [showVideoOverride, setShowVideoOverride] = useState<boolean | null>(
    () => getStoredShowVideoPreference(),
  );
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  const isMobileGameViewport = useMediaQuery("(max-width: 1023.95px)");
  const [mobileBottomPanel, setMobileBottomPanel] =
    useState<MobileBottomPanel>(null);
  const [mobileScoreboardHeight, setMobileScoreboardHeight] = useState(
    MOBILE_SCOREBOARD_DEFAULT_HEIGHT_VH,
  );
  const mobileScoreboardHeightRafRef = useRef<number | null>(null);
  const mobileScoreboardHeightPendingRef = useRef<number>(
    MOBILE_SCOREBOARD_DEFAULT_HEIGHT_VH,
  );
  const [mobileScoreboardSwapReplayToken, setMobileScoreboardSwapReplayToken] =
    useState(0);
  const [mobileScoreboardSwapArmed, setMobileScoreboardSwapArmed] =
    useState(false);
  const [mobileRevealAutoOverlayEnabled, setMobileRevealAutoOverlayEnabled] =
    useState(readInitialGameRoomRevealAutoOverlayEnabled);
  const [mobileAutoOverlayTransition, setMobileAutoOverlayTransition] =
    useState<"idle" | "opening" | "closing">("idle");
  const [mobileGuessAnchorEnabled, setMobileGuessAnchorEnabled] = useState(
    readInitialGameRoomGuessAnchorEnabled,
  );
  const [hostManagementOpen, setHostManagementOpen] = useState(false);
  const [hostManagementConfirm, setHostManagementConfirm] =
    useState<HostManagementAction | null>(null);
  const [playbackVoteDialogOpen, setPlaybackVoteDialogOpen] = useState(false);
  const [playbackVoteConfirmOpen, setPlaybackVoteConfirmOpen] = useState(false);
  const [playbackVoteRequestPending, setPlaybackVoteRequestPending] =
    useState(false);

  const [restartVoteDialogOpen, setRestartVoteDialogOpen] = useState(false);
  const [restartVoteConfirmOpen, setRestartVoteConfirmOpen] = useState(false);
  const [restartVoteRequestPending, setRestartVoteRequestPending] =
    useState(false);
  const [restartVoteSubmitPending, setRestartVoteSubmitPending] = useState<
    "approve" | "reject" | null
  >(null);
  const [pendingRestartVoteAction, setPendingRestartVoteAction] =
    useState<RestartGameVoteAction>("restart_now");
  const [playbackVoteSubmitPending, setPlaybackVoteSubmitPending] = useState<
    "approve" | "reject" | null
  >(null);
  const { keyBindings } = useKeyBindings();
  const legacyClipWarningShownRef = useRef(false);

  const previousPhaseRef = useRef<GameState["phase"]>(gameState.phase);
  const lastAutoOverlayTransitionAtRef = useRef(0);
  const mobileScoreboardAutoOpenedRef = useRef(false);

  const answerPanelRef = useRef<HTMLDivElement | null>(null);
  const mobilePlaybackPanelRef = useRef<HTMLDivElement | null>(null);
  const { primeSfxAudio, playGameSfx } = useGameSfx({
    enabled: sfxEnabled,
    volume: Math.round((sfxVolume * gameVolume) / 100),
    preset: sfxPreset,
  });
  const isHostInGame = useMemo(
    () => room.hostClientId === meClientId,
    [room.hostClientId, meClientId],
  );

  const onlineGameParticipantCount = useMemo(
    () => participants.filter((participant) => participant.isOnline).length,
    [participants],
  );

  const isSoloGameSession = onlineGameParticipantCount <= 1;

  const hostManageParticipants = useMemo(
    () =>
      sortParticipantsByScore(participants).filter(
        (participant) => participant.clientId !== meClientId,
      ),
    [meClientId, participants],
  );

  const openExitConfirm = useCallback(() => setExitConfirmOpen(true), []);
  const closeExitConfirm = useCallback(() => setExitConfirmOpen(false), []);
  const handleExitConfirm = useCallback(() => {
    setExitConfirmOpen(false);
    onExitGame();
  }, [onExitGame]);
  const getServerNowMs = useCallback(
    () => Date.now() + serverOffsetMs,
    [serverOffsetMs],
  );
  const mobileScoreboardOpen = mobileBottomPanel === "scoreboard";
  const mobileAvatarEffectLevel: AvatarEffectLevel = useMemo(() => {
    if (!isMobileGameViewport) return avatarEffectLevel;
    return avatarEffectLevel === "full" ? "simple" : avatarEffectLevel;
  }, [avatarEffectLevel, isMobileGameViewport]);
  const mobileScoreboardBorderParticleCount = useMemo(() => {
    if (!isMobileGameViewport) return scoreboardBorderParticleCount;
    return Math.min(
      scoreboardBorderParticleCount,
      MOBILE_SCOREBOARD_PARTICLE_COUNT_CAP,
    );
  }, [isMobileGameViewport, scoreboardBorderParticleCount]);
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
    mobileScoreboardHeightPendingRef.current = clampedNext;
    if (mobileScoreboardHeightRafRef.current !== null) return;
    mobileScoreboardHeightRafRef.current = window.requestAnimationFrame(() => {
      mobileScoreboardHeightRafRef.current = null;
      setMobileScoreboardHeight((prev) => {
        const next = mobileScoreboardHeightPendingRef.current;
        return Math.abs(prev - next) < 0.05 ? prev : next;
      });
    });
  }, []);
  useEffect(() => {
    return () => {
      if (mobileScoreboardHeightRafRef.current !== null) {
        window.cancelAnimationFrame(mobileScoreboardHeightRafRef.current);
        mobileScoreboardHeightRafRef.current = null;
      }
    };
  }, []);
  const handleToggleMobileScoreboard = useCallback(() => {
    mobileScoreboardAutoOpenedRef.current = false;
    setMobileScoreboardSwapArmed(false);
    setMobileBottomPanel((current) =>
      current === "scoreboard" ? null : "scoreboard",
    );
  }, []);
  const handleCloseMobileScoreboard = useCallback(() => {
    mobileScoreboardAutoOpenedRef.current = false;
    blurActiveInteractiveElement();
    setMobileScoreboardSwapArmed(false);
    setMobileBottomPanel((current) =>
      current === "scoreboard" ? null : current,
    );
  }, []);
  const handleToggleMobileRevealAutoOverlay = useCallback(
    () => setMobileRevealAutoOverlayEnabled((current) => !current),
    [],
  );
  const handleToggleMobileGuessAnchor = useCallback(
    () => setMobileGuessAnchorEnabled((current) => !current),
    [],
  );
  const handleOpenHostManagement = useCallback(() => {
    if (!isHostInGame) return;
    setHostManagementOpen(true);
  }, [isHostInGame]);
  const handleCloseHostManagement = useCallback(() => {
    blurActiveInteractiveElement();
    setHostManagementOpen(false);
  }, []);
  const mobileHostManageDragDismiss = useMobileDrawerDragDismiss({
    open: hostManagementOpen,
    direction: "down",
    onDismiss: handleCloseHostManagement,
    height: 58,
    minHeight: 48,
    maxHeight: 72,
    threshold: 54,
    thresholdBuffer: 22,
  });
  const mobileHostManageDismissState = mobileHostManageDragDismiss.canDismiss
    ? "ready"
    : mobileHostManageDragDismiss.isDismissArmed
      ? "armed"
      : "idle";
  const requestHostManagementAction = useCallback(
    (
      type: HostManagementActionType,
      participant: RoomState["participants"][number],
    ) => {
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
  const handleHostManagementClick = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>(
        "[data-hm-action]",
      );
      if (!btn) return;
      const action = btn.dataset.hmAction as
        | HostManagementActionType
        | undefined;
      const clientId = btn.dataset.hmClientId;
      if (!action || !clientId) return;
      const participant = hostManageParticipants.find(
        (p) => p.clientId === clientId,
      );
      if (participant) requestHostManagementAction(action, participant);
    },
    [hostManageParticipants, requestHostManagementAction],
  );
  const hostManagementConfirmText = useMemo(() => {
    if (!hostManagementConfirm) return null;
    const target = normalizeRoomDisplayText(
      hostManagementConfirm.targetName,
      "玩家",
    );
    if (hostManagementConfirm.type === "transfer") {
      return {
        title: `要將房主轉移給 ${target} 嗎？`,
        description:
          "轉移後你將失去房主管理權限，對方會立刻接手房間設定與玩家管理功能。",
        confirmLabel: "確認轉移房主",
      };
    }
    if (hostManagementConfirm.type === "ban") {
      return {
        title: `要將 ${target} 踢出 5 分鐘嗎？`,
        description:
          "這位玩家會立刻離開房間，並在一段時間內無法再次加入這個房間。",
        confirmLabel: "確認踢出 5 分鐘",
      };
    }
    return {
      title: `要將 ${target} 永久封鎖嗎？`,
      description: "這位玩家會立刻離開房間，並被永久封鎖無法再次加入這個房間。",
      confirmLabel: "確認永久封鎖",
    };
  }, [hostManagementConfirm]);
  const handleClosePlaybackVoteDialog = useCallback(() => {
    if (playbackVoteSubmitPending !== null) return;
    setPlaybackVoteDialogOpen(false);
  }, [playbackVoteSubmitPending]);
  const handleCancelHostManagementConfirm = useCallback(() => {
    setHostManagementConfirm(null);
  }, []);
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
  const {
    isManualPlaybackExtensionMode,
    isAutoPlaybackExtensionMode,
    playbackExtensionVote,
    playbackVoteApproveCount,
    playbackVoteRejectCount,
    playbackVoteMajorityCount,
    playbackExtensionSeconds,
    hasRequestedRejectedPlaybackExtensionVote,
    myPlaybackVote,
    playbackVoteRequesterName,
    playbackVoteProposalSeconds,
    playbackVoteResolvedSeconds,
    playbackVoteButtonLabel,
  } = useGameRoomVoteState({
    gameState,
    room,
    meClientId,
    playbackVoteRequestPending,
  });
  // Use the backend-authoritative vote directly — the backend now preserves
  // restartGameVote across question advances when the vote is still active.
  const restartGameVote: RestartGameVoteState | null = gameState.restartGameVote ?? null;
  const restartVoteApproveCount = restartGameVote?.approveClientIds.length ?? 0;
  const restartVoteRejectCount = restartGameVote?.rejectClientIds.length ?? 0;
  const restartVoteEligibleCount = restartGameVote?.eligibleClientIds.length ?? 0;
  const restartVoteMajorityCount =
    restartVoteEligibleCount > 0
      ? Math.floor(restartVoteEligibleCount / 2) + 1
      : 0;
  const myRestartVote = useMemo<"approve" | "reject" | null>(() => {
    if (!restartGameVote || !meClientId) return null;
    if (restartGameVote.approveClientIds.includes(meClientId)) return "approve";
    if (restartGameVote.rejectClientIds.includes(meClientId)) return "reject";
    return null;
  }, [meClientId, restartGameVote]);
  const isRestartVoteActive = restartGameVote?.status === "active";
  const canOpenRestartVoteDialog =
    isRestartVoteActive && myRestartVote === null && !!onCastRestartGameVote;
  const isRestartVoteEligible =
    restartVoteEligibleCount > 0 &&
    meClientId !== undefined &&
    (restartGameVote?.eligibleClientIds.includes(meClientId) ?? false);
  const showRestartVoteRedDot =
    isRestartVoteActive && myRestartVote === null && isRestartVoteEligible;
  const canRequestRestartVote =
    gameState.status === "playing" &&
    !isRestartVoteActive &&
    !!onRequestRestartGameVote &&
    !(gameState.restartVoteInitiatedClientIds ?? []).includes(meClientId ?? "");
  const hasRequestedRestartVote =
    !!meClientId &&
    (gameState.restartVoteInitiatedClientIds ?? []).includes(meClientId);
  const isRestartVoteRequestLocked =
    gameState.status === "playing" &&
    !isRestartVoteActive &&
    hasRequestedRestartVote;

  const isMyRestartVoteRejected =
    isLeaderboardRoom &&
    restartGameVote?.status === "rejected" &&
    restartGameVote.requestedByClientId === meClientId;

  const restartVoteButtonLabel = isMyRestartVoteRejected
    ? "重啟投票失敗"
    : isLeaderboardRoom && hasRequestedRestartVote
      ? "已發起重啟投票"
      : "重新開始";

  const restartVoteAction: RestartGameVoteAction =
    restartGameVote?.action === "return_to_lobby" ||
      restartGameVote?.action === "restart_now"
      ? restartGameVote.action
      : pendingRestartVoteAction;

  const restartVoteActionLabel =
    restartVoteAction === "return_to_lobby" ? "回到房間" : "重新開始";

  const restartVoteDialogTitle =
    restartVoteAction === "return_to_lobby"
      ? isSoloGameSession
        ? "要返回房間嗎？"
        : "要發起回到房間投票嗎？"
      : isSoloGameSession
        ? "要重新開始嗎？"
        : "要發起重新開始投票嗎？";

  const restartVoteDialogDescription =
    restartVoteAction === "return_to_lobby"
      ? isSoloGameSession
        ? "確認後會結束目前這一局，保留房間、歌單與設定，回到房間大廳。"
        : "投票通過後會結束目前這一局，保留房間、玩家、歌單與設定，回到房間大廳。"
      : isSoloGameSession
        ? "確認後會直接進入 5 秒倒數，並開始新一局。"
        : "投票通過後會直接進入 5 秒倒數，並開始新一局。";

  const restartVoteConfirmButtonLabel =
    restartVoteAction === "return_to_lobby"
      ? isSoloGameSession
        ? "確認返回房間"
        : "確認發起回到房間投票"
      : isSoloGameSession
        ? "確認重新開始"
        : "確認發起重新開始投票";

  const restartVoteButtonDisabled =
    restartVoteRequestPending ||
    restartVoteSubmitPending !== null ||
    (!canRequestRestartVote && !isRestartVoteActive);

  // Toast notifications for restart vote transitions.
  // The backend is now authoritative: it preserves restartGameVote across
  // question advances (active vote) and resets it on game restart.
  const prevRestartVoteStatusRef = useRef<RestartGameVoteState["status"] | null>(null);
  useEffect(() => {
    const currentVote = gameState.restartGameVote ?? null;
    const prevStatus = prevRestartVoteStatusRef.current;
    const nextStatus = currentVote?.status ?? null;

    if (prevStatus !== "active" && nextStatus === "active") {
      const isInitiator = currentVote?.requestedByClientId === meClientId;
      if (!isInitiator) {
        appToast.info(
          currentVote?.action === "return_to_lobby"
            ? "有人發起了回到房間投票"
            : "有人發起了重新開始投票",
          {
            id: "restart-vote-started",
            duration: 4000,
          },
        );
      }
    } else if (prevStatus === "active" && nextStatus === "rejected") {
      appToast.error(
        `${currentVote?.action === "return_to_lobby"
          ? "回到房間投票"
          : "重新開始投票"
        }未通過（${currentVote?.approveClientIds.length ?? 0} / ${currentVote?.eligibleClientIds.length ?? 0
        } 票贊成）`,
        { id: "restart-vote-rejected", duration: 5000 },
      );
    }
    // "approved" needs no toast — the game restart event is self-evident.

    prevRestartVoteStatusRef.current = nextStatus;
  }, [gameState.restartGameVote, meClientId]);

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
    threshold: 52,
    thresholdBuffer: 20,
  });
  const mobileScoreboardDismissState = mobileScoreboardDragDismiss.canDismiss
    ? "ready"
    : mobileScoreboardDragDismiss.isDismissArmed
      ? "armed"
      : "idle";
  const isMobileDrawerGestureActive = mobileScoreboardDragDismiss.isDragging;
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

  const {
    trackCursor,
    trackOrderLength,
    boundedCursor,
    currentTrackIndex,
    item,
    resolvedAnswerTitle,
    resolvedRoomName,
    effectiveGuessDurationMs,
    fallbackDurationSec,
    clipStartSec,
    clipEndSec,
    clipReplayStartSec,
    clipReplayEndSec,
    videoId,
    phaseEndsAt,
    isEnded,
    isReveal,
    showVideo,
    trackSessionKey,
    trackLoadKey,
  } = useGameRoomPlaybackState({
    gameState,
    playlist,
    room,
    showVideoOverride,
  });
  const isTimeAttackMode =
    typeof gameState.timeAttackTimeLimitMs === "number" &&
    Number.isFinite(gameState.timeAttackTimeLimitMs) &&
    gameState.timeAttackTimeLimitMs > 0;
  const timeAttackTimeLimitMs = isTimeAttackMode
    ? gameState.timeAttackTimeLimitMs ?? null
    : null;
  const timeAttackRemainingMs = isTimeAttackMode
    ? gameState.timeAttackRemainingMs ?? gameState.timeAttackTimeLimitMs ?? null
    : null;
  const timeAttackEndReason = isTimeAttackMode
    ? gameState.timeAttackEndReason ?? null
    : null;
  const firstClipSpanMs = Math.max(0, (clipEndSec - clipStartSec) * 1000);

  const replayClipSpanMs = Math.max(
    0,
    (clipReplayEndSec - clipReplayStartSec) * 1000,
  );

  const shouldLoopCurrentClip =
    replayClipSpanMs >= 250 &&
    (isTimeAttackMode || effectiveGuessDurationMs > firstClipSpanMs + 250);
  const audioGestureSessionKeyRef = useRef<string>("");
  if (trackCursor === 0 || !audioGestureSessionKeyRef.current) {
    audioGestureSessionKeyRef.current = `${room.id}:${gameState.startedAt}:${currentTrackIndex}`;
  }
  const audioGestureSessionKey = audioGestureSessionKeyRef.current;
  const {
    liveParticipantCount,
    liveAnsweredCount,
    liveAccuracyPct,
    requiredAnswerCount,
    serverAnsweredCurrentParticipantCount,
    allAnsweredByServer,
    revealChoicePickMap,
  } = useGameRoomQuestionDerivedState({
    gamePhase: gameState.phase,
    questionStats: gameState.questionStats,
    participants,
    meClientId,
  });
  const uiNowMs = useGameRoomUiClock({
    getServerNowMs,
    startedAt: gameState.startedAt,
  });

  const waitingToStart = gameState.startedAt > uiNowMs;
  const remainingToStartMs = Math.max(0, gameState.startedAt - uiNowMs);
  const startCountdownSec = Math.max(1, Math.ceil(remainingToStartMs / 1000));
  const isInitialCountdown = waitingToStart && trackCursor === 0;
  const isInterTrackWait = waitingToStart && !isInitialCountdown;
  const isFinalCountdown = isInitialCountdown && startCountdownSec <= 3;
  const countdownTone = isFinalCountdown
    ? "border-rose-400/70 bg-rose-500/20 text-rose-100 shadow-[0_0_35px_rgba(244,63,94,0.45)]"
    : "border-amber-400/60 bg-amber-400/15 text-amber-100 shadow-[0_0_28px_rgba(251,191,36,0.35)]";

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
    gameVolume,
    requiresAudioGesture,
    startedAt: gameState.startedAt,
    phase: gameState.phase,
    effectiveGuessDurationMs,
    fallbackDurationSec,
    isTimeAttackMode,
    shouldLoopCurrentClip: shouldLoopCurrentClip,
    clipStartSec,
    clipEndSec,
    waitingToStart,
    isEnded,
    isReveal,
    trackLoadKey,
    trackSessionKey,
    audioGestureSessionKey,
    videoId,
    currentTrackIndex,
    primeSfxAudio,
    clipReplayStartSec,
    clipReplayEndSec,
  });
  const shouldShowGestureOverlay =
    !isEnded && requiresAudioGesture && !audioUnlocked;
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
    (allAnsweredByServer ||
      (requiredAnswerCount === 1 && allAnsweredByLocalSnapshot));

  const isRevealPendingServerSync = allAnsweredReadyForReveal && !isReveal;
  const isRevealPendingOptimisticSync =
    gameState.phase === "guess" &&
    requiredAnswerCount > 0 &&
    !isReveal &&
    allAnsweredByLocalSnapshot &&
    !allAnsweredByServer;
  const isGuessUrgency = useGameRoomGuessUrgencyFlag({
    getServerNowMs,
    phase: gameState.phase,
    phaseEndsAt,
    isEnded,
    waitingToStart,
    allAnsweredReadyForReveal,
    trackSessionKey,
  });
  const displayParticipantCount =
    requiredAnswerCount > 0
      ? requiredAnswerCount
      : Math.max(participants.length, liveParticipantCount);
  const displayAnsweredCount =
    displayParticipantCount > 0
      ? Math.min(
        displayParticipantCount,
        gameState.phase === "guess"
          ? Math.max(serverAnsweredCurrentParticipantCount, answeredCount)
          : Math.max(
            serverAnsweredCurrentParticipantCount,
            liveAnsweredCount,
          ),
      )
      : 0;
  const displayUnansweredCount =
    gameState.phase === "guess" && displayParticipantCount > 0
      ? Math.max(0, displayParticipantCount - displayAnsweredCount)
      : typeof gameState.questionStats?.unansweredCount === "number"
        ? Math.max(0, Math.floor(gameState.questionStats.unansweredCount))
        : null;

  const isPlaybackExtensionVoteActive =
    playbackExtensionVote?.status === "active";

  const isPlaybackVoteEligible =
    !!meClientId &&
    (playbackExtensionVote?.eligibleClientIds.includes(meClientId) ?? false);

  const showPlaybackVoteRedDot =
    isPlaybackExtensionVoteActive &&
    myPlaybackVote === null &&
    isPlaybackVoteEligible;

  const canRequestPlaybackExtensionVote =
    gameState.status === "playing" &&
    gameState.phase === "guess" &&
    isManualPlaybackExtensionMode &&
    !playbackExtensionVote &&
    !hasRequestedRejectedPlaybackExtensionVote &&
    !!onRequestPlaybackExtensionVote;

  const canViewPlaybackVoteDialog =
    isManualPlaybackExtensionMode &&
    playbackExtensionVote?.status === "active";

  const canOpenPlaybackVotePrompt =
    canViewPlaybackVoteDialog &&
    myPlaybackVote === null &&
    !!onCastPlaybackExtensionVote;
  const lastPlaybackVoteToastKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!canOpenPlaybackVotePrompt || !playbackExtensionVote) return;

    const toastKey = `${trackSessionKey}:${playbackExtensionVote.startedAt}`;
    if (lastPlaybackVoteToastKeyRef.current === toastKey) return;

    lastPlaybackVoteToastKeyRef.current = toastKey;

    appToast.info("有人發起了延長播放投票，點擊右上角「延長播放」進行表態。", {
      id: "playback-extension-vote-started",
      duration: 4500,
    });
  }, [canOpenPlaybackVotePrompt, playbackExtensionVote, trackSessionKey]);

  const playbackVoteButtonDisabled =
    playbackVoteRequestPending ||
    playbackVoteSubmitPending !== null ||
    (!canRequestPlaybackExtensionVote && !canViewPlaybackVoteDialog);

  const playbackVoteActionLabel = playbackVoteButtonLabel;

  const shouldHideVideoInGuessPhase = gameState.phase === "guess" && !isEnded;
  const showGuessMask =
    shouldHideVideoInGuessPhase &&
    !allAnsweredReadyForReveal &&
    !isEnded &&
    !waitingToStart;
  const showPreStartMask =
    waitingToStart && !isEnded && !shouldShowGestureOverlay;
  const showLoadingMask = false;
  const shouldHideVideoFrame =
    shouldShowGestureOverlay ||
    showPreStartMask ||
    showLoadingMask ||
    showGuessMask ||
    shouldHideVideoInGuessPhase;
  const showAudioOnlyMask = !shouldHideVideoFrame && !showVideo;
  const reduceGuessVideoDisplayCost =
    isMobileGameViewport && showGuessMask && !showPreStartMask && !isReveal;
  const correctChoiceIndex = currentTrackIndex;
  const sortedParticipants = useMemo(
    () => sortParticipantsByScore(participants),
    [participants],
  );
  const { topTwoSwapState, resetTopTwoSwapState } =
    useTopTwoSwapState(sortedParticipants);
  const { resetQuestionRecaps } = useGameRoomRecaps({
    isReveal,
    trackSessionKey,
    trackCursor,
    currentTrackIndex,
    correctChoiceIndex,
    choices: gameState.choices,
    questionStats: gameState.questionStats,
    liveParticipantCount,
    liveAnsweredCount,
    liveCorrectCount:
      typeof gameState.questionStats?.correctCount === "number"
        ? Math.max(0, Math.floor(gameState.questionStats.correctCount))
        : null,
    liveWrongCount:
      typeof gameState.questionStats?.wrongCount === "number"
        ? Math.max(0, Math.floor(gameState.questionStats.wrongCount))
        : null,
    liveUnansweredCount:
      typeof gameState.questionStats?.unansweredCount === "number"
        ? Math.max(0, Math.floor(gameState.questionStats.unansweredCount))
        : null,
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

  useGameRoomVoteDialogEffects({
    trackSessionKey,
    isManualPlaybackExtensionMode,
    isAutoPlaybackExtensionMode,
    playbackExtensionVote,
    playbackExtensionSeconds,
    meClientId,
    myPlaybackVote,
    playbackVoteResolvedSeconds,
    gamePhase: gameState.phase,
    gameStatus: gameState.status,
    setPlaybackVoteDialogOpen,
    setPlaybackVoteRequestPending,
    setPlaybackVoteSubmitPending,
  });

  useEffect(() => {
    if (restartGameVote?.status !== "active") {
      setRestartVoteDialogOpen(false);
      setRestartVoteSubmitPending(null);
    }
  }, [restartGameVote?.status]);

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

  const [leaderboardLockShakeKey, setLeaderboardLockShakeKey] = useState(0);
  const handleSubmitChoice = useCallback(
    (choiceIndex: number) => {
      if (isLeaderboardRoom && selectedChoice !== null && selectedChoice !== choiceIndex) {
        setLeaderboardLockShakeKey((k) => k + 1);
        return;
      }
      submitChoiceWithFeedback(choiceIndex);
    },
    [isLeaderboardRoom, selectedChoice, submitChoiceWithFeedback],
  );

  useGameRoomChoiceHotkeys({
    enabled: canAnswerNow,
    choices: gameState.choices,
    keyBindings,
    onSubmitChoice: handleSubmitChoice,
  });

  const effectivePlayerVideoId =
    trackCursor === 0 ? videoId : (playerVideoId ?? videoId);
  const iframeSrc = useMemo(() => {
    if (!effectivePlayerVideoId) return null;

    const params = new URLSearchParams({
      autoplay: "0",
      controls: "0",
      fs: "0",
      disablekb: "1",
      modestbranding: "1",
      iv_load_policy: "3",
      enablejsapi: "1",
      rel: "0",
      playsinline: "1",
    });
    if (typeof window !== "undefined") {
      params.set("origin", window.location.origin);
      params.set("widget_referrer", window.location.origin);
    }

    return `https://www.youtube-nocookie.com/embed/${effectivePlayerVideoId}?${params.toString()}`;
  }, [effectivePlayerVideoId]);

  const phaseLabel = isEnded
    ? "已結束"
    : gameState.phase === "guess" && !allAnsweredReadyForReveal
      ? "猜歌中"
      : "公布答案";

  const activePhaseDurationMs =
    gameState.phase === "guess"
      ? effectiveGuessDurationMs
      : gameState.revealDurationMs;

  const preStartCountdownSfxSec = startCountdownSec;

  const executeRequestPlaybackVote = useCallback(async () => {
    if (!canRequestPlaybackExtensionVote || !onRequestPlaybackExtensionVote) {
      return;
    }

    setPlaybackVoteRequestPending(true);
    try {
      const latestRemainingMs = Math.max(0, phaseEndsAt - getServerNowMs());
      const ok = await onRequestPlaybackExtensionVote(
        latestRemainingMs > 0 ? latestRemainingMs : undefined,
      );

      if (ok) {
        setPlaybackVoteConfirmOpen(false);
        appToast.info("已發起延長播放投票，其他玩家可點擊右上角「延長播放」表態。", {
          id: "playback-extension-vote-requested",
          duration: 3500,
        });
      }
    } finally {
      setPlaybackVoteRequestPending(false);
    }
  }, [
    canRequestPlaybackExtensionVote,
    getServerNowMs,
    onRequestPlaybackExtensionVote,
    phaseEndsAt,
  ]);

  const handleRequestPlaybackVote = useCallback(() => {
    if (canViewPlaybackVoteDialog) {
      setPlaybackVoteDialogOpen(true);
      return;
    }

    if (!canRequestPlaybackExtensionVote) {
      return;
    }

    setPlaybackVoteConfirmOpen(true);
  }, [canRequestPlaybackExtensionVote, canViewPlaybackVoteDialog]);

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
  const handleVoteReject = useCallback(
    () => void handleCastPlaybackVote("reject"),
    [handleCastPlaybackVote],
  );
  const handleVoteApprove = useCallback(
    () => void handleCastPlaybackVote("approve"),
    [handleCastPlaybackVote],
  );

  const executeRequestRestartVote = useCallback(async () => {
    if (!canRequestRestartVote || !onRequestRestartGameVote) return;

    const action = pendingRestartVoteAction;

    setRestartVoteRequestPending(true);
    try {
      const ok = await onRequestRestartGameVote(action);
      if (ok) {
        setRestartVoteConfirmOpen(false);
      }
    } finally {
      setRestartVoteRequestPending(false);
    }
  }, [
    canRequestRestartVote,
    onRequestRestartGameVote,
    pendingRestartVoteAction,
  ]);

  const handleRequestRestartVote = useCallback(
    (action: RestartGameVoteAction) => {
      setPendingRestartVoteAction(action);

      if (canOpenRestartVoteDialog) {
        setRestartVoteDialogOpen(true);
        return;
      }

      if (!canRequestRestartVote) return;

      setRestartVoteConfirmOpen(true);
    },
    [canOpenRestartVoteDialog, canRequestRestartVote],
  );

  const handleCastRestartVote = useCallback(
    async (vote: "approve" | "reject") => {
      if (!onCastRestartGameVote) return;
      setRestartVoteSubmitPending(vote);
      try {
        const ok = await onCastRestartGameVote(vote);
        if (ok) {
          setRestartVoteDialogOpen(false);
        }
        // If !ok, the server will send updated state via socket — no local manipulation needed.
      } finally {
        setRestartVoteSubmitPending(null);
      }
    },
    [onCastRestartGameVote],
  );
  const handleRestartVoteApprove = useCallback(
    () => void handleCastRestartVote("approve"),
    [handleCastRestartVote],
  );
  const handleRestartVoteReject = useCallback(
    () => void handleCastRestartVote("reject"),
    [handleCastRestartVote],
  );
  const handleCloseRestartVoteDialog = useCallback(() => {
    setRestartVoteDialogOpen(false);
  }, []);

  const {
    myHasAnswered,
    myIsCorrect,
    myResolvedScoreBreakdown,
    myComboNow,
    myComboTier,
    myComboMilestone,
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
    liveParticipantCount: displayParticipantCount,
    liveAnsweredCount: displayAnsweredCount,
    liveAccuracyPct,
    selectedChoice,
    correctChoiceIndex,
    myBackendScoreBreakdown:
      meClientId && gameState.questionStats?.scoreBreakdownsByClientId
        ? (gameState.questionStats.scoreBreakdownsByClientId[meClientId] ??
          null)
        : null,
    gamePhase: gameState.phase,
    isReveal,
    isInterTrackWait,
    isGuessUrgency,
    startCountdownSec,
    myHasChangedAnswer,
  });
  const scoreBreakdownByClientId = React.useMemo(
    () =>
      new Map(
        Object.entries(
          gameState.questionStats?.scoreBreakdownsByClientId ?? {},
        ),
      ),
    [gameState.questionStats?.scoreBreakdownsByClientId],
  );

  useGameRoomSfxEffects({
    gamePhase: gameState.phase,
    gameStartedAt: gameState.startedAt,
    trackSessionKey,
    isEnded,
    isReveal,
    isInterTrackWait,
    waitingToStart,
    preStartCountdownSfxSec,
    phaseEndsAt,
    meClientId,
    selectedChoice,
    myHasAnswered,
    myIsCorrect,
    myResolvedScoreBreakdown,
    comboBreakTier,
    isComboBreakThisQuestion,
    myIsCorrectForCombo: myIsCorrect,
    myComboMilestone,
    myComboNow,
    myComboTier,
    getServerNowMs,
    playGameSfx,
  });

  const scoreboardRows = useMemo(
    () =>
      buildScoreboardRows(sortedParticipants, meClientId, 12, room.maxPlayers),
    [meClientId, room.maxPlayers, sortedParticipants],
  );

  const handleShowVideoChange = useCallback((show: boolean) => {
    setShowVideoOverride(show);
    setStoredShowVideoPreference(show);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      GAME_ROOM_GUESS_ANCHOR_STORAGE_KEY,
      mobileGuessAnchorEnabled ? "1" : "0",
    );
  }, [mobileGuessAnchorEnabled]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      GAME_ROOM_REVEAL_AUTO_OVERLAY_STORAGE_KEY,
      mobileRevealAutoOverlayEnabled ? "1" : "0",
    );
  }, [mobileRevealAutoOverlayEnabled]);

  useEffect(() => {
    if (!isMobileGameViewport) {
      const clearId = window.setTimeout(() => {
        setMobileBottomPanel(null);
        setMobileScoreboardSwapArmed(false);
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
        currentPhase === "reveal" &&
        mobileRevealAutoOverlayEnabled &&
        mobileBottomPanel !== "scoreboard";
      const shouldCloseRevealOverlay =
        currentPhase === "guess" &&
        previousPhase === "reveal" &&
        mobileScoreboardAutoOpenedRef.current;
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
            mobileScoreboardAutoOpenedRef.current = true;
            setMobileScoreboardSwapArmed(false);
            setMobileBottomPanel("scoreboard");
          }
          if (shouldCloseRevealOverlay) {
            mobileScoreboardAutoOpenedRef.current = false;
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
    mobileBottomPanel,
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
  const playbackHeaderActions = useMemo(() => {
    const voteButton =
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
            } ${showPlaybackVoteRedDot ? "game-room-extend-vote-btn--prompt game-room-restart-vote-btn--notify" : ""}`}
          disabled={playbackVoteButtonDisabled}
          onClick={handleRequestPlaybackVote}
        >
          {playbackVoteActionLabel}
          {showPlaybackVoteRedDot && (
            <span className="game-room-restart-vote-red-dot" aria-hidden="true" />
          )}
        </Button>
      ) : null;
    const showRestartBtn = gameState.status === "playing";
    if (!showRestartBtn && !isHostInGame && !voteButton) return null;
    const restartBtnLabel = restartVoteRequestPending
      ? "投票中..."
      : isRestartVoteActive
        ? `${restartVoteActionLabel}投票 ${restartVoteApproveCount}/${restartVoteMajorityCount}`
        : restartVoteButtonLabel;
    return (
      <Stack
        direction="row"
        spacing={1}
        className="max-[760px]:w-full max-[760px]:grid max-[760px]:grid-cols-1"
      >
        {showRestartBtn && (
          <>
            <Button
              type="button"
              variant={
                isRestartVoteActive && restartVoteAction === "return_to_lobby"
                  ? "contained"
                  : "outlined"
              }
              color="info"
              size="small"
              startIcon={<LogoutRoundedIcon />}
              className={`max-[760px]:!w-full max-[760px]:!px-2 max-[760px]:!py-1 max-[760px]:!text-xs ${showRestartVoteRedDot && restartVoteAction === "return_to_lobby"
                ? "game-room-restart-vote-btn--notify"
                : ""
                }`}
              disabled={restartVoteButtonDisabled}
              onClick={() => handleRequestRestartVote("return_to_lobby")}
            >
              {isRestartVoteActive && restartVoteAction === "return_to_lobby"
                ? `回到房間投票 ${restartVoteApproveCount}/${restartVoteMajorityCount}`
                : "回到房間"}
              {showRestartVoteRedDot && restartVoteAction === "return_to_lobby" && (
                <span className="game-room-restart-vote-red-dot" aria-hidden="true" />
              )}
            </Button>

            <Button
              type="button"
              variant={
                isRestartVoteActive && restartVoteAction === "restart_now"
                  ? "contained"
                  : "outlined"
              }
              color="warning"
              size="small"
              startIcon={<RestartAltRoundedIcon />}
              className={`max-[760px]:!w-full max-[760px]:!px-2 max-[760px]:!py-1 max-[760px]:!text-xs ${showRestartVoteRedDot && restartVoteAction === "restart_now"
                ? "game-room-restart-vote-btn--notify"
                : ""
                }`}
              disabled={restartVoteButtonDisabled}
              onClick={() => handleRequestRestartVote("restart_now")}
            >
              {isRestartVoteActive && restartVoteAction === "restart_now"
                ? restartBtnLabel
                : restartVoteButtonLabel}
              {showRestartVoteRedDot && restartVoteAction === "restart_now" && (
                <span className="game-room-restart-vote-red-dot" aria-hidden="true" />
              )}
            </Button>
          </>
        )}
        {voteButton}
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
    );
  }, [
    canOpenPlaybackVotePrompt,
    gameState.status,
    handleOpenHostManagement,
    handleRequestPlaybackVote,
    handleRequestRestartVote,
    isHostInGame,
    isManualPlaybackExtensionMode,
    isRestartVoteActive,
    playbackExtensionVote?.status,
    playbackVoteActionLabel,
    playbackVoteButtonDisabled,
    restartVoteAction,
    restartVoteActionLabel,
    restartVoteApproveCount,
    restartVoteButtonDisabled,
    restartVoteButtonLabel,
    restartVoteMajorityCount,
    showRestartVoteRedDot,
    restartVoteRequestPending,
    showPlaybackVoteRedDot,
  ]);
  const mobilePlaybackVoteAction = useMemo(() => {
    if (
      !isMobileGameViewport ||
      gameState.status !== "playing" ||
      !isManualPlaybackExtensionMode
    ) {
      return null;
    }
    return (
      <button
        type="button"
        className={`game-room-extend-vote-btn game-room-extend-vote-btn--mobile-inline ${playbackExtensionVote?.status === "active"
          ? "game-room-extend-vote-btn--active"
          : playbackExtensionVote?.status === "approved"
            ? "game-room-extend-vote-btn--approved"
            : playbackExtensionVote?.status === "rejected"
              ? "game-room-extend-vote-btn--rejected"
              : ""
          } ${showPlaybackVoteRedDot ? "game-room-extend-vote-btn--prompt game-room-restart-vote-btn--notify" : ""}`}
        disabled={playbackVoteButtonDisabled}
        onClick={handleRequestPlaybackVote}
      >
        <span className="game-room-extend-vote-btn__icon" aria-hidden="true">
          <HowToVoteRoundedIcon fontSize="inherit" />
        </span>
        <span className="game-room-extend-vote-btn__copy">
          {playbackVoteActionLabel}
        </span>
        {showPlaybackVoteRedDot && (
          <span className="game-room-restart-vote-red-dot" aria-hidden="true" />
        )}
      </button>
    );
  }, [
    gameState.status,
    handleRequestPlaybackVote,
    isManualPlaybackExtensionMode,
    isMobileGameViewport,
    playbackExtensionVote?.status,
    playbackVoteButtonDisabled,
    playbackVoteActionLabel,
    showPlaybackVoteRedDot,
  ]);

  const shouldMountMobileScoreboardDrawer =
    isMobileGameViewport &&
    (mobileScoreboardOpen || mobileAutoOverlayTransition !== "idle");

  const mobileScoreboardDrawerPaperProps = useMemo<MuiDrawerPaperProps>(
    () => ({
      className: `game-room-mobile-scoreboard-drawer game-room-mobile-scoreboard-drawer--single ${mobileScoreboardOpen
        ? "game-room-mobile-scoreboard-drawer--open"
        : "game-room-mobile-scoreboard-drawer--closed"
        } ${isMobileDrawerGestureActive
          ? "game-room-mobile-scoreboard-drawer--dragging"
          : ""
        }`,
      style: {
        ...mobileScoreboardDragDismiss.paperStyle,
        pointerEvents: mobileScoreboardOpen ? "auto" : "none",
        visibility: mobileScoreboardOpen ? "visible" : "hidden",
      } as CSSProperties,
    }),
    [
      isMobileDrawerGestureActive,
      mobileScoreboardDragDismiss.paperStyle,
      mobileScoreboardOpen,
    ],
  );

  const mobileHostManageDrawerPaperProps = useMemo<MuiDrawerPaperProps>(
    () => ({
      className:
        "game-room-mobile-scoreboard-drawer game-room-mobile-scoreboard-drawer--single game-room-mobile-host-manage-drawer",
      style: mobileHostManageDragDismiss.paperStyle as CSSProperties,
    }),
    [mobileHostManageDragDismiss.paperStyle],
  );

  const hostManagementPanelContent = useMemo(() => {
    if (!hostManagementOpen) return null;
    return (
      <Stack spacing={1.1} className="game-room-host-manage-list">
        {hostManageParticipants.length === 0 ? (
          <div className="game-room-host-manage-empty">
            <span className="game-room-host-manage-empty__eyebrow">
              管理列表
            </span>
            <Typography
              variant="body1"
              className="game-room-host-manage-empty__title"
            >
              目前沒有可管理的玩家
            </Typography>
            <Typography
              variant="body2"
              className="game-room-host-manage-empty__note"
            >
              有玩家加入房間後，就可以在這裡進行轉移房主、踢出或封鎖。
            </Typography>
          </div>
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
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  className="game-room-host-manage-identity min-w-0 flex-1"
                >
                  <PlayerAvatar
                    username={normalizeRoomDisplayText(
                      participant.username,
                      `玩家 ${index + 1}`,
                    )}
                    clientId={participant.clientId}
                    avatarUrl={
                      participant.avatar_url ??
                      participant.avatarUrl ??
                      undefined
                    }
                    size={30}
                    rank={index < 3 ? index + 1 : null}
                    combo={participant.combo}
                    effectLevel={avatarEffectLevel}
                  />
                  <div className="game-room-host-manage-copy min-w-0">
                    <Typography
                      variant="body2"
                      className="game-room-host-manage-name truncate text-slate-100"
                    >
                      {normalizeRoomDisplayText(
                        participant.username,
                        `玩家 ${index + 1}`,
                      )}
                    </Typography>
                    <Typography
                      variant="caption"
                      className="game-room-host-manage-meta text-slate-400"
                    >
                      {`分數 ${participant.score.toLocaleString()} · ${participantPingText}`}
                    </Typography>
                  </div>
                  <Chip
                    size="small"
                    className="game-room-host-manage-status"
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
                  onClick={handleHostManagementClick}
                >
                  <Button
                    size="small"
                    variant="outlined"
                    color="info"
                    startIcon={<SwapHorizRoundedIcon />}
                    disabled={!participant.isOnline}
                    data-hm-action="transfer"
                    data-hm-client-id={participant.clientId}
                  >
                    轉移房主
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="warning"
                    startIcon={<PersonRemoveRoundedIcon />}
                    data-hm-action="kick"
                    data-hm-client-id={participant.clientId}
                  >
                    踢出(永久封鎖)
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    color="error"
                    startIcon={<BlockRoundedIcon />}
                    data-hm-action="ban"
                    data-hm-client-id={participant.clientId}
                  >
                    踢出(5分鐘)
                  </Button>
                </Stack>
              </Stack>
            );
          })
        )}
      </Stack>
    );
  }, [
    avatarEffectLevel,
    handleHostManagementClick,
    hostManageParticipants,
    hostManagementOpen,
  ]);

  return (
    <GameRoomDanmuProviderBridge roomId={room.id}>
      <div className="game-room-shell">
        <div className="game-room-grid grid w-full grid-cols-1 gap-3 px-0 pb-10 lg:grid-cols-[minmax(274px,318px)_minmax(0,1fr)] lg:pb-8 xl:grid-cols-[minmax(290px,334px)_minmax(0,1fr)] 2xl:grid-cols-[minmax(304px,348px)_minmax(0,1fr)] lg:h-[calc(100vh-124px)] lg:items-stretch">
          {!isMobileGameViewport && (
            <div className="hidden lg:block lg:h-full">
              <GameRoomLeftSidebar
                scoreboardRows={scoreboardRows}
                answeredClientIdSet={answeredClientIdSet}
                answeredRankByClientId={answeredRankByClientId}
                scorePartsByClientId={scorePartsByClientId}
                scoreBreakdownByClientId={scoreBreakdownByClientId}
                isReveal={isReveal}
                meClientId={meClientId}
                topTwoSwapState={topTwoSwapState}
                avatarEffectLevel={mobileAvatarEffectLevel}
                scoreboardBorderEnabled={scoreboardBorderEnabled}
                scoreboardBorderMaskEnabled={scoreboardBorderMaskEnabled}
                scoreboardBorderAnimation={scoreboardBorderAnimation}
                scoreboardBorderLineStyle={scoreboardBorderLineStyle}
                scoreboardBorderTheme={scoreboardBorderTheme}
                scoreboardBorderParticleCount={
                  mobileScoreboardBorderParticleCount
                }
              />
            </div>
          )}
          <section className="game-room-main-section game-room-main-section--immersive flex min-h-0 flex-col gap-2 lg:h-full lg:overflow-visible">
            <GameRoomPlaybackPanel
              rootRef={
                isMobileGameViewport ? mobilePlaybackPanelRef : undefined
              }
              isMobileView={isMobileGameViewport}
              isCompactMobile={isMobileGameViewport}
              isRevealPhase={isReveal}
              revealAnswerTitle={resolvedAnswerTitle}
              roomName={resolvedRoomName}
              boundedCursor={boundedCursor}
              trackOrderLength={trackOrderLength}
              onOpenExitConfirm={openExitConfirm}
              headerActions={playbackHeaderActions}
              iframeSrc={iframeSrc}
              shouldHideVideoFrame={shouldHideVideoFrame}
              shouldShowVideo={showVideo}
              iframeRef={iframeRef}
              onIframeLoad={handlePlaybackIframeLoad}
              silentAudioRef={silentAudioRef}
              silentAudioSrc={SILENT_AUDIO_SRC}
              showGuessMask={showGuessMask}
              showPreStartMask={showPreStartMask}
              showLoadingMask={showLoadingMask}
              showAudioOnlyMask={showAudioOnlyMask}
              reduceGuessVideoDisplayCost={reduceGuessVideoDisplayCost}
              showVideo={showVideo}
              onShowVideoChange={handleShowVideoChange}
              gameVolume={gameVolume}
              onGameVolumeChange={setGameVolume}
              videoId={videoId}
            />
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
              isTimeAttackMode={isTimeAttackMode}
              timeAttackTimeLimitMs={timeAttackTimeLimitMs}
              timeAttackRemainingMs={timeAttackRemainingMs}
              timeAttackEndReason={timeAttackEndReason}
              choices={gameState.choices}
              selectedChoice={selectedChoice}
              correctChoiceIndex={correctChoiceIndex}
              isEnded={isEnded}
              playlist={playlist}
              trackSessionKey={trackSessionKey}
              myComboTier={myComboTier}
              myComboNow={myComboNow}
              isComboBreakThisQuestion={isComboBreakThisQuestion}
              comboBreakTier={comboBreakTier}
              waitingToStart={waitingToStart}
              shouldShowGestureOverlay={shouldShowGestureOverlay}
              canAnswerNow={canAnswerNow}
              onSubmitChoice={handleSubmitChoice}
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
              mobileHeaderAction={mobilePlaybackVoteAction}
              liveParticipantCount={displayParticipantCount}
              liveAnsweredCount={displayAnsweredCount}
              liveCorrectCount={
                typeof gameState.questionStats?.correctCount === "number"
                  ? Math.max(
                    0,
                    Math.floor(gameState.questionStats.correctCount),
                  )
                  : null
              }
              liveWrongCount={
                typeof gameState.questionStats?.wrongCount === "number"
                  ? Math.max(0, Math.floor(gameState.questionStats.wrongCount))
                  : null
              }
              liveUnansweredCount={displayUnansweredCount}
              isRecoveringConnection={isRecoveringConnection}
              recoveryStatusText={recoveryStatusText}
              isLeaderboardRoom={isLeaderboardRoom}
              leaderboardLockShakeKey={leaderboardLockShakeKey}
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
                  className="game-room-mobile-action-btn game-room-mobile-action-btn--icon col-span-2"
                  onClick={handleToggleMobileScoreboard}
                >
                  <span className="game-room-mobile-action-icon" aria-hidden>
                    <LeaderboardRoundedIcon fontSize="inherit" />
                  </span>
                  <span className="game-room-mobile-action-label">排行榜</span>
                  <span className="game-room-mobile-action-meta">
                    已答 {displayAnsweredCount}/{displayParticipantCount || 0}
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
                      className={`game-room-mobile-toggle-chip game-room-mobile-toggle-chip--primary game-room-mobile-toggle-chip--wide game-room-mobile-toggle-chip--host ${hostManagementOpen
                        ? "game-room-mobile-toggle-chip--active"
                        : ""
                        }`}
                      onClick={handleOpenHostManagement}
                    >
                      <span
                        className="game-room-mobile-action-icon"
                        aria-hidden
                      >
                        <ManageAccountsRoundedIcon fontSize="inherit" />
                      </span>
                      <span>房主管理</span>
                      <span className="game-room-mobile-action-meta">
                        {`${hostManageParticipants.length} 人`}
                      </span>
                    </button>
                  )}
                  <button
                    type="button"
                    className={`game-room-mobile-toggle-chip game-room-mobile-toggle-chip--minor ${isHostInGame ? "game-room-mobile-toggle-chip--half" : ""} game-room-mobile-toggle-chip--overlay ${mobileRevealAutoOverlayEnabled
                      ? "game-room-mobile-toggle-chip--active"
                      : ""
                      }`}
                    onClick={handleToggleMobileRevealAutoOverlay}
                    aria-pressed={mobileRevealAutoOverlayEnabled}
                  >
                    <span className="game-room-mobile-action-icon" aria-hidden>
                      <AutoAwesomeRoundedIcon fontSize="inherit" />
                    </span>
                    <span>{"自動彈出分數榜"}</span>
                    <span className="game-room-mobile-action-meta">
                      {mobileRevealAutoOverlayEnabled ? "ON" : "OFF"}
                    </span>
                  </button>
                  <button
                    type="button"
                    className={`game-room-mobile-toggle-chip game-room-mobile-toggle-chip--minor ${isHostInGame ? "game-room-mobile-toggle-chip--half" : ""} game-room-mobile-toggle-chip--anchor ${mobileGuessAnchorEnabled
                      ? "game-room-mobile-toggle-chip--active"
                      : ""
                      }`}
                    onClick={handleToggleMobileGuessAnchor}
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
                </div>
                {gameState.status === "playing" && (
                  <div className="game-room-mobile-vote-row col-span-2 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      className={`game-room-mobile-toggle-chip game-room-mobile-toggle-chip--primary game-room-mobile-vote-row__btn ${isRestartVoteActive && restartVoteAction === "return_to_lobby"
                        ? "game-room-mobile-toggle-chip--active"
                        : ""
                        } ${showRestartVoteRedDot && restartVoteAction === "return_to_lobby"
                          ? "game-room-restart-vote-btn--notify"
                          : ""
                        } ${isRestartVoteRequestLocked
                          ? "game-room-mobile-toggle-chip--request-locked"
                          : ""
                        }`}
                      disabled={restartVoteButtonDisabled}
                      onClick={() => handleRequestRestartVote("return_to_lobby")}
                    >
                      <span className="game-room-mobile-action-icon" aria-hidden>
                        <LogoutRoundedIcon fontSize="inherit" />
                        {showRestartVoteRedDot && restartVoteAction === "return_to_lobby" && (
                          <span className="game-room-restart-vote-red-dot" aria-hidden="true" />
                        )}
                      </span>
                      <span>
                        {isRestartVoteActive && restartVoteAction === "return_to_lobby"
                          ? `${restartVoteApproveCount}/${restartVoteMajorityCount}`
                          : isRestartVoteRequestLocked
                            ? "本局已發起"
                            : "回房間"}
                      </span>

                      {isRestartVoteRequestLocked && (
                        <span
                          className="game-room-mobile-toggle-chip__lock-corner"
                          aria-hidden="true"
                        >
                          <LockRoundedIcon fontSize="inherit" />
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      className={`game-room-mobile-toggle-chip game-room-mobile-toggle-chip--neutral game-room-mobile-vote-row__btn ${isRestartVoteActive && restartVoteAction === "restart_now"
                        ? "game-room-mobile-toggle-chip--active"
                        : ""
                        } ${showRestartVoteRedDot && restartVoteAction === "restart_now"
                          ? "game-room-restart-vote-btn--notify"
                          : ""
                        } ${isRestartVoteRequestLocked
                          ? "game-room-mobile-toggle-chip--request-locked"
                          : ""
                        }`}
                      disabled={restartVoteButtonDisabled}
                      onClick={() => handleRequestRestartVote("restart_now")}
                    >
                      <span className="game-room-mobile-action-icon" aria-hidden>
                        <RestartAltRoundedIcon fontSize="inherit" />
                        {showRestartVoteRedDot && restartVoteAction === "restart_now" && (
                          <span className="game-room-restart-vote-red-dot" aria-hidden="true" />
                        )}
                      </span>
                      <span>
                        {isRestartVoteActive && restartVoteAction === "restart_now"
                          ? `${restartVoteApproveCount}/${restartVoteMajorityCount}`
                          : isRestartVoteRequestLocked
                            ? "本局已發起"
                            : restartVoteButtonLabel}
                      </span>

                      {isRestartVoteRequestLocked && (
                        <span
                          className="game-room-mobile-toggle-chip__lock-corner"
                          aria-hidden="true"
                        >
                          <LockRoundedIcon fontSize="inherit" />
                        </span>
                      )}
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  className="game-room-mobile-toggle-chip game-room-mobile-toggle-chip--leave col-span-2"
                  onClick={openExitConfirm}
                >
                  <span className="game-room-mobile-action-icon" aria-hidden>
                    <LogoutRoundedIcon fontSize="inherit" />
                  </span>
                  <span>離開房間</span>
                </button>
              </div>
            )}
          </section>
          {shouldMountMobileScoreboardDrawer ? (
            <>
              {mobileBottomPanel !== null && isMobileDrawerGestureActive && (
                <div
                  className="game-room-mobile-overlay-blocker"
                  aria-hidden="true"
                />
              )}
              <Drawer
                className={`game-room-mobile-drawer-root game-room-mobile-drawer-root--scoreboard lg:!hidden ${mobileAutoOverlayTransition !== "idle"
                  ? `game-room-mobile-drawer-root--${mobileAutoOverlayTransition}`
                  : ""
                  }`}
                anchor="bottom"
                open={mobileScoreboardOpen}
                onClose={handleCloseMobileScoreboard}
                ModalProps={GAME_ROOM_SCOREBOARD_DRAWER_MODAL_PROPS}
                PaperProps={mobileScoreboardDrawerPaperProps}
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
                      <span className="game-room-mobile-scoreboard-title">
                        排行榜
                      </span>
                    </div>
                    <div className="game-room-mobile-scoreboard-actions">
                      <span className="game-room-mobile-scoreboard-answered-pill">
                        已答 {displayAnsweredCount}/
                        {displayParticipantCount || 0}
                      </span>
                      <button
                        type="button"
                        className="game-room-mobile-drawer-close game-room-mobile-drawer-close--scoreboard-inline game-room-mobile-drawer-close--icon"
                        onClick={handleCloseMobileScoreboard}
                        aria-label="關閉排行榜"
                      >
                        <CloseRoundedIcon fontSize="inherit" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="relative min-h-0 flex-1 overflow-hidden p-2">
                  <GameRoomLeftSidebar
                    scoreboardRows={scoreboardRows}
                    answeredClientIdSet={answeredClientIdSet}
                    answeredRankByClientId={answeredRankByClientId}
                    scorePartsByClientId={scorePartsByClientId}
                    scoreBreakdownByClientId={scoreBreakdownByClientId}
                    isReveal={isReveal}
                    meClientId={meClientId}
                    topTwoSwapState={topTwoSwapState}
                    className="game-room-mobile-scoreboard-shell !h-full"
                    mobileOverlayMode
                    mobileMinimalHeader
                    swapAnimationEnabled={
                      mobileScoreboardOpen &&
                      mobileScoreboardSwapArmed &&
                      !isMobileDrawerGestureActive
                    }
                    swapReplayToken={mobileScoreboardSwapReplayToken}
                    avatarEffectLevel={mobileAvatarEffectLevel}
                    scoreboardBorderEnabled={scoreboardBorderEnabled}
                    scoreboardBorderMaskEnabled={scoreboardBorderMaskEnabled}
                    scoreboardBorderAnimation={scoreboardBorderAnimation}
                    scoreboardBorderLineStyle={scoreboardBorderLineStyle}
                    scoreboardBorderTheme={scoreboardBorderTheme}
                    scoreboardBorderParticleCount={
                      mobileScoreboardBorderParticleCount
                    }
                  />
                </div>
              </Drawer>
            </>
          ) : null}
          {playbackVoteConfirmOpen && canRequestPlaybackExtensionVote ? (
            <Dialog
              onClose={() => {
                if (!playbackVoteRequestPending) {
                  setPlaybackVoteConfirmOpen(false);
                }
              }}
              maxWidth="xs"
              fullWidth
              open
              PaperProps={PLAYBACK_VOTE_DIALOG_PAPER_PROPS}
            >
              <DialogTitle>要發起延長播放投票嗎？</DialogTitle>
              <DialogContent dividers>
                <Stack spacing={1.2}>
                  <Typography variant="body2" className="text-slate-300">
                    發起後，所有符合資格的玩家都可以投票。多數玩家同意後，本題會延長播放時間。
                  </Typography>
                  <Typography variant="caption" className="text-slate-500">
                    投票會持續到目前歌曲結束前。若投票未通過，本題你將不能再次發起延長播放投票。
                  </Typography>
                </Stack>
              </DialogContent>
              <DialogActions>
                <Button
                  onClick={() => setPlaybackVoteConfirmOpen(false)}
                  variant="text"
                  color="inherit"
                  disabled={playbackVoteRequestPending}
                >
                  取消
                </Button>
                <Button
                  onClick={() => void executeRequestPlaybackVote()}
                  variant="contained"
                  color="warning"
                  disabled={playbackVoteRequestPending}
                >
                  {playbackVoteRequestPending ? "發起中..." : "確認發起"}
                </Button>
              </DialogActions>
            </Dialog>
          ) : null}
          {playbackVoteDialogOpen && canViewPlaybackVoteDialog ? (
            <Dialog
              onClose={handleClosePlaybackVoteDialog}
              maxWidth="xs"
              fullWidth
              open
              PaperProps={PLAYBACK_VOTE_DIALOG_PAPER_PROPS}
            >
              <DialogTitle>延長播放投票</DialogTitle>
              <DialogContent dividers>
                <Stack spacing={1.2}>
                  <Typography variant="body2" className="text-slate-200">
                    {playbackVoteRequesterName}{" "}
                    {`提議將本題多播放 ${playbackVoteProposalSeconds} 秒。`}
                  </Typography>
                  <div className="game-room-playback-vote-dialog__stats">
                    <span>{`同意 ${playbackVoteApproveCount}/${playbackVoteMajorityCount}`}</span>
                    <span>{`不同意 ${playbackVoteRejectCount}`}</span>
                    <Typography variant="body2" className="text-slate-300">
                      這個投票會持續到目前歌曲結束前。多數玩家同意後，會立即延長播放時間。
                    </Typography>
                  </div>
                </Stack>
              </DialogContent>
              <DialogActions>
                <Button
                  onClick={handleVoteReject}
                  variant="outlined"
                  color="inherit"
                  disabled={
                    playbackVoteSubmitPending !== null ||
                    !canOpenPlaybackVotePrompt ||
                    myPlaybackVote !== null
                  }
                >
                  {playbackVoteSubmitPending === "reject"
                    ? "送出中..."
                    : myPlaybackVote === "reject"
                      ? "已選擇維持原長度"
                      : "維持原播放長度"}
                </Button>

                <Button
                  onClick={handleVoteApprove}
                  variant="contained"
                  color="warning"
                  disabled={
                    playbackVoteSubmitPending !== null ||
                    !canOpenPlaybackVotePrompt ||
                    myPlaybackVote !== null
                  }
                >
                  {playbackVoteSubmitPending === "approve"
                    ? "送出中..."
                    : myPlaybackVote === "approve"
                      ? "已同意延長"
                      : `延長 ${playbackVoteProposalSeconds} 秒`}
                </Button>
              </DialogActions>
            </Dialog>
          ) : null}
          {restartVoteConfirmOpen && canRequestRestartVote ? (
            <Dialog
              onClose={() => {
                if (!restartVoteRequestPending) {
                  setRestartVoteConfirmOpen(false);
                }
              }}
              maxWidth="xs"
              fullWidth
              open
              PaperProps={RESTART_VOTE_DIALOG_PAPER_PROPS}
            >
              <DialogTitle>{restartVoteDialogTitle}</DialogTitle>
              <DialogContent dividers>
                <Stack spacing={1.2}>
                  <Typography variant="body2" className="text-slate-300">
                    {restartVoteDialogDescription}
                  </Typography>
                  <Typography variant="caption" className="text-slate-500">
                    {isSoloGameSession
                      ? "目前只有你在遊戲中，確認後會直接執行，不需要投票。"
                      : "發起後需要多數玩家同意才會執行。若投票未通過，本局你將不能再次發起這類投票。"}
                  </Typography>
                </Stack>
              </DialogContent>
              <DialogActions>
                <Button
                  onClick={() => setRestartVoteConfirmOpen(false)}
                  variant="text"
                  color="inherit"
                  disabled={restartVoteRequestPending}
                >
                  取消
                </Button>
                <Button
                  onClick={() => void executeRequestRestartVote()}
                  variant="contained"
                  color={pendingRestartVoteAction === "return_to_lobby" ? "info" : "warning"}
                  disabled={restartVoteRequestPending}
                >
                  {restartVoteRequestPending ? "處理中..." : restartVoteConfirmButtonLabel}
                </Button>
              </DialogActions>
            </Dialog>
          ) : null}
          {restartVoteDialogOpen && canOpenRestartVoteDialog ? (
            <Dialog
              onClose={handleCloseRestartVoteDialog}
              maxWidth="xs"
              fullWidth
              open
              PaperProps={RESTART_VOTE_DIALOG_PAPER_PROPS}
            >
              <DialogTitle>{restartVoteDialogTitle}</DialogTitle>
              <DialogContent dividers>
                <Stack spacing={1.2}>
                  <Typography variant="body2" className="text-slate-300">
                    {restartVoteDialogDescription}
                  </Typography>
                  <div className="game-room-playback-vote-dialog__stats">
                    <span>{`贊成 ${restartVoteApproveCount} / ${restartVoteMajorityCount} 票`}</span>
                    <span>{`反對 ${restartVoteRejectCount}`}</span>
                  </div>
                  <Typography variant="caption" className="text-slate-500">
                    {`需過半（${restartVoteMajorityCount} / ${restartVoteEligibleCount} 票）才能通過`}
                  </Typography>
                </Stack>
              </DialogContent>
              <DialogActions>
                <Button
                  onClick={handleCloseRestartVoteDialog}
                  variant="text"
                  color="inherit"
                  disabled={restartVoteSubmitPending !== null}
                >
                  再想想
                </Button>
                <Button
                  onClick={handleRestartVoteReject}
                  variant="outlined"
                  color="inherit"
                  disabled={restartVoteSubmitPending !== null}
                >
                  {restartVoteSubmitPending === "reject" ? "送出中..." : "否"}
                </Button>
                <Button
                  onClick={handleRestartVoteApprove}
                  variant="contained"
                  color={restartVoteAction === "return_to_lobby" ? "info" : "warning"}
                  disabled={restartVoteSubmitPending !== null}
                >
                  {restartVoteSubmitPending === "approve"
                    ? "送出中..."
                    : `同意${restartVoteActionLabel}`}
                </Button>
              </DialogActions>
            </Dialog>
          ) : null}
          {isHostInGame && !isMobileGameViewport && hostManagementOpen ? (
            <Dialog
              open
              onClose={handleCloseHostManagement}
              maxWidth="sm"
              fullWidth
              PaperProps={HOST_MANAGE_DIALOG_PAPER_PROPS}
            >
              <DialogTitle>房主管理</DialogTitle>
              <DialogContent dividers>
                {hostManagementPanelContent}
              </DialogContent>
              <DialogActions>
                <Button
                  onClick={handleCloseHostManagement}
                  variant="outlined"
                  color="inherit"
                >
                  關閉
                </Button>
              </DialogActions>
            </Dialog>
          ) : null}
          {isHostInGame && isMobileGameViewport && hostManagementOpen && (
            <Drawer
              className="game-room-mobile-drawer-root game-room-mobile-drawer-root--host-manage lg:!hidden"
              anchor="bottom"
              open={hostManagementOpen}
              onClose={handleCloseHostManagement}
              ModalProps={GAME_ROOM_HOST_DRAWER_MODAL_PROPS}
              PaperProps={mobileHostManageDrawerPaperProps}
            >
              <div
                className="game-room-mobile-drawer-head game-room-mobile-drawer-head--scoreboard game-room-mobile-host-manage-head"
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
                <div className="game-room-mobile-host-manage-headline">
                  <div className="game-room-mobile-host-manage-title-group">
                    <Typography variant="subtitle2">房主管理</Typography>
                    <Typography variant="caption" className="text-slate-400">
                      {`可管理 ${hostManageParticipants.length} 位玩家`}
                    </Typography>
                  </div>
                  <button
                    type="button"
                    className="game-room-mobile-drawer-close game-room-mobile-drawer-close--icon game-room-mobile-host-manage-close"
                    onClick={handleCloseHostManagement}
                    aria-label="關閉房主管理"
                  >
                    <CloseRoundedIcon fontSize="inherit" />
                  </button>
                </div>
              </div>
              <div className="game-room-mobile-host-manage-body">
                {hostManagementPanelContent}
              </div>
            </Drawer>
          )}
          {isHostInGame && hostManagementConfirm ? (
            <ConfirmDialog
              open
              title={hostManagementConfirmText?.title ?? ""}
              description={hostManagementConfirmText?.description ?? ""}
              confirmLabel={hostManagementConfirmText?.confirmLabel ?? "確認"}
              cancelLabel="取消"
              onConfirm={handleConfirmHostManagementAction}
              onCancel={handleCancelHostManagementConfirm}
            />
          ) : null}
          {shouldShowGestureOverlay ? audioGestureOverlay : null}
          {isInitialCountdown ? startBroadcastOverlay : null}
          {exitConfirmOpen ? exitGameDialog : null}
          {isMobileGameViewport ? <FloatingChatWindow /> : null}
        </div>
      </div>
    </GameRoomDanmuProviderBridge>
  );
};

export default React.memo(GameRoomPage);
