import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import type { RoomParticipant } from "../../../model/types";
import type { TopTwoSwapState } from "./gameRoomPageTypes";
import { deferStateUpdate } from "./gameRoomPageUtils";

const TOP_TWO_SWAP_DURATION_MS = 3400;
const MAX_SWAP_OFFSET_ROWS = 6;

const clampSwapOffsetRows = (value: number) =>
  Math.max(-MAX_SWAP_OFFSET_ROWS, Math.min(MAX_SWAP_OFFSET_ROWS, value));

const useTopTwoSwapState = (sortedParticipants: RoomParticipant[]) => {
  const [topTwoSwapState, setTopTwoSwapState] = useState<TopTwoSwapState | null>(
    null,
  );
  const lastParticipantOrderRef = useRef<string[]>([]);
  const topTwoSwapTimerRef = useRef<number | null>(null);

  const resetTopTwoSwapState = useCallback(() => {
    lastParticipantOrderRef.current = [];
    if (topTwoSwapTimerRef.current !== null) {
      window.clearTimeout(topTwoSwapTimerRef.current);
      topTwoSwapTimerRef.current = null;
    }
    setTopTwoSwapState(null);
  }, []);

  useLayoutEffect(() => {
    const nextParticipantOrder = sortedParticipants.map((participant) => participant.clientId);
    const prevParticipantOrder = lastParticipantOrderRef.current;
    const [prevFirst, prevSecond] = [
      prevParticipantOrder[0] ?? null,
      prevParticipantOrder[1] ?? null,
    ];
    const [nextFirst, nextSecond] = [
      nextParticipantOrder[0] ?? null,
      nextParticipantOrder[1] ?? null,
    ];
    const didSwapTopTwo =
      !!prevFirst &&
      !!prevSecond &&
      !!nextFirst &&
      !!nextSecond &&
      prevFirst === nextSecond &&
      prevSecond === nextFirst;
    const didTopTwoChange =
      !!prevFirst &&
      !!prevSecond &&
      !!nextFirst &&
      !!nextSecond &&
      (prevFirst !== nextFirst || prevSecond !== nextSecond);

    if (didTopTwoChange) {
      const prevIndexOfNextFirst = prevParticipantOrder.indexOf(nextFirst);
      const prevIndexOfNextSecond = prevParticipantOrder.indexOf(nextSecond);
      const firstOffsetRows = clampSwapOffsetRows(
        prevIndexOfNextFirst >= 0 ? prevIndexOfNextFirst : 1,
      );
      const secondOffsetRows = clampSwapOffsetRows(
        prevIndexOfNextSecond >= 0 ? prevIndexOfNextSecond - 1 : -1,
      );

      if (topTwoSwapTimerRef.current !== null) {
        window.clearTimeout(topTwoSwapTimerRef.current);
      }
      deferStateUpdate(() => {
        setTopTwoSwapState((prev) => ({
          firstClientId: nextFirst,
          secondClientId: nextSecond,
          firstOffsetRows,
          secondOffsetRows,
          isExactSwap: didSwapTopTwo,
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

    lastParticipantOrderRef.current = nextParticipantOrder;
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
