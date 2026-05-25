// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useGameRoomSfxEffects } from "../useGameRoomSfxEffects";
import type { GameSfxEvent } from "../useGameSfx";
import type { MobileScoreFeedbackEvent } from "../mobileScoreFeedback";

function renderSfxHook({
  gameStartedAt,
  nowMs,
  playGameSfx,
  scoreFeedbackEvent = null,
  waitingToStart = true,
}: {
  gameStartedAt: number;
  nowMs: number;
  playGameSfx: (event: GameSfxEvent) => boolean;
  scoreFeedbackEvent?: MobileScoreFeedbackEvent | null;
  waitingToStart?: boolean;
}) {
  return renderHook(() =>
    useGameRoomSfxEffects({
      gamePhase: "guess",
      gameStartedAt,
      trackSessionKey: "track:1",
      isEnded: false,
      isReveal: false,
      isInterTrackWait: false,
      waitingToStart,
      phaseEndsAt: gameStartedAt + 30_000,
      meClientId: "me",
      selectedChoice: null,
      myHasAnswered: false,
      myIsCorrect: false,
      myResolvedScoreBreakdown: null,
      comboBreakTier: 0,
      isComboBreakThisQuestion: false,
      myIsCorrectForCombo: false,
      myComboMilestone: false,
      myComboNow: 0,
      myComboTier: 0,
      getServerNowMs: () => nowMs,
      playGameSfx,
      scoreFeedbackEvent,
    }),
  );
}

describe("useGameRoomSfxEffects", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("schedules opening 3 / 2 / 1 countdown cues from server start time", () => {
    vi.useFakeTimers();
    const playGameSfx = vi.fn(() => true);

    renderSfxHook({
      gameStartedAt: 3_000,
      nowMs: 0,
      playGameSfx,
    });

    act(() => {
      vi.advanceTimersByTime(0);
    });
    expect(playGameSfx).toHaveBeenLastCalledWith("countdown");

    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(playGameSfx).toHaveBeenLastCalledWith("urgency");

    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(playGameSfx).toHaveBeenLastCalledWith("countdownFinal");
    expect(playGameSfx).toHaveBeenCalledTimes(3);
  });

  it("plays rank-pass feedback from the overlay event stream", () => {
    const playGameSfx = vi.fn(() => true);
    const scoreFeedbackEvent: MobileScoreFeedbackEvent = {
      type: "passed",
      scope: "room",
      scoreGain: 300,
      oldRank: 3,
      newRank: 2,
      me: {
        clientId: "me",
        username: "me",
        avatarUrl: null,
        score: 900,
        rank: 2,
        combo: 4,
      },
      target: {
        clientId: "rival",
        username: "rival",
        avatarUrl: null,
        score: 860,
        rank: 3,
        combo: 0,
      },
      nextTarget: null,
      nextTargetGap: null,
      nextTargetName: null,
      runnerUp: null,
      leadScore: null,
    };

    renderSfxHook({
      gameStartedAt: 0,
      nowMs: 0,
      playGameSfx,
      scoreFeedbackEvent,
      waitingToStart: false,
    });

    expect(playGameSfx).toHaveBeenCalledWith("rankPass");
  });
});
