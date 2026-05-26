import {
  createContext,
  useContext,
  type Dispatch,
  type SetStateAction,
} from "react";

import type {
  LeaderboardSettlementReadyPayload,
  RoomLookupResult,
  RoomParticipant,
  RoomSettlementHistorySummary,
  RoomSettlementSnapshot,
  RoomState,
  SessionProgressPayload,
} from "./types";
import type {
  RoomStatusNotification,
  RoomStatusOptions,
} from "./providers/RoomStatusContexts";

export type RoomKickedNotice = {
  roomId: string;
  reason: string;
  bannedUntil: number | null;
  kickedAt: number;
};

export type RoomClosedNotice = {
  roomId: string;
  kind: "closed" | "left";
  reason: string;
  closedAt: number;
};

export interface RoomSessionContextValue {
  currentRoom: RoomState["room"] | null;
  currentRoomId: string | null;
  participants: RoomParticipant[];
  settlementHistory: RoomSettlementSnapshot[];
  statusText: string | null;
  setStatusText: (value: string | null, options?: RoomStatusOptions) => void;
  statusNotification: RoomStatusNotification | null;
  kickedNotice: RoomKickedNotice | null;
  setKickedNotice: Dispatch<SetStateAction<RoomKickedNotice | null>>;
  closedRoomNotice: RoomClosedNotice | null;
  sessionProgress: SessionProgressPayload | null;
  isConnected: boolean;
  isRecoveringConnection: boolean;
  recoveryStatusText: string | null;
  serverOffsetMs: number;
  syncServerOffset: (serverNow: number) => void;
  hostRoomPassword: string | null;
  fetchRoomById: (roomId: string) => Promise<RoomLookupResult>;
  inviteRoomId: string | null;
  inviteNotFound: boolean;
  isInviteMode: boolean;
  setInviteRoomId: (value: string | null) => void;
  routeRoomResolved: boolean;
  setRouteRoomId: (value: string | null) => void;
  handleLeaveRoom: (onLeft?: () => void) => void;
  handleKickPlayer: (
    targetClientId: string,
    durationMs?: number | null,
  ) => void;
  handleTransferHost: (targetClientId: string) => void;
  leaderboardSettlementReadyByRoundKey: Record<
    string,
    LeaderboardSettlementReadyPayload
  >;
  fetchSettlementHistorySummaries: (options?: {
    limit?: number;
    beforeEndedAt?: number | null;
  }) => Promise<{
    items: RoomSettlementHistorySummary[];
    nextCursor: number | null;
  }>;
  fetchSettlementReplay: (matchId: string) => Promise<RoomSettlementSnapshot>;
}

export const RoomSessionContext = createContext<RoomSessionContextValue | null>(
  null,
);
RoomSessionContext.displayName = "RoomSessionContext";

export const useRoomSession = (): RoomSessionContextValue => {
  const ctx = useContext(RoomSessionContext);
  if (!ctx) {
    throw new Error("useRoomSession must be used within a RoomProvider");
  }
  return ctx;
};
