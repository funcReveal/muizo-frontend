import { useEffect, type Dispatch, type SetStateAction } from "react";

import type { RoomState } from "./types";

type UseHostRoomPasswordCacheParams = {
  currentRoom: RoomState["room"] | null;
  readRoomPassword: (roomId: string) => string | null;
  saveRoomPassword: (roomId: string, password: string | null) => void;
  setHostRoomPassword: Dispatch<SetStateAction<string | null>>;
};

export function useHostRoomPasswordCache({
  currentRoom,
  readRoomPassword,
  saveRoomPassword,
  setHostRoomPassword,
}: UseHostRoomPasswordCacheParams) {
  useEffect(() => {
    if (!currentRoom?.id) {
      setHostRoomPassword(null);
      return;
    }
    const roomUsesPassword = currentRoom.hasPin ?? currentRoom.hasPassword;
    if (!roomUsesPassword) {
      saveRoomPassword(currentRoom.id, null);
      setHostRoomPassword(null);
      return;
    }
    const serverPassword = (
      currentRoom.pin ??
      currentRoom.password ??
      ""
    ).trim();
    const nextPassword = serverPassword || readRoomPassword(currentRoom.id);
    if (serverPassword) {
      saveRoomPassword(currentRoom.id, serverPassword);
    }
    setHostRoomPassword(nextPassword);
  }, [
    currentRoom?.hasPassword,
    currentRoom?.hasPin,
    currentRoom?.id,
    currentRoom?.password,
    currentRoom?.pin,
    readRoomPassword,
    saveRoomPassword,
    setHostRoomPassword,
  ]);
}
