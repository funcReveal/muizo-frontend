import React from "react";
import type { RoomParticipant } from "@features/RoomSession";
import { normalizeRoomDisplayText } from "../../../../shared/utils/text";
import PlayerAvatar from "../../../../shared/ui/playerAvatar/PlayerAvatar";
import { AnimatedScoreValue } from "./AnimatedScoreValue";
import { LeaderboardCompactRow } from "./LeaderboardCompactRow";

const SCOREBOARD_AVATAR_SIZE = 32;
const SCOREBOARD_AVATAR_CONTENT_SIZE = 26;

interface RoomSelfStickyBarProps {
  player: RoomParticipant;
  rank: number;
}

export const RoomSelfStickyBar = React.memo(function RoomSelfStickyBar({
  player,
  rank,
}: RoomSelfStickyBarProps) {
  const displayName = normalizeRoomDisplayText(player.username, "Player");
  const combo = player.combo ?? 0;
  const answerDotClass =
    player.isOnline !== false ? "bg-emerald-400" : "bg-slate-500";

  return (
    <div className="game-room-room-self-sticky-bar shrink-0 space-y-1">
      <div className="h-px bg-white/10" />
      <LeaderboardCompactRow
        className="game-room-score-row--me game-room-score-row--sticky-self"
        rankLabel={`#${rank}`}
        avatarNode={
          <span className="game-room-score-row-avatar-wrap">
            <PlayerAvatar
              username={displayName}
              clientId={player.clientId}
              avatarUrl={player.avatar_url ?? player.avatarUrl ?? undefined}
              size={SCOREBOARD_AVATAR_SIZE}
              contentSize={SCOREBOARD_AVATAR_CONTENT_SIZE}
              isMe
              className="player-avatar--scoreboard"
            />
            <span
              className={`game-room-score-row-answer-dot-badge ${answerDotClass}`}
            />
          </span>
        }
        name={displayName}
        badges={<span className="game-room-score-row-you-badge">YOU</span>}
        scoreNode={
          <AnimatedScoreValue
            score={player.score}
            combo={combo}
            comboPrefix={"\u00d7"}
            className="text-sm font-semibold tabular-nums text-emerald-300"
            comboClassName="font-normal text-slate-500"
          />
        }
      />
    </div>
  );
});
