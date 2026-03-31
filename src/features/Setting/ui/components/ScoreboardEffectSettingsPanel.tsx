import React from "react";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import LocalFireDepartmentRoundedIcon from "@mui/icons-material/LocalFireDepartmentRounded";
import PolylineRoundedIcon from "@mui/icons-material/PolylineRounded";
import TipsAndUpdatesRoundedIcon from "@mui/icons-material/TipsAndUpdatesRounded";
import { Chip, Slider, Switch } from "@mui/material";

import {
  MAX_SCOREBOARD_BORDER_PARTICLE_COUNT,
  MIN_SCOREBOARD_BORDER_PARTICLE_COUNT,
  resolveScoreboardBorderMotionByTheme,
  getScoreboardBorderThemeClassName,
  SCOREBOARD_BORDER_LINE_STYLE_PRESETS,
  SCOREBOARD_BORDER_THEME_PRESETS,
  type ScoreboardBorderLineStyleId,
  type ScoreboardBorderThemeId,
} from "../../model/scoreboardBorderEffects";
import { useSettingsModel } from "../../model/settingsContext";
import AnimatedScoreboardBorder from "../../../../shared/ui/AnimatedScoreboardBorder";
import SettingsSectionCard from "./SettingsSectionCard";

interface ScoreboardEffectSettingsPanelProps {
  sectionId: string;
}

const ScoreboardEffectSettingsPanel: React.FC<
  ScoreboardEffectSettingsPanelProps
> = ({ sectionId }) => {
  const {
    scoreboardBorderEnabled,
    setScoreboardBorderEnabled,
    scoreboardBorderMaskEnabled,
    setScoreboardBorderMaskEnabled,
    scoreboardBorderLineStyle,
    setScoreboardBorderLineStyle,
    scoreboardBorderTheme,
    setScoreboardBorderTheme,
    scoreboardBorderParticleCount,
    setScoreboardBorderParticleCount,
  } = useSettingsModel();

  const selectedTheme =
    SCOREBOARD_BORDER_THEME_PRESETS.find(
      (item) => item.id === scoreboardBorderTheme,
    ) ?? SCOREBOARD_BORDER_THEME_PRESETS[0];
  const selectedParticleStyle =
    SCOREBOARD_BORDER_LINE_STYLE_PRESETS.find(
      (item) => item.id === scoreboardBorderLineStyle,
    ) ?? SCOREBOARD_BORDER_LINE_STYLE_PRESETS[0];
  const previewMotion = resolveScoreboardBorderMotionByTheme(scoreboardBorderTheme);

  return (
    <SettingsSectionCard
      id={sectionId}
      icon={<AutoAwesomeRoundedIcon fontSize="small" />}
      title="冠軍特效"
      description="調整 combo 最高玩家列的遮罩主題、粒子樣式與粒子上限。"
      actions={
        <Chip
          size="small"
          label={scoreboardBorderEnabled ? "ON" : "OFF"}
          variant="outlined"
          sx={{
            color: scoreboardBorderEnabled ? "#e0f2fe" : "rgba(226,232,240,0.72)",
            border: scoreboardBorderEnabled
              ? "1px solid rgba(56,189,248,0.28)"
              : "1px solid rgba(148,163,184,0.22)",
            background: scoreboardBorderEnabled
              ? "rgba(56,189,248,0.08)"
              : "rgba(15,23,42,0.22)",
          }}
        />
      }
    >
      <div className="settings-mobile-plain-card settings-mobile-plain-card--glow rounded-[24px] border border-cyan-400/18 bg-[radial-gradient(340px_180px_at_18%_0%,rgba(56,189,248,0.14),transparent_65%),linear-gradient(180deg,rgba(2,6,12,0.98),rgba(7,12,20,0.95))] p-5 shadow-[0_24px_64px_-44px_rgba(8,145,178,0.7)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200/70">
              Champion Veil
            </p>
            <h3 className="mt-1 text-lg font-black tracking-tight text-slate-100">
              {(scoreboardBorderMaskEnabled ? selectedTheme.title : "無遮罩") +
                " + " +
                selectedParticleStyle.title}
            </h3>
            <p className="mt-1 text-sm text-slate-400">
              保留原本 combo 光暈作為底層，再疊上一層較輕的透明遮罩。粒子維持
              canvas 渲染，常駐時也比較穩定。
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-full border border-cyan-400/18 bg-cyan-400/5 px-3 py-1.5">
            <span className="text-sm font-semibold text-cyan-50">啟用特效</span>
            <Switch
              checked={scoreboardBorderEnabled}
              onChange={(event) =>
                setScoreboardBorderEnabled(event.target.checked)
              }
              color="info"
            />
          </div>
        </div>

        <div className="settings-mobile-plain-card settings-mobile-plain-card--soft mt-4 rounded-[24px] border border-cyan-400/18 bg-[radial-gradient(460px_190px_at_12%_0%,rgba(56,189,248,0.12),transparent_62%),linear-gradient(180deg,rgba(4,8,15,0.96),rgba(6,10,18,0.94))] p-4">
          <div className="settings-mobile-plain-card scoreboard-effect-preview-stage rounded-[20px] border border-white/6 bg-[linear-gradient(180deg,rgba(2,6,12,0.54),rgba(2,6,12,0.18))] p-4">
            <div className="settings-mobile-plain-pill mb-3 flex items-center gap-2 rounded-full border border-cyan-400/18 bg-cyan-400/5 px-3 py-1.5 text-[12px] text-cyan-100/84">
              <TipsAndUpdatesRoundedIcon sx={{ fontSize: 16 }} />
              <span>
                預覽會固定顯示 combo 1、combo 5、combo 10 三個層級。把粒子拉到
                0 或關閉開關，就能直接降低負擔。
              </span>
            </div>
            <div className="space-y-3">
              <ScoreboardEffectPreviewRow
                enabled={scoreboardBorderEnabled}
                maskEnabled={scoreboardBorderMaskEnabled}
                lineStyleId={scoreboardBorderLineStyle}
                themeId={scoreboardBorderTheme}
                particleCount={scoreboardBorderParticleCount}
                motionId={previewMotion}
                rank={1}
                name="Combo 1"
                score="610"
                combo="x1"
                comboTier={1}
                active
              />
              <ScoreboardEffectPreviewRow
                enabled={scoreboardBorderEnabled}
                maskEnabled={scoreboardBorderMaskEnabled}
                lineStyleId={scoreboardBorderLineStyle}
                themeId={scoreboardBorderTheme}
                particleCount={scoreboardBorderParticleCount}
                motionId={previewMotion}
                rank={2}
                name="Combo 5"
                score="860"
                combo="x5"
                comboTier={5}
                active
              />
              <ScoreboardEffectPreviewRow
                enabled={scoreboardBorderEnabled}
                maskEnabled={scoreboardBorderMaskEnabled}
                lineStyleId={scoreboardBorderLineStyle}
                themeId={scoreboardBorderTheme}
                particleCount={scoreboardBorderParticleCount}
                motionId={previewMotion}
                rank={3}
                name="Combo 10"
                score="1,155"
                combo="x10"
                comboTier={10}
                active
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]">
        <div className="settings-mobile-plain-card settings-mobile-plain-card--soft rounded-[22px] border border-slate-700/70 bg-slate-950/35 p-4">
          <div className="mb-3 flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-rose-400/20 bg-rose-500/10 text-rose-200">
              <LocalFireDepartmentRoundedIcon fontSize="small" />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                A. Mask
              </p>
              <h3 className="mt-1 text-base font-black text-slate-100">
                遮罩主題
              </h3>
            </div>
          </div>
          <div className="space-y-3">
            <ThemeSelectableCard
              selected={!scoreboardBorderMaskEnabled}
              title="無"
              subtitle="No Veil"
              description="只保留原本 combo 光暈、邊框色與粒子，不再額外覆蓋透明遮罩。"
              accentLabel="Base"
              swatches={["#0f172a", "#1e293b", "#334155", "#475569"]}
              onClick={() => setScoreboardBorderMaskEnabled(false)}
            />
            {SCOREBOARD_BORDER_THEME_PRESETS.map((preset) => (
              <ThemeSelectableCard
                key={preset.id}
                selected={
                  scoreboardBorderMaskEnabled &&
                  scoreboardBorderTheme === preset.id
                }
                title={preset.title}
                subtitle={preset.subtitle}
                description={preset.description}
                accentLabel={preset.accentLabel}
                swatches={preset.swatches}
                onClick={() => {
                  setScoreboardBorderMaskEnabled(true);
                  setScoreboardBorderTheme(preset.id);
                }}
              />
            ))}
          </div>
        </div>

        <div className="grid gap-5">
          <div className="settings-mobile-plain-card settings-mobile-plain-card--soft rounded-[22px] border border-slate-700/70 bg-slate-950/35 p-4">
            <div className="mb-3 flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-500/10 text-amber-200">
                <AutoAwesomeRoundedIcon fontSize="small" />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  C. Particles
                </p>
                <h3 className="mt-1 text-base font-black text-slate-100">
                  粒子樣式
                </h3>
              </div>
            </div>
            <div className="grid gap-3">
              {SCOREBOARD_BORDER_LINE_STYLE_PRESETS.map((preset) => (
                <SelectableCard
                  key={preset.id}
                  selected={scoreboardBorderLineStyle === preset.id}
                  title={preset.title}
                  subtitle={preset.subtitle}
                  description={preset.description}
                  onClick={() => setScoreboardBorderLineStyle(preset.id)}
                />
              ))}
            </div>
          </div>

          <div className="settings-mobile-plain-card settings-mobile-plain-card--soft rounded-[22px] border border-slate-700/70 bg-slate-950/35 p-4">
            <div className="mb-4 flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-100">
                <PolylineRoundedIcon fontSize="small" />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  D. Density
                </p>
                <h3 className="mt-1 text-base font-black text-slate-100">
                  粒子密度
                </h3>
              </div>
            </div>
            <div className="rounded-[18px] border border-cyan-400/14 bg-cyan-400/5 px-4 py-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-200">
                    顯示上限
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    你設定的是最大粒子數量。實際顯示會依 combo 層級逐步增加，到
                    combo 10 才會達到上限。
                  </p>
                </div>
                <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-sm font-black text-cyan-50">
                  {scoreboardBorderParticleCount}
                </span>
              </div>
              <Slider
                value={scoreboardBorderParticleCount}
                min={MIN_SCOREBOARD_BORDER_PARTICLE_COUNT}
                max={MAX_SCOREBOARD_BORDER_PARTICLE_COUNT}
                step={1}
                onChange={(_, value) =>
                  setScoreboardBorderParticleCount(
                    Array.isArray(value) ? value[0] : value,
                  )
                }
                sx={{
                  mt: 2,
                  color: "#67e8f9",
                  "& .MuiSlider-thumb": {
                    width: 16,
                    height: 16,
                    boxShadow: "0 0 0 5px rgba(34,211,238,0.12)",
                  },
                  "& .MuiSlider-rail": {
                    opacity: 0.28,
                  },
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </SettingsSectionCard>
  );
};

interface SelectableCardProps {
  selected: boolean;
  title: string;
  subtitle: string;
  description: string;
  onClick: () => void;
}

const SelectableCard: React.FC<SelectableCardProps> = ({
  selected,
  title,
  subtitle,
  description,
  onClick,
}) => (
  <button
    type="button"
    className={`settings-mobile-plain-choice w-full rounded-[18px] border p-3 text-left transition duration-200 ${
      selected
        ? "border-cyan-300/45 bg-cyan-400/10 shadow-[0_20px_40px_-34px_rgba(56,189,248,0.68)]"
        : "border-slate-700/70 bg-slate-950/45 hover:border-slate-500/80 hover:bg-slate-900/70"
    }`}
    onClick={onClick}
  >
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h4 className="text-sm font-black tracking-[0.01em] text-slate-100">
          {title}
        </h4>
        <p className="mt-1 text-xs font-semibold tracking-[0.12em] text-slate-400">
          {subtitle}
        </p>
      </div>
      <SelectionDot selected={selected} />
    </div>
    <p className="mt-2 text-sm leading-6 text-slate-300">{description}</p>
  </button>
);

interface ThemeSelectableCardProps extends SelectableCardProps {
  accentLabel: string;
  swatches: string[];
}

const ThemeSelectableCard: React.FC<ThemeSelectableCardProps> = ({
  selected,
  title,
  subtitle,
  description,
  accentLabel,
  swatches,
  onClick,
}) => (
  <button
    type="button"
    className={`settings-mobile-plain-choice w-full rounded-[18px] border p-3 text-left transition duration-200 ${
      selected
        ? "border-cyan-300/45 bg-cyan-400/10 shadow-[0_20px_40px_-34px_rgba(56,189,248,0.68)]"
        : "border-slate-700/70 bg-slate-950/45 hover:border-slate-500/80 hover:bg-slate-900/70"
    }`}
    onClick={onClick}
  >
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="text-sm font-black tracking-[0.01em] text-slate-100">
            {title}
          </h4>
          <span className="settings-mobile-plain-badge rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300">
            {accentLabel}
          </span>
        </div>
        <p className="mt-1 text-xs font-semibold tracking-[0.12em] text-slate-400">
          {subtitle}
        </p>
      </div>
      <SelectionDot selected={selected} />
    </div>
    <div className="mt-3 flex items-center gap-2">
      <div className="settings-mobile-plain-swatch flex min-w-0 flex-1 overflow-hidden rounded-full border border-white/10 bg-slate-950/70 p-1">
        {swatches.map((color) => (
          <span
            key={color}
            className="h-3 flex-1 rounded-full"
            style={{ background: color }}
          />
        ))}
      </div>
    </div>
    <p className="mt-3 text-sm leading-6 text-slate-300">{description}</p>
  </button>
);

const SelectionDot: React.FC<{ selected: boolean }> = ({ selected }) => (
  <span
    className={`inline-flex h-8 w-8 flex-none items-center justify-center rounded-full border ${
      selected
        ? "border-cyan-300/45 bg-cyan-300/15 text-cyan-100"
        : "border-slate-700/80 bg-slate-900/90 text-slate-500"
    }`}
    aria-hidden="true"
  >
    <CheckRoundedIcon sx={{ fontSize: 18, opacity: selected ? 1 : 0.2 }} />
  </span>
);

interface ScoreboardEffectPreviewRowProps {
  enabled: boolean;
  maskEnabled: boolean;
  lineStyleId: ScoreboardBorderLineStyleId;
  themeId: ScoreboardBorderThemeId;
  particleCount: number;
  motionId: "none" | "single-beam" | "dual-beam";
  rank: number;
  name: string;
  score: string;
  combo: string;
  comboTier?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  active?: boolean;
}

const ScoreboardEffectPreviewRow: React.FC<ScoreboardEffectPreviewRowProps> = ({
  enabled,
  maskEnabled,
  lineStyleId,
  themeId,
  particleCount,
  motionId,
  rank,
  name,
  score,
  combo,
  comboTier = 8,
  active = false,
}) => {
  const themeClassName = enabled
    ? getScoreboardBorderThemeClassName(themeId)
    : "";
  const comboDisplayClass =
    comboTier > 0
      ? `game-room-score-row-combo-text game-room-score-row-combo-text--tier-${comboTier}`
      : "";

  return (
    <div
      className={`scoreboard-effect-preview-row game-room-score-row flex items-center justify-between text-sm ${
        active && enabled
          ? `scoreboard-effect-preview-row--active game-room-score-row--combo-flare game-room-score-row--combo-champion game-room-score-row--combo-champion-active game-room-score-row--combo-tier-${comboTier} ${themeClassName}`
          : ""
      }`}
      style={
        {
          minHeight: active ? 58 : 46,
          paddingInline: active ? 18 : 12,
        } as React.CSSProperties
      }
    >
      {active && enabled ? (
        <AnimatedScoreboardBorder
          animationId={motionId}
          lineStyleId={lineStyleId}
          themeId={themeId}
          maskEnabled={maskEnabled}
          particleCount={particleCount}
          intensity={comboTier / 10}
          variant="preview"
          className="scoreboard-border-effect"
        />
      ) : null}
      <span className="flex min-w-0 items-center gap-2 truncate">
        <span
          className={`h-2 w-2 rounded-full ${
            active ? "bg-emerald-400" : "bg-slate-500"
          }`}
        />
        <span className="truncate">
          {rank}. {name}
        </span>
        {active ? (
          <span className="game-room-score-row-you-badge">YOU</span>
        ) : null}
      </span>
      <span className="font-semibold text-emerald-300 tabular-nums">
        {score}
        {combo ? <span className={`ml-1 ${comboDisplayClass}`}>{combo}</span> : null}
      </span>
    </div>
  );
};

export default ScoreboardEffectSettingsPanel;
