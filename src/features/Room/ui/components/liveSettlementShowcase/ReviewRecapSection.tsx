import React from "react";
import { IconButton, Popover } from "@mui/material";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import TimerRoundedIcon from "@mui/icons-material/TimerRounded";
import AppsRoundedIcon from "@mui/icons-material/AppsRounded";
import RadioButtonUncheckedRoundedIcon from "@mui/icons-material/RadioButtonUncheckedRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import RemoveRoundedIcon from "@mui/icons-material/RemoveRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import HelpOutlineRoundedIcon from "@mui/icons-material/HelpOutlineRounded";

import type { SettlementTrackLink } from "../../../model/settlementLinks";
import type { RoomParticipant } from "../../../model/types";
import RoomUiTooltip from "../../../../../shared/ui/RoomUiTooltip";
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
  personalFastestCorrectRecapKeys?: Set<string>;
  reviewStatusBadgeBaseClass: string;
  reviewDetailTransitionKey: string;
  selectedRecapLink: SettlementTrackLink | null;
  onOpenTrackLink: (
    link: SettlementTrackLink,
    recap: SettlementQuestionRecap,
  ) => void;
  selectedRecapAnswer: RecapAnswerSnapshot;
  selectedRecapFastestCorrectMeta: {
    clientId: string;
    username: string;
    answeredAtMs: number;
  } | null;
  selectedRecapAverageCorrectMs: number | null;
  formatMs: (value: number | null | undefined) => string;
  selectedRecapRating: SongPerformanceRating | null;
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

const ChoiceMarqueeTitle: React.FC<{
  text: string;
  className?: string;
}> = ({ text, className = "" }) => {
  const wrapRef = React.useRef<HTMLSpanElement | null>(null);
  const trackRef = React.useRef<HTMLSpanElement | null>(null);
  const [running, setRunning] = React.useState(false);
  const [style, setStyle] = React.useState<React.CSSProperties>({});

  React.useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const track = trackRef.current;
    if (!wrap || !track) return;

    const measure = () => {
      const overflow = track.scrollWidth - wrap.clientWidth;
      if (overflow > 10) {
        setRunning(true);
        setStyle({
          ["--settlement-title-shift" as const]: `${-(overflow + 26)}px`,
          ["--settlement-title-duration" as const]: `${Math.min(
            12,
            Math.max(5.8, overflow / 36),
          ).toFixed(2)}s`,
        } as React.CSSProperties);
      } else {
        setRunning(false);
        setStyle({});
      }
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(wrap);
    observer.observe(track);
    return () => observer.disconnect();
  }, [text]);

  return (
    <span
      ref={wrapRef}
      className={`block overflow-hidden ${className}`}
    >
      <span
        ref={trackRef}
        className={`game-settlement-choice-marquee-track ${running ? "game-settlement-choice-marquee-track--run" : ""
          }`}
        style={style}
      >
        <span>{text}</span>
      </span>
    </span>
  );
};

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
  selectedRecapFastestCorrectMeta,
  selectedRecapAverageCorrectMs,
  formatMs,
  selectedRecapRating,
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
  const participantByClientId = React.useMemo(
    () =>
      new Map(sortedParticipants.map((participant) => [participant.clientId, participant])),
    [sortedParticipants],
  );
  const answerWindowMs = selectedRecapRating?.answerWindowMs ?? 15_000;
  const correctTimes = answers
    .filter((answer) => answer.result === "correct")
    .map((answer) =>
      typeof answer.answeredAtMs === "number" && answer.answeredAtMs >= 0
        ? Math.floor(answer.answeredAtMs)
        : null,
    )
    .filter((value): value is number => value !== null);
  const allResponseTimes = answers
    .map((answer) =>
      typeof answer.answeredAtMs === "number" && answer.answeredAtMs >= 0
        ? Math.floor(answer.answeredAtMs)
        : answerWindowMs,
    );
  const participantCount = Math.max(
    1,
    typeof selectedRecap?.participantCount === "number" &&
      Number.isFinite(selectedRecap.participantCount)
      ? selectedRecap.participantCount
      : answers.length,
  );
  const missingParticipantCount = Math.max(0, participantCount - answers.length);
  for (let index = 0; index < missingParticipantCount; index += 1) {
    allResponseTimes.push(answerWindowMs);
  }
  const medianMs = resolveMedian(allResponseTimes) ?? selectedRecapAverageCorrectMs;
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
      gradeClass:
        "bg-[linear-gradient(180deg,#fff7d6,#f5b318_58%,#f59e0b)] bg-clip-text text-transparent [text-shadow:0_0_22px_rgba(251,191,36,0.48)]",
      ringGlowClass: "shadow-[0_0_48px_-8px_rgba(34,197,94,0.58)]",
      ringBaseClass:
        "border border-emerald-300/22 bg-[radial-gradient(circle_at_50%_35%,rgba(16,185,129,0.12),rgba(10,10,10,0.96))]",
      scoreClass: "text-emerald-100",
      statusGlowClass:
        "bg-[radial-gradient(circle,rgba(34,197,94,0.7)_0%,rgba(16,185,129,0.26)_42%,transparent_72%)]",
    }
    : selectedRecapAnswer.result === "correct"
      ? {
        gradeClass: "text-emerald-50 [text-shadow:0_0_18px_rgba(16,185,129,0.42)]",
        ringGlowClass: "shadow-[0_0_42px_-12px_rgba(45,212,191,0.48)]",
        ringBaseClass:
          "border border-emerald-300/16 bg-[radial-gradient(circle_at_50%_30%,rgba(16,185,129,0.12),rgba(2,6,23,0.96))]",
        scoreClass: "text-emerald-50",
        statusGlowClass:
          "bg-[radial-gradient(circle,rgba(16,185,129,0.98)_0%,rgba(45,212,191,0.44)_42%,transparent_78%)]",
      }
      : selectedRecapAnswer.result === "wrong"
        ? {
          gradeClass: "text-rose-50 [text-shadow:0_0_18px_rgba(244,63,94,0.4)]",
          ringGlowClass: "shadow-[0_0_42px_-12px_rgba(244,63,94,0.48)]",
          ringBaseClass:
            "border border-rose-300/16 bg-[radial-gradient(circle_at_50%_30%,rgba(244,63,94,0.12),rgba(2,6,23,0.96))]",
          scoreClass: "text-rose-50",
          statusGlowClass:
            "bg-[radial-gradient(circle,rgba(244,63,94,0.98)_0%,rgba(251,113,133,0.42)_42%,transparent_78%)]",
        }
        : {
          gradeClass: "text-slate-100 [text-shadow:0_0_16px_rgba(148,163,184,0.28)]",
          ringGlowClass: "shadow-[0_0_34px_-16px_rgba(148,163,184,0.38)]",
          ringBaseClass:
            "border border-slate-300/10 bg-[radial-gradient(circle_at_50%_30%,rgba(148,163,184,0.08),rgba(2,6,23,0.96))]",
          scoreClass: "text-slate-100",
          statusGlowClass:
            "bg-[radial-gradient(circle,rgba(148,163,184,0.92)_0%,rgba(100,116,139,0.36)_42%,transparent_78%)]",
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
  const scoreRankLabel =
    typeof selectedRecapRating?.answeredRank === "number" &&
      selectedRecapRating.answeredRank > 0
      ? `#${selectedRecapRating.answeredRank}`
      : "--";
  return (
    <section className={`mt-4 rounded-[22px] border p-2.5 lg:p-3 ${activeCategoryTheme.drawerClass}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <HistoryRoundedIcon className="text-amber-100" />
          <h3 className="text-[2rem] font-black tracking-tight text-white">題目回顧</h3>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onToggleReviewDoubleClickPlay} className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition ${reviewDoubleClickPlayEnabled ? "border-cyan-300/45 bg-cyan-400/12 text-cyan-50" : "border-slate-600/70 bg-slate-900/68 text-slate-300 hover:border-slate-400"}`}>
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
            className="!h-9 !w-9 !cursor-pointer !border !border-cyan-300/35 !bg-cyan-500/10 !text-cyan-100"
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
                <button key={participant.clientId} type="button" onClick={() => onSelectReviewParticipantClientId(participant.clientId)} className={`inline-flex cursor-pointer items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition ${isActive ? "bg-sky-500/16 text-sky-50 shadow-none" : "border border-slate-600/70 bg-slate-900/68 text-slate-300 hover:border-slate-400"}`}>
                  <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full border border-current/35 px-1 text-[10px] leading-none">{index + 1}</span>
                  <span className="max-w-[9rem] truncate">{participant.username}{participant.clientId === meClientId ? "（你）" : ""}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className={`mt-4 grid gap-4 ${isMobileView ? "grid-cols-1" : "lg:grid-cols-[304px_minmax(0,1fr)]"}`}>
        <div className="flex min-h-0 flex-col">
          <div className="mb-3 flex flex-wrap items-center gap-1">
            <button type="button" onClick={() => setFilter("all")} className={`inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-full border px-3 transition ${filter === "all" ? "border-sky-300/55 bg-sky-500/16 text-sky-50" : "border-slate-600/70 bg-slate-900/68 text-slate-300 hover:border-slate-400"}`}><AppsRoundedIcon className="text-[0.92rem]" /><span className="text-[11px] font-semibold">{totalRecapCount}</span></button>
            <button type="button" onClick={() => setFilter("correct")} className={`inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-full border px-3 transition ${filter === "correct" ? "border-emerald-300/55 bg-emerald-500/16 text-emerald-50" : "border-slate-600/70 bg-slate-900/68 text-slate-300 hover:border-slate-400"}`}><RadioButtonUncheckedRoundedIcon className="text-[0.82rem]" /><span className="text-[11px] font-semibold">{reviewRecapSummary.correct}</span></button>
            <button type="button" onClick={() => setFilter("wrong")} className={`inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-full border px-3 transition ${filter === "wrong" ? "border-rose-300/55 bg-rose-500/16 text-rose-50" : "border-slate-600/70 bg-slate-900/68 text-slate-300 hover:border-slate-400"}`}><CloseRoundedIcon className="text-[0.82rem]" /><span className="text-[11px] font-semibold">{reviewRecapSummary.wrong}</span></button>
            <button type="button" onClick={() => setFilter("unanswered")} className={`inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-full border px-3 transition ${filter === "unanswered" ? "border-slate-300/55 bg-slate-500/16 text-slate-50" : "border-slate-600/70 bg-slate-900/68 text-slate-300 hover:border-slate-400"}`}><RemoveRoundedIcon className="text-[0.82rem]" /><span className="text-[11px] font-semibold">{reviewRecapSummary.unanswered}</span></button>
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
                    <button key={recap.key} type="button" className={`block w-full cursor-pointer rounded-[22px] border px-4 py-4 text-left transition ${isActive ? "border-transparent bg-amber-400/10 shadow-[0_18px_36px_-30px_rgba(251,191,36,0.62)]" : "border-slate-700/75 bg-slate-950/55 hover:border-slate-500/80"}`} onClick={() => { onSetSelectedRecapKey(recap.key); onJumpToRecapPreview(recap, "click"); }} onDoubleClick={() => { onSetSelectedRecapKey(recap.key); onJumpToRecapPreview(recap, "doubleClick"); }}>
                      <div className="flex items-start gap-3">
                        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-amber-300/45 bg-amber-400/10 text-sm font-black text-amber-100">{recap.order}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[1.05rem] font-black leading-snug text-white">{recap.title}</p>
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            <RoomUiTooltip title={resultMeta[result].label}>
                              <span
                                className={`${REVIEW_BADGE_PILL_CLASS} ${resultMeta[result].badgeClass}`}
                                aria-label={resultMeta[result].label}
                              >
                                {renderResultBadgeContent(result)}
                              </span>
                            </RoomUiTooltip>
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

        <div className="relative min-h-0 overflow-visible rounded-[28px] bg-[linear-gradient(180deg,rgba(9,15,29,0.94),rgba(8,13,24,0.98))] p-4">
          {selectedRecap ? (
            <div
              key={reviewDetailTransitionKey}
              className="relative overflow-visible p-2"
              style={{ animation: "settlementSwapIn 240ms ease-out both" }}
            >
              <div className="relative z-10 flex flex-wrap items-start justify-between gap-5">
                <div className="relative min-w-0 flex-1 pr-2">
                  <div className="pointer-events-none absolute -left-6 -top-6 h-[13.5rem] w-[18.5rem] overflow-hidden rounded-tl-[25px] rounded-br-[6.25rem]">
                    <div
                      className={`absolute -left-[4.75rem] -top-[4.75rem] h-[12rem] w-[17rem] rounded-full opacity-70 blur-[72px] ${scoreVisualTone.statusGlowClass}`}
                    />
                  </div>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                    題目 {selectedRecap.order}
                    {selectedReviewParticipant
                      ? ` ・ ${selectedReviewParticipant.username}`
                      : ""}
                  </p>
                  <button
                    type="button"
                    className={`mt-3 inline-flex max-w-full text-left text-[2rem] font-black leading-tight transition ${selectedRecapLink?.href
                      ? "cursor-pointer text-white underline-offset-4 hover:text-cyan-200 hover:underline"
                      : "cursor-default text-white"}`}
                    onClick={() => {
                      if (selectedRecapLink?.href) onOpenTrackLink(selectedRecapLink, selectedRecap);
                    }}
                    disabled={!selectedRecapLink?.href}
                  >
                    <span className="block" style={multilineEllipsis2Style}>
                      {selectedRecap.title}
                    </span>
                  </button>
                  <p className="mt-2 text-lg text-slate-300">
                    {selectedRecap.uploader || "未知來源"}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-10 pr-3">
                  <div className="flex min-h-[8rem] items-center justify-center">
                    <p className={`text-[6rem] font-black leading-[0.88] ${scoreVisualTone.gradeClass}`}>
                      {selectedRecapRating?.grade ?? "E"}
                    </p>
                  </div>
                  <div className="group/score relative isolate overflow-visible px-2 py-1">
                    <div
                      className={`pointer-events-none absolute -inset-6 rounded-full opacity-65 blur-[34px] transition duration-300 ease-out group-hover/score:opacity-100 ${scoreVisualTone.statusGlowClass}`}
                    />
                    <div
                      className={`relative flex h-32 w-32 items-center justify-center rounded-full transition duration-300 ease-out ${scoreVisualTone.ringGlowClass}`}
                      style={{ background: scoreRingGradient }}
                    >
                      <div className="absolute inset-[6px] rounded-full border border-white/10 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.08),transparent_74%)] opacity-70" />
                      <div className="pointer-events-none absolute inset-[2px] rounded-full bg-[conic-gradient(from_220deg,rgba(255,255,255,0.18),transparent_18%,transparent_72%,rgba(255,255,255,0.12)_86%,transparent)] mix-blend-screen opacity-55" />
                      <div className={`absolute inset-[22px] rounded-full transition duration-300 ease-out ${scoreVisualTone.ringBaseClass} bg-slate-950/100`} />
                      <div className="pointer-events-none absolute inset-[10px] rounded-full border border-cyan-200/0 opacity-0 transition duration-300 ease-out group-hover/score:opacity-100">
                        <div className="absolute inset-0 rounded-full border border-cyan-300/18" />
                      </div>
                      <div className="relative z-10 flex h-[5.7rem] w-[5.7rem] flex-col items-center justify-center rounded-full bg-slate-950/100 transition duration-300 ease-out">
                        <span className="text-[9px] font-semibold tracking-[0.24em] text-slate-400">
                          SCORE
                        </span>
                        <span className={`mt-1 text-[2.1rem] font-black leading-none ${scoreVisualTone.scoreClass}`}>
                          {displayScore}
                        </span>
                        <span className="mt-1 text-[9px] font-semibold tracking-[0.18em] text-slate-500 transition duration-200 group-hover/score:text-cyan-100/70">
                          {scoreRankLabel}
                        </span>
                      </div>
                    </div>
                    <div className="pointer-events-none absolute left-[calc(100%+0.85rem)] top-1/2 z-20 hidden min-w-[12rem] -translate-y-1/2 rounded-[18px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,13,24,0.96),rgba(3,8,18,0.98))] px-3 py-3 shadow-[0_24px_50px_-26px_rgba(15,23,42,0.9)] opacity-0 transition duration-150 group-hover/score:block group-hover/score:opacity-100">
                      <div className="space-y-2.5">
                        {scoreSegments
                          .filter((segment) => segment.max > 0)
                          .map((segment) => (
                            <div key={segment.label} className="flex items-center gap-2.5">
                              <span
                                className="h-2.5 w-2.5 shrink-0 rounded-full opacity-90 shadow-[0_0_12px_-2px_currentColor]"
                                style={{ background: segment.color, color: segment.color }}
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-3 text-[11px] font-semibold text-white">
                                  <span>{segment.label}</span>
                                  <span className="text-slate-300">
                                    {segment.value}/{segment.max}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative z-10 mt-5 p-1">
                <div className="grid gap-4">
                  <div className="grid gap-3 rounded-[18px] border border-white/6 bg-black/18 p-4 xl:grid-cols-[1.2fr_1fr_1fr_1fr_1fr]">
                    <div>
                      <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.16em] text-slate-400"><EmojiEventsRoundedIcon className="text-[1rem] text-amber-200" />全場最快</div>
                      <p className="mt-2 text-sm font-black text-white">{selectedRecapFastestCorrectMeta ? selectedRecapFastestCorrectMeta.username : "--"}</p>
                      <p className="mt-1 text-xs text-slate-300">{selectedRecapFastestCorrectMeta ? formatMs(selectedRecapFastestCorrectMeta.answeredAtMs) : "--"}</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.16em] text-slate-400"><TimerRoundedIcon className="text-[1rem] text-cyan-200" />中位作答</div>
                      <p className="mt-2 text-sm font-black text-white">{typeof medianMs === "number" ? formatMs(medianMs) : "--"}</p>
                    </div>
                    <div>
                      <div className="text-[11px] tracking-[0.16em] text-slate-400">你的作答</div>
                      <div className="mt-2 text-sm font-black text-white">{answeredAtMs !== null ? formatMs(answeredAtMs) : "--"}</div>
                    </div>
                    <div>
                      <div className="text-[11px] tracking-[0.16em] text-slate-400">比中位快慢</div>
                      <div className={`mt-2 text-sm font-black ${speedDeltaMs === null ? "text-white" : speedDeltaMs >= 0 ? "text-emerald-100" : "text-rose-100"}`}>{speedDeltaMs === null ? "--" : `${speedDeltaMs >= 0 ? "+" : "-"}${formatMs(Math.abs(speedDeltaMs))}`}</div>
                    </div>
                    <div>
                      <div className="text-[11px] tracking-[0.16em] text-slate-400">贏過比例</div>
                      <div className="mt-2 text-sm font-black text-white">{beatPercent > 0 ? `${beatPercent}%` : "--"}</div>
                    </div>
                  </div>
                  <div className="group px-1 pt-1">
                    <div className="overflow-hidden rounded-[16px]">
                      <div className="flex h-8 w-full overflow-hidden rounded-[16px]">
                        {(selectedRecap.correctCount ?? 0) > 0 && (
                          <div
                            className="flex items-center justify-center bg-[linear-gradient(90deg,rgba(16,185,129,0.95),rgba(45,212,191,0.95))] px-3 text-sm font-black text-emerald-50"
                            style={{ width: `${globalResultTotal > 0 ? ((selectedRecap.correctCount ?? 0) / globalResultTotal) * 100 : 0}%` }}
                          >
                            <span className="group-hover:hidden">{selectedRecap.correctCount ?? 0}</span>
                            <span className="hidden group-hover:inline">
                              {globalResultTotal > 0 ? clampPercent(((selectedRecap.correctCount ?? 0) / globalResultTotal) * 100) : 0}%
                            </span>
                          </div>
                        )}
                        {(selectedRecap.wrongCount ?? 0) > 0 && (
                          <div
                            className="flex items-center justify-center bg-[linear-gradient(90deg,rgba(244,63,94,0.95),rgba(251,113,133,0.92))] px-3 text-sm font-black text-rose-50"
                            style={{ width: `${globalResultTotal > 0 ? ((selectedRecap.wrongCount ?? 0) / globalResultTotal) * 100 : 0}%` }}
                          >
                            <span className="group-hover:hidden">{selectedRecap.wrongCount ?? 0}</span>
                            <span className="hidden group-hover:inline">
                              {globalResultTotal > 0 ? clampPercent(((selectedRecap.wrongCount ?? 0) / globalResultTotal) * 100) : 0}%
                            </span>
                          </div>
                        )}
                        {(selectedRecap.unansweredCount ?? 0) > 0 && (
                          <div
                            className="flex items-center justify-center bg-[linear-gradient(90deg,rgba(100,116,139,0.92),rgba(148,163,184,0.88))] px-3 text-sm font-black text-slate-100"
                            style={{ width: `${globalResultTotal > 0 ? ((selectedRecap.unansweredCount ?? 0) / globalResultTotal) * 100 : 0}%` }}
                          >
                            <span className="group-hover:hidden">{selectedRecap.unansweredCount ?? 0}</span>
                            <span className="hidden group-hover:inline">
                              {globalResultTotal > 0 ? clampPercent(((selectedRecap.unansweredCount ?? 0) / globalResultTotal) * 100) : 0}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <div className="grid gap-3.5">
                  {selectedRecap.choices.map((choice) => {
                    const isCorrect = choice.index === selectedRecap.correctChoiceIndex;
                    const isMine = selectedRecapAnswer.choiceIndex === choice.index;
                    const pickedCount = countChoiceVotes(selectedRecap, choice.index);
                    const totalAnswers = Math.max(1, Object.keys(selectedRecap.answersByClientId ?? {}).length);
                    const pickedPercent = clampPercent((pickedCount / totalAnswers) * 100);
                    const pickedParticipants = Object.entries(selectedRecap.answersByClientId ?? {})
                      .filter(([, answer]) => answer.choiceIndex === choice.index)
                      .map(([clientId]) => participantByClientId.get(clientId))
                      .filter((participant): participant is RoomParticipant => Boolean(participant));
                    return (
                      <div
                        key={`${selectedRecap.key}-${choice.index}`}
                        className={`relative overflow-visible rounded-[22px] px-5 py-4 ${isCorrect
                          ? "border border-emerald-300/34 bg-[linear-gradient(180deg,rgba(6,42,34,0.7),rgba(4,18,20,0.66))]"
                          : isMine
                            ? "border border-rose-300/30 bg-[linear-gradient(180deg,rgba(64,16,28,0.68),rgba(26,10,18,0.62))]"
                            : "bg-black/18"
                          }`}
                      >
                        {pickedParticipants.length > 0 && (
                          <div className="absolute right-5 top-0 z-10 flex -translate-y-[58%] flex-row-reverse pointer-events-auto">
                            {pickedParticipants.slice(0, 4).map((participant, index) => {
                              const avatarUrl = participant.avatar_url ?? participant.avatarUrl ?? null;
                              return (
                                <RoomUiTooltip
                                  key={`${choice.index}-${participant.clientId}`}
                                  title={participant.username}
                                >
                                  <div
                                    className="relative h-9 w-9 overflow-hidden rounded-full border border-slate-700/38 bg-[radial-gradient(circle_at_30%_28%,rgba(255,255,255,0.1),transparent_42%),linear-gradient(180deg,rgba(24,34,52,0.66),rgba(10,15,28,0.78))] text-white/88 opacity-[0.9] shadow-[0_10px_24px_-14px_rgba(15,23,42,0.9)]"
                                    style={{ marginRight: index === 0 ? 0 : -9 }}
                                    aria-label={participant.username}
                                  >
                                    {avatarUrl ? (
                                      <img
                                        src={avatarUrl}
                                        alt={participant.username}
                                        className="h-full w-full object-cover opacity-[0.88] saturate-[0.9] brightness-[0.98]"
                                      />
                                    ) : (
                                      <div className="flex h-full w-full items-center justify-center bg-transparent text-[10px] font-black text-white/88">
                                        {participant.username.slice(0, 1).toUpperCase()}
                                      </div>
                                    )}
                                  </div>
                                </RoomUiTooltip>
                              );
                            })}
                            {pickedParticipants.length > 4 && (
                              <RoomUiTooltip title={`另外 ${pickedParticipants.length - 4} 位玩家`}>
                                <div className="relative ml-2 flex h-9 min-w-[2.1rem] items-center justify-center rounded-full border border-slate-700/38 bg-[linear-gradient(180deg,rgba(24,34,52,0.66),rgba(10,15,28,0.78))] px-2 text-[9px] font-black text-slate-100/92 opacity-[0.9] shadow-[0_10px_24px_-14px_rgba(15,23,42,0.9)]">
                                  +{pickedParticipants.length - 4}
                                </div>
                              </RoomUiTooltip>
                            )}
                          </div>
                        )}
                        <div className="space-y-3.5">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1 pr-2">
                              <ChoiceMarqueeTitle
                                text={choice.title}
                                className="text-[1.02rem] font-semibold leading-relaxed text-white"
                              />
                            </div>
                            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 self-start">
                              {isCorrect && <span className={`${reviewStatusBadgeBaseClass} h-6 border-emerald-300/45 bg-emerald-400/15 px-2.5 text-[10px] text-emerald-100`}>正確答案</span>}
                              {isMine && <span className={`${reviewStatusBadgeBaseClass} h-6 border-rose-300/45 bg-rose-400/18 px-2.5 text-[10px] text-rose-100`}>你的選擇</span>}
                              <span className="inline-flex h-6 items-center justify-center rounded-full border border-slate-500/65 bg-slate-900/75 px-2.5 text-[10px] font-semibold text-slate-200">{pickedCount} 票</span>
                              <span className="inline-flex h-6 items-center justify-center rounded-full border border-white/10 bg-black/20 px-2.5 text-[10px] font-semibold text-slate-200">{pickedPercent}%</span>
                            </div>
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
