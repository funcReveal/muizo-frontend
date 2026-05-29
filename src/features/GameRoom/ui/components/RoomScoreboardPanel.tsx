/**
 * RoomScoreboardPanel
 *
 * Thin wrapper that forwards all props to GameRoomLeftSidebar.
 * Exists so GameRoomLeaderboardSidebar can swap between panels cleanly
 * without duplicating the prop list.
 */

import React from "react";
import GameRoomLeftSidebar from "./GameRoomLeftSidebar";
import type { QuestionScoreBreakdown, RoomParticipant } from "@features/RoomSession";
import type { TopTwoSwapState } from "../../model/gameRoomTypes";
import type { ScoreboardRow } from "../../model/gameRoomDerivations";
import type {
  ScoreboardBorderAnimationId,
  ScoreboardBorderLineStyleId,
  ScoreboardBorderThemeId,
} from "../../../Setting/model/scoreboardBorderEffects";
import type { AvatarEffectLevel } from "../../../../shared/ui/playerAvatar/playerAvatarTheme";

export interface RoomScoreboardPanelProps {
  scoreboardRows: ScoreboardRow[];
  answeredClientIdSet: Set<string>;
  answeredRankByClientId: Map<string, number>;
  scorePartsByClientId: Map<string, { base: number; gain: number }>;
  scoreBreakdownByClientId?: Map<string, QuestionScoreBreakdown>;
  revealAnswerResultByClientId?: ReadonlyMap<string, "correct" | "wrong" | "unanswered">;
  isReveal: boolean;
  meClientId?: string;
  meRoomRank?: number | null;
  meRoomParticipant?: RoomParticipant | null;
  roomRankByClientId?: Map<string, number>;
  topTwoSwapState: TopTwoSwapState | null;
  className?: string;
  onOpenMobileChat?: () => void;
  mobileChatUnread?: number;
  mobileOverlayMode?: boolean;
  mobileMinimalHeader?: boolean;
  swapAnimationEnabled?: boolean;
  swapReplayToken?: number;
  avatarEffectLevel?: AvatarEffectLevel;
  scoreboardBorderEnabled?: boolean;
  scoreboardBorderMaskEnabled?: boolean;
  scoreboardBorderAnimation?: ScoreboardBorderAnimationId;
  scoreboardBorderLineStyle?: ScoreboardBorderLineStyleId;
  scoreboardBorderTheme?: ScoreboardBorderThemeId;
  scoreboardBorderParticleCount?: number;
}

const RoomScoreboardPanel: React.FC<RoomScoreboardPanelProps> = (props) => {
  return <GameRoomLeftSidebar {...props} />;
};

export default RoomScoreboardPanel;
