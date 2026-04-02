import { useContext } from "react";

import { RoomRealtimeContext } from "./RoomContext";

export const useRoomRealtime = () => {
  const ctx = useContext(RoomRealtimeContext);
  if (!ctx) {
    throw new Error("useRoomRealtime must be used within a RoomProvider");
  }
  return ctx;
};
