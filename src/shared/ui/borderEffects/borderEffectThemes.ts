export type BorderEffectVariant = "attached" | "preview";

export interface BorderEffectThemeConfig {
  id: string;
  renderMode:
    | "simple-fire"
    | "real-fire"
    | "burning-fire"
    | "dual-water-fire"
    | "rainbow-energy"
    | "electric-arc";
  trackStroke: string;
  trackGlow: string;
  energyCore: string;
  energyCoreSoft: string;
  energyGlow: string;
  hotCore: string;
  hotEdge: string;
  ember: string;
  emberGlow: string;
  secondaryCore?: string;
  secondaryGlow?: string;
}

export interface BorderEffectMotionSnake {
  offsetRatio: number;
  beamRatio: number;
  trailRatio: number;
}

export type BorderEffectParticleMode = "off" | "subtle" | "preview-rich";

export interface BorderEffectMotionConfig {
  id: string;
  duration: number;
  snakes: BorderEffectMotionSnake[];
  particleMode: BorderEffectParticleMode;
}
