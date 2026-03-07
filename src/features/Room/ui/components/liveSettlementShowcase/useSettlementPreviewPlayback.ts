import {
  useCallback,
  useEffect,
  useRef,
  type Dispatch,
  type MutableRefObject,
  type RefObject,
  type SetStateAction,
} from "react";

interface UseSettlementPreviewPlaybackParams {
  previewRecapKey: string | null;
  effectivePreviewVolume: number;
  autoAdvanceAtMs: number | null;
  pausedCountdownRemainingMs: number | null;
  previewPlayerState: "idle" | "playing" | "paused";
  canAutoGuideLoop: boolean;
  setAutoAdvanceAtMs: Dispatch<SetStateAction<number | null>>;
  setPausedCountdownRemainingMs: Dispatch<SetStateAction<number | null>>;
  setPreviewPlayerState: Dispatch<
    SetStateAction<"idle" | "playing" | "paused">
  >;
  setPreviewCountdownSec: Dispatch<SetStateAction<number>>;
  setPreviewSwitchNotice: Dispatch<SetStateAction<string | null>>;
}

interface UseSettlementPreviewPlaybackResult {
  previewIframeRef: RefObject<HTMLIFrameElement | null>;
  postYouTubeCommand: (func: string, args?: unknown[]) => void;
  registerYouTubeBridge: () => void;
  syncPreviewVolume: () => void;
  pushPreviewSwitchNotice: (text: string) => void;
  autoAdvanceAtMsRef: MutableRefObject<number | null>;
  pausedCountdownRemainingMsRef: MutableRefObject<number | null>;
  previewPlayerStateRef: MutableRefObject<"idle" | "playing" | "paused">;
  previewLastProgressAtMsRef: MutableRefObject<number | null>;
}

const useSettlementPreviewPlayback = ({
  previewRecapKey,
  effectivePreviewVolume,
  autoAdvanceAtMs,
  pausedCountdownRemainingMs,
  previewPlayerState,
  canAutoGuideLoop,
  setAutoAdvanceAtMs,
  setPausedCountdownRemainingMs,
  setPreviewPlayerState,
  setPreviewCountdownSec,
  setPreviewSwitchNotice,
}: UseSettlementPreviewPlaybackParams): UseSettlementPreviewPlaybackResult => {
  const previewIframeRef = useRef<HTMLIFrameElement | null>(null);
  const previewVolumeRetryTimersRef = useRef<number[]>([]);
  const previewSwitchNoticeTimerRef = useRef<number | null>(null);
  const previewBridgeRetryTimersRef = useRef<number[]>([]);
  const autoAdvanceAtMsRef = useRef<number | null>(autoAdvanceAtMs);
  const pausedCountdownRemainingMsRef = useRef<number | null>(
    pausedCountdownRemainingMs,
  );
  const previewPlayerStateRef = useRef<"idle" | "playing" | "paused">(
    previewPlayerState,
  );
  const previewCurrentTimeSecRef = useRef<number | null>(null);
  const previewLastProgressAtMsRef = useRef<number | null>(null);
  const canAutoGuideLoopRef = useRef(canAutoGuideLoop);

  const postYouTubeCommand = useCallback((func: string, args: unknown[] = []) => {
    const contentWindow = previewIframeRef.current?.contentWindow;
    if (!contentWindow) return;
    contentWindow.postMessage(
      JSON.stringify({ event: "command", func, args }),
      "*",
    );
  }, []);

  const clearPreviewBridgeRetryTimers = useCallback(() => {
    previewBridgeRetryTimersRef.current.forEach((timerId) =>
      window.clearTimeout(timerId),
    );
    previewBridgeRetryTimersRef.current = [];
  }, []);

  const registerYouTubeBridge = useCallback(() => {
    const contentWindow = previewIframeRef.current?.contentWindow;
    if (!contentWindow) return;
    const send = () => {
      contentWindow.postMessage(
        JSON.stringify({ event: "listening", id: "settlement-preview" }),
        "*",
      );
    };
    send();
    clearPreviewBridgeRetryTimers();
    previewBridgeRetryTimersRef.current = [460, 1100, 2000].map((delay) =>
      window.setTimeout(send, delay),
    );
  }, [clearPreviewBridgeRetryTimers]);

  const clearPreviewVolumeRetryTimers = useCallback(() => {
    previewVolumeRetryTimersRef.current.forEach((timerId) =>
      window.clearTimeout(timerId),
    );
    previewVolumeRetryTimersRef.current = [];
  }, []);

  const syncPreviewVolume = useCallback(() => {
    if (!previewRecapKey) return;
    const normalizedVolume = Math.max(0, Math.min(100, effectivePreviewVolume));
    const apply = () => {
      postYouTubeCommand("setVolume", [normalizedVolume]);
      if (normalizedVolume <= 0) {
        postYouTubeCommand("mute");
      } else {
        postYouTubeCommand("unMute");
      }
    };
    clearPreviewVolumeRetryTimers();
    apply();
    const retryDelays = [140, 380, 780, 1300];
    previewVolumeRetryTimersRef.current = retryDelays.map((delay) =>
      window.setTimeout(() => {
        apply();
      }, delay),
    );
  }, [
    clearPreviewVolumeRetryTimers,
    effectivePreviewVolume,
    postYouTubeCommand,
    previewRecapKey,
  ]);

  const pushPreviewSwitchNotice = useCallback(
    (text: string) => {
      if (previewSwitchNoticeTimerRef.current !== null) {
        window.clearTimeout(previewSwitchNoticeTimerRef.current);
        previewSwitchNoticeTimerRef.current = null;
      }
      setPreviewSwitchNotice(text);
      previewSwitchNoticeTimerRef.current = window.setTimeout(() => {
        setPreviewSwitchNotice(null);
        previewSwitchNoticeTimerRef.current = null;
      }, 1300);
    },
    [setPreviewSwitchNotice],
  );

  const normalizePlayerNumeric = useCallback((value: unknown): number | null => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return null;
      const parsed = Number(trimmed);
      if (Number.isFinite(parsed)) return parsed;
    }
    return null;
  }, []);

  const readYouTubePlayerSnapshot = useCallback(
    (rawData: unknown): { state: number | null; currentTime: number | null } => {
      let payload: unknown = rawData;
      if (typeof payload === "string") {
        try {
          payload = JSON.parse(payload);
        } catch {
          return { state: null, currentTime: null };
        }
      }
      if (!payload || typeof payload !== "object") {
        return { state: null, currentTime: null };
      }
      const eventValue =
        "event" in payload ? (payload as { event?: unknown }).event : null;
      const infoValue =
        "info" in payload ? (payload as { info?: unknown }).info : null;
      if (eventValue === "onStateChange") {
        if (
          infoValue &&
          typeof infoValue === "object" &&
          "playerState" in infoValue
        ) {
          const state = normalizePlayerNumeric(
            (infoValue as { playerState?: unknown }).playerState,
          );
          return { state, currentTime: null };
        }
        return { state: normalizePlayerNumeric(infoValue), currentTime: null };
      }
      if (
        eventValue !== "infoDelivery" ||
        !infoValue ||
        typeof infoValue !== "object"
      ) {
        return { state: null, currentTime: null };
      }
      const state =
        "playerState" in infoValue
          ? normalizePlayerNumeric(
              (infoValue as { playerState?: unknown }).playerState,
            )
          : null;
      const currentTime =
        "currentTime" in infoValue
          ? normalizePlayerNumeric(
              (infoValue as { currentTime?: unknown }).currentTime,
            )
          : null;
      return { state, currentTime };
    },
    [normalizePlayerNumeric],
  );

  useEffect(() => {
    autoAdvanceAtMsRef.current = autoAdvanceAtMs;
  }, [autoAdvanceAtMs]);

  useEffect(() => {
    pausedCountdownRemainingMsRef.current = pausedCountdownRemainingMs;
  }, [pausedCountdownRemainingMs]);

  useEffect(() => {
    previewPlayerStateRef.current = previewPlayerState;
  }, [previewPlayerState]);

  useEffect(() => {
    canAutoGuideLoopRef.current = canAutoGuideLoop;
  }, [canAutoGuideLoop]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onMessage = (event: MessageEvent) => {
      if (!previewRecapKey) return;
      const origin = event.origin || "";
      const trusted =
        origin.includes("youtube.com") ||
        origin.includes("youtube-nocookie.com");
      if (!trusted) return;
      const frameWindow = previewIframeRef.current?.contentWindow;
      if (frameWindow && event.source !== frameWindow) return;
      const snapshot = readYouTubePlayerSnapshot(event.data);
      const state = snapshot.state;
      const currentTime = snapshot.currentTime;
      if (currentTime !== null) {
        const lastCurrentTime = previewCurrentTimeSecRef.current;
        previewCurrentTimeSecRef.current = currentTime;
        const progressed =
          lastCurrentTime !== null && currentTime > lastCurrentTime + 0.04;
        const shouldKeepFrozen =
          previewPlayerStateRef.current === "paused" &&
          pausedCountdownRemainingMsRef.current !== null;
        if (progressed && shouldKeepFrozen) {
          postYouTubeCommand("pauseVideo");
          return;
        }
        if (progressed) {
          previewLastProgressAtMsRef.current = Date.now();
          if (previewPlayerStateRef.current !== "playing") {
            previewPlayerStateRef.current = "playing";
            setPreviewPlayerState("playing");
          }
          if (
            canAutoGuideLoopRef.current &&
            autoAdvanceAtMsRef.current === null &&
            pausedCountdownRemainingMsRef.current !== null
          ) {
            const remainingMs = Math.max(0, pausedCountdownRemainingMsRef.current);
            const nextAutoAdvanceAtMs = Date.now() + remainingMs;
            autoAdvanceAtMsRef.current = nextAutoAdvanceAtMs;
            pausedCountdownRemainingMsRef.current = null;
            setAutoAdvanceAtMs(nextAutoAdvanceAtMs);
            setPreviewCountdownSec(Math.max(0, Math.ceil(remainingMs / 1000)));
            setPausedCountdownRemainingMs(null);
          }
        }
      }
      if (state === null) return;
      if (state === 1) {
        const shouldKeepFrozen =
          previewPlayerStateRef.current === "paused" &&
          pausedCountdownRemainingMsRef.current !== null;
        if (shouldKeepFrozen) {
          postYouTubeCommand("pauseVideo");
          return;
        }
        const wasPlaying = previewPlayerStateRef.current === "playing";
        previewPlayerStateRef.current = "playing";
        previewLastProgressAtMsRef.current = Date.now();
        if (!wasPlaying) {
          setPreviewPlayerState("playing");
        }
        if (
          canAutoGuideLoopRef.current &&
          autoAdvanceAtMsRef.current === null &&
          pausedCountdownRemainingMsRef.current !== null
        ) {
          const remainingMs = Math.max(0, pausedCountdownRemainingMsRef.current);
          const nextAutoAdvanceAtMs = Date.now() + remainingMs;
          autoAdvanceAtMsRef.current = nextAutoAdvanceAtMs;
          pausedCountdownRemainingMsRef.current = null;
          setAutoAdvanceAtMs(nextAutoAdvanceAtMs);
          setPreviewCountdownSec(Math.max(0, Math.ceil(remainingMs / 1000)));
          setPausedCountdownRemainingMs(null);
        }
        return;
      }
      if (state === 2) {
        const wasPaused = previewPlayerStateRef.current === "paused";
        previewPlayerStateRef.current = "paused";
        if (!wasPaused) {
          setPreviewPlayerState("paused");
        }
        if (canAutoGuideLoopRef.current && autoAdvanceAtMsRef.current !== null) {
          const remainingMs = Math.max(0, autoAdvanceAtMsRef.current - Date.now());
          autoAdvanceAtMsRef.current = null;
          pausedCountdownRemainingMsRef.current = remainingMs;
          setPausedCountdownRemainingMs(remainingMs);
          setPreviewCountdownSec(Math.max(0, Math.ceil(remainingMs / 1000)));
          setAutoAdvanceAtMs(null);
        }
        return;
      }
      if (state === 3) {
        // Treat buffering as active playback to avoid false freeze on short stalls.
        previewLastProgressAtMsRef.current = Date.now();
        return;
      }
      if (state === 0 || state === -1) {
        if (previewPlayerStateRef.current !== "idle") {
          previewPlayerStateRef.current = "idle";
          setPreviewPlayerState("idle");
        }
      }
    };
    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
    };
  }, [
    previewRecapKey,
    postYouTubeCommand,
    readYouTubePlayerSnapshot,
    setAutoAdvanceAtMs,
    setPausedCountdownRemainingMs,
    setPreviewCountdownSec,
    setPreviewPlayerState,
  ]);

  useEffect(() => {
    if (!previewRecapKey) {
      return;
    }
    let startTimer: number | null = window.setTimeout(() => {
      registerYouTubeBridge();
    }, 360);
    return () => {
      if (startTimer !== null) {
        window.clearTimeout(startTimer);
        startTimer = null;
      }
      clearPreviewBridgeRetryTimers();
    };
  }, [
    clearPreviewBridgeRetryTimers,
    previewRecapKey,
    registerYouTubeBridge,
  ]);

  useEffect(() => {
    previewCurrentTimeSecRef.current = null;
    previewLastProgressAtMsRef.current = null;
  }, [previewRecapKey]);

  useEffect(() => {
    if (!previewRecapKey) return;
    syncPreviewVolume();
    return clearPreviewVolumeRetryTimers;
  }, [
    clearPreviewVolumeRetryTimers,
    effectivePreviewVolume,
    previewRecapKey,
    syncPreviewVolume,
  ]);

  useEffect(
    () => () => {
      if (previewSwitchNoticeTimerRef.current !== null) {
        window.clearTimeout(previewSwitchNoticeTimerRef.current);
      }
      clearPreviewBridgeRetryTimers();
      clearPreviewVolumeRetryTimers();
    },
    [clearPreviewBridgeRetryTimers, clearPreviewVolumeRetryTimers],
  );

  return {
    previewIframeRef,
    postYouTubeCommand,
    registerYouTubeBridge,
    syncPreviewVolume,
    pushPreviewSwitchNotice,
    autoAdvanceAtMsRef,
    pausedCountdownRemainingMsRef,
    previewPlayerStateRef,
    previewLastProgressAtMsRef,
  };
};

export default useSettlementPreviewPlayback;
