import type { PlaylistSourceType } from "../../model/types";

const STORAGE_KEY = "mq:room-playlist-source-history:v1";
const MAX_RECENT_SOURCES = 12;

export type RoomLobbyPlaylistSourceHistoryEntry = {
  key: string;
  sourceType: PlaylistSourceType;
  title: string;
  sourceId?: string | null;
  url?: string | null;
  thumbnailUrl?: string | null;
  itemCount?: number | null;
  updatedAt: number;
};

const isHistoryEntry = (
  value: unknown,
): value is RoomLobbyPlaylistSourceHistoryEntry => {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<RoomLobbyPlaylistSourceHistoryEntry>;
  return (
    typeof entry.key === "string" &&
    typeof entry.sourceType === "string" &&
    typeof entry.title === "string" &&
    typeof entry.updatedAt === "number"
  );
};

export const buildPlaylistSourceHistoryKey = (entry: {
  sourceType: PlaylistSourceType;
  sourceId?: string | null;
  url?: string | null;
  title?: string | null;
}) =>
  [
    entry.sourceType,
    entry.sourceId?.trim() || "",
    entry.url?.trim() || "",
    entry.title?.trim() || "",
  ].join("::");

export const readRoomLobbyPlaylistSourceHistory = () => {
  if (typeof window === "undefined") return [] as RoomLobbyPlaylistSourceHistoryEntry[];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [] as RoomLobbyPlaylistSourceHistoryEntry[];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [] as RoomLobbyPlaylistSourceHistoryEntry[];
    return parsed
      .filter(isHistoryEntry)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, MAX_RECENT_SOURCES);
  } catch {
    return [] as RoomLobbyPlaylistSourceHistoryEntry[];
  }
};

export const pushRoomLobbyPlaylistSourceHistory = (
  entry: Omit<RoomLobbyPlaylistSourceHistoryEntry, "key" | "updatedAt"> & {
    key?: string;
    updatedAt?: number;
  },
) => {
  if (typeof window === "undefined") return;
  const nextEntry: RoomLobbyPlaylistSourceHistoryEntry = {
    ...entry,
    key:
      entry.key ??
      buildPlaylistSourceHistoryKey({
        sourceType: entry.sourceType,
        sourceId: entry.sourceId,
        url: entry.url,
        title: entry.title,
      }),
    updatedAt: entry.updatedAt ?? Date.now(),
  };
  const next = [
    nextEntry,
    ...readRoomLobbyPlaylistSourceHistory().filter(
      (item) => item.key !== nextEntry.key,
    ),
  ].slice(0, MAX_RECENT_SOURCES);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage quota issues.
  }
};
