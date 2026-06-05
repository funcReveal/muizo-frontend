import React from "react";
import CloseRounded from "@mui/icons-material/CloseRounded";
import DownloadRounded from "@mui/icons-material/DownloadRounded";
import ShareRounded from "@mui/icons-material/ShareRounded";
import { Dialog, IconButton, Slide } from "@mui/material";
import type { TransitionProps } from "@mui/material/transitions";

import { appToast } from "@shared/ui/toastApi";
import type { CareerCollectionRankRow } from "../../../types/career";
import {
  formatCareerRank,
  formatCareerScore,
} from "../../../model/careerUiFormatters";

interface CareerCollectionRankShareDialogProps {
  open: boolean;
  item: CareerCollectionRankRow | null;
  onClose: () => void;
}

type ShareNavigator = Navigator & {
  canShare?: (data: ShareData) => boolean;
};

const cardWidth = 1080;
const cardHeight = 1350;

const ShareDialogTransition = React.forwardRef<
  unknown,
  TransitionProps & { children: React.ReactElement }
>(function ShareDialogTransition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

type ShareImageOptions = {
  showReplayCount: boolean;
};

const getCollectionShareMetrics = (item: CareerCollectionRankRow) => {
  const summary = item.matchSummary ?? null;
  const selfPlayer = summary?.selfPlayer ?? null;
  const questionCount = summary?.questionCount ?? null;
  const correctCount = selfPlayer?.correctCount ?? null;
  const accuracy =
    typeof correctCount === "number" &&
    typeof questionCount === "number" &&
    questionCount > 0
      ? `${correctCount}/${questionCount} (${Math.round(
          (correctCount / questionCount) * 100,
        )}%)`
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
    replayCount:
      typeof item.bestPlayNumber === "number" &&
      Number.isFinite(item.bestPlayNumber)
        ? `第 ${item.bestPlayNumber.toLocaleString("zh-TW")} 次遊玩達成`
        : "達成次數未記錄",
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

const roundedRect = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) => {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(
    x + width,
    y + height,
    x + width - radius,
    y + height,
  );
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
};

const drawText = (
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
) => {
  const words = [...text];
  const lines: string[] = [];
  let line = "";

  words.forEach((word) => {
    const nextLine = `${line}${word}`;
    if (context.measureText(nextLine).width > maxWidth && line) {
      lines.push(line);
      line = word;
      return;
    }
    line = nextLine;
  });

  if (line) lines.push(line);

  lines.slice(0, maxLines).forEach((lineText, index) => {
    const isLastVisibleLine = index === maxLines - 1 && lines.length > maxLines;
    const value = isLastVisibleLine ? `${lineText.slice(0, -1)}...` : lineText;
    context.fillText(value, x, y + index * lineHeight);
  });
};

const loadImage = async (src: string) => {
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
};

const drawCoverImage = (
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
) => {
  const imageRatio = image.naturalWidth / Math.max(1, image.naturalHeight);
  const targetRatio = width / height;
  const sourceWidth =
    imageRatio > targetRatio
      ? image.naturalHeight * targetRatio
      : image.naturalWidth;
  const sourceHeight =
    imageRatio > targetRatio
      ? image.naturalHeight
      : image.naturalWidth / targetRatio;
  const sourceX = (image.naturalWidth - sourceWidth) / 2;
  const sourceY = (image.naturalHeight - sourceHeight) / 2;
  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    x,
    y,
    width,
    height,
  );
};

const createShareImageBlob = async (
  item: CareerCollectionRankRow,
  options: ShareImageOptions,
) => {
  const canvas = document.createElement("canvas");
  canvas.width = cardWidth;
  canvas.height = cardHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("無法建立分享圖片");

  const metrics = getCollectionShareMetrics(item);
  const gradient = context.createLinearGradient(0, 0, cardWidth, cardHeight);
  gradient.addColorStop(0, "#27160a");
  gradient.addColorStop(0.46, "#0f172a");
  gradient.addColorStop(1, "#020617");
  context.fillStyle = gradient;
  context.fillRect(0, 0, cardWidth, cardHeight);

  context.fillStyle = "rgba(245, 158, 11, 0.18)";
  context.beginPath();
  context.arc(110, 120, 250, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "rgba(56, 189, 248, 0.12)";
  context.beginPath();
  context.arc(980, 1180, 320, 0, Math.PI * 2);
  context.fill();

  roundedRect(context, 70, 72, 940, 1206, 54);
  context.fillStyle = "rgba(255,255,255,0.07)";
  context.fill();
  context.strokeStyle = "rgba(255,255,255,0.16)";
  context.lineWidth = 2;
  context.stroke();

  roundedRect(context, 120, 270, 840, 360, 38);
  context.save();
  context.clip();
  context.fillStyle = "rgba(15,23,42,0.72)";
  context.fillRect(120, 270, 840, 360);
  if (item.coverThumbnailUrl) {
    try {
      const coverImage = await loadImage(item.coverThumbnailUrl);
      drawCoverImage(context, coverImage, 120, 270, 840, 360);
    } catch {
      context.fillStyle = "rgba(245,158,11,0.18)";
      context.fillRect(120, 270, 840, 360);
    }
  }
  const coverGradient = context.createLinearGradient(120, 270, 120, 630);
  coverGradient.addColorStop(0, "rgba(2,6,23,0.06)");
  coverGradient.addColorStop(0.48, "rgba(2,6,23,0.24)");
  coverGradient.addColorStop(1, "rgba(2,6,23,0.92)");
  context.fillStyle = coverGradient;
  context.fillRect(120, 270, 840, 360);
  context.restore();

  context.fillStyle = "#ffffff";
  context.font = "700 64px sans-serif";
  context.fillText("Muizo", 120, 168);
  context.font = "700 28px sans-serif";
  context.fillStyle = "#fcd34d";
  context.fillText("Collection Rank Snapshot", 120, 218);

  roundedRect(context, 720, 126, 240, 64, 32);
  context.fillStyle = "rgba(245,158,11,0.16)";
  context.fill();
  context.fillStyle = "#fde68a";
  context.font = "700 24px sans-serif";
  context.textAlign = "center";
  context.fillText(metrics.currentRank, 840, 167);
  context.textAlign = "left";

  context.fillStyle = "#f8fafc";
  context.font = "700 54px sans-serif";
  drawText(context, item.title, 154, 530, 760, 64, 2);

  context.fillStyle = "rgba(226,232,240,0.78)";
  context.font = "500 28px sans-serif";
  context.fillText(item.sourceLabel ?? "題庫戰績", 154, 594);

  roundedRect(context, 120, 690, 840, 172, 36);
  context.fillStyle = "rgba(245,158,11,0.16)";
  context.fill();
  context.strokeStyle = "rgba(253,230,138,0.22)";
  context.stroke();
  context.fillStyle = "rgba(253,230,138,0.82)";
  context.font = "700 28px sans-serif";
  context.fillText("達成排行榜名次", 160, 748);
  context.fillStyle = "#ffffff";
  context.font = "800 76px sans-serif";
  context.fillText(metrics.achievedRank, 160, 826);
  context.fillStyle = "rgba(226,232,240,0.72)";
  context.font = "600 26px sans-serif";
  context.fillText(`目前排名 ${metrics.currentRank}`, 610, 794);

  const metricCards = [
    ["分數", metrics.score],
    ["答對率", metrics.accuracy],
    ["Combo", metrics.combo],
    ["最佳分數", metrics.bestScore],
  ];

  metricCards.forEach(([label, value], index) => {
    const x = 120 + (index % 2) * 390;
    const y = 910 + Math.floor(index / 2) * 150;
    roundedRect(context, x, y, 340, 136, 30);
    context.fillStyle = "rgba(255,255,255,0.075)";
    context.fill();
    context.strokeStyle = "rgba(255,255,255,0.12)";
    context.stroke();
    context.fillStyle = "rgba(226,232,240,0.7)";
    context.font = "600 24px sans-serif";
    context.fillText(label, x + 28, y + 42);
    context.fillStyle = "#ffffff";
    context.font = "700 40px sans-serif";
    drawText(context, value, x + 28, y + 96, 286, 44, 1);
  });

  if (options.showReplayCount) {
    roundedRect(context, 120, 1210, 840, 64, 28);
    context.fillStyle = "rgba(15,23,42,0.72)";
    context.fill();
    context.fillStyle = "rgba(226,232,240,0.72)";
    context.font = "600 24px sans-serif";
    context.fillText(metrics.replayCount, 160, 1250);
  }

  context.fillStyle = "rgba(226,232,240,0.64)";
  context.font = "500 24px sans-serif";
  context.fillText(
    `遊玩場數 ${item.playCount.toLocaleString("zh-TW")}`,
    120,
    1288,
  );
  context.fillStyle = "#fcd34d";
  context.font = "700 26px sans-serif";
  context.fillText("muizo.app", 780, 1288);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("產生分享圖片失敗"));
    }, "image/png");
  });
};

const CareerCollectionRankShareDialog: React.FC<
  CareerCollectionRankShareDialogProps
> = ({ open, item, onClose }) => {
  const [isBusy, setIsBusy] = React.useState(false);
  const [showReplayCount, setShowReplayCount] = React.useState(true);
  const metrics = item ? getCollectionShareMetrics(item) : null;

  const handleDownload = React.useCallback(async () => {
    if (!item) return;
    setIsBusy(true);
    try {
      const blob = await createShareImageBlob(item, { showReplayCount });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `muizo-${sanitizeFilename(item.title)}.png`;
      link.click();
      URL.revokeObjectURL(url);
      appToast.success("分享圖片已下載");
    } catch {
      appToast.error("下載分享圖片失敗");
    } finally {
      setIsBusy(false);
    }
  }, [item, showReplayCount]);

  const handleShare = React.useCallback(async () => {
    if (!item) return;
    setIsBusy(true);
    try {
      const blob = await createShareImageBlob(item, { showReplayCount });
      const file = new File(
        [blob],
        `muizo-${sanitizeFilename(item.title)}.png`,
        {
          type: "image/png",
        },
      );
      const shareData: ShareData = {
        title: "Muizo 題庫戰績",
        text: buildShareText(item),
        files: [file],
      };
      const shareNavigator = navigator as ShareNavigator;

      if (
        typeof shareNavigator.share === "function" &&
        (!shareNavigator.canShare || shareNavigator.canShare(shareData))
      ) {
        await shareNavigator.share(shareData);
        return;
      }

      await navigator.clipboard.writeText(buildShareText(item));
      appToast.success("已複製分享文字");
    } catch {
      appToast.error("分享失敗，請稍後再試");
    } finally {
      setIsBusy(false);
    }
  }, [item, showReplayCount]);

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
            <div className="mx-auto w-full max-w-[520px] rounded-[28px] border border-amber-200/16 bg-[radial-gradient(circle_at_12%_0%,rgba(245,158,11,0.24),transparent_32%),radial-gradient(circle_at_95%_100%,rgba(56,189,248,0.16),transparent_35%),linear-gradient(135deg,rgba(28,19,12,0.98),rgba(6,11,22,0.98))] p-5 shadow-[0_24px_60px_-34px_rgba(245,158,11,0.58)]">
              <div className="overflow-hidden rounded-[22px] border border-white/10 bg-slate-950/50">
                <div className="relative aspect-[16/9] bg-slate-900/80">
                  {item.coverThumbnailUrl ? (
                    <img
                      src={item.coverThumbnailUrl}
                      alt=""
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

              <div className="mt-4 rounded-[20px] border border-amber-200/18 bg-amber-200/[0.08] p-4">
                <div className="text-xs font-semibold text-amber-100/76">
                  達成排行榜名次
                </div>
                <div className="mt-2 flex items-end justify-between gap-3">
                  <div className="text-4xl font-bold text-white">
                    {metrics.achievedRank}
                  </div>
                  <div className="pb-1 text-sm font-semibold text-slate-300/82">
                    目前 {metrics.currentRank}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  ["分數", metrics.score],
                  ["答對率", metrics.accuracy],
                  ["Combo", metrics.combo],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-[18px] border border-white/10 bg-white/[0.06] px-3 py-3"
                  >
                    <div className="text-[11px] text-slate-300/72">{label}</div>
                    <div className="mt-1 truncate text-lg font-semibold text-white">
                      {value}
                    </div>
                  </div>
                ))}
              </div>

              {showReplayCount ? (
                <div className="mt-4 rounded-[18px] border border-white/10 bg-slate-950/44 p-4 text-sm font-semibold text-slate-200/82">
                  {metrics.replayCount}
                </div>
              ) : null}

              <div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-300/72">
                <span>遊玩場數 {item.playCount.toLocaleString("zh-TW")}</span>
                <span className="font-semibold text-amber-200">muizo.org</span>
              </div>
            </div>
          ) : (
            <div className="rounded-[16px] border border-white/10 bg-white/[0.035] p-4 text-sm text-[var(--mc-text-muted)]">
              尚未選擇題庫。
            </div>
          )}
        </div>

        <div className="border-t border-white/10 bg-slate-950/96 px-4 py-3 sm:px-5">
          <label className="mb-3 flex cursor-pointer items-center justify-between gap-3 rounded-[14px] border border-white/10 bg-white/[0.035] px-3 py-2 text-sm text-slate-200">
            <span>顯示重玩次數</span>
            <input
              type="checkbox"
              checked={showReplayCount}
              onChange={(event) => setShowReplayCount(event.target.checked)}
              className="h-4 w-4 accent-amber-300"
            />
          </label>

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
