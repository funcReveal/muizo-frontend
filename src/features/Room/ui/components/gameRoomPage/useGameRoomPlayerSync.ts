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
const WATCHDOG_DRIFT_TOLERANCE_SEC = 1.8;
const WATCHDOG_REQUEST_INTERVAL_MS = 1400;
const AUTO_RESUME_MIN_INTERVAL_MS = 1800;
const UI_CLOCK_TICK_MS = 250;
const INITIAL_AUDIO_HOLD_RELEASE_MS = 680;
const SYNC_DEBUG_STORAGE_KEY = "musicquiz:debug-sync";
const PRESTART_ALIGNMENT_LEAD_MS = 280;
const PRESTART_WARMUP_PLAY_MS = 140;
const PRESTART_FINAL_HOLD_MS = 120;
const POST_START_DRIFT_TOLERANCE_SEC = 0.35;
const POST_START_DRIFT_CHECKPOINTS_MS = [320, 700, 1100];
const MOBILE_SILENT_AUDIO_WINDOW_MS = 1800;
const ENABLE_STEADY_STATE_WATCHDOG = false;

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
  const [isPlayerPlaying, setIsPlayerPlaying] = useState(false);
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
  const initialAudioHoldReleaseTimerRef = useRef<number | null>(null);
  const initialAudioSyncPendingRef = useRef(false);
  const lastTimeRequestAtMsRef = useRef<number>(0);
  const lastPlayerStateRef = useRef<number | null>(null);
  const lastPlayerTimeSecRef = useRef<number | null>(null);
  const lastPlayerTimeAtMsRef = useRef<number>(0);
  const lastTimeRequestReasonRef = useRef("init");
  const guessLoopSpanRef = useRef<number | null>(null);
  const revealReplayRef = useRef(false);
  const lastRevealStartKeyRef = useRef<string | null>(null);
  const lastAutoResumeAttemptAtMsRef = useRef<number>(0);
  const listeningRetryTimerRef = useRef<number | null>(null);
  const playbackStartTimerRef = useRef<number | null>(null);
  const playbackWarmupTimerRef = useRef<number | null>(null);
  const playbackWarmupStopTimerRef = useRef<number | null>(null);
  const postStartDriftTimersRef = useRef<number[]>([]);
  const lastWaitingToStartRef = useRef(waitingToStart);
  const prestartWarmupActiveRef = useRef(false);
  const previousServerOffsetRef = useRef(serverOffsetMs);
  const trackPreparedRef = useRef(false);
  const silentAudioStopTimerRef = useRef<number | null>(null);

  const isSyncDebugEnabled = useCallback(() => {
    if (typeof window === "undefined") return false;
    return (
      window.localStorage.getItem(SYNC_DEBUG_STORAGE_KEY) === "1" ||
      window.location.search.includes("debugSync=1")
    );
  }, []);

  const debugSync = useCallback(
    (label: string, payload?: Record<string, unknown>) => {
      if (!isSyncDebugEnabled()) return;
      const clientNow = Date.now();
      const serverNow = getServerNowMs();
      console.debug(`[mq-sync] ${label}`, {
        clientNow,
        serverNow,
        serverOffsetMs: serverNow - clientNow,
        trackSessionKey,
        startedAt,
        ...payload,
      });
    },
    [getServerNowMs, isSyncDebugEnabled, startedAt, trackSessionKey],
  );

  const clearPlaybackStartTimer = useCallback(() => {
    if (playbackStartTimerRef.current !== null) {
      window.clearTimeout(playbackStartTimerRef.current);
      playbackStartTimerRef.current = null;
    }
  }, []);

  const clearPlaybackWarmupTimers = useCallback(() => {
    if (playbackWarmupTimerRef.current !== null) {
      window.clearTimeout(playbackWarmupTimerRef.current);
      playbackWarmupTimerRef.current = null;
    }
    if (playbackWarmupStopTimerRef.current !== null) {
      window.clearTimeout(playbackWarmupStopTimerRef.current);
      playbackWarmupStopTimerRef.current = null;
    }
    prestartWarmupActiveRef.current = false;
  }, []);

  const clearPostStartDriftTimers = useCallback(() => {
    postStartDriftTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    postStartDriftTimersRef.current = [];
  }, []);

  const clearSilentAudioStopTimer = useCallback(() => {
    if (silentAudioStopTimerRef.current !== null) {
      window.clearTimeout(silentAudioStopTimerRef.current);
      silentAudioStopTimerRef.current = null;
    }
  }, []);

  const markAudioUnlocked = useCallback(() => {
    if (audioUnlockedRef.current) return;
    audioUnlockedRef.current = true;
    setAudioUnlocked(true);
  }, []);

  useEffect(() => {
    const offsetDelta = serverOffsetMs - previousServerOffsetRef.current;
    if (offsetDelta === 0) return;
    if (lastSyncMsRef.current !== 0) {
      lastSyncMsRef.current += offsetDelta;
    }
    if (lastPlayerTimeAtMsRef.current !== 0) {
      lastPlayerTimeAtMsRef.current += offsetDelta;
    }
    if (lastTimeRequestAtMsRef.current !== 0) {
      lastTimeRequestAtMsRef.current += offsetDelta;
    }
    previousServerOffsetRef.current = serverOffsetMs;
  }, [serverOffsetMs]);

  useEffect(() => {
    return () => {
      if (listeningRetryTimerRef.current !== null) {
        window.clearTimeout(listeningRetryTimerRef.current);
        listeningRetryTimerRef.current = null;
      }
      clearPlaybackStartTimer();
      clearPlaybackWarmupTimers();
      clearPostStartDriftTimers();
      clearSilentAudioStopTimer();
    };
  }, [
    clearPlaybackStartTimer,
    clearPlaybackWarmupTimers,
    clearPostStartDriftTimers,
    clearSilentAudioStopTimer,
  ]);

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

  const isStartedByServerTime = useCallback(() => {
    return getServerNowMs() >= startedAt;
  }, [getServerNowMs, startedAt]);

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

  const stopSilentAudio = useCallback(() => {
    const audio = silentAudioRef.current;
    if (!audio) return;
    try {
      clearSilentAudioStopTimer();
      audio.pause();
      audio.currentTime = 0;
      updateMediaSession();
      window.setTimeout(() => {
        updateMediaSession();
      }, 120);
    } catch (err) {
      console.error("Failed to stop silent audio", err);
    }
  }, [clearSilentAudioStopTimer, updateMediaSession]);

  const startSilentAudio = useCallback(() => {
    if (!requiresAudioGesture) return;
    const audio = silentAudioRef.current;
    if (!audio) return;
    clearSilentAudioStopTimer();
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
    silentAudioStopTimerRef.current = window.setTimeout(() => {
      silentAudioStopTimerRef.current = null;
      stopSilentAudio();
    }, MOBILE_SILENT_AUDIO_WINDOW_MS);
    window.setTimeout(() => {
      updateMediaSession();
    }, 300);
  }, [
    clearSilentAudioStopTimer,
    requiresAudioGesture,
    stopSilentAudio,
    updateMediaSession,
  ]);

  const clearInitialAudioHoldReleaseTimer = useCallback(() => {
    if (initialAudioHoldReleaseTimerRef.current !== null) {
      window.clearTimeout(initialAudioHoldReleaseTimerRef.current);
      initialAudioHoldReleaseTimerRef.current = null;
    }
  }, []);

  const releaseInitialAudioHold = useCallback(() => {
    clearInitialAudioHoldReleaseTimer();
    if (!initialAudioSyncPendingRef.current) return;
    initialAudioSyncPendingRef.current = false;
    postCommand("unMute");
    applyVolume(gameVolume);
  }, [applyVolume, clearInitialAudioHoldReleaseTimer, gameVolume, postCommand]);

  const scheduleInitialAudioHoldRelease = useCallback((delayMs = INITIAL_AUDIO_HOLD_RELEASE_MS) => {
    clearInitialAudioHoldReleaseTimer();
    initialAudioHoldReleaseTimerRef.current = window.setTimeout(() => {
      releaseInitialAudioHold();
    }, delayMs);
  }, [clearInitialAudioHoldReleaseTimer, releaseInitialAudioHold]);

  const armInitialAudioSync = useCallback((holdDelayMs = INITIAL_AUDIO_HOLD_RELEASE_MS) => {
    initialAudioSyncPendingRef.current = true;
    scheduleInitialAudioHoldRelease(holdDelayMs);
  }, [scheduleInitialAudioHoldRelease]);

  const loadTrack = useCallback(
    (
      id: string,
      startSeconds: number,
      endSeconds: number | undefined,
      autoplay: boolean,
      reason: "loadTrack-cue" | "loadTrack-autoplay",
    ) => {
      trackPreparedRef.current = false;
      debugSync("loadTrack", {
        videoId: id,
        startSeconds,
        endSeconds,
        autoplay,
        reason,
      });
      const payload = {
        videoId: id,
        startSeconds,
        ...(typeof endSeconds === "number" ? { endSeconds } : {}),
      };
      postCommand(autoplay ? "loadVideoById" : "cueVideoById", [payload]);
      lastLoadedVideoIdRef.current = id;
      lastSyncMsRef.current = getServerNowMs();
    },
    [debugSync, getServerNowMs, postCommand],
  );

  const startPlayback = useCallback(
    (
      forcedPosition?: number,
      forceSeek = false,
      options?: {
        holdAudio?: boolean;
        holdReleaseDelayMs?: number;
        reason?:
          | "startPlayback-startedAt"
          | "post-start-drift"
          | "watchdog"
          | "resume"
          | "media-seek"
          | "guess-loop"
          | "reveal-replay";
      },
    ) => {
      if (requiresAudioGesture && !audioUnlockedRef.current) return;
      const serverNowMs = getServerNowMs();
      if (serverNowMs < startedAt) return;
      const rawStartPos = forcedPosition ?? getDesiredPositionSec();
      const startPos = Math.min(clipEndSec, Math.max(clipStartSec, rawStartPos));
      const estimated = getEstimatedLocalPositionSec();
      const needsSeek = forceSeek || Math.abs(estimated - startPos) > DRIFT_TOLERANCE_SEC;
      const holdAudio = options?.holdAudio ?? initialAudioSyncPendingRef.current;
      if (Math.abs(playerStartRef.current - startPos) > 0.01) {
        playerStartRef.current = startPos;
      }
      lastSyncMsRef.current = serverNowMs;

      if (needsSeek) {
        debugSync("seekTo", {
          reason: options?.reason ?? "startPlayback-startedAt",
          startPos,
          estimated,
          forceSeek,
          holdAudio,
        });
        postCommand("seekTo", [startPos, true]);
      }
      startSilentAudio();
      debugSync("playVideo", {
        reason: options?.reason ?? "startPlayback-startedAt",
        startPos,
        estimated,
        needsSeek,
        holdAudio,
      });
      postCommand("playVideo");
      if (holdAudio) {
        postCommand("mute");
        scheduleInitialAudioHoldRelease(options?.holdReleaseDelayMs);
      } else {
        postCommand("unMute");
        applyVolume(gameVolume);
      }
    },
    [
      applyVolume,
      clipEndSec,
      clipStartSec,
      debugSync,
      gameVolume,
      getDesiredPositionSec,
      getEstimatedLocalPositionSec,
      getServerNowMs,
      postCommand,
      requiresAudioGesture,
      scheduleInitialAudioHoldRelease,
      startSilentAudio,
      startedAt,
    ],
  );

  const schedulePostStartDriftChecks = useCallback(() => {
    clearPostStartDriftTimers();
    POST_START_DRIFT_CHECKPOINTS_MS.forEach((delayMs) => {
      const timerId = window.setTimeout(() => {
        if (!playerReadyRef.current) return;
        requestPlayerTime(`post-start-drift-${delayMs}`);
      }, delayMs);
      postStartDriftTimersRef.current.push(timerId);
    });
  }, [clearPostStartDriftTimers, requestPlayerTime]);

  const startPrestartWarmup = useCallback(() => {
    clearPlaybackWarmupTimers();
    if (!playerReadyRef.current || !trackPreparedRef.current || !videoId || isEnded) return;
    if (requiresAudioGesture && !audioUnlockedRef.current) return;
    if (isStartedByServerTime()) return;
    prestartWarmupActiveRef.current = true;
    playerStartRef.current = clipStartSec;
    lastSyncMsRef.current = getServerNowMs();
    startSilentAudio();
    debugSync("prestart-warmup-start", {
      reason: "prestart-warmup",
      warmupLeadMs: PRESTART_ALIGNMENT_LEAD_MS,
      warmupPlayMs: PRESTART_WARMUP_PLAY_MS,
      targetSec: clipStartSec,
    });
    postCommand("mute");
    debugSync("seekTo", {
      reason: "prestart-warmup",
      startPos: clipStartSec,
    });
    postCommand("seekTo", [clipStartSec, true]);
    postCommand("playVideo");
    playbackWarmupStopTimerRef.current = window.setTimeout(() => {
      playbackWarmupStopTimerRef.current = null;
      if (isStartedByServerTime()) return;
      debugSync("prestart-warmup-stop", { targetSec: clipStartSec });
      postCommand("pauseVideo");
      debugSync("seekTo", {
        reason: "prestart-warmup",
        startPos: clipStartSec,
      });
      postCommand("seekTo", [clipStartSec, true]);
      prestartWarmupActiveRef.current = false;
    }, PRESTART_WARMUP_PLAY_MS);
  }, [
    clearPlaybackWarmupTimers,
    clipStartSec,
    debugSync,
    getServerNowMs,
    isEnded,
    isStartedByServerTime,
    postCommand,
    requiresAudioGesture,
    startSilentAudio,
    videoId,
  ]);

  const schedulePlaybackStart = useCallback(() => {
    clearPlaybackStartTimer();
    clearPlaybackWarmupTimers();
    if (!playerReadyRef.current || !trackPreparedRef.current || !videoId || isEnded) {
      debugSync("schedulePlaybackStart-deferred", {
        hasPlayerReady: playerReadyRef.current,
        trackPrepared: trackPreparedRef.current,
        hasVideoId: !!videoId,
        isEnded,
      });
      return;
    }
    if (requiresAudioGesture && !audioUnlockedRef.current) return;
    const delayMs = startedAt - getServerNowMs();
    if (delayMs <= 0) {
      armInitialAudioSync(PRESTART_FINAL_HOLD_MS);
      startPlayback(undefined, true, {
        holdAudio: true,
        holdReleaseDelayMs: PRESTART_FINAL_HOLD_MS,
        reason: "startPlayback-startedAt",
      });
      return;
    }
    if (delayMs > PRESTART_ALIGNMENT_LEAD_MS) {
      playbackWarmupTimerRef.current = window.setTimeout(() => {
        playbackWarmupTimerRef.current = null;
        startPrestartWarmup();
      }, Math.max(0, delayMs - PRESTART_ALIGNMENT_LEAD_MS));
    }
    playbackStartTimerRef.current = window.setTimeout(() => {
      playbackStartTimerRef.current = null;
      if (!playerReadyRef.current || !videoId || isEnded) return;
      const warmupWasActive = prestartWarmupActiveRef.current;
      prestartWarmupActiveRef.current = false;
      armInitialAudioSync(
        warmupWasActive ? PRESTART_FINAL_HOLD_MS : INITIAL_AUDIO_HOLD_RELEASE_MS,
      );
      startPlayback(undefined, warmupWasActive, {
        holdAudio: true,
        holdReleaseDelayMs: warmupWasActive
          ? PRESTART_FINAL_HOLD_MS
          : INITIAL_AUDIO_HOLD_RELEASE_MS,
        reason: "startPlayback-startedAt",
      });
    }, delayMs);
    debugSync("schedulePlaybackStart", {
      delayMs,
      prestartWarmupLeadMs:
        delayMs > PRESTART_ALIGNMENT_LEAD_MS ? PRESTART_ALIGNMENT_LEAD_MS : 0,
    });
  }, [
    armInitialAudioSync,
    clearPlaybackStartTimer,
    clearPlaybackWarmupTimers,
    debugSync,
    getServerNowMs,
    isEnded,
    requiresAudioGesture,
    startPrestartWarmup,
    startPlayback,
    startedAt,
    videoId,
  ]);

  const handleTrackPrepared = useCallback(
    (state: number) => {
      if (trackPreparedRef.current) return;
      trackPreparedRef.current = true;
      debugSync("track-prepared", { state, waitingToStart });
      if (isStartedByServerTime()) {
        if (hasStartedPlaybackRef.current) return;
        armInitialAudioSync(PRESTART_FINAL_HOLD_MS);
        startPlayback(undefined, true, {
          holdAudio: true,
          holdReleaseDelayMs: PRESTART_FINAL_HOLD_MS,
          reason: "startPlayback-startedAt",
        });
        return;
      }
      schedulePlaybackStart();
    },
    [
      armInitialAudioSync,
      debugSync,
      isStartedByServerTime,
      schedulePlaybackStart,
      startPlayback,
      waitingToStart,
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
      debugSync("seekTo", {
        reason: "prestart-warmup",
        startPos: clipStartSec,
      });
      postCommand("seekTo", [clipStartSec, true]);
      postCommand("playVideo");
      window.setTimeout(() => {
        postCommand("pauseVideo");
        debugSync("seekTo", {
          reason: "prestart-warmup",
          startPos: clipStartSec,
        });
        postCommand("seekTo", [clipStartSec, true]);
      }, 120);
      return true;
    }
    armInitialAudioSync();
    startPlayback(undefined, false, {
      holdAudio: true,
      reason: "startPlayback-startedAt",
    });
    return true;
  }, [
    armInitialAudioSync,
    clipStartSec,
    debugSync,
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
      reason: string,
      forceSeek = false,
      toleranceSec = RESUME_DRIFT_TOLERANCE_SEC,
      requirePlayerTime = false,
    ) => {
      if (isReveal && !revealReplayRef.current && !forceSeek) {
        if (lastPlayerStateRef.current !== 1) {
          postCommand("playVideo");
          postCommand("unMute");
          applyVolume(gameVolume);
        }
        return false;
      }
      const serverPosition = getDesiredPositionSec();
      const playerTime = getFreshPlayerTimeSec();
      if (requirePlayerTime && playerTime === null) {
        return false;
      }
      const estimated = playerTime ?? getEstimatedLocalPositionSec();
      const drift = Math.abs(estimated - serverPosition);
      const shouldSeek = drift > toleranceSec || (forceSeek && playerTime === null);
      if (shouldSeek) {
        startPlayback(serverPosition, true, {
          holdAudio: initialAudioSyncPendingRef.current,
          reason:
            reason === "media-seek"
              ? "media-seek"
              : reason.startsWith("resume") || reason === "infoDelivery"
                ? "resume"
                : reason.startsWith("post-start-drift")
                  ? "post-start-drift"
                  : reason === "watchdog"
                    ? "watchdog"
                    : "startPlayback-startedAt",
        });
        return true;
      }
      playerStartRef.current = serverPosition;
      lastSyncMsRef.current = getServerNowMs();
      if (initialAudioSyncPendingRef.current) {
        releaseInitialAudioHold();
      }
      if (lastPlayerStateRef.current !== 1) {
        postCommand("playVideo");
        postCommand("unMute");
        applyVolume(gameVolume);
      }
      return false;
    },
    [
      applyVolume,
      gameVolume,
      getDesiredPositionSec,
      getEstimatedLocalPositionSec,
      getFreshPlayerTimeSec,
      getServerNowMs,
      isReveal,
      postCommand,
      releaseInitialAudioHold,
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

  useEffect(
    () => () => {
      clearInitialAudioHoldReleaseTimer();
      clearPlaybackStartTimer();
      clearPlaybackWarmupTimers();
      clearPostStartDriftTimers();
      clearSilentAudioStopTimer();
      if (resumeResyncTimerRef.current !== null) {
        window.clearTimeout(resumeResyncTimerRef.current);
      }
      resyncTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
      stopSilentAudio();
    },
    [
      clearInitialAudioHoldReleaseTimer,
      clearPlaybackStartTimer,
      clearPlaybackWarmupTimers,
      clearPostStartDriftTimers,
      clearSilentAudioStopTimer,
      stopSilentAudio,
    ],
  );

  useEffect(() => {
    if (lastWaitingToStartRef.current && !waitingToStart) {
      debugSync("waitingToStart=false");
    }
    lastWaitingToStartRef.current = waitingToStart;
  }, [debugSync, waitingToStart]);

  useEffect(() => {
    const uiClock = window.setInterval(() => {
      setNowMs(getServerNowMs());
    }, UI_CLOCK_TICK_MS);
    return () => window.clearInterval(uiClock);
  }, [getServerNowMs, setNowMs]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = getServerNowMs();
      if (resumeNeedsSyncRef.current && playerReadyRef.current && now >= startedAt) {
        if (document.visibilityState !== "visible") {
          return;
        }
        resumeNeedsSyncRef.current = false;
        requestPlayerTime("interval-resume");
        return;
      }
      const playerState = lastPlayerStateRef.current;
      const canAutoResumeNow =
        now - lastAutoResumeAttemptAtMsRef.current >= AUTO_RESUME_MIN_INTERVAL_MS;
      if (
        playerReadyRef.current &&
        now >= startedAt &&
        !isEnded
      ) {
        if (playerState === 2 && canAutoResumeNow) {
          lastAutoResumeAttemptAtMsRef.current = now;
          postCommand("playVideo");
          postCommand("unMute");
          applyVolume(gameVolume);
        } else if ((playerState === null || playerState === -1) && canAutoResumeNow) {
          lastAutoResumeAttemptAtMsRef.current = now;
          startPlayback();
        }
      }
      if (
        ENABLE_STEADY_STATE_WATCHDOG &&
        playerReadyRef.current &&
        hasStartedPlaybackRef.current &&
        now >= startedAt &&
        now - lastTimeRequestAtMsRef.current >= WATCHDOG_REQUEST_INTERVAL_MS
      ) {
        requestPlayerTime("watchdog");
      }
    }, 500);
    return () => clearInterval(interval);
  }, [
    applyVolume,
    gameVolume,
    getServerNowMs,
    isEnded,
    postCommand,
    requestPlayerTime,
    startPlayback,
    startedAt,
  ]);

  useEffect(() => {
    applyVolume(gameVolume);
  }, [applyVolume, gameVolume]);

  useEffect(() => {
    if (!isEnded) return;
    updateMediaSession();
  }, [isEnded, updateMediaSession]);

  useEffect(() => {
    if (!requiresAudioGesture || !audioUnlocked) return;
    updateMediaSession();
  }, [audioUnlocked, requiresAudioGesture, updateMediaSession]);

  useEffect(() => {
    if (isEnded) return;
    stopSilentAudio();
  }, [currentTrackIndex, isEnded, phase, startedAt, stopSilentAudio]);

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
        if (listeningRetryTimerRef.current !== null) {
          window.clearTimeout(listeningRetryTimerRef.current);
          listeningRetryTimerRef.current = null;
        }
        playerReadyRef.current = true;
        setIsPlayerReady(true);
        const currentId = videoId;
        if (!currentId) return;
        if (lastTrackLoadKeyRef.current === trackLoadKey) return;
        const beforeStart = !isStartedByServerTime();
        const startSec = beforeStart ? clipStartSec : computeServerPositionSec();
        playerStartRef.current = startSec;
        loadTrack(
          currentId,
          startSec,
          clipEndSec,
          !beforeStart,
          beforeStart ? "loadTrack-cue" : "loadTrack-autoplay",
        );
        setLoadedTrackKey(trackLoadKey);
        lastTrackLoadKeyRef.current = trackLoadKey;
        if (beforeStart) {
          schedulePlaybackStart();
        }
      }

      if (data.event === "onStateChange") {
        lastPlayerStateRef.current = typeof data.info === "number" ? data.info : null;
        if (data.info === 5 || data.info === 3 || data.info === 1) {
          handleTrackPrepared(data.info);
        }
        if (data.info === 1) {
            setIsPlayerPlaying(true);
            hasStartedPlaybackRef.current = true;
            lastSyncMsRef.current = getServerNowMs();
            setLoadedTrackKey(trackLoadKey);
            debugSync("player-state-playing");
            requestPlayerTime("state-playing");
            schedulePostStartDriftChecks();
            startSilentAudio();
          }
        if (data.info === 2 || data.info === 0) {
          setIsPlayerPlaying(false);
        }
        if (data.info === 2 && hasStartedPlaybackRef.current && isStartedByServerTime()) {
          const now = Date.now();
          if (now - lastPassiveResumeRef.current > AUTO_RESUME_MIN_INTERVAL_MS) {
            lastPassiveResumeRef.current = now;
            postCommand("playVideo");
            postCommand("unMute");
            applyVolume(gameVolume);
          }
        }
        if (data.info === 0) {
          const serverNow = getServerNowMs();
          const guessEndsAt = startedAt + effectiveGuessDurationMs;
          if (
            phase === "guess" &&
            shouldLoopRoomSettingsClip &&
            !isEnded &&
            isStartedByServerTime() &&
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
            startPlayback(computeServerPositionSec(), true, {
              reason: "guess-loop",
            });
            return;
          }
          if (isReveal) {
            revealReplayRef.current = true;
            startPlayback(computeRevealPositionSec(), true, {
              reason: "reveal-replay",
            });
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
            if (isReveal && !revealReplayRef.current) {
              return;
            }
            const expected = getDesiredPositionSec();
            const drift = Math.abs(info.currentTime - expected);
            debugSync("watchdog-drift", {
              reason: "watchdog",
              playerTime: info.currentTime,
              expected,
              drift,
              toleranceSec: isReveal
                ? WATCHDOG_DRIFT_TOLERANCE_SEC + 1.2
                : WATCHDOG_DRIFT_TOLERANCE_SEC,
            });
          }
          if (lastTimeRequestReasonRef.current.startsWith("post-start-drift-")) {
            const expected = getDesiredPositionSec();
            const drift = Math.abs(info.currentTime - expected);
            const didSeek = syncToServerPosition(
              lastTimeRequestReasonRef.current,
              false,
              POST_START_DRIFT_TOLERANCE_SEC,
              true,
            );
            debugSync("post-start-drift", {
              checkpoint: lastTimeRequestReasonRef.current,
              playerTime: info.currentTime,
              expected,
              drift,
              didSeek,
            });
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
    armInitialAudioSync,
    applyVolume,
    clipEndSec,
    clipStartSec,
    computeRevealPositionSec,
    computeServerPositionSec,
    debugSync,
    effectiveGuessDurationMs,
    fallbackDurationSec,
    gameVolume,
    getServerNowMs,
    getDesiredPositionSec,
    handleTrackPrepared,
    isEnded,
    isReveal,
    isStartedByServerTime,
    loadTrack,
    phase,
    postCommand,
    requestPlayerTime,
    schedulePlaybackStart,
    schedulePostStartDriftChecks,
    scheduleResumeResync,
    shouldLoopRoomSettingsClip,
    startPlayback,
    startSilentAudio,
    startedAt,
    syncToServerPosition,
    trackLoadKey,
    videoId,
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
    const autoplay = isStartedByServerTime();
    const startSec = autoplay ? computeServerPositionSec() : clipStartSec;
    playerStartRef.current = startSec;
    loadTrack(
      videoId,
      startSec,
      clipEndSec,
      autoplay,
      autoplay ? "loadTrack-autoplay" : "loadTrack-cue",
    );
    hasStartedPlaybackRef.current = false;
    lastTrackLoadKeyRef.current = trackLoadKey;
    if (!autoplay) {
      schedulePlaybackStart();
    }
  }, [
    clipEndSec,
    clipStartSec,
    computeServerPositionSec,
    loadTrack,
    schedulePlaybackStart,
    startPlayback,
    trackLoadKey,
    trackSessionKey,
    videoId,
    isStartedByServerTime,
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
    const playerEnded = lastPlayerStateRef.current === 0;

    if (playerEnded) {
      revealReplayRef.current = true;
      startPlayback(computeRevealPositionSec(), true, {
        reason: "reveal-replay",
      });
      return;
    }

    revealReplayRef.current = false;
    const state = lastPlayerStateRef.current;
    postCommand("playVideo");
    postCommand("unMute");
    applyVolume(gameVolume);
    startSilentAudio();
    if (state === 1) {
      return;
    }
    const fallbackTimer = window.setTimeout(() => {
      if (lastPlayerStateRef.current !== 1) {
        postCommand("playVideo");
        postCommand("unMute");
        applyVolume(gameVolume);
        startSilentAudio();
      }
    }, 420);
    return () => window.clearTimeout(fallbackTimer);
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
      clearPlaybackWarmupTimers();
      initialAudioSyncPendingRef.current = false;
      clearInitialAudioHoldReleaseTimer();
      if (!trackPreparedRef.current) {
        return;
      }
      postCommand("pauseVideo");
      debugSync("seekTo", {
        reason: "prestart-warmup",
        startPos: clipStartSec,
      });
      postCommand("seekTo", [clipStartSec, true]);
    }
  }, [
    clearInitialAudioHoldReleaseTimer,
    clearPlaybackWarmupTimers,
    clipStartSec,
    debugSync,
    postCommand,
    waitingToStart,
  ]);

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
    let attempts = 0;
    const bindPlayerEvents = () => {
      postPlayerMessage({ event: "listening", id: PLAYER_ID }, "player event binding");
    };
    const retryBind = () => {
      if (playerReadyRef.current) {
        listeningRetryTimerRef.current = null;
        return;
      }
      if (attempts >= 10) {
        listeningRetryTimerRef.current = null;
        return;
      }
      attempts += 1;
      bindPlayerEvents();
      listeningRetryTimerRef.current = window.setTimeout(retryBind, 350);
    };
    if (listeningRetryTimerRef.current !== null) {
      window.clearTimeout(listeningRetryTimerRef.current);
      listeningRetryTimerRef.current = null;
    }
    bindPlayerEvents();
    listeningRetryTimerRef.current = window.setTimeout(retryBind, 220);
    applyVolume(gameVolume);
  }, [applyVolume, gameVolume, postPlayerMessage, videoId]);

  return {
    audioUnlocked,
    isPlayerReady,
    isPlayerPlaying,
    loadedTrackKey,
    playerVideoId,
    iframeRef,
    silentAudioRef,
    handleGestureOverlayTrigger,
    handlePlaybackIframeLoad,
  };
};

export default useGameRoomPlayerSync;
