import type { ChallengeProjectedLeaderboardResponse } from "./projectionTypes";

export function getChallengeProjectionRefreshTargetScore(
  data: ChallengeProjectedLeaderboardResponse | null,
): number | null {
  if (!data) return null;
  const targetScore = data.myStanding.nextTarget?.score;
  if (typeof targetScore === "number" && Number.isFinite(targetScore)) {
    return targetScore;
  }

  const myRank = data.myStanding.projectedRank;
  if (typeof myRank !== "number" || myRank <= 1) return null;

  const nearbyTarget = data.nearbyOpponents
    .filter(
      (opponent) =>
        opponent.relation === "ahead" &&
        typeof opponent.bestScore === "number" &&
        Number.isFinite(opponent.bestScore),
    )
    .sort((a, b) => a.gapFromMe - b.gapFromMe)[0];

  return nearbyTarget?.bestScore ?? null;
}

export function shouldRefreshChallengeProjectionForScoreGain({
  previousScore,
  newScore,
  data,
}: {
  previousScore: number;
  newScore: number;
  data: ChallengeProjectedLeaderboardResponse | null;
}): boolean {
  if (newScore <= previousScore) return false;
  if (!data) return true;

  const targetScore = getChallengeProjectionRefreshTargetScore(data);
  if (targetScore === null) return false;

  return targetScore <= previousScore || targetScore <= newScore;
}

export function shouldDelayChallengeScoreFeedbackForProjection({
  score,
  data,
}: {
  score: number;
  data: ChallengeProjectedLeaderboardResponse | null;
}): boolean {
  if (!data) return true;
  if (data.myStanding.liveScore >= score) return false;

  const targetScore = getChallengeProjectionRefreshTargetScore(data);
  return targetScore !== null && score >= targetScore;
}
