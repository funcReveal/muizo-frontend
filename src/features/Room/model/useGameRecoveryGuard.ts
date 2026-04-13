import { useRoomGame } from "./RoomGameContext";
import { useRoomSession } from "./RoomSessionContext";

export type GameRecoveryMode = "live" | "recovering" | "syncing";

export interface GameRecoveryGuardResult {
  mode: GameRecoveryMode;
  label: string | null;
  shouldFreezeCountdown: boolean;
  shouldDisableInteractions: boolean;
  safeRemainingMs: number | null;
}

export function useGameRecoveryGuard(
  rawRemainingMs: number | null,
): GameRecoveryGuardResult {
  const { gameState } = useRoomGame();
  const { currentRoomId, isRecoveringConnection, recoveryStatusText } =
    useRoomSession();

  const hasTargetRoom = Boolean(currentRoomId);

  const isWaitingServerPhaseAdvance =
    hasTargetRoom &&
    !isRecoveringConnection &&
    gameState?.status === "playing" &&
    rawRemainingMs !== null &&
    rawRemainingMs <= 0;

  const mode: GameRecoveryMode = isRecoveringConnection
    ? "recovering"
    : isWaitingServerPhaseAdvance
      ? "syncing"
      : "live";

  const label =
    mode === "recovering"
      ? (recoveryStatusText ?? "正在恢復連線...")
      : mode === "syncing"
        ? "正在等待伺服器同步..."
        : null;

  return {
    mode,
    label,
    shouldFreezeCountdown: mode !== "live",
    shouldDisableInteractions: mode !== "live",
    safeRemainingMs: mode === "live" ? rawRemainingMs : null,
  };
}

export default useGameRecoveryGuard;
