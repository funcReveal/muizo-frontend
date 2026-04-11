import React, { useCallback, useMemo, useState } from "react";
import { Button, Chip } from "@mui/material";

import type {
  ChatMessage,
  PlaylistItem,
  RoomParticipant,
  RoomState,
} from "../../../Room/model/types";
import type {
  SettlementQuestionResult,
  SettlementQuestionChoice,
  SettlementQuestionRecap,
} from "../../model/types";
export type { SettlementQuestionResult, SettlementQuestionChoice, SettlementQuestionRecap };

const SETTLEMENT_DURATION_PREFIXES = ["遊玩時間", "對戰時間", "本局時間"] as const;

interface GameSettlementPanelProps {
  room: RoomState["room"];
  participants: RoomParticipant[];
  messages: ChatMessage[];
  playlistItems?: PlaylistItem[];
  trackOrder?: number[];
  playedQuestionCount: number;
  startedAt?: number;
  endedAt?: number;
  meClientId?: string;
  questionRecaps?: SettlementQuestionRecap[];
  onBackToLobby?: () => void;
  onRequestExit?: () => void;
  hideActions?: boolean;
  mode?: "live" | "history";
}


const RECAP_RESULT_META: Record<
  SettlementQuestionResult,
  { label: string; toneClass: string }
> = {
  correct: {
    label: "答對",
    toneClass:
      "border-emerald-300/60 bg-emerald-500/18 text-emerald-50 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.2),0_0_18px_rgba(16,185,129,0.12)]",
  },
  wrong: {
    label: "答錯",
    toneClass:
      "border-rose-300/60 bg-rose-500/18 text-rose-50 shadow-[inset_0_0_0_1px_rgba(244,63,94,0.2),0_0_18px_rgba(244,63,94,0.1)]",
  },
  unanswered: {
    label: "未作答",
    toneClass:
      "border-slate-400/60 bg-slate-700/50 text-slate-100 shadow-[inset_0_0_0_1px_rgba(148,163,184,0.14)]",
  },
};

const WINNER_SPARKS = [
  {
    left: "8%",
    top: "18%",
    color: "bg-amber-300/90",
    size: "h-1.5 w-1.5",
    delayMs: 0,
    durationMs: 1600,
  },
  {
    left: "18%",
    top: "10%",
    color: "bg-sky-300/90",
    size: "h-2 w-2",
    delayMs: 120,
    durationMs: 2000,
  },
  {
    left: "34%",
    top: "22%",
    color: "bg-emerald-300/90",
    size: "h-1.5 w-1.5",
    delayMs: 260,
    durationMs: 1800,
  },
  {
    left: "76%",
    top: "14%",
    color: "bg-fuchsia-300/85",
    size: "h-2 w-2",
    delayMs: 380,
    durationMs: 2100,
  },
  {
    left: "90%",
    top: "24%",
    color: "bg-amber-200/90",
    size: "h-1.5 w-1.5",
    delayMs: 520,
    durationMs: 1900,
  },
  {
    left: "70%",
    top: "78%",
    color: "bg-emerald-300/90",
    size: "h-2 w-2",
    delayMs: 280,
    durationMs: 2300,
  },
  {
    left: "22%",
    top: "80%",
    color: "bg-sky-300/85",
    size: "h-1.5 w-1.5",
    delayMs: 460,
    durationMs: 2050,
  },
] as const;

const resolveTrackTitle = (item?: PlaylistItem) =>
  item?.answerText?.trim() || item?.title?.trim() || "（未命名）";

const clampPercent = (value: number) =>
  Math.max(0, Math.min(100, Math.round(value)));

const revealStyle = (delayMs: number) =>
  ({ "--gs-reveal-delay": `${delayMs}ms` } as React.CSSProperties &
    Record<string, string>);

const formatDurationLabelFromRange = (startedAt: number, endedAt: number) => {
  if (!Number.isFinite(startedAt) || !Number.isFinite(endedAt)) return null;
  const elapsedMs = Math.max(0, Math.floor(endedAt - startedAt));
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

const extractSettlementDuration = (messages: ChatMessage[]) => {
  for (let idx = messages.length - 1; idx >= 0; idx -= 1) {
    const lines = messages[idx]?.content?.split("\n") ?? [];
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;
      for (const prefix of SETTLEMENT_DURATION_PREFIXES) {
        if (!line.startsWith(prefix)) continue;
        const value = line
          .slice(prefix.length)
          .replace(/^[:：\-–\s]+/, "")
          .trim();
        if (value) return value;
      }
    }
  }
  return null;
};

const formatMsLabel = (ms: number) => {
  if (!Number.isFinite(ms) || ms < 0) return "--";
  if (ms >= 10_000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
  return `${Math.round(ms)}ms`;
};

const readAvgCorrectMs = (participant: RoomParticipant): number | null => {
  const source = participant as unknown as Record<string, unknown>;
  const candidates = [
    source.avgCorrectMs,
    source.avg_correct_ms,
    source.averageCorrectMs,
    source.avgAnswerCorrectMs,
  ];
  for (const candidate of candidates) {
    if (typeof candidate !== "number" || !Number.isFinite(candidate)) continue;
    if (candidate < 0) continue;
    return candidate;
  }
  return null;
};

const GameSettlementPanel: React.FC<GameSettlementPanelProps> = ({
  room,
  participants,
  messages,
  playlistItems = [],
  trackOrder,
  playedQuestionCount,
  startedAt,
  endedAt,
  meClientId,
  questionRecaps = [],
  onBackToLobby,
  onRequestExit,
  hideActions = false,
  mode = "live",
}) => {
  const isHistoryMode = mode === "history";
  const sortedParticipants = useMemo(
    () => participants.slice().sort((a, b) => b.score - a.score),
    [participants],
  );

  const winner = sortedParticipants[0] ?? null;
  const maxScore = winner?.score ?? 0;
  const selfParticipant =
    meClientId != null
      ? sortedParticipants.find((participant) => participant.clientId === meClientId) ??
        null
      : null;
  const selfRank =
    meClientId != null
      ? sortedParticipants.findIndex((participant) => participant.clientId === meClientId) +
        1
      : 0;

  const [selectedParticipantClientId, setSelectedParticipantClientId] = useState<
    string | null
  >(null);
  const [perspectiveTransitionKey, setPerspectiveTransitionKey] = useState(0);
  const fallbackSelectedClientId =
    selfParticipant?.clientId ??
    sortedParticipants[0]?.clientId ??
    null;
  const effectiveSelectedParticipantClientId =
    selectedParticipantClientId &&
    sortedParticipants.some(
      (participant) => participant.clientId === selectedParticipantClientId,
    )
      ? selectedParticipantClientId
      : fallbackSelectedClientId;
  const focusParticipant =
    effectiveSelectedParticipantClientId != null
      ? sortedParticipants.find(
          (participant) =>
            participant.clientId === effectiveSelectedParticipantClientId,
        ) ?? null
      : null;
  const focusRank =
    effectiveSelectedParticipantClientId != null
      ? sortedParticipants.findIndex(
          (participant) =>
            participant.clientId === effectiveSelectedParticipantClientId,
        ) + 1
      : 0;
  const handleSelectParticipantPerspective = useCallback(
    (clientId: string) => {
      if (clientId === effectiveSelectedParticipantClientId) return;
      setSelectedParticipantClientId(clientId);
      setPerspectiveTransitionKey((prev) => prev + 1);
    },
    [effectiveSelectedParticipantClientId],
  );

  const topAccuracyEntry = useMemo(() => {
    if (playedQuestionCount <= 0) return null;
    const candidates = sortedParticipants
      .map((participant) => {
        if (typeof participant.correctCount !== "number") return null;
        const correctCount = Math.max(0, participant.correctCount);
        const accuracy = correctCount / playedQuestionCount;
        return {
          username: participant.username,
          correctCount,
          accuracy,
          score: participant.score,
        };
      })
      .filter(
        (
          entry,
        ): entry is {
          username: string;
          correctCount: number;
          accuracy: number;
          score: number;
        } => entry !== null,
      );

    if (candidates.length === 0) return null;
    candidates.sort((a, b) => {
      if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
      if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
      return b.score - a.score;
    });
    const best = candidates[0];
    return {
      username: best.username,
      accuracyPercent: clampPercent(best.accuracy * 100),
      correctCount: best.correctCount,
    };
  }, [playedQuestionCount, sortedParticipants]);

  const avgCorrectSpeedEntry = useMemo(() => {
    const candidates = sortedParticipants
      .map((participant) => {
        const avgMs = readAvgCorrectMs(participant);
        const correctCount = Math.max(0, participant.correctCount ?? 0);
        if (avgMs === null || correctCount < 3) return null;
        return {
          username: participant.username,
          avgMs,
          correctCount,
          score: participant.score,
        };
      })
      .filter(
        (
          entry,
        ): entry is {
          username: string;
          avgMs: number;
          correctCount: number;
          score: number;
        } => entry !== null,
      );

    if (candidates.length === 0) return null;
    candidates.sort((a, b) => {
      if (a.avgMs !== b.avgMs) return a.avgMs - b.avgMs;
      if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
      return b.score - a.score;
    });
    const best = candidates[0];
    return {
      username: best.username,
      avgMs: best.avgMs,
      correctCount: best.correctCount,
    };
  }, [sortedParticipants]);

  const myAvgCorrectTime = useMemo(() => {
    if (!focusParticipant) return null;
    const avgMs = readAvgCorrectMs(focusParticipant);
    const correctCount = Math.max(0, focusParticipant.correctCount ?? 0);
    if (avgMs === null || correctCount <= 0) return null;
    return { avgMs, correctCount };
  }, [focusParticipant]);

  const allPlayersAvgCorrectTime = useMemo(() => {
    let weightedTotalMs = 0;
    let totalCorrectCount = 0;

    for (const participant of sortedParticipants) {
      const avgMs = readAvgCorrectMs(participant);
      const correctCount = Math.max(0, participant.correctCount ?? 0);
      if (avgMs === null || correctCount <= 0) continue;
      weightedTotalMs += avgMs * correctCount;
      totalCorrectCount += correctCount;
    }

    if (totalCorrectCount <= 0) return null;
    return {
      avgMs: Math.round(weightedTotalMs / totalCorrectCount),
      totalCorrectCount,
    };
  }, [sortedParticipants]);

  const settlementDurationLabel = useMemo(
    () => {
      if (
        typeof startedAt === "number" &&
        Number.isFinite(startedAt) &&
        typeof endedAt === "number" &&
        Number.isFinite(endedAt) &&
        endedAt >= startedAt
      ) {
        const formatted = formatDurationLabelFromRange(startedAt, endedAt);
        if (formatted) return formatted;
      }
      return extractSettlementDuration(messages);
    },
    [endedAt, messages, startedAt],
  );

  const settlementSourceInfo = useMemo(() => {
    const sourceItem = playlistItems.find(
      (item) => Boolean(item.provider) || Boolean(item.sourceId),
    );
    const provider = sourceItem?.provider ?? null;
    const sourceId = room.playlist.id ?? sourceItem?.sourceId ?? null;
    const title = room.playlist.title?.trim() || null;

    if (provider === "youtube") {
      return {
        providerLabel: "YouTube 清單",
        title: title ?? sourceId ?? "未命名清單",
        href: sourceId
          ? `https://www.youtube.com/playlist?list=${encodeURIComponent(sourceId)}`
          : null,
        sourceId,
      };
    }

    if (provider === "collection") {
      return {
        providerLabel: "收藏庫",
        title: title ?? "未命名收藏庫",
        href: null,
        sourceId,
      };
    }

    if (!title && !sourceId) return null;

    return {
      providerLabel: "歌單來源",
      title: title ?? sourceId ?? "未命名來源",
      href: null,
      sourceId,
    };
  }, [playlistItems, room.playlist.id, room.playlist.title]);

  const effectiveTrackOrder = useMemo(() => {
    if (trackOrder && trackOrder.length > 0) return trackOrder;
    return playlistItems.map((_, idx) => idx);
  }, [playlistItems, trackOrder]);

  const fallbackRecaps = useMemo(
    () =>
      effectiveTrackOrder
        .slice(0, playedQuestionCount)
        .map((trackIndex, idx): SettlementQuestionRecap => {
          const item = playlistItems[trackIndex];
          return {
            key: `fallback-${trackIndex}-${idx}`,
            order: idx + 1,
            trackIndex,
            title: resolveTrackTitle(item),
            uploader: item?.uploader?.trim() || "未知作者",
            duration: item?.duration?.trim() || null,
            thumbnail: item?.thumbnail || null,
            myResult: "unanswered",
            myChoiceIndex: null,
            correctChoiceIndex: -1,
            choices: [],
          };
        }),
    [effectiveTrackOrder, playedQuestionCount, playlistItems],
  );

  const normalizedQuestionRecapsBase = useMemo(() => {
    if (questionRecaps.length === 0) return fallbackRecaps;
    return questionRecaps
      .slice()
      .map((recap, index) => {
        const myChoiceIndex =
          typeof recap.myChoiceIndex === "number" ? recap.myChoiceIndex : null;
        return {
          ...recap,
          myResult: recap.myResult ?? "unanswered",
          myChoiceIndex,
          key: recap.key || `recap-${recap.trackIndex}-${recap.order}-${index}`,
          choices: (recap.choices ?? [])
            .slice()
            .sort((a, b) => a.index - b.index)
            .map((choice) => ({
              ...choice,
              isCorrect:
                typeof choice.isCorrect === "boolean"
                  ? choice.isCorrect
                  : choice.index === recap.correctChoiceIndex,
              isSelectedByMe:
                typeof choice.isSelectedByMe === "boolean"
                  ? choice.isSelectedByMe
                  : myChoiceIndex !== null && choice.index === myChoiceIndex,
            })),
        };
      })
      .sort((a, b) => a.order - b.order || a.trackIndex - b.trackIndex);
  }, [fallbackRecaps, questionRecaps]);

  const hasPerspectiveAnswers = useMemo(
    () =>
      normalizedQuestionRecapsBase.some(
        (item) =>
          item.answersByClientId &&
          Object.keys(item.answersByClientId).length > 0,
      ),
    [normalizedQuestionRecapsBase],
  );

  const normalizedQuestionRecaps = useMemo(() => {
    if (!effectiveSelectedParticipantClientId) return normalizedQuestionRecapsBase;
    if (!hasPerspectiveAnswers) return normalizedQuestionRecapsBase;
    return normalizedQuestionRecapsBase.map((recap) => {
      const answer = recap.answersByClientId?.[effectiveSelectedParticipantClientId];
      const selectedChoiceIndex =
        typeof answer?.choiceIndex === "number" ? answer.choiceIndex : null;
      const result = answer?.result ?? "unanswered";
      return {
        ...recap,
        myResult: result,
        myChoiceIndex: selectedChoiceIndex,
        choices: recap.choices.map((choice) => ({
          ...choice,
          isSelectedByMe: choice.index === selectedChoiceIndex,
        })),
      };
    });
  }, [
    effectiveSelectedParticipantClientId,
    hasPerspectiveAnswers,
    normalizedQuestionRecapsBase,
  ]);

  const overviewTargetParticipant = focusParticipant;
  const overviewTargetLabel = overviewTargetParticipant?.username ?? "未知玩家";
  const isSelfPerspective =
    Boolean(meClientId) &&
    effectiveSelectedParticipantClientId === meClientId;
  const selectedAnswerLabel = isSelfPerspective ? "你的答案" : "此玩家答案";
  const overviewTargetMeta = overviewTargetParticipant
    ? [
        `正在查看 ${focusRank > 0 ? `#${focusRank}` : "未排名"} 的總覽與答題紀錄`,
        !hasPerspectiveAnswers && effectiveSelectedParticipantClientId !== meClientId
          ? "此局未保存該玩家的詳細作答資料"
          : null,
      ]
        .filter(Boolean)
        .join(" ・ ")
    : "目前沒有可顯示的玩家資料";

  const recapSummary = useMemo(
    () =>
      normalizedQuestionRecaps.reduce(
        (acc, item) => {
          if (item.myResult === "correct") {
            acc.correct += 1;
          } else if (item.myResult === "wrong") {
            acc.wrong += 1;
          } else {
            acc.unanswered += 1;
          }
          return acc;
        },
        { correct: 0, wrong: 0, unanswered: 0 },
      ),
    [normalizedQuestionRecaps],
  );

  const accuracy =
    normalizedQuestionRecaps.length > 0
      ? clampPercent(
          (recapSummary.correct / Math.max(1, normalizedQuestionRecaps.length)) * 100,
        )
      : 0;

  const [expandedRecapKey, setExpandedRecapKey] = useState<string | null>(null);

  const handleToggleRecap = useCallback((key: string) => {
    setExpandedRecapKey((prev) => (prev === key ? null : key));
  }, []);

  const expandedRecap = useMemo(() => {
    if (normalizedQuestionRecaps.length === 0) return null;
    if (!expandedRecapKey) return normalizedQuestionRecaps[0];
    return (
      normalizedQuestionRecaps.find((item) => item.key === expandedRecapKey) ??
      normalizedQuestionRecaps[0]
    );
  }, [expandedRecapKey, normalizedQuestionRecaps]);

  const selectedChoiceTitle = useMemo(() => {
    if (!expandedRecap) return null;
    if (expandedRecap.myChoiceIndex === null) return null;
    const selected = expandedRecap.choices.find(
      (choice) => choice.index === expandedRecap.myChoiceIndex,
    );
    if (selected) return selected.title;
    return `第 ${expandedRecap.myChoiceIndex + 1} 個選項`;
  }, [expandedRecap]);

  const correctChoiceTitle = useMemo(() => {
    if (!expandedRecap) return null;
    const correct = expandedRecap.choices.find(
      (choice) => choice.index === expandedRecap.correctChoiceIndex,
    );
    if (correct) return correct.title;
    if (expandedRecap.correctChoiceIndex < 0) return null;
    return `第 ${expandedRecap.correctChoiceIndex + 1} 個選項`;
  }, [expandedRecap]);

  const comboKingEntry = useMemo(() => {
    if (sortedParticipants.length === 0) return null;
    const ranked = sortedParticipants
      .map((participant) => ({
        username: participant.username,
        combo: Math.max(1, participant.maxCombo ?? participant.combo),
        score: participant.score,
      }))
      .sort((a, b) => {
        if (b.combo !== a.combo) return b.combo - a.combo;
        return b.score - a.score;
      });
    return ranked[0] ?? null;
  }, [sortedParticipants]);

  const speedKingDisplay = useMemo(() => {
    if (!avgCorrectSpeedEntry) {
      return {
        username: "尚無符合條件玩家",
        value: "速度資料不足",
        muted: true,
        subValue: "至少答對 3 題才會計算",
      };
    }
    return {
      username: avgCorrectSpeedEntry.username,
      value: formatMsLabel(avgCorrectSpeedEntry.avgMs),
      muted: false,
      subValue: `答對 ${avgCorrectSpeedEntry.correctCount} 題平均`,
    };
  }, [avgCorrectSpeedEntry]);

  const recapInsights = useMemo(
    () =>
      normalizedQuestionRecaps.map((recap) => {
        const participantCount = Math.max(0, recap.participantCount ?? 0);
        const answeredCount = Math.max(0, recap.answeredCount ?? 0);
        const correctCount = Math.max(0, recap.correctCount ?? 0);
        const wrongCount = Math.max(
          0,
          recap.wrongCount ?? Math.max(0, answeredCount - correctCount),
        );
        const unansweredCount = Math.max(
          0,
          recap.unansweredCount ?? Math.max(0, participantCount - answeredCount),
        );
        const hasAggregate = participantCount > 0;
        const correctRate =
          participantCount > 0 ? clampPercent((correctCount / participantCount) * 100) : 0;
        const answeredRate =
          participantCount > 0 ? clampPercent((answeredCount / participantCount) * 100) : 0;
        const fastestCorrectMs =
          typeof recap.fastestCorrectMs === "number" && Number.isFinite(recap.fastestCorrectMs)
            ? Math.max(0, Math.floor(recap.fastestCorrectMs))
            : null;
        const medianCorrectMs =
          typeof recap.medianCorrectMs === "number" && Number.isFinite(recap.medianCorrectMs)
            ? Math.max(0, Math.floor(recap.medianCorrectMs))
            : null;
        return {
          ...recap,
          participantCount,
          answeredCount,
          correctCount,
          wrongCount,
          unansweredCount,
          hasAggregate,
          correctRate,
          answeredRate,
          fastestCorrectMs,
          medianCorrectMs,
        };
      }),
    [normalizedQuestionRecaps],
  );

  const highlightPool = useMemo(
    () => recapInsights.filter((item) => item.hasAggregate && item.participantCount >= 2),
    [recapInsights],
  );

  const crowdEasyHighlight = useMemo(() => {
    const allCorrectPool = highlightPool.filter(
      (item) =>
        item.participantCount >= 2 &&
        item.answeredCount === item.participantCount &&
        item.correctCount === item.participantCount,
    );
    if (allCorrectPool.length === 0) return null;
    const sorted = [...allCorrectPool].sort((a, b) => {
      if ((a.medianCorrectMs ?? Number.POSITIVE_INFINITY) !== (b.medianCorrectMs ?? Number.POSITIVE_INFINITY)) {
        return (a.medianCorrectMs ?? Number.POSITIVE_INFINITY) - (b.medianCorrectMs ?? Number.POSITIVE_INFINITY);
      }
      if ((a.fastestCorrectMs ?? Number.POSITIVE_INFINITY) !== (b.fastestCorrectMs ?? Number.POSITIVE_INFINITY)) {
        return (a.fastestCorrectMs ?? Number.POSITIVE_INFINITY) - (b.fastestCorrectMs ?? Number.POSITIVE_INFINITY);
      }
      if ((a.fastestCorrectRank ?? Number.POSITIVE_INFINITY) !== (b.fastestCorrectRank ?? Number.POSITIVE_INFINITY)) {
        return (a.fastestCorrectRank ?? Number.POSITIVE_INFINITY) - (b.fastestCorrectRank ?? Number.POSITIVE_INFINITY);
      }
      return a.order - b.order;
    });
    return sorted[0] ?? null;
  }, [highlightPool]);

  const crowdHardHighlight = useMemo(() => {
    if (highlightPool.length === 0) return null;
    const sorted = [...highlightPool].sort((a, b) => {
      if (a.correctRate !== b.correctRate) return a.correctRate - b.correctRate;
      if (b.answeredCount !== a.answeredCount) return b.answeredCount - a.answeredCount;
      if (b.wrongCount !== a.wrongCount) return b.wrongCount - a.wrongCount;
      return a.order - b.order;
    });
    return sorted[0] ?? null;
  }, [highlightPool]);

  const crowdSlowCorrectHighlight = useMemo(() => {
    const pool = highlightPool.filter((item) => item.correctCount > 0);
    if (pool.length === 0) return null;
    const sorted = [...pool].sort((a, b) => {
      if (
        (b.medianCorrectMs ?? Number.NEGATIVE_INFINITY) !==
        (a.medianCorrectMs ?? Number.NEGATIVE_INFINITY)
      ) {
        return (
          (b.medianCorrectMs ?? Number.NEGATIVE_INFINITY) -
          (a.medianCorrectMs ?? Number.NEGATIVE_INFINITY)
        );
      }
      if (
        (b.fastestCorrectMs ?? Number.NEGATIVE_INFINITY) !==
        (a.fastestCorrectMs ?? Number.NEGATIVE_INFINITY)
      ) {
        return (
          (b.fastestCorrectMs ?? Number.NEGATIVE_INFINITY) -
          (a.fastestCorrectMs ?? Number.NEGATIVE_INFINITY)
        );
      }
      if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
      return a.order - b.order;
    });
    return sorted[0] ?? null;
  }, [highlightPool]);

  const highlightCards = useMemo(
    () => [
      {
        key: "crowd-easy",
        title: "全場秒解",
        subtitle: "全員答對且群體解答速度最快的歌曲",
        accentClass: "border-emerald-300/35 bg-emerald-400/10",
        titleClass: "text-emerald-100",
        metricClass: "text-emerald-200",
        data: crowdEasyHighlight,
        emptyTitle: "尚無全場秒解題目",
        emptyDetail: "需要至少 2 位玩家，且至少 1 題全員答對",
        metrics: (item: typeof crowdEasyHighlight) =>
          item
            ? [
                `答對 ${item.correctCount}/${item.participantCount}`,
                item.medianCorrectMs != null
                  ? `中位答對 ${formatMsLabel(item.medianCorrectMs)}`
                  : item.fastestCorrectMs != null
                    ? `最快答對 ${formatMsLabel(item.fastestCorrectMs)}`
                    : item.fastestCorrectRank
                      ? `首位答對 #${item.fastestCorrectRank}`
                      : "無速度資料",
              ]
            : [],
      },
      {
        key: "crowd-hard",
        title: "本局地獄",
        subtitle: "本局正確率最低的題目",
        accentClass: "border-rose-300/35 bg-rose-400/10",
        titleClass: "text-rose-100",
        metricClass: "text-rose-200",
        data: crowdHardHighlight,
        emptyTitle: "尚無可比較的困難題",
        emptyDetail: "需要至少 2 位玩家才可比較",
        metrics: (item: typeof crowdHardHighlight) =>
          item
            ? [
                `正確率 ${item.correctRate}%`,
                `答錯 ${item.wrongCount} ・ 未作答 ${item.unansweredCount}`,
                `作答率 ${item.answeredRate}%`,
              ]
            : [],
      },
      {
        key: "crowd-skip",
        title: "全場猶豫",
        subtitle: "只看答對者中，解答最慢的一題",
        accentClass: "border-slate-400/30 bg-slate-700/20",
        titleClass: "text-slate-100",
        metricClass: "text-slate-300",
        data: crowdSlowCorrectHighlight,
        emptyTitle: "尚無全場猶豫題目",
        emptyDetail: "需要至少 2 位玩家且至少 1 位答對",
        metrics: (item: typeof crowdSlowCorrectHighlight) =>
          item
            ? [
                item.medianCorrectMs != null
                  ? `中位答對 ${formatMsLabel(item.medianCorrectMs)}`
                  : item.fastestCorrectMs != null
                    ? `最快答對 ${formatMsLabel(item.fastestCorrectMs)}`
                    : "無速度資料",
                `答對 ${item.correctCount}/${item.participantCount}`,
                `正確率 ${item.correctRate}%`,
              ]
            : [],
      },
    ],
    [crowdEasyHighlight, crowdHardHighlight, crowdSlowCorrectHighlight],
  );

  const kpis = [
    {
      key: "rank",
      label: "排名",
      value: focusRank > 0 ? `#${focusRank}` : "--",
      progress:
        focusRank > 0 && sortedParticipants.length > 1
          ? clampPercent(
              ((sortedParticipants.length - focusRank) /
                (sortedParticipants.length - 1)) *
                100,
            )
          : focusRank === 1
            ? 100
            : 0,
    },
    {
      key: "score",
      label: "分數",
      value: focusParticipant ? `${focusParticipant.score}` : "--",
      progress:
        focusParticipant && maxScore > 0
          ? clampPercent((focusParticipant.score / maxScore) * 100)
          : 0,
    },
    {
      key: "accuracy",
      label: "答對率",
      value: `${accuracy}%`,
      progress: accuracy,
    },
    {
      key: "combo",
      label: "最佳連擊",
      value: focusParticipant
        ? `${Math.max(focusParticipant.maxCombo ?? 0, focusParticipant.combo)}`
        : "--",
      progress:
        focusParticipant && playedQuestionCount > 0
          ? clampPercent(
              (Math.max(focusParticipant.maxCombo ?? 0, focusParticipant.combo) /
                playedQuestionCount) *
                100,
            )
          : 0,
    },
  ] as const;

  return (
    <div
      className={`mx-auto w-full min-w-0 ${
        isHistoryMode ? "max-w-none px-0 pb-0" : "max-w-6xl px-2 pb-4 sm:px-4"
      }`}
    >
      <section
        className={`game-settlement-stage ${
          isHistoryMode ? "game-settlement-stage--history" : ""
        } relative min-w-0 overflow-hidden ${
          isHistoryMode
            ? "rounded-[22px] border border-white/8 bg-[linear-gradient(180deg,rgba(8,11,18,0.78),rgba(6,8,13,0.86))] px-3 py-4 shadow-none sm:px-4 sm:py-5"
            : "rounded-[30px] border border-amber-400/35 bg-slate-950/95 px-4 py-6 shadow-[0_30px_120px_-60px_rgba(245,158,11,0.6)] sm:px-6 sm:py-7"
        }`}
      >
        {!isHistoryMode && (
          <>
            <div className="pointer-events-none absolute -left-20 -top-20 h-52 w-52 rounded-full bg-amber-400/20 blur-3xl" />
            <div className="pointer-events-none absolute -right-24 bottom-0 h-64 w-64 rounded-full bg-sky-500/15 blur-3xl" />
          </>
        )}

        <div className="relative grid gap-4">
          <header
            className="game-settlement-reveal flex flex-wrap items-start justify-between gap-3"
            style={revealStyle(0)}
          >
            <div>
              <div className="inline-flex items-center rounded-full border border-amber-300/40 bg-amber-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-200">
                對戰結果
              </div>
              <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-100 sm:text-3xl">
                對戰回顧
              </h2>
              <p className="mt-1 text-sm text-slate-300">
                {room.name}
                {room.playlist.title ? ` ・ ${room.playlist.title}` : ""}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Chip
                size="small"
                label={`本局題數 ${playedQuestionCount}`}
                variant="outlined"
                className="border-amber-300/40 text-amber-100"
              />
              <Chip
                size="small"
                label={`玩家 ${participants.length}`}
                variant="outlined"
                className="border-sky-400/45 text-sky-100"
              />
              {settlementDurationLabel && (
                <Chip
                  size="small"
                  label={`遊玩時間 ${settlementDurationLabel}`}
                  variant="outlined"
                  className="border-emerald-300/45 text-emerald-100"
                />
              )}
            </div>
          </header>

          <div className="grid gap-4 xl:grid-cols-[1.05fr_1.25fr_1fr]">
            <article
              className="game-settlement-reveal game-settlement-hero-card min-w-0 rounded-2xl border border-slate-700/80 bg-slate-900/72 p-4"
              style={revealStyle(60)}
            >
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">冠軍</p>
              {winner ? (
                <div className="game-settlement-winner-panel relative mt-3 overflow-hidden rounded-xl border border-amber-300/45 bg-amber-500/10 px-4 py-3 shadow-[0_16px_36px_-18px_rgba(251,191,36,0.65)]">
                  {!isHistoryMode && (
                    <div className="pointer-events-none absolute inset-0">
                      {WINNER_SPARKS.map((piece, idx) => (
                        <span
                          key={`${winner.clientId}-spark-${idx}`}
                          className={`absolute rounded-full ${piece.color} ${piece.size} game-settlement-confetti`}
                          style={{
                            left: piece.left,
                            top: piece.top,
                            animationDelay: `${piece.delayMs}ms`,
                            animationDuration: `${piece.durationMs}ms`,
                            "--mq-confetti-drift": idx % 2 === 0 ? "22px" : "-18px",
                            "--mq-confetti-spin": idx % 2 === 0 ? "220deg" : "-220deg",
                          } as React.CSSProperties & Record<string, string>}
                        />
                      ))}
                    </div>
                  )}
                  <div className="relative z-10 inline-flex items-center rounded-full border border-amber-300/45 bg-amber-300/10 px-2 py-0.5 text-[10px] font-semibold tracking-[0.16em] text-amber-100">
                    本局冠軍
                  </div>
                  <p className="relative z-10 flex items-center gap-2 text-lg font-bold text-amber-100">
                    <span className="game-settlement-crown" aria-hidden="true">
                      👑
                    </span>
                    <span className="truncate">#1 {winner.username}</span>
                  </p>
                  <p className="relative z-10 mt-1 text-sm text-slate-100">
                    分數 {winner.score}
                    {winner.combo > 1 ? ` ・ 連擊 x${winner.combo}` : ""}
                  </p>
                  <div className="relative z-10 mt-2 flex flex-wrap gap-1.5 text-[10px]">
                    {typeof winner.correctCount === "number" && (
                      <span className="rounded-full border border-emerald-300/40 bg-emerald-400/10 px-2 py-0.5 font-semibold text-emerald-100">
                        答對 {winner.correctCount}/{playedQuestionCount}
                      </span>
                    )}
                    {comboKingEntry && (
                      <span className="rounded-full border border-sky-300/40 bg-sky-400/10 px-2 py-0.5 font-semibold text-sky-100">
                        連擊王 {comboKingEntry.username} ・ x{comboKingEntry.combo}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-400">尚無可顯示的結算資料</p>
              )}

              <div className="mt-3 grid gap-2 [grid-auto-rows:1fr]">
                <div className="game-settlement-award-card rounded-xl border border-emerald-300/35 bg-emerald-400/10 px-3 py-3 min-h-[104px]">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold tracking-[0.18em] text-emerald-100">
                      準度王
                    </p>
                    <span className="rounded-full border border-emerald-300/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-100">
                      準確率
                    </span>
                  </div>
                  <p className="mt-2 truncate text-sm font-bold text-slate-100">
                    {topAccuracyEntry?.username ?? "尚無符合條件玩家"}
                  </p>
                  <p className="mt-1 text-xs text-emerald-100/90">
                    {topAccuracyEntry
                      ? `${topAccuracyEntry.accuracyPercent}% ・ ${topAccuracyEntry.correctCount}/${playedQuestionCount}`
                      : "需要至少一位玩家有答對紀錄"}
                  </p>
                </div>

                <div
                    className={`game-settlement-award-card rounded-xl border px-3 py-3 min-h-[104px] ${
                    speedKingDisplay.muted
                      ? "border-slate-500/30 bg-slate-700/20 opacity-70"
                      : "border-sky-300/35 bg-sky-400/10"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={`text-[11px] font-semibold tracking-[0.18em] ${
                        speedKingDisplay.muted ? "text-slate-200" : "text-sky-100"
                      }`}
                    >
                      平均快答王
                    </p>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                        speedKingDisplay.muted
                          ? "border-slate-500/40 bg-slate-700/30 text-slate-200"
                          : "border-sky-300/40 bg-sky-500/15 text-sky-100"
                      }`}
                    >
                      平均速度
                    </span>
                  </div>
                  <p className="mt-2 truncate text-sm font-bold text-slate-100">
                    {speedKingDisplay.username}
                  </p>
                  <p
                    className={`mt-1 text-xs ${
                      speedKingDisplay.muted ? "text-slate-300" : "text-sky-100/90"
                    }`}
                  >
                    {speedKingDisplay.muted
                      ? speedKingDisplay.subValue
                      : `${speedKingDisplay.value} ・ ${speedKingDisplay.subValue}`}
                  </p>
                </div>
              </div>

              <div className="game-settlement-self-panel mt-4 rounded-xl border border-sky-400/35 bg-sky-500/10 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.2em] text-sky-200">你的成績</p>
                {selfParticipant && selfRank > 0 ? (
                  <>
                    <p className="mt-1 text-lg font-bold text-sky-100">
                      #{selfRank} {selfParticipant.username}
                    </p>
                    <p className="mt-1 text-sm text-slate-100">
                      分數 {selfParticipant.score}
                      {winner && selfParticipant.clientId !== winner.clientId
                        ? ` ・ 落後冠軍 ${Math.max(0, winner.score - selfParticipant.score)}`
                        : ""}
                    </p>
                  </>
                ) : (
                  <p className="mt-1 text-sm text-slate-300">
                    你不在本局排名中（可能於賽後加入）                  </p>
                )}
              </div>
            </article>

            <article
              className="game-settlement-reveal game-settlement-surface-card min-w-0 rounded-2xl border border-slate-700/80 bg-slate-900/72 p-4"
              style={revealStyle(110)}
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-300">排行榜</p>
                <p className="text-xs text-slate-500">共 {sortedParticipants.length} 位玩家</p>
              </div>

              {sortedParticipants.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/60 px-4 py-6 text-center text-sm text-slate-500">
                  尚無玩家排名資料可顯示
                </div>
              ) : (
                <div className="space-y-2">
                  {sortedParticipants.map((participant, idx) => {
                    const isMe = participant.clientId === meClientId;
                    const isViewing =
                      participant.clientId === effectiveSelectedParticipantClientId;
                    const progress =
                      maxScore > 0
                        ? clampPercent((participant.score / maxScore) * 100)
                        : 0;
                    return (
                      <button
                        type="button"
                        key={participant.clientId}
                        onClick={() =>
                          handleSelectParticipantPerspective(participant.clientId)
                        }
                        aria-pressed={isViewing}
                        className={`game-settlement-player-row relative overflow-hidden rounded-xl border px-3 py-2 ${
                          idx === 0
                            ? "border-amber-300/45 bg-amber-500/15"
                            : isMe
                              ? "border-sky-400/40 bg-sky-500/10"
                              : "border-slate-700/80 bg-slate-950/60"
                        } ${isViewing ? "ring-1 ring-cyan-300/55" : ""} w-full text-left transition hover:border-slate-500/80`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-100">
                              #{idx + 1} {participant.username}
                              {isMe ? "（你）" : ""}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-400">
                              {participant.isOnline ? "在線" : "離線"}
                            </p>
                            <div
                              className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-800/90"
                              title="相對第一名分數比例"
                            >
                              <span
                                className={`block h-full rounded-full bg-gradient-to-r from-emerald-300 via-cyan-300 to-sky-300 game-settlement-scorebar ${
                                  idx === 0 ? "game-settlement-scorebar--winner" : ""
                                }`}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>

                          <div className="text-right">
                            {isViewing && (
                              <p className="mb-0.5 text-[10px] font-semibold text-cyan-200">
                                檢視中
                              </p>
                            )}
                            <p className="font-bold tabular-nums text-emerald-300">
                              {participant.score}
                            </p>
                            <p className="text-xs text-amber-200">
                              x{Math.max(1, participant.maxCombo ?? participant.combo)}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </article>

            <article
              key={`perspective-summary:${effectiveSelectedParticipantClientId ?? "none"}:${perspectiveTransitionKey}`}
              className="game-settlement-reveal game-settlement-perspective-swap min-w-0 grid gap-2"
              style={revealStyle(160)}
            >
              <div className="game-settlement-kpi-card rounded-xl border border-sky-400/35 bg-sky-500/10 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-sky-200">
                    目前檢視對象
                  </p>
                  <span className="rounded-full border border-sky-300/35 bg-sky-400/10 px-2 py-0.5 text-[10px] font-semibold text-sky-100">
                    總覽
                  </span>
                </div>
                <p className="mt-1 truncate text-xl font-black text-slate-100">
                  {overviewTargetLabel}
                </p>
                <p className="mt-1 text-xs text-slate-300">{overviewTargetMeta}</p>
              </div>
              {kpis.map((kpi) => (
                <div
                  key={kpi.key}
                  className="game-settlement-kpi-card rounded-xl border border-slate-700/80 bg-slate-900/72 p-3"
                >
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                    {kpi.label}
                  </p>
                  <p className="mt-1 text-2xl font-black text-slate-100">
                    {kpi.value}
                  </p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800/90">
                    <span
                      className="block h-full rounded-full bg-gradient-to-r from-amber-300 via-sky-300 to-emerald-300 game-settlement-scorebar"
                      style={{ width: `${kpi.progress}%` }}
                    />
                  </div>
                </div>
              ))}
              <div className="game-settlement-kpi-card rounded-xl border border-slate-700/80 bg-slate-900/72 p-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                  個人平均答對時間
                </p>
                <p className="mt-1 text-2xl font-black text-slate-100">
                  {myAvgCorrectTime ? formatMsLabel(myAvgCorrectTime.avgMs) : "--"}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {myAvgCorrectTime
                    ? ("以 " + myAvgCorrectTime.correctCount + " 題答對紀錄計算")
                    : "沒有可用的個人答對時間資料"}
                </p>
              </div>
              <div className="game-settlement-kpi-card rounded-xl border border-slate-700/80 bg-slate-900/72 p-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                  全體平均答對時間
                </p>
                <p className="mt-1 text-2xl font-black text-amber-200">
                  {allPlayersAvgCorrectTime
                    ? formatMsLabel(allPlayersAvgCorrectTime.avgMs)
                    : "--"}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {allPlayersAvgCorrectTime
                    ? ("全體共計 " + allPlayersAvgCorrectTime.totalCorrectCount + " 次正確作答")
                    : "沒有可用的全體答對時間資料"}
                </p>
              </div>
            </article>
          </div>

          <section
            className="game-settlement-reveal game-settlement-surface-card min-w-0 rounded-2xl border border-slate-700/80 bg-slate-900/72 p-4"
            style={revealStyle(190)}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-300">本局亮點</p>
                <p className="mt-1 text-sm text-slate-400">
                  用全體作答結果整理這局最有記憶點的歌曲
                </p>
              </div>
              <span className="rounded-full border border-slate-500/50 bg-slate-800/60 px-2 py-0.5 text-[11px] font-semibold text-slate-200">
                亮點歌曲
              </span>
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-3">
              {highlightCards.map((card, idx) => {
                const item = card.data;
                const metrics = card.metrics(item);
                const isMuted = !item;
                return (
                  <div
                    key={card.key}
                    className={`game-settlement-highlight-card rounded-xl border px-3 py-3 transition ${card.accentClass} ${
                      isMuted ? "opacity-70 saturate-75" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm font-bold ${card.titleClass}`}>{card.title}</p>
                      <span className="rounded-full border border-white/15 bg-slate-950/30 px-2 py-0.5 text-[10px] font-semibold text-slate-200">
                        #{idx + 1}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-300">{card.subtitle}</p>

                    {item ? (
                      <>
                        <p
                          className="mt-3 line-clamp-2 text-sm font-semibold text-slate-100"
                          title={item.title}
                        >
                          {item.title}
                        </p>
                        <p className="mt-1 truncate text-xs text-slate-400">
                          第 {item.order} 題 ・ {item.uploader}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {metrics.map((metric) => (
                            <span
                              key={`${card.key}-${metric}`}
                              className={`rounded-full border border-white/10 bg-slate-950/35 px-2 py-0.5 text-[10px] font-semibold ${card.metricClass}`}
                            >
                              {metric}
                            </span>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="mt-3 rounded-lg border border-dashed border-slate-600/70 bg-slate-950/35 px-3 py-3">
                        <p className="text-sm font-semibold text-slate-100">{card.emptyTitle}</p>
                        <p className="mt-1 text-xs text-slate-400">{card.emptyDetail}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <section
            className="game-settlement-reveal game-settlement-answer-shell min-w-0 rounded-2xl border border-slate-700/80 bg-slate-900/72 p-4"
            style={revealStyle(220)}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-300">答題紀錄</p>
                <p className="mt-1 text-sm text-slate-400">
                  共 {normalizedQuestionRecaps.length} 題
                </p>
                {settlementSourceInfo && (
                  <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-xs">
                    <span className="shrink-0 text-slate-500">來源：</span>
                    <span className="shrink-0 rounded-full border border-slate-600/70 bg-slate-800/70 px-2 py-0.5 font-semibold text-slate-200">
                      {settlementSourceInfo.providerLabel}
                    </span>
                    {settlementSourceInfo.href ? (
                      <a
                        href={settlementSourceInfo.href}
                        target="_blank"
                        rel="noreferrer"
                        className="min-w-0 max-w-full truncate text-sky-200 underline decoration-sky-300/50 underline-offset-2 hover:text-sky-100"
                        title={settlementSourceInfo.title}
                      >
                        {settlementSourceInfo.title}
                      </a>
                    ) : (
                      <span
                        className="min-w-0 max-w-full truncate text-slate-300"
                        title={settlementSourceInfo.title}
                      >
                        {settlementSourceInfo.title}
                      </span>
                    )}
                    {settlementSourceInfo.providerLabel === "收藏庫" &&
                      settlementSourceInfo.sourceId && (
                        <span
                          className="min-w-0 truncate text-[11px] text-slate-500"
                          title={settlementSourceInfo.sourceId}
                        >
                          ID: {settlementSourceInfo.sourceId}
                        </span>
                      )}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-emerald-300/45 bg-emerald-400/10 px-2 py-0.5 font-semibold text-emerald-100">
                  答對 {recapSummary.correct}
                </span>
                <span className="rounded-full border border-rose-300/45 bg-rose-400/10 px-2 py-0.5 font-semibold text-rose-100">
                  答錯 {recapSummary.wrong}
                </span>
                <span className="rounded-full border border-slate-500/70 bg-slate-800/70 px-2 py-0.5 font-semibold text-slate-200">
                  未作答 {recapSummary.unanswered}
                </span>
              </div>
            </div>

            {normalizedQuestionRecaps.length === 0 ? (
              <div className="mt-3 rounded-xl border border-dashed border-slate-700 bg-slate-950/60 px-4 py-6 text-center text-sm text-slate-500">
                此局尚未產生可顯示的答題紀錄
              </div>
            ) : (
              <div className="mt-3 grid min-w-0 gap-3 lg:grid-cols-[300px_minmax(0,1fr)]">
                <div className="min-w-0 overflow-hidden rounded-xl border border-slate-700/80 bg-slate-950/55 p-2">
                  <div className="max-h-[420px] min-w-0 space-y-2 overflow-y-auto pr-1">
                    {normalizedQuestionRecaps.map((item) => {
                      const resultMeta = RECAP_RESULT_META[item.myResult];
                      const isExpanded = expandedRecap?.key === item.key;
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => handleToggleRecap(item.key)}
                          className={`game-settlement-track-card w-full rounded-xl border px-3 py-2 text-left transition ${
                            isExpanded
                              ? "border-amber-300/60 bg-amber-400/12"
                              : "border-slate-700/80 bg-slate-950/55 hover:border-slate-600"
                          }`}
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="inline-flex h-7 w-7 flex-none items-center justify-center rounded-full border border-amber-300/40 bg-amber-400/10 text-xs font-semibold text-amber-100">
                              {item.order}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-slate-100">
                                {item.title}
                              </p>
                              <p className="truncate text-[11px] text-slate-400">
                                {item.uploader}
                                {item.duration ? ` ・ ${item.duration}` : ""}
                              </p>
                            </div>
                            <span
                              className={`inline-flex flex-none items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${resultMeta.toneClass}`}
                            >
                              {resultMeta.label}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div
                  key={`perspective-detail:${effectiveSelectedParticipantClientId ?? "none"}:${expandedRecap?.key ?? "none"}:${perspectiveTransitionKey}`}
                  className="game-settlement-answer-detail game-settlement-perspective-swap min-w-0 rounded-xl border border-slate-700/80 bg-slate-950/60 p-3"
                >
                  {expandedRecap ? (
                    <>
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-2 gap-y-1">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                          題目 {expandedRecap.order}
                        </p>
                        <span
                          className={`inline-flex shrink-0 self-start whitespace-nowrap items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${RECAP_RESULT_META[expandedRecap.myResult].toneClass}`}
                        >
                          {RECAP_RESULT_META[expandedRecap.myResult].label}
                        </span>
                        <p className="col-span-2 line-clamp-2 text-sm font-semibold text-slate-100">
                          {expandedRecap.title}
                        </p>
                        <p className="col-span-2 truncate text-xs text-slate-400">
                          {expandedRecap.uploader}
                          {expandedRecap.duration ? ` ・ ${expandedRecap.duration}` : ""}
                        </p>
                      </div>

                      <div className="mt-3 grid gap-2 xl:grid-cols-2">
                        <div className="rounded-lg border border-slate-600/70 bg-slate-800/60 px-3 py-2 text-xs text-slate-100">
                          <p className="text-[11px] text-slate-400">{selectedAnswerLabel}</p>
                          <p className="mt-1 line-clamp-2">
                            {selectedChoiceTitle ??
                              (expandedRecap.myChoiceIndex === null
                                ? "未作答"
                                : "（找不到選項文字）")}
                          </p>
                        </div>
                        <div className="rounded-lg border border-emerald-300/45 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-100">
                          <p className="text-[11px] text-emerald-200">正確答案</p>
                          <p className="mt-1 line-clamp-2">
                            {correctChoiceTitle ?? "（找不到正確答案）"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 game-settlement-choice-grid">
                        {expandedRecap.choices.length === 0 ? (
                          <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/60 px-3 py-4 text-xs text-slate-400">
                            此題沒有可顯示的選項資料
                          </div>
                        ) : (
                          expandedRecap.choices.map((choice) => {
                            const isCorrect =
                              choice.index === expandedRecap.correctChoiceIndex;
                            const isMine =
                              expandedRecap.myChoiceIndex !== null &&
                              choice.index === expandedRecap.myChoiceIndex;
                            const isMineCorrect = isMine && isCorrect;
                            const cardToneClass = isCorrect
                              ? "game-settlement-choice-card--correct"
                              : isMine
                                ? "game-settlement-choice-card--wrong"
                                : "game-settlement-choice-card--default";
                            const selectedChoiceTagClass = isMineCorrect
                              ? "game-room-choice-tag--you-correct"
                              : "game-room-choice-tag--you";
                            const selectedChoiceTagLabel = isSelfPerspective
                              ? isMineCorrect
                                ? "你答對"
                                : "你的答案"
                              : isMineCorrect
                                ? "此玩家答對"
                                : "此玩家答案";
                            return (
                              <div
                                key={`${expandedRecap.key}-choice-${choice.index}`}
                                className={`game-settlement-choice-card ${cardToneClass}`}
                              >
                                <p
                                  className="game-settlement-choice-title text-sm font-semibold text-slate-100"
                                  title={choice.title}
                                >
                                  {choice.title}
                                </p>
                                <div className="game-settlement-choice-badges">
                                  {isCorrect && (
                                    <span className="game-room-choice-tag game-room-choice-tag--correct">
                                      正確答案
                                    </span>
                                  )}
                                  {isMine && (
                                    <span className={`game-room-choice-tag ${selectedChoiceTagClass}`}>
                                      {selectedChoiceTagLabel}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="flex h-full min-h-[220px] items-center justify-center rounded-lg border border-dashed border-slate-700 bg-slate-900/50 px-4 text-sm text-slate-400">
                      請從左側選擇一題查看詳細作答內容
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

          {!hideActions && (onBackToLobby || onRequestExit) && (
            <footer
              className="game-settlement-reveal flex flex-wrap items-center justify-stretch gap-2 sm:justify-end"
              style={revealStyle(300)}
            >
              {onBackToLobby && (
                <Button
                  variant="outlined"
                  color="inherit"
                  onClick={onBackToLobby}
                  className="w-full border-slate-500/60 text-slate-200 sm:w-auto"
                >
                  返回大廳
                </Button>
              )}
              {onRequestExit && (
                <Button
                  variant="contained"
                  color="error"
                  onClick={onRequestExit}
                  className="w-full sm:w-auto"
                >
                  離開房間
                </Button>
              )}
            </footer>
          )}
        </div>
      </section>
    </div>
  );
};

export default React.memo(GameSettlementPanel);


