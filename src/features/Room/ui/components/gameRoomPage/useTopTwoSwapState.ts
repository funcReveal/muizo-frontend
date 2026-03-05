import { useCallback, useEffect, useRef, useState } from "react";

import type { RoomParticipant } from "../../../model/types";
import type { TopTwoSwapState } from "./gameRoomPageTypes";
import { deferStateUpdate } from "./gameRoomPageUtils";

const TOP_TWO_SWAP_DURATION_MS = 720;

const useTopTwoSwapState = (sortedParticipants: RoomParticipant[]) => {
  const [topTwoSwapState, setTopTwoSwapState] = useState<TopTwoSwapState | null>(
    null,
  );
  const lastTopTwoOrderRef = useRef<[string | null, string | null]>([null, null]);
  const topTwoSwapTimerRef = useRef<number | null>(null);

  const resetTopTwoSwapState = useCallback(() => {
    lastTopTwoOrderRef.current = [null, null];
    if (topTwoSwapTimerRef.current !== null) {
      window.clearTimeout(topTwoSwapTimerRef.current);
      topTwoSwapTimerRef.current = null;
    }
    setTopTwoSwapState(null);
  }, []);

  useEffect(() => {
    const nextTopTwo: [string | null, string | null] = [
      sortedParticipants[0]?.clientId ?? null,
      sortedParticipants[1]?.clientId ?? null,
    ];
    const [prevFirst, prevSecond] = lastTopTwoOrderRef.current;
    const [nextFirst, nextSecond] = nextTopTwo;
    const didSwapTopTwo =
      !!prevFirst &&
      !!prevSecond &&
      !!nextFirst &&
      !!nextSecond &&
      prevFirst === nextSecond &&
      prevSecond === nextFirst;

    if (didSwapTopTwo) {
      if (topTwoSwapTimerRef.current !== null) {
        window.clearTimeout(topTwoSwapTimerRef.current);
      }
      deferStateUpdate(() => {
        setTopTwoSwapState((prev) => ({
          firstClientId: nextFirst,
          secondClientId: nextSecond,
          key: (prev?.key ?? 0) + 1,
        }));
      });
      topTwoSwapTimerRef.current = window.setTimeout(() => {
        setTopTwoSwapState((current) => {
          if (
            current &&
            current.firstClientId === nextFirst &&
            current.secondClientId === nextSecond
          ) {
            return null;
          }
          return current;
        });
        topTwoSwapTimerRef.current = null;
      }, TOP_TWO_SWAP_DURATION_MS);
    }

    lastTopTwoOrderRef.current = nextTopTwo;
  }, [sortedParticipants]);

  useEffect(
    () => () => {
      if (topTwoSwapTimerRef.current !== null) {
        window.clearTimeout(topTwoSwapTimerRef.current);
      }
    },
    [],
  );

  return { topTwoSwapState, resetTopTwoSwapState };
};

export default useTopTwoSwapState;
