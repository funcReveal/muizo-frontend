import { useEffect, useMemo, useState } from "react";

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
      case "delta": {
        const aValue = normalizeNumber(a.delta, -999999);
        const bValue = normalizeNumber(b.delta, -999999);
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
      useState<CareerCollectionRankSortKey>("leaderboardRank");
    const [sortOrder, setSortOrder] =
      useState<CareerCollectionRankSortOrder>("asc");
    const [rawItems, setRawItems] = useState<CareerCollectionRankRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      let cancelled = false;

      void Promise.resolve()
        .then(async () => {
          setIsLoading(true);
          setError(null);
          return fetchCareerCollectionRanks({
            clientId,
            authToken,
            refreshAuthToken,
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
    }, [authToken, clientId, refreshAuthToken]);

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
