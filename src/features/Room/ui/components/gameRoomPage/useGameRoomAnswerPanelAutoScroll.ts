import { useEffect, useRef } from "react";

type UseGameRoomAnswerPanelAutoScrollArgs = {
  answerPanelRef: React.RefObject<HTMLDivElement | null>;
  scrollTargetRef?: React.RefObject<HTMLDivElement | null>;
  initialScrollKey?: string | null;
  autoScrollKey?: string | null;
};

const useGameRoomAnswerPanelAutoScroll = ({
  answerPanelRef,
  scrollTargetRef,
  initialScrollKey,
  autoScrollKey,
}: UseGameRoomAnswerPanelAutoScrollArgs) => {
  const lastInitialScrollKeyRef = useRef<string | null>(null);
  const lastAutoScrollKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(max-width: 1023px)").matches) return;
    const nextKey =
      (autoScrollKey && autoScrollKey.trim()) ||
      (initialScrollKey && initialScrollKey.trim()) ||
      null;
    if (!nextKey) return;
    const isAutoScroll = Boolean(autoScrollKey && autoScrollKey.trim());
    if (isAutoScroll) {
      if (lastAutoScrollKeyRef.current === nextKey) return;
    } else if (lastInitialScrollKeyRef.current === nextKey) {
      return;
    }

    const isTargetMostlyVisible = (target: HTMLElement) => {
      const rect = target.getBoundingClientRect();
      const viewportHeight =
        window.innerHeight || document.documentElement.clientHeight;
      if (scrollTargetRef?.current === target) {
        return rect.top >= -4 && rect.top <= 12;
      }
      const visibleTop = Math.max(0, rect.top);
      const visibleBottom = Math.min(viewportHeight, rect.bottom);
      const visibleHeight = Math.max(0, visibleBottom - visibleTop);
      const requiredVisibleHeight = Math.min(
        rect.height * 0.45,
        viewportHeight * 0.45,
      );
      return visibleHeight >= requiredVisibleHeight;
    };

    let timerId: number | null = null;
    let rafId1: number | null = null;
    let rafId2: number | null = null;
    let cancelled = false;

    rafId1 = window.requestAnimationFrame(() => {
      rafId2 = window.requestAnimationFrame(() => {
        timerId = window.setTimeout(() => {
          if (cancelled) return;
          const target = scrollTargetRef?.current ?? answerPanelRef.current;
          if (!target) return;
          if (!isTargetMostlyVisible(target)) {
            target.scrollIntoView({
              behavior: "auto",
              block: "start",
              inline: "nearest",
            });
          }
          if (isAutoScroll) {
            lastAutoScrollKeyRef.current = nextKey;
            return;
          }
          lastInitialScrollKeyRef.current = nextKey;
        }, 90);
      });
    });

    return () => {
      cancelled = true;
      if (timerId !== null) {
        window.clearTimeout(timerId);
      }
      if (rafId1 !== null) {
        window.cancelAnimationFrame(rafId1);
      }
      if (rafId2 !== null) {
        window.cancelAnimationFrame(rafId2);
      }
    };
  }, [answerPanelRef, autoScrollKey, initialScrollKey, scrollTargetRef]);
};

export default useGameRoomAnswerPanelAutoScroll;
