import { useCallback, useMemo } from "react";

import type { RoomParticipant } from "../../../model/types";
import type { SettlementQuestionRecap } from "../GameSettlementPanel";
import {
  buildAnsweredRankMap,
  calculateSongPerformanceScore,
  distributeRecommendationCards,
  RECOMMEND_CATEGORY_FLOW,
  resolveAverageCorrectMs,
  resolveSpeedComparisonInsight,
  type RecommendCategory,
  type SongPerformanceGrade,
} from "../liveSettlementUtils";

type RecapAnswerResult = "correct" | "wrong" | "unanswered";

export interface SongPerformanceRating {
  score: number;
  grade: SongPerformanceGrade;
  result: RecapAnswerResult;
  answeredRank: number | null;
  answeredAtMs: number | null;
  correctRate: number;
}

export interface GradeMeta {
  badgeClass: string;
  detailClass: string;
}

export interface ResultTone {
  label: string;
  badgeClass: string;
}

type RecommendationCardLike<TRecap> = {
  recap: TRecap;
  link: unknown;
  previewUrl: string | null;
};

interface UseSettlementRecommendationInsightsParams<
  TRecap extends SettlementQuestionRecap,
  TRecommendationCard extends RecommendationCardLike<TRecap>,
> {
  normalizedRecaps: TRecap[];
  participants: RoomParticipant[];
  participantsLength: number;
  configuredAnswerWindowMs: number;
  quickSolveThresholdMs: number;
  recommendCategory: RecommendCategory;
  recommendIndex: number;
  previewRecapKey: string | null;
  previewPlaybackMode: "idle" | "auto" | "manual";
  previewPlayerState: "idle" | "playing" | "paused";
  pausedCountdownRemainingMs: number | null;
  activeTab: "overview" | "recommend";
  autoPreviewEnabled: boolean;
  effectiveSelectedReviewParticipantClientId: string | null;
  meClientId?: string;
  selectedRecap: TRecap | null;
  selectedRecapAnswerResult: RecapAnswerResult;
  selectedRecapCorrectRank: number | null;
  buildRecommendationCard: (
    recap: TRecap,
    hint: string,
    emphasis: string,
  ) => TRecommendationCard;
  resolveParticipantAnswer: (
    recap: SettlementQuestionRecap,
    participantClientId: string | null,
    meClientId?: string,
  ) => {
    choiceIndex: number | null;
    result: SettlementQuestionRecap["myResult"];
    answeredAtMs: number | null;
  };
  resolveCorrectAnsweredRank: (
    recap: SettlementQuestionRecap,
    participantClientId: string | null,
  ) => number | null;
  getChangedAnswerCount: (answer: unknown) => number;
  formatMs: (value: number | null | undefined) => string;
  formatPercent: (value: number) => string;
  performanceGradeMeta: Record<SongPerformanceGrade, GradeMeta>;
  resultMeta: Record<RecapAnswerResult, ResultTone>;
}

interface UseSettlementRecommendationInsightsResult<
  TRecap extends SettlementQuestionRecap,
  TRecommendationCard extends RecommendationCardLike<TRecap>,
> {
  averageCorrectMsByRecapKey: Map<string, number | null>;
  recommendationCardsByCategory: Record<RecommendCategory, TRecommendationCard[]>;
  performanceRatingByRecapKey: Map<string, SongPerformanceRating>;
  personalFastestCorrectRecapKeys: Set<string>;
  selectedRecapRating: SongPerformanceRating | null;
  selectedRecapAverageCorrectMs: number | null;
  selectedRecapGradeMeta: GradeMeta | null;
  isSelectedRecapFastest: boolean;
  isSelectedRecapGlobalFastest: boolean;
  selectedRecapFastestBadgeText: string;
  selectedRecapFastestCorrectMeta: {
    clientId: string;
    username: string;
    answeredAtMs: number;
  } | null;
  selectedRecapRatingBreakdown: string;
  availableRecommendCategories: RecommendCategory[];
  activeRecommendCategory: RecommendCategory;
  recommendationCards: TRecommendationCard[];
  canNavigateRecommendations: boolean;
  safeRecommendIndex: number;
  currentRecommendation: TRecommendationCard | null;
  currentRecommendationLink: TRecommendationCard["link"] | null;
  currentRecommendationPreviewUrl: string | null;
  currentRecommendationAverageCorrectMs: number | null;
  isCurrentRecommendationPreviewOpen: boolean;
  isCurrentRecommendationFastest: boolean;
  recommendationTransitionKey: string;
  currentRecommendationRating: SongPerformanceRating | null;
  currentRecommendationGradeMeta: GradeMeta | null;
  currentRecommendationCorrectRank: number | null;
  currentRecommendationSpeedInsight: {
    label: string;
    value: string;
    valueClass: string;
    note: string;
    deltaMs: number | null;
    answeredMs: number | null;
    averageMs: number | null;
  };
  currentRecommendationResultTone: ResultTone;
  isCurrentRecommendationFirstCorrect: boolean;
  showCurrentRecommendationRankBadge: boolean;
  isCurrentRecommendationGlobalFastest: boolean;
  currentRecommendationFastestBadgeText: string;
  currentRecommendationFastestCorrectMeta: {
    clientId: string;
    username: string;
    answeredAtMs: number;
  } | null;
  hasCurrentRecommendationSpeedDelta: boolean;
  isPreviewFrozen: boolean;
  shouldShowPreviewOverlay: boolean;
  canAutoGuideLoop: boolean;
}

const useSettlementRecommendationInsights = <
  TRecap extends SettlementQuestionRecap,
  TRecommendationCard extends RecommendationCardLike<TRecap>,
>({
  normalizedRecaps,
  participants,
  participantsLength,
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
  selectedRecapAnswerResult,
  selectedRecapCorrectRank,
  buildRecommendationCard,
  resolveParticipantAnswer,
  resolveCorrectAnsweredRank,
  getChangedAnswerCount,
  formatMs,
  formatPercent,
  performanceGradeMeta,
  resultMeta,
}: UseSettlementRecommendationInsightsParams<
  TRecap,
  TRecommendationCard
>): UseSettlementRecommendationInsightsResult<TRecap, TRecommendationCard> => {
  const defaultParticipantCount = Math.max(1, participantsLength);
  const participantNameByClientId = useMemo(() => {
    const next = new Map<string, string>();
    participants.forEach((participant) => {
      next.set(participant.clientId, participant.username);
    });
    return next;
  }, [participants]);
  const resolveParticipantCount = useCallback(
    (recap: SettlementQuestionRecap) => {
      const raw =
        typeof recap.participantCount === "number" &&
        Number.isFinite(recap.participantCount) &&
        recap.participantCount > 0
          ? recap.participantCount
          : defaultParticipantCount;
      return Math.max(1, Math.floor(raw));
    },
    [defaultParticipantCount],
  );

  const averageCorrectMsByRecapKey = useMemo(() => {
    const next = new Map<string, number | null>();
    normalizedRecaps.forEach((recap) => {
      next.set(recap.key, resolveAverageCorrectMs(recap.answersByClientId));
    });
    return next;
  }, [normalizedRecaps]);

  const quickRecommendations = useMemo(() => {
    return normalizedRecaps
      .map((recap) => {
        const participantCount = resolveParticipantCount(recap);
        const correctCount = Math.max(0, recap.correctCount ?? 0);
        const unansweredCount = Math.max(0, recap.unansweredCount ?? 0);
        const correctRate = correctCount / participantCount;
        const unansweredRate = unansweredCount / participantCount;
        const allCorrect = participantCount > 0 && correctCount >= participantCount;
        const averageCorrectMs =
          averageCorrectMsByRecapKey.get(recap.key) ?? Number.POSITIVE_INFINITY;
        const fastestCorrectMs =
          typeof recap.fastestCorrectMs === "number" &&
          Number.isFinite(recap.fastestCorrectMs)
            ? recap.fastestCorrectMs
            : Number.POSITIVE_INFINITY;
        return {
          recap,
          correctRate,
          unansweredRate,
          allCorrect,
          averageCorrectMs,
          fastestCorrectMs,
        };
      })
      .filter(
        (row) => row.allCorrect && row.averageCorrectMs <= quickSolveThresholdMs,
      )
      .sort(
        (a, b) =>
          a.averageCorrectMs - b.averageCorrectMs ||
          a.fastestCorrectMs - b.fastestCorrectMs ||
          a.recap.order - b.recap.order,
      );
  }, [
    averageCorrectMsByRecapKey,
    normalizedRecaps,
    quickSolveThresholdMs,
    resolveParticipantCount,
  ]);

  const confuseRecommendations = useMemo(() => {
    return normalizedRecaps
      .map((recap) => {
        const answers = recap.answersByClientId
          ? Object.values(recap.answersByClientId)
          : [];
        const changedUsersFromAnswers = answers.filter(
          (answer) => getChangedAnswerCount(answer) > 0,
        ).length;
        const changedTimesFromAnswers = answers.reduce(
          (sum, answer) => sum + getChangedAnswerCount(answer),
          0,
        );
        const changedUsers = Math.max(
          changedUsersFromAnswers,
          Math.max(0, recap.changedAnswerUserCount ?? 0),
        );
        const changedTimes = Math.max(
          changedTimesFromAnswers,
          Math.max(0, recap.changedAnswerCount ?? 0),
        );
        const participantCount = resolveParticipantCount(recap);
        const confusionRate =
          participantCount > 0 ? changedUsers / participantCount : 0;
        const avgChangedCount =
          participantCount > 0 ? changedTimes / participantCount : 0;
        return {
          recap,
          changedUsers,
          changedTimes,
          confusionRate,
          avgChangedCount,
        };
      })
      .filter((row) => row.confusionRate >= 0.3 || row.avgChangedCount >= 0.5)
      .sort(
        (a, b) =>
          b.changedUsers - a.changedUsers ||
          b.changedTimes - a.changedTimes ||
          b.confusionRate - a.confusionRate ||
          a.recap.order - b.recap.order,
      );
  }, [getChangedAnswerCount, normalizedRecaps, resolveParticipantCount]);

  const hardRecommendations = useMemo(() => {
    return normalizedRecaps
      .map((recap) => {
        const participantCount = resolveParticipantCount(recap);
        const correctCount = Math.max(0, recap.correctCount ?? 0);
        const wrongCount = Math.max(0, recap.wrongCount ?? 0);
        const unansweredCount = Math.max(0, recap.unansweredCount ?? 0);
        const hardScore = (wrongCount + unansweredCount * 1.2) / participantCount;
        const correctRate = correctCount / participantCount;
        const unansweredRate = unansweredCount / participantCount;
        return { recap, hardScore, correctRate, unansweredRate };
      })
      .filter((row) => row.correctRate <= 0.25 || row.unansweredRate >= 0.35)
      .sort(
        (a, b) => b.hardScore - a.hardScore || a.recap.order - b.recap.order,
      );
  }, [normalizedRecaps, resolveParticipantCount]);

  const otherRecommendations = useMemo(() => {
    const highlightedKeys = new Set<string>([
      ...quickRecommendations.map((entry) => entry.recap.key),
      ...confuseRecommendations.map((entry) => entry.recap.key),
      ...hardRecommendations.map((entry) => entry.recap.key),
    ]);
    return normalizedRecaps
      .filter((recap) => !highlightedKeys.has(recap.key))
      .map((recap) => ({
        recap,
        correctRate:
          Math.max(0, recap.correctCount ?? 0) / resolveParticipantCount(recap),
      }))
      .sort(
        (a, b) => b.correctRate - a.correctRate || a.recap.order - b.recap.order,
      );
  }, [
    confuseRecommendations,
    hardRecommendations,
    normalizedRecaps,
    quickRecommendations,
    resolveParticipantCount,
  ]);

  const recommendationCardsByCategory = useMemo<
    Record<RecommendCategory, TRecommendationCard[]>
  >(
    () =>
      distributeRecommendationCards({
        quick: quickRecommendations.map((entry) =>
          buildRecommendationCard(
            entry.recap,
            `全員答對，平均作答 ${formatMs(entry.averageCorrectMs)}`,
            `最快正解 ${formatMs(entry.fastestCorrectMs)}`,
          ),
        ),
        confuse: confuseRecommendations.map((entry) =>
          buildRecommendationCard(
            entry.recap,
            `${entry.changedUsers} 位玩家改過答案，共改答 ${entry.changedTimes} 次`,
            "容易讓人猶豫",
          ),
        ),
        hard: hardRecommendations.map((entry) =>
          buildRecommendationCard(
            entry.recap,
            `答錯 ${entry.recap.wrongCount ?? 0} 人，未作答 ${entry.recap.unansweredCount ?? 0} 人`,
            "高難度挑戰",
          ),
        ),
        other: otherRecommendations.map((entry) =>
          buildRecommendationCard(
            entry.recap,
            `全場答對率 ${formatPercent(entry.correctRate)}`,
            "值得回顧",
          ),
        ),
      }),
    [
      buildRecommendationCard,
      confuseRecommendations,
      formatMs,
      formatPercent,
      hardRecommendations,
      otherRecommendations,
      quickRecommendations,
    ],
  );

  const ratingParticipantClientId =
    effectiveSelectedReviewParticipantClientId ?? meClientId ?? null;
  const performanceRatingByRecapKey = useMemo(() => {
    const next = new Map<string, SongPerformanceRating>();
    if (!ratingParticipantClientId) return next;
    normalizedRecaps.forEach((recap) => {
      const participantCount = resolveParticipantCount(recap);
      const correctCount = Math.max(0, recap.correctCount ?? 0);
      const correctRate = correctCount / participantCount;
      const answer = resolveParticipantAnswer(
        recap,
        ratingParticipantClientId,
        meClientId,
      );
      const result: RecapAnswerResult =
        answer.result === "correct" || answer.result === "wrong"
          ? answer.result
          : "unanswered";
      const answeredAtMs =
        typeof answer.answeredAtMs === "number" &&
        Number.isFinite(answer.answeredAtMs)
          ? Math.max(0, Math.floor(answer.answeredAtMs))
          : null;
      const answeredRank =
        buildAnsweredRankMap(recap.answersByClientId).get(ratingParticipantClientId) ??
        null;
      const ratingScore = calculateSongPerformanceScore({
        result,
        participantCount,
        correctRate,
        answeredAtMs,
        answeredRank,
        answerWindowMs: configuredAnswerWindowMs,
      });
      next.set(recap.key, {
        score: ratingScore.score,
        grade: ratingScore.grade,
        result,
        answeredRank,
        answeredAtMs,
        correctRate,
      });
    });
    return next;
  }, [
    configuredAnswerWindowMs,
    meClientId,
    normalizedRecaps,
    ratingParticipantClientId,
    resolveParticipantAnswer,
    resolveParticipantCount,
  ]);

  const recapOrderByKey = useMemo(() => {
    const next = new Map<string, number>();
    normalizedRecaps.forEach((recap, index) => {
      next.set(
        recap.key,
        typeof recap.order === "number" && Number.isFinite(recap.order)
          ? recap.order
          : index + 1,
      );
    });
    return next;
  }, [normalizedRecaps]);

  const personalFastestCorrectRecapKeys = useMemo(() => {
    const candidates: Array<{ key: string; answeredAtMs: number; order: number }> = [];
    performanceRatingByRecapKey.forEach((rating, key) => {
      if (rating.result !== "correct") return;
      if (
        typeof rating.answeredAtMs !== "number" ||
        !Number.isFinite(rating.answeredAtMs)
      ) {
        return;
      }
      candidates.push({
        key,
        answeredAtMs: rating.answeredAtMs,
        order: recapOrderByKey.get(key) ?? Number.MAX_SAFE_INTEGER,
      });
    });
    if (!candidates.length) return new Set<string>();
    candidates.sort(
      (a, b) =>
        a.answeredAtMs - b.answeredAtMs ||
        a.order - b.order ||
        a.key.localeCompare(b.key),
    );
    const keys = new Set<string>();
    keys.add(candidates[0].key);
    return keys;
  }, [performanceRatingByRecapKey, recapOrderByKey]);

  const fastestCorrectMetaByRecapKey = useMemo(() => {
    const next = new Map<
      string,
      { clientId: string; username: string; answeredAtMs: number } | null
    >();
    normalizedRecaps.forEach((recap) => {
      const answers = recap.answersByClientId
        ? Object.entries(recap.answersByClientId)
        : [];
      const candidates = answers
        .map(([clientId, answer]) => {
          if (answer?.result !== "correct") return null;
          if (
            typeof answer.answeredAtMs !== "number" ||
            !Number.isFinite(answer.answeredAtMs) ||
            answer.answeredAtMs < 0
          ) {
            return null;
          }
          return {
            clientId,
            answeredAtMs: Math.floor(answer.answeredAtMs),
          };
        })
        .filter(
          (
            value,
          ): value is {
            clientId: string;
            answeredAtMs: number;
          } => value !== null,
        )
        .sort(
          (a, b) =>
            a.answeredAtMs - b.answeredAtMs ||
            a.clientId.localeCompare(b.clientId),
        );
      const best = candidates[0];
      if (!best) {
        next.set(recap.key, null);
        return;
      }
      next.set(recap.key, {
        clientId: best.clientId,
        username: participantNameByClientId.get(best.clientId) ?? best.clientId,
        answeredAtMs: best.answeredAtMs,
      });
    });
    return next;
  }, [normalizedRecaps, participantNameByClientId]);

  const selectedRecapRating = selectedRecap
    ? performanceRatingByRecapKey.get(selectedRecap.key) ?? null
    : null;
  const selectedRecapAverageCorrectMs = selectedRecap
    ? averageCorrectMsByRecapKey.get(selectedRecap.key) ?? null
    : null;
  const selectedRecapGradeMeta = selectedRecapRating
    ? performanceGradeMeta[selectedRecapRating.grade]
    : null;
  const isSelectedRecapFastest = selectedRecap
    ? personalFastestCorrectRecapKeys.has(selectedRecap.key) &&
      selectedRecapAnswerResult === "correct"
    : false;
  const isSelectedRecapGlobalFastest =
    isSelectedRecapFastest &&
    Boolean(
      selectedRecap &&
        selectedRecapRating &&
        selectedRecapRating.result === "correct" &&
        typeof selectedRecapRating.answeredAtMs === "number" &&
        Number.isFinite(selectedRecapRating.answeredAtMs) &&
        typeof selectedRecap.fastestCorrectMs === "number" &&
        Number.isFinite(selectedRecap.fastestCorrectMs) &&
        Math.floor(selectedRecapRating.answeredAtMs) ===
          Math.floor(selectedRecap.fastestCorrectMs),
    );
  const selectedRecapFastestBadgeText = isSelectedRecapGlobalFastest
    ? "全場最速王"
    : "最快答對";
  const selectedRecapFastestCorrectMeta = selectedRecap
    ? fastestCorrectMetaByRecapKey.get(selectedRecap.key) ?? null
    : null;
  const selectedRecapRatingBreakdown = (() => {
    if (!selectedRecapRating) return "--";
    const parts: string[] = [];
    if (selectedRecapRating.result === "correct") {
      if (typeof selectedRecapCorrectRank === "number") {
        parts.push(`第 ${selectedRecapCorrectRank} 答`);
      }
    } else if (typeof selectedRecapRating.answeredRank === "number") {
      parts.push(`第 ${selectedRecapRating.answeredRank} 答`);
    }
    if (typeof selectedRecapRating.answeredAtMs === "number") {
      parts.push(`作答 ${formatMs(selectedRecapRating.answeredAtMs)}`);
    }
    parts.push(`全場答對率 ${formatPercent(selectedRecapRating.correctRate)}`);
    return parts.join(" ・ ");
  })();

  const availableRecommendCategories = useMemo(
    () =>
      RECOMMEND_CATEGORY_FLOW.filter(
        (category) => recommendationCardsByCategory[category].length > 0,
      ),
    [recommendationCardsByCategory],
  );

  const activeRecommendCategory =
    recommendationCardsByCategory[recommendCategory].length > 0
      ? recommendCategory
      : (availableRecommendCategories[0] ?? "quick");
  const recommendationCards = recommendationCardsByCategory[activeRecommendCategory];
  const totalRecommendationPoolCount =
    recommendationCardsByCategory.quick.length +
    recommendationCardsByCategory.confuse.length +
    recommendationCardsByCategory.hard.length +
    recommendationCardsByCategory.other.length;
  const canNavigateRecommendations = totalRecommendationPoolCount > 1;
  const safeRecommendIndex =
    recommendationCards.length > 0
      ? Math.min(recommendIndex, recommendationCards.length - 1)
      : 0;
  const currentRecommendation = recommendationCards[safeRecommendIndex] ?? null;
  const currentRecommendationLink = currentRecommendation?.link ?? null;
  const currentRecommendationPreviewUrl = currentRecommendation?.previewUrl ?? null;
  const currentRecommendationAverageCorrectMs = currentRecommendation
    ? averageCorrectMsByRecapKey.get(currentRecommendation.recap.key) ?? null
    : null;
  const isCurrentRecommendationPreviewOpen =
    Boolean(currentRecommendation) &&
    previewRecapKey === currentRecommendation?.recap.key;
  const isCurrentRecommendationFastest = currentRecommendation
    ? personalFastestCorrectRecapKeys.has(currentRecommendation.recap.key)
    : false;
  const currentRecommendationFastestCorrectMeta = currentRecommendation
    ? fastestCorrectMetaByRecapKey.get(currentRecommendation.recap.key) ?? null
    : null;
  const recommendationTransitionKey = `${activeRecommendCategory}:${currentRecommendation?.recap.key ?? "none"}`;
  const currentRecommendationRating = currentRecommendation
    ? performanceRatingByRecapKey.get(currentRecommendation.recap.key) ?? null
    : null;
  const currentRecommendationGradeMeta = currentRecommendationRating
    ? performanceGradeMeta[currentRecommendationRating.grade]
    : null;
  const currentRecommendationCorrectRank =
    currentRecommendation &&
    ratingParticipantClientId &&
    currentRecommendationRating?.result === "correct"
      ? resolveCorrectAnsweredRank(
          currentRecommendation.recap,
          ratingParticipantClientId,
        )
      : null;

  const currentRecommendationSpeedInsight = (() => {
  if (!currentRecommendation || !currentRecommendationRating) {
    return {
      label: "速度差" as const,
      value: "--",
      valueClass: "text-slate-300",
      note: "目前沒有可比較的速度資料",
      deltaMs: null,
      answeredMs: null,
      averageMs: null,
    };
  }
  const speedInsight = resolveSpeedComparisonInsight(
    {
      averageCorrectMs: currentRecommendationAverageCorrectMs,
      answeredAtMs: currentRecommendationRating.answeredAtMs,
    },
    (ms) => formatMs(ms),
  );
  if (speedInsight.answeredMs === null) {
    return {
      ...speedInsight,
      valueClass: "text-slate-300",
      note: "目前沒有可比較的速度資料",
    };
  }
  if (speedInsight.deltaMs !== null) {
    const isAhead = speedInsight.deltaMs >= 0;
    const averageMsText = formatMs(
      speedInsight.averageMs ?? speedInsight.answeredMs,
    );
    return {
      ...speedInsight,
      valueClass: isAhead ? "text-emerald-100" : "text-rose-100",
      note: `作答 ${formatMs(speedInsight.answeredMs)} ・ 平均答對 ${averageMsText}`,
    };
  }
  return {
    ...speedInsight,
    valueClass: "text-slate-300",
    note: `作答 ${formatMs(speedInsight.answeredMs)}`,
  };
})();

  const currentRecommendationResultKey: RecapAnswerResult =
    currentRecommendationRating?.result ?? "unanswered";
  const currentRecommendationResultTone = resultMeta[currentRecommendationResultKey];
  const isCurrentRecommendationFirstCorrect =
    currentRecommendationRating?.result === "correct" &&
    currentRecommendationCorrectRank === 1;
  const showCurrentRecommendationRankBadge =
    typeof currentRecommendationCorrectRank === "number" &&
    currentRecommendationCorrectRank > 1;
  const isCurrentRecommendationGlobalFastest =
    isCurrentRecommendationFastest &&
    Boolean(
      currentRecommendation &&
        currentRecommendationRating &&
        currentRecommendationRating.result === "correct" &&
        typeof currentRecommendationRating.answeredAtMs === "number" &&
        Number.isFinite(currentRecommendationRating.answeredAtMs) &&
        typeof currentRecommendation.recap.fastestCorrectMs === "number" &&
        Number.isFinite(currentRecommendation.recap.fastestCorrectMs) &&
        Math.floor(currentRecommendationRating.answeredAtMs) ===
          Math.floor(currentRecommendation.recap.fastestCorrectMs),
    );
  const currentRecommendationFastestBadgeText =
    isCurrentRecommendationGlobalFastest ? "全場最速王" : "最快答對";
  const hasCurrentRecommendationSpeedDelta =
    currentRecommendationSpeedInsight.value !== "--";
  const isPreviewFrozen =
    pausedCountdownRemainingMs !== null || previewPlayerState === "paused";
  const shouldShowPreviewOverlay =
    !isCurrentRecommendationPreviewOpen ||
    previewPlayerState === "paused" ||
    (previewPlaybackMode !== "auto" && previewPlayerState !== "playing");
  const canAutoGuideLoop =
    activeTab === "recommend" &&
    autoPreviewEnabled &&
    previewPlaybackMode !== "manual" &&
    recommendationCards.length > 0 &&
    availableRecommendCategories.length > 0;

  return {
    averageCorrectMsByRecapKey,
    recommendationCardsByCategory,
    performanceRatingByRecapKey,
    personalFastestCorrectRecapKeys,
    selectedRecapRating,
    selectedRecapAverageCorrectMs,
    selectedRecapGradeMeta,
    isSelectedRecapFastest,
    isSelectedRecapGlobalFastest,
    selectedRecapFastestBadgeText,
    selectedRecapFastestCorrectMeta,
    selectedRecapRatingBreakdown,
    availableRecommendCategories,
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
    currentRecommendationFastestCorrectMeta,
    hasCurrentRecommendationSpeedDelta,
    isPreviewFrozen,
    shouldShowPreviewOverlay,
    canAutoGuideLoop,
  };
};

export default useSettlementRecommendationInsights;





