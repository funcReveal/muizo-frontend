import {
  useCallback,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import type { RoomParticipant } from "../../Room/model/types";

interface ScoreMetrics {
  accuracy: number;
  avgSpeedMs: number | null;
  combo: number;
}

interface TopAccuracyEntry {
  participant: RoomParticipant;
  accuracy: number;
}

interface TopComboEntry {
  participant: RoomParticipant;
  combo: number;
}

interface FastestAverageAnswerEntry {
  participant: RoomParticipant;
  ms: number;
}

interface ParticipantScoreMeta {
  byClientId: Record<string, string>;
  tooltipByClientId: Record<string, string>;
  metricsByClientId: Record<string, ScoreMetrics>;
}

interface UseSettlementReviewStateParams {
  participants: RoomParticipant[];
  playedQuestionCount: number;
  meClientId?: string;
}

interface UseSettlementReviewStateResult {
  sortedParticipants: RoomParticipant[];
  winner: RoomParticipant | null;
  runnerUp: RoomParticipant | null;
  thirdPlace: RoomParticipant | null;
  me: RoomParticipant | null;
  myRank: number;
  selectedReviewParticipantClientId: string | null;
  setSelectedReviewParticipantClientId: Dispatch<SetStateAction<string | null>>;
  effectiveSelectedReviewParticipantClientId: string | null;
  selectedReviewParticipant: RoomParticipant | null;
  selectedReviewParticipantRank: number;
  selectedReviewParticipantIndex: number;
  currentReviewTargetLabel: string;
  goPrevReviewParticipant: () => void;
  goNextReviewParticipant: () => void;
  topAccuracyEntry: TopAccuracyEntry | null;
  topComboEntry: TopComboEntry | null;
  fastestAverageAnswerEntry: FastestAverageAnswerEntry | null;
  participantScoreMeta: ParticipantScoreMeta;
}

const useSettlementReviewState = ({
  participants,
  playedQuestionCount,
  meClientId,
}: UseSettlementReviewStateParams): UseSettlementReviewStateResult => {
  const sortedParticipants = useMemo(
    () =>
      participants
        .slice()
        .sort(
          (a, b) =>
            b.score - a.score || (b.correctCount ?? 0) - (a.correctCount ?? 0),
        ),
    [participants],
  );

  const winner = sortedParticipants[0] ?? null;
  const runnerUp = sortedParticipants[1] ?? null;
  const thirdPlace = sortedParticipants[2] ?? null;

  const me = meClientId
    ? (sortedParticipants.find((participant) => participant.clientId === meClientId) ??
      null)
    : null;
  const myRank = meClientId
    ? sortedParticipants.findIndex((participant) => participant.clientId === meClientId) + 1
    : 0;

  const [selectedReviewParticipantClientId, setSelectedReviewParticipantClientId] =
    useState<string | null>(() => {
      if (meClientId) return meClientId;
      return sortedParticipants[0]?.clientId ?? null;
    });

  const effectiveSelectedReviewParticipantClientId = useMemo(() => {
    if (!sortedParticipants.length) return null;
    if (
      selectedReviewParticipantClientId &&
      sortedParticipants.some(
        (participant) => participant.clientId === selectedReviewParticipantClientId,
      )
    ) {
      return selectedReviewParticipantClientId;
    }
    if (
      meClientId &&
      sortedParticipants.some((participant) => participant.clientId === meClientId)
    ) {
      return meClientId;
    }
    return sortedParticipants[0]?.clientId ?? null;
  }, [meClientId, selectedReviewParticipantClientId, sortedParticipants]);

  const selectedReviewParticipant = effectiveSelectedReviewParticipantClientId
    ? (sortedParticipants.find(
        (participant) => participant.clientId === effectiveSelectedReviewParticipantClientId,
      ) ?? null)
    : null;

  const selectedReviewParticipantRank = effectiveSelectedReviewParticipantClientId
    ? sortedParticipants.findIndex(
        (participant) => participant.clientId === effectiveSelectedReviewParticipantClientId,
      ) + 1
    : 0;

  const selectedReviewParticipantIndex = effectiveSelectedReviewParticipantClientId
    ? sortedParticipants.findIndex(
        (participant) => participant.clientId === effectiveSelectedReviewParticipantClientId,
      )
    : -1;

  const currentReviewTargetLabel = selectedReviewParticipant
    ? `${selectedReviewParticipant.username}${
        meClientId && selectedReviewParticipant.clientId === meClientId
          ? "（你）"
          : ""
      }`
    : "未選擇玩家";

  const goPrevReviewParticipant = useCallback(() => {
    if (sortedParticipants.length <= 1) return;
    const currentIndex =
      selectedReviewParticipantIndex >= 0 ? selectedReviewParticipantIndex : 0;
    const nextIndex =
      (currentIndex - 1 + sortedParticipants.length) % sortedParticipants.length;
    setSelectedReviewParticipantClientId(sortedParticipants[nextIndex]?.clientId ?? null);
  }, [selectedReviewParticipantIndex, sortedParticipants]);

  const goNextReviewParticipant = useCallback(() => {
    if (sortedParticipants.length <= 1) return;
    const currentIndex =
      selectedReviewParticipantIndex >= 0 ? selectedReviewParticipantIndex : 0;
    const nextIndex = (currentIndex + 1) % sortedParticipants.length;
    setSelectedReviewParticipantClientId(sortedParticipants[nextIndex]?.clientId ?? null);
  }, [selectedReviewParticipantIndex, sortedParticipants]);

  const topAccuracyEntry = useMemo(() => {
    if (playedQuestionCount <= 0) return null;
    const ranked = sortedParticipants
      .map((participant) => {
        const correctCount = Math.max(0, participant.correctCount ?? 0);
        return {
          participant,
          correctCount,
          accuracy: correctCount / playedQuestionCount,
        };
      })
      .sort((a, b) => {
        if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
        if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
        return b.participant.score - a.participant.score;
      });
    return ranked[0] ?? null;
  }, [playedQuestionCount, sortedParticipants]);

  const topComboEntry = useMemo(() => {
    const ranked = sortedParticipants
      .map((participant) => ({
        participant,
        combo: Math.max(participant.maxCombo ?? 0, participant.combo),
      }))
      .sort((a, b) => {
        if (b.combo !== a.combo) return b.combo - a.combo;
        return b.participant.score - a.participant.score;
      });
    return ranked[0] ?? null;
  }, [sortedParticipants]);

  const fastestAverageAnswerEntry = useMemo(() => {
    const ranked = sortedParticipants
      .flatMap((participant) => {
        const avgCorrectMs =
          typeof participant.avgCorrectMs === "number" &&
          Number.isFinite(participant.avgCorrectMs) &&
          participant.avgCorrectMs >= 0
            ? participant.avgCorrectMs
            : null;
        const correctCount = Math.max(0, participant.correctCount ?? 0);
        if (avgCorrectMs === null || correctCount <= 0) return [];
        return [{ participant, ms: avgCorrectMs, correctCount }];
      })
      .sort((a, b) => {
        if (a.ms !== b.ms) return a.ms - b.ms;
        if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
        return b.participant.score - a.participant.score;
      });
    return ranked[0] ?? null;
  }, [sortedParticipants]);

  const participantScoreMeta = useMemo(() => {
    const rows = sortedParticipants.map((participant) => {
      const correct = Math.max(0, participant.correctCount ?? 0);
      const accuracy = playedQuestionCount > 0 ? correct / playedQuestionCount : 0;
      const avgSpeedMs =
        typeof participant.avgCorrectMs === "number" &&
        Number.isFinite(participant.avgCorrectMs) &&
        participant.avgCorrectMs >= 0
          ? participant.avgCorrectMs
          : null;
      const combo = Math.max(participant.maxCombo ?? 0, participant.combo);
      return { participant, accuracy, avgSpeedMs, combo };
    });

    const maxAccuracy = rows.reduce((max, row) => Math.max(max, row.accuracy), 0);
    const maxCombo = rows.reduce((max, row) => Math.max(max, row.combo), 0);
    const fastestAvgSpeedMs = rows.reduce<number | null>((min, row) => {
      if (row.avgSpeedMs === null) return min;
      if (min === null) return row.avgSpeedMs;
      return Math.min(min, row.avgSpeedMs);
    }, null);

    const titleByClientId: Record<string, string> = {};
    const tooltipByClientId: Record<string, string> = {};

    rows.forEach((row, idx) => {
      if (idx === 0) {
        titleByClientId[row.participant.clientId] = "冠軍";
        tooltipByClientId[row.participant.clientId] = "本場總分最高";
        return;
      }
      if (maxAccuracy > 0 && Math.abs(row.accuracy - maxAccuracy) < 0.00001) {
        titleByClientId[row.participant.clientId] = "命中王牌";
        tooltipByClientId[row.participant.clientId] = "本場答對率最高";
        return;
      }
      if (maxCombo > 0 && row.combo === maxCombo) {
        titleByClientId[row.participant.clientId] = "連勝引擎";
        tooltipByClientId[row.participant.clientId] = "本場最高連擊保持者";
        return;
      }
      if (
        fastestAvgSpeedMs !== null &&
        row.avgSpeedMs !== null &&
        row.avgSpeedMs === fastestAvgSpeedMs
      ) {
        titleByClientId[row.participant.clientId] = "極速節奏";
        tooltipByClientId[row.participant.clientId] = "本場平均答題最快";
        return;
      }
      titleByClientId[row.participant.clientId] = "穩定發揮";
      tooltipByClientId[row.participant.clientId] = "本場整體表現穩定";
    });

    return {
      byClientId: titleByClientId,
      tooltipByClientId,
      metricsByClientId: rows.reduce<Record<string, ScoreMetrics>>((acc, row) => {
        acc[row.participant.clientId] = {
          accuracy: row.accuracy,
          avgSpeedMs: row.avgSpeedMs,
          combo: row.combo,
        };
        return acc;
      }, {}),
    };
  }, [playedQuestionCount, sortedParticipants]);

  return {
    sortedParticipants,
    winner,
    runnerUp,
    thirdPlace,
    me,
    myRank,
    selectedReviewParticipantClientId,
    setSelectedReviewParticipantClientId,
    effectiveSelectedReviewParticipantClientId,
    selectedReviewParticipant,
    selectedReviewParticipantRank,
    selectedReviewParticipantIndex,
    currentReviewTargetLabel,
    goPrevReviewParticipant,
    goNextReviewParticipant,
    topAccuracyEntry,
    topComboEntry,
    fastestAverageAnswerEntry,
    participantScoreMeta,
  };
};

export default useSettlementReviewState;
