import {
  createContext,
  useContext,
  type Dispatch,
  type SetStateAction,
} from "react";

import type {
  ChatMessage,
  RoomParticipant,
  RoomSettlementHistorySummary,
  RoomSettlementSnapshot,
  RoomState,
  RoomSummary,
  SessionProgressPayload,
} from "./types";

export type RoomKickedNotice = {
  roomId: string;
  reason: string;
  bannedUntil: number | null;
  kickedAt: number;
};

export interface RoomSessionContextValue {
  // 房間狀態
  currentRoom: RoomState["room"] | null;
  currentRoomId: string | null;
  participants: RoomParticipant[];
  messages: ChatMessage[];
  settlementHistory: RoomSettlementSnapshot[];
  // UI 狀態
  statusText: string | null;
  setStatusText: (value: string | null) => void;
  kickedNotice: RoomKickedNotice | null;
  setKickedNotice: Dispatch<SetStateAction<RoomKickedNotice | null>>;
  sessionProgress: SessionProgressPayload | null;
  // 連線
  isConnected: boolean;
  isRecoveringConnection: boolean;
  recoveryStatusText: string | null;
  serverOffsetMs: number;
  syncServerOffset: (serverNow: number) => void;
  hostRoomPassword: string | null;
  // 房間列表
  rooms: RoomSummary[];
  fetchRooms: () => Promise<void>;
  fetchRoomById: (roomId: string) => Promise<RoomSummary | null>;
  // 邀請 / 路由
  inviteRoomId: string | null;
  inviteNotFound: boolean;
  isInviteMode: boolean;
  setInviteRoomId: (value: string | null) => void;
  routeRoomResolved: boolean;
  setRouteRoomId: (value: string | null) => void;
  // 房間操作
  handleLeaveRoom: (onLeft?: () => void) => void;
  handleKickPlayer: (
    targetClientId: string,
    durationMs?: number | null,
  ) => void;
  handleTransferHost: (targetClientId: string) => void;
  // 結算歷史
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

export const useRoomSession = (): RoomSessionContextValue => {
  const ctx = useContext(RoomSessionContext);
  if (!ctx)
    throw new Error("useRoomSession must be used within a RoomProvider");
  return ctx;
};
