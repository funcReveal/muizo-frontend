import { useMemo } from "react";

import type { GameQuestionStats, GameState, RoomParticipant } from "../../Room/model/types";
import { buildRevealChoicePickMap } from "./gameRoomDerivations";

interface UseGameRoomQuestionDerivedStateParams {
  gamePhase: GameState["phase"];
  questionStats: GameQuestionStats | undefined;
  participants: RoomParticipant[];
  meClientId?: string;
}

const normalizeCount = (value: number | null | undefined) =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : null;

const useGameRoomQuestionDerivedState = ({
  gamePhase,
  questionStats,
  participants,
  meClientId,
}: UseGameRoomQuestionDerivedStateParams) => {
  const participantCount = participants.length;
  const participantClientIdSet = useMemo(
    () => new Set(participants.map((participant) => participant.clientId)),
    [participants],
  );

  const liveParticipantCount =
    normalizeCount(questionStats?.participantCount) ?? participantCount;
  const liveAnsweredCount =
    normalizeCount(questionStats?.answeredCount) ??
    (Array.isArray(questionStats?.answerOrderLatest)
      ? questionStats.answerOrderLatest.length
      : 0);
  const liveCorrectCount = normalizeCount(questionStats?.correctCount);
  const liveWrongCount = normalizeCount(questionStats?.wrongCount);
  const liveUnansweredCount = normalizeCount(questionStats?.unansweredCount);
  const liveAccuracyPct =
    liveCorrectCount !== null && liveParticipantCount > 0
      ? Math.round((liveCorrectCount / Math.max(1, liveParticipantCount)) * 100)
      : null;

  const requiredAnswerCount =
    participantCount > 0 && liveParticipantCount > 0
      ? Math.min(participantCount, liveParticipantCount)
      : Math.max(participantCount, liveParticipantCount);

  const serverAnsweredCurrentParticipantCount = useMemo(() => {
    const answersByClientId = questionStats?.answersByClientId;
    if (
      answersByClientId &&
      typeof answersByClientId === "object" &&
      participantClientIdSet.size > 0
    ) {
      return Object.entries(answersByClientId).reduce((count, [clientId, answer]) => {
        if (!participantClientIdSet.has(clientId)) return count;
        const hasChoiceIndex =
          typeof answer?.choiceIndex === "number" &&
          Number.isFinite(answer.choiceIndex);
        const hasResolvedResult =
          answer?.result === "correct" || answer?.result === "wrong";
        return hasChoiceIndex || hasResolvedResult ? count + 1 : count;
      }, 0);
    }
    const answerOrderLatest = questionStats?.answerOrderLatest;
    if (Array.isArray(answerOrderLatest) && participantClientIdSet.size > 0) {
      const seen = new Set<string>();
      let count = 0;
      answerOrderLatest.forEach((clientId) => {
        if (!participantClientIdSet.has(clientId) || seen.has(clientId)) return;
        seen.add(clientId);
        count += 1;
      });
      return count;
    }
    return liveAnsweredCount;
  }, [
    liveAnsweredCount,
    participantClientIdSet,
    questionStats?.answerOrderLatest,
    questionStats?.answersByClientId,
  ]);

  const allAnsweredByServer =
    gamePhase === "guess" &&
    requiredAnswerCount > 0 &&
    serverAnsweredCurrentParticipantCount >= requiredAnswerCount;

  const revealChoicePickMap = useMemo(
    () =>
      buildRevealChoicePickMap({
        phase: gamePhase,
        answersByClientId: questionStats?.answersByClientId,
        participants,
        meClientId,
      }),
    [gamePhase, meClientId, participants, questionStats?.answersByClientId],
  );

  return {
    liveParticipantCount,
    liveAnsweredCount,
    liveCorrectCount,
    liveWrongCount,
    liveUnansweredCount,
    liveAccuracyPct,
    participantCount,
    requiredAnswerCount,
    serverAnsweredCurrentParticipantCount,
    allAnsweredByServer,
    revealChoicePickMap,
  };
};

export default useGameRoomQuestionDerivedState;
