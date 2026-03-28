/* eslint-disable @typescript-eslint/no-unused-vars */
import React from "react";
import { IconButton, Popover } from "@mui/material";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import QueryStatsRoundedIcon from "@mui/icons-material/QueryStatsRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import SpeedRoundedIcon from "@mui/icons-material/SpeedRounded";
import TimerRoundedIcon from "@mui/icons-material/TimerRounded";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import AppsRoundedIcon from "@mui/icons-material/AppsRounded";
import RadioButtonUncheckedRoundedIcon from "@mui/icons-material/RadioButtonUncheckedRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import RemoveRoundedIcon from "@mui/icons-material/RemoveRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import HelpOutlineRoundedIcon from "@mui/icons-material/HelpOutlineRounded";

import type { SettlementTrackLink } from "../../../model/settlementLinks";
import type { RoomParticipant } from "../../../model/types";
import type { SettlementQuestionRecap } from "../GameSettlementPanel";
import {
  resolveSongPerformanceSegments,
  type SongPerformanceGrade,
} from "../liveSettlementUtils";

type RecapAnswerResult = "correct" | "wrong" | "unanswered";
type ReviewListFilter = "all" | "correct" | "wrong" | "unanswered";

type SongPerformanceRating = {
  score: number;
  grade: SongPerformanceGrade;
  result: RecapAnswerResult;
  answeredRank: number | null;
  answeredAtMs: number | null;
  correctRate: number;
  answerWindowMs: number;
};

interface RecapAnswerSnapshot {
  choiceIndex: number | null;
  result: RecapAnswerResult;
}

interface ReviewRecapSectionProps {
  isMobileView?: boolean;
  activeCategoryTheme: { drawerClass: string };
  reviewRecapSummary: { correct: number; wrong: number; unanswered: number };
  sortedParticipants: RoomParticipant[];
  meClientId?: string;
  effectiveSelectedReviewParticipantClientId: string | null;
  selectedReviewParticipant: RoomParticipant | null;
  onSelectReviewParticipantClientId: (clientId: string | null) => void;
  reviewContextTransitionKey: string;
  reviewRecaps: SettlementQuestionRecap[];
  selectedRecap: SettlementQuestionRecap | null;
  selectedRecapKey: string | null;
  onSetSelectedRecapKey: (recapKey: string) => void;
  onJumpToRecapPreview: (
    recap: SettlementQuestionRecap,
    source: "click" | "doubleClick",
  ) => void;
  resolveParticipantResult: (
    recap: SettlementQuestionRecap,
    participantClientId: string | null,
    meClientId?: string,
  ) => RecapAnswerResult;
  resultMeta: Record<RecapAnswerResult, { label: string; badgeClass: string }>;
  performanceRatingByRecapKey: Map<string, SongPerformanceRating>;
  performanceGradeMeta: Record<
    SongPerformanceGrade,
    { badgeClass: string; detailClass: string }
  >;
  reviewStatusBadgeBaseClass: string;
  reviewDetailTransitionKey: string;
  selectedRecapLink: SettlementTrackLink | null;
  onOpenTrackLink: (
    link: SettlementTrackLink,
    recap: SettlementQuestionRecap,
  ) => void;
  selectedRecapAnswer: RecapAnswerSnapshot;
  selectedRecapCorrectRank: number | null;
  isSelectedRecapGlobalFastest: boolean;
  selectedRecapFastestBadgeText: string;
  selectedRecapFastestCorrectMeta: {
    clientId: string;
    username: string;
    answeredAtMs: number;
  } | null;
  selectedRecapAverageCorrectMs: number | null;
  formatMs: (value: number | null | undefined) => string;
  selectedRecapRating: SongPerformanceRating | null;
  selectedRecapGradeMeta: { badgeClass: string; detailClass: string } | null;
  selectedRecapRatingBreakdown: string;
  multilineEllipsis2Style: React.CSSProperties;
  reviewDoubleClickPlayEnabled: boolean;
  onToggleReviewDoubleClickPlay: () => void;
}

const clampPercent = (value: number) =>
  Math.max(0, Math.min(100, Math.round(value)));

const resolveMedian = (values: number[]) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[middle]
    : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
};

const countChoiceVotes = (recap: SettlementQuestionRecap, choiceIndex: number) =>
  Object.values(recap.answersByClientId ?? {}).filter(
    (answer) => answer.choiceIndex === choiceIndex,
  ).length;

const renderResultBadgeContent = (result: RecapAnswerResult) => {
  switch (result) {
    case "correct":
      return <RadioButtonUncheckedRoundedIcon className="text-[0.85rem]" />;
    case "wrong":
      return <CloseRoundedIcon className="text-[0.85rem]" />;
    default:
      return <RemoveRoundedIcon className="text-[0.95rem]" />;
  }
};

const REVIEW_BADGE_PILL_CLASS =
  "inline-flex h-7 min-w-[4.25rem] items-center justify-center gap-1.5 rounded-full border px-3 text-xs font-semibold";

const ReviewRecapSection: React.FC<ReviewRecapSectionProps> = ({
  isMobileView = false,
  activeCategoryTheme,
  reviewRecapSummary,
  sortedParticipants,
  meClientId,
  effectiveSelectedReviewParticipantClientId,
  selectedReviewParticipant,
  onSelectReviewParticipantClientId,
  reviewContextTransitionKey,
  reviewRecaps,
  selectedRecap,
  selectedRecapKey,
  onSetSelectedRecapKey,
  onJumpToRecapPreview,
  resolveParticipantResult,
  resultMeta,
  performanceRatingByRecapKey,
  performanceGradeMeta,
  reviewStatusBadgeBaseClass,
  reviewDetailTransitionKey,
  selectedRecapLink,
  onOpenTrackLink,
  selectedRecapAnswer,
  selectedRecapCorrectRank,
  isSelectedRecapGlobalFastest,
  selectedRecapFastestBadgeText,
  selectedRecapFastestCorrectMeta,
  selectedRecapAverageCorrectMs,
  formatMs,
  selectedRecapRating,
  selectedRecapGradeMeta,
  selectedRecapRatingBreakdown,
  multilineEllipsis2Style,
  reviewDoubleClickPlayEnabled,
  onToggleReviewDoubleClickPlay,
}) => {
  const [filter, setFilter] = React.useState<ReviewListFilter>("all");
  const [reviewPlaybackHelpAnchor, setReviewPlaybackHelpAnchor] =
    React.useState<HTMLElement | null>(null);
  const filteredRecaps = React.useMemo(() => {
    if (filter === "all") return reviewRecaps;
    return reviewRecaps.filter((recap) => {
      const result = resolveParticipantResult(
        recap,
        effectiveSelectedReviewParticipantClientId,
        meClientId,
      );
      return result === filter;
    });
  }, [
    effectiveSelectedReviewParticipantClientId,
    filter,
    meClientId,
    resolveParticipantResult,
    reviewRecaps,
  ]);

  const answers = Object.values(selectedRecap?.answersByClientId ?? {});
  const correctTimes = answers
    .filter((answer) => answer.result === "correct")
    .map((answer) =>
      typeof answer.answeredAtMs === "number" && answer.answeredAtMs >= 0
        ? Math.floor(answer.answeredAtMs)
        : null,
    )
    .filter((value): value is number => value !== null);
  const medianMs =
    selectedRecap?.medianCorrectMs ??
    resolveMedian(correctTimes) ??
    selectedRecapAverageCorrectMs;
  const answeredAtMs = selectedRecapRating?.answeredAtMs ?? null;
  const beatPercent =
    selectedRecapRating?.result === "correct" &&
      answeredAtMs !== null &&
      correctTimes.length > 0
      ? clampPercent(
        (correctTimes.filter((value) => value > answeredAtMs).length /
          correctTimes.length) *
        100,
      )
      : 0;
  const speedDeltaMs =
    answeredAtMs !== null && typeof medianMs === "number"
      ? medianMs - answeredAtMs
      : null;
  const scoreSegments = resolveSongPerformanceSegments({
    result: selectedRecapRating?.result ?? "unanswered",
    participantCount: Math.max(
      1,
      typeof selectedRecap?.participantCount === "number" &&
        Number.isFinite(selectedRecap.participantCount)
        ? selectedRecap.participantCount
        : answers.length,
    ),
    correctRate: selectedRecapRating?.correctRate ?? 0,
    answeredAtMs: selectedRecapRating?.answeredAtMs ?? null,
    answeredRank: selectedRecapRating?.answeredRank ?? null,
    answerWindowMs: selectedRecapRating?.answerWindowMs ?? 15_000,
  }).map((segment) => ({
    label: segment.label,
    max: segment.max,
    value: segment.value,
    color: segment.color,
  }));
  const totalSegmentScore = scoreSegments.reduce((sum, segment) => sum + segment.value, 0);
  const displayScore = selectedRecapRating?.score ?? totalSegmentScore;
  const totalRecapCount =
    reviewRecapSummary.correct +
    reviewRecapSummary.wrong +
    reviewRecapSummary.unanswered;
  const scorePercent = clampPercent(displayScore);
  const isPerfectScore = displayScore >= 100;
  const scoreVisualTone = isPerfectScore
    ? {
      shellClass:
        "border-amber-200/35 bg-[radial-gradient(circle_at_50%_0%,rgba(251,191,36,0.34),transparent_58%),radial-gradient(circle_at_50%_100%,rgba(245,158,11,0.18),transparent_68%),linear-gradient(180deg,rgba(24,17,6,0.96),rgba(12,9,4,0.98))] shadow-[0_28px_55px_-38px_rgba(251,191,36,0.88),inset_0_1px_0_rgba(255,248,220,0.12)]",
      eyebrowClass: "text-amber-100/80",
      sublineClass: "text-amber-50/70",
      ringGlowClass: "shadow-[0_0_48px_-8px_rgba(251,191,36,0.85)]",
      ringBaseClass:
        "border border-amber-200/30 bg-[radial-gradient(circle_at_50%_35%,rgba(255,248,220,0.12),rgba(10,10,10,0.96))]",
      scoreClass:
        "bg-[linear-gradient(180deg,#fff7d6,#f5b318_58%,#f59e0b)] bg-clip-text text-transparent",
    }
    : selectedRecapAnswer.result === "correct"
      ? {
        shellClass:
          "border-emerald-300/22 bg-[radial-gradient(circle_at_18%_0%,rgba(16,185,129,0.18),transparent_48%),radial-gradient(circle_at_84%_100%,rgba(45,212,191,0.1),transparent_42%),linear-gradient(180deg,rgba(7,21,20,0.98),rgba(8,13,24,0.98))] shadow-[0_28px_55px_-44px_rgba(16,185,129,0.52),inset_0_1px_0_rgba(255,255,255,0.05)]",
        eyebrowClass: "text-emerald-100/78",
        sublineClass: "text-emerald-50/64",
        ringGlowClass: "shadow-[0_0_42px_-12px_rgba(45,212,191,0.48)]",
        ringBaseClass:
          "border border-emerald-300/16 bg-[radial-gradient(circle_at_50%_30%,rgba(16,185,129,0.12),rgba(2,6,23,0.96))]",
        scoreClass: "text-emerald-50",
      }
      : selectedRecapAnswer.result === "wrong"
        ? {
          shellClass:
            "border-rose-300/22 bg-[radial-gradient(circle_at_18%_0%,rgba(244,63,94,0.18),transparent_48%),radial-gradient(circle_at_84%_100%,rgba(251,113,133,0.12),transparent_42%),linear-gradient(180deg,rgba(24,8,15,0.98),rgba(8,13,24,0.98))] shadow-[0_28px_55px_-44px_rgba(244,63,94,0.5),inset_0_1px_0_rgba(255,255,255,0.05)]",
          eyebrowClass: "text-rose-100/80",
          sublineClass: "text-rose-50/64",
          ringGlowClass: "shadow-[0_0_42px_-12px_rgba(244,63,94,0.48)]",
          ringBaseClass:
            "border border-rose-300/16 bg-[radial-gradient(circle_at_50%_30%,rgba(244,63,94,0.12),rgba(2,6,23,0.96))]",
          scoreClass: "text-rose-50",
        }
        : {
          shellClass:
            "border-slate-200/10 bg-[radial-gradient(circle_at_18%_0%,rgba(148,163,184,0.12),transparent_46%),radial-gradient(circle_at_84%_100%,rgba(71,85,105,0.12),transparent_42%),linear-gradient(180deg,rgba(10,16,28,0.98),rgba(5,9,18,0.98))] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
          eyebrowClass: "text-slate-300/78",
          sublineClass: "text-slate-400/72",
          ringGlowClass: "shadow-[0_0_34px_-16px_rgba(148,163,184,0.38)]",
          ringBaseClass:
            "border border-slate-300/10 bg-[radial-gradient(circle_at_50%_30%,rgba(148,163,184,0.08),rgba(2,6,23,0.96))]",
          scoreClass: "text-slate-100",
        };
  const scoreRingGradient =
    displayScore > 0
      ? `conic-gradient(${scoreSegments
        .filter((segment) => segment.value > 0)
        .reduce(
          (acc, segment) => {
            const start = acc.offset;
            const end = start + segment.value;
            acc.parts.push(`${segment.color} ${start}% ${end}%`);
            acc.offset = end;
            return acc;
          },
          { offset: 0, parts: [] as string[] },
        )
        .parts.join(", ")}, rgba(255,255,255,0.08) ${scorePercent}% 100%)`
      : "conic-gradient(rgba(255,255,255,0.08) 0 100%)";
  const globalResultTotal =
    (selectedRecap?.correctCount ?? 0) +
    (selectedRecap?.wrongCount ?? 0) +
    (selectedRecap?.unansweredCount ?? 0);
  const globalSegments =
    globalResultTotal > 0
      ? [
        {
          key: "correct",
          width: `${((selectedRecap?.correctCount ?? 0) / globalResultTotal) * 100}%`,
          className:
            "bg-[linear-gradient(90deg,rgba(16,185,129,0.95),rgba(45,212,191,0.95))]",
        },
        {
          key: "wrong",
          width: `${((selectedRecap?.wrongCount ?? 0) / globalResultTotal) * 100}%`,
          className:
            "bg-[linear-gradient(90deg,rgba(244,63,94,0.95),rgba(251,113,133,0.92))]",
        },
        {
          key: "unanswered",
          width: `${((selectedRecap?.unansweredCount ?? 0) / globalResultTotal) * 100}%`,
          className:
            "bg-[linear-gradient(90deg,rgba(100,116,139,0.92),rgba(148,163,184,0.88))]",
        },
      ]
      : [];

  return (
    <section className={`mt-4 rounded-[22px] border p-2.5 lg:p-3 ${activeCategoryTheme.drawerClass}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <HistoryRoundedIcon className="text-amber-100" />
          <h3 className="text-[2rem] font-black tracking-tight text-white">題目回顧</h3>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onToggleReviewDoubleClickPlay} className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition ${reviewDoubleClickPlayEnabled ? "border-cyan-300/45 bg-cyan-400/12 text-cyan-50" : "border-slate-600/70 bg-slate-900/68 text-slate-300 hover:border-slate-400"}`}>
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-current/30 text-[10px]">2x</span>
            雙擊預覽 {reviewDoubleClickPlayEnabled ? "ON" : "OFF"}
          </button>
          <IconButton
            size="small"
            onClick={(event) =>
              setReviewPlaybackHelpAnchor((current) =>
                current === event.currentTarget ? null : event.currentTarget,
              )
            }
            className="!h-9 !w-9 !border !border-cyan-300/35 !bg-cyan-500/10 !text-cyan-100"
            aria-label="查看雙擊播放說明"
          >
            <HelpOutlineRoundedIcon fontSize="inherit" />
          </IconButton>
        </div>
      </div>
      <Popover
        open={Boolean(reviewPlaybackHelpAnchor)}
        anchorEl={reviewPlaybackHelpAnchor}
        onClose={() => setReviewPlaybackHelpAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{
          className:
            "!mt-2 !max-w-[280px] !rounded-[18px] !border !border-cyan-300/24 !bg-[linear-gradient(180deg,rgba(7,24,34,0.96),rgba(4,13,24,0.98))] !px-4 !py-3 !text-sm !text-cyan-50/92 !shadow-[0_22px_44px_-24px_rgba(34,211,238,0.55)]",
        }}
      >
        開啟後可在題目清單上雙擊直接播放該題預覽；關閉時雙擊只會停留在選題，不會自動播放。
      </Popover>

      {sortedParticipants.length > 0 && (
        <div className="mt-4 overflow-x-auto pb-1">
          <div className="inline-flex min-w-max items-center gap-2">
            {sortedParticipants.map((participant, index) => {
              const isActive = participant.clientId === effectiveSelectedReviewParticipantClientId;
              return (
                <button key={participant.clientId} type="button" onClick={() => onSelectReviewParticipantClientId(participant.clientId)} className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition ${isActive ? "border-sky-300/55 bg-sky-500/16 text-sky-50" : "border-slate-600/70 bg-slate-900/68 text-slate-300 hover:border-slate-400"}`}>
                  <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full border border-current/35 px-1 text-[10px] leading-none">{index + 1}</span>
                  <span className="max-w-[9rem] truncate">{participant.username}{participant.clientId === meClientId ? "（你）" : ""}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className={`mt-4 grid gap-4 ${isMobileView ? "grid-cols-1" : "lg:grid-cols-[280px_minmax(0,1fr)]"}`}>
        <div className="flex min-h-0 flex-col">
          <div className="mb-3 flex flex-wrap items-center gap-1">
            <button type="button" onClick={() => setFilter("all")} className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-full border px-3 transition ${filter === "all" ? "border-sky-300/55 bg-sky-500/16 text-sky-50" : "border-slate-600/70 bg-slate-900/68 text-slate-300 hover:border-slate-400"}`}><AppsRoundedIcon className="text-[0.92rem]" /><span className="text-[11px] font-semibold">{totalRecapCount}</span></button>
            <button type="button" onClick={() => setFilter("correct")} className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-full border px-3 transition ${filter === "correct" ? "border-emerald-300/55 bg-emerald-500/16 text-emerald-50" : "border-slate-600/70 bg-slate-900/68 text-slate-300 hover:border-slate-400"}`}><RadioButtonUncheckedRoundedIcon className="text-[0.82rem]" /><span className="text-[11px] font-semibold">{reviewRecapSummary.correct}</span></button>
            <button type="button" onClick={() => setFilter("wrong")} className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-full border px-3 transition ${filter === "wrong" ? "border-rose-300/55 bg-rose-500/16 text-rose-50" : "border-slate-600/70 bg-slate-900/68 text-slate-300 hover:border-slate-400"}`}><CloseRoundedIcon className="text-[0.82rem]" /><span className="text-[11px] font-semibold">{reviewRecapSummary.wrong}</span></button>
            <button type="button" onClick={() => setFilter("unanswered")} className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-full border px-3 transition ${filter === "unanswered" ? "border-slate-300/55 bg-slate-500/16 text-slate-50" : "border-slate-600/70 bg-slate-900/68 text-slate-300 hover:border-slate-400"}`}><RemoveRoundedIcon className="text-[0.82rem]" /><span className="text-[11px] font-semibold">{reviewRecapSummary.unanswered}</span></button>
          </div>

          <div key={`review-list-${reviewContextTransitionKey}`} className={`${isMobileView ? "h-[clamp(280px,42vh,380px)]" : "lg:h-[min(880px,calc(100vh-14rem))]"} overflow-hidden`} style={{ animation: "settlementSwapIn 220ms ease-out both" }}>
            <div className="h-full overflow-y-auto pr-1.5">
              <div className="space-y-3">
                {filteredRecaps.map((recap) => {
                  const result = resolveParticipantResult(recap, effectiveSelectedReviewParticipantClientId, meClientId);
                  const rating = performanceRatingByRecapKey.get(recap.key) ?? null;
                  const gradeMeta = rating ? performanceGradeMeta[rating.grade] : null;
                  const isActive = selectedRecapKey === recap.key;
                  return (
                    <button key={recap.key} type="button" className={`block w-full rounded-[22px] border px-4 py-4 text-left transition ${isActive ? "border-amber-300/55 bg-amber-400/10 shadow-[0_18px_36px_-30px_rgba(251,191,36,0.62)]" : "border-slate-700/75 bg-slate-950/55 hover:border-slate-500/80"}`} onClick={() => { onSetSelectedRecapKey(recap.key); onJumpToRecapPreview(recap, "click"); }} onDoubleClick={() => { onSetSelectedRecapKey(recap.key); onJumpToRecapPreview(recap, "doubleClick"); }}>
                      <div className="flex items-start gap-3">
                        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-amber-300/45 bg-amber-400/10 text-sm font-black text-amber-100">{recap.order}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[1.05rem] font-black leading-snug text-white">{recap.title}</p>
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            <span
                              className={`${REVIEW_BADGE_PILL_CLASS} ${resultMeta[result].badgeClass}`}
                              aria-label={resultMeta[result].label}
                              title={resultMeta[result].label}
                            >
                              {renderResultBadgeContent(result)}
                            </span>
                            {gradeMeta && <span className={`${REVIEW_BADGE_PILL_CLASS} ${gradeMeta.badgeClass}`}>評級 {rating?.grade}</span>}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
                {filteredRecaps.length === 0 && <div className="flex h-full items-center justify-center rounded-[22px] border border-dashed border-slate-700/70 bg-slate-950/55 px-4 text-sm text-slate-400">沒有符合條件的題目</div>}
              </div>
            </div>
          </div>
        </div>

        <div className="min-h-0 rounded-[28px] bg-[linear-gradient(180deg,rgba(9,15,29,0.94),rgba(8,13,24,0.98))] p-4">
          {selectedRecap ? (
            <div key={reviewDetailTransitionKey} style={{ animation: "settlementSwapIn 240ms ease-out both" }}>
              <div className="rounded-[24px] bg-slate-950/20 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">題目 {selectedRecap.order}{selectedReviewParticipant ? ` ・ ${selectedReviewParticipant.username}` : ""}</p>
                <button type="button" className={`mt-3 w-full text-left text-[2rem] font-black leading-tight transition ${selectedRecapLink?.href ? "text-white underline-offset-4 hover:text-cyan-200 hover:underline" : "cursor-default text-white"}`} onClick={() => { if (selectedRecapLink?.href) onOpenTrackLink(selectedRecapLink, selectedRecap); }} disabled={!selectedRecapLink?.href}>
                  <span className="block" style={multilineEllipsis2Style}>{selectedRecap.title}</span>
                </button>
                <p className="mt-2 text-lg text-slate-300">{selectedRecap.uploader || "未知來源"}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span
                    className={`${REVIEW_BADGE_PILL_CLASS} ${resultMeta[selectedRecapAnswer.result].badgeClass}`}
                    aria-label={resultMeta[selectedRecapAnswer.result].label}
                    title={resultMeta[selectedRecapAnswer.result].label}
                  >
                    {renderResultBadgeContent(selectedRecapAnswer.result)}
                  </span>
                  {selectedRecapGradeMeta && <span className={`${REVIEW_BADGE_PILL_CLASS} ${selectedRecapGradeMeta.badgeClass}`}>評級 {selectedRecapRating?.grade}</span>}
                  {selectedRecapCorrectRank !== null && <span className={`${REVIEW_BADGE_PILL_CLASS} border-sky-300/45 bg-sky-500/16 text-sky-100`}>第 {selectedRecapCorrectRank} 答</span>}
                  {isSelectedRecapGlobalFastest && <span className={`${REVIEW_BADGE_PILL_CLASS} border-orange-300/45 bg-orange-500/18 text-orange-100`}>{selectedRecapFastestBadgeText}</span>}
                </div>

                <div className="mt-4 grid gap-3 xl:grid-cols-[1.05fr_0.95fr]">
                  <div className={`rounded-[22px] border p-4 ${scoreVisualTone.shellClass}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className={`text-[11px] font-semibold tracking-[0.18em] ${scoreVisualTone.eyebrowClass}`}>評分儀表</p>
                        <p className={`mt-1 text-xs ${scoreVisualTone.sublineClass}`}>個人表現整合到這裡</p>
                      </div>
                      {selectedRecapRating && <span className={`inline-flex h-7 items-center justify-center rounded-full border px-3 text-xs font-semibold ${selectedRecapGradeMeta?.badgeClass ?? ""}`}>總分 {displayScore}</span>}
                    </div>
                    <div className="mt-4 grid gap-4 md:grid-cols-[140px_minmax(0,1fr)]">
                      <div className="flex justify-center">
                        <div
                          className={`relative flex h-36 w-36 items-center justify-center rounded-full ${scoreVisualTone.ringGlowClass}`}
                          style={{ background: scoreRingGradient }}
                        >
                          <div className="absolute inset-[7px] rounded-full border border-white/10 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.08),transparent_72%)] opacity-70" />
                          <div className="pointer-events-none absolute inset-[2px] rounded-full bg-[conic-gradient(from_220deg,rgba(255,255,255,0.16),transparent_18%,transparent_72%,rgba(255,255,255,0.12)_86%,transparent)] mix-blend-screen opacity-60" />
                          <div className={`absolute inset-[26px] rounded-full ${scoreVisualTone.ringBaseClass} bg-slate-950/100`} />
                          <div className="relative z-10 flex h-[6.2rem] w-[6.2rem] flex-col items-center justify-center rounded-full bg-slate-950/100">
                            <span className={`text-[10px] font-semibold tracking-[0.22em] ${scoreVisualTone.eyebrowClass}`}>SCORE</span>
                            <span className={`mt-1 text-3xl font-black ${scoreVisualTone.scoreClass}`}>{displayScore}</span>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {scoreSegments.filter((segment) => segment.max > 0).map((segment) => (
                          <div key={segment.label} className="rounded-[18px] border border-white/7 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(0,0,0,0.16))] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                            <div className="flex items-center justify-between gap-3 text-sm font-semibold text-white">
                              <span>{segment.label}</span>
                              <span className="text-slate-300">{segment.value} / {segment.max}</span>
                            </div>
                            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/8">
                              <div
                                className="h-full rounded-full shadow-[0_0_16px_-4px_currentColor]"
                                style={{
                                  width: `${segment.max > 0 ? (segment.value / segment.max) * 100 : 0}%`,
                                  background: segment.color,
                                  color: segment.color,
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[22px] border border-white/8 bg-[linear-gradient(180deg,rgba(10,18,30,0.84),rgba(5,9,18,0.96))] p-4">
                    <div className="grid gap-3">
                      <div className="rounded-[18px] border border-white/6 bg-black/18 p-4">
                        <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.16em] text-slate-400"><EmojiEventsRoundedIcon className="text-[1rem] text-amber-200" />全場最快</div>
                        <p className="mt-3 text-sm font-black text-white">{selectedRecapFastestCorrectMeta ? selectedRecapFastestCorrectMeta.username : "--"}</p>
                        <p className="mt-1 text-xs text-slate-300">{selectedRecapFastestCorrectMeta ? formatMs(selectedRecapFastestCorrectMeta.answeredAtMs) : "--"}</p>
                      </div>
                      <div className="rounded-[18px] border border-white/6 bg-black/18 p-4">
                        <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.16em] text-slate-400"><TimerRoundedIcon className="text-[1rem] text-cyan-200" />中位作答</div>
                        <p className="mt-3 text-sm font-black text-white">{typeof medianMs === "number" ? formatMs(medianMs) : "--"}</p>
                        <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/8">
                          {globalSegments.map((segment) => (
                            <div key={segment.key} className={`h-full ${segment.className}`} style={{ width: segment.width, float: "left" }} />
                          ))}
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                          <div className="rounded-[12px] bg-emerald-500/10 px-2 py-2 text-emerald-100">{selectedRecap.correctCount ?? 0}</div>
                          <div className="rounded-[12px] bg-rose-500/10 px-2 py-2 text-rose-100">{selectedRecap.wrongCount ?? 0}</div>
                          <div className="rounded-[12px] bg-slate-500/10 px-2 py-2 text-slate-100">{selectedRecap.unansweredCount ?? 0}</div>
                        </div>
                      </div>
                      <div className="rounded-[18px] border border-white/6 bg-black/18 p-4">
                        <div className="grid gap-3 sm:grid-cols-3">
                          <div><div className="text-[11px] tracking-[0.16em] text-slate-400">你的作答</div><div className="mt-2 text-sm font-black text-white">{answeredAtMs !== null ? formatMs(answeredAtMs) : "--"}</div></div>
                          <div><div className="text-[11px] tracking-[0.16em] text-slate-400">比中位快慢</div><div className={`mt-2 text-sm font-black ${speedDeltaMs === null ? "text-white" : speedDeltaMs >= 0 ? "text-emerald-100" : "text-rose-100"}`}>{speedDeltaMs === null ? "--" : `${speedDeltaMs >= 0 ? "+" : "-"}${formatMs(Math.abs(speedDeltaMs))}`}</div></div>
                          <div><div className="text-[11px] tracking-[0.16em] text-slate-400">贏過比例</div><div className="mt-2 text-sm font-black text-white">{beatPercent > 0 ? `${beatPercent}%` : "--"}</div></div>
                        </div>
                        <p className="mt-3 text-xs text-slate-400">{selectedRecapRatingBreakdown || "尚無更多評分資訊"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-[24px] bg-slate-950/45 p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">選項分布</p>
                <div className="mt-4 grid gap-3.5">
                  {selectedRecap.choices.map((choice) => {
                    const isCorrect = choice.index === selectedRecap.correctChoiceIndex;
                    const isMine = selectedRecapAnswer.choiceIndex === choice.index;
                    const pickedCount = countChoiceVotes(selectedRecap, choice.index);
                    const totalAnswers = Math.max(1, Object.keys(selectedRecap.answersByClientId ?? {}).length);
                    const pickedPercent = clampPercent((pickedCount / totalAnswers) * 100);
                    return (
                      <div key={`${selectedRecap.key}-${choice.index}`} className={`overflow-hidden rounded-[22px] border px-5 py-4 ${isCorrect ? "border-emerald-300/42 bg-emerald-500/10" : isMine ? "border-sky-300/38 bg-sky-500/10" : "border-slate-700/70 bg-slate-900/55"}`}>
                        <div className="space-y-3.5">
                          <p className="text-[1.02rem] font-semibold leading-relaxed text-white">{choice.title}</p>
                          <div className="flex flex-wrap items-center gap-2">
                            {isCorrect && <span className={`${reviewStatusBadgeBaseClass} h-6 border-emerald-300/45 bg-emerald-400/15 px-2.5 text-[10px] text-emerald-100`}>正確答案</span>}
                            {isMine && <span className={`${reviewStatusBadgeBaseClass} h-6 border-sky-300/45 bg-sky-400/15 px-2.5 text-[10px] text-sky-100`}>你的選擇</span>}
                            <span className="inline-flex h-6 items-center justify-center rounded-full border border-slate-500/65 bg-slate-900/75 px-2.5 text-[10px] font-semibold text-slate-200">{pickedCount} 票</span>
                            <span className="inline-flex h-6 items-center justify-center rounded-full border border-white/10 bg-black/20 px-2.5 text-[10px] font-semibold text-slate-200">{pickedPercent}%</span>
                          </div>
                          <div className="h-3 w-full overflow-hidden rounded-full bg-black/25"><div className={`h-full rounded-full ${isCorrect ? "bg-[linear-gradient(90deg,rgba(16,185,129,0.95),rgba(45,212,191,0.95))]" : isMine ? "bg-[linear-gradient(90deg,rgba(56,189,248,0.95),rgba(96,165,250,0.95))]" : "bg-[linear-gradient(90deg,rgba(100,116,139,0.9),rgba(148,163,184,0.85))]"}`} style={{ width: `${pickedPercent}%` }} /></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[240px] items-center justify-center rounded-[24px] border border-dashed border-slate-700/70 bg-slate-950/55 px-4 text-sm text-slate-400">選擇一題後即可查看回顧</div>
          )}
        </div>
      </div>
    </section>
  );
};

export default ReviewRecapSection;
