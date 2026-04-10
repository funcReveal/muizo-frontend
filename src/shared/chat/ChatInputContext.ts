import { createContext, useContext } from "react";

export interface ChatInputContextValue {
  messageInput: string;
  setMessageInput: (value: string) => void;
  handleSendMessage: () => void;
  isChatCooldownActive: boolean;
  chatCooldownLeft: number;
}

export const ChatInputContext = createContext<ChatInputContextValue | null>(
  null,
);

export const useChatInput = (): ChatInputContextValue => {
  const ctx = useContext(ChatInputContext);
  if (!ctx) throw new Error("useChatInput must be used within a RoomProvider");
  return ctx;
};
