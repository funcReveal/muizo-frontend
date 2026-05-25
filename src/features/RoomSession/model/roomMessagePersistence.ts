import type { ChatMessage } from "./types";

const ROOM_MESSAGES_STORAGE_PREFIX = "muizo:room:messages:";
const MAX_CACHED_ROOM_MESSAGE_COUNT = 1200;

const getRoomMessagesStorageKey = (roomId: string) =>
  `${ROOM_MESSAGES_STORAGE_PREFIX}${roomId}`;

const canUseSessionStorage = () =>
  typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";

export const readCachedRoomMessages = (roomId: string): ChatMessage[] => {
  if (!roomId || !canUseSessionStorage()) return [];

  try {
    const raw = window.sessionStorage.getItem(getRoomMessagesStorageKey(roomId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((message): message is ChatMessage => {
      return (
        message &&
        typeof message === "object" &&
        typeof message.id === "string" &&
        typeof message.roomId === "string" &&
        typeof message.userId === "string" &&
        typeof message.username === "string" &&
        typeof message.content === "string" &&
        typeof message.timestamp === "number"
      );
    });
  } catch {
    return [];
  }
};

export const writeCachedRoomMessages = (
  roomId: string,
  messages: ChatMessage[],
) => {
  if (!roomId || !canUseSessionStorage()) return;

  try {
    window.sessionStorage.setItem(
      getRoomMessagesStorageKey(roomId),
      JSON.stringify(messages.slice(-MAX_CACHED_ROOM_MESSAGE_COUNT)),
    );
  } catch {
    // Session storage is a best-effort reconnect aid.
  }
};

export const resolveRestoredRoomMessages = (
  roomId: string,
  serverMessages: ChatMessage[],
) => {
  if (serverMessages.length > 0) {
    writeCachedRoomMessages(roomId, serverMessages);
    return serverMessages;
  }
  return readCachedRoomMessages(roomId);
};

export const clearCachedRoomMessages = (roomId: string | null | undefined) => {
  if (!roomId || !canUseSessionStorage()) return;

  try {
    window.sessionStorage.removeItem(getRoomMessagesStorageKey(roomId));
  } catch {
    // Session storage is a best-effort reconnect aid.
  }
};
