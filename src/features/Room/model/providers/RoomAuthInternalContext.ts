import { createContext, useContext, type MutableRefObject } from "react";

export interface RoomAuthInternalContextValue {
  confirmNicknameRef: MutableRefObject<() => Promise<boolean>>;
  activeUsername: string | null;
  getDefaultRoomName: (username: string | null) => string;
  lockSessionClientId: (nextClientId: string) => void;
  resetSessionClientId: () => void;
  persistUsername: (name: string) => void;
  previousUsernameRef: MutableRefObject<string | null>;
}

export const RoomAuthInternalContext =
  createContext<RoomAuthInternalContextValue | null>(null);

export const useRoomAuthInternal = (): RoomAuthInternalContextValue => {
  const ctx = useContext(RoomAuthInternalContext);
  if (!ctx) {
    throw new Error(
      "useRoomAuthInternal must be used within RoomAuthSubProvider",
    );
  }
  return ctx;
};
