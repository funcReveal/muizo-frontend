import { API_URL } from "@domain/room/constants";
import type { LeaderboardSettlementResponse } from "@features/RoomSession";
import {
  getApiEnvelopeErrorMessage,
  isApiEnvelopeSuccess,
  type ApiEnvelope,
} from "@shared/api/apiEnvelope";

type FetchLeaderboardSettlementParams = {
  matchId: string;
  authToken?: string | null;
  clientId?: string | null;
  limit?: number;
  offset?: number;
  signal?: AbortSignal;
};

export const fetchLeaderboardSettlement = async ({
  matchId,
  authToken,
  clientId,
  limit,
  offset,
  signal,
}: FetchLeaderboardSettlementParams): Promise<LeaderboardSettlementResponse> => {
  if (!API_URL) {
    throw new Error("API_URL 未設定");
  }
  if (!matchId?.trim()) {
    throw new Error("matchId is required");
  }

  const params = new URLSearchParams();
  if (clientId?.trim()) {
    params.set("clientId", clientId.trim());
  }
  if (typeof limit === "number" && Number.isFinite(limit)) {
    params.set("limit", String(Math.trunc(limit)));
  }
  if (typeof offset === "number" && Number.isFinite(offset)) {
    params.set("offset", String(Math.trunc(offset)));
  }

  const response = await fetch(
    `${API_URL}/api/leaderboards/matches/${encodeURIComponent(matchId.trim())}/settlement${
      params.size > 0 ? `?${params.toString()}` : ""
    }`,
    {
      method: "GET",
      signal,
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
    },
  );

  const payload = (await response.json().catch(() => null)) as
    | ApiEnvelope<LeaderboardSettlementResponse>
    | null;

  if (!response.ok || !isApiEnvelopeSuccess(payload)) {
    throw new Error(
      getApiEnvelopeErrorMessage(payload, "載入排行榜結算失敗"),
    );
  }

  return payload.data;
};
