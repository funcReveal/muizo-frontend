import React from "react";
import type { RevealChoicePickBadge } from "./gameRoomPageTypes";

type RevealChoiceAvatarRowProps = {
    picks: RevealChoicePickBadge[];
};

const RevealChoiceAvatarRow: React.FC<RevealChoiceAvatarRowProps> = ({
    picks,
}) => {
    const visiblePicks = picks.slice(0, 16);

    return (
        <div className="game-room-choice-avatar-row" aria-label="作答玩家頭像列">
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
        </div>
    );
};

export default RevealChoiceAvatarRow;