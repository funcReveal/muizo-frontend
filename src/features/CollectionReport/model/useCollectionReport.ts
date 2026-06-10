import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@shared/auth/AuthContext";

import { collectionReportApi } from "./collectionReportApi";
import type { CollectionReport, CollectionReportValue } from "./types";

type UseCollectionReportOptions = {
  collectionId: string | null | undefined;
  enabled?: boolean;
};

const buildCollectionReportQueryKey = (
  collectionId: string | null | undefined,
  authUserId: string | null | undefined,
) => ["collection-report", "mine", collectionId ?? "", authUserId ?? "guest"];

export const useCollectionReport = ({
  collectionId,
  enabled = true,
}: UseCollectionReportOptions) => {
  const queryClient = useQueryClient();
  const { authToken, authUser, refreshAuthToken } = useAuth();

  const normalizedCollectionId = collectionId?.trim() ?? "";
  const queryKey = buildCollectionReportQueryKey(
    normalizedCollectionId,
    authUser?.id,
  );

  const myReportQuery = useQuery({
    queryKey,
    enabled:
      enabled && normalizedCollectionId.length > 0 && Boolean(authToken),
    staleTime: 30_000,
    queryFn: ({ signal }) =>
      collectionReportApi.fetchMyReport({
        collectionId: normalizedCollectionId,
        authToken,
        refreshAuthToken,
        signal,
      }),
  });

  const submitMutation = useMutation({
    mutationFn: (value: CollectionReportValue) =>
      collectionReportApi.submitReport({
        collectionId: normalizedCollectionId,
        authToken,
        refreshAuthToken,
        value,
      }),
    onSuccess: (report) => {
      queryClient.setQueryData<CollectionReport | null>(queryKey, report);
    },
  });

  return {
    myReport: myReportQuery.data ?? null,
    isLoading: myReportQuery.isLoading,
    isError: myReportQuery.isError,
    submitReport: submitMutation.mutateAsync,
    isSubmitting: submitMutation.isPending,
    submitError: submitMutation.error,
    resetSubmitError: submitMutation.reset,
  };
};
