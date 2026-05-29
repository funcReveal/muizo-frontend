import { createContext, useContext } from "react";

import type { RoomSummary, RoomViewerAccess } from "./types";

export interface RoomDirectoryContextValue {
  rooms: RoomSummary[];
  viewerAccessByRoomId: Record<string, RoomViewerAccess>;
  fetchRooms: () => Promise<void>;
}

export const RoomDirectoryContext =
  createContext<RoomDirectoryContextValue | null>(null);
RoomDirectoryContext.displayName = "RoomDirectoryContext";

export const useRoomDirectory = (): RoomDirectoryContextValue => {
  const ctx = useContext(RoomDirectoryContext);
  if (!ctx)
    throw new Error("useRoomDirectory must be used within a RoomProvider");
  return ctx;
};
