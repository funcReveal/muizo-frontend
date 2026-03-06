import React from "react";
import LocalFireDepartmentRoundedIcon from "@mui/icons-material/LocalFireDepartmentRounded";

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
  activeCategoryTheme: ReviewTheme;
  reviewRecapSummary: ReviewRecapSummary;
  sortedParticipants: RoomParticipant[];
  meClientId?: string;
  effectiveSelectedReviewParticipantClientId: string | null;
  selectedReviewParticipant: RoomParticipant | null;
  selectedReviewParticipantRank: number;
  onGoPrevReviewParticipant: () => void;
  onGoNextReviewParticipant: () => void;
  safeReviewPage: number;
  reviewPageCount: number;
  onSetReviewPage: React.Dispatch<React.SetStateAction<number>>;
  onSelectReviewParticipantClientId: (clientId: string | null) => void;
  reviewContextTransitionKey: string;
  pagedRecaps: SettlementQuestionRecap[];
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
  isParticipantGlobalFastestCorrect: (
    recap: SettlementQuestionRecap,
    rating: SongPerformanceRating | null | undefined,
  ) => boolean;
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
  selectedRecapFastestBadgeText: string;
  selectedRecapAverageCorrectMs: number | null;
  formatMs: (value: number | null | undefined) => string;
  selectedRecapRating: SongPerformanceRating | null;
  selectedRecapGradeMeta: GradeMeta | null;
  selectedRecapRatingBreakdown: string;
  normalizedRecapCount: number;
  recapsPerPage: number;
  multilineEllipsis2Style: React.CSSProperties;
}

const ReviewRecapSection: React.FC<ReviewRecapSectionProps> = ({
  activeCategoryTheme,
  reviewRecapSummary,
  sortedParticipants,
  meClientId,
  effectiveSelectedReviewParticipantClientId,
  selectedReviewParticipant,
  selectedReviewParticipantRank,
  onGoPrevReviewParticipant,
  onGoNextReviewParticipant,
  safeReviewPage,
  reviewPageCount,
  onSetReviewPage,
  onSelectReviewParticipantClientId,
  reviewContextTransitionKey,
  pagedRecaps,
  selectedRecap,
  selectedRecapKey,
  onSetSelectedRecapKey,
  onJumpToRecapPreview,
  resolveParticipantResult,
  resolveCorrectAnsweredRank,
  resultMeta,
  performanceRatingByRecapKey,
  performanceGradeMeta,
  personalFastestCorrectRecapKeys,
  isParticipantGlobalFastestCorrect,
  reviewStatusBadgeBaseClass,
  reviewDetailTransitionKey,
  selectedRecapLink,
  onOpenTrackLink,
  selectedRecapAnswer,
  selectedRecapCorrectRank,
  isSelectedRecapFastest,
  selectedRecapFastestBadgeText,
  selectedRecapAverageCorrectMs,
  formatMs,
  selectedRecapRating,
  selectedRecapGradeMeta,
  selectedRecapRatingBreakdown,
  normalizedRecapCount,
  recapsPerPage,
  multilineEllipsis2Style,
}) => {
  return (
    <section
      className={`mt-4 rounded-2xl border p-4 transition-colors duration-300 ${activeCategoryTheme.drawerClass}`}
      style={{
        animation: "settlementStageEnter 220ms ease-out both",
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full border border-emerald-300/45 bg-emerald-400/10 px-2 py-0.5 font-semibold text-emerald-100">
            答對 {reviewRecapSummary.correct}
          </span>
          <span className="rounded-full border border-rose-300/45 bg-rose-400/10 px-2 py-0.5 font-semibold text-rose-100">
            答錯 {reviewRecapSummary.wrong}
          </span>
          <span className="rounded-full border border-slate-400/55 bg-slate-700/55 px-2 py-0.5 font-semibold text-slate-100">
            未作答 {reviewRecapSummary.unanswered}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
          <div className="flex items-center gap-1 rounded-full border border-sky-300/35 bg-sky-500/10 px-2 py-1">
            <button
              type="button"
              className="rounded-full border border-slate-600/70 bg-slate-900/65 px-2 py-1 transition hover:border-slate-400 disabled:opacity-40"
              onClick={onGoPrevReviewParticipant}
              disabled={sortedParticipants.length <= 1}
            >
              上一位
            </button>
            <span
              key={`review-participant-${effectiveSelectedReviewParticipantClientId ?? "none"}`}
              className="max-w-[200px] truncate px-1 text-[11px] font-semibold text-sky-100"
              style={{
                animation: "settlementSwapIn 200ms ease-out both",
              }}
            >
              {selectedReviewParticipant
                ? `#${selectedReviewParticipantRank} ${selectedReviewParticipant.username}${
                    meClientId &&
                    selectedReviewParticipant.clientId === meClientId
                      ? "（你）"
                      : ""
                  }`
                : "尚未選擇玩家"}
            </span>
            <button
              type="button"
              className="rounded-full border border-slate-600/70 bg-slate-900/65 px-2 py-1 transition hover:border-slate-400 disabled:opacity-40"
              onClick={onGoNextReviewParticipant}
              disabled={sortedParticipants.length <= 1}
            >
              下一位
            </button>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              className="rounded-full border border-slate-600/70 bg-slate-900/65 px-2 py-1 transition hover:border-slate-400 disabled:opacity-40"
              onClick={() => onSetReviewPage((prev) => Math.max(0, prev - 1))}
              disabled={safeReviewPage <= 0}
            >
              上一頁
            </button>
            <span>
              {safeReviewPage + 1}/{reviewPageCount}
            </span>
            <button
              type="button"
              className="rounded-full border border-slate-600/70 bg-slate-900/65 px-2 py-1 transition hover:border-slate-400 disabled:opacity-40"
              onClick={() =>
                onSetReviewPage((prev) => Math.min(reviewPageCount - 1, prev + 1))
              }
              disabled={safeReviewPage >= reviewPageCount - 1}
            >
              下一頁
            </button>
          </div>
        </div>
      </div>
      {sortedParticipants.length > 0 && (
        <div className="mt-2 overflow-x-auto pb-1">
          <div className="inline-flex min-w-max items-center gap-2 rounded-xl border border-slate-700/70 bg-slate-950/60 px-2 py-1.5">
            {sortedParticipants.map((participant, index) => {
              const isActive =
                participant.clientId === effectiveSelectedReviewParticipantClientId;
              const isMe = participant.clientId === meClientId;
              return (
                <button
                  key={`review-chip-${participant.clientId}`}
                  type="button"
                  onClick={() => onSelectReviewParticipantClientId(participant.clientId)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] font-semibold transition ${
                    isActive
                      ? "border-sky-300/60 bg-sky-500/18 text-sky-50"
                      : "border-slate-600/70 bg-slate-900/70 text-slate-200 hover:border-slate-400"
                  }`}
                >
                  <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full border border-current/40 px-1 text-[10px] leading-none">
                    {index + 1}
                  </span>
                  <span className="max-w-[120px] truncate">
                    {participant.username}
                    {isMe ? "（你）" : ""}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
      <p className="mt-2 text-[11px] text-slate-400">
        提示：雙擊題目可切換到試聽區（上方控制列可切換雙擊播放）。
      </p>

      <div className="mt-3 grid gap-3 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]">
        <div
          key={`review-list-${reviewContextTransitionKey}`}
          className="max-h-[500px] space-y-2 overflow-y-auto pr-1"
          style={{
            animation: "settlementSwapIn 220ms ease-out both",
          }}
        >
          {pagedRecaps.map((recap) => {
            const result = resolveParticipantResult(
              recap,
              effectiveSelectedReviewParticipantClientId,
              meClientId,
            );
            const tone = resultMeta[result];
            const active = selectedRecapKey === recap.key;
            const recapCorrectRank =
              result === "correct"
                ? resolveCorrectAnsweredRank(
                    recap,
                    effectiveSelectedReviewParticipantClientId,
                  )
                : null;
            const recapRating = performanceRatingByRecapKey.get(recap.key) ?? null;
            const recapGradeMeta = recapRating
              ? performanceGradeMeta[recapRating.grade]
              : null;
            const isFastestRecap =
              personalFastestCorrectRecapKeys.has(recap.key) &&
              result === "correct";
            const isGlobalFastestRecap = isParticipantGlobalFastestCorrect(
              recap,
              recapRating,
            );
            const fastestRecapBadgeText = isGlobalFastestRecap
              ? "全場最快"
              : "我的最快";
            return (
              <button
                key={recap.key}
                type="button"
                className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                  active
                    ? "border-amber-300/55 bg-amber-400/10"
                    : "border-slate-700/70 bg-slate-950/55 hover:border-slate-500/80"
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
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-amber-300/40 bg-amber-400/10 text-xs font-semibold text-amber-100">
                    {recap.order}
                  </span>
                  <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-100">
                    {recap.title}
                  </p>
                  {isFastestRecap && (
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-orange-300/45 bg-orange-500/16 text-orange-100">
                      <LocalFireDepartmentRoundedIcon className="text-[0.95rem]" />
                    </span>
                  )}
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <span
                    className={`shrink-0 ${reviewStatusBadgeBaseClass} ${tone.badgeClass}`}
                  >
                    {tone.label}
                  </span>
                  {recapRating && recapGradeMeta && (
                    <span
                      className={`inline-flex h-6 min-w-[2.2rem] items-center justify-center rounded-full border px-2 text-[11px] font-semibold ${recapGradeMeta.badgeClass}`}
                      title={`評分 ${recapRating.grade}`}
                    >
                      {recapRating.grade}
                    </span>
                  )}
                  {typeof recapCorrectRank === "number" && recapCorrectRank > 1 && (
                    <span className="inline-flex h-5 min-w-[3.9rem] items-center justify-center rounded-full border border-sky-300/45 bg-sky-500/16 px-2 text-[10px] font-semibold text-sky-50">
                      第{recapCorrectRank}答
                    </span>
                  )}
                  {recapCorrectRank === 1 && (
                    <span className="inline-flex h-5 min-w-[3.9rem] items-center justify-center rounded-full border border-emerald-300/45 bg-emerald-500/16 px-2 text-[10px] font-semibold text-emerald-100">
                      首答
                    </span>
                  )}
                  {isFastestRecap && (
                    <span className="inline-flex h-6 min-w-[4.4rem] items-center justify-center gap-1 rounded-full border border-orange-300/45 bg-orange-500/16 px-2.5 text-[11px] font-semibold text-orange-100">
                      <LocalFireDepartmentRoundedIcon className="text-[0.85rem]" />
                      {fastestRecapBadgeText}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="rounded-xl border border-slate-700/70 bg-slate-950/60 p-2.5 sm:p-3">
          {selectedRecap ? (
            <div
              key={reviewDetailTransitionKey}
              style={{
                animation: "settlementSwapIn 240ms ease-out both",
              }}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                    第 {selectedRecap.order} 題
                    {selectedReviewParticipant
                      ? ` · ${selectedReviewParticipant.username}`
                      : ""}
                  </p>
                  <button
                    type="button"
                    className={`mt-1 w-full text-left text-sm font-semibold leading-5 underline-offset-4 transition ${
                      selectedRecapLink?.href
                        ? "text-slate-100 hover:text-cyan-200 hover:underline"
                        : "cursor-default text-slate-100"
                    }`}
                    onClick={() => {
                      if (!selectedRecapLink?.href) return;
                      onOpenTrackLink(selectedRecapLink, selectedRecap);
                    }}
                    disabled={!selectedRecapLink?.href}
                    title={
                      selectedRecapLink?.href
                        ? `開啟 ${selectedRecapLink.providerLabel || "外部連結"}`
                        : selectedRecap.title
                    }
                  >
                    <p style={multilineEllipsis2Style}>{selectedRecap.title}</p>
                  </button>
                  <p className="mt-1 text-xs text-slate-400">
                    {selectedRecap.uploader}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-1.5">
                  <span
                    className={`${reviewStatusBadgeBaseClass} ${
                      resultMeta[selectedRecapAnswer.result].badgeClass
                    }`}
                  >
                    {resultMeta[selectedRecapAnswer.result].label}
                  </span>
                  {selectedRecapRating && selectedRecapGradeMeta && (
                    <span
                      className={`inline-flex h-6 min-w-[2.2rem] items-center justify-center rounded-full border px-2 text-[11px] font-semibold ${selectedRecapGradeMeta.badgeClass}`}
                      title={`評分 ${selectedRecapRating.grade}`}
                    >
                      {selectedRecapRating.grade}
                    </span>
                  )}
                  {typeof selectedRecapCorrectRank === "number" &&
                    selectedRecapCorrectRank > 1 && (
                      <span className="inline-flex h-5 min-w-[3.9rem] items-center justify-center rounded-full border border-sky-300/45 bg-sky-500/16 px-2 text-[10px] font-semibold text-sky-50">
                        第{selectedRecapCorrectRank}答
                      </span>
                    )}
                  {selectedRecapCorrectRank === 1 && (
                    <span className="inline-flex h-5 min-w-[3.9rem] items-center justify-center rounded-full border border-emerald-300/45 bg-emerald-500/16 px-2 text-[10px] font-semibold text-emerald-100">
                      首答
                    </span>
                  )}
                  {isSelectedRecapFastest && (
                    <span className="inline-flex h-6 min-w-[4.4rem] items-center justify-center gap-1 rounded-full border border-orange-300/45 bg-orange-500/16 px-2.5 text-[11px] font-semibold text-orange-100">
                      <LocalFireDepartmentRoundedIcon className="text-[0.85rem]" />
                      {selectedRecapFastestBadgeText}
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-3 rounded-lg border border-slate-700/80 bg-slate-900/70 px-3 py-2">
                <p className="text-[11px] text-slate-400">作答評分</p>
                <p className="mt-1 text-xs text-slate-300">
                  答對 {selectedRecap.correctCount ?? 0} · 答錯{" "}
                  {selectedRecap.wrongCount ?? 0} · 未作答{" "}
                  {selectedRecap.unansweredCount ?? 0} · 最快答對{" "}
                  {formatMs(selectedRecap.fastestCorrectMs)} · 平均答對{" "}
                  {formatMs(selectedRecapAverageCorrectMs)}
                </p>
                {selectedRecapRating && selectedRecapGradeMeta ? (
                  <>
                    <p className="mt-1 text-xs font-semibold text-slate-100">
                      評分{" "}
                      <span
                        className={`rounded-full border px-1.5 py-0.5 text-[10px] ${selectedRecapGradeMeta.badgeClass}`}
                      >
                        {selectedRecapRating.grade}
                      </span>{" "}
                        · {selectedRecapRating.score}
                    </p>
                    <p
                      className={`mt-1 text-[11px] ${selectedRecapGradeMeta.detailClass}`}
                    >
                      {selectedRecapRatingBreakdown}
                    </p>
                  </>
                ) : (
                  <p className="mt-1 text-xs text-slate-400">
                    尚無可計算的評分資料。
                  </p>
                )}
              </div>
              <div className="mt-3 grid gap-2">
                {selectedRecap.choices.map((choice) => {
                  const isCorrect = choice.index === selectedRecap.correctChoiceIndex;
                  const isMine = selectedRecapAnswer.choiceIndex === choice.index;
                  return (
                    <div
                      key={`${selectedRecap.key}-${choice.index}`}
                      className={`rounded-lg border px-3 py-2 ${
                        isCorrect
                          ? "border-emerald-300/40 bg-emerald-500/10"
                          : isMine
                            ? "border-rose-300/40 bg-rose-500/10"
                            : "border-slate-700/70 bg-slate-900/55"
                      }`}
                    >
                      <div className="relative min-h-[2.75rem]">
                        <p
                          className="h-[2.5rem] min-w-0 pr-[9rem] text-sm leading-5 text-slate-100"
                          style={multilineEllipsis2Style}
                          title={choice.title}
                        >
                          {choice.title}
                        </p>
                        <div className="absolute inset-y-0 right-0 flex items-center gap-1">
                          {isCorrect && (
                            <span
                              className={`${reviewStatusBadgeBaseClass} border-emerald-300/45 bg-emerald-400/15 text-emerald-100`}
                            >
                              正確
                            </span>
                          )}
                          {isMine && (
                            <span
                              className={`${reviewStatusBadgeBaseClass} border-sky-300/45 bg-sky-400/15 text-sky-100`}
                            >
                              玩家選擇
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex min-h-[220px] items-center justify-center rounded-lg border border-dashed border-slate-700 bg-slate-900/50 px-4 text-sm text-slate-400">
              目前沒有可顯示的題目回顧。
            </div>
          )}
        </div>
      </div>
      <div className="mt-3 text-xs text-slate-400">
        顯示第 {safeReviewPage * recapsPerPage + 1} -{" "}
        {Math.min(normalizedRecapCount, (safeReviewPage + 1) * recapsPerPage)}{" "}
        題（共 {normalizedRecapCount} 題）
      </div>
    </section>
  );
};

export default ReviewRecapSection;
