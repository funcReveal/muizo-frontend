import React from "react";

const DEFAULT_SCORE_ROLL_DURATION_MS = 520;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] =
    React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const onChange = () => setPrefersReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener("change", onChange);
    return () => mediaQuery.removeEventListener("change", onChange);
  }, []);

  return prefersReducedMotion;
}

interface AnimatedScoreValueProps {
  score: number;
  combo?: number;
  className?: string;
  comboClassName?: string;
  comboPrefix?: "x" | "\u00d7";
  durationMs?: number;
}

export const AnimatedScoreValue = React.memo(function AnimatedScoreValue({
  score,
  combo = 0,
  className,
  comboClassName,
  comboPrefix = "x",
  durationMs = DEFAULT_SCORE_ROLL_DURATION_MS,
}: AnimatedScoreValueProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [displayScore, setDisplayScore] = React.useState(score);
  const displayScoreRef = React.useRef(score);
  const frameRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    displayScoreRef.current = displayScore;
  }, [displayScore]);

  React.useEffect(() => {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    const from = displayScoreRef.current;
    const to = score;
    if (from === to || prefersReducedMotion || durationMs <= 0) {
      displayScoreRef.current = to;
      setDisplayScore(to);
      return undefined;
    }

    const startedAt = window.performance.now();
    const duration = Math.max(120, durationMs);

    const step = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const nextScore = Math.round(from + (to - from) * easeOutCubic(progress));
      displayScoreRef.current = nextScore;
      setDisplayScore(nextScore);

      if (progress < 1) {
        frameRef.current = window.requestAnimationFrame(step);
        return;
      }

      frameRef.current = null;
      displayScoreRef.current = to;
      setDisplayScore(to);
    };

    frameRef.current = window.requestAnimationFrame(step);
    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [durationMs, prefersReducedMotion, score]);

  const isRolling = displayScore !== score;

  return (
    <span
      className={["game-room-animated-score-value", className]
        .filter(Boolean)
        .join(" ")}
      data-rolling={isRolling ? "true" : undefined}
    >
      {displayScore.toLocaleString()}
      {combo > 0 ? (
        <span key={combo} className={comboClassName}>
          {comboPrefix}
          {combo}
        </span>
      ) : null}
    </span>
  );
});
