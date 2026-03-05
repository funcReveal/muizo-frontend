import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
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
import GameRoomPlaybackPanel from "./components/gameRoomPage/GameRoomPlaybackPanel";
import {
  AudioGestureOverlayPortal,
  StartBroadcastOverlayPortal,
} from "./components/gameRoomPage/GameRoomPortalOverlays";
import {
  DANMU_LANE_COUNT,
  deferStateUpdate,
  extractYouTubeId,
  isDanmuCandidateMessage,
  isMobileDevice,
  SILENT_AUDIO_SRC,
  toDanmuText,
} from "./components/gameRoomPage/gameRoomPageUtils";
import type {
  DanmuItem,
} from "./components/gameRoomPage/gameRoomPageTypes";
import {
  buildScoreboardRows,
  sortParticipantsByScore,
} from "./components/gameRoomPage/gameRoomPageDerivations";
import useGameRoomPlayerSync from "./components/gameRoomPage/useGameRoomPlayerSync";
import useGameRoomAnswerFlow from "./components/gameRoomPage/useGameRoomAnswerFlow";
import useGameRoomRecaps from "./components/gameRoomPage/useGameRoomRecaps";
import useGameRoomStats from "./components/gameRoomPage/useGameRoomStats";
import useSettlementSnapshot from "./components/gameRoomPage/useSettlementSnapshot";
import useTopTwoSwapState from "./components/gameRoomPage/useTopTwoSwapState";
import type { SettlementQuestionRecap } from "./components/GameSettlementPanel";

interface GameRoomPageProps {
  room: RoomState["room"];
  gameState: GameState;
  playlist: PlaylistItem[];
  onExitGame: () => void;
  onBackToLobby?: () => void;
  onSubmitChoice: (choiceIndex: number) => Promise<SubmitAnswerResult>;
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

const GameRoomPage: React.FC<GameRoomPageProps> = ({
  room,
  gameState,
  playlist,
  onExitGame,
  onBackToLobby,
  onSubmitChoice,
  participants = [],
  meClientId,
  messages = [],
  messageInput = "",
  onMessageChange,
  onSendMessage,
  serverOffsetMs = 0,
  onSettlementRecapChange,
}) => {
  const [danmuEnabled, setDanmuEnabled] = useState(() => {
    const stored = localStorage.getItem("mq_danmu_enabled");
    if (stored === "1") return true;
    if (stored === "0") return false;
    return true;
  });
  const { gameVolume, setGameVolume, sfxEnabled, sfxVolume, sfxPreset } =
    useSfxSettings();
  const [danmuItems, setDanmuItems] = useState<DanmuItem[]>([]);
  const danmuSeenMessageIdsRef = useRef<Set<string>>(new Set());
  const danmuLaneCursorRef = useRef(0);
  const danmuTimersRef = useRef<number[]>([]);
  const requiresAudioGesture = useMemo(() => {
    if (typeof window === "undefined") return false;
    return isMobileDevice();
  }, []);
  const [nowMs, setNowMs] = useState(() => Date.now() + serverOffsetMs);
  const [showVideoOverride, setShowVideoOverride] = useState<boolean | null>(
    null,
  );
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  const { keyBindings } = useKeyBindings();
  const legacyClipWarningShownRef = useRef(false);
  const lastPreStartCountdownSfxKeyRef = useRef<string | null>(null);
  const lastGuessUrgencySfxKeyRef = useRef<string | null>(null);
  const lastCountdownGoSfxKeyRef = useRef<string | null>(null);
  const lastRevealResultSfxKeyRef = useRef<string | null>(null);
  const answerPanelRef = useRef<HTMLDivElement | null>(null);
  const lastAnswerPanelAutoScrollKeyRef = useRef<string | null>(null);
  const { primeSfxAudio, playGameSfx } = useGameSfx({
    enabled: sfxEnabled,
    volume: Math.round((sfxVolume * gameVolume) / 100),
    preset: sfxPreset,
  });

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(max-width: 1023px)").matches) return;
    if (gameState.status !== "playing") return;
    const nextKey = `${room.id}:${gameState.startedAt}`;
    if (lastAnswerPanelAutoScrollKeyRef.current === nextKey) return;

    const isTargetMostlyVisible = (target: HTMLElement) => {
      const rect = target.getBoundingClientRect();
      const viewportHeight =
        window.innerHeight || document.documentElement.clientHeight;
      const visibleTop = Math.max(0, rect.top);
      const visibleBottom = Math.min(viewportHeight, rect.bottom);
      const visibleHeight = Math.max(0, visibleBottom - visibleTop);
      const requiredVisibleHeight = Math.min(
        rect.height * 0.45,
        viewportHeight * 0.45,
      );
      return visibleHeight >= requiredVisibleHeight;
    };

    let timerId: number | null = null;
    let rafId1: number | null = null;
    let rafId2: number | null = null;
    let cancelled = false;

    rafId1 = window.requestAnimationFrame(() => {
      rafId2 = window.requestAnimationFrame(() => {
        timerId = window.setTimeout(() => {
          if (cancelled) return;
          const target = answerPanelRef.current;
          if (!target) return;
          if (!isTargetMostlyVisible(target)) {
            target.scrollIntoView({
              behavior: "smooth",
              block: "start",
              inline: "nearest",
            });
          }
          lastAnswerPanelAutoScrollKeyRef.current = nextKey;
        }, 90);
      });
    });

    return () => {
      cancelled = true;
      if (timerId !== null) {
        window.clearTimeout(timerId);
      }
      if (rafId1 !== null) {
        window.cancelAnimationFrame(rafId1);
      }
      if (rafId2 !== null) {
        window.cancelAnimationFrame(rafId2);
      }
    };
  }, [gameState.startedAt, gameState.status, room.id]);
  const clearDanmuTimers = useCallback(() => {
    danmuTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    danmuTimersRef.current = [];
  }, []);

  useEffect(() => {
    localStorage.setItem("mq_danmu_enabled", danmuEnabled ? "1" : "0");
  }, [danmuEnabled]);

  useEffect(() => {
    if (danmuEnabled) return;
    clearDanmuTimers();
    deferStateUpdate(() => {
      setDanmuItems([]);
    });
  }, [clearDanmuTimers, danmuEnabled]);

  useEffect(() => {
    danmuSeenMessageIdsRef.current.clear();
    danmuLaneCursorRef.current = 0;
    clearDanmuTimers();
    deferStateUpdate(() => {
      setDanmuItems([]);
    });
  }, [clearDanmuTimers, room.id]);

  useEffect(() => {
    if (!danmuEnabled || messages.length === 0) return;
    const unseenMessages: ChatMessage[] = [];
    for (let idx = messages.length - 1; idx >= 0; idx -= 1) {
      const message = messages[idx];
      if (danmuSeenMessageIdsRef.current.has(message.id)) break;
      danmuSeenMessageIdsRef.current.add(message.id);
      if (!isDanmuCandidateMessage(message)) {
        continue;
      }
      unseenMessages.push(message);
      if (unseenMessages.length >= 4) break;
    }
    if (unseenMessages.length === 0) return;

    unseenMessages.reverse().forEach((message, orderIdx) => {
      const lane = danmuLaneCursorRef.current % DANMU_LANE_COUNT;
      danmuLaneCursorRef.current += 1;
      const durationMs = 11800 + (lane % 3) * 900 + orderIdx * 180;
      const itemId = `${message.id}-${Date.now()}-${orderIdx}`;
      const nextItem: DanmuItem = {
        id: itemId,
        text: toDanmuText(message),
        lane,
        durationMs,
      };
      setDanmuItems((prev) => [...prev.slice(-24), nextItem]);
      const timerId = window.setTimeout(() => {
        setDanmuItems((prev) => prev.filter((item) => item.id !== itemId));
      }, durationMs + 320);
      danmuTimersRef.current.push(timerId);
    });
  }, [danmuEnabled, messages]);

  useEffect(
    () => () => {
      clearDanmuTimers();
    },
    [clearDanmuTimers],
  );

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
    "（未提供名稱）";

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
  const trackLoadKey = `${videoId ?? "none"}:${clipStartSec}-${clipEndSec}`;
  const trackSessionKey = `${gameState.startedAt}:${trackCursor}:${currentTrackIndex}`;
  const {
    audioUnlocked,
    isPlayerReady,
    loadedTrackKey,
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
  const canAnswerNow =
    gameState.status === "playing" &&
    gameState.phase === "guess" &&
    !waitingToStart &&
    !isReveal &&
    !isEnded &&
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
  const isTrackLoading = loadedTrackKey !== trackLoadKey;
  const showGuessMask = gameState.phase === "guess" && !isEnded && !waitingToStart;
  const showPreStartMask =
    waitingToStart &&
    !isEnded &&
    !shouldShowGestureOverlay;
  const showLoadingMask =
    isTrackLoading && !isReveal && !requiresAudioGesture && !waitingToStart;
  const shouldHideVideoFrame =
    shouldShowGestureOverlay || showPreStartMask || showLoadingMask || showGuessMask;
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

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement | null;
      if (active) {
        if (active.tagName === "TEXTAREA" || active.isContentEditable) {
          return;
        }
        if (active.tagName === "INPUT") {
          const input = active as HTMLInputElement;
          const type = (input.type || "text").toLowerCase();
          if (type !== "range") {
            return;
          }
        }
      }
      if (e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) return;
      if (!canAnswerNow) return;
      if (!gameState.choices?.length) return;

      const pressed = e.key.toUpperCase();
      const match = Object.entries(keyBindings).find(
        ([, key]) => key.toUpperCase() === pressed,
      );
      if (!match) return;

      const idx = Number(match[0]);
      const choice = gameState.choices[idx];
      if (!choice) return;
      e.preventDefault();
      submitChoiceWithFeedback(choice.index);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [
    currentTrackIndex,
    gameState.choices,
    gameState.phase,
    gameState.status,
    isEnded,
    isReveal,
    keyBindings,
    onSubmitChoice,
    shouldShowGestureOverlay,
    getServerNowMs,
    submitChoiceWithFeedback,
    waitingToStart,
    canAnswerNow,
  ]);

  const effectivePlayerVideoId = playerVideoId ?? videoId;
  const iframeSrc = effectivePlayerVideoId
    ? `https://www.youtube-nocookie.com/embed/${effectivePlayerVideoId}?autoplay=0&controls=0&fs=0&disablekb=1&modestbranding=1&iv_load_policy=3&enablejsapi=1&rel=0&playsinline=1`
    : null;
  const shouldShowVideo = showVideo;

  const phaseLabel = isEnded
    ? "已結束"
    : gameState.phase === "guess"
      ? "猜歌中"
      : "公布答案";

  const activePhaseDurationMs =
    gameState.phase === "guess"
      ? effectiveGuessDurationMs
      : gameState.revealDurationMs;
  const progressPct =
    phaseEndsAt === gameState.startedAt || activePhaseDurationMs <= 0
      ? 0
      : ((activePhaseDurationMs - phaseRemainingMs) / activePhaseDurationMs) *
      100;
  const isGuessUrgency =
    gameState.phase === "guess" &&
    !isInterTrackWait &&
    !isEnded &&
    phaseRemainingMs > 0 &&
    phaseRemainingMs <= 3000;
  const phaseCountdownSec =
    !isInterTrackWait &&
    !isEnded &&
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

  const playedQuestionCount = trackOrderLength || room.gameSettings?.questionCount || 0;
  const scoreboardRows = useMemo(
    () => buildScoreboardRows(sortedParticipants, meClientId),
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

  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = chatScrollRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [messages.length]);

  const exitGameDialog = (
    <Dialog open={exitConfirmOpen} onClose={closeExitConfirm}>
      <DialogTitle>退出遊戲？</DialogTitle>
      <DialogContent>
        <Typography variant="body2" className="text-slate-600">
          確定要放棄本局並返回房間列表嗎？
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={closeExitConfirm} variant="text">
          取消
        </Button>
        <Button onClick={handleExitConfirm} variant="contained" color="error">
          退出遊戲
        </Button>
      </DialogActions>
    </Dialog>
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
      <div className="game-room-grid grid w-full grid-cols-1 gap-3 lg:grid-cols-[400px_1fr] xl:grid-cols-[440px_1fr] lg:h-[calc(100vh-140px)] lg:items-stretch">
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
          chatScrollRef={chatScrollRef}
        />

        {/* 右側：播放區 + 答題區 */}
        <section className="flex min-h-0 flex-col gap-2 lg:h-full lg:overflow-hidden">
          <GameRoomPlaybackPanel
            roomName={room.name}
            boundedCursor={boundedCursor}
            trackOrderLength={trackOrderLength}
            onOpenExitConfirm={openExitConfirm}
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
          <GameRoomAnswerPanel
            answerPanelRef={answerPanelRef}
            isInitialCountdown={isInitialCountdown}
            countdownTone={countdownTone}
            startCountdownSec={startCountdownSec}
            isReveal={isReveal}
            revealTone={revealTone}
            isInterTrackWait={isInterTrackWait}
            phaseLabel={phaseLabel}
            phaseRemainingMs={phaseRemainingMs}
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
          />
        </section>
        {audioGestureOverlay}
        {startBroadcastOverlay}
        {exitGameDialog}
      </div>
    </div>
  );
};

export default GameRoomPage;


