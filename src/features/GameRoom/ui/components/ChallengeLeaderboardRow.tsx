import React from "react";
import type {
  ChallengeLeaderboardEntry,
  ChallengeNearbyOpponent,
  ChallengeProjectedMyStanding,
} from "../../model/projectionTypes";
import PlayerAvatar from "../../../../shared/ui/playerAvatar/PlayerAvatar";
import { normalizeRoomDisplayText } from "../../../../shared/utils/text";

const formatScoreCombo = (score: number, combo: number) =>
  `${score.toLocaleString()}${combo > 0 ? `\u00d7${combo}` : ""}`;
const SCOREBOARD_AVATAR_SIZE = 32;
const SCOREBOARD_AVATAR_CONTENT_SIZE = 26;
const SELF_ROW_PARTICLE_COUNT = 8;

type ChallengeSelfPulseTone = "score" | "rank" | "combo";

interface ChallengeSelfPulseState {
  key: number;
  scoreDelta: number;
  rankDelta: number;
  tone: ChallengeSelfPulseTone;
}

const resolveChallengeSelfPulseTone = ({
  scoreDelta,
  rankDelta,
  comboDelta,
}: {
  scoreDelta: number;
  rankDelta: number;
  comboDelta: number;
}): ChallengeSelfPulseTone => {
  if (rankDelta > 0) return "rank";
  if (comboDelta > 0 && scoreDelta > 0) return "combo";
  return "score";
};

function useChallengeSelfPulse({
  liveScore,
  rankValue,
  combo,
  isSettled,
}: {
  liveScore: number;
  rankValue: number | null;
  combo: number;
  isSettled: boolean;
}): ChallengeSelfPulseState | null {
  const previousRef = React.useRef<{
    liveScore: number;
    rankValue: number | null;
    combo: number;
  } | null>(null);
  const [pulse, setPulse] = React.useState<ChallengeSelfPulseState | null>(null);

  React.useEffect(() => {
    const previous = previousRef.current;
    previousRef.current = { liveScore, rankValue, combo };
    if (!previous || isSettled) return;

    const scoreDelta = liveScore - previous.liveScore;
    const previousRank = previous.rankValue;
    const rankDelta =
      previousRank !== null && rankValue !== null
        ? Math.max(0, previousRank - rankValue)
        : 0;
    const comboDelta = combo - previous.combo;

    if (scoreDelta <= 0 && rankDelta <= 0 && comboDelta <= 0) return;

    setPulse((current) => ({
      key: (current?.key ?? 0) + 1,
      scoreDelta: Math.max(0, scoreDelta),
      rankDelta,
      tone: resolveChallengeSelfPulseTone({
        scoreDelta,
        rankDelta,
        comboDelta,
      }),
    }));
  }, [combo, isSettled, liveScore, rankValue]);

  React.useEffect(() => {
    if (!pulse) return undefined;
    const timer = window.setTimeout(() => {
      setPulse((current) => (current?.key === pulse.key ? null : current));
    }, 1150);
    return () => window.clearTimeout(timer);
  }, [pulse]);

  return pulse;
}

interface ChallengeTopEntryRowProps {
  entry: ChallengeLeaderboardEntry;

  /**
   * Rank shown in the UI after live self is inserted.
   * Do not display entry.rank directly, because live self may push rows down.
   */
  displayRank?: number | null;

  /**
   * True when this row is the viewer's historical official best record.
   * It should look like a normal official row and must not show YOU.
   */
  isViewerHistoricalBest?: boolean;

  /**
   * entry.bestScore − viewerLiveScore.
   * Positive = this player is ahead; negative = viewer has surpassed them.
   * null = do not display the gap for this row.
   */
  liveGap?: number | null;
}

export const ChallengeTopEntryRow = React.memo(
  function ChallengeTopEntryRow({
    entry,
    displayRank = entry.rank,
    isViewerHistoricalBest = false,
    liveGap = null,
  }: ChallengeTopEntryRowProps) {
    const rowTitle = isViewerHistoricalBest
      ? "你的歷史最佳紀錄"
      : undefined;

    return (
      <div
        className="game-room-score-row challenge-lb-row flex items-center justify-between text-sm"
        title={rowTitle}
        aria-label={rowTitle}
      >
        <span className="challenge-lb-row__identity flex min-w-0 flex-1 items-center gap-2 truncate">
          <span className="w-5 shrink-0 text-center text-xs font-bold tabular-nums leading-none text-slate-500">
            {displayRank !== null ? `#${displayRank}` : "--"}
          </span>
          <span className="game-room-score-row-avatar-wrap">
            <PlayerAvatar
              username={entry.displayName}
              avatarUrl={entry.avatarUrl}
              size={SCOREBOARD_AVATAR_SIZE}
              contentSize={SCOREBOARD_AVATAR_CONTENT_SIZE}
              className="player-avatar--scoreboard shrink-0"
            />
          </span>
          <span className="challenge-lb-row__name truncate font-medium text-slate-200">
            {entry.displayName}
          </span>
        </span>
        <span className="challenge-lb-row__score flex shrink-0 items-baseline gap-1.5 whitespace-nowrap font-mono text-xs">
          <span className="font-semibold text-slate-300">
            {formatScoreCombo(entry.bestScore, entry.maxCombo)}
          </span>
          {liveGap != null && (
            <span
              className={`font-semibold ${liveGap > 0 ? "text-rose-400" : "text-emerald-400"
                }`}
            >
              {liveGap > 0
                ? `-${liveGap.toLocaleString()}`
                : `+${Math.abs(liveGap).toLocaleString()}`}
            </span>
          )}
        </span>
      </div>
    );
  },
);

interface ChallengeNearbyRowProps {
  opponent: ChallengeNearbyOpponent;
  approxRank?: number | null;
  /**
   * bestScore - currentLiveScore, computed from the viewer's live score.
   * Positive → opponent is ahead; negative → we surpassed them.
   * Must not use opponent.gapFromMe (API-time snapshot, stale between refreshes).
   */
  liveGap: number;
}

export const ChallengeNearbyRow = React.memo(
  function ChallengeNearbyRow({ opponent, approxRank, liveGap }: ChallengeNearbyRowProps) {
    const isPassed = liveGap <= 0;
    const gapAbs = Math.abs(liveGap);
    const gapText = isPassed
      ? `+${gapAbs.toLocaleString()}`
      : `-${gapAbs.toLocaleString()}`;
    const rankDisplay = (approxRank ?? opponent.rank) != null
      ? `#${approxRank ?? opponent.rank}`
      : "--";

    return (
      <div
        className={`game-room-score-row challenge-lb-nearby-row flex items-center justify-between text-sm ${isPassed ? "challenge-lb-nearby-row--passed opacity-60" : ""
          }`}
      >
        <span className="challenge-lb-row__identity flex min-w-0 flex-1 items-center gap-2 truncate">
          <span className="w-5 shrink-0 text-center text-xs font-bold tabular-nums leading-none text-slate-500">
            {rankDisplay}
          </span>
          <span className="game-room-score-row-avatar-wrap">
            <PlayerAvatar
              username={opponent.displayName}
              avatarUrl={opponent.avatarUrl}
              size={SCOREBOARD_AVATAR_SIZE}
              contentSize={SCOREBOARD_AVATAR_CONTENT_SIZE}
              className="player-avatar--scoreboard shrink-0"
            />
          </span>
          <span className="challenge-lb-row__name truncate text-slate-300">
            {opponent.displayName}
          </span>
        </span>
        <span className="challenge-lb-row__score flex shrink-0 items-baseline gap-1.5 whitespace-nowrap font-mono text-xs">
          <span className="font-semibold text-slate-400">
            {formatScoreCombo(opponent.bestScore, opponent.maxCombo)}
          </span>
          <span
            className={`font-semibold ${isPassed ? "text-emerald-400" : "text-rose-400"
              }`}
          >
            {gapText}
          </span>
        </span>
      </div>
    );
  },
);

export const ChallengeSeparatorRow = React.memo(
  function ChallengeSeparatorRow({ label }: { label?: string }) {
    if (!label) {
      return <div className="my-0.5 h-px bg-white/10 mx-2.5" />;
    }
    return (
      <div className="my-0.5 flex items-center gap-2 px-2.5">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-xs text-slate-500">{label}</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>
    );
  },
);

export const ChallengeEllipsisRow = React.memo(
  function ChallengeEllipsisRow({ fullRow = false }: { fullRow?: boolean }) {
    return (
      <div
        className={
          fullRow
            ? "game-room-score-row flex items-center justify-center text-slate-500 select-none"
            : "flex items-center justify-center py-1.5 text-slate-600 select-none"
        }
      >
        <span className="text-base leading-none">···</span>
      </div>
    );
  },
);

export const ChallengePlaceholderRow = React.memo(
  function ChallengePlaceholderRow({ dim = false }: { dim?: boolean }) {
    return (
      <div
        className={`game-room-score-row flex items-center justify-between text-sm ${dim ? "opacity-10" : "opacity-20"
          }`}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <span className="w-5 shrink-0 text-center text-xs text-slate-600">
            --
          </span>
          <div className="game-room-score-row-avatar-skeleton shrink-0 rounded-full bg-white/10" />
          <div className="h-2.5 w-24 rounded bg-white/10" />
        </span>
        <div className="h-2.5 w-14 shrink-0 rounded bg-white/10" />
      </div>
    );
  },
);

interface ChallengeSelfRowProps {
  standing: ChallengeProjectedMyStanding;
  isSettled?: boolean;
  displayName?: string;
  avatarUrl?: string | null;
  combo?: number;

  /**
   * Rank shown in the UI list.
   * Use this first, because live self may be inserted into Top 10 and push
   * official rows down.
   */
  displayRank?: number | null;

  /**
   * Gap to the player directly ahead: positive = behind, negative = surpassed.
   * Kept in the data model but intentionally not rendered on the self row —
   * displaying it here clutters the viewer's own score cluster.
   * Opponent rows (ChallengeTopEntryRow / ChallengeNearbyRow) still show gaps.
   */
  gapToNext?: number | null;

}

export const ChallengeSelfRow = React.memo(
  function ChallengeSelfRow({
    standing,
    isSettled = false,
    displayName,
    avatarUrl,
    combo = 0,
    displayRank = null,
    // gapToNext is part of the data model but not rendered on the self row
  }: ChallengeSelfRowProps) {
    const { liveScore, projectedRank, officialRank } = standing;
    const name = normalizeRoomDisplayText(displayName ?? "", "Player");
    const rankValue =
      displayRank !== null
        ? displayRank
        : isSettled
          ? officialRank
          : projectedRank;

    const isOutsideTop1000 =
      !isSettled && projectedRank === null && standing.nextTarget !== null;
    const rankLabel = rankValue !== null
      ? `#${rankValue}`
      : isOutsideTop1000
        ? "未上榜"
        : "--";
    const rankColor = isSettled ? "text-amber-300" : "text-sky-300";
    const pulse = useChallengeSelfPulse({
      liveScore,
      rankValue,
      combo,
      isSettled,
    });
    const pulseText =
      pulse && pulse.scoreDelta > 0
        ? `+${pulse.scoreDelta.toLocaleString()}`
        : pulse && pulse.rankDelta > 0
          ? `#${rankValue ?? projectedRank ?? "--"}`
          : "";

    return (
      <div
        className={`game-room-score-row game-room-score-row--me challenge-lb-self-row challenge-lb-self-row--pulse-${pulse?.tone ?? "idle"} flex items-center justify-between text-sm bg-white/8 ring-1 ring-white/15`}
      >
        {pulse && (
          <span
            key={`pulse-${pulse.key}`}
            className={`challenge-lb-self-effects challenge-lb-self-effects--${pulse.tone}`}
            aria-hidden="true"
          >
            <span className="challenge-lb-self-effects__ring" />
            <span className="challenge-lb-self-effects__sweep" />
            <span className="challenge-lb-self-effects__label">
              {pulseText}
            </span>
            <span className="challenge-lb-self-effects__particles">
              {Array.from({ length: SELF_ROW_PARTICLE_COUNT }, (_, index) => (
                <span
                  key={index}
                  className="challenge-lb-self-effects__particle"
                  style={
                    {
                      "--challenge-self-particle-index": index,
                      "--challenge-self-particle-left": `${20 + index * 8.5}%`,
                      "--challenge-self-particle-x": `${(index - 3.5) * 8}px`,
                      "--challenge-self-particle-y": `${(index % 3) * 8}px`,
                    } as React.CSSProperties
                  }
                />
              ))}
            </span>
          </span>
        )}
        <span className="challenge-lb-row__identity flex min-w-0 flex-1 items-center gap-2 truncate">
          <span
            className={`${isOutsideTop1000 ? "w-10" : "w-5"} shrink-0 text-center text-xs font-bold tabular-nums leading-none ${rankColor}`}
          >
            {rankLabel}
          </span>
          <span className="game-room-score-row-avatar-wrap">
            <PlayerAvatar
              username={name}
              avatarUrl={avatarUrl ?? null}
              size={SCOREBOARD_AVATAR_SIZE}
              contentSize={SCOREBOARD_AVATAR_CONTENT_SIZE}
              isMe
              className="player-avatar--scoreboard shrink-0"
            />
          </span>
          <span className="challenge-lb-row__name truncate font-medium text-white/90">
            {name}
          </span>
          <span className="game-room-score-row-you-badge">YOU</span>
        </span>
        <span className="challenge-lb-row__score flex shrink-0 items-baseline whitespace-nowrap text-right font-mono">
          <span className="text-sm font-semibold tabular-nums text-emerald-300">
            {formatScoreCombo(liveScore, combo)}
          </span>
        </span>
      </div>
    );
  },
);
