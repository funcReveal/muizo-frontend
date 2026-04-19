import {
  useCallback,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import type {
  RoomClosedNotice,
  RoomKickedNotice,
} from "./RoomSessionContext";
import {
  clearRoomPassword,
  clearStoredRoomId,
  clearStoredRoomSessionToken,
  getRoomPassword,
  getStoredRoomId,
  getStoredRoomSessionToken,
  setRoomPassword,
  setStoredRoomId,
  setStoredRoomSessionToken,
} from "./roomStorage";

type UseRoomSessionPersistenceParams = {
  setClosedRoomNotice: Dispatch<SetStateAction<RoomClosedNotice | null>>;
  setKickedNotice: Dispatch<SetStateAction<RoomKickedNotice | null>>;
  setRouteRoomResolved: Dispatch<SetStateAction<boolean>>;
};

export function useRoomSessionPersistence({
  setClosedRoomNotice,
  setKickedNotice,
  setRouteRoomResolved,
}: UseRoomSessionPersistenceParams) {
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(() =>
    getStoredRoomId(),
  );
  const currentRoomIdRef = useRef<string | null>(getStoredRoomId());
  const roomSessionTokenRef = useRef<string | null>(
    getStoredRoomSessionToken(),
  );

  const persistRoomSessionToken = useCallback((token: string | null) => {
    roomSessionTokenRef.current = token;
    if (token) {
      setStoredRoomSessionToken(token);
    } else {
      clearStoredRoomSessionToken();
    }
  }, []);

  const persistRoomId = useCallback((id: string | null) => {
    currentRoomIdRef.current = id;
    setCurrentRoomId(id);
    if (id) {
      setStoredRoomId(id);
    } else {
      clearStoredRoomId();
    }
  }, []);

  const saveRoomPassword = useCallback(
    (roomId: string, password: string | null) => {
      if (password) {
        setRoomPassword(roomId, password);
      } else {
        clearRoomPassword(roomId);
      }
    },
    [],
  );

  const readRoomPassword = useCallback(
    (roomId: string) => getRoomPassword(roomId),
    [],
  );

  const setRouteRoomId = useCallback(
    (value: string | null) => {
      currentRoomIdRef.current = value;
      setCurrentRoomId(value);
      setKickedNotice((previous) => {
        if (!previous) return previous;
        if (!value) return null;
        return previous.roomId === value ? previous : null;
      });
      setClosedRoomNotice((previous) => {
        if (!previous) return previous;
        if (!value) return null;
        return previous.roomId === value ? previous : null;
      });
      if (value) {
        setRouteRoomResolved(false);
      }
    },
    [setClosedRoomNotice, setKickedNotice, setRouteRoomResolved],
  );

  return {
    currentRoomId,
    currentRoomIdRef,
    persistRoomId,
    persistRoomSessionToken,
    readRoomPassword,
    roomSessionTokenRef,
    saveRoomPassword,
    setRouteRoomId,
  };
}
