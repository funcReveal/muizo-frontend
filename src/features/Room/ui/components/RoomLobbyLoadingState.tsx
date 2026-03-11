import React from "react";
import { Box, Stack, Typography } from "@mui/material";

interface RoomLobbyLoadingStateProps {
  label: string;
  detail?: string;
  className?: string;
}

const RoomLobbyLoadingState: React.FC<RoomLobbyLoadingStateProps> = ({
  label,
  detail,
  className,
}) => (
  <Box
    className={["room-lobby-loading-state", className].filter(Boolean).join(" ")}
    role="status"
    aria-live="polite"
  >
    <div className="room-lobby-loading-state__visual" aria-hidden="true">
      <span className="room-lobby-loading-state__dot" />
      <span className="room-lobby-loading-state__dot" />
      <span className="room-lobby-loading-state__dot" />
    </div>
    <Stack spacing={0.35} className="room-lobby-loading-state__content">
      <Typography variant="body2" className="room-lobby-loading-state__label">
        {label}
      </Typography>
      {detail ? (
        <Typography
          variant="caption"
          className="room-lobby-loading-state__detail"
        >
          {detail}
        </Typography>
      ) : null}
      <span className="room-lobby-loading-state__rail" aria-hidden="true">
        <span className="room-lobby-loading-state__rail-fill" />
      </span>
    </Stack>
  </Box>
);

export default RoomLobbyLoadingState;
