export type RoomPlayMode = "casual" | "leaderboard";
export type LeaderboardModeKey = "classic" | "time_attack";
export type LeaderboardVariantKey = "30q" | "50q" | "15m";

export const DEFAULT_ROOM_PLAY_MODE: RoomPlayMode = "casual";
export const DEFAULT_LEADERBOARD_MODE: LeaderboardModeKey = "classic";
export const DEFAULT_LEADERBOARD_VARIANT: LeaderboardVariantKey = "30q";

export const leaderboardModes: Array<{
  key: LeaderboardModeKey;
  label: string;
  description: string;
}> = [
  {
    key: "classic",
    label: "經典排行",
    description: "固定題數，比最高分與命中表現。",
  },
  {
    key: "time_attack",
    label: "限時挑戰",
    description: "固定時間內衝分，不限制完成題數。",
  },
];

export const leaderboardVariants: Record<
  LeaderboardModeKey,
  Array<{
    key: LeaderboardVariantKey;
    label: string;
    profileKey: string;
    questionCount?: number;
    timeLimitSec?: number;
  }>
> = {
  classic: [
    { key: "30q", label: "30 題", profileKey: "classic_30", questionCount: 30 },
    { key: "50q", label: "50 題", profileKey: "classic_50", questionCount: 50 },
  ],
  time_attack: [
    {
      key: "15m",
      label: "15 分鐘",
      profileKey: "time_attack_15m",
      timeLimitSec: 15 * 60,
    },
  ],
};

export const getLeaderboardModeLabel = (key: LeaderboardModeKey) =>
  leaderboardModes.find((mode) => mode.key === key)?.label ?? "排行榜";

export const getLeaderboardModeDescription = (key: LeaderboardModeKey) =>
  leaderboardModes.find((mode) => mode.key === key)?.description ?? "";

export const getLeaderboardVariant = (
  mode: LeaderboardModeKey,
  variant: LeaderboardVariantKey,
) =>
  leaderboardVariants[mode].find((item) => item.key === variant) ??
  leaderboardVariants[mode][0];

export const getLeaderboardProfileKey = (
  mode: LeaderboardModeKey,
  variant: LeaderboardVariantKey,
) => getLeaderboardVariant(mode, variant).profileKey;
