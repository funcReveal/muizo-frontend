import { useEffect, useMemo, useRef, useState } from "react";

import type { ChatMessage, PlaylistItem, RoomParticipant, RoomState } from "../../../model/types";
import type { SettlementQuestionRecap } from "../GameSettlementPanel";
import type { FrozenSettlementSnapshot } from "./gameRoomPageTypes";
import {
  cloneRoomForSettlement,
  cloneSettlementQuestionRecaps,
  deferStateUpdate,
} from "./gameRoomPageUtils";

type UseSettlementSnapshotParams = {
  room: RoomState["room"];
  participants: RoomParticipant[];
  messages: ChatMessage[];
  playlist: PlaylistItem[];
  trackOrder: number[];
  playedQuestionCount: number;
  startedAt: number;
  isEnded: boolean;
  questionRecaps: SettlementQuestionRecap[];
  serverOffsetMs: number;
};

const useSettlementSnapshot = ({
  room,
  participants,
  messages,
  playlist,
  trackOrder,
  playedQuestionCount,
  startedAt,
  isEnded,
  questionRecaps,
  serverOffsetMs,
}: UseSettlementSnapshotParams) => {
  const [endedSnapshot, setEndedSnapshot] = useState<FrozenSettlementSnapshot | null>(
    null,
  );
  const latestPayloadRef = useRef({
    room,
    participants,
    messages,
    playlist,
    trackOrder,
    playedQuestionCount,
    startedAt,
    serverOffsetMs,
  });

  const endedRoundKey = `${room.id}:${startedAt}`;

  useEffect(() => {
    latestPayloadRef.current = {
      room,
      participants,
      messages,
      playlist,
      trackOrder,
      playedQuestionCount,
      startedAt,
      serverOffsetMs,
    };
  }, [
    messages,
    participants,
    playedQuestionCount,
    playlist,
    room,
    serverOffsetMs,
    startedAt,
    trackOrder,
  ]);

  useEffect(() => {
    let cancelled = false;
    if (!isEnded) {
      deferStateUpdate(() => {
        if (cancelled) return;
        setEndedSnapshot(null);
      });
      return () => {
        cancelled = true;
      };
    }

    const normalizedRecaps = cloneSettlementQuestionRecaps(questionRecaps);
    deferStateUpdate(() => {
      if (cancelled) return;
      setEndedSnapshot((prev) => {
        if (!prev || prev.roundKey !== endedRoundKey) {
          const latestPayload = latestPayloadRef.current;
          return {
            roundKey: endedRoundKey,
            startedAt: latestPayload.startedAt,
            endedAt: Date.now() + latestPayload.serverOffsetMs,
            room: cloneRoomForSettlement(latestPayload.room),
            participants: latestPayload.participants.map((participant) => ({ ...participant })),
            messages: latestPayload.messages.map((message) => ({ ...message })),
            playlistItems: latestPayload.playlist.map((item) => ({ ...item })),
            trackOrder: [...latestPayload.trackOrder],
            playedQuestionCount: latestPayload.playedQuestionCount,
            questionRecaps: normalizedRecaps,
          };
        }
        if (prev.questionRecaps.length >= normalizedRecaps.length) {
          return prev;
        }
        return {
          ...prev,
          questionRecaps: normalizedRecaps,
        };
      });
    });

    return () => {
      cancelled = true;
    };
  }, [endedRoundKey, isEnded, questionRecaps]);

  const settlementSnapshot = useMemo(
    () =>
      endedSnapshot && endedSnapshot.roundKey === endedRoundKey
        ? endedSnapshot
        : null,
    [endedRoundKey, endedSnapshot],
  );

  return { settlementSnapshot };
};

export default useSettlementSnapshot;
