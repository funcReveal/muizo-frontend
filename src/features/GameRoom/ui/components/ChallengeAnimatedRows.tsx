/**
 * ChallengeAnimatedRows
 *
 * Renders the ordered list of challenge leaderboard rows with move / enter /
 * exit animations using motion/react.
 *
 * Animation strategy
 * ──────────────────
 * Move   — `layout="position"` delegates FLIP position tracking to motion.
 *          When a row's key stays the same but its DOM position changes
 *          (e.g. self climbing from rank #8 to #6), motion springs it smoothly.
 *
 * Enter  — `initial={{ opacity: 0, y: 10 }}` fades + slides rows in from
 *          slightly below.  New opponents that appear above self slide in from
 *          above (y: -10) — detected by comparing key insertion side relative
 *          to the self:list row.
 *
 * Exit   — `exit={{ opacity: 0, transition: { duration: 0.22 } }}` fades
 *          rows out quickly so the layout reflow feels snappy rather than
 *          waiting for a slow collapse.
 *
 * prefers-reduced-motion — `useReducedMotion()` disables y-axis translations
 *          and spring physics; only opacity cross-fades remain.
 *
 * Design constraints
 * ──────────────────
 * • Sticky self bar is NOT part of this list; it uses a separate key
 *   ("self:sticky") and is rendered outside this component.
 * • Placeholder rows enter/exit without layout tracking — they are spacers.
 * • This component does NOT call getBoundingClientRect; all measurement is
 *   delegated to motion via useLayoutEffect inside motion.div.
 * • No timers are created here; cleanup is fully handled by motion.
 */

import React, { useMemo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type {
  ChallengeLeaderboardDisplayRow,
} from "../../model/buildChallengeLeaderboardDisplayRows";
import type { ChallengeProjectedMyStanding } from "../../model/projectionTypes";
import {
  ChallengeTopEntryRow,
  ChallengeNearbyRow,
  ChallengeSelfRow,
  ChallengeEllipsisRow,
  ChallengePlaceholderRow,
} from "./ChallengeLeaderboardRow";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Props for ChallengeSelfRow excluding gapToNext (provided by display row). */
export interface SelfRowBaseProps {
  standing: ChallengeProjectedMyStanding;
  isSettled?: boolean;
  displayName?: string;
  avatarUrl?: string | null;
  combo?: number;
}

interface ChallengeAnimatedRowsProps {
  rows: ChallengeLeaderboardDisplayRow[];
  selfRowBaseProps: SelfRowBaseProps;
}

// ---------------------------------------------------------------------------
// Animation constants
// ---------------------------------------------------------------------------

const SPRING = { type: "spring", stiffness: 310, damping: 30, mass: 0.85 } as const;
const ENTER_EASE = [0.25, 0.8, 0.25, 1] as [number, number, number, number];
const ENTER_DURATION = 0.35;
const EXIT_DURATION = 0.22;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ChallengeAnimatedRows = React.memo(
  function ChallengeAnimatedRows({ rows, selfRowBaseProps }: ChallengeAnimatedRowsProps) {
    const reduced = useReducedMotion();

    // Determine the index of self:list so we can give entering rows above it
    // a downward-biased entry (they come from above = negative y).
    const selfListIdx = useMemo(
      () => rows.findIndex((r) => r.key === "self:list"),
      [rows],
    );

    return (
      <AnimatePresence initial={false} mode="popLayout">
        {rows.map((row, idx) => {
          const content = renderRowContent(row, selfRowBaseProps);
          const key = row.key;

          // Placeholders are spacers — no layout tracking, simple fade only.
          if (row.kind === "placeholder") {
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: ENTER_DURATION, ease: ENTER_EASE }}
              >
                {content}
              </motion.div>
            );
          }

          if (reduced) {
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {content}
              </motion.div>
            );
          }

          // Entering rows above self slide in from slightly above (y < 0);
          // rows below self (or when self is not in list) slide in from below.
          const isAboveSelf = selfListIdx >= 0 && idx < selfListIdx;
          const enterY = isAboveSelf ? -10 : 10;

          return (
            <motion.div
              key={key}
              layout="position"
              initial={{ opacity: 0, y: enterY }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: EXIT_DURATION } }}
              transition={{
                duration: ENTER_DURATION,
                ease: ENTER_EASE,
                layout: SPRING,
              }}
            >
              {content}
            </motion.div>
          );
        })}
      </AnimatePresence>
    );
  },
);

// ---------------------------------------------------------------------------
// Row content renderer (pure, no hooks)
// ---------------------------------------------------------------------------

function renderRowContent(
  row: ChallengeLeaderboardDisplayRow,
  selfRowBaseProps: SelfRowBaseProps,
): React.ReactNode {
  switch (row.kind) {
    case "player":
      if (row.section === "top") {
        return (
          <ChallengeTopEntryRow
            entry={row.entry}
            displayRank={row.displayRank}
            isViewerHistoricalBest={row.isViewerHistoricalBest}
            liveGap={row.liveGap}
          />
        );
      }
      // section === "nearby"
      return (
        <ChallengeNearbyRow
          opponent={row.opponent}
          approxRank={row.approxRank}
          liveGap={row.liveGap}
        />
      );

    case "self":
      return (
        <ChallengeSelfRow
          {...selfRowBaseProps}
          displayRank={row.displayRank}
          gapToNext={row.gapToNext}
        />
      );

    case "ellipsis":
      return <ChallengeEllipsisRow />;

    case "placeholder":
      return <ChallengePlaceholderRow dim />;
  }
}
