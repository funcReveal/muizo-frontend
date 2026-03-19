import React from "react";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";

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
}

const countChoiceVotes = (recap: SettlementQuestionRecap, choiceIndex: number) => {
  const answers = Object.values(recap.answersByClientId ?? {});
  return answers.filter((answer) => answer.choiceIndex === choiceIndex).length;
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
}) => {
  return (
    <section className={`mt-4 rounded-[30px] border p-4 transition-colors duration-300 ${activeCategoryTheme.drawerClass}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <HistoryRoundedIcon className="text-amber-100" />
          <h3 className="text-[2rem] font-black tracking-tight text-white">題目回顧</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <span className="rounded-full border border-emerald-300/45 bg-emerald-400/10 px-3 py-1 text-emerald-100">
            答對 {reviewRecapSummary.correct}
          </span>
          <span className="rounded-full border border-rose-300/45 bg-rose-400/10 px-3 py-1 text-rose-100">
            答錯 {reviewRecapSummary.wrong}
          </span>
          <span className="rounded-full border border-slate-400/55 bg-slate-700/55 px-3 py-1 text-slate-100">
            未作答 {reviewRecapSummary.unanswered}
          </span>
        </div>
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
            : "lg:grid-cols-[290px_minmax(0,1fr)] xl:grid-cols-[310px_minmax(0,1fr)]"
        }`}
      >
        <div
          key={`review-list-${reviewContextTransitionKey}`}
          className={`${isMobileView ? "h-[clamp(280px,42vh,380px)]" : "min-h-[720px]"} min-h-0`}
          style={{ animation: "settlementSwapIn 220ms ease-out both" }}
        >
          {reviewRecaps.length === 0 ? (
            <div className="flex h-full items-center justify-center rounded-[22px] border border-dashed border-slate-700/70 bg-slate-950/55 px-4 text-sm text-slate-400">
              目前沒有可顯示的題目回顧。
            </div>
          ) : (
            <div className="h-full overflow-y-auto pr-1">
              <div className="space-y-3">
                {reviewRecaps.map((recap) => {
                  const result = resolveParticipantResult(
                    recap,
                    effectiveSelectedReviewParticipantClientId,
                    meClientId,
                  );
                  const tone = resultMeta[result];
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
                            <span className={`${reviewStatusBadgeBaseClass} ${tone.badgeClass}`}>
                              {tone.label}
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

        <div className="min-h-[720px] rounded-[28px] bg-[linear-gradient(180deg,rgba(9,15,29,0.94),rgba(8,13,24,0.98))] p-4">
          {selectedRecap ? (
            <div
              key={reviewDetailTransitionKey}
              style={{ animation: "settlementSwapIn 240ms ease-out both" }}
            >
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_280px]">
                <div className="min-w-0 rounded-[24px] border border-slate-700/70 bg-slate-950/50 p-4">
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
                      {resultMeta[selectedRecapAnswer.result].label}
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

                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    <div className="rounded-[20px] border border-slate-700/70 bg-slate-900/62 p-4">
                      <p className="text-xs tracking-[0.18em] text-slate-400">答題摘要</p>
                      <div className="mt-3 space-y-2 text-lg font-semibold text-white">
                        <p>
                          全場最快{" "}
                          {selectedRecapFastestCorrectMeta
                            ? `${selectedRecapFastestCorrectMeta.username} ${formatMs(
                                selectedRecapFastestCorrectMeta.answeredAtMs,
                              )}`
                            : "--"}
                        </p>
                        <p>平均答對 {formatMs(selectedRecapAverageCorrectMs)}</p>
                      </div>
                    </div>
                    <div className="rounded-[20px] border border-slate-700/70 bg-slate-900/62 p-4">
                      <p className="text-xs tracking-[0.18em] text-slate-400">評分拆解</p>
                      <div className="mt-3 space-y-2 text-lg font-semibold text-white">
                        <p>
                          第 1 答・作答{" "}
                          {selectedRecapRating?.answeredAtMs !== null &&
                          selectedRecapRating?.answeredAtMs !== undefined
                            ? formatMs(selectedRecapRating.answeredAtMs)
                            : "--"}
                        </p>
                        <p>{selectedRecapRatingBreakdown || "尚無評分說明"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[24px] border border-cyan-300/32 bg-[radial-gradient(circle_at_72%_12%,rgba(56,189,248,0.18),transparent_34%),linear-gradient(180deg,rgba(22,52,73,0.82),rgba(9,22,38,0.94))] p-5 text-left">
                  <p className="text-sm font-semibold text-slate-200">本題評分</p>
                  <div className="mt-5 flex items-center gap-4">
                    {selectedRecapRating && selectedRecapGradeMeta ? (
                      <>
                        <span
                          className={`inline-flex h-14 min-w-[3.5rem] items-center justify-center rounded-full border text-2xl font-black ${selectedRecapGradeMeta.badgeClass}`}
                        >
                          {selectedRecapRating.grade}
                        </span>
                        <span className="text-[4.2rem] font-black leading-none text-white">
                          {selectedRecapRating.score}
                        </span>
                      </>
                    ) : (
                      <span className="text-3xl font-black text-white">--</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-[24px] bg-slate-950/45 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">選項分布</p>
                <p className="mt-2 text-sm text-slate-400">
                  過長選項預設顯示省略號，滑過去才會展開完整文字。
                </p>

                <div className="mt-4 grid gap-3">
                  {selectedRecap.choices.map((choice) => {
                    const isCorrect = choice.index === selectedRecap.correctChoiceIndex;
                    const isMine = selectedRecapAnswer.choiceIndex === choice.index;
                    const pickedCount = countChoiceVotes(selectedRecap, choice.index);

                    return (
                      <div
                        key={`${selectedRecap.key}-${choice.index}`}
                        className={`rounded-[22px] border px-4 py-4 ${
                          isCorrect
                            ? "border-emerald-300/42 bg-emerald-500/10"
                            : isMine
                              ? "border-sky-300/38 bg-sky-500/10"
                              : "border-slate-700/70 bg-slate-900/55"
                        }`}
                      >
                        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                          <div className="min-w-0 text-left">
                            <HoverMarqueeText
                              text={choice.title}
                              className="text-lg font-semibold leading-relaxed text-white"
                            />
                          </div>
                          <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
                            {isCorrect && (
                              <span
                                className={`${reviewStatusBadgeBaseClass} border-emerald-300/45 bg-emerald-400/15 text-emerald-100`}
                              >
                                正確答案
                              </span>
                            )}
                            {isMine && (
                              <span
                                className={`${reviewStatusBadgeBaseClass} border-sky-300/45 bg-sky-400/15 text-sky-100`}
                              >
                                玩家選擇
                              </span>
                            )}
                            <span className="inline-flex h-7 items-center justify-center rounded-full border border-slate-500/65 bg-slate-900/75 px-3 text-xs font-semibold text-slate-200">
                              {pickedCount} 人作答
                            </span>
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
