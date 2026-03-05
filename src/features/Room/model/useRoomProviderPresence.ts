import { useCallback, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from "react";

import type { ChatMessage, RoomParticipant } from "./types";

interface UseRoomProviderPresenceParams {
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  serverOffsetRef: MutableRefObject<number>;
}

export const useRoomProviderPresence = ({
  setMessages,
  serverOffsetRef,
}: UseRoomProviderPresenceParams) => {
  const presenceParticipantNamesRef = useRef<Map<string, string>>(new Map());
  const presenceSeededRoomIdRef = useRef<string | null>(null);

  const resetPresenceParticipants = useCallback(() => {
    presenceParticipantNamesRef.current = new Map();
    presenceSeededRoomIdRef.current = null;
  }, []);

  const seedPresenceParticipants = useCallback(
    (roomId: string | null | undefined, nextParticipants: RoomParticipant[]) => {
      if (!roomId) {
        resetPresenceParticipants();
        return;
      }
      presenceParticipantNamesRef.current = new Map(
        nextParticipants.map((participant) => [
          participant.clientId,
          participant.username?.trim() || "玩家",
        ]),
      );
      presenceSeededRoomIdRef.current = roomId;
    },
    [resetPresenceParticipants],
  );

  const appendPresenceSystemMessage = useCallback(
    (roomId: string, playerName: string, action: "joined" | "left") => {
      const safeName = playerName.trim();
      if (!safeName) return;
      const timestamp = Date.now() + serverOffsetRef.current;
      const content =
        action === "joined" ? `${safeName} 已加入房間` : `${safeName} 已離開房間`;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (
          last &&
          last.userId === "system:presence" &&
          last.content === content &&
          Math.abs((last.timestamp ?? 0) - timestamp) <= 1500
        ) {
          return prev;
        }
        return [
          ...prev,
          {
            id:
              crypto.randomUUID?.() ??
              `presence-${action}-${roomId}-${timestamp}-${Math.random()
                .toString(16)
                .slice(2, 8)}`,
            roomId,
            userId: "system:presence",
            username: "系統",
            content,
            timestamp,
          },
        ];
      });
    },
    [serverOffsetRef, setMessages],
  );

  const mergeCachedParticipantPing = useCallback(
    (nextParticipants: RoomParticipant[], previousParticipants: RoomParticipant[]) =>
      nextParticipants.map((participant) => {
        if (typeof participant.pingMs === "number") {
          return participant;
        }
        const cachedPing = previousParticipants.find(
          (prev) => prev.clientId === participant.clientId,
        )?.pingMs;
        return typeof cachedPing === "number"
          ? { ...participant, pingMs: cachedPing }
          : participant;
      }),
    [],
  );

  return {
    presenceParticipantNamesRef,
    presenceSeededRoomIdRef,
    resetPresenceParticipants,
    seedPresenceParticipants,
    appendPresenceSystemMessage,
    mergeCachedParticipantPing,
  };
};

export default useRoomProviderPresence;
