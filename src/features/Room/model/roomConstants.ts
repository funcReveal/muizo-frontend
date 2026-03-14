export const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (typeof window !== "undefined" ? window.location.origin : "");

export const API_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" ? window.location.origin : "");

export const DEFAULT_PAGE_SIZE = 50;
export const CHUNK_SIZE = 200;
export const DEFAULT_CLIP_SEC = 30;
export const DEFAULT_PLAY_DURATION_SEC = 30;
export const DEFAULT_REVEAL_DURATION_SEC = 5;
export const DEFAULT_START_OFFSET_SEC = 0;
export const DEFAULT_ROOM_MAX_PLAYERS = 4;
export const DEFAULT_PLAYBACK_EXTENSION_MODE = "manual_vote" as const;
export const PLAY_DURATION_MIN = 5;
export const PLAY_DURATION_MAX = 120;
export const REVEAL_DURATION_MIN = 2;
export const REVEAL_DURATION_MAX = 20;
export const START_OFFSET_MIN = 0;
export const START_OFFSET_MAX = 600;

export const QUESTION_MIN = 5;
export const QUESTION_MAX = 100;
export const QUESTION_STEP = 5;
export const PLAYER_MIN = 1;
export const PLAYER_MAX = 12;
export const USERNAME_MAX = 16;

export const STORAGE_KEYS = {
  clientId: "mq_clientId",
  sessionClientId: "mq_sessionClientId",
  username: "mq_username",
  roomId: "mq_roomId",
  questionCount: "mq_questionCount",
  roomPasswordPrefix: "mq_roomPassword:",
  profileConfirmedPrefix: "mq_profileConfirmed:",
} as const;
