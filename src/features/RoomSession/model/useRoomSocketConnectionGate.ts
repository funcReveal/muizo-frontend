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

  const shouldConnectRoomSocket =
    routeNeedsRoomRealtime &&
    !authLoading &&
    Boolean(clientId) &&
    (pathname === "/rooms" ||
      Boolean(authToken || activeUsername || canResumeRoomSession));

  return {
    canResumeRoomSession,
    hasRealtimeIdentity: Boolean(
      authToken || activeUsername || canResumeRoomSession,
    ),
    routeNeedsRoomRealtime,
    shouldConnectRoomSocket,
  };
}
