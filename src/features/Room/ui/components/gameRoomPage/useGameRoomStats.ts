import { useMemo } from "react";

import type { GameState, QuestionScoreBreakdown, RoomParticipant } from "../../../model/types";
import { buildMyFeedbackModel } from "./gameRoomPageDerivations";
import { isComboMilestone, resolveComboBreakTier, resolveComboTier } from "../../gameRoomUiUtils";

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
  const myIsCorrect = selectedChoice !== null && selectedChoice === correctChoiceIndex;
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
