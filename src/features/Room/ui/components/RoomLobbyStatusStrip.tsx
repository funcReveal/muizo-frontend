import React from "react";

type RoomLobbyStatusTone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "error";

interface RoomLobbyStatusStripProps {
  message?: string | null;
  tone?: RoomLobbyStatusTone;
  loading?: boolean;
  className?: string;
  reserveSpace?: boolean;
}

const RoomLobbyStatusStrip: React.FC<RoomLobbyStatusStripProps> = ({
  message,
  tone = "neutral",
  loading = false,
  className,
  reserveSpace = false,
}) => {
  const hasMessage = Boolean(message && message.trim().length > 0);
  if (!loading && !hasMessage && !reserveSpace) {
    return null;
  }

  const classes = [
    "room-lobby-status-strip",
    `room-lobby-status-strip--${tone}`,
    loading ? "is-loading" : "",
    !loading && !hasMessage ? "is-empty" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={classes}
      role={loading ? "status" : undefined}
      aria-live={loading ? "polite" : undefined}
      aria-label={loading ? message ?? "讀取中" : undefined}
    >
      {loading ? (
        <span className="room-lobby-status-strip__rail" aria-hidden="true">
          <span className="room-lobby-status-strip__rail-fill" />
        </span>
      ) : hasMessage ? (
        <span className="room-lobby-status-strip__text">{message}</span>
      ) : (
        <span className="room-lobby-status-strip__text" aria-hidden="true">
          {" "}
        </span>
      )}
    </div>
  );
};

export default RoomLobbyStatusStrip;


