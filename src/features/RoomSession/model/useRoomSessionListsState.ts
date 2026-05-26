import {
  useCallback,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import type {
  ChatMessage,
  LeaderboardSettlementReadyPayload,
  RoomSettlementSnapshot,
} from "./types";
import { capRoomMessages, capSettlementHistory } from "./roomProviderUtils";

export const useRoomSessionListsState = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [settlementHistory, setSettlementHistory] = useState<
    RoomSettlementSnapshot[]
  >([]);
  const [leaderboardSettlementReadyByRoundKey, setLeaderboardSettlementReadyByRoundKey] =
    useState<Record<string, LeaderboardSettlementReadyPayload>>({});

  const setMessagesWithCap = useCallback<
    Dispatch<SetStateAction<ChatMessage[]>>
  >((value) => {
    setMessages((previous) => {
      const next =
        typeof value === "function"
          ? (value as (prev: ChatMessage[]) => ChatMessage[])(previous)
          : value;
      return capRoomMessages(next);
    });
  }, []);

  const setSettlementHistoryWithCap = useCallback<
    Dispatch<SetStateAction<RoomSettlementSnapshot[]>>
  >((value) => {
    setSettlementHistory((previous) => {
      const next =
        typeof value === "function"
          ? (
              value as (
                prev: RoomSettlementSnapshot[],
              ) => RoomSettlementSnapshot[]
            )(previous)
          : value;
      return capSettlementHistory(next);
    });
  }, []);

  const mergeLeaderboardSettlementReady = useCallback(
    (payload: LeaderboardSettlementReadyPayload) => {
      setLeaderboardSettlementReadyByRoundKey((prev) => ({
        ...prev,
        [payload.roundKey]: payload,
      }));
    },
    [],
  );

  return {
    messages,
    setMessagesWithCap,
    settlementHistory,
    setSettlementHistoryWithCap,
    leaderboardSettlementReadyByRoundKey,
    mergeLeaderboardSettlementReady,
  };
};

export default useRoomSessionListsState;
