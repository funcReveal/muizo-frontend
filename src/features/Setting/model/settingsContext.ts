import { createContext, useContext } from "react";

import type { SfxPresetId } from "../../../shared/sfx/gameSfxEngine";
import type {
  ScoreboardBorderAnimationId,
  ScoreboardBorderLineStyleId,
  ScoreboardBorderThemeId,
} from "./scoreboardBorderEffects";
import {
  DEFAULT_SCOREBOARD_BORDER_ENABLED,
  DEFAULT_SCOREBOARD_BORDER_MASK_ENABLED,
  DEFAULT_SCOREBOARD_BORDER_ANIMATION,
  DEFAULT_SCOREBOARD_BORDER_PARTICLE_COUNT,
  DEFAULT_SCOREBOARD_BORDER_LINE_STYLE,
  DEFAULT_SCOREBOARD_BORDER_THEME,
} from "./scoreboardBorderEffects";
import {
  DEFAULT_AVATAR_EFFECT_LEVEL,
  type AvatarEffectLevel,
} from "../../../shared/ui/playerAvatar/playerAvatarTheme";

export type KeyBindings = Record<number, string>;

export const KEY_BINDINGS_STORAGE_KEY = "mq_keybindings";
export const GAME_VOLUME_STORAGE_KEY = "mq_volume";
export const DEFAULT_KEY_BINDINGS: KeyBindings = {
  0: "Q",
  1: "W",
  2: "A",
  3: "S",
};

export const SFX_STORAGE_KEYS = {
  enabled: "mq_sfx_enabled",
  volume: "mq_sfx_volume",
  preset: "mq_sfx_preset",
} as const;

export const SETTLEMENT_PREVIEW_STORAGE_KEYS = {
  syncWithGameVolume: "mq_settlement_preview_sync",
  volume: "mq_settlement_preview_volume",
} as const;

export const AVATAR_EFFECT_STORAGE_KEY = "mq_avatar_effect_level";

export const DEFAULT_SFX_ENABLED = true;
export const DEFAULT_SFX_VOLUME = 50;
export const DEFAULT_SFX_PRESET: SfxPresetId = "arcade";
export const DEFAULT_GAME_VOLUME = 50;
export const DEFAULT_SETTLEMENT_PREVIEW_SYNC = true;
export const DEFAULT_SETTLEMENT_PREVIEW_VOLUME = 50;
export const DEFAULT_SCOREBOARD_BORDER_ANIMATION_ID =
  DEFAULT_SCOREBOARD_BORDER_ANIMATION;
export const DEFAULT_SCOREBOARD_BORDER_LINE_STYLE_ID =
  DEFAULT_SCOREBOARD_BORDER_LINE_STYLE;
export const DEFAULT_SCOREBOARD_BORDER_THEME_ID = DEFAULT_SCOREBOARD_BORDER_THEME;
export const DEFAULT_SCOREBOARD_BORDER_ENABLED_VALUE =
  DEFAULT_SCOREBOARD_BORDER_ENABLED;
export const DEFAULT_SCOREBOARD_BORDER_MASK_ENABLED_VALUE =
  DEFAULT_SCOREBOARD_BORDER_MASK_ENABLED;
export const DEFAULT_SCOREBOARD_BORDER_PARTICLE_COUNT_VALUE =
  DEFAULT_SCOREBOARD_BORDER_PARTICLE_COUNT;
export const DEFAULT_AVATAR_EFFECT_LEVEL_VALUE = DEFAULT_AVATAR_EFFECT_LEVEL;

export type KeyBindingSetter = (
  next: KeyBindings | ((prev: KeyBindings) => KeyBindings),
) => void;

export type SettingsModelValue = {
  keyBindings: KeyBindings;
  setKeyBindings: KeyBindingSetter;
  gameVolume: number;
  setGameVolume: (next: number) => void;
  sfxEnabled: boolean;
  setSfxEnabled: (next: boolean) => void;
  sfxVolume: number;
  setSfxVolume: (next: number) => void;
  sfxPreset: SfxPresetId;
  setSfxPreset: (next: SfxPresetId) => void;
  settlementPreviewSyncGameVolume: boolean;
  setSettlementPreviewSyncGameVolume: (next: boolean) => void;
  settlementPreviewVolume: number;
  setSettlementPreviewVolume: (next: number) => void;
  scoreboardBorderEnabled: boolean;
  setScoreboardBorderEnabled: (next: boolean) => void;
  scoreboardBorderMaskEnabled: boolean;
  setScoreboardBorderMaskEnabled: (next: boolean) => void;
  scoreboardBorderAnimation: ScoreboardBorderAnimationId;
  setScoreboardBorderAnimation: (next: ScoreboardBorderAnimationId) => void;
  scoreboardBorderLineStyle: ScoreboardBorderLineStyleId;
  setScoreboardBorderLineStyle: (next: ScoreboardBorderLineStyleId) => void;
  scoreboardBorderTheme: ScoreboardBorderThemeId;
  setScoreboardBorderTheme: (next: ScoreboardBorderThemeId) => void;
  scoreboardBorderParticleCount: number;
  setScoreboardBorderParticleCount: (next: number) => void;
  avatarEffectLevel: AvatarEffectLevel;
  setAvatarEffectLevel: (next: AvatarEffectLevel) => void;
  resetSfxSettings: () => void;
};

export const SettingsModelContext = createContext<SettingsModelValue | null>(null);

export const useSettingsModel = () => {
  const context = useContext(SettingsModelContext);
  if (!context) {
    throw new Error("useSettingsModel must be used within SettingsProvider");
  }
  return context;
};
