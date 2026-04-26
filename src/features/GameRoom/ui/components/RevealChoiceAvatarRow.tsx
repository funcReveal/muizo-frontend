import React from "react";

import RoomUiTooltip from "../../../../shared/ui/RoomUiTooltip";
import PlayerAvatar from "../../../../shared/ui/playerAvatar/PlayerAvatar";
import type { RevealChoicePickBadge } from "../../model/gameRoomTypes";
import {
  DEFAULT_AVATAR_EFFECT_LEVEL_VALUE,
  useSettingsModel,
} from "../../../Setting/model/settingsContext";

type RevealChoiceAvatarRowProps = {
  picks: RevealChoicePickBadge[];
};

const VISIBLE_AVATARS = 3;

const RevealChoiceAvatarRow: React.FC<RevealChoiceAvatarRowProps> = React.memo(
  ({ picks }) => {
    const settingsModel = useSettingsModel();
    const avatarEffectLevel =
      settingsModel?.avatarEffectLevel ?? DEFAULT_AVATAR_EFFECT_LEVEL_VALUE;
    const visiblePicks = picks.slice(0, VISIBLE_AVATARS);
    const overflowCount = Math.max(0, picks.length - visiblePicks.length);

    return (
      <div className="game-room-choice-avatar-row" aria-label="選項作答玩家">
        {visiblePicks.map((pick, index) => {
          const tooltipText = pick.isMe ? `${pick.username}（你）` : pick.username;

          return (
            <RoomUiTooltip key={pick.clientId} title={tooltipText}>
              <span
                className="game-room-choice-avatar"
                aria-label={tooltipText}
                style={{ zIndex: visiblePicks.length - index }}
              >
                <PlayerAvatar
                  username={pick.username}
                  clientId={pick.clientId}
                  avatarUrl={pick.avatarUrl ?? undefined}
                  size={44}
                  contentSize={36}
                  isMe={pick.isMe}
                  stateTone={pick.result}
                  effectLevel={avatarEffectLevel}
                />
              </span>
            </RoomUiTooltip>
          );
        })}

        {overflowCount > 0 ? (
          <RoomUiTooltip title={`另外 ${overflowCount} 位玩家`}>
            <span
              className="game-room-choice-avatar-more"
              aria-label={`另外 ${overflowCount} 位玩家`}
            >
              +{overflowCount}
            </span>
          </RoomUiTooltip>
        ) : null}
      </div>
    );
  },
);

export default RevealChoiceAvatarRow;
