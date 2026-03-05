import React from "react";
import { Typography } from "@mui/material";

import type { SuggestType } from "./types";

interface SuggestionStatusMessagesProps {
  suggestType: SuggestType;
  suggestCollectionId: string | null;
  isSuggestCollectionPrivate: boolean;
  suggestError: string | null;
  suggestNotice: string | null;
  isCooldownActive: boolean;
  remainingCooldownSeconds: number;
}

const SuggestionStatusMessages: React.FC<SuggestionStatusMessagesProps> = ({
  suggestType,
  suggestCollectionId,
  isSuggestCollectionPrivate,
  suggestError,
  suggestNotice,
  isCooldownActive,
  remainingCooldownSeconds,
}) => (
  <>
    {suggestError && (
      <Typography variant="caption" className="text-rose-300">
        {suggestError}
      </Typography>
    )}
    {suggestType === "collection" && suggestCollectionId && (
      <Typography
        variant="caption"
        className={
          isSuggestCollectionPrivate ? "text-amber-200" : "text-emerald-300"
        }
      >
        {isSuggestCollectionPrivate
          ? "此推薦來自私人收藏庫，會以快照方式送出。"
          : "此推薦來自公開收藏庫，會以來源連結送出。"}
      </Typography>
    )}
    {(suggestNotice || isCooldownActive) && (
      <Typography variant="caption" className="text-emerald-300">
        {isCooldownActive
          ? `冷卻中，請等待 ${remainingCooldownSeconds}s 後再推薦。`
          : suggestNotice}
      </Typography>
    )}
  </>
);

export default SuggestionStatusMessages;
