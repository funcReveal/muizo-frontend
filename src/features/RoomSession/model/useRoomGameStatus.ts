import { useContext } from "react";

import { RoomGameStatusContext } from "./RoomContext";

export const useRoomGameStatus = () => {
  const ctx = useContext(RoomGameStatusContext);
  if (!ctx) {
    throw new Error("useRoomGameStatus must be used within a RoomProvider");
  }
  return ctx;
};
