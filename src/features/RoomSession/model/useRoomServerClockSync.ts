import { useCallback, useRef, useState } from "react";

export function useRoomServerClockSync() {
  const serverOffsetRef = useRef(0);
  const [serverOffsetMs, setServerOffsetMs] = useState(0);

  const syncServerOffset = useCallback((serverNow: number) => {
    const offset = serverNow - Date.now();
    serverOffsetRef.current = offset;
    setServerOffsetMs(offset);
  }, []);

  return {
    serverOffsetMs,
    serverOffsetRef,
    setServerOffsetMs,
    syncServerOffset,
  };
}
