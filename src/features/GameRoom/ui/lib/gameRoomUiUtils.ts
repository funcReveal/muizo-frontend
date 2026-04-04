export const resolveComboTier = (
  combo: number,
): 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 => {
  const safeCombo =
    Number.isFinite(combo) && combo > 0 ? Math.floor(combo) : 0;
  if (safeCombo >= 10) return 10;
  if (safeCombo >= 1) return safeCombo as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  return 0;
};

const COMBO_MILESTONES = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

export const isComboMilestone = (combo: number) => {
  const safeCombo =
    Number.isFinite(combo) && combo > 0 ? Math.floor(combo) : 0;
  return COMBO_MILESTONES.has(safeCombo);
};

export const resolveComboBreakTier = (
  comboBonusPoints: number | null | undefined,
): 0 | 1 | 2 | 3 | 4 => {
  const penalty = Number.isFinite(comboBonusPoints)
    ? Math.max(0, Math.floor(Math.abs(comboBonusPoints ?? 0)))
    : 0;
  if (penalty <= 0) return 0;
  if (penalty >= 13) return 4;
  if (penalty >= 9) return 3;
  if (penalty >= 5) return 2;
  return 1;
};
