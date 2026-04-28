import { describe, expect, it } from "vitest";

import {
  getRestartVoteButtonLabel,
  getRestartVoteRequestErrorLabel,
  getRestartVoteActionViewState,
  isComboMilestone,
  resolveComboBreakTier,
  resolveComboTier,
} from "../gameRoomUiUtils";

describe("GameRoomPage combo helpers", () => {
  it("resolveComboTier maps combo streaks into 10 visible stages", () => {
    expect(resolveComboTier(0)).toBe(0);
    expect(resolveComboTier(1)).toBe(1);
    expect(resolveComboTier(2)).toBe(2);
    expect(resolveComboTier(3)).toBe(3);
    expect(resolveComboTier(4)).toBe(4);
    expect(resolveComboTier(5)).toBe(5);
    expect(resolveComboTier(6)).toBe(6);
    expect(resolveComboTier(7)).toBe(7);
    expect(resolveComboTier(8)).toBe(8);
    expect(resolveComboTier(9)).toBe(9);
    expect(resolveComboTier(10)).toBe(10);
    expect(resolveComboTier(14)).toBe(10);
  });

  it("isComboMilestone is true for combo stages 1 through 10", () => {
    expect(isComboMilestone(1)).toBe(true);
    expect(isComboMilestone(2)).toBe(true);
    expect(isComboMilestone(3)).toBe(true);
    expect(isComboMilestone(4)).toBe(true);
    expect(isComboMilestone(5)).toBe(true);
    expect(isComboMilestone(6)).toBe(true);
    expect(isComboMilestone(7)).toBe(true);
    expect(isComboMilestone(8)).toBe(true);
    expect(isComboMilestone(9)).toBe(true);
    expect(isComboMilestone(10)).toBe(true);
    expect(isComboMilestone(11)).toBe(false);
  });

  it("resolveComboBreakTier maps penalty intensity to 1-4", () => {
    expect(resolveComboBreakTier(0)).toBe(0);
    expect(resolveComboBreakTier(-1)).toBe(1);
    expect(resolveComboBreakTier(-4)).toBe(1);
    expect(resolveComboBreakTier(-5)).toBe(2);
    expect(resolveComboBreakTier(-8)).toBe(2);
    expect(resolveComboBreakTier(-9)).toBe(3);
    expect(resolveComboBreakTier(-12)).toBe(3);
    expect(resolveComboBreakTier(-13)).toBe(4);
    expect(resolveComboBreakTier(-25)).toBe(4);
  });

  it("keeps restart vote labels action-specific", () => {
    expect(
      getRestartVoteButtonLabel({
        action: "return_to_lobby",
        hasRequested: false,
        isRejected: false,
      }),
    ).toBe("返回房間");
    expect(
      getRestartVoteButtonLabel({
        action: "restart_now",
        hasRequested: false,
        isRejected: false,
      }),
    ).toBe("重新開始");
    expect(
      getRestartVoteButtonLabel({
        action: "return_to_lobby",
        hasRequested: true,
        isRejected: false,
      }),
    ).toBe("本局已發起");
    expect(
      getRestartVoteButtonLabel({
        action: "return_to_lobby",
        hasRequested: true,
        isRejected: true,
      }),
    ).toBe("返回房間投票失敗");
    expect(
      getRestartVoteButtonLabel({
        action: "restart_now",
        hasRequested: true,
        isRejected: true,
      }),
    ).toBe("重新開始投票失敗");
  });

  it("keeps restart vote request errors action-specific", () => {
    expect(getRestartVoteRequestErrorLabel("return_to_lobby")).toBe(
      "發起返回房間投票失敗",
    );
    expect(getRestartVoteRequestErrorLabel("restart_now")).toBe(
      "發起重新開始投票失敗",
    );
  });

  it("keeps a previously initiated inactive action locked during another active vote", () => {
    const returnView = getRestartVoteActionViewState({
      action: "return_to_lobby",
      activeAction: "return_to_lobby",
      approveCount: 1,
      canRequest: false,
      hasRequested: true,
      isGamePlaying: true,
      isRejected: false,
      majorityCount: 2,
      requestPending: false,
      submitPending: false,
    });
    const restartView = getRestartVoteActionViewState({
      action: "restart_now",
      activeAction: "return_to_lobby",
      approveCount: 1,
      canRequest: false,
      hasRequested: true,
      isGamePlaying: true,
      isRejected: false,
      majorityCount: 2,
      requestPending: false,
      submitPending: false,
    });

    expect(returnView).toMatchObject({
      isActive: true,
      isLocked: false,
      disabled: false,
      countLabel: "1/2",
    });
    expect(restartView).toMatchObject({
      isActive: false,
      isLocked: true,
      disabled: true,
      buttonLabel: "本局已發起",
    });
  });

  it("disables the inactive action without showing locked state for players who did not initiate it", () => {
    const restartView = getRestartVoteActionViewState({
      action: "restart_now",
      activeAction: "return_to_lobby",
      approveCount: 1,
      canRequest: false,
      hasRequested: false,
      isGamePlaying: true,
      isRejected: false,
      majorityCount: 2,
      requestPending: false,
      submitPending: false,
    });

    expect(restartView).toMatchObject({
      isActive: false,
      isLocked: false,
      disabled: true,
      buttonLabel: "重新開始",
    });
  });
});
