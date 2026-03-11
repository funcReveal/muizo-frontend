import React from "react";

import RoomLobbyStatusStrip from "../RoomLobbyStatusStrip";

interface SuggestionStatusMessagesProps {
  suggestError: string | null;
  suggestNotice: string | null;
  isCooldownActive: boolean;
  remainingCooldownSeconds: number;
}

const SuggestionStatusMessages: React.FC<SuggestionStatusMessagesProps> = ({
  suggestError,
  suggestNotice,
  isCooldownActive,
  remainingCooldownSeconds,
}) => (
  <RoomLobbyStatusStrip
    message={
      suggestError
        ? suggestError
        : isCooldownActive
          ? `\u51b7\u537b\u4e2d\uff0c${remainingCooldownSeconds}s \u5f8c\u53ef\u518d\u6b21\u63a8\u85a6`
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
