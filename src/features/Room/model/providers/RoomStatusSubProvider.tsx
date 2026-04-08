import { useCallback, useMemo, useState, type ReactNode } from "react";

import type { RoomKickedNotice } from "../RoomSessionContext";
import { sanitizePossibleGarbledText } from "../../../../shared/utils/text";
import {
  StatusReadContext,
  StatusWriteContext,
  type StatusReadContextValue,
  type StatusWriteContextValue,
} from "./RoomStatusContexts";

export const RoomStatusSubProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [statusText, setStatusTextState] = useState<string | null>(null);
  const [kickedNotice, setKickedNotice] = useState<RoomKickedNotice | null>(
    null,
  );

  const setStatusText = useCallback((value: string | null) => {
    if (typeof value !== "string") {
      setStatusTextState(value);
      return;
    }
    setStatusTextState(sanitizePossibleGarbledText(value, "狀態已更新"));
  }, []);

  const writeValue = useMemo<StatusWriteContextValue>(
    () => ({ setStatusText, setKickedNotice }),
    [setKickedNotice, setStatusText],
  );

  const readValue = useMemo<StatusReadContextValue>(
    () => ({ statusText, kickedNotice }),
    [kickedNotice, statusText],
  );

  return (
    <StatusWriteContext.Provider value={writeValue}>
      <StatusReadContext.Provider value={readValue}>
        {children}
      </StatusReadContext.Provider>
    </StatusWriteContext.Provider>
  );
};
