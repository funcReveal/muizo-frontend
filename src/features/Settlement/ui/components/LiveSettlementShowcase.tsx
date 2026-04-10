import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import useMediaQuery from "@mui/material/useMediaQuery";
import UnfoldLessRoundedIcon from "@mui/icons-material/UnfoldLessRounded";
import UnfoldMoreRoundedIcon from "@mui/icons-material/UnfoldMoreRounded";

import { trackEvent } from "../../../../shared/analytics/track";
import { useSettingsModel } from "../../../Setting/model/settingsContext";
import { type SettlementTrackLink } from "../../model/settlementLinks";
import type {
  ChatMessage,
  PlaylistItem,
  RoomParticipant,
  RoomState,
} from "../../../Room/model/types";
import type { SettlementQuestionRecap } from "../../model/types";
import { type RecommendCategory } from "../lib/settlementUtils";
import OverviewSection from "./liveSettlementShowcase/OverviewSection";
import RecommendGuideSection from "./liveSettlementShowcase/RecommendGuideSection";
import {
  AUTO_PREVIEW_STORAGE_KEY,
  MULTILINE_ELLIPSIS_2,
  PERFORMANCE_GRADE_META,
  QUICK_SOLVE_TIME_CAP_MS,
  RECOMMEND_CATEGORY_THEME,
  RECOMMEND_PREVIEW_SECONDS,
  REVIEW_DOUBLE_PLAY_STORAGE_KEY,
  REVIEW_STATUS_BADGE_BASE,
  buildRecommendationCard,
  buildRecommendationLink,
  clampMs,
  formatElapsed,
  formatMs,
  formatPercent,
  readStoredBoolean,
  resolveCorrectAnsweredRank,
  resolveParticipantAnswer,
  resolveParticipantResult,
  resolveRecapTrack,
  type SettlementExtendedRecap,
  type SettlementRecommendationCard,
} from "./liveSettlementShowcase/showcasePrimitives";
import useSettlementPreviewPlayback from "../../model/useSettlementPreviewPlayback";
import useSettlementRecommendLifecycle from "../../model/useSettlementRecommendLifecycle";
import useSettlementRecommendationNavigator from "../../model/useSettlementRecommendationNavigator";
import useSettlementRecommendationInsights from "../../model/useSettlementRecommendationInsights";
import ReviewRecapSection from "./liveSettlementShowcase/ReviewRecapSection";
import useSettlementRecapSelectionState from "../../model/useSettlementRecapSelectionState";
import useSettlementReviewState from "../../model/useSettlementReviewState";
import SettlementStageHeader from "./liveSettlementShowcase/SettlementStageHeader";
import SettlementMobileFooter from "./liveSettlementShowcase/SettlementMobileFooter";
import SettlementExitDialog from "./liveSettlementShowcase/SettlementExitDialog";

type LiveSettlementTab = "overview" | "recommend";
type PreviewPlaybackMode = "idle" | "auto" | "manual";

type ExtendedRecap = SettlementExtendedRecap;
type RecommendationCard = SettlementRecommendationCard<ExtendedRecap>;

interface LiveSettlementShowcaseProps {
  room: RoomState["room"];
  participants: RoomParticipant[];
  participantAvatarFallbacks?: RoomParticipant[];
  messages: ChatMessage[];
  playlistItems?: PlaylistItem[];
  trackOrder?: number[];
  playedQuestionCount: number;
  startedAt?: number;
  endedAt?: number;
  meClientId?: string;
  questionRecaps?: SettlementQuestionRecap[];
  upcomingGameStartAt?: number | null;
  nowMs?: number;
  selfAvatarUrl?: string | null;
  onBackToLobby?: () => void;
  onRequestExit?: () => void;
}

const TAB_ORDER: LiveSettlementTab[] = ["overview", "recommend"];

const TAB_LABELS: Record<LiveSettlementTab, string> = {
  overview: "總覽",
  recommend: "推薦 + 題目回顧",
};

const TAB_HINTS: Record<LiveSettlementTab, string> = {
  overview: "查看 podium、排行榜與本場關鍵表現",
  recommend: "查看推薦導覽、題目清單與回顧詳情",
};

const SETTLEMENT_OVERVIEW_BGM_PATH = "/Muizo_result_bgm.mp3";

const RECOMMEND_CATEGORY_LABELS: Record<RecommendCategory, string> = {
  quick: "全員速解",
  confuse: "易混淆",
  hard: "高難挑戰",
  other: "其餘歌曲",
};

const RECOMMEND_CATEGORY_SHORT_HINT: Record<RecommendCategory, string> = {
  quick: "全員答對且速度快的題目",
  confuse: "玩家常改答案、容易混淆的題目",
  hard: "答錯或未作答比例較高的題目",
  other: "其餘值得回顧的歌曲",
};

const useAnimatedCountdownSeconds = (
  targetAtMs: number | null,
  enabled: boolean,
) => {
  const [countdownSec, setCountdownSec] = useState(0);

  useEffect(() => {
    if (!enabled || targetAtMs === null) return;
    let timerId: number | null = null;
    const tick = () => {
      const remainingMs = Math.max(0, targetAtMs - Date.now());
      setCountdownSec(Math.max(0, Math.ceil(remainingMs / 1000)));
      if (remainingMs <= 0) return;
      timerId = window.setTimeout(tick, remainingMs <= 4500 ? 200 : 1000);
    };
    tick();
    return () => {
      if (timerId !== null) window.clearTimeout(timerId);
    };
  }, [enabled, targetAtMs]);

  return enabled && targetAtMs !== null ? countdownSec : 0;
};

const useUpcomingStartGuard = (
  upcomingGameStartAt: number | null,
  externalNowMs?: number,
) => {
  const [renderNowMs, setRenderNowMs] = useState(() =>
    typeof externalNowMs === "number" && Number.isFinite(externalNowMs)
      ? externalNowMs
      : Date.now(),
  );

  useEffect(() => {
    if (typeof externalNowMs === "number" && Number.isFinite(externalNowMs))
      return;
    if (!upcomingGameStartAt || !Number.isFinite(upcomingGameStartAt)) return;
    let timerId: number | null = null;
    const tick = () => {
      const now = Date.now();
      setRenderNowMs(now);
      const remainingMs = Math.max(0, upcomingGameStartAt - now);
      if (remainingMs <= 0) return;
      timerId = window.setTimeout(tick, remainingMs <= 5000 ? 200 : 1000);
    };
    tick();
    return () => {
      if (timerId !== null) window.clearTimeout(timerId);
    };
  }, [externalNowMs, upcomingGameStartAt]);

  const effectiveNowMs =
    typeof externalNowMs === "number" && Number.isFinite(externalNowMs)
      ? externalNowMs
      : renderNowMs;

  if (!upcomingGameStartAt || !Number.isFinite(upcomingGameStartAt)) {
    return {
      isPending: false,
      remainingMs: 0,
      remainingSec: 0,
      warnMode: false,
    };
  }

  const remainingMs = Math.max(0, upcomingGameStartAt - effectiveNowMs);
  return {
    isPending: remainingMs > 0,
    remainingMs,
    remainingSec: Math.ceil(remainingMs / 1000),
    warnMode: remainingMs <= 5000,
  };
};

const RESULT_META: Record<
  "correct" | "wrong" | "unanswered",
  { label: string; badgeClass: string }
> = {
  correct: {
    label: "答對",
    badgeClass: "border-emerald-300/45 bg-emerald-500/18 text-emerald-50",
  },
  wrong: {
    label: "答錯",
    badgeClass: "border-rose-300/45 bg-rose-500/18 text-rose-50",
  },
  unanswered: {
    label: "未作答",
    badgeClass: "border-slate-400/55 bg-slate-700/55 text-slate-100",
  },
};

const getChangedAnswerCount = (answer: unknown): number => {
  if (!answer || typeof answer !== "object") return 0;
  const value = (answer as { changedAnswerCount?: number }).changedAnswerCount;
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, value)
    : 0;
};

const buildFallbackRecaps = (
  playlistItems: PlaylistItem[],
  trackOrder: number[],
): ExtendedRecap[] =>
  trackOrder.map((trackIndex, index) => {
    const item = playlistItems[trackIndex];
    const title =
      item?.answerText?.trim() || item?.title?.trim() || `歌曲 ${index + 1}`;
    const uploader = item?.uploader?.trim() || "未知作者";
    const choices = trackOrder
      .slice(0, 4)
      .map((choiceTrackIndex, choiceIndex) => {
        const choiceItem = playlistItems[choiceTrackIndex];
        const choiceTitle =
          choiceItem?.answerText?.trim() ||
          choiceItem?.title?.trim() ||
          `選項 ${choiceIndex + 1}`;
        return {
          index: choiceIndex,
          title: choiceTitle,
          isCorrect: choiceTrackIndex === trackIndex,
          isSelectedByMe: false,
        };
      });

    return {
      key: `fallback:${index}:${trackIndex}`,
      order: index + 1,
      trackIndex,
      title,
      uploader,
      duration: item?.duration ?? null,
      thumbnail: item?.thumbnail ?? null,
      myResult: "unanswered",
      myChoiceIndex: null,
      correctChoiceIndex: 0,
      choices,
      provider: item?.provider,
      sourceId: item?.sourceId ?? null,
      channelId: item?.channelId ?? null,
      videoId: item?.videoId,
      url: item?.url,
    };
  });

const LiveSettlementShowcase: React.FC<LiveSettlementShowcaseProps> = ({
  room,
  participants,
  participantAvatarFallbacks = [],
  messages,
  playlistItems = [],
  trackOrder = [],
  playedQuestionCount,
  startedAt,
  endedAt,
  meClientId,
  questionRecaps = [],
  upcomingGameStartAt = null,
  nowMs,
  selfAvatarUrl = null,
  onBackToLobby,
  onRequestExit,
}) => {
  const {
    gameVolume,
    bgmVolume,
    setGameVolume,
    sfxEnabled,
    sfxVolume,
    settlementPreviewSyncGameVolume,
    settlementPreviewVolume,
    setSettlementPreviewVolume,
  } = useSettingsModel();
  const [activeTab, setActiveTab] = useState<LiveSettlementTab>("overview");
  const [isMobileRecommendCategoryOpen, setIsMobileRecommendCategoryOpen] =
    useState(true);
  const [isMobileRecommendInsightOpen, setIsMobileRecommendInsightOpen] =
    useState(true);
  const [isMobileRecommendPanelOpen, setIsMobileRecommendPanelOpen] =
    useState(true);
  const [isMobileReviewListOpen, setIsMobileReviewListOpen] = useState(true);
  const [isMobileReviewDetailTopOpen, setIsMobileReviewDetailTopOpen] =
    useState(true);
  const [recommendCategory, setRecommendCategory] =
    useState<RecommendCategory>("quick");
  const [recommendIndex, setRecommendIndex] = useState(0);
  const [autoPreviewEnabled, setAutoPreviewEnabled] = useState(() =>
    readStoredBoolean(AUTO_PREVIEW_STORAGE_KEY, true),
  );
  const [reviewDoubleClickPlayEnabled, setReviewDoubleClickPlayEnabled] =
    useState(() => readStoredBoolean(REVIEW_DOUBLE_PLAY_STORAGE_KEY, true));
  const [previewCountdownSec, setPreviewCountdownSec] = useState(
    RECOMMEND_PREVIEW_SECONDS,
  );
  const [autoAdvanceAtMs, setAutoAdvanceAtMs] = useState<number | null>(null);
  const [pausedCountdownRemainingMs, setPausedCountdownRemainingMs] = useState<
    number | null
  >(null);
  const [previewPlaybackMode, setPreviewPlaybackMode] =
    useState<PreviewPlaybackMode>("idle");
  const [previewPlayerState, setPreviewPlayerState] = useState<
    "idle" | "playing" | "paused"
  >("idle");
  const [selectedReviewRecapKey, setSelectedReviewRecapKey] = useState<
    string | null
  >(null);
  const [previewRecapKey, setPreviewRecapKey] = useState<string | null>(null);
  const [previewSwitchNotice, setPreviewSwitchNotice] = useState<string | null>(
    null,
  );
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  const [tabRenderKey, setTabRenderKey] = useState(0);
  const isMobileSettlementViewport = useMediaQuery("(max-width: 1023.95px)");
  const settlementHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const settlementStageRef = useRef<HTMLElement | null>(null);
  const recommendSectionRef = useRef<HTMLElement | null>(null);
  const recommendPreviewStageRef = useRef<HTMLDivElement | null>(null);
  const celebrationKeyRef = useRef<string | null>(null);
  const autoAdvanceTimeoutRef = useRef<number | null>(null);
  const autoCenteredRecommendRoundKeyRef = useRef<string | null>(null);
  const autoAnchoredSettlementRoundKeyRef = useRef<string | null>(null);
  const exitConfirmLockedRef = useRef(false);
  const previewCommandTimersRef = useRef<number[]>([]);
  const settlementOverviewBgmRef = useRef<HTMLAudioElement | null>(null);

  const stepIndex = TAB_ORDER.indexOf(activeTab);
  const areAllMobileRecommendSectionsExpanded =
    isMobileRecommendCategoryOpen &&
    isMobileRecommendInsightOpen &&
    isMobileRecommendPanelOpen &&
    isMobileReviewListOpen &&
    isMobileReviewDetailTopOpen;
  const areAnyMobileRecommendSectionsExpanded =
    isMobileRecommendCategoryOpen ||
    isMobileRecommendInsightOpen ||
    isMobileRecommendPanelOpen ||
    isMobileReviewListOpen ||
    isMobileReviewDetailTopOpen;
  const expandAllMobileRecommendSections = useCallback(() => {
    setIsMobileRecommendCategoryOpen(true);
    setIsMobileRecommendInsightOpen(true);
    setIsMobileRecommendPanelOpen(true);
    setIsMobileReviewListOpen(true);
    setIsMobileReviewDetailTopOpen(true);
  }, []);
  const collapseAllMobileRecommendSections = useCallback(() => {
    setIsMobileRecommendCategoryOpen(false);
    setIsMobileRecommendInsightOpen(false);
    setIsMobileRecommendPanelOpen(false);
    setIsMobileReviewListOpen(false);
    setIsMobileReviewDetailTopOpen(false);
  }, []);
  const settlementParticipants = useMemo(() => {
    const fallbackByClientId = new Map(
      participantAvatarFallbacks.map((participant) => [
        participant.clientId,
        participant,
      ]),
    );

    return participants.map((participant) => {
      const fallbackParticipant =
        fallbackByClientId.get(participant.clientId) ?? null;
      const resolvedAvatarUrl =
        participant.avatar_url ??
        participant.avatarUrl ??
        fallbackParticipant?.avatar_url ??
        fallbackParticipant?.avatarUrl ??
        (meClientId && participant.clientId === meClientId
          ? selfAvatarUrl
          : null) ??
        null;

      return {
        ...participant,
        avatar_url: resolvedAvatarUrl,
        avatarUrl: resolvedAvatarUrl,
      };
    });
  }, [meClientId, participantAvatarFallbacks, participants, selfAvatarUrl]);

  const {
    sortedParticipants,
    winner,
    runnerUp,
    thirdPlace,
    me,
    myRank,
    setSelectedReviewParticipantClientId,
    effectiveSelectedReviewParticipantClientId,
    selectedReviewParticipant,
    selectedReviewParticipantRank,
    goPrevReviewParticipant,
    goNextReviewParticipant,
    topAccuracyEntry,
    topComboEntry,
    fastestAverageAnswerEntry,
    participantScoreMeta,
  } = useSettlementReviewState({
    participants: settlementParticipants,
    playedQuestionCount,
    meClientId,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      AUTO_PREVIEW_STORAGE_KEY,
      autoPreviewEnabled ? "1" : "0",
    );
  }, [autoPreviewEnabled]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      REVIEW_DOUBLE_PLAY_STORAGE_KEY,
      reviewDoubleClickPlayEnabled ? "1" : "0",
    );
  }, [reviewDoubleClickPlayEnabled]);

  const effectivePreviewVolume = settlementPreviewSyncGameVolume
    ? gameVolume
    : settlementPreviewVolume;

  const handleExternalPreviewVolumeChange = useCallback(
    (next: number) => {
      if (settlementPreviewSyncGameVolume) {
        setGameVolume(next);
        return;
      }
      setSettlementPreviewVolume(next);
    },
    [
      settlementPreviewSyncGameVolume,
      setGameVolume,
      setSettlementPreviewVolume,
    ],
  );

  useEffect(() => {
    if (!sfxEnabled) return;
    if (typeof window === "undefined") return;
    const celebrationKey = `${room.id}:${startedAt ?? 0}`;
    if (celebrationKeyRef.current === celebrationKey) return;
    celebrationKeyRef.current = celebrationKey;
    const AudioContextCtor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextCtor) return;
    const ctx = new AudioContextCtor();
    const gain = ctx.createGain();
    gain.gain.value = Math.max(0, Math.min(1, sfxVolume / 100)) * 0.06;
    gain.connect(ctx.destination);
    const now = ctx.currentTime;
    const notes = [587.33, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = freq;
      osc.connect(gain);
      const start = now + idx * 0.12;
      const stop = start + 0.1;
      osc.start(start);
      osc.stop(stop);
    });
    const closeTimer = window.setTimeout(() => {
      void ctx.close().catch(() => undefined);
    }, 700);
    return () => {
      window.clearTimeout(closeTimer);
      void ctx.close().catch(() => undefined);
    };
  }, [room.id, startedAt, sfxEnabled, sfxVolume]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof Audio === "undefined") return;

    const audio = new Audio(SETTLEMENT_OVERVIEW_BGM_PATH);
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = Math.max(0, Math.min(1, bgmVolume / 100));
    settlementOverviewBgmRef.current = audio;

    return () => {
      audio.pause();
      audio.currentTime = 0;
      audio.src = "";
      settlementOverviewBgmRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!settlementOverviewBgmRef.current) return;
    settlementOverviewBgmRef.current.volume = Math.max(
      0,
      Math.min(1, bgmVolume / 100),
    );
  }, [bgmVolume]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (typeof document === "undefined") return;

    const audio = settlementOverviewBgmRef.current;
    if (!audio) return;

    const shouldPlayOverviewBgm = activeTab === "overview";
    const tryPlayOverviewBgm = () => {
      if (!shouldPlayOverviewBgm || document.hidden) return;
      void audio.play().catch(() => {
        // Browser autoplay policy may block until the next user gesture.
      });
    };
    const stopOverviewBgm = (resetToStart = false) => {
      audio.pause();
      if (resetToStart) {
        audio.currentTime = 0;
      }
    };

    if (!shouldPlayOverviewBgm) {
      stopOverviewBgm(true);
      return;
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopOverviewBgm();
        return;
      }
      tryPlayOverviewBgm();
    };
    const handleWindowBlur = () => {
      stopOverviewBgm();
    };
    const handleWindowFocus = () => {
      tryPlayOverviewBgm();
    };

    tryPlayOverviewBgm();
    window.addEventListener("pointerdown", tryPlayOverviewBgm, {
      passive: true,
    });
    window.addEventListener("keydown", tryPlayOverviewBgm);
    window.addEventListener("focus", handleWindowFocus);
    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pointerdown", tryPlayOverviewBgm);
      window.removeEventListener("keydown", tryPlayOverviewBgm);
      window.removeEventListener("focus", handleWindowFocus);
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      stopOverviewBgm(true);
    };
  }, [activeTab]);

  const normalizedRecaps = useMemo<ExtendedRecap[]>(() => {
    if (questionRecaps.length > 0) {
      return questionRecaps.map((recap) => {
        const item = resolveRecapTrack(recap as ExtendedRecap, playlistItems);
        return {
          ...(recap as ExtendedRecap),
          provider: (recap as ExtendedRecap).provider ?? item?.provider,
          sourceId: (recap as ExtendedRecap).sourceId ?? item?.sourceId ?? null,
          channelId:
            (recap as ExtendedRecap).channelId ?? item?.channelId ?? null,
          videoId: (recap as ExtendedRecap).videoId ?? item?.videoId,
          url: (recap as ExtendedRecap).url ?? item?.url,
        };
      });
    }
    return buildFallbackRecaps(playlistItems, trackOrder);
  }, [playlistItems, questionRecaps, trackOrder]);

  const {
    reviewRecapSummary,
    reviewRecaps,
    effectiveSelectedRecapKey,
    selectedRecap,
    selectedRecapLink,
    selectedRecapAnswer,
    selectedRecapCorrectRank,
    reviewContextTransitionKey,
    reviewDetailTransitionKey,
  } = useSettlementRecapSelectionState({
    normalizedRecaps,
    selectedRecapKey: selectedReviewRecapKey,
    effectiveSelectedReviewParticipantClientId,
    meClientId,
    resolveParticipantResult,
    resolveParticipantAnswer,
    resolveCorrectAnsweredRank,
    buildRecommendationLink,
  });

  const configuredAnswerWindowMs = useMemo(() => {
    const sec = room.gameSettings?.playDurationSec;
    if (typeof sec !== "number" || !Number.isFinite(sec) || sec <= 0) {
      return 15_000;
    }
    return sec * 1000;
  }, [room.gameSettings?.playDurationSec]);
  const quickSolveThresholdMs = useMemo(
    () =>
      clampMs(
        Math.min(configuredAnswerWindowMs, QUICK_SOLVE_TIME_CAP_MS),
        2500,
        QUICK_SOLVE_TIME_CAP_MS,
      ),
    [configuredAnswerWindowMs],
  );
  const {
    recommendationCardsByCategory,
    performanceRatingByRecapKey,
    personalFastestCorrectRecapKeys,
    selectedRecapRating,
    selectedRecapAverageCorrectMs,
    activeRecommendCategory,
    recommendationCards,
    canNavigateRecommendations,
    safeRecommendIndex,
    currentRecommendation,
    currentRecommendationLink,
    currentRecommendationPreviewUrl,
    currentRecommendationAverageCorrectMs,
    isCurrentRecommendationPreviewOpen,
    isCurrentRecommendationFastest,
    recommendationTransitionKey,
    currentRecommendationRating,
    currentRecommendationGradeMeta,
    currentRecommendationCorrectRank,
    currentRecommendationSpeedInsight,
    currentRecommendationResultTone,
    isCurrentRecommendationFirstCorrect,
    showCurrentRecommendationRankBadge,
    isCurrentRecommendationGlobalFastest,
    currentRecommendationFastestBadgeText,
    selectedRecapFastestCorrectMeta,
    currentRecommendationFastestCorrectMeta,
    hasCurrentRecommendationSpeedDelta,
    shouldShowPreviewOverlay,
    canAutoGuideLoop,
  } = useSettlementRecommendationInsights<ExtendedRecap, RecommendationCard>({
    normalizedRecaps,
    participants,
    participantsLength: participants.length,
    configuredAnswerWindowMs,
    quickSolveThresholdMs,
    recommendCategory,
    recommendIndex,
    previewRecapKey,
    previewPlaybackMode,
    previewPlayerState,
    pausedCountdownRemainingMs,
    activeTab,
    autoPreviewEnabled,
    effectiveSelectedReviewParticipantClientId,
    meClientId,
    selectedRecap,
    selectedRecapAnswerResult: selectedRecapAnswer.result,
    selectedRecapCorrectRank,
    buildRecommendationCard,
    resolveParticipantAnswer,
    resolveCorrectAnsweredRank,
    getChangedAnswerCount,
    formatMs,
    formatPercent,
    performanceGradeMeta: PERFORMANCE_GRADE_META,
    resultMeta: RESULT_META,
  });

  const activeCategoryTheme = RECOMMEND_CATEGORY_THEME[activeRecommendCategory];

  const {
    previewIframeRef,
    postYouTubeCommand,
    registerYouTubeBridge,
    syncPreviewVolume,
    pushPreviewSwitchNotice,
    autoAdvanceAtMsRef,
    pausedCountdownRemainingMsRef,
    previewPlayerStateRef,
    previewLastProgressAtMsRef,
  } = useSettlementPreviewPlayback({
    previewRecapKey,
    effectivePreviewVolume,
    autoAdvanceAtMs,
    pausedCountdownRemainingMs,
    previewPlayerState,
    canAutoGuideLoop,
    setAutoAdvanceAtMs,
    setPausedCountdownRemainingMs,
    setPreviewPlayerState,
    setPreviewCountdownSec,
    setPreviewSwitchNotice,
    onExternalPreviewVolumeChange: handleExternalPreviewVolumeChange,
  });
  const {
    jumpToRecommendation,
    jumpToRecapPreview,
    startAutoGuideFromPreferredCategory,
    activateRecommendationCategory,
    goPrevRecommendation,
    goNextRecommendation,
    recommendNavLabels,
    advanceAutoRecommendationLoop,
  } = useSettlementRecommendationNavigator({
    recommendationCardsByCategory,
    recommendationCards,
    activeRecommendCategory,
    safeRecommendIndex,
    autoPreviewEnabled,
    reviewDoubleClickPlayEnabled,
    previewPlaybackMode,
    canAutoGuideLoop,
    recommendPreviewSeconds: RECOMMEND_PREVIEW_SECONDS,
    pausedCountdownRemainingMsRef,
    previewPlayerStateRef,
    pushPreviewSwitchNotice,
    setRecommendCategory,
    setRecommendIndex,
    setSelectedRecapKey: setSelectedReviewRecapKey,
    setPreviewPlaybackMode,
    setPreviewRecapKey,
    setPreviewPlayerState,
    setAutoAdvanceAtMs,
    setPausedCountdownRemainingMs,
    setPreviewCountdownSec,
  });
  const { resetRecommendPreviewState } = useSettlementRecommendLifecycle({
    activeTab,
    autoPreviewEnabled,
    previewPlaybackMode,
    autoAdvanceAtMs,
    pausedCountdownRemainingMs,
    previewPlayerState,
    isCurrentRecommendationPreviewOpen,
    currentRecommendationPreviewUrl,
    recommendPreviewSeconds: RECOMMEND_PREVIEW_SECONDS,
    autoAdvanceAtMsRef,
    pausedCountdownRemainingMsRef,
    previewPlayerStateRef,
    previewLastProgressAtMsRef,
    postYouTubeCommand,
    pushPreviewSwitchNotice,
    setPreviewPlaybackMode,
    setPreviewRecapKey,
    setPreviewPlayerState,
    setAutoAdvanceAtMs,
    setPausedCountdownRemainingMs,
    setPreviewCountdownSec,
  });

  const elapsedLabel = formatElapsed(startedAt, endedAt);

  const gameEndTime = useMemo(() => {
    if (
      typeof endedAt === "number" &&
      Number.isFinite(endedAt) &&
      endedAt > 0
    ) {
      return endedAt;
    }
    return messages[messages.length - 1]?.timestamp;
  }, [endedAt, messages]);
  const settlementTimeChipLabel = useMemo(() => {
    if (
      typeof startedAt === "number" &&
      Number.isFinite(startedAt) &&
      startedAt > 0
    ) {
      return `開始於 ${new Date(startedAt).toLocaleString()}`;
    }
    if (gameEndTime) {
      return `結束於 ${new Date(gameEndTime).toLocaleString()}`;
    }
    return null;
  }, [gameEndTime, startedAt]);

  const settlementStartGuard = useUpcomingStartGuard(
    upcomingGameStartAt,
    nowMs,
  );
  const animatedPreviewCountdownSec = useAnimatedCountdownSeconds(
    autoAdvanceAtMs,
    canAutoGuideLoop,
  );
  const displayedPreviewCountdownSec =
    canAutoGuideLoop &&
    previewPlaybackMode === "auto" &&
    pausedCountdownRemainingMs === null
      ? animatedPreviewCountdownSec
      : previewCountdownSec;

  const handleOpenTrackLink = useCallback(
    (link: SettlementTrackLink, recap: ExtendedRecap) => {
      if (!link.href) return;
      trackEvent("settlement_outbound_click", {
        surface: "settlement",
        provider: link.provider,
        link_type: link.linkType,
        room_id: room.id,
        track_order: recap.order,
        source_id: link.sourceId ?? "",
      });
      window.open(link.href, "_blank", "noopener,noreferrer");
    },
    [room.id],
  );

  const handleOpenRecommendationTitle = useCallback(() => {
    if (!currentRecommendation || !currentRecommendationLink) return;
    handleOpenTrackLink(currentRecommendationLink, currentRecommendation.recap);
  }, [currentRecommendation, currentRecommendationLink, handleOpenTrackLink]);

  const dispatchPreviewCommand = useCallback(
    (command: "playVideo" | "pauseVideo") => {
      previewCommandTimersRef.current.forEach((id) => window.clearTimeout(id));
      previewCommandTimersRef.current = [];
      postYouTubeCommand(command);
      previewCommandTimersRef.current.push(
        window.setTimeout(() => postYouTubeCommand(command), 180),
        window.setTimeout(() => postYouTubeCommand(command), 420),
      );
    },
    [postYouTubeCommand],
  );

  const clearQueuedPreviewCommands = useCallback(() => {
    previewCommandTimersRef.current.forEach((id) => window.clearTimeout(id));
    previewCommandTimersRef.current = [];
  }, []);

  const handleQuickPlayStart = useCallback(() => {
    if (!currentRecommendationPreviewUrl || !currentRecommendation) return;
    const keepAutoMode = autoPreviewEnabled && previewPlaybackMode === "auto";
    setPreviewPlaybackMode(keepAutoMode ? "auto" : "manual");
    if (!isCurrentRecommendationPreviewOpen) {
      setPreviewRecapKey(currentRecommendation.recap.key);
    } else {
      dispatchPreviewCommand("playVideo");
    }
    setPreviewPlayerState("playing");
    if (!keepAutoMode) {
      setAutoAdvanceAtMs(null);
      setPausedCountdownRemainingMs(null);
      setPreviewCountdownSec(RECOMMEND_PREVIEW_SECONDS);
      return;
    }
    if (pausedCountdownRemainingMs !== null) {
      const remainingMs = Math.max(0, pausedCountdownRemainingMs);
      setAutoAdvanceAtMs(Date.now() + remainingMs);
      setPausedCountdownRemainingMs(null);
      setPreviewCountdownSec(Math.max(0, Math.ceil(remainingMs / 1000)));
    }
  }, [
    autoPreviewEnabled,
    currentRecommendation,
    currentRecommendationPreviewUrl,
    dispatchPreviewCommand,
    isCurrentRecommendationPreviewOpen,
    pausedCountdownRemainingMs,
    previewPlaybackMode,
  ]);

  const handlePreviewSurfaceClick = useCallback(() => {
    if (!currentRecommendationPreviewUrl || !currentRecommendation) return;

    if (!isCurrentRecommendationPreviewOpen || previewPlayerState === "idle") {
      handleQuickPlayStart();
      return;
    }

    if (previewPlayerState === "playing") {
      dispatchPreviewCommand("pauseVideo");
      const remainingMs =
        previewPlaybackMode === "auto" && autoAdvanceAtMs !== null
          ? Math.max(0, autoAdvanceAtMs - Date.now())
          : Math.max(
              0,
              pausedCountdownRemainingMs ?? RECOMMEND_PREVIEW_SECONDS * 1000,
            );
      setPreviewPlaybackMode(
        previewPlaybackMode === "auto" ? "auto" : "manual",
      );
      setPreviewPlayerState("paused");
      setAutoAdvanceAtMs(null);
      setPausedCountdownRemainingMs(remainingMs);
      setPreviewCountdownSec(Math.max(0, Math.ceil(remainingMs / 1000)));
      return;
    }

    handleQuickPlayStart();
  }, [
    autoAdvanceAtMs,
    currentRecommendation,
    currentRecommendationPreviewUrl,
    handleQuickPlayStart,
    isCurrentRecommendationPreviewOpen,
    pausedCountdownRemainingMs,
    dispatchPreviewCommand,
    previewPlaybackMode,
    previewPlayerState,
  ]);

  const handleToggleAutoPreview = useCallback(() => {
    const next = !autoPreviewEnabled;
    if (!next) {
      clearQueuedPreviewCommands();
      if (
        currentRecommendationPreviewUrl &&
        isCurrentRecommendationPreviewOpen
      ) {
        setPreviewPlaybackMode("manual");
        setPreviewPlayerState("paused");
        setAutoAdvanceAtMs(null);
        setPausedCountdownRemainingMs(null);
        setPreviewCountdownSec(RECOMMEND_PREVIEW_SECONDS);
        dispatchPreviewCommand("pauseVideo");
      } else {
        resetRecommendPreviewState({ preserveCurrentPreview: true });
      }
      setAutoPreviewEnabled(false);
      return;
    }

    setAutoPreviewEnabled(true);
    clearQueuedPreviewCommands();
    if (recommendationCards.length > 0 && currentRecommendationPreviewUrl) {
      jumpToRecommendation(activeRecommendCategory, safeRecommendIndex, {
        playbackMode: "auto",
        forcePreview: true,
      });
      window.setTimeout(
        () => dispatchPreviewCommand("playVideo"),
        isCurrentRecommendationPreviewOpen ? 120 : 260,
      );
    } else {
      startAutoGuideFromPreferredCategory(activeRecommendCategory);
    }
  }, [
    activeRecommendCategory,
    autoPreviewEnabled,
    clearQueuedPreviewCommands,
    currentRecommendationPreviewUrl,
    dispatchPreviewCommand,
    isCurrentRecommendationPreviewOpen,
    jumpToRecommendation,
    recommendationCards.length,
    resetRecommendPreviewState,
    safeRecommendIndex,
    startAutoGuideFromPreferredCategory,
  ]);

  const handleSelectRecommendationByIndex = useCallback(
    (index: number) => {
      jumpToRecommendation(activeRecommendCategory, index, {
        playbackMode: autoPreviewEnabled
          ? "auto"
          : previewPlayerState !== "idle" || previewPlaybackMode === "manual"
            ? "manual"
            : undefined,
      });
    },
    [
      activeRecommendCategory,
      autoPreviewEnabled,
      jumpToRecommendation,
      previewPlaybackMode,
      previewPlayerState,
    ],
  );

  const handleOpenRecommendationCardLink = useCallback(
    (card: {
      recap: { key: string };
      link?: { href?: string | null } | null;
    }) => {
      if (!card.link?.href) return;
      const recap = normalizedRecaps.find(
        (entry) => entry.key === card.recap.key,
      );
      if (!recap) return;
      handleOpenTrackLink(buildRecommendationLink(recap), recap);
    },
    [handleOpenTrackLink, normalizedRecaps],
  );

  const handleRecommendPreviewIframeLoad = useCallback(() => {
    registerYouTubeBridge();
    syncPreviewVolume();
    const shouldAttemptPlay =
      (previewPlaybackMode === "manual" &&
        previewPlayerStateRef.current === "playing") ||
      (previewPlaybackMode === "auto" &&
        autoAdvanceAtMsRef.current !== null &&
        pausedCountdownRemainingMsRef.current === null);
    if (!shouldAttemptPlay) return;
    window.setTimeout(() => dispatchPreviewCommand("playVideo"), 180);
  }, [
    autoAdvanceAtMsRef,
    dispatchPreviewCommand,
    pausedCountdownRemainingMsRef,
    previewPlaybackMode,
    previewPlayerStateRef,
    registerYouTubeBridge,
    syncPreviewVolume,
  ]);

  const handleJumpToRecapPreview = useCallback(
    (
      recap: (typeof normalizedRecaps)[number],
      source: "click" | "doubleClick" = "doubleClick",
    ) => {
      const isSameRecapDoubleClick =
        source === "doubleClick" &&
        reviewDoubleClickPlayEnabled &&
        previewRecapKey === recap.key &&
        currentRecommendation?.recap.key === recap.key &&
        Boolean(currentRecommendationPreviewUrl);

      if (isSameRecapDoubleClick) {
        setPreviewPlaybackMode("manual");
        setPreviewPlayerState("playing");
        setAutoAdvanceAtMs(null);
        setPausedCountdownRemainingMs(null);
        setPreviewCountdownSec(RECOMMEND_PREVIEW_SECONDS);
        dispatchPreviewCommand("playVideo");
        return true;
      }

      return jumpToRecapPreview(recap, source);
    },
    [
      currentRecommendation,
      currentRecommendationPreviewUrl,
      dispatchPreviewCommand,
      jumpToRecapPreview,
      previewRecapKey,
      reviewDoubleClickPlayEnabled,
      setAutoAdvanceAtMs,
      setPausedCountdownRemainingMs,
      setPreviewCountdownSec,
      setPreviewPlaybackMode,
      setPreviewPlayerState,
    ],
  );

  const handleNavigateRecapPreview = useCallback(
    (recap: (typeof normalizedRecaps)[number]) => {
      return jumpToRecapPreview(recap, "click", {
        playbackMode: autoPreviewEnabled
          ? "auto"
          : previewPlayerState !== "idle" || previewPlaybackMode === "manual"
            ? "manual"
            : undefined,
      });
    },
    [
      autoPreviewEnabled,
      jumpToRecapPreview,
      previewPlaybackMode,
      previewPlayerState,
    ],
  );

  const goToTab = useCallback(
    (tab: LiveSettlementTab) => {
      if (tab === activeTab) return;
      setTabRenderKey((prev) => prev + 1);
      setActiveTab(tab);
      if (tab === "recommend") {
        if (autoPreviewEnabled) {
          startAutoGuideFromPreferredCategory(recommendCategory);
        } else {
          activateRecommendationCategory(recommendCategory);
        }
        return;
      }
      resetRecommendPreviewState();
    },
    [
      activeTab,
      autoPreviewEnabled,
      startAutoGuideFromPreferredCategory,
      recommendCategory,
      activateRecommendationCategory,
      resetRecommendPreviewState,
    ],
  );

  const goNextStep = useCallback(() => {
    if (stepIndex < TAB_ORDER.length - 1) {
      goToTab(TAB_ORDER[stepIndex + 1]);
      return;
    }
    if (onBackToLobby) {
      onBackToLobby();
      return;
    }
    if (onRequestExit) {
      setExitConfirmOpen(true);
    }
  }, [stepIndex, goToTab, onBackToLobby, onRequestExit]);

  const goPrevStep = useCallback(() => {
    if (stepIndex <= 0) return;
    goToTab(TAB_ORDER[stepIndex - 1]);
  }, [stepIndex, goToTab]);

  const openExitConfirm = useCallback(() => {
    exitConfirmLockedRef.current = false;
    setExitConfirmOpen(true);
  }, []);

  const closeExitConfirm = useCallback(() => {
    exitConfirmLockedRef.current = false;
    setExitConfirmOpen(false);
  }, []);

  const handleExitConfirm = useCallback(() => {
    if (!onRequestExit || exitConfirmLockedRef.current) return;
    exitConfirmLockedRef.current = true;
    setExitConfirmOpen(false);
    onRequestExit();
  }, [onRequestExit]);

  useEffect(() => {
    if (!canAutoGuideLoop || autoAdvanceAtMs === null) {
      if (autoAdvanceTimeoutRef.current !== null) {
        window.clearTimeout(autoAdvanceTimeoutRef.current);
        autoAdvanceTimeoutRef.current = null;
      }
      return;
    }
    if (autoAdvanceTimeoutRef.current !== null) {
      window.clearTimeout(autoAdvanceTimeoutRef.current);
      autoAdvanceTimeoutRef.current = null;
    }
    const remainingMs = Math.max(0, autoAdvanceAtMs - Date.now());
    autoAdvanceTimeoutRef.current = window.setTimeout(() => {
      autoAdvanceTimeoutRef.current = null;
      advanceAutoRecommendationLoop();
    }, remainingMs);
    return () => {
      if (autoAdvanceTimeoutRef.current !== null) {
        window.clearTimeout(autoAdvanceTimeoutRef.current);
        autoAdvanceTimeoutRef.current = null;
      }
    };
  }, [advanceAutoRecommendationLoop, autoAdvanceAtMs, canAutoGuideLoop]);

  useEffect(() => {
    if (activeTab !== "recommend") return;
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(max-width: 1023px)");
    if (!media.matches) return;
    const roundKey = `${room.id}:${startedAt ?? 0}:${endedAt ?? 0}`;
    if (autoCenteredRecommendRoundKeyRef.current === roundKey) return;
    autoCenteredRecommendRoundKeyRef.current = roundKey;
    const timer = window.setTimeout(() => {
      const target =
        recommendSectionRef.current ?? recommendPreviewStageRef.current;
      if (!target) return;
      const rect = target.getBoundingClientRect();
      const nextTop = Math.max(0, window.scrollY + rect.top);
      window.scrollTo({ top: nextTop, behavior: "auto" });
    }, 220);
    return () => window.clearTimeout(timer);
  }, [activeTab, endedAt, room.id, startedAt]);

  useEffect(() => {
    if (!isMobileSettlementViewport) return;
    if (typeof window === "undefined") return;
    const roundKey = `${room.id}:${startedAt ?? 0}:${endedAt ?? 0}`;
    if (autoAnchoredSettlementRoundKeyRef.current === roundKey) return;
    autoAnchoredSettlementRoundKeyRef.current = roundKey;
    const timer = window.setTimeout(() => {
      const anchorTarget =
        settlementHeadingRef.current ?? settlementStageRef.current;
      if (!anchorTarget) return;
      const rect = anchorTarget.getBoundingClientRect();
      const nextTop = Math.max(0, window.scrollY + rect.top - 12);
      window.scrollTo({ top: nextTop, behavior: "auto" });
    }, 280);
    return () => window.clearTimeout(timer);
  }, [endedAt, isMobileSettlementViewport, room.id, startedAt]);

  useEffect(() => {
    const timers = previewCommandTimersRef;
    return () => {
      timers.current.forEach((id) => window.clearTimeout(id));
      timers.current = [];
    };
  }, []);

  return (
    <div
      className={`game-settlement-mobile-shell mx-auto w-full max-w-[1456px] min-w-0 px-0 pb-20 lg:pb-4 ${
        isMobileSettlementViewport
          ? "game-settlement-mobile-shell--immersive"
          : ""
      }`}
    >
      <section
        ref={settlementStageRef}
        className={`game-settlement-mobile-stage relative min-w-0 px-0 py-2 sm:py-3 ${
          isMobileSettlementViewport
            ? "game-settlement-mobile-stage--immersive"
            : ""
        }`}
      >
        <div className="relative space-y-4">
          <SettlementStageHeader
            isMobileView={isMobileSettlementViewport}
            headingRef={settlementHeadingRef}
            roomName={room.name}
            playlistTitle={room.playlist.title}
            playedQuestionCount={playedQuestionCount}
            participantsLength={participants.length}
            elapsedLabel={elapsedLabel}
            settlementTimeChipLabel={settlementTimeChipLabel}
            activeTab={activeTab}
            tabOrder={TAB_ORDER}
            tabLabels={TAB_LABELS}
            tabHints={TAB_HINTS}
            onGoToTab={goToTab}
            onGoPrevStep={goPrevStep}
            onGoNextStep={goNextStep}
            onOpenExitConfirm={onRequestExit ? openExitConfirm : undefined}
            canGoPrev={stepIndex > 0}
            hasNextStep={stepIndex < TAB_ORDER.length - 1}
            canFinish={Boolean(onBackToLobby)}
          />

          <div
            key={`${activeTab}-${tabRenderKey}`}
            style={{ animation: "settlementStageEnter 320ms ease-out both" }}
          >
            {settlementStartGuard.isPending && (
              <div
                className={`rounded-xl border px-3 py-2 text-sm ${
                  settlementStartGuard.warnMode
                    ? "border-rose-300/55 bg-rose-500/18 text-rose-50"
                    : "border-sky-300/45 bg-sky-500/15 text-sky-50"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">
                    {isMobileSettlementViewport
                      ? "新一局即將開始，結算畫面暫時鎖定"
                      : "新一局即將開始，請等待倒數結束後進入下一場遊戲"}
                  </p>
                  <span className="rounded-full border border-current/50 px-2 py-0.5 text-xs font-bold">
                    {settlementStartGuard.remainingSec}s
                  </span>
                </div>
                {!isMobileSettlementViewport && (
                  <p className="mt-1 text-xs opacity-90">
                    還有 {settlementStartGuard.remainingSec}{" "}
                    秒，畫面會自動切換到下一局
                  </p>
                )}
              </div>
            )}
            {activeTab === "overview" && (
              <OverviewSection
                isMobileView={isMobileSettlementViewport}
                winner={winner}
                runnerUp={runnerUp}
                thirdPlace={thirdPlace}
                me={me}
                myRank={myRank}
                participantsLength={participants.length}
                playedQuestionCount={playedQuestionCount}
                sortedParticipants={sortedParticipants}
                meClientId={meClientId}
                topAccuracyEntry={topAccuracyEntry}
                topComboEntry={topComboEntry}
                fastestAverageAnswerEntry={fastestAverageAnswerEntry}
                participantScoreMeta={participantScoreMeta}
                formatPercent={formatPercent}
                formatMs={formatMs}
                multilineEllipsis2Style={MULTILINE_ELLIPSIS_2}
              />
            )}

            {activeTab === "recommend" && (
              <>
                {isMobileSettlementViewport && (
                  <div className="mb-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={expandAllMobileRecommendSections}
                      disabled={areAllMobileRecommendSectionsExpanded}
                      className={`inline-flex min-h-[3rem] w-full cursor-pointer items-center justify-center gap-2 rounded-[16px] border px-4 py-3 text-sm font-semibold transition ${
                        areAllMobileRecommendSectionsExpanded
                          ? "cursor-not-allowed border-cyan-300/20 bg-cyan-500/8 text-cyan-100/45"
                          : "border-cyan-300/40 bg-cyan-500/14 text-cyan-50 active:scale-[0.985] active:border-cyan-200/70"
                      }`}
                    >
                      <UnfoldMoreRoundedIcon className="text-[1.1rem]" />
                      完整展開
                    </button>
                    <button
                      type="button"
                      onClick={collapseAllMobileRecommendSections}
                      disabled={!areAnyMobileRecommendSectionsExpanded}
                      className={`inline-flex min-h-[3rem] w-full cursor-pointer items-center justify-center gap-2 rounded-[16px] border px-4 py-3 text-sm font-semibold transition ${
                        !areAnyMobileRecommendSectionsExpanded
                          ? "cursor-not-allowed border-slate-500/30 bg-slate-900/45 text-slate-400/55"
                          : "border-slate-500/65 bg-slate-900/78 text-slate-100 active:scale-[0.985] active:border-slate-300/75"
                      }`}
                    >
                      <UnfoldLessRoundedIcon className="text-[1.1rem]" />
                      最小展示
                    </button>
                  </div>
                )}
                <RecommendGuideSection
                  isMobileView={isMobileSettlementViewport}
                  recommendSectionRef={recommendSectionRef}
                  activeCategoryTheme={activeCategoryTheme}
                  activeRecommendCategory={activeRecommendCategory}
                  recommendCategoryLabels={RECOMMEND_CATEGORY_LABELS}
                  recommendCategoryShortHints={RECOMMEND_CATEGORY_SHORT_HINT}
                  recommendationCardsByCategory={recommendationCardsByCategory}
                  onActivateCategory={activateRecommendationCategory}
                  autoPreviewEnabled={autoPreviewEnabled}
                  onToggleAutoPreview={handleToggleAutoPreview}
                  currentRecommendation={currentRecommendation}
                  hasCurrentRecommendationLink={Boolean(
                    currentRecommendationLink,
                  )}
                  recommendationTransitionKey={recommendationTransitionKey}
                  onOpenRecommendationTitle={handleOpenRecommendationTitle}
                  isCurrentRecommendationFastest={
                    isCurrentRecommendationFastest
                  }
                  reviewStatusBadgeBaseClass={REVIEW_STATUS_BADGE_BASE}
                  currentRecommendationResultTone={
                    currentRecommendationResultTone
                  }
                  showCurrentRecommendationRankBadge={
                    showCurrentRecommendationRankBadge
                  }
                  currentRecommendationCorrectRank={
                    currentRecommendationCorrectRank
                  }
                  isCurrentRecommendationFirstCorrect={
                    isCurrentRecommendationFirstCorrect
                  }
                  isCurrentRecommendationGlobalFastest={
                    isCurrentRecommendationGlobalFastest
                  }
                  currentRecommendationGradeBadgeClass={
                    currentRecommendationGradeMeta?.badgeClass ?? null
                  }
                  currentRecommendationGradeLabel={
                    currentRecommendationRating?.grade ?? null
                  }
                  hasCurrentRecommendationSpeedDelta={
                    hasCurrentRecommendationSpeedDelta
                  }
                  currentRecommendationSpeedValue={
                    currentRecommendationSpeedInsight.value
                  }
                  currentRecommendationSpeedNote={
                    currentRecommendationSpeedInsight.note
                  }
                  currentRecommendationAverageCorrectMs={
                    currentRecommendationAverageCorrectMs
                  }
                  formatMs={formatMs}
                  currentRecommendationFastestBadgeText={
                    currentRecommendationFastestBadgeText
                  }
                  currentRecommendationFastestCorrectMeta={
                    currentRecommendationFastestCorrectMeta
                  }
                  canAutoGuideLoop={canAutoGuideLoop}
                  previewCountdownSec={displayedPreviewCountdownSec}
                  previewSwitchNotice={previewSwitchNotice}
                  recommendPreviewStageRef={recommendPreviewStageRef}
                  isCurrentRecommendationPreviewOpen={
                    isCurrentRecommendationPreviewOpen
                  }
                  previewPlayerState={previewPlayerState}
                  currentRecommendationPreviewUrl={
                    currentRecommendationPreviewUrl
                  }
                  previewIframeRef={previewIframeRef}
                  onPreviewIframeLoad={handleRecommendPreviewIframeLoad}
                  shouldShowPreviewOverlay={shouldShowPreviewOverlay}
                  onPreviewSurfaceClick={handlePreviewSurfaceClick}
                  recommendationCards={recommendationCards}
                  selectedReviewParticipantLabel={
                    selectedReviewParticipant
                      ? `#${selectedReviewParticipantRank} ${selectedReviewParticipant.username}${
                          meClientId &&
                          selectedReviewParticipant.clientId === meClientId
                            ? "（你）"
                            : ""
                        }`
                      : "未選擇玩家"
                  }
                  canCycleReviewParticipants={sortedParticipants.length > 1}
                  onGoPrevReviewParticipant={goPrevReviewParticipant}
                  onGoNextReviewParticipant={goNextReviewParticipant}
                  safeRecommendIndex={safeRecommendIndex}
                  onSelectRecommendation={handleSelectRecommendationByIndex}
                  onOpenCardLink={handleOpenRecommendationCardLink}
                  canNavigateRecommendations={canNavigateRecommendations}
                  recommendNavLabels={recommendNavLabels}
                  onGoPrevRecommendation={goPrevRecommendation}
                  onGoNextRecommendation={goNextRecommendation}
                  isMobileCategoryOpen={isMobileRecommendCategoryOpen}
                  onToggleMobileCategoryOpen={() =>
                    setIsMobileRecommendCategoryOpen((current) => !current)
                  }
                  isMobileInsightOpen={isMobileRecommendInsightOpen}
                  onToggleMobileInsightOpen={() =>
                    setIsMobileRecommendInsightOpen((current) => !current)
                  }
                  isMobileRecommendPanelOpen={isMobileRecommendPanelOpen}
                  onToggleMobileRecommendPanelOpen={() =>
                    setIsMobileRecommendPanelOpen((current) => !current)
                  }
                  previewVolume={effectivePreviewVolume}
                  onPreviewVolumeChange={(next) => {
                    if (settlementPreviewSyncGameVolume) {
                      setGameVolume(next);
                      return;
                    }
                    setSettlementPreviewVolume(next);
                  }}
                />
              </>
            )}

            {activeTab === "recommend" && (
              <ReviewRecapSection
                isMobileView={isMobileSettlementViewport}
                activeCategoryTheme={activeCategoryTheme}
                reviewRecapSummary={reviewRecapSummary}
                sortedParticipants={sortedParticipants}
                meClientId={meClientId}
                effectiveSelectedReviewParticipantClientId={
                  effectiveSelectedReviewParticipantClientId
                }
                selectedReviewParticipant={selectedReviewParticipant}
                onSelectReviewParticipantClientId={
                  setSelectedReviewParticipantClientId
                }
                reviewContextTransitionKey={reviewContextTransitionKey}
                reviewRecaps={reviewRecaps}
                selectedRecap={selectedRecap}
                selectedRecapKey={effectiveSelectedRecapKey}
                onSetSelectedRecapKey={setSelectedReviewRecapKey}
                onJumpToRecapPreview={handleJumpToRecapPreview}
                onNavigateRecapPreview={handleNavigateRecapPreview}
                resolveParticipantResult={resolveParticipantResult}
                resultMeta={RESULT_META}
                performanceRatingByRecapKey={performanceRatingByRecapKey}
                performanceGradeMeta={PERFORMANCE_GRADE_META}
                personalFastestCorrectRecapKeys={
                  personalFastestCorrectRecapKeys
                }
                reviewStatusBadgeBaseClass={REVIEW_STATUS_BADGE_BASE}
                reviewDetailTransitionKey={reviewDetailTransitionKey}
                selectedRecapLink={selectedRecapLink}
                onOpenTrackLink={handleOpenTrackLink}
                selectedRecapAnswer={selectedRecapAnswer}
                selectedRecapFastestCorrectMeta={
                  selectedRecapFastestCorrectMeta
                }
                selectedRecapAverageCorrectMs={selectedRecapAverageCorrectMs}
                formatMs={formatMs}
                selectedRecapRating={selectedRecapRating}
                multilineEllipsis2Style={MULTILINE_ELLIPSIS_2}
                reviewDoubleClickPlayEnabled={reviewDoubleClickPlayEnabled}
                onToggleReviewDoubleClickPlay={() =>
                  setReviewDoubleClickPlayEnabled((current) => !current)
                }
                isMobileListOpen={isMobileReviewListOpen}
                onToggleMobileListOpen={() =>
                  setIsMobileReviewListOpen((current) => !current)
                }
                isMobileDetailTopOpen={isMobileReviewDetailTopOpen}
                onToggleMobileDetailTopOpen={() =>
                  setIsMobileReviewDetailTopOpen((current) => !current)
                }
              />
            )}
          </div>
        </div>
      </section>
      <SettlementMobileFooter
        onGoPrevStep={goPrevStep}
        onGoNextStep={goNextStep}
        onOpenExitConfirm={onRequestExit ? openExitConfirm : undefined}
        canGoPrev={stepIndex > 0}
        hasNextStep={stepIndex < TAB_ORDER.length - 1}
        canFinish={Boolean(onBackToLobby)}
      />
      <SettlementExitDialog
        open={exitConfirmOpen}
        onCancel={closeExitConfirm}
        onConfirm={handleExitConfirm}
      />
    </div>
  );
};

export default LiveSettlementShowcase;
