import type { SfxPresetId } from "../../../Room/model/sfx/gameSfxEngine";
import {
  DEFAULT_SETTLEMENT_PREVIEW_SYNC,
  DEFAULT_SETTLEMENT_PREVIEW_VOLUME,
  DEFAULT_SFX_ENABLED,
  DEFAULT_SFX_PRESET,
  DEFAULT_SFX_VOLUME,
  SETTLEMENT_PREVIEW_STORAGE_KEYS,
  SFX_STORAGE_KEYS,
  useSettingsModel,
} from "../../model/settingsContext";

export {
  DEFAULT_SFX_ENABLED,
  DEFAULT_SFX_PRESET,
  DEFAULT_SFX_VOLUME,
  DEFAULT_SETTLEMENT_PREVIEW_SYNC,
  DEFAULT_SETTLEMENT_PREVIEW_VOLUME,
  SETTLEMENT_PREVIEW_STORAGE_KEYS,
  SFX_STORAGE_KEYS,
};

export const SFX_PRESET_OPTIONS: Array<{
  id: SfxPresetId;
  label: string;
  hint: string;
}> = [
  { id: "arcade", label: "Arcade", hint: "競技感明顯，提示清楚" },
  { id: "focus", label: "Focus", hint: "更專注、干擾更少" },
  { id: "soft", label: "Soft", hint: "柔和不刺耳，適合長時間" },
];

export const useSfxSettings = () => {
  const {
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
    resetSfxSettings,
  } = useSettingsModel();

  return {
    sfxEnabled,
    setSfxEnabled,
    gameVolume,
    setGameVolume,
    sfxVolume,
    setSfxVolume,
    sfxPreset,
    setSfxPreset,
    settlementPreviewSyncGameVolume,
    setSettlementPreviewSyncGameVolume,
    settlementPreviewVolume,
    setSettlementPreviewVolume,
    resetSfxSettings,
  } as const;
};
