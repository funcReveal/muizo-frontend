import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ChatMessage } from "../../Room/model/types";
import type { DanmuItem } from "./gameRoomTypes";
import {
  DANMU_LANE_COUNT,
  deferStateUpdate,
  isDanmuCandidateMessage,
  isMobileDevice,
  toDanmuText,
} from "./gameRoomUtils";

const DANMU_ENABLED_STORAGE_KEY = "danmu_enabled";
const DANMU_MAX_VISIBLE_ITEMS = 24;
const DANMU_MOBILE_MAX_VISIBLE_ITEMS = 12;
const DANMU_BATCH_SIZE = 4;
const DANMU_MAX_SEEN_MESSAGE_IDS = 1200;
const DANMU_MAX_TIMER_COUNT = 160;
const DANMU_MOBILE_MAX_TIMER_COUNT = 80;
const DANMU_BASE_DURATION_MS = 15600;
const DANMU_MOBILE_BASE_DURATION_MS = 7800;
const DANMU_LANE_DURATION_STEP_MS = 1200;
const DANMU_MOBILE_LANE_DURATION_STEP_MS = 600;
const DANMU_ORDER_DURATION_STEP_MS = 260;
const DANMU_MOBILE_ORDER_DURATION_STEP_MS = 130;

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
  const isMobileDanmu = useMemo(() => isMobileDevice(), []);
  const maxVisibleItems = isMobileDanmu
    ? DANMU_MOBILE_MAX_VISIBLE_ITEMS
    : DANMU_MAX_VISIBLE_ITEMS;
  const maxTimerCount = isMobileDanmu
    ? DANMU_MOBILE_MAX_TIMER_COUNT
    : DANMU_MAX_TIMER_COUNT;
  const baseDurationMs = isMobileDanmu
    ? DANMU_MOBILE_BASE_DURATION_MS
    : DANMU_BASE_DURATION_MS;
  const laneDurationStepMs = isMobileDanmu
    ? DANMU_MOBILE_LANE_DURATION_STEP_MS
    : DANMU_LANE_DURATION_STEP_MS;
  const orderDurationStepMs = isMobileDanmu
    ? DANMU_MOBILE_ORDER_DURATION_STEP_MS
    : DANMU_ORDER_DURATION_STEP_MS;

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
    const pruneSeenMessageIds = () => {
      const seenIds = danmuSeenMessageIdsRef.current;
      const overflow = seenIds.size - DANMU_MAX_SEEN_MESSAGE_IDS;
      if (overflow <= 0) return;
      let removed = 0;
      for (const id of seenIds) {
        seenIds.delete(id);
        removed += 1;
        if (removed >= overflow) break;
      }
    };
    const unseenMessages: ChatMessage[] = [];
    for (let idx = messages.length - 1; idx >= 0; idx -= 1) {
      const message = messages[idx];
      if (danmuSeenMessageIdsRef.current.has(message.id)) break;
      danmuSeenMessageIdsRef.current.add(message.id);
      pruneSeenMessageIds();
      if (!isDanmuCandidateMessage(message)) {
        continue;
      }
      unseenMessages.push(message);
      if (unseenMessages.length >= DANMU_BATCH_SIZE) break;
    }
    if (unseenMessages.length === 0) return;

    const newItems: DanmuItem[] = unseenMessages.reverse().map((message, orderIdx) => {
      const lane = danmuLaneCursorRef.current % DANMU_LANE_COUNT;
      danmuLaneCursorRef.current += 1;
      const durationMs =
        baseDurationMs + (lane % 3) * laneDurationStepMs + orderIdx * orderDurationStepMs;
      const itemId = `${message.id}-${Date.now()}-${orderIdx}`;
      return { id: itemId, text: toDanmuText(message), lane, durationMs };
    });

    // One state update for all new items instead of one per item
    setDanmuItems((prev) => [...prev, ...newItems].slice(-maxVisibleItems));

    newItems.forEach((newItem) => {
      const { id: itemId, durationMs } = newItem;
      const timerId = window.setTimeout(() => {
        setDanmuItems((prev) => prev.filter((item) => item.id !== itemId));
        danmuTimersRef.current = danmuTimersRef.current.filter(
          (registeredTimerId) => registeredTimerId !== timerId,
        );
      }, durationMs + 320);
      if (danmuTimersRef.current.length >= maxTimerCount) {
        const staleTimerId = danmuTimersRef.current.shift();
        if (typeof staleTimerId === "number") {
          window.clearTimeout(staleTimerId);
        }
      }
      danmuTimersRef.current.push(timerId);
    });
  }, [
    baseDurationMs,
    danmuEnabled,
    laneDurationStepMs,
    maxTimerCount,
    maxVisibleItems,
    messages,
    orderDurationStepMs,
  ]);

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
