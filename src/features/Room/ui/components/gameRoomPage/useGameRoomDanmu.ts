import { useCallback, useEffect, useRef, useState } from "react";

import type { ChatMessage } from "../../../model/types";
import type { DanmuItem } from "./gameRoomPageTypes";
import {
  DANMU_LANE_COUNT,
  deferStateUpdate,
  isDanmuCandidateMessage,
  toDanmuText,
} from "./gameRoomPageUtils";

const DANMU_ENABLED_STORAGE_KEY = "mq_danmu_enabled";
const DANMU_MAX_VISIBLE_ITEMS = 24;
const DANMU_BATCH_SIZE = 4;

type UseGameRoomDanmuArgs = {
  roomId: string;
  messages: ChatMessage[];
};

const readInitialDanmuEnabled = () => {
  if (typeof window === "undefined") return true;
  const stored = window.localStorage.getItem(DANMU_ENABLED_STORAGE_KEY);
  if (stored === "1") return true;
  if (stored === "0") return false;
  return true;
};

const useGameRoomDanmu = ({ roomId, messages }: UseGameRoomDanmuArgs) => {
  const [danmuEnabled, setDanmuEnabled] = useState(readInitialDanmuEnabled);
  const [danmuItems, setDanmuItems] = useState<DanmuItem[]>([]);
  const danmuSeenMessageIdsRef = useRef<Set<string>>(new Set());
  const danmuLaneCursorRef = useRef(0);
  const danmuTimersRef = useRef<number[]>([]);

  const clearDanmuTimers = useCallback(() => {
    if (typeof window === "undefined") return;
    danmuTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    danmuTimersRef.current = [];
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      DANMU_ENABLED_STORAGE_KEY,
      danmuEnabled ? "1" : "0",
    );
  }, [danmuEnabled]);

  useEffect(() => {
    if (danmuEnabled) return;
    clearDanmuTimers();
    deferStateUpdate(() => {
      setDanmuItems([]);
    });
  }, [clearDanmuTimers, danmuEnabled]);

  useEffect(() => {
    danmuSeenMessageIdsRef.current.clear();
    danmuLaneCursorRef.current = 0;
    clearDanmuTimers();
    deferStateUpdate(() => {
      setDanmuItems([]);
    });
  }, [clearDanmuTimers, roomId]);

  useEffect(() => {
    if (!danmuEnabled || messages.length === 0 || typeof window === "undefined") {
      return;
    }
    const unseenMessages: ChatMessage[] = [];
    for (let idx = messages.length - 1; idx >= 0; idx -= 1) {
      const message = messages[idx];
      if (danmuSeenMessageIdsRef.current.has(message.id)) break;
      danmuSeenMessageIdsRef.current.add(message.id);
      if (!isDanmuCandidateMessage(message)) {
        continue;
      }
      unseenMessages.push(message);
      if (unseenMessages.length >= DANMU_BATCH_SIZE) break;
    }
    if (unseenMessages.length === 0) return;

    unseenMessages.reverse().forEach((message, orderIdx) => {
      const lane = danmuLaneCursorRef.current % DANMU_LANE_COUNT;
      danmuLaneCursorRef.current += 1;
      const durationMs = 11800 + (lane % 3) * 900 + orderIdx * 180;
      const itemId = `${message.id}-${Date.now()}-${orderIdx}`;
      const nextItem: DanmuItem = {
        id: itemId,
        text: toDanmuText(message),
        lane,
        durationMs,
      };
      setDanmuItems((prev) => [...prev.slice(-DANMU_MAX_VISIBLE_ITEMS), nextItem]);
      const timerId = window.setTimeout(() => {
        setDanmuItems((prev) => prev.filter((item) => item.id !== itemId));
      }, durationMs + 320);
      danmuTimersRef.current.push(timerId);
    });
  }, [danmuEnabled, messages]);

  useEffect(
    () => () => {
      clearDanmuTimers();
    },
    [clearDanmuTimers],
  );

  return {
    danmuEnabled,
    setDanmuEnabled,
    danmuItems,
  };
};

export default useGameRoomDanmu;
