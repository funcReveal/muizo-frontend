import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import PlaylistAddRounded from "@mui/icons-material/PlaylistAddRounded";
import CircularProgress from "@mui/material/CircularProgress";

type CreateProgress = {
  completed?: number;
  current?: number;
  total?: number;
} | null;

type Props = {
  createStageLabel?: string | null;
  createProgress?: CreateProgress;
};

export default function CollectionCreateProgressOverlay({
  createStageLabel,
  createProgress,
}: Props) {
  const { t } = useTranslation("collectionCreate");

  const completed = createProgress?.completed ?? createProgress?.current ?? 0;
  const total = createProgress?.total ?? 0;

  const progressPercent = useMemo(() => {
    if (!total || total <= 0) return null;
    return Math.min(100, Math.max(0, Math.round((completed / total) * 100)));
  }, [completed, total]);

  const stageLabel =
    createStageLabel ||
    t("createProgress.defaultStage", {
      defaultValue: "正在建立收藏庫",
    });

  const progressText =
    total > 0
      ? `${completed}/${total}`
      : t("createProgress.preparing", {
          defaultValue: "準備中",
        });

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-[rgba(2,6,23,0.72)] px-3 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))] backdrop-blur-md sm:items-center sm:p-6"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="w-full max-w-md overflow-hidden rounded-[28px] border border-cyan-300/20 bg-[linear-gradient(180deg,rgba(8,15,28,0.98),rgba(10,18,32,0.96))] shadow-[0_32px_120px_-48px_rgba(34,211,238,0.55)]">
        <div className="border-b border-white/8 bg-white/[0.03] px-4 py-3 sm:px-5">
          <div className="flex items-center gap-3">
            <div className="relative inline-flex h-12 w-12 shrink-0 items-center justify-center sm:h-14 sm:w-14">
              <CircularProgress
                size={48}
                thickness={4}
                variant={
                  progressPercent === null ? "indeterminate" : "determinate"
                }
                value={progressPercent ?? undefined}
                sx={{ color: "#67e8f9" }}
              />

              <div className="absolute flex h-8 w-8 items-center justify-center rounded-full border border-cyan-200/20 bg-cyan-200/10">
                <PlaylistAddRounded
                  sx={{
                    fontSize: 19,
                    color: "#cffafe",
                  }}
                />
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="overflow-hidden text-base font-semibold leading-6 text-[var(--mc-text)] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] sm:text-lg">
                {stageLabel}
              </div>

              <div className="mt-0.5 text-xs leading-5 text-[var(--mc-text-muted)]">
                {t("createProgress.subtitle", {
                  defaultValue: "正在寫入收藏庫與歌曲資料，請不要關閉頁面。",
                })}
              </div>
            </div>

            <div className="shrink-0 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-xs font-semibold text-cyan-100">
              {progressPercent === null ? "..." : `${progressPercent}%`}
            </div>
          </div>
        </div>

        <div className="px-4 py-4 sm:px-5 sm:py-5">
          <div className="h-2 overflow-hidden rounded-full bg-slate-800/80">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#38bdf8,#67e8f9,#f59e0b)] transition-[width] duration-300 ease-out"
              style={{
                width: `${progressPercent ?? 18}%`,
              }}
            />
          </div>

          <div className="mt-2 flex items-center justify-between gap-3 text-[11px] leading-5 text-[var(--mc-text-muted)]">
            <span className="min-w-0 truncate">{stageLabel}</span>
            <span className="shrink-0 font-medium text-cyan-100/90">
              {progressText}
            </span>
          </div>

          <div className="mt-4 rounded-2xl border border-amber-300/18 bg-amber-300/8 px-3 py-2 text-xs leading-5 text-amber-100/90">
            {t("createProgress.safeHint", {
              defaultValue:
                "建立流程會一次完成收藏庫與歌曲寫入；如果中途失敗，不會留下不完整的收藏庫。",
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
