export const countUnreadMessages = <T extends { id: string }>(
  messages: T[],
  lastSeenId: string | null,
  isVisible: boolean,
) => {
  if (isVisible || messages.length === 0) return 0;
  if (!lastSeenId) return messages.length;

  const latestMessageId = messages[messages.length - 1]?.id;
  if (lastSeenId === latestMessageId) return 0;

  const lastSeenIndex = messages.findIndex((message) => message.id === lastSeenId);
  return lastSeenIndex < 0
    ? messages.length
    : Math.max(0, messages.length - (lastSeenIndex + 1));
};
