import React from "react";

import type { RevealChoicePickBadge } from "./gameRoomPageTypes";

type RevealChoiceAvatarRowProps = {
  picks: RevealChoicePickBadge[];
};

const VISIBLE_AVATARS = 3;

const RevealChoiceAvatarRow: React.FC<RevealChoiceAvatarRowProps> = React.memo(
  ({ picks }) => {
    const visiblePicks = picks.slice(0, VISIBLE_AVATARS);
    const overflowCount = Math.max(0, picks.length - visiblePicks.length);

    return (
      <div className="game-room-choice-avatar-row" aria-label="作答玩家列表">
        {visiblePicks.map((pick, index) => (
          <span
            key={pick.clientId}
            className={[
              "game-room-choice-avatar",
              pick.result === "correct"
                ? "game-room-choice-avatar--correct"
                : pick.result === "wrong"
                  ? "game-room-choice-avatar--wrong"
                  : "game-room-choice-avatar--unanswered",
              pick.isMe ? "game-room-choice-avatar--me" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            title={pick.isMe ? `${pick.username}（你）` : pick.username}
            aria-label={pick.isMe ? `${pick.username}（你）` : pick.username}
            style={{ zIndex: visiblePicks.length - index }}
          >
            {pick.initial}
          </span>
        ))}

        {overflowCount > 0 ? (
          <span
            className="game-room-choice-avatar-more"
            aria-label={`另外還有 ${overflowCount} 位玩家`}
            title={`另外還有 ${overflowCount} 位玩家`}
          >
            +{overflowCount}
          </span>
        ) : null}
      </div>
    );
  },
);

export default RevealChoiceAvatarRow;
