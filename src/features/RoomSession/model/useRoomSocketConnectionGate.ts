import { getStoredRoomId, getStoredRoomSessionToken } from "./roomStorage";

type UseRoomSocketConnectionGateParams = {
  activeUsername: string | null;
  authLoading: boolean;
  authToken: string | null;
  clientId: string | null;
  pathname: string;
};

export function useRoomSocketConnectionGate({
  activeUsername,
  authLoading,
  authToken,
  clientId,
  pathname,
}: UseRoomSocketConnectionGateParams) {
  const routeNeedsRoomRealtime =
    pathname.startsWith("/rooms") || pathname.startsWith("/invited");

  const canResumeRoomSession = Boolean(
    getStoredRoomId() && getStoredRoomSessionToken(),
  );

  const hasRealtimeIdentity = Boolean(
    authToken || activeUsername || canResumeRoomSession,
  );

  const shouldConnectRoomSocket =
    routeNeedsRoomRealtime &&
    !authLoading &&
    Boolean(clientId) &&
    hasRealtimeIdentity;

  return {
    canResumeRoomSession,
    hasRealtimeIdentity,
    routeNeedsRoomRealtime,
    shouldConnectRoomSocket,
  };
}
