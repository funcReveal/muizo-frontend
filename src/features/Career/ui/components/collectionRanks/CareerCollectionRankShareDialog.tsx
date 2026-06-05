import React from "react";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import DownloadRounded from "@mui/icons-material/DownloadRounded";
import ShareRounded from "@mui/icons-material/ShareRounded";
import TrackChangesRoundedIcon from "@mui/icons-material/TrackChangesRounded";
import WorkspacePremiumRoundedIcon from "@mui/icons-material/WorkspacePremiumRounded";
import { Dialog, IconButton, Slide } from "@mui/material";
import type { TransitionProps } from "@mui/material/transitions";
import { toBlob } from "html-to-image";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";

import { useAuth } from "@shared/auth/AuthContext";
import { appToast } from "@shared/ui/toastApi";
import type { CareerCollectionRankRow } from "../../../types/career";
import {
  formatCareerRank,
  formatCareerScore,
} from "../../../model/careerUiFormatters";
import { recordCareerCollectionRankActionEvent } from "../../../model/careerOverviewApi";

interface CareerCollectionRankShareDialogProps {
  open: boolean;
  item: CareerCollectionRankRow | null;
  onClose: () => void;
}

type ShareNavigator = Navigator & {
  canShare?: (data: ShareData) => boolean;
};

const ShareDialogTransition = React.forwardRef<
  unknown,
  TransitionProps & { children: React.ReactElement }
>(function ShareDialogTransition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const getCollectionShareMetrics = (item: CareerCollectionRankRow) => {
  const summary = item.matchSummary ?? null;
  const selfPlayer = summary?.selfPlayer ?? null;
  const questionCount = summary?.questionCount ?? null;
  const correctCount = selfPlayer?.correctCount ?? null;
  const accuracyPercent =
    typeof correctCount === "number" &&
    typeof questionCount === "number" &&
    questionCount > 0
      ? Math.round((correctCount / questionCount) * 100)
      : null;
  const accuracy =
    typeof correctCount === "number" &&
    typeof questionCount === "number" &&
    questionCount > 0
      ? `${correctCount}/${questionCount} (${accuracyPercent}%)`
      : "-";

  return {
    achievedRank: formatCareerRank(item.bestRankAtPlay ?? null),
    currentRank: formatCareerRank(item.leaderboardRank),
    bestScore: formatCareerScore(item.bestScore),
    score:
      typeof selfPlayer?.finalScore === "number"
        ? formatCareerScore(selfPlayer.finalScore)
        : formatCareerScore(item.bestScore),
    accuracy,
    combo:
      typeof selfPlayer?.maxCombo === "number"
        ? `x${selfPlayer.maxCombo}`
        : "-",
    accuracyNote:
      typeof accuracyPercent === "number"
        ? `${accuracyPercent}% 命中`
        : "尚無答題紀錄",
    comboNote:
      typeof selfPlayer?.maxCombo === "number" ? "最佳連擊" : "尚無 Combo",
    scoreNote:
      typeof item.bestRankAtPlay === "number" &&
      Number.isFinite(item.bestRankAtPlay)
        ? `達成時 ${formatCareerRank(item.bestRankAtPlay)}`
        : "最佳成績",
    replayCount:
      typeof item.bestPlayNumber === "number" &&
      Number.isFinite(item.bestPlayNumber)
        ? `第 ${item.bestPlayNumber.toLocaleString("zh-TW")} 次遊玩達成`
        : "達成次數未記錄",
    playCount: `${item.playCount.toLocaleString("zh-TW")} 場`,
  };
};

const buildShareText = (item: CareerCollectionRankRow) => {
  const metrics = getCollectionShareMetrics(item);
  return `Muizo 題庫戰績｜${item.title}\n達成排名 ${metrics.achievedRank}，目前排名 ${metrics.currentRank}，最佳分數 ${metrics.score}`;
};

const sanitizeFilename = (value: string) =>
  value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 48) || "collection-rank";

const createShareImageBlob = async (node: HTMLElement) => {
  await document.fonts?.ready;
  const blob = await toBlob(node, {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: "transparent",
    width: node.scrollWidth,
    height: node.scrollHeight,
    style: {
      width: `${node.scrollWidth}px`,
      height: `${node.scrollHeight}px`,
      maxWidth: "none",
    },
  });

  if (!blob) throw new Error("產生分享圖片失敗");
  return blob;
};

const canShareData = (shareNavigator: ShareNavigator, data: ShareData) => {
  if (typeof shareNavigator.canShare !== "function") return true;

  try {
    return shareNavigator.canShare(data);
  } catch {
    return false;
  }
};

const isShareAbortError = (error: unknown) =>
  error instanceof DOMException && error.name === "AbortError";

const SHARE_EVENT_SURFACE = "career_collection_rank_share_dialog";

const CollectionSummaryMetric: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
}> = ({ icon, label, value }) => (
  <div className="flex min-w-0 items-center justify-center px-1 py-2 text-center sm:px-2 sm:text-left">
    <div className="flex w-full min-w-0 max-w-[120px] flex-col items-center justify-center gap-1 text-center sm:max-w-[220px] sm:flex-row sm:items-start sm:gap-3 sm:text-left">
      <div className="inline-flex h-7 w-7 shrink-0 items-center justify-center text-amber-100 sm:h-9 sm:w-9">
        {icon}
      </div>

      <div className="min-w-0">
        <div className="text-[9px] tracking-[0.12em] text-slate-400 sm:text-[10px] sm:tracking-[0.16em]">
          {label}
        </div>
        <div className="mt-0.5 truncate text-[1.05rem] font-black leading-none text-amber-50 sm:text-[1.3rem]">
          {value}
        </div>
      </div>
    </div>
  </div>
);

const CollectionSettlementSummary: React.FC<{
  currentRank: string;
  score: string;
  accuracy: string;
  combo: string;
}> = ({ currentRank, score, accuracy, combo }) => (
  <article className="mt-4 rounded-[18px] border border-amber-300/16 bg-[radial-gradient(circle_at_12%_8%,rgba(245,158,11,0.08),transparent_28%),linear-gradient(180deg,rgba(28,20,10,0.78),rgba(8,10,14,0.92))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-[minmax(180px,0.9fr)_minmax(0,1.1fr)] sm:gap-3">
      <div className="min-w-0 border-r border-amber-300/14 pr-2 sm:pr-4">
        <div className="text-center text-lg font-semibold text-amber-50/92">
          排名
        </div>
        <div className="mt-2 flex items-center justify-center gap-3">
          <AutoAwesomeRoundedIcon
            className="hidden text-amber-300/65 sm:block"
            sx={{ fontSize: 20 }}
          />
          <div className="text-[2.25rem] font-black leading-none text-amber-200 drop-shadow-[0_14px_32px_rgba(245,158,11,0.3)] sm:text-[3rem]">
            {currentRank}
          </div>
          <AutoAwesomeRoundedIcon
            className="hidden rotate-180 text-amber-300/65 sm:block"
            sx={{ fontSize: 20 }}
          />
        </div>
      </div>

      <div className="min-w-0">
        <div className="text-center text-lg font-semibold text-amber-50/92">
          最佳分數
        </div>
        <div className="mt-2 text-center text-[2.05rem] font-black leading-none tracking-tight text-amber-200 drop-shadow-[0_14px_32px_rgba(245,158,11,0.28)] sm:text-[2.75rem]">
          {score}
        </div>
      </div>
    </div>

    <div className="mt-3 grid grid-cols-2 gap-1 sm:gap-2">
      <CollectionSummaryMetric
        icon={<TrackChangesRoundedIcon sx={{ fontSize: 22 }} />}
        label="答對率"
        value={accuracy}
      />
      <CollectionSummaryMetric
        icon={<WorkspacePremiumRoundedIcon sx={{ fontSize: 22 }} />}
        label="最大 Combo"
        value={combo}
      />
    </div>
  </article>
);

const SharePreviewCard: React.FC<{
  item: CareerCollectionRankRow;
  metrics: ReturnType<typeof getCollectionShareMetrics>;
  showReplayCount: boolean;
  showPlayCount: boolean;
}> = ({ item, metrics, showReplayCount, showPlayCount }) => (
  <div className="w-[520px] max-w-full rounded-[28px] border border-amber-200/16 bg-[radial-gradient(circle_at_12%_0%,rgba(245,158,11,0.24),transparent_32%),radial-gradient(circle_at_95%_100%,rgba(56,189,248,0.16),transparent_35%),linear-gradient(135deg,rgba(28,19,12,0.98),rgba(6,11,22,0.98))] p-5 shadow-[0_24px_60px_-34px_rgba(245,158,11,0.58)]">
    <div className="overflow-hidden rounded-[22px] border border-white/10 bg-slate-950/50">
      <div className="relative aspect-[16/9] bg-slate-900/80">
        {item.coverThumbnailUrl ? (
          <img
            src={item.coverThumbnailUrl}
            alt=""
            crossOrigin="anonymous"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-slate-500">
            無封面
          </div>
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.04)_0%,rgba(2,6,23,0.22)_46%,rgba(2,6,23,0.9)_100%)]" />
        <div className="absolute bottom-4 left-4 right-4">
          <div className="line-clamp-2 text-2xl font-semibold leading-tight text-slate-50">
            {item.title}
          </div>
        </div>
      </div>
    </div>

    <CollectionSettlementSummary
      currentRank={metrics.currentRank}
      score={metrics.score}
      accuracy={metrics.accuracy}
      combo={metrics.combo}
    />

    {showReplayCount ? (
      <div className="mt-4 rounded-[18px] border border-white/10 bg-slate-950/44 p-4 text-sm font-semibold text-slate-200/82">
        {metrics.replayCount}
      </div>
    ) : null}

    <div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-300/72">
      {showPlayCount ? <span>遊玩場數 {metrics.playCount}</span> : <span />}
      <span className="font-semibold text-amber-200">muizo.org</span>
    </div>
  </div>
);

const createShareImageBlobFromData = async ({
  item,
  showReplayCount,
  showPlayCount,
}: {
  item: CareerCollectionRankRow;
  showReplayCount: boolean;
  showPlayCount: boolean;
}) => {
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.position = "fixed";
  host.style.left = "-10000px";
  host.style.top = "0";
  host.style.width = "520px";
  host.style.maxWidth = "none";
  host.style.pointerEvents = "none";
  host.style.zIndex = "-1";
  document.body.appendChild(host);

  const root = createRoot(host);
  try {
    const metrics = getCollectionShareMetrics(item);
    flushSync(() => {
      root.render(
        <SharePreviewCard
          item={item}
          metrics={metrics}
          showReplayCount={showReplayCount}
          showPlayCount={showPlayCount}
        />,
      );
    });

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

    const cardNode = host.firstElementChild;
    if (!(cardNode instanceof HTMLElement)) {
      throw new Error("無法建立分享圖片");
    }

    return await createShareImageBlob(cardNode);
  } finally {
    root.unmount();
    host.remove();
  }
};

const CareerCollectionRankShareDialog: React.FC<
  CareerCollectionRankShareDialogProps
> = ({ open, item, onClose }) => {
  const { authToken, clientId, displayUsername, refreshAuthToken } = useAuth();
  const [isBusy, setIsBusy] = React.useState(false);
  const [showReplayCount, setShowReplayCount] = React.useState(true);
  const [showPlayCount, setShowPlayCount] = React.useState(true);
  const trackedOpenKeyRef = React.useRef<string | null>(null);
  const metrics = item ? getCollectionShareMetrics(item) : null;

  const recordShareEvent = React.useCallback(
    (
      eventName:
        | "career.collection_rank.share.opened"
        | "career.collection_rank.share.clicked"
        | "career.collection_rank.download.clicked"
        | "share.image.generate.failed",
      extraMetadata?: Record<
        string,
        string | number | boolean | null | undefined
      >,
    ) => {
      if (!item || !authToken) return;
      void recordCareerCollectionRankActionEvent({
        eventName,
        clientId,
        username: displayUsername,
        authToken,
        refreshAuthToken,
        collectionId: item.collectionId,
        metadata: {
          buttonPlacement: SHARE_EVENT_SURFACE,
          showReplayCount,
          showPlayCount,
          ...extraMetadata,
        },
      }).catch((error) => {
        console.error("[career/share] failed to record action event", error);
      });
    },
    [
      authToken,
      clientId,
      displayUsername,
      item,
      refreshAuthToken,
      showPlayCount,
      showReplayCount,
    ],
  );

  React.useEffect(() => {
    if (!open || !item) {
      trackedOpenKeyRef.current = null;
      return;
    }

    const openKey = `${item.id}:${item.collectionId ?? ""}`;
    if (trackedOpenKeyRef.current === openKey) return;
    trackedOpenKeyRef.current = openKey;
    recordShareEvent("career.collection_rank.share.opened");
  }, [item, open, recordShareEvent]);

  const handleDownload = React.useCallback(async () => {
    if (!item) return;
    recordShareEvent("career.collection_rank.download.clicked");
    setIsBusy(true);
    try {
      const blob = await createShareImageBlobFromData({
        item,
        showReplayCount,
        showPlayCount,
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `muizo-${sanitizeFilename(item.title)}.png`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      appToast.success("分享圖片已下載");
    } catch {
      recordShareEvent("share.image.generate.failed", {
        source: "share",
        shareFailureStage: "download",
      });
      appToast.error("下載分享圖片失敗");
    } finally {
      setIsBusy(false);
    }
  }, [item, recordShareEvent, showReplayCount, showPlayCount]);

  const handleShare = React.useCallback(async () => {
    if (!item) return;
    recordShareEvent("career.collection_rank.share.clicked");
    setIsBusy(true);
    try {
      const blob = await createShareImageBlobFromData({
        item,
        showReplayCount,
        showPlayCount,
      });
      const file = new File(
        [blob],
        `muizo-${sanitizeFilename(item.title)}.png`,
        {
          type: "image/png",
        },
      );
      const shareText = buildShareText(item);
      const shareData: ShareData = {
        title: "Muizo 題庫戰績",
        text: shareText,
        files: [file],
      };
      const shareNavigator = navigator as ShareNavigator;

      if (
        typeof shareNavigator.share === "function" &&
        canShareData(shareNavigator, shareData)
      ) {
        try {
          await shareNavigator.share(shareData);
          return;
        } catch (error) {
          if (isShareAbortError(error)) return;
        }
      }

      const textShareData: ShareData = {
        title: "Muizo 題庫戰績",
        text: shareText,
      };
      if (
        typeof shareNavigator.share === "function" &&
        canShareData(shareNavigator, textShareData)
      ) {
        try {
          await shareNavigator.share(textShareData);
          return;
        } catch (error) {
          if (isShareAbortError(error)) return;
        }
      }

      if (navigator.clipboard?.writeText && window.isSecureContext) {
        await navigator.clipboard.writeText(shareText);
        appToast.success("已複製分享文字");
        return;
      }

      throw new Error("此瀏覽器不支援分享或複製");
    } catch (error) {
      if (isShareAbortError(error)) return;
      recordShareEvent("share.image.generate.failed", {
        source: "share",
        shareFailureStage: "share",
      });
      appToast.error("分享失敗，請稍後再試");
    } finally {
      setIsBusy(false);
    }
  }, [item, recordShareEvent, showReplayCount, showPlayCount]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      TransitionComponent={ShareDialogTransition}
      maxWidth={false}
      sx={{ zIndex: 1520 }}
      PaperProps={{
        className:
          "!m-3 !w-[min(720px,calc(100vw-24px))] !max-w-none !overflow-hidden !rounded-[28px] !border !border-white/12 !bg-slate-950 !text-slate-100 !shadow-2xl !shadow-black/70",
      }}
    >
      <div className="flex max-h-[min(88dvh,860px)] flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-amber-100/72">
              分享預覽
            </div>
            <div className="mt-1 truncate text-base font-semibold text-slate-50">
              {item?.title ?? "題庫戰績"}
            </div>
          </div>

          <IconButton
            aria-label="關閉分享預覽"
            onClick={onClose}
            size="small"
            sx={{ color: "rgba(226,232,240,0.82)" }}
          >
            <CloseRounded fontSize="small" />
          </IconButton>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          {item && metrics ? (
            <div className="mx-auto w-full max-w-[520px] overflow-visible">
              <SharePreviewCard
                item={item}
                metrics={metrics}
                showReplayCount={showReplayCount}
                showPlayCount={showPlayCount}
              />
            </div>
          ) : (
            <div className="rounded-[16px] border border-white/10 bg-white/[0.035] p-4 text-sm text-[var(--mc-text-muted)]">
              尚未選擇題庫。
            </div>
          )}
        </div>

        <div className="border-t border-white/10 bg-slate-950/96 px-4 py-3 sm:px-5">
          <div className="mb-3 grid gap-2 sm:grid-cols-2">
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-[14px] border border-white/10 bg-white/[0.035] px-3 py-2 text-sm text-slate-200">
              <span>顯示重玩次數</span>
              <input
                type="checkbox"
                checked={showReplayCount}
                onChange={(event) => setShowReplayCount(event.target.checked)}
                className="h-4 w-4 accent-amber-300"
              />
            </label>
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-[14px] border border-white/10 bg-white/[0.035] px-3 py-2 text-sm text-slate-200">
              <span>顯示遊玩場數</span>
              <input
                type="checkbox"
                checked={showPlayCount}
                onChange={(event) => setShowPlayCount(event.target.checked)}
                className="h-4 w-4 accent-cyan-300"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                void handleShare();
              }}
              disabled={!item || isBusy}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-[16px] border border-amber-200/24 bg-amber-200/12 text-sm font-semibold text-amber-50 transition hover:bg-amber-200/18 disabled:cursor-not-allowed disabled:opacity-55"
            >
              <ShareRounded sx={{ fontSize: 18 }} />
              分享
            </button>

            <button
              type="button"
              onClick={() => {
                void handleDownload();
              }}
              disabled={!item || isBusy}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-[16px] border border-sky-200/22 bg-sky-200/10 text-sm font-semibold text-sky-50 transition hover:bg-sky-200/16 disabled:cursor-not-allowed disabled:opacity-55"
            >
              <DownloadRounded sx={{ fontSize: 19 }} />
              下載
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );
};

export default CareerCollectionRankShareDialog;
