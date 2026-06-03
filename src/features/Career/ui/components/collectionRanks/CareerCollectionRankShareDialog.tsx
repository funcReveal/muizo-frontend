import React from "react";
import CloseRounded from "@mui/icons-material/CloseRounded";
import DownloadRounded from "@mui/icons-material/DownloadRounded";
import ShareRounded from "@mui/icons-material/ShareRounded";
import { Dialog, IconButton, Slide } from "@mui/material";
import type { TransitionProps } from "@mui/material/transitions";

import { appToast } from "@shared/ui/toastApi";
import type { CareerCollectionRankRow } from "../../../types/career";
import {
  formatCareerDelta,
  formatCareerRank,
  formatCareerScore,
} from "../../../model/careerUiFormatters";
import { formatCareerHistoryRankFraction } from "../../../model/careerHistoryFormatters";

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
    rank: formatCareerRank(item.leaderboardRank),
    previousRank: formatCareerRank(item.previousLeaderboardRank),
    delta: formatCareerDelta(item.delta),
    bestScore: formatCareerScore(item.bestScore),
    recentScore:
      typeof selfPlayer?.finalScore === "number"
        ? formatCareerScore(selfPlayer.finalScore)
        : formatCareerScore(item.bestScore),
    accuracy,
    combo:
      typeof selfPlayer?.maxCombo === "number" ? `x${selfPlayer.maxCombo}` : "-",
    players: formatCareerHistoryRankFraction(
      summary?.selfRank ?? item.recentRank ?? null,
      summary?.playerCount ?? item.recentPlayerCount ?? null,
    ),
  };
};

const buildShareText = (item: CareerCollectionRankRow) => {
  const metrics = getCollectionShareMetrics(item);
  return `Muizo 題庫戰績｜${item.title}\n榜單名次 ${metrics.rank}，最佳分數 ${metrics.bestScore}，最近一場 ${metrics.recentScore}`;
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
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
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

const createShareImageBlob = async (item: CareerCollectionRankRow) => {
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
  context.fillText(metrics.rank, 840, 167);
  context.textAlign = "left";

  context.fillStyle = "#f8fafc";
  context.font = "700 58px sans-serif";
  drawText(context, item.title, 120, 330, 820, 72, 2);

  context.fillStyle = "rgba(226,232,240,0.78)";
  context.font = "500 28px sans-serif";
  context.fillText(item.sourceLabel ?? "題庫戰績", 120, 484);

  const metricCards = [
    ["最佳分數", metrics.bestScore],
    ["最近分數", metrics.recentScore],
    ["答對率", metrics.accuracy],
    ["Combo", metrics.combo],
  ];

  metricCards.forEach(([label, value], index) => {
    const x = 120 + (index % 2) * 390;
    const y = 560 + Math.floor(index / 2) * 190;
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

  roundedRect(context, 120, 960, 840, 132, 32);
  context.fillStyle = "rgba(15,23,42,0.72)";
  context.fill();
  context.fillStyle = "rgba(226,232,240,0.72)";
  context.font = "600 25px sans-serif";
  context.fillText(`前期名次 ${metrics.previousRank}`, 160, 1016);
  context.fillText(`變動 ${metrics.delta}`, 160, 1064);
  context.fillText(`最近名次 ${metrics.players}`, 550, 1016);
  context.fillText(`場次 ${item.playCount.toLocaleString("zh-TW")}`, 550, 1064);

  context.fillStyle = "rgba(226,232,240,0.64)";
  context.font = "500 24px sans-serif";
  context.fillText(`最近遊玩 ${item.lastPlayedAt ?? "-"}`, 120, 1178);
  context.fillStyle = "#fcd34d";
  context.font = "700 26px sans-serif";
  context.fillText("muizo.app", 120, 1226);

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
  const metrics = item ? getCollectionShareMetrics(item) : null;

  const handleDownload = React.useCallback(async () => {
    if (!item) return;
    setIsBusy(true);
    try {
      const blob = await createShareImageBlob(item);
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
  }, [item]);

  const handleShare = React.useCallback(async () => {
    if (!item) return;
    setIsBusy(true);
    try {
      const blob = await createShareImageBlob(item);
      const file = new File([blob], `muizo-${sanitizeFilename(item.title)}.png`, {
        type: "image/png",
      });
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
  }, [item]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      TransitionComponent={ShareDialogTransition}
      maxWidth={false}
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
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-3xl font-bold tracking-tight text-white">
                    Muizo
                  </div>
                  <div className="mt-1 text-xs font-semibold tracking-[0.14em] text-amber-200/82">
                    COLLECTION RANK SNAPSHOT
                  </div>
                </div>

                <div className="rounded-full border border-amber-200/28 bg-amber-200/12 px-3 py-1 text-sm font-semibold text-amber-50">
                  {metrics.rank}
                </div>
              </div>

              <div className="mt-6">
                <div className="line-clamp-2 text-2xl font-semibold leading-tight text-slate-50">
                  {item.title}
                </div>
                <div className="mt-2 text-sm text-slate-300/78">
                  {item.sourceLabel ?? "題庫戰績"}
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                {[
                  ["最佳分數", metrics.bestScore],
                  ["最近分數", metrics.recentScore],
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

              <div className="mt-4 rounded-[18px] border border-white/10 bg-slate-950/44 p-4 text-sm text-slate-200/82">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <span>前期名次 {metrics.previousRank}</span>
                  <span>變動 {metrics.delta}</span>
                  <span>最近名次 {metrics.players}</span>
                  <span>場次 {item.playCount.toLocaleString("zh-TW")}</span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-300/72">
                <span>最近遊玩 {item.lastPlayedAt ?? "-"}</span>
                <span className="font-semibold text-amber-200">muizo.app</span>
              </div>
            </div>
          ) : (
            <div className="rounded-[16px] border border-white/10 bg-white/[0.035] p-4 text-sm text-[var(--mc-text-muted)]">
              尚未選擇題庫。
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-white/10 bg-slate-950/96 px-4 py-3 sm:px-5">
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
    </Dialog>
  );
};

export default CareerCollectionRankShareDialog;
