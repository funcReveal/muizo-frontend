import React from "react";

import RoomUiTooltip from "../../../../../shared/ui/RoomUiTooltip";
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
      <div className="game-room-choice-avatar-row" aria-label="作答玩家">
        {visiblePicks.map((pick, index) => {
          const tooltipText = pick.isMe ? `${pick.username}（你）` : pick.username;

          return (
            <RoomUiTooltip key={pick.clientId} title={tooltipText}>
              <span
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
                aria-label={tooltipText}
                style={{ zIndex: visiblePicks.length - index }}
              >
                {pick.avatarUrl ? (
                  <img
                    src={pick.avatarUrl}
                    alt=""
                    className="game-room-choice-avatar__image"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  pick.initial
                )}
              </span>
            </RoomUiTooltip>
          );
        })}

        {overflowCount > 0 ? (
          <RoomUiTooltip title={`另外還有 ${overflowCount} 位玩家`}>
            <span className="game-room-choice-avatar-more" aria-label={`另外還有 ${overflowCount} 位玩家`}>
              +{overflowCount}
            </span>
          </RoomUiTooltip>
        ) : null}
      </div>
    );
  },
);

export default RevealChoiceAvatarRow;
