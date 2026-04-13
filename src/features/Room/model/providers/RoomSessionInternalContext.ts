import {
  createContext,
  useContext,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";

import type {
  ChatMessage,
  ClientSocket,
  GameLiveUpdatePayload,
  GameState,
  PlaylistItem,
  RoomParticipant,
  RoomSettlementSnapshot,
  RoomState,
  RoomSummary,
} from "../types";

export interface RoomSessionInternalContextValue {
  getSocket: () => ClientSocket | null;
  syncServerOffset: (serverNow: number) => void;
  lockSessionClientId: (nextClientId: string) => void;
  persistRoomId: (id: string | null) => void;
  persistRoomSessionToken: (token: string | null) => void;
  saveRoomPassword: (roomId: string, password: string | null) => void;
  seedPresenceParticipants: (
    roomId: string | null | undefined,
    nextParticipants: RoomParticipant[],
  ) => void;
  mergeCachedParticipantPing: (
    nextParticipants: RoomParticipant[],
    previousParticipants: RoomParticipant[],
  ) => RoomParticipant[];
  fetchPlaylistPage: (
    roomId: string,
    page: number,
    pageSize?: number,
    opts?: { reset?: boolean },
  ) => void;
  currentRoomIdRef: RefObject<string | null>;
  createRoomInFlightRef: RefObject<boolean>;
  releaseCreateRoomLockRef: RefObject<(() => void) | null>;
  setCurrentRoom: Dispatch<SetStateAction<RoomState["room"] | null>>;
  setParticipants: Dispatch<SetStateAction<RoomParticipant[]>>;
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  setSettlementHistory: Dispatch<SetStateAction<RoomSettlementSnapshot[]>>;
  setPlaylistProgress: Dispatch<
    SetStateAction<{ received: number; total: number; ready: boolean }>
  >;
  setGameState: Dispatch<SetStateAction<GameState | null>>;
  resetGameSyncVersion: () => void;
  setIsGameView: Dispatch<SetStateAction<boolean>>;
  setGamePlaylist: Dispatch<SetStateAction<PlaylistItem[]>>;
  setRooms: Dispatch<SetStateAction<RoomSummary[]>>;
  setHostRoomPassword: Dispatch<SetStateAction<string | null>>;
  setRouteRoomResolved: Dispatch<SetStateAction<boolean>>;
  joinPasswordInput: string;
  setJoinPasswordInput: Dispatch<SetStateAction<string>>;
  handleJoinRoom: (
    roomReference: string,
    hasPin: boolean,
    pinOverride?: string,
  ) => void;
  resetGameSettingsDefaults: () => void;
  applyGameLiveUpdate: (payload: GameLiveUpdatePayload) => boolean;
}

export const RoomSessionInternalContext =
  createContext<RoomSessionInternalContextValue | null>(null);

export const useRoomSessionInternal = (): RoomSessionInternalContextValue => {
  const ctx = useContext(RoomSessionInternalContext);
  if (!ctx) {
    throw new Error(
      "useRoomSessionInternal must be used within RoomSessionCoreProvider",
    );
  }
  return ctx;
};
