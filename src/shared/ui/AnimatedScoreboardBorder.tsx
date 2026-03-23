import React from "react";

import type {
  ScoreboardBorderAnimationId,
  ScoreboardBorderLineStyleId,
  ScoreboardBorderThemeId,
} from "../../features/Setting/model/scoreboardBorderEffects";
import BorderEffectFrame from "./borderEffects/BorderEffectFrame";
import type {
  BorderEffectMotionConfig,
  BorderEffectThemeConfig,
  BorderEffectVariant,
} from "./borderEffects/borderEffectThemes";

interface AnimatedScoreboardBorderProps {
  animationId: ScoreboardBorderAnimationId;
  lineStyleId: ScoreboardBorderLineStyleId;
  themeId: ScoreboardBorderThemeId;
  variant?: BorderEffectVariant;
  className?: string;
}

const themeConfigById: Record<ScoreboardBorderThemeId, BorderEffectThemeConfig> =
  {
    "simple-fire": {
      id: "simple-fire",
      renderMode: "simple-fire",
      trackStroke: "rgba(255,255,255,0.06)",
      trackGlow: "rgba(255,255,255,0.03)",
      energyCore: "rgba(255,248,234,0.98)",
      energyCoreSoft: "rgba(255,224,148,0.94)",
      energyGlow: "rgba(255,170,72,0.3)",
      hotCore: "rgba(255,250,238,0.98)",
      hotEdge: "rgba(255,174,74,0.86)",
      ember: "rgba(255,207,124,0.94)",
      emberGlow: "rgba(255,118,36,0.48)",
    },
    "real-fire": {
      id: "real-fire",
      renderMode: "real-fire",
      trackStroke: "rgba(255,255,255,0.05)",
      trackGlow: "rgba(255,255,255,0.025)",
      energyCore: "rgba(255,247,229,0.98)",
      energyCoreSoft: "rgba(255,214,118,0.94)",
      energyGlow: "rgba(255,144,48,0.36)",
      hotCore: "rgba(255,250,238,0.98)",
      hotEdge: "rgba(255,154,56,0.88)",
      ember: "rgba(255,214,142,0.98)",
      emberGlow: "rgba(255,98,34,0.58)",
    },
    "burning-fire": {
      id: "burning-fire",
      renderMode: "burning-fire",
      trackStroke: "rgba(255,244,225,0.045)",
      trackGlow: "rgba(98,26,10,0.09)",
      energyCore: "rgba(243,217,156,0.62)",
      energyCoreSoft: "rgba(185,92,34,0.74)",
      energyGlow: "rgba(120,28,12,0.32)",
      hotCore: "rgba(255,242,224,0.52)",
      hotEdge: "rgba(124,28,14,0.9)",
      ember: "rgba(191,132,52,0.82)",
      emberGlow: "rgba(116,34,14,0.36)",
    },
    "dual-water-fire": {
      id: "dual-water-fire",
      renderMode: "dual-water-fire",
      trackStroke: "rgba(255,255,255,0.06)",
      trackGlow: "rgba(255,255,255,0.03)",
      energyCore: "rgba(255,239,220,0.96)",
      energyCoreSoft: "rgba(255,176,128,0.84)",
      energyGlow: "rgba(255,108,76,0.22)",
      hotCore: "rgba(255,241,230,0.96)",
      hotEdge: "rgba(255,128,86,0.78)",
      ember: "rgba(255,222,182,0.94)",
      emberGlow: "rgba(255,112,92,0.42)",
      secondaryCore: "rgba(226,250,255,0.9)",
      secondaryGlow: "rgba(108,216,255,0.22)",
    },
    "rainbow-energy": {
      id: "rainbow-energy",
      renderMode: "rainbow-energy",
      trackStroke: "rgba(255,255,255,0.06)",
      trackGlow: "rgba(255,255,255,0.03)",
      energyCore: "rgba(255,255,255,0.98)",
      energyCoreSoft: "rgba(240,240,255,0.94)",
      energyGlow: "rgba(255,255,255,0.24)",
      hotCore: "rgba(255,255,255,0.98)",
      hotEdge: "rgba(255,255,255,0.88)",
      ember: "rgba(255,255,255,0.9)",
      emberGlow: "rgba(255,255,255,0.3)",
      secondaryCore: "rgba(255,255,255,0.98)",
      secondaryGlow: "rgba(255,255,255,0.36)",
    },
    "electric-arc": {
      id: "electric-arc",
      renderMode: "electric-arc",
      trackStroke: "rgba(255,255,255,0.05)",
      trackGlow: "rgba(125,211,252,0.04)",
      energyCore: "rgba(241,253,255,0.98)",
      energyCoreSoft: "rgba(167,243,255,0.94)",
      energyGlow: "rgba(96,165,250,0.34)",
      hotCore: "rgba(255,255,255,0.98)",
      hotEdge: "rgba(110,231,255,0.92)",
      ember: "rgba(191,219,254,0.92)",
      emberGlow: "rgba(59,130,246,0.42)",
      secondaryCore: "rgba(196,181,253,0.9)",
      secondaryGlow: "rgba(124,58,237,0.3)",
    },
  };

const motionConfigByKey: Record<
  `${ScoreboardBorderAnimationId}:${ScoreboardBorderLineStyleId}`,
  BorderEffectMotionConfig
> = {
  "none:off": {
    id: "none-off",
    duration: 2.4,
    snakes: [],
    particleMode: "off",
  },
  "none:subtle": {
    id: "none-subtle",
    duration: 2.4,
    snakes: [],
    particleMode: "subtle",
  },
  "none:preview-rich": {
    id: "none-preview-rich",
    duration: 2.4,
    snakes: [],
    particleMode: "preview-rich",
  },
  "single-beam:off": {
    id: "single-beam-off",
    duration: 2.25,
    snakes: [{ offsetRatio: 0.08, beamRatio: 0.085, trailRatio: 0.24 }],
    particleMode: "off",
  },
  "single-beam:subtle": {
    id: "single-beam-subtle",
    duration: 2.25,
    snakes: [{ offsetRatio: 0.08, beamRatio: 0.085, trailRatio: 0.24 }],
    particleMode: "subtle",
  },
  "single-beam:preview-rich": {
    id: "single-beam-preview-rich",
    duration: 2.25,
    snakes: [{ offsetRatio: 0.08, beamRatio: 0.085, trailRatio: 0.24 }],
    particleMode: "preview-rich",
  },
  "dual-beam:off": {
    id: "dual-beam-off",
    duration: 2.1,
    snakes: [
      { offsetRatio: 0.02, beamRatio: 0.078, trailRatio: 0.21 },
      { offsetRatio: 0.52, beamRatio: 0.078, trailRatio: 0.21 },
    ],
    particleMode: "off",
  },
  "dual-beam:subtle": {
    id: "dual-beam-subtle",
    duration: 2.1,
    snakes: [
      { offsetRatio: 0.02, beamRatio: 0.078, trailRatio: 0.21 },
      { offsetRatio: 0.52, beamRatio: 0.078, trailRatio: 0.21 },
    ],
    particleMode: "subtle",
  },
  "dual-beam:preview-rich": {
    id: "dual-beam-preview-rich",
    duration: 2.1,
    snakes: [
      { offsetRatio: 0.02, beamRatio: 0.078, trailRatio: 0.21 },
      { offsetRatio: 0.52, beamRatio: 0.078, trailRatio: 0.21 },
    ],
    particleMode: "preview-rich",
  },
};

const AnimatedScoreboardBorder: React.FC<AnimatedScoreboardBorderProps> = ({
  animationId,
  lineStyleId,
  themeId,
  variant = "attached",
  className,
}) => {
  const theme = themeConfigById[themeId];
  const motion =
    motionConfigByKey[`${animationId}:${lineStyleId}`] ??
    motionConfigByKey["dual-beam:subtle"];

  return (
    <BorderEffectFrame
      theme={theme}
      motion={motion}
      variant={variant}
      className={`${className ?? ""} scoreboard-border-effect--line-${lineStyleId}`.trim()}
    />
  );
};

export default AnimatedScoreboardBorder;
