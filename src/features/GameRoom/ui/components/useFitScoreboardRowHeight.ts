import React from "react";

/**
 * useFitScoreboardRowHeight
 *
 * Makes a fixed-count scoreboard list (the challenge leaderboard) shrink its
 * row height just enough to fit the available panel height, so it never
 * overflows and never shows a scrollbar — regardless of browser scrollbar
 * heuristics (Chrome classic vs Edge overlay) or sub-pixel rounding.
 *
 * Why a measured CSS variable instead of flexbox shrink:
 *   The challenge rows are wrapped in framer-motion `motion.div` items whose
 *   inner rows carry a fixed height. Pure `flex-shrink` would shrink the
 *   wrapper while the inner row overflows it. Driving the existing
 *   `--game-room-scoreboard-row-height` custom property instead keeps a single
 *   source of truth for row sizing and leaves the FLIP layout animation
 *   (position-only) untouched.
 *
 * Behaviour:
 *   - When the panel is tall enough, the row height stays at its CSS default
 *     (clamped to MAX) so the layout looks identical to before.
 *   - When rows would overflow, the height shrinks — but only down to MIN, a
 *     comfortable readable floor. Below that the rows stop shrinking and the
 *     list simply scrolls (a fixed, legible size beats illegibly tiny rows).
 *     This matters on short panels such as the mobile leaderboard drawer.
 *
 * The variable is written on the list node itself, so it overrides the value
 * inherited from `.game-room-leaderboard-sidebar` only for this subtree and
 * never leaks into the room scoreboard, which legitimately scrolls.
 */

// Comfortable readable floor. On panels too short to fit every row at this
// height the list scrolls instead of shrinking rows further.
//
// The floor is larger on mobile: the leaderboard there lives in a tall drawer
// where legible rows matter more than fitting every row without a scroll, while
// the wide desktop sidebar prioritises showing the whole board at once.
const MIN_ROW_HEIGHT_MOBILE = 48;
const MIN_ROW_HEIGHT_DESKTOP = 44;
const DEFAULT_MAX_ROW_HEIGHT = 52;
const FALLBACK_GAP = 6;

// Mirrors the game's mobile-layout breakpoint (GameRoomPage
// MOBILE_GAME_VIEWPORT_QUERY). Kept as a local constant to avoid importing the
// page module (and the resulting circular dependency) into this leaf hook.
const MOBILE_VIEWPORT_QUERY = "(max-width: 1479.95px)";

export function useFitScoreboardRowHeight<T extends HTMLElement>(
  rowCount: number,
  maxRowHeight: number = DEFAULT_MAX_ROW_HEIGHT,
) {
  const nodeRef = React.useRef<T | null>(null);

  const recompute = React.useCallback(() => {
    const el = nodeRef.current;
    if (!el) return;

    // Use the logical row count (not live childElementCount) so rows that are
    // mid-exit animation do not transiently inflate the divisor.
    if (rowCount <= 0) return;
    const renderedRows = rowCount;

    const stack = el.firstElementChild as HTMLElement | null;
    const styles = getComputedStyle(el);
    const paddingY =
      parseFloat(styles.paddingTop || "0") +
      parseFloat(styles.paddingBottom || "0");

    const stackGap = stack
      ? parseFloat(getComputedStyle(stack).rowGap || "")
      : NaN;
    const gap = Number.isFinite(stackGap) ? stackGap : FALLBACK_GAP;

    const available = el.clientHeight - paddingY;
    if (available <= 0) return;

    const minRowHeight =
      typeof window !== "undefined" &&
      window.matchMedia(MOBILE_VIEWPORT_QUERY).matches
        ? MIN_ROW_HEIGHT_MOBILE
        : MIN_ROW_HEIGHT_DESKTOP;

    const ideal = Math.floor(
      (available - gap * (renderedRows - 1)) / renderedRows,
    );
    const rowHeight = Math.max(
      minRowHeight,
      Math.min(maxRowHeight, ideal),
    );

    el.style.setProperty(
      "--game-room-scoreboard-row-height",
      `${rowHeight}px`,
    );
  }, [rowCount, maxRowHeight]);

  // Recompute whenever the row count changes (rows enter / exit).
  React.useLayoutEffect(() => {
    recompute();
  }, [recompute]);

  // Recompute on panel resize.
  React.useEffect(() => {
    const el = nodeRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => recompute());
    observer.observe(el);
    return () => observer.disconnect();
  }, [recompute]);

  return React.useCallback(
    (node: T | null) => {
      nodeRef.current = node;
      recompute();
    },
    [recompute],
  );
}
