import React from "react";
import { Button, Switch } from "@mui/material";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";

import type { DanmuItem } from "./gameRoomPageTypes";

interface GameRoomPlaybackPanelProps {
  isMobileView?: boolean;
  isOverlayMode?: boolean;
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
  danmuEnabled: boolean;
  danmuItems: DanmuItem[];
  showGuessMask: boolean;
  showPreStartMask: boolean;
  showLoadingMask: boolean;
  showAudioOnlyMask: boolean;
  showVideo: boolean;
  onShowVideoChange: (show: boolean) => void;
  gameVolume: number;
  onGameVolumeChange: (volume: number) => void;
}

const GameRoomPlaybackPanel: React.FC<GameRoomPlaybackPanelProps> = ({
  isMobileView = false,
  isOverlayMode = false,
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
  danmuEnabled,
  danmuItems,
  showGuessMask,
  showPreStartMask,
  showLoadingMask,
  showAudioOnlyMask,
  showVideo,
  onShowVideoChange,
  gameVolume,
  onGameVolumeChange,
}) => {
  const isMobileOverlay = isMobileView && isOverlayMode;
  const shouldShowRoomName = !(isMobileView && isOverlayMode);
  const revealAnswerLabel = revealAnswerTitle?.trim() ?? "";
  const revealAnswerWrapperClass = isMobileOverlay
    ? "flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden rounded-xl border border-emerald-300/45 bg-emerald-500/14 px-2.5 py-[0.34rem] text-emerald-50 shadow-[0_10px_20px_-16px_rgba(16,185,129,0.72)]"
    : "mt-2 inline-flex max-w-full items-start gap-2 rounded-xl border border-emerald-300/45 bg-emerald-500/14 px-3 py-1.5 text-emerald-50 shadow-[0_10px_20px_-16px_rgba(16,185,129,0.72)]";
  const revealAnswerTextClass = isMobileOverlay
    ? "min-w-0 flex-1 truncate text-[11px] font-semibold leading-4"
    : "text-xs font-semibold leading-5 sm:text-sm";
  const shouldUseRevealMarquee =
    isMobileView &&
    isRevealPhase &&
    revealAnswerLabel.length >= (isMobileOverlay ? 14 : 18);
  const mediaFrameHeightClass = isMobileOverlay
    ? "h-full min-h-0 flex-1"
    : isMobileView
      ? "h-[182px]"
      : "h-[140px] sm:h-[188px] md:h-[214px] xl:h-[236px]";
  const revealAnswerNode =
    isMobileView && isRevealPhase && revealAnswerLabel ? (
      <div
        className={revealAnswerWrapperClass}
        title={`答案：${revealAnswerLabel}`}
      >
        <span className="shrink-0 rounded-full border border-emerald-200/50 bg-emerald-500/20 px-2 py-0.5 text-[10px] font-black tracking-[0.12em]">
          答案
        </span>
        {shouldUseRevealMarquee ? (
          <span className="game-room-reveal-title-marquee">
            <span className="game-room-reveal-title-marquee-track game-room-reveal-title-marquee-track--run">
              <span>{revealAnswerLabel}</span>
              <span aria-hidden="true">{revealAnswerLabel}</span>
            </span>
          </span>
        ) : (
          <span className={revealAnswerTextClass}>{revealAnswerLabel}</span>
        )}
      </div>
    ) : null;

  return (
    <div
      className={`game-room-panel game-room-panel--accent p-3 text-slate-50 ${
        isMobileOverlay ? "game-room-playback-panel--mobile-overlay-fill flex h-full min-h-0 flex-col" : "flex-none"
      } ${
        isMobileView
          ? isOverlayMode
            ? "game-room-playback-panel--mobile game-room-playback-panel--mobile-overlay"
            : "game-room-playback-panel--mobile"
          : ""
      }`}
    >
      <div className={`${isMobileOverlay ? "mb-1" : "mb-3"} flex flex-wrap items-center justify-between gap-2`}>
        <div className={isMobileOverlay ? "game-room-mobile-overlay-meta-row" : "flex items-center gap-2"}>
          <div className={isMobileOverlay ? "game-room-mobile-overlay-meta-main" : undefined}>
            {!isMobileOverlay && <p className="game-room-kicker">正在播放</p>}
            {shouldShowRoomName && <p className="game-room-title">{roomName}</p>}
            {isMobileOverlay ? (
              <div className="game-room-mobile-overlay-meta-badges">
                <div className="game-room-track-counter inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1 text-xs font-black tracking-[0.14em] text-amber-100">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.9)]" />
                  題目 {boundedCursor + 1}/{trackOrderLength || "?"}
                </div>
                {revealAnswerNode}
              </div>
            ) : (
              <div
                className={`game-room-track-counter inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black tracking-[0.14em] text-amber-100 ${
                  isMobileOverlay ? "mt-0" : "mt-1"
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.9)]" />
                題目 {boundedCursor + 1}/{trackOrderLength || "?"}
              </div>
            )}
            {!isMobileOverlay && revealAnswerNode}
          </div>
        </div>
        {!isOverlayMode && (
          <div className="flex items-center gap-2 max-[760px]:w-full max-[760px]:flex-col max-[760px]:items-stretch">
            {headerActions}
            <Button
              variant="outlined"
              color="inherit"
              size="small"
              startIcon={<LogoutRoundedIcon fontSize="small" />}
              onClick={onOpenExitConfirm}
              className="max-[760px]:!w-full max-[760px]:!px-2 max-[760px]:!py-1 max-[760px]:!text-xs"
            >
              退出遊戲
            </Button>
          </div>
        )}
      </div>

      <div
        className={`game-room-media-frame relative w-full overflow-hidden ${mediaFrameHeightClass}`}
      >
        {iframeSrc ? (
          <iframe
            src={iframeSrc}
            className="h-full w-full object-contain"
            allow="autoplay; encrypted-media"
            allowFullScreen
            title="Now playing"
            style={{
              pointerEvents: "none",
              opacity: shouldHideVideoFrame || !shouldShowVideo ? 0 : 1,
            }}
            ref={iframeRef}
            onLoad={onIframeLoad}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
            暫時沒有可播放的影片來源
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
        {danmuEnabled && (
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
        )}
        {showGuessMask && (
          <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950">
            <div className="relative h-24 w-24">
              <div className="absolute inset-0 animate-spin rounded-full border-4 border-slate-700 border-t-cyan-300 border-r-emerald-300 shadow-[0_0_26px_rgba(34,211,238,0.35)]" />
              <div className="absolute inset-[22%] animate-pulse rounded-full bg-cyan-300/10" />
            </div>
            <p className="mt-2 text-xs text-slate-300">猜歌中，影片已隱藏</p>
          </div>
        )}
        {showPreStartMask && (
          <div className="pointer-events-none absolute inset-0 z-20 bg-slate-950" />
        )}
        {showLoadingMask && (
          <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/95">
            <div className="relative h-16 w-16">
              <div className="absolute inset-0 animate-spin rounded-full border-4 border-slate-700 border-t-amber-300 border-r-cyan-300 shadow-[0_0_20px_rgba(250,204,21,0.28)]" />
            </div>
            <p className="mt-2 text-[11px] tracking-[0.12em] text-slate-300">切換歌曲中</p>
          </div>
        )}
        {showAudioOnlyMask && (
          <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950">
            <div className="rounded-full border border-slate-700 bg-slate-900/75 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-slate-300">
              Audio Mode
            </div>
            <p className="mt-2 text-xs text-slate-300">目前僅播放音訊，影片與控制面板已隱藏</p>
          </div>
        )}
      </div>

      {!isOverlayMode && (
        <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <Switch
              color="info"
              checked={showVideo}
              onChange={(e) => onShowVideoChange(e.target.checked)}
            />
            <span className="text-xs text-slate-300 max-[760px]:text-[11px]">
              公布階段顯示影片（猜歌時自動隱藏）
            </span>
          </div>
          <div className="flex items-center gap-2 md:min-w-[200px] max-[760px]:w-full">
            <span className="text-xs text-slate-300">音量</span>
            <input
              type="range"
              min={0}
              max={100}
              value={gameVolume}
              onChange={(e) => onGameVolumeChange(Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default GameRoomPlaybackPanel;
