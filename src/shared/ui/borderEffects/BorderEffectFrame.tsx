import React from "react";

import type {
  BorderEffectMotionConfig,
  BorderEffectThemeConfig,
  BorderEffectVariant,
} from "./borderEffectThemes";
import BurningFireRingField, {
  BurningFireCanvasOverlay,
} from "./BurningFireRingField";

interface BorderEffectFrameProps {
  theme: BorderEffectThemeConfig;
  motion: BorderEffectMotionConfig;
  variant?: BorderEffectVariant;
  className?: string;
}

const DEFAULT_VIEWBOX = { width: 100, height: 40 };

type BorderFrame = {
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

const BorderEffectFrame: React.FC<BorderEffectFrameProps> = ({
  theme,
  motion,
  variant = "attached",
  className,
}) => {
  const svgRef = React.useRef<SVGSVGElement | null>(null);
  const instanceId = React.useId().replace(/:/g, "-");
  const [frameMetrics, setFrameMetrics] = React.useState({
    width: DEFAULT_VIEWBOX.width,
    height: DEFAULT_VIEWBOX.height,
    radius: variant === "preview" ? 18 : 14,
    borderWidth: 1,
  });
  const frame = React.useMemo(
    () =>
      createBorderFrame(
        frameMetrics.width,
        frameMetrics.height,
        variant,
        frameMetrics.radius,
        frameMetrics.borderWidth,
      ),
    [
      frameMetrics.borderWidth,
      frameMetrics.height,
      frameMetrics.radius,
      frameMetrics.width,
      variant,
    ],
  );

  React.useLayoutEffect(() => {
    const element = svgRef.current;
    if (!element || typeof ResizeObserver === "undefined") {
      return;
    }

    const updateSize = () => {
      const nextWidth = Math.max(1, element.clientWidth || DEFAULT_VIEWBOX.width);
      const nextHeight = Math.max(1, element.clientHeight || DEFAULT_VIEWBOX.height);
      const parentStyle = window.getComputedStyle(element.parentElement ?? element);
      const nextRadius =
        parseFloat(parentStyle.borderTopLeftRadius) ||
        (variant === "preview" ? 18 : 14);
      const nextBorderWidth = parseFloat(parentStyle.borderTopWidth) || 1;

      setFrameMetrics((prev) =>
        prev.width === nextWidth &&
        prev.height === nextHeight &&
        prev.radius === nextRadius &&
        prev.borderWidth === nextBorderWidth
          ? prev
          : {
              width: nextWidth,
              height: nextHeight,
              radius: nextRadius,
              borderWidth: nextBorderWidth,
            },
      );
    };

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, [variant]);

  const glowFilterId = `${instanceId}-glow`;
  const infernoFilterId = `${instanceId}-inferno`;
  const motionPathId = `${instanceId}-path`;

  return (
    <div
      className={`${className ?? ""} scoreboard-border-effect scoreboard-border-effect--${variant} scoreboard-border-effect--theme-${theme.id}`.trim()}
      aria-hidden="true"
    >
      <svg
        ref={svgRef}
        className="scoreboard-border-effect__svg"
        viewBox={`0 0 ${frameMetrics.width} ${frameMetrics.height}`}
        preserveAspectRatio="none"
        shapeRendering="geometricPrecision"
      >
      <defs>
        <path id={motionPathId} d={frame.path} />

        <filter id={glowFilterId} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="2.4" result="blurred" />
          <feMerge>
            <feMergeNode in="blurred" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter
          id={infernoFilterId}
          x="-80%"
          y="-80%"
          width="260%"
          height="260%"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.015 0.22"
            numOctaves="2"
            seed="17"
            result="noise"
          >
            <animate
              attributeName="baseFrequency"
              values="0.014 0.18;0.018 0.26;0.013 0.21;0.014 0.18"
              dur="1.2s"
              repeatCount="indefinite"
            />
          </feTurbulence>
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="4.6"
            xChannelSelector="R"
            yChannelSelector="G"
            result="warped"
          />
          <feGaussianBlur in="warped" stdDeviation="1.4" result="softened" />
          <feMerge>
            <feMergeNode in="softened" />
            <feMergeNode in="warped" />
          </feMerge>
        </filter>

      </defs>

        {variant === "preview" ? (
        <>
          <path
            d={frame.path}
            fill="none"
            stroke={theme.trackGlow}
            strokeWidth={frame.strokeWidth + 1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={`url(#${glowFilterId})`}
            className="scoreboard-border-effect__track scoreboard-border-effect__track--glow"
          />
          <path
            d={frame.path}
            fill="none"
            stroke={theme.trackStroke}
            strokeWidth="0.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="scoreboard-border-effect__track scoreboard-border-effect__track--line"
          />
        </>
        ) : null}

        {theme.renderMode === "burning-fire" ? (
          <BurningFireRingField
            frame={frame}
            theme={theme}
            motion={motion}
            variant={variant}
            infernoFilterId={infernoFilterId}
            motionPathId={motionPathId}
          />
        ) : theme.renderMode === "real-fire" ? (
        <RealFireField
          frame={frame}
          theme={theme}
          motion={motion}
          glowFilterId={glowFilterId}
        />
      ) : theme.renderMode === "simple-fire" ? (
        <SimpleFireField
          frame={frame}
          theme={theme}
          motion={motion}
          glowFilterId={glowFilterId}
        />
      ) : theme.renderMode === "dual-water-fire" ? (
        <DualWaterFireField
          frame={frame}
          theme={theme}
          motion={motion}
          glowFilterId={glowFilterId}
        />
      ) : theme.renderMode === "rainbow-energy" ? (
        <RainbowEnergyField
          frame={frame}
          theme={theme}
          motion={motion}
          glowFilterId={glowFilterId}
        />
      ) : theme.renderMode === "electric-arc" ? (
        <ElectricArcField
          frame={frame}
          theme={theme}
          motion={motion}
          variant={variant}
          glowFilterId={glowFilterId}
          motionPathId={motionPathId}
        />
        ) : (
        <EnergyField
          frame={frame}
          theme={theme}
          motion={motion}
          glowFilterId={glowFilterId}
        />
        )}

        <BeamMotionLayer
          frame={frame}
          theme={theme}
          motion={motion}
          variant={variant}
          glowFilterId={glowFilterId}
          motionPathId={motionPathId}
        />
      </svg>
      {theme.renderMode === "burning-fire" ? (
        <BurningFireCanvasOverlay
          frame={frame}
          theme={theme}
          motion={motion}
          variant={variant}
        />
      ) : null}
    </div>
  );
};

interface SimpleFireFieldProps {
  frame: BorderFrame;
  theme: BorderEffectThemeConfig;
  motion: BorderEffectMotionConfig;
  glowFilterId: string;
}

const SimpleFireField: React.FC<SimpleFireFieldProps> = ({
  frame,
  theme,
  motion,
  glowFilterId,
}) => (
  <>
    <path
      d={frame.path}
      fill="none"
      stroke="rgba(255,190,98,0.12)"
      strokeWidth={frame.strokeWidth + 4.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      filter={`url(#${glowFilterId})`}
      opacity={0.42}
      className="scoreboard-border-effect__beam"
      >
      <animate
        attributeName="opacity"
        values="0.34;0.46;0.38;0.34"
        dur={`${motion.duration * 1.22}s`}
        repeatCount="indefinite"
      />
    </path>
    <path
      d={frame.path}
      fill="none"
      stroke={theme.hotEdge}
      strokeWidth={frame.strokeWidth + 1.05}
      strokeLinecap="round"
      strokeLinejoin="round"
      filter={`url(#${glowFilterId})`}
      opacity={0.28}
      className="scoreboard-border-effect__beam"
    />
    <path
      d={frame.path}
      fill="none"
      stroke={theme.energyCoreSoft}
      strokeWidth={Math.max(0.9, frame.strokeWidth - 1.8)}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={0.36}
      className="scoreboard-border-effect__beam"
    />
  </>
);

interface RealFireFieldProps {
  frame: BorderFrame;
  theme: BorderEffectThemeConfig;
  motion: BorderEffectMotionConfig;
  glowFilterId: string;
}

const RealFireField: React.FC<RealFireFieldProps> = ({
  frame,
  theme,
  motion,
  glowFilterId,
}) => (
  <>
    <path
      d={frame.path}
      fill="none"
      stroke="rgba(255,196,92,0.09)"
      strokeWidth={frame.strokeWidth + 4.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      filter={`url(#${glowFilterId})`}
      opacity={0.34}
      className="scoreboard-border-effect__beam"
      >
      <animate
        attributeName="opacity"
        values="0.28;0.38;0.32;0.28"
        dur={`${motion.duration * 1.08}s`}
        repeatCount="indefinite"
      />
    </path>
    <path
      d={frame.path}
      fill="none"
      stroke={theme.hotEdge}
      strokeWidth={frame.strokeWidth + 1.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      filter={`url(#${glowFilterId})`}
      opacity={0.34}
      className="scoreboard-border-effect__beam"
    />
    <path
      d={frame.path}
      fill="none"
      stroke={theme.energyCore}
      strokeWidth={Math.max(0.95, frame.strokeWidth - 1.45)}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={0.42}
      className="scoreboard-border-effect__beam"
    />
  </>
);

interface EnergyFieldProps {
  frame: BorderFrame;
  theme: BorderEffectThemeConfig;
  motion: BorderEffectMotionConfig;
  glowFilterId: string;
}

const EnergyField: React.FC<EnergyFieldProps> = ({
  frame,
  theme,
  glowFilterId,
}) => (
  <>
    <path
      d={frame.path}
      fill="none"
      stroke={theme.energyGlow}
      strokeWidth={frame.strokeWidth + 3.1}
      strokeLinecap="round"
      strokeLinejoin="round"
      filter={`url(#${glowFilterId})`}
      opacity={0.18}
      className="scoreboard-border-effect__beam"
    />
    <path
      d={frame.path}
      fill="none"
      stroke={theme.hotEdge}
      strokeWidth={frame.strokeWidth + 0.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      filter={`url(#${glowFilterId})`}
      opacity={0.32}
      className="scoreboard-border-effect__beam"
    />
    <path
      d={frame.path}
      fill="none"
      stroke={theme.energyCoreSoft}
      strokeWidth={Math.max(0.95, frame.strokeWidth - 1.3)}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={0.4}
      className="scoreboard-border-effect__beam"
    />
  </>
);

/*
interface InfernoFieldProps {
  frame: BorderFrame;
  theme: BorderEffectThemeConfig;
  motion: BorderEffectMotionConfig;
  variant: BorderEffectVariant;
  infernoFilterId: string;
  emberFilterId: string;
  motionPathId: string;
}

const BurningFireField: React.FC<InfernoFieldProps> = ({
  frame,
  theme,
  motion,
  variant,
  infernoFilterId,
  emberFilterId,
  motionPathId,
}) => {
  const detailMode = variant === "preview" ? "visual" : "performance";
  const heatGradientId = `${motionPathId}-burning-heat-gradient`;
  const hotspotGradientId = `${motionPathId}-burning-hotspot-gradient`;
  const heatMaskId = `${motionPathId}-burning-heat-mask`;
  const moltenMaskId = `${motionPathId}-burning-molten-mask`;

  return (
    <>
      <defs>
        <radialGradient
          id={heatGradientId}
          cx="50%"
          cy="9%"
          r="74%"
          gradientTransform="translate(0 0) scale(0.92 0.64)"
        >
          <stop offset="0%" stopColor="rgba(255,250,236,0.94)" />
          <stop offset="16%" stopColor="rgba(255,232,170,0.84)" />
          <stop offset="32%" stopColor="rgba(255,178,92,0.6)" />
          <stop offset="52%" stopColor="rgba(255,102,46,0.2)" />
          <stop offset="76%" stopColor="rgba(255,68,20,0.05)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
        <radialGradient
          id={hotspotGradientId}
          cx="50%"
          cy="5.5%"
          r="30%"
          gradientTransform="translate(0 0) scale(0.72 0.44)"
        >
          <stop offset="0%" stopColor="rgba(255,248,232,0.82)" />
          <stop offset="20%" stopColor="rgba(255,222,166,0.72)" />
          <stop offset="48%" stopColor="rgba(255,158,72,0.28)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
        <mask id={heatMaskId}>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="black"
          />
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill={`url(#${heatGradientId})`}
          />
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill={`url(#${hotspotGradientId})`}
            opacity="0.92"
          />
        </mask>
        <radialGradient
          id={`${moltenMaskId}-center`}
          cx="50%"
          cy="34%"
          r="90%"
          gradientTransform="translate(0 0) scale(1.08 0.96)"
        >
          <stop offset="0%" stopColor="rgba(255,196,112,0.72)" />
          <stop offset="18%" stopColor="rgba(255,144,72,0.54)" />
          <stop offset="42%" stopColor="rgba(255,88,34,0.3)" />
          <stop offset="72%" stopColor="rgba(255,58,22,0.12)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
        <radialGradient
          id={`${moltenMaskId}-corners`}
          cx="50%"
          cy="50%"
          r="78%"
          gradientTransform="translate(0 0) scale(1.04 1)"
        >
          <stop offset="0%" stopColor="rgba(0,0,0,0)" />
          <stop offset="60%" stopColor="rgba(255,124,52,0.14)" />
          <stop offset="82%" stopColor="rgba(255,178,96,0.28)" />
          <stop offset="100%" stopColor="rgba(255,224,166,0.4)" />
        </radialGradient>
        <mask id={moltenMaskId}>
          <rect x="0" y="0" width="100%" height="100%" fill="black" />
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill={`url(#${moltenMaskId}-center)`}
          />
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill={`url(#${moltenMaskId}-corners)`}
            opacity="0.7"
          />
        </mask>
      </defs>

      <BurningFireMoltenBase
        frame={frame}
        infernoFilterId={infernoFilterId}
        moltenMaskId={moltenMaskId}
        detailMode={detailMode}
      />

      <BurningFireMoltenVeins
        frame={frame}
        infernoFilterId={infernoFilterId}
        hotEdge={theme.hotEdge}
        hotCore={theme.hotCore}
        detailMode={detailMode}
      />

      <BurningFireFlameSheet
        infernoFilterId={infernoFilterId}
        motionPathId={motionPathId}
        hotEdge={theme.hotEdge}
        hotCore={theme.hotCore}
        detailMode={detailMode}
      />

      <path
        d={frame.path}
        fill="none"
        stroke="rgba(255,74,30,0.07)"
        strokeWidth={frame.strokeWidth + 8.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={`url(#${infernoFilterId})`}
        opacity={0.12}
        mask={`url(#${heatMaskId})`}
        className="scoreboard-border-effect__beam"
      >
        <animate
          attributeName="opacity"
          values="0.08;0.16;0.1;0.08"
          dur="1.44s"
          repeatCount="indefinite"
        />
      </path>

      <g mask={`url(#${heatMaskId})`}>
        <BurningFireHeatStress
          frame={frame}
          infernoFilterId={infernoFilterId}
          detailMode={detailMode}
        />

        <path
          d={frame.path}
          fill="none"
          stroke="rgba(255,74,26,0.18)"
          strokeWidth={frame.strokeWidth + 3.9}
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#${infernoFilterId})`}
          opacity={0.16}
          className="scoreboard-border-effect__beam"
        >
          <animate
            attributeName="opacity"
            values="0.1;0.2;0.14;0.1"
            dur="1.18s"
            repeatCount="indefinite"
          />
        </path>

        <path
          d={frame.path}
          fill="none"
          stroke="rgba(255,138,56,0.18)"
          strokeWidth={frame.strokeWidth + 1.3}
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#${infernoFilterId})`}
          opacity={0.18}
          className="scoreboard-border-effect__beam"
        >
          <animate
            attributeName="opacity"
            values="0.12;0.22;0.16;0.12"
            dur="1.04s"
            repeatCount="indefinite"
          />
        </path>

        <path
          d={frame.path}
          fill="none"
          stroke="rgba(255,240,214,0.34)"
          strokeWidth={frame.strokeWidth - 2.55}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.12}
          className="scoreboard-border-effect__beam"
        >
          <animate
            attributeName="opacity"
            values="0.06;0.16;0.1;0.06"
            dur="0.98s"
            repeatCount="indefinite"
          />
        </path>

        <BurningFireHotspots
          frame={frame}
          infernoFilterId={infernoFilterId}
          hotCore={theme.hotCore}
          hotEdge={theme.energyCoreSoft}
          detailMode={detailMode}
        />

        <BurningFireClusters
          infernoFilterId={infernoFilterId}
          hotEdge={theme.hotEdge}
          detailMode={detailMode}
        />

        <BurningFireMass
          hotEdge={theme.hotEdge}
          hotCore={theme.hotCore}
          infernoFilterId={infernoFilterId}
          detailMode={detailMode}
        />
      </g>

      <BurningFireThermalAura
        frame={frame}
        infernoFilterId={infernoFilterId}
        moltenMaskId={moltenMaskId}
        detailMode={detailMode}
      />

      <BurningFireTongues
        motion={motion}
        hotEdge={theme.hotEdge}
        hotCore={theme.hotCore}
        infernoFilterId={infernoFilterId}
        motionPathId={motionPathId}
        heatMaskId={heatMaskId}
        detailMode={detailMode}
      />

      <BurningFireEmbers
        emberColor={theme.ember}
        emberGlow={theme.emberGlow}
        emberFilterId={emberFilterId}
        motionPathId={motionPathId}
        heatMaskId={heatMaskId}
        detailMode={detailMode}
      />
    </>
  );
};

interface BurningFireTonguesProps {
  motion: BorderEffectMotionConfig;
  hotEdge: string;
  hotCore: string;
  infernoFilterId: string;
  motionPathId: string;
  heatMaskId: string;
  detailMode: BurningFireDetailMode;
}

const BurningFireTongues: React.FC<BurningFireTonguesProps> = ({
  motion,
  hotEdge,
  hotCore,
  infernoFilterId,
  motionPathId,
  heatMaskId,
  detailMode,
}) => {
  const flameTongues =
    detailMode === "visual"
      ? [
    {
      position: 0.978,
      drift: 0.015,
      peak: 1.28,
      width: 18,
      height: 24,
      lean: -5.2,
      opacity: 0.28,
      fork: false,
    },
    {
      position: 0.968,
      drift: 0.016,
      peak: 1.34,
      width: 16,
      height: 20,
      lean: -3.4,
      opacity: 0.22,
      fork: false,
    },
    {
      position: 0.988,
      drift: 0.018,
      peak: 1.62,
      width: 22,
      height: 30,
      lean: -6.2,
      opacity: 0.46,
      fork: true,
    },
    {
      position: 0.996,
      drift: 0.019,
      peak: 1.92,
      width: 28,
      height: 40,
      lean: -2.8,
      opacity: 0.82,
      fork: true,
    },
    {
      position: 0.007,
      drift: 0.019,
      peak: 2.04,
      width: 30,
      height: 44,
      lean: 3.6,
      opacity: 0.96,
      fork: true,
    },
    {
      position: 0.021,
      drift: 0.017,
      peak: 1.76,
      width: 24,
      height: 34,
      lean: 5.6,
      opacity: 0.62,
      fork: true,
    },
    {
      position: 0.044,
      drift: 0.014,
      peak: 1.28,
      width: 18,
      height: 22,
      lean: 4.6,
      opacity: 0.32,
      fork: false,
    },
    {
      position: 0.032,
      drift: 0.014,
      peak: 1.46,
      width: 20,
      height: 28,
      lean: 3.2,
      opacity: 0.36,
      fork: false,
    },
    {
      position: 0.116,
      drift: 0.012,
      peak: 0.9,
      width: 10,
      height: 11,
      lean: 2,
      opacity: 0.07,
      fork: false,
    },
    {
      position: 0.884,
      drift: 0.012,
      peak: 0.9,
      width: 10,
      height: 11,
      lean: -1.8,
      opacity: 0.07,
      fork: false,
    },
        ]
      : [
          {
            position: 0.982,
            drift: 0.012,
            peak: 1.16,
            width: 14,
            height: 18,
            lean: -3.8,
            opacity: 0.18,
            fork: false,
          },
          {
            position: 0.992,
            drift: 0.015,
            peak: 1.56,
            width: 22,
            height: 30,
            lean: -2.2,
            opacity: 0.52,
            fork: true,
          },
          {
            position: 0.008,
            drift: 0.016,
            peak: 1.72,
            width: 24,
            height: 34,
            lean: 3,
            opacity: 0.66,
            fork: true,
          },
          {
            position: 0.024,
            drift: 0.014,
            peak: 1.38,
            width: 18,
            height: 24,
            lean: 4.6,
            opacity: 0.34,
            fork: true,
          },
          {
            position: 0.052,
            drift: 0.011,
            peak: 1.08,
            width: 12,
            height: 14,
            lean: 3.8,
            opacity: 0.16,
            fork: false,
          },
          {
            position: 0.884,
            drift: 0.01,
            peak: 0.88,
            width: 8,
            height: 9,
            lean: -1.6,
            opacity: 0.05,
            fork: false,
          },
        ];
  const baseDuration = Math.max(7.4, motion.duration * 5.9);

  return (
    <g mask={`url(#${heatMaskId})`}>
      {flameTongues.map((tongue, index) => {
        const begin = -(baseDuration * tongue.position);
        const motionDuration = baseDuration + index * 0.04;
        const flickerDuration = 0.84 + (index % 3) * 0.18;
        const fromPoint = Math.max(0, tongue.position - tongue.drift * 0.38);
        const centerPoint = tongue.position;
        const toPoint = Math.min(0.999, tongue.position + tongue.drift);

        return (
          <g key={`burning-tongue-${index}`} filter={`url(#${infernoFilterId})`}>
            <animateMotion
              dur={`${motionDuration}s`}
              begin={`${begin}s`}
              repeatCount="indefinite"
              rotate="auto"
              keyPoints={`${fromPoint};${centerPoint};${toPoint};${centerPoint};${fromPoint}`}
              keyTimes="0;0.28;0.56;0.82;1"
              calcMode="spline"
              keySplines="0.32 0 0.2 1;0.32 0 0.2 1;0.32 0 0.2 1;0.32 0 0.2 1"
            >
              <mpath href={`#${motionPathId}`} />
            </animateMotion>
            <animateTransform
              attributeName="transform"
              type="translate"
              additive="sum"
              values={`${tongue.lean * 0.18} 0;${tongue.lean * 0.42} ${-tongue.height * 0.32};${tongue.lean * 1.12} ${-tongue.height * 0.92};${tongue.lean * 0.28} ${-tongue.height * 0.24};${tongue.lean * 0.18} 0`}
              dur={`${flickerDuration}s`}
              repeatCount="indefinite"
            />
            <animateTransform
              attributeName="transform"
              type="scale"
              additive="sum"
              values={`0.96 0.84;1.06 ${tongue.peak};0.92 1.02;0.96 0.84`}
              dur={`${flickerDuration}s`}
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values={`${tongue.opacity * 0.52};${tongue.opacity};${tongue.opacity * 0.72};${tongue.opacity * 0.58};${tongue.opacity * 0.52}`}
              dur={`${flickerDuration}s`}
              repeatCount="indefinite"
            />
            <path
              d={
                tongue.fork
                  ? `M 0 0 C ${tongue.width * 0.56} ${-tongue.height * 0.08}, ${tongue.width * 0.58} ${-tongue.height * 0.36}, ${tongue.width * 0.18} ${-tongue.height * 0.64} C ${tongue.width * 0.04} ${-tongue.height * 0.86}, ${tongue.width * 0.14} ${-tongue.height * 0.94}, 0 ${-tongue.height} C ${-tongue.width * 0.14} ${-tongue.height * 0.92}, ${-tongue.width * 0.08} ${-tongue.height * 0.82}, ${-tongue.width * 0.2} ${-tongue.height * 0.62} C ${-tongue.width * 0.56} ${-tongue.height * 0.38}, ${-tongue.width * 0.52} ${-tongue.height * 0.1}, 0 0 Z`
                  : `M 0 0 C ${tongue.width * 0.62} ${-tongue.height * 0.06}, ${tongue.width * 0.58} ${-tongue.height * 0.34}, ${tongue.width * 0.2} ${-tongue.height * 0.68} C ${tongue.width * 0.06} ${-tongue.height * 0.88}, 0 ${-tongue.height * 0.96}, ${-tongue.width * 0.08} ${-tongue.height * 0.86} C ${-tongue.width * 0.22} ${-tongue.height * 0.7}, ${-tongue.width * 0.56} ${-tongue.height * 0.36}, ${-tongue.width * 0.62} ${-tongue.height * 0.08}, 0 0 Z`
              }
              fill={hotEdge}
            />
            <path
              d={`M 0 ${-1} C ${tongue.width * 0.28} ${-tongue.height * 0.14}, ${tongue.width * 0.24} ${-tongue.height * 0.42}, ${tongue.width * 0.08} ${-tongue.height * 0.62} C 0 ${-tongue.height * 0.76}, ${-tongue.width * 0.08} ${-tongue.height * 0.64}, ${-tongue.width * 0.16} ${-tongue.height * 0.48} C ${-tongue.width * 0.22} ${-tongue.height * 0.24}, ${-tongue.width * 0.22} ${-tongue.height * 0.12}, 0 ${-1} Z`}
              fill={hotCore}
              opacity="0.46"
            />
          </g>
        );
      })}
    </g>
  );
};

interface BurningFireHeatStressProps {
  frame: BorderFrame;
  infernoFilterId: string;
  detailMode: BurningFireDetailMode;
}

const BurningFireHeatStress: React.FC<BurningFireHeatStressProps> = ({
  frame,
  infernoFilterId,
  detailMode,
}) => {
  const charSegments = (
    detailMode === "visual"
      ? [
          { offsetRatio: 0.952, beamRatio: 0.04, width: frame.strokeWidth + 0.8, opacity: 0.18 },
          { offsetRatio: 0.982, beamRatio: 0.036, width: frame.strokeWidth + 0.8, opacity: 0.18 },
          { offsetRatio: 0.998, beamRatio: 0.048, width: frame.strokeWidth + 1.2, opacity: 0.3 },
          { offsetRatio: 0.024, beamRatio: 0.05, width: frame.strokeWidth + 1.1, opacity: 0.26 },
          { offsetRatio: 0.742, beamRatio: 0.032, width: frame.strokeWidth + 0.75, opacity: 0.16 },
        ]
      : [
          { offsetRatio: 0.982, beamRatio: 0.036, width: frame.strokeWidth + 0.8, opacity: 0.18 },
          { offsetRatio: 0.998, beamRatio: 0.048, width: frame.strokeWidth + 1.2, opacity: 0.3 },
          { offsetRatio: 0.024, beamRatio: 0.05, width: frame.strokeWidth + 1.1, opacity: 0.26 },
        ]
  );

  return (
    <>
      {charSegments.map((segment, index) => {
        const dashLength = Math.max(5, frame.perimeter * segment.beamRatio);
        const gapLength = Math.max(1, frame.perimeter - dashLength);
        const dashOffset = frame.perimeter * segment.offsetRatio;

        return (
          <path
            key={`burning-stress-${index}`}
            d={frame.path}
            fill="none"
            stroke="rgba(30,10,2,0.46)"
            strokeWidth={segment.width}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={`${dashLength} ${gapLength}`}
            strokeDashoffset={dashOffset}
            opacity={segment.opacity}
            filter={`url(#${infernoFilterId})`}
          >
            <animate
              attributeName="opacity"
              values={`${segment.opacity * 0.76};${segment.opacity};${segment.opacity * 0.64};${segment.opacity * 0.76}`}
              dur={`${1.24 + index * 0.18}s`}
              repeatCount="indefinite"
            />
          </path>
        );
      })}
    </>
  );
};

interface BurningFireMoltenBaseProps {
  frame: BorderFrame;
  infernoFilterId: string;
  moltenMaskId: string;
  detailMode: BurningFireDetailMode;
}

const BurningFireMoltenBase: React.FC<BurningFireMoltenBaseProps> = ({
  frame,
  infernoFilterId,
  moltenMaskId,
  detailMode,
}) => (
  <>
    <path
      d={frame.path}
      fill="none"
      stroke="rgba(120,20,6,0.28)"
      strokeWidth={frame.strokeWidth + 7.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      filter={`url(#${infernoFilterId})`}
      opacity={detailMode === "visual" ? 0.22 : 0.18}
      mask={`url(#${moltenMaskId})`}
      className="scoreboard-border-effect__beam"
    >
      <animate
        attributeName="opacity"
        values={
          detailMode === "visual"
            ? "0.16;0.26;0.18;0.16"
            : "0.14;0.2;0.16;0.14"
        }
        dur={detailMode === "visual" ? "2.1s" : "2.4s"}
        repeatCount="indefinite"
      />
    </path>
    <path
      d={frame.path}
      fill="none"
      stroke="rgba(228,88,26,0.16)"
      strokeWidth={frame.strokeWidth + 4.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      filter={`url(#${infernoFilterId})`}
      opacity={detailMode === "visual" ? 0.2 : 0.16}
      mask={`url(#${moltenMaskId})`}
      className="scoreboard-border-effect__beam"
    >
      <animate
        attributeName="opacity"
        values={
          detailMode === "visual"
            ? "0.14;0.22;0.16;0.14"
            : "0.1;0.16;0.12;0.1"
        }
        dur={detailMode === "visual" ? "1.8s" : "2.2s"}
        repeatCount="indefinite"
      />
    </path>
  </>
);

interface BurningFireMoltenVeinsProps {
  frame: BorderFrame;
  infernoFilterId: string;
  hotEdge: string;
  hotCore: string;
  detailMode: BurningFireDetailMode;
}

const BurningFireMoltenVeins: React.FC<BurningFireMoltenVeinsProps> = ({
  frame,
  infernoFilterId,
  hotEdge,
  hotCore,
  detailMode,
}) => {
  const veins =
    detailMode === "visual"
      ? [
          { offsetRatio: 0.94, beamRatio: 0.07, width: frame.strokeWidth + 0.5, opacity: 0.24, duration: 5.8 },
          { offsetRatio: 0.0, beamRatio: 0.1, width: frame.strokeWidth + 0.95, opacity: 0.38, duration: 6.2 },
          { offsetRatio: 0.08, beamRatio: 0.06, width: frame.strokeWidth + 0.35, opacity: 0.22, duration: 6.8 },
          { offsetRatio: 0.23, beamRatio: 0.05, width: frame.strokeWidth + 0.28, opacity: 0.16, duration: 7.4 },
          { offsetRatio: 0.39, beamRatio: 0.045, width: frame.strokeWidth + 0.22, opacity: 0.12, duration: 7.9 },
          { offsetRatio: 0.56, beamRatio: 0.052, width: frame.strokeWidth + 0.26, opacity: 0.14, duration: 8.1 },
          { offsetRatio: 0.73, beamRatio: 0.05, width: frame.strokeWidth + 0.3, opacity: 0.18, duration: 7.2 },
        ]
      : [
          { offsetRatio: 0.952, beamRatio: 0.068, width: frame.strokeWidth + 0.42, opacity: 0.2, duration: 6.4 },
          { offsetRatio: 0.0, beamRatio: 0.09, width: frame.strokeWidth + 0.82, opacity: 0.32, duration: 6.8 },
          { offsetRatio: 0.102, beamRatio: 0.05, width: frame.strokeWidth + 0.28, opacity: 0.18, duration: 7.2 },
          { offsetRatio: 0.58, beamRatio: 0.044, width: frame.strokeWidth + 0.2, opacity: 0.12, duration: 8.4 },
          { offsetRatio: 0.78, beamRatio: 0.046, width: frame.strokeWidth + 0.22, opacity: 0.14, duration: 7.8 },
        ];

  return (
    <>
      {veins.map((vein, index) => {
        const dashLength = Math.max(5, frame.perimeter * vein.beamRatio);
        const gapLength = Math.max(1, frame.perimeter - dashLength);
        const dashOffset = frame.perimeter * vein.offsetRatio;
        const nudge = Math.max(6, dashLength * 0.18);

        return (
          <React.Fragment key={`burning-vein-${index}`}>
            <path
              d={frame.path}
              fill="none"
              stroke={hotEdge}
              strokeWidth={vein.width}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={`${dashLength} ${gapLength}`}
              strokeDashoffset={dashOffset}
              opacity={vein.opacity}
              filter={`url(#${infernoFilterId})`}
              className="scoreboard-border-effect__beam"
            >
              <animate
                attributeName="stroke-dashoffset"
                values={`${dashOffset};${dashOffset - nudge};${dashOffset};${dashOffset + nudge * 0.4};${dashOffset}`}
                dur={`${vein.duration}s`}
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values={`${vein.opacity * 0.72};${vein.opacity};${vein.opacity * 0.78};${vein.opacity * 0.72}`}
                dur={`${1.2 + index * 0.12}s`}
                repeatCount="indefinite"
              />
            </path>
            <path
              d={frame.path}
              fill="none"
              stroke={hotCore}
              strokeWidth={Math.max(0.95, vein.width - 1.45)}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={`${Math.max(3, dashLength * 0.42)} ${gapLength + dashLength * 0.58}`}
              strokeDashoffset={dashOffset}
              opacity={vein.opacity * 0.38}
              className="scoreboard-border-effect__beam"
            >
              <animate
                attributeName="stroke-dashoffset"
                values={`${dashOffset};${dashOffset - nudge * 0.78};${dashOffset};${dashOffset + nudge * 0.26};${dashOffset}`}
                dur={`${vein.duration * 0.94}s`}
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values={`${vein.opacity * 0.18};${vein.opacity * 0.38};${vein.opacity * 0.24};${vein.opacity * 0.18}`}
                dur={`${1.06 + index * 0.1}s`}
                repeatCount="indefinite"
              />
            </path>
          </React.Fragment>
        );
      })}
    </>
  );
};

interface BurningFireFlameSheetProps {
  infernoFilterId: string;
  motionPathId: string;
  hotEdge: string;
  hotCore: string;
  detailMode: BurningFireDetailMode;
}

const BurningFireFlameSheet: React.FC<BurningFireFlameSheetProps> = ({
  infernoFilterId,
  motionPathId,
  hotEdge,
  hotCore,
  detailMode,
}) => {
  const emitters =
    detailMode === "visual"
      ? [
          { position: 0.965, drift: 0.012, size: 17, rise: 22, opacity: 0.26, lean: -4 },
          { position: 0.982, drift: 0.014, size: 20, rise: 30, opacity: 0.42, lean: -6 },
          { position: 0.994, drift: 0.016, size: 24, rise: 42, opacity: 0.7, lean: -3 },
          { position: 0.006, drift: 0.018, size: 26, rise: 46, opacity: 0.82, lean: 3 },
          { position: 0.02, drift: 0.016, size: 22, rise: 34, opacity: 0.58, lean: 5 },
          { position: 0.042, drift: 0.014, size: 18, rise: 24, opacity: 0.34, lean: 4 },
          { position: 0.082, drift: 0.012, size: 15, rise: 18, opacity: 0.22, lean: 2 },
          { position: 0.14, drift: 0.01, size: 13, rise: 15, opacity: 0.18, lean: 2 },
          { position: 0.23, drift: 0.01, size: 12, rise: 12, opacity: 0.12, lean: -1 },
          { position: 0.37, drift: 0.008, size: 11, rise: 10, opacity: 0.1, lean: -1 },
          { position: 0.52, drift: 0.008, size: 11, rise: 9, opacity: 0.09, lean: 1 },
          { position: 0.68, drift: 0.008, size: 12, rise: 10, opacity: 0.1, lean: 1 },
          { position: 0.82, drift: 0.01, size: 13, rise: 12, opacity: 0.12, lean: -2 },
          { position: 0.9, drift: 0.01, size: 14, rise: 14, opacity: 0.14, lean: -2 },
        ]
      : [
          { position: 0.972, drift: 0.012, size: 16, rise: 20, opacity: 0.22, lean: -4 },
          { position: 0.99, drift: 0.014, size: 20, rise: 30, opacity: 0.48, lean: -3 },
          { position: 0.008, drift: 0.015, size: 22, rise: 34, opacity: 0.58, lean: 3 },
          { position: 0.026, drift: 0.014, size: 18, rise: 24, opacity: 0.34, lean: 5 },
          { position: 0.05, drift: 0.012, size: 15, rise: 18, opacity: 0.2, lean: 4 },
          { position: 0.12, drift: 0.01, size: 12, rise: 13, opacity: 0.12, lean: 2 },
          { position: 0.86, drift: 0.01, size: 12, rise: 13, opacity: 0.1, lean: -2 },
          { position: 0.72, drift: 0.008, size: 10, rise: 9, opacity: 0.08, lean: 1 },
        ];

  return (
    <>
      {emitters.map((emitter, index) => {
        const duration = 1.4 + (index % 4) * 0.16;
        const orbitDuration = 7.4 + index * 0.18;
        const fromPoint = Math.max(0, emitter.position - emitter.drift * 0.4);
        const centerPoint = emitter.position;
        const toPoint = Math.min(0.999, emitter.position + emitter.drift);

        return (
          <g key={`burning-sheet-${index}`} filter={`url(#${infernoFilterId})`}>
            {Array.from({ length: detailMode === "visual" ? 3 : 2 }).map(
              (_, layerIndex) => {
                const layerScale = layerIndex === 0 ? 1 : layerIndex === 1 ? 0.78 : 0.58;
                const layerOpacity =
                  emitter.opacity * (layerIndex === 0 ? 0.78 : layerIndex === 1 ? 0.52 : 0.26);
                const size = emitter.size * layerScale;
                const rise = emitter.rise * (layerIndex === 0 ? 1 : layerIndex === 1 ? 0.82 : 0.66);
                const lean = emitter.lean * (layerIndex === 0 ? 1 : 0.72);

                return (
                  <g key={`burning-sheet-${index}-${layerIndex}`}>
                    <animateMotion
                      dur={`${orbitDuration}s`}
                      begin={`${-(orbitDuration * emitter.position)}s`}
                      repeatCount="indefinite"
                      rotate="auto"
                      keyPoints={`${fromPoint};${centerPoint};${toPoint};${centerPoint};${fromPoint}`}
                      keyTimes="0;0.28;0.56;0.82;1"
                      calcMode="spline"
                      keySplines="0.32 0 0.2 1;0.32 0 0.2 1;0.32 0 0.2 1;0.32 0 0.2 1"
                    >
                      <mpath href={`#${motionPathId}`} />
                    </animateMotion>
                    <animateTransform
                      attributeName="transform"
                      type="translate"
                      additive="sum"
                      values={`${lean * 0.16} 0;${lean * 0.34} ${-rise * 0.38};${lean * 0.92} ${-rise};${lean * 0.24} ${-rise * 0.22};${lean * 0.16} 0`}
                      dur={`${duration + layerIndex * 0.1}s`}
                      repeatCount="indefinite"
                    />
                    <animateTransform
                      attributeName="transform"
                      type="scale"
                      additive="sum"
                      values={`0.92 0.78;1.08 ${1.14 + layerIndex * 0.08};0.9 0.98;0.92 0.78`}
                      dur={`${duration + layerIndex * 0.08}s`}
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      values={`${layerOpacity * 0.56};${layerOpacity};${layerOpacity * 0.74};${layerOpacity * 0.56}`}
                      dur={`${duration + layerIndex * 0.06}s`}
                      repeatCount="indefinite"
                    />
                    <ellipse
                      cx="0"
                      cy={-size * 0.22}
                      rx={size * 0.56}
                      ry={size}
                      fill={layerIndex === 2 ? hotCore : hotEdge}
                      opacity={layerIndex === 2 ? 0.48 : undefined}
                    />
                  </g>
                );
              },
            )}
          </g>
        );
      })}
    </>
  );
};

interface BurningFireThermalAuraProps {
  frame: BorderFrame;
  infernoFilterId: string;
  moltenMaskId: string;
  detailMode: BurningFireDetailMode;
}

const BurningFireThermalAura: React.FC<BurningFireThermalAuraProps> = ({
  frame,
  infernoFilterId,
  moltenMaskId,
  detailMode,
}) => (
  <path
    d={frame.path}
    fill="none"
    stroke="rgba(255,96,24,0.07)"
    strokeWidth={frame.strokeWidth + 10.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    filter={`url(#${infernoFilterId})`}
    opacity={detailMode === "visual" ? 0.14 : 0.1}
    mask={`url(#${moltenMaskId})`}
    className="scoreboard-border-effect__beam"
  >
    <animate
      attributeName="opacity"
      values={
        detailMode === "visual"
          ? "0.1;0.16;0.12;0.1"
          : "0.07;0.12;0.09;0.07"
      }
      dur={detailMode === "visual" ? "2.6s" : "2.9s"}
      repeatCount="indefinite"
    />
  </path>
);

interface BurningFireHotspotsProps {
  frame: BorderFrame;
  infernoFilterId: string;
  hotCore: string;
  hotEdge: string;
  detailMode: BurningFireDetailMode;
}

const BurningFireHotspots: React.FC<BurningFireHotspotsProps> = ({
  frame,
  infernoFilterId,
  hotCore,
  hotEdge,
  detailMode,
}) => {
  const segments =
    detailMode === "visual"
      ? [
          { offsetRatio: 0.988, beamRatio: 0.03, width: frame.strokeWidth + 0.95, opacity: 0.26 },
          { offsetRatio: 0.0, beamRatio: 0.082, width: frame.strokeWidth + 2, opacity: 0.78 },
          { offsetRatio: 0.044, beamRatio: 0.034, width: frame.strokeWidth + 1.05, opacity: 0.28 },
        ]
      : [
          { offsetRatio: 0.99, beamRatio: 0.026, width: frame.strokeWidth + 0.86, opacity: 0.2 },
          { offsetRatio: 0.0, beamRatio: 0.072, width: frame.strokeWidth + 1.7, opacity: 0.64 },
          { offsetRatio: 0.046, beamRatio: 0.03, width: frame.strokeWidth + 0.96, opacity: 0.22 },
        ];

  return (
    <>
      {segments.map((segment, index) => {
        const dashLength = Math.max(4, frame.perimeter * segment.beamRatio);
        const gapLength = Math.max(1, frame.perimeter - dashLength);
        const dashOffset = frame.perimeter * segment.offsetRatio;

        return (
          <React.Fragment key={`burning-hotspot-${index}`}>
            <path
              d={frame.path}
              fill="none"
              stroke={hotEdge}
              strokeWidth={segment.width}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={`${dashLength} ${gapLength}`}
              strokeDashoffset={dashOffset}
              opacity={segment.opacity}
              filter={`url(#${infernoFilterId})`}
              className="scoreboard-border-effect__beam"
            >
              <animate
                attributeName="opacity"
                values={`${segment.opacity * 0.62};${segment.opacity};${segment.opacity * 0.74};${segment.opacity * 0.62}`}
                dur={`${0.78 + index * 0.14}s`}
                repeatCount="indefinite"
              />
            </path>
            <path
              d={frame.path}
              fill="none"
              stroke={hotCore}
              strokeWidth={Math.max(1.15, frame.strokeWidth - 2.2)}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={`${Math.max(3, dashLength * 0.58)} ${gapLength + dashLength * 0.42}`}
              strokeDashoffset={dashOffset}
              opacity={segment.opacity * 0.54}
              className="scoreboard-border-effect__beam"
            >
              <animate
                attributeName="opacity"
                values={`${segment.opacity * 0.3};${segment.opacity * 0.58};${segment.opacity * 0.38};${segment.opacity * 0.3}`}
                dur={`${0.74 + index * 0.12}s`}
                repeatCount="indefinite"
              />
            </path>
          </React.Fragment>
        );
      })}
    </>
  );
};

interface BurningFireClustersProps {
  infernoFilterId: string;
  hotEdge: string;
  detailMode: BurningFireDetailMode;
}

const BurningFireClusters: React.FC<BurningFireClustersProps> = ({
  infernoFilterId,
  hotEdge,
  detailMode,
}) => {
  const clusters =
    detailMode === "visual"
      ? [
          { cx: "46%", cy: "9%", rx: "11%", ry: "10%", opacity: 0.18 },
          { cx: "52%", cy: "8%", rx: "14%", ry: "12%", opacity: 0.22 },
          { cx: "58%", cy: "10%", rx: "10%", ry: "9%", opacity: 0.16 },
        ]
      : [
          { cx: "48%", cy: "9%", rx: "10%", ry: "9.2%", opacity: 0.14 },
          { cx: "53%", cy: "8.1%", rx: "12%", ry: "11%", opacity: 0.18 },
        ];

  return (
    <>
      {clusters.map((cluster, index) => (
        <ellipse
          key={`burning-cluster-${index}`}
          cx={cluster.cx}
          cy={cluster.cy}
          rx={cluster.rx}
          ry={cluster.ry}
          fill={hotEdge}
          opacity={cluster.opacity}
          filter={`url(#${infernoFilterId})`}
          className="scoreboard-border-effect__beam"
        >
          <animate
            attributeName="opacity"
            values={`${cluster.opacity * 0.6};${cluster.opacity};${cluster.opacity * 0.72};${cluster.opacity * 0.6}`}
            dur={`${1.08 + index * 0.16}s`}
            repeatCount="indefinite"
          />
        </ellipse>
      ))}
    </>
  );
};

interface BurningFireMassProps {
  hotEdge: string;
  hotCore: string;
  infernoFilterId: string;
  detailMode: BurningFireDetailMode;
}

const BurningFireMass: React.FC<BurningFireMassProps> = ({
  hotEdge,
  hotCore,
  infernoFilterId,
  detailMode,
}) => {
  const masses =
    detailMode === "visual"
      ? [
          {
            cx: "47%",
            cy: "8.5%",
            rx: "8.5%",
            ry: "11.5%",
            innerRx: "3.6%",
            innerRy: "3.9%",
            opacity: 0.18,
          },
          {
            cx: "52%",
            cy: "7.4%",
            rx: "11.5%",
            ry: "15.5%",
            innerRx: "4.8%",
            innerRy: "5.3%",
            opacity: 0.28,
          },
          {
            cx: "57%",
            cy: "8.6%",
            rx: "8%",
            ry: "11%",
            innerRx: "3.4%",
            innerRy: "3.8%",
            opacity: 0.16,
          },
        ]
      : [
          {
            cx: "49%",
            cy: "8.4%",
            rx: "8%",
            ry: "10.2%",
            innerRx: "3.2%",
            innerRy: "3.4%",
            opacity: 0.14,
          },
          {
            cx: "53%",
            cy: "7.8%",
            rx: "10.4%",
            ry: "13.2%",
            innerRx: "4.1%",
            innerRy: "4.5%",
            opacity: 0.22,
          },
        ];

  return (
    <>
      {masses.map((mass, index) => (
        <g key={`burning-mass-${index}`} filter={`url(#${infernoFilterId})`}>
          <ellipse
            cx={mass.cx}
            cy={mass.cy}
            rx={mass.rx}
            ry={mass.ry}
            fill={hotEdge}
            opacity={mass.opacity}
          >
            <animate
              attributeName="opacity"
              values={`${mass.opacity * 0.66};${mass.opacity};${mass.opacity * 0.78};${mass.opacity * 0.66}`}
              dur={`${0.94 + index * 0.12}s`}
              repeatCount="indefinite"
            />
            <animateTransform
              attributeName="transform"
              type="translate"
              additive="sum"
              values={`0 0;0 ${-1.6 - index * 0.4};0 0.2;0 0`}
              dur={`${0.98 + index * 0.14}s`}
              repeatCount="indefinite"
            />
          </ellipse>
          <ellipse
            cx={mass.cx}
            cy={mass.cy}
            rx={mass.innerRx}
            ry={mass.innerRy}
            fill={hotCore}
            opacity={mass.opacity * 0.34}
          >
            <animate
              attributeName="opacity"
              values={`${mass.opacity * 0.18};${mass.opacity * 0.34};${mass.opacity * 0.22};${mass.opacity * 0.18}`}
              dur={`${0.82 + index * 0.1}s`}
              repeatCount="indefinite"
            />
          </ellipse>
        </g>
      ))}
    </>
  );
};

interface BurningFireEmbersProps {
  emberColor: string;
  emberGlow: string;
  emberFilterId: string;
  motionPathId: string;
  heatMaskId: string;
  detailMode: BurningFireDetailMode;
}

const BurningFireEmbers: React.FC<BurningFireEmbersProps> = ({
  emberColor,
  emberGlow,
  emberFilterId,
  motionPathId,
  heatMaskId,
  detailMode,
}) => {
  const emberAnchors =
    detailMode === "visual"
      ? [0.984, 0.996, 0.008, 0.022, 0.04, 0.064]
      : [0.988, 0.0, 0.018, 0.044];

  return (
    <g mask={`url(#${heatMaskId})`}>
      {emberAnchors.map((anchor, index) => {
        const size = index < 4 ? 1.95 : 1.55;
        const duration = 1.18 + index * 0.08;

        return (
          <g
            key={`burning-ember-${index}`}
            filter={`url(#${emberFilterId})`}
            className="scoreboard-border-effect__ember"
          >
            <animateMotion
              dur={`${6.8 + index * 0.06}s`}
              begin={`${-(6.8 * anchor)}s`}
              repeatCount="indefinite"
              rotate="auto"
              keyPoints={`${Math.max(0, anchor - 0.004)};${anchor};${Math.min(0.999, anchor + 0.006)};${anchor}`}
              keyTimes="0;0.34;0.68;1"
              calcMode="linear"
            >
              <mpath href={`#${motionPathId}`} />
            </animateMotion>
            <animateTransform
              attributeName="transform"
              type="translate"
              values={`0 0;${(index % 2 === 0 ? -1 : 1) * 1.2} ${-4.6 - index * 0.35};${(index % 2 === 0 ? -1 : 1) * 2.4} ${-8.2 - index * 0.44}`}
              dur={`${duration}s`}
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0;0.4;0.16;0"
              dur={`${duration}s`}
              repeatCount="indefinite"
            />
            <rect
              x={-size / 2}
              y={-size / 2}
              width={size}
              height={size}
              rx="0.65"
              fill={emberColor}
              stroke={emberGlow}
              strokeWidth="0.26"
            />
          </g>
        );
      })}
    </g>
  );
};

*/
interface DualWaterFireFieldProps {
  frame: BorderFrame;
  theme: BorderEffectThemeConfig;
  motion: BorderEffectMotionConfig;
  glowFilterId: string;
}

const DualWaterFireField: React.FC<DualWaterFireFieldProps> = ({
  frame,
  theme,
  motion,
  glowFilterId,
}) => {
  return (
    <>
      <path
        d={frame.path}
        fill="none"
        stroke="rgba(255,255,255,0.03)"
        strokeWidth={frame.strokeWidth + 3.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={`url(#${glowFilterId})`}
        opacity={0.18}
        className="scoreboard-border-effect__beam"
      >
        <animate
          attributeName="opacity"
          values="0.14;0.22;0.18;0.14"
          dur={`${motion.duration * 1.42}s`}
          repeatCount="indefinite"
        />
      </path>
      <path
        d={frame.path}
        fill="none"
        stroke={theme.hotEdge}
        strokeWidth={frame.strokeWidth + 0.85}
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={`url(#${glowFilterId})`}
        opacity={0.3}
        className="scoreboard-border-effect__beam"
      />
      <path
        d={frame.path}
        fill="none"
        stroke={theme.secondaryGlow ?? "rgba(110,216,255,0.24)"}
        strokeWidth={frame.strokeWidth + 0.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={`url(#${glowFilterId})`}
        opacity={0.22}
        className="scoreboard-border-effect__beam"
      />
      <path
        d={frame.path}
        fill="none"
        stroke={theme.energyCore}
        strokeWidth={Math.max(0.9, frame.strokeWidth - 1.5)}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.32}
        className="scoreboard-border-effect__beam"
      />
    </>
  );
};

interface RainbowEnergyFieldProps {
  frame: BorderFrame;
  theme: BorderEffectThemeConfig;
  motion: BorderEffectMotionConfig;
  glowFilterId: string;
}

const RainbowEnergyField: React.FC<RainbowEnergyFieldProps> = ({
  frame,
  theme,
  motion,
  glowFilterId,
}) => {
  const ribbons = [
    { stroke: "rgba(255,77,149,0.34)", widthNudge: 1.2 },
    { stroke: "rgba(255,211,79,0.3)", widthNudge: 0.8 },
    { stroke: "rgba(94,241,255,0.3)", widthNudge: 0.4 },
    { stroke: "rgba(121,102,255,0.24)", widthNudge: 0.1 },
  ];

  return (
    <>
      {ribbons.map((ribbon, ribbonIndex) => (
        <path
          key={`rainbow-${ribbonIndex}`}
          d={frame.path}
          fill="none"
          stroke={ribbon.stroke}
          strokeWidth={frame.strokeWidth + ribbon.widthNudge}
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#${glowFilterId})`}
          opacity={0.26 + ribbonIndex * 0.04}
          className="scoreboard-border-effect__beam"
        >
          <animate
            attributeName="opacity"
            values={`${0.18 + ribbonIndex * 0.03};${0.28 + ribbonIndex * 0.04};${0.22 + ribbonIndex * 0.03};${0.18 + ribbonIndex * 0.03}`}
            dur={`${motion.duration * (1.3 + ribbonIndex * 0.08)}s`}
            repeatCount="indefinite"
          />
        </path>
      ))}
      <path
        d={frame.path}
        fill="none"
        stroke={theme.energyCore}
        strokeWidth={Math.max(0.9, frame.strokeWidth - 1.2)}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.34}
        className="scoreboard-border-effect__beam"
      />
    </>
  );
};

interface BeamMotionLayerProps {
  frame: BorderFrame;
  theme: BorderEffectThemeConfig;
  motion: BorderEffectMotionConfig;
  variant: BorderEffectVariant;
  glowFilterId: string;
  motionPathId: string;
}

const BeamMotionLayer: React.FC<BeamMotionLayerProps> = ({
  frame,
  theme,
  motion,
  variant,
  glowFilterId,
  motionPathId,
}) => {
  if (motion.snakes.length === 0) {
    return null;
  }

  const particleCount =
    motion.particleMode === "off"
      ? 0
      : motion.particleMode === "subtle"
        ? variant === "preview"
          ? 2
          : 1
        : variant === "preview"
          ? 4
          : 2;
  const glowWidth = variant === "preview" ? frame.strokeWidth + 2.2 : frame.strokeWidth + 1.65;
  const shellWidth = variant === "preview" ? frame.strokeWidth + 0.95 : frame.strokeWidth + 0.72;
  const coreWidth = Math.max(0.82, frame.strokeWidth - (variant === "preview" ? 1.7 : 1.95));

  return (
    <>
      {motion.snakes.map((snake, index) => {
        const palette = getBeamPalette(theme, index);
        const offset = frame.perimeter * snake.offsetRatio;

        return (
          <React.Fragment key={`beam-motion-${motion.id}-${index}`}>
            <EnergyBeam
              frame={frame}
              length={frame.perimeter * snake.trailRatio}
              offset={offset}
              duration={motion.duration}
              stroke={palette.trail}
              strokeWidth={glowWidth}
              opacity={variant === "preview" ? 0.28 : 0.22}
              filterId={glowFilterId}
              opacityDuration={2.8}
              opacityValues={
                variant === "preview"
                  ? "0.22;0.3;0.26;0.22"
                  : "0.18;0.24;0.2;0.18"
              }
            />
            <EnergyBeam
              frame={frame}
              length={frame.perimeter * (snake.beamRatio * 1.9)}
              offset={offset}
              duration={motion.duration}
              stroke={palette.shell}
              strokeWidth={shellWidth}
              opacity={variant === "preview" ? 0.82 : 0.72}
              filterId={glowFilterId}
              opacityDuration={2.4}
              opacityValues="0.72;0.86;0.78;0.72"
            />
            <EnergyBeam
              frame={frame}
              length={frame.perimeter * snake.beamRatio}
              offset={offset}
              duration={motion.duration}
              stroke={palette.core}
              strokeWidth={coreWidth}
              opacity={0.98}
              opacityDuration={2.2}
              opacityValues="0.9;1;0.94;0.9"
            />

            {particleCount > 0 ? (
              <BeamHeadParticles
                frame={frame}
                snake={snake}
                duration={motion.duration}
                count={particleCount}
                variant={variant}
                motionPathId={motionPathId}
                glowFilterId={glowFilterId}
                coreColor={palette.core}
                shellColor={palette.shell}
              />
            ) : null}
          </React.Fragment>
        );
      })}
    </>
  );
};

const getBeamPalette = (theme: BorderEffectThemeConfig, index: number) => {
  const useSecondary = index % 2 === 1 && theme.secondaryCore && theme.secondaryGlow;

  return {
    trail: useSecondary ? theme.secondaryGlow! : theme.energyGlow,
    shell: useSecondary ? theme.secondaryGlow! : theme.hotEdge,
    core: useSecondary ? theme.secondaryCore! : theme.energyCore,
  };
};

interface BeamHeadParticlesProps {
  frame: BorderFrame;
  snake: BorderEffectMotionConfig["snakes"][number];
  duration: number;
  count: number;
  variant: BorderEffectVariant;
  motionPathId: string;
  glowFilterId: string;
  coreColor: string;
  shellColor: string;
}

const BeamHeadParticles: React.FC<BeamHeadParticlesProps> = ({
  frame,
  snake,
  duration,
  count,
  variant,
  motionPathId,
  glowFilterId,
  coreColor,
  shellColor,
}) => {
  const particleSize = variant === "preview" ? 1.7 : 1.45;
  const lateralRange = variant === "preview" ? 2.4 : 1.9;
  const riseRange = variant === "preview" ? 1.5 : 1.28;
  const lagRatio = snake.beamRatio * 0.7;

  return (
    <>
      {Array.from({ length: count }).map((_, index) => {
        const baseRatio = snake.offsetRatio - lagRatio * (0.16 + index * 0.11);
        const normalizedRatio = ((baseRatio % 1) + 1) % 1;
        const orbitDuration = duration;
        const driftDuration = 1.6 + index * 0.24;
        const xLead = -frame.perimeter * 0.0008 * (index + 1);
        const xDrift = (index % 2 === 0 ? -1 : 1) * lateralRange * (0.44 + index * 0.18);
        const yDrift = -riseRange * (0.48 + index * 0.18);
        const opacityPeak = variant === "preview" ? 0.68 : 0.62;

        return (
          <g
            key={`beam-particle-${index}`}
            filter={`url(#${glowFilterId})`}
            className="scoreboard-border-effect__ember"
          >
            <animateMotion
              dur={`${orbitDuration}s`}
              begin={`${-(orbitDuration * normalizedRatio)}s`}
              repeatCount="indefinite"
              rotate="auto"
              calcMode="paced"
            >
              <mpath href={`#${motionPathId}`} />
            </animateMotion>
            <animateTransform
              attributeName="transform"
              type="translate"
              additive="sum"
              values={`${xLead} 0;${xLead + xDrift * 0.32} ${yDrift * 0.42};${xLead + xDrift} ${yDrift};${xLead + xDrift * 0.22} ${yDrift * 0.22};${xLead} 0`}
              dur={`${driftDuration}s`}
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values={`0;${opacityPeak};${opacityPeak * 0.42};0`}
              dur={`${driftDuration}s`}
              repeatCount="indefinite"
            />
            <circle r={particleSize} fill={shellColor} opacity="0.66" />
            <circle r={particleSize * 0.54} fill={coreColor} opacity="0.96" />
          </g>
        );
      })}
    </>
  );
};

const resolveElectricArcNodes = (
  detailMode: "visual" | "performance",
  particleMode: BorderEffectMotionConfig["particleMode"],
  variant: BorderEffectVariant,
) => {
  const richNodes =
    detailMode === "visual"
      ? [
          { position: 0.04, drift: 0.018, size: 9, rise: 8, opacity: 0.52, lean: 2.2 },
          { position: 0.22, drift: 0.014, size: 7, rise: 6, opacity: 0.28, lean: -1.2 },
          { position: 0.48, drift: 0.012, size: 6, rise: 5, opacity: 0.22, lean: 0.8 },
          { position: 0.72, drift: 0.014, size: 7, rise: 6, opacity: 0.3, lean: -1.1 },
          { position: 0.94, drift: 0.018, size: 9, rise: 8, opacity: 0.48, lean: -2.1 },
        ]
      : [
          { position: 0.05, drift: 0.016, size: 8, rise: 7, opacity: 0.42, lean: 1.9 },
          { position: 0.34, drift: 0.012, size: 6, rise: 5, opacity: 0.2, lean: -0.9 },
          { position: 0.66, drift: 0.012, size: 6, rise: 5, opacity: 0.2, lean: 0.9 },
          { position: 0.94, drift: 0.016, size: 8, rise: 7, opacity: 0.38, lean: -1.8 },
        ];

  if (particleMode === "off") {
    return [];
  }

  if (particleMode === "subtle") {
    const subtleCount = variant === "preview" ? 3 : 2;
    return richNodes.slice(0, subtleCount).map((node) => ({
      ...node,
      size: node.size * 0.86,
      rise: node.rise * 0.84,
      opacity: node.opacity * 0.72,
    }));
  }

  return richNodes;
};

interface ElectricArcFieldProps {
  frame: BorderFrame;
  theme: BorderEffectThemeConfig;
  motion: BorderEffectMotionConfig;
  variant: BorderEffectVariant;
  glowFilterId: string;
  motionPathId: string;
}

const ElectricArcField: React.FC<ElectricArcFieldProps> = ({
  frame,
  theme,
  motion,
  variant,
  glowFilterId,
  motionPathId,
}) => {
  const detailMode = variant === "preview" ? "visual" : "performance";
  const shellGradientId = `${motionPathId}-electric-shell`;
  const coreGradientId = `${motionPathId}-electric-core`;
  const arcNoiseFilterId = `${motionPathId}-electric-noise`;
  const chargedSegments =
    detailMode === "visual"
      ? [
          { offsetRatio: 0.01, beamRatio: 0.13, widthNudge: 1.6, opacity: 0.78, duration: 1.82 },
          { offsetRatio: 0.19, beamRatio: 0.08, widthNudge: 0.84, opacity: 0.42, duration: 2.28 },
          { offsetRatio: 0.43, beamRatio: 0.072, widthNudge: 0.72, opacity: 0.38, duration: 2.52 },
          { offsetRatio: 0.67, beamRatio: 0.082, widthNudge: 0.8, opacity: 0.42, duration: 2.34 },
          { offsetRatio: 0.88, beamRatio: 0.118, widthNudge: 1.2, opacity: 0.64, duration: 1.96 },
        ]
      : [
          { offsetRatio: 0.02, beamRatio: 0.11, widthNudge: 1.2, opacity: 0.68, duration: 2.02 },
          { offsetRatio: 0.29, beamRatio: 0.064, widthNudge: 0.54, opacity: 0.34, duration: 2.6 },
          { offsetRatio: 0.58, beamRatio: 0.064, widthNudge: 0.54, opacity: 0.34, duration: 2.7 },
          { offsetRatio: 0.86, beamRatio: 0.1, widthNudge: 1, opacity: 0.54, duration: 2.12 },
        ];
  const arcNodes = resolveElectricArcNodes(detailMode, motion.particleMode, variant);

  return (
    <>
      <defs>
        <linearGradient id={shellGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(98,210,255,0.26)" />
          <stop offset="34%" stopColor="rgba(162,244,255,0.58)" />
          <stop offset="68%" stopColor="rgba(114,151,255,0.42)" />
          <stop offset="100%" stopColor="rgba(124,58,237,0.22)" />
        </linearGradient>
        <linearGradient id={coreGradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(228,248,255,0.42)" />
          <stop offset="38%" stopColor="rgba(255,255,255,0.94)" />
          <stop offset="72%" stopColor="rgba(167,243,255,0.74)" />
          <stop offset="100%" stopColor="rgba(196,181,253,0.28)" />
        </linearGradient>
        <filter id={arcNoiseFilterId} x="-40%" y="-40%" width="180%" height="180%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency={detailMode === "visual" ? "0.012 0.28" : "0.01 0.22"}
            numOctaves="2"
            seed="9"
            result="noise"
          >
            <animate
              attributeName="baseFrequency"
              values={
                detailMode === "visual"
                  ? "0.012 0.26;0.017 0.34;0.011 0.24;0.012 0.26"
                  : "0.01 0.2;0.013 0.28;0.009 0.18;0.01 0.2"
              }
              dur={detailMode === "visual" ? "2.6s" : "3s"}
              repeatCount="indefinite"
            />
          </feTurbulence>
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale={detailMode === "visual" ? "10" : "7"}
            xChannelSelector="R"
            yChannelSelector="B"
            result="displaced"
          />
          <feGaussianBlur in="displaced" stdDeviation="1.2" result="soft" />
          <feMerge>
            <feMergeNode in="soft" />
            <feMergeNode in="displaced" />
          </feMerge>
        </filter>
      </defs>

      <path
        d={frame.path}
        fill="none"
        stroke="rgba(96,165,250,0.08)"
        strokeWidth={frame.strokeWidth + (detailMode === "visual" ? 3.8 : 3)}
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={`url(#${glowFilterId})`}
        opacity={detailMode === "visual" ? 0.24 : 0.18}
        className="scoreboard-border-effect__beam"
      >
        <animate
          attributeName="opacity"
          values={detailMode === "visual" ? "0.16;0.28;0.2;0.16" : "0.12;0.22;0.16;0.12"}
          dur={detailMode === "visual" ? "2.8s" : "3.2s"}
          repeatCount="indefinite"
        />
      </path>

      <path
        d={frame.path}
        fill="none"
        stroke={`url(#${shellGradientId})`}
        strokeWidth={frame.strokeWidth + (detailMode === "visual" ? 1.4 : 0.95)}
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={`url(#${arcNoiseFilterId})`}
        opacity={detailMode === "visual" ? 0.58 : 0.44}
        className="scoreboard-border-effect__beam"
      >
        <animate
          attributeName="opacity"
          values={detailMode === "visual" ? "0.46;0.66;0.52;0.46" : "0.34;0.52;0.4;0.34"}
          dur={detailMode === "visual" ? "2.2s" : "2.6s"}
          repeatCount="indefinite"
        />
      </path>

      <path
        d={frame.path}
        fill="none"
        stroke={`url(#${coreGradientId})`}
        strokeWidth={Math.max(0.85, frame.strokeWidth - 1.9)}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={detailMode === "visual" ? 0.64 : 0.54}
        className="scoreboard-border-effect__beam"
      >
        <animate
          attributeName="opacity"
          values="0.44;0.74;0.56;0.44"
          dur={detailMode === "visual" ? "1.9s" : "2.3s"}
          repeatCount="indefinite"
        />
      </path>

      {chargedSegments.map((segment, index) => {
        const offset = frame.perimeter * segment.offsetRatio;
        return (
          <React.Fragment key={`electric-segment-${index}`}>
            <EnergyBeam
              frame={frame}
              length={frame.perimeter * (segment.beamRatio * 1.34)}
              offset={offset}
              duration={segment.duration}
              stroke={theme.secondaryGlow ?? "rgba(96,165,250,0.34)"}
              strokeWidth={frame.strokeWidth + segment.widthNudge}
              opacity={segment.opacity * 0.58}
              filterId={glowFilterId}
            />
            <EnergyBeam
              frame={frame}
              length={frame.perimeter * segment.beamRatio}
              offset={offset}
              duration={segment.duration}
              stroke={theme.energyCore}
              strokeWidth={Math.max(0.9, frame.strokeWidth - 0.9 + segment.widthNudge * 0.18)}
              opacity={segment.opacity}
            />
          </React.Fragment>
        );
      })}

      {arcNodes.map((emitter, index) => {
        const orbitDuration = 5.4 + index * 0.28;
        const flickerDuration = 0.92 + (index % 2) * 0.12;
        const fromPoint = Math.max(0, emitter.position - emitter.drift * 0.44);
        const centerPoint = emitter.position;
        const toPoint = Math.min(0.999, emitter.position + emitter.drift);

        return (
          <g key={`electric-arc-${index}`} filter={`url(#${glowFilterId})`}>
            <animateMotion
              dur={`${orbitDuration}s`}
              begin={`${-(orbitDuration * emitter.position)}s`}
              repeatCount="indefinite"
              rotate="auto"
              keyPoints={`${fromPoint};${centerPoint};${toPoint};${centerPoint};${fromPoint}`}
              keyTimes="0;0.28;0.56;0.82;1"
              calcMode="spline"
              keySplines="0.34 0 0.18 1;0.34 0 0.18 1;0.34 0 0.18 1;0.34 0 0.18 1"
            >
              <mpath href={`#${motionPathId}`} />
            </animateMotion>
            <animateTransform
              attributeName="transform"
              type="translate"
              additive="sum"
              values={`${emitter.lean * 0.12} 0;${emitter.lean * 0.34} ${-emitter.rise * 0.38};${emitter.lean * 0.62} ${-emitter.rise};${emitter.lean * 0.18} ${-emitter.rise * 0.22};${emitter.lean * 0.12} 0`}
              dur={`${flickerDuration}s`}
              repeatCount="indefinite"
            />
            <animateTransform
              attributeName="transform"
              type="scale"
              additive="sum"
              values="0.88 0.84;1.02 1.12;0.92 0.9;0.88 0.84"
              dur={`${flickerDuration}s`}
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values={`${emitter.opacity * 0.38};${emitter.opacity};${emitter.opacity * 0.52};${emitter.opacity * 0.38}`}
              dur={`${flickerDuration}s`}
              repeatCount="indefinite"
            />
            <path
              d={`M 0 0 L ${emitter.size * 0.12} ${-emitter.rise * 0.24} L ${emitter.size * 0.42} ${-emitter.rise * 0.32} L ${emitter.size * 0.06} ${-emitter.rise * 0.72} L ${emitter.size * 0.28} ${-emitter.rise} L ${-emitter.size * 0.08} ${-emitter.rise * 0.58} L ${-emitter.size * 0.26} ${-emitter.rise * 0.66} L ${-emitter.size * 0.08} ${-emitter.rise * 0.2} Z`}
              fill={theme.secondaryGlow ?? theme.hotEdge}
            />
            <path
              d={`M 0 ${-0.6} L ${emitter.size * 0.08} ${-emitter.rise * 0.22} L ${emitter.size * 0.14} ${-emitter.rise * 0.54} L ${-emitter.size * 0.04} ${-emitter.rise * 0.72} L ${-emitter.size * 0.08} ${-emitter.rise * 0.26} Z`}
              fill={theme.energyCore}
              opacity="0.9"
            />
          </g>
        );
      })}
    </>
  );
};

interface EnergyBeamProps {
  frame: BorderFrame;
  length: number;
  offset: number;
  duration: number;
  stroke: string;
  strokeWidth: number;
  opacity?: number;
  filterId?: string;
  opacityDuration?: number;
  opacityValues?: string;
}

const EnergyBeam: React.FC<EnergyBeamProps> = ({
  frame,
  length,
  offset,
  duration,
  stroke,
  strokeWidth,
  opacity = 1,
  filterId,
  opacityDuration = 1.06,
  opacityValues,
}) => {
  const dashLength = Math.max(6, Math.min(frame.perimeter - 2, length));
  const gapLength = Math.max(1, frame.perimeter - dashLength);
  const resolvedOpacityValues =
    opacityValues ??
    `${Math.max(0.7, opacity * 0.88)};${opacity};${Math.max(
      0.76,
      opacity * 0.92,
    )};${opacity}`;

  return (
    <path
      d={frame.path}
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={`${dashLength} ${gapLength}`}
      strokeDashoffset={offset}
      opacity={opacity}
      filter={filterId ? `url(#${filterId})` : undefined}
      className="scoreboard-border-effect__beam"
    >
      <animate
        attributeName="stroke-dashoffset"
        from={offset}
        to={offset - frame.perimeter}
        dur={`${duration}s`}
        repeatCount="indefinite"
        calcMode="linear"
      />
      <animate
        attributeName="opacity"
        values={resolvedOpacityValues}
        dur={`${opacityDuration}s`}
        repeatCount="indefinite"
      />
    </path>
  );
};

const createBorderFrame = (
  width: number,
  height: number,
  variant: BorderEffectVariant,
  radius: number,
  borderWidth: number,
): BorderFrame => {
  const inset =
    variant === "preview"
      ? Math.max(1.45, borderWidth / 2 + 0.6)
      : Math.max(0.7, borderWidth / 2 + 0.02);
  const frameWidth = Math.max(1, width - inset * 2);
  const frameHeight = Math.max(1, height - inset * 2);
  const maxRadius = Math.max(2, frameHeight / 2 - 0.2);
  const resolvedRadius = Math.min(Math.max(2, radius - inset), maxRadius);

  return {
    path: buildRoundedRectPath(
      inset,
      inset,
      frameWidth,
      frameHeight,
      resolvedRadius,
    ),
    perimeter: estimateRoundedRectPerimeter(
      frameWidth,
      frameHeight,
      resolvedRadius,
    ),
    strokeWidth: variant === "preview" ? 5.8 : 4.6,
    inset,
    width: frameWidth,
    height: frameHeight,
    radius: resolvedRadius,
    outerWidth: width,
    outerHeight: height,
  };
};

const buildRoundedRectPath = (
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) => {
  const right = x + width;
  const bottom = y + height;
  const leftInner = x + radius;
  const rightInner = right - radius;
  const topArcStart = y + radius;
  const bottomArcStart = bottom - radius;
  const centerX = x + width / 2;

  return [
    `M ${centerX} ${y}`,
    `H ${rightInner}`,
    `A ${radius} ${radius} 0 0 1 ${right} ${topArcStart}`,
    `V ${bottomArcStart}`,
    `A ${radius} ${radius} 0 0 1 ${rightInner} ${bottom}`,
    `H ${leftInner}`,
    `A ${radius} ${radius} 0 0 1 ${x} ${bottomArcStart}`,
    `V ${topArcStart}`,
    `A ${radius} ${radius} 0 0 1 ${leftInner} ${y}`,
    "Z",
  ].join(" ");
};

const estimateRoundedRectPerimeter = (
  width: number,
  height: number,
  radius: number,
) => 2 * (width + height - 4 * radius) + 2 * Math.PI * radius;

export default BorderEffectFrame;
