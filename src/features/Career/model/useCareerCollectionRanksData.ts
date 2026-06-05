import { useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@shared/auth/AuthContext";

import type {
  CareerCollectionRankRow,
  CareerCollectionRanksQueryResult,
  CareerCollectionRankSortKey,
  CareerCollectionRankSortOrder,
} from "../types/career";
import { fetchCareerCollectionRanks } from "./careerOverviewApi";

const normalizeNumber = (
  value: number | null | undefined,
  fallback: number,
) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return value;
};

const sortItems = (
  items: CareerCollectionRankRow[],
  sortKey: CareerCollectionRankSortKey,
  sortOrder: CareerCollectionRankSortOrder,
) => {
  const sorted = [...items].sort((a, b) => {
    switch (sortKey) {
      case "leaderboardRank": {
        const aValue = normalizeNumber(a.leaderboardRank, 999999);
        const bValue = normalizeNumber(b.leaderboardRank, 999999);
        return aValue - bValue;
      }
      case "previousLeaderboardRank": {
        const aValue = normalizeNumber(a.previousLeaderboardRank, 999999);
        const bValue = normalizeNumber(b.previousLeaderboardRank, 999999);
        return aValue - bValue;
      }
      case "delta": {
        const aValue = normalizeNumber(a.delta, -999999);
        const bValue = normalizeNumber(b.delta, -999999);
        return aValue - bValue;
      }
      case "matchScore": {
        const aValue = normalizeNumber(
          a.matchScore ?? a.matchSummary?.selfPlayer?.finalScore,
          -1,
        );
        const bValue = normalizeNumber(
          b.matchScore ?? b.matchSummary?.selfPlayer?.finalScore,
          -1,
        );
        return aValue - bValue;
      }
      case "recentRank": {
        const aValue = normalizeNumber(a.recentRank, 999999);
        const bValue = normalizeNumber(b.recentRank, 999999);
        return aValue - bValue;
      }
      case "playCount": {
        return a.playCount - b.playCount;
      }
      case "bestScore": {
        const aValue = normalizeNumber(a.bestScore, -1);
        const bValue = normalizeNumber(b.bestScore, -1);
        return aValue - bValue;
      }
      case "lastPlayedAt": {
        const aValue = a.lastPlayedAt ?? "";
        const bValue = b.lastPlayedAt ?? "";
        return aValue.localeCompare(bValue);
      }
      default:
        return 0;
    }
  });

  return sortOrder === "asc" ? sorted : sorted.reverse();
};

export const useCareerCollectionRanksData =
  (): CareerCollectionRanksQueryResult => {
    const { clientId, authToken, refreshAuthToken } = useAuth();
    const [sortKey, setSortKey] =
      useState<CareerCollectionRankSortKey>("lastPlayedAt");
    const [sortOrder, setSortOrder] =
      useState<CareerCollectionRankSortOrder>("desc");
    const [rawItems, setRawItems] = useState<CareerCollectionRankRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const authTokenRef = useRef(authToken);
    const refreshAuthTokenRef = useRef(refreshAuthToken);

    useEffect(() => {
      authTokenRef.current = authToken;
      refreshAuthTokenRef.current = refreshAuthToken;
    }, [authToken, refreshAuthToken]);

    useEffect(() => {
      let cancelled = false;

      void Promise.resolve()
        .then(async () => {
          setIsLoading(true);
          setError(null);
          return fetchCareerCollectionRanks({
            clientId,
            authToken: authTokenRef.current,
            refreshAuthToken: refreshAuthTokenRef.current,
          });
        })
        .then((items) => {
          if (cancelled) return;
          setRawItems(items);
        })
        .catch((caughtError) => {
          if (cancelled) return;
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "讀取題庫戰績失敗",
          );
          setRawItems([]);
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });

      return () => {
        cancelled = true;
      };
    }, [clientId]);

    const items = useMemo(
      () => sortItems(rawItems, sortKey, sortOrder),
      [rawItems, sortKey, sortOrder],
    );

    return {
      items,
      sortKey,
      sortOrder,
      setSortKey,
      setSortOrder,
      isLoading,
      error,
    };
  };

export default useCareerCollectionRanksData;
