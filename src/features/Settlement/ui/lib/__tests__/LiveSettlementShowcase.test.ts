import { describe, expect, it } from "vitest";

import {
  distributeRecommendationCards,
  resolveAutoGuideStartTarget,
} from "../settlementUtils";

type RecommendCard = {
  recap: { key: string };
  previewUrl: string | null;
};

const card = (key: string, previewUrl: string | null = null): RecommendCard => ({
  recap: { key },
  previewUrl,
});

describe("LiveSettlementShowcase recommendation helpers", () => {
  it("distributeRecommendationCards keeps full set with flow dedupe", () => {
    const distributed = distributeRecommendationCards({
      quick: [card("a"), card("dup")],
      confuse: [card("b"), card("dup")],
      hard: [card("c"), card("a")],
      other: [card("d"), card("c")],
    });

    const allKeys = Object.values(distributed)
      .flat()
      .map((entry) => entry.recap.key);
    expect(new Set(allKeys)).toEqual(new Set(["a", "dup", "b", "c", "d"]));
    expect(allKeys.length).toBe(5);
  });

  it("resolveAutoGuideStartTarget follows playable-first fallback order", () => {
    const target = resolveAutoGuideStartTarget(
      {
        quick: [card("q0", null)],
        confuse: [card("c0", "https://youtube.com/embed/c0")],
        hard: [card("h0", "https://youtube.com/embed/h0")],
        other: [],
      },
      "quick",
    );

    expect(target).toEqual({
      category: "confuse",
      index: 0,
      hasPreview: true,
    });
  });
});

