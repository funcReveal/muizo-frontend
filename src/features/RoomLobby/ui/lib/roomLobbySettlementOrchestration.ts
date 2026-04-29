import type {
  RoomSettlementHistorySummary,
  RoomSettlementSnapshot,
} from "@features/RoomSession";

export type SettlementIdentity = string | null;

type SettlementIdentitySource = {
  matchId?: string | null;
  roomId?: string | null;
  roundNo?: number | null;
};

export const buildSettlementIdentity = (
  source: SettlementIdentitySource | null | undefined,
): SettlementIdentity => {
  const matchId = source?.matchId?.trim();
  if (matchId) return matchId;
  if (!source?.roomId) return null;
  if (typeof source.roundNo !== "number" || !Number.isFinite(source.roundNo)) {
    return null;
  }
  return `${source.roomId}:${Math.floor(source.roundNo)}`;
};

export const getSettlementIdentityFromSummary = (
  summary: RoomSettlementHistorySummary | null | undefined,
): SettlementIdentity =>
  buildSettlementIdentity({
    matchId: summary?.matchId ?? null,
    roomId: summary?.roomId ?? null,
    roundNo: summary?.roundNo ?? null,
  });

export const getSettlementIdentityFromSnapshot = (
  snapshot: RoomSettlementSnapshot | null | undefined,
): SettlementIdentity =>
  buildSettlementIdentity({
    roomId: snapshot?.room.id ?? null,
    roundNo: snapshot?.roundNo ?? null,
  });

export const shouldClearDismissedSettlementIdentity = ({
  dismissedIdentity,
  latestIdentity,
}: {
  dismissedIdentity: SettlementIdentity;
  latestIdentity: SettlementIdentity;
}) =>
  Boolean(
    dismissedIdentity &&
      latestIdentity &&
      dismissedIdentity !== latestIdentity,
  );

export const shouldAutoOpenSettlementCandidate = ({
  candidateIdentity,
  previousTopIdentity,
  dismissedIdentity,
  autoOpenedIdentity,
}: {
  candidateIdentity: SettlementIdentity;
  previousTopIdentity: SettlementIdentity;
  dismissedIdentity: SettlementIdentity;
  autoOpenedIdentity: SettlementIdentity;
}) => {
  if (!candidateIdentity) return false;
  if (candidateIdentity === previousTopIdentity) return false;
  if (dismissedIdentity && candidateIdentity === dismissedIdentity) {
    return false;
  }
  if (autoOpenedIdentity && candidateIdentity === autoOpenedIdentity) {
    return false;
  }
  return true;
};

export const shouldApplySettlementAsyncActivation = ({
  requestVersion,
  latestRequestVersion,
  requestedIdentity,
  resultIdentity,
  dismissedIdentity,
}: {
  requestVersion: number;
  latestRequestVersion: number;
  requestedIdentity: SettlementIdentity;
  resultIdentity?: SettlementIdentity;
  dismissedIdentity: SettlementIdentity;
}) => {
  if (requestVersion !== latestRequestVersion) return false;
  const effectiveIdentity = resultIdentity ?? requestedIdentity;
  if (!effectiveIdentity) return false;
  if (dismissedIdentity && effectiveIdentity === dismissedIdentity) {
    return false;
  }
  return true;
};

export const shouldRequireCurrentGameSettlement = ({
  isLeaderboardChallenge,
  isSettlementView,
  isExplicitReview,
  targetGameSessionId,
}: {
  isLeaderboardChallenge: boolean;
  isSettlementView: boolean;
  isExplicitReview: boolean;
  targetGameSessionId: number | null;
}) =>
  Boolean(
    isLeaderboardChallenge &&
      isSettlementView &&
      !isExplicitReview &&
      targetGameSessionId !== null,
  );
