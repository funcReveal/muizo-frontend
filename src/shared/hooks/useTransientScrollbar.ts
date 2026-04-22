import { useCallback, useEffect, useRef, useState } from "react";

type UseTransientScrollbarOptions = {
  hideDelayMs?: number;
};

export const useTransientScrollbar = (
  options: UseTransientScrollbarOptions = {},
) => {
  const { hideDelayMs = 720 } = options;
  const [isScrollbarVisible, setIsScrollbarVisible] = useState(false);
  const hideTimerRef = useRef<number | null>(null);

  const revealScrollbar = useCallback(() => {
    setIsScrollbarVisible(true);
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
    }
    hideTimerRef.current = window.setTimeout(() => {
      setIsScrollbarVisible(false);
      hideTimerRef.current = null;
    }, hideDelayMs);
  }, [hideDelayMs]);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  return {
    isScrollbarVisible,
    revealScrollbar,
    transientScrollbarClassName: isScrollbarVisible ? "is-scrolling" : "",
  };
};
