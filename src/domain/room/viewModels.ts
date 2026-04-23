import type { RoomCreateSourceMode, RoomSummary } from "./types";
import type { CollectionSummary } from "./api";

type YoutubePlaylist = {
  title?: string | null;
  thumbnail?: string | null;
};

export type SourceSummary = {
  label: string;
  title: string;
  detail: string;
  thumbnail: string;
} | null;

export type CreateSettingsCard = {
  label: string;
  value: string;
};

export type CreatePresetCard = {
  key: string;
  label: string;
  hint: string;
  active: boolean;
  onApply: () => void;
};

export const formatDurationLabel = (durationSec?: number | null) => {
  if (!durationSec || durationSec <= 0) return null;
  const minutes = Math.floor(durationSec / 60);
  const seconds = durationSec % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

export const roomRequiresPin = (room: RoomSummary) =>
  Boolean(room.hasPin ?? room.hasPassword);

export const roomIsLeaderboardChallenge = (room: RoomSummary | null | undefined) => {
  if (!room) return false;
  const source = room as RoomSummary &
    Record<string, unknown> & {
      gameSettings?: Record<string, unknown> | null;
      game_settings?: Record<string, unknown> | null;
    };
  const gameSettings = source.gameSettings ?? source.game_settings;
  return Boolean(
    room.gameSettings?.leaderboardProfileKey ??
      source.leaderboardProfileKey ??
      source.leaderboard_profile_key ??
      gameSettings?.leaderboardProfileKey ??
      gameSettings?.leaderboard_profile_key,
  );
};

export const normalizeRoomCodeInput = (value: string) =>
  value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);

export const formatRoomCodeDisplay = (value: string) => {
  const normalized = normalizeRoomCodeInput(value);
  if (normalized.length <= 3) return normalized;
  return `${normalized.slice(0, 3)}-${normalized.slice(3)}`;
};

export const getRoomPlaylistLabel = (room: RoomSummary) => {
  const source = room as RoomSummary &
    Record<string, unknown> & {
      playlist?: { title?: unknown } | null;
    };

  const candidates = [
    room.playlistTitle,
    source.playlist_title,
    source.sourceTitle,
    source.source_title,
    source.collectionTitle,
    source.collection_title,
    source.playlist?.title,
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const trimmed = candidate.trim();
    if (trimmed) return trimmed;
  }

  return room.playlistCount > 0
    ? `共 ${room.playlistCount} 首題目`
    : "題庫資訊未提供";
};

const detectRoomCurrentlyPlaying = (room: RoomSummary) => {
  const source = room as RoomSummary &
    Record<string, unknown> & {
      gameState?: { status?: unknown } | null;
    };

  const boolCandidates = [
    source.isPlaying,
    source.playing,
    source.inGame,
    source.hasActiveGame,
  ];
  if (boolCandidates.some((value) => value === true)) return true;

  const stringCandidates = [
    source.gameStatus,
    source.game_status,
    source.status,
    source.liveStatus,
    source.roomStatus,
    source.gameState?.status,
  ];
  for (const value of stringCandidates) {
    if (typeof value !== "string") continue;
    const normalized = value.trim().toLowerCase();
    if (
      normalized === "playing" ||
      normalized === "in_progress" ||
      normalized === "active" ||
      normalized === "started" ||
      normalized === "running"
    ) {
      return true;
    }
  }

  return false;
};

export const getRoomStatusLabel = (room: RoomSummary) =>
  detectRoomCurrentlyPlaying(room) ? "遊玩中" : "待機中";

type BuildSourceSummaryArgs = {
  isCreateSourceReady: boolean;
  roomCreateSourceMode: RoomCreateSourceMode;
  lastFetchedPlaylistTitle: string | null;
  playlistItemsLength: number;
  playlistPreviewThumbnail: string;
  selectedYoutubePlaylist?: YoutubePlaylist | null;
  selectedCollection?: Pick<CollectionSummary, "title"> | null;
  selectedSharedCollection?: { title: string } | null;
  selectedCollectionThumb: string;
};

export const buildSelectedSourceSummary = ({
  isCreateSourceReady,
  roomCreateSourceMode,
  lastFetchedPlaylistTitle,
  playlistItemsLength,
  playlistPreviewThumbnail,
  selectedYoutubePlaylist,
  selectedCollection,
  selectedSharedCollection,
  selectedCollectionThumb,
}: BuildSourceSummaryArgs): SourceSummary => {
  if (!isCreateSourceReady) return null;

  if (roomCreateSourceMode === "link") {
    return {
      label: "貼上連結",
      title: lastFetchedPlaylistTitle || "YouTube 連結清單",
      detail: `已載入 ${playlistItemsLength} 首`,
      thumbnail: playlistPreviewThumbnail,
    };
  }

  if (roomCreateSourceMode === "youtube") {
    return {
      label: "YouTube 清單",
      title: selectedYoutubePlaylist?.title || "已選擇 YouTube 播放清單",
      detail: `${playlistItemsLength} 首`,
      thumbnail:
        selectedYoutubePlaylist?.thumbnail || playlistPreviewThumbnail || "",
    };
  }

  if (roomCreateSourceMode === "publicCollection") {
    return {
      label: "公開收藏庫",
      title:
        selectedCollection?.title ||
        selectedSharedCollection?.title ||
        "已選擇公開收藏",
      detail: `已載入 ${playlistItemsLength} 首`,
      thumbnail: selectedCollectionThumb,
    };
  }

  if (roomCreateSourceMode === "privateCollection") {
    return {
      label: "個人收藏庫",
      title:
        selectedCollection?.title ||
        selectedSharedCollection?.title ||
        "已選擇個人收藏",
      detail: `已載入 ${playlistItemsLength} 首`,
      thumbnail: selectedCollectionThumb,
    };
  }

  return null;
};

export const buildSelectedCreateSourceSummary = ({
  isCreateSourceReady,
  roomCreateSourceMode,
  lastFetchedPlaylistTitle,
  playlistItemsLength,
  playlistPreviewThumbnail,
  selectedYoutubePlaylist,
  selectedCollection,
  selectedSharedCollection,
  selectedCollectionThumb,
}: BuildSourceSummaryArgs): SourceSummary => {
  if (!isCreateSourceReady) return null;

  if (roomCreateSourceMode === "link") {
    return {
      label: "貼上連結",
      title: lastFetchedPlaylistTitle || "YouTube 播放清單",
      detail: `${playlistItemsLength} 題`,
      thumbnail: playlistPreviewThumbnail,
    };
  }

  if (roomCreateSourceMode === "youtube") {
    return {
      label: "YouTube 播放清單",
      title: selectedYoutubePlaylist?.title || "尚未選擇 YouTube 播放清單",
      detail: `${playlistItemsLength} 題`,
      thumbnail:
        selectedYoutubePlaylist?.thumbnail || playlistPreviewThumbnail || "",
    };
  }

  if (roomCreateSourceMode === "publicCollection") {
    return {
      label: "公開收藏庫",
      title:
        selectedCollection?.title ||
        selectedSharedCollection?.title ||
        "尚未選擇公開收藏庫",
      detail: `${playlistItemsLength} 題`,
      thumbnail: selectedCollectionThumb,
    };
  }

  if (roomCreateSourceMode === "privateCollection") {
    return {
      label: "個人收藏庫",
      title:
        selectedCollection?.title ||
        selectedSharedCollection?.title ||
        "尚未選擇個人收藏庫",
      detail: `${playlistItemsLength} 題`,
      thumbnail: selectedCollectionThumb,
    };
  }

  return null;
};

type BuildCreateSettingsCardsArgs = {
  roomVisibilityInput: "public" | "private";
  parsedMaxPlayers: number | null;
  questionCount: number;
  allowCollectionClipTiming: boolean;
  playDurationSec: number;
  revealDurationSec: number;
  startOffsetSec: number;
};

export const buildCreateSettingsCards = ({
  roomVisibilityInput,
  parsedMaxPlayers,
  questionCount,
  allowCollectionClipTiming,
  playDurationSec,
  revealDurationSec,
  startOffsetSec,
}: BuildCreateSettingsCardsArgs): CreateSettingsCard[] => [
  {
    label: "房間型態",
    value:
      roomVisibilityInput === "private"
        ? "私人房 · 不會顯示在列表，需透過房間代碼進入"
        : "公開房 · 會顯示在大廳列表",
  },
  {
    label: "玩家上限",
    value: parsedMaxPlayers ? `${parsedMaxPlayers} 人` : "尚未設定",
  },
  {
    label: "題數",
    value: `${questionCount} 題`,
  },
  {
    label: "遊戲節奏",
    value: allowCollectionClipTiming
      ? `公布答案 ${revealDurationSec}s / 沿用題庫片段`
      : `作答時間 ${playDurationSec}s / 公布答案 ${revealDurationSec}s / 起始時間 ${startOffsetSec}s`,
  },
];

type BuildCreatePresetCardsArgs = {
  questionCount: number;
  playDurationSec: number;
  revealDurationSec: number;
  startOffsetSec: number;
  updateQuestionCount: (value: number) => void;
  updatePlayDurationSec: (value: number) => number;
  updateRevealDurationSec: (value: number) => number;
  updateStartOffsetSec: (value: number) => number;
};

export const buildCreatePresetCards = ({
  questionCount,
  playDurationSec,
  revealDurationSec,
  startOffsetSec,
  updateQuestionCount,
  updatePlayDurationSec,
  updateRevealDurationSec,
  updateStartOffsetSec,
}: BuildCreatePresetCardsArgs): CreatePresetCard[] => [
  {
    key: "casual",
    label: "輕鬆局",
    hint: "10 題、較長播放與揭示時間，適合暖身。",
    active:
      questionCount === 10 &&
      playDurationSec === 18 &&
      revealDurationSec === 12 &&
      startOffsetSec === 0,
    onApply: () => {
      updateQuestionCount(10);
      updatePlayDurationSec(18);
      updateRevealDurationSec(12);
      updateStartOffsetSec(0);
    },
  },
  {
    key: "standard",
    label: "標準局",
    hint: "15 題、平衡節奏，適合大多數房間。",
    active:
      questionCount === 15 &&
      playDurationSec === 15 &&
      revealDurationSec === 10 &&
      startOffsetSec === 0,
    onApply: () => {
      updateQuestionCount(15);
      updatePlayDurationSec(15);
      updateRevealDurationSec(10);
      updateStartOffsetSec(0);
    },
  },
  {
    key: "tempo",
    label: "快節奏",
    hint: "20 題、縮短播放與揭示時間，節奏更緊湊。",
    active:
      questionCount === 20 &&
      playDurationSec === 12 &&
      revealDurationSec === 8 &&
      startOffsetSec === 3,
    onApply: () => {
      updateQuestionCount(20);
      updatePlayDurationSec(12);
      updateRevealDurationSec(8);
      updateStartOffsetSec(3);
    },
  },
];
