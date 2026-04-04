export type AvatarEffectLevel = "off" | "simple" | "full";

export const AVATAR_EFFECT_LEVELS: AvatarEffectLevel[] = [
  "off",
  "simple",
  "full",
];

export const DEFAULT_AVATAR_EFFECT_LEVEL: AvatarEffectLevel = "simple";

export interface PlayerAvatarPalette {
  from: string;
  to: string;
  accent: string;
  outline: string;
  text: string;
  shadow: string;
}

export interface PlayerAvatarDecoration {
  frame: string;
  glow: string;
  badge: string;
  comboAccent: string;
  comboGlow: string;
  toneOutline: string | null;
  toneFill: string | null;
}

const PLAYER_AVATAR_PALETTES: PlayerAvatarPalette[] = [
  {
    from: "#10233f",
    to: "#1f5eb6",
    accent: "#7dd3fc",
    outline: "rgba(96,165,250,0.42)",
    text: "#eff6ff",
    shadow: "rgba(37,99,235,0.34)",
  },
  {
    from: "#1a2234",
    to: "#7c3aed",
    accent: "#c4b5fd",
    outline: "rgba(167,139,250,0.42)",
    text: "#f5f3ff",
    shadow: "rgba(124,58,237,0.32)",
  },
  {
    from: "#15261f",
    to: "#0f766e",
    accent: "#99f6e4",
    outline: "rgba(45,212,191,0.38)",
    text: "#ecfeff",
    shadow: "rgba(13,148,136,0.32)",
  },
  {
    from: "#2a1d16",
    to: "#c2410c",
    accent: "#fdba74",
    outline: "rgba(251,146,60,0.42)",
    text: "#fff7ed",
    shadow: "rgba(194,65,12,0.34)",
  },
  {
    from: "#30221a",
    to: "#ca8a04",
    accent: "#fde68a",
    outline: "rgba(250,204,21,0.4)",
    text: "#fefce8",
    shadow: "rgba(202,138,4,0.34)",
  },
  {
    from: "#231630",
    to: "#db2777",
    accent: "#f9a8d4",
    outline: "rgba(244,114,182,0.4)",
    text: "#fdf2f8",
    shadow: "rgba(190,24,93,0.34)",
  },
  {
    from: "#152231",
    to: "#0891b2",
    accent: "#a5f3fc",
    outline: "rgba(34,211,238,0.38)",
    text: "#ecfeff",
    shadow: "rgba(8,145,178,0.32)",
  },
  {
    from: "#1d2430",
    to: "#475569",
    accent: "#cbd5e1",
    outline: "rgba(148,163,184,0.38)",
    text: "#f8fafc",
    shadow: "rgba(71,85,105,0.3)",
  },
];

const hashSeed = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
};

const isAsciiLike = (value: string) => /^[A-Za-z0-9]+$/.test(value);

export const buildAvatarMonogram = (
  rawName?: string | null,
  fallback = "P",
) => {
  const trimmed = rawName?.trim() ?? "";
  if (!trimmed) return fallback;

  const tokens = trimmed
    .split(/[\s_-]+/)
    .map((token) => token.trim())
    .filter(Boolean);

  if (tokens.length >= 2 && tokens.every(isAsciiLike)) {
    return `${tokens[0][0] ?? ""}${tokens[1][0] ?? ""}`.toUpperCase();
  }

  if (isAsciiLike(trimmed)) {
    return trimmed.slice(0, 2).toUpperCase();
  }

  return Array.from(trimmed).slice(0, 1).join("") || fallback;
};

export const resolvePlayerAvatarPalette = (
  clientId?: string | null,
  username?: string | null,
) => {
  const seed = `${clientId ?? ""}:${username ?? ""}`.trim();
  const paletteIndex = hashSeed(seed || "musicquiz-avatar") % PLAYER_AVATAR_PALETTES.length;
  return PLAYER_AVATAR_PALETTES[paletteIndex];
};

type ResolveDecorationParams = {
  rank?: number | null;
  combo?: number | null;
  effectLevel: AvatarEffectLevel;
  stateTone?: "neutral" | "correct" | "wrong" | "unanswered";
};

export const resolveAvatarDecoration = ({
  rank,
  combo,
  effectLevel,
  stateTone = "neutral",
}: ResolveDecorationParams): PlayerAvatarDecoration => {
  const comboValue = combo ?? 0;
  let frame = "rgba(148,163,184,0.26)";
  let glow = "rgba(15,23,42,0.24)";
  let badge = "rgba(226,232,240,0.9)";

  if (rank === 1) {
    frame = "rgba(250,204,21,0.88)";
    glow = "rgba(245,158,11,0.34)";
    badge = "#fff3bf";
  } else if (rank === 2) {
    frame = "rgba(226,232,240,0.76)";
    glow = "rgba(148,163,184,0.28)";
    badge = "#f8fafc";
  } else if (rank === 3) {
    frame = "rgba(251,146,60,0.72)";
    glow = "rgba(194,65,12,0.26)";
    badge = "#ffedd5";
  }

  let toneOutline: string | null = null;
  let toneFill: string | null = null;
  if (stateTone === "correct") {
    toneOutline = "rgba(52,211,153,0.62)";
    toneFill = "rgba(16,185,129,0.18)";
  } else if (stateTone === "wrong") {
    toneOutline = "rgba(251,113,133,0.58)";
    toneFill = "rgba(244,63,94,0.16)";
  } else if (stateTone === "unanswered") {
    toneOutline = "rgba(148,163,184,0.5)";
    toneFill = "rgba(71,85,105,0.2)";
  }

  const hasComboAccent = effectLevel === "full" && comboValue >= 3;

  return {
    frame,
    glow: effectLevel === "off" ? "transparent" : glow,
    badge,
    comboAccent: hasComboAccent ? "rgba(56,189,248,0.9)" : "transparent",
    comboGlow: hasComboAccent ? "rgba(14,165,233,0.26)" : "transparent",
    toneOutline,
    toneFill,
  };
};

export const parseAvatarEffectLevel = (value: unknown): AvatarEffectLevel => {
  if (value === "off" || value === "simple" || value === "full") {
    return value;
  }
  return DEFAULT_AVATAR_EFFECT_LEVEL;
};
