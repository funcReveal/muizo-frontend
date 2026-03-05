import type { CSSProperties } from "react";

import {
  resolveSettlementTrackLink,
  type SettlementTrackLink,
} from "../../../model/settlementLinks";
import type { PlaylistItem } from "../../../model/types";
import type { SettlementQuestionRecap } from "../GameSettlementPanel";
import {
  buildCorrectAnsweredRankMap,
  type RecommendCategory,
  type SongPerformanceGrade,
} from "../liveSettlementUtils";

export type SettlementExtendedRecap = SettlementQuestionRecap & {
  provider?: string;
  sourceId?: string | null;
  videoId?: string;
  url?: string;
};

export type SettlementRecommendationCard<
  TRecap extends SettlementExtendedRecap = SettlementExtendedRecap,
> = {
  recap: TRecap;
  hint: string;
  emphasis: string;
  link: SettlementTrackLink;
  providerLabel: string;
  previewUrl: string | null;
};

export type SettlementSongPerformanceRating = {
  score: number;
  grade: SongPerformanceGrade;
  result: "correct" | "wrong" | "unanswered";
  answeredRank: number | null;
  answeredAtMs: number | null;
  correctRate: number;
};

export const RECAPS_PER_PAGE = 12;
export const RECOMMEND_PREVIEW_SECONDS = 15;
export const QUICK_SOLVE_TIME_CAP_MS = 10_000;

export const RECOMMEND_CATEGORY_THEME: Record<
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

export const MULTILINE_ELLIPSIS_2: CSSProperties = {
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};

export const REVIEW_STATUS_BADGE_BASE =
  "inline-flex h-6 min-w-[4.25rem] items-center justify-center rounded-full border px-2.5 text-[11px] font-semibold";

export const PERFORMANCE_GRADE_META: Record<
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

export const AUTO_PREVIEW_STORAGE_KEY = "mq_settlement_auto_preview";
export const REVIEW_DOUBLE_PLAY_STORAGE_KEY =
  "mq_settlement_review_double_click_play";
export const RECOMMEND_CONTROLS_HINT_STORAGE_KEY =
  "mq_settlement_recommend_controls_hint_seen";

export const readStoredBoolean = (key: string, fallback: boolean) => {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(key);
  if (raw === "1" || raw === "true") return true;
  if (raw === "0" || raw === "false") return false;
  return fallback;
};

export const resolveParticipantAnswer = (
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

export const resolveParticipantResult = (
  recap: SettlementQuestionRecap,
  participantClientId: string | null,
  meClientId?: string,
): "correct" | "wrong" | "unanswered" => {
  const answer = resolveParticipantAnswer(recap, participantClientId, meClientId);
  if (answer.result === "correct" || answer.result === "wrong") {
    return answer.result;
  }
  if (typeof answer.choiceIndex !== "number") return "unanswered";
  return answer.choiceIndex === recap.correctChoiceIndex ? "correct" : "wrong";
};

export const resolveCorrectAnsweredRank = (
  recap: SettlementQuestionRecap,
  participantClientId: string | null,
) => {
  if (!participantClientId) return null;
  const rankMap = buildCorrectAnsweredRankMap(recap.answersByClientId);
  return rankMap.get(participantClientId) ?? null;
};

export const isParticipantGlobalFastestCorrect = (
  recap: SettlementQuestionRecap,
  rating: SettlementSongPerformanceRating | null | undefined,
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

export const formatElapsed = (startedAt?: number, endedAt?: number) => {
  if (!startedAt || !endedAt || endedAt <= startedAt) return null;
  const totalSeconds = Math.floor((endedAt - startedAt) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

export const formatMs = (value: number | null | undefined) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return "--";
  }
  if (value >= 1000) return `${(value / 1000).toFixed(2)}s`;
  return `${Math.round(value)}ms`;
};

export const formatPercent = (value: number) =>
  `${Math.round(Math.max(0, value) * 100)}%`;

export const resolveRecapTrack = (
  recap: SettlementExtendedRecap,
  playlistItems: PlaylistItem[],
): PlaylistItem | null => {
  const direct = playlistItems[recap.trackIndex];
  return direct ?? null;
};

export const clampMs = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const extractYouTubeId = (
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

export const resolvePreviewEmbedUrl = (
  recap: SettlementExtendedRecap,
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

export const buildRecommendationLink = (recap: SettlementExtendedRecap) =>
  resolveSettlementTrackLink({
    provider: recap.provider,
    sourceId: recap.sourceId,
    videoId: recap.videoId,
    url: recap.url ?? "",
    title: recap.title ?? "",
    answerText: recap.title ?? "",
    uploader: recap.uploader,
  });

export const buildRecommendationCard = (
  recap: SettlementExtendedRecap,
  hint: string,
  emphasis: string,
): SettlementRecommendationCard<SettlementExtendedRecap> => {
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
