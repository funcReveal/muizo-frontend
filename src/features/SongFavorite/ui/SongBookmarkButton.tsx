import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconButton, Tooltip } from "@mui/material";
import BookmarkBorderRoundedIcon from "@mui/icons-material/BookmarkBorderRounded";
import BookmarkRoundedIcon from "@mui/icons-material/BookmarkRounded";

import { useCurrentRoomTrackFavorite } from "../model/useCurrentRoomTrackFavorite";

type SongBookmarkButtonProps = {
  roomId: string;
  gameSessionId?: number | null;
  trackCursor: number;
  enabled: boolean;
  /** Where the "收藏成功" toast appears relative to the icon.
   *  Mobile slot sits at the bottom-left corner → toast goes above.
   *  Desktop slot sits at the top-left corner  → toast goes below. */
  successToastPlacement?: "above" | "below";
};

type ToastCoords = { top: number; left: number; placement: "above" | "below" };

const SongBookmarkButton: React.FC<SongBookmarkButtonProps> = ({
  roomId,
  gameSessionId = null,
  trackCursor,
  enabled,
  successToastPlacement = "below",
}) => {
  const { status, favoriteCurrentTrack, isLoading, isSubmitting } =
    useCurrentRoomTrackFavorite({ roomId, gameSessionId, trackCursor, enabled });

  const wrapRef = useRef<HTMLSpanElement>(null);
  const [toastCoords, setToastCoords] = useState<ToastCoords | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  // Clear toast on track change so a stale "收藏成功" never lingers into the next song.
  useEffect(() => {
    setToastCoords(null);
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
  }, [trackCursor]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const handleFavorite = useCallback(async () => {
    try {
      await favoriteCurrentTrack();
      // Compute viewport-relative position from the wrap element so the portal
      // toast renders at the correct location even inside overflow:hidden containers.
      if (wrapRef.current) {
        const rect = wrapRef.current.getBoundingClientRect();
        setToastCoords({
          top: successToastPlacement === "below" ? rect.bottom + 8 : rect.top - 8,
          left: rect.left + rect.width / 2,
          placement: successToastPlacement,
        });
      }
      // Show success toast for 2 s total (0.18 s in + ~1.6 s hold + 0.22 s out).
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
      toastTimerRef.current = window.setTimeout(() => {
        setToastCoords(null);
        toastTimerRef.current = null;
      }, 2000);
    } catch {
      // Errors are handled by the mutation's onError (optimistic rollback).
    }
  }, [favoriteCurrentTrack, successToastPlacement]);

  if (!enabled) return null;

  const occurrenceRecorded = Boolean(status?.occurrenceRecorded);
  const isFavorited = Boolean(status?.favorite) || occurrenceRecorded;
  const disabled = isLoading || isSubmitting || occurrenceRecorded;

  const ariaLabel = occurrenceRecorded
    ? "本局已收藏過此曲"
    : isFavorited
      ? "已收藏歌曲"
      : "收藏歌曲";

  const tooltipTitle = occurrenceRecorded
    ? "本局這首歌已收藏過"
    : isFavorited
      ? "已收藏，下一局再次收藏會增加次數"
      : "收藏這首歌曲";

  return (
    <>
      <Tooltip title={tooltipTitle} placement="right" arrow>
        <span ref={wrapRef} className="song-bookmark-button-wrap">
          <IconButton
            type="button"
            className={`song-bookmark-button${isFavorited ? " song-bookmark-button--active" : ""}`}
            aria-label={ariaLabel}
            aria-pressed={isFavorited}
            disabled={disabled}
            onClick={() => {
              void handleFavorite();
            }}
            size="small"
          >
            {isFavorited ? (
              <BookmarkRoundedIcon fontSize="small" />
            ) : (
              <BookmarkBorderRoundedIcon fontSize="small" />
            )}
          </IconButton>
        </span>
      </Tooltip>

      {toastCoords &&
        createPortal(
          <span
            className={`song-bookmark-success-toast song-bookmark-success-toast--${toastCoords.placement}`}
            style={{ top: toastCoords.top, left: toastCoords.left }}
            aria-live="polite"
            aria-atomic="true"
          >
            收藏成功
          </span>,
          document.body,
        )}
    </>
  );
};

export default React.memo(SongBookmarkButton);
