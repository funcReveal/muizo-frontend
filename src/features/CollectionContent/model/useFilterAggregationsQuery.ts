import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  apiFetchFilterAggregations,
  type FilterAggregations,
} from "./collectionContentApi";

type Options = {
  apiUrl: string;
  visibility: "public";
  q?: string;
  categoryKey?: string | null;
  subTag?: string | null;
  enabled?: boolean;
};

/**
 * Fetches authoritative cross-dimensional filter counts from the server.
 * Counts respect the OTHER dimension's currently-selected filter (e.g. choosing
 * "anime" reduces language counts to only languages present within anime).
 *
 * Cached for 30 s — counts can lag slightly behind writes without harming UX.
 */
export function useFilterAggregationsQuery(
  opts: Options,
): {
  data: FilterAggregations | undefined;
  isLoading: boolean;
  isFetching: boolean;
} {
  const query = useQuery({
    queryKey: [
      "collection-filter-aggregations",
      opts.visibility,
      opts.q ?? null,
      opts.categoryKey ?? null,
      opts.subTag ?? null,
    ],
    queryFn: async () => {
      const result = await apiFetchFilterAggregations(opts.apiUrl, {
        visibility: opts.visibility,
        q: opts.q,
        categoryKey: opts.categoryKey,
        subTag: opts.subTag,
      });
      if (!result.ok || !result.payload?.ok || !result.payload?.data) {
        throw new Error("Failed to fetch filter aggregations");
      }
      return result.payload.data;
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    // Keep showing the previous result while refetching for a new filter —
    // avoids the "counts flash to 0 then back to the new number" UX glitch.
    placeholderData: keepPreviousData,
    enabled: opts.enabled ?? true,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
  };
}
