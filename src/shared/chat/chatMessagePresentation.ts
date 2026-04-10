import type { ChatMessage } from "../../features/Room/model/types";

export const formatChatMessageTime = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

export const formatChatMessageFullTime = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString();

export const formatChatQuestionProgress = (message: ChatMessage) => {
  const context = message.questionContext;
  if (!context) return null;
  const questionNo = Math.max(1, Math.round(context.questionNo));
  const totalQuestions = Math.max(questionNo, Math.round(context.totalQuestions));
  if (!Number.isFinite(questionNo) || !Number.isFinite(totalQuestions)) return null;
  return `${questionNo}/${totalQuestions}`;
};

export const getChatDisplayName = (message: ChatMessage) =>
  message.username || (message.userId.startsWith("system:") ? "系統" : "玩家");

