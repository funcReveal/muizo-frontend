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
  /** Where the success toast appears relative to the icon. */
  successToastPlacement?: "above" | "below";
};

type ToastCoords = {
  top: number;
  left: number;
  placement: "above" | "below";
  trackCursor: number;
};

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

  useEffect(() => {
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
      if (wrapRef.current) {
        const rect = wrapRef.current.getBoundingClientRect();
        setToastCoords({
          top: successToastPlacement === "below" ? rect.bottom + 8 : rect.top - 8,
          left: rect.left + rect.width / 2,
          placement: successToastPlacement,
          trackCursor,
        });
      }
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
      toastTimerRef.current = window.setTimeout(() => {
        setToastCoords(null);
        toastTimerRef.current = null;
      }, 2000);
    } catch {
      // Mutation error handling rolls the optimistic state back.
    }
  }, [favoriteCurrentTrack, successToastPlacement, trackCursor]);

  if (!enabled) return null;

  const occurrenceRecorded = Boolean(status?.occurrenceRecorded);
  const isFavorited = occurrenceRecorded;
  const disabled = isSubmitting || occurrenceRecorded;
  const ariaLabel = occurrenceRecorded
    ? "本局這首歌已收藏"
    : isLoading
      ? "確認本局收藏狀態"
      : "收藏這首歌";
  const tooltipTitle = occurrenceRecorded
    ? "本局這首歌已收藏"
    : "收藏這首歌";
  const visibleToastCoords =
    toastCoords?.trackCursor === trackCursor ? toastCoords : null;

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

      {visibleToastCoords &&
        createPortal(
          <span
            className={`song-bookmark-success-toast song-bookmark-success-toast--${visibleToastCoords.placement}`}
            style={{ top: visibleToastCoords.top, left: visibleToastCoords.left }}
            aria-live="polite"
            aria-atomic="true"
          >
            已收藏
          </span>,
          document.body,
        )}
    </>
  );
};

export default React.memo(SongBookmarkButton);
