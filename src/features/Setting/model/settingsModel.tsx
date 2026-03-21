import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  parseStoredSfxPreset,
  type SfxPresetId,
} from "../../Room/model/sfx/gameSfxEngine";
import {
  DEFAULT_SCOREBOARD_BORDER_ANIMATION_ID,
  DEFAULT_SCOREBOARD_BORDER_LINE_STYLE_ID,
  DEFAULT_SCOREBOARD_BORDER_THEME_ID,
  DEFAULT_GAME_VOLUME,
  DEFAULT_SETTLEMENT_PREVIEW_SYNC,
  DEFAULT_SETTLEMENT_PREVIEW_VOLUME,
  DEFAULT_KEY_BINDINGS,
  DEFAULT_SFX_ENABLED,
  DEFAULT_SFX_PRESET,
  DEFAULT_SFX_VOLUME,
  GAME_VOLUME_STORAGE_KEY,
  KEY_BINDINGS_STORAGE_KEY,
  SETTLEMENT_PREVIEW_STORAGE_KEYS,
  SFX_STORAGE_KEYS,
  SettingsModelContext,
  type KeyBindingSetter,
  type KeyBindings,
  type SettingsModelValue,
} from "./settingsContext";
import {
  migrateLegacyScoreboardBorderEffect,
  parseStoredScoreboardBorderAnimation,
  parseStoredScoreboardBorderLineStyle,
  parseStoredScoreboardBorderTheme,
  SCOREBOARD_BORDER_STORAGE_KEYS,
  type ScoreboardBorderAnimationId,
  type ScoreboardBorderLineStyleId,
  type ScoreboardBorderThemeId,
} from "./scoreboardBorderEffects";

const clampVolume = (value: number) => {
  if (!Number.isFinite(value)) return DEFAULT_SFX_VOLUME;
  return Math.max(0, Math.min(100, Math.round(value)));
};

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
    const saved = window.localStorage.getItem(KEY_BINDINGS_STORAGE_KEY);
    if (saved) {
      return sanitizeBindings(JSON.parse(saved) as KeyBindings);
    }
  } catch {
    // ignore parse errors
  }
  return { ...DEFAULT_KEY_BINDINGS };
};

const readStoredBool = (key: string, fallback: boolean) => {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(key);
  if (raw === "0" || raw === "false") return false;
  if (raw === "1" || raw === "true") return true;
  return fallback;
};

const readStoredNumber = (key: string, fallback: number) => {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(key);
  if (raw == null) return fallback;
  return clampVolume(Number(raw));
};

export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const [keyBindings, setKeyBindingsState] = useState<KeyBindings>(
    readStoredBindings,
  );
  const [gameVolume, setGameVolumeState] = useState<number>(() =>
    readStoredNumber(GAME_VOLUME_STORAGE_KEY, DEFAULT_GAME_VOLUME),
  );
  const [sfxEnabled, setSfxEnabledState] = useState<boolean>(() =>
    readStoredBool(SFX_STORAGE_KEYS.enabled, DEFAULT_SFX_ENABLED),
  );
  const [sfxVolume, setSfxVolumeState] = useState<number>(() =>
    readStoredNumber(SFX_STORAGE_KEYS.volume, DEFAULT_SFX_VOLUME),
  );
  const [sfxPreset, setSfxPresetState] = useState<SfxPresetId>(() => {
    if (typeof window === "undefined") return DEFAULT_SFX_PRESET;
    return parseStoredSfxPreset(
      window.localStorage.getItem(SFX_STORAGE_KEYS.preset),
    );
  });
  const [settlementPreviewSyncGameVolume, setSettlementPreviewSyncGameVolumeState] =
    useState<boolean>(() =>
      readStoredBool(
        SETTLEMENT_PREVIEW_STORAGE_KEYS.syncWithGameVolume,
        DEFAULT_SETTLEMENT_PREVIEW_SYNC,
      ),
    );
  const [settlementPreviewVolume, setSettlementPreviewVolumeState] =
    useState<number>(() =>
      readStoredNumber(
        SETTLEMENT_PREVIEW_STORAGE_KEYS.volume,
        DEFAULT_SETTLEMENT_PREVIEW_VOLUME,
      ),
    );
  const [scoreboardBorderAnimation, setScoreboardBorderAnimationState] =
    useState<ScoreboardBorderAnimationId>(() => {
      if (typeof window === "undefined") {
        return DEFAULT_SCOREBOARD_BORDER_ANIMATION_ID;
      }
      const storedAnimation = window.localStorage.getItem(
        SCOREBOARD_BORDER_STORAGE_KEYS.animation,
      );
      if (storedAnimation) {
        return parseStoredScoreboardBorderAnimation(storedAnimation);
      }
      return migrateLegacyScoreboardBorderEffect(
        window.localStorage.getItem(SCOREBOARD_BORDER_STORAGE_KEYS.legacyEffect),
      ).animation;
    });
  const [scoreboardBorderLineStyle, setScoreboardBorderLineStyleState] =
    useState<ScoreboardBorderLineStyleId>(() => {
      if (typeof window === "undefined") {
        return DEFAULT_SCOREBOARD_BORDER_LINE_STYLE_ID;
      }
      const storedLineStyle = window.localStorage.getItem(
        SCOREBOARD_BORDER_STORAGE_KEYS.lineStyle,
      );
      if (storedLineStyle) {
        return parseStoredScoreboardBorderLineStyle(storedLineStyle);
      }
      return migrateLegacyScoreboardBorderEffect(
        window.localStorage.getItem(SCOREBOARD_BORDER_STORAGE_KEYS.legacyEffect),
      ).lineStyle;
    });
  const [scoreboardBorderTheme, setScoreboardBorderThemeState] =
    useState<ScoreboardBorderThemeId>(() => {
      if (typeof window === "undefined") {
        return DEFAULT_SCOREBOARD_BORDER_THEME_ID;
      }
      const storedTheme = window.localStorage.getItem(
        SCOREBOARD_BORDER_STORAGE_KEYS.theme,
      );
      if (storedTheme) {
        return parseStoredScoreboardBorderTheme(storedTheme);
      }
      return migrateLegacyScoreboardBorderEffect(
        window.localStorage.getItem(SCOREBOARD_BORDER_STORAGE_KEYS.legacyEffect),
      ).theme;
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
    window.localStorage.setItem(SFX_STORAGE_KEYS.enabled, sfxEnabled ? "1" : "0");
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
    const onStorage = (event: StorageEvent) => {
      if (event.storageArea !== window.localStorage) return;
      if (event.key === KEY_BINDINGS_STORAGE_KEY && event.newValue) {
        try {
          setKeyBindingsState(
            sanitizeBindings(JSON.parse(event.newValue) as KeyBindings),
          );
        } catch {
          // ignore parse errors
        }
        return;
      }
      if (event.key === SFX_STORAGE_KEYS.enabled) {
        setSfxEnabledState(readStoredBool(SFX_STORAGE_KEYS.enabled, DEFAULT_SFX_ENABLED));
        return;
      }
      if (event.key === GAME_VOLUME_STORAGE_KEY) {
        setGameVolumeState(
          readStoredNumber(GAME_VOLUME_STORAGE_KEY, DEFAULT_GAME_VOLUME),
        );
        return;
      }
      if (event.key === SFX_STORAGE_KEYS.volume) {
        setSfxVolumeState(readStoredNumber(SFX_STORAGE_KEYS.volume, DEFAULT_SFX_VOLUME));
        return;
      }
      if (event.key === SFX_STORAGE_KEYS.preset) {
        setSfxPresetState(
          parseStoredSfxPreset(window.localStorage.getItem(SFX_STORAGE_KEYS.preset)),
        );
        return;
      }
      if (event.key === SETTLEMENT_PREVIEW_STORAGE_KEYS.syncWithGameVolume) {
        setSettlementPreviewSyncGameVolumeState(
          readStoredBool(
            SETTLEMENT_PREVIEW_STORAGE_KEYS.syncWithGameVolume,
            DEFAULT_SETTLEMENT_PREVIEW_SYNC,
          ),
        );
        return;
      }
      if (event.key === SETTLEMENT_PREVIEW_STORAGE_KEYS.volume) {
        setSettlementPreviewVolumeState(
          readStoredNumber(
            SETTLEMENT_PREVIEW_STORAGE_KEYS.volume,
            DEFAULT_SETTLEMENT_PREVIEW_VOLUME,
          ),
        );
        return;
      }
      if (event.key === SCOREBOARD_BORDER_STORAGE_KEYS.animation) {
        setScoreboardBorderAnimationState(
          parseStoredScoreboardBorderAnimation(
            window.localStorage.getItem(SCOREBOARD_BORDER_STORAGE_KEYS.animation),
          ),
        );
        return;
      }
      if (event.key === SCOREBOARD_BORDER_STORAGE_KEYS.lineStyle) {
        setScoreboardBorderLineStyleState(
          parseStoredScoreboardBorderLineStyle(
            window.localStorage.getItem(SCOREBOARD_BORDER_STORAGE_KEYS.lineStyle),
          ),
        );
        return;
      }
      if (event.key === SCOREBOARD_BORDER_STORAGE_KEYS.theme) {
        setScoreboardBorderThemeState(
          parseStoredScoreboardBorderTheme(
            window.localStorage.getItem(SCOREBOARD_BORDER_STORAGE_KEYS.theme),
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

  const setScoreboardBorderAnimation = useCallback(
    (next: ScoreboardBorderAnimationId) => {
      setScoreboardBorderAnimationState(parseStoredScoreboardBorderAnimation(next));
    },
    [],
  );

  const setScoreboardBorderLineStyle = useCallback(
    (next: ScoreboardBorderLineStyleId) => {
      setScoreboardBorderLineStyleState(parseStoredScoreboardBorderLineStyle(next));
    },
    [],
  );

  const setScoreboardBorderTheme = useCallback(
    (next: ScoreboardBorderThemeId) => {
      setScoreboardBorderThemeState(parseStoredScoreboardBorderTheme(next));
    },
    [],
  );

  const resetSfxSettings = useCallback(() => {
    setGameVolumeState(DEFAULT_GAME_VOLUME);
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
      scoreboardBorderAnimation,
      setScoreboardBorderAnimation,
      scoreboardBorderLineStyle,
      setScoreboardBorderLineStyle,
      scoreboardBorderTheme,
      setScoreboardBorderTheme,
      resetSfxSettings,
    }),
    [
      keyBindings,
      setKeyBindings,
      gameVolume,
      setGameVolume,
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
      scoreboardBorderAnimation,
      setScoreboardBorderAnimation,
      scoreboardBorderLineStyle,
      setScoreboardBorderLineStyle,
      scoreboardBorderTheme,
      setScoreboardBorderTheme,
      resetSfxSettings,
    ],
  );

  return (
    <SettingsModelContext.Provider value={value}>
      {children}
    </SettingsModelContext.Provider>
  );
};
