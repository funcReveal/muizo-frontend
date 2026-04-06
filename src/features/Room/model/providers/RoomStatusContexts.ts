import { createContext, useContext } from "react";

import type { RoomKickedNotice } from "../RoomSessionContext";

export interface StatusWriteContextValue {
  setStatusText: (value: string | null) => void;
  setKickedNotice: (value: RoomKickedNotice | null) => void;
}

export const StatusWriteContext = createContext<StatusWriteContextValue | null>(
  null,
);

export const useStatusWrite = (): StatusWriteContextValue => {
  const ctx = useContext(StatusWriteContext);
  if (!ctx) {
    throw new Error("useStatusWrite must be used within RoomStatusSubProvider");
  }
  return ctx;
};

export interface StatusReadContextValue {
  statusText: string | null;
  kickedNotice: RoomKickedNotice | null;
}

export const StatusReadContext = createContext<StatusReadContextValue | null>(
  null,
);

export const useStatusRead = (): StatusReadContextValue => {
  const ctx = useContext(StatusReadContext);
  if (!ctx) {
    throw new Error("useStatusRead must be used within RoomStatusSubProvider");
  }
  return ctx;
};
