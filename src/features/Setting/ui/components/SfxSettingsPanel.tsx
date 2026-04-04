import React, { useMemo } from "react";
import {
  CampaignRounded,
  GraphicEqRounded,
  NotificationsActiveRounded,
  RestartAltRounded,
  TuneRounded,
} from "@mui/icons-material";
import { Button, Slider, Switch } from "@mui/material";

import {
  resolveCorrectResultSfxEvent,
  type GameSfxEvent,
} from "../../../Room/model/sfx/gameSfxEngine";
import { useGameSfx } from "../../../GameRoom/model/useGameSfx";
import SettingsSectionCard from "./SettingsSectionCard";
import {
  DEFAULT_SFX_VOLUME,
  SFX_PRESET_OPTIONS,
  useSfxSettings,
} from "./useSfxSettings";

type SfxSettingsPanelProps = {
  sectionId?: string;
};

const SAMPLE_BUTTONS: Array<{
  label: string;
  event: GameSfxEvent;
  tone: "neutral" | "good" | "warn" | "hot";
}> = [
  { label: "鎖定", event: "lock", tone: "neutral" },
  { label: "答對", event: "correct", tone: "good" },
  { label: "答錯", event: "wrong", tone: "warn" },
  { label: "倒數緊迫", event: "deadlineFinal", tone: "hot" },
];

const sampleButtonClassByTone: Record<
  (typeof SAMPLE_BUTTONS)[number]["tone"],
  string
> = {
  neutral:
    "border-slate-600/70 bg-slate-900/55 text-slate-100 hover:border-cyan-300/40 hover:bg-cyan-400/5",
  good:
    "border-emerald-400/25 bg-emerald-500/5 text-emerald-100 hover:border-emerald-300/40 hover:bg-emerald-400/10",
  warn:
    "border-rose-400/25 bg-rose-500/5 text-rose-100 hover:border-rose-300/40 hover:bg-rose-400/10",
  hot:
    "border-amber-400/25 bg-amber-500/5 text-amber-100 hover:border-amber-300/40 hover:bg-amber-400/10",
};

const comboTierEvents = [4, 8, 12, 16, 20].map((comboBonusPoints) => ({
  comboBonusPoints,
  event: resolveCorrectResultSfxEvent(comboBonusPoints),
}));

const SfxSettingsPanel: React.FC<SfxSettingsPanelProps> = ({ sectionId }) => {
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
  } = useSfxSettings();

  const { playGameSfx, primeSfxAudio } = useGameSfx({
    enabled: sfxEnabled,
    volume: Math.round((sfxVolume * gameVolume) / 100),
    preset: sfxPreset,
  });

  const selectedPresetMeta = useMemo(
    () =>
      SFX_PRESET_OPTIONS.find((item) => item.id === sfxPreset) ??
      SFX_PRESET_OPTIONS[0],
    [sfxPreset],
  );

  const playSample = (event: GameSfxEvent) => {
    primeSfxAudio();
    playGameSfx(event);
  };

  return (
    <SettingsSectionCard
      id={sectionId}
      icon={<CampaignRounded fontSize="small" />}
      title="音效設定"
      description="調整提示音啟用、音量與風格，並可直接試聽。"
      actions={
        <div className="flex items-center gap-2">
          <Button
            size="small"
            variant="outlined"
            color="inherit"
            startIcon={<RestartAltRounded />}
            onClick={resetSfxSettings}
            sx={{
              borderColor: "rgba(148,163,184,0.35)",
              color: "#e2e8f0",
            }}
          >
            重設
          </Button>
          <div className="settings-mobile-plain-pill flex items-center gap-2 rounded-full border border-slate-700/60 bg-slate-900/70 px-2 py-1">
            <span className="text-xs text-slate-300">啟用</span>
            <Switch
              size="small"
              color="info"
              checked={sfxEnabled}
              onChange={(e) => setSfxEnabled(e.target.checked)}
            />
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="settings-mobile-plain-card settings-mobile-plain-card--soft rounded-xl border border-slate-700/60 bg-slate-950/35 p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <GraphicEqRounded sx={{ fontSize: 18, color: "#a5f3fc" }} />
              <p className="text-sm font-semibold text-slate-100">遊玩音量（總音量）</p>
            </div>
            <span className="settings-mobile-plain-badge rounded-full border border-slate-700/60 bg-slate-900/70 px-2 py-0.5 text-xs font-semibold text-cyan-100">
              {gameVolume}%
            </span>
          </div>
          <Slider
            value={gameVolume}
            min={0}
            max={100}
            step={1}
            onChange={(_, value) =>
              setGameVolume(Array.isArray(value) ? value[0] : value)
            }
            sx={{
              color: "#67e8f9",
              "& .MuiSlider-thumb": {
                boxShadow: "0 0 0 4px rgba(103,232,249,0.16)",
              },
            }}
          />
          <p className="mt-2 text-xs text-slate-400">
            會同時影響遊戲播放音量、結算試聽同步音量，以及提示特效音量基準。
          </p>
        </div>

        <div className="settings-mobile-plain-card settings-mobile-plain-card--soft rounded-xl border border-slate-700/60 bg-slate-950/35 p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <GraphicEqRounded sx={{ fontSize: 18, color: "#67e8f9" }} />
              <p className="text-sm font-semibold text-slate-100">音量</p>
            </div>
            <span className="settings-mobile-plain-badge rounded-full border border-slate-700/60 bg-slate-900/70 px-2 py-0.5 text-xs font-semibold text-cyan-100">
              {sfxVolume}%
            </span>
          </div>
          <Slider
            value={sfxVolume}
            min={0}
            max={100}
            step={1}
            disabled={!sfxEnabled}
            onChange={(_, value) =>
              setSfxVolume(Array.isArray(value) ? value[0] : value)
            }
            sx={{
              color: "#22d3ee",
              "& .MuiSlider-thumb": {
                boxShadow: "0 0 0 4px rgba(34,211,238,0.16)",
              },
            }}
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <p className="text-xs text-slate-400">
              建議 35%~60%，避免音效過大影響作答。
            </p>
            <button
              type="button"
              disabled={!sfxEnabled}
              onClick={() => setSfxVolume(DEFAULT_SFX_VOLUME)}
              className="settings-mobile-plain-chip rounded-full border border-cyan-300/25 bg-cyan-400/5 px-2 py-0.5 text-[11px] font-semibold text-cyan-100 transition hover:border-cyan-300/40 hover:bg-cyan-400/10 disabled:opacity-50"
            >
              套用建議音量 {DEFAULT_SFX_VOLUME}%
            </button>
          </div>
        </div>

        <div className="settings-mobile-plain-card settings-mobile-plain-card--soft rounded-xl border border-slate-700/60 bg-slate-950/35 p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CampaignRounded sx={{ fontSize: 18, color: "#7dd3fc" }} />
              <p className="text-sm font-semibold text-slate-100">結算試聽音量</p>
            </div>
            <div className="settings-mobile-plain-pill flex items-center gap-2 rounded-full border border-slate-700/60 bg-slate-900/70 px-2 py-1">
              <span className="text-xs text-slate-300">同步遊玩音量</span>
              <Switch
                size="small"
                color="info"
                checked={settlementPreviewSyncGameVolume}
                onChange={(e) => setSettlementPreviewSyncGameVolume(e.target.checked)}
              />
            </div>
          </div>
          <Slider
            value={settlementPreviewVolume}
            min={0}
            max={100}
            step={1}
            disabled={settlementPreviewSyncGameVolume}
            onChange={(_, value) =>
              setSettlementPreviewVolume(Array.isArray(value) ? value[0] : value)
            }
            sx={{
              color: "#38bdf8",
              "& .MuiSlider-thumb": {
                boxShadow: "0 0 0 4px rgba(56,189,248,0.14)",
              },
            }}
          />
          <p className="mt-2 text-xs text-slate-400">
            {settlementPreviewSyncGameVolume
              ? `目前會跟隨遊玩音量（${gameVolume}%）。如要獨立調整，請先關閉同步。`
              : `目前結算試聽音量：${settlementPreviewVolume}%`}
          </p>
        </div>

        <div className="settings-mobile-plain-card settings-mobile-plain-card--soft rounded-xl border border-slate-700/60 bg-slate-950/35 p-3">
          <div className="mb-3 flex items-center gap-2">
            <TuneRounded sx={{ fontSize: 18, color: "#c4b5fd" }} />
            <p className="text-sm font-semibold text-slate-100">音效風格</p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {SFX_PRESET_OPTIONS.map((preset) => {
              const active = preset.id === sfxPreset;
              return (
                <button
                  key={preset.id}
                  type="button"
                  disabled={!sfxEnabled}
                  onClick={() => setSfxPreset(preset.id)}
                  className={`settings-mobile-plain-choice rounded-xl border px-3 py-2 text-left transition ${
                    active
                      ? "border-cyan-300/45 bg-cyan-400/8 shadow-[0_0_0_1px_rgba(34,211,238,0.12)]"
                      : "border-slate-700/60 bg-slate-900/45 hover:border-slate-500/70"
                  } disabled:opacity-50`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-100">
                      {preset.label}
                    </span>
                    {active && (
                      <span className="settings-mobile-plain-badge rounded-full border border-cyan-300/35 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-bold text-cyan-100">
                        目前
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs leading-4 text-slate-400">
                    {preset.hint}
                  </p>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-slate-400">
            目前風格：
            <span className="text-slate-200">{selectedPresetMeta.label}</span>
            {" · "}
            {selectedPresetMeta.hint}
          </p>
        </div>

        <div className="settings-mobile-plain-card settings-mobile-plain-card--soft rounded-xl border border-slate-700/60 bg-slate-950/35 p-3">
          <div className="mb-3 flex items-center gap-2">
            <NotificationsActiveRounded
              sx={{ fontSize: 18, color: "#fcd34d" }}
            />
            <p className="text-sm font-semibold text-slate-100">試聽</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {SAMPLE_BUTTONS.map((sample) => (
              <button
                key={sample.label}
                type="button"
                disabled={!sfxEnabled}
                onClick={() => playSample(sample.event)}
                className={`settings-mobile-plain-choice rounded-xl border px-3 py-2 text-sm font-semibold transition disabled:opacity-50 ${sampleButtonClassByTone[sample.tone]}`}
              >
                {sample.label}
              </button>
            ))}
          </div>

          <div className="settings-mobile-plain-card mt-3 rounded-xl border border-slate-700/60 bg-slate-900/45 p-2.5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-slate-200">
                Combo 答對音（5 段）
              </p>
              <Button
                size="small"
                variant="outlined"
                color="inherit"
                disabled={!sfxEnabled}
                onClick={() => {
                  primeSfxAudio();
                  comboTierEvents.forEach((item, idx) => {
                    playGameSfx(item.event, idx * 0.22);
                  });
                }}
                sx={{
                  borderColor: "rgba(148,163,184,0.35)",
                  color: "#e2e8f0",
                  minWidth: 0,
                  px: 1.2,
                }}
              >
                連播試聽
              </Button>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {comboTierEvents.map((item, idx) => (
                <button
                  key={item.comboBonusPoints}
                  type="button"
                  disabled={!sfxEnabled}
                  onClick={() => playSample(item.event)}
                  className="settings-mobile-plain-choice rounded-lg border border-amber-300/20 bg-amber-400/5 px-2 py-1.5 text-center text-[11px] font-bold text-amber-100 transition hover:border-amber-300/35 hover:bg-amber-400/10 disabled:opacity-50"
                  title={`Combo 加成 +${item.comboBonusPoints}`}
                >
                  T{idx + 1}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] leading-4 text-slate-400">
              T1~T5 對應 Combo 加成 +4 / +8 / +12 / +16 / +20。
            </p>
          </div>
        </div>
      </div>
    </SettingsSectionCard>
  );
};

export default SfxSettingsPanel;
