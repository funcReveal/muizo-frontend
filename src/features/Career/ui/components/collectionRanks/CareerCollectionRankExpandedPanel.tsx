import React from "react";
import { List, type RowComponentProps } from "react-window";

import type { CareerCollectionRankRow } from "../../../types/career";
import type { RoomSettlementHistorySummary } from "@features/RoomSession";
import {
  formatCareerHistoryMonthDayTime,
  formatCareerHistoryScore,
} from "../../../model/careerHistoryFormatters";
import { formatCareerRank } from "../../../model/careerUiFormatters";

interface CareerCollectionRankExpandedPanelProps {
  item: CareerCollectionRankRow;
  onOpenMatch: (summary: RoomSettlementHistorySummary) => void;
}

type RecentMatchRowProps = {
  items: RoomSettlementHistorySummary[];
  renderMatchRow: (match: RoomSettlementHistorySummary) => React.ReactNode;
};

const RECENT_MATCH_ROW_HEIGHT = 68;

const RecentMatchRow = ({
  index,
  style,
  items,
  renderMatchRow,
}: RowComponentProps<RecentMatchRowProps>) => {
  const match = items[index];
  if (!match) return <div style={style} />;

  return (
    <div style={style} className="box-border">
      {renderMatchRow(match)}
    </div>
  );
};

const formatAccuracyLabel = (
  correctCount: number | null | undefined,
  questionCount: number | null | undefined,
) => {
  if (
    typeof correctCount !== "number" ||
    !Number.isFinite(correctCount) ||
    typeof questionCount !== "number" ||
    !Number.isFinite(questionCount) ||
    questionCount <= 0
  ) {
    return "-";
  }

  return `${correctCount}/${questionCount} (${Math.round(
    (correctCount / questionCount) * 100,
  )}%)`;
};

const CareerCollectionRankExpandedPanel: React.FC<
  CareerCollectionRankExpandedPanelProps
> = ({ item, onOpenMatch }) => {
  const summary = item.matchSummary ?? null;
  const recentSummaries =
    item.matchSummaries && item.matchSummaries.length > 0
      ? item.matchSummaries
      : summary
        ? [summary]
        : [];
  const renderMatchRow = (
    match: RoomSettlementHistorySummary,
    options?: { isBest?: boolean },
  ) => {
    const selfPlayer = match.selfPlayer ?? null;
    const accuracyLabel = formatAccuracyLabel(
      selfPlayer?.correctCount,
      match.questionCount,
    );
    const comboLabel =
      typeof selfPlayer?.maxCombo === "number" ? `x${selfPlayer.maxCombo}` : "-";
    const achievementPlayLabel =
      typeof item.bestPlayNumber === "number" &&
      Number.isFinite(item.bestPlayNumber)
        ? `第 ${item.bestPlayNumber.toLocaleString("zh-TW")} 次`
        : "-";
    const rankPairLabel = `當下 ${formatCareerRank(
      item.bestRankAtPlay ?? null,
    )} / 目前 ${formatCareerRank(item.leaderboardRank)}`;
    const metricItems = options?.isBest
      ? [
          {
            label: "達成次數",
            value: achievementPlayLabel,
          },
          {
            label: "排名",
            value: rankPairLabel,
          },
          {
            label: "分數",
            value: formatCareerHistoryScore(selfPlayer?.finalScore),
          },
          {
            label: "答對率",
            value: accuracyLabel,
          },
          {
            label: "Combo",
            value: comboLabel,
          },
        ]
      : [
          {
            label: "分數",
            value: formatCareerHistoryScore(selfPlayer?.finalScore),
          },
          {
            label: "答對率",
            value: accuracyLabel,
          },
          {
            label: "Combo",
            value: comboLabel,
          },
        ];

    return (
      <button
        key={`${options?.isBest ? "best" : "recent"}-${match.matchId}`}
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onOpenMatch(match);
        }}
        className={[
          "grid w-full cursor-pointer grid-cols-1 gap-1.5 px-2.5 py-2 text-left outline outline-1 -outline-offset-1 outline-white/[0.045] transition hover:bg-slate-800/44 hover:outline-amber-200/18",
          options?.isBest
            ? "rounded-[12px] bg-[linear-gradient(180deg,rgba(30,41,59,0.42),rgba(15,23,42,0.26))] sm:grid-cols-[minmax(0,1.25fr)_88px_132px_92px_122px_78px]"
            : "bg-slate-950/18 border-b border-white/8 last:border-b-0 sm:grid-cols-[minmax(0,1.35fr)_92px_112px_72px]",
        ].join(" ")}
      >
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-[var(--mc-text)]">
            {match.roomName || item.title}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs text-[var(--mc-text-muted)]">
            <span>{formatCareerHistoryMonthDayTime(match.endedAt)}</span>
          </div>
        </div>

        {metricItems.map((metric) => (
          <div
            key={metric.label}
            className="flex min-w-0 items-center justify-between gap-3 sm:block"
          >
            <div className="text-[11px] text-[var(--mc-text-muted)]">
              {metric.label}
            </div>
            <div
              className={[
                "truncate text-sm font-semibold text-[var(--mc-text)] sm:mt-0.5",
                metric.label === "排名" ? "text-[13px]" : "",
              ].join(" ")}
              title={metric.value}
            >
              {metric.value}
            </div>
          </div>
        ))}
      </button>
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <section className="shrink-0 rounded-[16px] bg-slate-900/20 p-2">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs font-semibold text-amber-100/76">
            最佳紀錄
          </div>
        </div>
        {summary ? (
          <div className="mt-2">{renderMatchRow(summary, { isBest: true })}</div>
        ) : (
          <div className="mt-2 rounded-[12px] bg-amber-200/[0.045] px-3 py-2 text-xs text-amber-50/76">
            目前只有題庫榜單統計，尚未取得最佳紀錄的完整回顧資料。
          </div>
        )}
      </section>

      <section className="flex min-h-0 flex-1 flex-col rounded-[16px] bg-slate-900/20 p-2">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs font-semibold text-amber-100/76">
            近期遊玩
          </div>
          <div className="text-xs text-[var(--mc-text-muted)]">
            {item.playCount.toLocaleString("zh-TW")} 場
          </div>
        </div>

        {recentSummaries.length > 0 ? (
          <div className="mt-2 h-[320px] min-h-0 overflow-hidden lg:h-auto lg:flex-1">
            <List<RecentMatchRowProps>
              style={{
                height: "100%",
                width: "100%",
              }}
              rowCount={recentSummaries.length}
              rowHeight={RECENT_MATCH_ROW_HEIGHT}
              rowProps={{
                items: recentSummaries,
                renderMatchRow,
              }}
              rowComponent={RecentMatchRow}
            />
          </div>
        ) : (
          <div className="mt-2 rounded-[12px] bg-amber-200/[0.045] px-3 py-2 text-xs text-amber-50/76">
            目前只有題庫榜單統計，尚未取得近期遊玩的完整回顧資料。
          </div>
        )}
      </section>
    </div>
  );
};

export default CareerCollectionRankExpandedPanel;
