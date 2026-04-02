import { useContext } from "react";

import { RoomUiContext } from "./RoomContext";

export const useRoomUi = () => {
  const ctx = useContext(RoomUiContext);
  if (!ctx) {
    throw new Error("useRoomUi must be used within a RoomProvider");
  }
  return ctx;
};
