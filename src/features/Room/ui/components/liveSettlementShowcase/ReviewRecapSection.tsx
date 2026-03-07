import React from "react";
import LocalFireDepartmentRoundedIcon from "@mui/icons-material/LocalFireDepartmentRounded";
import AdsClickRoundedIcon from "@mui/icons-material/AdsClickRounded";
import { List as VirtualList, type RowComponentProps } from "react-window";

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
  reviewDoubleClickPlayEnabled: boolean;
  onToggleReviewDoubleClickPlay: () => void;
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

interface ReviewRecapRowProps {
  reviewRecaps: SettlementQuestionRecap[];
  selectedRecapKey: string | null;
  effectiveSelectedReviewParticipantClientId: string | null;
  meClientId?: string;
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
  onSetSelectedRecapKey: (recapKey: string) => void;
  onJumpToRecapPreview: (
    recap: SettlementQuestionRecap,
    source: "click" | "doubleClick",
  ) => void;
}

const ReviewRecapRow = (props: RowComponentProps<ReviewRecapRowProps>) => {
  const { index, style } = props;
  const legacyRowProps = (props as unknown as { rowProps?: ReviewRecapRowProps }).rowProps;
  const resolvedRowProps =
    legacyRowProps ?? (props as unknown as Partial<ReviewRecapRowProps> | undefined);
  const reviewRecaps = resolvedRowProps?.reviewRecaps ?? [];
  const selectedRecapKey = resolvedRowProps?.selectedRecapKey ?? null;
  const effectiveSelectedReviewParticipantClientId =
    resolvedRowProps?.effectiveSelectedReviewParticipantClientId ?? null;
  const meClientId = resolvedRowProps?.meClientId;
  const resolveParticipantResult = resolvedRowProps?.resolveParticipantResult;
  const resolveCorrectAnsweredRank = resolvedRowProps?.resolveCorrectAnsweredRank;
  const resultMeta = resolvedRowProps?.resultMeta;
  const performanceRatingByRecapKey = resolvedRowProps?.performanceRatingByRecapKey;
  const performanceGradeMeta = resolvedRowProps?.performanceGradeMeta;
  const personalFastestCorrectRecapKeys =
    resolvedRowProps?.personalFastestCorrectRecapKeys;
  const isParticipantGlobalFastestCorrect =
    resolvedRowProps?.isParticipantGlobalFastestCorrect;
  const reviewStatusBadgeBaseClass = resolvedRowProps?.reviewStatusBadgeBaseClass;
  const onSetSelectedRecapKey = resolvedRowProps?.onSetSelectedRecapKey;
  const onJumpToRecapPreview = resolvedRowProps?.onJumpToRecapPreview;
  if (
    !resolveParticipantResult ||
    !resolveCorrectAnsweredRank ||
    !resultMeta ||
    !performanceRatingByRecapKey ||
    !performanceGradeMeta ||
    !personalFastestCorrectRecapKeys ||
    !isParticipantGlobalFastestCorrect ||
    !reviewStatusBadgeBaseClass ||
    !onSetSelectedRecapKey ||
    !onJumpToRecapPreview
  ) {
    return <div style={style} />;
  }
  const recap = reviewRecaps[index];
  if (!recap) return <div style={style} />;

  const result = resolveParticipantResult(
    recap,
    effectiveSelectedReviewParticipantClientId,
    meClientId,
  );
  const tone = resultMeta[result];
  const active = selectedRecapKey === recap.key;
  const recapCorrectRank =
    result === "correct"
      ? resolveCorrectAnsweredRank(recap, effectiveSelectedReviewParticipantClientId)
      : null;
  const recapRating = performanceRatingByRecapKey.get(recap.key) ?? null;
  const recapGradeMeta = recapRating ? performanceGradeMeta[recapRating.grade] : null;
  const isFastestRecap =
    personalFastestCorrectRecapKeys.has(recap.key) && result === "correct";
  const isGlobalFastestRecap =
    isFastestRecap &&
    isParticipantGlobalFastestCorrect(recap, recapRating);
  const fastestRecapBadgeText = isGlobalFastestRecap ? "全場最速王" : "個人最快";

  return (
    <div style={style} className="px-0.5 pb-2">
      <button
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
        <div className="mt-1 flex flex-wrap items-center gap-1">
          <span className={`shrink-0 ${reviewStatusBadgeBaseClass} min-w-[3.6rem] px-2 text-[10.5px] leading-none game-settlement-pill game-settlement-pill--result ${tone.badgeClass}`}>
            {tone.label}
          </span>
          {recapRating && recapGradeMeta && (
            <span
              className={`inline-flex h-5 min-w-[2rem] items-center justify-center rounded-full border px-1.5 text-[10.5px] font-semibold game-settlement-pill game-settlement-pill--grade ${recapGradeMeta.badgeClass}`}
            >
              {recapRating.grade}
            </span>
          )}
          {recapCorrectRank === 1 && (
            <span className="inline-flex h-5 min-w-[3.7rem] items-center justify-center rounded-full border border-violet-300/45 bg-violet-500/16 px-2 text-[10.5px] font-semibold text-violet-50 game-settlement-pill game-settlement-pill--rank">
              首答
            </span>
          )}
          {typeof recapCorrectRank === "number" && recapCorrectRank > 1 && (
            <span className="inline-flex h-5 min-w-[3.7rem] items-center justify-center rounded-full border border-indigo-300/45 bg-indigo-500/16 px-2 text-[10.5px] font-semibold text-indigo-50 game-settlement-pill game-settlement-pill--rank">
              第{recapCorrectRank}答
            </span>
          )}
          {isFastestRecap && (
            <span
              title={
                isGlobalFastestRecap
                  ? "你是本場所有玩家中的單題最快答對者"
                  : "這是你在本場所有答對題目中的最快一題"
              }
              className="inline-flex h-5 min-w-[3.85rem] items-center justify-center gap-0.5 rounded-full border border-orange-300/45 bg-orange-500/16 px-2 text-[10.5px] font-semibold text-orange-100 game-settlement-pill game-settlement-pill--fastest game-settlement-pill--legend"
            >
              <LocalFireDepartmentRoundedIcon className="text-[0.8rem]" />
              {fastestRecapBadgeText}
            </span>
          )}
        </div>
      </button>
    </div>
  );
};

const ReviewRecapSection: React.FC<ReviewRecapSectionProps> = ({
  isMobileView = false,
  activeCategoryTheme,
  reviewRecapSummary,
  sortedParticipants,
  meClientId,
  reviewDoubleClickPlayEnabled,
  onToggleReviewDoubleClickPlay,
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
  isSelectedRecapGlobalFastest,
  selectedRecapFastestBadgeText,
  selectedRecapFastestCorrectMeta,
  selectedRecapAverageCorrectMs,
  formatMs,
  selectedRecapRating,
  selectedRecapGradeMeta,
  selectedRecapRatingBreakdown,
  multilineEllipsis2Style,
}) => {
  const recapRowProps = React.useMemo<ReviewRecapRowProps>(
    () => ({
      reviewRecaps,
      selectedRecapKey,
      effectiveSelectedReviewParticipantClientId,
      meClientId,
      resolveParticipantResult,
      resolveCorrectAnsweredRank,
      resultMeta,
      performanceRatingByRecapKey,
      performanceGradeMeta,
      personalFastestCorrectRecapKeys,
      isParticipantGlobalFastestCorrect,
      reviewStatusBadgeBaseClass,
      onSetSelectedRecapKey,
      onJumpToRecapPreview,
    }),
    [
      reviewRecaps,
      selectedRecapKey,
      effectiveSelectedReviewParticipantClientId,
      meClientId,
      resolveParticipantResult,
      resolveCorrectAnsweredRank,
      resultMeta,
      performanceRatingByRecapKey,
      performanceGradeMeta,
      personalFastestCorrectRecapKeys,
      isParticipantGlobalFastestCorrect,
      reviewStatusBadgeBaseClass,
      onSetSelectedRecapKey,
      onJumpToRecapPreview,
    ],
  );

  return (
    <section
      className={`game-settlement-review-shell mt-4 rounded-2xl border p-4 transition-colors duration-300 ${activeCategoryTheme.drawerClass}`}
      style={{
        animation: "settlementStageEnter 220ms ease-out both",
      }}
    >
      <div className="game-settlement-review-topbar flex flex-wrap items-center justify-between gap-2">
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
        <div className="game-settlement-review-toolbar flex flex-wrap items-center gap-2 text-xs text-slate-200">
          <button
            type="button"
            onClick={onToggleReviewDoubleClickPlay}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
              reviewDoubleClickPlayEnabled
                ? "border-violet-300/55 bg-violet-500/18 text-violet-50"
                : "border-slate-600/70 bg-slate-900/70 text-slate-300 hover:border-slate-400"
            }`}
          >
            <AdsClickRoundedIcon className="text-[0.9rem]" />
            雙擊播放 {reviewDoubleClickPlayEnabled ? "ON" : "OFF"}
          </button>
        </div>
      </div>
      {sortedParticipants.length > 0 && (
        <div className="game-settlement-review-player-strip mt-2 overflow-x-auto pb-1">
          <div className="inline-flex min-w-max flex-nowrap items-center gap-2 rounded-xl border border-slate-700/70 bg-slate-950/60 px-2 py-1.5">
            {sortedParticipants.map((participant, index) => {
              const isActive =
                participant.clientId === effectiveSelectedReviewParticipantClientId;
              const isMe = participant.clientId === meClientId;
              return (
                <button
                  key={`review-chip-${participant.clientId}`}
                  type="button"
                  onClick={() => onSelectReviewParticipantClientId(participant.clientId)}
                  className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] font-semibold transition ${
                    isActive
                      ? "border-sky-300/60 bg-sky-500/18 text-sky-50"
                      : "border-slate-600/70 bg-slate-900/70 text-slate-200 hover:border-slate-400"
                  }`}
                >
                  <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full border border-current/40 px-1 text-[10px] leading-none">
                    {index + 1}
                  </span>
                  <span className="max-w-[96px] truncate whitespace-nowrap">
                    {participant.username}
                    {isMe ? " (你)" : ""}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
      <p className="mt-2 text-[11px] text-slate-400">
        提示：雙擊題目可同步到上方試聽區（可於此處開關雙擊播放）。
      </p>

      <div
        className={`game-settlement-review-layout mt-3 grid gap-3 ${
          isMobileView
            ? "grid-cols-1"
            : "lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]"
        }`}
      >
        <div
          key={`review-list-${reviewContextTransitionKey}`}
          className={`game-settlement-review-list overflow-hidden ${
            isMobileView
              ? "h-[clamp(230px,42vh,420px)]"
              : "h-[clamp(260px,54vh,560px)]"
          }`}
          style={{
            animation: "settlementSwapIn 220ms ease-out both",
          }}
        >
          {reviewRecaps.length === 0 ? (
            <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900/50 px-4 text-sm text-slate-400">
              目前沒有題目回顧資料
            </div>
          ) : (
            <VirtualList
              style={{ height: "100%", width: "100%" }}
              rowCount={reviewRecaps.length}
              rowHeight={isMobileView ? 92 : 98}
              rowProps={recapRowProps}
              rowComponent={ReviewRecapRow}
            />
          )}
        </div>

        <div className="game-settlement-review-detail rounded-xl border border-slate-700/70 bg-slate-950/60 p-2.5 sm:p-3">
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
                    {`第 ${selectedRecap.order} 題`}
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
                  >
                    <p style={multilineEllipsis2Style}>{selectedRecap.title}</p>
                  </button>
                  <p className="mt-1 text-xs text-slate-400">
                    {selectedRecap.uploader}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-1.5">
                  <span
                    className={`${reviewStatusBadgeBaseClass} game-settlement-pill game-settlement-pill--result ${
                      resultMeta[selectedRecapAnswer.result].badgeClass
                    }`}
                  >
                    {resultMeta[selectedRecapAnswer.result].label}
                  </span>
                  {selectedRecapRating && selectedRecapGradeMeta && (
                    <span
                      className={`inline-flex h-6 min-w-[2.2rem] items-center justify-center rounded-full border px-2 text-[11px] font-semibold game-settlement-pill game-settlement-pill--grade ${selectedRecapGradeMeta.badgeClass}`}
                    >
                      {selectedRecapRating.grade}
                    </span>
                  )}
                  {selectedRecapCorrectRank === 1 && (
                    <span className="inline-flex h-6 min-w-[4.4rem] items-center justify-center rounded-full border border-violet-300/45 bg-violet-500/16 px-2.5 text-[11px] font-semibold text-violet-50 game-settlement-pill game-settlement-pill--rank">
                      首答
                    </span>
                  )}
                  {typeof selectedRecapCorrectRank === "number" &&
                    selectedRecapCorrectRank > 1 && (
                      <span className="inline-flex h-6 min-w-[4.4rem] items-center justify-center rounded-full border border-indigo-300/45 bg-indigo-500/16 px-2.5 text-[11px] font-semibold text-indigo-50 game-settlement-pill game-settlement-pill--rank">
                        第{selectedRecapCorrectRank}答
                      </span>
                    )}
                  {isSelectedRecapFastest && (
                    <span
                      title={
                        isSelectedRecapGlobalFastest
                          ? "你是本場所有玩家中的單題最快答對者"
                          : "這是你在本場所有答對題目中的最快一題"
                      }
                      className="inline-flex h-6 min-w-[4.4rem] items-center justify-center gap-1 rounded-full border border-orange-300/45 bg-orange-500/16 px-2.5 text-[11px] font-semibold text-orange-100 game-settlement-pill game-settlement-pill--fastest game-settlement-pill--legend"
                    >
                      <LocalFireDepartmentRoundedIcon className="text-[0.85rem]" />
                      {selectedRecapFastestBadgeText}
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-3 rounded-lg border border-slate-700/80 bg-slate-900/70 px-3 py-2">
                <p className="text-[11px] text-slate-400">作答評分</p>
                <p className="mt-1 text-xs text-slate-300">
                  答對 {selectedRecap.correctCount ?? 0} · 答錯 {selectedRecap.wrongCount ?? 0} · 未作答 {selectedRecap.unansweredCount ?? 0}
                </p>
                <p className="mt-1 text-xs text-slate-300">
                  {selectedRecapFastestCorrectMeta
                    ? `全場最快 ${selectedRecapFastestCorrectMeta.username} ${formatMs(
                        selectedRecapFastestCorrectMeta.answeredAtMs,
                      )}`
                    : `全場最快 ${formatMs(selectedRecap.fastestCorrectMs)}`}{" "}
                  · 平均答對時長 {formatMs(selectedRecapAverageCorrectMs)}
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
                    <p className={`mt-1 text-[11px] ${selectedRecapGradeMeta.detailClass}`}>
                      {selectedRecapRatingBreakdown}
                    </p>
                  </>
                ) : (
                  <p className="mt-1 text-xs text-slate-400">本題尚無可用評分資料</p>
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
              請從左側題目回顧清單選擇一題查看詳細資訊
            </div>
          )}
        </div>
      </div>
      <div className="mt-3 text-xs text-slate-400">共 {reviewRecaps.length} 題</div>
    </section>
  );
};

export default ReviewRecapSection;




