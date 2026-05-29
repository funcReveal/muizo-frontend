// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { RoomParticipant } from "@features/RoomSession";

import useMobileScoreFeedback from "../useMobileScoreFeedback";
import type { MobileScoreFeedbackEvent } from "../mobileScoreFeedback";

type ScoreFeedbackEvent = Extract<MobileScoreFeedbackEvent, { type: "score" }>;

function makeParticipant(
  clientId: string,
  score: number,
  combo = 0,
): RoomParticipant {
  return {
    clientId,
    username: clientId,
    avatar_url: null,
    joinedAt: 0,
    isOnline: true,
    lastSeen: 0,
    score,
    combo,
  };
}

const flushMicrotasks = () => act(async () => {});

describe("useMobileScoreFeedback", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows room passed feedback immediately when the player reaches rank one, then shows score follow-up", async () => {
    vi.useFakeTimers();

    const { result, rerender } = renderHook(
      ({ participants }: { participants: RoomParticipant[] }) =>
        useMobileScoreFeedback({
          participants,
          meClientId: "me",
          enabled: true,
          gameStatus: "playing",
          scope: "room",
          scoreDurationMs: 5000,
          rankDurationMs: 2500,
        }),
      {
        initialProps: {
          participants: [
            makeParticipant("leader", 1300),
            makeParticipant("me", 460, 4),
          ],
        },
      },
    );

    await flushMicrotasks();
    expect(result.current).toBeNull();

    rerender({
      participants: [
        makeParticipant("me", 1460, 5),
        makeParticipant("leader", 1300),
      ],
    });
    await flushMicrotasks();

    expect(result.current?.type).toBe("passed");
    if (result.current?.type !== "passed") return;
    expect(result.current.scope).toBe("room");
    expect(result.current.oldRank).toBe(2);
    expect(result.current.newRank).toBe(1);
    expect(result.current.target?.clientId).toBe("leader");
    expect(result.current.scoreGain).toBe(1000);

    act(() => {
      vi.advanceTimersByTime(2500);
    });
    await flushMicrotasks();

    const scoreFollowUp = result.current as unknown as ScoreFeedbackEvent | null;
    expect(scoreFollowUp?.type).toBe("score");
    if (scoreFollowUp?.type !== "score") return;
    expect(scoreFollowUp.scope).toBe("room");
    expect(scoreFollowUp.scoreGain).toBe(1000);
    expect(scoreFollowUp.leadScore).toBe(160);
    expect(scoreFollowUp.runnerUp?.clientId).toBe("leader");
  });

  it("shows room overtaken feedback first, then my score gain and comeback gap", async () => {
    vi.useFakeTimers();

    const { result, rerender } = renderHook(
      ({ participants }: { participants: RoomParticipant[] }) =>
        useMobileScoreFeedback({
          participants,
          meClientId: "me",
          enabled: true,
          gameStatus: "playing",
          scope: "room",
          scoreDurationMs: 5000,
          rankDurationMs: 2500,
        }),
      {
        initialProps: {
          participants: [
            makeParticipant("me", 1000, 2),
            makeParticipant("rival", 900),
          ],
        },
      },
    );

    await flushMicrotasks();
    expect(result.current).toBeNull();

    rerender({
      participants: [
        makeParticipant("rival", 1500),
        makeParticipant("me", 1120, 3),
      ],
    });
    await flushMicrotasks();

    expect(result.current?.type).toBe("overtaken");
    if (result.current?.type !== "overtaken") return;
    expect(result.current.scope).toBe("room");
    expect(result.current.target?.clientId).toBe("rival");
    expect(result.current.scoreGain).toBe(120);

    act(() => {
      vi.advanceTimersByTime(2500);
    });
    await flushMicrotasks();

    const scoreFollowUp = result.current as unknown as ScoreFeedbackEvent | null;
    expect(scoreFollowUp?.type).toBe("score");
    if (scoreFollowUp?.type !== "score") return;
    expect(scoreFollowUp.scope).toBe("room");
    expect(scoreFollowUp.scoreGain).toBe(120);
    expect(scoreFollowUp.nextTargetGap).toBe(380);
    expect(scoreFollowUp.nextTargetName).toBe("rival");
  });
});
