import React from "react";
import { createPortal } from "react-dom";

interface AudioGestureOverlayPortalProps {
  visible: boolean;
  isPlayerReady: boolean;
  onTrigger: (event?: React.SyntheticEvent) => void;
}

interface StartBroadcastOverlayPortalProps {
  visible: boolean;
  startCountdownSec: number;
}

export const AudioGestureOverlayPortal: React.FC<AudioGestureOverlayPortalProps> = React.memo(({
  visible,
  isPlayerReady,
  onTrigger,
}) => {
  if (!visible || typeof document === "undefined") return null;
  const stopOverlayEvent = (event: React.SyntheticEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const nativeEvent = event.nativeEvent as Event & {
      stopImmediatePropagation?: () => void;
    };
    nativeEvent.stopImmediatePropagation?.();
  };
  const handleTrigger = (event: React.SyntheticEvent) => {
    stopOverlayEvent(event);
    onTrigger(event);
  };
  return createPortal(
    <div
      className="fixed inset-0 z-[2400] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm"
      onPointerDownCapture={stopOverlayEvent}
      onPointerUpCapture={stopOverlayEvent}
      onClick={handleTrigger}
      role="button"
      tabIndex={0}
      aria-label="點擊後開始播放"
    >
      <div
        className="mx-4 w-full max-w-sm rounded-2xl border border-emerald-300/40 bg-slate-900/85 px-6 py-6 text-center shadow-[0_20px_60px_rgba(2,6,23,0.6)]"
        onPointerDownCapture={stopOverlayEvent}
        onPointerUpCapture={stopOverlayEvent}
        onClick={handleTrigger}
      >
        <button
          type="button"
          onPointerDownCapture={stopOverlayEvent}
          onPointerUpCapture={stopOverlayEvent}
          onClick={handleTrigger}
          disabled={!isPlayerReady}
          className="rounded-full border border-emerald-300/60 bg-emerald-400/15 px-5 py-2 text-base font-semibold text-emerald-100"
        >
          {isPlayerReady ? "點擊後開始播放" : "播放器載入中..."}
        </button>
        <p className="mt-3 text-xs text-slate-300">
          {isPlayerReady
            ? "手機瀏覽器需要先手勢觸發，音樂才能播放"
            : "請稍候播放器初始化完成後再點擊"}
        </p>
      </div>
    </div>,
    document.body,
  );
});

export const StartBroadcastOverlayPortal: React.FC<StartBroadcastOverlayPortalProps> = React.memo(({
  visible,
  startCountdownSec,
}) => {
  if (!visible || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[2300] flex items-center justify-center bg-slate-950/82 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-2xl border border-amber-300/45 bg-slate-950/90 px-6 py-6 text-center shadow-[0_24px_70px_-30px_rgba(251,191,36,0.8)]">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/55 bg-amber-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-100">
          即將開局
        </div>
        <p className="mt-3 text-sm text-slate-200">房主已開始，倒數後全員同步進入作答</p>
        <div className="mt-4 flex items-center justify-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full border border-amber-300/60 bg-amber-500/12 text-5xl font-black text-amber-100 shadow-[0_0_30px_rgba(251,191,36,0.45)]">
            {startCountdownSec}
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-300">倒數結束後會自動開始本局</p>
      </div>
    </div>,
    document.body,
  );
});
