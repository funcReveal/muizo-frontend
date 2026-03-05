import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  GameState,
  RoomParticipant,
  SubmitAnswerResult,
} from "../../../model/types";
import type { GameSfxEvent } from "../../../model/sfx/gameSfxEngine";
import type {
  AnswerDecisionMeta,
  ChoiceCommitFxKind,
  ChoiceCommitFxState,
} from "./gameRoomPageTypes";
import {
  buildScoreBaselineMap,
  collectAnsweredClientIds,
  deferStateUpdate,
} from "./gameRoomPageUtils";

interface UseGameRoomAnswerFlowParams {
  gameState: GameState;
  participants: RoomParticipant[];
  meClientId?: string;
  currentTrackIndex: number;
  trackSessionKey: string;
  canAnswerNow: boolean;
  onSubmitChoice: (choiceIndex: number) => Promise<SubmitAnswerResult>;
  getServerNowMs: () => number;
  primeSfxAudio: () => void;
  playGameSfx: (event: GameSfxEvent) => boolean;
}

const useGameRoomAnswerFlow = ({
  gameState,
  participants,
  meClientId,
  currentTrackIndex,
  trackSessionKey,
  canAnswerNow,
  onSubmitChoice,
  getServerNowMs,
  primeSfxAudio,
  playGameSfx,
}: UseGameRoomAnswerFlowParams) => {
  const [selectedChoiceState, setSelectedChoiceState] = useState<{
    trackIndex: number;
    choiceIndex: number | null;
  }>({ trackIndex: -1, choiceIndex: null });
  const [pendingChoiceState, setPendingChoiceState] = useState<{
    trackSessionKey: string;
    choiceIndex: number | null;
    requestId: number;
  } | null>(null);
  const [answerDecisionMeta, setAnswerDecisionMeta] = useState<AnswerDecisionMeta>({
    trackSessionKey: "",
    firstChoiceIndex: null,
    firstSubmittedAtMs: null,
    hasChangedChoice: false,
  });
  const [choiceCommitFxState, setChoiceCommitFxState] =
    useState<ChoiceCommitFxState | null>(null);
  const [answeredOrderSnapshot, setAnsweredOrderSnapshot] = useState<{
    trackSessionKey: string;
    order: string[];
  }>(() => ({
    trackSessionKey,
    order: collectAnsweredClientIds(
      gameState.lockedOrder,
      gameState.lockedClientIds,
      gameState.questionStats?.answerOrderLatest,
      gameState.questionStats?.answersByClientId,
    ),
  }));
  const [scoreBaselineState, setScoreBaselineState] = useState<{
    trackSessionKey: string;
    byClientId: Record<string, number>;
  }>(() => ({
    trackSessionKey,
    byClientId: buildScoreBaselineMap(participants),
  }));
  const submitRequestSeqRef = useRef(0);
  const choiceCommitFxTimerRef = useRef<number | null>(null);

  const confirmedChoice =
    selectedChoiceState.trackIndex === currentTrackIndex
      ? selectedChoiceState.choiceIndex
      : null;
  const pendingChoice =
    pendingChoiceState?.trackSessionKey === trackSessionKey
      ? pendingChoiceState.choiceIndex
      : null;
  const selectedChoice = pendingChoice ?? confirmedChoice;
  const answerDecisionMetaForCurrentTrack =
    answerDecisionMeta.trackSessionKey === trackSessionKey ? answerDecisionMeta : null;
  const myHasChangedAnswer = Boolean(answerDecisionMetaForCurrentTrack?.hasChangedChoice);

  useEffect(() => {
    deferStateUpdate(() => {
      setAnsweredOrderSnapshot((prev) => {
        const incoming = collectAnsweredClientIds(
          gameState.lockedOrder,
          gameState.lockedClientIds,
          gameState.questionStats?.answerOrderLatest,
          gameState.questionStats?.answersByClientId,
        );
        if (prev.trackSessionKey !== trackSessionKey) {
          return {
            trackSessionKey,
            order: incoming,
          };
        }
        if (gameState.phase === "guess") {
          if (
            incoming.length === prev.order.length &&
            incoming.every((clientId, idx) => clientId === prev.order[idx])
          ) {
            return prev;
          }
          return {
            trackSessionKey: prev.trackSessionKey,
            order: incoming,
          };
        }
        if (incoming.length === 0) {
          return prev;
        }
        const nextOrder = [...prev.order];
        const seen = new Set(nextOrder);
        let changed = false;
        incoming.forEach((clientId) => {
          if (seen.has(clientId)) return;
          seen.add(clientId);
          nextOrder.push(clientId);
          changed = true;
        });
        if (!changed) {
          return prev;
        }
        return {
          trackSessionKey: prev.trackSessionKey,
          order: nextOrder,
        };
      });
    });
  }, [
    gameState.lockedClientIds,
    gameState.lockedOrder,
    gameState.phase,
    gameState.questionStats?.answerOrderLatest,
    gameState.questionStats?.answersByClientId,
    trackSessionKey,
  ]);

  useEffect(() => {
    if (!meClientId) return;
    const serverAnswer = gameState.questionStats?.answersByClientId?.[meClientId];
    if (!serverAnswer) return;
    const resolvedChoiceIndex =
      typeof serverAnswer.choiceIndex === "number" ? serverAnswer.choiceIndex : null;
    deferStateUpdate(() => {
      setSelectedChoiceState((prev) => {
        if (
          prev.trackIndex === currentTrackIndex &&
          prev.choiceIndex === resolvedChoiceIndex
        ) {
          return prev;
        }
        return {
          trackIndex: currentTrackIndex,
          choiceIndex: resolvedChoiceIndex,
        };
      });
      setPendingChoiceState((prev) =>
        prev?.trackSessionKey === trackSessionKey ? null : prev,
      );
    });
  }, [
    currentTrackIndex,
    gameState.questionStats?.answersByClientId,
    meClientId,
    trackSessionKey,
  ]);

  useEffect(() => {
    deferStateUpdate(() => {
      setScoreBaselineState((prev) => {
        if (prev.trackSessionKey !== trackSessionKey) {
          return {
            trackSessionKey,
            byClientId: buildScoreBaselineMap(participants),
          };
        }
        let changed = false;
        const nextByClientId = { ...prev.byClientId };
        participants.forEach((participant) => {
          if (nextByClientId[participant.clientId] !== undefined) return;
          nextByClientId[participant.clientId] = participant.score;
          changed = true;
        });
        if (!changed) {
          return prev;
        }
        return {
          trackSessionKey: prev.trackSessionKey,
          byClientId: nextByClientId,
        };
      });
    });
  }, [participants, trackSessionKey]);

  useEffect(() => {
    let cancelled = false;
    deferStateUpdate(() => {
      if (cancelled) return;
      setAnswerDecisionMeta({
        trackSessionKey,
        firstChoiceIndex: null,
        firstSubmittedAtMs: null,
        hasChangedChoice: false,
      });
    });
    if (choiceCommitFxTimerRef.current !== null) {
      window.clearTimeout(choiceCommitFxTimerRef.current);
      choiceCommitFxTimerRef.current = null;
    }
    deferStateUpdate(() => {
      if (cancelled) return;
      setChoiceCommitFxState(null);
    });
    deferStateUpdate(() => {
      if (cancelled) return;
      setPendingChoiceState(null);
    });
    return () => {
      cancelled = true;
    };
  }, [trackSessionKey]);

  useEffect(
    () => () => {
      if (choiceCommitFxTimerRef.current !== null) {
        window.clearTimeout(choiceCommitFxTimerRef.current);
      }
    },
    [],
  );

  const submitChoiceWithFeedback = useCallback(
    async (choiceIndex: number) => {
      if (!canAnswerNow) return;
      const currentSelectedChoice =
        pendingChoiceState?.trackSessionKey === trackSessionKey
          ? pendingChoiceState.choiceIndex
          : selectedChoiceState.trackIndex === currentTrackIndex
            ? selectedChoiceState.choiceIndex
            : null;
      const changedChoice =
        currentSelectedChoice !== null && currentSelectedChoice !== choiceIndex;
      const fxKind: ChoiceCommitFxKind = changedChoice ? "reselect" : "lock";
      const submittedAtMs = getServerNowMs();
      const requestId = (submitRequestSeqRef.current += 1);

      primeSfxAudio();
      playGameSfx("lock");
      setPendingChoiceState({
        trackSessionKey,
        choiceIndex,
        requestId,
      });
      setChoiceCommitFxState((prev) => ({
        trackSessionKey,
        choiceIndex,
        kind: fxKind,
        key: (prev?.key ?? 0) + 1,
      }));
      if (choiceCommitFxTimerRef.current !== null) {
        window.clearTimeout(choiceCommitFxTimerRef.current);
      }
      choiceCommitFxTimerRef.current = window.setTimeout(() => {
        setChoiceCommitFxState((current) => {
          if (
            current &&
            current.trackSessionKey === trackSessionKey &&
            current.choiceIndex === choiceIndex
          ) {
            return null;
          }
          return current;
        });
        choiceCommitFxTimerRef.current = null;
      }, 620);

      const result = await onSubmitChoice(choiceIndex);
      setPendingChoiceState((prev) => {
        if (
          prev &&
          prev.trackSessionKey === trackSessionKey &&
          prev.requestId === requestId
        ) {
          return null;
        }
        return prev;
      });
      if (!result.ok) {
        return;
      }
      const acceptedChoiceIndex = result.data.choiceIndex;
      if (meClientId && (changedChoice || currentSelectedChoice === null)) {
        setAnsweredOrderSnapshot((prev) => {
          if (prev.trackSessionKey !== trackSessionKey) return prev;
          const base = prev.order.filter((clientId) => clientId !== meClientId);
          return {
            trackSessionKey: prev.trackSessionKey,
            order: [...base, meClientId],
          };
        });
      }
      setSelectedChoiceState({
        trackIndex: currentTrackIndex,
        choiceIndex:
          typeof acceptedChoiceIndex === "number" ? acceptedChoiceIndex : null,
      });
      setAnswerDecisionMeta((prev) => {
        if (prev.trackSessionKey !== trackSessionKey) {
          return {
            trackSessionKey,
            firstChoiceIndex:
              typeof acceptedChoiceIndex === "number" ? acceptedChoiceIndex : null,
            firstSubmittedAtMs: submittedAtMs,
            hasChangedChoice: false,
          };
        }
        return {
          trackSessionKey,
          firstChoiceIndex:
            prev.firstChoiceIndex ??
            (typeof acceptedChoiceIndex === "number" ? acceptedChoiceIndex : null),
          firstSubmittedAtMs: prev.firstSubmittedAtMs ?? submittedAtMs,
          hasChangedChoice: prev.hasChangedChoice || changedChoice,
        };
      });
    },
    [
      canAnswerNow,
      currentTrackIndex,
      getServerNowMs,
      meClientId,
      onSubmitChoice,
      pendingChoiceState,
      playGameSfx,
      primeSfxAudio,
      selectedChoiceState,
      trackSessionKey,
    ],
  );

  const participantIdSet = useMemo(
    () => new Set(participants.map((participant) => participant.clientId)),
    [participants],
  );
  const answeredOrderForCurrentParticipants = useMemo(
    () =>
      answeredOrderSnapshot.order.filter((clientId) =>
        participantIdSet.has(clientId),
      ),
    [answeredOrderSnapshot.order, participantIdSet],
  );
  const answeredClientIdSet = useMemo(
    () => new Set(answeredOrderForCurrentParticipants),
    [answeredOrderForCurrentParticipants],
  );
  const answeredRankByClientId = useMemo(() => {
    const rankMap = new Map<string, number>();
    answeredOrderForCurrentParticipants.forEach((clientId, idx) => {
      rankMap.set(clientId, idx + 1);
    });
    return rankMap;
  }, [answeredOrderForCurrentParticipants]);
  const answeredCount = answeredOrderForCurrentParticipants.length;

  const scorePartsByClientId = useMemo(() => {
    const partsMap = new Map<string, { base: number; gain: number }>();
    participants.forEach((participant) => {
      const baseline =
        scoreBaselineState.byClientId[participant.clientId] ?? participant.score;
      const gain = participant.score - baseline;
      partsMap.set(participant.clientId, {
        base: participant.score - gain,
        gain,
      });
    });
    return partsMap;
  }, [participants, scoreBaselineState.byClientId]);

  return {
    selectedChoiceState,
    selectedChoice,
    choiceCommitFxState,
    myHasChangedAnswer,
    submitChoiceWithFeedback,
    answeredOrderForCurrentParticipants,
    answeredClientIdSet,
    answeredRankByClientId,
    answeredCount,
    scorePartsByClientId,
  };
};

export default useGameRoomAnswerFlow;
