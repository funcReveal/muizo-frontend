import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { Button } from "@mui/material";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import VolumeDownRoundedIcon from "@mui/icons-material/VolumeDownRounded";
import VolumeOffRoundedIcon from "@mui/icons-material/VolumeOffRounded";
import VolumeUpRoundedIcon from "@mui/icons-material/VolumeUpRounded";

import type { DanmuItem } from "../../model/gameRoomTypes";
import { DanmuContext, DanmuItemsContext } from "../../model/DanmuContext";

interface GameRoomPlaybackPanelProps {
  rootRef?: React.Ref<HTMLDivElement>;
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

const GameRoomVideoModeSegment = React.memo(function GameRoomVideoModeSegment({
  previewMode,
  compact = false,
  onChange,
}: {
  previewMode: "video" | "thumbnail";
  compact?: boolean;
  onChange: (nextMode: "video" | "thumbnail") => void;
}) {
  return (
    <div
      className={`game-room-video-mode-seg ${compact ? "game-room-video-mode-seg--compact" : ""
        }`}
      role="group"
      aria-label="影片顯示模式切換"
    >
      <button
        type="button"
        className={`game-room-video-mode-seg-btn ${previewMode === "video" ? "game-room-video-mode-seg-btn--active" : ""
          }`}
        onClick={() => onChange("video")}
        aria-pressed={previewMode === "video"}
      >
        顯示影片
      </button>
      <button
        type="button"
        className={`game-room-video-mode-seg-btn ${previewMode === "thumbnail"
          ? "game-room-video-mode-seg-btn--active"
          : ""
          }`}
        onClick={() => onChange("thumbnail")}
        aria-pressed={previewMode === "thumbnail"}
      >
        顯示縮圖
      </button>
    </div>
  );
});

const GameRoomPlaybackPanel: React.FC<GameRoomPlaybackPanelProps> = ({
  rootRef,
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
  const videoModeControl = (
    <GameRoomVideoModeSegment
      previewMode={previewMode}
      compact={isMobileView}
      onChange={handleVideoModeChange}
    />
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

  const mobileInfoBar = isMobileView ? (
    <div className="game-room-mobile-info-bar">
      <div className="game-room-mobile-info-bar__top">
        <div className="game-room-mobile-info-bar__counter">{trackCounterNode}</div>
        <div className="game-room-mobile-info-bar__toggle">{videoModeControl}</div>
      </div>
      {revealAnswerNode ? (
        <div className="game-room-mobile-answer-row">{revealAnswerNode}</div>
      ) : null}
    </div>
  ) : null;
  return (
    <div
      ref={rootRef}
      className={`game-room-panel game-room-panel--accent p-3 text-slate-50 ${isMobileOverlay
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
        className={`${isMobileOverlay ? "mb-1" : "mb-3"
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
                {trackCounterNode}
                {shouldShowRoomName && <p className="game-room-title">{roomName}</p>}
              </div>
            ) : (
              shouldShowRoomName && <p className="game-room-title">{roomName}</p>
            )}
            {!isMobileView && revealAnswerNode}
          </div>
        </div>

        {!isOverlayMode && !shouldUseCompactMobileHeader && (
          <div className="flex items-center gap-2 max-[760px]:w-full max-[760px]:flex-col max-[760px]:items-stretch">
            {headerActions}
            <Button
              variant="outlined"
              color="inherit"
              size="small"
              startIcon={<LogoutRoundedIcon fontSize="small" />}
              onClick={onOpenExitConfirm}
              className="game-room-leave-btn max-[760px]:!w-full max-[760px]:!px-2 max-[760px]:!py-1 max-[760px]:!text-xs"
            >
              離開房間
            </Button>
          </div>
        )}
      </div>

      {mobileInfoBar}

      <div
        className={`game-room-media-frame relative w-full overflow-hidden ${mediaFrameHeightClass}`}
      >
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

        {showGuessMask && (
          <div className="game-room-playback-mask game-room-playback-mask--guess pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950">
            <div
              className={`game-room-guess-spinner relative ${
                shouldUseSimpleMobileGuessSpinner
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
            <p className="mt-2 text-xs text-slate-300">猜歌中</p>
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

      {!isMobileView && (
        <div className="game-room-playback-footer game-room-playback-footer--desktop">
          <div className="game-room-playback-footer__toggle">{videoModeControl}</div>
          {!isOverlayMode ? (
            <div className="game-room-playback-footer__volume">
              <div className="game-room-playback-volume-panel">
                <span className="game-room-playback-volume-panel__icon" aria-hidden="true">
                  {volumeIcon}
                </span>
                <div className="game-room-playback-volume-panel__copy">
                  <span className="game-room-playback-volume-panel__label">遊戲音量</span>
                  <span
                    ref={volumeTextRef}
                    className="game-room-playback-volume-panel__value"
                  >
                    {Math.round(gameVolume)}%
                  </span>
                </div>
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
        </div>
      )}
    </div>
  );
};

export default React.memo(GameRoomPlaybackPanel);
