export type LegacyScoreboardBorderEffectId =
  | "waterfire"
  | "waterfireChase"
  | "prism"
  | "fire"
  | "inferno"
  | "burning-fire"
  | "electric-arc";

export type ScoreboardBorderAnimationId =
  | "none"
  | "single-beam"
  | "dual-beam";
export type ScoreboardBorderLineStyleId =
  | "off"
  | "subtle"
  | "preview-rich";
export type ScoreboardBorderThemeId =
  | "simple-fire"
  | "real-fire"
  | "burning-fire"
  | "dual-water-fire"
  | "rainbow-energy"
  | "electric-arc";

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
  animation: "mq_scoreboard_border_animation",
  lineStyle: "mq_scoreboard_border_line_style",
  theme: "mq_scoreboard_border_theme",
  legacyEffect: "mq_scoreboard_border_effect",
} as const;

export const DEFAULT_SCOREBOARD_BORDER_ANIMATION: ScoreboardBorderAnimationId =
  "dual-beam";
export const DEFAULT_SCOREBOARD_BORDER_LINE_STYLE: ScoreboardBorderLineStyleId =
  "subtle";
export const DEFAULT_SCOREBOARD_BORDER_THEME: ScoreboardBorderThemeId =
  "dual-water-fire";

export const SCOREBOARD_BORDER_ANIMATION_PRESETS: ScoreboardBorderAnimationPreset[] =
  [
    {
      id: "none",
      title: "靜態",
      subtitle: "只保留主題邊框質感",
      description:
        "不加入巡航光束，讓主題底框維持安定、低調、長時間可視的存在感。",
    },
    {
      id: "single-beam",
      title: "單道光束",
      subtitle: "一條主光束穩定巡航",
      description:
        "一條頭亮尾暗的光束沿著排行榜列真實外框巡航，節奏固定，視覺乾淨。",
    },
    {
      id: "dual-beam",
      title: "雙道光束",
      subtitle: "兩條等速追逐但永不相撞",
      description:
        "兩條光束沿同一路徑等速巡航，彼此固定距離，形成穩定的競速感與壓迫感。",
    },
  ];

export const SCOREBOARD_BORDER_LINE_STYLE_PRESETS: ScoreboardBorderLineStylePreset[] =
  [
    {
      id: "off",
      title: "無粒子",
      subtitle: "只保留光束本體",
      description:
        "關閉頭部點綴粒子，適合最克制、最穩定的 live 顯示。",
    },
    {
      id: "subtle",
      title: "低調粒子",
      subtitle: "少量微光點綴",
      description:
        "只在 beam head 附近保留少量小光點，提供流動感但不搶走主視覺。",
    },
    {
      id: "preview-rich",
      title: "預覽豐富",
      subtitle: "Preview 稍多，live 仍收斂",
      description:
        "在設定預覽中稍微增加小光點數量，方便確認效果；attached 仍維持低負載。",
    },
  ];

export const SCOREBOARD_BORDER_THEME_PRESETS: ScoreboardBorderThemePreset[] = [
  {
    id: "simple-fire",
    title: "simple-fire",
    subtitle: "乾淨、俐落的火焰底框",
    description:
      "保留最單純的火焰熱度與暖色能量，適合搭配單道或雙道光束做乾淨競技感。",
    accentLabel: "Simple Fire",
    swatches: ["#fff0d2", "#ffd97a", "#ffb14a", "#ff8b33"],
  },
  {
    id: "real-fire",
    title: "real-fire",
    subtitle: "更接近真火層次的火焰框",
    description:
      "暖白核心、橘金熱暈與更厚一點的火焰層次，適合想保留火感但不過度誇張的版本。",
    accentLabel: "Real Fire",
    swatches: ["#fff5de", "#ffd36d", "#ff9738", "#ff5a2d"],
  },
  {
    id: "burning-fire",
    title: "burning-fire",
    subtitle: "熔融冠軍框",
    description:
      "深紅、暗金與少量暖白熱點構成的冠軍燃燒框，主題本身更厚實，也更有壓迫感。",
    accentLabel: "Champion Burn",
    swatches: ["#fff7e8", "#ffd76d", "#ff8f36", "#ff4e2a"],
  },
  {
    id: "dual-water-fire",
    title: "dual-water-fire",
    subtitle: "火焰與水光雙系對撞",
    description:
      "暖火與冷水光同時存在，適合搭配雙道光束做兩股能量相互追逐的競技感。",
    accentLabel: "Dual Element",
    swatches: ["#ff7660", "#ffd4c7", "#63d7ff", "#dff8ff"],
  },
  {
    id: "rainbow-energy",
    title: "rainbow-energy",
    subtitle: "多彩能量流",
    description:
      "以多色光譜與潔白核心表現高能量感，適合需要更強辨識度的主題。",
    accentLabel: "Spectrum",
    swatches: ["#ff4f98", "#ffd34f", "#5ef1ff", "#7966ff"],
  },
  {
    id: "electric-arc",
    title: "electric-arc",
    subtitle: "高壓電弧邊框",
    description:
      "以冷白、冰藍與紫電光構成的高壓弧光底框，適合搭配 beam mode 做冷冽追逐感。",
    accentLabel: "Electric Arc",
    swatches: ["#e8fdff", "#a5f3fc", "#60a5fa", "#7c3aed"],
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

export const parseStoredScoreboardBorderAnimation = (
  value: unknown,
): ScoreboardBorderAnimationId => {
  if (typeof value !== "string") {
    return DEFAULT_SCOREBOARD_BORDER_ANIMATION;
  }

  switch (value) {
    case "beamOrbit":
      return "single-beam";
    case "twinChase":
      return "dual-beam";
    default:
      return ANIMATION_ID_SET.has(value as ScoreboardBorderAnimationId)
        ? (value as ScoreboardBorderAnimationId)
        : DEFAULT_SCOREBOARD_BORDER_ANIMATION;
  }
};

export const parseStoredScoreboardBorderLineStyle = (
  value: unknown,
): ScoreboardBorderLineStyleId => {
  if (typeof value !== "string") {
    return DEFAULT_SCOREBOARD_BORDER_LINE_STYLE;
  }

  switch (value) {
    case "solid":
      return "subtle";
    case "dashedSingle":
    case "dashedMulti":
      return "preview-rich";
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
    case "inferno":
      return "real-fire";
    case "burning-fire":
      return "burning-fire";
    case "fire":
      return "simple-fire";
    case "waterfire":
    case "waterfireChase":
      return "dual-water-fire";
    case "prism":
      return "rainbow-energy";
    case "electric-arc":
      return "electric-arc";
    default:
      return DEFAULT_SCOREBOARD_BORDER_THEME;
  }
};

export const migrateLegacyScoreboardBorderEffect = (
  value: unknown,
): {
  animation: ScoreboardBorderAnimationId;
  lineStyle: ScoreboardBorderLineStyleId;
  theme: ScoreboardBorderThemeId;
} => {
  const legacy = value as LegacyScoreboardBorderEffectId | null;

  switch (legacy) {
    case "prism":
      return {
        animation: "single-beam",
        lineStyle: "subtle",
        theme: "rainbow-energy",
      };
    case "fire":
      return {
        animation: "single-beam",
        lineStyle: "subtle",
        theme: "simple-fire",
      };
    case "inferno":
      return {
        animation: "single-beam",
        lineStyle: "subtle",
        theme: "real-fire",
      };
    case "burning-fire":
      return {
        animation: "single-beam",
        lineStyle: "subtle",
        theme: "burning-fire",
      };
    case "electric-arc":
      return {
        animation: "single-beam",
        lineStyle: "subtle",
        theme: "electric-arc",
      };
    default:
      return {
        animation: "dual-beam",
        lineStyle: "subtle",
        theme: "dual-water-fire",
      };
  }
};

export const getScoreboardBorderThemeClassName = (
  themeId: ScoreboardBorderThemeId,
) => `game-room-score-row--combo-theme-${themeId}`;
