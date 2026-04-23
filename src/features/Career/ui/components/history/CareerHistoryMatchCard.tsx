import {
  AccessTime,
  ChevronRightRounded,
  LibraryMusic,
  MeetingRoom,
  QueueMusic,
  YouTube,
} from "@mui/icons-material";
import React from "react";

import type { RoomSettlementHistorySummary } from "@features/RoomSession";
import {
  getHistorySummaryPlaylistDisplayTitle,
  getHistorySummaryPlaylistItemCount,
  getHistorySummaryPlaylistSourceLabel,
  isCollectionHistorySummary,
  isYouTubeHistorySummary,
} from "@features/Settlement/model/historySummaryAdapter";
import {
  formatCareerHistoryDuration,
  formatCareerHistoryRankFraction,
  formatCareerHistoryScore,
  getCareerHistoryMatchDurationMs,
} from "../../../model/careerHistoryFormatters";

interface CareerHistoryMatchCardProps {
  item: RoomSettlementHistorySummary;
  onOpenReplay: (summary: RoomSettlementHistorySummary) => void;
  getSelfRankForSummary: (
    summary: RoomSettlementHistorySummary,
  ) => number | null;
  animationDelayMs?: number;
}

const CareerHistoryMatchCard: React.FC<CareerHistoryMatchCardProps> = ({
  item,
  onOpenReplay,
  getSelfRankForSummary,
  animationDelayMs,
}) => {
  const selfRank = getSelfRankForSummary(item);
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
  const isCollectionSource = isCollectionHistorySummary(item);
  const isYouTubeSource = isYouTubeHistorySummary(item);

  return (
    <button
      type="button"
      className="group relative block w-full min-w-0 overflow-hidden rounded-[16px] border border-sky-300/22 bg-[linear-gradient(180deg,rgba(12,18,24,0.9),rgba(6,9,13,0.98))] px-4 py-3 text-left transition duration-200 hover:-translate-y-0.5 hover:border-sky-300/34 hover:bg-[linear-gradient(180deg,rgba(14,22,30,0.94),rgba(7,11,16,0.99))]"
      onClick={() => onOpenReplay(item)}
      style={
        animationDelayMs
          ? { transitionDelay: `${Math.min(animationDelayMs, 220)}ms` }
          : undefined
      }
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-sky-300/40 opacity-70 transition group-hover:opacity-100" />

      <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center xl:justify-between xl:gap-4">
        <div className="min-w-0 pr-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <div className="min-w-0 truncate text-base font-semibold tracking-tight text-[var(--mc-text)]">
              {playlistTitle}
            </div>

            <span
              className={`inline-flex shrink-0 items-center gap-1.5 text-[12px] font-semibold ${
                isYouTubeSource
                  ? "text-rose-300"
                  : isCollectionSource
                    ? "text-sky-100"
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

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold text-[var(--mc-text)]">
            <span>第 {item.roundNo} 場</span>
            <span className="text-[var(--mc-text-muted)]/45">•</span>
            <span className={selfRank !== null ? "text-amber-100" : undefined}>
              名次 {formatCareerHistoryRankFraction(selfRank, item.playerCount)}
            </span>
            <span className="text-[var(--mc-text-muted)]/45">•</span>
            <span className="text-emerald-100">
              分數 {formatCareerHistoryScore(finalScore)}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-[var(--mc-text-muted)]">
            <span>
              答對 {correctCount}/{item.questionCount}
            </span>
            <span>Combo x{maxCombo}</span>
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <AccessTime sx={{ fontSize: 16 }} />
              <span>{formatCareerHistoryDuration(matchDurationMs)}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <MeetingRoom sx={{ fontSize: 16 }} />
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
    </button>
  );
};

export default CareerHistoryMatchCard;
