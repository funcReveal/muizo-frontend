import { createContext, useContext } from "react";

import type { ChatMessage } from "./types";

export interface ChatMessagesContextValue {
  messages: ChatMessage[];
}

export const ChatMessagesContext =
  createContext<ChatMessagesContextValue | null>(null);
ChatMessagesContext.displayName = "ChatMessagesContext";

export const useChatMessages = (): ChatMessagesContextValue => {
  const ctx = useContext(ChatMessagesContext);
  if (!ctx)
    throw new Error("useChatMessages must be used within a RoomProvider");
  return ctx;
};
