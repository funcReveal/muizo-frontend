import { useCallback, useEffect, useMemo, useState } from "react";

import { API_URL } from "@domain/room/constants";
import type { RoomParticipant, RoomState } from "@features/RoomSession";
import { useAuth } from "@shared/auth/AuthContext";
import { ensureFreshAuthToken } from "@shared/auth/token";
import {
  RANKED_CHALLENGE_PROFILE_KEY,
  type RankedChallengeBestRun,
  type RankedChallengeLeaderboardEntry,
  type RankedChallengeRun,
  type RankedChallengeSettlementState,
} from "./rankedChallengeSettlementTypes";

type UseRankedChallengeSettlementDataInput = {
  room: RoomState["room"];
  participants: RoomParticipant[];
  playedQuestionCount: number;
  meClientId?: string | null;
  matchId?: string | null;
  endedAt?: number | null;
};

type ApiBestRun = {
  rank?: number | null;
  score?: number | null;
  correctCount?: number | null;
  questionCount?: number | null;
  maxCombo?: number | null;
  avgCorrectMs?: number | null;
  playedAt?: string | null;
};

type ApiLeaderboardEntry = ApiBestRun & {
  rank?: number | null;
  userId?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  isMe?: boolean;
};

type SettlementApiPayload = {
  ok?: boolean;
  data?: {
    me?: {
      currentRank?: number | null;
      totalRankedPlayers?: number | null;
      surpassedPercent?: number | null;
      currentRun?: ApiBestRun | null;
      bestAfterRun?: ApiBestRun | null;
      previousBestBeforeRun?: ApiBestRun | null;
      deltaVsPreviousBest?: {
        score?: number | null;
        correctCount?: number | null;
        maxCombo?: number | null;
        avgCorrectMs?: number | null;
      } | null;
      isNewBest?: boolean;
    };
    leaderboard?: {
      topEntries?: ApiLeaderboardEntry[];
      totalRankedPlayers?: number | null;
    };
  };
  error?: string;
};

type EntriesApiPayload = {
  ok?: boolean;
  data?: {
    items?: ApiLeaderboardEntry[];
    offset?: number;
    limit?: number;
    totalRankedPlayers?: number | null;
    hasMore?: boolean;
    nextOffset?: number | null;
  };
  error?: string;
};

type RemoteState = {
  loading: boolean;
  error: string | null;
  loadingMore: boolean;
  myRankedSummary: RankedChallengeSettlementState["myRankedSummary"];
  leaderboardTopEntries: RankedChallengeLeaderboardEntry[];
  leaderboardPagedEntries: RankedChallengeLeaderboardEntry[];
  totalRankedPlayers: number | null;
  hasMore: boolean;
  nextOffset: number | null;
};

const EMPTY_REMOTE_STATE: RemoteState = {
  loading: false,
  error: null,
  loadingMore: false,
  myRankedSummary: null,
  leaderboardTopEntries: [],
  leaderboardPagedEntries: [],
  totalRankedPlayers: null,
  hasMore: false,
  nextOffset: null,
};

const LEADERBOARD_PAGE_SIZE = 20;

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
};

const normalizeCount = (value: unknown) => {
  const parsed = toFiniteNumber(value);
  return parsed === null ? null : Math.max(0, Math.floor(parsed));
};

const normalizeRequiredCount = (value: unknown) => normalizeCount(value) ?? 0;

const sortParticipantsForRank = (participants: RoomParticipant[]) =>
  [...participants].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const comboA = Math.max(a.maxCombo ?? 0, a.combo ?? 0);
    const comboB = Math.max(b.maxCombo ?? 0, b.combo ?? 0);
    if (comboB !== comboA) return comboB - comboA;
    const correctA = a.correctCount ?? 0;
    const correctB = b.correctCount ?? 0;
    if (correctB !== correctA) return correctB - correctA;
    const avgA =
      typeof a.avgCorrectMs === "number" && Number.isFinite(a.avgCorrectMs)
        ? a.avgCorrectMs
        : Number.POSITIVE_INFINITY;
    const avgB =
      typeof b.avgCorrectMs === "number" && Number.isFinite(b.avgCorrectMs)
        ? b.avgCorrectMs
        : Number.POSITIVE_INFINITY;
    if (avgA !== avgB) return avgA - avgB;
    return a.joinedAt - b.joinedAt;
  });

const isCollectionSourceType = (sourceType: unknown) =>
  sourceType === "public_collection" || sourceType === "private_collection";

const toBestRun = (value: ApiBestRun | null | undefined) => {
  if (!value) return null;
  return {
    rank: normalizeCount(value.rank),
    score: normalizeRequiredCount(value.score),
    correctCount: normalizeRequiredCount(value.correctCount),
    maxCombo: normalizeRequiredCount(value.maxCombo),
    avgCorrectMs: normalizeCount(value.avgCorrectMs),
    playedAt: value.playedAt ?? null,
  } satisfies RankedChallengeBestRun;
};

const toLeaderboardEntry = (
  value: ApiLeaderboardEntry,
): RankedChallengeLeaderboardEntry | null => {
  const rank = normalizeCount(value.rank);
  if (!rank) return null;
  return {
    rank,
    userId: value.userId ?? null,
    displayName: value.displayName?.trim() || "未知玩家",
    avatarUrl: value.avatarUrl ?? null,
    score: normalizeRequiredCount(value.score),
    correctCount: normalizeRequiredCount(value.correctCount),
    maxCombo: normalizeRequiredCount(value.maxCombo),
    avgCorrectMs: normalizeCount(value.avgCorrectMs),
    playedAt: value.playedAt ?? null,
    isMe: Boolean(value.isMe),
  };
};

const dedupeLeaderboardEntries = (
  entries: RankedChallengeLeaderboardEntry[],
) => {
  const seen = new Set<string>();
  const result: RankedChallengeLeaderboardEntry[] = [];
  for (const entry of entries) {
    const key = entry.userId
      ? `user:${entry.userId}`
      : `rank:${entry.rank}:${entry.displayName}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(entry);
  }
  return result.sort((a, b) => a.rank - b.rank);
};

export const useRankedChallengeSettlementData = ({
  room,
  participants,
  playedQuestionCount,
  meClientId,
  matchId,
  endedAt,
}: UseRankedChallengeSettlementDataInput): RankedChallengeSettlementState => {
  const { authToken, refreshAuthToken } = useAuth();
  const collectionId = room.playlist.id ?? room.playlistId ?? null;
  const leaderboardProfileKey = room.gameSettings?.leaderboardProfileKey ?? null;
  const isRankedChallenge =
    Boolean(collectionId) &&
    isCollectionSourceType(room.playlist.sourceType ?? room.playlistSourceType) &&
    leaderboardProfileKey === RANKED_CHALLENGE_PROFILE_KEY;

  const currentRun = useMemo<RankedChallengeRun | null>(() => {
    if (!isRankedChallenge) return null;
    const sorted = sortParticipantsForRank(participants);
    const meIndex = meClientId
      ? sorted.findIndex((participant) => participant.clientId === meClientId)
      : -1;
    const me = meIndex >= 0 ? sorted[meIndex] : sorted[0] ?? null;
    if (!me) return null;
    return {
      score: normalizeRequiredCount(me.score),
      correctCount: normalizeRequiredCount(me.correctCount),
      questionCount: Math.max(0, Math.floor(playedQuestionCount)),
      maxCombo: Math.max(me.maxCombo ?? 0, me.combo ?? 0),
      avgCorrectMs:
        typeof me.avgCorrectMs === "number" && Number.isFinite(me.avgCorrectMs)
          ? Math.max(0, Math.floor(me.avgCorrectMs))
          : null,
      playedAt: endedAt ?? null,
      roomRank: meIndex >= 0 ? meIndex + 1 : null,
    };
  }, [endedAt, isRankedChallenge, meClientId, participants, playedQuestionCount]);

  const [remoteState, setRemoteState] =
    useState<RemoteState>(EMPTY_REMOTE_STATE);

  useEffect(() => {
    if (!isRankedChallenge || !collectionId || !API_URL) {
      setRemoteState(EMPTY_REMOTE_STATE);
      return;
    }

    const controller = new AbortController();
    let active = true;

    setRemoteState((current) => ({
      ...current,
      loading: true,
      error: null,
    }));

    const load = async () => {
      try {
        const token = authToken
          ? await ensureFreshAuthToken({ token: authToken, refreshAuthToken })
          : null;
        const params = new URLSearchParams({
          profileKey: RANKED_CHALLENGE_PROFILE_KEY,
        });
        if (matchId) {
          params.set("matchId", matchId);
        }
        const response = await fetch(
          `${API_URL}/api/collections/${encodeURIComponent(
            collectionId,
          )}/leaderboard/settlement?${params.toString()}`,
          {
            method: "GET",
            signal: controller.signal,
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          },
        );
        const payload = (await response.json().catch(() => null)) as
          | SettlementApiPayload
          | null;

        if (!response.ok || !payload?.ok || !payload.data) {
          throw new Error(payload?.error || "讀取排行挑戰結算資料失敗");
        }

        const apiMe = payload.data.me;
        const topEntries =
          payload.data.leaderboard?.topEntries
            ?.map(toLeaderboardEntry)
            .filter(
              (entry): entry is RankedChallengeLeaderboardEntry =>
                entry !== null,
            ) ?? [];
        const nextTopEntries = dedupeLeaderboardEntries(topEntries);
        const totalRankedPlayers =
          normalizeCount(payload.data.leaderboard?.totalRankedPlayers) ??
          normalizeCount(apiMe?.totalRankedPlayers);
        const nextOffset = nextTopEntries.length;

        if (!active) return;
        setRemoteState({
          loading: false,
          error: null,
          loadingMore: false,
          myRankedSummary: apiMe
            ? {
                currentRank: normalizeCount(apiMe.currentRank),
                totalRankedPlayers,
                surpassedPercent: normalizeCount(apiMe.surpassedPercent),
                bestAfterRun: toBestRun(apiMe.bestAfterRun),
                previousBestBeforeRun: toBestRun(
                  apiMe.previousBestBeforeRun,
                ),
                deltaVsPreviousBest: apiMe.deltaVsPreviousBest
                  ? {
                      score:
                        toFiniteNumber(apiMe.deltaVsPreviousBest.score) ??
                        null,
                      correctCount:
                        toFiniteNumber(
                          apiMe.deltaVsPreviousBest.correctCount,
                        ) ?? null,
                      maxCombo:
                        toFiniteNumber(apiMe.deltaVsPreviousBest.maxCombo) ??
                        null,
                      avgCorrectMs:
                        toFiniteNumber(
                          apiMe.deltaVsPreviousBest.avgCorrectMs,
                        ) ?? null,
                    }
                  : null,
                isNewBest: Boolean(apiMe.isNewBest),
              }
            : null,
          leaderboardTopEntries: nextTopEntries,
          leaderboardPagedEntries: nextTopEntries,
          totalRankedPlayers,
          hasMore:
            typeof totalRankedPlayers === "number"
              ? nextOffset < totalRankedPlayers
              : nextTopEntries.length >= 10,
          nextOffset,
        });
      } catch (error) {
        if (!active || controller.signal.aborted) return;
        setRemoteState((current) => ({
          ...current,
          loading: false,
          loadingMore: false,
          error:
            error instanceof Error
              ? error.message
              : "讀取排行挑戰結算資料失敗",
        }));
      }
    };

    void load();

    return () => {
      active = false;
      controller.abort();
    };
  }, [
    authToken,
    collectionId,
    isRankedChallenge,
    matchId,
    refreshAuthToken,
  ]);

  const loadMoreLeaderboardEntries = useCallback(() => {
    if (
      !isRankedChallenge ||
      !collectionId ||
      !API_URL ||
      remoteState.loading ||
      remoteState.loadingMore ||
      !remoteState.hasMore ||
      remoteState.nextOffset === null
    ) {
      return;
    }

    const controller = new AbortController();
    const offset = remoteState.nextOffset;

    setRemoteState((current) => ({
      ...current,
      loadingMore: true,
      error: null,
    }));

    const load = async () => {
      try {
        const token = authToken
          ? await ensureFreshAuthToken({ token: authToken, refreshAuthToken })
          : null;
        const params = new URLSearchParams({
          profileKey: RANKED_CHALLENGE_PROFILE_KEY,
          limit: String(LEADERBOARD_PAGE_SIZE),
          offset: String(offset),
        });
        const response = await fetch(
          `${API_URL}/api/collections/${encodeURIComponent(
            collectionId,
          )}/leaderboard/entries?${params.toString()}`,
          {
            method: "GET",
            signal: controller.signal,
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          },
        );
        const payload = (await response.json().catch(() => null)) as
          | EntriesApiPayload
          | null;

        if (!response.ok || !payload?.ok || !payload.data) {
          throw new Error(payload?.error || "讀取排行列表失敗");
        }

        const pageEntries =
          payload.data.items
            ?.map(toLeaderboardEntry)
            .filter(
              (entry): entry is RankedChallengeLeaderboardEntry =>
                entry !== null,
            ) ?? [];

        setRemoteState((current) => {
          const mergedEntries = dedupeLeaderboardEntries([
            ...current.leaderboardPagedEntries,
            ...pageEntries,
          ]);
          const totalRankedPlayers =
            normalizeCount(payload.data?.totalRankedPlayers) ??
            current.totalRankedPlayers;
          const nextOffset =
            normalizeCount(payload.data?.nextOffset) ??
            (pageEntries.length > 0 ? offset + pageEntries.length : null);
          const hasMore =
            Boolean(payload.data?.hasMore) &&
            nextOffset !== null &&
            (typeof totalRankedPlayers === "number"
              ? nextOffset < totalRankedPlayers
              : true);

          return {
            ...current,
            loadingMore: false,
            leaderboardPagedEntries: mergedEntries,
            totalRankedPlayers,
            hasMore,
            nextOffset: hasMore ? nextOffset : null,
          };
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        setRemoteState((current) => ({
          ...current,
          loadingMore: false,
          error: error instanceof Error ? error.message : "讀取排行列表失敗",
        }));
      }
    };

    void load();
  }, [
    authToken,
    collectionId,
    isRankedChallenge,
    refreshAuthToken,
    remoteState.hasMore,
    remoteState.loading,
    remoteState.loadingMore,
    remoteState.nextOffset,
  ]);

  return {
    isRankedChallenge,
    loading: remoteState.loading,
    error: remoteState.error,
    loadingMore: remoteState.loadingMore,
    currentRun,
    myRankedSummary: remoteState.myRankedSummary,
    leaderboardTopEntries: remoteState.leaderboardTopEntries,
    leaderboardPagedEntries: remoteState.leaderboardPagedEntries,
    totalRankedPlayers: remoteState.totalRankedPlayers,
    hasMore: remoteState.hasMore,
    nextOffset: remoteState.nextOffset,
    loadMoreLeaderboardEntries,
  };
};
