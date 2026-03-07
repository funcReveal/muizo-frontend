import type { SettlementQuestionRecap } from "./GameSettlementPanel";

export type RecommendCategory = "quick" | "confuse" | "hard" | "other";

export const RECOMMEND_CATEGORY_FLOW: RecommendCategory[] = [
  "quick",
  "confuse",
  "hard",
  "other",
];

export type SongPerformanceResult = "correct" | "wrong" | "unanswered";
export type SongPerformanceGrade = "S" | "A" | "B" | "C" | "D" | "E";
export type RecapPreviewInteractionSource = "click" | "doubleClick";
export type RecapPreviewPlaybackMode = "idle" | "auto" | "manual";

export type SongPerformanceScoreInput = {
  result: SongPerformanceResult;
  participantCount: number;
  correctRate: number;
  answeredAtMs: number | null;
  answeredRank: number | null;
  answerWindowMs: number;
};

export type SongPerformanceScore = {
  score: number;
  grade: SongPerformanceGrade;
  rankNorm: number;
  speedNorm: number;
  difficultyNorm: number;
};

export const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export const resolveSongPerformanceGrade = (
  score: number,
): SongPerformanceGrade => {
  if (score >= 90) return "S";
  if (score >= 78) return "A";
  if (score >= 64) return "B";
  if (score >= 50) return "C";
  if (score >= 35) return "D";
  return "E";
};

export const calculateSongPerformanceScore = (
  input: SongPerformanceScoreInput,
): SongPerformanceScore => {
  const participantCount = Math.max(1, Math.floor(input.participantCount));
  const validAnswerWindowMs = Math.max(
    1,
    Number.isFinite(input.answerWindowMs) ? Math.floor(input.answerWindowMs) : 1,
  );
  const answeredRank =
    typeof input.answeredRank === "number" &&
    Number.isFinite(input.answeredRank) &&
    input.answeredRank > 0
      ? Math.floor(input.answeredRank)
      : null;
  const answeredAtMs =
    typeof input.answeredAtMs === "number" &&
    Number.isFinite(input.answeredAtMs) &&
    input.answeredAtMs >= 0
      ? Math.floor(input.answeredAtMs)
      : null;
  const correctRate = clamp01(
    Number.isFinite(input.correctRate) ? input.correctRate : 0,
  );
  const rankNorm =
    answeredRank === null
      ? 0
      : clamp01(1 - (answeredRank - 1) / Math.max(1, participantCount - 1));
  const speedNorm =
    answeredAtMs === null
      ? 0
      : clamp01(1 - answeredAtMs / Math.max(1, validAnswerWindowMs));
  const difficultyNorm = clamp01(1 - correctRate);

  let rawScore = 0;
  if (input.result === "correct") {
    rawScore = 55 + rankNorm * 20 + speedNorm * 15 + difficultyNorm * 10;
  } else if (input.result === "wrong") {
    rawScore = 18 + rankNorm * 8 + speedNorm * 7 + difficultyNorm * 4;
  } else {
    rawScore = difficultyNorm * 6;
  }

  const score = Math.round(Math.max(0, Math.min(100, rawScore)));
  return {
    score,
    grade: resolveSongPerformanceGrade(score),
    rankNorm,
    speedNorm,
    difficultyNorm,
  };
};

type RecapAnswer = SettlementQuestionRecap["answersByClientId"] extends
  | Record<string, infer T>
  | undefined
  ? T
  : never;

const normalizeAnsweredEntries = (
  answersByClientId?: Record<string, RecapAnswer>,
) => {
  if (!answersByClientId) return [] as Array<[string, number]>;
  return Object.entries(answersByClientId)
    .map(([clientId, answer]) => {
      const answeredAtMs =
        typeof answer?.answeredAtMs === "number" &&
        Number.isFinite(answer.answeredAtMs) &&
        answer.answeredAtMs >= 0
          ? Math.floor(answer.answeredAtMs)
          : null;
      return answeredAtMs === null ? null : ([clientId, answeredAtMs] as const);
    })
    .filter((entry): entry is [string, number] => entry !== null)
    .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]));
};

export const buildAnsweredRankMap = (
  answersByClientId?: Record<string, RecapAnswer>,
): Map<string, number> => {
  const entries = normalizeAnsweredEntries(answersByClientId);
  const rankMap = new Map<string, number>();
  entries.forEach(([clientId], idx) => {
    rankMap.set(clientId, idx + 1);
  });
  return rankMap;
};

export const buildCorrectAnsweredRankMap = (
  answersByClientId?: Record<string, RecapAnswer>,
): Map<string, number> => {
  if (!answersByClientId) return new Map<string, number>();
  const correctOnly: Record<string, RecapAnswer> = {};
  Object.entries(answersByClientId).forEach(([clientId, answer]) => {
    if (answer?.result === "correct") {
      correctOnly[clientId] = answer;
    }
  });
  return buildAnsweredRankMap(correctOnly);
};

export const resolveAverageCorrectMs = (
  answersByClientId?: Record<string, RecapAnswer>,
): number | null => {
  if (!answersByClientId) return null;
  const values = Object.values(answersByClientId)
    .filter((answer) => answer?.result === "correct")
    .map((answer) =>
      typeof answer.answeredAtMs === "number" &&
      Number.isFinite(answer.answeredAtMs) &&
      answer.answeredAtMs >= 0
        ? Math.floor(answer.answeredAtMs)
        : null,
    )
    .filter((value): value is number => value !== null);
  if (values.length <= 0) return null;
  const total = values.reduce((sum, value) => sum + value, 0);
  return Math.round(total / values.length);
};

export const distributeRecommendationCards = <T extends { recap: { key: string } }>(
  rowsByCategory: Record<RecommendCategory, T[]>,
  flow: RecommendCategory[] = RECOMMEND_CATEGORY_FLOW,
): Record<RecommendCategory, T[]> => {
  const result: Record<RecommendCategory, T[]> = {
    quick: [],
    confuse: [],
    hard: [],
    other: [],
  };
  const usedRecapKeys = new Set<string>();

  flow.forEach((category) => {
    const rows = rowsByCategory[category] ?? [];
    rows.forEach((row) => {
      const recapKey = row.recap.key;
      if (usedRecapKeys.has(recapKey)) return;
      usedRecapKeys.add(recapKey);
      result[category].push(row);
    });
  });

  return result;
};

export type AutoGuideStartTarget = {
  category: RecommendCategory;
  index: number;
  hasPreview: boolean;
};

export const resolveAutoGuideStartTarget = <
  T extends { previewUrl: string | null },
>(
  rowsByCategory: Record<RecommendCategory, T[]>,
  preferredCategory: RecommendCategory,
  flow: RecommendCategory[] = RECOMMEND_CATEGORY_FLOW,
): AutoGuideStartTarget | null => {
  const orderedFlow = flow.length > 0 ? flow : RECOMMEND_CATEGORY_FLOW;
  const categorySequence = [
    preferredCategory,
    ...orderedFlow.filter((category) => category !== preferredCategory),
  ];

  for (const category of categorySequence) {
    const rows = rowsByCategory[category] ?? [];
    if (rows.length <= 0) continue;
    const previewIndex = rows.findIndex((row) => Boolean(row.previewUrl));
    if (previewIndex >= 0) {
      return {
        category,
        index: previewIndex,
        hasPreview: true,
      };
    }
  }

  const preferredRows = rowsByCategory[preferredCategory] ?? [];
  if (preferredRows.length > 0) {
    return {
      category: preferredCategory,
      index: 0,
      hasPreview: Boolean(preferredRows[0]?.previewUrl),
    };
  }

  for (const category of orderedFlow) {
    const rows = rowsByCategory[category] ?? [];
    if (rows.length <= 0) continue;
    return {
      category,
      index: 0,
      hasPreview: Boolean(rows[0]?.previewUrl),
    };
  }

  return null;
};

export type RecapPreviewNavigation = {
  playbackMode: RecapPreviewPlaybackMode;
  forcePreview: boolean;
};

export const resolveRecapPreviewNavigation = (
  source: RecapPreviewInteractionSource,
  options: {
    autoPreviewEnabled: boolean;
    reviewDoubleClickPlayEnabled: boolean;
  },
): RecapPreviewNavigation => {
  if (source === "click") {
    return {
      playbackMode: options.autoPreviewEnabled ? "auto" : "idle",
      forcePreview: false,
    };
  }
  const canManualPreview = options.reviewDoubleClickPlayEnabled;
  return {
    playbackMode: canManualPreview ? "manual" : "idle",
    forcePreview: canManualPreview,
  };
};

const normalizeTimingMs = (value: number | null | undefined) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return null;
  }
  return Math.floor(value);
};

export type SpeedComparisonInsight = {
  label: "你比大家快多少";
  value: string;
  deltaMs: number | null;
  answeredMs: number | null;
  averageMs: number | null;
};

export const resolveSpeedComparisonInsight = (
  input: {
    averageCorrectMs: number | null | undefined;
    answeredAtMs: number | null | undefined;
  },
  formatMs: (ms: number) => string,
): SpeedComparisonInsight => {
  const answeredMs = normalizeTimingMs(input.answeredAtMs);
  const averageMs = normalizeTimingMs(input.averageCorrectMs);
  if (answeredMs !== null && averageMs !== null) {
    const deltaMs = averageMs - answeredMs;
    return {
      label: "你比大家快多少",
      value: `${deltaMs >= 0 ? "+" : "-"}${formatMs(Math.abs(deltaMs))}`,
      deltaMs,
      answeredMs,
      averageMs,
    };
  }
  return {
    label: "你比大家快多少",
    value: "--",
    deltaMs: null,
    answeredMs,
    averageMs,
  };
};

