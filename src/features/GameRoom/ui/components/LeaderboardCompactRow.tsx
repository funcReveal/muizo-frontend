import React from "react";

interface LeaderboardCompactRowProps {
  className?: string;
  style?: React.CSSProperties;
  title?: string;
  ariaLabel?: string;
  rowRef?: (node: HTMLDivElement | null) => void;
  rankLabel: string;
  rankClassName?: string;
  avatarNode: React.ReactNode;
  name: string;
  nameClassName?: string;
  badges?: React.ReactNode;
  statusNode?: React.ReactNode;
  scoreNode: React.ReactNode;
  effectsNode?: React.ReactNode;
}

export const LeaderboardCompactRow = React.memo(
  function LeaderboardCompactRow({
    className,
    style,
    title,
    ariaLabel,
    rowRef,
    rankLabel,
    rankClassName,
    avatarNode,
    name,
    nameClassName,
    badges,
    statusNode,
    scoreNode,
    effectsNode,
  }: LeaderboardCompactRowProps) {
    return (
      <div
        ref={rowRef}
        className={[
          "game-room-score-row",
          "leaderboard-compact-row",
          "flex items-center justify-between text-sm",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        style={style}
        title={title}
        aria-label={ariaLabel}
      >
        {effectsNode}
        <span className="leaderboard-compact-row__identity challenge-lb-row__identity flex min-w-0 flex-1 items-center gap-2 truncate">
          <span
            className={[
              "leaderboard-compact-row__rank w-5 shrink-0 text-center text-xs font-bold tabular-nums leading-none text-slate-500",
              rankClassName,
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {rankLabel}
          </span>
          {avatarNode}
          <span
            className={[
              "leaderboard-compact-row__name challenge-lb-row__name truncate",
              nameClassName ?? "text-slate-200",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {name}
          </span>
          {badges}
        </span>
        {statusNode ? (
          <span className="leaderboard-compact-row__status shrink-0">
            {statusNode}
          </span>
        ) : null}
        <span className="leaderboard-compact-row__score challenge-lb-row__score flex shrink-0 items-baseline gap-1.5 whitespace-nowrap text-right font-mono">
          {scoreNode}
        </span>
      </div>
    );
  },
);
