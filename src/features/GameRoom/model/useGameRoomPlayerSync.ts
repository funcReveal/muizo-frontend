import React, { useCallback, useEffect, useRef, useState } from "react";

import type { GameState } from "../../Room/model/types";

interface UseGameRoomPlayerSyncParams {
  serverOffsetMs: number;
  getServerNowMs: () => number;
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
  audioGestureSessionKey: string;
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
const RECOVERY_MONITOR_INTERVAL_MS = 500;
const HEALTHY_MONITOR_INTERVAL_MS = 3200;
const BACKGROUND_MONITOR_INTERVAL_MS = 2600;
const MOBILE_REQUEST_PLAYER_TIME_INTERVAL_MS = 900;
const MOBILE_RESUME_RESYNC_THROTTLE_MS = 2200;
const MOBILE_VISIBILITY_RESYNC_GAP_MS = 1800;
const MOBILE_MEDIA_SESSION_UPDATE_INTERVAL_MS = 1200;
const MOBILE_RECOVERY_MONITOR_INTERVAL_MS = 900;
const MOBILE_HEALTHY_MONITOR_INTERVAL_MS = 4600;
const MOBILE_BACKGROUND_MONITOR_INTERVAL_MS = 4200;
const RECENT_START_GUARD_MS = 2500;
const INITIAL_AUDIO_HOLD_RELEASE_MS = 680;
const SYNC_DEBUG_STORAGE_KEY = "musicquiz:debug-sync";
const PRESTART_ALIGNMENT_LEAD_MS = 280;
const PRESTART_WARMUP_PLAY_MS = 140;
const PRESTART_FINAL_HOLD_MS = 120;
const POST_START_DRIFT_TOLERANCE_SEC = 0.35;
const POST_START_DRIFT_CHECKPOINTS_MS = [320, 700, 1100];
const MOBILE_POST_START_DRIFT_CHECKPOINTS_MS = [420, 1120];
const CONSERVATIVE_POST_START_DRIFT_CHECKPOINTS_MS = [1200, 2600];
const CONSERVATIVE_STARTUP_TRACK_COUNT = 3;
const CONSERVATIVE_STARTUP_DRIFT_TOLERANCE_SEC = 0.8;
const CONSERVATIVE_STARTUP_WINDOW_MS = 4000;
const BUFFERING_GRACE_MS = 1500;
const RECENT_BUFFERING_WINDOW_MS = 1500;
const RESUME_RESYNC_CHECKPOINTS_MS = [150, 650, 1200];
const MOBILE_RESUME_RESYNC_CHECKPOINTS_MS = [220, 980];
const ENABLE_STEADY_STATE_WATCHDOG = false;

const useGameRoomPlayerSync = ({
  serverOffsetMs,
  getServerNowMs,
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
  audioGestureSessionKey,
  videoId,
  currentTrackIndex,
  primeSfxAudio,
}: UseGameRoomPlayerSyncParams) => {
  const [audioUnlockSessionKey, setAudioUnlockSessionKey] = useState<
    string | null
  >(() => (!requiresAudioGesture ? audioGestureSessionKey : null));
  const audioUnlocked =
    !requiresAudioGesture || audioUnlockSessionKey === audioGestureSessionKey;
  const isMobileClient = requiresAudioGesture;
  const audioUnlockedRef = useRef(audioUnlocked);
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
  const bufferingStartedAtRef = useRef<number | null>(null);
  const lastBufferingAtMsRef = useRef<number>(0);
  const bufferingGraceUntilMsRef = useRef<number>(0);
  const firstStablePlayAtRef = useRef<number>(0);
  const lastAutoResumeAttemptAtMsRef = useRef<number>(0);
  const listeningRetryTimerRef = useRef<number | null>(null);
  const playbackStartTimerRef = useRef<number | null>(null);
  const playbackWarmupTimerRef = useRef<number | null>(null);
  const playbackWarmupStopTimerRef = useRef<number | null>(null);
  const postStartDriftTimersRef = useRef<number[]>([]);
  const silentAudioStartTimerRef = useRef<number | null>(null);
  const silentAudioPlayPromiseRef = useRef<Promise<void> | null>(null);
  const lastMediaSessionUpdateAtMsRef = useRef<number>(0);
  const hasMediaSessionMetadataRef = useRef(false);
  const lastMediaSessionPlaybackStateRef = useRef<
    MediaSessionPlaybackState | null
  >(null);
  const lastResumeResyncAtMsRef = useRef<number>(0);
  const lastVisibilityResyncAtMsRef = useRef<number>(0);
  const pendingResumeSyncReasonRef = useRef("resume");
  const lastWaitingToStartRef = useRef(waitingToStart);
  const prestartWarmupActiveRef = useRef(false);
  const previousServerOffsetRef = useRef(serverOffsetMs);
  const trackPreparedRef = useRef(false);
  // ── Recovery loop kick ref ──────────────────────────────────────────────────
  // 讓 onStateChange / visibility handler 在 loop 停止後能重新啟動它。
  // 設計目標：healthy state 下 loop 自動停止；只在偵測到問題時才重啟。
  const recoveryLoopKickRef = useRef<(() => void) | null>(null);

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
    postStartDriftTimersRef.current.forEach((timerId) =>
      window.clearTimeout(timerId),
    );
    postStartDriftTimersRef.current = [];
  }, []);

  const clearSilentAudioStartTimer = useCallback(() => {
    if (silentAudioStartTimerRef.current !== null) {
      window.clearTimeout(silentAudioStartTimerRef.current);
      silentAudioStartTimerRef.current = null;
    }
  }, []);

  const markAudioUnlocked = useCallback(() => {
    if (audioUnlockedRef.current) return;
    // Mobile gesture playback may continue in the same event loop, so update
    // the ref immediately instead of waiting for the state commit.
    audioUnlockedRef.current = true;
    setAudioUnlockSessionKey(audioGestureSessionKey);
  }, [audioGestureSessionKey]);

  useEffect(() => {
    audioUnlockedRef.current = audioUnlocked;
  }, [audioUnlocked]);

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
      clearSilentAudioStartTimer();
    };
  }, [
    clearPlaybackStartTimer,
    clearPlaybackWarmupTimers,
    clearPostStartDriftTimers,
    clearSilentAudioStartTimer,
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

  useEffect(() => {
    bufferingStartedAtRef.current = null;
    bufferingGraceUntilMsRef.current = 0;
    firstStablePlayAtRef.current = 0;
  }, [trackSessionKey]);

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
    (reason: string, options?: { force?: boolean }) => {
      if (!playerReadyRef.current) return;
      const nowMs = getServerNowMs();
      if (
        isMobileClient &&
        !options?.force &&
        nowMs - lastTimeRequestAtMsRef.current <
          MOBILE_REQUEST_PLAYER_TIME_INTERVAL_MS
      ) {
        return false;
      }
      lastTimeRequestReasonRef.current = reason;
      lastTimeRequestAtMsRef.current = nowMs;
      postCommand("getCurrentTime");
      return true;
    },
    [getServerNowMs, isMobileClient, postCommand],
  );

  const isStartedByServerTime = useCallback(() => {
    return getServerNowMs() >= startedAt;
  }, [getServerNowMs, startedAt]);

  const getFreshPlayerTimeSec = useCallback(() => {
    const nowMs = getServerNowMs();
    if (nowMs - lastPlayerTimeAtMsRef.current > 2000) return null;
    return lastPlayerTimeSecRef.current;
  }, [getServerNowMs]);

  const isConservativeStartupTrack = currentTrackIndex < CONSERVATIVE_STARTUP_TRACK_COUNT;

  const getPlayerDebugPayload = useCallback(
    (state?: number) => ({
      ...(typeof state === "number" ? { state } : {}),
      currentTrackIndex,
      trackSessionKey,
      waitingToStart,
      isReveal,
      lastPlayerTimeSec: lastPlayerTimeSecRef.current,
      lastTimeRequestReason: lastTimeRequestReasonRef.current,
    }),
    [currentTrackIndex, isReveal, trackSessionKey, waitingToStart],
  );

  const isBufferingGraceActive = useCallback(
    (nowMs = getServerNowMs()) => nowMs < bufferingGraceUntilMsRef.current,
    [getServerNowMs],
  );

  const hasRecentBuffering = useCallback(
    (windowMs = RECENT_BUFFERING_WINDOW_MS, nowMs = getServerNowMs()) =>
      nowMs - lastBufferingAtMsRef.current <= windowMs,
    [getServerNowMs],
  );

  const getPostStartDriftToleranceSec = useCallback(() => {
    if (!isConservativeStartupTrack) return POST_START_DRIFT_TOLERANCE_SEC;
    const stableAt = firstStablePlayAtRef.current;
    if (stableAt === 0) return CONSERVATIVE_STARTUP_DRIFT_TOLERANCE_SEC;
    return getServerNowMs() - stableAt <= CONSERVATIVE_STARTUP_WINDOW_MS
      ? CONSERVATIVE_STARTUP_DRIFT_TOLERANCE_SEC
      : POST_START_DRIFT_TOLERANCE_SEC;
  }, [getServerNowMs, isConservativeStartupTrack]);

  const updateMediaSession = useCallback((options?: { force?: boolean }) => {
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
      const playbackState: MediaSessionPlaybackState = hasSilentAudioSession
        ? "playing"
        : isEnded
          ? "paused"
          : "playing";
      const nowMs = Date.now();
      const shouldThrottle =
        isMobileClient &&
        !options?.force &&
        lastMediaSessionPlaybackStateRef.current === playbackState &&
        nowMs - lastMediaSessionUpdateAtMsRef.current <
          MOBILE_MEDIA_SESSION_UPDATE_INTERVAL_MS;
      if (shouldThrottle) return;
      if (!hasMediaSessionMetadataRef.current) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: "Muizo",
          artist: "Music Quiz",
          album: "Competitive Audio Mode",
        });
        hasMediaSessionMetadataRef.current = true;
      }
      navigator.mediaSession.playbackState = playbackState;
      lastMediaSessionPlaybackStateRef.current = playbackState;
      lastMediaSessionUpdateAtMsRef.current = nowMs;
    } catch (err) {
      console.error("mediaSession setup failed", err);
    }
  }, [isEnded, isMobileClient, requiresAudioGesture]);

  const startSilentAudio = useCallback(() => {
    const audio = silentAudioRef.current;
    if (!audio) return;
    audio.loop = true;
    audio.preload = "auto";
    audio.muted = false;
    audio.volume = 1;
    updateMediaSession();
    if (!audio.paused) {
      clearSilentAudioStartTimer();
      silentAudioStartTimerRef.current = window.setTimeout(() => {
        silentAudioStartTimerRef.current = null;
        updateMediaSession();
      }, 300);
      return;
    }
    if (silentAudioPlayPromiseRef.current) return;
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.then === "function") {
      silentAudioPlayPromiseRef.current = playPromise
        .catch(() => {
          updateMediaSession({ force: true });
        })
        .finally(() => {
          silentAudioPlayPromiseRef.current = null;
          clearSilentAudioStartTimer();
          silentAudioStartTimerRef.current = window.setTimeout(() => {
            silentAudioStartTimerRef.current = null;
            updateMediaSession({ force: true });
          }, 300);
        });
    } else {
      clearSilentAudioStartTimer();
      silentAudioStartTimerRef.current = window.setTimeout(() => {
        silentAudioStartTimerRef.current = null;
        updateMediaSession({ force: true });
      }, 300);
    }
  }, [clearSilentAudioStartTimer, updateMediaSession]);

  const stopSilentAudio = useCallback(() => {
    const audio = silentAudioRef.current;
    if (!audio) return;
    try {
      clearSilentAudioStartTimer();
      audio.pause();
      audio.currentTime = 0;
      updateMediaSession({ force: true });
    } catch (err) {
      console.error("Failed to stop silent audio", err);
    }
  }, [clearSilentAudioStartTimer, updateMediaSession]);

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

  const scheduleInitialAudioHoldRelease = useCallback(
    (delayMs = INITIAL_AUDIO_HOLD_RELEASE_MS) => {
      clearInitialAudioHoldReleaseTimer();
      initialAudioHoldReleaseTimerRef.current = window.setTimeout(() => {
        releaseInitialAudioHold();
      }, delayMs);
    },
    [clearInitialAudioHoldReleaseTimer, releaseInitialAudioHold],
  );

  const armInitialAudioSync = useCallback(
    (holdDelayMs = INITIAL_AUDIO_HOLD_RELEASE_MS) => {
      initialAudioSyncPendingRef.current = true;
      scheduleInitialAudioHoldRelease(holdDelayMs);
    },
    [scheduleInitialAudioHoldRelease],
  );

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
      const startPos = Math.min(
        clipEndSec,
        Math.max(clipStartSec, rawStartPos),
      );
      const estimated = getEstimatedLocalPositionSec();
      const bufferingGraceActive = isBufferingGraceActive(serverNowMs);
      const suppressCorrectiveSeek =
        bufferingGraceActive &&
        options?.reason !== "startPlayback-startedAt" &&
        options?.reason !== "guess-loop";
      const needsSeek =
        !suppressCorrectiveSeek &&
        (forceSeek || Math.abs(estimated - startPos) > DRIFT_TOLERANCE_SEC);
      const holdAudio =
        options?.holdAudio ?? initialAudioSyncPendingRef.current;
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
          bufferingGraceActive,
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
      isBufferingGraceActive,
      postCommand,
      requiresAudioGesture,
      scheduleInitialAudioHoldRelease,
      startSilentAudio,
      startedAt,
    ],
  );

  const schedulePostStartDriftChecks = useCallback(() => {
    clearPostStartDriftTimers();
    const checkpoints = isConservativeStartupTrack
      ? CONSERVATIVE_POST_START_DRIFT_CHECKPOINTS_MS
      : isMobileClient
      ? MOBILE_POST_START_DRIFT_CHECKPOINTS_MS
      : POST_START_DRIFT_CHECKPOINTS_MS;
    checkpoints.forEach((delayMs) => {
      const timerId = window.setTimeout(() => {
        if (!playerReadyRef.current) return;
        requestPlayerTime(`post-start-drift-${delayMs}`);
      }, delayMs);
      postStartDriftTimersRef.current.push(timerId);
    });
  }, [
    clearPostStartDriftTimers,
    isConservativeStartupTrack,
    isMobileClient,
    requestPlayerTime,
  ]);

  const startPrestartWarmup = useCallback(() => {
    clearPlaybackWarmupTimers();
    if (
      !playerReadyRef.current ||
      !trackPreparedRef.current ||
      !videoId ||
      isEnded
    )
      return;
    if (requiresAudioGesture && !audioUnlockedRef.current) return;
    if (isStartedByServerTime()) return;
    if (isConservativeStartupTrack) {
      prestartWarmupActiveRef.current = false;
      return;
    }
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
    isConservativeStartupTrack,
    isStartedByServerTime,
    postCommand,
    requiresAudioGesture,
    startSilentAudio,
    videoId,
  ]);

  const schedulePlaybackStart = useCallback(() => {
    clearPlaybackStartTimer();
    clearPlaybackWarmupTimers();
    if (
      !playerReadyRef.current ||
      !trackPreparedRef.current ||
      !videoId ||
      isEnded
    ) {
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
    if (!isConservativeStartupTrack && delayMs > PRESTART_ALIGNMENT_LEAD_MS) {
      playbackWarmupTimerRef.current = window.setTimeout(
        () => {
          playbackWarmupTimerRef.current = null;
          startPrestartWarmup();
        },
        Math.max(0, delayMs - PRESTART_ALIGNMENT_LEAD_MS),
      );
    }
    playbackStartTimerRef.current = window.setTimeout(() => {
      playbackStartTimerRef.current = null;
      if (!playerReadyRef.current || !videoId || isEnded) return;
      const warmupWasActive = prestartWarmupActiveRef.current;
      prestartWarmupActiveRef.current = false;
      armInitialAudioSync(
        warmupWasActive
          ? PRESTART_FINAL_HOLD_MS
          : INITIAL_AUDIO_HOLD_RELEASE_MS,
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
    isConservativeStartupTrack,
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
    primeSfxAudio();

    // 沒 ready 時，完全不允許進入真正解鎖
    if (!playerReadyRef.current) {
      resumeNeedsSyncRef.current = true;
      return false;
    }

    if (!audioUnlockedRef.current) {
      markAudioUnlocked();
    }

    startSilentAudio();

    const serverNow = getServerNowMs();
    if (serverNow < startedAt) {
      if (isConservativeStartupTrack) {
        debugSync("prestart-warmup-skip-conservative", {
          currentTrackIndex,
          targetSec: clipStartSec,
        });
        debugSync("seekTo", {
          reason: "prestart-warmup",
          startPos: clipStartSec,
        });
        postCommand("seekTo", [clipStartSec, true]);
        return true;
      }
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
    currentTrackIndex,
    debugSync,
    getServerNowMs,
    isConservativeStartupTrack,
    markAudioUnlocked,
    postCommand,
    primeSfxAudio,
    startPlayback,
    startSilentAudio,
    startedAt,
  ]);

  const handleGestureOverlayTrigger = useCallback(
    (event?: React.SyntheticEvent) => {
      event?.preventDefault();
      event?.stopPropagation();

      // 第二層保護：沒 ready 不做事
      if (!playerReadyRef.current) return;

      unlockAudioAndStart();
    },
    [unlockAudioAndStart],
  );
  const syncToServerPosition = useCallback(
    (
      reason: string,
      forceSeek = false,
      toleranceSec = RESUME_DRIFT_TOLERANCE_SEC,
      requirePlayerTime = false,
    ) => {
      const nowMs = getServerNowMs();
      const bufferingGraceActive = isBufferingGraceActive(nowMs);
      if (isReveal && !revealReplayRef.current && !forceSeek) {
        if (lastPlayerStateRef.current !== 1 && !bufferingGraceActive) {
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
      const toleranceWithStartupGrace =
        isConservativeStartupTrack && hasRecentBuffering(RECENT_BUFFERING_WINDOW_MS, nowMs)
          ? Math.max(toleranceSec, CONSERVATIVE_STARTUP_DRIFT_TOLERANCE_SEC)
          : toleranceSec;
      const shouldSeek =
        !bufferingGraceActive &&
        (drift > toleranceWithStartupGrace || (forceSeek && playerTime === null));
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
      if (lastPlayerStateRef.current !== 1 && !bufferingGraceActive) {
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
      hasRecentBuffering,
      isBufferingGraceActive,
      isConservativeStartupTrack,
      isReveal,
      postCommand,
      releaseInitialAudioHold,
      startPlayback,
    ],
  );

  const scheduleResumeResync = useCallback(() => {
    const nowMs = getServerNowMs();
    if (
      isMobileClient &&
      nowMs - lastResumeResyncAtMsRef.current <
        MOBILE_RESUME_RESYNC_THROTTLE_MS
    ) {
      return;
    }
    lastResumeResyncAtMsRef.current = nowMs;
    if (resumeResyncTimerRef.current !== null) {
      window.clearTimeout(resumeResyncTimerRef.current);
      resumeResyncTimerRef.current = null;
    }
    resyncTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    resyncTimersRef.current = [];
    const checkpoints = isMobileClient
      ? MOBILE_RESUME_RESYNC_CHECKPOINTS_MS
      : RESUME_RESYNC_CHECKPOINTS_MS;
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
  }, [getServerNowMs, isMobileClient, requestPlayerTime, startedAt, syncToServerPosition]);

  const requestPlayerTimeRef = useRef(requestPlayerTime);
  const scheduleResumeResyncRef = useRef(scheduleResumeResync);
  const syncToServerPositionRef = useRef(syncToServerPosition);
  const updateMediaSessionRef = useRef(updateMediaSession);

  useEffect(() => {
    requestPlayerTimeRef.current = requestPlayerTime;
    scheduleResumeResyncRef.current = scheduleResumeResync;
    syncToServerPositionRef.current = syncToServerPosition;
    updateMediaSessionRef.current = updateMediaSession;
  }, [
    requestPlayerTime,
    scheduleResumeResync,
    syncToServerPosition,
    updateMediaSession,
  ]);

  useEffect(
    () => () => {
      clearInitialAudioHoldReleaseTimer();
      clearPlaybackStartTimer();
      clearPlaybackWarmupTimers();
      clearPostStartDriftTimers();
      if (resumeResyncTimerRef.current !== null) {
        window.clearTimeout(resumeResyncTimerRef.current);
      }
      resyncTimersRef.current.forEach((timerId) =>
        window.clearTimeout(timerId),
      );
      stopSilentAudio();
    },
    [
      clearInitialAudioHoldReleaseTimer,
      clearPlaybackStartTimer,
      clearPlaybackWarmupTimers,
      clearPostStartDriftTimers,
      stopSilentAudio,
    ],
  );

  useEffect(() => {
    if (lastWaitingToStartRef.current && !waitingToStart) {
      debugSync("waitingToStart=false");
    }
    lastWaitingToStartRef.current = waitingToStart;
  }, [debugSync, waitingToStart]);

  // ── Recovery monitor loop ──────────────────────────────────────────────────
  // 設計原則（事件驅動 + 短期 burst resync）：
  //
  //  • 過去：loop 全程跑，healthy state 每 3.2s / 4.6s 自我排程一次，
  //    但因 ENABLE_STEADY_STATE_WATCHDOG=false，什麼都不做 → 純浪費。
  //
  //  • 現在：healthy state 時 loop 主動停止（return 不 scheduleNext）。
  //    loop 由兩種機制重啟：
  //      1. React deps 改變（waitingToStart / isEnded / startedAt 等）→ effect 重跑
  //      2. recoveryLoopKickRef()：onStateChange 偵測到壞狀態，或 visibility
  //         handler 設定 resumeNeedsSyncRef 時由外部手動踢
  //
  //  • 什麼情況會繼續跑（needsRecoverySync=true）：
  //      - waitingToStart：開局前等待
  //      - !playerReadyRef：player 尚未 ready
  //      - recentlyStarted：開始後 2.5s 內補同步視窗
  //      - playerState === 2：意外暫停，需重啟
  //      - playerState === null / -1：未初始化，需觸發播放
  //      - bufferingNeedsRecovery：緩衝超過 grace 期
  //      - resumeNeedsSyncRef：回前景後需補同步
  //
  //  • 不再持續輪詢的情況：
  //      - 遊戲進行中 healthy（playing, state=1）→ loop 停止
  //      - isEnded → deps 更新會重跑 effect，但 needsRecoverySync=true 只是
  //        讓 loop 繼續排程，不會做任何有效操作，成本極低可接受
  useEffect(() => {
    let timerId: number | null = null;

    const scheduleNext = (delayMs: number) => {
      timerId = window.setTimeout(tick, delayMs);
    };

    // kick：讓外部事件處理器（onStateChange / visibility）在 loop 停止後重啟它
    const kick = () => {
      if (timerId !== null) return; // 已在跑，不重複啟動
      tick();
    };

    const tick = () => {
      const visibilityHidden =
        typeof document !== "undefined" &&
        document.visibilityState !== "visible";
      const now = getServerNowMs();
      const playerState = lastPlayerStateRef.current;
      const recentlyStarted =
        now >= startedAt && now - startedAt < RECENT_START_GUARD_MS;
      const bufferingGraceActive = isBufferingGraceActive(now);
      const bufferingNeedsRecovery =
        playerState === 3 && !bufferingGraceActive;

      const needsRecoverySync =
        waitingToStart ||
        !playerReadyRef.current ||
        isEnded ||
        resumeNeedsSyncRef.current ||
        recentlyStarted ||
        playerState === 2 ||
        bufferingNeedsRecovery ||
        playerState === null ||
        playerState === -1;

      if (
        resumeNeedsSyncRef.current &&
        playerReadyRef.current &&
        now >= startedAt
      ) {
        pendingResumeSyncReasonRef.current = "interval-resume";
        requestPlayerTime("interval-resume");
        scheduleNext(420);
        return;
      }

      if (!visibilityHidden && needsRecoverySync) {
        const canAutoResumeNow =
          now - lastAutoResumeAttemptAtMsRef.current >=
          AUTO_RESUME_MIN_INTERVAL_MS;

        if (playerReadyRef.current && now >= startedAt && !isEnded) {
          if (playerState === 2 && canAutoResumeNow) {
            lastAutoResumeAttemptAtMsRef.current = now;
            postCommand("playVideo");
            postCommand("unMute");
            applyVolume(gameVolume);
          } else if (
            (playerState === null || playerState === -1) &&
            canAutoResumeNow
          ) {
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
      }

      // ── Healthy state：停止 loop ──────────────────────────────────────────
      // ENABLE_STEADY_STATE_WATCHDOG=false 時，healthy 的 loop 完全不做任何事。
      // 停在這裡；下次需要時由 recoveryLoopKickRef 重啟，省去每 3-5s 的空轉。
      if (!needsRecoverySync && !ENABLE_STEADY_STATE_WATCHDOG) {
        timerId = null;
        return; // ← healthy：loop 停止，等待 kick 重啟
      }

      const nextDelay = visibilityHidden
        ? isMobileClient
          ? MOBILE_BACKGROUND_MONITOR_INTERVAL_MS
          : BACKGROUND_MONITOR_INTERVAL_MS
        : needsRecoverySync
          ? isMobileClient
            ? MOBILE_RECOVERY_MONITOR_INTERVAL_MS
            : RECOVERY_MONITOR_INTERVAL_MS
          : isMobileClient
            ? MOBILE_HEALTHY_MONITOR_INTERVAL_MS
            : HEALTHY_MONITOR_INTERVAL_MS;

      scheduleNext(nextDelay);
    };

    // 將 kick 暴露給外部 effect（onStateChange / visibility handler）
    recoveryLoopKickRef.current = kick;

    tick();

    return () => {
      if (timerId !== null) window.clearTimeout(timerId);
      recoveryLoopKickRef.current = null; // 避免 unmount 後的過期 kick
    };
  }, [
    applyVolume,
    gameVolume,
    getServerNowMs,
    isEnded,
    postCommand,
    requestPlayerTime,
    startPlayback,
    startedAt,
    waitingToStart,
    isBufferingGraceActive,
    isMobileClient,
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
    if (requiresAudioGesture && !audioUnlockedRef.current) return;
    startSilentAudio();
  }, [
    currentTrackIndex,
    isEnded,
    phase,
    requiresAudioGesture,
    startedAt,
    startSilentAudio,
  ]);

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
        pendingResumeSyncReasonRef.current = "media-seek";
        requestPlayerTimeRef.current("media-seek", { force: true });
        window.setTimeout(() => {
          syncToServerPositionRef.current("media-seek");
          scheduleResumeResyncRef.current();
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
          if (
            action === "seekbackward" ||
            action === "seekforward" ||
            action === "seekto"
          ) {
            navigator.mediaSession.setActionHandler(action, handleMediaSeek);
          } else {
            navigator.mediaSession.setActionHandler(action, noop);
          }
        } catch (err) {
          console.error("Failed to set media session action handler", err);
        }
      });

      updateMediaSessionRef.current();
    } catch (err) {
      console.error("mediaSession setup failed", err);
    }

    return () => {
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
          navigator.mediaSession.setActionHandler(action, null);
        } catch {
          // ignore
        }
      });
    };
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin || "";
      const isYouTube =
        origin.includes("youtube.com") ||
        origin.includes("youtube-nocookie.com");
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
        const startSec = beforeStart
          ? clipStartSec
          : computeServerPositionSec();
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
        const state = typeof data.info === "number" ? data.info : null;
        lastPlayerStateRef.current = state;
        if (typeof state === "number") {
          debugSync("player-state-change", getPlayerDebugPayload(state));
        }

        // ── Recovery loop kick ──────────────────────────────────────────────
        // loop 在 healthy 狀態下主動停止；這裡在偵測到壞狀態時重啟它。
        // 放在所有 if(state===x) 之前，避免被後面的 early return 跳過。
        if (state === 2 || state === -1 || state === null) {
          // 暫停 / 未初始化：需要 recovery loop 做自動重播或補同步
          recoveryLoopKickRef.current?.();
        }
        if (state === 3) {
          // 緩衝中：grace 期結束後 loop 需重新確認是否已恢復
          window.setTimeout(() => {
            recoveryLoopKickRef.current?.();
          }, BUFFERING_GRACE_MS + 200);
        }

        if (state === 3) {
          const nowMs = getServerNowMs();
          lastBufferingAtMsRef.current = nowMs;
          bufferingGraceUntilMsRef.current = nowMs + BUFFERING_GRACE_MS;
          if (bufferingStartedAtRef.current === null) {
            bufferingStartedAtRef.current = nowMs;
            debugSync("buffering-start", getPlayerDebugPayload(state));
          }
        } else if (bufferingStartedAtRef.current !== null) {
          const durationMs = Math.max(0, getServerNowMs() - bufferingStartedAtRef.current);
          debugSync("buffering-end", {
            ...getPlayerDebugPayload(state ?? undefined),
            durationMs,
          });
          bufferingStartedAtRef.current = null;
        }
        if (state === 5 || state === 1) {
          handleTrackPrepared(data.info ?? state);
        }
        if (state === 1) {
          setIsPlayerPlaying(true);
          hasStartedPlaybackRef.current = true;
          lastSyncMsRef.current = getServerNowMs();
          setLoadedTrackKey(trackLoadKey);
          debugSync("player-state-playing");
          if (firstStablePlayAtRef.current === 0) {
            firstStablePlayAtRef.current = getServerNowMs();
            debugSync("first-stable-playing", getPlayerDebugPayload(state));
          }
          if (initialAudioSyncPendingRef.current) {
            scheduleInitialAudioHoldRelease(220);
          }
          requestPlayerTime("state-playing");
          schedulePostStartDriftChecks();
          startSilentAudio();
        }
        if (state === 2 || state === 0) {
          setIsPlayerPlaying(false);
        }
        if (
          state === 2 &&
          hasStartedPlaybackRef.current &&
          isStartedByServerTime()
        ) {
          const now = Date.now();
          if (
            now - lastPassiveResumeRef.current >
            AUTO_RESUME_MIN_INTERVAL_MS
          ) {
            lastPassiveResumeRef.current = now;
            postCommand("playVideo");
            postCommand("unMute");
            applyVolume(gameVolume);
          }
        }
        if (state === 0) {
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
              guessLoopSpanRef.current = Math.max(
                0.25,
                latestPlayerTime - clipStartSec,
              );
            } else if (!guessLoopSpanRef.current) {
              guessLoopSpanRef.current = Math.max(
                0.5,
                Math.min(5, fallbackDurationSec),
              );
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
          if (
            lastTimeRequestReasonRef.current.startsWith("post-start-drift-")
          ) {
            const expected = getDesiredPositionSec();
            const drift = Math.abs(info.currentTime - expected);
            const driftToleranceSec = getPostStartDriftToleranceSec();
            const didSeek = syncToServerPosition(
              lastTimeRequestReasonRef.current,
              false,
              driftToleranceSec,
              true,
            );
            debugSync("post-start-drift", {
              checkpoint: lastTimeRequestReasonRef.current,
              playerTime: info.currentTime,
              expected,
              drift,
              toleranceSec: driftToleranceSec,
              didSeek,
            });
          }
          if (resumeNeedsSyncRef.current) {
            resumeNeedsSyncRef.current = false;
            if (document.visibilityState !== "visible") {
              return;
            }
            const resumeReason = pendingResumeSyncReasonRef.current;
            const didSeek = syncToServerPosition(
              resumeReason,
              false,
              RESUME_DRIFT_TOLERANCE_SEC,
              true,
            );
            if (didSeek || resumeReason.startsWith("visibility")) {
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
    getPlayerDebugPayload,
    getPostStartDriftToleranceSec,
    handleTrackPrepared,
    isEnded,
    isReveal,
    isStartedByServerTime,
    loadTrack,
    phase,
    postCommand,
    requestPlayerTime,
    scheduleInitialAudioHoldRelease,
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
      if (hasRecentBuffering()) {
        const timerId = window.setTimeout(() => {
          revealReplayRef.current = true;
          startPlayback(computeRevealPositionSec(), false, {
            reason: "reveal-replay",
          });
        }, 260);
        return () => window.clearTimeout(timerId);
      }
      revealReplayRef.current = true;
      startPlayback(computeRevealPositionSec(), true, {
        reason: "reveal-replay",
      });
      return;
    }

    revealReplayRef.current = false;
    const state = lastPlayerStateRef.current;
    const recentBuffering = hasRecentBuffering();
    startSilentAudio();
    if (!recentBuffering) {
      postCommand("playVideo");
      postCommand("unMute");
      applyVolume(gameVolume);
    }
    if (state === 1 || (state === 3 && recentBuffering)) {
      return;
    }
    const fallbackTimer = window.setTimeout(() => {
      if (lastPlayerStateRef.current !== 1 && !hasRecentBuffering()) {
        postCommand("playVideo");
        postCommand("unMute");
        applyVolume(gameVolume);
        startSilentAudio();
      }
    }, recentBuffering ? 780 : 420);
    return () => window.clearTimeout(fallbackTimer);
  }, [
    applyVolume,
    clipEndSec,
    computeRevealPositionSec,
    gameVolume,
    hasRecentBuffering,
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
    const handleVisibility = (event?: Event) => {
      if (document.visibilityState !== "visible") {
        resumeNeedsSyncRef.current = true;
        resyncTimersRef.current.forEach((timerId) =>
          window.clearTimeout(timerId),
        );
        resyncTimersRef.current = [];
        return;
      }
      const serverNow = getServerNowMs();
      if (!playerReadyRef.current) return;
      if (startedAt > serverNow) {
        resumeNeedsSyncRef.current = true;
        return;
      }
      if (
        isMobileClient &&
        serverNow - lastVisibilityResyncAtMsRef.current <
          MOBILE_VISIBILITY_RESYNC_GAP_MS
      ) {
        return;
      }
      lastVisibilityResyncAtMsRef.current = serverNow;
      startSilentAudio();
      resumeNeedsSyncRef.current = true;
      // loop 若已停在 healthy state，回前景後需重啟以處理補同步
      recoveryLoopKickRef.current?.();
      pendingResumeSyncReasonRef.current =
        event?.type === "focus" ? "visibility-focus" : "visibility";
      const requested = requestPlayerTime("visibility", { force: true });
      if (!requested && getFreshPlayerTimeSec() !== null) {
        resumeNeedsSyncRef.current = false;
        const didSeek = syncToServerPosition(
          pendingResumeSyncReasonRef.current,
          false,
          RESUME_DRIFT_TOLERANCE_SEC,
          true,
        );
        if (didSeek) {
          scheduleResumeResync();
          return;
        }
        if (initialAudioSyncPendingRef.current) {
          scheduleInitialAudioHoldRelease(180);
        } else {
          postCommand("playVideo");
          postCommand("unMute");
          applyVolume(gameVolume);
        }
      }
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
    getFreshPlayerTimeSec,
    isMobileClient,
    postCommand,
    requestPlayerTime,
    scheduleInitialAudioHoldRelease,
    scheduleResumeResync,
    startSilentAudio,
    startedAt,
    syncToServerPosition,
  ]);

  const handlePlaybackIframeLoad = useCallback(() => {
    playerReadyRef.current = false;
    trackPreparedRef.current = false;
    lastTrackLoadKeyRef.current = null;
    lastLoadedVideoIdRef.current = null;
    clearPlaybackStartTimer();
    clearPlaybackWarmupTimers();
    clearPostStartDriftTimers();
    if (videoId) {
      setPlayerVideoId(videoId);
    }
    let attempts = 0;
    const bindPlayerEvents = () => {
      postPlayerMessage(
        { event: "listening", id: PLAYER_ID },
        "player event binding",
      );
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
  }, [
    applyVolume,
    clearPlaybackStartTimer,
    clearPlaybackWarmupTimers,
    clearPostStartDriftTimers,
    gameVolume,
    postPlayerMessage,
    videoId,
  ]);

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
