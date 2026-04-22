import {
  DEFAULT_PLAYBACK_EXTENSION_MODE,
  DEFAULT_PLAY_DURATION_SEC,
  DEFAULT_REVEAL_DURATION_SEC,
  DEFAULT_START_OFFSET_SEC,
  QUESTION_MIN,
} from "./roomConstants";
import {
  sanitizePossibleGarbledText,
} from "../../../shared/utils/text";
import {
  clampPlayDurationSec,
  clampRevealDurationSec,
  clampStartOffsetSec,
} from "./roomUtils";
import {
  normalizePlaylistItems,
} from "@features/PlaylistSource";
import type {
  ChatMessage,
  PlaylistItem,
  RoomSettlementSnapshot,
  RoomState,
  RoomSummary,
} from "./types";

export const MAX_ROOM_MESSAGE_COUNT = 1200;
export const MAX_SETTLEMENT_HISTORY_COUNT = 30;

export const formatAckError = (prefix: string, error?: string) => {
  const safePrefix = sanitizePossibleGarbledText(prefix, "操作失敗");
  const detail = sanitizePossibleGarbledText(
    error?.trim() || "未知錯誤",
    "未知錯誤",
  );
  return `${safePrefix}：${detail}`;
};

export const normalizeQuestionCount = (
  value: number | undefined,
  fallback: number,
) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return fallback;
  }
  return Math.floor(value);
};

export type RoomGameSettings = NonNullable<RoomSummary["gameSettings"]>;

export const normalizePlaybackExtensionMode = (
  value: RoomGameSettings["playbackExtensionMode"] | undefined,
) =>
  value === "manual_vote" || value === "auto_once" || value === "disabled"
    ? value
    : DEFAULT_PLAYBACK_EXTENSION_MODE;

export const mergeGameSettings = (
  current: RoomSummary["gameSettings"] | undefined,
  incoming: Partial<RoomGameSettings> | undefined,
): RoomGameSettings => {
  const fallbackQuestionCount = normalizeQuestionCount(
    current?.questionCount,
    QUESTION_MIN,
  );
  return {
    questionCount: normalizeQuestionCount(
      incoming?.questionCount,
      fallbackQuestionCount,
    ),
    playDurationSec: clampPlayDurationSec(
      incoming?.playDurationSec ??
        current?.playDurationSec ??
        DEFAULT_PLAY_DURATION_SEC,
    ),
    revealDurationSec: clampRevealDurationSec(
      incoming?.revealDurationSec ??
        current?.revealDurationSec ??
        DEFAULT_REVEAL_DURATION_SEC,
    ),
    startOffsetSec: clampStartOffsetSec(
      incoming?.startOffsetSec ??
        current?.startOffsetSec ??
        DEFAULT_START_OFFSET_SEC,
    ),
    allowCollectionClipTiming:
      incoming?.allowCollectionClipTiming ??
      current?.allowCollectionClipTiming ??
      true,
    allowParticipantInvite:
      incoming?.allowParticipantInvite ??
      current?.allowParticipantInvite ??
      false,
    playbackExtensionMode: normalizePlaybackExtensionMode(
      incoming?.playbackExtensionMode ?? current?.playbackExtensionMode,
    ),
    leaderboardProfileKey:
      incoming?.leaderboardProfileKey !== undefined
        ? incoming.leaderboardProfileKey
        : current?.leaderboardProfileKey,
    leaderboardRuleVersion:
      incoming?.leaderboardRuleVersion !== undefined
        ? incoming.leaderboardRuleVersion
        : current?.leaderboardRuleVersion,
    leaderboardModeKey:
      incoming?.leaderboardModeKey !== undefined
        ? incoming.leaderboardModeKey
        : current?.leaderboardModeKey,
    leaderboardVariantKey:
      incoming?.leaderboardVariantKey !== undefined
        ? incoming.leaderboardVariantKey
        : current?.leaderboardVariantKey,
    leaderboardTargetQuestionCount:
      incoming?.leaderboardTargetQuestionCount !== undefined
        ? incoming.leaderboardTargetQuestionCount
        : current?.leaderboardTargetQuestionCount,
    leaderboardTimeLimitSec:
      incoming?.leaderboardTimeLimitSec !== undefined
        ? incoming.leaderboardTimeLimitSec
        : current?.leaderboardTimeLimitSec,
    leaderboardRankingMetric:
      incoming?.leaderboardRankingMetric !== undefined
        ? incoming.leaderboardRankingMetric
        : current?.leaderboardRankingMetric,
  };
};

export const mergeKnownGameSettings = (
  current: RoomSummary["gameSettings"] | undefined,
  incoming: Partial<RoomGameSettings> | undefined,
): RoomSummary["gameSettings"] => {
  if (!current && !incoming) return undefined;

  const next: Partial<RoomGameSettings> = {};
  const questionCount = incoming?.questionCount ?? current?.questionCount;
  if (questionCount !== undefined) {
    next.questionCount = normalizeQuestionCount(questionCount, QUESTION_MIN);
  }
  const playDurationSec =
    incoming?.playDurationSec ?? current?.playDurationSec;
  if (playDurationSec !== undefined) {
    next.playDurationSec = clampPlayDurationSec(playDurationSec);
  }
  const revealDurationSec =
    incoming?.revealDurationSec ?? current?.revealDurationSec;
  if (revealDurationSec !== undefined) {
    next.revealDurationSec = clampRevealDurationSec(revealDurationSec);
  }
  const startOffsetSec = incoming?.startOffsetSec ?? current?.startOffsetSec;
  if (startOffsetSec !== undefined) {
    next.startOffsetSec = clampStartOffsetSec(startOffsetSec);
  }
  const allowCollectionClipTiming =
    incoming?.allowCollectionClipTiming ?? current?.allowCollectionClipTiming;
  if (allowCollectionClipTiming !== undefined) {
    next.allowCollectionClipTiming = allowCollectionClipTiming;
  }
  const allowParticipantInvite =
    incoming?.allowParticipantInvite ?? current?.allowParticipantInvite;
  if (allowParticipantInvite !== undefined) {
    next.allowParticipantInvite = allowParticipantInvite;
  }
  const playbackExtensionMode =
    incoming?.playbackExtensionMode ?? current?.playbackExtensionMode;
  if (playbackExtensionMode !== undefined) {
    next.playbackExtensionMode =
      normalizePlaybackExtensionMode(playbackExtensionMode);
  }
  const leaderboardProfileKey =
    incoming?.leaderboardProfileKey !== undefined
      ? incoming.leaderboardProfileKey
      : current?.leaderboardProfileKey;
  if (leaderboardProfileKey !== undefined) {
    next.leaderboardProfileKey = leaderboardProfileKey;
  }
  const leaderboardRuleVersion =
    incoming?.leaderboardRuleVersion !== undefined
      ? incoming.leaderboardRuleVersion
      : current?.leaderboardRuleVersion;
  if (leaderboardRuleVersion !== undefined) {
    next.leaderboardRuleVersion = leaderboardRuleVersion;
  }
  const leaderboardModeKey =
    incoming?.leaderboardModeKey !== undefined
      ? incoming.leaderboardModeKey
      : current?.leaderboardModeKey;
  if (leaderboardModeKey !== undefined) {
    next.leaderboardModeKey = leaderboardModeKey;
  }
  const leaderboardVariantKey =
    incoming?.leaderboardVariantKey !== undefined
      ? incoming.leaderboardVariantKey
      : current?.leaderboardVariantKey;
  if (leaderboardVariantKey !== undefined) {
    next.leaderboardVariantKey = leaderboardVariantKey;
  }
  const leaderboardTargetQuestionCount =
    incoming?.leaderboardTargetQuestionCount !== undefined
      ? incoming.leaderboardTargetQuestionCount
      : current?.leaderboardTargetQuestionCount;
  if (leaderboardTargetQuestionCount !== undefined) {
    next.leaderboardTargetQuestionCount = leaderboardTargetQuestionCount;
  }
  const leaderboardTimeLimitSec =
    incoming?.leaderboardTimeLimitSec !== undefined
      ? incoming.leaderboardTimeLimitSec
      : current?.leaderboardTimeLimitSec;
  if (leaderboardTimeLimitSec !== undefined) {
    next.leaderboardTimeLimitSec = leaderboardTimeLimitSec;
  }
  const leaderboardRankingMetric =
    incoming?.leaderboardRankingMetric !== undefined
      ? incoming.leaderboardRankingMetric
      : current?.leaderboardRankingMetric;
  if (leaderboardRankingMetric !== undefined) {
    next.leaderboardRankingMetric = leaderboardRankingMetric;
  }

  return Object.keys(next).length > 0
    ? (next as RoomSummary["gameSettings"])
    : undefined;
};

export const applyGameSettingsPatch = (
  room: RoomState["room"],
  patch: Partial<RoomGameSettings>,
): RoomState["room"] => ({
  ...room,
  gameSettings: mergeGameSettings(room.gameSettings, {
    ...room.gameSettings,
    ...patch,
  }),
});

export const buildUploadPlaylistItems = (
  sourceItems: PlaylistItem[],
  options: {
    playDurationSec: number;
    startOffsetSec: number;
    allowCollectionClipTiming: boolean;
  },
): PlaylistItem[] => {
  const roomPlayDurationSec = clampPlayDurationSec(options.playDurationSec);
  const roomStartOffsetSec = clampStartOffsetSec(options.startOffsetSec);
  return normalizePlaylistItems(sourceItems).map((item) => {
    const itemStartSec = Math.max(0, item.startSec ?? 0);
    const rawHasExplicitEndSec =
      typeof item.hasExplicitEndSec === "boolean"
        ? item.hasExplicitEndSec
        : typeof item.endSec === "number" && item.endSec > itemStartSec;
    const rawHasExplicitStartSec =
      typeof item.hasExplicitStartSec === "boolean"
        ? item.hasExplicitStartSec
        : itemStartSec > 0 || rawHasExplicitEndSec;
    const collectionClipStartSec = Math.max(
      0,
      item.collectionClipStartSec ?? itemStartSec,
    );
    const inferredTrackClip = item.timingSource === "track_clip";
    const collectionHasExplicitStartSec =
      typeof item.collectionHasExplicitStartSec === "boolean"
        ? item.collectionHasExplicitStartSec
        : inferredTrackClip
          ? rawHasExplicitStartSec
          : false;
    const collectionHasExplicitEndSec =
      typeof item.collectionHasExplicitEndSec === "boolean"
        ? item.collectionHasExplicitEndSec
        : inferredTrackClip
          ? rawHasExplicitEndSec
          : false;
    const collectionClipEndSec =
      typeof item.collectionClipEndSec === "number" &&
      item.collectionClipEndSec > collectionClipStartSec
        ? item.collectionClipEndSec
        : collectionHasExplicitEndSec &&
            typeof item.endSec === "number" &&
            item.endSec > collectionClipStartSec
          ? item.endSec
          : undefined;
    const isCollectionItem = item.provider === "collection";
    const useTrackClip =
      options.allowCollectionClipTiming &&
      isCollectionItem &&
      (collectionHasExplicitStartSec || collectionHasExplicitEndSec);
    const startSec = useTrackClip ? collectionClipStartSec : roomStartOffsetSec;
    const fallbackEndSec = startSec + roomPlayDurationSec;
    const itemEndSec =
      useTrackClip && collectionHasExplicitEndSec && collectionClipEndSec
        ? collectionClipEndSec
        : fallbackEndSec;
    const endSec = Math.max(
      startSec + 1,
      useTrackClip ? itemEndSec : fallbackEndSec,
    );
    return {
      ...item,
      startSec,
      endSec,
      hasExplicitStartSec: useTrackClip ? collectionHasExplicitStartSec : false,
      hasExplicitEndSec: useTrackClip ? collectionHasExplicitEndSec : false,
      collectionClipStartSec,
      collectionClipEndSec,
      collectionHasExplicitStartSec,
      collectionHasExplicitEndSec,
      timingSource: useTrackClip
        ? ("track_clip" as const)
        : ("room_settings" as const),
    };
  });
};

export const mergeRoomSummaryIntoCurrentRoom = (
  current: RoomState["room"],
  summary: RoomSummary,
): RoomState["room"] => ({
  ...current,
  ...summary,
  playlist: {
    ...current.playlist,
    ...(summary.playlistId !== undefined
      ? { id: summary.playlistId ?? undefined }
      : {}),
    ...(summary.playlistTitle !== undefined
      ? { title: summary.playlistTitle ?? undefined }
      : {}),
    ...(summary.playlistSourceType !== undefined
      ? { sourceType: summary.playlistSourceType ?? null }
      : {}),
    ...(typeof summary.playlistCount === "number"
      ? {
          totalCount: summary.playlistCount,
          receivedCount: Math.min(
            current.playlist.receivedCount,
            summary.playlistCount,
          ),
        }
      : {}),
  },
  gameSettings: mergeKnownGameSettings(current.gameSettings, summary.gameSettings),
});

export const capRoomMessages = (
  messages: ChatMessage[],
  limit = MAX_ROOM_MESSAGE_COUNT,
) => {
  if (limit <= 0) return [];
  if (messages.length <= limit) return messages;
  return messages.slice(-limit);
};

export const capSettlementHistory = (
  history: RoomSettlementSnapshot[],
  limit = MAX_SETTLEMENT_HISTORY_COUNT,
) => {
  if (limit <= 0) return [];
  if (history.length <= limit) return history;
  const sorted = [...history].sort(
    (a, b) => b.endedAt - a.endedAt || b.roundNo - a.roundNo,
  );
  return sorted.slice(0, limit);
};
