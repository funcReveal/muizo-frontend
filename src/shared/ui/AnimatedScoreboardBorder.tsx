import React from "react";

import { DEFAULT_SCOREBOARD_BORDER_PARTICLE_COUNT } from "../../features/Setting/model/scoreboardBorderEffects";
import type {
  ScoreboardBorderAnimationId,
  ScoreboardBorderLineStyleId,
  ScoreboardBorderThemeId,
} from "../../features/Setting/model/scoreboardBorderEffects";

interface AnimatedScoreboardBorderProps {
  animationId: ScoreboardBorderAnimationId;
  lineStyleId: ScoreboardBorderLineStyleId;
  themeId: ScoreboardBorderThemeId;
  maskEnabled?: boolean;
  particleCount?: number;
  intensity?: number;
  variant?: "attached" | "preview";
  className?: string;
}

type ParticleSeed = {
  xRatio: number;
  yRatio: number;
  size: number;
  speed: number;
  drift: number;
  phase: number;
  alpha: number;
  twist: number;
};

const DESKTOP_MAX_DPR = 2;
const MOBILE_MAX_DPR = 1.25;
const DESKTOP_TARGET_FPS = 60;
const MOBILE_TARGET_FPS = 24;

const createParticleSeed = (index: number, count: number): ParticleSeed => {
  const base = index + 1;
  const normalized = base / Math.max(1, count);
  return {
    xRatio: ((base * 73) % 100) / 100,
    yRatio: ((base * 41) % 100) / 100,
    size: 0.55 + ((base * 17) % 7) * 0.12 + normalized * 0.18,
    speed: 0.65 + ((base * 11) % 9) * 0.08,
    drift: 8 + ((base * 19) % 14),
    phase: (base * 0.91) % (Math.PI * 2),
    alpha: 0.34 + ((base * 13) % 6) * 0.08,
    twist: ((base * 29) % 100) / 100,
  };
};

const getParticlePalette = (
  style: ScoreboardBorderLineStyleId,
): { core: string; glow: string } => {
  switch (style) {
    case "gold-stars":
      return { core: "#f8d25b", glow: "rgba(255, 214, 92, 0.55)" };
    case "silver-glint":
      return { core: "#dbe5f2", glow: "rgba(203, 213, 225, 0.46)" };
    default:
      return { core: "#f8fbff", glow: "rgba(226, 242, 255, 0.46)" };
  }
};

const drawParticle = (
  ctx: CanvasRenderingContext2D,
  style: ScoreboardBorderLineStyleId,
  x: number,
  y: number,
  size: number,
  alpha: number,
  palette: { core: string; glow: string },
) => {
  ctx.save();
  ctx.globalAlpha = alpha;

  switch (style) {
    case "gold-stars": {
      ctx.translate(x, y);
      ctx.fillStyle = palette.core;
      ctx.shadowBlur = size * 5;
      ctx.shadowColor = palette.glow;
      ctx.beginPath();
      for (let index = 0; index < 8; index += 1) {
        const radius = index % 2 === 0 ? size * 1.8 : size * 0.72;
        const angle = (Math.PI / 4) * index - Math.PI / 2;
        const px = Math.cos(angle) * radius;
        const py = Math.sin(angle) * radius;
        if (index === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "silver-glint": {
      ctx.translate(x, y);
      ctx.strokeStyle = palette.core;
      ctx.lineWidth = Math.max(1, size * 0.85);
      ctx.shadowBlur = size * 4;
      ctx.shadowColor = palette.glow;
      ctx.beginPath();
      ctx.moveTo(0, -size * 1.5);
      ctx.lineTo(0, size * 1.5);
      ctx.moveTo(-size * 1.1, 0);
      ctx.lineTo(size * 1.1, 0);
      ctx.stroke();
      break;
    }
    default: {
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, size * 1.8);
      gradient.addColorStop(0, palette.core);
      gradient.addColorStop(0.56, "rgba(248, 251, 255, 0.88)");
      gradient.addColorStop(1, "rgba(248, 251, 255, 0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, size * 1.8, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }

  ctx.restore();
};

const AnimatedScoreboardBorder: React.FC<AnimatedScoreboardBorderProps> = ({
  animationId,
  lineStyleId,
  themeId,
  maskEnabled = true,
  particleCount = DEFAULT_SCOREBOARD_BORDER_PARTICLE_COUNT,
  intensity = 1,
  variant = "attached",
  className,
}) => {
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [isMobileViewport, setIsMobileViewport] = React.useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 1023.95px), (pointer: coarse)").matches;
  });
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia(
      "(max-width: 1023.95px), (pointer: coarse)",
    );
    const handleChange = (event: MediaQueryListEvent) => {
      setIsMobileViewport(event.matches);
    };
    setIsMobileViewport(mediaQuery.matches);
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);
  const clampedIntensity = Math.max(
    0,
    Math.min(1, intensity * (isMobileViewport ? 0.78 : 1)),
  );
  const easedIntensity = React.useMemo(
    () => Math.pow(clampedIntensity, 1.7),
    [clampedIntensity],
  );
  const mobileParticleLimit = React.useMemo(() => {
    if (!isMobileViewport) return particleCount;
    return Math.max(1, Math.round(particleCount * 0.55));
  }, [isMobileViewport, particleCount]);
  const effectiveParticleCount = React.useMemo(() => {
    if (mobileParticleLimit <= 0 || clampedIntensity <= 0) return 0;
    return Math.max(1, Math.round(mobileParticleLimit * easedIntensity));
  }, [clampedIntensity, easedIntensity, mobileParticleLimit]);
  const seeds = React.useMemo(
    () =>
      Array.from({ length: Math.max(0, effectiveParticleCount) }, (_, index) =>
        createParticleSeed(index, effectiveParticleCount),
      ),
    [effectiveParticleCount],
  );

  const shouldHideEffect = animationId === "none" && effectiveParticleCount <= 0;

  React.useEffect(() => {
    if (shouldHideEffect || seeds.length === 0) return;
    const canvas = canvasRef.current;
    const root = rootRef.current;
    if (!canvas || !root) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const palette = getParticlePalette(lineStyleId);
    let frameId = 0;
    let width = 0;
    let height = 0;
    let destroyed = false;
    let lastRenderAt = 0;
    const maxDpr = isMobileViewport ? MOBILE_MAX_DPR : DESKTOP_MAX_DPR;
    const targetFps = isMobileViewport ? MOBILE_TARGET_FPS : DESKTOP_TARGET_FPS;
    const frameIntervalMs = 1000 / targetFps;

    const resize = () => {
      if (!root || !canvas) return;
      const rect = root.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(root);
    resize();

    const render = (timestamp: number) => {
      if (destroyed || !context) return;
      if (timestamp - lastRenderAt < frameIntervalMs) {
        frameId = window.requestAnimationFrame(render);
        return;
      }
      lastRenderAt = timestamp;
      context.clearRect(0, 0, width, height);

      const time = timestamp / 1000;
      const amplitude = variant === "preview" ? 6 : isMobileViewport ? 7 : 10;

      seeds.forEach((seed, index) => {
        const drift = Math.sin(time * (0.65 + seed.speed * 0.35) + seed.phase);
        const vertical =
          (time * (16 + seed.speed * 9) + seed.yRatio * height) % (height + 28);
        const x =
          seed.xRatio * width +
          Math.cos(time * 0.4 + seed.twist * Math.PI * 2) * amplitude +
          drift * (seed.drift * 0.35);
        const y = height + 12 - vertical;
        const alpha =
          Math.max(0, seed.alpha - y / (height * 1.35)) *
          (variant === "preview" ? 0.92 : 1);
        const size = seed.size * (variant === "preview" ? 1.45 : 1.75);
        if (alpha > 0.015) {
          drawParticle(context, lineStyleId, x, y, size, alpha, palette);
        }

        if (lineStyleId === "silver-glint" && index % 7 === 0) {
          const flashAlpha = alpha * 0.55;
          if (flashAlpha > 0.02) {
            drawParticle(
              context,
              lineStyleId,
              x + 4,
              y - 2,
              size * 0.8,
              flashAlpha,
              palette,
            );
          }
        }
      });

      frameId = window.requestAnimationFrame(render);
    };

    frameId = window.requestAnimationFrame(render);

    return () => {
      destroyed = true;
      observer.disconnect();
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
      context.clearRect(0, 0, width, height);
    };
  }, [isMobileViewport, lineStyleId, seeds, shouldHideEffect, variant]);

  if (shouldHideEffect) {
    return null;
  }

  return (
    <div
      ref={rootRef}
      className={[
        "scoreboard-border-effect",
        `scoreboard-border-effect--${variant}`,
        `scoreboard-border-effect--theme-${themeId}`,
        `scoreboard-border-effect--motion-${animationId}`,
        maskEnabled
          ? "scoreboard-border-effect--mask-enabled"
          : "scoreboard-border-effect--mask-disabled",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={
        {
          ["--sb-intensity" as const]: easedIntensity.toFixed(3),
          ["--sb-intensity-soft" as const]: (0.2 + easedIntensity * 0.8).toFixed(3),
        } as React.CSSProperties
      }
      aria-hidden="true"
    >
      <span className="scoreboard-border-effect__ring" />
      <span className="scoreboard-border-effect__ring-secondary" />
      {maskEnabled ? <span className="scoreboard-border-effect__wash" /> : null}
      <canvas
        ref={canvasRef}
        className={`scoreboard-border-effect__canvas scoreboard-border-effect__canvas--${lineStyleId}`}
      />
    </div>
  );
};

export default AnimatedScoreboardBorder;
