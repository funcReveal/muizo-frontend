import type {
  RoomParticipant,
  RoomSettlementQuestionAnswer,
} from "../../Room/model/types";
import { normalizeRoomDisplayText } from "../../../shared/utils/text";
import type {
  SettlementQuestionRecap,
  SettlementQuestionResult,
} from "../../Settlement/model/types";

import type {
  MyFeedbackModel,
  RevealChoicePickBadge,
  RevealChoicePickMap,
} from "./gameRoomTypes";

export type ScoreboardRow =
  | { type: "player"; player: RoomParticipant }
  | { type: "placeholder"; key: string }
  | { type: "locked"; key: string };

export const sortParticipantsByScore = (participants: RoomParticipant[]) =>
  participants.slice().sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    const joinedAtDelta = (a.joinedAt ?? Number.MAX_SAFE_INTEGER) - (b.joinedAt ?? Number.MAX_SAFE_INTEGER);
    if (joinedAtDelta !== 0) {
      return joinedAtDelta;
    }
    return a.clientId.localeCompare(b.clientId);
  });

export const buildScoreboardRows = (
  sortedParticipants: RoomParticipant[],
  meClientId: string | undefined,
  slots = 12,
  maxPlayers?: number | null,
): ScoreboardRow[] => {
  const topPlayers = sortedParticipants.slice(0, slots - 1);
  const self = sortedParticipants.find(
    (participant) => participant.clientId === meClientId,
  );
  const scoreboardPlayers =
    self &&
    !topPlayers.some((participant) => participant.clientId === self.clientId)
      ? [...topPlayers, self]
      : topPlayers;
  const scoreboardEntries = scoreboardPlayers.slice(0, slots);
  // Effective limit: how many slots are "open" (players + available seats)
  const effectiveMax =
    maxPlayers && maxPlayers > 0
      ? Math.min(maxPlayers, slots)
      : slots;
  const rows: ScoreboardRow[] = scoreboardEntries.map((player) => ({
    type: "player" as const,
    player,
  }));
  for (let i = rows.length; i < slots; i++) {
    if (i < effectiveMax) {
      rows.push({ type: "placeholder" as const, key: `placeholder-${i}` });
    } else {
      rows.push({ type: "locked" as const, key: `locked-${i}` });
    }
  }
  return rows;
};

type BuildRevealChoicePickMapParams = {
  phase: "guess" | "reveal";
  answersByClientId?: Record<string, RoomSettlementQuestionAnswer>;
  participants: RoomParticipant[];
  meClientId?: string;
};

export const buildRevealChoicePickMap = ({
  phase,
  answersByClientId,
  participants,
  meClientId,
}: BuildRevealChoicePickMapParams): RevealChoicePickMap => {
  if (phase !== "reveal" || !answersByClientId) {
    return {};
  }

  const grouped = participants.reduce<RevealChoicePickMap>(
    (acc, participant) => {
      const answer = answersByClientId[participant.clientId];

      if (
        !answer ||
        typeof answer.choiceIndex !== "number" ||
        !Number.isFinite(answer.choiceIndex)
      ) {
        return acc;
      }

      const username = normalizeRoomDisplayText(
        participant.username?.trim(),
        "玩家",
      );

      const answeredAtMs =
        typeof answer.answeredAtMs === "number" &&
        Number.isFinite(answer.answeredAtMs)
          ? answer.answeredAtMs
          : null;

      const badge: RevealChoicePickBadge = {
        clientId: participant.clientId,
        username,
        initial: Array.from(username)[0] || "?",
        avatarUrl: participant.avatar_url ?? participant.avatarUrl ?? null,
        result: answer.result,
        isMe: participant.clientId === meClientId,
        answeredAtMs,
      };

      if (!acc[answer.choiceIndex]) {
        acc[answer.choiceIndex] = [];
      }

      acc[answer.choiceIndex].push(badge);
      return acc;
    },
    {},
  );

  Object.values(grouped).forEach((items) => {
    items.sort((a, b) => {
      const aTime = a.answeredAtMs ?? Number.MAX_SAFE_INTEGER;
      const bTime = b.answeredAtMs ?? Number.MAX_SAFE_INTEGER;

      if (aTime !== bTime) {
        return aTime - bTime;
      }

      return a.username.localeCompare(b.username, "zh-Hant");
    });
  });

  return grouped;
};

type BuildMyFeedbackModelParams = {
  gamePhase: "guess" | "reveal";
  isInterTrackWait: boolean;
  isGuessUrgency: boolean;
  isReveal: boolean;
  myAnswerRank: number | null;
  liveParticipantCount: number;
  liveAnsweredCount: number;
  liveAccuracyPct: number | null;
  startCountdownSec: number;
  meClientId?: string;
  myHasAnswered: boolean;
  selectedChoice: number | null;
  myIsCorrect: boolean;
  myResolvedGain: number;
  myResolvedScoreBreakdownTotalGain: number | null;
  myHasChangedAnswer: boolean;
};

export const buildMyFeedbackModel = ({
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
  myResolvedScoreBreakdownTotalGain,
  myHasChangedAnswer,
}: BuildMyFeedbackModelParams): MyFeedbackModel => {
  const guessBadges: string[] = [];
  if (myAnswerRank !== null) {
    guessBadges.push(`第${myAnswerRank}答`);
  }
  if (liveParticipantCount > 0) {
    guessBadges.push(`已答 ${liveAnsweredCount}/${liveParticipantCount}`);
  }
  const revealBadges: string[] = [];
  if (myAnswerRank !== null) {
    revealBadges.push(`第${myAnswerRank}答`);
  }
  if (liveAccuracyPct !== null) {
    revealBadges.push(`全場答對率 ${liveAccuracyPct}%`);
  }
  const badges = (isReveal ? revealBadges : guessBadges).slice(0, 2);

  if (isInterTrackWait) {
    return {
      tone: "neutral",
      title: "下一首準備中",
      detail: `${startCountdownSec} 秒後開始`,
      badges,
      pillText: `${startCountdownSec}s`,
      lines: ["等待下一題載入完成", "倒數結束後可立即作答"],
    };
  }

  if (gamePhase === "guess") {
    if (!myHasAnswered) {
      return {
        tone: "neutral",
        title: "尚未作答",
        detail: isGuessUrgency
          ? "最後幾秒了，快決定答案。"
          : "請在倒數結束前選擇答案。",
        badges,
        pillText: isGuessUrgency ? "快作答" : "待命中",
        lines: [
          isGuessUrgency ? "最後幾秒，請立即作答" : "本題尚未作答",
          liveParticipantCount > 0
            ? `已答 ${liveAnsweredCount}/${liveParticipantCount} 人`
            : "等待你的答案",
        ],
      };
    }
    return {
      tone: "locked",
      title: myHasChangedAnswer ? "已改答，可再改" : "已鎖定，可修改",
      detail:
        myAnswerRank !== null
          ? myHasChangedAnswer
            ? "目前答案已更新，倒數前仍可再改。"
            : "已提交答案，倒數前仍可修改。"
          : myHasChangedAnswer
            ? "目前答案已更新，倒數結束前仍可再修改。"
            : "你已提交答案，倒數結束前仍可修改。",
      badges,
      pillText: myHasChangedAnswer ? "已改答" : "已鎖定",
      lines: [
        myHasChangedAnswer
          ? "答案已更新，系統以最後提交為準"
          : "答案已送出，倒數前仍可修改",
        liveParticipantCount > 0
          ? `已答 ${liveAnsweredCount}/${liveParticipantCount}`
          : "已答統計載入中",
      ],
    };
  }

  if (!meClientId) {
    return {
      tone: "neutral",
      title: "本題結果已公布",
      detail: "",
      badges,
      pillText: "觀戰中",
      lines: [],
    };
  }

  if (!myHasAnswered || selectedChoice === null) {
    const lines = [
      [
        "+0",
        liveParticipantCount > 0
          ? `已答 ${liveAnsweredCount}/${liveParticipantCount}`
          : "已答統計載入中",
        liveAccuracyPct !== null
          ? `全場答對率 ${liveAccuracyPct}%`
          : "全場答對率載入中",
      ].join(" · "),
    ];
    return {
      tone: "neutral",
      title: "未作答 +0",
      detail: lines.join(" · "),
      badges,
      pillText: "+0",
      lines: [],
      inlineMeta: lines[0],
    };
  }

  if (myIsCorrect) {
    const revealInlineMeta = [
      myAnswerRank !== null ? `第${myAnswerRank}答` : null,
      liveAccuracyPct !== null ? `全場答對率 ${liveAccuracyPct}%` : null,
    ]
      .filter((value): value is string => Boolean(value))
      .join(" · ");
    const signedGainText =
      myResolvedGain > 0
        ? `+${myResolvedGain}`
        : myResolvedGain < 0
          ? `${myResolvedGain}`
          : "+0";
    return {
      tone: "correct",
      title: `答對 ${signedGainText}`,
      detail: revealInlineMeta || "本題得分已更新",
      badges: [],
      pillText: signedGainText,
      lines: [],
      inlineMeta: revealInlineMeta,
    };
  }

  const wrongGain = myResolvedScoreBreakdownTotalGain ?? 0;
  const signedWrongGain =
    wrongGain > 0 ? `+${wrongGain}` : wrongGain < 0 ? `${wrongGain}` : "+0";
  const revealResultDetailParts: string[] = [
    [
      signedWrongGain,
      myAnswerRank !== null ? `第${myAnswerRank}答` : "順位載入中",
      liveAccuracyPct !== null
        ? `全場答對率 ${liveAccuracyPct}%`
        : "全場答對率載入中",
    ].join(" · "),
  ];
  return {
    tone: "wrong",
    title: `答錯 ${signedWrongGain}`,
    detail: revealResultDetailParts.join(" · "),
    badges: isReveal ? [] : badges,
    pillText: signedWrongGain,
    lines: [],
    inlineMeta: revealResultDetailParts[0],
  };
};

type BuildSettlementQuestionRecapParams = {
  trackSessionKey: string;
  order: number;
  trackIndex: number;
  title: string;
  uploader: string | null | undefined;
  channelId: string | null | undefined;
  duration: string | null | undefined;
  thumbnail: string | null | undefined;
  myChoiceIndex: number | null;
  correctChoiceIndex: number;
  choices: Array<{ index: number; title?: string | null }>;
  playlistChoices: Array<{
    answerText?: string | null;
    title?: string | null;
  }>;
  participantCount: number;
  answeredCount: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  changedAnswerCount: number | null;
  changedAnswerUserCount: number | null;
  fastestCorrectRank: number | null;
  fastestCorrectMs: number | null;
  medianCorrectMs: number | null;
  answersByClientId?: Record<string, RoomSettlementQuestionAnswer>;
  myAnswered: boolean;
};

export const buildSettlementQuestionRecap = ({
  trackSessionKey,
  order,
  trackIndex,
  title,
  uploader,
  channelId,
  duration,
  thumbnail,
  myChoiceIndex,
  correctChoiceIndex,
  choices,
  playlistChoices,
  participantCount,
  answeredCount,
  correctCount,
  wrongCount,
  unansweredCount,
  changedAnswerCount,
  changedAnswerUserCount,
  fastestCorrectRank,
  fastestCorrectMs,
  medianCorrectMs,
  answersByClientId,
  myAnswered,
}: BuildSettlementQuestionRecapParams): SettlementQuestionRecap => {
  const myResult: SettlementQuestionResult = !myAnswered
    ? "unanswered"
    : myChoiceIndex === correctChoiceIndex
      ? "correct"
      : "wrong";

  return {
    key: trackSessionKey,
    order,
    trackIndex,
    title: normalizeRoomDisplayText(title, "（未提供名稱）"),
    uploader: normalizeRoomDisplayText(uploader, "Unknown"),
    channelId: channelId?.trim() || null,
    duration: duration?.trim() || null,
    thumbnail: thumbnail || null,
    myResult,
    myChoiceIndex,
    correctChoiceIndex,
    choices: choices.map((choice) => ({
      index: choice.index,
      title: normalizeRoomDisplayText(
        choice.title?.trim() ||
          playlistChoices[choice.index]?.answerText?.trim() ||
          playlistChoices[choice.index]?.title?.trim(),
        "（未提供名稱）",
      ),
      isCorrect: choice.index === correctChoiceIndex,
      isSelectedByMe: choice.index === myChoiceIndex,
    })),
    participantCount,
    answeredCount,
    correctCount,
    wrongCount,
    unansweredCount,
    changedAnswerCount: changedAnswerCount ?? undefined,
    changedAnswerUserCount: changedAnswerUserCount ?? undefined,
    fastestCorrectRank,
    fastestCorrectMs,
    medianCorrectMs,
    answersByClientId,
  };
};
