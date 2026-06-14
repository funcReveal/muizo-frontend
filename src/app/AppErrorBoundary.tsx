import React from "react";

import {
  isChunkLoadError,
  reloadOnceForChunkError,
  reloadWithCacheBust,
  resetChunkReloadAttempts,
} from "./runtimeRecovery";

type AppErrorBoundaryProps = {
  children: React.ReactNode;
};

type AppErrorBoundaryState = {
  error: Error | null;
};

class AppErrorBoundary extends React.Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    if (isChunkLoadError(error)) {
      reloadOnceForChunkError();
      return;
    }

    console.error("[app] uncaught render error", error);
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    const isRecoverableChunkError = isChunkLoadError(this.state.error);

    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--mc-bg)] p-5 text-[var(--mc-text)]">
        <div className="w-full max-w-md rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface)] p-6 text-center shadow-[0_24px_70px_-42px_rgba(0,0,0,0.8)]">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-300/24 bg-amber-300/12 text-lg font-black text-amber-100">
            !
          </div>
          <h1 className="mt-4 text-lg font-semibold text-[var(--mc-text)]">
            {isRecoverableChunkError ? "頁面需要重新載入" : "頁面發生錯誤"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-[var(--mc-text-muted)]">
            {isRecoverableChunkError
              ? "可能剛完成部署，手機仍保留舊版本頁面。重新整理後會載入最新版本。"
              : "目前頁面遇到未預期錯誤。重新整理後若仍發生，請回報當前操作路徑。"}
          </p>
          <button
            type="button"
            onClick={() => {
              resetChunkReloadAttempts();
              reloadWithCacheBust();
            }}
            className="mt-5 inline-flex items-center justify-center rounded-xl border border-amber-300/28 bg-amber-300/12 px-4 py-2 text-sm font-semibold text-amber-50 transition hover:bg-amber-300/18"
          >
            重新載入
          </button>
        </div>
      </div>
    );
  }
}

export default AppErrorBoundary;
