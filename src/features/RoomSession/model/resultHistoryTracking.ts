import { useCallback, useRef } from "react";

import type { ClientSocket } from "./types";
import { useRoomSessionInternal } from "./providers/RoomSessionInternalContext";
import type { TrackResultHistoryEventPayload } from "./socketEvents";

type EmitSocket = Pick<ClientSocket, "emit">;

const RESULT_HISTORY_EVENTS = new Set<TrackResultHistoryEventPayload["eventName"]>([
  "result.page.viewed",
  "result.page.revisited",
  "match_history.opened",
  "match_history.result.opened",
]);
const RESULT_HISTORY_SOURCES = new Set([
  "post_game",
  "profile",
  "lobby",
  "history_page",
  "share_link",
]);
const RESULT_HISTORY_ENTRY_POINTS = new Set([
  "auto_result",
  "result_button",
  "history_list",
  "profile_recent_match",
  "shared_result_link",
]);
const RESULT_HISTORY_VIEW_TYPES = new Set([
  "summary",
  "question_review",
  "scoreboard",
  "full_result",
]);

const normalizeShortText = (value: unknown, maxLength: number) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : undefined;
};

export const buildResultHistoryTrackingKey = (
  payload: TrackResultHistoryEventPayload,
) =>
  [
    payload.eventName,
    payload.matchId ?? payload.roomId ?? "no-target",
    payload.viewType ?? "no-view",
    payload.entryPoint ?? "no-entry",
  ].join(":");

export const sanitizeResultHistoryPayload = (
  payload: TrackResultHistoryEventPayload,
): TrackResultHistoryEventPayload | null => {
  if (!RESULT_HISTORY_EVENTS.has(payload.eventName)) return null;

  const sanitized: TrackResultHistoryEventPayload = {
    eventName: payload.eventName,
  };
  const roomId = normalizeShortText(payload.roomId, 240);
  const matchId = normalizeShortText(payload.matchId, 80);

  if (roomId) sanitized.roomId = roomId;
  if (matchId) sanitized.matchId = matchId;
  if (
    typeof payload.source === "string" &&
    RESULT_HISTORY_SOURCES.has(payload.source)
  ) {
    sanitized.source = payload.source;
  }
  if (
    typeof payload.entryPoint === "string" &&
    RESULT_HISTORY_ENTRY_POINTS.has(payload.entryPoint)
  ) {
    sanitized.entryPoint = payload.entryPoint;
  }
  if (
    typeof payload.viewType === "string" &&
    RESULT_HISTORY_VIEW_TYPES.has(payload.viewType)
  ) {
    sanitized.viewType = payload.viewType;
  }
  if (typeof payload.isRevisit === "boolean") {
    sanitized.isRevisit = payload.isRevisit;
  }
  if (
    typeof payload.questionIndex === "number" &&
    Number.isFinite(payload.questionIndex) &&
    payload.questionIndex >= 0
  ) {
    sanitized.questionIndex = Math.floor(payload.questionIndex);
  }

  return sanitized;
};

export const emitResultHistoryEvent = (
  socket: EmitSocket | null | undefined,
  payload: TrackResultHistoryEventPayload,
): void => {
  if (!socket) return;
  const sanitized = sanitizeResultHistoryPayload(payload);
  if (!sanitized) return;

  try {
    socket.emit("trackResultHistoryEvent", sanitized, () => undefined);
  } catch (error) {
    console.error("Failed to track result history event", error);
  }
};

export const useResultHistoryAnalytics = () => {
  const { getSocket } = useRoomSessionInternal();
  const trackedKeyRef = useRef<Set<string>>(new Set());

  const trackResultHistoryEvent = useCallback(
    (payload: TrackResultHistoryEventPayload) => {
      emitResultHistoryEvent(getSocket(), payload);
    },
    [getSocket],
  );

  const trackResultHistoryEventOnce = useCallback(
    (
      payload: TrackResultHistoryEventPayload,
      key = buildResultHistoryTrackingKey(payload),
    ) => {
      if (trackedKeyRef.current.has(key)) return;
      trackedKeyRef.current.add(key);
      emitResultHistoryEvent(getSocket(), payload);
    },
    [getSocket],
  );

  return {
    trackResultHistoryEvent,
    trackResultHistoryEventOnce,
  };
};

