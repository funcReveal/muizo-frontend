import { useEffect, useMemo, useState } from "react";

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

  const endedRoundKey = `${room.id}:${startedAt}`;

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
          return {
            roundKey: endedRoundKey,
            startedAt,
            endedAt: Date.now() + serverOffsetMs,
            room: cloneRoomForSettlement(room),
            participants: participants.map((participant) => ({ ...participant })),
            messages: messages.map((message) => ({ ...message })),
            playlistItems: playlist.map((item) => ({ ...item })),
            trackOrder: [...trackOrder],
            playedQuestionCount,
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
  }, [
    endedRoundKey,
    isEnded,
    messages,
    participants,
    playedQuestionCount,
    playlist,
    questionRecaps,
    room,
    serverOffsetMs,
    startedAt,
    trackOrder,
  ]);

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
