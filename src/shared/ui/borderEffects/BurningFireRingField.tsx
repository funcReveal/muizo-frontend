import React from "react";

import type {
  BorderEffectMotionConfig,
  BorderEffectThemeConfig,
  BorderEffectVariant,
} from "./borderEffectThemes";

interface BurningFireRingFieldProps {
  frame: {
    path: string;
    perimeter: number;
    strokeWidth: number;
    inset: number;
    width: number;
    height: number;
    radius: number;
    outerWidth: number;
    outerHeight: number;
  };
  theme: BorderEffectThemeConfig;
  motion: BorderEffectMotionConfig;
  variant: BorderEffectVariant;
  infernoFilterId: string;
  motionPathId: string;
}

interface BurningFireCanvasOverlayProps {
  frame: BurningFireRingFieldProps["frame"];
  theme: BorderEffectThemeConfig;
  motion: BorderEffectMotionConfig;
  variant: BorderEffectVariant;
}

interface FireEmitter {
  x: number;
  y: number;
  nx: number;
  ny: number;
  tx: number;
  ty: number;
  heat: number;
}

type FireDetailMode = "performance" | "visual";

const BurningFireRingField: React.FC<BurningFireRingFieldProps> = ({
  frame,
  motion,
  variant,
  infernoFilterId,
  motionPathId,
}) => {
  const detailMode: FireDetailMode =
    variant === "preview" ? "visual" : "performance";
  const fireGradientId = `${motionPathId}-burning-ring-gradient`;
  const fireCoreId = `${motionPathId}-burning-ring-core`;
  const topWakeId = `${motionPathId}-burning-ring-top-wake`;

  return (
    <>
      <defs>
        <linearGradient id={fireGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(86,16,10,0.58)" />
          <stop offset="22%" stopColor="rgba(126,30,14,0.76)" />
          <stop offset="52%" stopColor="rgba(170,92,34,0.72)" />
          <stop offset="78%" stopColor="rgba(112,28,12,0.68)" />
          <stop offset="100%" stopColor="rgba(70,14,8,0.52)" />
        </linearGradient>
        <linearGradient id={fireCoreId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(232,192,124,0.16)" />
          <stop offset="38%" stopColor="rgba(250,233,204,0.54)" />
          <stop offset="68%" stopColor="rgba(220,162,88,0.44)" />
          <stop offset="100%" stopColor="rgba(184,122,56,0.14)" />
        </linearGradient>
        <radialGradient
          id={topWakeId}
          cx="50%"
          cy="0%"
          r="72%"
          gradientTransform="translate(0 0) scale(1 0.7)"
        >
          <stop offset="0%" stopColor="rgba(248,226,198,0.7)" />
          <stop offset="22%" stopColor="rgba(196,114,48,0.42)" />
          <stop offset="50%" stopColor="rgba(116,30,14,0.18)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
      </defs>

      <path
        d={frame.path}
        fill="none"
        stroke="rgba(118,30,14,0.18)"
        strokeWidth={frame.strokeWidth + (detailMode === "visual" ? 5.2 : 4.1)}
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={`url(#${infernoFilterId})`}
        opacity={detailMode === "visual" ? 0.16 : 0.12}
        className="scoreboard-border-effect__beam"
      >
        <animate
          attributeName="opacity"
          values={detailMode === "visual" ? "0.12;0.2;0.15;0.12" : "0.1;0.16;0.12;0.1"}
          dur={`${motion.duration * 2.2}s`}
          repeatCount="indefinite"
        />
      </path>

      <path
        d={frame.path}
        fill="none"
        stroke={`url(#${fireGradientId})`}
        strokeWidth={frame.strokeWidth + (detailMode === "visual" ? 2.2 : 1.6)}
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={`url(#${infernoFilterId})`}
        opacity={0.58}
        className="scoreboard-border-effect__beam"
      >
        <animate
          attributeName="opacity"
          values="0.52;0.66;0.58;0.52"
          dur={`${motion.duration * 1.8}s`}
          repeatCount="indefinite"
        />
      </path>

      <path
        d={frame.path}
        fill="none"
        stroke={`url(#${fireCoreId})`}
        strokeWidth={Math.max(0.8, frame.strokeWidth - (detailMode === "visual" ? 2.7 : 3))}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={detailMode === "visual" ? 0.34 : 0.26}
      >
        <animate
          attributeName="opacity"
          values="0.22;0.34;0.26;0.22"
          dur={`${motion.duration * 2.1}s`}
          repeatCount="indefinite"
        />
      </path>

      <path
        d={frame.path}
        fill="none"
        stroke={`url(#${topWakeId})`}
        strokeWidth={frame.strokeWidth + (detailMode === "visual" ? 3.6 : 2.8)}
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={`url(#${infernoFilterId})`}
        opacity={detailMode === "visual" ? 0.12 : 0.1}
        className="scoreboard-border-effect__beam"
      >
        <animate
          attributeName="opacity"
          values="0.08;0.14;0.1;0.08"
          dur={`${Math.max(1.8, motion.duration * 1.9)}s`}
          repeatCount="indefinite"
        />
      </path>

    </>
  );
};

export const BurningFireCanvasOverlay: React.FC<
  BurningFireCanvasOverlayProps
> = ({ frame, theme, motion, variant }) => {
  const detailMode: FireDetailMode =
    variant === "preview" ? "visual" : "performance";

  return (
    <div
      className="scoreboard-border-effect__fire-overlay"
      aria-hidden="true"
    >
      <BurningFireCanvasLayer
        frame={frame}
        variant={variant}
        detailMode={detailMode}
        hotCore={theme.hotCore}
        hotEdge={theme.hotEdge}
        ember={theme.ember}
        duration={motion.duration}
      />
    </div>
  );
};

interface BurningFireCanvasLayerProps {
  frame: BurningFireRingFieldProps["frame"];
  variant: BorderEffectVariant;
  detailMode: FireDetailMode;
  hotCore: string;
  hotEdge: string;
  ember: string;
  duration: number;
}

const BurningFireCanvasLayer: React.FC<BurningFireCanvasLayerProps> = ({
  frame,
  variant,
  detailMode,
  hotCore,
  hotEdge,
  ember,
  duration,
}) => {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const emitters = React.useMemo(
    () => buildEmitters(frame, detailMode === "visual" ? 72 : 54),
    [detailMode, frame],
  );

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof window === "undefined") {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const dpr = Math.min(
      window.devicePixelRatio || 1,
      detailMode === "visual" ? 2 : 1.5,
    );
    const displayWidth = frame.outerWidth;
    const displayHeight = frame.outerHeight;
    canvas.width = Math.max(1, Math.round(displayWidth * dpr));
    canvas.height = Math.max(1, Math.round(displayHeight * dpr));
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;

    const config =
      detailMode === "visual"
        ? {
            maxParticles: 220,
            baseEmission: 0.58,
            minLife: 0.5,
            maxLife: 1.02,
            minSize: 4.6,
            maxSize: 9.6,
            minSpeed: 3.8,
            maxSpeed: 10.5,
            tangentDrift: 2.8,
            drag: 0.989,
            innerPull: 0.04,
          }
        : {
            maxParticles: 112,
            baseEmission: 0.34,
            minLife: 0.46,
            maxLife: 0.88,
            minSize: 4.2,
            maxSize: 8,
            minSpeed: 3.2,
            maxSpeed: 8.2,
            tangentDrift: 2.1,
            drag: 0.992,
            innerPull: 0.032,
          };

    const emissionCarry = emitters.map(() => Math.random());
    const flameSprite = createFireSprite({
      width: detailMode === "visual" ? 62 : 52,
      height: detailMode === "visual" ? 94 : 80,
      edgeColor: hotEdge,
      emberColor: ember,
    });
    const sparkSprite = createSparkSprite(hotCore, ember);
    const pool = createParticlePool(
      config.maxParticles + (detailMode === "visual" ? 18 : 8),
    );
    let frameId = 0;
    let lastTime = performance.now();
    let driftPhase = Math.random() * Math.PI * 2;
    const slowMode =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const spawnParticle = (emitter: FireEmitter) => {
      const heat = emitter.heat;
      const tangentialJitter = (Math.random() - 0.5) * config.tangentDrift;
      const normalSpeed = lerp(
        config.minSpeed,
        config.maxSpeed,
        Math.pow(Math.random(), 0.68),
      );
      const size = lerp(config.minSize, config.maxSize, Math.random()) * heat;
      const outwardLift =
        variant === "preview"
          ? 0.5 + Math.random() * 1.25
          : 0.35 + Math.random() * 0.82;
      const x = emitter.x + emitter.nx * outwardLift + emitter.tx * tangentialJitter;
      const y = emitter.y + emitter.ny * outwardLift + emitter.ty * tangentialJitter;
      const vx =
        emitter.nx * normalSpeed +
        emitter.tx * tangentialJitter * 0.85 +
        (Math.random() - 0.5) * 1.2;
      const vy =
        emitter.ny * normalSpeed +
        emitter.ty * tangentialJitter * 0.85 -
        Math.max(0, -emitter.ny) * 1.8;

      pool.spawn({
        x,
        y,
        vx,
        vy,
        life:
          lerp(config.minLife, config.maxLife, Math.random()) *
          (0.96 + heat * 0.12),
        age: 0,
        size,
        alpha: 0.24 + heat * 0.26 + Math.random() * 0.08,
        stretch: 0.82 + heat * 0.28 + Math.random() * 0.18,
        wobble: (Math.random() - 0.5) * 0.2,
        spin: (Math.random() - 0.5) * 0.26,
        rotation: (Math.random() - 0.5) * 0.14,
      });

      if (heat > (detailMode === "visual" ? 1.04 : 1.1) && Math.random() > 0.82) {
        pool.spawn({
          x,
          y,
          vx: vx * 0.48,
          vy: vy * 0.68,
          life: lerp(0.24, 0.44, Math.random()),
          age: 0,
          size: size * 0.56,
          alpha: 0.18 + Math.random() * 0.08,
          stretch: 0.94 + Math.random() * 0.16,
          wobble: (Math.random() - 0.5) * 0.26,
          spin: (Math.random() - 0.5) * 0.34,
          rotation: (Math.random() - 0.5) * 0.18,
        });
      }
    };

    const render = (now: number) => {
      const deltaSeconds = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      driftPhase +=
        deltaSeconds * (slowMode ? 0.11 : 0.24) * (1.1 / Math.max(1, duration));

      ctx.clearRect(0, 0, displayWidth, displayHeight);

      for (let index = 0; index < emitters.length; index += 1) {
        const emitter = emitters[index];
        const breathing = 0.88 + Math.sin(driftPhase + index * 0.22) * 0.06;
        emissionCarry[index] +=
          config.baseEmission *
          breathing *
          emitter.heat *
          (slowMode ? 0.35 : 1) *
          Math.max(0.42, deltaSeconds * 60);

        while (emissionCarry[index] >= 1) {
          spawnParticle(emitter);
          emissionCarry[index] -= 1;
        }
      }

      ctx.globalCompositeOperation = "lighter";
      pool.forEach((particle, activeIndex) => {
        const nextAge = particle.age + deltaSeconds;
        if (nextAge >= particle.life) {
          pool.remove(activeIndex);
          return;
        }

        pool.age[particle.id] = nextAge;
        const progress = nextAge / particle.life;
        const fade = Math.sin(progress * Math.PI);
        const flow = Math.max(0, 1 - progress * 0.72);
        const nextVx =
          particle.vx * config.drag +
          Math.sin(driftPhase + particle.wobble + progress * 2.4) * 0.045;
        const nextVy =
          particle.vy * config.drag -
          config.innerPull * progress +
          Math.cos(driftPhase * 0.52 + particle.wobble) * 0.022;
        const nextX = particle.x + nextVx * deltaSeconds * 60;
        const nextY = particle.y + nextVy * deltaSeconds * 60;
        pool.vx[particle.id] = nextVx;
        pool.vy[particle.id] = nextVy;
        pool.x[particle.id] = nextX;
        pool.y[particle.id] = nextY;

        const angle =
          Math.atan2(nextVy, nextVx) + Math.PI / 2 + particle.rotation;
        const drawWidth = particle.size * (0.78 + particle.stretch * 0.2) * flow;
        const drawHeight = particle.size * (1.2 + particle.stretch * 0.46) * flow;
        const alpha = particle.alpha * fade * (slowMode ? 0.82 : 1);

        ctx.save();
        ctx.translate(nextX, nextY);
        ctx.rotate(angle + Math.sin(driftPhase + particle.spin) * 0.016);
        ctx.globalAlpha = alpha;
        ctx.drawImage(
          flameSprite,
          -drawWidth * 0.5,
          -drawHeight * 0.78,
          drawWidth,
          drawHeight,
        );

        if (detailMode === "visual" && particle.size < config.minSize * 0.9) {
          const sparkSize = particle.size * (0.26 + fade * 0.1);
          ctx.globalAlpha = alpha * 0.26;
          ctx.drawImage(
            sparkSprite,
            -sparkSize * 0.5,
            -sparkSize * 0.75,
            sparkSize,
            sparkSize,
          );
        }

        ctx.restore();
      });

      frameId = window.requestAnimationFrame(render);
    };

    frameId = window.requestAnimationFrame(render);
    return () => window.cancelAnimationFrame(frameId);
  }, [
    detailMode,
    duration,
    emitters,
    ember,
    frame.outerHeight,
    frame.outerWidth,
    hotCore,
    hotEdge,
    variant,
  ]);

  return (
    <canvas
      ref={canvasRef}
      className="scoreboard-border-effect__fire-canvas"
      aria-hidden="true"
    />
  );
};

const buildEmitters = (
  frame: BurningFireRingFieldProps["frame"],
  count: number,
): FireEmitter[] => {
  const emitters: FireEmitter[] = [];
  const centerX = frame.inset + frame.width / 2;
  const distanceStep = frame.perimeter / count;

  for (let index = 0; index < count; index += 1) {
    const sample = sampleRoundedRect(frame, index * distanceStep);
    const xRatio = (sample.x - frame.inset) / frame.width;
    const yRatio = (sample.y - frame.inset) / frame.height;
    const centerBias = clamp(
      1 - Math.abs((sample.x - centerX) / (frame.width * 0.44)),
      0,
      1,
    );
    const topCenterHotspot =
      sample.ny < -0.55 ? gaussian2d(xRatio, yRatio, 0.5, 0.035, 0.14, 0.07) : 0;
    const upperLeftHotspot =
      sample.ny < -0.15 ? gaussian2d(xRatio, yRatio, 0.18, 0.13, 0.15, 0.12) : 0;
    const upperRightHotspot =
      sample.ny < -0.15 ? gaussian2d(xRatio, yRatio, 0.82, 0.13, 0.15, 0.12) : 0;
    const topWeight = sample.ny < -0.46 ? 0.94 + centerBias * 0.14 : 0;
    const sideWeight = Math.abs(sample.nx) > 0.6 ? 0.84 : 0;
    const bottomWeight = sample.ny > 0.55 ? 0.78 : 0;
    const curvatureBoost =
      Math.abs(sample.nx) > 0.38 && Math.abs(sample.ny) > 0.38 ? 0.06 : 0;
    const heat =
      Math.max(topWeight, sideWeight, bottomWeight) +
      topCenterHotspot * 0.48 +
      (upperLeftHotspot + upperRightHotspot) * 0.22 +
      curvatureBoost;

    emitters.push({
      ...sample,
      heat,
    });
  }

  return emitters;
};

const sampleRoundedRect = (
  frame: BurningFireRingFieldProps["frame"],
  rawDistance: number,
): FireEmitter => {
  const straightHalf = frame.width / 2 - frame.radius;
  const straightFull = frame.width - frame.radius * 2;
  const vertical = frame.height - frame.radius * 2;
  const arc = (Math.PI * frame.radius) / 2;
  const segments = [
    straightHalf,
    arc,
    vertical,
    arc,
    straightFull,
    arc,
    vertical,
    arc,
    straightHalf,
  ];
  const total = segments.reduce((sum, segment) => sum + segment, 0);
  let distance = ((rawDistance % total) + total) % total;
  const left = frame.inset;
  const right = frame.inset + frame.width;
  const top = frame.inset;
  const bottom = frame.inset + frame.height;
  const leftInner = left + frame.radius;
  const rightInner = right - frame.radius;
  const topArcStart = top + frame.radius;
  const bottomArcStart = bottom - frame.radius;
  const centerX = left + frame.width / 2;

  if (distance <= straightHalf) {
    return {
      x: centerX + distance,
      y: top,
      tx: 1,
      ty: 0,
      nx: 0,
      ny: -1,
      heat: 1,
    };
  }
  distance -= straightHalf;

  if (distance <= arc) {
    const theta = -Math.PI / 2 + distance / frame.radius;
    return sampleArc(rightInner, topArcStart, theta, frame.radius);
  }
  distance -= arc;

  if (distance <= vertical) {
    return {
      x: right,
      y: topArcStart + distance,
      tx: 0,
      ty: 1,
      nx: 1,
      ny: 0,
      heat: 1,
    };
  }
  distance -= vertical;

  if (distance <= arc) {
    const theta = distance / frame.radius;
    return sampleArc(rightInner, bottomArcStart, theta, frame.radius);
  }
  distance -= arc;

  if (distance <= straightFull) {
    return {
      x: rightInner - distance,
      y: bottom,
      tx: -1,
      ty: 0,
      nx: 0,
      ny: 1,
      heat: 1,
    };
  }
  distance -= straightFull;

  if (distance <= arc) {
    const theta = Math.PI / 2 + distance / frame.radius;
    return sampleArc(leftInner, bottomArcStart, theta, frame.radius);
  }
  distance -= arc;

  if (distance <= vertical) {
    return {
      x: left,
      y: bottomArcStart - distance,
      tx: 0,
      ty: -1,
      nx: -1,
      ny: 0,
      heat: 1,
    };
  }
  distance -= vertical;

  if (distance <= arc) {
    const theta = Math.PI + distance / frame.radius;
    return sampleArc(leftInner, topArcStart, theta, frame.radius);
  }
  distance -= arc;

  return {
    x: leftInner + distance,
    y: top,
    tx: 1,
    ty: 0,
    nx: 0,
    ny: -1,
    heat: 1,
  };
};

const sampleArc = (
  cx: number,
  cy: number,
  theta: number,
  radius = 1,
): FireEmitter => ({
  x: cx + Math.cos(theta) * radius,
  y: cy + Math.sin(theta) * radius,
  tx: -Math.sin(theta),
  ty: Math.cos(theta),
  nx: Math.cos(theta),
  ny: Math.sin(theta),
  heat: 1,
});

const createFireSprite = ({
  width,
  height,
  edgeColor,
  emberColor,
}: {
  width: number;
  height: number;
  edgeColor: string;
  emberColor: string;
}) => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return canvas;
  }

  const outer = ctx.createRadialGradient(
    width * 0.5,
    height * 0.72,
    2,
    width * 0.5,
    height * 0.72,
    width * 0.56,
  );
  outer.addColorStop(0, "rgba(246,186,102,0.34)");
  outer.addColorStop(0.18, emberColor);
  outer.addColorStop(0.52, edgeColor);
  outer.addColorStop(1, "rgba(84,18,12,0)");

  ctx.fillStyle = outer;
  ctx.beginPath();
  ctx.ellipse(width * 0.5, height * 0.72, width * 0.42, height * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();

  const tongue = ctx.createLinearGradient(0, height, 0, 0);
  tongue.addColorStop(0, "rgba(184,72,28,0)");
  tongue.addColorStop(0.14, "rgba(212,92,34,0.28)");
  tongue.addColorStop(0.48, "rgba(168,44,18,0.72)");
  tongue.addColorStop(0.78, edgeColor);
  tongue.addColorStop(1, "rgba(92,18,10,0)");

  ctx.fillStyle = tongue;
  ctx.beginPath();
  ctx.moveTo(width * 0.5, height * 0.06);
  ctx.bezierCurveTo(
    width * 0.8,
    height * 0.28,
    width * 0.76,
    height * 0.62,
    width * 0.56,
    height * 0.94,
  );
  ctx.bezierCurveTo(
    width * 0.54,
    height * 0.78,
    width * 0.42,
    height * 0.76,
    width * 0.44,
    height * 0.94,
  );
  ctx.bezierCurveTo(
    width * 0.24,
    height * 0.62,
    width * 0.2,
    height * 0.28,
    width * 0.5,
    height * 0.06,
  );
  ctx.closePath();
  ctx.fill();

  return canvas;
};

const createSparkSprite = (coreColor: string, emberColor: string) => {
  const canvas = document.createElement("canvas");
  canvas.width = 40;
  canvas.height = 40;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return canvas;
  }

  const gradient = ctx.createRadialGradient(20, 20, 1, 20, 20, 18);
  gradient.addColorStop(0, coreColor);
  gradient.addColorStop(0.28, emberColor);
  gradient.addColorStop(1, "rgba(255,120,40,0)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(20, 20, 18, 0, Math.PI * 2);
  ctx.fill();

  return canvas;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const lerp = (start: number, end: number, amount: number) =>
  start + (end - start) * amount;

const gaussian2d = (
  x: number,
  y: number,
  cx: number,
  cy: number,
  sx: number,
  sy: number,
) => {
  const dx = (x - cx) / sx;
  const dy = (y - cy) / sy;
  return Math.exp(-(dx * dx + dy * dy));
};

interface ParticleSeed {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  age: number;
  size: number;
  alpha: number;
  stretch: number;
  wobble: number;
  spin: number;
  rotation: number;
}

const createParticlePool = (capacity: number) => {
  const map = new Uint16Array(capacity);
  const x = new Float32Array(capacity);
  const y = new Float32Array(capacity);
  const vx = new Float32Array(capacity);
  const vy = new Float32Array(capacity);
  const life = new Float32Array(capacity);
  const age = new Float32Array(capacity);
  const size = new Float32Array(capacity);
  const alpha = new Float32Array(capacity);
  const stretch = new Float32Array(capacity);
  const wobble = new Float32Array(capacity);
  const spin = new Float32Array(capacity);
  const rotation = new Float32Array(capacity);
  let length = 0;
  let nextIndex = 0;

  const remove = (activeIndex: number) => {
    length = Math.max(0, length - 1);
    map[activeIndex] = map[length];
  };

  return {
    x,
    y,
    vx,
    vy,
    age,
    spawn(seed: ParticleSeed) {
      if (length >= capacity) {
        return;
      }
      x[nextIndex] = seed.x;
      y[nextIndex] = seed.y;
      vx[nextIndex] = seed.vx;
      vy[nextIndex] = seed.vy;
      life[nextIndex] = seed.life;
      age[nextIndex] = seed.age;
      size[nextIndex] = seed.size;
      alpha[nextIndex] = seed.alpha;
      stretch[nextIndex] = seed.stretch;
      wobble[nextIndex] = seed.wobble;
      spin[nextIndex] = seed.spin;
      rotation[nextIndex] = seed.rotation;
      map[length] = nextIndex;
      length += 1;
      nextIndex = nextIndex === capacity - 1 ? 0 : nextIndex + 1;
    },
    remove,
    forEach(
      fn: (
        particle: {
          id: number;
          x: number;
          y: number;
          vx: number;
          vy: number;
          life: number;
          age: number;
          size: number;
          alpha: number;
          stretch: number;
          wobble: number;
          spin: number;
          rotation: number;
        },
        activeIndex: number,
      ) => void,
    ) {
      let activeIndex = 0;
      while (activeIndex < length) {
        const id = map[activeIndex];
        fn(
          {
            id,
            x: x[id],
            y: y[id],
            vx: vx[id],
            vy: vy[id],
            life: life[id],
            age: age[id],
            size: size[id],
            alpha: alpha[id],
            stretch: stretch[id],
            wobble: wobble[id],
            spin: spin[id],
            rotation: rotation[id],
          },
          activeIndex,
        );
        activeIndex += 1;
      }
    },
  };
};

export default BurningFireRingField;
