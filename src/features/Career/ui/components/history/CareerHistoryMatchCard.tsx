import {
  AccessTime,
  ChevronRightRounded,
  EmojiEvents,
  Groups2Rounded,
  LibraryMusic,
  QueueMusic,
  YouTube,
} from "@mui/icons-material";
import React from "react";

import type { RoomSettlementHistorySummary } from "@features/RoomSession";
import {
  getHistorySummaryPlaylistCoverThumbnailUrl,
  getHistorySummaryPlaylistDisplayTitle,
  getHistorySummaryPlaylistItemCount,
  getHistorySummaryPlayMode,
  getHistorySummaryPlaylistSourceLabel,
  isCollectionHistorySummary,
  isYouTubeHistorySummary,
} from "@features/Settlement/model/historySummaryAdapter";
import {
  formatCareerHistoryDuration,
  formatCareerHistoryScore,
  getCareerHistoryMatchDurationMs,
} from "../../../model/careerHistoryFormatters";

interface CareerHistoryMatchCardProps {
  item: RoomSettlementHistorySummary;
  onOpenReplay: (summary: RoomSettlementHistorySummary) => void;
  animationDelayMs?: number;
}

const getCareerHistoryAccuracyRate = (
  correctCount: number,
  questionCount: number,
) => {
  if (!Number.isFinite(questionCount) || questionCount <= 0) return null;
  return Math.max(0, Math.min(100, (correctCount / questionCount) * 100));
};

const formatCareerHistoryAccuracy = (
  correctCount: number,
  questionCount: number,
  rate: number | null,
) => {
  if (rate === null) return "-/- (-)";
  return `${correctCount}/${questionCount} (${Math.round(rate)}%)`;
};

const getAccuracyToneClassName = (rate: number | null) => {
  if (rate === null) {
    return "text-stone-100";
  }

  if (rate >= 85) {
    return "text-emerald-100";
  }

  if (rate >= 65) {
    return "text-sky-100";
  }

  if (rate >= 40) {
    return "text-amber-100";
  }

  return "text-rose-100";
};

const formatPositiveDelta = (value: number | null | undefined) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  return `+${Math.floor(value).toLocaleString("zh-TW")}`;
};

const buildRecordBreakthroughDetails = (
  breakthrough: RoomSettlementHistorySummary["selfRecordBreakthrough"],
) => {
  if (!breakthrough?.isPersonalBest) return [];
  if (!breakthrough.hasPreviousBest) return ["首次個人最佳"];

  return [
    formatPositiveDelta(breakthrough.scoreDelta)
      ? `分數 ${formatPositiveDelta(breakthrough.scoreDelta)}`
      : null,
    formatPositiveDelta(breakthrough.correctCountDelta)
      ? `答對 ${formatPositiveDelta(breakthrough.correctCountDelta)}`
      : null,
    formatPositiveDelta(breakthrough.maxComboDelta)
      ? `Combo ${formatPositiveDelta(breakthrough.maxComboDelta)}`
      : null,
  ].filter((detail): detail is string => Boolean(detail));
};

const cardToneClassName = [
  "border-stone-300/18",
  "bg-[linear-gradient(180deg,rgba(18,18,17,0.92),rgba(8,8,7,0.98))]",
  "shadow-[0_10px_24px_-22px_rgba(214,211,209,0.3)]",
  "hover:border-stone-200/32",
  "hover:bg-[linear-gradient(180deg,rgba(23,23,22,0.96),rgba(9,9,8,0.99))]",
  "hover:shadow-[0_0_0_1px_rgba(214,211,209,0.08),0_16px_34px_-24px_rgba(214,211,209,0.38)]",
].join(" ");

const metricChipClassName =
  "inline-flex items-center justify-between gap-2 rounded-[12px] border border-stone-300/14 bg-white/[0.035] px-2.5 py-1.5 text-stone-100";

const metricLabelClassName =
  "mr-1.5 text-[11px] font-medium text-stone-100/58";

const CareerHistoryMatchCard: React.FC<CareerHistoryMatchCardProps> = ({
  item,
  onOpenReplay,
  animationDelayMs,
}) => {
  const matchDurationMs = getCareerHistoryMatchDurationMs(
    item.startedAt,
    item.endedAt,
  );
  const correctCount = item.selfPlayer?.correctCount ?? 0;
  const maxCombo = item.selfPlayer?.maxCombo ?? 0;
  const finalScore = item.selfPlayer?.finalScore ?? 0;
  const sourceLabel = getHistorySummaryPlaylistSourceLabel(item);
  const playlistTitle = getHistorySummaryPlaylistDisplayTitle(item);
  const playlistItemCount = getHistorySummaryPlaylistItemCount(item);
  const coverThumbnailUrl = getHistorySummaryPlaylistCoverThumbnailUrl(item);
  const isCollectionSource = isCollectionHistorySummary(item);
  const isYouTubeSource = isYouTubeHistorySummary(item);
  const playMode = getHistorySummaryPlayMode(item);
  const accuracyRate = getCareerHistoryAccuracyRate(
    correctCount,
    item.questionCount,
  );
  const accuracy = formatCareerHistoryAccuracy(
    correctCount,
    item.questionCount,
    accuracyRate,
  );
  const accuracyValueClassName = getAccuracyToneClassName(accuracyRate);
  const recordBreakthroughDetails = buildRecordBreakthroughDetails(
    item.selfRecordBreakthrough,
  );
  const hasRecordBreakthrough =
    item.selfRecordBreakthrough?.isPersonalBest === true;
  return (
    <button
      type="button"
      className={`group relative block w-full min-w-0 overflow-hidden rounded-[16px] border px-4 py-3 text-left transition duration-200 ${cardToneClassName}`}
      onClick={() => onOpenReplay(item)}
      style={
        animationDelayMs
          ? { transitionDelay: `${Math.min(animationDelayMs, 220)}ms` }
          : undefined
      }
    >
      <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent opacity-70 transition group-hover:opacity-100" />

      <div className="flex min-w-0 gap-3">
        <div className="relative h-[74px] w-[74px] shrink-0 overflow-hidden rounded-[14px] border border-white/10 bg-slate-900/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          {coverThumbnailUrl ? (
            <img
              src={coverThumbnailUrl}
              alt=""
              className="h-full w-full object-cover transition duration-200 group-hover:brightness-110"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,rgba(14,165,233,0.18),rgba(15,23,42,0.92))] text-sky-100/78">
              <LibraryMusic sx={{ fontSize: 26 }} />
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3 xl:flex-row xl:items-center xl:justify-between xl:gap-4">
          <div className="min-w-0 pr-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span
                className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                  playMode === "leaderboard"
                    ? "border-amber-300/34 bg-amber-300/12 text-amber-100"
                    : "border-emerald-300/32 bg-emerald-300/10 text-emerald-100"
                }`}
              >
                {playMode === "leaderboard" ? "排行挑戰" : "休閒對戰"}
              </span>

              <div className="min-w-0 truncate text-base font-semibold tracking-tight text-[var(--mc-text)]">
                {playlistTitle}
              </div>

              <span
                className={`inline-flex shrink-0 items-center gap-1.5 text-[12px] font-semibold ${
                  isYouTubeSource
                    ? "text-rose-200"
                    : isCollectionSource
                      ? "text-emerald-100"
                      : "text-slate-200/88"
                }`}
              >
                {isYouTubeSource ? (
                  <YouTube sx={{ fontSize: 16 }} />
                ) : isCollectionSource ? (
                  <LibraryMusic sx={{ fontSize: 16 }} />
                ) : null}
                <span>{sourceLabel}</span>
              </span>

              {playlistItemCount !== null && playlistItemCount > 0 && (
                <span className="inline-flex shrink-0 items-center gap-1.5 text-[12px] font-medium text-slate-200/82">
                  <QueueMusic sx={{ fontSize: 15 }} />
                  <span>{playlistItemCount} 首</span>
                </span>
              )}
            </div>

            {hasRecordBreakthrough && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/38 bg-amber-300/14 px-2.5 py-1 text-[11px] font-semibold text-amber-100 shadow-[0_0_18px_-14px_rgba(251,191,36,0.95)]">
                  <EmojiEvents sx={{ fontSize: 15 }} />
                  新個人最佳
                </span>

                {recordBreakthroughDetails.map((detail) => (
                  <span
                    key={detail}
                    className="rounded-full border border-amber-100/14 bg-amber-50/[0.055] px-2 py-1 text-[11px] font-medium text-amber-50/86"
                  >
                    {detail}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-2 flex flex-wrap gap-1.5 text-sm font-semibold text-[var(--mc-text)]">
              <span className={`w-[112px] ${metricChipClassName}`}>
                <span className={metricLabelClassName}>
                  分數
                </span>
                <span className="min-w-0 truncate">
                  {formatCareerHistoryScore(finalScore)}
                </span>
              </span>

              <span className={`w-[148px] ${metricChipClassName}`}>
                <span className={metricLabelClassName}>
                  答對率
                </span>
                <span className={`min-w-0 truncate ${accuracyValueClassName}`}>
                  {accuracy}
                </span>
              </span>

              <span className={`w-[112px] ${metricChipClassName}`}>
                <span className={metricLabelClassName}>
                  Combo
                </span>
                <span className="min-w-0 truncate">x{maxCombo}</span>
              </span>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-[var(--mc-text-muted)]">
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <AccessTime sx={{ fontSize: 16 }} />
                <span>{formatCareerHistoryDuration(matchDurationMs)}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <Groups2Rounded sx={{ fontSize: 16 }} />
                <span>{item.playerCount} 人</span>
              </span>
            </div>
          </div>

          <div className="shrink-0 self-start xl:self-center">
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-sky-300/30 bg-sky-300/10 px-2.5 py-1 text-[11px] font-semibold tracking-[0.12em] text-sky-100 transition group-hover:border-sky-300/50 group-hover:bg-sky-300/18">
              查看回顧
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-sky-300/40 bg-sky-300/12">
                <ChevronRightRounded sx={{ fontSize: 15 }} />
              </span>
            </span>
          </div>
        </div>
      </div>
    </button>
  );
};

export default CareerHistoryMatchCard;
