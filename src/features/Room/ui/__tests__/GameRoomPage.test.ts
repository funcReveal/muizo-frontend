import { describe, expect, it } from "vitest";

import {
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
});
