import React from "react";

import RoomLobbyStatusStrip from "../RoomLobbyStatusStrip";

interface SuggestionStatusMessagesProps {
  className?: string;
  suggestError: string | null;
  suggestNotice: string | null;
  isCooldownActive: boolean;
  remainingCooldownSeconds: number;
}

const SuggestionStatusMessages: React.FC<SuggestionStatusMessagesProps> = ({
  className,
  suggestError,
  suggestNotice,
  isCooldownActive,
  remainingCooldownSeconds,
}) => (
  <RoomLobbyStatusStrip
    className={className}
    message={
      suggestError
        ? suggestError
        : isCooldownActive
          ? `冷卻中 ${remainingCooldownSeconds}s`
          : suggestNotice
    }
    tone={
      suggestError
        ? "error"
        : isCooldownActive
          ? "warning"
          : suggestNotice
            ? "success"
            : "neutral"
    }
  />
);

export default SuggestionStatusMessages;
