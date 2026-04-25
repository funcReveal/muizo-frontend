import { useCallback, useRef, type Dispatch, type SetStateAction } from "react";

import type {
  GameLiveUpdatePayload,
  GameState,
  GameSyncVersion,
} from "./types";
import { shouldApplyGameSyncVersion } from "./gameSyncVersion";

type UseRoomGameLiveSyncParams = {
  setGameState: Dispatch<SetStateAction<GameState | null>>;
  setGameSyncVersion: Dispatch<SetStateAction<GameSyncVersion | null>>;
};

export function useRoomGameLiveSync({
  setGameState,
  setGameSyncVersion,
}: UseRoomGameLiveSyncParams) {
  const lastGameSyncVersionRef = useRef<GameSyncVersion | null>(null);

  const resetGameSyncVersion = useCallback(() => {
    lastGameSyncVersionRef.current = null;
    setGameSyncVersion(null);
  }, [setGameSyncVersion]);

  const applyGameLiveUpdate = useCallback(
    (payload: GameLiveUpdatePayload) => {
      if (
        !shouldApplyGameSyncVersion(
          payload.syncVersion,
          lastGameSyncVersionRef.current,
        )
      ) {
        return false;
      }

      lastGameSyncVersionRef.current = payload.syncVersion;
      setGameSyncVersion(payload.syncVersion);
      setGameState(payload.gameState);
      return true;
    },
    [setGameState, setGameSyncVersion],
  );

  return {
    applyGameLiveUpdate,
    lastGameSyncVersionRef,
    resetGameSyncVersion,
  };
}
