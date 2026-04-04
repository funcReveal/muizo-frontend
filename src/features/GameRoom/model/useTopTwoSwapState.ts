import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import type { RoomParticipant } from "../../Room/model/types";
import type { TopTwoSwapState } from "./gameRoomTypes";
import { deferStateUpdate } from "./gameRoomUtils";

const TOP_TWO_SWAP_DURATION_MS = 3400;
const MAX_SWAP_OFFSET_ROWS = 6;

const clampSwapOffsetRows = (value: number) =>
  Math.max(-MAX_SWAP_OFFSET_ROWS, Math.min(MAX_SWAP_OFFSET_ROWS, value));

const SCOREBOARD_DEBUG_STORAGE_KEY = "musicquiz:debug-sync";

const useTopTwoSwapState = (sortedParticipants: RoomParticipant[]) => {
  const [topTwoSwapState, setTopTwoSwapState] = useState<TopTwoSwapState | null>(
    null,
  );
  const lastParticipantOrderRef = useRef<string[]>([]);
  const lastScoreByClientIdRef = useRef<Map<string, number>>(new Map());
  const topTwoSwapTimerRef = useRef<number | null>(null);

  const debugScoreboard = useCallback(
    (label: string, payload: Record<string, unknown>) => {
      if (typeof window === "undefined") return;
      const enabled =
        window.localStorage.getItem(SCOREBOARD_DEBUG_STORAGE_KEY) === "1" ||
        window.location.search.includes("debugSync=1");
      if (!enabled) return;
      console.debug(`[mq-scoreboard] ${label}`, payload);
    },
    [],
  );

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
    const nextScoreByClientId = new Map(
      sortedParticipants.map((participant) => [participant.clientId, participant.score]),
    );
    const prevParticipantOrder = lastParticipantOrderRef.current;
    const prevScoreByClientId = lastScoreByClientIdRef.current;
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
    const movedClientIds = [nextFirst, nextSecond]
      .filter((clientId): clientId is string => Boolean(clientId))
      .filter((clientId) => prevParticipantOrder.includes(clientId));
    const didScoreChangeForMovedClients = movedClientIds.some((clientId) => {
      const prevScore = prevScoreByClientId.get(clientId);
      const nextScore = nextScoreByClientId.get(clientId);
      return typeof prevScore === "number" && typeof nextScore === "number" && prevScore !== nextScore;
    });

    if (didTopTwoChange && didScoreChangeForMovedClients) {
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
      debugScoreboard("top-two-swap", {
        trigger: "top-two-swap",
        prevOrder: prevParticipantOrder.slice(0, 2),
        nextOrder: nextParticipantOrder.slice(0, 2),
        movedClientIds,
        prevScores: Object.fromEntries(
          movedClientIds.map((clientId) => [clientId, prevScoreByClientId.get(clientId) ?? null]),
        ),
        nextScores: Object.fromEntries(
          movedClientIds.map((clientId) => [clientId, nextScoreByClientId.get(clientId) ?? null]),
        ),
      });
    } else if (didTopTwoChange) {
      debugScoreboard("top-two-swap-skipped", {
        trigger: "top-two-swap",
        prevOrder: prevParticipantOrder.slice(0, 2),
        nextOrder: nextParticipantOrder.slice(0, 2),
        movedClientIds,
        prevScores: Object.fromEntries(
          movedClientIds.map((clientId) => [clientId, prevScoreByClientId.get(clientId) ?? null]),
        ),
        nextScores: Object.fromEntries(
          movedClientIds.map((clientId) => [clientId, nextScoreByClientId.get(clientId) ?? null]),
        ),
      });
    }

    lastParticipantOrderRef.current = nextParticipantOrder;
    lastScoreByClientIdRef.current = nextScoreByClientId;
  }, [debugScoreboard, sortedParticipants]);

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
