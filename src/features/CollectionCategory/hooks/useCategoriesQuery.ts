import { useQuery } from "@tanstack/react-query";
import { categoriesApi, type CategoryTreeItem } from "../api/categoriesApi";

export const CATEGORIES_QUERY_KEY = ["categories"] as const;

export function useCategoriesQuery() {
  return useQuery<CategoryTreeItem[]>({
    queryKey: CATEGORIES_QUERY_KEY,
    queryFn: () => categoriesApi.getCategories(),
    staleTime: 60 * 60 * 1000,   // 1 hour — matches backend Redis TTL
    gcTime: 2 * 60 * 60 * 1000,  // 2 hours
    retry: 2,
  });
}
