import { describe, expect, it } from "vitest";

import { formatLobbySettlementSummary } from "../roomLobbyPanelUtils";

describe("roomLobbyPanelUtils", () => {
  it("formats complete settlement stats with rank, score, and accuracy", () => {
    expect(
      formatLobbySettlementSummary(
        {
          roundNo: 3,
          questionCount: 5,
          playerCount: 6,
        },
        {
          rank: 2,
          score: 1250,
          correctCount: 4,
          playerCount: 6,
        },
      ),
    ).toBe("第 3 局 · 第 2/6 名 · 1,250 分 · 4/5 題");
  });

  it("falls back to a syncing summary when settlement stats are incomplete", () => {
    expect(
      formatLobbySettlementSummary(
        {
          roundNo: 2,
          questionCount: 6,
          playerCount: 4,
        },
        {
          rank: null,
          score: null,
          correctCount: null,
          playerCount: 4,
        },
      ),
    ).toBe("第 2 局 · 4 人 · 6 題 · 資料同步中");
  });
});
