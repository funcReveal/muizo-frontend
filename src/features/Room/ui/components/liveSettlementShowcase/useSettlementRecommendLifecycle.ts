import {
  useCallback,
  useEffect,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";

type PreviewPlaybackMode = "idle" | "auto" | "manual";

interface UseSettlementRecommendLifecycleParams {
  activeTab: "overview" | "recommend";
  autoPreviewEnabled: boolean;
  previewPlaybackMode: PreviewPlaybackMode;
  autoAdvanceAtMs: number | null;
  pausedCountdownRemainingMs: number | null;
  previewPlayerState: "idle" | "playing" | "paused";
  isCurrentRecommendationPreviewOpen: boolean;
  currentRecommendationPreviewUrl: string | null;
  recommendPreviewSeconds: number;
  autoAdvanceAtMsRef: MutableRefObject<number | null>;
  pausedCountdownRemainingMsRef: MutableRefObject<number | null>;
  previewPlayerStateRef: MutableRefObject<"idle" | "playing" | "paused">;
  previewLastProgressAtMsRef: MutableRefObject<number | null>;
  postYouTubeCommand: (func: string, args?: unknown[]) => void;
  pushPreviewSwitchNotice: (text: string) => void;
  setPreviewPlaybackMode: Dispatch<SetStateAction<PreviewPlaybackMode>>;
  setPreviewRecapKey: Dispatch<SetStateAction<string | null>>;
  setPreviewPlayerState: Dispatch<
    SetStateAction<"idle" | "playing" | "paused">
  >;
  setAutoAdvanceAtMs: Dispatch<SetStateAction<number | null>>;
  setPausedCountdownRemainingMs: Dispatch<SetStateAction<number | null>>;
  setPreviewCountdownSec: Dispatch<SetStateAction<number>>;
}

interface UseSettlementRecommendLifecycleResult {
  resetRecommendPreviewState: () => void;
}

const useSettlementRecommendLifecycle = ({
  activeTab,
  autoPreviewEnabled,
  previewPlaybackMode,
  autoAdvanceAtMs,
  pausedCountdownRemainingMs,
  previewPlayerState,
  isCurrentRecommendationPreviewOpen,
  currentRecommendationPreviewUrl,
  recommendPreviewSeconds,
  autoAdvanceAtMsRef,
  pausedCountdownRemainingMsRef,
  previewPlayerStateRef,
  previewLastProgressAtMsRef,
  postYouTubeCommand,
  pushPreviewSwitchNotice,
  setPreviewPlaybackMode,
  setPreviewRecapKey,
  setPreviewPlayerState,
  setAutoAdvanceAtMs,
  setPausedCountdownRemainingMs,
  setPreviewCountdownSec,
}: UseSettlementRecommendLifecycleParams): UseSettlementRecommendLifecycleResult => {
  const resetRecommendPreviewState = useCallback(() => {
    setPreviewPlaybackMode("idle");
    setPreviewRecapKey(null);
    setPreviewPlayerState("idle");
    setAutoAdvanceAtMs(null);
    setPausedCountdownRemainingMs(null);
    setPreviewCountdownSec(recommendPreviewSeconds);
  }, [
    recommendPreviewSeconds,
    setAutoAdvanceAtMs,
    setPausedCountdownRemainingMs,
    setPreviewCountdownSec,
    setPreviewPlaybackMode,
    setPreviewPlayerState,
    setPreviewRecapKey,
  ]);

  useEffect(() => {
    if (activeTab !== "recommend") return;
    if (!autoPreviewEnabled || previewPlaybackMode !== "auto") return;
    if (autoAdvanceAtMs === null) return;
    if (pausedCountdownRemainingMs !== null || previewPlayerState === "paused") {
      return;
    }
    if (!isCurrentRecommendationPreviewOpen || !currentRecommendationPreviewUrl) {
      return;
    }
    if (previewPlayerState === "playing") return;
    const timers = [720, 1280, 1960].map((delay) =>
      window.setTimeout(() => {
        if (
          autoAdvanceAtMsRef.current === null ||
          pausedCountdownRemainingMsRef.current !== null ||
          previewPlayerStateRef.current === "paused"
        ) {
          return;
        }
        postYouTubeCommand("playVideo");
      }, delay),
    );
    return () => {
      timers.forEach((timerId) => window.clearTimeout(timerId));
    };
  }, [
    activeTab,
    autoAdvanceAtMs,
    autoAdvanceAtMsRef,
    autoPreviewEnabled,
    currentRecommendationPreviewUrl,
    isCurrentRecommendationPreviewOpen,
    pausedCountdownRemainingMs,
    pausedCountdownRemainingMsRef,
    postYouTubeCommand,
    previewPlaybackMode,
    previewPlayerState,
    previewPlayerStateRef,
  ]);

  useEffect(() => {
    if (activeTab !== "recommend") return;
    if (!autoPreviewEnabled || previewPlaybackMode !== "auto") return;
    if (!isCurrentRecommendationPreviewOpen || !currentRecommendationPreviewUrl) {
      return;
    }
    if (autoAdvanceAtMs === null) return;
    const timer = window.setTimeout(() => {
      if (previewPlayerStateRef.current === "playing") return;
      const lastProgressAt = previewLastProgressAtMsRef.current;
      if (lastProgressAt !== null && Date.now() - lastProgressAt <= 3200) {
        previewPlayerStateRef.current = "playing";
        setPreviewPlayerState("playing");
        return;
      }
      const remainingMs = Math.max(
        0,
        autoAdvanceAtMsRef.current !== null
          ? autoAdvanceAtMsRef.current - Date.now()
          : pausedCountdownRemainingMsRef.current ?? recommendPreviewSeconds * 1000,
      );
      autoAdvanceAtMsRef.current = null;
      pausedCountdownRemainingMsRef.current = remainingMs;
      setAutoAdvanceAtMs(null);
      setPausedCountdownRemainingMs(remainingMs);
      setPreviewCountdownSec(Math.max(0, Math.ceil(remainingMs / 1000)));
      setPreviewPlayerState("paused");
      pushPreviewSwitchNotice("瀏覽器限制自動播放，點擊影片區即可開始");
    }, 4200);
    return () => window.clearTimeout(timer);
  }, [
    activeTab,
    autoAdvanceAtMs,
    autoAdvanceAtMsRef,
    autoPreviewEnabled,
    currentRecommendationPreviewUrl,
    isCurrentRecommendationPreviewOpen,
    pausedCountdownRemainingMsRef,
    previewLastProgressAtMsRef,
    previewPlaybackMode,
    previewPlayerStateRef,
    pushPreviewSwitchNotice,
    recommendPreviewSeconds,
    setAutoAdvanceAtMs,
    setPausedCountdownRemainingMs,
    setPreviewCountdownSec,
    setPreviewPlayerState,
  ]);

  return { resetRecommendPreviewState };
};

export default useSettlementRecommendLifecycle;
