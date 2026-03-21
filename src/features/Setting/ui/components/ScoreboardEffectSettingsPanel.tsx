import React from "react";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import TipsAndUpdatesRoundedIcon from "@mui/icons-material/TipsAndUpdatesRounded";
import { Chip } from "@mui/material";

import {
  getScoreboardBorderThemeClassName,
  SCOREBOARD_BORDER_ANIMATION_PRESETS,
  SCOREBOARD_BORDER_LINE_STYLE_PRESETS,
  SCOREBOARD_BORDER_THEME_PRESETS,
  type ScoreboardBorderAnimationId,
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
    scoreboardBorderAnimation,
    setScoreboardBorderAnimation,
    scoreboardBorderLineStyle,
    setScoreboardBorderLineStyle,
    scoreboardBorderTheme,
    setScoreboardBorderTheme,
  } = useSettingsModel();

  const selectedAnimation =
    SCOREBOARD_BORDER_ANIMATION_PRESETS.find(
      (item) => item.id === scoreboardBorderAnimation,
    ) ?? SCOREBOARD_BORDER_ANIMATION_PRESETS[0];
  const selectedTheme =
    SCOREBOARD_BORDER_THEME_PRESETS.find(
      (item) => item.id === scoreboardBorderTheme,
    ) ?? SCOREBOARD_BORDER_THEME_PRESETS[0];
  const selectedParticleMode =
    SCOREBOARD_BORDER_LINE_STYLE_PRESETS.find(
      (item) => item.id === scoreboardBorderLineStyle,
    ) ?? SCOREBOARD_BORDER_LINE_STYLE_PRESETS[0];
  const shouldShowParticleModes =
    scoreboardBorderAnimation !== "none" || scoreboardBorderTheme === "electric-arc";

  return (
    <SettingsSectionCard
      id={sectionId}
      icon={<AutoAwesomeRoundedIcon fontSize="small" />}
      title="排行榜冠軍邊框"
      description="在保留現有主題系統的前提下，額外選擇光束運動模式與低調粒子模式，讓第一名列更有競技存在感。"
      actions={
        <Chip
          size="small"
          label="Live Preview"
          variant="outlined"
          sx={{
            color: "#e0f2fe",
            border: "1px solid rgba(56,189,248,0.28)",
            background: "rgba(56,189,248,0.08)",
          }}
        />
      }
    >
      <div className="rounded-[24px] border border-cyan-400/20 bg-[radial-gradient(340px_180px_at_18%_0%,rgba(56,189,248,0.15),transparent_65%),linear-gradient(180deg,rgba(2,6,12,0.98),rgba(7,12,20,0.95))] p-5 shadow-[0_24px_64px_-44px_rgba(8,145,178,0.7)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200/70">
              Live Preview
            </p>
            <h3 className="mt-1 text-lg font-black tracking-tight text-slate-100">
              {selectedTheme.title} · {selectedAnimation.title}
            </h3>
            <p className="mt-1 text-sm text-slate-400">
              預覽會同時套用主題底框、光束運動與粒子模式。attached/live
              版本會自動降低粒子密度與細節，優先穩定性。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Chip
              size="small"
              label={selectedTheme.accentLabel}
              sx={{
                color: "#f8fafc",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.05)",
              }}
            />
            <Chip
              size="small"
              label={selectedAnimation.subtitle}
              sx={{
                color: "#cffafe",
                border: "1px solid rgba(34,211,238,0.28)",
                background: "rgba(8,47,73,0.5)",
              }}
            />
            {shouldShowParticleModes ? (
              <Chip
                size="small"
                label={selectedParticleMode.subtitle}
                sx={{
                  color: "#fde68a",
                  border: "1px solid rgba(245,158,11,0.22)",
                  background: "rgba(120,53,15,0.34)",
                }}
              />
            ) : null}
          </div>
        </div>

        <div className="mt-4 rounded-[24px] border border-cyan-400/18 bg-[radial-gradient(460px_190px_at_12%_0%,rgba(56,189,248,0.12),transparent_62%),linear-gradient(180deg,rgba(4,8,15,0.96),rgba(6,10,18,0.94))] p-4">
          <div className="scoreboard-effect-preview-stage rounded-[20px] border border-white/6 bg-[linear-gradient(180deg,rgba(2,6,12,0.54),rgba(2,6,12,0.18))] p-4">
            <div className="mb-3 flex items-center gap-2 rounded-full border border-cyan-400/18 bg-cyan-400/5 px-3 py-1.5 text-[12px] text-cyan-100/84">
              <TipsAndUpdatesRoundedIcon sx={{ fontSize: 16 }} />
              <span>
                預覽區已放大邊框附近的視覺範圍，讓 beam head
                與微粒子可以完整顯示，同時不影響中間內容可讀性。
              </span>
            </div>
            <div className="space-y-3">
              <ScoreboardEffectPreviewRow
                animationId={scoreboardBorderAnimation}
                lineStyleId={scoreboardBorderLineStyle}
                themeId={scoreboardBorderTheme}
                rank={1}
                name="DreamStory"
                score="1,155"
                combo="x1"
                active
              />
              <ScoreboardEffectPreviewRow
                animationId={scoreboardBorderAnimation}
                lineStyleId={scoreboardBorderLineStyle}
                themeId={scoreboardBorderTheme}
                rank={2}
                name="待答玩家"
                score="972"
                combo=""
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]">
        <div className="rounded-[22px] border border-slate-700/70 bg-slate-950/35 p-4">
          <div className="mb-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              A. Theme
            </p>
            <h3 className="mt-1 text-base font-black text-slate-100">
              主題底框
            </h3>
          </div>
          <div className="space-y-3">
            {SCOREBOARD_BORDER_THEME_PRESETS.map((preset) => (
              <ThemeSelectableCard
                key={preset.id}
                selected={scoreboardBorderTheme === preset.id}
                title={preset.title}
                subtitle={preset.subtitle}
                description={preset.description}
                accentLabel={preset.accentLabel}
                swatches={preset.swatches}
                onClick={() => setScoreboardBorderTheme(preset.id)}
              />
            ))}
          </div>
        </div>

        <div className="rounded-[22px] border border-slate-700/70 bg-slate-950/35 p-4">
          <div className="mb-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              B. Motion
            </p>
            <h3 className="mt-1 text-base font-black text-slate-100">
              光束運動模式
            </h3>
          </div>
          <div className="grid gap-3">
            {SCOREBOARD_BORDER_ANIMATION_PRESETS.map((preset) => (
              <SelectableCard
                key={preset.id}
                selected={scoreboardBorderAnimation === preset.id}
                title={preset.title}
                subtitle={preset.subtitle}
                description={preset.description}
                onClick={() => setScoreboardBorderAnimation(preset.id)}
              />
            ))}
          </div>

          {shouldShowParticleModes ? (
            <>
              <div className="mb-3 mt-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  C. Particles
                </p>
                <h3 className="mt-1 text-base font-black text-slate-100">
                  低調粒子模式
                </h3>
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
            </>
          ) : (
            <div className="mt-5 rounded-[18px] border border-slate-800/80 bg-slate-950/40 px-4 py-3 text-sm text-slate-400">
              目前選擇的是靜態模式，沒有可調整的額外粒子層，所以暫時隱藏粒子設定。
            </div>
          )}
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
    className={`w-full rounded-[18px] border p-3 text-left transition duration-200 ${
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
    className={`w-full rounded-[18px] border p-3 text-left transition duration-200 ${
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
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300">
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
      <div className="flex min-w-0 flex-1 overflow-hidden rounded-full border border-white/10 bg-slate-950/70 p-1">
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
  animationId: ScoreboardBorderAnimationId;
  lineStyleId: ScoreboardBorderLineStyleId;
  themeId: ScoreboardBorderThemeId;
  rank: number;
  name: string;
  score: string;
  combo: string;
  active?: boolean;
}

const ScoreboardEffectPreviewRow: React.FC<ScoreboardEffectPreviewRowProps> = ({
  animationId,
  lineStyleId,
  themeId,
  rank,
  name,
  score,
  combo,
  active = false,
}) => {
  const themeClassName = getScoreboardBorderThemeClassName(themeId);

  return (
    <div
      className={`scoreboard-effect-preview-row game-room-score-row flex items-center justify-between text-sm ${
        active
          ? `scoreboard-effect-preview-row--active game-room-score-row--combo-flare game-room-score-row--combo-champion game-room-score-row--combo-tier-8 ${themeClassName}`
          : ""
      }`}
      style={
        {
          minHeight: active ? 58 : 46,
          paddingInline: active ? 18 : 12,
        } as React.CSSProperties
      }
    >
      {active ? (
        <AnimatedScoreboardBorder
          animationId={animationId}
          lineStyleId={lineStyleId}
          themeId={themeId}
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
        {active ? <span className="game-room-score-row-you-badge">YOU</span> : null}
      </span>
      <span className="font-semibold text-emerald-300 tabular-nums">
        {score}
        {combo ? <span className="ml-1 text-amber-300">{combo}</span> : null}
      </span>
    </div>
  );
};

export default ScoreboardEffectSettingsPanel;
