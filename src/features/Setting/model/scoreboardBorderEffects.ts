export type LegacyScoreboardBorderEffectId =
  | "waterfire"
  | "waterfireChase"
  | "prism"
  | "fire"
  | "inferno"
  | "burning-fire"
  | "electric-arc";

export type ScoreboardBorderAnimationId = "none" | "single-beam" | "dual-beam";

export type ScoreboardBorderLineStyleId =
  | "snow-white"
  | "gold-stars"
  | "silver-glint";

export type ScoreboardBorderThemeId =
  | "fire-red"
  | "dual-water-fire"
  | "rainbow-prism";

export interface ScoreboardBorderAnimationPreset {
  id: ScoreboardBorderAnimationId;
  title: string;
  subtitle: string;
  description: string;
}

export interface ScoreboardBorderLineStylePreset {
  id: ScoreboardBorderLineStyleId;
  title: string;
  subtitle: string;
  description: string;
}

export interface ScoreboardBorderThemePreset {
  id: ScoreboardBorderThemeId;
  title: string;
  subtitle: string;
  description: string;
  accentLabel: string;
  swatches: string[];
}

export const SCOREBOARD_BORDER_STORAGE_KEYS = {
  enabled: "scoreboard_border_enabled",
  maskEnabled: "scoreboard_border_mask_enabled",
  animation: "scoreboard_border_animation",
  lineStyle: "scoreboard_border_line_style",
  theme: "scoreboard_border_theme",
  particleCount: "scoreboard_border_particle_count",
  legacyEffect: "scoreboard_border_effect",
} as const;

export const DEFAULT_SCOREBOARD_BORDER_ENABLED = true;
export const DEFAULT_SCOREBOARD_BORDER_MASK_ENABLED = true;
export const DEFAULT_SCOREBOARD_BORDER_ANIMATION: ScoreboardBorderAnimationId =
  "single-beam";
export const DEFAULT_SCOREBOARD_BORDER_LINE_STYLE: ScoreboardBorderLineStyleId =
  "gold-stars";
export const DEFAULT_SCOREBOARD_BORDER_THEME: ScoreboardBorderThemeId =
  "rainbow-prism";
export const DEFAULT_SCOREBOARD_BORDER_PARTICLE_COUNT = 100;
export const MIN_SCOREBOARD_BORDER_PARTICLE_COUNT = 0;
export const MAX_SCOREBOARD_BORDER_PARTICLE_COUNT = 100;

export const SCOREBOARD_BORDER_ANIMATION_PRESETS: ScoreboardBorderAnimationPreset[] =
  [
    {
      id: "none",
      title: "靜止",
      subtitle: "Still",
      description: "只保留粒子與原本的 combo 光暈，不額外做遮罩呼吸。",
    },
    {
      id: "single-beam",
      title: "單層呼吸",
      subtitle: "Soft Fill",
      description: "一層透明遮罩慢慢填亮，再柔和地退回底色。",
    },
    {
      id: "dual-beam",
      title: "雙層流動",
      subtitle: "Layered Fill",
      description: "兩層透明遮罩交錯呼吸，亮度更有層次但仍保持克制。",
    },
  ];

export const SCOREBOARD_BORDER_LINE_STYLE_PRESETS: ScoreboardBorderLineStylePreset[] =
  [
    {
      id: "snow-white",
      title: "雪白微粒",
      subtitle: "Snow",
      description: "乾淨的白色細粒，像冷空氣裡漂浮的亮塵。",
    },
    {
      id: "gold-stars",
      title: "金色星點",
      subtitle: "Gold",
      description: "較亮的金色粒子，適合想讓冠軍列更有獎勵感時使用。",
    },
    {
      id: "silver-glint",
      title: "銀色閃芒",
      subtitle: "Silver",
      description: "銀白色短暫閃光，視覺較俐落，適合偏冷調的介面。",
    },
  ];

export const SCOREBOARD_BORDER_THEME_PRESETS: ScoreboardBorderThemePreset[] = [
  {
    id: "fire-red",
    title: "焰紅遮罩",
    subtitle: "Fire Veil",
    description: "暖紅透明遮罩由暗到亮，像熱度沿著冠軍列慢慢升溫。",
    accentLabel: "Mask",
    swatches: ["#ffd7cb", "#ff9a7a", "#ff6a4b", "#ff3d27"],
  },
  {
    id: "dual-water-fire",
    title: "冰火遮罩",
    subtitle: "Water + Fire Veil",
    description: "左右兩端分別帶冷藍與暖紅，透明遮罩交錯填亮整列。",
    accentLabel: "Dual Mask",
    swatches: ["#63ddff", "#b7f5ff", "#ff947d", "#ff4d34"],
  },
  {
    id: "rainbow-prism",
    title: "稜光遮罩",
    subtitle: "Prism Veil",
    description: "多彩透明光膜在表面慢慢流動，適合想要更華麗一點的冠軍列。",
    accentLabel: "Prism Mask",
    swatches: ["#ff6698", "#ffd45d", "#6af1ff", "#8a74ff"],
  },
];

const ANIMATION_ID_SET = new Set<ScoreboardBorderAnimationId>(
  SCOREBOARD_BORDER_ANIMATION_PRESETS.map((preset) => preset.id),
);
const LINE_STYLE_ID_SET = new Set<ScoreboardBorderLineStyleId>(
  SCOREBOARD_BORDER_LINE_STYLE_PRESETS.map((preset) => preset.id),
);
const THEME_ID_SET = new Set<ScoreboardBorderThemeId>(
  SCOREBOARD_BORDER_THEME_PRESETS.map((preset) => preset.id),
);

export const parseStoredScoreboardBorderEnabled = (value: unknown) => {
  if (value === "0" || value === "false") return false;
  if (value === "1" || value === "true") return true;
  return DEFAULT_SCOREBOARD_BORDER_ENABLED;
};

export const parseStoredScoreboardBorderMaskEnabled = (value: unknown) => {
  if (value === "0" || value === "false") return false;
  if (value === "1" || value === "true") return true;
  return DEFAULT_SCOREBOARD_BORDER_MASK_ENABLED;
};

export const parseStoredScoreboardBorderAnimation = (
  value: unknown,
): ScoreboardBorderAnimationId => {
  if (typeof value !== "string") {
    return DEFAULT_SCOREBOARD_BORDER_ANIMATION;
  }
  return ANIMATION_ID_SET.has(value as ScoreboardBorderAnimationId)
    ? (value as ScoreboardBorderAnimationId)
    : DEFAULT_SCOREBOARD_BORDER_ANIMATION;
};

export const parseStoredScoreboardBorderLineStyle = (
  value: unknown,
): ScoreboardBorderLineStyleId => {
  if (typeof value !== "string") {
    return DEFAULT_SCOREBOARD_BORDER_LINE_STYLE;
  }
  switch (value) {
    case "off":
    case "subtle":
      return "snow-white";
    case "preview-rich":
      return "gold-stars";
    default:
      return LINE_STYLE_ID_SET.has(value as ScoreboardBorderLineStyleId)
        ? (value as ScoreboardBorderLineStyleId)
        : DEFAULT_SCOREBOARD_BORDER_LINE_STYLE;
  }
};

export const parseStoredScoreboardBorderTheme = (
  value: unknown,
): ScoreboardBorderThemeId => {
  if (typeof value !== "string") {
    return DEFAULT_SCOREBOARD_BORDER_THEME;
  }
  if (THEME_ID_SET.has(value as ScoreboardBorderThemeId)) {
    return value as ScoreboardBorderThemeId;
  }
  switch (value) {
    case "fire":
    case "inferno":
    case "burning-fire":
    case "simple-fire":
    case "real-fire":
      return "fire-red";
    case "waterfire":
    case "waterfireChase":
    case "dual-water-fire":
      return "dual-water-fire";
    case "prism":
    case "rainbow-energy":
    case "electric-arc":
      return "rainbow-prism";
    default:
      return DEFAULT_SCOREBOARD_BORDER_THEME;
  }
};

export const clampScoreboardBorderParticleCount = (value: number) => {
  if (!Number.isFinite(value)) return DEFAULT_SCOREBOARD_BORDER_PARTICLE_COUNT;
  return Math.max(
    MIN_SCOREBOARD_BORDER_PARTICLE_COUNT,
    Math.min(MAX_SCOREBOARD_BORDER_PARTICLE_COUNT, Math.round(value)),
  );
};

export const migrateLegacyScoreboardBorderEffect = (
  value: unknown,
): {
  enabled: boolean;
  animation: ScoreboardBorderAnimationId;
  lineStyle: ScoreboardBorderLineStyleId;
  theme: ScoreboardBorderThemeId;
} => {
  const legacy = value as LegacyScoreboardBorderEffectId | null;

  switch (legacy) {
    case "fire":
    case "inferno":
    case "burning-fire":
      return {
        enabled: true,
        animation: "single-beam",
        lineStyle: "gold-stars",
        theme: "fire-red",
      };
    case "prism":
    case "electric-arc":
      return {
        enabled: true,
        animation: "dual-beam",
        lineStyle: "silver-glint",
        theme: "rainbow-prism",
      };
    default:
      return {
        enabled: true,
        animation: "single-beam",
        lineStyle: "snow-white",
        theme: "dual-water-fire",
      };
  }
};

export const resolveScoreboardBorderMotionByTheme = (
  themeId: ScoreboardBorderThemeId,
): ScoreboardBorderAnimationId =>
  themeId === "fire-red" ? "single-beam" : "dual-beam";

export const getScoreboardBorderThemeClassName = (
  themeId: ScoreboardBorderThemeId,
) => {
  switch (themeId) {
    case "fire-red":
      return "game-room-score-row--combo-theme-fire-red";
    case "rainbow-prism":
      return "game-room-score-row--combo-theme-rainbow-prism";
    default:
      return "game-room-score-row--combo-theme-dual-water-fire";
  }
};
