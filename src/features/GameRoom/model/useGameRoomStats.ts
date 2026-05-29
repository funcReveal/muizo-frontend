import { useMemo } from "react";

import type { GameState, QuestionScoreBreakdown, RoomParticipant } from "@features/RoomSession";
import { buildMyFeedbackModel } from "./gameRoomDerivations";
import { isComboMilestone, resolveComboBreakTier, resolveComboTier } from "../ui/lib/gameRoomUiUtils";

interface UseGameRoomStatsParams {
  participants: RoomParticipant[];
  meClientId?: string;
  scorePartsByClientId: Map<string, { base: number; gain: number }>;
  answeredRankByClientId: Map<string, number>;
  answeredClientIdSet: Set<string>;
  liveParticipantCount: number;
  liveAnsweredCount: number;
  liveAccuracyPct: number | null;
  selectedChoice: number | null;
  correctChoiceIndex: number;
  /**
   * Server-confirmed answer result for the local player, sourced from
   * questionStats.answersByClientId[meClientId].result.
   *
   * Used as an authoritative fallback for myIsCorrect to handle the race
   * condition where the reveal broadcast arrives before the submit ACK (the
   * last player to answer triggers the reveal, so the broadcast and ACK are
   * racing). Without this, selectedChoice is still null when the reveal fires,
   * causing a false "wrong" tone even though the backend scored the answer as
   * correct.
   */
  myServerAnswerResult: "correct" | "wrong" | "unanswered" | null;
  myBackendScoreBreakdown: QuestionScoreBreakdown | null;
  gamePhase: GameState["phase"];
  isReveal: boolean;
  isInterTrackWait: boolean;
  isGuessUrgency: boolean;
  startCountdownSec: number;
  myHasChangedAnswer: boolean;
}

const useGameRoomStats = ({
  participants,
  meClientId,
  scorePartsByClientId,
  answeredRankByClientId,
  answeredClientIdSet,
  liveParticipantCount,
  liveAnsweredCount,
  liveAccuracyPct,
  selectedChoice,
  correctChoiceIndex,
  myServerAnswerResult,
  myBackendScoreBreakdown,
  gamePhase,
  isReveal,
  isInterTrackWait,
  isGuessUrgency,
  startCountdownSec,
  myHasChangedAnswer,
}: UseGameRoomStatsParams) => {
  const meParticipant = useMemo(
    () =>
      participants.find((participant) => participant.clientId === meClientId) ??
      null,
    [participants, meClientId],
  );
  const myScoreParts =
    meParticipant !== null
      ? scorePartsByClientId.get(meParticipant.clientId) ?? {
        base: meParticipant.score,
        gain: 0,
      }
      : null;
  const myGain = myScoreParts?.gain ?? 0;
  const myAnswerRank =
    meClientId != null ? answeredRankByClientId.get(meClientId) ?? null : null;
  const myHasAnswered =
    selectedChoice !== null ||
    Boolean(meClientId && answeredClientIdSet.has(meClientId));
  // Primary: client-side selection matches the revealed correct index.
  // Fallback: server-confirmed result, which resolves the race condition where
  // the reveal broadcast arrives before the submit ACK (last player to answer
  // triggers the reveal simultaneously).
  const myIsCorrect =
    (selectedChoice !== null && selectedChoice === correctChoiceIndex) ||
    myServerAnswerResult === "correct";
  const myResolvedScoreBreakdown = myBackendScoreBreakdown;
  const myResolvedGain = myResolvedScoreBreakdown?.totalGainPoints ?? myGain;
  const myComboNow = Math.max(0, meParticipant?.combo ?? 0);
  const myComboTier = resolveComboTier(myComboNow);
  const myComboMilestone = isComboMilestone(myComboNow);
  const hasActiveComboStreak = myComboTier > 0;
  const comboBonusPoints = myResolvedScoreBreakdown?.comboBonusPoints ?? 0;
  const comboBreakTier = resolveComboBreakTier(comboBonusPoints);
  const isComboBreakThisQuestion =
    isReveal &&
    (!myHasAnswered || !myIsCorrect) &&
    comboBreakTier > 0;

  const myFeedback = useMemo(
    () =>
      buildMyFeedbackModel({
        gamePhase,
        isInterTrackWait,
        isGuessUrgency,
        isReveal,
        myAnswerRank,
        liveParticipantCount,
        liveAnsweredCount,
        liveAccuracyPct,
        startCountdownSec,
        meClientId,
        myHasAnswered,
        selectedChoice,
        myIsCorrect,
        myResolvedGain,
        myResolvedScoreBreakdownTotalGain:
          myResolvedScoreBreakdown?.totalGainPoints ?? null,
        myHasChangedAnswer,
      }),
    [
      gamePhase,
      isInterTrackWait,
      isGuessUrgency,
      isReveal,
      myAnswerRank,
      liveParticipantCount,
      liveAnsweredCount,
      liveAccuracyPct,
      startCountdownSec,
      meClientId,
      myHasAnswered,
      selectedChoice,
      myIsCorrect,
      myResolvedGain,
      myResolvedScoreBreakdown?.totalGainPoints,
      myHasChangedAnswer,
    ],
  );
  const revealTone = myFeedback?.tone ?? "neutral";
  const isPendingFeedbackCard =
    !isInterTrackWait && gamePhase === "guess" && !myHasAnswered;

  return {
    myAnswerRank,
    liveParticipantCount,
    liveAnsweredCount,
    liveAccuracyPct,
    myHasAnswered,
    myIsCorrect,
    myResolvedScoreBreakdown: myResolvedScoreBreakdown as QuestionScoreBreakdown | null,
    myComboNow,
    myComboTier,
    myComboMilestone,
    hasActiveComboStreak,
    comboBreakTier,
    isComboBreakThisQuestion,
    myFeedback,
    revealTone,
    isPendingFeedbackCard,
  };
};

export default useGameRoomStats;

