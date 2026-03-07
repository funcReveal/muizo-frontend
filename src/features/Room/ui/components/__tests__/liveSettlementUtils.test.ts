import { describe, expect, it } from "vitest";

import {
  buildAnsweredRankMap,
  calculateSongPerformanceScore,
  distributeRecommendationCards,
  resolveAverageCorrectMs,
  resolveAutoGuideStartTarget,
  resolveRecapPreviewNavigation,
  resolveSpeedComparisonInsight,
  type RecommendCategory,
} from "../liveSettlementUtils";

type Card = { recap: { key: string } };
type PreviewCard = { previewUrl: string | null };

const card = (key: string): Card => ({ recap: { key } });
const previewCard = (previewUrl: string | null): PreviewCard => ({ previewUrl });

const makeCategoryRows = (
  rows: Partial<Record<RecommendCategory, Card[]>>,
): Record<RecommendCategory, Card[]> => ({
  quick: rows.quick ?? [],
  confuse: rows.confuse ?? [],
  hard: rows.hard ?? [],
  other: rows.other ?? [],
});

describe("liveSettlementUtils", () => {
  it("distributeRecommendationCards keeps all songs and removes duplicates by flow priority", () => {
    const rows = makeCategoryRows({
      quick: [card("q1"), card("q2"), card("dup")],
      confuse: [card("c1"), card("dup"), card("c2")],
      hard: [card("h1"), card("dup"), card("h2")],
      other: [card("o1"), card("dup"), card("o2"), card("h1")],
    });

    const distributed = distributeRecommendationCards(rows);
    const allKeys = Object.values(distributed)
      .flat()
      .map((item) => item.recap.key);
    const uniqueKeys = new Set(allKeys);

    expect(allKeys.length).toBe(uniqueKeys.size);
    expect(uniqueKeys).toEqual(
      new Set(["q1", "q2", "dup", "c1", "c2", "h1", "h2", "o1", "o2"]),
    );
    expect(distributed.quick.map((item) => item.recap.key)).toContain("dup");
    expect(distributed.confuse.map((item) => item.recap.key)).not.toContain("dup");
    expect(distributed.other.map((item) => item.recap.key)).not.toContain("h1");
  });

  it("buildAnsweredRankMap uses answeredAtMs asc with clientId tie-break", () => {
    const rankMap = buildAnsweredRankMap({
      zeta: { result: "correct", choiceIndex: 1, answeredAtMs: 900 },
      alpha: { result: "wrong", choiceIndex: 0, answeredAtMs: 500 },
      beta: { result: "correct", choiceIndex: 2, answeredAtMs: 500 },
      skip: { result: "unanswered", choiceIndex: null, answeredAtMs: null },
    });

    expect(rankMap.get("alpha")).toBe(1);
    expect(rankMap.get("beta")).toBe(2);
    expect(rankMap.get("zeta")).toBe(3);
    expect(rankMap.has("skip")).toBe(false);
  });

  it("calculateSongPerformanceScore respects formula boundaries for correct/wrong/unanswered", () => {
    const perfect = calculateSongPerformanceScore({
      result: "correct",
      participantCount: 8,
      correctRate: 0,
      answeredAtMs: 0,
      answeredRank: 1,
      answerWindowMs: 15000,
    });
    const wrongFast = calculateSongPerformanceScore({
      result: "wrong",
      participantCount: 8,
      correctRate: 0.3,
      answeredAtMs: 1200,
      answeredRank: 2,
      answerWindowMs: 15000,
    });
    const unansweredHard = calculateSongPerformanceScore({
      result: "unanswered",
      participantCount: 8,
      correctRate: 0.1,
      answeredAtMs: null,
      answeredRank: null,
      answerWindowMs: 15000,
    });

    expect(perfect.score).toBe(100);
    expect(perfect.grade).toBe("S");
    expect(wrongFast.score).toBeGreaterThanOrEqual(18);
    expect(wrongFast.score).toBeLessThanOrEqual(37);
    expect(["E", "D", "C"]).toContain(wrongFast.grade);
    expect(unansweredHard.score).toBe(5);
    expect(unansweredHard.grade).toBe("E");
  });

  it("resolveAutoGuideStartTarget picks playable card from preferred category first", () => {
    const target = resolveAutoGuideStartTarget(
      {
        quick: [previewCard(null), previewCard("q-preview")],
        confuse: [previewCard("c-preview")],
        hard: [previewCard("h-preview")],
        other: [],
      },
      "quick",
    );

    expect(target).toEqual({
      category: "quick",
      index: 1,
      hasPreview: true,
    });
  });

  it("resolveAutoGuideStartTarget falls back to another playable category", () => {
    const target = resolveAutoGuideStartTarget(
      {
        quick: [previewCard(null)],
        confuse: [],
        hard: [previewCard("h-preview")],
        other: [previewCard("o-preview")],
      },
      "quick",
    );

    expect(target).toEqual({
      category: "hard",
      index: 0,
      hasPreview: true,
    });
  });

  it("resolveAutoGuideStartTarget falls back to preferred first item when no preview exists", () => {
    const target = resolveAutoGuideStartTarget(
      {
        quick: [previewCard(null), previewCard(null)],
        confuse: [previewCard(null)],
        hard: [],
        other: [],
      },
      "quick",
    );

    expect(target).toEqual({
      category: "quick",
      index: 0,
      hasPreview: false,
    });
  });

  it("resolveAverageCorrectMs returns mean for correct answers only", () => {
    const average = resolveAverageCorrectMs({
      a: { result: "correct", choiceIndex: 0, answeredAtMs: 1200 },
      b: { result: "wrong", choiceIndex: 1, answeredAtMs: 2000 },
      c: { result: "correct", choiceIndex: 2, answeredAtMs: 1800 },
      d: { result: "correct", choiceIndex: 3, answeredAtMs: null },
    });

    expect(average).toBe(1500);
  });

  it("resolveAverageCorrectMs returns null when no valid correct timings", () => {
    const average = resolveAverageCorrectMs({
      a: { result: "wrong", choiceIndex: 0, answeredAtMs: 900 },
      b: { result: "unanswered", choiceIndex: null, answeredAtMs: null },
      c: { result: "correct", choiceIndex: 2, answeredAtMs: null },
    });

    expect(average).toBeNull();
  });

  it("resolveRecapPreviewNavigation keeps strategy on single click", () => {
    expect(
      resolveRecapPreviewNavigation("click", {
        autoPreviewEnabled: true,
        reviewDoubleClickPlayEnabled: false,
      }),
    ).toEqual({
      playbackMode: "auto",
      forcePreview: false,
    });
    expect(
      resolveRecapPreviewNavigation("click", {
        autoPreviewEnabled: false,
        reviewDoubleClickPlayEnabled: true,
      }),
    ).toEqual({
      playbackMode: "idle",
      forcePreview: false,
    });
  });

  it("resolveRecapPreviewNavigation keeps double-click behavior", () => {
    expect(
      resolveRecapPreviewNavigation("doubleClick", {
        autoPreviewEnabled: true,
        reviewDoubleClickPlayEnabled: true,
      }),
    ).toEqual({
      playbackMode: "manual",
      forcePreview: true,
    });
    expect(
      resolveRecapPreviewNavigation("doubleClick", {
        autoPreviewEnabled: true,
        reviewDoubleClickPlayEnabled: false,
      }),
    ).toEqual({
      playbackMode: "idle",
      forcePreview: false,
    });
  });

  it("resolveSpeedComparisonInsight keeps fixed label and signed values", () => {
    const formatMs = (value: number) => `${(value / 1000).toFixed(2)}S`;
    const faster = resolveSpeedComparisonInsight(
      {
        averageCorrectMs: 2800,
        answeredAtMs: 1600,
      },
      formatMs,
    );
    const slower = resolveSpeedComparisonInsight(
      {
        averageCorrectMs: 1400,
        answeredAtMs: 2200,
      },
      formatMs,
    );

    expect(faster.label).toBe("你比大家快多少");
    expect(faster.value).toBe("+1.20S");
    expect(slower.label).toBe("你比大家快多少");
    expect(slower.value).toBe("-0.80S");
  });
});
