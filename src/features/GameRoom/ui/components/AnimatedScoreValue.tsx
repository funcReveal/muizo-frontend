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
  comboPrefix?: "x" | "×";
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
  const spanRef = React.useRef<HTMLSpanElement | null>(null);
  // displayScoreRef tracks the value currently shown in the DOM (mid-animation).
  const displayScoreRef = React.useRef(score);
  const frameRef = React.useRef<number | null>(null);
  // committedScore is React state — only updated at animation end (or when no
  // animation runs). This means at most 1 re-render per score change instead
  // of ~30 (one per animation frame). DOM is mutated directly during the roll.
  const [committedScore, setCommittedScore] = React.useState(score);

  // After every React render, correct the text node to the current animated
  // value. This handles the edge case where a re-render (e.g. combo change)
  // overwrites the text with committedScore while an animation is in progress.
  React.useLayoutEffect(() => {
    const span = spanRef.current;
    if (!span) return;
    const textNode = span.firstChild;
    if (textNode?.nodeType === Node.TEXT_NODE) {
      const current = displayScoreRef.current.toLocaleString();
      if (textNode.textContent !== current) {
        textNode.textContent = current;
      }
    }
  });

  React.useEffect(() => {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    const from = displayScoreRef.current;
    const to = score;

    if (from === to || prefersReducedMotion || durationMs <= 0) {
      displayScoreRef.current = to;
      setCommittedScore(to);
      return undefined;
    }

    const startedAt = window.performance.now();
    const duration = Math.max(120, durationMs);
    const span = spanRef.current;

    const step = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const nextScore = Math.round(from + (to - from) * easeOutCubic(progress));
      displayScoreRef.current = nextScore;

      // Mutate the DOM text node directly — no React re-render triggered.
      if (span) {
        const textNode = span.firstChild;
        if (textNode?.nodeType === Node.TEXT_NODE) {
          textNode.textContent = nextScore.toLocaleString();
        }
      }

      if (progress < 1) {
        frameRef.current = window.requestAnimationFrame(step);
        return;
      }

      // Animation complete: sync React state (triggers exactly 1 re-render).
      frameRef.current = null;
      displayScoreRef.current = to;
      setCommittedScore(to);
    };

    frameRef.current = window.requestAnimationFrame(step);
    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [durationMs, prefersReducedMotion, score]);

  // isRolling derives from committed vs target — no extra state needed.
  // React sets data-rolling="true" on the render triggered by the score prop
  // change (committedScore still holds the old value at that point), and clears
  // it on the render triggered by setCommittedScore at animation end.
  const isRolling = committedScore !== score;

  return (
    <span
      ref={spanRef}
      className={["game-room-animated-score-value", className]
        .filter(Boolean)
        .join(" ")}
      data-rolling={isRolling ? "true" : undefined}
    >
      {committedScore.toLocaleString()}
      {combo > 0 ? (
        <span key={combo} className={comboClassName}>
          {comboPrefix}
          {combo}
        </span>
      ) : null}
    </span>
  );
});
