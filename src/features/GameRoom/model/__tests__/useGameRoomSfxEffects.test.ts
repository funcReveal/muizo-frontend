// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useGameRoomSfxEffects } from "../useGameRoomSfxEffects";
import type { GameSfxEvent } from "../useGameSfx";

function renderSfxHook({
  gameStartedAt,
  nowMs,
  playGameSfx,
}: {
  gameStartedAt: number;
  nowMs: number;
  playGameSfx: (event: GameSfxEvent) => boolean;
}) {
  return renderHook(() =>
    useGameRoomSfxEffects({
      gamePhase: "guess",
      gameStartedAt,
      trackSessionKey: "track:1",
      isEnded: false,
      isReveal: false,
      isInterTrackWait: false,
      waitingToStart: true,
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
});
