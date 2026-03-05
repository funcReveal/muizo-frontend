import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";

import { trackEvent } from "../../../../shared/analytics/track";
import { useSettingsModel } from "../../../Setting/model/settingsContext";
import {
  resolveSettlementTrackLink,
  type SettlementTrackLink,
} from "../../model/settlementLinks";
import type {
  ChatMessage,
  PlaylistItem,
  RoomParticipant,
  RoomState,
} from "../../model/types";
import type { SettlementQuestionRecap } from "./GameSettlementPanel";
import {
  buildCorrectAnsweredRankMap,
  type RecommendCategory,
  type SongPerformanceGrade,
} from "./liveSettlementUtils";
import OverviewSection from "./liveSettlementShowcase/OverviewSection";
import RecommendGuideSection from "./liveSettlementShowcase/RecommendGuideSection";
import useSettlementPreviewPlayback from "./liveSettlementShowcase/useSettlementPreviewPlayback";
import useSettlementRecommendLifecycle from "./liveSettlementShowcase/useSettlementRecommendLifecycle";
import useSettlementRecommendationNavigator from "./liveSettlementShowcase/useSettlementRecommendationNavigator";
import useSettlementRecommendationInsights from "./liveSettlementShowcase/useSettlementRecommendationInsights";
import ReviewRecapSection from "./liveSettlementShowcase/ReviewRecapSection";
import useSettlementRecapSelectionState from "./liveSettlementShowcase/useSettlementRecapSelectionState";
import useSettlementReviewState from "./liveSettlementShowcase/useSettlementReviewState";

type LiveSettlementTab = "overview" | "recommend";
type PreviewPlaybackMode = "idle" | "auto" | "manual";

type ExtendedRecap = SettlementQuestionRecap & {
  provider?: string;
  sourceId?: string | null;
  videoId?: string;
  url?: string;
};

type RecommendationCard = {
  recap: ExtendedRecap;
  hint: string;
  emphasis: string;
  link: SettlementTrackLink;
  providerLabel: string;
  previewUrl: string | null;
};

type SongPerformanceRating = {
  score: number;
  grade: SongPerformanceGrade;
  result: "correct" | "wrong" | "unanswered";
  answeredRank: number | null;
  answeredAtMs: number | null;
  correctRate: number;
};

interface LiveSettlementShowcaseProps {
  room: RoomState["room"];
  participants: RoomParticipant[];
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
  onBackToLobby?: () => void;
  onRequestExit?: () => void;
}

const TAB_ORDER: LiveSettlementTab[] = ["overview", "recommend"];

const TAB_LABELS: Record<LiveSettlementTab, string> = {
  overview: "總覽",
  recommend: "推薦 + 題目回顧",
};

const TAB_HINTS: Record<LiveSettlementTab, string> = {
  overview: "先看本局勝負與個人表現",
  recommend: "邊聽推薦、邊查看全員作答回顧",
};

const RECAPS_PER_PAGE = 12;
const RECOMMEND_PREVIEW_SECONDS = 15;
const QUICK_SOLVE_TIME_CAP_MS = 10_000;
const RECOMMEND_CATEGORY_LABELS: Record<RecommendCategory, string> = {
  quick: "全員速解",
  confuse: "易混淆",
  hard: "高難挑戰",
  other: "其餘歌單",
};
const RECOMMEND_CATEGORY_SHORT_HINT: Record<RecommendCategory, string> = {
  quick: "全員答對・10 秒內",
  confuse: "最常改答案",
  hard: "低答對率挑戰",
  other: "延伸聆聽",
};
const RECOMMEND_CONTROLS_TOOLTIP =
  "分類可切換不同推薦來源；自動導覽會依倒數自動切歌；雙擊播放可在題目回顧直接開啟試聽。";
const RECOMMEND_CATEGORY_THEME: Record<
  RecommendCategory,
  {
    shellClass: string;
    sectionClass: string;
    asideClass: string;
    drawerClass: string;
    controlGroupClass: string;
    listActiveClass: string;
    autoWrapClass: string;
    autoBarClass: string;
    badgeClass: string;
  }
> = {
  quick: {
    shellClass:
      "border-emerald-300/45 bg-[radial-gradient(circle_at_4%_0%,rgba(16,185,129,0.24),transparent_48%),linear-gradient(160deg,rgba(2,6,23,0.96),rgba(3,16,28,0.94))] shadow-[0_28px_60px_-44px_rgba(16,185,129,0.72)]",
    sectionClass:
      "border-emerald-300/35 bg-gradient-to-br from-slate-950/78 via-slate-950/62 to-slate-900/78 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.16),0_25px_55px_-45px_rgba(16,185,129,0.55)]",
    asideClass:
      "border-emerald-300/30 bg-[linear-gradient(180deg,rgba(5,24,37,0.92),rgba(2,12,23,0.95))]",
    drawerClass:
      "border-emerald-300/38 bg-[linear-gradient(180deg,rgba(6,26,37,0.9),rgba(2,14,26,0.94))]",
    controlGroupClass:
      "border-emerald-300/42 bg-emerald-500/12 shadow-[0_10px_24px_-16px_rgba(16,185,129,0.86)]",
    listActiveClass: "border-emerald-300/50 bg-emerald-400/10",
    autoWrapClass:
      "border-emerald-300/45 bg-gradient-to-r from-emerald-500/20 via-emerald-400/10 to-slate-900/20 shadow-[0_0_0_1px_rgba(16,185,129,0.2),0_12px_24px_-18px_rgba(16,185,129,0.7)]",
    autoBarClass: "bg-gradient-to-r from-emerald-300 to-cyan-200",
    badgeClass: "border-emerald-300/45 bg-emerald-500/16 text-emerald-50",
  },
  confuse: {
    shellClass:
      "border-fuchsia-300/45 bg-[radial-gradient(circle_at_4%_0%,rgba(217,70,239,0.24),transparent_48%),linear-gradient(160deg,rgba(2,6,23,0.96),rgba(19,8,34,0.94))] shadow-[0_28px_60px_-44px_rgba(217,70,239,0.72)]",
    sectionClass:
      "border-fuchsia-300/35 bg-gradient-to-br from-slate-950/78 via-slate-950/62 to-slate-900/78 shadow-[inset_0_0_0_1px_rgba(217,70,239,0.16),0_25px_55px_-45px_rgba(217,70,239,0.55)]",
    asideClass:
      "border-fuchsia-300/30 bg-[linear-gradient(180deg,rgba(33,10,43,0.92),rgba(18,8,30,0.95))]",
    drawerClass:
      "border-fuchsia-300/38 bg-[linear-gradient(180deg,rgba(36,10,44,0.9),rgba(18,8,31,0.94))]",
    controlGroupClass:
      "border-fuchsia-300/42 bg-fuchsia-500/12 shadow-[0_10px_24px_-16px_rgba(217,70,239,0.86)]",
    listActiveClass: "border-fuchsia-300/50 bg-fuchsia-400/10",
    autoWrapClass:
      "border-fuchsia-300/45 bg-gradient-to-r from-fuchsia-500/20 via-fuchsia-400/10 to-slate-900/20 shadow-[0_0_0_1px_rgba(217,70,239,0.2),0_12px_24px_-18px_rgba(217,70,239,0.7)]",
    autoBarClass: "bg-gradient-to-r from-fuchsia-300 to-pink-200",
    badgeClass: "border-fuchsia-300/45 bg-fuchsia-500/16 text-fuchsia-50",
  },
  hard: {
    shellClass:
      "border-amber-300/45 bg-[radial-gradient(circle_at_4%_0%,rgba(251,191,36,0.25),transparent_50%),linear-gradient(160deg,rgba(2,6,23,0.96),rgba(34,20,6,0.94))] shadow-[0_28px_60px_-44px_rgba(251,191,36,0.76)]",
    sectionClass:
      "border-amber-300/35 bg-gradient-to-br from-slate-950/78 via-slate-950/62 to-slate-900/78 shadow-[inset_0_0_0_1px_rgba(251,191,36,0.16),0_25px_55px_-45px_rgba(251,191,36,0.55)]",
    asideClass:
      "border-amber-300/30 bg-[linear-gradient(180deg,rgba(39,23,8,0.92),rgba(24,14,4,0.95))]",
    drawerClass:
      "border-amber-300/38 bg-[linear-gradient(180deg,rgba(42,24,9,0.9),rgba(26,15,5,0.94))]",
    controlGroupClass:
      "border-amber-300/42 bg-amber-500/12 shadow-[0_10px_24px_-16px_rgba(251,191,36,0.86)]",
    listActiveClass: "border-amber-300/50 bg-amber-400/10",
    autoWrapClass:
      "border-amber-300/45 bg-gradient-to-r from-amber-500/20 via-amber-400/10 to-slate-900/20 shadow-[0_0_0_1px_rgba(251,191,36,0.2),0_12px_24px_-18px_rgba(251,191,36,0.7)]",
    autoBarClass: "bg-gradient-to-r from-amber-300 to-yellow-100",
    badgeClass: "border-amber-300/45 bg-amber-500/16 text-amber-50",
  },
  other: {
    shellClass:
      "border-sky-300/45 bg-[radial-gradient(circle_at_4%_0%,rgba(56,189,248,0.2),transparent_50%),linear-gradient(160deg,rgba(2,6,23,0.96),rgba(7,16,36,0.94))] shadow-[0_28px_60px_-44px_rgba(56,189,248,0.68)]",
    sectionClass:
      "border-sky-300/30 bg-gradient-to-br from-slate-950/78 via-slate-950/62 to-sky-950/42 shadow-[inset_0_0_0_1px_rgba(56,189,248,0.2),0_25px_55px_-45px_rgba(56,189,248,0.55)]",
    asideClass:
      "border-sky-300/30 bg-[linear-gradient(180deg,rgba(8,20,42,0.92),rgba(4,12,26,0.95))]",
    drawerClass:
      "border-sky-300/38 bg-[linear-gradient(180deg,rgba(9,23,45,0.9),rgba(4,14,30,0.94))]",
    controlGroupClass:
      "border-sky-300/42 bg-sky-500/12 shadow-[0_10px_24px_-16px_rgba(56,189,248,0.86)]",
    listActiveClass: "border-sky-300/55 bg-sky-400/12",
    autoWrapClass:
      "border-sky-300/45 bg-gradient-to-r from-sky-500/20 via-cyan-400/14 to-slate-900/20 shadow-[0_0_0_1px_rgba(56,189,248,0.2),0_12px_24px_-18px_rgba(56,189,248,0.7)]",
    autoBarClass: "bg-gradient-to-r from-sky-300 to-cyan-100",
    badgeClass: "border-sky-300/45 bg-sky-500/16 text-sky-50",
  },
};

const MULTILINE_ELLIPSIS_2: React.CSSProperties = {
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
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
const REVIEW_STATUS_BADGE_BASE =
  "inline-flex h-6 min-w-[4.25rem] items-center justify-center rounded-full border px-2.5 text-[11px] font-semibold";

const PERFORMANCE_GRADE_META: Record<
  SongPerformanceGrade,
  { badgeClass: string; detailClass: string }
> = {
  S: {
    badgeClass: "border-emerald-200/65 bg-emerald-500/28 text-emerald-50",
    detailClass: "text-emerald-100",
  },
  A: {
    badgeClass: "border-cyan-200/65 bg-cyan-500/26 text-cyan-50",
    detailClass: "text-cyan-100",
  },
  B: {
    badgeClass: "border-sky-200/60 bg-sky-500/24 text-sky-50",
    detailClass: "text-sky-100",
  },
  C: {
    badgeClass: "border-amber-200/58 bg-amber-500/22 text-amber-50",
    detailClass: "text-amber-100",
  },
  D: {
    badgeClass: "border-orange-200/58 bg-orange-500/20 text-orange-50",
    detailClass: "text-orange-100",
  },
  E: {
    badgeClass: "border-rose-200/58 bg-rose-500/20 text-rose-50",
    detailClass: "text-rose-100",
  },
};

const AUTO_PREVIEW_STORAGE_KEY = "mq_settlement_auto_preview";
const REVIEW_DOUBLE_PLAY_STORAGE_KEY = "mq_settlement_review_double_click_play";
const RECOMMEND_CONTROLS_HINT_STORAGE_KEY =
  "mq_settlement_recommend_controls_hint_seen";

const readStoredBoolean = (key: string, fallback: boolean) => {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(key);
  if (raw === "1" || raw === "true") return true;
  if (raw === "0" || raw === "false") return false;
  return fallback;
};

const resolveParticipantAnswer = (
  recap: SettlementQuestionRecap,
  participantClientId: string | null,
  meClientId?: string,
) => {
  if (!participantClientId) {
    return {
      choiceIndex: null as number | null,
      result: "unanswered" as SettlementQuestionRecap["myResult"],
      answeredAtMs: null as number | null,
    };
  }
  const answer = recap.answersByClientId?.[participantClientId];
  if (answer) {
    return {
      choiceIndex:
        typeof answer.choiceIndex === "number" ? answer.choiceIndex : null,
      result: answer.result ?? "unanswered",
      answeredAtMs:
        typeof answer.answeredAtMs === "number" ? answer.answeredAtMs : null,
    };
  }
  if (meClientId && participantClientId === meClientId) {
    const fallbackChoiceIndex =
      typeof recap.myChoiceIndex === "number" ? recap.myChoiceIndex : null;
    const fallbackResult: SettlementQuestionRecap["myResult"] =
      fallbackChoiceIndex === null
        ? "unanswered"
        : fallbackChoiceIndex === recap.correctChoiceIndex
          ? "correct"
          : "wrong";
    return {
      choiceIndex: fallbackChoiceIndex,
      result: fallbackResult,
      answeredAtMs: null as number | null,
    };
  }
  return {
    choiceIndex: null as number | null,
    result: "unanswered" as SettlementQuestionRecap["myResult"],
    answeredAtMs: null as number | null,
  };
};

const resolveParticipantResult = (
  recap: SettlementQuestionRecap,
  participantClientId: string | null,
  meClientId?: string,
): "correct" | "wrong" | "unanswered" => {
  const answer = resolveParticipantAnswer(
    recap,
    participantClientId,
    meClientId,
  );
  if (answer.result === "correct" || answer.result === "wrong") {
    return answer.result;
  }
  if (typeof answer.choiceIndex !== "number") return "unanswered";
  return answer.choiceIndex === recap.correctChoiceIndex ? "correct" : "wrong";
};

const resolveCorrectAnsweredRank = (
  recap: SettlementQuestionRecap,
  participantClientId: string | null,
) => {
  if (!participantClientId) return null;
  const rankMap = buildCorrectAnsweredRankMap(recap.answersByClientId);
  return rankMap.get(participantClientId) ?? null;
};

const isParticipantGlobalFastestCorrect = (
  recap: SettlementQuestionRecap,
  rating: SongPerformanceRating | null | undefined,
) => {
  if (!rating || rating.result !== "correct") return false;
  if (
    typeof rating.answeredAtMs !== "number" ||
    !Number.isFinite(rating.answeredAtMs)
  ) {
    return false;
  }
  if (
    typeof recap.fastestCorrectMs !== "number" ||
    !Number.isFinite(recap.fastestCorrectMs)
  ) {
    return false;
  }
  return Math.floor(rating.answeredAtMs) === Math.floor(recap.fastestCorrectMs);
};

const formatElapsed = (startedAt?: number, endedAt?: number) => {
  if (!startedAt || !endedAt || endedAt <= startedAt) return null;
  const totalSeconds = Math.floor((endedAt - startedAt) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

const formatMs = (value: number | null | undefined) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return "--";
  }
  if (value >= 1000) return `${(value / 1000).toFixed(2)}s`;
  return `${Math.round(value)}ms`;
};

const formatPercent = (value: number) =>
  `${Math.round(Math.max(0, value) * 100)}%`;

const resolveRecapTrack = (
  recap: ExtendedRecap,
  playlistItems: PlaylistItem[],
): PlaylistItem | null => {
  const direct = playlistItems[recap.trackIndex];
  return direct ?? null;
};

const clampMs = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const buildFallbackRecaps = (
  playlistItems: PlaylistItem[],
  trackOrder: number[],
): ExtendedRecap[] =>
  trackOrder.map((trackIndex, index) => {
    const item = playlistItems[trackIndex];
    const title =
      item?.answerText?.trim() || item?.title?.trim() || `第 ${index + 1} 題`;
    const uploader = item?.uploader?.trim() || "Unknown";
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
      videoId: item?.videoId,
      url: item?.url,
    };
  });

const extractYouTubeId = (
  sourceId?: string | null,
  videoId?: string | null,
  url?: string | null,
): string | null => {
  if (sourceId?.trim()) return sourceId.trim();
  if (videoId?.trim()) return videoId.trim();
  if (!url) return null;
  const raw = url.trim();
  if (!raw) return null;
  const m1 = raw.match(/[?&]v=([^&]+)/);
  if (m1?.[1]) return m1[1];
  const m2 = raw.match(/youtu\.be\/([^?&]+)/);
  if (m2?.[1]) return m2[1];
  const m3 = raw.match(/youtube\.com\/embed\/([^?&]+)/);
  if (m3?.[1]) return m3[1];
  return null;
};

const resolvePreviewEmbedUrl = (
  recap: ExtendedRecap,
  link: SettlementTrackLink,
): string | null => {
  const provider = (recap.provider || link.provider || "").toLowerCase();
  if (provider === "youtube") {
    const id = extractYouTubeId(
      recap.sourceId,
      recap.videoId,
      recap.url || link.href,
    );
    if (!id) return null;
    const originParam =
      typeof window !== "undefined" && window.location?.origin
        ? `&origin=${encodeURIComponent(window.location.origin)}`
        : "";
    return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1&enablejsapi=1${originParam}`;
  }
  return null;
};

const buildRecommendationLink = (recap: ExtendedRecap) =>
  resolveSettlementTrackLink({
    provider: recap.provider,
    sourceId: recap.sourceId,
    videoId: recap.videoId,
    url: recap.url ?? "",
    title: recap.title ?? "",
    answerText: recap.title ?? "",
    uploader: recap.uploader,
  });

const buildRecommendationCard = (
  recap: ExtendedRecap,
  hint: string,
  emphasis: string,
): RecommendationCard => {
  const link = buildRecommendationLink(recap);
  const providerLabel =
    link.providerLabel ||
    ((recap.provider ?? "").trim()
      ? (recap.provider ?? "").trim().toUpperCase()
      : "Unknown");
  return {
    recap,
    hint,
    emphasis,
    link,
    providerLabel,
    previewUrl: link ? resolvePreviewEmbedUrl(recap, link) : null,
  };
};

const LiveSettlementShowcase: React.FC<LiveSettlementShowcaseProps> = ({
  room,
  participants,
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
  onBackToLobby,
  onRequestExit,
}) => {
  const getChangedAnswerCount = (answer: unknown): number => {
    if (!answer || typeof answer !== "object") return 0;
    const value = (answer as { changedAnswerCount?: number })
      .changedAnswerCount;
    return typeof value === "number" && Number.isFinite(value)
      ? Math.max(0, value)
      : 0;
  };

  const {
    gameVolume,
    sfxEnabled,
    sfxVolume,
    settlementPreviewSyncGameVolume,
    settlementPreviewVolume,
  } = useSettingsModel();
  const [activeTab, setActiveTab] = useState<LiveSettlementTab>("overview");
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
  const [selectedRecapKey, setSelectedRecapKey] = useState<string | null>(null);
  const [previewRecapKey, setPreviewRecapKey] = useState<string | null>(null);
  const [previewSwitchNotice, setPreviewSwitchNotice] = useState<string | null>(
    null,
  );
  const [reviewPage, setReviewPage] = useState(0);
  const [reviewDrawerOpen, setReviewDrawerOpen] = useState(true);
  const [showRecommendControlsHint, setShowRecommendControlsHint] =
    useState(false);
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  const [tabRenderKey, setTabRenderKey] = useState(0);
  const [tickerNowMs, setTickerNowMs] = useState(() => Date.now());
  const recommendSectionRef = useRef<HTMLElement | null>(null);
  const recommendPreviewStageRef = useRef<HTMLDivElement | null>(null);
  const celebrationKeyRef = useRef<string | null>(null);
  const autoAdvanceTimeoutRef = useRef<number | null>(null);
  const autoCenteredRecommendRoundKeyRef = useRef<string | null>(null);
  const recommendControlsHintTimerRef = useRef<number | null>(null);

  const stepIndex = TAB_ORDER.indexOf(activeTab);
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
    currentReviewTargetLabel,
    goPrevReviewParticipant,
    goNextReviewParticipant,
    topAccuracyEntry,
    topComboEntry,
    fastestAverageAnswerEntry,
    participantScoreMeta,
  } = useSettlementReviewState({
    participants,
    playedQuestionCount,
    meClientId,
  });

  useEffect(() => {
    if (typeof nowMs === "number" && Number.isFinite(nowMs)) return;
    const timer = window.setInterval(() => {
      setTickerNowMs(Date.now());
    }, 250);
    return () => window.clearInterval(timer);
  }, [nowMs]);

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
    gain.gain.value =
      Math.max(0, Math.min(1, sfxVolume / 100)) *
      Math.max(0, Math.min(1, gameVolume / 100)) *
      0.06;
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
  }, [gameVolume, room.id, startedAt, sfxEnabled, sfxVolume]);
  const normalizedRecaps = useMemo<ExtendedRecap[]>(() => {
    if (questionRecaps.length > 0) {
      return questionRecaps.map((recap) => {
        const item = resolveRecapTrack(recap as ExtendedRecap, playlistItems);
        return {
          ...(recap as ExtendedRecap),
          provider: (recap as ExtendedRecap).provider ?? item?.provider,
          sourceId: (recap as ExtendedRecap).sourceId ?? item?.sourceId ?? null,
          videoId: (recap as ExtendedRecap).videoId ?? item?.videoId,
          url: (recap as ExtendedRecap).url ?? item?.url,
        };
      });
    }
    return buildFallbackRecaps(playlistItems, trackOrder);
  }, [playlistItems, questionRecaps, trackOrder]);

  const {
    reviewRecapSummary,
    reviewPageCount,
    safeReviewPage,
    pagedRecaps,
    effectiveSelectedRecapKey,
    selectedRecap,
    selectedRecapLink,
    selectedRecapAnswer,
    selectedRecapCorrectRank,
    reviewContextTransitionKey,
    reviewDetailTransitionKey,
  } = useSettlementRecapSelectionState({
    normalizedRecaps,
    reviewPage,
    recapsPerPage: RECAPS_PER_PAGE,
    selectedRecapKey,
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
    selectedRecapGradeMeta,
    isSelectedRecapFastest,
    selectedRecapFastestBadgeText,
    selectedRecapRatingBreakdown,
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
    currentRecommendationFastestBadgeText,
    hasCurrentRecommendationSpeedDelta,
    isPreviewFrozen,
    shouldShowPreviewOverlay,
    canAutoGuideLoop,
  } = useSettlementRecommendationInsights<ExtendedRecap, RecommendationCard>({
    normalizedRecaps,
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
    isParticipantGlobalFastestCorrect,
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
    setSelectedRecapKey,
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
      return `起始於 ${new Date(startedAt).toLocaleString()}`;
    }
    if (gameEndTime) {
      return `結束於 ${new Date(gameEndTime).toLocaleString()}`;
    }
    return null;
  }, [gameEndTime, startedAt]);

  const settlementStartGuard = useMemo(() => {
    if (!upcomingGameStartAt || !Number.isFinite(upcomingGameStartAt)) {
      return {
        isPending: false,
        remainingMs: 0,
        remainingSec: 0,
        warnMode: false,
      };
    }
    const effectiveNowMs =
      typeof nowMs === "number" && Number.isFinite(nowMs) ? nowMs : tickerNowMs;
    const remainingMs = Math.max(0, upcomingGameStartAt - effectiveNowMs);
    return {
      isPending: remainingMs > 0,
      remainingMs,
      remainingSec: Math.ceil(remainingMs / 1000),
      warnMode: remainingMs <= 5000,
    };
  }, [nowMs, tickerNowMs, upcomingGameStartAt]);

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

  const handleOpenRecommendationTitle = () => {
    if (!currentRecommendation || !currentRecommendationLink) return;
    handleOpenTrackLink(currentRecommendationLink, currentRecommendation.recap);
  };

  const handleQuickPlayStart = useCallback(() => {
    if (!currentRecommendationPreviewUrl || !currentRecommendation) return;
    const keepAutoMode = autoPreviewEnabled && previewPlaybackMode === "auto";
    setPreviewPlaybackMode(keepAutoMode ? "auto" : "manual");
    if (!isCurrentRecommendationPreviewOpen) {
      setPreviewRecapKey(currentRecommendation.recap.key);
    } else {
      postYouTubeCommand("playVideo");
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
    isCurrentRecommendationPreviewOpen,
    pausedCountdownRemainingMs,
    previewPlaybackMode,
    postYouTubeCommand,
  ]);

  const handleToggleAutoPreview = useCallback(() => {
    const next = !autoPreviewEnabled;
    setAutoPreviewEnabled(next);
    if (!next) {
      resetRecommendPreviewState();
    } else {
      startAutoGuideFromPreferredCategory(activeRecommendCategory);
    }
  }, [
    activeRecommendCategory,
    autoPreviewEnabled,
    resetRecommendPreviewState,
    startAutoGuideFromPreferredCategory,
  ]);

  const handleSelectRecommendationByIndex = useCallback(
    (index: number) => {
      jumpToRecommendation(activeRecommendCategory, index, {
        playbackMode: previewPlaybackMode === "manual" ? "manual" : undefined,
        forcePreview: previewPlaybackMode === "manual",
      });
    },
    [activeRecommendCategory, jumpToRecommendation, previewPlaybackMode],
  );

  const handleOpenRecommendationCardLink = useCallback(
    (card: {
      recap: { key: string };
      link?: { href?: string | null } | null;
    }) => {
      if (!card.link?.href) return;
      const recap = normalizedRecaps.find((entry) => entry.key === card.recap.key);
      if (!recap) return;
      handleOpenTrackLink(buildRecommendationLink(recap), recap);
    },
    [handleOpenTrackLink, normalizedRecaps],
  );

  const handleSupportArtistClick = useCallback(() => {
    if (!currentRecommendation || !currentRecommendationLink) return;
    handleOpenTrackLink(currentRecommendationLink, currentRecommendation.recap);
  }, [currentRecommendation, currentRecommendationLink, handleOpenTrackLink]);

  const handleRecommendPreviewIframeLoad = useCallback(() => {
    syncPreviewVolume();
    registerYouTubeBridge();
  }, [registerYouTubeBridge, syncPreviewVolume]);

  const goToTab = (tab: LiveSettlementTab) => {
    if (tab === activeTab) return;
    setTabRenderKey((prev) => prev + 1);
    setActiveTab(tab);
    if (tab === "recommend") {
      if (typeof window !== "undefined") {
        if (!readStoredBoolean(RECOMMEND_CONTROLS_HINT_STORAGE_KEY, false)) {
          setShowRecommendControlsHint(true);
          window.localStorage.setItem(RECOMMEND_CONTROLS_HINT_STORAGE_KEY, "1");
          if (recommendControlsHintTimerRef.current !== null) {
            window.clearTimeout(recommendControlsHintTimerRef.current);
          }
          recommendControlsHintTimerRef.current = window.setTimeout(() => {
            setShowRecommendControlsHint(false);
            recommendControlsHintTimerRef.current = null;
          }, 2500);
        }
      }
      setReviewPage(0);
      if (autoPreviewEnabled) {
        startAutoGuideFromPreferredCategory(recommendCategory);
      } else {
        activateRecommendationCategory(recommendCategory);
      }
      return;
    }
    setShowRecommendControlsHint(false);
    resetRecommendPreviewState();
  };

  useEffect(
    () => () => {
      if (recommendControlsHintTimerRef.current !== null) {
        window.clearTimeout(recommendControlsHintTimerRef.current);
        recommendControlsHintTimerRef.current = null;
      }
    },
    [],
  );

  const goNextStep = () => {
    if (stepIndex < TAB_ORDER.length - 1) {
      goToTab(TAB_ORDER[stepIndex + 1]);
      return;
    }
    onBackToLobby?.();
  };

  const goPrevStep = () => {
    if (stepIndex <= 0) return;
    goToTab(TAB_ORDER[stepIndex - 1]);
  };

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
  }, [
    advanceAutoRecommendationLoop,
    autoAdvanceAtMs,
    canAutoGuideLoop,
  ]);

  useEffect(() => {
    if (!canAutoGuideLoop || autoAdvanceAtMs === null) return;
    const updateCountdown = () => {
      const remainingMs = Math.max(0, autoAdvanceAtMs - Date.now());
      setPreviewCountdownSec(Math.max(0, Math.ceil(remainingMs / 1000)));
    };
    updateCountdown();
    const timer = window.setInterval(updateCountdown, 200);
    return () => window.clearInterval(timer);
  }, [autoAdvanceAtMs, canAutoGuideLoop]);

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
        recommendPreviewStageRef.current ?? recommendSectionRef.current;
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 220);
    return () => window.clearTimeout(timer);
  }, [activeTab, endedAt, room.id, startedAt]);

  const activeTabButtonClass = (tab: LiveSettlementTab) =>
    `rounded-full border px-3 py-1.5 text-xs font-semibold tracking-[0.08em] transition ${
      activeTab === tab
        ? "border-amber-300/60 bg-amber-300/15 text-amber-100"
        : "border-slate-500/60 bg-slate-900/60 text-slate-300"
    }`;

  const progressPercent = Math.round(
    ((stepIndex + 1) / TAB_ORDER.length) * 100,
  );

  return (
    <div className="mx-auto w-full max-w-6xl min-w-0 px-2 pb-24 sm:px-4 lg:pb-4">
      <section className="relative min-w-0 overflow-hidden rounded-[30px] border border-amber-400/35 bg-slate-950/95 px-4 py-6 shadow-[0_30px_120px_-60px_rgba(245,158,11,0.6)] sm:px-6 sm:py-7">
        <div className="pointer-events-none absolute -left-20 -top-20 h-52 w-52 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-0 h-64 w-64 rounded-full bg-sky-500/15 blur-3xl" />

        <div className="relative space-y-4">
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="inline-flex items-center rounded-full border border-amber-300/40 bg-amber-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-200">
                Match Settlement
              </div>
              <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-100 sm:text-3xl">
                對戰結算
              </h2>
              <p className="mt-1 truncate text-sm text-slate-300">
                {room.name}
                {room.playlist.title ? ` · ${room.playlist.title}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Chip
                size="small"
                label={`題數 ${playedQuestionCount}`}
                variant="outlined"
                className="border-amber-300/40 text-amber-100"
              />
              <Chip
                size="small"
                label={`玩家 ${participants.length}`}
                variant="outlined"
                className="border-sky-400/45 text-sky-100"
              />
              {elapsedLabel && (
                <Chip
                  size="small"
                  label={`局長 ${elapsedLabel}`}
                  variant="outlined"
                  className="border-emerald-300/45 text-emerald-100"
                />
              )}
              {settlementTimeChipLabel && (
                <Chip
                  size="small"
                  label={settlementTimeChipLabel}
                  variant="outlined"
                  className="border-slate-400/50 text-slate-200"
                />
              )}
            </div>
          </header>

          <div className="rounded-2xl border border-slate-700/70 bg-slate-900/60 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  結算導覽
                </p>
                <p className="text-sm font-semibold text-slate-100">
                  Step {stepIndex + 1}/{TAB_ORDER.length} ·{" "}
                  {TAB_HINTS[activeTab]}
                </p>
              </div>
              <div className="text-xs font-semibold text-amber-100">
                {progressPercent}%
              </div>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800/90">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-300/90 via-amber-200 to-sky-300 transition-[width] duration-500"
                style={{ width: `${Math.max(8, progressPercent)}%` }}
              />
            </div>
          </div>

          <nav className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              {TAB_ORDER.map((tab, index) => (
                <button
                  key={tab}
                  type="button"
                  className={activeTabButtonClass(tab)}
                  onClick={() => goToTab(tab)}
                  title={TAB_HINTS[tab]}
                >
                  {index + 1}. {TAB_LABELS[tab]}
                </button>
              ))}
            </div>
            <div className="hidden items-center justify-end gap-2 lg:flex">
              <Button
                variant="outlined"
                color="inherit"
                size="small"
                onClick={goPrevStep}
                disabled={stepIndex <= 0}
              >
                上一步
              </Button>
              {stepIndex < TAB_ORDER.length - 1 ? (
                <Button
                  variant="contained"
                  color="warning"
                  size="small"
                  onClick={goNextStep}
                >
                  下一步
                </Button>
              ) : (
                <Button
                  variant="contained"
                  color="success"
                  size="small"
                  onClick={goNextStep}
                  disabled={!onBackToLobby}
                >
                  完成結算
                </Button>
              )}
              {onRequestExit && (
                <Button
                  variant="contained"
                  color="error"
                  size="small"
                  onClick={() => setExitConfirmOpen(true)}
                >
                  離開房間
                </Button>
              )}
            </div>
          </nav>

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
                    房主已啟動下一局，仍有玩家正在查看結算畫面
                  </p>
                  <span className="rounded-full border border-current/50 px-2 py-0.5 text-xs font-bold">
                    {settlementStartGuard.remainingSec}s
                  </span>
                </div>
                <p className="mt-1 text-xs opacity-90">
                  將在 {settlementStartGuard.remainingSec}{" "}
                  秒後同步切回遊戲倒數，確保全員同時開始。
                </p>
              </div>
            )}
            {activeTab === "overview" && (
              <OverviewSection
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
              <RecommendGuideSection
                recommendSectionRef={recommendSectionRef}
                activeCategoryTheme={activeCategoryTheme}
                activeRecommendCategory={activeRecommendCategory}
                recommendCategoryLabels={RECOMMEND_CATEGORY_LABELS}
                recommendCategoryShortHints={RECOMMEND_CATEGORY_SHORT_HINT}
                recommendControlsTooltip={RECOMMEND_CONTROLS_TOOLTIP}
                showRecommendControlsHint={showRecommendControlsHint}
                recommendationCardsByCategory={recommendationCardsByCategory}
                onActivateCategory={activateRecommendationCategory}
                autoPreviewEnabled={autoPreviewEnabled}
                onToggleAutoPreview={handleToggleAutoPreview}
                reviewDoubleClickPlayEnabled={reviewDoubleClickPlayEnabled}
                onToggleReviewDoubleClickPlay={() =>
                  setReviewDoubleClickPlayEnabled((prev) => !prev)
                }
                reviewDrawerOpen={reviewDrawerOpen}
                onToggleReviewDrawerOpen={() => setReviewDrawerOpen((prev) => !prev)}
                currentRecommendation={currentRecommendation}
                hasCurrentRecommendationLink={Boolean(currentRecommendationLink)}
                recommendationTransitionKey={recommendationTransitionKey}
                onOpenRecommendationTitle={handleOpenRecommendationTitle}
                isCurrentRecommendationFastest={isCurrentRecommendationFastest}
                currentReviewTargetLabel={currentReviewTargetLabel}
                reviewStatusBadgeBaseClass={REVIEW_STATUS_BADGE_BASE}
                currentRecommendationResultTone={currentRecommendationResultTone}
                showCurrentRecommendationRankBadge={showCurrentRecommendationRankBadge}
                currentRecommendationCorrectRank={currentRecommendationCorrectRank}
                isCurrentRecommendationFirstCorrect={isCurrentRecommendationFirstCorrect}
                currentRecommendationGradeBadgeClass={
                  currentRecommendationGradeMeta?.badgeClass ?? null
                }
                currentRecommendationGradeLabel={
                  currentRecommendationRating?.grade ?? null
                }
                hasCurrentRecommendationSpeedDelta={hasCurrentRecommendationSpeedDelta}
                currentRecommendationSpeedValue={currentRecommendationSpeedInsight.value}
                currentRecommendationSpeedNote={currentRecommendationSpeedInsight.note}
                currentRecommendationAverageCorrectMs={
                  currentRecommendationAverageCorrectMs
                }
                formatMs={formatMs}
                currentRecommendationFastestBadgeText={
                  currentRecommendationFastestBadgeText
                }
                canAutoGuideLoop={canAutoGuideLoop}
                isPreviewFrozen={isPreviewFrozen}
                previewCountdownSec={previewCountdownSec}
                previewSwitchNotice={previewSwitchNotice}
                effectivePreviewVolume={effectivePreviewVolume}
                settlementPreviewSyncGameVolume={settlementPreviewSyncGameVolume}
                recommendPreviewStageRef={recommendPreviewStageRef}
                isCurrentRecommendationPreviewOpen={isCurrentRecommendationPreviewOpen}
                currentRecommendationPreviewUrl={currentRecommendationPreviewUrl}
                previewIframeRef={previewIframeRef}
                onPreviewIframeLoad={handleRecommendPreviewIframeLoad}
                shouldShowPreviewOverlay={shouldShowPreviewOverlay}
                previewPlayerState={previewPlayerState}
                onQuickPlayStart={handleQuickPlayStart}
                recommendationCards={recommendationCards}
                safeRecommendIndex={safeRecommendIndex}
                onSelectRecommendation={handleSelectRecommendationByIndex}
                onOpenCardLink={handleOpenRecommendationCardLink}
                canNavigateRecommendations={canNavigateRecommendations}
                recommendNavLabels={recommendNavLabels}
                onGoPrevRecommendation={goPrevRecommendation}
                onGoNextRecommendation={goNextRecommendation}
                multilineEllipsis2Style={MULTILINE_ELLIPSIS_2}
                onSupportArtistClick={handleSupportArtistClick}
              />
            )}

            {activeTab === "recommend" && reviewDrawerOpen && (
              <ReviewRecapSection
                activeCategoryTheme={activeCategoryTheme}
                reviewRecapSummary={reviewRecapSummary}
                sortedParticipants={sortedParticipants}
                meClientId={meClientId}
                effectiveSelectedReviewParticipantClientId={
                  effectiveSelectedReviewParticipantClientId
                }
                selectedReviewParticipant={selectedReviewParticipant}
                selectedReviewParticipantRank={selectedReviewParticipantRank}
                onGoPrevReviewParticipant={goPrevReviewParticipant}
                onGoNextReviewParticipant={goNextReviewParticipant}
                safeReviewPage={safeReviewPage}
                reviewPageCount={reviewPageCount}
                onSetReviewPage={setReviewPage}
                onSelectReviewParticipantClientId={
                  setSelectedReviewParticipantClientId
                }
                reviewContextTransitionKey={reviewContextTransitionKey}
                pagedRecaps={pagedRecaps}
                selectedRecap={selectedRecap}
                selectedRecapKey={effectiveSelectedRecapKey}
                onSetSelectedRecapKey={setSelectedRecapKey}
                onJumpToRecapPreview={jumpToRecapPreview}
                resolveParticipantResult={resolveParticipantResult}
                resolveCorrectAnsweredRank={resolveCorrectAnsweredRank}
                resultMeta={RESULT_META}
                performanceRatingByRecapKey={performanceRatingByRecapKey}
                performanceGradeMeta={PERFORMANCE_GRADE_META}
                personalFastestCorrectRecapKeys={personalFastestCorrectRecapKeys}
                isParticipantGlobalFastestCorrect={
                  isParticipantGlobalFastestCorrect
                }
                reviewStatusBadgeBaseClass={REVIEW_STATUS_BADGE_BASE}
                reviewDetailTransitionKey={reviewDetailTransitionKey}
                selectedRecapLink={selectedRecapLink}
                onOpenTrackLink={handleOpenTrackLink}
                selectedRecapAnswer={selectedRecapAnswer}
                selectedRecapCorrectRank={selectedRecapCorrectRank}
                isSelectedRecapFastest={isSelectedRecapFastest}
                selectedRecapFastestBadgeText={selectedRecapFastestBadgeText}
                selectedRecapAverageCorrectMs={selectedRecapAverageCorrectMs}
                formatMs={formatMs}
                selectedRecapRating={selectedRecapRating}
                selectedRecapGradeMeta={selectedRecapGradeMeta}
                selectedRecapRatingBreakdown={selectedRecapRatingBreakdown}
                normalizedRecapCount={normalizedRecaps.length}
                recapsPerPage={RECAPS_PER_PAGE}
                multilineEllipsis2Style={MULTILINE_ELLIPSIS_2}
              />
            )}
          </div>
        </div>
      </section>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-700/70 bg-slate-950/92 px-2 backdrop-blur lg:hidden">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-2 py-2 pb-[calc(env(safe-area-inset-bottom)+0.6rem)]">
          <Button
            variant="outlined"
            color="inherit"
            size="small"
            onClick={goPrevStep}
            disabled={stepIndex <= 0}
            className="!min-w-0 !flex-1"
          >
            上一步
          </Button>
          {stepIndex < TAB_ORDER.length - 1 ? (
            <Button
              variant="contained"
              color="warning"
              size="small"
              onClick={goNextStep}
              className="!min-w-0 !flex-[1.1]"
            >
              下一步
            </Button>
          ) : (
            <Button
              variant="contained"
              color="success"
              size="small"
              onClick={goNextStep}
              disabled={!onBackToLobby}
              className="!min-w-0 !flex-[1.1]"
            >
              完成結算
            </Button>
          )}
          {onRequestExit && (
            <Button
              variant="contained"
              color="error"
              size="small"
              onClick={() => setExitConfirmOpen(true)}
              className="!min-w-[84px] !shrink-0"
            >
              離開
            </Button>
          )}
        </div>
      </div>
      <Dialog
        open={exitConfirmOpen}
        onClose={() => setExitConfirmOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>確認離開房間？</DialogTitle>
        <DialogContent>
          <p className="text-sm text-slate-700">
            離開後會中斷目前結算導覽，並返回房間外。
          </p>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExitConfirmOpen(false)} color="inherit">
            取消
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              setExitConfirmOpen(false);
              onRequestExit?.();
            }}
          >
            確認離開
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default LiveSettlementShowcase;
