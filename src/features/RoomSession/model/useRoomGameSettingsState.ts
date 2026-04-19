import { useCallback, useState } from "react";

import {
  DEFAULT_PLAY_DURATION_SEC,
  DEFAULT_REVEAL_DURATION_SEC,
  DEFAULT_START_OFFSET_SEC,
} from "./roomConstants";
import {
  clampPlayDurationSec,
  clampRevealDurationSec,
  clampStartOffsetSec,
} from "./roomUtils";

export const useRoomGameSettingsState = () => {
  const [playDurationSec, setPlayDurationSec] = useState(
    DEFAULT_PLAY_DURATION_SEC,
  );
  const [revealDurationSec, setRevealDurationSec] = useState(
    DEFAULT_REVEAL_DURATION_SEC,
  );
  const [startOffsetSec, setStartOffsetSec] = useState(
    DEFAULT_START_OFFSET_SEC,
  );
  const [allowCollectionClipTiming, setAllowCollectionClipTiming] =
    useState(true);

  const updatePlayDurationSec = useCallback((value: number) => {
    const clamped = clampPlayDurationSec(value);
    setPlayDurationSec(clamped);
    return clamped;
  }, []);

  const updateRevealDurationSec = useCallback((value: number) => {
    const clamped = clampRevealDurationSec(value);
    setRevealDurationSec(clamped);
    return clamped;
  }, []);

  const updateStartOffsetSec = useCallback((value: number) => {
    const clamped = clampStartOffsetSec(value);
    setStartOffsetSec(clamped);
    return clamped;
  }, []);

  const updateAllowCollectionClipTiming = useCallback((value: boolean) => {
    const normalized = Boolean(value);
    setAllowCollectionClipTiming(normalized);
    return normalized;
  }, []);

  const resetGameSettingsDefaults = useCallback(() => {
    setPlayDurationSec(DEFAULT_PLAY_DURATION_SEC);
    setRevealDurationSec(DEFAULT_REVEAL_DURATION_SEC);
    setStartOffsetSec(DEFAULT_START_OFFSET_SEC);
    setAllowCollectionClipTiming(true);
  }, []);

  return {
    allowCollectionClipTiming,
    playDurationSec,
    resetGameSettingsDefaults,
    revealDurationSec,
    startOffsetSec,
    updateAllowCollectionClipTiming,
    updatePlayDurationSec,
    updateRevealDurationSec,
    updateStartOffsetSec,
  };
};

export default useRoomGameSettingsState;
