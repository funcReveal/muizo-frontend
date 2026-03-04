import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Switch,
  Typography,
} from "@mui/material";
import type {
  ChatMessage,
  GameState,
  PlaylistItem,
  QuestionScoreBreakdown,
  RoomParticipant,
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
import type {
  SettlementQuestionRecap,
  SettlementQuestionResult,
} from "./components/GameSettlementPanel";

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

const extractYouTubeId = (
  url: string | null | undefined,
  fallbackId?: string | null,
): string | null => {
  if (fallbackId) return fallbackId;
  if (!url) return null;
  const raw = url.trim();
  if (!raw) return null;
  const parseUrl = (value: string) => {
    const parsed = new URL(value);
    const vid = parsed.searchParams.get("v");
    if (vid) return vid;
    const segments = parsed.pathname.split("/").filter(Boolean);
    return segments.pop() || null;
  };
  try {
    return parseUrl(raw);
  } catch {
    try {
      return parseUrl(`https://${raw}`);
    } catch {
      const match =
        raw.match(/[?&]v=([^&]+)/) ||
        raw.match(/youtu\.be\/([^?&]+)/) ||
        raw.match(/youtube\.com\/embed\/([^?&]+)/);
      return match?.[1] ?? null;
    }
  }
};

const createSilentWavDataUri = (durationSec: number) => {
  if (typeof window === "undefined" || typeof btoa !== "function") {
    return "data:audio/wav;base64,UklGRjQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YRAAAAAAAAAAAAAAAAAAAAAAAAAA";
  }
  const safeDurationSec = Math.max(0.25, Math.min(10, durationSec));
  const sampleRate = 8000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const frameCount = Math.max(1, Math.floor(sampleRate * safeDurationSec));
  const dataSize = frameCount * numChannels * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeAscii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) {
      view.setUint8(offset + i, text.charCodeAt(i));
    }
  };

  writeAscii(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(8, "WAVE");
  writeAscii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
  view.setUint16(32, numChannels * bytesPerSample, true);
  view.setUint16(34, bitsPerSample, true);
  writeAscii(36, "data");
  view.setUint32(40, dataSize, true);
  // PCM silence is already zero-filled by ArrayBuffer.

  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return `data:audio/wav;base64,${btoa(binary)}`;
};

const SILENT_AUDIO_SRC = createSilentWavDataUri(2);

const collectAnsweredClientIds = (
  lockedOrder?: string[],
  lockedClientIds?: string[],
  answerOrderLatest?: string[],
  answersByClientId?: Record<
    string,
    {
      choiceIndex?: number | null;
      answeredAtMs?: number | null;
      firstAnsweredAtMs?: number | null;
      changedAnswerCount?: number;
    }
  >,
 ) => {
  if (Array.isArray(answerOrderLatest) && answerOrderLatest.length > 0) {
    const unique: string[] = [];
    const seen = new Set<string>();
    answerOrderLatest.forEach((clientId) => {
      if (!clientId || seen.has(clientId)) return;
      seen.add(clientId);
      unique.push(clientId);
    });
    if (unique.length > 0) {
      return unique;
    }
  }

  if (answersByClientId && typeof answersByClientId === "object") {
    const baseOrder = [...(lockedOrder ?? []), ...(lockedClientIds ?? [])];
    const baseIndexMap = new Map<string, number>();
    baseOrder.forEach((clientId, idx) => {
      if (!clientId || baseIndexMap.has(clientId)) return;
      baseIndexMap.set(clientId, idx);
    });
    const rows = Object.entries(answersByClientId)
      .map(([clientId, answer]) => {
        const hasChoice = typeof answer?.choiceIndex === "number";
        const answeredAtMs =
          typeof answer?.answeredAtMs === "number" && Number.isFinite(answer.answeredAtMs)
            ? answer.answeredAtMs
            : null;
        const firstAnsweredAtMs =
          typeof answer?.firstAnsweredAtMs === "number" &&
          Number.isFinite(answer.firstAnsweredAtMs)
            ? answer.firstAnsweredAtMs
            : null;
        return {
          clientId,
          hasChoice,
          answeredAtMs,
          firstAnsweredAtMs,
          baseOrder: baseIndexMap.get(clientId) ?? Number.MAX_SAFE_INTEGER,
        };
      })
      .filter((row) => row.clientId && (row.hasChoice || row.answeredAtMs !== null));

    if (rows.length > 0) {
      rows.sort((a, b) => {
        const aTs = a.answeredAtMs ?? a.firstAnsweredAtMs ?? Number.MAX_SAFE_INTEGER;
        const bTs = b.answeredAtMs ?? b.firstAnsweredAtMs ?? Number.MAX_SAFE_INTEGER;
        if (aTs !== bTs) return aTs - bTs;
        if (a.baseOrder !== b.baseOrder) return a.baseOrder - b.baseOrder;
        return a.clientId.localeCompare(b.clientId);
      });
      return rows.map((row) => row.clientId);
    }
  }

  const ordered = [...(lockedOrder ?? []), ...(lockedClientIds ?? [])];
  const unique: string[] = [];
  const seen = new Set<string>();
  ordered.forEach((clientId) => {
    if (!clientId || seen.has(clientId)) return;
    seen.add(clientId);
    unique.push(clientId);
  });
  return unique;
};

const buildScoreBaselineMap = (rows: RoomParticipant[]) =>
  rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.clientId] = row.score;
    return acc;
  }, {});

const MAX_DANMU_TEXT_LENGTH = 56;
const DANMU_LANE_COUNT = 6;
const MOBILE_UA_PATTERN = /Android|iPhone|iPad|iPod|Mobile/i;

const isMobileDevice = () => {
  if (typeof navigator === "undefined") return false;
  const legacyNavigator = navigator as Navigator & {
    msMaxTouchPoints?: number;
  };
  const ua = navigator.userAgent || "";
  const isMobileUa = MOBILE_UA_PATTERN.test(ua);
  const isIpadDesktopUa =
    navigator.platform === "MacIntel" &&
    (navigator.maxTouchPoints > 1 || (legacyNavigator.msMaxTouchPoints ?? 0) > 1);
  return isMobileUa || isIpadDesktopUa;
};

const isDanmuCandidateMessage = (message: ChatMessage) => {
  const text = message.content?.trim() ?? "";
  if (!text) return false;
  const username = message.username?.trim().toLowerCase() ?? "";
  const userId = message.userId?.trim().toLowerCase() ?? "";
  if (!username || !userId) return true;
  if (username === "system" || username === "系統") return false;
  if (userId === "system" || userId === "sys") return false;
  return true;
};

const toDanmuText = (message: ChatMessage) => {
  const compactContent = message.content
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_DANMU_TEXT_LENGTH);
  return `${message.username}: ${compactContent || "..."}`;
};

const deferStateUpdate = (callback: () => void) => {
  if (typeof queueMicrotask === "function") {
    queueMicrotask(callback);
    return;
  }
  void Promise.resolve().then(callback);
};

type DanmuItem = {
  id: string;
  text: string;
  lane: number;
  durationMs: number;
};

type FrozenSettlementSnapshot = {
  roundKey: string;
  startedAt: number;
  endedAt: number;
  room: RoomState["room"];
  participants: RoomParticipant[];
  messages: ChatMessage[];
  playlistItems: PlaylistItem[];
  trackOrder: number[];
  playedQuestionCount: number;
  questionRecaps: SettlementQuestionRecap[];
};

type ChoiceCommitFxKind = "lock" | "reselect";

type AnswerDecisionMeta = {
  trackSessionKey: string;
  firstChoiceIndex: number | null;
  firstSubmittedAtMs: number | null;
  hasChangedChoice: boolean;
};

const DECISION_BONUS_TIERS = [
  { maxElapsedMs: 2000, points: 20 },
  { maxElapsedMs: 5000, points: 10 },
] as const;

const resolveDecisionBonusPreviewPoints = (firstAnswerElapsedMs: number | null) => {
  if (firstAnswerElapsedMs === null || firstAnswerElapsedMs < 0) return 0;
  for (const tier of DECISION_BONUS_TIERS) {
    if (firstAnswerElapsedMs <= tier.maxElapsedMs) {
      return tier.points;
    }
  }
  return 0;
};

type FeedbackTone = "neutral" | "locked" | "correct" | "wrong";

type MyFeedbackModel = {
  tone: FeedbackTone;
  title: string;
  detail: string;
  badges: string[];
  pillText?: string;
  lines?: string[];
  inlineMeta?: string;
};

const buildScoreBreakdownLines = (breakdown: QuestionScoreBreakdown): string[] => {
  const parts: string[] = [
    `基${breakdown.basePoints}`,
    `速${breakdown.speedBonusPoints}`,
  ];
  if (breakdown.decisionBonusPoints > 0) {
    parts.push(`決${breakdown.decisionBonusPoints}`);
  }
  if (breakdown.difficultyBonusPoints > 0) {
    parts.push(`難${breakdown.difficultyBonusPoints}`);
  }
  if (breakdown.comboBonusPoints > 0) {
    parts.push(`連${breakdown.comboBonusPoints}`);
  }
  return [`${parts.join("+")}=${breakdown.totalGainPoints}`];
};

const cloneSettlementQuestionRecaps = (recaps: SettlementQuestionRecap[]) =>
  recaps.map((recap) => ({
    ...recap,
    choices: recap.choices.map((choice) => ({ ...choice })),
  }));

const cloneRoomForSettlement = (room: RoomState["room"]): RoomState["room"] => ({
  ...room,
  gameSettings: room.gameSettings ? { ...room.gameSettings } : undefined,
  playlist: {
    ...room.playlist,
    items: room.playlist.items.map((item) => ({ ...item })),
  },
});

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
  const [questionRecaps, setQuestionRecaps] = useState<SettlementQuestionRecap[]>(
    [],
  );
  const [endedSnapshot, setEndedSnapshot] = useState<FrozenSettlementSnapshot | null>(
    null,
  );
  const recapCapturedTrackSessionKeysRef = useRef<Set<string>>(new Set());
  const requiresAudioGesture = useMemo(() => {
    if (typeof window === "undefined") return false;
    return isMobileDevice();
  }, []);
  const [audioUnlocked, setAudioUnlocked] = useState(() => !requiresAudioGesture);
  const audioUnlockedRef = useRef(!requiresAudioGesture);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now() + serverOffsetMs);
  const playerStartRef = useRef(0);
  const [showVideoOverride, setShowVideoOverride] = useState<boolean | null>(
    null,
  );
  const [selectedChoiceState, setSelectedChoiceState] = useState<{
    trackIndex: number;
    choiceIndex: number | null;
  }>({ trackIndex: -1, choiceIndex: null });
  const [pendingChoiceState, setPendingChoiceState] = useState<{
    trackSessionKey: string;
    choiceIndex: number | null;
    requestId: number;
  } | null>(null);
  const [answerDecisionMeta, setAnswerDecisionMeta] = useState<AnswerDecisionMeta>({
    trackSessionKey: "",
    firstChoiceIndex: null,
    firstSubmittedAtMs: null,
    hasChangedChoice: false,
  });
  const [choiceCommitFxState, setChoiceCommitFxState] = useState<{
    trackSessionKey: string;
    choiceIndex: number;
    kind: ChoiceCommitFxKind;
    key: number;
  } | null>(null);
  const [loadedTrackKey, setLoadedTrackKey] = useState<string | null>(null);
  const [playerVideoId, setPlayerVideoId] = useState<string | null>(null);
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  const { keyBindings } = useKeyBindings();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const hasStartedPlaybackRef = useRef(false);
  const playerReadyRef = useRef(false);
  const lastSyncMsRef = useRef<number>(0);
  const lastTrackLoadKeyRef = useRef<string | null>(null);
  const lastLoadedVideoIdRef = useRef<string | null>(null);
  const lastTrackSessionRef = useRef<string | null>(null);
  const lastPassiveResumeRef = useRef<number>(0);
  const resumeNeedsSyncRef = useRef(false);
  const resumeResyncTimerRef = useRef<number | null>(null);
  const resyncTimersRef = useRef<number[]>([]);
  const initialResyncTimersRef = useRef<number[]>([]);
  const initialResyncScheduledRef = useRef(false);
  const lastTimeRequestAtMsRef = useRef<number>(0);
  const lastPlayerStateRef = useRef<number | null>(null);
  const silentAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastPlayerTimeSecRef = useRef<number | null>(null);
  const lastPlayerTimeAtMsRef = useRef<number>(0);
  const lastTimeRequestReasonRef = useRef("init");
  const guessLoopSpanRef = useRef<number | null>(null);
  const legacyClipWarningShownRef = useRef(false);
  const lastPreStartCountdownSfxKeyRef = useRef<string | null>(null);
  const lastGuessUrgencySfxKeyRef = useRef<string | null>(null);
  const lastCountdownGoSfxKeyRef = useRef<string | null>(null);
  const lastRevealResultSfxKeyRef = useRef<string | null>(null);
  const lastTopTwoOrderRef = useRef<[string | null, string | null]>([null, null]);
  const topTwoSwapTimerRef = useRef<number | null>(null);
  const choiceCommitFxTimerRef = useRef<number | null>(null);
  const answerPanelRef = useRef<HTMLDivElement | null>(null);
  const lastAnswerPanelAutoScrollKeyRef = useRef<string | null>(null);
  const submitRequestSeqRef = useRef(0);
  const [topTwoSwapState, setTopTwoSwapState] = useState<{
    firstClientId: string;
    secondClientId: string;
    key: number;
  } | null>(null);
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
  const revealReplayRef = useRef(false);
  const lastRevealStartKeyRef = useRef<string | null>(null);
  const PLAYER_ID = "mq-main-player";
  const DRIFT_TOLERANCE_SEC = 1;
  const RESUME_DRIFT_TOLERANCE_SEC = 1.2;
  const WATCHDOG_DRIFT_TOLERANCE_SEC = 1.2;
  const WATCHDOG_REQUEST_INTERVAL_MS = 1000;
  const UI_CLOCK_TICK_MS = 100;
  const MEDIA_SESSION_REFRESH_MS = 250;
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
      const durationMs = 7600 + (lane % 3) * 700 + orderIdx * 120;
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

  const markAudioUnlocked = useCallback(() => {
    if (audioUnlockedRef.current) return;
    audioUnlockedRef.current = true;
    setAudioUnlocked(true);
  }, []);
  useEffect(
    () => () => {
      if (choiceCommitFxTimerRef.current !== null) {
        window.clearTimeout(choiceCommitFxTimerRef.current);
      }
      if (topTwoSwapTimerRef.current !== null) {
        window.clearTimeout(topTwoSwapTimerRef.current);
      }
    },
    [],
  );
  useEffect(() => {
    lastSyncMsRef.current = Date.now() + serverOffsetMs;
  }, [serverOffsetMs]);
  const postPlayerMessage = useCallback(
    (payload: Record<string, unknown>, logLabel: string) => {
      try {
        const frame = iframeRef.current;
        if (!frame || !frame.isConnected) return false;
        const target = frame.contentWindow;
        if (!target) return false;
        target.postMessage(JSON.stringify(payload), "*");
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.toLowerCase().includes("disconnected port")) {
          return false;
        }
        console.error(`${logLabel} failed`, err);
        return false;
      }
    },
    [],
  );
  const applyVolume = useCallback(
    (val: number) => {
      const safeVolume = Math.min(100, Math.max(0, val));
      postPlayerMessage(
        {
          event: "command",
          func: "setVolume",
          args: [safeVolume],
        },
        "setVolume",
      );
    },
    [postPlayerMessage],
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
  const revealDurationSec = Math.max(0, gameState.revealDurationMs / 1000);
  const revealStartAt = gameState.revealEndsAt - gameState.revealDurationMs;
  const clipLengthSec = Math.max(0.01, clipEndSec - clipStartSec);

  const computeServerPositionSec = useCallback(() => {
    const elapsed = Math.max(
      0,
      (getServerNowMs() - gameState.startedAt) / 1000,
    );
    const loopSpan = guessLoopSpanRef.current;
    if (gameState.phase === "guess" && loopSpan && loopSpan > 0.01) {
      const offset = elapsed % loopSpan;
      return Math.min(clipEndSec, clipStartSec + offset);
    }
    return Math.min(clipEndSec, clipStartSec + elapsed);
  }, [clipEndSec, clipStartSec, gameState.phase, gameState.startedAt, getServerNowMs]);
  const computeRevealPositionSec = useCallback(() => {
    const elapsed = Math.max(0, (getServerNowMs() - revealStartAt) / 1000);
    const effectiveElapsed =
      revealDurationSec > 0 ? Math.min(elapsed, revealDurationSec) : elapsed;
    const offset = clipLengthSec > 0 ? effectiveElapsed % clipLengthSec : 0;
    return Math.min(clipEndSec, clipStartSec + offset);
  }, [
    clipEndSec,
    clipLengthSec,
    clipStartSec,
    getServerNowMs,
    revealDurationSec,
    revealStartAt,
  ]);
  const getDesiredPositionSec = useCallback(() => {
    if (revealReplayRef.current) {
      return computeRevealPositionSec();
    }
    return computeServerPositionSec();
  }, [computeRevealPositionSec, computeServerPositionSec]);
  const getEstimatedLocalPositionSec = useCallback(() => {
    const elapsed = (getServerNowMs() - lastSyncMsRef.current) / 1000;
    return Math.min(clipEndSec, Math.max(0, playerStartRef.current + elapsed));
  }, [clipEndSec, getServerNowMs]);

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
  const confirmedChoice =
    selectedChoiceState.trackIndex === currentTrackIndex
      ? selectedChoiceState.choiceIndex
      : null;
  const pendingChoice =
    pendingChoiceState?.trackSessionKey === trackSessionKey
      ? pendingChoiceState.choiceIndex
      : null;
  const selectedChoice = pendingChoice ?? confirmedChoice;
  const [answeredOrderSnapshot, setAnsweredOrderSnapshot] = useState<{
    trackSessionKey: string;
    order: string[];
  }>(() => ({
    trackSessionKey,
    order: collectAnsweredClientIds(
      gameState.lockedOrder,
      gameState.lockedClientIds,
      gameState.questionStats?.answerOrderLatest,
      gameState.questionStats?.answersByClientId,
    ),
  }));
  const [scoreBaselineState, setScoreBaselineState] = useState<{
    trackSessionKey: string;
    byClientId: Record<string, number>;
  }>(() => ({
    trackSessionKey,
    byClientId: buildScoreBaselineMap(participants),
  }));
  const isTrackLoading = loadedTrackKey !== trackLoadKey;
  const shouldShowGestureOverlay =
    !isEnded && requiresAudioGesture && !audioUnlocked;
  const canAnswerNow =
    gameState.status === "playing" &&
    gameState.phase === "guess" &&
    !waitingToStart &&
    !isReveal &&
    !isEnded &&
    !shouldShowGestureOverlay;
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

  useEffect(() => {
    recapCapturedTrackSessionKeysRef.current.clear();
    lastTopTwoOrderRef.current = [null, null];
    if (topTwoSwapTimerRef.current !== null) {
      window.clearTimeout(topTwoSwapTimerRef.current);
      topTwoSwapTimerRef.current = null;
    }
    deferStateUpdate(() => {
      setTopTwoSwapState(null);
    });
    deferStateUpdate(() => {
      setQuestionRecaps([]);
    });
  }, [room.id]);

  useEffect(() => {
    if (gameState.status !== "playing") return;
    if (gameState.phase !== "guess") return;
    if (!waitingToStart || trackCursor !== 0) return;
    recapCapturedTrackSessionKeysRef.current.clear();
    lastTopTwoOrderRef.current = [null, null];
    if (topTwoSwapTimerRef.current !== null) {
      window.clearTimeout(topTwoSwapTimerRef.current);
      topTwoSwapTimerRef.current = null;
    }
    deferStateUpdate(() => {
      setTopTwoSwapState(null);
    });
    deferStateUpdate(() => {
      setQuestionRecaps([]);
    });
  }, [gameState.phase, gameState.status, trackCursor, waitingToStart]);

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
    deferStateUpdate(() => {
      setAnsweredOrderSnapshot((prev) => {
        const incoming = collectAnsweredClientIds(
          gameState.lockedOrder,
          gameState.lockedClientIds,
          gameState.questionStats?.answerOrderLatest,
          gameState.questionStats?.answersByClientId,
        );
        if (prev.trackSessionKey !== trackSessionKey) {
          return {
            trackSessionKey,
            order: incoming,
          };
        }
        if (gameState.phase === "guess") {
          if (
            incoming.length === prev.order.length &&
            incoming.every((clientId, idx) => clientId === prev.order[idx])
          ) {
            return prev;
          }
          return {
            trackSessionKey: prev.trackSessionKey,
            order: incoming,
          };
        }
        if (incoming.length === 0) {
          return prev;
        }
        const nextOrder = [...prev.order];
        const seen = new Set(nextOrder);
        let changed = false;
        incoming.forEach((clientId) => {
          if (seen.has(clientId)) return;
          seen.add(clientId);
          nextOrder.push(clientId);
          changed = true;
        });
        if (!changed) {
          return prev;
        }
        return {
          trackSessionKey: prev.trackSessionKey,
          order: nextOrder,
        };
      });
    });
  }, [
    gameState.lockedClientIds,
    gameState.lockedOrder,
    gameState.questionStats?.answerOrderLatest,
    gameState.questionStats?.answersByClientId,
    gameState.phase,
    trackSessionKey,
  ]);

  useEffect(() => {
    if (!meClientId) return;
    const serverAnswer = gameState.questionStats?.answersByClientId?.[meClientId];
    if (!serverAnswer) return;
    const resolvedChoiceIndex =
      typeof serverAnswer.choiceIndex === "number" ? serverAnswer.choiceIndex : null;
    deferStateUpdate(() => {
      setSelectedChoiceState((prev) => {
        if (
          prev.trackIndex === currentTrackIndex &&
          prev.choiceIndex === resolvedChoiceIndex
        ) {
          return prev;
        }
        return {
          trackIndex: currentTrackIndex,
          choiceIndex: resolvedChoiceIndex,
        };
      });
      setPendingChoiceState((prev) =>
        prev?.trackSessionKey === trackSessionKey ? null : prev,
      );
    });
  }, [
    currentTrackIndex,
    gameState.questionStats?.answersByClientId,
    meClientId,
    trackSessionKey,
  ]);

  useEffect(() => {
    deferStateUpdate(() => {
      setScoreBaselineState((prev) => {
        if (prev.trackSessionKey !== trackSessionKey) {
          return {
            trackSessionKey,
            byClientId: buildScoreBaselineMap(participants),
          };
        }
        let changed = false;
        const nextByClientId = { ...prev.byClientId };
        participants.forEach((participant) => {
          if (nextByClientId[participant.clientId] !== undefined) return;
          nextByClientId[participant.clientId] = participant.score;
          changed = true;
        });
        if (!changed) {
          return prev;
        }
        return {
          trackSessionKey: prev.trackSessionKey,
          byClientId: nextByClientId,
        };
      });
    });
  }, [participants, trackSessionKey]);

  useEffect(() => {
    guessLoopSpanRef.current = null;
  }, [trackLoadKey, trackSessionKey]);

  useEffect(() => {
    let cancelled = false;
    deferStateUpdate(() => {
      if (cancelled) return;
      setAnswerDecisionMeta({
        trackSessionKey,
        firstChoiceIndex: null,
        firstSubmittedAtMs: null,
        hasChangedChoice: false,
      });
    });
    if (choiceCommitFxTimerRef.current !== null) {
      window.clearTimeout(choiceCommitFxTimerRef.current);
      choiceCommitFxTimerRef.current = null;
    }
    deferStateUpdate(() => {
      if (cancelled) return;
      setChoiceCommitFxState(null);
    });
    deferStateUpdate(() => {
      if (cancelled) return;
      setPendingChoiceState(null);
    });
    return () => {
      cancelled = true;
    };
  }, [trackSessionKey]);

  const postCommand = useCallback(
    (func: string, args: unknown[] = []) => {
      postPlayerMessage(
        {
          event: "command",
          func,
          args,
          id: PLAYER_ID,
        },
        func,
      );
    },
    [postPlayerMessage],
  );
  const requestPlayerTime = useCallback(
    (reason: string) => {
      if (!playerReadyRef.current) return;
      lastTimeRequestReasonRef.current = reason;
      lastTimeRequestAtMsRef.current = getServerNowMs();
      postCommand("getCurrentTime");
    },
    [getServerNowMs, postCommand],
  );
  const getFreshPlayerTimeSec = useCallback(() => {
    const nowMs = getServerNowMs();
    if (nowMs - lastPlayerTimeAtMsRef.current > 2000) return null;
    return lastPlayerTimeSecRef.current;
  }, [getServerNowMs]);

  const updateMediaSession = useCallback(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator))
      return;
    if (typeof MediaMetadata === "undefined") return;
    try {
      const silentAudio = silentAudioRef.current;
      const hasSilentAudioSession =
        requiresAudioGesture &&
        audioUnlockedRef.current &&
        !!silentAudio &&
        !silentAudio.paused;
      navigator.mediaSession.metadata = new MediaMetadata({
        title: "Muizo",
        artist: "Music Quiz",
        album: "Competitive Audio Mode",
      });
      navigator.mediaSession.playbackState =
        hasSilentAudioSession ? "playing" : isEnded ? "paused" : "playing";
    } catch (err) {
      console.error("mediaSession setup failed", err);
    }
  }, [isEnded, requiresAudioGesture]);

  const startSilentAudio = useCallback(() => {
    const audio = silentAudioRef.current;
    if (!audio) return;
    audio.loop = true;
    audio.preload = "auto";
    // Keep this track "active" to take over media session metadata.
    audio.muted = false;
    audio.volume = 1;
    updateMediaSession();
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {
        // Keep overriding media metadata even if autoplay is blocked.
        updateMediaSession();
      });
    }
    window.setTimeout(() => {
      updateMediaSession();
    }, 300);
  }, [updateMediaSession]);

  const stopSilentAudio = useCallback(() => {
    const audio = silentAudioRef.current;
    if (!audio) return;
    try {
      audio.pause();
      audio.currentTime = 0;
    } catch (err) {
      console.error("Failed to stop silent audio", err);
    }
  }, []);

  const loadTrack = useCallback(
    (
      id: string,
      startSeconds: number,
      endSeconds: number | undefined,
      autoplay: boolean,
    ) => {
      const payload = {
        videoId: id,
        startSeconds,
        ...(typeof endSeconds === "number" ? { endSeconds } : {}),
      };
      postCommand(autoplay ? "loadVideoById" : "cueVideoById", [payload]);
      lastLoadedVideoIdRef.current = id;
      lastSyncMsRef.current = getServerNowMs();
      if (!autoplay) {
        postCommand("pauseVideo");
        postCommand("seekTo", [startSeconds, true]);
      }
    },
    [getServerNowMs, postCommand],
  );

  const startPlayback = useCallback(
    (forcedPosition?: number, forceSeek = false) => {
      if (requiresAudioGesture && !audioUnlockedRef.current) return;
      const serverNowMs = getServerNowMs();
      if (serverNowMs < gameState.startedAt) return;
      const rawStartPos = forcedPosition ?? getDesiredPositionSec();
      const startPos = Math.min(
        clipEndSec,
        Math.max(clipStartSec, rawStartPos),
      );
      const estimated = getEstimatedLocalPositionSec();
      const needsSeek =
        forceSeek || Math.abs(estimated - startPos) > DRIFT_TOLERANCE_SEC;
      if (Math.abs(playerStartRef.current - startPos) > 0.01) {
        playerStartRef.current = startPos;
      }
      lastSyncMsRef.current = serverNowMs;

      if (needsSeek) {
        postCommand("seekTo", [startPos, true]);
      }
      startSilentAudio();
      postCommand("playVideo");
      postCommand("unMute");
      applyVolume(gameVolume);
    },
    [
      applyVolume,
      clipEndSec,
      clipStartSec,
      getEstimatedLocalPositionSec,
      getDesiredPositionSec,
      getServerNowMs,
      gameState.startedAt,
      postCommand,
      requiresAudioGesture,
      startSilentAudio,
      gameVolume,
    ],
  );
  const unlockAudioAndStart = useCallback(() => {
    if (!playerReadyRef.current) {
      return false;
    }
    primeSfxAudio();
    if (!audioUnlockedRef.current) {
      markAudioUnlocked();
    }
    startSilentAudio();
    const serverNow = getServerNowMs();
    if (serverNow < gameState.startedAt) {
      // Prime autoplay permission during user gesture before round start.
      postCommand("seekTo", [clipStartSec, true]);
      postCommand("playVideo");
      window.setTimeout(() => {
        postCommand("pauseVideo");
        postCommand("seekTo", [clipStartSec, true]);
      }, 120);
      return true;
    }
    startPlayback();
    return true;
  }, [
    clipStartSec,
    gameState.startedAt,
    getServerNowMs,
    markAudioUnlocked,
    postCommand,
    primeSfxAudio,
    startPlayback,
    startSilentAudio,
  ]);
  const handleGestureOverlayTrigger = useCallback((event?: React.SyntheticEvent) => {
    event?.preventDefault();
    event?.stopPropagation();
    primeSfxAudio();
    unlockAudioAndStart();
  }, [primeSfxAudio, unlockAudioAndStart]);

  const syncToServerPosition = useCallback(
    (
      _reason: string,
      forceSeek = false,
      toleranceSec = RESUME_DRIFT_TOLERANCE_SEC,
      requirePlayerTime = false,
    ) => {
      const serverPosition = getDesiredPositionSec();
      const playerTime = getFreshPlayerTimeSec();
      if (requirePlayerTime && playerTime === null) {
        return false;
      }
      const estimated = playerTime ?? getEstimatedLocalPositionSec();
      const drift = Math.abs(estimated - serverPosition);
      const shouldSeek =
        drift > toleranceSec || (forceSeek && playerTime === null);
      if (shouldSeek) {
        startPlayback(serverPosition, true);
        return true;
      }
      playerStartRef.current = serverPosition;
      lastSyncMsRef.current = getServerNowMs();
      postCommand("playVideo");
      applyVolume(gameVolume);
      return false;
    },
    [
      applyVolume,
      getEstimatedLocalPositionSec,
      getDesiredPositionSec,
      getFreshPlayerTimeSec,
      getServerNowMs,
      postCommand,
      startPlayback,
      gameVolume,
    ],
  );

  const scheduleResumeResync = useCallback(() => {
    if (resumeResyncTimerRef.current !== null) {
      window.clearTimeout(resumeResyncTimerRef.current);
      resumeResyncTimerRef.current = null;
    }
    resyncTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    resyncTimersRef.current = [];
    const checkpoints = [150, 650, 1200];
    checkpoints.forEach((delayMs) => {
      const timerId = window.setTimeout(() => {
        if (!playerReadyRef.current) return;
        if (document.visibilityState !== "visible") return;
        if (getServerNowMs() < gameState.startedAt) return;
        requestPlayerTime(`resume-${delayMs}`);
        window.setTimeout(() => {
          syncToServerPosition(
            `resume-check-${delayMs}`,
            false,
            RESUME_DRIFT_TOLERANCE_SEC,
            true,
          );
        }, 120);
      }, delayMs);
      resyncTimersRef.current.push(timerId);
    });
  }, [
    getServerNowMs,
    gameState.startedAt,
    requestPlayerTime,
    syncToServerPosition,
  ]);

  const scheduleInitialResync = useCallback(() => {
    if (initialResyncScheduledRef.current) return;
    initialResyncScheduledRef.current = true;
    initialResyncTimersRef.current.forEach((timerId) =>
      window.clearTimeout(timerId),
    );
    initialResyncTimersRef.current = [];
    const checkpoints = [1000, 2000, 3000, 4000, 5000];
    checkpoints.forEach((delayMs, idx) => {
      const timerId = window.setTimeout(() => {
        if (!playerReadyRef.current) return;
        if (document.visibilityState !== "visible") return;
        if (getServerNowMs() < gameState.startedAt) return;
        requestPlayerTime(`initial-${idx + 1}`);
        window.setTimeout(() => {
          syncToServerPosition(`initial-check-${idx + 1}`, false, 0.8, true);
        }, 120);
      }, delayMs);
      initialResyncTimersRef.current.push(timerId);
    });
  }, [
    getServerNowMs,
    gameState.startedAt,
    requestPlayerTime,
    syncToServerPosition,
  ]);

  useEffect(() => {
    return () => {
      if (resumeResyncTimerRef.current !== null) {
        window.clearTimeout(resumeResyncTimerRef.current);
      }
      resyncTimersRef.current.forEach((timerId) =>
        window.clearTimeout(timerId),
      );
      initialResyncTimersRef.current.forEach((timerId) =>
        window.clearTimeout(timerId),
      );
      stopSilentAudio();
    };
  }, [stopSilentAudio]);

  useEffect(() => {
    const uiClock = window.setInterval(() => {
      setNowMs(getServerNowMs());
    }, UI_CLOCK_TICK_MS);
    return () => window.clearInterval(uiClock);
  }, [UI_CLOCK_TICK_MS, getServerNowMs]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = getServerNowMs();
      updateMediaSession();
      if (
        resumeNeedsSyncRef.current &&
        playerReadyRef.current &&
        now >= gameState.startedAt
      ) {
        if (document.visibilityState !== "visible") {
          return;
        }
        resumeNeedsSyncRef.current = false;
        requestPlayerTime("interval-resume");
        return;
      }
      if (
        playerReadyRef.current &&
        now >= gameState.startedAt &&
        lastPlayerStateRef.current !== 1
      ) {
        startPlayback();
      }
      if (
        playerReadyRef.current &&
        hasStartedPlaybackRef.current &&
        now >= gameState.startedAt &&
        now - lastTimeRequestAtMsRef.current >= WATCHDOG_REQUEST_INTERVAL_MS
      ) {
        requestPlayerTime("watchdog");
      }
    }, 500);
    return () => clearInterval(interval);
  }, [
    getServerNowMs,
    gameState.startedAt,
    requestPlayerTime,
    startPlayback,
    updateMediaSession,
  ]);

  useEffect(() => {
    applyVolume(gameVolume);
  }, [applyVolume, gameVolume]);

  useEffect(() => {
    // Keep silent audio active through the settlement transition on iOS/Safari,
    // otherwise the system media panel may fall back to the iframe title.
    if (!isEnded) return;
    updateMediaSession();
  }, [isEnded, updateMediaSession]);

  useEffect(() => {
    if (!requiresAudioGesture || !audioUnlocked) return;
    const timer = window.setInterval(() => {
      updateMediaSession();
    }, MEDIA_SESSION_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [
    MEDIA_SESSION_REFRESH_MS,
    audioUnlocked,
    requiresAudioGesture,
    updateMediaSession,
  ]);

  useEffect(() => {
    if (isEnded) return;
    if (requiresAudioGesture && !audioUnlockedRef.current) return;
    startSilentAudio();
  }, [
    audioUnlocked,
    currentTrackIndex,
    gameState.phase,
    gameState.startedAt,
    isEnded,
    requiresAudioGesture,
    startSilentAudio,
  ]);

  useEffect(() => {
    applyVolume(gameVolume);
  }, [applyVolume, currentTrackIndex, gameState.startedAt, gameVolume]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator))
      return;
    if (typeof MediaMetadata === "undefined") return;
    try {
      const noop = () => { };
      const handleMediaSeek = () => {
        resumeNeedsSyncRef.current = true;
        requestPlayerTime("media-seek");
        window.setTimeout(() => {
          syncToServerPosition("media-seek");
          scheduleResumeResync();
        }, 120);
      };
      const actions: Array<MediaSessionAction> = [
        "play",
        "pause",
        "stop",
        "seekbackward",
        "seekforward",
        "seekto",
        "previoustrack",
        "nexttrack",
      ];
      actions.forEach((action) => {
        try {
          if (
            action === "seekbackward" ||
            action === "seekforward" ||
            action === "seekto"
          ) {
            navigator.mediaSession.setActionHandler(action, handleMediaSeek);
          } else {
            navigator.mediaSession.setActionHandler(action, noop);
          }
        } catch (err) {
          console.error("Failed to set media session action handler", err);
        }
      });
      updateMediaSession();
    } catch (err) {
      console.error("mediaSession setup failed", err);
    }
  }, [
    currentTrackIndex,
    isEnded,
    isReveal,
    requestPlayerTime,
    scheduleResumeResync,
    syncToServerPosition,
    updateMediaSession,
    waitingToStart,
  ]);

  // Listen for YouTube player readiness/state.
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin || "";
      const isYouTube =
        origin.includes("youtube.com") ||
        origin.includes("youtube-nocookie.com");
      if (!isYouTube || typeof event.data !== "string") return;

      let data: { event?: string; info?: number; id?: string };
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }

      if (data.id && data.id !== PLAYER_ID) return;

      if (data.event === "onReady") {
        playerReadyRef.current = true;
        setIsPlayerReady(true);
        const currentId = videoId;
        if (!currentId) return;
        if (lastTrackLoadKeyRef.current === trackLoadKey) return;
        const startSec = waitingToStart
          ? clipStartSec
          : computeServerPositionSec();
        playerStartRef.current = startSec;
        loadTrack(currentId, startSec, clipEndSec, !waitingToStart);
        setLoadedTrackKey(trackLoadKey);
        lastTrackLoadKeyRef.current = trackLoadKey;
        if (!waitingToStart) {
          startPlayback(startSec);
        }
      }

      if (data.event === "onStateChange") {
        lastPlayerStateRef.current =
          typeof data.info === "number" ? data.info : null;
        if (data.info === 1) {
          hasStartedPlaybackRef.current = true;
          lastSyncMsRef.current = getServerNowMs();
          setLoadedTrackKey(trackLoadKey);
          requestPlayerTime("state-playing");
          scheduleInitialResync();
          startSilentAudio();
        }
        if (
          (data.info === 2 || data.info === 3) &&
          hasStartedPlaybackRef.current &&
          !waitingToStart
        ) {
          const now = Date.now();
          if (now - lastPassiveResumeRef.current > 1000) {
            lastPassiveResumeRef.current = now;
            // If YouTube pauses/buffers during phase switch, nudge play without seeking.
            postCommand("playVideo");
          }
        }
        if (data.info === 0) {
          const serverNow = getServerNowMs();
          const guessEndsAt = gameState.startedAt + effectiveGuessDurationMs;
          if (
            gameState.phase === "guess" &&
            shouldLoopRoomSettingsClip &&
            !isEnded &&
            !waitingToStart &&
            serverNow < guessEndsAt
          ) {
            const latestPlayerTime = lastPlayerTimeSecRef.current;
            if (
              typeof latestPlayerTime === "number" &&
              latestPlayerTime > clipStartSec + 0.05
            ) {
              guessLoopSpanRef.current = Math.max(
                0.25,
                latestPlayerTime - clipStartSec,
              );
            } else if (!guessLoopSpanRef.current) {
              guessLoopSpanRef.current = Math.max(
                0.5,
                Math.min(5, fallbackDurationSec),
              );
            }
            startPlayback(computeServerPositionSec(), true);
            return;
          }
          if (isReveal) {
            revealReplayRef.current = true;
            startPlayback(computeRevealPositionSec(), true);
          }
        }
      }
      if (data.event === "infoDelivery") {
        const info = (data as { info?: { currentTime?: number } }).info;
        if (typeof info?.currentTime === "number") {
          lastPlayerTimeSecRef.current = info.currentTime;
          lastPlayerTimeAtMsRef.current = getServerNowMs();
          if (
            lastTimeRequestReasonRef.current === "watchdog" &&
            lastPlayerStateRef.current === 1 &&
            document.visibilityState === "visible"
          ) {
            syncToServerPosition(
              "watchdog",
              false,
              WATCHDOG_DRIFT_TOLERANCE_SEC,
            );
          }
          if (resumeNeedsSyncRef.current) {
            resumeNeedsSyncRef.current = false;
            if (document.visibilityState !== "visible") {
              return;
            }
            const didSeek = syncToServerPosition(
              "infoDelivery",
              false,
              RESUME_DRIFT_TOLERANCE_SEC,
              true,
            );
            if (didSeek) {
              scheduleResumeResync();
            }
          }
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [
    clipEndSec,
    clipStartSec,
    computeServerPositionSec,
    computeRevealPositionSec,
    fallbackDurationSec,
    effectiveGuessDurationMs,
    gameState.phase,
    gameState.startedAt,
    getDesiredPositionSec,
    getServerNowMs,
    isEnded,
    isReveal,
    loadTrack,
    postCommand,
    requestPlayerTime,
    scheduleInitialResync,
    startPlayback,
    startSilentAudio,
    syncToServerPosition,
    trackLoadKey,
    videoId,
    waitingToStart,
    markAudioUnlocked,
    scheduleResumeResync,
    shouldLoopRoomSettingsClip,
  ]);

  useEffect(() => {
    if (!videoId) return;
    if (!playerReadyRef.current) return;
    if (lastTrackLoadKeyRef.current === trackLoadKey) return;

    if (lastTrackSessionRef.current !== trackSessionKey) {
      lastTrackSessionRef.current = trackSessionKey;
      hasStartedPlaybackRef.current = false;
      playerStartRef.current = computeServerPositionSec();
    }

    revealReplayRef.current = false;
    const autoplay = !waitingToStart;
    const startSec = autoplay ? computeServerPositionSec() : clipStartSec;
    playerStartRef.current = startSec;
    loadTrack(videoId, startSec, clipEndSec, autoplay);
    hasStartedPlaybackRef.current = false;
    lastTrackLoadKeyRef.current = trackLoadKey;
    if (autoplay) {
      startPlayback(startSec);
    }
  }, [
    computeServerPositionSec,
    loadTrack,
    startPlayback,
    trackLoadKey,
    trackSessionKey,
    videoId,
    waitingToStart,
    clipStartSec,
    clipEndSec,
  ]);

  useEffect(() => {
    if (!isReveal) {
      revealReplayRef.current = false;
      lastRevealStartKeyRef.current = null;
      return;
    }
    const revealKey = `${trackSessionKey}:${gameState.revealEndsAt}:reveal`;
    if (lastRevealStartKeyRef.current === revealKey) return;
    lastRevealStartKeyRef.current = revealKey;
    const latestPlayerTime = getFreshPlayerTimeSec();
    const playerEnded = lastPlayerStateRef.current === 0;
    const playerAtEnd =
      typeof latestPlayerTime === "number" &&
      latestPlayerTime >= clipEndSec - 0.05;

    if (playerEnded || playerAtEnd) {
      // Entered reveal after clip already ended: restart from reveal timeline.
      revealReplayRef.current = true;
      startPlayback(computeRevealPositionSec(), true);
      return;
    }

    // Entered reveal while clip is still playing: continue current playback.
    revealReplayRef.current = false;
    postCommand("playVideo");
    postCommand("unMute");
    applyVolume(gameVolume);
    startSilentAudio();
  }, [
    applyVolume,
    clipEndSec,
    computeRevealPositionSec,
    getFreshPlayerTimeSec,
    gameState.revealEndsAt,
    isReveal,
    postCommand,
    startSilentAudio,
    startPlayback,
    trackSessionKey,
    gameVolume,
  ]);

  useEffect(() => {
    if (waitingToStart) {
      hasStartedPlaybackRef.current = false;
      postCommand("pauseVideo");
      postCommand("seekTo", [clipStartSec, true]);
    }
  }, [clipStartSec, postCommand, waitingToStart]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== "visible") {
        resumeNeedsSyncRef.current = true;
        resyncTimersRef.current.forEach((timerId) =>
          window.clearTimeout(timerId),
        );
        resyncTimersRef.current = [];
        return;
      }
      const serverNow = getServerNowMs();
      setNowMs(serverNow);
      if (!playerReadyRef.current) return;
      if (gameState.startedAt > serverNow) {
        resumeNeedsSyncRef.current = true;
        return;
      }
      resumeNeedsSyncRef.current = false;
      postCommand("playVideo");
      applyVolume(gameVolume);
      startSilentAudio();
      requestPlayerTime("visibility");
      resumeNeedsSyncRef.current = true;
    };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleVisibility);
    };
  }, [
    computeServerPositionSec,
    getServerNowMs,
    applyVolume,
    postCommand,
    requestPlayerTime,
    scheduleResumeResync,
    gameState.startedAt,
    startSilentAudio,
    gameVolume,
  ]);

  const submitChoiceWithFeedback = useCallback(
    async (choiceIndex: number) => {
      if (!canAnswerNow) return;
      const currentSelectedChoice =
        pendingChoiceState?.trackSessionKey === trackSessionKey
          ? pendingChoiceState.choiceIndex
          : selectedChoiceState.trackIndex === currentTrackIndex
            ? selectedChoiceState.choiceIndex
            : null;
      const changedChoice =
        currentSelectedChoice !== null && currentSelectedChoice !== choiceIndex;
      const fxKind: ChoiceCommitFxKind = changedChoice ? "reselect" : "lock";
      const submittedAtMs = getServerNowMs();
      const requestId = (submitRequestSeqRef.current += 1);

      primeSfxAudio();
      playGameSfx("lock");
      setPendingChoiceState({
        trackSessionKey,
        choiceIndex,
        requestId,
      });
      setChoiceCommitFxState((prev) => ({
        trackSessionKey,
        choiceIndex,
        kind: fxKind,
        key: (prev?.key ?? 0) + 1,
      }));
      if (choiceCommitFxTimerRef.current !== null) {
        window.clearTimeout(choiceCommitFxTimerRef.current);
      }
      choiceCommitFxTimerRef.current = window.setTimeout(() => {
        setChoiceCommitFxState((current) => {
          if (
            current &&
            current.trackSessionKey === trackSessionKey &&
            current.choiceIndex === choiceIndex
          ) {
            return null;
          }
          return current;
        });
        choiceCommitFxTimerRef.current = null;
      }, 340);

      const result = await onSubmitChoice(choiceIndex);
      setPendingChoiceState((prev) => {
        if (
          prev &&
          prev.trackSessionKey === trackSessionKey &&
          prev.requestId === requestId
        ) {
          return null;
        }
        return prev;
      });
      if (!result.ok) {
        return;
      }
      const acceptedChoiceIndex = result.data.choiceIndex;
      if (meClientId && (changedChoice || currentSelectedChoice === null)) {
        setAnsweredOrderSnapshot((prev) => {
          if (prev.trackSessionKey !== trackSessionKey) return prev;
          const base = prev.order.filter((clientId) => clientId !== meClientId);
          return {
            trackSessionKey: prev.trackSessionKey,
            order: [...base, meClientId],
          };
        });
      }
      setSelectedChoiceState({
        trackIndex: currentTrackIndex,
        choiceIndex:
          typeof acceptedChoiceIndex === "number" ? acceptedChoiceIndex : null,
      });
      setAnswerDecisionMeta((prev) => {
        if (prev.trackSessionKey !== trackSessionKey) {
          return {
            trackSessionKey,
            firstChoiceIndex:
              typeof acceptedChoiceIndex === "number" ? acceptedChoiceIndex : null,
            firstSubmittedAtMs: submittedAtMs,
            hasChangedChoice: false,
          };
        }
        return {
          trackSessionKey,
          firstChoiceIndex:
            prev.firstChoiceIndex ??
            (typeof acceptedChoiceIndex === "number" ? acceptedChoiceIndex : null),
          firstSubmittedAtMs: prev.firstSubmittedAtMs ?? submittedAtMs,
          hasChangedChoice: prev.hasChangedChoice || changedChoice,
        };
      });
    },
    [
      canAnswerNow,
      currentTrackIndex,
      getServerNowMs,
      onSubmitChoice,
      pendingChoiceState,
      playGameSfx,
      primeSfxAudio,
      selectedChoiceState,
      meClientId,
      trackSessionKey,
    ],
  );

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

  const participantIdSet = useMemo(
    () => new Set(participants.map((participant) => participant.clientId)),
    [participants],
  );
  const answeredOrderForCurrentParticipants = useMemo(
    () =>
      answeredOrderSnapshot.order.filter((clientId) =>
        participantIdSet.has(clientId),
      ),
    [answeredOrderSnapshot.order, participantIdSet],
  );
  const answeredClientIdSet = useMemo(
    () => new Set(answeredOrderForCurrentParticipants),
    [answeredOrderForCurrentParticipants],
  );
  const answeredRankByClientId = useMemo(() => {
    const rankMap = new Map<string, number>();
    answeredOrderForCurrentParticipants.forEach((clientId, idx) => {
      rankMap.set(clientId, idx + 1);
    });
    return rankMap;
  }, [answeredOrderForCurrentParticipants]);
  const answeredCount = answeredOrderForCurrentParticipants.length;

  const scorePartsByClientId = useMemo(() => {
    const partsMap = new Map<string, { base: number; gain: number }>();
    participants.forEach((participant) => {
      const baseline =
        scoreBaselineState.byClientId[participant.clientId] ?? participant.score;
      const gain = Math.max(0, participant.score - baseline);
      partsMap.set(participant.clientId, {
        base: participant.score - gain,
        gain,
      });
    });
    return partsMap;
  }, [participants, scoreBaselineState.byClientId]);
  const meParticipant = useMemo(
    () =>
      participants.find((participant) => participant.clientId === meClientId) ??
      null,
    [participants, meClientId],
  );
  const myScoreParts =
    meParticipant !== null
      ? scorePartsByClientId.get(meParticipant.clientId) ?? {
        base: meParticipant.score,
        gain: 0,
      }
      : null;
  const myGain = myScoreParts?.gain ?? 0;
  const myAnswerRank =
    meClientId != null ? answeredRankByClientId.get(meClientId) ?? null : null;
  const currentQuestionStats = gameState.questionStats;
  const liveParticipantCount =
    typeof currentQuestionStats?.participantCount === "number" &&
    Number.isFinite(currentQuestionStats.participantCount)
      ? Math.max(0, Math.floor(currentQuestionStats.participantCount))
      : participants.length;
  const liveAnsweredCount =
    typeof currentQuestionStats?.answeredCount === "number" &&
    Number.isFinite(currentQuestionStats.answeredCount)
      ? Math.max(0, Math.floor(currentQuestionStats.answeredCount))
      : answeredCount;
  const liveCorrectCount =
    typeof currentQuestionStats?.correctCount === "number" &&
    Number.isFinite(currentQuestionStats.correctCount)
      ? Math.max(0, Math.floor(currentQuestionStats.correctCount))
      : null;
  const liveAccuracyPct =
    liveCorrectCount !== null && liveParticipantCount > 0
      ? Math.round((liveCorrectCount / Math.max(1, liveParticipantCount)) * 100)
      : null;
  const scoreBreakdownsByClientId = currentQuestionStats?.scoreBreakdownsByClientId;
  const myBackendScoreBreakdown =
    meClientId && scoreBreakdownsByClientId
      ? scoreBreakdownsByClientId[meClientId] ?? null
      : null;
  const answerDecisionMetaForCurrentTrack =
    answerDecisionMeta.trackSessionKey === trackSessionKey ? answerDecisionMeta : null;
  const myHasChangedAnswer = Boolean(answerDecisionMetaForCurrentTrack?.hasChangedChoice);
  const myFirstSubmittedAtMs = answerDecisionMetaForCurrentTrack?.firstSubmittedAtMs ?? null;
  const myFirstChoiceIndex = answerDecisionMetaForCurrentTrack?.firstChoiceIndex ?? null;
  const myFirstAnswerElapsedMs =
    myFirstSubmittedAtMs !== null ? myFirstSubmittedAtMs - gameState.startedAt : null;
  const myHasAnswered =
    selectedChoice !== null ||
    Boolean(meClientId && answeredClientIdSet.has(meClientId));
  const myIsCorrect = selectedChoice !== null && selectedChoice === correctChoiceIndex;
  const myDecisionBonusPreviewPoints =
    gameState.phase === "guess" || isReveal
      ? (
          myHasAnswered &&
            selectedChoice !== null &&
            myFirstSubmittedAtMs !== null &&
            myFirstChoiceIndex === selectedChoice &&
            !myHasChangedAnswer
        )
        ? resolveDecisionBonusPreviewPoints(myFirstAnswerElapsedMs)
        : 0
      : 0;
  const myDecisionBonusEligible = myDecisionBonusPreviewPoints > 0;
  const myResolvedScoreBreakdown = myBackendScoreBreakdown;
  const myResolvedGain = myResolvedScoreBreakdown?.totalGainPoints ?? myGain;
  const myFeedback = useMemo<MyFeedbackModel>(() => {
    const guessBadges: string[] = [];
    if (myDecisionBonusEligible) {
      guessBadges.push(`決斷+${myDecisionBonusPreviewPoints}`);
    }
    if (myAnswerRank !== null) {
      guessBadges.push(`第${myAnswerRank}答`);
    }
    if (liveParticipantCount > 0) {
      guessBadges.push(`已答 ${liveAnsweredCount}/${liveParticipantCount}`);
    }
    const revealBadges: string[] = [];
    if (myAnswerRank !== null) {
      revealBadges.push(`第${myAnswerRank}答`);
    }
    if (liveAccuracyPct !== null) {
      revealBadges.push(`全場答對率 ${liveAccuracyPct}%`);
    }
    const badges = (isReveal ? revealBadges : guessBadges).slice(0, 2);

    if (isInterTrackWait) {
      return {
        tone: "neutral",
        title: "下一首準備中",
        detail: `${startCountdownSec} 秒後開始`,
        badges,
        pillText: `${startCountdownSec}s`,
        lines: ["等待下一題載入完成", "倒數結束後可立即作答"],
      };
    }
    if (gameState.phase === "guess") {
      if (!myHasAnswered) {
        return {
          tone: "neutral",
          title: "尚未作答",
          detail: isGuessUrgency ? "最後幾秒了，快決定答案。" : "請在倒數結束前選擇答案。",
          badges,
          pillText: isGuessUrgency ? "快作答" : "待命中",
          lines: [
            isGuessUrgency ? "最後幾秒，請立即作答" : "本題尚未作答",
            liveParticipantCount > 0
              ? `已答 ${liveAnsweredCount}/${liveParticipantCount} 人`
              : "等待你的答案",
          ],
        };
      }
      return {
        tone: "locked",
        title: myHasChangedAnswer ? "已改答，可再改" : "已鎖定，可修改",
        detail:
          myAnswerRank !== null
            ? myHasChangedAnswer
              ? `目前答案已更新，倒數前仍可再改。`
              : `已提交答案，倒數前仍可修改。`
            : myHasChangedAnswer
              ? "目前答案已更新，倒數結束前仍可再修改。"
              : "你已提交答案，倒數結束前仍可修改。",
        badges,
        pillText: myHasChangedAnswer ? "已改答" : "已鎖定",
        lines: [
          myHasChangedAnswer
            ? "答案已更新，系統以最後提交為準"
            : "答案已送出，倒數前仍可修改",
          [
            liveParticipantCount > 0
              ? `已答 ${liveAnsweredCount}/${liveParticipantCount}`
              : "已答統計載入中",
            myDecisionBonusEligible
              ? `決斷+${myDecisionBonusPreviewPoints} 候選`
              : "5 秒內不改答可拿決斷",
          ].join(" · "),
        ],
      };
    }
    if (!meClientId) {
      return {
        tone: "neutral",
        title: "本題結果已公布",
        detail: "",
        badges,
        pillText: "觀戰中",
        lines: [],
      };
    }
    if (!myHasAnswered || selectedChoice === null) {
      const lines = [
        [
          "+0",
          liveParticipantCount > 0
            ? `已答 ${liveAnsweredCount}/${liveParticipantCount}`
            : "已答統計載入中",
          liveAccuracyPct !== null
            ? `全場答對率 ${liveAccuracyPct}%`
            : "全場答對率載入中",
        ].join(" · "),
      ];
      return {
        tone: "neutral",
        title: "未作答 +0",
        detail: lines.join(" · "),
        badges,
        pillText: "+0",
        lines: [],
        inlineMeta: lines[0],
      };
    }
    if (myIsCorrect) {
      const lines: string[] = [];
      if (myResolvedScoreBreakdown) {
        lines.push(...buildScoreBreakdownLines(myResolvedScoreBreakdown));
      } else {
        const fallbackParts: string[] = [];
        if (myAnswerRank !== null) {
          fallbackParts.push(myAnswerRank === 1 ? "首答" : `第${myAnswerRank}答`);
        }
        if (liveAccuracyPct !== null) {
          fallbackParts.push(`全場答對率 ${liveAccuracyPct}%`);
        }
        lines.push(
          fallbackParts.length > 0
            ? fallbackParts.join(" · ")
            : "後端分數拆解載入中",
        );
      }
      const revealInlineMeta = lines[0] ?? "";
      return {
        tone: "correct",
        title: `答對 +${myResolvedGain}`,
        detail: revealInlineMeta,
        badges: [],
        pillText: myResolvedScoreBreakdown
          ? `+${myResolvedScoreBreakdown.totalGainPoints}`
          : `+${myResolvedGain}`,
        lines: [],
        inlineMeta: revealInlineMeta,
      };
    }
    const revealResultDetailParts: string[] = [
      [
        "+0",
        myAnswerRank !== null ? `第${myAnswerRank}答` : "順位載入中",
        liveAccuracyPct !== null
          ? `全場答對率 ${liveAccuracyPct}%`
          : "全場答對率載入中",
      ].join(" · "),
    ];
    return {
      tone: "wrong",
      title: "答錯 +0",
      detail: revealResultDetailParts.join(" · "),
      badges: isReveal ? [] : badges,
      pillText: "+0",
      lines: [],
      inlineMeta: revealResultDetailParts[0],
    };
  }, [
    gameState.phase,
    isGuessUrgency,
    isInterTrackWait,
    isReveal,
    liveAccuracyPct,
    liveAnsweredCount,
    liveParticipantCount,
    meClientId,
    myAnswerRank,
    myDecisionBonusEligible,
    myDecisionBonusPreviewPoints,
    myHasChangedAnswer,
    myHasAnswered,
    myResolvedScoreBreakdown,
    myResolvedGain,
    myIsCorrect,
    startCountdownSec,
    selectedChoice,
  ]);
  const revealTone = myFeedback?.tone ?? "neutral";
  const isPendingFeedbackCard =
    !isInterTrackWait && gameState.phase === "guess" && !myHasAnswered;

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

  useEffect(() => {
    if (!isReveal) return;
    if (!gameState.choices.length) return;
    if (recapCapturedTrackSessionKeysRef.current.has(trackSessionKey)) return;
    recapCapturedTrackSessionKeysRef.current.add(trackSessionKey);

    const liveQuestionStats = gameState.questionStats;
    const serverAnswerForMe =
      meClientId && liveQuestionStats?.answersByClientId
        ? liveQuestionStats.answersByClientId[meClientId]
        : undefined;
    const myChoiceIndex =
      typeof serverAnswerForMe?.choiceIndex === "number"
        ? serverAnswerForMe.choiceIndex
        : selectedChoiceState.trackIndex === currentTrackIndex
          ? selectedChoiceState.choiceIndex
          : null;
    const participantCount =
      typeof liveQuestionStats?.participantCount === "number" &&
      Number.isFinite(liveQuestionStats.participantCount)
        ? Math.max(0, Math.floor(liveQuestionStats.participantCount))
        : participants.length;
    const answeredClientIds = answeredOrderForCurrentParticipants;
    const answeredCount =
      typeof liveQuestionStats?.answeredCount === "number" &&
      Number.isFinite(liveQuestionStats.answeredCount)
        ? Math.max(0, Math.floor(liveQuestionStats.answeredCount))
        : answeredClientIds.length;
    const correctClientIds = participants
      .filter((participant) => {
        const parts = scorePartsByClientId.get(participant.clientId);
        return (parts?.gain ?? 0) > 0;
      })
      .map((participant) => participant.clientId);
    const correctClientIdSet = new Set(correctClientIds);
    const correctCount =
      typeof liveQuestionStats?.correctCount === "number" &&
      Number.isFinite(liveQuestionStats.correctCount)
        ? Math.max(0, Math.floor(liveQuestionStats.correctCount))
        : correctClientIds.length;
    const wrongCount =
      typeof liveQuestionStats?.wrongCount === "number" &&
      Number.isFinite(liveQuestionStats.wrongCount)
        ? Math.max(0, Math.floor(liveQuestionStats.wrongCount))
        : Math.max(0, answeredCount - correctCount);
    const unansweredCount =
      typeof liveQuestionStats?.unansweredCount === "number" &&
      Number.isFinite(liveQuestionStats.unansweredCount)
        ? Math.max(0, Math.floor(liveQuestionStats.unansweredCount))
        : Math.max(0, participantCount - answeredCount);
    const fastestCorrectRank =
      answeredClientIds.findIndex((clientId) => correctClientIdSet.has(clientId));
    const fastestCorrectMs =
      typeof liveQuestionStats?.fastestCorrectMs === "number" &&
      Number.isFinite(liveQuestionStats.fastestCorrectMs)
        ? Math.max(0, Math.floor(liveQuestionStats.fastestCorrectMs))
        : null;
    const medianCorrectMs =
      typeof liveQuestionStats?.medianCorrectMs === "number" &&
      Number.isFinite(liveQuestionStats.medianCorrectMs)
        ? Math.max(0, Math.floor(liveQuestionStats.medianCorrectMs))
        : null;
    const changedAnswerCount =
      typeof liveQuestionStats?.changedAnswerCount === "number" &&
      Number.isFinite(liveQuestionStats.changedAnswerCount)
        ? Math.max(0, Math.floor(liveQuestionStats.changedAnswerCount))
        : null;
    const changedAnswerUserCount =
      typeof liveQuestionStats?.changedAnswerUserCount === "number" &&
      Number.isFinite(liveQuestionStats.changedAnswerUserCount)
        ? Math.max(0, Math.floor(liveQuestionStats.changedAnswerUserCount))
        : null;
    const answersByClientId =
      liveQuestionStats?.answersByClientId &&
      typeof liveQuestionStats.answersByClientId === "object"
        ? liveQuestionStats.answersByClientId
        : undefined;
    const myAnswered =
      myChoiceIndex !== null ||
      Boolean(serverAnswerForMe) ||
      Boolean(meClientId && answeredClientIdSet.has(meClientId));
    const myResult: SettlementQuestionResult = !myAnswered
      ? "unanswered"
      : myChoiceIndex === correctChoiceIndex
        ? "correct"
        : "wrong";

    const recapItem: SettlementQuestionRecap = {
      key: trackSessionKey,
      order: trackCursor + 1,
      trackIndex: currentTrackIndex,
      title: resolvedAnswerTitle,
      uploader: item?.uploader?.trim() || "Unknown",
      duration: item?.duration?.trim() || null,
      thumbnail: item?.thumbnail || null,
      myResult,
      myChoiceIndex,
      correctChoiceIndex,
      choices: gameState.choices.map((choice) => ({
        index: choice.index,
        title:
          choice.title?.trim() ||
          playlist[choice.index]?.answerText?.trim() ||
          playlist[choice.index]?.title?.trim() ||
          "（未提供名稱）",
        isCorrect: choice.index === correctChoiceIndex,
        isSelectedByMe: choice.index === myChoiceIndex,
      })),
      participantCount,
      answeredCount,
      correctCount,
      wrongCount,
      unansweredCount,
      changedAnswerCount: changedAnswerCount ?? undefined,
      changedAnswerUserCount: changedAnswerUserCount ?? undefined,
      fastestCorrectRank: fastestCorrectRank >= 0 ? fastestCorrectRank + 1 : null,
      fastestCorrectMs,
      medianCorrectMs,
      answersByClientId,
    };

    deferStateUpdate(() => {
      setQuestionRecaps((prev) => {
        const next = [...prev.filter((item) => item.key !== recapItem.key), recapItem];
        next.sort((a, b) => a.order - b.order || a.trackIndex - b.trackIndex);
        return next;
      });
    });
  }, [
    answeredClientIdSet,
    answeredOrderForCurrentParticipants,
    correctChoiceIndex,
    currentTrackIndex,
    gameState.choices,
    gameState.questionStats,
    isReveal,
    item?.duration,
    item?.thumbnail,
    item?.uploader,
    meClientId,
    playlist,
    resolvedAnswerTitle,
    scorePartsByClientId,
    selectedChoiceState.choiceIndex,
    selectedChoiceState.trackIndex,
    trackCursor,
    trackSessionKey,
    participants,
  ]);

  useEffect(() => {
    onSettlementRecapChange?.(questionRecaps);
  }, [onSettlementRecapChange, questionRecaps]);

  const sortedParticipants = participants
    .slice()
    .sort((a, b) => b.score - a.score);
  useEffect(() => {
    const nextTopTwo: [string | null, string | null] = [
      sortedParticipants[0]?.clientId ?? null,
      sortedParticipants[1]?.clientId ?? null,
    ];
    const [prevFirst, prevSecond] = lastTopTwoOrderRef.current;
    const [nextFirst, nextSecond] = nextTopTwo;
    const didSwapTopTwo =
      !!prevFirst &&
      !!prevSecond &&
      !!nextFirst &&
      !!nextSecond &&
      prevFirst === nextSecond &&
      prevSecond === nextFirst;

    if (didSwapTopTwo) {
      if (topTwoSwapTimerRef.current !== null) {
        window.clearTimeout(topTwoSwapTimerRef.current);
      }
      deferStateUpdate(() => {
        setTopTwoSwapState((prev) => ({
          firstClientId: nextFirst,
          secondClientId: nextSecond,
          key: (prev?.key ?? 0) + 1,
        }));
      });
      topTwoSwapTimerRef.current = window.setTimeout(() => {
        setTopTwoSwapState((current) => {
          if (
            current &&
            current.firstClientId === nextFirst &&
            current.secondClientId === nextSecond
          ) {
            return null;
          }
          return current;
        });
        topTwoSwapTimerRef.current = null;
      }, 720);
    }

    lastTopTwoOrderRef.current = nextTopTwo;
  }, [sortedParticipants]);
  const playedQuestionCount = trackOrderLength || room.gameSettings?.questionCount || 0;
  const endedRoundKey = `${room.id}:${gameState.startedAt}`;
  const topFive = sortedParticipants.slice(0, 5);
  const self = sortedParticipants.find((p) => p.clientId === meClientId);
  const scoreboardList =
    self && !topFive.some((p) => p.clientId === self.clientId)
      ? [...topFive, self]
      : topFive;
  const SCOREBOARD_SLOTS = 6;
  const scoreboardEntries = scoreboardList.slice(0, SCOREBOARD_SLOTS);
  const fillerCount = Math.max(0, SCOREBOARD_SLOTS - scoreboardEntries.length);
  type ScoreboardRow =
    | { type: "player"; player: RoomParticipant }
    | { type: "placeholder"; key: string };
  const scoreboardRows: ScoreboardRow[] = [
    ...scoreboardEntries.map((player) => ({ type: "player" as const, player })),
    ...Array.from({ length: fillerCount }, (_, idx) => ({
      type: "placeholder" as const,
      key: `placeholder-${idx}`,
    })),
  ];

  const recentMessages = messages.slice(-80);

  useEffect(() => {
    let cancelled = false;
    if (!isEnded) {
      deferStateUpdate(() => {
        if (cancelled) return;
        setEndedSnapshot(null);
      });
      return () => {
        cancelled = true;
      };
    }
    const normalizedRecaps = cloneSettlementQuestionRecaps(questionRecaps);
    deferStateUpdate(() => {
      if (cancelled) return;
      setEndedSnapshot((prev) => {
        if (!prev || prev.roundKey !== endedRoundKey) {
          return {
            roundKey: endedRoundKey,
            startedAt: gameState.startedAt,
            endedAt: Date.now() + serverOffsetMs,
            room: cloneRoomForSettlement(room),
            participants: participants.map((participant) => ({ ...participant })),
            messages: messages.map((message) => ({ ...message })),
            playlistItems: playlist.map((item) => ({ ...item })),
            trackOrder: [...gameState.trackOrder],
            playedQuestionCount,
            questionRecaps: normalizedRecaps,
          };
        }
        if (prev.questionRecaps.length >= normalizedRecaps.length) {
          return prev;
        }
        return {
          ...prev,
          questionRecaps: normalizedRecaps,
        };
      });
    });
    return () => {
      cancelled = true;
    };
  }, [
    endedRoundKey,
    gameState.startedAt,
    gameState.trackOrder,
    isEnded,
    messages,
    participants,
    playedQuestionCount,
    playlist,
    questionRecaps,
    room,
    serverOffsetMs,
  ]);

  const settlementSnapshot =
    endedSnapshot && endedSnapshot.roundKey === endedRoundKey
      ? endedSnapshot
      : null;

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
  const audioGestureOverlay =
    shouldShowGestureOverlay && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed inset-0 z-[2400] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm"
            onPointerDown={handleGestureOverlayTrigger}
            onTouchStart={handleGestureOverlayTrigger}
            onClick={handleGestureOverlayTrigger}
            role="button"
            tabIndex={0}
            aria-label="點擊後開始播放"
          >
            <div className="mx-4 w-full max-w-sm rounded-2xl border border-emerald-300/40 bg-slate-900/85 px-6 py-6 text-center shadow-[0_20px_60px_rgba(2,6,23,0.6)]">
              <button
                type="button"
                onClick={handleGestureOverlayTrigger}
                onTouchStart={handleGestureOverlayTrigger}
                disabled={!isPlayerReady}
                className="rounded-full border border-emerald-300/60 bg-emerald-400/15 px-5 py-2 text-base font-semibold text-emerald-100"
              >
                {isPlayerReady ? "點擊後開始播放" : "播放器載入中..."}
              </button>
              <p className="mt-3 text-xs text-slate-300">
                {isPlayerReady
                  ? "手機瀏覽器需要先手勢觸發，音樂才能播放"
                  : "請稍候播放器初始化完成後再點擊"}
              </p>
            </div>
          </div>,
          document.body,
        )
      : null;
  const startBroadcastOverlay =
    isInitialCountdown && typeof document !== "undefined"
      ? createPortal(
          <div className="fixed inset-0 z-[2300] flex items-center justify-center bg-slate-950/82 backdrop-blur-sm">
            <div className="mx-4 w-full max-w-md rounded-2xl border border-amber-300/45 bg-slate-950/90 px-6 py-6 text-center shadow-[0_24px_70px_-30px_rgba(251,191,36,0.8)]">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/55 bg-amber-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-100">
                即將開局
              </div>
              <p className="mt-3 text-sm text-slate-200">房主已開始，倒數後全員同步進入作答</p>
              <div className="mt-4 flex items-center justify-center">
                <div className="flex h-24 w-24 items-center justify-center rounded-full border border-amber-300/60 bg-amber-500/12 text-5xl font-black text-amber-100 shadow-[0_0_30px_rgba(251,191,36,0.45)]">
                  {startCountdownSec}
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-300">倒數結束後會自動開始本局</p>
            </div>
          </div>,
          document.body,
        )
      : null;

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
        <aside className="game-room-panel game-room-panel--left flex h-full flex-col gap-3 p-3 text-slate-50 overflow-hidden">
          <div className="flex items-center gap-3">
            <div>
              <p className="game-room-kicker">排行榜</p>
              <p className="game-room-title">分數榜</p>
            </div>
            <span className="ml-2 text-[11px] text-slate-400">
              (前五名 + 自己)
            </span>
            <Chip
              label={`已答 ${answeredCount}/${participants.length || 0}`}
              size="small"
              color="success"
              variant="outlined"
              className="ml-auto game-room-chip"
            />
          </div>
          <div className="space-y-2">
            {scoreboardRows.length === 0 ? (
              <div className="text-xs text-slate-500">尚無玩家</div>
            ) : (
              scoreboardRows.map((row, idx) => {
                if (row.type === "placeholder") {
                  return (
                    <div
                      key={row.key}
                      className="game-room-score-row game-room-score-row--placeholder flex items-center justify-between text-sm"
                      aria-hidden="true"
                    >
                      <span className="truncate flex items-center gap-2">
                        {idx + 1}. <span>等待加入</span>
                      </span>
                      <span className="text-[11px] text-slate-500">--</span>
                    </div>
                  );
                }
                const p = row.player;
                const hasAnswered = answeredClientIdSet.has(p.clientId);
                const answerRank = answeredRankByClientId.get(p.clientId);
                const scoreParts = scorePartsByClientId.get(p.clientId) ?? {
                  base: p.score,
                  gain: 0,
                };
                const rowAnswerState = isReveal
                  ? hasAnswered
                    ? scoreParts.gain > 0
                      ? "correct"
                      : "wrong"
                    : "unanswered"
                  : hasAnswered
                    ? "answered"
                    : "pending";
                const answerDotClass =
                  rowAnswerState === "correct"
                    ? "bg-emerald-400"
                    : rowAnswerState === "wrong"
                      ? "bg-rose-400"
                      : rowAnswerState === "answered"
                        ? "bg-amber-300"
                        : "bg-slate-500";
                const answerDotTitle =
                  rowAnswerState === "correct"
                    ? "本題答對"
                    : rowAnswerState === "wrong"
                      ? "本題答錯"
                      : rowAnswerState === "answered"
                        ? "已選答案"
                        : "尚未作答";
                const answerChipColor: "default" | "success" | "error" | "warning" =
                  rowAnswerState === "correct"
                    ? "success"
                    : rowAnswerState === "wrong"
                      ? "error"
                      : rowAnswerState === "answered"
                        ? "warning"
                        : "default";
                const topSwapRole =
                  topTwoSwapState &&
                  idx === 0 &&
                  p.clientId === topTwoSwapState.firstClientId
                    ? "first"
                    : topTwoSwapState &&
                        idx === 1 &&
                        p.clientId === topTwoSwapState.secondClientId
                      ? "second"
                      : null;
                return (
                  <div
                    key={p.clientId}
                    className={`game-room-score-row flex items-center justify-between text-sm ${
                      isReveal ? "game-room-score-row--revealed" : ""
                    } ${
                      rowAnswerState === "correct"
                        ? "game-room-score-row--correct"
                        : rowAnswerState === "wrong"
                          ? "game-room-score-row--wrong"
                          : rowAnswerState === "answered"
                            ? "game-room-score-row--answered"
                            : ""
                    } ${p.clientId === meClientId ? "game-room-score-row--me" : ""} ${
                      topSwapRole === "first"
                        ? "game-room-score-row--top-swap-first"
                        : topSwapRole === "second"
                          ? "game-room-score-row--top-swap-second"
                          : ""
                    }`}
                  >
                    <span className="truncate flex items-center gap-2">
                      {hasAnswered && (
                        <span
                          className={`h-2 w-2 rounded-full ${answerDotClass}`}
                          title={answerDotTitle}
                        />
                      )}
                      {idx + 1}.{" "}
                      {p.clientId === meClientId
                        ? `${p.username}（我）`
                        : p.username}
                    </span>
                    <div className="flex items-center gap-2">
                      {topSwapRole && (
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                            topSwapRole === "first"
                              ? "border-amber-300/40 bg-amber-300/10 text-amber-100"
                              : "border-slate-400/35 bg-slate-700/45 text-slate-200"
                          }`}
                        >
                          {topSwapRole === "first" ? "奪冠" : "交棒"}
                        </span>
                      )}
                      {typeof answerRank === "number" ? (
                        <Chip
                          label={`第${answerRank}答`}
                          size="small"
                          color={answerChipColor}
                          variant="filled"
                        />
                      ) : (
                        <Chip label="未答" size="small" variant="outlined" />
                      )}
                      <span className="font-semibold text-emerald-300 tabular-nums">
                        {`${scoreParts.base.toLocaleString()} + ${scoreParts.gain.toLocaleString()}`}
                        {p.combo > 0 && (
                          <span className="ml-1 text-amber-300">
                            x{p.combo}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="h-px bg-slate-800/80" />

          <div className="game-room-chat flex min-h-[240px] flex-1 flex-col p-3 gap-2 overflow-hidden">
            <div className="game-room-chat-header flex items-center justify-between text-sm font-semibold text-slate-200">
              <div className="flex items-center gap-2">
                <span>聊天室</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400">彈幕</span>
                <Switch
                  size="small"
                  color="info"
                  checked={danmuEnabled}
                  onChange={(event) => setDanmuEnabled(event.target.checked)}
                />
                <span className="text-[11px] text-slate-500">
                  {danmuEnabled ? "開啟" : "關閉"}
                </span>
                <span className="text-xs text-slate-400">
                  {messages.length} 則訊息
                </span>
              </div>
            </div>
            <div className="game-room-chat-divider h-px" />
            <div
              ref={chatScrollRef}
              className="game-room-chat-list flex-1 md:max-h-80 overflow-y-auto overflow-x-hidden space-y-3 pr-1"
            >
              {recentMessages.length === 0 ? (
                <div className="text-xs text-slate-500 text-center py-4">
                  目前沒有訊息
                </div>
              ) : (
                recentMessages.map((msg) => {
                  const isPresenceSystemMessage = msg.userId === "system:presence";
                  if (isPresenceSystemMessage) {
                    return (
                      <div key={msg.id} className="flex justify-center">
                        <div className="max-w-full rounded-full border border-slate-700/70 bg-slate-900/80 px-3 py-1 text-[11px] text-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                          <span className="font-medium text-slate-200">{msg.content}</span>
                          <span className="ml-2 text-slate-500">
                            {new Date(msg.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    );
                  }
                  // const isSelf = msg.username === username;
                  return (
                    <div key={msg.id} className={`flex`}>
                      <div className="game-room-chat-bubble game-room-chat-message max-w-full px-2.5 py-1.5 text-xs">
                        <div className="flex items-center gap-4 text-[11px] text-slate-300">
                          <span className="font-semibold">
                            {msg.username}
                            {/* {isSelf && "（我）"} */}
                          </span>
                          <span className="text-slate-500">
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </span>
                        </div>

                        <p className="mt-1 whitespace-pre-wrap wrap-anywhere leading-relaxed">
                          {msg.content}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                className="game-room-chat-input-field flex-1 rounded-md border border-slate-700 bg-slate-900 px-2 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
                placeholder="輸入訊息..."
                value={messageInput}
                onChange={(e) => onMessageChange?.(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onSendMessage?.();
                  }
                }}
              />
              <Button
                variant="contained"
                color="info"
                size="small"
                className="game-room-chat-send"
                onClick={() => onSendMessage?.()}
              >
                送出
              </Button>
            </div>
          </div>
        </aside>

        {/* 右側：播放區 + 答題區 */}
        <section className="flex min-h-0 flex-col gap-2 lg:h-full lg:overflow-hidden">
          {/* 播放區 */}
          <div className="game-room-panel game-room-panel--accent p-3 text-slate-50 flex-none">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div>
                  <p className="game-room-kicker">正在播放</p>
                  <p className="game-room-title">{room.name}</p>
                  <p className="text-xs text-slate-400">
                    曲目 {boundedCursor + 1}/{trackOrderLength || "?"}
                  </p>
                </div>
              </div>
              <Button
                variant="outlined"
                color="inherit"
                size="small"
                onClick={openExitConfirm}
              >
                退出遊戲
              </Button>
            </div>

            <div className="game-room-media-frame relative w-full overflow-hidden h-[140px] sm:h-[188px] md:h-[214px] xl:h-[236px]">
              {iframeSrc ? (
                <iframe
                  src={iframeSrc}
                  className="h-full w-full object-contain"
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                  title="Now playing"
                  style={{
                    pointerEvents: "none",
                    opacity: shouldHideVideoFrame || !shouldShowVideo ? 0 : 1,
                  }}
                  ref={iframeRef}
                  onLoad={() => {
                    if (!playerVideoId && videoId) {
                      setPlayerVideoId(videoId);
                    }
                    postPlayerMessage(
                      { event: "listening", id: PLAYER_ID },
                      "player event binding",
                    );
                    applyVolume(gameVolume);
                  }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
                  暫時沒有可播放的影片來源
                </div>
              )}
              <audio
                ref={silentAudioRef}
                src={SILENT_AUDIO_SRC}
                loop
                preload="auto"
                playsInline
                className="pointer-events-none absolute h-0 w-0 opacity-0"
                aria-hidden="true"
              />
              {danmuEnabled && (
                <div className="game-room-danmu-layer" aria-hidden="true">
                  {danmuItems.map((danmu) => (
                    <div
                      key={danmu.id}
                      className="game-room-danmu-item"
                      style={{
                        top: `${8 + danmu.lane * 14}%`,
                        animationDuration: `${danmu.durationMs}ms`,
                      }}
                    >
                      {danmu.text}
                    </div>
                  ))}
                </div>
              )}
              {showGuessMask && (
                <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950">
                  <div className="h-24 w-24 animate-spin rounded-full border-4 border-slate-700 shadow-lg shadow-emerald-500/30" />
                  <p className="mt-2 text-xs text-slate-300">
                    猜歌中，影片已隱藏
                  </p>
                </div>
              )}
              {showPreStartMask && (
                <div className="pointer-events-none absolute inset-0 z-20 bg-slate-950" />
              )}
              {showLoadingMask && (
                <div className="pointer-events-none absolute inset-0 z-20 bg-slate-950" />
              )}
              {showAudioOnlyMask && (
                <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950">
                  <div className="rounded-full border border-slate-700 bg-slate-900/75 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-slate-300">
                    Audio Mode
                  </div>
                  <p className="mt-2 text-xs text-slate-300">
                    目前僅播放音訊，影片與控制面板已隱藏
                  </p>
                </div>
              )}
            </div>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  color="info"
                  checked={showVideo}
                  onChange={(e) => setShowVideoOverride(e.target.checked)}
                />
                <span className="text-xs text-slate-300">
                  公布階段顯示影片（猜歌時自動隱藏）
                </span>
              </div>
              <div className="flex items-center gap-2 sm:min-w-[200px]">
                <span className="text-xs text-slate-300">音量</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={gameVolume}
                  onChange={(e) => setGameVolume(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* 答題區 */}
          <div
            ref={answerPanelRef}
            className="game-room-panel game-room-panel--warm p-3 text-slate-50 flex min-h-0 flex-col lg:flex-1"
          >
            {isInitialCountdown ? (
              <div className="flex flex-col items-center py-6 text-center">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1 text-[11px] uppercase tracking-[0.35em] text-slate-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-300 animate-pulse" />
                  即將開始
                </div>
                <div
                  className={`mt-5 flex h-28 w-28 items-center justify-center rounded-full border ${countdownTone}`}
                >
                  <span className="text-5xl font-black tracking-widest sm:text-6xl">
                    {startCountdownSec}
                  </span>
                </div>
                <p className="mt-3 text-xs text-slate-400">
                  倒數結束後即可開始作答
                </p>
              </div>
            ) : (
              <div
                className={`game-room-answer-layout ${
                  isReveal
                    ? "game-room-answer-layout--reveal"
                    : "game-room-answer-layout--guess"
                } ${
                  !isReveal && revealTone === "neutral"
                    ? "game-room-answer-layout--neutral"
                    : ""
                }`}
              >
                <div className="game-room-answer-body">
                  <div className="game-room-answer-head flex items-center gap-3">
                    <div>
                      <p className="game-room-kicker">階段</p>
                      <p className="game-room-title">
                        {isInterTrackWait ? "下一首準備中" : phaseLabel}
                      </p>
                    </div>
                    <Chip
                      label={
                        isInterTrackWait
                          ? `${startCountdownSec}s`
                          : `${Math.ceil(phaseRemainingMs / 1000)}s`
                      }
                      size="small"
                      color={
                        isInterTrackWait
                          ? "info"
                          : gameState.phase === "guess"
                            ? "warning"
                            : "success"
                      }
                      variant="outlined"
                      className={`game-room-chip ${isGuessUrgency ? "game-room-chip--urgent" : ""}`}
                    />
                  </div>

                  <div
                    className={`game-room-phase-progress ${isGuessUrgency ? "game-room-phase-progress--urgent" : ""}`}
                  >
                    <LinearProgress
                      variant={isInterTrackWait ? "indeterminate" : "determinate"}
                      value={
                        isInterTrackWait
                          ? undefined
                          : Math.min(100, Math.max(0, progressPct))
                      }
                      color={
                        isInterTrackWait
                          ? "info"
                          : gameState.phase === "guess"
                            ? "warning"
                            : "success"
                      }
                      className="game-room-phase-progress-bar"
                    />
                  </div>

                  <div className="game-room-options-grid grid grid-cols-1 gap-2 md:grid-cols-2">
                    {isInterTrackWait
                      ? Array.from(
                        {
                          length: Math.max(4, gameState.choices.length),
                        },
                        (_, idx) => (
                          <Button
                            key={`placeholder-${idx}`}
                            fullWidth
                            size="large"
                            disabled
                            variant="outlined"
                            className="game-room-choice-button game-room-choice-placeholder justify-start"
                          >
                            <div className="game-room-choice-content flex w-full items-start justify-between gap-2">
                              <span className="game-room-choice-title text-slate-500">
                                下一首準備中
                              </span>
                              <span className="game-room-choice-key ml-3 inline-flex h-6 w-6 flex-none items-center justify-center rounded border border-slate-800 text-[11px] font-semibold text-slate-500">
                                --
                              </span>
                            </div>
                          </Button>
                        ),
                      )
                      : gameState.choices.map((choice, idx) => {
                        const isSelected = selectedChoice === choice.index;
                        const isCorrect = choice.index === correctChoiceIndex;
                        const isLocked = isReveal || isEnded;
                        const choiceDisplayTitle =
                          choice.title?.trim() ||
                          playlist[choice.index]?.answerText?.trim() ||
                          playlist[choice.index]?.title?.trim() ||
                          "（未提供名稱）";
                        const isMyChoice = selectedChoice === choice.index;
                        const showCorrectTag = isReveal && isCorrect;
                        const showMyChoiceTag = isReveal && isMyChoice;
                        const showMyCorrectTag = isReveal && isMyChoice && isCorrect;
                        const choiceCommitFxKind =
                          choiceCommitFxState &&
                          choiceCommitFxState.trackSessionKey === trackSessionKey &&
                          choiceCommitFxState.choiceIndex === choice.index
                            ? choiceCommitFxState.kind
                            : null;
                        const showGuessLockTag = !isReveal && isMyChoice;
                        const showGuessDecisionTag =
                          !isReveal && isMyChoice && myDecisionBonusPreviewPoints > 0;

                        return (
                          <Button
                            key={`${choice.index}-${idx}`}
                            fullWidth
                            size="large"
                            disableRipple
                            aria-disabled={
                              isLocked ||
                              waitingToStart ||
                              shouldShowGestureOverlay
                            }
                            tabIndex={
                              isLocked ||
                              waitingToStart ||
                              shouldShowGestureOverlay
                                ? -1
                                : 0
                            }
                            variant={
                              isReveal
                                ? isCorrect || isSelected
                                  ? "contained"
                                  : "outlined"
                                : isSelected
                                  ? "contained"
                                  : "outlined"
                            }
                            color={
                              isReveal
                                ? isCorrect
                                  ? "success"
                                  : isSelected
                                    ? "error"
                                    : "info"
                                : isSelected
                                  ? "info"
                                  : "info"
                            }
                            className={`game-room-choice-button justify-start ${isReveal
                              ? ""
                              : isSelected
                                ? "bg-sky-700/30"
                                : ""
                              } ${
                                choiceCommitFxKind === "lock"
                                  ? "game-room-choice-button--commit-lock"
                                  : choiceCommitFxKind === "reselect"
                                    ? "game-room-choice-button--commit-reselect"
                                    : ""
                              } ${
                                !isReveal && isSelected
                                  ? "game-room-choice-button--selected-live"
                                  : ""
                              } ${
                                isLocked || waitingToStart || shouldShowGestureOverlay
                                  ? "pointer-events-none"
                                  : ""
                              }`}
                            disabled={false}
                            onClick={() => {
                              if (isLocked || !canAnswerNow) return;
                              submitChoiceWithFeedback(choice.index);
                            }}
                          >
                            <div className="game-room-choice-content flex w-full items-start justify-between gap-2">
                              <span
                                className="game-room-choice-title"
                                title={choiceDisplayTitle}
                              >
                                {choiceDisplayTitle}
                              </span>
                              <span className="game-room-choice-meta ml-3 inline-flex items-center gap-1">
                                {showGuessLockTag && (
                                  <span
                                    className={`game-room-choice-tag ${
                                      myHasChangedAnswer
                                        ? "game-room-choice-tag--reselect"
                                        : "game-room-choice-tag--lock"
                                    }`}
                                  >
                                    {myHasChangedAnswer ? "已改答" : "已鎖定"}
                                  </span>
                                )}
                                {showGuessDecisionTag && (
                                  <span className="game-room-choice-tag game-room-choice-tag--decision">
                                    {`決斷+${myDecisionBonusPreviewPoints}`}
                                  </span>
                                )}
                                {showCorrectTag && (
                                  <span className="game-room-choice-tag game-room-choice-tag--correct">
                                    正解
                                  </span>
                                )}
                                {showMyChoiceTag && (
                                  <span
                                    className={`game-room-choice-tag ${showMyCorrectTag
                                      ? "game-room-choice-tag--you-correct"
                                      : "game-room-choice-tag--you"
                                      }`}
                                  >
                                    {showMyCorrectTag ? "你答對" : "你的答案"}
                                  </span>
                                )}
                                <span className="game-room-choice-key inline-flex h-6 w-6 flex-none items-center justify-center rounded bg-slate-800 text-[11px] font-semibold text-slate-200 border border-slate-700">
                                  {(keyBindings[idx] ?? "").toUpperCase()}
                                </span>
                              </span>
                            </div>
                          </Button>
                        );
                      })}
                  </div>
                </div>

                <div className="game-room-reveal">
                  <div
                    className={`game-room-reveal-card rounded-lg border game-room-reveal-card--${revealTone} ${isReveal ? "game-room-reveal-card--result" : ""} ${isPendingFeedbackCard ? "game-room-reveal-card--pending" : ""}`}
                  >
                    <div
                      className={`game-room-feedback-head ${
                        isReveal ? "game-room-feedback-head--reveal" : ""
                      }`}
                    >
                      <p className="game-room-feedback-title">{myFeedback.title}</p>
                      {isReveal && myFeedback.inlineMeta && (
                        <span
                          className={`game-room-feedback-inline-meta game-room-feedback-inline-meta--${revealTone}`}
                          title={myFeedback.inlineMeta}
                        >
                          {myFeedback.inlineMeta}
                        </span>
                      )}
                      {isReveal && (
                        <span
                          className={`game-room-feedback-pill game-room-feedback-pill--${revealTone} ${
                            (myFeedback.pillText ?? myFeedback.detail) ? "" : "game-room-feedback-pill--placeholder"
                          }`}
                          title={(myFeedback.pillText ?? myFeedback.detail) || ""}
                        >
                          {(myFeedback.pillText ?? myFeedback.detail) || "—"}
                        </span>
                      )}
                    </div>
                    {!isReveal && (!Array.isArray(myFeedback.lines) || myFeedback.lines.length === 0) ? (
                      myFeedback.detail && (
                        <p className="game-room-feedback-detail">{myFeedback.detail}</p>
                      )
                    ) : !isReveal && (
                      <div className={`game-room-feedback-lines ${isReveal ? "mt-1" : "mt-1.5"}`}>
                        {(Array.isArray(myFeedback.lines) ? myFeedback.lines : [])
                          .slice(0, 2)
                          .map((line, idx) => (
                          <p
                            key={`${trackSessionKey}-feedback-line-${idx}`}
                            className="game-room-feedback-line"
                            title={line}
                          >
                            {line}
                          </p>
                        ))}
                      </div>
                    )}
                    {!isReveal &&
                      (!Array.isArray(myFeedback.lines) || myFeedback.lines.length === 0) &&
                      myFeedback.badges.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {myFeedback.badges.map((badge) => (
                          <span
                            key={`${trackSessionKey}-${badge}`}
                            className="inline-flex items-center rounded-full border border-white/10 bg-slate-950/35 px-2 py-0.5 text-[10px] font-semibold text-slate-200"
                          >
                            {badge}
                          </span>
                        ))}
                      </div>
                    )}
                    {isReveal && (
                      <>
                        <p
                          className="game-room-reveal-answer mt-1 text-sm text-emerald-50"
                          title={resolvedAnswerTitle}
                        >
                          <span className="mr-1 text-[11px] font-semibold text-emerald-200">
                            正解
                          </span>
                          {resolvedAnswerTitle}
                        </p>
                        {gameState.status === "playing" ? (
                          <p className="mt-1 text-xs text-emerald-200">
                            {Math.ceil(revealCountdownMs / 1000)} 秒後下一首
                          </p>
                        ) : (
                          <div className="mt-1 flex items-center justify-between">
                            <p className="text-xs text-emerald-200">
                              已播放完本輪歌曲，請房主挑選新的歌單。
                            </p>
                            <Button
                              size="small"
                              variant="outlined"
                              color="inherit"
                              onClick={openExitConfirm}
                            >
                              退出遊戲
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
        {audioGestureOverlay}
        {startBroadcastOverlay}
        {exitGameDialog}
      </div>
    </div>
  );
};

export default GameRoomPage;
