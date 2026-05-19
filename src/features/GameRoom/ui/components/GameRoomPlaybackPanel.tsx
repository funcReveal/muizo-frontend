import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { Button } from "@mui/material";
import ImageRoundedIcon from "@mui/icons-material/ImageRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import VideocamRoundedIcon from "@mui/icons-material/VideocamRounded";
import VolumeDownRoundedIcon from "@mui/icons-material/VolumeDownRounded";
import VolumeOffRoundedIcon from "@mui/icons-material/VolumeOffRounded";
import VolumeUpRoundedIcon from "@mui/icons-material/VolumeUpRounded";

import {
  DanmuContext,
  DanmuItemsContext,
  type DanmuItem,
} from "@features/RoomChat/model/DanmuContext";

interface MobileEmbeddedHudConfig {
  mode: "guess" | "reveal" | null;
  serverOffsetMs: number;
  activePhaseDurationMs: number;
  phaseEndsAt: number;
  revealEndsAt: number;
  trackSessionKey: string;
  allAnsweredReadyForReveal: boolean;
  isRecoveringConnection: boolean;
  liveAnsweredCount: number;
  liveParticipantCount: number;
}

const formatMobileHudTime = (totalSeconds: number): string => {
  const s = Math.max(0, totalSeconds);
  if (s < 60) return String(s);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${String(rem).padStart(2, "0")}`;
};

const MOBILE_GUESS_RING_RADIUS = 30;
const MOBILE_GUESS_RING_CIRCUMFERENCE =
  2 * Math.PI * MOBILE_GUESS_RING_RADIUS;
const DESKTOP_GUESS_RING_RADIUS = 64;
const DESKTOP_GUESS_RING_CIRCUMFERENCE =
  2 * Math.PI * DESKTOP_GUESS_RING_RADIUS;

interface GameRoomPlaybackPanelProps {
  rootRef?: React.Ref<HTMLDivElement>;
  mediaFrameRef?: React.Ref<HTMLDivElement>;
  isMobileView?: boolean;
  isOverlayMode?: boolean;
  isCompactMobile?: boolean;
  isRevealPhase?: boolean;
  revealAnswerTitle?: string | null;
  roomName: string;
  boundedCursor: number;
  trackOrderLength: number;
  onOpenExitConfirm: () => void;
  headerActions?: React.ReactNode;
  iframeSrc: string | null;
  shouldHideVideoFrame: boolean;
  shouldShowVideo: boolean;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  onIframeLoad: () => void;
  silentAudioRef: React.RefObject<HTMLAudioElement | null>;
  silentAudioSrc: string;
  showGuessMask: boolean;
  showPreStartMask: boolean;
  showLoadingMask: boolean;
  showAudioOnlyMask: boolean;
  reduceGuessVideoDisplayCost?: boolean;
  showVideo: boolean;
  onShowVideoChange: (show: boolean) => void;
  videoId?: string | null;
  gameVolume: number;
  onGameVolumeChange: (volume: number) => void;
  mobileEmbeddedHud?: MobileEmbeddedHudConfig;
  desktopEmbeddedHud?: MobileEmbeddedHudConfig;
  mobileScoreFeedbackOverlay?: React.ReactNode;
  desktopScoreFeedbackOverlay?: React.ReactNode;
}

const GameRoomDanmuLayer = React.memo(function GameRoomDanmuLayer({
  danmuItems,
}: {
  danmuItems: DanmuItem[];
}) {
  return (
    <div className="game-room-danmu-layer" aria-hidden="true">
      {danmuItems.map((danmu) => (
        <div
          key={danmu.id}
          className="game-room-danmu-item"
          style={{
            top: `${8 + danmu.lane * 14}%`,
            animationDuration: `${danmu.durationMs}ms`,
          }}
        >
          {danmu.text}
        </div>
      ))}
    </div>
  );
});

const GameRoomDanmuLayerBridge = React.memo(function GameRoomDanmuLayerBridge() {
  const danmuCtx = React.useContext(DanmuContext);
  const danmuItems = React.useContext(DanmuItemsContext);

  if (!danmuCtx?.danmuEnabled) return null;
  if (danmuItems.length === 0) return null;

  return <GameRoomDanmuLayer danmuItems={danmuItems} />;
});

const MobilePlayerSwitch = React.memo(function MobilePlayerSwitch({
  previewMode,
  onChange,
}: {
  previewMode: "video" | "thumbnail";
  onChange: (nextMode: "video" | "thumbnail") => void;
}) {
  const isVideoMode = previewMode === "video";
  const nextMode: "video" | "thumbnail" = isVideoMode ? "thumbnail" : "video";

  const handleToggle = React.useCallback(() => {
    onChange(nextMode);
  }, [nextMode, onChange]);

  return (
    <button
      type="button"
      className={`game-room-mobile-player-switch ${isVideoMode
          ? "game-room-mobile-player-switch--video"
          : "game-room-mobile-player-switch--thumbnail"
        }`}
      role="switch"
      aria-checked={isVideoMode}
      aria-label={
        isVideoMode
          ? "目前顯示影片，點擊切換為縮圖"
          : "目前顯示縮圖，點擊切換為影片"
      }
      onClick={handleToggle}
    >
      <span
        className={`game-room-mobile-player-switch__option ${isVideoMode ? "game-room-mobile-player-switch__option--active" : ""
          }`}
        aria-hidden="true"
      >
        <VideocamRoundedIcon style={{ fontSize: 15 }} />
      </span>

      <span
        className={`game-room-mobile-player-switch__option ${!isVideoMode ? "game-room-mobile-player-switch__option--active" : ""
          }`}
        aria-hidden="true"
      >
        <ImageRoundedIcon style={{ fontSize: 15 }} />
      </span>
    </button>
  );
});

const DesktopEmbeddedVideoModeToggle = React.memo(
  function DesktopEmbeddedVideoModeToggle({
    previewMode,
    onChange,
  }: {
    previewMode: "video" | "thumbnail";
    onChange: (nextMode: "video" | "thumbnail") => void;
  }) {
    return (
      <div
        className="game-room-desktop-video-tabs"
        role="tablist"
        aria-label="播放器顯示模式"
      >
        <button
          type="button"
          role="tab"
          className={`game-room-desktop-video-tab ${
            previewMode === "video" ? "game-room-desktop-video-tab--active" : ""
          }`}
          aria-selected={previewMode === "video"}
          onClick={() => onChange("video")}
        >
          <VideocamRoundedIcon fontSize="small" aria-hidden="true" />
          <span>顯示影片</span>
        </button>
        <button
          type="button"
          role="tab"
          className={`game-room-desktop-video-tab ${
            previewMode === "thumbnail"
              ? "game-room-desktop-video-tab--active"
              : ""
          }`}
          aria-selected={previewMode === "thumbnail"}
          onClick={() => onChange("thumbnail")}
        >
          <ImageRoundedIcon fontSize="small" aria-hidden="true" />
          <span>顯示縮圖</span>
        </button>
      </div>
    );
  },
);

const DesktopEmbeddedGuessHud = React.memo(function DesktopEmbeddedGuessHud({
  boundedCursor,
  trackOrderLength,
  serverOffsetMs,
  activePhaseDurationMs,
  phaseEndsAt,
  trackSessionKey,
  allAnsweredReadyForReveal,
  liveAnsweredCount,
  liveParticipantCount,
}: {
  boundedCursor: number;
  trackOrderLength: number;
  serverOffsetMs: number;
  activePhaseDurationMs: number;
  phaseEndsAt: number;
  trackSessionKey: string;
  allAnsweredReadyForReveal: boolean;
  liveAnsweredCount: number;
  liveParticipantCount: number;
}) {
  const progressCircleRef = React.useRef<SVGCircleElement | null>(null);
  const [seconds, setSeconds] = React.useState(() =>
    Math.ceil(Math.max(0, phaseEndsAt - (Date.now() + serverOffsetMs)) / 1000),
  );

  React.useEffect(() => {
    if (allAnsweredReadyForReveal) {
      setSeconds(0);
      return;
    }
    let timerId: number | null = null;
    const tick = () => {
      const remainingMs = Math.max(0, phaseEndsAt - (Date.now() + serverOffsetMs));
      const nextSec = Math.ceil(remainingMs / 1000);
      setSeconds((prev) => (prev === nextSec ? prev : nextSec));
      if (remainingMs <= 0) return;
      const nextDelay =
        remainingMs > 1000 ? (remainingMs % 1000) || 1000 : Math.min(250, remainingMs);
      timerId = window.setTimeout(tick, nextDelay);
    };
    tick();
    return () => {
      if (timerId !== null) window.clearTimeout(timerId);
    };
  }, [allAnsweredReadyForReveal, phaseEndsAt, serverOffsetMs, trackSessionKey]);

  React.useLayoutEffect(() => {
    const circle = progressCircleRef.current;
    if (!circle) return;

    if (allAnsweredReadyForReveal) {
      circle.style.transition = "stroke-dashoffset 220ms ease-out";
      circle.style.strokeDashoffset = String(-DESKTOP_GUESS_RING_CIRCUMFERENCE);
      return;
    }

    const remainingMs = Math.max(0, phaseEndsAt - (Date.now() + serverOffsetMs));
    const fraction =
      activePhaseDurationMs > 0
        ? Math.max(0, Math.min(1, remainingMs / activePhaseDurationMs))
        : 1;

    circle.style.transition = "none";
    circle.style.strokeDashoffset = String(
      -DESKTOP_GUESS_RING_CIRCUMFERENCE * (1 - fraction),
    );

    void circle.getBoundingClientRect();

    if (remainingMs > 0) {
      circle.style.transition = `stroke-dashoffset ${remainingMs}ms linear`;
      circle.style.strokeDashoffset = String(-DESKTOP_GUESS_RING_CIRCUMFERENCE);
    }
  }, [
    activePhaseDurationMs,
    allAnsweredReadyForReveal,
    phaseEndsAt,
    serverOffsetMs,
    trackSessionKey,
  ]);

  const isUrgent = seconds > 0 && seconds <= 3;

  return (
    <div
      className={`game-room-desktop-embedded-hud ${
        isUrgent ? "game-room-desktop-embedded-hud--urgent" : ""
      }`}
    >
      <span className="game-room-desktop-embedded-hud__question">
        題目 {boundedCursor + 1}/{trackOrderLength || "?"}
      </span>
      <div className="game-room-desktop-embedded-hud__ring-wrap">
        <svg
          className="game-room-desktop-embedded-hud__ring-svg"
          viewBox="0 0 160 160"
          width="160"
          height="160"
          aria-hidden="true"
        >
          <circle
            className="game-room-desktop-embedded-hud__ring-track"
            cx="80"
            cy="80"
            r={DESKTOP_GUESS_RING_RADIUS}
            fill="none"
          />
          <circle
            ref={progressCircleRef}
            className="game-room-desktop-embedded-hud__ring-progress"
            cx="80"
            cy="80"
            r={DESKTOP_GUESS_RING_RADIUS}
            fill="none"
            strokeDasharray={DESKTOP_GUESS_RING_CIRCUMFERENCE}
            strokeDashoffset="0"
            transform="rotate(-90 80 80)"
          />
        </svg>
        <span className="game-room-desktop-embedded-hud__timer">
          {formatMobileHudTime(seconds)}
        </span>
      </div>
      {liveParticipantCount > 0 && (
        <span className="game-room-desktop-embedded-hud__answered">
          已答 {liveAnsweredCount}/{liveParticipantCount}
        </span>
      )}
    </div>
  );
});

const MobileGuessCountdownHud = React.memo(function MobileGuessCountdownHud({
  boundedCursor,
  trackOrderLength,
  serverOffsetMs,
  activePhaseDurationMs,
  phaseEndsAt,
  trackSessionKey,
  allAnsweredReadyForReveal,
  liveAnsweredCount,
  liveParticipantCount,
}: {
  boundedCursor: number;
  trackOrderLength: number;
  serverOffsetMs: number;
  activePhaseDurationMs: number;
  phaseEndsAt: number;
  trackSessionKey: string;
  allAnsweredReadyForReveal: boolean;
  liveAnsweredCount: number;
  liveParticipantCount: number;
}) {
  const progressCircleRef = React.useRef<SVGCircleElement | null>(null);

  const [seconds, setSeconds] = React.useState(() =>
    Math.ceil(Math.max(0, phaseEndsAt - (Date.now() + serverOffsetMs)) / 1000),
  );

  // Second-boundary timer — updates numeric display, stops at 0
  React.useEffect(() => {
    if (allAnsweredReadyForReveal) {
      setSeconds(0);
      return;
    }
    let timerId: number | null = null;
    const tick = () => {
      const remainingMs = Math.max(0, phaseEndsAt - (Date.now() + serverOffsetMs));
      const nextSec = Math.ceil(remainingMs / 1000);
      setSeconds((prev) => (prev === nextSec ? prev : nextSec));
      if (remainingMs <= 0) return;
      const nextDelay =
        remainingMs > 1000 ? (remainingMs % 1000) || 1000 : Math.min(250, remainingMs);
      timerId = window.setTimeout(tick, nextDelay);
    };
    tick();
    return () => {
      if (timerId !== null) window.clearTimeout(timerId);
    };
  }, [allAnsweredReadyForReveal, phaseEndsAt, serverOffsetMs, trackSessionKey]);

  // Horizontal bar progress — CSS transition driven, right-to-left, no per-frame React updates
  React.useLayoutEffect(() => {
    const circle = progressCircleRef.current;
    if (!circle) return;

    if (allAnsweredReadyForReveal) {
      circle.style.transition = "stroke-dashoffset 220ms ease-out";
      circle.style.strokeDashoffset = String(-MOBILE_GUESS_RING_CIRCUMFERENCE);
      return;
    }

    const remainingMs = Math.max(
      0,
      phaseEndsAt - (Date.now() + serverOffsetMs),
    );

    const fraction =
      activePhaseDurationMs > 0
        ? Math.max(0, Math.min(1, remainingMs / activePhaseDurationMs))
        : 1;

    circle.style.transition = "none";
    circle.style.strokeDashoffset = String(
      -MOBILE_GUESS_RING_CIRCUMFERENCE * (1 - fraction),
    );

    void circle.getBoundingClientRect();

    if (remainingMs > 0) {
      circle.style.transition = `stroke-dashoffset ${remainingMs}ms linear`;
      circle.style.strokeDashoffset = String(-MOBILE_GUESS_RING_CIRCUMFERENCE);
    }
  }, [
    activePhaseDurationMs,
    allAnsweredReadyForReveal,
    phaseEndsAt,
    serverOffsetMs,
    trackSessionKey,
  ]);

  const isUrgent = seconds > 0 && seconds <= 3;

  return (
    <div
      className={`game-room-mobile-guess-hud ${isUrgent ? "game-room-mobile-guess-hud--urgent" : ""
        }`}
    >
      <span className="game-room-mobile-guess-hud__question">
        題目 {boundedCursor + 1}/{trackOrderLength || "?"}
      </span>

      <div className="game-room-mobile-guess-hud__ring-wrap">
        <svg
          className="game-room-mobile-guess-hud__ring-svg"
          viewBox="0 0 80 80"
          width="80"
          height="80"
          aria-hidden="true"
        >
          <circle
            className="game-room-mobile-guess-hud__ring-track"
            cx="40"
            cy="40"
            r={MOBILE_GUESS_RING_RADIUS}
            fill="none"
          />

          <circle
            ref={progressCircleRef}
            className="game-room-mobile-guess-hud__ring-progress"
            cx="40"
            cy="40"
            r={MOBILE_GUESS_RING_RADIUS}
            fill="none"
            strokeDasharray={MOBILE_GUESS_RING_CIRCUMFERENCE}
            strokeDashoffset="0"
            transform="rotate(-90 40 40)"
          />
        </svg>

        <span className="game-room-mobile-guess-hud__timer">
          {formatMobileHudTime(seconds)}
        </span>
      </div>

      {liveParticipantCount > 0 && (
        <span className="game-room-mobile-guess-hud__answered">
          已答 {liveAnsweredCount}/{liveParticipantCount}
        </span>
      )}
    </div>
  );
});

const MobileRevealCountdownHint = React.memo(function MobileRevealCountdownHint({
  revealEndsAt,
  serverOffsetMs,
  trackSessionKey,
}: {
  revealEndsAt: number;
  serverOffsetMs: number;
  trackSessionKey: string;
}) {
  const [seconds, setSeconds] = React.useState(() =>
    Math.ceil(Math.max(0, revealEndsAt - (Date.now() + serverOffsetMs)) / 1000),
  );

  React.useEffect(() => {
    let timerId: number | null = null;
    const tick = () => {
      const remainingMs = Math.max(0, revealEndsAt - (Date.now() + serverOffsetMs));
      const nextSeconds = Math.ceil(remainingMs / 1000);
      setSeconds((current) => (current === nextSeconds ? current : nextSeconds));
      if (remainingMs <= 0) return;
      const nextDelay =
        remainingMs > 1000 ? (remainingMs % 1000) || 1000 : Math.min(250, remainingMs);
      timerId = window.setTimeout(tick, nextDelay);
    };
    tick();
    return () => {
      if (timerId !== null) window.clearTimeout(timerId);
    };
  }, [revealEndsAt, serverOffsetMs, trackSessionKey]);

  if (seconds <= 0) return null;

  return (
    <div className="game-room-mobile-reveal-countdown-hint" aria-hidden="true">
      {seconds}
    </div>
  );
});

const GameRoomPlaybackPanel: React.FC<GameRoomPlaybackPanelProps> = ({
  rootRef,
  mediaFrameRef,
  isMobileView = false,
  isOverlayMode = false,
  isCompactMobile = false,
  isRevealPhase = false,
  revealAnswerTitle = null,
  roomName,
  boundedCursor,
  trackOrderLength,
  onOpenExitConfirm,
  headerActions,
  iframeSrc,
  shouldHideVideoFrame,
  shouldShowVideo,
  iframeRef,
  onIframeLoad,
  silentAudioRef,
  silentAudioSrc,
  showGuessMask,
  showPreStartMask,
  showLoadingMask,
  showAudioOnlyMask,
  reduceGuessVideoDisplayCost = false,
  showVideo,
  onShowVideoChange,
  gameVolume,
  onGameVolumeChange,
  videoId,
  mobileEmbeddedHud,
  desktopEmbeddedHud,
  mobileScoreFeedbackOverlay,
  desktopScoreFeedbackOverlay,
}) => {
  const revealMarqueeWrapRef = React.useRef<HTMLSpanElement | null>(null);
  const revealMarqueeTrackRef = React.useRef<HTMLSpanElement | null>(null);
  const [revealMarqueeStyle, setRevealMarqueeStyle] =
    React.useState<React.CSSProperties>({});
  const isMobileOverlay = isMobileView && isOverlayMode;
  const shouldUseCompactMobileHeader = isMobileView && isCompactMobile;
  const shouldShowRoomName = !isMobileOverlay && !shouldUseCompactMobileHeader;
  const revealAnswerLabel = revealAnswerTitle?.trim() ?? "";
  const shouldShowMobileReveal =
    isMobileView && isRevealPhase && Boolean(revealAnswerLabel);
  const shouldUseRevealMarquee =
    shouldShowMobileReveal &&
    revealAnswerLabel.length >= (isMobileOverlay ? 14 : 18);

  React.useEffect(() => {
    if (!shouldUseRevealMarquee) {
      setRevealMarqueeStyle({});
      return;
    }
    const wrap = revealMarqueeWrapRef.current;
    const track = revealMarqueeTrackRef.current;
    if (!wrap || !track) return;

    const measure = () => {
      const overflow = track.scrollWidth - wrap.clientWidth;
      if (overflow > 10) {
        const shift = -(overflow + 12);
        const durationSec = Math.min(6.6, Math.max(2.8, overflow / 82));
        setRevealMarqueeStyle({
          ["--game-room-reveal-shift" as const]: `${shift}px`,
          ["--game-room-reveal-duration" as const]: `${durationSec.toFixed(2)}s`,
        } as React.CSSProperties);
        return;
      }
      setRevealMarqueeStyle({});
    };

    measure();

    if (typeof ResizeObserver !== "undefined") {
      let debounceId: number | null = null;
      const debouncedMeasure = () => {
        if (debounceId !== null) window.clearTimeout(debounceId);
        debounceId = window.setTimeout(measure, 80);
      };
      const observer = new ResizeObserver(debouncedMeasure);
      observer.observe(wrap);
      observer.observe(track);
      return () => {
        observer.disconnect();
        if (debounceId !== null) window.clearTimeout(debounceId);
      };
    }

    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [revealAnswerLabel, shouldUseRevealMarquee]);

  const mediaFrameHeightClass = isMobileOverlay
    ? "h-full min-h-0 flex-1"
    : shouldUseCompactMobileHeader
      ? "game-room-media-frame--mobile-inline"
      : isMobileView
        ? "h-[182px]"
        : "h-[164px] sm:h-[210px] md:h-[236px] xl:h-[258px]";
  const iframeWrapClassName = `game-room-media-iframe-wrap ${reduceGuessVideoDisplayCost
    ? "game-room-media-iframe-wrap--guess-lite"
    : "game-room-media-iframe-wrap--full"
    }`;
  const localVolumeRef = useRef(gameVolume);
  const isDraggingRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const sliderRef = useRef<HTMLInputElement | null>(null);
  const volumeTextRef = useRef<HTMLSpanElement | null>(null);
  const shouldKeepDesktopGuessVideoVisible = !isMobileView && showGuessMask;
  const effectiveShouldShowVideoFrame =
    shouldKeepDesktopGuessVideoVisible || shouldShowVideo;
  const applySliderVisualState = useCallback((value: number) => {
    const normalized = Math.max(0, Math.min(100, value));
    if (sliderRef.current) {
      sliderRef.current.style.setProperty(
        "--game-room-volume-fill",
        `${normalized}%`,
      );
    }
  }, []);

  useEffect(() => {
    if (isDraggingRef.current) return;
    localVolumeRef.current = gameVolume;
    if (sliderRef.current) sliderRef.current.value = String(gameVolume);
    if (volumeTextRef.current) volumeTextRef.current.textContent = `${Math.round(gameVolume)}%`;
    applySliderVisualState(gameVolume);
  }, [applySliderVisualState, gameVolume]);

  const handleVolumeChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const next = Number(event.target.value);
      localVolumeRef.current = next;
      applySliderVisualState(next);
      if (volumeTextRef.current) volumeTextRef.current.textContent = `${Math.round(next)}%`;
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          onGameVolumeChange(localVolumeRef.current);
        });
      }
    },
    [applySliderVisualState, onGameVolumeChange],
  );

  const handleVolumePointerDown = useCallback(() => {
    isDraggingRef.current = true;
  }, []);

  const handleVolumePointerUp = useCallback(() => {
    isDraggingRef.current = false;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    onGameVolumeChange(localVolumeRef.current);
  }, [onGameVolumeChange]);

  const iframeStyle = useMemo<React.CSSProperties>(
    () => ({
      pointerEvents: "none",
      opacity: shouldHideVideoFrame || !effectiveShouldShowVideoFrame ? 0 : 1,
    }),
    [effectiveShouldShowVideoFrame, shouldHideVideoFrame],
  );
  const previewMode: "video" | "thumbnail" = showVideo ? "video" : "thumbnail";
  const volumeIcon =
    gameVolume <= 0 ? (
      <VolumeOffRoundedIcon fontSize="small" />
    ) : gameVolume < 50 ? (
      <VolumeDownRoundedIcon fontSize="small" />
    ) : (
      <VolumeUpRoundedIcon fontSize="small" />
    );
  const shouldShowYoutubeBadge =
    showGuessMask || showAudioOnlyMask || showPreStartMask || isRevealPhase;
  const shouldUseSimpleMobileGuessSpinner = isMobileView;
  const isMobileGuessHudActive = Boolean(
    mobileEmbeddedHud?.mode === "guess" && showGuessMask && !mobileEmbeddedHud.isRecoveringConnection,
  );
  const isMobileRevealHudActive = mobileEmbeddedHud?.mode === "reveal";
  const isMobileEmbeddedHudActive = isMobileGuessHudActive || isMobileRevealHudActive;
  const isDesktopGuessHudActive = Boolean(
    !isMobileView &&
      desktopEmbeddedHud?.mode === "guess" &&
      showGuessMask &&
      !desktopEmbeddedHud.isRecoveringConnection,
  );
  const handleVideoModeChange = useCallback(
    (nextMode: "video" | "thumbnail") => {
      onShowVideoChange(nextMode === "video");
    },
    [onShowVideoChange],
  );
  const trackCounterNode = (
    <div className="game-room-track-counter mt-1 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black tracking-[0.14em] text-amber-100">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.9)]" />
      題目 {boundedCursor + 1}/{trackOrderLength || "?"}
    </div>
  );
  const revealAnswerNode = shouldShowMobileReveal ? (
    <div className="game-room-reveal-inline">
      <span className="game-room-reveal-inline__label">答案</span>
      {shouldUseRevealMarquee ? (
        <span ref={revealMarqueeWrapRef} className="game-room-reveal-title-marquee">
          <span
            ref={revealMarqueeTrackRef}
            className="game-room-reveal-title-marquee-track game-room-reveal-title-marquee-track--run game-room-reveal-inline__value"
            style={revealMarqueeStyle}
          >
            <span>{revealAnswerLabel}</span>
          </span>
        </span>
      ) : (
        <span className="game-room-reveal-inline__value">{revealAnswerLabel}</span>
      )}
    </div>
  ) : null;

  const mobileInfoBar = isMobileView && !isMobileEmbeddedHudActive && !showPreStartMask ? (
    <div className="game-room-mobile-info-bar">
      <div className="game-room-mobile-info-bar__top">
        <div className="game-room-mobile-info-bar__counter">{trackCounterNode}</div>
      </div>
    </div>
  ) : null;
  return (
    <div
      ref={rootRef}
      className={`game-room-panel game-room-panel--accent text-slate-50 ${isMobileOverlay
        ? "game-room-playback-panel--mobile-overlay-fill flex h-full min-h-0 flex-col"
        : "flex-none"
        } ${isMobileView
          ? isOverlayMode
            ? "game-room-playback-panel--mobile game-room-playback-panel--mobile-overlay"
            : `game-room-playback-panel--mobile ${shouldUseCompactMobileHeader
              ? "game-room-playback-panel--mobile-inline"
              : ""
            }`
          : ""
        }`}
    >
      <div
        className={`${shouldUseCompactMobileHeader ? "mb-0" : isMobileOverlay ? "mb-1" : "mb-3"
          } flex flex-wrap items-center justify-between gap-2`}
      >
        <div
          className={
            isMobileOverlay
              ? "game-room-mobile-overlay-meta-row"
              : "flex min-w-0 items-center gap-2"
          }
        >
          <div
            className={
              isMobileOverlay
                ? "game-room-mobile-overlay-meta-main min-w-0"
                : "min-w-0"
            }
          >
            {!isMobileView ? (
              <div className="game-room-playback-title-row">
                {shouldShowRoomName && <p className="game-room-title">{roomName}</p>}
              </div>
            ) : (
              shouldShowRoomName && <p className="game-room-title">{roomName}</p>
            )}
            {!isMobileView && revealAnswerNode}
          </div>
        </div>

        {!isOverlayMode && !shouldUseCompactMobileHeader && (
          <div className={`flex items-center gap-2 ${isMobileView ? "w-full flex-col items-stretch" : ""}`}>
            {headerActions}
            <Button
              variant="outlined"
              color="inherit"
              size="small"
              startIcon={<LogoutRoundedIcon fontSize="small" />}
              onClick={onOpenExitConfirm}
              className={`game-room-leave-btn ${isMobileView ? "!w-full !px-2 !py-1 !text-xs" : ""}`}
            >
              離開房間
            </Button>
          </div>
        )}
      </div>

      {mobileInfoBar}

      <div
        ref={mediaFrameRef}
        className={`game-room-media-frame relative w-full overflow-hidden ${mediaFrameHeightClass}`}
      >
        {isMobileView && mobileScoreFeedbackOverlay ? (
          <div className="game-room-mobile-score-feedback-slot">
            {mobileScoreFeedbackOverlay}
          </div>
        ) : null}

        {!isMobileView && (
          <>
            {desktopScoreFeedbackOverlay ? (
              <div className="game-room-desktop-score-feedback-slot">
                {desktopScoreFeedbackOverlay}
              </div>
            ) : null}

            <div className="game-room-desktop-video-toggle-slot">
              <DesktopEmbeddedVideoModeToggle
                previewMode={previewMode}
                onChange={handleVideoModeChange}
              />
            </div>

            {!isOverlayMode ? (
              <div className="game-room-desktop-volume-overlay">
                <div className="game-room-playback-volume-panel">
                  <span className="game-room-playback-volume-panel__icon" aria-hidden="true">
                    {volumeIcon}
                  </span>
                  <span
                    ref={volumeTextRef}
                    className="game-room-playback-volume-panel__value"
                  >
                    {Math.round(gameVolume)}%
                  </span>
                </div>
                <input
                  ref={sliderRef}
                  type="range"
                  min={0}
                  max={100}
                  defaultValue={gameVolume}
                  onChange={handleVolumeChange}
                  onPointerDown={handleVolumePointerDown}
                  onPointerUp={handleVolumePointerUp}
                  aria-label="遊戲音量"
                  className="game-room-playback-volume-slider"
                />
              </div>
            ) : null}
          </>
        )}

        {iframeSrc ? (
          <div
            className={iframeWrapClassName}
            aria-hidden={shouldHideVideoFrame || !effectiveShouldShowVideoFrame}
          >
            <iframe
              src={iframeSrc}
              className="game-room-media-iframe h-full w-full object-contain"
              allow="autoplay; encrypted-media"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              title="遊戲影片播放器"
              style={iframeStyle}
              ref={iframeRef}
              onLoad={onIframeLoad}
            />
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
            尚未載入影片
          </div>
        )}

        <audio
          ref={silentAudioRef}
          src={silentAudioSrc}
          loop
          preload="auto"
          playsInline
          className="pointer-events-none absolute h-0 w-0 opacity-0"
          aria-hidden="true"
        />

        <GameRoomDanmuLayerBridge />

        {isMobileRevealHudActive && mobileEmbeddedHud && (
          <MobileRevealCountdownHint
            revealEndsAt={mobileEmbeddedHud.revealEndsAt}
            serverOffsetMs={mobileEmbeddedHud.serverOffsetMs}
            trackSessionKey={mobileEmbeddedHud.trackSessionKey}
          />
        )}

        {isMobileView && (
          <MobilePlayerSwitch previewMode={previewMode} onChange={handleVideoModeChange} />
        )}

        {showGuessMask && (
          <div className="game-room-playback-mask game-room-playback-mask--guess pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950">
            {isDesktopGuessHudActive && desktopEmbeddedHud ? (
              <DesktopEmbeddedGuessHud
                boundedCursor={boundedCursor}
                trackOrderLength={trackOrderLength}
                serverOffsetMs={desktopEmbeddedHud.serverOffsetMs}
                activePhaseDurationMs={desktopEmbeddedHud.activePhaseDurationMs}
                phaseEndsAt={desktopEmbeddedHud.phaseEndsAt}
                trackSessionKey={desktopEmbeddedHud.trackSessionKey}
                allAnsweredReadyForReveal={desktopEmbeddedHud.allAnsweredReadyForReveal}
                liveAnsweredCount={desktopEmbeddedHud.liveAnsweredCount}
                liveParticipantCount={desktopEmbeddedHud.liveParticipantCount}
              />
            ) : shouldUseSimpleMobileGuessSpinner &&
              mobileEmbeddedHud?.mode === "guess" &&
              !mobileEmbeddedHud.isRecoveringConnection ? (
              <MobileGuessCountdownHud
                boundedCursor={boundedCursor}
                trackOrderLength={trackOrderLength}
                serverOffsetMs={mobileEmbeddedHud.serverOffsetMs}
                activePhaseDurationMs={mobileEmbeddedHud.activePhaseDurationMs}
                phaseEndsAt={mobileEmbeddedHud.phaseEndsAt}
                trackSessionKey={mobileEmbeddedHud.trackSessionKey}
                allAnsweredReadyForReveal={mobileEmbeddedHud.allAnsweredReadyForReveal}
                liveAnsweredCount={mobileEmbeddedHud.liveAnsweredCount}
                liveParticipantCount={mobileEmbeddedHud.liveParticipantCount}
              />
            ) : (
              <>
                <div
                  className={`game-room-guess-spinner relative ${shouldUseSimpleMobileGuessSpinner
                    ? "h-14 w-14"
                    : "h-20 w-20 sm:h-24 sm:w-24"
                    }`}
                >
                  {shouldUseSimpleMobileGuessSpinner ? (
                    <div className="game-room-guess-spinner__ring absolute inset-0" />
                  ) : (
                    <>
                      <div className="game-room-guess-spinner__halo absolute inset-0" />
                      <div className="game-room-guess-spinner__ring absolute inset-0" />
                      <div className="game-room-guess-spinner__core absolute inset-[24%]" />
                    </>
                  )}
                </div>
                {!shouldUseSimpleMobileGuessSpinner && (
                  <p className="mt-2 text-xs text-slate-300">猜歌中</p>
                )}
              </>
            )}
          </div>
        )}

        {showPreStartMask && (
          <div className="pointer-events-none absolute inset-0 z-20">
            {videoId && (
              <img
                src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
                alt=""
                aria-hidden="true"
                fetchPriority="high"
                className="absolute inset-0 h-full w-full object-cover opacity-15"
                draggable={false}
              />
            )}
            <div className="absolute inset-0 bg-slate-950/88" />
          </div>
        )}

        {showLoadingMask && (
          <div className="game-room-playback-mask game-room-playback-mask--loading pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/95">
            <div className="relative h-16 w-16">
              <div className="game-room-mask-spinner absolute inset-0 rounded-full border-4 border-slate-700 border-t-amber-300 border-r-slate-400 shadow-[0_0_16px_rgba(148,163,184,0.18)]" />
            </div>
            <p className="mt-2 text-[11px] tracking-[0.12em] text-slate-300">
              載入中
            </p>
          </div>
        )}

        {showAudioOnlyMask && (
          <div className="game-room-thumbnail-mask pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center overflow-hidden bg-[#06070b]">
            {videoId ? (
              <>
                <img
                  src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
                  alt="影片縮圖預覽"
                  className="absolute inset-0 h-full w-full object-cover opacity-28"
                  draggable={false}
                />
                <div className="absolute inset-0 bg-linear-to-t from-[#06070b]/84 via-[#06070b]/18 to-[#06070b]/52" />
                <div className="game-room-thumbnail-record relative z-10 rounded-full border border-slate-600/60 bg-slate-950/70 px-3 py-1 text-[11px] tracking-[0.22em] text-slate-300">
                  <img
                    src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
                    alt=""
                    className="game-room-thumbnail-record__art"
                    draggable={false}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="game-room-thumbnail-record rounded-full border border-slate-700 bg-slate-900/75 px-3 py-1 text-[11px] tracking-[0.22em] text-slate-300" />
                <p className="game-room-thumbnail-mask__hint mt-2 text-xs text-slate-300" />
              </>
            )}
          </div>
        )}

        {shouldShowYoutubeBadge && (
          <div
            className={`game-room-youtube-badge ${isMobileView ? "game-room-youtube-badge--mobile" : ""
              }`}
            aria-hidden="true"
          >
            <picture>
              <source
                srcSet="/developed-with-youtube-lowercase-dark.png"
                media="(prefers-color-scheme: light)"
              />
              <img
                src="/developed-with-youtube-lowercase-light.png"
                alt=""
                className="game-room-youtube-badge__image"
                draggable={false}
              />
            </picture>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(GameRoomPlaybackPanel);
