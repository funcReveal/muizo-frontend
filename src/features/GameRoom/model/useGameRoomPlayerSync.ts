import React, { useCallback, useEffect, useRef, useState } from "react";

import type { GameState } from "@features/RoomSession";

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
  isTimeAttackMode: boolean;
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

// ?? Drift tolerances (2 tiers) ??????????????????????????????????????????????
// DRIFT_TOLERANCE_SEC:        steady-state threshold for resume / drift-sync /
//                             post-start check; any drift greater than this
//                             triggers a single corrective seek.
// POST_START_DRIFT_TOLERANCE_SEC: stricter tier used *only* inside the one-shot
//                             post-start check at T0+POST_START_DRIFT_CHECK_MS,
//                             where we want tighter alignment right after play.
const DRIFT_TOLERANCE_SEC = 1;
const POST_START_DRIFT_TOLERANCE_SEC = 0.35;
const PLAYER_TIME_RESPONSE_FALLBACK_MS = 260;
const RESUME_DRIFT_TOLERANCE_SEC = 1.5;
const FOREGROUND_RECOVERY_DEDUPE_MS = 450;

// ?? Prestart warmup ????????????????????????????????????????????????????????
// At T-PRESTART_WARMUP_LEAD_MS (4500), mute + seek to clipStart + play for
// PRESTART_WARMUP_PLAY_MS (140) to prime the codec AND trigger byte loading,
// then pause and hold at clipStart until T0. Gives the player ~4.5s to buffer
// before go-time ??critical because cueVideoById alone does NOT load bytes,
// only playVideo/seekTo do. On slow 4G this is the difference between a
// correctly-aligned start and a 3s offset that needs corrective seek.
// Only applies when we actually have that much lead (Q1 has 5s countdown;
// Q2+ has 0s ??warmup is skipped and catchup loop takes over instead).
// PRESTART_FINAL_HOLD_MS: mute-hold window after playVideo at T0 *when warmup
// completed*. Short because the player is already primed at clipStart.
// NO_WARMUP_HOLD_MS: longer mute-hold when we start playback without warmup
// (Q2+ where startedAt is already now, gesture unlock, or late join).
const PRESTART_WARMUP_LEAD_MS = 4500;
const PRESTART_WARMUP_PLAY_MS = 140;
const PRESTART_FINAL_HOLD_MS = 120;
const NO_WARMUP_HOLD_MS = 680;

// ?? Post-start drift check (single checkpoint) ?????????????????????????????
// One check at T0+POST_START_DRIFT_CHECK_MS. If drift exceeds
// POST_START_DRIFT_TOLERANCE_SEC, do one seek correction. No additional
// polling after that.
const POST_START_DRIFT_CHECK_MS = 1500;

// ?? Buffering grace ?????????????????????????????????????????????????????????
// If YouTube reports state=3 (buffering), suppress drift-triggered seeks for
// this window ??seeking mid-buffer just extends the stall.
const BUFFERING_GRACE_MS = 1500;
const RECENT_BUFFERING_WINDOW_MS = 1500;
const LARGE_DRIFT_OVERRIDE_SEC = 1.5;

// After coming back from background / focus event, force a resume at the
// server-derived position, then do one delayed verification check.
const RESUME_RESYNC_CHECK_MS = 700;
const SYNC_DEBUG_STORAGE_KEY = "musicquiz:debug-sync";

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
  isTimeAttackMode,
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
  const audioUnlockedRef = useRef(audioUnlocked);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isPlayerPlaying, setIsPlayerPlaying] = useState(false);
  const [loadedTrackKey, setLoadedTrackKey] = useState<string | null>(null);
  const [playerVideoId, setPlayerVideoId] = useState<string | null>(null);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const silentAudioRef = useRef<HTMLAudioElement | null>(null);
  const hasStartedPlaybackRef = useRef(false);
  const awaitingFirstPlaySyncRef = useRef(false);
  const playerReadyRef = useRef(false);
  const playerStartRef = useRef(0);
  const lastSyncMsRef = useRef<number>(0);
  const lastTrackLoadKeyRef = useRef<string | null>(null);
  const lastLoadedVideoIdRef = useRef<string | null>(null);
  const lastTrackSessionRef = useRef<string | null>(null);
  const resumeNeedsSyncRef = useRef(false);
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
  const listeningRetryTimerRef = useRef<number | null>(null);
  const playbackStartTimerRef = useRef<number | null>(null);
  const playbackWarmupTimerRef = useRef<number | null>(null);
  const playbackWarmupStopTimerRef = useRef<number | null>(null);
  const bufferingRecoveryTimerRef = useRef<number | null>(null);
  const guessLoopRestartTimerRef = useRef<number | null>(null);
  const scheduleGuessLoopRestartRef = useRef<() => void>(() => undefined);
  const postStartDriftTimersRef = useRef<number[]>([]);
  const postStartDriftRetriedRef = useRef(false);
  const silentAudioStartTimerRef = useRef<number | null>(null);
  const silentAudioPlayPromiseRef = useRef<Promise<void> | null>(null);
  const mobileUnlockKickTimerRef = useRef<number | null>(null);
  const hasMediaSessionMetadataRef = useRef(false);
  const lastMediaSessionPlaybackStateRef =
    useRef<MediaSessionPlaybackState | null>(null);
  const pendingResumeSyncReasonRef = useRef("resume");
  const lastWaitingToStartRef = useRef(waitingToStart);
  const prestartWarmupActiveRef = useRef(false);
  const previousServerOffsetRef = useRef(serverOffsetMs);
  const trackPreparedRef = useRef(false);
  const lastForegroundRecoveryAtMsRef = useRef(0);

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

  const clearBufferingRecoveryTimer = useCallback(() => {
    if (bufferingRecoveryTimerRef.current !== null) {
      window.clearTimeout(bufferingRecoveryTimerRef.current);
      bufferingRecoveryTimerRef.current = null;
    }
  }, []);

  const clearGuessLoopRestartTimer = useCallback(() => {
    if (guessLoopRestartTimerRef.current !== null) {
      window.clearTimeout(guessLoopRestartTimerRef.current);
      guessLoopRestartTimerRef.current = null;
    }
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
  const clearMobileUnlockKickTimer = useCallback(() => {
    if (mobileUnlockKickTimerRef.current !== null) {
      window.clearTimeout(mobileUnlockKickTimerRef.current);
      mobileUnlockKickTimerRef.current = null;
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
      clearBufferingRecoveryTimer();
      clearGuessLoopRestartTimer();
      clearPostStartDriftTimers();
      clearSilentAudioStartTimer();
      clearMobileUnlockKickTimer();
    };
  }, [
    clearBufferingRecoveryTimer,
    clearGuessLoopRestartTimer,
    clearMobileUnlockKickTimer,
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
    postStartDriftRetriedRef.current = false;
    awaitingFirstPlaySyncRef.current = false;
    clearBufferingRecoveryTimer();
    clearMobileUnlockKickTimer();
  }, [
    clearBufferingRecoveryTimer,
    clearMobileUnlockKickTimer,
    trackSessionKey,
  ]);

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
      if (!playerReadyRef.current) return false;
      lastTimeRequestReasonRef.current = reason;
      lastTimeRequestAtMsRef.current = getServerNowMs();
      postCommand("getCurrentTime");
      return true;
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

  const getRecentMeasuredEstimatedPositionSec = useCallback(
    (nowMs = getServerNowMs()) => {
      const measuredAt = lastPlayerTimeAtMsRef.current;
      const measuredTime = lastPlayerTimeSecRef.current;
      if (measuredTime === null) return null;
      if (nowMs - measuredAt > 10_000) return null;
      return Math.min(clipEndSec, measuredTime + (nowMs - measuredAt) / 1000);
    },
    [clipEndSec, getServerNowMs],
  );

  const isLikelyContinuousPlayback = useCallback(
    (toleranceSec = RESUME_DRIFT_TOLERANCE_SEC) => {
      // NOTE: no state=1 guard here. When iOS pauses the iframe (state=2),
      // the old guard made this always return false → always force-seek →
      // always seekTo → always mute sensation. Drift is the only criterion;
      // callers handle state separately (recoverPlaybackIfNeeded checks
      // lastPlayerStateRef to decide whether to send playVideo).
      const nowMs = getServerNowMs();
      const desiredSec = getDesiredPositionSec();
      // KEY: we must extrapolate from the measured position, not compare it raw.
      // playerTime is a snapshot from the past (e.g. the "pre-hide" capture).
      // Comparing it directly to the current desiredSec counts elapsed background
      // time as drift — a 2s background shows drift=2s even when fully on track.
      // Extrapolating at 1× speed gives the position the player "should" be at
      // now if it ran continuously, which matches desiredSec when drift is real-zero.
      // Window = 10s: beyond that the sync-point estimate is the better fallback.
      const estimatedPos =
        getRecentMeasuredEstimatedPositionSec(nowMs) ??
        getEstimatedLocalPositionSec();
      return Math.abs(estimatedPos - desiredSec) <= toleranceSec;
    },
    [
      getDesiredPositionSec,
      getEstimatedLocalPositionSec,
      getRecentMeasuredEstimatedPositionSec,
      getServerNowMs,
    ],
  );

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
      const playbackState: MediaSessionPlaybackState = hasSilentAudioSession
        ? "playing"
        : isEnded
          ? "paused"
          : "playing";
      // Dedup: skip if playbackState hasn't changed; cheap no-op rather than
      // a timed throttle (no need for isMobileClient branch).
      if (lastMediaSessionPlaybackStateRef.current === playbackState) return;
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
          updateMediaSession();
        })
        .finally(() => {
          silentAudioPlayPromiseRef.current = null;
          clearSilentAudioStartTimer();
          silentAudioStartTimerRef.current = window.setTimeout(() => {
            silentAudioStartTimerRef.current = null;
            updateMediaSession();
          }, 300);
        });
    } else {
      clearSilentAudioStartTimer();
      silentAudioStartTimerRef.current = window.setTimeout(() => {
        silentAudioStartTimerRef.current = null;
        updateMediaSession();
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
      updateMediaSession();
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
    (delayMs = NO_WARMUP_HOLD_MS) => {
      clearInitialAudioHoldReleaseTimer();
      initialAudioHoldReleaseTimerRef.current = window.setTimeout(() => {
        releaseInitialAudioHold();
      }, delayMs);
    },
    [clearInitialAudioHoldReleaseTimer, releaseInitialAudioHold],
  );

  const armInitialAudioSync = useCallback(
    (holdDelayMs = NO_WARMUP_HOLD_MS) => {
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
      const mustSeekToServerPosition =
        forceSeek ||
        options?.reason === "startPlayback-startedAt" ||
        options?.reason === "post-start-drift" ||
        options?.reason === "media-seek" ||
        options?.reason === "guess-loop" ||
        options?.reason === "reveal-replay";
      const suppressCorrectiveSeek =
        bufferingGraceActive && !mustSeekToServerPosition;
      const needsSeek =
        mustSeekToServerPosition ||
        (!suppressCorrectiveSeek &&
          Math.abs(estimated - startPos) > DRIFT_TOLERANCE_SEC);
      const holdAudio =
        options?.holdAudio ?? initialAudioSyncPendingRef.current;
      if (Math.abs(playerStartRef.current - startPos) > 0.01) {
        playerStartRef.current = startPos;
      }
      lastSyncMsRef.current = serverNowMs;

      if (options?.reason === "startPlayback-startedAt") {
        awaitingFirstPlaySyncRef.current = true;
      }

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

  const kickPlaybackAfterMobileUnlock = useCallback(() => {
    clearMobileUnlockKickTimer();

    const run = () => {
      if (
        !audioUnlockedRef.current ||
        !playerReadyRef.current ||
        !videoId ||
        isEnded ||
        isReveal
      ) {
        return;
      }

      const serverNowMs = getServerNowMs();

      // 如果還沒到 startedAt，不要提早出聲。
      // 但要在 startedAt 到時主動再踢一次 play + unMute。
      if (serverNowMs < startedAt) {
        const delayMs = Math.max(40, startedAt - serverNowMs + 80);
        mobileUnlockKickTimerRef.current = window.setTimeout(() => {
          mobileUnlockKickTimerRef.current = null;
          run();
        }, delayMs);
        return;
      }

      // 手機第一首最容易卡在「已 play 但仍 mute」。
      // 這裡在真正開始後強制解除初始 hold，並用 server 位置重新播放。
      initialAudioSyncPendingRef.current = false;
      clearInitialAudioHoldReleaseTimer();

      postCommand("unMute");
      applyVolume(gameVolume);

      startPlayback(undefined, true, {
        holdAudio: false,
        reason: "startPlayback-startedAt",
      });

      requestPlayerTime("mobile-unlock-kick");
    };

    run();
  }, [
    applyVolume,
    clearInitialAudioHoldReleaseTimer,
    clearMobileUnlockKickTimer,
    gameVolume,
    getServerNowMs,
    isEnded,
    isReveal,
    postCommand,
    requestPlayerTime,
    startPlayback,
    startedAt,
    videoId,
  ]);

  const scheduleGuessLoopRestart = useCallback(() => {
    clearGuessLoopRestartTimer();
    if (
      phase !== "guess" ||
      !shouldLoopRoomSettingsClip ||
      waitingToStart ||
      isEnded ||
      !isStartedByServerTime()
    ) {
      return;
    }

    const serverNow = getServerNowMs();
    const clipSpanSec = Math.max(0.25, clipEndSec - clipStartSec);
    const estimatedPositionSec =
      getRecentMeasuredEstimatedPositionSec(serverNow) ??
      getFreshPlayerTimeSec() ??
      getDesiredPositionSec();
    const normalizedPositionSec = Math.min(
      clipEndSec,
      Math.max(clipStartSec, estimatedPositionSec),
    );
    const remainingLoopMs = Math.max(
      120,
      Math.ceil((clipEndSec - normalizedPositionSec) * 1000),
    );
    const guessEndsAt = startedAt + effectiveGuessDurationMs;
    if (!isTimeAttackMode) {
      const remainingGuessMs = Math.max(0, guessEndsAt - serverNow);
      if (remainingGuessMs <= remainingLoopMs) {
        return;
      }
    }

    guessLoopRestartTimerRef.current = window.setTimeout(() => {
      guessLoopRestartTimerRef.current = null;
      if (
        phase !== "guess" ||
        !shouldLoopRoomSettingsClip ||
        waitingToStart ||
        isEnded ||
        !isStartedByServerTime()
      ) {
        return;
      }

      const latestPositionSec = lastPlayerTimeSecRef.current;
      const playerStillMidClip =
        lastPlayerStateRef.current === 1 &&
        typeof latestPositionSec === "number" &&
        latestPositionSec < clipEndSec - 0.18;

      if (playerStillMidClip) {
        scheduleGuessLoopRestartRef.current();
        return;
      }

      guessLoopSpanRef.current = clipSpanSec;
      startPlayback(clipStartSec, true, {
        reason: "guess-loop",
      });
      scheduleGuessLoopRestartRef.current();
    }, remainingLoopMs + 80);
  }, [
    startedAt,
    clearGuessLoopRestartTimer,
    clipEndSec,
    clipStartSec,
    effectiveGuessDurationMs,
    getDesiredPositionSec,
    getFreshPlayerTimeSec,
    getRecentMeasuredEstimatedPositionSec,
    getServerNowMs,
    isEnded,
    isStartedByServerTime,
    isTimeAttackMode,
    phase,
    shouldLoopRoomSettingsClip,
    startPlayback,
    waitingToStart,
  ]);

  useEffect(() => {
    scheduleGuessLoopRestartRef.current = scheduleGuessLoopRestart;
  }, [scheduleGuessLoopRestart]);

  useEffect(() => {
    scheduleGuessLoopRestart();
    return () => {
      clearGuessLoopRestartTimer();
    };
  }, [clearGuessLoopRestartTimer, scheduleGuessLoopRestart, trackSessionKey]);

  // Schedule a single drift check at T0 + POST_START_DRIFT_CHECK_MS. The
  // infoDelivery handler picks up the response and calls syncToServerPosition
  // with POST_START_DRIFT_TOLERANCE_SEC (0.35s) ??tight threshold only for
  // this one-shot early check. After that, we don't poll again.
  const schedulePostStartDriftChecks = useCallback(() => {
    clearPostStartDriftTimers();
    const timerId = window.setTimeout(() => {
      if (!playerReadyRef.current) return;
      const requestReason = `post-start-drift-${POST_START_DRIFT_CHECK_MS}`;
      requestPlayerTime(requestReason);
      const requestedAtMs = lastTimeRequestAtMsRef.current;
      const fallbackTimerId = window.setTimeout(() => {
        if (!playerReadyRef.current) return;
        if (lastPlayerTimeAtMsRef.current >= requestedAtMs) return;
        debugSync("post-start-drift-fallback", {
          requestReason,
          requestedAtMs,
          lastPlayerTimeAtMs: lastPlayerTimeAtMsRef.current,
        });
        startPlayback(undefined, true, {
          holdAudio: initialAudioSyncPendingRef.current,
          holdReleaseDelayMs: initialAudioSyncPendingRef.current
            ? 220
            : undefined,
          reason: "post-start-drift",
        });
      }, PLAYER_TIME_RESPONSE_FALLBACK_MS);
      postStartDriftTimersRef.current.push(fallbackTimerId);
    }, POST_START_DRIFT_CHECK_MS);
    postStartDriftTimersRef.current.push(timerId);
  }, [clearPostStartDriftTimers, debugSync, requestPlayerTime, startPlayback]);

  // ?? Prestart warmup ????????????????????????????????????????????????????????
  // At T-PRESTART_WARMUP_LEAD_MS (4500ms before the scheduled startedAt):
  //   1. mute + seek to clipStart
  //   2. playVideo for PRESTART_WARMUP_PLAY_MS (140ms) to prime the codec AND
  //      kick off byte loading (cueVideoById alone does not load bytes)
  //   3. pauseVideo + seek back to clipStart
  //   4. hold (muted, paused, at clipStart) until T0
  // This gives the YouTube player ~4.5s headroom to buffer the clip before
  // playback begins ??essential on slow networks where 2s was too tight and
  // left players starting 3s behind server position.
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
    prestartWarmupActiveRef.current = true;
    playerStartRef.current = clipStartSec;
    lastSyncMsRef.current = getServerNowMs();
    startSilentAudio();
    debugSync("prestart-warmup-start", {
      reason: "prestart-warmup",
      warmupLeadMs: PRESTART_WARMUP_LEAD_MS,
      warmupPlayMs: PRESTART_WARMUP_PLAY_MS,
      targetSec: clipStartSec,
    });
    postCommand("mute");
    postCommand("seekTo", [clipStartSec, true]);
    postCommand("playVideo");
    playbackWarmupStopTimerRef.current = window.setTimeout(() => {
      playbackWarmupStopTimerRef.current = null;
      if (isStartedByServerTime()) return;
      debugSync("prestart-warmup-stop", { targetSec: clipStartSec });
      postCommand("pauseVideo");
      postCommand("seekTo", [clipStartSec, true]);
      // prestartWarmupActiveRef stays true until T0 handler consumes it ??that
      // flag tells schedulePlaybackStart whether warmup completed (use short
      // final hold) or was skipped (use longer no-warmup hold).
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

  // ?? Schedule playback start ????????????????????????????????????????????????
  // Plans two timers relative to startedAt:
  //   1. Warmup timer at max(0, delayMs - PRESTART_WARMUP_LEAD_MS) ??skipped
  //      if there isn't enough lead (Q2+ where delayMs ??PRESTART_WARMUP_LEAD_MS;
  //      the player starts catchup-muted instead). For Q1 (5s countdown),
  //      warmup fires ~500ms after schedulePlaybackStart and runs until T0.
  //   2. Playback start timer at delayMs ??at T0, playVideo + schedule unmute.
  // If startedAt is already ??now (Q2+ / late join), go straight to muted
  // playback with the longer no-warmup hold; the recovery loop + post-start
  // drift check will catch up to server position.
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

    // Already past T0 ??no lead time, go straight to muted playback and let
    // the recovery loop + post-start drift check handle alignment.
    if (delayMs <= 0) {
      armInitialAudioSync(NO_WARMUP_HOLD_MS);
      startPlayback(undefined, true, {
        holdAudio: true,
        holdReleaseDelayMs: NO_WARMUP_HOLD_MS,
        reason: "startPlayback-startedAt",
      });
      return;
    }

    // Schedule warmup only if there's enough lead.
    const scheduleWarmup = delayMs > PRESTART_WARMUP_LEAD_MS;
    if (scheduleWarmup) {
      playbackWarmupTimerRef.current = window.setTimeout(() => {
        playbackWarmupTimerRef.current = null;
        startPrestartWarmup();
      }, delayMs - PRESTART_WARMUP_LEAD_MS);
    }

    // Schedule the actual T0 start.
    playbackStartTimerRef.current = window.setTimeout(() => {
      playbackStartTimerRef.current = null;
      if (!playerReadyRef.current || !videoId || isEnded) return;
      const warmupWasActive = prestartWarmupActiveRef.current;
      prestartWarmupActiveRef.current = false;
      const holdMs = warmupWasActive
        ? PRESTART_FINAL_HOLD_MS
        : NO_WARMUP_HOLD_MS;
      armInitialAudioSync(holdMs);
      startPlayback(undefined, true, {
        holdAudio: true,
        holdReleaseDelayMs: holdMs,
        reason: "startPlayback-startedAt",
      });
    }, delayMs);

    debugSync("schedulePlaybackStart", {
      delayMs,
      warmupScheduled: scheduleWarmup,
      warmupLeadMs: scheduleWarmup ? PRESTART_WARMUP_LEAD_MS : 0,
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

  // Called once per track when YouTube reports state 5 (cued) or 1 (playing).
  // If server time is already past startedAt (Q2+ / late join), start muted
  // playback immediately with the no-warmup hold; otherwise schedule the
  // normal warmup + T0 start sequence.
  const handleTrackPrepared = useCallback(
    (state: number) => {
      if (trackPreparedRef.current) return;
      trackPreparedRef.current = true;
      debugSync("track-prepared", { state, waitingToStart });
      if (isStartedByServerTime()) {
        if (hasStartedPlaybackRef.current) return;
        armInitialAudioSync(NO_WARMUP_HOLD_MS);
        startPlayback(undefined, true, {
          holdAudio: true,
          holdReleaseDelayMs: NO_WARMUP_HOLD_MS,
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

    if (!playerReadyRef.current || !videoId) {
      resumeNeedsSyncRef.current = true;
      return false;
    }

    if (!audioUnlockedRef.current) {
      markAudioUnlocked();
    }

    startSilentAudio();

    const serverNow = getServerNowMs();

    if (serverNow < startedAt) {
      // Gesture happened before T0.
      // Do a muted short warmup to satisfy mobile audio unlock,
      // then schedule a real audible kick at startedAt.
      debugSync("gesture-unlock-warmup", { targetSec: clipStartSec });

      postCommand("mute");
      postCommand("seekTo", [clipStartSec, true]);
      postCommand("playVideo");

      window.setTimeout(() => {
        if (getServerNowMs() >= startedAt) return;
        postCommand("pauseVideo");
        postCommand("seekTo", [clipStartSec, true]);
      }, 120);

      kickPlaybackAfterMobileUnlock();
      return true;
    }

    // Gesture happened after T0.
    // Force YouTube into an audible state immediately, then start at server position.
    postCommand("unMute");
    applyVolume(gameVolume);
    kickPlaybackAfterMobileUnlock();

    return true;
  }, [
    applyVolume,
    clipStartSec,
    debugSync,
    gameVolume,
    getServerNowMs,
    kickPlaybackAfterMobileUnlock,
    markAudioUnlocked,
    postCommand,
    primeSfxAudio,
    startSilentAudio,
    startedAt,
    videoId,
  ]);

  const handleGestureOverlayTrigger = useCallback(
    (event?: React.SyntheticEvent) => {
      event?.preventDefault();
      event?.stopPropagation();

      // Ignore early gestures until the player reports ready.
      if (!playerReadyRef.current) return;

      unlockAudioAndStart();
    },
    [unlockAudioAndStart],
  );
  // syncToServerPosition
  // Compares estimated local position against server-expected position. If
  // drift exceeds toleranceSec (default: DRIFT_TOLERANCE_SEC), issues a single
  // seek via startPlayback(). Otherwise updates local sync state and ensures
  // the player is in the "playing + unmuted" state.
  //
  // During reveal (non-replay mode), the clip is looping: we don't seek, just
  // ensure playback continues; seeking would jump mid-loop for no benefit.
  // Buffering grace window also suppresses seek (seeking mid-buffer stalls).
  const syncToServerPosition = useCallback(
    (
      reason: string,
      forceSeek = false,
      toleranceSec = DRIFT_TOLERANCE_SEC,
      requirePlayerTime = false,
      bypassBufferingGrace = false,
    ) => {
      const nowMs = getServerNowMs();
      const bufferingGraceActive =
        !bypassBufferingGrace && isBufferingGraceActive(nowMs);
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
      const isLargeRealDrift =
        playerTime !== null && drift > LARGE_DRIFT_OVERRIDE_SEC;
      const shouldSeek =
        isLargeRealDrift ||
        (!bufferingGraceActive &&
          (drift > toleranceSec || (forceSeek && playerTime === null)));
      if (shouldSeek) {
        if (isLargeRealDrift && bufferingGraceActive) {
          debugSync("large-drift-override", {
            reason,
            playerTime,
            serverPosition,
            drift,
            bufferingGraceUntilMs: bufferingGraceUntilMsRef.current,
          });
        }
        startPlayback(serverPosition, true, {
          holdAudio: initialAudioSyncPendingRef.current,
          reason:
            reason === "media-seek"
              ? "media-seek"
              : reason.startsWith("resume") || reason === "infoDelivery"
                ? "resume"
                : reason.startsWith("post-start-drift")
                  ? "post-start-drift"
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
      debugSync,
      gameVolume,
      getDesiredPositionSec,
      getEstimatedLocalPositionSec,
      getFreshPlayerTimeSec,
      getServerNowMs,
      isBufferingGraceActive,
      isReveal,
      postCommand,
      releaseInitialAudioHold,
      startPlayback,
    ],
  );

  // Single delayed resync check after resume (visibility return / media-seek).
  // If drift still exceeds tolerance at RESUME_RESYNC_CHECK_MS, a single seek
  // correction is issued via syncToServerPosition.
  const scheduleResumeResync = useCallback(() => {
    resyncTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    resyncTimersRef.current = [];
    const timerId = window.setTimeout(() => {
      if (!playerReadyRef.current) return;
      if (document.visibilityState !== "visible") return;
      if (getServerNowMs() < startedAt) return;
      const requestReason = `resume-${RESUME_RESYNC_CHECK_MS}`;
      requestPlayerTime(requestReason);
      const requestedAtMs = lastTimeRequestAtMsRef.current;
      const verifyTimerId = window.setTimeout(() => {
        if (!playerReadyRef.current) return;
        if (document.visibilityState !== "visible") return;
        if (lastPlayerTimeAtMsRef.current < requestedAtMs) {
          // No time response arrived. Use the extrapolated local estimate to
          // decide — spuriously seeking when the estimate shows we're on-track
          // is what causes the "seekTo sensation" on foreground return.
          const estimatedDrift = Math.abs(
            getEstimatedLocalPositionSec() - getDesiredPositionSec(),
          );
          debugSync("resume-resync-fallback", {
            requestReason,
            estimatedDrift,
          });
          if (estimatedDrift > RESUME_DRIFT_TOLERANCE_SEC) {
            startPlayback(undefined, true, {
              holdAudio: initialAudioSyncPendingRef.current,
              holdReleaseDelayMs: initialAudioSyncPendingRef.current
                ? 180
                : undefined,
              reason: "resume",
            });
          }
          return;
        }
        syncToServerPosition(
          `resume-check-${RESUME_RESYNC_CHECK_MS}`,
          false,
          RESUME_DRIFT_TOLERANCE_SEC,
          true,
        );
      }, PLAYER_TIME_RESPONSE_FALLBACK_MS);
      resyncTimersRef.current.push(verifyTimerId);
    }, RESUME_RESYNC_CHECK_MS);
    resyncTimersRef.current.push(timerId);
  }, [
    debugSync,
    getDesiredPositionSec,
    getEstimatedLocalPositionSec,
    getServerNowMs,
    requestPlayerTime,
    startPlayback,
    startedAt,
    syncToServerPosition,
  ]);

  const scheduleBufferingRecovery = useCallback(
    (reason = "buffering-recovery") => {
      clearBufferingRecoveryTimer();
      bufferingRecoveryTimerRef.current = window.setTimeout(() => {
        bufferingRecoveryTimerRef.current = null;
        if (!playerReadyRef.current) return;
        if (getServerNowMs() < startedAt || isEnded) return;
        if (
          typeof document !== "undefined" &&
          document.visibilityState !== "visible"
        ) {
          resumeNeedsSyncRef.current = true;
        }
        debugSync("buffering-recovery-force-seek", {
          reason,
          playerState: lastPlayerStateRef.current,
          lastPlayerTimeSec: lastPlayerTimeSecRef.current,
        });
        startPlayback(undefined, true, {
          holdAudio: initialAudioSyncPendingRef.current,
          holdReleaseDelayMs: initialAudioSyncPendingRef.current
            ? 180
            : undefined,
          reason: "resume",
        });
        scheduleResumeResync();
      }, BUFFERING_GRACE_MS + 220);
    },
    [
      clearBufferingRecoveryTimer,
      debugSync,
      getServerNowMs,
      isEnded,
      scheduleResumeResync,
      startPlayback,
      startedAt,
    ],
  );

  const recoverPlaybackIfNeeded = useCallback(
    (
      reason: "resume" | "buffering-recovery" | "pause-recovery" | "media-seek",
      options?: {
        requireAlignedPlayback?: boolean;
        holdAudio?: boolean;
        holdReleaseDelayMs?: number;
      },
    ) => {
      if (!playerReadyRef.current) return false;
      if (getServerNowMs() < startedAt || isEnded) return false;

      const holdAudio =
        options?.holdAudio ?? initialAudioSyncPendingRef.current;
      const holdReleaseDelayMs = options?.holdReleaseDelayMs;
      // Caller is expected to pass requireAlignedPlayback based on observed drift;
      // fall back to isLikelyContinuousPlayback only when caller omits the flag.
      const shouldForceAlign =
        options?.requireAlignedPlayback ?? !isLikelyContinuousPlayback();

      debugSync("recover-playback", {
        reason,
        shouldForceAlign,
        playerState: lastPlayerStateRef.current,
        freshPlayerTime: getFreshPlayerTimeSec(),
        holdAudio,
      });
      if (shouldForceAlign) {
        startPlayback(undefined, true, {
          holdAudio,
          holdReleaseDelayMs,
          reason: reason === "media-seek" ? "media-seek" : "resume",
        });
        return true;
      }

      if (holdAudio) {
        scheduleInitialAudioHoldRelease(holdReleaseDelayMs);
      }
      startSilentAudio();
      if (lastPlayerStateRef.current !== 1) {
        // Only issue playVideo when the player is not already playing.
        // Sending playVideo to a state-1 player causes a brief interruption
        // in the YouTube iframe even though it "should" be a no-op.
        postCommand("playVideo");
      }
      if (!holdAudio) {
        postCommand("unMute");
        applyVolume(gameVolume);
      }
      return false;
    },
    [
      applyVolume,
      debugSync,
      gameVolume,
      getFreshPlayerTimeSec,
      getServerNowMs,
      isEnded,
      isLikelyContinuousPlayback,
      postCommand,
      scheduleInitialAudioHoldRelease,
      startPlayback,
      startSilentAudio,
      startedAt,
    ],
  );

  const recoverPlaybackIfNeededRef = useRef(recoverPlaybackIfNeeded);
  const scheduleResumeResyncRef = useRef(scheduleResumeResync);
  const updateMediaSessionRef = useRef(updateMediaSession);

  useEffect(() => {
    recoverPlaybackIfNeededRef.current = recoverPlaybackIfNeeded;
    scheduleResumeResyncRef.current = scheduleResumeResync;
    updateMediaSessionRef.current = updateMediaSession;
  }, [recoverPlaybackIfNeeded, scheduleResumeResync, updateMediaSession]);

  useEffect(
    () => () => {
      clearInitialAudioHoldReleaseTimer();
      clearBufferingRecoveryTimer();
      clearPlaybackStartTimer();
      clearPlaybackWarmupTimers();
      clearPostStartDriftTimers();
      clearMobileUnlockKickTimer();
      resyncTimersRef.current.forEach((timerId) =>
        window.clearTimeout(timerId),
      );
      stopSilentAudio();
    },
    [
      clearBufferingRecoveryTimer,
      clearInitialAudioHoldReleaseTimer,
      clearMobileUnlockKickTimer,
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
        recoverPlaybackIfNeededRef.current("media-seek", {
          requireAlignedPlayback: true,
          holdAudio: initialAudioSyncPendingRef.current,
          holdReleaseDelayMs: initialAudioSyncPendingRef.current
            ? 180
            : undefined,
        });
        scheduleResumeResyncRef.current();
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
        // Mark prepared immediately for the cue path so schedulePlaybackStart
        // can schedule the warmup without waiting for state=5 from YouTube.
        // (loadTrack resets trackPreparedRef to false; we restore it here.)
        if (beforeStart) {
          trackPreparedRef.current = true;
        }
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

        if (state === 3) {
          const nowMs = getServerNowMs();
          lastBufferingAtMsRef.current = nowMs;
          bufferingGraceUntilMsRef.current = nowMs + BUFFERING_GRACE_MS;
          if (bufferingStartedAtRef.current === null) {
            bufferingStartedAtRef.current = nowMs;
            debugSync("buffering-start", getPlayerDebugPayload(state));
          }
          scheduleBufferingRecovery("buffering-state");
        } else if (bufferingStartedAtRef.current !== null) {
          clearBufferingRecoveryTimer();
          const durationMs = Math.max(
            0,
            getServerNowMs() - bufferingStartedAtRef.current,
          );
          debugSync("buffering-end", {
            ...getPlayerDebugPayload(state ?? undefined),
            durationMs,
          });
          bufferingStartedAtRef.current = null;
        } else {
          clearBufferingRecoveryTimer();
        }
        if (state === 5 || state === 1) {
          handleTrackPrepared(data.info ?? state);
        }
        if (state === 1) {
          setLoadedTrackKey(trackLoadKey);
          if (prestartWarmupActiveRef.current) {
            debugSync("player-state-playing-warmup");
          } else {
            const shouldDoFirstPlaySync = awaitingFirstPlaySyncRef.current;
            awaitingFirstPlaySyncRef.current = false;
            setIsPlayerPlaying(true);
            hasStartedPlaybackRef.current = true;
            lastSyncMsRef.current = getServerNowMs();
            debugSync("player-state-playing");
            if (shouldDoFirstPlaySync) {
              clearInitialAudioHoldReleaseTimer();
              requestPlayerTime("first-play-sync");
              const requestedAtMs = lastTimeRequestAtMsRef.current;
              const fallbackTimerId = window.setTimeout(() => {
                if (!playerReadyRef.current) return;
                if (lastPlayerTimeAtMsRef.current >= requestedAtMs) return;
                debugSync("first-play-sync-fallback", {
                  requestedAtMs,
                  lastPlayerTimeAtMs: lastPlayerTimeAtMsRef.current,
                });
                startPlayback(undefined, true, {
                  holdAudio: initialAudioSyncPendingRef.current,
                  holdReleaseDelayMs: initialAudioSyncPendingRef.current
                    ? 220
                    : undefined,
                  reason: "post-start-drift",
                });
              }, PLAYER_TIME_RESPONSE_FALLBACK_MS);
              postStartDriftTimersRef.current.push(fallbackTimerId);
              schedulePostStartDriftChecks();
            } else if (initialAudioSyncPendingRef.current) {
              releaseInitialAudioHold();
            }
            startSilentAudio();
          }
        }
        if (state === 2 || state === 0) {
          setIsPlayerPlaying(false);
        }
        if (
          state === 2 &&
          hasStartedPlaybackRef.current &&
          isStartedByServerTime() &&
          !prestartWarmupActiveRef.current &&
          !isBufferingGraceActive()
        ) {
          if (
            typeof document !== "undefined" &&
            document.visibilityState !== "visible"
          ) {
            resumeNeedsSyncRef.current = true;
            return;
          }
          // Use the pre-hide snapshot to decide immediately:
          // drift > 1.5s → seek to correct position (ONE buffer event).
          // drift ≤ 1.5s → just resume (ZERO buffer events; resync verifies).
          const msSinceMeasured =
            lastPlayerTimeSecRef.current !== null
              ? getServerNowMs() - lastPlayerTimeAtMsRef.current
              : null;
          const requireAlignedPlayback =
            msSinceMeasured !== null
              ? msSinceMeasured > RESUME_DRIFT_TOLERANCE_SEC * 1000
              : !isLikelyContinuousPlayback();
          const didHardRecover = recoverPlaybackIfNeeded("pause-recovery", {
            requireAlignedPlayback,
            holdAudio: initialAudioSyncPendingRef.current,
            holdReleaseDelayMs: initialAudioSyncPendingRef.current
              ? 180
              : undefined,
          });
          // Verify drift only after a hard recovery. A soft resume is already
          // continuing on the current timeline; a follow-up time probe there
          // just reintroduces the foreground stutter we want to avoid.
          if (didHardRecover) {
            scheduleResumeResync();
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
            (isTimeAttackMode || serverNow < guessEndsAt)
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
            startPlayback(undefined, true, {
              reason: "guess-loop",
            });
            return;
          }
          if (isReveal) {
            revealReplayRef.current = true;
            startPlayback(undefined, true, {
              reason: "reveal-replay",
            });
          }
        }
      }

      if (data.event === "infoDelivery") {
        const info = (data as { info?: { currentTime?: number } }).info;
        if (typeof info?.currentTime === "number") {
          lastPlayerTimeSecRef.current = info.currentTime;
          // Stamp with the request time, not response arrival time.
          // If the response is delayed (e.g. pre-hide request answered on foreground return),
          // using getServerNowMs() here makes measuredAt = "now" with an old position,
          // causing isLikelyContinuousPlayback to see ~0ms elapsed and incorrectly
          // report large drift (background_duration) → spurious force-seek.
          lastPlayerTimeAtMsRef.current = lastTimeRequestAtMsRef.current;
          if (lastTimeRequestReasonRef.current === "first-play-sync") {
            const expected = getDesiredPositionSec();
            const drift = Math.abs(info.currentTime - expected);
            const didSeek = syncToServerPosition(
              "first-play-sync",
              false,
              POST_START_DRIFT_TOLERANCE_SEC,
              true,
              true, // bypassBufferingGrace
            );
            debugSync("first-play-sync", {
              playerTime: info.currentTime,
              expected,
              drift,
              toleranceSec: POST_START_DRIFT_TOLERANCE_SEC,
              didSeek,
            });
          }
          if (
            lastTimeRequestReasonRef.current.startsWith("post-start-drift-")
          ) {
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
              toleranceSec: POST_START_DRIFT_TOLERANCE_SEC,
              didSeek,
            });
            if (
              !didSeek &&
              drift > POST_START_DRIFT_TOLERANCE_SEC &&
              !postStartDriftRetriedRef.current
            ) {
              postStartDriftRetriedRef.current = true;
              schedulePostStartDriftChecks();
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
    clearBufferingRecoveryTimer,
    clearInitialAudioHoldReleaseTimer,
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
    handleTrackPrepared,
    isEnded,
    isBufferingGraceActive,
    isLikelyContinuousPlayback,
    isReveal,
    isTimeAttackMode,
    isStartedByServerTime,
    loadTrack,
    phase,
    postCommand,
    requestPlayerTime,
    recoverPlaybackIfNeeded,
    releaseInitialAudioHold,
    scheduleInitialAudioHoldRelease,
    scheduleBufferingRecovery,
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
    // Mark prepared immediately for the cue path (same as onReady handler).
    if (!autoplay) {
      trackPreparedRef.current = true;
    }
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
    const latestPlayerTimeSec = lastPlayerTimeSecRef.current;
    const playerEnded =
      lastPlayerStateRef.current === 0 ||
      (typeof latestPlayerTimeSec === "number" &&
        latestPlayerTimeSec >= clipEndSec - 0.12);

    if (playerEnded) {
      if (hasRecentBuffering()) {
        const timerId = window.setTimeout(() => {
          revealReplayRef.current = true;
          startPlayback(undefined, false, {
            reason: "reveal-replay",
          });
        }, 260);
        return () => window.clearTimeout(timerId);
      }
      revealReplayRef.current = true;
      startPlayback(undefined, true, {
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
    const fallbackTimer = window.setTimeout(
      () => {
        if (lastPlayerStateRef.current !== 1 && !hasRecentBuffering()) {
          postCommand("playVideo");
          postCommand("unMute");
          applyVolume(gameVolume);
          startSilentAudio();
        }
      },
      recentBuffering ? 780 : 420,
    );
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
        // Snapshot the player position right before going to background.
        // This keeps lastPlayerTimeAtMsRef fresh so getFreshPlayerTimeSec()
        // returns a usable value on short background trips (< 2s), reducing
        // spurious seeks on foreground return.
        if (playerReadyRef.current && hasStartedPlaybackRef.current) {
          requestPlayerTime("pre-hide");
        }
        return;
      }
      const serverNow = getServerNowMs();
      if (!playerReadyRef.current) return;
      if (startedAt > serverNow) {
        resumeNeedsSyncRef.current = true;
        return;
      }
      const dedupeNow = Date.now();
      if (
        dedupeNow - lastForegroundRecoveryAtMsRef.current <
        FOREGROUND_RECOVERY_DEDUPE_MS
      ) {
        return;
      }
      lastForegroundRecoveryAtMsRef.current = dedupeNow;
      resyncTimersRef.current.forEach((timerId) =>
        window.clearTimeout(timerId),
      );
      resyncTimersRef.current = [];
      resumeNeedsSyncRef.current = false;
      pendingResumeSyncReasonRef.current =
        event?.type === "focus"
          ? "visibility-focus"
          : event?.type === "pageshow"
            ? "visibility-pageshow"
            : "visibility";
      const shouldProbeUnknownForegroundState =
        !requiresAudioGesture && lastPlayerStateRef.current === null;
      // Separate position health from player state. On desktop, the iframe can
      // briefly report paused/buffering during foreground return even when the
      // timeline is still aligned. Treating that as an immediate hard-recover
      // causes the "iframe loading" pause the user hears.
      const isPositionOnTrack =
        hasStartedPlaybackRef.current &&
        isLikelyContinuousPlayback(RESUME_DRIFT_TOLERANCE_SEC);
      const isPlayingOnTrack =
        isPositionOnTrack && lastPlayerStateRef.current === 1;
      const shouldDeferForegroundTouch =
        isPositionOnTrack &&
        !initialAudioSyncPendingRef.current &&
        !requiresAudioGesture;
      debugSync("visibility-force-resume", {
        reason: pendingResumeSyncReasonRef.current,
        playerState: lastPlayerStateRef.current,
        initialAudioHoldPending: initialAudioSyncPendingRef.current,
        shouldProbeUnknownForegroundState,
        isPositionOnTrack,
        isPlayingOnTrack,
      });
      if (isPlayingOnTrack && !initialAudioSyncPendingRef.current) {
        return;
      }
      if (shouldProbeUnknownForegroundState) {
        const visibleSnapshotPlayerTimeSec = lastPlayerTimeSecRef.current;
        const settleTimerId = window.setTimeout(() => {
          if (!playerReadyRef.current) return;
          if (document.visibilityState !== "visible") return;
          if (lastPlayerStateRef.current === 1) {
            return;
          }
          const latestPlayerTimeSec = lastPlayerTimeSecRef.current;
          const progressedSinceVisible =
            typeof visibleSnapshotPlayerTimeSec === "number" &&
            typeof latestPlayerTimeSec === "number" &&
            latestPlayerTimeSec - visibleSnapshotPlayerTimeSec >= 0.12;
          if (progressedSinceVisible) {
            return;
          }
          const nowMs = getServerNowMs();
          const desiredSec = getDesiredPositionSec();
          const estimatedPos =
            getRecentMeasuredEstimatedPositionSec(nowMs) ??
            getEstimatedLocalPositionSec();
          const estimatedDrift = Math.abs(estimatedPos - desiredSec);
          const requireAlignedPlayback =
            estimatedDrift > RESUME_DRIFT_TOLERANCE_SEC;
          if (!requireAlignedPlayback) {
            return;
          }
          const didHardRecover = recoverPlaybackIfNeeded("resume", {
            requireAlignedPlayback: true,
            holdAudio: false,
          });
          if (didHardRecover) {
            scheduleResumeResync();
          }
        }, 220);
        resyncTimersRef.current.push(settleTimerId);
        return;
      }
      if (shouldDeferForegroundTouch) {
        const settleTimerId = window.setTimeout(() => {
          if (!playerReadyRef.current) return;
          if (document.visibilityState !== "visible") return;
          if (lastPlayerStateRef.current === 1) return;
          recoverPlaybackIfNeeded("resume", {
            requireAlignedPlayback: false,
            holdAudio: false,
          });
        }, 260);
        resyncTimersRef.current.push(settleTimerId);
        return;
      }
      const didHardRecover = recoverPlaybackIfNeeded("resume", {
        requireAlignedPlayback: !isPositionOnTrack,
        holdAudio: initialAudioSyncPendingRef.current,
        holdReleaseDelayMs: initialAudioSyncPendingRef.current
          ? 180
          : undefined,
      });
      if (didHardRecover) {
        scheduleResumeResync();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleVisibility);
    window.addEventListener("pageshow", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleVisibility);
      window.removeEventListener("pageshow", handleVisibility);
    };
  }, [
    debugSync,
    getDesiredPositionSec,
    getEstimatedLocalPositionSec,
    getRecentMeasuredEstimatedPositionSec,
    getServerNowMs,
    isLikelyContinuousPlayback,
    requiresAudioGesture,
    recoverPlaybackIfNeeded,
    requestPlayerTime,
    scheduleResumeResync,
    startedAt,
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
