import { useEffect, useRef } from "react";

import type { GameState } from "../../../model/types";

type UseGameRoomAnswerPanelAutoScrollArgs = {
  roomId: string;
  gameStatus: GameState["status"];
  gameStartedAt: number;
  answerPanelRef: React.RefObject<HTMLDivElement | null>;
};

const useGameRoomAnswerPanelAutoScroll = ({
  roomId,
  gameStatus,
  gameStartedAt,
  answerPanelRef,
}: UseGameRoomAnswerPanelAutoScrollArgs) => {
  const lastAutoScrollKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(max-width: 1023px)").matches) return;
    if (gameStatus !== "playing") return;
    const nextKey = `${roomId}:${gameStartedAt}`;
    if (lastAutoScrollKeyRef.current === nextKey) return;

    const isTargetMostlyVisible = (target: HTMLElement) => {
      const rect = target.getBoundingClientRect();
      const viewportHeight =
        window.innerHeight || document.documentElement.clientHeight;
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
          const target = answerPanelRef.current;
          if (!target) return;
          if (!isTargetMostlyVisible(target)) {
            target.scrollIntoView({
              behavior: "smooth",
              block: "start",
              inline: "nearest",
            });
          }
          lastAutoScrollKeyRef.current = nextKey;
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
  }, [answerPanelRef, gameStartedAt, gameStatus, roomId]);
};

export default useGameRoomAnswerPanelAutoScroll;
