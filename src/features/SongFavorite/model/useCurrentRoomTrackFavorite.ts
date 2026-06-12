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
      queryClient.setQueryData<CurrentRoomTrackFavoriteStatus>(queryKey, {
        occurrenceRecorded: true,
      });
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
      } else {
        queryClient.setQueryData<CurrentRoomTrackFavoriteStatus>(queryKey, {
          occurrenceRecorded: false,
        });
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
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
