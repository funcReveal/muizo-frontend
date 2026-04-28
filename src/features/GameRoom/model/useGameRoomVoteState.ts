import { useMemo } from "react";

import type {
  GameState,
  PlaybackExtensionMode,
  RoomState,
} from "@features/RoomSession";
import { DEFAULT_PLAYBACK_EXTENSION_MODE } from "@domain/room/constants";
import { normalizePlaybackExtensionMode } from "@features/RoomSession";
import { normalizeRoomDisplayText } from "../../../shared/utils/text";

interface UseGameRoomVoteStateInput {
  gameState: GameState;
  room: RoomState["room"];
  meClientId?: string;
  playbackVoteRequestPending: boolean;
}

/**
 * Derives all playback-extension-vote related values from the current game state.
 *
 * Previously these ~15 computed values lived inline inside GameRoomPage and
 * recalculated on every render. Extracting them here groups vote logic in one
 * place and keeps GameRoomPage focused on event-handling and rendering.
 */
export function useGameRoomVoteState({
  gameState,
  room,
  meClientId,
  playbackVoteRequestPending,
}: UseGameRoomVoteStateInput) {
  // ------------------------------------------------------------------
  // Mode resolution
  // ------------------------------------------------------------------
  const playbackExtensionMode: PlaybackExtensionMode =
    normalizePlaybackExtensionMode(
      room.gameSettings?.playbackExtensionMode ??
        DEFAULT_PLAYBACK_EXTENSION_MODE,
    );
  const isManualPlaybackExtensionMode = playbackExtensionMode === "manual_vote";
  const isAutoPlaybackExtensionMode = playbackExtensionMode === "auto_once";

  // ------------------------------------------------------------------
  // Vote object + counts
  // ------------------------------------------------------------------
  const playbackExtensionVote = gameState.playbackExtensionVote ?? null;

  const playbackVoteApproveCount =
    playbackExtensionVote?.approveClientIds.length ?? 0;
  const playbackVoteRejectCount =
    playbackExtensionVote?.rejectClientIds.length ?? 0;
  const playbackVoteEligibleCount =
    playbackExtensionVote?.eligibleClientIds.length ?? 0;
  const playbackVoteMajorityCount =
    playbackVoteEligibleCount > 0
      ? Math.floor(playbackVoteEligibleCount / 2) + 1
      : 0;

  const playbackExtensionSeconds = Math.max(
    0,
    Math.round((gameState.playbackExtensionMs ?? 0) / 1000),
  );

  const hasRequestedRejectedPlaybackExtensionVote =
    !!meClientId &&
    (gameState.playbackExtensionRejectedInitiatedClientIds ?? []).includes(
      meClientId,
    );

  // ------------------------------------------------------------------
  // My vote + metadata
  // ------------------------------------------------------------------
  const myPlaybackVote = useMemo<"approve" | "reject" | null>(() => {
    if (!playbackExtensionVote || !meClientId) return null;
    if (playbackExtensionVote.approveClientIds.includes(meClientId))
      return "approve";
    if (playbackExtensionVote.rejectClientIds.includes(meClientId))
      return "reject";
    return null;
  }, [meClientId, playbackExtensionVote]);

  const playbackVoteRequesterName = normalizeRoomDisplayText(
    playbackExtensionVote?.requestedByUsername,
    "玩家",
  );

  const playbackVoteProposalSeconds = Math.max(
    0,
    Math.round((playbackExtensionVote?.extendMs ?? 0) / 1000),
  );

  const playbackVoteResolvedSeconds = Math.max(
    playbackExtensionSeconds,
    playbackVoteProposalSeconds,
  );

  // ------------------------------------------------------------------
  // Button label
  // ------------------------------------------------------------------
  const playbackVoteButtonLabel = playbackVoteRequestPending
    ? "發起投票中..."
    : playbackExtensionVote?.status === "active"
      ? myPlaybackVote === null
        ? `延長投票 ${playbackVoteApproveCount}/${playbackVoteMajorityCount}`
        : `已投票 ${playbackVoteApproveCount}/${playbackVoteMajorityCount}`
      : playbackExtensionVote?.status === "approved" &&
          playbackVoteResolvedSeconds > 0
        ? `已延長 ${playbackVoteResolvedSeconds} 秒`
        : hasRequestedRejectedPlaybackExtensionVote
          ? "本題已發起失敗"
          : playbackExtensionVote?.status === "rejected"
            ? "投票未通過"
            : playbackExtensionSeconds > 0
              ? `已延長 ${playbackExtensionSeconds} 秒`
              : "延長播放";

  return {
    playbackExtensionMode,
    isManualPlaybackExtensionMode,
    isAutoPlaybackExtensionMode,
    playbackExtensionVote,
    playbackVoteApproveCount,
    playbackVoteRejectCount,
    playbackVoteEligibleCount,
    playbackVoteMajorityCount,
    playbackExtensionSeconds,
    hasRequestedRejectedPlaybackExtensionVote,
    myPlaybackVote,
    playbackVoteRequesterName,
    playbackVoteProposalSeconds,
    playbackVoteResolvedSeconds,
    playbackVoteButtonLabel,
  };
}
