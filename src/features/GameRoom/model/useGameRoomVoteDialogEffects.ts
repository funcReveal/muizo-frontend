import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";

import type { GameState, PlaybackExtensionVoteState } from "../../Room/model/types";

interface UseGameRoomVoteDialogEffectsInput {
  trackSessionKey: string;
  isManualPlaybackExtensionMode: boolean;
  isAutoPlaybackExtensionMode: boolean;
  playbackExtensionVote: PlaybackExtensionVoteState | null;
  playbackExtensionSeconds: number;
  meClientId?: string;
  myPlaybackVote: "approve" | "reject" | null;
  playbackVoteProposalSeconds: number;
  playbackVoteRequesterName: string;
  playbackVoteResolvedSeconds: number;
  gamePhase: GameState["phase"];
  gameStatus: GameState["status"];
  setPlaybackVoteDialogOpen: Dispatch<SetStateAction<boolean>>;
  setPlaybackVoteRequestPending: Dispatch<SetStateAction<boolean>>;
  setPlaybackVoteSubmitPending: Dispatch<SetStateAction<"approve" | "reject" | null>>;
  setStatusText: (text: string) => void;
}

/**
 * Manages vote-dialog side-effects for GameRoomPage:
 *   1. Reset dialog + notification state when track changes
 *   2. Open vote prompt when an active vote arrives and the player hasn't voted
 *   3. Show "active vote" status toast
 *   4. Show "vote resolved" status toast
 *   5. Show "auto extension" status toast
 *
 * Previously these 5 useEffect blocks lived inline in GameRoomPage alongside
 * the SFX effects, obscuring the component's render logic. Extracting them here
 * keeps GameRoomPage focused on UI state and rendering.
 */
export function useGameRoomVoteDialogEffects({
  trackSessionKey,
  isManualPlaybackExtensionMode,
  isAutoPlaybackExtensionMode,
  playbackExtensionVote,
  playbackExtensionSeconds,
  meClientId,
  myPlaybackVote,
  playbackVoteProposalSeconds,
  playbackVoteRequesterName,
  playbackVoteResolvedSeconds,
  gamePhase,
  gameStatus,
  setPlaybackVoteDialogOpen,
  setPlaybackVoteRequestPending,
  setPlaybackVoteSubmitPending,
  setStatusText,
}: UseGameRoomVoteDialogEffectsInput) {
  const lastPlaybackVotePromptKeyRef = useRef<string | null>(null);
  const lastPlaybackVoteActiveKeyRef = useRef<string | null>(null);
  const lastPlaybackVoteResolvedKeyRef = useRef<string | null>(null);
  const lastAutoPlaybackExtensionNoticeRef = useRef<string | null>(null);

  // Reset all vote UI state when the track changes
  useEffect(() => {
    setPlaybackVoteDialogOpen(false);
    setPlaybackVoteRequestPending(false);
    setPlaybackVoteSubmitPending(null);
    lastPlaybackVotePromptKeyRef.current = null;
    lastPlaybackVoteActiveKeyRef.current = null;
    lastPlaybackVoteResolvedKeyRef.current = null;
    lastAutoPlaybackExtensionNoticeRef.current = null;
  }, [
    trackSessionKey,
    setPlaybackVoteDialogOpen,
    setPlaybackVoteRequestPending,
    setPlaybackVoteSubmitPending,
  ]);

  // Open vote dialog once per active vote when the player hasn't voted yet
  useEffect(() => {
    setPlaybackVoteDialogOpen(false);
    if (!isManualPlaybackExtensionMode) return;
    if (!playbackExtensionVote || playbackExtensionVote.status !== "active") return;
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

  // Show "active vote" status text once per vote session
  useEffect(() => {
    if (!playbackExtensionVote || playbackExtensionVote.status !== "active") return;
    if (!isManualPlaybackExtensionMode) return;
    const activeKey = `${trackSessionKey}:${playbackExtensionVote.startedAt}:active`;
    if (lastPlaybackVoteActiveKeyRef.current === activeKey) return;
    lastPlaybackVoteActiveKeyRef.current = activeKey;
    setStatusText(
      `${playbackVoteRequesterName} 提議將本題多播放 ${playbackVoteProposalSeconds} 秒，請儘快投票。`,
    );
  }, [
    isManualPlaybackExtensionMode,
    playbackExtensionVote,
    playbackVoteProposalSeconds,
    playbackVoteRequesterName,
    setStatusText,
    trackSessionKey,
  ]);

  // Show "vote resolved" status text once per resolved vote
  useEffect(() => {
    if (
      !playbackExtensionVote ||
      (playbackExtensionVote.status !== "approved" &&
        playbackExtensionVote.status !== "rejected")
    ) {
      return;
    }
    const resolvedKey = `${trackSessionKey}:${playbackExtensionVote.startedAt}:${playbackExtensionVote.status}:${playbackVoteResolvedSeconds}`;
    if (lastPlaybackVoteResolvedKeyRef.current === resolvedKey) return;
    lastPlaybackVoteResolvedKeyRef.current = resolvedKey;
    if (
      playbackExtensionVote.status === "approved" &&
      playbackVoteResolvedSeconds > 0
    ) {
      setStatusText(`延長播放投票通過，本題已延長 ${playbackVoteResolvedSeconds} 秒`);
      return;
    }
    setStatusText("延長播放投票未通過，本題維持原播放長度");
  }, [
    playbackExtensionVote,
    playbackVoteResolvedSeconds,
    setStatusText,
    trackSessionKey,
  ]);

  // Show "auto extension" status text once per extension event
  useEffect(() => {
    if (!isAutoPlaybackExtensionMode) return;
    if (gamePhase !== "guess" || gameStatus !== "playing") return;
    if (playbackExtensionSeconds <= 0) return;
    const autoNoticeKey = `${trackSessionKey}:${playbackExtensionSeconds}`;
    if (lastAutoPlaybackExtensionNoticeRef.current === autoNoticeKey) return;
    lastAutoPlaybackExtensionNoticeRef.current = autoNoticeKey;
    setStatusText(`仍有玩家未作答，系統已自動延長 ${playbackExtensionSeconds} 秒`);
  }, [
    gamePhase,
    gameStatus,
    isAutoPlaybackExtensionMode,
    playbackExtensionSeconds,
    setStatusText,
    trackSessionKey,
  ]);
}
