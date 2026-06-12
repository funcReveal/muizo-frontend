import { ensureFreshAuthToken } from "@shared/auth/token";
import { API_URL } from "@domain/room/constants";

export type DbActionEventName =
  | "career.collection_rank.share.opened"
  | "career.collection_rank.share.clicked"
  | "career.collection_rank.download.clicked"
  | "career.tab.changed"
  | "career.collection_rank.detail.opened"
  | "career.collection_rank.match_detail.opened"
  | "career.history.filter.changed"
  | "career.profile.rename.opened"
  | "career.profile.rename.saved"
  | "collection.detail.leaderboard_profile.changed"
  | "share.image.generate.failed"
  | "song_favorite.song.clicked"
  | "song_favorite.channel.clicked";

export type DbActionEventTarget = {
  type: "room" | "game" | "vote" | "playback" | "youtube" | "collection";
  id: string;
};

type DbActionEventMetadata = Record<
  string,
  string | number | boolean | null | undefined
>;

export const recordDbActionEvent = async ({
  eventName,
  clientId,
  username,
  authToken,
  refreshAuthToken,
  collectionId,
  matchId,
  target,
  metadata,
}: {
  eventName: DbActionEventName;
  clientId: string | null;
  username: string | null;
  authToken: string | null;
  refreshAuthToken: () => Promise<string | null>;
  collectionId?: string | null;
  matchId?: string | null;
  target?: DbActionEventTarget | null;
  metadata?: DbActionEventMetadata;
}) => {
  if (!API_URL || !authToken) return;

  const token = await ensureFreshAuthToken({
    token: authToken,
    refreshAuthToken,
  });
  if (!token) return;

  const response = await fetch(`${API_URL}/api/analytics/action-events`, {
    method: "POST",
    keepalive: true,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      eventName,
      clientId,
      username,
      collectionId,
      matchId,
      target,
      metadata,
    }),
  });

  if (!response.ok) {
    throw new Error("記錄使用事件失敗");
  }
};
