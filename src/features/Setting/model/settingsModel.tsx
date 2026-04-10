import React, { useCallback, useEffect, useMemo, useState } from "react";

import {
  parseStoredSfxPreset,
  type SfxPresetId,
} from "../../../shared/sfx/gameSfxEngine";
import {
  DEFAULT_SCOREBOARD_BORDER_ENABLED_VALUE,
  DEFAULT_SCOREBOARD_BORDER_MASK_ENABLED_VALUE,
  DEFAULT_SCOREBOARD_BORDER_ANIMATION_ID,
  DEFAULT_SCOREBOARD_BORDER_PARTICLE_COUNT_VALUE,
  DEFAULT_SCOREBOARD_BORDER_LINE_STYLE_ID,
  DEFAULT_SCOREBOARD_BORDER_THEME_ID,
  DEFAULT_GAME_VOLUME,
  DEFAULT_BGM_VOLUME,
  DEFAULT_SETTLEMENT_PREVIEW_SYNC,
  DEFAULT_SETTLEMENT_PREVIEW_VOLUME,
  DEFAULT_KEY_BINDINGS,
  DEFAULT_SFX_ENABLED,
  DEFAULT_SFX_PRESET,
  DEFAULT_SFX_VOLUME,
  AVATAR_EFFECT_STORAGE_KEY,
  DEFAULT_AVATAR_EFFECT_LEVEL_VALUE,
  BGM_VOLUME_STORAGE_KEY,
  GAME_VOLUME_STORAGE_KEY,
  KEY_BINDINGS_STORAGE_KEY,
  LEGACY_AVATAR_EFFECT_STORAGE_KEY,
  LEGACY_BGM_VOLUME_STORAGE_KEY,
  LEGACY_GAME_VOLUME_STORAGE_KEY,
  LEGACY_KEY_BINDINGS_STORAGE_KEY,
  LEGACY_SETTLEMENT_PREVIEW_STORAGE_KEYS,
  LEGACY_SFX_STORAGE_KEYS,
  SETTLEMENT_PREVIEW_STORAGE_KEYS,
  SFX_STORAGE_KEYS,
  SettingsModelContext,
  type KeyBindingSetter,
  type KeyBindings,
  type SettingsModelValue,
} from "./settingsContext";
import {
  parseAvatarEffectLevel,
  type AvatarEffectLevel,
} from "../../../shared/ui/playerAvatar/playerAvatarTheme";
import {
  clampScoreboardBorderParticleCount,
  parseStoredScoreboardBorderEnabled,
  parseStoredScoreboardBorderMaskEnabled,
  migrateLegacyScoreboardBorderEffect,
  parseStoredScoreboardBorderAnimation,
  parseStoredScoreboardBorderLineStyle,
  parseStoredScoreboardBorderTheme,
  LEGACY_SCOREBOARD_BORDER_STORAGE_KEYS,
  SCOREBOARD_BORDER_STORAGE_KEYS,
  type ScoreboardBorderAnimationId,
  type ScoreboardBorderLineStyleId,
  type ScoreboardBorderThemeId,
} from "./scoreboardBorderEffects";

const clampVolume = (value: number) => {
  if (!Number.isFinite(value)) return DEFAULT_SFX_VOLUME;
  return Math.max(0, Math.min(100, Math.round(value)));
};

const readStorageValue = (key: string, legacyKey?: string) => {
  if (typeof window === "undefined") return null;
  const currentValue = window.localStorage.getItem(key);
  if (currentValue !== null || !legacyKey) return currentValue;
  return window.localStorage.getItem(legacyKey);
};

const isStorageKey = (
  eventKey: string | null,
  key: string,
  legacyKey?: string,
) => eventKey === key || (Boolean(legacyKey) && eventKey === legacyKey);

const normalizeKey = (value: unknown) =>
  typeof value === "string"
    ? value.trim().toUpperCase().replace(/\s+/g, "").slice(0, 1)
    : "";

const sanitizeBindings = (
  candidate: Partial<KeyBindings> | null | undefined,
): KeyBindings => {
  const used = new Set<string>();
  const next: KeyBindings = { ...DEFAULT_KEY_BINDINGS };

  for (const slot of [0, 1, 2, 3] as const) {
    const raw = normalizeKey(candidate?.[slot]);
    if (raw && !used.has(raw)) {
      next[slot] = raw;
      used.add(raw);
      continue;
    }
    const fallback = normalizeKey(DEFAULT_KEY_BINDINGS[slot]);
    if (!used.has(fallback)) {
      next[slot] = fallback;
      used.add(fallback);
      continue;
    }
    next[slot] = "";
  }

  return next;
};

const readStoredBindings = (): KeyBindings => {
  if (typeof window === "undefined") return DEFAULT_KEY_BINDINGS;
  try {
    const saved = readStorageValue(
      KEY_BINDINGS_STORAGE_KEY,
      LEGACY_KEY_BINDINGS_STORAGE_KEY,
    );
    if (saved) {
      return sanitizeBindings(JSON.parse(saved) as KeyBindings);
    }
  } catch {
    // ignore parse errors
  }
  return { ...DEFAULT_KEY_BINDINGS };
};

const readStoredBool = (key: string, fallback: boolean, legacyKey?: string) => {
  if (typeof window === "undefined") return fallback;
  const raw = readStorageValue(key, legacyKey);
  if (raw === "0" || raw === "false") return false;
  if (raw === "1" || raw === "true") return true;
  return fallback;
};

const readStoredNumber = (
  key: string,
  fallback: number,
  legacyKey?: string,
) => {
  if (typeof window === "undefined") return fallback;
  const raw = readStorageValue(key, legacyKey);
  if (raw == null) return fallback;
  return clampVolume(Number(raw));
};

export const SettingsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [keyBindings, setKeyBindingsState] =
    useState<KeyBindings>(readStoredBindings);
  const [gameVolume, setGameVolumeState] = useState<number>(() =>
    readStoredNumber(
      GAME_VOLUME_STORAGE_KEY,
      DEFAULT_GAME_VOLUME,
      LEGACY_GAME_VOLUME_STORAGE_KEY,
    ),
  );
  const [bgmVolume, setBgmVolumeState] = useState<number>(() =>
    readStoredNumber(
      BGM_VOLUME_STORAGE_KEY,
      DEFAULT_BGM_VOLUME,
      LEGACY_BGM_VOLUME_STORAGE_KEY,
    ),
  );
  const [sfxEnabled, setSfxEnabledState] = useState<boolean>(() =>
    readStoredBool(
      SFX_STORAGE_KEYS.enabled,
      DEFAULT_SFX_ENABLED,
      LEGACY_SFX_STORAGE_KEYS.enabled,
    ),
  );
  const [sfxVolume, setSfxVolumeState] = useState<number>(() =>
    readStoredNumber(
      SFX_STORAGE_KEYS.volume,
      DEFAULT_SFX_VOLUME,
      LEGACY_SFX_STORAGE_KEYS.volume,
    ),
  );
  const [sfxPreset, setSfxPresetState] = useState<SfxPresetId>(() => {
    if (typeof window === "undefined") return DEFAULT_SFX_PRESET;
    return parseStoredSfxPreset(
      readStorageValue(SFX_STORAGE_KEYS.preset, LEGACY_SFX_STORAGE_KEYS.preset),
    );
  });
  const [
    settlementPreviewSyncGameVolume,
    setSettlementPreviewSyncGameVolumeState,
  ] = useState<boolean>(() =>
    readStoredBool(
      SETTLEMENT_PREVIEW_STORAGE_KEYS.syncWithGameVolume,
      DEFAULT_SETTLEMENT_PREVIEW_SYNC,
      LEGACY_SETTLEMENT_PREVIEW_STORAGE_KEYS.syncWithGameVolume,
    ),
  );
  const [settlementPreviewVolume, setSettlementPreviewVolumeState] =
    useState<number>(() =>
      readStoredNumber(
        SETTLEMENT_PREVIEW_STORAGE_KEYS.volume,
        DEFAULT_SETTLEMENT_PREVIEW_VOLUME,
        LEGACY_SETTLEMENT_PREVIEW_STORAGE_KEYS.volume,
      ),
    );
  const [scoreboardBorderAnimation, setScoreboardBorderAnimationState] =
    useState<ScoreboardBorderAnimationId>(() => {
      if (typeof window === "undefined") {
        return DEFAULT_SCOREBOARD_BORDER_ANIMATION_ID;
      }
      const legacyMigration = migrateLegacyScoreboardBorderEffect(
        readStorageValue(
          SCOREBOARD_BORDER_STORAGE_KEYS.legacyEffect,
          LEGACY_SCOREBOARD_BORDER_STORAGE_KEYS.legacyEffect,
        ),
      );
      const storedAnimation = readStorageValue(
        SCOREBOARD_BORDER_STORAGE_KEYS.animation,
        LEGACY_SCOREBOARD_BORDER_STORAGE_KEYS.animation,
      );
      if (storedAnimation) {
        return parseStoredScoreboardBorderAnimation(storedAnimation);
      }
      return legacyMigration.animation;
    });
  const [scoreboardBorderLineStyle, setScoreboardBorderLineStyleState] =
    useState<ScoreboardBorderLineStyleId>(() => {
      if (typeof window === "undefined") {
        return DEFAULT_SCOREBOARD_BORDER_LINE_STYLE_ID;
      }
      const legacyMigration = migrateLegacyScoreboardBorderEffect(
        readStorageValue(
          SCOREBOARD_BORDER_STORAGE_KEYS.legacyEffect,
          LEGACY_SCOREBOARD_BORDER_STORAGE_KEYS.legacyEffect,
        ),
      );
      const storedLineStyle = readStorageValue(
        SCOREBOARD_BORDER_STORAGE_KEYS.lineStyle,
        LEGACY_SCOREBOARD_BORDER_STORAGE_KEYS.lineStyle,
      );
      if (storedLineStyle) {
        return parseStoredScoreboardBorderLineStyle(storedLineStyle);
      }
      return legacyMigration.lineStyle;
    });
  const [scoreboardBorderTheme, setScoreboardBorderThemeState] =
    useState<ScoreboardBorderThemeId>(() => {
      if (typeof window === "undefined") {
        return DEFAULT_SCOREBOARD_BORDER_THEME_ID;
      }
      const legacyMigration = migrateLegacyScoreboardBorderEffect(
        readStorageValue(
          SCOREBOARD_BORDER_STORAGE_KEYS.legacyEffect,
          LEGACY_SCOREBOARD_BORDER_STORAGE_KEYS.legacyEffect,
        ),
      );
      const storedTheme = readStorageValue(
        SCOREBOARD_BORDER_STORAGE_KEYS.theme,
        LEGACY_SCOREBOARD_BORDER_STORAGE_KEYS.theme,
      );
      if (storedTheme) {
        return parseStoredScoreboardBorderTheme(storedTheme);
      }
      return legacyMigration.theme;
    });
  const [scoreboardBorderEnabled, setScoreboardBorderEnabledState] =
    useState<boolean>(() => {
      if (typeof window === "undefined") {
        return DEFAULT_SCOREBOARD_BORDER_ENABLED_VALUE;
      }
      const storedEnabled = readStorageValue(
        SCOREBOARD_BORDER_STORAGE_KEYS.enabled,
        LEGACY_SCOREBOARD_BORDER_STORAGE_KEYS.enabled,
      );
      if (storedEnabled !== null) {
        return parseStoredScoreboardBorderEnabled(storedEnabled);
      }
      return migrateLegacyScoreboardBorderEffect(
        readStorageValue(
          SCOREBOARD_BORDER_STORAGE_KEYS.legacyEffect,
          LEGACY_SCOREBOARD_BORDER_STORAGE_KEYS.legacyEffect,
        ),
      ).enabled;
    });
  const [scoreboardBorderMaskEnabled, setScoreboardBorderMaskEnabledState] =
    useState<boolean>(() => {
      if (typeof window === "undefined") {
        return DEFAULT_SCOREBOARD_BORDER_MASK_ENABLED_VALUE;
      }
      const storedMaskEnabled = readStorageValue(
        SCOREBOARD_BORDER_STORAGE_KEYS.maskEnabled,
        LEGACY_SCOREBOARD_BORDER_STORAGE_KEYS.maskEnabled,
      );
      if (storedMaskEnabled !== null) {
        return parseStoredScoreboardBorderMaskEnabled(storedMaskEnabled);
      }
      return DEFAULT_SCOREBOARD_BORDER_MASK_ENABLED_VALUE;
    });
  const [scoreboardBorderParticleCount, setScoreboardBorderParticleCountState] =
    useState<number>(() => {
      if (typeof window === "undefined") {
        return DEFAULT_SCOREBOARD_BORDER_PARTICLE_COUNT_VALUE;
      }
      return clampScoreboardBorderParticleCount(
        Number(
          readStorageValue(
            SCOREBOARD_BORDER_STORAGE_KEYS.particleCount,
            LEGACY_SCOREBOARD_BORDER_STORAGE_KEYS.particleCount,
          ),
        ),
      );
    });
  const [avatarEffectLevel, setAvatarEffectLevelState] =
    useState<AvatarEffectLevel>(() => {
      if (typeof window === "undefined") {
        return DEFAULT_AVATAR_EFFECT_LEVEL_VALUE;
      }
      return parseAvatarEffectLevel(
        readStorageValue(
          AVATAR_EFFECT_STORAGE_KEY,
          LEGACY_AVATAR_EFFECT_STORAGE_KEY,
        ),
      );
    });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        KEY_BINDINGS_STORAGE_KEY,
        JSON.stringify(keyBindings),
      );
    } catch {
      // ignore storage errors
    }
  }, [keyBindings]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(GAME_VOLUME_STORAGE_KEY, String(gameVolume));
  }, [gameVolume]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(BGM_VOLUME_STORAGE_KEY, String(bgmVolume));
  }, [bgmVolume]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      SFX_STORAGE_KEYS.enabled,
      sfxEnabled ? "1" : "0",
    );
  }, [sfxEnabled]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(SFX_STORAGE_KEYS.volume, String(sfxVolume));
  }, [sfxVolume]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(SFX_STORAGE_KEYS.preset, sfxPreset);
  }, [sfxPreset]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      SETTLEMENT_PREVIEW_STORAGE_KEYS.syncWithGameVolume,
      settlementPreviewSyncGameVolume ? "1" : "0",
    );
  }, [settlementPreviewSyncGameVolume]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      SETTLEMENT_PREVIEW_STORAGE_KEYS.volume,
      String(settlementPreviewVolume),
    );
  }, [settlementPreviewVolume]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      SCOREBOARD_BORDER_STORAGE_KEYS.enabled,
      scoreboardBorderEnabled ? "1" : "0",
    );
  }, [scoreboardBorderEnabled]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      SCOREBOARD_BORDER_STORAGE_KEYS.maskEnabled,
      scoreboardBorderMaskEnabled ? "1" : "0",
    );
  }, [scoreboardBorderMaskEnabled]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      SCOREBOARD_BORDER_STORAGE_KEYS.animation,
      scoreboardBorderAnimation,
    );
  }, [scoreboardBorderAnimation]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      SCOREBOARD_BORDER_STORAGE_KEYS.lineStyle,
      scoreboardBorderLineStyle,
    );
  }, [scoreboardBorderLineStyle]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      SCOREBOARD_BORDER_STORAGE_KEYS.theme,
      scoreboardBorderTheme,
    );
  }, [scoreboardBorderTheme]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      SCOREBOARD_BORDER_STORAGE_KEYS.particleCount,
      String(scoreboardBorderParticleCount),
    );
  }, [scoreboardBorderParticleCount]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(AVATAR_EFFECT_STORAGE_KEY, avatarEffectLevel);
  }, [avatarEffectLevel]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onStorage = (event: StorageEvent) => {
      if (event.storageArea !== window.localStorage) return;
      if (
        isStorageKey(
          event.key,
          KEY_BINDINGS_STORAGE_KEY,
          LEGACY_KEY_BINDINGS_STORAGE_KEY,
        ) &&
        event.newValue
      ) {
        try {
          setKeyBindingsState(
            sanitizeBindings(JSON.parse(event.newValue) as KeyBindings),
          );
        } catch {
          // ignore parse errors
        }
        return;
      }
      if (
        isStorageKey(
          event.key,
          SFX_STORAGE_KEYS.enabled,
          LEGACY_SFX_STORAGE_KEYS.enabled,
        )
      ) {
        setSfxEnabledState(
          readStoredBool(
            SFX_STORAGE_KEYS.enabled,
            DEFAULT_SFX_ENABLED,
            LEGACY_SFX_STORAGE_KEYS.enabled,
          ),
        );
        return;
      }
      if (
        isStorageKey(
          event.key,
          GAME_VOLUME_STORAGE_KEY,
          LEGACY_GAME_VOLUME_STORAGE_KEY,
        )
      ) {
        setGameVolumeState(
          readStoredNumber(
            GAME_VOLUME_STORAGE_KEY,
            DEFAULT_GAME_VOLUME,
            LEGACY_GAME_VOLUME_STORAGE_KEY,
          ),
        );
        return;
      }
      if (
        isStorageKey(
          event.key,
          BGM_VOLUME_STORAGE_KEY,
          LEGACY_BGM_VOLUME_STORAGE_KEY,
        )
      ) {
        setBgmVolumeState(
          readStoredNumber(
            BGM_VOLUME_STORAGE_KEY,
            DEFAULT_BGM_VOLUME,
            LEGACY_BGM_VOLUME_STORAGE_KEY,
          ),
        );
        return;
      }
      if (
        isStorageKey(
          event.key,
          SFX_STORAGE_KEYS.volume,
          LEGACY_SFX_STORAGE_KEYS.volume,
        )
      ) {
        setSfxVolumeState(
          readStoredNumber(
            SFX_STORAGE_KEYS.volume,
            DEFAULT_SFX_VOLUME,
            LEGACY_SFX_STORAGE_KEYS.volume,
          ),
        );
        return;
      }
      if (
        isStorageKey(
          event.key,
          SFX_STORAGE_KEYS.preset,
          LEGACY_SFX_STORAGE_KEYS.preset,
        )
      ) {
        setSfxPresetState(
          parseStoredSfxPreset(
            readStorageValue(
              SFX_STORAGE_KEYS.preset,
              LEGACY_SFX_STORAGE_KEYS.preset,
            ),
          ),
        );
        return;
      }
      if (
        isStorageKey(
          event.key,
          SETTLEMENT_PREVIEW_STORAGE_KEYS.syncWithGameVolume,
          LEGACY_SETTLEMENT_PREVIEW_STORAGE_KEYS.syncWithGameVolume,
        )
      ) {
        setSettlementPreviewSyncGameVolumeState(
          readStoredBool(
            SETTLEMENT_PREVIEW_STORAGE_KEYS.syncWithGameVolume,
            DEFAULT_SETTLEMENT_PREVIEW_SYNC,
            LEGACY_SETTLEMENT_PREVIEW_STORAGE_KEYS.syncWithGameVolume,
          ),
        );
        return;
      }
      if (
        isStorageKey(
          event.key,
          SETTLEMENT_PREVIEW_STORAGE_KEYS.volume,
          LEGACY_SETTLEMENT_PREVIEW_STORAGE_KEYS.volume,
        )
      ) {
        setSettlementPreviewVolumeState(
          readStoredNumber(
            SETTLEMENT_PREVIEW_STORAGE_KEYS.volume,
            DEFAULT_SETTLEMENT_PREVIEW_VOLUME,
            LEGACY_SETTLEMENT_PREVIEW_STORAGE_KEYS.volume,
          ),
        );
        return;
      }
      if (
        isStorageKey(
          event.key,
          SCOREBOARD_BORDER_STORAGE_KEYS.animation,
          LEGACY_SCOREBOARD_BORDER_STORAGE_KEYS.animation,
        )
      ) {
        setScoreboardBorderAnimationState(
          parseStoredScoreboardBorderAnimation(
            readStorageValue(
              SCOREBOARD_BORDER_STORAGE_KEYS.animation,
              LEGACY_SCOREBOARD_BORDER_STORAGE_KEYS.animation,
            ),
          ),
        );
        return;
      }
      if (
        isStorageKey(
          event.key,
          SCOREBOARD_BORDER_STORAGE_KEYS.enabled,
          LEGACY_SCOREBOARD_BORDER_STORAGE_KEYS.enabled,
        )
      ) {
        setScoreboardBorderEnabledState(
          parseStoredScoreboardBorderEnabled(
            readStorageValue(
              SCOREBOARD_BORDER_STORAGE_KEYS.enabled,
              LEGACY_SCOREBOARD_BORDER_STORAGE_KEYS.enabled,
            ),
          ),
        );
        return;
      }
      if (
        isStorageKey(
          event.key,
          SCOREBOARD_BORDER_STORAGE_KEYS.maskEnabled,
          LEGACY_SCOREBOARD_BORDER_STORAGE_KEYS.maskEnabled,
        )
      ) {
        setScoreboardBorderMaskEnabledState(
          parseStoredScoreboardBorderMaskEnabled(
            readStorageValue(
              SCOREBOARD_BORDER_STORAGE_KEYS.maskEnabled,
              LEGACY_SCOREBOARD_BORDER_STORAGE_KEYS.maskEnabled,
            ),
          ),
        );
        return;
      }
      if (
        isStorageKey(
          event.key,
          SCOREBOARD_BORDER_STORAGE_KEYS.lineStyle,
          LEGACY_SCOREBOARD_BORDER_STORAGE_KEYS.lineStyle,
        )
      ) {
        setScoreboardBorderLineStyleState(
          parseStoredScoreboardBorderLineStyle(
            readStorageValue(
              SCOREBOARD_BORDER_STORAGE_KEYS.lineStyle,
              LEGACY_SCOREBOARD_BORDER_STORAGE_KEYS.lineStyle,
            ),
          ),
        );
        return;
      }
      if (
        isStorageKey(
          event.key,
          SCOREBOARD_BORDER_STORAGE_KEYS.theme,
          LEGACY_SCOREBOARD_BORDER_STORAGE_KEYS.theme,
        )
      ) {
        setScoreboardBorderThemeState(
          parseStoredScoreboardBorderTheme(
            readStorageValue(
              SCOREBOARD_BORDER_STORAGE_KEYS.theme,
              LEGACY_SCOREBOARD_BORDER_STORAGE_KEYS.theme,
            ),
          ),
        );
        return;
      }
      if (
        isStorageKey(
          event.key,
          SCOREBOARD_BORDER_STORAGE_KEYS.particleCount,
          LEGACY_SCOREBOARD_BORDER_STORAGE_KEYS.particleCount,
        )
      ) {
        setScoreboardBorderParticleCountState(
          clampScoreboardBorderParticleCount(
            Number(
              readStorageValue(
                SCOREBOARD_BORDER_STORAGE_KEYS.particleCount,
                LEGACY_SCOREBOARD_BORDER_STORAGE_KEYS.particleCount,
              ),
            ),
          ),
        );
        return;
      }
      if (
        isStorageKey(
          event.key,
          AVATAR_EFFECT_STORAGE_KEY,
          LEGACY_AVATAR_EFFECT_STORAGE_KEY,
        )
      ) {
        setAvatarEffectLevelState(
          parseAvatarEffectLevel(
            readStorageValue(
              AVATAR_EFFECT_STORAGE_KEY,
              LEGACY_AVATAR_EFFECT_STORAGE_KEY,
            ),
          ),
        );
      }
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setKeyBindings: KeyBindingSetter = useCallback((next) => {
    setKeyBindingsState((prev) => {
      const resolved = typeof next === "function" ? next(prev) : next;
      return sanitizeBindings(resolved);
    });
  }, []);

  const setSfxEnabled = useCallback((next: boolean) => {
    setSfxEnabledState(Boolean(next));
  }, []);

  const setGameVolume = useCallback((next: number) => {
    setGameVolumeState(clampVolume(next));
  }, []);

  const setBgmVolume = useCallback((next: number) => {
    setBgmVolumeState(clampVolume(next));
  }, []);

  const setSfxVolume = useCallback((next: number) => {
    setSfxVolumeState(clampVolume(next));
  }, []);

  const setSfxPreset = useCallback((next: SfxPresetId) => {
    setSfxPresetState(next);
  }, []);

  const setSettlementPreviewSyncGameVolume = useCallback((next: boolean) => {
    setSettlementPreviewSyncGameVolumeState(Boolean(next));
  }, []);

  const setSettlementPreviewVolume = useCallback((next: number) => {
    setSettlementPreviewVolumeState(clampVolume(next));
  }, []);

  const setScoreboardBorderEnabled = useCallback((next: boolean) => {
    setScoreboardBorderEnabledState(Boolean(next));
  }, []);

  const setScoreboardBorderMaskEnabled = useCallback((next: boolean) => {
    setScoreboardBorderMaskEnabledState(Boolean(next));
  }, []);

  const setScoreboardBorderAnimation = useCallback(
    (next: ScoreboardBorderAnimationId) => {
      setScoreboardBorderAnimationState(
        parseStoredScoreboardBorderAnimation(next),
      );
    },
    [],
  );

  const setScoreboardBorderLineStyle = useCallback(
    (next: ScoreboardBorderLineStyleId) => {
      setScoreboardBorderLineStyleState(
        parseStoredScoreboardBorderLineStyle(next),
      );
    },
    [],
  );

  const setScoreboardBorderTheme = useCallback(
    (next: ScoreboardBorderThemeId) => {
      setScoreboardBorderThemeState(parseStoredScoreboardBorderTheme(next));
    },
    [],
  );

  const setScoreboardBorderParticleCount = useCallback((next: number) => {
    setScoreboardBorderParticleCountState(
      clampScoreboardBorderParticleCount(next),
    );
  }, []);

  const setAvatarEffectLevel = useCallback((next: AvatarEffectLevel) => {
    setAvatarEffectLevelState(parseAvatarEffectLevel(next));
  }, []);

  const resetSfxSettings = useCallback(() => {
    setGameVolumeState(DEFAULT_GAME_VOLUME);
    setBgmVolumeState(DEFAULT_BGM_VOLUME);
    setSfxEnabledState(DEFAULT_SFX_ENABLED);
    setSfxVolumeState(DEFAULT_SFX_VOLUME);
    setSfxPresetState(DEFAULT_SFX_PRESET);
  }, []);

  const value = useMemo<SettingsModelValue>(
    () => ({
      keyBindings,
      setKeyBindings,
      gameVolume,
      setGameVolume,
      bgmVolume,
      setBgmVolume,
      sfxEnabled,
      setSfxEnabled,
      sfxVolume,
      setSfxVolume,
      sfxPreset,
      setSfxPreset,
      settlementPreviewSyncGameVolume,
      setSettlementPreviewSyncGameVolume,
      settlementPreviewVolume,
      setSettlementPreviewVolume,
      scoreboardBorderEnabled,
      setScoreboardBorderEnabled,
      scoreboardBorderMaskEnabled,
      setScoreboardBorderMaskEnabled,
      scoreboardBorderAnimation,
      setScoreboardBorderAnimation,
      scoreboardBorderLineStyle,
      setScoreboardBorderLineStyle,
      scoreboardBorderTheme,
      setScoreboardBorderTheme,
      scoreboardBorderParticleCount,
      setScoreboardBorderParticleCount,
      avatarEffectLevel,
      setAvatarEffectLevel,
      resetSfxSettings,
    }),
    [
      keyBindings,
      setKeyBindings,
      gameVolume,
      setGameVolume,
      bgmVolume,
      setBgmVolume,
      sfxEnabled,
      setSfxEnabled,
      sfxVolume,
      setSfxVolume,
      sfxPreset,
      setSfxPreset,
      settlementPreviewSyncGameVolume,
      setSettlementPreviewSyncGameVolume,
      settlementPreviewVolume,
      setSettlementPreviewVolume,
      scoreboardBorderEnabled,
      setScoreboardBorderEnabled,
      scoreboardBorderMaskEnabled,
      setScoreboardBorderMaskEnabled,
      scoreboardBorderAnimation,
      setScoreboardBorderAnimation,
      scoreboardBorderLineStyle,
      setScoreboardBorderLineStyle,
      scoreboardBorderTheme,
      setScoreboardBorderTheme,
      scoreboardBorderParticleCount,
      setScoreboardBorderParticleCount,
      avatarEffectLevel,
      setAvatarEffectLevel,
      resetSfxSettings,
    ],
  );

  return (
    <SettingsModelContext.Provider value={value}>
      {children}
    </SettingsModelContext.Provider>
  );
};
