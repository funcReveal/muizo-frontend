import { useMemo } from "react";

import type { GameState, PlaylistItem, RoomState } from "../../Room/model/types";
import {
  DEFAULT_CLIP_SEC,
  DEFAULT_PLAY_DURATION_SEC,
  DEFAULT_START_OFFSET_SEC,
} from "../../Room/model/roomConstants";
import { normalizeRoomDisplayText } from "../../../shared/utils/text";
import { extractYouTubeId } from "./gameRoomUtils";

interface UseGameRoomPlaybackStateInput {
  gameState: GameState;
  playlist: PlaylistItem[];
  room: RoomState["room"];
  showVideoOverride: boolean | null;
}

/**
 * Derives all clip / track / playback values from the current game state.
 *
 * Previously these 30+ computed values lived inline inside GameRoomPage,
 * making it hard to follow and causing them to be re-read on every render.
 * Extracting them here:
 *  - Groups related logic in one place (mirrors how Collections uses
 *    useCollectionLoader / useCollectionEditor for concern separation)
 *  - Lets GameRoomPage focus on event-handling and rendering
 */
export function useGameRoomPlaybackState({
  gameState,
  playlist,
  room,
  showVideoOverride,
}: UseGameRoomPlaybackStateInput) {
  // ------------------------------------------------------------------
  // Track cursor / order resolution
  // ------------------------------------------------------------------
  const effectiveTrackOrder = useMemo(() => {
    if (gameState.trackOrder?.length) return gameState.trackOrder;
    return playlist.map((_, idx) => idx);
  }, [gameState.trackOrder, playlist]);

  const trackCursor = Math.max(0, gameState.trackCursor ?? 0);
  const trackOrderLength = effectiveTrackOrder.length || playlist.length || 0;
  const boundedCursor = Math.min(trackCursor, Math.max(trackOrderLength - 1, 0));
  const backendTrackIndex = effectiveTrackOrder[boundedCursor];
  const currentTrackIndex =
    backendTrackIndex ??
    gameState.currentIndex ??
    effectiveTrackOrder[0] ??
    0;

  const item = useMemo(
    () => playlist[currentTrackIndex] ?? playlist[0],
    [playlist, currentTrackIndex],
  );

  // ------------------------------------------------------------------
  // Display names
  // ------------------------------------------------------------------
  const resolvedAnswerTitle = normalizeRoomDisplayText(
    gameState.answerTitle?.trim() ||
      item?.answerText?.trim() ||
      item?.title?.trim(),
    "未提供歌名",
  );
  const resolvedRoomName = normalizeRoomDisplayText(room.name, "未命名房間");

  // ------------------------------------------------------------------
  // Guess / playback duration
  // ------------------------------------------------------------------
  const roomPlayDurationSec = Math.max(
    1,
    room.gameSettings?.playDurationSec ?? DEFAULT_PLAY_DURATION_SEC,
  );
  const configuredGuessDurationMs = Math.max(
    1000,
    Math.floor(roomPlayDurationSec * 1000),
  );
  const serverGuessDurationMs =
    Number.isFinite(gameState.guessDurationMs) && gameState.guessDurationMs > 0
      ? Math.max(1000, Math.floor(gameState.guessDurationMs))
      : null;
  const effectiveGuessDurationMs =
    serverGuessDurationMs ?? configuredGuessDurationMs;

  const roomStartOffsetSec = Math.max(
    0,
    room.gameSettings?.startOffsetSec ?? DEFAULT_START_OFFSET_SEC,
  );

  // ------------------------------------------------------------------
  // Clip start / end resolution (room_settings vs track_clip source)
  // ------------------------------------------------------------------
  const hasExplicitEndSec = Boolean(
    item &&
      (typeof item.hasExplicitEndSec === "boolean"
        ? item.hasExplicitEndSec
        : typeof item.endSec === "number" &&
          Math.abs(
            item.endSec -
              ((typeof item.startSec === "number" ? item.startSec : 0) +
                DEFAULT_CLIP_SEC),
          ) > 0.001),
  );

  const hasExplicitStartSec = Boolean(
    item &&
      (typeof item.hasExplicitStartSec === "boolean"
        ? item.hasExplicitStartSec
        : (typeof item.startSec === "number" && item.startSec > 0) ||
          hasExplicitEndSec),
  );

  const itemTimingSource =
    item?.timingSource === "room_settings" || item?.timingSource === "track_clip"
      ? item.timingSource
      : null;

  const fallbackClipSource: "room_settings" | "track_clip" =
    itemTimingSource ??
    (!hasExplicitStartSec && !hasExplicitEndSec ? "room_settings" : "track_clip");

  const serverClipSource =
    gameState.clipSource === "room_settings" ||
    gameState.clipSource === "track_clip"
      ? gameState.clipSource
      : null;

  const effectiveClipSource = serverClipSource ?? fallbackClipSource;

  const derivedClipStartSec =
    fallbackClipSource === "room_settings"
      ? Math.max(0, item?.startSec ?? roomStartOffsetSec)
      : Math.max(0, item?.startSec ?? 0);

  const fallbackDurationSec = Math.max(
    1,
    Math.floor(effectiveGuessDurationMs / 1000),
  );

  const derivedClipEndSec =
    fallbackClipSource === "room_settings"
      ? typeof item?.endSec === "number" && item.endSec > derivedClipStartSec
        ? item.endSec
        : derivedClipStartSec + fallbackDurationSec
      : typeof item?.endSec === "number" && item.endSec > derivedClipStartSec
        ? item.endSec
        : derivedClipStartSec + DEFAULT_CLIP_SEC;

  const serverClipStartSec =
    typeof gameState.clipStartSec === "number" && gameState.clipStartSec >= 0
      ? gameState.clipStartSec
      : null;

  const serverClipEndSec =
    typeof gameState.clipEndSec === "number" && gameState.clipEndSec > 0
      ? gameState.clipEndSec
      : null;

  const clipStartSec = serverClipStartSec ?? derivedClipStartSec;
  const clipEndSec =
    serverClipEndSec !== null && serverClipEndSec > clipStartSec
      ? serverClipEndSec
      : derivedClipEndSec;

  const shouldLoopRoomSettingsClip = effectiveClipSource === "room_settings";

  // ------------------------------------------------------------------
  // Phase / session keys
  // ------------------------------------------------------------------
  const videoId = item ? extractYouTubeId(item.url, item.videoId) : null;

  const phaseEndsAt =
    gameState.phase === "guess"
      ? gameState.startedAt + effectiveGuessDurationMs
      : gameState.revealEndsAt;

  const isEnded = gameState.status === "ended";
  const isReveal = gameState.phase === "reveal";
  const showVideo = showVideoOverride ?? gameState.showVideo ?? true;

  const clipIdentityStartSec = Math.round(clipStartSec * 1000) / 1000;
  const trackSessionKey = `${gameState.startedAt}:${trackCursor}:${currentTrackIndex}`;
  const trackLoadKey = `${videoId ?? "none"}:${trackSessionKey}:${clipIdentityStartSec}`;

  return {
    // Track
    effectiveTrackOrder,
    trackCursor,
    trackOrderLength,
    boundedCursor,
    backendTrackIndex,
    currentTrackIndex,
    item,
    // Display
    resolvedAnswerTitle,
    resolvedRoomName,
    // Duration
    roomPlayDurationSec,
    configuredGuessDurationMs,
    serverGuessDurationMs,
    effectiveGuessDurationMs,
    roomStartOffsetSec,
    // Clip
    hasExplicitEndSec,
    hasExplicitStartSec,
    itemTimingSource,
    fallbackClipSource,
    serverClipSource,
    effectiveClipSource,
    derivedClipStartSec,
    fallbackDurationSec,
    derivedClipEndSec,
    serverClipStartSec,
    serverClipEndSec,
    clipStartSec,
    clipEndSec,
    shouldLoopRoomSettingsClip,
    // Phase / session
    videoId,
    phaseEndsAt,
    isEnded,
    isReveal,
    showVideo,
    clipIdentityStartSec,
    trackSessionKey,
    trackLoadKey,
  };
}
