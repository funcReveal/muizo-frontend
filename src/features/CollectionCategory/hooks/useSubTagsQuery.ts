import { useQuery } from "@tanstack/react-query";
import { categoriesApi, type SubTagItem } from "../api/categoriesApi";

export const SUB_TAGS_QUERY_KEY = ["sub-tags"] as const;

export function useSubTagsQuery() {
  return useQuery<SubTagItem[]>({
    queryKey: SUB_TAGS_QUERY_KEY,
    queryFn: () => categoriesApi.getSubTags(),
    staleTime: 60 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
    retry: 2,
  });
}
