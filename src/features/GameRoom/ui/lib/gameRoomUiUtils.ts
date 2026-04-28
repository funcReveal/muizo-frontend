import type { RestartGameVoteAction } from "@features/RoomSession";

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

export const getRestartVoteActionLabel = (action: RestartGameVoteAction) =>
  action === "return_to_lobby" ? "返回房間" : "重新開始";

export const getRestartVoteRequestErrorLabel = (
  action: RestartGameVoteAction,
) => `發起${getRestartVoteActionLabel(action)}投票失敗`;

export const getRestartVoteButtonLabel = ({
  action,
  hasRequested,
  isRejected,
}: {
  action: RestartGameVoteAction;
  hasRequested: boolean;
  isRejected: boolean;
}) => {
  if (isRejected) return `${getRestartVoteActionLabel(action)}投票失敗`;
  if (hasRequested) return "本局已發起";
  return getRestartVoteActionLabel(action);
};
