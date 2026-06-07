import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@shared/auth/AuthContext";

import { songFavoriteApi, SongFavoriteApiError } from "./songFavoriteApi";
import type { CurrentRoomTrackFavoriteStatus } from "./types";

type UseCurrentRoomTrackFavoriteParams = {
  roomId: string;
  gameSessionId: number | null | undefined;
  trackCursor: number;
  enabled: boolean;
};

const currentTrackQueryKey = (
  roomId: string,
  gameSessionId: number | null | undefined,
  trackCursor: number,
  authUserId: string | null | undefined,
) => [
  "song-favorite",
  "current-room-track",
  roomId,
  gameSessionId ?? "session",
  trackCursor,
  authUserId ?? "guest",
];

export const useCurrentRoomTrackFavorite = ({
  roomId,
  gameSessionId,
  trackCursor,
  enabled,
}: UseCurrentRoomTrackFavoriteParams) => {
  const queryClient = useQueryClient();
  const { authToken, authUser, refreshAuthToken } = useAuth();
  const queryKey = currentTrackQueryKey(
    roomId,
    gameSessionId,
    trackCursor,
    authUser?.id,
  );

  const statusQuery = useQuery({
    queryKey,
    enabled: enabled && Boolean(authToken && authUser?.id && roomId),
    staleTime: 20_000,
    retry: (failureCount, error) => {
      if (error instanceof SongFavoriteApiError && error.status < 500) {
        return false;
      }
      return failureCount < 1;
    },
    queryFn: ({ signal }) =>
      songFavoriteApi.fetchCurrentRoomTrackStatus({
        roomId,
        authToken,
        refreshAuthToken,
        signal,
      }),
  });

  const favoriteMutation = useMutation({
    mutationFn: () =>
      songFavoriteApi.favoriteCurrentRoomTrack({
        roomId,
        authToken,
        refreshAuthToken,
      }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });
      const previous =
        queryClient.getQueryData<CurrentRoomTrackFavoriteStatus>(queryKey);
      if (previous) {
        queryClient.setQueryData<CurrentRoomTrackFavoriteStatus>(queryKey, {
          ...previous,
          occurrenceRecorded: true,
          favorite:
            previous.favorite ??
            {
              id: "optimistic",
              provider: previous.currentTrack.provider,
              sourceId: previous.currentTrack.sourceId,
              title: previous.currentTrack.title,
              channelTitle: previous.currentTrack.channelTitle,
              channelId: previous.currentTrack.channelId,
              thumbnailUrl: previous.currentTrack.thumbnailUrl,
              durationSec: previous.currentTrack.durationSec,
              playCount: 1,
              firstAddedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
        });
      }
      return { previous };
    },
    onError: (error, _variables, context) => {
      if (
        error instanceof SongFavoriteApiError &&
        (error.status === 409 || error.status === 429)
      ) {
        void queryClient.invalidateQueries({ queryKey });
        return;
      }
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
      void queryClient.invalidateQueries({
        queryKey: ["song-favorite", "list", authUser?.id ?? "guest"],
      });
    },
  });

  return {
    status: statusQuery.data ?? null,
    isLoading: statusQuery.isLoading,
    isFetching: statusQuery.isFetching,
    error: statusQuery.error,
    favoriteCurrentTrack: favoriteMutation.mutateAsync,
    isSubmitting: favoriteMutation.isPending,
  };
};
