import { useCallback } from "react";

import { extractVideoId } from "../../../shared/utils/youtube";
import type { ClientSocket } from "./types";
import { useRoomSessionInternal } from "./providers/RoomSessionInternalContext";
import type { TrackResultYoutubeCtaClickedPayload } from "./socketEvents";

export type ResultYoutubeCtaSource =
  TrackResultYoutubeCtaClickedPayload["source"];

type EmitSocket = Pick<ClientSocket, "emit">;

const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const BUTTON_PLACEMENT_PATTERN = /^[A-Za-z0-9_:-]{1,80}$/;

const normalizeShortText = (value: unknown, maxLength: number) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : undefined;
};

export const resolveTrackableYoutubeVideoId = (params: {
  videoId?: string | null;
  sourceId?: string | null;
  href?: string | null;
  url?: string | null;
}): string | undefined => {
  const candidates = [
    params.videoId,
    params.sourceId,
    extractVideoId(params.href),
    extractVideoId(params.url),
  ];

  for (const candidate of candidates) {
    const normalized = normalizeShortText(candidate, 64);
    if (normalized && YOUTUBE_VIDEO_ID_PATTERN.test(normalized)) {
      return normalized;
    }
  }
  return undefined;
};

export const sanitizeResultYoutubeCtaPayload = (
  payload: TrackResultYoutubeCtaClickedPayload,
): TrackResultYoutubeCtaClickedPayload | null => {
  if (
    payload.source !== "result_summary" &&
    payload.source !== "result_review" &&
    payload.source !== "question_review"
  ) {
    return null;
  }

  const buttonPlacement = normalizeShortText(payload.buttonPlacement, 80);
  if (!buttonPlacement || !BUTTON_PLACEMENT_PATTERN.test(buttonPlacement)) {
    return null;
  }

  const sanitized: TrackResultYoutubeCtaClickedPayload = {
    source: payload.source,
    buttonPlacement,
  };
  const roomId = normalizeShortText(payload.roomId, 240);
  const matchId = normalizeShortText(payload.matchId, 80);
  const videoId = normalizeShortText(payload.videoId, 64);

  if (roomId) sanitized.roomId = roomId;
  if (matchId) sanitized.matchId = matchId;
  if (videoId && YOUTUBE_VIDEO_ID_PATTERN.test(videoId)) {
    sanitized.videoId = videoId;
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

export const emitResultYoutubeCtaClicked = (
  socket: EmitSocket | null | undefined,
  payload: TrackResultYoutubeCtaClickedPayload,
): void => {
  if (!socket) return;
  const sanitized = sanitizeResultYoutubeCtaPayload(payload);
  if (!sanitized) return;

  try {
    socket.emit("trackResultYoutubeCtaClicked", sanitized, () => undefined);
  } catch (error) {
    console.error("Failed to track result YouTube CTA click", error);
  }
};

export const openTrackedResultYoutubeCta = (params: {
  socket: EmitSocket | null | undefined;
  href: string | null | undefined;
  payload: TrackResultYoutubeCtaClickedPayload;
  openWindow?: (
    url: string,
    target?: string,
    features?: string,
  ) => Window | null;
}): void => {
  emitResultYoutubeCtaClicked(params.socket, params.payload);
  if (!params.href) return;
  const openWindow =
    params.openWindow ??
    (typeof window !== "undefined" ? window.open.bind(window) : null);
  openWindow?.(params.href, "_blank", "noopener,noreferrer");
};

export const useTrackResultYoutubeCta = () => {
  const { getSocket } = useRoomSessionInternal();

  return useCallback(
    (payload: TrackResultYoutubeCtaClickedPayload) => {
      emitResultYoutubeCtaClicked(getSocket(), payload);
    },
    [getSocket],
  );
};

