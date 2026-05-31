import {
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useAuth } from "@shared/auth/AuthContext";

import { songFavoriteApi } from "./songFavoriteApi";
import type { SongFavoriteListPage } from "./types";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Remove items matching a provider:sourceId key set from all cached pages. */
const optimisticRemoveByKeys = (
  old: InfiniteData<SongFavoriteListPage> | undefined,
  keySet: ReadonlySet<string>,
): InfiniteData<SongFavoriteListPage> | undefined => {
  if (!old) return old;
  return {
    ...old,
    pages: old.pages.map((page) => ({
      ...page,
      items: page.items.filter(
        (item) => !keySet.has(`${item.provider}:${item.sourceId}`),
      ),
    })),
  };
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export const useSongFavoriteList = (limit = 50) => {
  const queryClient = useQueryClient();
  const { authToken, authUser, refreshAuthToken } = useAuth();
  const queryKey = ["song-favorite", "list", authUser?.id ?? "guest", limit];

  // --- Infinite query ---
  const listQuery = useInfiniteQuery({
    queryKey,
    enabled: Boolean(authToken && authUser?.id),
    staleTime: 30_000,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      songFavoriteApi.listFavorites({
        authToken,
        refreshAuthToken,
        cursor: pageParam,
        limit,
        signal,
      }),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? (lastPage.nextCursor ?? undefined) : undefined,
  });

  // --- Single delete (with optimistic remove) ---
  const deleteMutation = useMutation({
    mutationFn: (input: { provider: "youtube"; sourceId: string }) =>
      songFavoriteApi.deleteFavorite({ ...input, authToken, refreshAuthToken }),

    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey });
      const previousData =
        queryClient.getQueryData<InfiniteData<SongFavoriteListPage>>(queryKey);
      queryClient.setQueryData<InfiniteData<SongFavoriteListPage>>(queryKey, (old) =>
        optimisticRemoveByKeys(old, new Set([`${input.provider}:${input.sourceId}`])),
      );
      return { previousData };
    },

    onError: (_err, _input, context) => {
      if (context?.previousData !== undefined) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },

    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  // --- Batch delete (with optimistic remove) ---
  const batchDeleteMutation = useMutation({
    mutationFn: (items: { provider: "youtube"; sourceId: string }[]) =>
      songFavoriteApi.batchDeleteFavorites({ items, authToken, refreshAuthToken }),

    onMutate: async (items) => {
      await queryClient.cancelQueries({ queryKey });
      const previousData =
        queryClient.getQueryData<InfiniteData<SongFavoriteListPage>>(queryKey);
      const keySet = new Set(items.map((i) => `${i.provider}:${i.sourceId}`));
      queryClient.setQueryData<InfiniteData<SongFavoriteListPage>>(queryKey, (old) =>
        optimisticRemoveByKeys(old, keySet),
      );
      return { previousData };
    },

    onError: (_err, _input, context) => {
      if (context?.previousData !== undefined) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },

    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  // --- Delete all (optimistic empty) ---
  const deleteAllMutation = useMutation({
    mutationFn: () =>
      songFavoriteApi.deleteAllFavorites({ authToken, refreshAuthToken }),

    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });
      const previousData =
        queryClient.getQueryData<InfiniteData<SongFavoriteListPage>>(queryKey);
      // Collapse all pages to a single empty page so the list shows empty immediately.
      queryClient.setQueryData<InfiniteData<SongFavoriteListPage>>(queryKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: [{ items: [], hasMore: false, nextCursor: null }],
          pageParams: [undefined],
        };
      });
      return { previousData };
    },

    onError: (_err, _input, context) => {
      if (context?.previousData !== undefined) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },

    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    ...listQuery,
    items: listQuery.data?.pages.flatMap((page) => page.items) ?? [],
    deleteFavorite: deleteMutation.mutateAsync,
    batchDeleteFavorites: batchDeleteMutation.mutateAsync,
    deleteAllFavorites: deleteAllMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    isBatchDeleting: batchDeleteMutation.isPending,
    isDeletingAll: deleteAllMutation.isPending,
  };
};
