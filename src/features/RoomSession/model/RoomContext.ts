import { createContext } from "react";

import type { AuthUser } from "../../../shared/auth/AuthContext";
import type { ChatMessage, GameState, RoomState } from "./types";
import type { RoomStatusOptions } from "./providers/RoomStatusContexts";

export type { AuthUser } from "../../../shared/auth/AuthContext";
export type { RoomCreateSourceMode } from "./RoomCreateContext";
export type { RoomKickedNotice } from "./RoomSessionContext";

export type RoomUiContextValue = {
  authUser: AuthUser | null;
  setStatusText: (value: string | null, options?: RoomStatusOptions) => void;
};

export type RoomRealtimeContextValue = {
  currentRoom: RoomState["room"] | null;
  messages: ChatMessage[];
  clientId: string;
  gameStatus: GameState["status"] | null;
};

export type RoomGameStatusContextValue = {
  gameStatus: GameState["status"] | null;
};

export const RoomUiContext = createContext<RoomUiContextValue | null>(null);
export const RoomRealtimeContext =
  createContext<RoomRealtimeContextValue | null>(null);
export const RoomGameStatusContext =
  createContext<RoomGameStatusContextValue | null>(null);
