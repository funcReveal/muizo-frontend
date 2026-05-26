import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";

import type {
  PlaybackExtensionVoteState,
} from "@features/RoomSession";

interface UseGameRoomVoteDialogEffectsInput {
  trackSessionKey: string;
  isManualPlaybackExtensionMode: boolean;
  playbackExtensionVote: PlaybackExtensionVoteState | null;
  meClientId?: string;
  myPlaybackVote: "approve" | "reject" | null;
  setPlaybackVoteDialogOpen: Dispatch<SetStateAction<boolean>>;
  setPlaybackVoteRequestPending: Dispatch<SetStateAction<boolean>>;
  setPlaybackVoteSubmitPending: Dispatch<
    SetStateAction<"approve" | "reject" | null>
  >;
}

/**
 * Manages vote-dialog side-effects for GameRoomPage:
 *   1. Reset dialog state when track changes
 *   2. Close dialog when vote is no longer active
 */
export function useGameRoomVoteDialogEffects({
  trackSessionKey,
  isManualPlaybackExtensionMode,
  playbackExtensionVote,
  meClientId,
  myPlaybackVote,
  setPlaybackVoteDialogOpen,
  setPlaybackVoteRequestPending,
  setPlaybackVoteSubmitPending,
}: UseGameRoomVoteDialogEffectsInput) {
  const lastPlaybackVotePromptKeyRef = useRef<string | null>(null);

  useEffect(() => {
    setPlaybackVoteDialogOpen(false);
    setPlaybackVoteRequestPending(false);
    setPlaybackVoteSubmitPending(null);
    lastPlaybackVotePromptKeyRef.current = null;
  }, [
    trackSessionKey,
    setPlaybackVoteDialogOpen,
    setPlaybackVoteRequestPending,
    setPlaybackVoteSubmitPending,
  ]);

  useEffect(() => {
    if (!isManualPlaybackExtensionMode) return;

    if (!playbackExtensionVote || playbackExtensionVote.status !== "active") {
      setPlaybackVoteDialogOpen(false);
      return;
    }

    if (!meClientId || myPlaybackVote !== null) return;

    const promptKey = `${trackSessionKey}:${playbackExtensionVote.startedAt}`;
    if (lastPlaybackVotePromptKeyRef.current === promptKey) return;

    lastPlaybackVotePromptKeyRef.current = promptKey;
  }, [
    isManualPlaybackExtensionMode,
    meClientId,
    myPlaybackVote,
    playbackExtensionVote,
    setPlaybackVoteDialogOpen,
    trackSessionKey,
  ]);
}
