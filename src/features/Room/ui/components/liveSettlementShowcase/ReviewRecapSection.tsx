import React from "react";
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

import type { SettlementTrackLink } from "../../../model/settlementLinks";
import type { RoomParticipant } from "../../../model/types";
import type { SettlementQuestionRecap } from "../GameSettlementPanel";
import type { SongPerformanceGrade } from "../liveSettlementUtils";

type RecapAnswerResult = "correct" | "wrong" | "unanswered";

type SongPerformanceRating = {
  score: number;
  grade: SongPerformanceGrade;
  result: RecapAnswerResult;
  answeredRank: number | null;
  answeredAtMs: number | null;
  correctRate: number;
};

interface RecapAnswerSnapshot {
  choiceIndex: number | null;
  result: RecapAnswerResult;
}

interface ResultTone {
  label: string;
  badgeClass: string;
}

interface GradeMeta {
  badgeClass: string;
  detailClass: string;
}

interface ReviewTheme {
  drawerClass: string;
}

interface ReviewRecapSummary {
  correct: number;
  wrong: number;
  unanswered: number;
}

type ReviewListFilter = "all" | "correct" | "wrong" | "unanswered";

interface ReviewRecapSectionProps {
  isMobileView?: boolean;
  activeCategoryTheme: ReviewTheme;
  reviewRecapSummary: ReviewRecapSummary;
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
  resolveCorrectAnsweredRank: (
    recap: SettlementQuestionRecap,
    participantClientId: string | null,
  ) => number | null;
  resultMeta: Record<RecapAnswerResult, ResultTone>;
  performanceRatingByRecapKey: Map<string, SongPerformanceRating>;
  performanceGradeMeta: Record<SongPerformanceGrade, GradeMeta>;
  personalFastestCorrectRecapKeys: Set<string>;
  reviewStatusBadgeBaseClass: string;
  reviewDetailTransitionKey: string;
  selectedRecapLink: SettlementTrackLink | null;
  onOpenTrackLink: (
    link: SettlementTrackLink,
    recap: SettlementQuestionRecap,
  ) => void;
  selectedRecapAnswer: RecapAnswerSnapshot;
  selectedRecapCorrectRank: number | null;
  isSelectedRecapFastest: boolean;
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
  selectedRecapGradeMeta: GradeMeta | null;
  selectedRecapRatingBreakdown: string;
  multilineEllipsis2Style: React.CSSProperties;
  reviewDoubleClickPlayEnabled: boolean;
  onToggleReviewDoubleClickPlay: () => void;
}

const countChoiceVotes = (recap: SettlementQuestionRecap, choiceIndex: number) => {
  const answers = Object.values(recap.answersByClientId ?? {});
  return answers.filter((answer) => answer.choiceIndex === choiceIndex).length;
};

const clampPercent = (value: number) => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
};

const resultIconMap: Record<RecapAnswerResult, React.ElementType> = {
  correct: RadioButtonUncheckedRoundedIcon,
  wrong: CloseRoundedIcon,
  unanswered: RemoveRoundedIcon,
};

const HoverMarqueeText: React.FC<{ text: string; className?: string }> = ({
  text,
  className = "",
}) => {
  const wrapRef = React.useRef<HTMLSpanElement | null>(null);
  const trackRef = React.useRef<HTMLSpanElement | null>(null);
  const [canMarquee, setCanMarquee] = React.useState(false);
  const [style, setStyle] = React.useState<React.CSSProperties>({});
  const [hovered, setHovered] = React.useState(false);

  React.useEffect(() => {
    const wrap = wrapRef.current;
    const track = trackRef.current;
    if (!wrap || !track) return;

    const measure = () => {
      const overflow = track.scrollWidth - wrap.clientWidth;
      if (overflow > 10) {
        setCanMarquee(true);
        setStyle({
          ["--settlement-title-shift" as const]: `${-(overflow + 18)}px`,
          ["--settlement-title-duration" as const]: `${Math.min(
            10.5,
            Math.max(4, overflow / 48),
          ).toFixed(2)}s`,
        } as React.CSSProperties);
      } else {
        setCanMarquee(false);
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
      className={`game-settlement-title-marquee block overflow-hidden ${className}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={text}
    >
      <span
        ref={trackRef}
        className={`game-settlement-title-marquee-track ${
          canMarquee && hovered ? "game-settlement-title-marquee-track--run" : ""
        }`}
        style={style}
      >
        {text}
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
  selectedRecapCorrectRank,
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
  const [reviewListFilter, setReviewListFilter] = React.useState<ReviewListFilter>("all");
  const totalAnswers = selectedRecap
    ? Math.max(1, Object.keys(selectedRecap.answersByClientId ?? {}).length)
    : 1;
  const correctRatePercent = selectedRecapRating
    ? clampPercent(selectedRecapRating.correctRate * 100)
    : 0;
  const fastestDeltaRatio =
    selectedRecapFastestCorrectMeta &&
    selectedRecapAverageCorrectMs &&
    selectedRecapAverageCorrectMs > 0
      ? clampPercent(
          (selectedRecapFastestCorrectMeta.answeredAtMs / selectedRecapAverageCorrectMs) * 100,
        )
          : 0;
  const answeredAtMs =
    selectedRecapRating?.answeredAtMs !== null && selectedRecapRating?.answeredAtMs !== undefined
      ? selectedRecapRating.answeredAtMs
      : null;
  const speedLeadMs =
    answeredAtMs !== null &&
    selectedRecapAverageCorrectMs !== null &&
    selectedRecapAverageCorrectMs !== undefined
      ? Math.max(0, selectedRecapAverageCorrectMs - answeredAtMs)
      : null;
  const speedLeadPercent =
    answeredAtMs !== null &&
    selectedRecapAverageCorrectMs !== null &&
    selectedRecapAverageCorrectMs !== undefined &&
    selectedRecapAverageCorrectMs > 0
      ? clampPercent(
          ((selectedRecapAverageCorrectMs - answeredAtMs) / selectedRecapAverageCorrectMs) * 100,
        )
      : 0;
  const filteredReviewRecaps = React.useMemo(() => {
    if (reviewListFilter === "all") return reviewRecaps;

    return reviewRecaps.filter((recap) => {
      const result = resolveParticipantResult(
        recap,
        effectiveSelectedReviewParticipantClientId,
        meClientId,
      );
      if (reviewListFilter === "correct") return result === "correct";
      if (reviewListFilter === "wrong") return result === "wrong";
      return result === "unanswered";
    });
  }, [
    reviewListFilter,
    reviewRecaps,
    resolveParticipantResult,
    effectiveSelectedReviewParticipantClientId,
    meClientId,
  ]);

  return (
    <section className={`mt-4 rounded-[30px] border p-4 transition-colors duration-300 ${activeCategoryTheme.drawerClass}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <HistoryRoundedIcon className="text-amber-100" />
          <h3 className="text-[2rem] font-black tracking-tight text-white">題目回顧</h3>
        </div>
        <button
          type="button"
          onClick={onToggleReviewDoubleClickPlay}
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition ${
            reviewDoubleClickPlayEnabled
              ? "border-cyan-300/45 bg-cyan-400/12 text-cyan-50 hover:border-cyan-200/60"
              : "border-slate-600/70 bg-slate-900/68 text-slate-300 hover:border-slate-400"
          }`}
        >
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-current/30 text-[10px]">
            2x
          </span>
          <span>雙擊播放 {reviewDoubleClickPlayEnabled ? "ON" : "OFF"}</span>
        </button>
      </div>

      {sortedParticipants.length > 0 && (
        <div className="mt-4 overflow-x-auto pb-1">
          <div className="inline-flex min-w-max items-center gap-2">
            {sortedParticipants.map((participant, index) => {
              const isActive =
                participant.clientId === effectiveSelectedReviewParticipantClientId;
              const isMe = participant.clientId === meClientId;

              return (
                <button
                  key={`review-participant-${participant.clientId}`}
                  type="button"
                  onClick={() => onSelectReviewParticipantClientId(participant.clientId)}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition ${
                    isActive
                      ? "border-sky-300/55 bg-sky-500/16 text-sky-50"
                      : "border-slate-600/70 bg-slate-900/68 text-slate-300 hover:border-slate-400"
                  }`}
                >
                  <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full border border-current/35 px-1 text-[10px] leading-none">
                    {index + 1}
                  </span>
                  <span className="max-w-[9rem] truncate">
                    {participant.username}
                    {isMe ? "（你）" : ""}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div
        className={`mt-4 grid gap-4 ${
          isMobileView
            ? "grid-cols-1"
            : "items-start lg:grid-cols-[272px_minmax(0,1fr)] xl:grid-cols-[286px_minmax(0,1fr)]"
        }`}
      >
        <div className="flex min-h-0 flex-col lg:sticky lg:top-4 lg:self-start">
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              title="全部"
              onClick={() => setReviewListFilter("all")}
              className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-full border px-2.5 transition ${
                reviewListFilter === "all"
                  ? "border-sky-300/55 bg-sky-500/16 text-sky-50"
                  : "border-slate-600/70 bg-slate-900/68 text-slate-300 hover:border-slate-400"
              }`}
            >
              <AppsRoundedIcon className="text-[0.9rem]" />
              <span className="text-[10px] font-semibold">全部</span>
            </button>
            <button
              type="button"
              title="答對"
              onClick={() => setReviewListFilter("correct")}
              className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-full border px-2.5 transition ${
                reviewListFilter === "correct"
                  ? "border-emerald-300/55 bg-emerald-500/16 text-emerald-50"
                  : "border-slate-600/70 bg-slate-900/68 text-slate-300 hover:border-slate-400"
              }`}
            >
              <RadioButtonUncheckedRoundedIcon className="text-[0.78rem]" />
              <span className="text-[10px] font-semibold">{reviewRecapSummary.correct}</span>
            </button>
            <button
              type="button"
              title="答錯"
              onClick={() => setReviewListFilter("wrong")}
              className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-full border px-2.5 transition ${
                reviewListFilter === "wrong"
                  ? "border-rose-300/55 bg-rose-500/16 text-rose-50"
                  : "border-slate-600/70 bg-slate-900/68 text-slate-300 hover:border-slate-400"
              }`}
            >
              <CloseRoundedIcon className="text-[0.78rem]" />
              <span className="text-[10px] font-semibold">{reviewRecapSummary.wrong}</span>
            </button>
            <button
              type="button"
              title="未作答"
              onClick={() => setReviewListFilter("unanswered")}
              className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-full border px-2.5 transition ${
                reviewListFilter === "unanswered"
                  ? "border-slate-300/55 bg-slate-500/16 text-slate-50"
                  : "border-slate-600/70 bg-slate-900/68 text-slate-300 hover:border-slate-400"
              }`}
            >
              <RemoveRoundedIcon className="text-[0.78rem]" />
              <span className="text-[10px] font-semibold">{reviewRecapSummary.unanswered}</span>
            </button>
          </div>

          <div
            key={`review-list-${reviewContextTransitionKey}`}
            className={`game-settlement-review-list ${
              isMobileView
                ? "h-[clamp(280px,42vh,380px)]"
                : "min-h-0 lg:h-[min(880px,calc(100vh-14rem))] xl:h-[min(920px,calc(100vh-13rem))]"
            } overflow-hidden`}
            style={{ animation: "settlementSwapIn 220ms ease-out both" }}
          >
            {filteredReviewRecaps.length === 0 ? (
              <div className="flex h-full items-center justify-center rounded-[22px] border border-dashed border-slate-700/70 bg-slate-950/55 px-4 text-sm text-slate-400">
                目前沒有符合條件的題目。
              </div>
            ) : (
              <div className="h-full overflow-y-auto pr-1.5">
                <div className="space-y-3">
                  {filteredReviewRecaps.map((recap) => {
                  const result = resolveParticipantResult(
                    recap,
                    effectiveSelectedReviewParticipantClientId,
                    meClientId,
                  );
                  const tone = resultMeta[result];
                  const ResultIcon = resultIconMap[result];
                  const recapRating = performanceRatingByRecapKey.get(recap.key) ?? null;
                  const recapGradeMeta = recapRating
                    ? performanceGradeMeta[recapRating.grade]
                    : null;
                  const isActive = selectedRecapKey === recap.key;

                  return (
                    <button
                      key={recap.key}
                      type="button"
                      className={`block w-full rounded-[22px] border px-4 py-4 text-left transition ${
                        isActive
                          ? "border-amber-300/55 bg-amber-400/10 shadow-[0_18px_36px_-30px_rgba(251,191,36,0.62)]"
                          : "border-slate-700/75 bg-slate-950/55 hover:border-slate-500/80"
                      }`}
                      onClick={() => {
                        onSetSelectedRecapKey(recap.key);
                        onJumpToRecapPreview(recap, "click");
                      }}
                      onDoubleClick={() => {
                        onSetSelectedRecapKey(recap.key);
                        onJumpToRecapPreview(recap, "doubleClick");
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-amber-300/45 bg-amber-400/10 text-sm font-black text-amber-100">
                          {recap.order}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[1.05rem] font-black leading-snug text-white">
                            {recap.title}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            <span
                              className={`inline-flex h-7 min-w-[2.5rem] items-center justify-center rounded-full border px-3 text-[10px] font-semibold ${tone.badgeClass}`}
                            >
                              <ResultIcon className="text-[0.62rem]" />
                            </span>
                            {recapRating && recapGradeMeta && (
                              <span
                                className={`inline-flex h-7 items-center justify-center rounded-full border px-3 text-xs font-semibold ${recapGradeMeta.badgeClass}`}
                              >
                                評分 {recapRating.grade}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="h-full min-h-0 rounded-[28px] bg-[linear-gradient(180deg,rgba(9,15,29,0.94),rgba(8,13,24,0.98))] p-3 md:p-4">
          {selectedRecap ? (
            <div
              key={reviewDetailTransitionKey}
              style={{ animation: "settlementSwapIn 240ms ease-out both" }}
            >
              <div className="grid w-full gap-3">
                <div className="min-w-0 rounded-[24px] border border-slate-700/70 bg-slate-950/50 p-4">
                  <div className="grid gap-3 2xl:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                        第 {selectedRecap.order} 題
                        {selectedReviewParticipant ? ` ・ ${selectedReviewParticipant.username}` : ""}
                      </p>
                      <button
                        type="button"
                        className={`mt-3 w-full text-left text-[2rem] font-black leading-tight transition ${
                          selectedRecapLink?.href
                            ? "text-white underline-offset-4 hover:text-cyan-200 hover:underline"
                            : "cursor-default text-white"
                        }`}
                        onClick={() => {
                          if (!selectedRecapLink?.href) return;
                          onOpenTrackLink(selectedRecapLink, selectedRecap);
                        }}
                        disabled={!selectedRecapLink?.href}
                      >
                        <span className="block" style={multilineEllipsis2Style}>
                          {selectedRecap.title}
                        </span>
                      </button>
                      <p className="mt-2 text-lg text-slate-300">
                        {selectedRecap.uploader || "未知作者"}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <span
                          className={`${reviewStatusBadgeBaseClass} ${
                            resultMeta[selectedRecapAnswer.result].badgeClass
                          }`}
                        >
                          {React.createElement(resultIconMap[selectedRecapAnswer.result], {
                            className: "text-[0.9rem]",
                          })}
                        </span>
                        {selectedRecapRating && selectedRecapGradeMeta && (
                          <span
                            className={`inline-flex h-7 items-center justify-center rounded-full border px-3 text-xs font-semibold ${selectedRecapGradeMeta.badgeClass}`}
                          >
                            評分 {selectedRecapRating.grade}
                          </span>
                        )}
                        {selectedRecapCorrectRank !== null && (
                          <span className="inline-flex h-7 items-center justify-center rounded-full border border-sky-300/45 bg-sky-500/16 px-3 text-xs font-semibold text-sky-100">
                            第 {selectedRecapCorrectRank} 位答對
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-cyan-300/32 bg-[radial-gradient(circle_at_72%_12%,rgba(56,189,248,0.18),transparent_34%),linear-gradient(180deg,rgba(22,52,73,0.82),rgba(9,22,38,0.94))] p-4 text-left">
                      <p className="text-sm font-semibold text-slate-200">本題評分</p>
                      <div className="mt-4 flex items-center gap-3">
                        {selectedRecapRating && selectedRecapGradeMeta ? (
                          <>
                            <span
                              className={`inline-flex h-12 min-w-[3.25rem] items-center justify-center rounded-full border text-[1.7rem] font-black ${selectedRecapGradeMeta.badgeClass}`}
                            >
                              {selectedRecapRating.grade}
                            </span>
                            <span className="text-[3.6rem] font-black leading-none text-white">
                              {selectedRecapRating.score}
                            </span>
                          </>
                        ) : (
                          <span className="text-3xl font-black text-white">--</span>
                        )}
                      </div>
                      <div className="mt-4 grid gap-2">
                        <div className="flex items-center gap-2 rounded-[14px] bg-black/16 px-3 py-2 text-sm font-semibold text-slate-100">
                          <BoltRoundedIcon className="text-[1rem] text-cyan-200" />
                          <span>{selectedRecapCorrectRank !== null ? `第 ${selectedRecapCorrectRank} 答` : "未答對"}</span>
                        </div>
                        <div className="flex items-center gap-2 rounded-[14px] bg-black/16 px-3 py-2 text-sm font-semibold text-slate-100">
                          <SpeedRoundedIcon className="text-[1rem] text-cyan-200" />
                          <span>
                            {selectedRecapRating?.answeredAtMs !== null &&
                            selectedRecapRating?.answeredAtMs !== undefined
                              ? formatMs(selectedRecapRating.answeredAtMs)
                              : "--"}
                          </span>
                        </div>
                      </div>
                      <div className="mt-4 space-y-3">
                        <div>
                          <div className="flex items-center justify-between gap-2 text-[11px] text-slate-300">
                            <span className="inline-flex items-center gap-1">
                              <QueryStatsRoundedIcon className="text-[0.9rem]" />
                              答對率
                            </span>
                            <span>{Math.round(correctRatePercent)}%</span>
                          </div>
                          <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-black/25">
                            <div
                              className="h-full rounded-full bg-[linear-gradient(90deg,rgba(16,185,129,0.95),rgba(45,212,191,0.95))]"
                              style={{ width: `${correctRatePercent}%` }}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between gap-2 text-[11px] text-slate-300">
                            <span className="inline-flex items-center gap-1">
                              <SpeedRoundedIcon className="text-[0.9rem]" />
                              最快 / 平均
                            </span>
                            <span>{fastestDeltaRatio ? `${Math.round(fastestDeltaRatio)}%` : "--"}</span>
                          </div>
                          <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-black/25">
                            <div
                              className="h-full rounded-full bg-[linear-gradient(90deg,rgba(56,189,248,0.95),rgba(99,102,241,0.95))]"
                              style={{ width: `${fastestDeltaRatio}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 xl:grid-cols-4">
                    <div className="rounded-[20px] border border-slate-700/70 bg-[linear-gradient(180deg,rgba(14,22,38,0.92),rgba(10,16,28,0.98))] p-4">
                      <p className="inline-flex items-center gap-1 text-[11px] tracking-[0.16em] text-slate-400">
                        <BoltRoundedIcon className="text-[0.9rem] text-amber-200" />
                        全場最快
                      </p>
                      <p className="mt-3 text-lg font-black leading-snug text-white">
                        {selectedRecapFastestCorrectMeta
                          ? selectedRecapFastestCorrectMeta.username
                          : "--"}
                      </p>
                      <p className="mt-1 text-2xl font-black text-amber-50">
                        {selectedRecapFastestCorrectMeta
                          ? formatMs(selectedRecapFastestCorrectMeta.answeredAtMs)
                          : "--"}
                      </p>
                    </div>
                    <div className="rounded-[20px] border border-slate-700/70 bg-[linear-gradient(180deg,rgba(12,24,40,0.92),rgba(8,16,29,0.98))] p-4">
                      <p className="inline-flex items-center gap-1 text-[11px] tracking-[0.16em] text-slate-400">
                        <TimerRoundedIcon className="text-[0.9rem] text-cyan-200" />
                        平均答對
                      </p>
                      <p className="mt-3 text-2xl font-black text-white">
                        {formatMs(selectedRecapAverageCorrectMs)}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-300">全場平均速度</p>
                    </div>
                    <div className="rounded-[20px] border border-slate-700/70 bg-[linear-gradient(180deg,rgba(14,22,38,0.92),rgba(10,16,28,0.98))] p-4">
                      <p className="inline-flex items-center gap-1 text-[11px] tracking-[0.16em] text-slate-400">
                        <SpeedRoundedIcon className="text-[0.9rem] text-sky-200" />
                        作答節奏
                      </p>
                      <p className="mt-3 text-2xl font-black text-white">
                        {answeredAtMs !== null ? formatMs(answeredAtMs) : "--"}
                      </p>
                      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-black/25">
                        <div
                          className="h-full rounded-full bg-[linear-gradient(90deg,rgba(56,189,248,0.95),rgba(99,102,241,0.95))]"
                          style={{ width: `${fastestDeltaRatio}%` }}
                        />
                      </div>
                      <p className="mt-2 text-xs font-semibold text-slate-300">
                        {speedLeadMs !== null ? `快於平均 ${formatMs(speedLeadMs)}` : "尚無比較資料"}
                      </p>
                    </div>
                    <div className="rounded-[20px] border border-slate-700/70 bg-[linear-gradient(180deg,rgba(18,20,40,0.92),rgba(10,12,26,0.98))] p-4">
                      <p className="inline-flex items-center gap-1 text-[11px] tracking-[0.16em] text-slate-400">
                        <InsightsRoundedIcon className="text-[0.9rem] text-violet-200" />
                        評分拆解
                      </p>
                      <p className="mt-3 text-2xl font-black text-white">
                        {speedLeadPercent ? `${Math.round(speedLeadPercent)}%` : "--"}
                      </p>
                      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-black/25">
                        <div
                          className="h-full rounded-full bg-[linear-gradient(90deg,rgba(139,92,246,0.95),rgba(217,70,239,0.92))]"
                          style={{ width: `${speedLeadPercent}%` }}
                        />
                      </div>
                      <p className="mt-2 line-clamp-2 text-xs font-semibold leading-relaxed text-slate-300">
                        {selectedRecapRatingBreakdown || "尚無評分說明"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-[24px] bg-slate-950/45 p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">選項分布</p>
                <p className="mt-2 text-sm text-slate-400">
                  過長選項預設顯示省略號，滑過去才會展開完整文字。
                </p>

                <div className="mt-4 grid gap-3.5">
                  {selectedRecap.choices.map((choice) => {
                    const isCorrect = choice.index === selectedRecap.correctChoiceIndex;
                    const isMine = selectedRecapAnswer.choiceIndex === choice.index;
                    const pickedCount = countChoiceVotes(selectedRecap, choice.index);
                    const pickedPercent = clampPercent((pickedCount / totalAnswers) * 100);

                    return (
                      <div
                        key={`${selectedRecap.key}-${choice.index}`}
                        className={`overflow-hidden rounded-[22px] border px-5 py-4.5 ${
                          isCorrect
                            ? "border-emerald-300/42 bg-emerald-500/10"
                            : isMine
                              ? "border-sky-300/38 bg-sky-500/10"
                              : "border-slate-700/70 bg-slate-900/55"
                        }`}
                      >
                        <div className="space-y-3.5">
                          <div className="min-w-0 text-left">
                            <div className="min-w-0">
                              <HoverMarqueeText
                                text={choice.title}
                                className="max-w-full text-[1.02rem] font-semibold leading-relaxed text-white"
                              />
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              {isCorrect && (
                                <span
                                  className={`${reviewStatusBadgeBaseClass} h-6 border-emerald-300/45 bg-emerald-400/15 px-2.5 text-[10px] text-emerald-100`}
                                >
                                  正確答案
                                </span>
                              )}
                              {isMine && (
                                <span
                                  className={`${reviewStatusBadgeBaseClass} h-6 border-sky-300/45 bg-sky-400/15 px-2.5 text-[10px] text-sky-100`}
                                >
                                  玩家選擇
                                </span>
                              )}
                              <span className="inline-flex h-6 items-center justify-center rounded-full border border-slate-500/65 bg-slate-900/75 px-2.5 text-[10px] font-semibold text-slate-200">
                                {pickedCount} 人作答
                              </span>
                              <span className="inline-flex h-6 items-center justify-center rounded-full border border-white/10 bg-black/20 px-2.5 text-[10px] font-semibold text-slate-200">
                                {Math.round(pickedPercent)}%
                              </span>
                            </div>
                          </div>
                          <div className="h-3 w-full overflow-hidden rounded-full bg-black/25">
                            <div
                              className={`h-full rounded-full ${
                                isCorrect
                                  ? "bg-[linear-gradient(90deg,rgba(16,185,129,0.95),rgba(45,212,191,0.95))]"
                                  : isMine
                                    ? "bg-[linear-gradient(90deg,rgba(56,189,248,0.95),rgba(96,165,250,0.95))]"
                                    : "bg-[linear-gradient(90deg,rgba(100,116,139,0.9),rgba(148,163,184,0.85))]"
                              }`}
                              style={{ width: `${pickedPercent}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[240px] items-center justify-center rounded-[24px] border border-dashed border-slate-700/70 bg-slate-950/55 px-4 text-sm text-slate-400">
              請先從左側題目清單選擇一題查看詳情。
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default ReviewRecapSection;
