import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@shared/auth/AuthContext";

import type {
  CareerOverviewData,
  CareerOverviewQueryResult,
} from "../types/career";
import { emptyCareerOverviewData, fetchCareerOverview } from "./careerOverviewApi";

type RemoteCareerOverviewState = {
  requestKey: string;
  data: CareerOverviewData | null;
  error: string | null;
};

const buildCareerOverviewRequestKey = ({
  clientId,
  hasAuthToken,
}: {
  clientId: string | null;
  hasAuthToken: boolean;
}) => {
  return `${hasAuthToken ? "auth" : "guest"}:${clientId ?? "anonymous"}`;
};

export const useCareerOverviewData = (): CareerOverviewQueryResult => {
  const { clientId, authToken, refreshAuthToken } = useAuth();

  const emptyData = useMemo(() => emptyCareerOverviewData, []);

  const requestKey = useMemo(
    () =>
      buildCareerOverviewRequestKey({
        clientId,
        hasAuthToken: Boolean(authToken),
      }),
    [authToken, clientId],
  );

  const [remoteState, setRemoteState] =
    useState<RemoteCareerOverviewState | null>(null);

  useEffect(() => {
    let cancelled = false;
    const currentRequestKey = requestKey;

    void fetchCareerOverview({
      clientId,
      authToken,
      refreshAuthToken,
    })
      .then((nextData) => {
        if (cancelled) return;

        setRemoteState({
          requestKey: currentRequestKey,
          data: nextData,
          error: null,
        });
      })
      .catch((caughtError) => {
        if (cancelled) return;

        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "讀取生涯總覽失敗";

        setRemoteState({
          requestKey: currentRequestKey,
          data: null,
          error: message,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [authToken, clientId, refreshAuthToken, requestKey]);

  const matchedRemoteState =
    remoteState?.requestKey === requestKey ? remoteState : null;

  return {
    data: matchedRemoteState?.data ?? emptyData,
    isLoading: matchedRemoteState === null,
    error: matchedRemoteState?.error ?? null,
  };
};

export default useCareerOverviewData;
