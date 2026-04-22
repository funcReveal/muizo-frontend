import { createContext, useContext } from "react";

export type RoomCreateSourceMode =
  | "link"
  | "youtube"
  | "publicCollection"
  | "privateCollection";

export type CreateRoomOptions = {
  leaderboardProfileKey?: string | null;
};

export interface RoomCreateContextValue {
  // 建立房間表單
  roomNameInput: string;
  setRoomNameInput: (value: string) => void;
  roomVisibilityInput: "public" | "private";
  setRoomVisibilityInput: (value: "public" | "private") => void;
  roomCreateSourceMode: RoomCreateSourceMode;
  setRoomCreateSourceMode: (value: RoomCreateSourceMode) => void;
  roomPasswordInput: string;
  setRoomPasswordInput: (value: string) => void;
  roomMaxPlayersInput: string;
  setRoomMaxPlayersInput: (value: string) => void;
  // 加入房間
  joinPasswordInput: string;
  setJoinPasswordInput: (value: string) => void;
  // 操作
  isCreatingRoom: boolean;
  handleCreateRoom: (options?: CreateRoomOptions) => Promise<void>;
  handleJoinRoom: (
    roomReference: string,
    hasPin: boolean,
    pinOverride?: string,
  ) => void;
  resetCreateState: () => void;
}

export const RoomCreateContext =
  createContext<RoomCreateContextValue | null>(null);

export const useRoomCreate = (): RoomCreateContextValue => {
  const ctx = useContext(RoomCreateContext);
  if (!ctx)
    throw new Error("useRoomCreate must be used within a RoomProvider");
  return ctx;
};
