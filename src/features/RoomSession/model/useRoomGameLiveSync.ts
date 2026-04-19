import { useCallback, useRef, type Dispatch, type SetStateAction } from "react";

import type {
  GameLiveUpdatePayload,
  GameState,
  GameSyncVersion,
} from "./types";
import { shouldApplyGameSyncVersion } from "./gameSyncVersion";

type UseRoomGameLiveSyncParams = {
  setGameState: Dispatch<SetStateAction<GameState | null>>;
};

export function useRoomGameLiveSync({
  setGameState,
}: UseRoomGameLiveSyncParams) {
  const lastGameSyncVersionRef = useRef<GameSyncVersion | null>(null);

  const resetGameSyncVersion = useCallback(() => {
    lastGameSyncVersionRef.current = null;
  }, []);

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
      setGameState(payload.gameState);
      return true;
    },
    [setGameState],
  );

  return {
    applyGameLiveUpdate,
    lastGameSyncVersionRef,
    resetGameSyncVersion,
  };
}
