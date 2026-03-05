import React, { useCallback, useEffect, useRef, useState } from "react";

import type { GameState } from "../../../model/types";

interface UseGameRoomPlayerSyncParams {
  serverOffsetMs: number;
  getServerNowMs: () => number;
  setNowMs: React.Dispatch<React.SetStateAction<number>>;
  gameVolume: number;
  requiresAudioGesture: boolean;
  startedAt: number;
  phase: GameState["phase"];
  revealEndsAt: number;
  revealDurationMs: number;
  effectiveGuessDurationMs: number;
  fallbackDurationSec: number;
  shouldLoopRoomSettingsClip: boolean;
  clipStartSec: number;
  clipEndSec: number;
  waitingToStart: boolean;
  isEnded: boolean;
  isReveal: boolean;
  trackLoadKey: string;
  trackSessionKey: string;
  videoId: string | null;
  currentTrackIndex: number;
  primeSfxAudio: () => void;
}

const PLAYER_ID = "mq-main-player";
const DRIFT_TOLERANCE_SEC = 1;
const RESUME_DRIFT_TOLERANCE_SEC = 1.2;
const WATCHDOG_DRIFT_TOLERANCE_SEC = 1.2;
const WATCHDOG_REQUEST_INTERVAL_MS = 1000;
const UI_CLOCK_TICK_MS = 100;
const MEDIA_SESSION_REFRESH_MS = 250;

const useGameRoomPlayerSync = ({
  serverOffsetMs,
  getServerNowMs,
  setNowMs,
  gameVolume,
  requiresAudioGesture,
  startedAt,
  phase,
  revealEndsAt,
  revealDurationMs,
  effectiveGuessDurationMs,
  fallbackDurationSec,
  shouldLoopRoomSettingsClip,
  clipStartSec,
  clipEndSec,
  waitingToStart,
  isEnded,
  isReveal,
  trackLoadKey,
  trackSessionKey,
  videoId,
  currentTrackIndex,
  primeSfxAudio,
}: UseGameRoomPlayerSyncParams) => {
  const [audioUnlocked, setAudioUnlocked] = useState(() => !requiresAudioGesture);
  const audioUnlockedRef = useRef(!requiresAudioGesture);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [loadedTrackKey, setLoadedTrackKey] = useState<string | null>(null);
  const [playerVideoId, setPlayerVideoId] = useState<string | null>(null);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const silentAudioRef = useRef<HTMLAudioElement | null>(null);
  const hasStartedPlaybackRef = useRef(false);
  const playerReadyRef = useRef(false);
  const playerStartRef = useRef(0);
  const lastSyncMsRef = useRef<number>(0);
  const lastTrackLoadKeyRef = useRef<string | null>(null);
  const lastLoadedVideoIdRef = useRef<string | null>(null);
  const lastTrackSessionRef = useRef<string | null>(null);
  const lastPassiveResumeRef = useRef<number>(0);
  const resumeNeedsSyncRef = useRef(false);
  const resumeResyncTimerRef = useRef<number | null>(null);
  const resyncTimersRef = useRef<number[]>([]);
  const initialResyncTimersRef = useRef<number[]>([]);
  const initialResyncScheduledRef = useRef(false);
  const lastTimeRequestAtMsRef = useRef<number>(0);
  const lastPlayerStateRef = useRef<number | null>(null);
  const lastPlayerTimeSecRef = useRef<number | null>(null);
  const lastPlayerTimeAtMsRef = useRef<number>(0);
  const lastTimeRequestReasonRef = useRef("init");
  const guessLoopSpanRef = useRef<number | null>(null);
  const revealReplayRef = useRef(false);
  const lastRevealStartKeyRef = useRef<string | null>(null);

  const markAudioUnlocked = useCallback(() => {
    if (audioUnlockedRef.current) return;
    audioUnlockedRef.current = true;
    setAudioUnlocked(true);
  }, []);

  useEffect(() => {
    lastSyncMsRef.current = Date.now() + serverOffsetMs;
  }, [serverOffsetMs]);

  const postPlayerMessage = useCallback(
    (payload: Record<string, unknown>, logLabel: string) => {
      try {
        const frame = iframeRef.current;
        if (!frame || !frame.isConnected) return false;
        const target = frame.contentWindow;
        if (!target) return false;
        target.postMessage(JSON.stringify(payload), "*");
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.toLowerCase().includes("disconnected port")) {
          return false;
        }
        console.error(`${logLabel} failed`, err);
        return false;
      }
    },
    [],
  );

  const applyVolume = useCallback(
    (val: number) => {
      const safeVolume = Math.min(100, Math.max(0, val));
      postPlayerMessage(
        {
          event: "command",
          func: "setVolume",
          args: [safeVolume],
        },
        "setVolume",
      );
    },
    [postPlayerMessage],
  );

  const revealStartAt = revealEndsAt - revealDurationMs;
  const revealDurationSec = Math.max(0, revealDurationMs / 1000);
  const clipLengthSec = Math.max(0.01, clipEndSec - clipStartSec);

  const computeServerPositionSec = useCallback(() => {
    const elapsed = Math.max(0, (getServerNowMs() - startedAt) / 1000);
    const loopSpan = guessLoopSpanRef.current;
    if (phase === "guess" && loopSpan && loopSpan > 0.01) {
      const offset = elapsed % loopSpan;
      return Math.min(clipEndSec, clipStartSec + offset);
    }
    return Math.min(clipEndSec, clipStartSec + elapsed);
  }, [clipEndSec, clipStartSec, getServerNowMs, phase, startedAt]);

  const computeRevealPositionSec = useCallback(() => {
    const elapsed = Math.max(0, (getServerNowMs() - revealStartAt) / 1000);
    const effectiveElapsed =
      revealDurationSec > 0 ? Math.min(elapsed, revealDurationSec) : elapsed;
    const offset = clipLengthSec > 0 ? effectiveElapsed % clipLengthSec : 0;
    return Math.min(clipEndSec, clipStartSec + offset);
  }, [
    clipEndSec,
    clipLengthSec,
    clipStartSec,
    getServerNowMs,
    revealDurationSec,
    revealStartAt,
  ]);

  const getDesiredPositionSec = useCallback(() => {
    if (revealReplayRef.current) {
      return computeRevealPositionSec();
    }
    return computeServerPositionSec();
  }, [computeRevealPositionSec, computeServerPositionSec]);

  const getEstimatedLocalPositionSec = useCallback(() => {
    const elapsed = (getServerNowMs() - lastSyncMsRef.current) / 1000;
    return Math.min(clipEndSec, Math.max(0, playerStartRef.current + elapsed));
  }, [clipEndSec, getServerNowMs]);

  useEffect(() => {
    guessLoopSpanRef.current = null;
  }, [trackLoadKey, trackSessionKey]);

  const postCommand = useCallback(
    (func: string, args: unknown[] = []) => {
      postPlayerMessage(
        {
          event: "command",
          func,
          args,
          id: PLAYER_ID,
        },
        func,
      );
    },
    [postPlayerMessage],
  );

  const requestPlayerTime = useCallback(
    (reason: string) => {
      if (!playerReadyRef.current) return;
      lastTimeRequestReasonRef.current = reason;
      lastTimeRequestAtMsRef.current = getServerNowMs();
      postCommand("getCurrentTime");
    },
    [getServerNowMs, postCommand],
  );

  const getFreshPlayerTimeSec = useCallback(() => {
    const nowMs = getServerNowMs();
    if (nowMs - lastPlayerTimeAtMsRef.current > 2000) return null;
    return lastPlayerTimeSecRef.current;
  }, [getServerNowMs]);

  const updateMediaSession = useCallback(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator))
      return;
    if (typeof MediaMetadata === "undefined") return;
    try {
      const silentAudio = silentAudioRef.current;
      const hasSilentAudioSession =
        requiresAudioGesture &&
        audioUnlockedRef.current &&
        !!silentAudio &&
        !silentAudio.paused;
      navigator.mediaSession.metadata = new MediaMetadata({
        title: "Muizo",
        artist: "Music Quiz",
        album: "Competitive Audio Mode",
      });
      navigator.mediaSession.playbackState =
        hasSilentAudioSession ? "playing" : isEnded ? "paused" : "playing";
    } catch (err) {
      console.error("mediaSession setup failed", err);
    }
  }, [isEnded, requiresAudioGesture]);

  const startSilentAudio = useCallback(() => {
    const audio = silentAudioRef.current;
    if (!audio) return;
    audio.loop = true;
    audio.preload = "auto";
    audio.muted = false;
    audio.volume = 1;
    updateMediaSession();
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {
        updateMediaSession();
      });
    }
    window.setTimeout(() => {
      updateMediaSession();
    }, 300);
  }, [updateMediaSession]);

  const stopSilentAudio = useCallback(() => {
    const audio = silentAudioRef.current;
    if (!audio) return;
    try {
      audio.pause();
      audio.currentTime = 0;
    } catch (err) {
      console.error("Failed to stop silent audio", err);
    }
  }, []);

  const loadTrack = useCallback(
    (
      id: string,
      startSeconds: number,
      endSeconds: number | undefined,
      autoplay: boolean,
    ) => {
      const payload = {
        videoId: id,
        startSeconds,
        ...(typeof endSeconds === "number" ? { endSeconds } : {}),
      };
      postCommand(autoplay ? "loadVideoById" : "cueVideoById", [payload]);
      lastLoadedVideoIdRef.current = id;
      lastSyncMsRef.current = getServerNowMs();
      if (!autoplay) {
        postCommand("pauseVideo");
        postCommand("seekTo", [startSeconds, true]);
      }
    },
    [getServerNowMs, postCommand],
  );

  const startPlayback = useCallback(
    (forcedPosition?: number, forceSeek = false) => {
      if (requiresAudioGesture && !audioUnlockedRef.current) return;
      const serverNowMs = getServerNowMs();
      if (serverNowMs < startedAt) return;
      const rawStartPos = forcedPosition ?? getDesiredPositionSec();
      const startPos = Math.min(clipEndSec, Math.max(clipStartSec, rawStartPos));
      const estimated = getEstimatedLocalPositionSec();
      const needsSeek = forceSeek || Math.abs(estimated - startPos) > DRIFT_TOLERANCE_SEC;
      if (Math.abs(playerStartRef.current - startPos) > 0.01) {
        playerStartRef.current = startPos;
      }
      lastSyncMsRef.current = serverNowMs;

      if (needsSeek) {
        postCommand("seekTo", [startPos, true]);
      }
      startSilentAudio();
      postCommand("playVideo");
      postCommand("unMute");
      applyVolume(gameVolume);
    },
    [
      applyVolume,
      clipEndSec,
      clipStartSec,
      gameVolume,
      getDesiredPositionSec,
      getEstimatedLocalPositionSec,
      getServerNowMs,
      postCommand,
      requiresAudioGesture,
      startSilentAudio,
      startedAt,
    ],
  );

  const unlockAudioAndStart = useCallback(() => {
    if (!playerReadyRef.current) {
      return false;
    }
    primeSfxAudio();
    if (!audioUnlockedRef.current) {
      markAudioUnlocked();
    }
    startSilentAudio();
    const serverNow = getServerNowMs();
    if (serverNow < startedAt) {
      postCommand("seekTo", [clipStartSec, true]);
      postCommand("playVideo");
      window.setTimeout(() => {
        postCommand("pauseVideo");
        postCommand("seekTo", [clipStartSec, true]);
      }, 120);
      return true;
    }
    startPlayback();
    return true;
  }, [
    clipStartSec,
    getServerNowMs,
    markAudioUnlocked,
    postCommand,
    primeSfxAudio,
    startPlayback,
    startSilentAudio,
    startedAt,
  ]);

  const handleGestureOverlayTrigger = useCallback((event?: React.SyntheticEvent) => {
    event?.preventDefault();
    event?.stopPropagation();
    primeSfxAudio();
    unlockAudioAndStart();
  }, [primeSfxAudio, unlockAudioAndStart]);

  const syncToServerPosition = useCallback(
    (
      _reason: string,
      forceSeek = false,
      toleranceSec = RESUME_DRIFT_TOLERANCE_SEC,
      requirePlayerTime = false,
    ) => {
      const serverPosition = getDesiredPositionSec();
      const playerTime = getFreshPlayerTimeSec();
      if (requirePlayerTime && playerTime === null) {
        return false;
      }
      const estimated = playerTime ?? getEstimatedLocalPositionSec();
      const drift = Math.abs(estimated - serverPosition);
      const shouldSeek = drift > toleranceSec || (forceSeek && playerTime === null);
      if (shouldSeek) {
        startPlayback(serverPosition, true);
        return true;
      }
      playerStartRef.current = serverPosition;
      lastSyncMsRef.current = getServerNowMs();
      postCommand("playVideo");
      applyVolume(gameVolume);
      return false;
    },
    [
      applyVolume,
      gameVolume,
      getDesiredPositionSec,
      getEstimatedLocalPositionSec,
      getFreshPlayerTimeSec,
      getServerNowMs,
      postCommand,
      startPlayback,
    ],
  );

  const scheduleResumeResync = useCallback(() => {
    if (resumeResyncTimerRef.current !== null) {
      window.clearTimeout(resumeResyncTimerRef.current);
      resumeResyncTimerRef.current = null;
    }
    resyncTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    resyncTimersRef.current = [];
    const checkpoints = [150, 650, 1200];
    checkpoints.forEach((delayMs) => {
      const timerId = window.setTimeout(() => {
        if (!playerReadyRef.current) return;
        if (document.visibilityState !== "visible") return;
        if (getServerNowMs() < startedAt) return;
        requestPlayerTime(`resume-${delayMs}`);
        window.setTimeout(() => {
          syncToServerPosition(
            `resume-check-${delayMs}`,
            false,
            RESUME_DRIFT_TOLERANCE_SEC,
            true,
          );
        }, 120);
      }, delayMs);
      resyncTimersRef.current.push(timerId);
    });
  }, [getServerNowMs, requestPlayerTime, startedAt, syncToServerPosition]);

  const scheduleInitialResync = useCallback(() => {
    if (initialResyncScheduledRef.current) return;
    initialResyncScheduledRef.current = true;
    initialResyncTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    initialResyncTimersRef.current = [];
    const checkpoints = [1000, 2000, 3000, 4000, 5000];
    checkpoints.forEach((delayMs, idx) => {
      const timerId = window.setTimeout(() => {
        if (!playerReadyRef.current) return;
        if (document.visibilityState !== "visible") return;
        if (getServerNowMs() < startedAt) return;
        requestPlayerTime(`initial-${idx + 1}`);
        window.setTimeout(() => {
          syncToServerPosition(`initial-check-${idx + 1}`, false, 0.8, true);
        }, 120);
      }, delayMs);
      initialResyncTimersRef.current.push(timerId);
    });
  }, [getServerNowMs, requestPlayerTime, startedAt, syncToServerPosition]);

  useEffect(
    () => () => {
      if (resumeResyncTimerRef.current !== null) {
        window.clearTimeout(resumeResyncTimerRef.current);
      }
      resyncTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
      initialResyncTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
      stopSilentAudio();
    },
    [stopSilentAudio],
  );

  useEffect(() => {
    const uiClock = window.setInterval(() => {
      setNowMs(getServerNowMs());
    }, UI_CLOCK_TICK_MS);
    return () => window.clearInterval(uiClock);
  }, [getServerNowMs, setNowMs]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = getServerNowMs();
      updateMediaSession();
      if (resumeNeedsSyncRef.current && playerReadyRef.current && now >= startedAt) {
        if (document.visibilityState !== "visible") {
          return;
        }
        resumeNeedsSyncRef.current = false;
        requestPlayerTime("interval-resume");
        return;
      }
      if (playerReadyRef.current && now >= startedAt && lastPlayerStateRef.current !== 1) {
        startPlayback();
      }
      if (
        playerReadyRef.current &&
        hasStartedPlaybackRef.current &&
        now >= startedAt &&
        now - lastTimeRequestAtMsRef.current >= WATCHDOG_REQUEST_INTERVAL_MS
      ) {
        requestPlayerTime("watchdog");
      }
    }, 500);
    return () => clearInterval(interval);
  }, [getServerNowMs, requestPlayerTime, startPlayback, startedAt, updateMediaSession]);

  useEffect(() => {
    applyVolume(gameVolume);
  }, [applyVolume, gameVolume]);

  useEffect(() => {
    if (!isEnded) return;
    updateMediaSession();
  }, [isEnded, updateMediaSession]);

  useEffect(() => {
    if (!requiresAudioGesture || !audioUnlocked) return;
    const timer = window.setInterval(() => {
      updateMediaSession();
    }, MEDIA_SESSION_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [audioUnlocked, requiresAudioGesture, updateMediaSession]);

  useEffect(() => {
    if (isEnded) return;
    if (requiresAudioGesture && !audioUnlockedRef.current) return;
    startSilentAudio();
  }, [currentTrackIndex, isEnded, phase, requiresAudioGesture, startedAt, startSilentAudio]);

  useEffect(() => {
    applyVolume(gameVolume);
  }, [applyVolume, currentTrackIndex, gameVolume, startedAt]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator))
      return;
    if (typeof MediaMetadata === "undefined") return;
    try {
      const noop = () => {};
      const handleMediaSeek = () => {
        resumeNeedsSyncRef.current = true;
        requestPlayerTime("media-seek");
        window.setTimeout(() => {
          syncToServerPosition("media-seek");
          scheduleResumeResync();
        }, 120);
      };
      const actions: Array<MediaSessionAction> = [
        "play",
        "pause",
        "stop",
        "seekbackward",
        "seekforward",
        "seekto",
        "previoustrack",
        "nexttrack",
      ];
      actions.forEach((action) => {
        try {
          if (action === "seekbackward" || action === "seekforward" || action === "seekto") {
            navigator.mediaSession.setActionHandler(action, handleMediaSeek);
          } else {
            navigator.mediaSession.setActionHandler(action, noop);
          }
        } catch (err) {
          console.error("Failed to set media session action handler", err);
        }
      });
      updateMediaSession();
    } catch (err) {
      console.error("mediaSession setup failed", err);
    }
  }, [
    currentTrackIndex,
    isEnded,
    isReveal,
    requestPlayerTime,
    scheduleResumeResync,
    syncToServerPosition,
    updateMediaSession,
    waitingToStart,
  ]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin || "";
      const isYouTube =
        origin.includes("youtube.com") || origin.includes("youtube-nocookie.com");
      if (!isYouTube || typeof event.data !== "string") return;

      let data: { event?: string; info?: number; id?: string };
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }

      if (data.id && data.id !== PLAYER_ID) return;

      if (data.event === "onReady") {
        playerReadyRef.current = true;
        setIsPlayerReady(true);
        const currentId = videoId;
        if (!currentId) return;
        if (lastTrackLoadKeyRef.current === trackLoadKey) return;
        const startSec = waitingToStart ? clipStartSec : computeServerPositionSec();
        playerStartRef.current = startSec;
        loadTrack(currentId, startSec, clipEndSec, !waitingToStart);
        setLoadedTrackKey(trackLoadKey);
        lastTrackLoadKeyRef.current = trackLoadKey;
        if (!waitingToStart) {
          startPlayback(startSec);
        }
      }

      if (data.event === "onStateChange") {
        lastPlayerStateRef.current = typeof data.info === "number" ? data.info : null;
        if (data.info === 1) {
          hasStartedPlaybackRef.current = true;
          lastSyncMsRef.current = getServerNowMs();
          setLoadedTrackKey(trackLoadKey);
          requestPlayerTime("state-playing");
          scheduleInitialResync();
          startSilentAudio();
        }
        if ((data.info === 2 || data.info === 3) && hasStartedPlaybackRef.current && !waitingToStart) {
          const now = Date.now();
          if (now - lastPassiveResumeRef.current > 1000) {
            lastPassiveResumeRef.current = now;
            postCommand("playVideo");
          }
        }
        if (data.info === 0) {
          const serverNow = getServerNowMs();
          const guessEndsAt = startedAt + effectiveGuessDurationMs;
          if (
            phase === "guess" &&
            shouldLoopRoomSettingsClip &&
            !isEnded &&
            !waitingToStart &&
            serverNow < guessEndsAt
          ) {
            const latestPlayerTime = lastPlayerTimeSecRef.current;
            if (
              typeof latestPlayerTime === "number" &&
              latestPlayerTime > clipStartSec + 0.05
            ) {
              guessLoopSpanRef.current = Math.max(0.25, latestPlayerTime - clipStartSec);
            } else if (!guessLoopSpanRef.current) {
              guessLoopSpanRef.current = Math.max(0.5, Math.min(5, fallbackDurationSec));
            }
            startPlayback(computeServerPositionSec(), true);
            return;
          }
          if (isReveal) {
            revealReplayRef.current = true;
            startPlayback(computeRevealPositionSec(), true);
          }
        }
      }

      if (data.event === "infoDelivery") {
        const info = (data as { info?: { currentTime?: number } }).info;
        if (typeof info?.currentTime === "number") {
          lastPlayerTimeSecRef.current = info.currentTime;
          lastPlayerTimeAtMsRef.current = getServerNowMs();
          if (
            lastTimeRequestReasonRef.current === "watchdog" &&
            lastPlayerStateRef.current === 1 &&
            document.visibilityState === "visible"
          ) {
            syncToServerPosition("watchdog", false, WATCHDOG_DRIFT_TOLERANCE_SEC);
          }
          if (resumeNeedsSyncRef.current) {
            resumeNeedsSyncRef.current = false;
            if (document.visibilityState !== "visible") {
              return;
            }
            const didSeek = syncToServerPosition(
              "infoDelivery",
              false,
              RESUME_DRIFT_TOLERANCE_SEC,
              true,
            );
            if (didSeek) {
              scheduleResumeResync();
            }
          }
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [
    clipEndSec,
    clipStartSec,
    computeRevealPositionSec,
    computeServerPositionSec,
    effectiveGuessDurationMs,
    fallbackDurationSec,
    getServerNowMs,
    isEnded,
    isReveal,
    loadTrack,
    phase,
    postCommand,
    requestPlayerTime,
    scheduleInitialResync,
    scheduleResumeResync,
    shouldLoopRoomSettingsClip,
    startPlayback,
    startSilentAudio,
    startedAt,
    syncToServerPosition,
    trackLoadKey,
    videoId,
    waitingToStart,
  ]);

  useEffect(() => {
    if (!videoId) return;
    if (!playerReadyRef.current) return;
    if (lastTrackLoadKeyRef.current === trackLoadKey) return;

    if (lastTrackSessionRef.current !== trackSessionKey) {
      lastTrackSessionRef.current = trackSessionKey;
      hasStartedPlaybackRef.current = false;
      playerStartRef.current = computeServerPositionSec();
    }

    revealReplayRef.current = false;
    const autoplay = !waitingToStart;
    const startSec = autoplay ? computeServerPositionSec() : clipStartSec;
    playerStartRef.current = startSec;
    loadTrack(videoId, startSec, clipEndSec, autoplay);
    hasStartedPlaybackRef.current = false;
    lastTrackLoadKeyRef.current = trackLoadKey;
    if (autoplay) {
      startPlayback(startSec);
    }
  }, [
    clipEndSec,
    clipStartSec,
    computeServerPositionSec,
    loadTrack,
    startPlayback,
    trackLoadKey,
    trackSessionKey,
    videoId,
    waitingToStart,
  ]);

  useEffect(() => {
    if (!isReveal) {
      revealReplayRef.current = false;
      lastRevealStartKeyRef.current = null;
      return;
    }
    const revealKey = `${trackSessionKey}:${revealEndsAt}:reveal`;
    if (lastRevealStartKeyRef.current === revealKey) return;
    lastRevealStartKeyRef.current = revealKey;
    const latestPlayerTime = getFreshPlayerTimeSec();
    const playerEnded = lastPlayerStateRef.current === 0;
    const playerAtEnd =
      typeof latestPlayerTime === "number" && latestPlayerTime >= clipEndSec - 0.05;

    if (playerEnded || playerAtEnd) {
      revealReplayRef.current = true;
      startPlayback(computeRevealPositionSec(), true);
      return;
    }

    revealReplayRef.current = false;
    postCommand("playVideo");
    postCommand("unMute");
    applyVolume(gameVolume);
    startSilentAudio();
  }, [
    applyVolume,
    clipEndSec,
    computeRevealPositionSec,
    gameVolume,
    getFreshPlayerTimeSec,
    isReveal,
    postCommand,
    revealEndsAt,
    startSilentAudio,
    startPlayback,
    trackSessionKey,
  ]);

  useEffect(() => {
    if (waitingToStart) {
      hasStartedPlaybackRef.current = false;
      postCommand("pauseVideo");
      postCommand("seekTo", [clipStartSec, true]);
    }
  }, [clipStartSec, postCommand, waitingToStart]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== "visible") {
        resumeNeedsSyncRef.current = true;
        resyncTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
        resyncTimersRef.current = [];
        return;
      }
      const serverNow = getServerNowMs();
      setNowMs(serverNow);
      if (!playerReadyRef.current) return;
      if (startedAt > serverNow) {
        resumeNeedsSyncRef.current = true;
        return;
      }
      resumeNeedsSyncRef.current = false;
      postCommand("playVideo");
      applyVolume(gameVolume);
      startSilentAudio();
      requestPlayerTime("visibility");
      resumeNeedsSyncRef.current = true;
    };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleVisibility);
    };
  }, [
    applyVolume,
    gameVolume,
    getServerNowMs,
    postCommand,
    requestPlayerTime,
    setNowMs,
    startSilentAudio,
    startedAt,
  ]);

  const handlePlaybackIframeLoad = useCallback(() => {
    if (videoId) {
      setPlayerVideoId((prev) => prev ?? videoId);
    }
    postPlayerMessage({ event: "listening", id: PLAYER_ID }, "player event binding");
    applyVolume(gameVolume);
  }, [applyVolume, gameVolume, postPlayerMessage, videoId]);

  return {
    audioUnlocked,
    isPlayerReady,
    loadedTrackKey,
    playerVideoId,
    iframeRef,
    silentAudioRef,
    handleGestureOverlayTrigger,
    handlePlaybackIframeLoad,
  };
};

export default useGameRoomPlayerSync;
