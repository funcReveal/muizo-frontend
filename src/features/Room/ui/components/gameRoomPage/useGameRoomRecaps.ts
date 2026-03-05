import { useCallback, useEffect, useRef, useState } from "react";

import type { GameChoice, GameQuestionStats, PlaylistItem, RoomParticipant } from "../../../model/types";
import type { SettlementQuestionRecap } from "../GameSettlementPanel";
import { buildSettlementQuestionRecap } from "./gameRoomPageDerivations";
import { deferStateUpdate } from "./gameRoomPageUtils";

interface UseGameRoomRecapsParams {
  isReveal: boolean;
  trackSessionKey: string;
  trackCursor: number;
  currentTrackIndex: number;
  correctChoiceIndex: number;
  choices: GameChoice[];
  questionStats: GameQuestionStats | undefined;
  meClientId?: string;
  selectedChoiceState: {
    trackIndex: number;
    choiceIndex: number | null;
  };
  answeredOrderForCurrentParticipants: string[];
  answeredClientIdSet: Set<string>;
  scorePartsByClientId: Map<string, { base: number; gain: number }>;
  participants: RoomParticipant[];
  resolvedAnswerTitle: string;
  item: {
    uploader?: string;
    duration?: string;
    thumbnail?: string;
  } | null;
  playlist: PlaylistItem[];
  onSettlementRecapChange?: (recaps: SettlementQuestionRecap[]) => void;
}

const useGameRoomRecaps = ({
  isReveal,
  trackSessionKey,
  trackCursor,
  currentTrackIndex,
  correctChoiceIndex,
  choices,
  questionStats,
  meClientId,
  selectedChoiceState,
  answeredOrderForCurrentParticipants,
  answeredClientIdSet,
  scorePartsByClientId,
  participants,
  resolvedAnswerTitle,
  item,
  playlist,
  onSettlementRecapChange,
}: UseGameRoomRecapsParams) => {
  const [questionRecaps, setQuestionRecaps] = useState<SettlementQuestionRecap[]>(
    [],
  );
  const recapCapturedTrackSessionKeysRef = useRef<Set<string>>(new Set());

  const resetQuestionRecaps = useCallback(() => {
    recapCapturedTrackSessionKeysRef.current.clear();
    deferStateUpdate(() => {
      setQuestionRecaps([]);
    });
  }, []);

  useEffect(() => {
    if (!isReveal) return;
    if (!choices.length) return;
    if (recapCapturedTrackSessionKeysRef.current.has(trackSessionKey)) return;
    recapCapturedTrackSessionKeysRef.current.add(trackSessionKey);

    const serverAnswerForMe =
      meClientId && questionStats?.answersByClientId
        ? questionStats.answersByClientId[meClientId]
        : undefined;
    const myChoiceIndex =
      typeof serverAnswerForMe?.choiceIndex === "number"
        ? serverAnswerForMe.choiceIndex
        : selectedChoiceState.trackIndex === currentTrackIndex
          ? selectedChoiceState.choiceIndex
          : null;
    const participantCount =
      typeof questionStats?.participantCount === "number" &&
      Number.isFinite(questionStats.participantCount)
        ? Math.max(0, Math.floor(questionStats.participantCount))
        : participants.length;
    const answeredClientIds = answeredOrderForCurrentParticipants;
    const answeredCount =
      typeof questionStats?.answeredCount === "number" &&
      Number.isFinite(questionStats.answeredCount)
        ? Math.max(0, Math.floor(questionStats.answeredCount))
        : answeredClientIds.length;
    const correctClientIds = participants
      .filter((participant) => {
        const parts = scorePartsByClientId.get(participant.clientId);
        return (parts?.gain ?? 0) > 0;
      })
      .map((participant) => participant.clientId);
    const correctClientIdSet = new Set(correctClientIds);
    const correctCount =
      typeof questionStats?.correctCount === "number" &&
      Number.isFinite(questionStats.correctCount)
        ? Math.max(0, Math.floor(questionStats.correctCount))
        : correctClientIds.length;
    const wrongCount =
      typeof questionStats?.wrongCount === "number" &&
      Number.isFinite(questionStats.wrongCount)
        ? Math.max(0, Math.floor(questionStats.wrongCount))
        : Math.max(0, answeredCount - correctCount);
    const unansweredCount =
      typeof questionStats?.unansweredCount === "number" &&
      Number.isFinite(questionStats.unansweredCount)
        ? Math.max(0, Math.floor(questionStats.unansweredCount))
        : Math.max(0, participantCount - answeredCount);
    const fastestCorrectRank =
      answeredClientIds.findIndex((clientId) => correctClientIdSet.has(clientId));
    const fastestCorrectMs =
      typeof questionStats?.fastestCorrectMs === "number" &&
      Number.isFinite(questionStats.fastestCorrectMs)
        ? Math.max(0, Math.floor(questionStats.fastestCorrectMs))
        : null;
    const medianCorrectMs =
      typeof questionStats?.medianCorrectMs === "number" &&
      Number.isFinite(questionStats.medianCorrectMs)
        ? Math.max(0, Math.floor(questionStats.medianCorrectMs))
        : null;
    const changedAnswerCount =
      typeof questionStats?.changedAnswerCount === "number" &&
      Number.isFinite(questionStats.changedAnswerCount)
        ? Math.max(0, Math.floor(questionStats.changedAnswerCount))
        : null;
    const changedAnswerUserCount =
      typeof questionStats?.changedAnswerUserCount === "number" &&
      Number.isFinite(questionStats.changedAnswerUserCount)
        ? Math.max(0, Math.floor(questionStats.changedAnswerUserCount))
        : null;
    const answersByClientId =
      questionStats?.answersByClientId &&
      typeof questionStats.answersByClientId === "object"
        ? questionStats.answersByClientId
        : undefined;
    const myAnswered =
      myChoiceIndex !== null ||
      Boolean(serverAnswerForMe) ||
      Boolean(meClientId && answeredClientIdSet.has(meClientId));
    const recapItem: SettlementQuestionRecap = buildSettlementQuestionRecap({
      trackSessionKey,
      order: trackCursor + 1,
      trackIndex: currentTrackIndex,
      title: resolvedAnswerTitle,
      uploader: item?.uploader,
      duration: item?.duration,
      thumbnail: item?.thumbnail,
      myChoiceIndex,
      correctChoiceIndex,
      choices,
      playlistChoices: playlist,
      participantCount,
      answeredCount,
      correctCount,
      wrongCount,
      unansweredCount,
      changedAnswerCount,
      changedAnswerUserCount,
      fastestCorrectRank: fastestCorrectRank >= 0 ? fastestCorrectRank + 1 : null,
      fastestCorrectMs,
      medianCorrectMs,
      answersByClientId,
      myAnswered,
    });

    deferStateUpdate(() => {
      setQuestionRecaps((prev) => {
        const next = [...prev.filter((recap) => recap.key !== recapItem.key), recapItem];
        next.sort((a, b) => a.order - b.order || a.trackIndex - b.trackIndex);
        return next;
      });
    });
  }, [
    answeredClientIdSet,
    answeredOrderForCurrentParticipants,
    choices,
    correctChoiceIndex,
    currentTrackIndex,
    isReveal,
    item?.duration,
    item?.thumbnail,
    item?.uploader,
    meClientId,
    participants,
    playlist,
    questionStats,
    resolvedAnswerTitle,
    scorePartsByClientId,
    selectedChoiceState.choiceIndex,
    selectedChoiceState.trackIndex,
    trackCursor,
    trackSessionKey,
  ]);

  useEffect(() => {
    onSettlementRecapChange?.(questionRecaps);
  }, [onSettlementRecapChange, questionRecaps]);

  return {
    questionRecaps,
    resetQuestionRecaps,
  };
};

export default useGameRoomRecaps;
