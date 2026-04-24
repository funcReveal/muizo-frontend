import React, { memo, useCallback, useMemo, useRef, useState, useEffect } from "react";
import useMediaQuery from "@mui/material/useMediaQuery";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import BarChartRoundedIcon from "@mui/icons-material/BarChartRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import RemoveRoundedIcon from "@mui/icons-material/RemoveRounded";
import StarBorderRoundedIcon from "@mui/icons-material/StarBorderRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import TrackChangesRoundedIcon from "@mui/icons-material/TrackChangesRounded";
import TrendingDownRoundedIcon from "@mui/icons-material/TrendingDownRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import WorkspacePremiumRoundedIcon from "@mui/icons-material/WorkspacePremiumRounded";
import { List, type RowComponentProps } from "react-window";

import type {
  LeaderboardSettlementResponse,
  PlaylistItem,
  QuestionScoreBreakdown,
  RoomParticipant,
  RoomState,
} from "@features/RoomSession";
import type { SettlementQuestionRecap, SettlementQuestionResult } from "../../model/types";
import { useSettingsModel } from "../../../Setting/model/settingsContext";
import PlayerAvatar from "@shared/ui/playerAvatar/PlayerAvatar";

const LEADERBOARD_SETTLEMENT_BGM_PATH = "/Muizo_result_bgm.mp3";

type LeaderboardSettlementShowcaseProps = {
  room: RoomState["room"];
  participants: RoomParticipant[];
  playlistItems?: PlaylistItem[];
  playedQuestionCount: number;
  meClientId?: string;
  matchId?: string | null;
  questionRecaps?: SettlementQuestionRecap[];
  rankChangeByClientId?: Record<string, number | null>;
  leaderboardSettlement?: LeaderboardSettlementResponse | null;
  leaderboardSettlementLoading?: boolean;
  leaderboardSettlementError?: string | null;
  onRefreshLeaderboardSettlement?: () => void | Promise<void>;
  isFavorited?: boolean;
  onToggleFavorite?: () => void | Promise<void>;
  onRetry?: () => void;
  onBackToLobby?: () => void;
};

type LeaderboardMetricRow = {
  clientId: string;
  rank: number;
  username: string;
  avatarUrl: string | null;
  score: number;
  correctCount: number;
  combo: number;
  avgCorrectMs: number | null;
  durationSec: number | null;
  isMe: boolean;
  rankChange: number | null;
  isSkeleton?: boolean;
};

type LeaderboardQuestionRow = {
  key: string;
  title: string;
  artist: string;
  thumbnail: string | null;
  youtubeUrl: string | null;
  result: SettlementQuestionResult;
  badgeLabel: string;
  badgeTone: "success" | "warning" | "danger" | "neutral";
  answerTimeLabel: string;
  scoreGain: number | null;
};

type PersonalSummary = {
  me: RoomParticipant | null;
  myRank: number;
  rankPercentile: number;
  scoreGapToPrev: number | null;
  myRankChange: number | null;
  accuracy: number;
  combo: number;
  avgCorrectMs: number | null;
};

type QuestionListRowProps = {
  items: LeaderboardQuestionRow[];
  isDesktopLayout: boolean;
};

type LeaderboardListRowProps = {
  rows: LeaderboardMetricRow[];
  playedQuestionCount: number;
};

type QuestionFilterType = "correct" | "wrong" | "unanswered" | null;
type MobileSettlementPanel = "leaderboard" | "review";

const scoreFormatter = new Intl.NumberFormat("zh-TW");

const sortParticipants = (participants: RoomParticipant[]) =>
  [...participants].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const comboA = Math.max(a.maxCombo ?? 0, a.combo ?? 0);
    const comboB = Math.max(b.maxCombo ?? 0, b.combo ?? 0);
    if (comboB !== comboA) return comboB - comboA;
    const avgA =
      typeof a.avgCorrectMs === "number" && Number.isFinite(a.avgCorrectMs)
        ? a.avgCorrectMs
        : Number.POSITIVE_INFINITY;
    const avgB =
      typeof b.avgCorrectMs === "number" && Number.isFinite(b.avgCorrectMs)
        ? b.avgCorrectMs
        : Number.POSITIVE_INFINITY;
    if (avgA !== avgB) return avgA - avgB;
    return a.joinedAt - b.joinedAt;
  });

const formatScore = (value: number) => scoreFormatter.format(Math.max(0, value));
const formatPercent = (value: number) => `${value.toFixed(1)}%`;

const formatSeconds = (value: number | null | undefined) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return "--";
  }
  return `${(value / 1000).toFixed(2)} 秒`;
};
const formatDurationSec = (value: number | null | undefined) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return "--";
  }

  const totalSec = Math.floor(value);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};


const formatAnswerTime = (value: number | null | undefined) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return "--";
  }
  return `${(value / 1000).toFixed(2)}s`;
};

const formatVariantLabel = (
  room: RoomState["room"],
  playedQuestionCount: number,
) => {
  const variantKey = room.gameSettings?.leaderboardVariantKey;
  const timeLimitSec = room.gameSettings?.leaderboardTimeLimitSec ?? 0;
  const questionCount =
    room.gameSettings?.leaderboardTargetQuestionCount ??
    room.gameSettings?.questionCount ??
    playedQuestionCount;

  if (variantKey === "15m" || timeLimitSec > 0) {
    const minute = Math.max(1, Math.round(timeLimitSec / 60) || 15);
    return `${minute} 分鐘`;
  }

  return `${Math.max(1, questionCount || 30)} 題`;
};

const buildYouTubeUrl = ({
  url,
  videoId,
  sourceId,
  provider,
}: {
  url?: string | null;
  videoId?: string | null;
  sourceId?: string | null;
  provider?: string | null;
}) => {
  if (typeof url === "string" && url.trim()) {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase();
      if (host.includes("youtube.com") || host.includes("youtu.be")) {
        return parsed.toString();
      }
    } catch {
      return null;
    }
  }

  if (typeof videoId === "string" && videoId.trim()) {
    return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId.trim())}`;
  }

  if (
    typeof sourceId === "string" &&
    sourceId.trim() &&
    typeof provider === "string" &&
    provider.toLowerCase().includes("youtube")
  ) {
    return `https://www.youtube.com/watch?v=${encodeURIComponent(sourceId.trim())}`;
  }

  return null;
};

const getGapToFirstLabel = (gap: number | null | undefined) => {
  if (typeof gap !== "number" || !Number.isFinite(gap)) {
    return "與榜首差距暫時無法取得";
  }
  return `距離第 1 名差 ${formatScore(gap)} 分`;
};

const isRowAheadOfCurrent = (
  row: Pick<LeaderboardMetricRow, "score" | "combo" | "correctCount" | "avgCorrectMs">,
  current: Pick<LeaderboardMetricRow, "score" | "combo" | "correctCount" | "avgCorrectMs">,
) => {
  if (row.score !== current.score) return row.score > current.score;
  if (row.combo !== current.combo) return row.combo > current.combo;
  if (row.correctCount !== current.correctCount) return row.correctCount > current.correctCount;
  const rowAvg = typeof row.avgCorrectMs === "number" ? row.avgCorrectMs : Number.POSITIVE_INFINITY;
  const currentAvg =
    typeof current.avgCorrectMs === "number" ? current.avgCorrectMs : Number.POSITIVE_INFINITY;
  return rowAvg < currentAvg;
};
const getScoreGain = (breakdown: QuestionScoreBreakdown | null | undefined) => {
  if (!breakdown) return null;
  return typeof breakdown.totalGainPoints === "number" &&
    Number.isFinite(breakdown.totalGainPoints)
    ? breakdown.totalGainPoints
    : null;
};

const getPercentileLabel = (
  values: number[],
  current: number | null,
  direction: "higher" | "lower",
) => {
  if (current === null || values.length <= 1) return null;
  const compareCount = values.filter((value) =>
    direction === "higher" ? current > value : current < value,
  ).length;
  return Math.round((compareCount / Math.max(1, values.length - 1)) * 100);
};

const LEADERBOARD_DESKTOP_GRID_CLASS =
  "grid-cols-[44px_minmax(0,1.2fr)_92px_88px_104px_84px_108px]";

const useElementWidth = () => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const target = ref.current;
    if (!target || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const nextWidth = Math.round(entries[0]?.contentRect.width ?? 0);
      setWidth((prev) => (prev === nextWidth ? prev : nextWidth));
    });
    observer.observe(target);
    setWidth(Math.round(target.getBoundingClientRect().width));
    return () => observer.disconnect();
  }, []);

  return { ref, width };
};

const OverflowLinkText = memo(function OverflowLinkText({
  text,
  url,
  className,
}: {
  text: string;
  url: string | null;
  className?: string;
}) {
  const viewportRef = useRef<HTMLSpanElement | null>(null);
  const contentRef = useRef<HTMLSpanElement | null>(null);
  const [translateX, setTranslateX] = useState(0);

  const reset = useCallback(() => setTranslateX(0), []);

  const handleMouseEnter = useCallback(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return;
    const overflow = Math.max(0, content.scrollWidth - viewport.clientWidth);
    setTranslateX(overflow);
  }, []);

  const inner = (
    <span
      ref={viewportRef}
      className={`block overflow-hidden whitespace-nowrap ${className ?? ""}`}
      title={text}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={reset}
    >
      <span
        ref={contentRef}
        className="inline-block min-w-full transition-transform duration-500 ease-out"
        style={{ transform: translateX > 0 ? `translateX(-${translateX}px)` : undefined }}
      >
        {text}
      </span>
    </span>
  );

  if (!url) return inner;

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="block hover:text-amber-100"
    >
      {inner}
    </a>
  );
});

const badgeToneClass: Record<LeaderboardQuestionRow["badgeTone"], string> = {
  success:
    "border-emerald-300/35 bg-emerald-500/14 text-emerald-100 shadow-[inset_0_0_0_1px_rgba(110,231,183,0.04)]",
  warning:
    "border-amber-300/35 bg-amber-500/14 text-amber-100 shadow-[inset_0_0_0_1px_rgba(252,211,77,0.04)]",
  danger:
    "border-rose-300/35 bg-rose-500/14 text-rose-100 shadow-[inset_0_0_0_1px_rgba(253,164,175,0.04)]",
  neutral:
    "border-slate-500/45 bg-slate-700/40 text-slate-100",
};

const SummaryMetric = memo(function SummaryMetric({
  icon,
  label,
  value,
  note,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="flex items-center justify-center px-2 py-2 text-center xl:text-left">
      <div className="flex w-full max-w-[220px] flex-col items-center justify-center gap-2 text-center xl:flex-row xl:items-start xl:text-left">
        <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center text-amber-100">
          {icon}
        </div>

        <div className="min-w-0">
          <div className="text-[10px] tracking-[0.16em] text-[var(--mc-text-muted)]">
            {label}
          </div>
          <div className="mt-0.5 text-[1.4rem] font-black leading-none text-amber-50">
            {value}
          </div>
          <div className="mt-1 text-xs leading-5 text-[var(--mc-text-muted)]">
            {note}
          </div>
        </div>
      </div>
    </div>
  );
});
const MobileSettlementPanelSwitch = memo(function MobileSettlementPanelSwitch({
  value,
  onChange,
}: {
  value: MobileSettlementPanel;
  onChange: (next: MobileSettlementPanel) => void;
}) {
  return (
    <div className="mt-4 rounded-full border border-white/10 bg-white/[0.035] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="grid grid-cols-2 gap-1">
        <button
          type="button"
          onClick={() => onChange("leaderboard")}
          className={`rounded-full px-3 py-2 text-sm font-black tracking-[0.08em] transition ${value === "leaderboard"
            ? "bg-amber-400/18 text-amber-50 shadow-[0_0_18px_rgba(251,191,36,0.18)]"
            : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-100"
            }`}
        >
          排行榜
        </button>

        <button
          type="button"
          onClick={() => onChange("review")}
          className={`rounded-full px-3 py-2 text-sm font-black tracking-[0.08em] transition ${value === "review"
            ? "bg-amber-400/18 text-amber-50 shadow-[0_0_18px_rgba(251,191,36,0.18)]"
            : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-100"
            }`}
        >
          題目回顧
        </button>
      </div>
    </div>
  );
});
const RankChangeBadge = memo(function RankChangeBadge({
  value,
}: {
  value: number | null | undefined;
}) {
  if (value === null || value === undefined) {
    return (
      <span className="inline-flex min-w-[72px] items-center justify-center rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-0.5 text-xs text-[var(--mc-text-muted)]">
        --
      </span>
    );
  }

  if (value > 0) {
    return (
      <span className="inline-flex min-w-[72px] items-center justify-center gap-1 rounded-full border border-emerald-400/22 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
        <TrendingUpRoundedIcon sx={{ fontSize: 14 }} />
        {value}
      </span>
    );
  }

  if (value < 0) {
    return (
      <span className="inline-flex min-w-[72px] items-center justify-center gap-1 rounded-full border border-rose-400/22 bg-rose-500/10 px-2.5 py-0.5 text-xs font-semibold text-rose-400">
        <TrendingDownRoundedIcon sx={{ fontSize: 14 }} />
        {Math.abs(value)}
      </span>
    );
  }

  return (
    <span className="inline-flex min-w-[72px] items-center justify-center rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-0.5 text-xs text-[var(--mc-text-muted)]">
      --
    </span>
  );
});
void RankChangeBadge;

function QuestionListRow({
  index,
  style,
  items,
  isDesktopLayout,
}: RowComponentProps<QuestionListRowProps>) {
  const item = items[index];
  if (!item) {
    return <div style={style} />;
  }

  return (
    <div style={style} className="box-border px-0 pb-2">
      <div className="grid h-[76px] grid-cols-[60px_minmax(0,1fr)_96px] items-center gap-2 rounded-[16px] border border-white/6 bg-white/[0.02] px-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
        <div className="h-[52px] w-[52px] overflow-hidden rounded-lg border border-white/8 bg-[linear-gradient(145deg,rgba(59,130,246,0.2),rgba(147,51,234,0.14))]">
          {item.thumbnail ? (
            <img
              src={item.thumbnail}
              alt={item.title}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-amber-100/80">
              <BarChartRoundedIcon sx={{ fontSize: 20 }} />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <OverflowLinkText
            text={item.title}
            url={isDesktopLayout ? item.youtubeUrl : null}
            className="text-base font-semibold text-[var(--mc-text)]"
          />
          <div className="mt-0.5 flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <OverflowLinkText
                text={item.artist}
                url={isDesktopLayout ? item.youtubeUrl : null}
                className="text-sm text-[var(--mc-text-muted)]"
              />
            </div>
            {!isDesktopLayout && item.youtubeUrl && (
              <a
                href={item.youtubeUrl}
                target="_blank"
                rel="noreferrer"
                aria-label={`前往 YouTube：${item.title}`}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-[var(--mc-text-muted)] transition hover:border-amber-300/35 hover:text-amber-100"
              >
                <OpenInNewRoundedIcon sx={{ fontSize: 16 }} />
              </a>
            )}
          </div>
        </div>
        <div className="text-right">
          <span
            className={`inline-flex min-w-[68px] items-center justify-center rounded-lg border px-2 py-1 text-xs font-bold tracking-[0.06em] ${badgeToneClass[item.badgeTone]}`}
          >
            {item.badgeLabel}
          </span>
          <div className="mt-1 text-xs font-semibold text-[var(--mc-text-muted)]">
            {item.answerTimeLabel}
          </div>
        </div>
      </div>
    </div>
  );
}

function LeaderboardDesktopRow({
  index,
  style,
  rows,
  playedQuestionCount,
}: RowComponentProps<LeaderboardListRowProps>) {
  const row = rows[index];
  if (!row) {
    return <div style={style} />;
  }

  if (row.isSkeleton) {
    return (
      <div style={style} className="box-border pb-1.5">
        <div className={`animate-pulse grid ${LEADERBOARD_DESKTOP_GRID_CLASS} items-center gap-2 rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2`}>
          <div className="h-3.5 w-6 rounded bg-white/10" />
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 shrink-0 rounded-full bg-white/10" />
            <div className="h-3 flex-1 rounded bg-white/10" />
          </div>
          <div className="mx-auto h-3 w-14 rounded bg-white/10" />
          <div className="mx-auto h-3 w-10 rounded bg-white/10" />
          <div className="mx-auto h-3 w-12 rounded bg-white/10" />
          <div className="mx-auto h-3 w-12 rounded bg-white/10" />
          <div className="mx-auto h-3.5 w-14 rounded bg-white/10" />
        </div>
      </div>
    );
  }

  const wrongCount = Math.max(playedQuestionCount - row.correctCount, 0);

  return (
    <div style={style} className="box-border pb-1.5">
      <div
        className={`grid ${LEADERBOARD_DESKTOP_GRID_CLASS} items-center gap-2 rounded-xl border px-3 py-2 text-sm ${row.isMe
          ? "border-amber-300/45 bg-amber-500/10 shadow-[inset_0_0_0_1px_rgba(252,211,77,0.08)]"
          : "border-white/6 bg-white/[0.02]"
          }`}
      >
        <div className="text-base font-black text-amber-100">{row.rank}</div>
        <div className="flex min-w-0 items-center gap-2">
          <PlayerAvatar
            username={row.username}
            clientId={row.clientId}
            avatarUrl={row.avatarUrl}
            size={32}
            rank={row.rank}
            combo={row.combo}
            isMe={row.isMe}
            hideRankMark
            loading="lazy"
          />
          <div className="truncate text-sm font-semibold text-[var(--mc-text)]">
            {row.username}
            {row.isMe ? "（你）" : ""}
          </div>
        </div>
        <div className="text-center text-xs text-[var(--mc-text-muted)]">
          {row.correctCount} / {wrongCount}
        </div>
        <div className="text-center text-xs font-semibold text-violet-300">
          x{row.combo}
        </div>
        <div className="text-center text-xs text-[var(--mc-text-muted)]">
          {formatSeconds(row.avgCorrectMs)}
        </div>
        <div className="text-center text-xs font-semibold text-slate-300">
          {formatDurationSec(row.durationSec)}
        </div>
        <div className="text-center text-base font-black text-amber-100">
          {formatScore(row.score)}
        </div>
        {/* 保留名次變化欄位結構，若之後要恢復可直接取消註解。
        <div className="flex min-w-0 items-center justify-center">
          <RankChangeBadge value={row.rankChange} />
        </div>
        */}
      </div>
    </div>
  );
}

function LeaderboardMobileRow({
  index,
  style,
  rows,
  playedQuestionCount,
}: RowComponentProps<LeaderboardListRowProps>) {
  const row = rows[index];
  if (!row) {
    return <div style={style} />;
  }

  if (row.isSkeleton) {
    return (
      <div style={style} className="box-border pb-2">
        <div className="animate-pulse rounded-[18px] border border-white/6 bg-white/[0.02] px-3 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <div className="h-4 w-7 shrink-0 rounded bg-white/10" />
              <div className="h-7 w-7 shrink-0 rounded-full bg-white/10" />
              <div className="min-w-0">
                <div className="h-3 w-24 rounded bg-white/10" />
                <div className="mt-1 h-2.5 w-16 rounded bg-white/10" />
              </div>
            </div>
            <div className="h-4 w-14 shrink-0 rounded bg-white/10" />
          </div>
          <div className="mt-2 h-2.5 w-20 rounded bg-white/10" />
        </div>
      </div>
    );
  }

  const wrongCount = Math.max(playedQuestionCount - row.correctCount, 0);

  return (
    <div style={style} className="box-border pb-2">
      <div
        className={`rounded-[18px] border px-3 py-3 ${row.isMe
          ? "border-amber-300/45 bg-amber-500/10 shadow-[inset_0_0_0_1px_rgba(252,211,77,0.08)]"
          : "border-white/6 bg-white/[0.02]"
          }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <div className="text-base font-black text-amber-100">#{row.rank}</div>
            <PlayerAvatar
              username={row.username}
              clientId={row.clientId}
              avatarUrl={row.avatarUrl}
              size={30}
              rank={row.rank}
              combo={row.combo}
              isMe={row.isMe}
              hideRankMark
              loading="lazy"
            />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-[var(--mc-text)]">
                {row.username}
                {row.isMe ? "（你）" : ""}
              </div>
              <div className="mt-0.5 text-xs text-[var(--mc-text-muted)]">
                答對 / 答錯 {row.correctCount} / {wrongCount}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-base font-black text-amber-100">
              {formatScore(row.score)}
            </div>
            <div className="mt-0.5 text-xs text-violet-300">
              Combo x{row.combo}
            </div>
          </div>
        </div>
        <div className="mt-2 text-xs text-[var(--mc-text-muted)]">
          平均答題 {formatSeconds(row.avgCorrectMs)} · 耗時 {formatDurationSec(row.durationSec)}
        </div>
      </div>
    </div>
  );
}

const LeaderboardSettlementShowcase: React.FC<
  LeaderboardSettlementShowcaseProps
> = ({
  room,
  participants,
  playlistItems = [],
  playedQuestionCount,
  meClientId,
  questionRecaps = [],
  rankChangeByClientId,
  leaderboardSettlement = null,
  leaderboardSettlementLoading = false,
  leaderboardSettlementError = null,
  onRefreshLeaderboardSettlement,
  isFavorited,
  onToggleFavorite,
  onRetry,
  onBackToLobby,
}) => {
    const isCurrentClientHost = Boolean(
      meClientId && room.hostClientId === meClientId,
    );

    const canRetryChallenge =
      isCurrentClientHost && typeof onRetry === "function";

    const isDesktopLayout = useMediaQuery("(min-width: 1280px)");
    const listRowHeight = 84;
    const { ref: questionListRef, width: questionListWidth } = useElementWidth();
    const [questionFilter, setQuestionFilter] = useState<QuestionFilterType>(null);
    const [mobileSettlementPanel, setMobileSettlementPanel] =
      useState<MobileSettlementPanel>("leaderboard");

    const { bgmVolume } = useSettingsModel();
    const settlementBgmRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
      if (typeof window === "undefined" || typeof Audio === "undefined") return;
      const audio = new Audio(LEADERBOARD_SETTLEMENT_BGM_PATH);
      audio.loop = true;
      audio.preload = "auto";
      audio.volume = 0;
      settlementBgmRef.current = audio;
      return () => {
        audio.pause();
        audio.currentTime = 0;
        audio.src = "";
        settlementBgmRef.current = null;
      };
    }, []);

    useEffect(() => {
      const audio = settlementBgmRef.current;
      if (!audio) return;
      audio.volume = Math.max(0, Math.min(1, bgmVolume / 100));
    }, [bgmVolume]);

    useEffect(() => {
      if (typeof window === "undefined" || typeof document === "undefined") return;
      const audio = settlementBgmRef.current;
      if (!audio) return;

      const tryPlay = () => {
        if (document.hidden) return;
        void audio.play().catch(() => undefined);
      };
      const stopBgm = () => audio.pause();

      const handleVisibilityChange = () => {
        if (document.hidden) {
          stopBgm();
        } else {
          tryPlay();
        }
      };
      const handleBlur = () => stopBgm();
      const handleFocus = () => tryPlay();

      tryPlay();
      window.addEventListener("pointerdown", tryPlay, { passive: true });
      window.addEventListener("keydown", tryPlay);
      window.addEventListener("focus", handleFocus);
      window.addEventListener("blur", handleBlur);
      document.addEventListener("visibilitychange", handleVisibilityChange);

      return () => {
        window.removeEventListener("pointerdown", tryPlay);
        window.removeEventListener("keydown", tryPlay);
        window.removeEventListener("focus", handleFocus);
        window.removeEventListener("blur", handleBlur);
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        audio.pause();
        audio.currentTime = 0;
      };
    }, []);

    const challengeVariantLabel = useMemo(
      () => formatVariantLabel(room, playedQuestionCount),
      [playedQuestionCount, room],
    );

    const sortedParticipants = useMemo(
      () => sortParticipants(participants),
      [participants],
    );
    const backendCurrentRun = leaderboardSettlement?.currentRun ?? null;
    const personalBestComparison =
      leaderboardSettlement?.personalBestComparison ?? null;
    const backendTopEntries = leaderboardSettlement?.leaderboardTop;
    const backendAroundMeEntries = leaderboardSettlement?.leaderboardAroundMe;
    const localMyIndex = sortedParticipants.findIndex(
      (participant) => participant.clientId === meClientId,
    );
    const localMe =
      localMyIndex >= 0 ? sortedParticipants[localMyIndex] : sortedParticipants[0] ?? null;

    const meSummary = useMemo<PersonalSummary>(() => {
      if (!localMe && !backendCurrentRun) {
        return {
          me: null,
          myRank: 0,
          rankPercentile: 0,
          scoreGapToPrev: null,
          myRankChange: null,
          accuracy: 0,
          combo: 0,
          avgCorrectMs: null,
        };
      }

      const total = sortedParticipants.length;
      const rank = localMyIndex >= 0 ? localMyIndex + 1 : 1;
      const previous = localMyIndex > 0 ? sortedParticipants[localMyIndex - 1] : null;
      const fallbackQuestionCount = Math.max(playedQuestionCount, 1);
      const localAccuracy =
        localMe && fallbackQuestionCount > 0
          ? (((localMe.correctCount ?? 0) / fallbackQuestionCount) * 100)
          : 0;

      return {
        me: localMe,
        myRank: backendCurrentRun?.rank ?? rank,
        rankPercentile:
          backendCurrentRun?.percentile ??
          (total <= 1 ? 100 : Math.round(((total - rank) / (total - 1)) * 100)),
        scoreGapToPrev:
          backendCurrentRun?.gapToPrevious ?? (previous && localMe ? previous.score - localMe.score : null),
        myRankChange:
          backendCurrentRun?.rankChange ??
          (localMe && rankChangeByClientId
            ? (rankChangeByClientId[localMe.clientId] ?? null)
            : null),
        accuracy:
          backendCurrentRun && backendCurrentRun.questionCount > 0
            ? (backendCurrentRun.correctCount / backendCurrentRun.questionCount) * 100
            : localAccuracy,
        combo:
          backendCurrentRun?.maxCombo ??
          Math.max(localMe?.maxCombo ?? 0, localMe?.combo ?? 0),
        avgCorrectMs:
          backendCurrentRun?.avgCorrectMs ??
          (typeof localMe?.avgCorrectMs === "number" &&
            Number.isFinite(localMe.avgCorrectMs)
            ? localMe.avgCorrectMs
            : null),
      };
    }, [
      backendCurrentRun,
      localMe,
      localMyIndex,
      playedQuestionCount,
      rankChangeByClientId,
      sortedParticipants,
    ]);

    const percentileMetrics = useMemo(() => {
      const accuracyValues = sortedParticipants.map((participant) =>
        playedQuestionCount > 0
          ? ((participant.correctCount ?? 0) / playedQuestionCount) * 100
          : 0,
      );
      const comboValues = sortedParticipants.map((participant) =>
        Math.max(participant.maxCombo ?? 0, participant.combo ?? 0),
      );
      const speedValues = sortedParticipants
        .map((participant) =>
          typeof participant.avgCorrectMs === "number" &&
            Number.isFinite(participant.avgCorrectMs)
            ? participant.avgCorrectMs
            : null,
        )
        .filter((value): value is number => value !== null);

      return {
        accuracyPercentile: getPercentileLabel(
          accuracyValues,
          meSummary.me ? meSummary.accuracy : null,
          "higher",
        ),
        comboPercentile: getPercentileLabel(
          comboValues,
          meSummary.me ? meSummary.combo : null,
          "higher",
        ),
        speedPercentile: getPercentileLabel(
          speedValues,
          meSummary.avgCorrectMs,
          "lower",
        ),
      };
    }, [meSummary, playedQuestionCount, sortedParticipants]);

    const effectiveLeaderboardRows = useMemo<LeaderboardMetricRow[]>(() => {
      // While loading, show all placeholder skeletons — reveal real data only when ready.
      if (leaderboardSettlementLoading) {
        const expectedTotal = Math.max(participants.length, 6);
        return Array.from({ length: Math.min(expectedTotal, 20) }, (_, i) => ({
          clientId: `__skeleton__${i}`,
          rank: i + 1,
          username: "",
          avatarUrl: null,
          score: 0,
          correctCount: 0,
          combo: 0,
          avgCorrectMs: null,
          durationSec: null,
          isMe: false,
          rankChange: null,
          isSkeleton: true,
        }));
      }

      const topEntries = backendTopEntries ?? [];
      if (topEntries.length > 0) {
        return topEntries.map((entry) => ({
          clientId: entry.userId ?? `ranked-${entry.rank}-${entry.displayName}`,
          rank: entry.rank,
          username: entry.displayName,
          avatarUrl: entry.avatarUrl ?? null,
          score: entry.score,
          correctCount: entry.correctCount,
          combo: entry.maxCombo,
          avgCorrectMs: entry.avgCorrectMs,
          durationSec: entry.durationSec,
          isMe: Boolean(entry.isMe),
          rankChange:
            entry.isMe && backendCurrentRun
              ? backendCurrentRun.rankChange
              : null,
        }));
      }

      return sortedParticipants.map((participant, index) => ({
        clientId: participant.clientId,
        rank: index + 1,
        username: participant.username,
        avatarUrl: participant.avatarUrl ?? participant.avatar_url ?? null,
        score: participant.score,
        correctCount: participant.correctCount ?? 0,
        combo: Math.max(participant.maxCombo ?? 0, participant.combo ?? 0),
        avgCorrectMs:
          typeof participant.avgCorrectMs === "number" &&
            Number.isFinite(participant.avgCorrectMs)
            ? participant.avgCorrectMs
            : null,
        durationSec: null,
        isMe: participant.clientId === meClientId,
        rankChange: rankChangeByClientId?.[participant.clientId] ?? null,
      }));
    }, [
      backendCurrentRun,
      backendTopEntries,
      leaderboardSettlementLoading,
      meClientId,
      participants.length,
      rankChangeByClientId,
      sortedParticipants,
    ]);

    const aroundMeRows = useMemo<LeaderboardMetricRow[]>(() => {
      const aroundEntries = backendAroundMeEntries ?? [];
      if (aroundEntries.length === 0) return [];
      return aroundEntries.map((entry) => ({
        clientId: entry.userId ?? `around-${entry.rank}-${entry.displayName}`,
        rank: entry.rank,
        username: entry.displayName,
        avatarUrl: entry.avatarUrl ?? null,
        score: entry.score,
        correctCount: entry.correctCount,
        combo: entry.maxCombo,
        avgCorrectMs: entry.avgCorrectMs,
        durationSec: entry.durationSec,
        isMe: Boolean(entry.isMe),
        rankChange:
          entry.isMe && backendCurrentRun ? backendCurrentRun.rankChange : null,
      }));
    }, [backendAroundMeEntries, backendCurrentRun]);

    const personalBestRow = useMemo<LeaderboardMetricRow | null>(() => {
      const topMe = effectiveLeaderboardRows.find((row) => row.isMe) ?? null;
      if (topMe) return topMe;

      const aroundMe = aroundMeRows.find((row) => row.isMe) ?? null;
      if (aroundMe) return aroundMe;

      if (backendCurrentRun) {
        return {
          clientId: meClientId ?? `current-run-${backendCurrentRun.rank}`,
          rank: backendCurrentRun.rank,
          username: localMe?.username ?? "你",
          avatarUrl: localMe?.avatarUrl ?? localMe?.avatar_url ?? null,
          score: backendCurrentRun.score,
          correctCount: backendCurrentRun.correctCount,
          combo: backendCurrentRun.maxCombo,
          avgCorrectMs: backendCurrentRun.avgCorrectMs,
          durationSec: backendCurrentRun.durationSec ?? null,
          isMe: true,
          rankChange: backendCurrentRun.rankChange,
        };
      }

      if (localMe) {
        return {
          clientId: localMe.clientId,
          rank: meSummary.myRank,
          username: localMe.username,
          avatarUrl: localMe.avatarUrl ?? localMe.avatar_url ?? null,
          score: localMe.score,
          correctCount: localMe.correctCount ?? 0,
          combo: Math.max(localMe.maxCombo ?? 0, localMe.combo ?? 0),
          avgCorrectMs:
            typeof localMe.avgCorrectMs === "number" && Number.isFinite(localMe.avgCorrectMs)
              ? localMe.avgCorrectMs
              : null,
          durationSec: null,
          isMe: true,
          rankChange: rankChangeByClientId?.[localMe.clientId] ?? null,
        };
      }

      return null;
    }, [aroundMeRows, backendCurrentRun, effectiveLeaderboardRows, localMe, meClientId, meSummary.myRank, rankChangeByClientId]);



    const coverThumbnail =
      leaderboardSettlement?.collection?.coverThumbnailUrl ??
      questionRecaps.find((item) => item.thumbnail)?.thumbnail ??
      playlistItems.find((item) => item.thumbnail)?.thumbnail ??
      null;

    const playlistSummary = useMemo(() => {
      return {
        title: room.playlist.title?.trim() || room.name || "排行榜歌單",
        count:
          room.gameSettings?.leaderboardTargetQuestionCount ??
          room.gameSettings?.questionCount ??
          playedQuestionCount,
      };
    }, [playedQuestionCount, room]);

    const questionRows = useMemo<LeaderboardQuestionRow[]>(() => {
      if (questionRecaps.length === 0) {
        return playlistItems.slice(0, playedQuestionCount).map((item, index) => ({
          key: item.sourceId ?? item.videoId ?? item.url ?? `fallback-${index}`,
          title: item.answerText?.trim() || item.title?.trim() || `第 ${index + 1} 題`,
          artist: item.uploader?.trim() || "未知歌手",
          thumbnail: item.thumbnail ?? null,
          youtubeUrl: buildYouTubeUrl(item),
          result: "unanswered",
          badgeLabel: "未作答",
          badgeTone: "neutral" as const,
          answerTimeLabel: "--",
          scoreGain: null,
        }));
      }

      return questionRecaps.map((recap) => {
        const answer = meClientId ? recap.answersByClientId?.[meClientId] : null;
        const result = answer?.result ?? recap.myResult ?? "unanswered";
        const answerTime =
          typeof answer?.answeredAtMs === "number" &&
            Number.isFinite(answer.answeredAtMs)
            ? answer.answeredAtMs
            : result === "correct"
              ? recap.fastestCorrectMs ?? null
              : null;
        const scoreGain = getScoreGain(answer?.scoreBreakdown);

        if (result === "correct" && typeof answerTime === "number" && answerTime < 2000) {
          return {
            key: recap.key,
            title: recap.title,
            artist: recap.uploader,
            thumbnail: recap.thumbnail ?? null,
            youtubeUrl: buildYouTubeUrl(recap),
            result,
            badgeLabel: "PERFECT!",
            badgeTone: "warning" as const,
            answerTimeLabel: formatAnswerTime(answerTime),
            scoreGain,
          };
        }

        if (result === "correct") {
          return {
            key: recap.key,
            title: recap.title,
            artist: recap.uploader,
            thumbnail: recap.thumbnail ?? null,
            youtubeUrl: buildYouTubeUrl(recap),
            result,
            badgeLabel: "答對",
            badgeTone: "success" as const,
            answerTimeLabel: formatAnswerTime(answerTime),
            scoreGain,
          };
        }

        if (result === "wrong") {
          return {
            key: recap.key,
            title: recap.title,
            artist: recap.uploader,
            thumbnail: recap.thumbnail ?? null,
            youtubeUrl: buildYouTubeUrl(recap),
            result,
            badgeLabel: "答錯",
            badgeTone: "danger" as const,
            answerTimeLabel: formatAnswerTime(answerTime),
            scoreGain,
          };
        }

        return {
          key: recap.key,
          title: recap.title,
          artist: recap.uploader,
          thumbnail: recap.thumbnail ?? null,
          youtubeUrl: buildYouTubeUrl(recap),
          result,
          badgeLabel: "未作答",
          badgeTone: "neutral" as const,
          answerTimeLabel: "--",
          scoreGain,
        };
      });
    }, [meClientId, playedQuestionCount, playlistItems, questionRecaps]);

    const answerOverview = useMemo(
      () =>
        questionRows.reduce(
          (acc, item) => {
            if (item.result === "correct") acc.correct += 1;
            else if (item.result === "wrong") acc.wrong += 1;
            else acc.unanswered += 1;
            return acc;
          },
          { correct: 0, wrong: 0, unanswered: 0 },
        ),
      [questionRows],
    );

    const filteredQuestionRows = useMemo(
      () =>
        questionFilter !== null
          ? questionRows.filter((item) => item.result === questionFilter)
          : questionRows,
      [questionRows, questionFilter],
    );

    const currentScore = backendCurrentRun?.score ?? meSummary.me?.score ?? 0;
    const scoreDelta =
      personalBestComparison?.hasPreviousBest === true &&
        typeof personalBestComparison.scoreDelta === "number" &&
        Number.isFinite(personalBestComparison.scoreDelta) &&
        personalBestComparison.scoreDelta !== 0
        ? personalBestComparison.scoreDelta
        : null;
    const currentRunComparable = useMemo(
      () => ({
        score: currentScore,
        combo: backendCurrentRun?.maxCombo ?? meSummary.combo,
        correctCount: backendCurrentRun?.correctCount ?? meSummary.me?.correctCount ?? 0,
        avgCorrectMs: backendCurrentRun?.avgCorrectMs ?? meSummary.avgCorrectMs,
      }),
      [
        backendCurrentRun?.avgCorrectMs,
        backendCurrentRun?.correctCount,
        backendCurrentRun?.maxCombo,
        currentScore,
        meSummary.avgCorrectMs,
        meSummary.combo,
        meSummary.me?.correctCount,
      ],
    );
    const selfBestAheadOfCurrent = useMemo(() => {
      if (!personalBestRow?.isMe) return false;
      return isRowAheadOfCurrent(personalBestRow, currentRunComparable);
    }, [currentRunComparable, personalBestRow]);
    const displayedCurrentRank = (() => {
      const baseRank = backendCurrentRun?.rank ?? meSummary.myRank;
      if (!baseRank) return 0;
      return baseRank + (selfBestAheadOfCurrent ? 1 : 0);
    })();
    const gapTargetRank = (() => {
      if (backendCurrentRun?.rank && backendCurrentRun.rank > 1) {
        return Math.max(1, backendCurrentRun.rank - 1);
      }
      if (displayedCurrentRank > 1) {
        return Math.max(1, displayedCurrentRank - 1);
      }
      return null;
    })();

    const rankingSummaryLabel = (() => {
      if (gapTargetRank !== null) {
        if (backendCurrentRun?.gapToPrevious !== null && backendCurrentRun?.gapToPrevious !== undefined) {
          return `距離第 ${gapTargetRank} 名差 ${formatScore(backendCurrentRun.gapToPrevious)} 分`;
        }
        return `距離第 ${gapTargetRank} 名的差距暫時無法取得`;
      }
      if (displayedCurrentRank === 1) {
        return "目前位居榜首";
      }
      if (effectiveLeaderboardRows.length === 0) {
        return leaderboardSettlementLoading
          ? "正在載入全球排行榜..."
          : "顯示本場即時結算";
      }
      return `顯示前 ${Math.min(10, effectiveLeaderboardRows.length || 10)} 名`;
    })();

    const QUESTION_VISIBLE_ROWS = 6.5;
    const questionListHeight = QUESTION_VISIBLE_ROWS * listRowHeight;
    const LEADERBOARD_DESKTOP_ROW_HEIGHT = 60;
    const LEADERBOARD_MOBILE_ROW_HEIGHT = 96;
    const leaderboardCardHeight = Math.max(
      questionListHeight - LEADERBOARD_DESKTOP_ROW_HEIGHT,
      isDesktopLayout ? 300 : 360,
    );
    const leaderboardDesktopHeight = Math.max(
      LEADERBOARD_DESKTOP_ROW_HEIGHT,
      leaderboardCardHeight - 190,
    );
    const leaderboardMobileHeight = Math.max(
      LEADERBOARD_MOBILE_ROW_HEIGHT,
      leaderboardCardHeight - 170,
    );
    const handleLeaderboardRowsRendered = useCallback(() => { }, []);

    const scoreSummaryLabel = (() => {
      if (displayedCurrentRank === 1) return "已經位居榜首";
      if (gapTargetRank !== null) {
        if (backendCurrentRun?.gapToPrevious !== null && backendCurrentRun?.gapToPrevious !== undefined) {
          return `距離第 ${gapTargetRank} 名差 ${formatScore(backendCurrentRun.gapToPrevious)} 分`;
        }
        return `距離第 ${gapTargetRank} 名的差距暫時無法取得`;
      }
      if (backendCurrentRun != null && backendCurrentRun.gapToFirst !== null) {
        return getGapToFirstLabel(backendCurrentRun.gapToFirst);
      }
      if (!meSummary.me) return "顯示本場分數";
      if (displayedCurrentRank <= 1 || meSummary.scoreGapToPrev === null) return "顯示本場分數";
      return `距離第 ${Math.max(1, displayedCurrentRank - 1)} 名差 ${formatScore(meSummary.scoreGapToPrev)} 分`;
    })();

    const filterEmptyMessages: Record<Exclude<QuestionFilterType, null>, string> = {
      correct: "沒有答對的題目",
      wrong: "沒有答錯的題目",
      unanswered: "沒有未作答的題目",
    };

    return (
      <div className="mx-auto w-full max-w-[1820px] min-w-0 overflow-hidden pt-2 text-[var(--mc-text)]">
        <section className="min-h-0">
          <div className="min-h-0">
            <div className="flex flex-col gap-2 border-b border-amber-300/14 pb-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex items-start gap-2">
                  <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] bg-[linear-gradient(180deg,rgba(245,158,11,0.12),rgba(120,53,15,0.1))] text-amber-100">
                    <BarChartRoundedIcon sx={{ fontSize: 20 }} />
                  </div>
                  <div className="min-w-0">
                    <h1 className="mt-0.5 text-xl font-black tracking-[0.07em] text-amber-50 sm:text-[1.5rem]">
                      排行挑戰（{challengeVariantLabel}）
                    </h1>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 lg:justify-end">
                {canRetryChallenge && onRetry ? (
                  <button
                    type="button"
                    onClick={onRetry}
                    className="inline-flex min-w-[110px] items-center justify-center gap-1.5 rounded-lg border border-amber-300/45 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-50 transition hover:bg-amber-500/18"
                  >
                    <RefreshRoundedIcon sx={{ fontSize: 14 }} />
                    再挑戰一次
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={onBackToLobby}
                  className="inline-flex min-w-[110px] items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-1.5 text-xs font-semibold text-[var(--mc-text)] transition hover:border-white/20 hover:bg-white/[0.04]"
                >
                  <HomeRoundedIcon sx={{ fontSize: 14 }} />
                  返回大廳
                </button>
              </div>
            </div>

            <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.7fr)]">
              <div className="min-w-0 space-y-3 overflow-hidden">
                <article className="rounded-[18px] border border-amber-300/16 bg-[radial-gradient(circle_at_12%_8%,rgba(245,158,11,0.08),transparent_28%),linear-gradient(180deg,rgba(28,20,10,0.78),rgba(8,10,14,0.92))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                  <div className="grid gap-3 lg:grid-cols-[minmax(220px,0.9fr)_minmax(0,1.1fr)]">
                    <div className="border-b border-amber-300/14 pb-3 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-4">
                      <div className="text-center text-sm font-semibold text-amber-50/92">
                        本次排名
                      </div>
                      <div className="mt-3 flex items-center justify-center gap-4">
                        <AutoAwesomeRoundedIcon className="hidden text-amber-300/65 sm:block" sx={{ fontSize: 22 }} />
                        <div className="text-[3rem] font-black leading-none text-amber-200 drop-shadow-[0_14px_32px_rgba(245,158,11,0.3)] sm:text-[3.8rem]">
                          #{displayedCurrentRank || "--"}
                        </div>
                        <AutoAwesomeRoundedIcon className="hidden rotate-180 text-amber-300/65 sm:block" sx={{ fontSize: 22 }} />
                      </div>
                      <div className="mt-2 flex justify-center">
                        <span className="inline-flex items-center rounded-full border border-amber-300/30 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-100">
                          勝過 {meSummary.rankPercentile}% 的玩家
                        </span>
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="text-center text-lg font-semibold text-amber-50/92">
                        本場得分
                      </div>
                      <div className="mt-2 text-center text-[2.4rem] font-black leading-none tracking-tight text-amber-200 drop-shadow-[0_14px_32px_rgba(245,158,11,0.28)] sm:text-[3rem]">
                        {formatScore(currentScore)}
                      </div>
                      {scoreDelta !== null && (
                        <div className="mt-1 flex items-center justify-center gap-1">
                          {scoreDelta > 0 ? (
                            <span className="inline-flex items-center gap-0.5 text-sm font-semibold text-emerald-400">
                              <AddRoundedIcon sx={{ fontSize: 13 }} />
                              {formatScore(scoreDelta)}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 text-sm font-semibold text-rose-400">
                              <RemoveRoundedIcon sx={{ fontSize: 13 }} />
                              {formatScore(Math.abs(scoreDelta))}
                            </span>
                          )}
                        </div>
                      )}
                      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5 text-xs text-[var(--mc-text-muted)]">
                        {meSummary.myRankChange !== null && (
                          <>
                            {meSummary.myRankChange > 0 ? (
                              <span className="inline-flex items-center gap-1 font-semibold text-emerald-400">
                                <TrendingUpRoundedIcon sx={{ fontSize: 16 }} />
                                升了 {meSummary.myRankChange}
                              </span>
                            ) : meSummary.myRankChange < 0 ? (
                              <span className="inline-flex items-center gap-1 font-semibold text-rose-400">
                                <TrendingDownRoundedIcon sx={{ fontSize: 16 }} />
                                降了 {Math.abs(meSummary.myRankChange)}
                              </span>
                            ) : (
                              <span className="text-[var(--mc-text-muted)]">持平</span>
                            )}
                            <span className="hidden h-4 w-px bg-white/10 sm:block" />
                          </>
                        )}
                        <span>{scoreSummaryLabel}</span>
                        {backendCurrentRun?.isPersonalBest && (
                          <>
                            <span className="hidden h-4 w-px bg-white/10 sm:block" />
                            <span className="font-semibold text-emerald-400">
                              新個人最佳
                            </span>
                          </>
                        )}
                        {personalBestComparison &&
                          !personalBestComparison.hasPreviousBest && (
                            <>
                              <span className="hidden h-4 w-px bg-white/10 sm:block" />
                              <span className="font-semibold text-sky-300">
                                首次紀錄
                              </span>
                            </>
                          )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2 lg:grid-cols-3 lg:justify-items-center">
                    <SummaryMetric
                      icon={<TrackChangesRoundedIcon sx={{ fontSize: 22 }} />}
                      label="答對率"
                      value={formatPercent(meSummary.accuracy)}
                      note={
                        percentileMetrics.accuracyPercentile === null
                          ? "等待更多玩家資料"
                          : `高於 ${percentileMetrics.accuracyPercentile}% 的玩家`
                      }
                    />
                    <SummaryMetric
                      icon={<WorkspacePremiumRoundedIcon sx={{ fontSize: 22 }} />}
                      label="最大 Combo"
                      value={`x${meSummary.combo}`}
                      note={
                        percentileMetrics.comboPercentile === null
                          ? "等待更多玩家資料"
                          : `超越 ${percentileMetrics.comboPercentile}% 的玩家`
                      }
                    />
                    <SummaryMetric
                      icon={<BoltRoundedIcon sx={{ fontSize: 28 }} />}
                      label="平均答題"
                      value={formatSeconds(meSummary.avgCorrectMs)}
                      note={
                        percentileMetrics.speedPercentile === null
                          ? "等待更多玩家資料"
                          : `快於 ${percentileMetrics.speedPercentile}% 的玩家`
                      }
                    />
                  </div>
                  {!isDesktopLayout ? (
                    <MobileSettlementPanelSwitch
                      value={mobileSettlementPanel}
                      onChange={setMobileSettlementPanel}
                    />
                  ) : null}
                </article>
                {(isDesktopLayout || mobileSettlementPanel === "leaderboard") ? (
                  <article
                    className="overflow-hidden rounded-[18px] border border-amber-300/16 bg-[linear-gradient(180deg,rgba(17,18,20,0.94),rgba(11,12,16,0.96))] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] sm:p-3"
                    style={{ height: leaderboardCardHeight }}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-300/12 pb-2">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-300/12 pb-2">
                        <h2 className="text-base font-black tracking-[0.06em] text-amber-100">
                          排行榜
                        </h2>
                        <div className="rounded-full border border-amber-300/18 bg-amber-500/8 px-2.5 py-1 text-xs font-semibold text-amber-100/88">
                          {rankingSummaryLabel}
                        </div>
                      </div>
                    </div>

                    <div className={`mt-3 hidden ${LEADERBOARD_DESKTOP_GRID_CLASS} gap-2 px-3 text-xs font-semibold text-amber-100/78 xl:grid`}>
                      <div>名次</div>
                      <div>玩家</div>
                      <div className="text-center">答對 / 答錯</div>
                      <div className="text-center">最大 Combo</div>
                      <div className="text-center">平均答題</div>
                      <div className="text-center">耗時</div>
                      <div className="text-center">分數</div>
                      {/* <div className="text-center">排名變化</div> */}
                    </div>

                    {effectiveLeaderboardRows.length > 0 ? (
                      <>
                        <div className="mt-2 hidden xl:block">
                          <List
                            rowComponent={LeaderboardDesktopRow}
                            rowCount={effectiveLeaderboardRows.length}
                            rowHeight={LEADERBOARD_DESKTOP_ROW_HEIGHT}
                            rowProps={{
                              rows: effectiveLeaderboardRows,
                              playedQuestionCount,
                            }}
                            overscanCount={5}
                            defaultHeight={leaderboardDesktopHeight}
                            onRowsRendered={handleLeaderboardRowsRendered}
                            style={{ height: leaderboardDesktopHeight, width: "100%" }}
                          />
                        </div>
                        <div className="mt-2 xl:hidden">
                          <List
                            rowComponent={LeaderboardMobileRow}
                            rowCount={effectiveLeaderboardRows.length}
                            rowHeight={LEADERBOARD_MOBILE_ROW_HEIGHT}
                            rowProps={{
                              rows: effectiveLeaderboardRows,
                              playedQuestionCount,
                            }}
                            overscanCount={5}
                            defaultHeight={leaderboardMobileHeight}
                            onRowsRendered={handleLeaderboardRowsRendered}
                            style={{ height: leaderboardMobileHeight, width: "100%" }}
                          />
                        </div>
                      </>
                    ) : (
                      <div className="mt-3 rounded-[20px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 text-center text-sm text-[var(--mc-text-muted)]">
                        {leaderboardSettlementError
                          ? "全球排行榜載入失敗，先顯示本場即時結果。"
                          : "目前僅顯示本場即時結果。"}
                      </div>
                    )}
                    {leaderboardSettlementError && onRefreshLeaderboardSettlement && (
                      <div className="mt-2.5 flex justify-center">
                        <button
                          type="button"
                          onClick={onRefreshLeaderboardSettlement}
                          className="inline-flex items-center gap-2 rounded-full border border-amber-300/18 bg-amber-500/8 px-3 py-1.5 text-xs font-semibold text-amber-100/88 transition hover:bg-amber-500/14"
                        >
                          <RefreshRoundedIcon sx={{ fontSize: 14 }} />
                          重新載入全球排行榜
                        </button>
                      </div>
                    )}
                    {personalBestRow && (
                      <div className="mt-3 rounded-[20px] border border-sky-300/20 bg-sky-500/8 px-4 py-3 shadow-[inset_0_0_0_1px_rgba(125,211,252,0.04)]">
                        <div className="mb-2 flex items-center justify-between gap-3 text-xs text-sky-100/80">
                          <span className="font-semibold tracking-[0.08em]">個人最佳</span>
                          <span>
                            第 {personalBestRow.rank} 名
                            {personalBestComparison?.hasPreviousBest === false ? " · 首次紀錄" : ""}
                          </span>
                        </div>
                        <div className={`hidden ${LEADERBOARD_DESKTOP_GRID_CLASS} items-center gap-2 xl:grid`}>
                          <div className="text-base font-black text-sky-100">#{personalBestRow.rank}</div>
                          <div className="flex min-w-0 items-center gap-2">
                            <PlayerAvatar
                              username={personalBestRow.username}
                              clientId={personalBestRow.clientId}
                              avatarUrl={personalBestRow.avatarUrl}
                              size={32}
                              rank={personalBestRow.rank}
                              combo={personalBestRow.combo}
                              isMe
                              hideRankMark
                              loading="lazy"
                            />
                            <div className="truncate text-sm font-semibold text-[var(--mc-text)]">
                              {personalBestRow.username}（你）
                            </div>
                          </div>
                          <div className="text-center text-xs text-[var(--mc-text-muted)]">
                            {personalBestRow.correctCount} / {Math.max(playedQuestionCount - personalBestRow.correctCount, 0)}
                          </div>
                          <div className="text-center text-xs font-semibold text-violet-300">
                            x{personalBestRow.combo}
                          </div>
                          <div className="text-center text-xs text-[var(--mc-text-muted)]">
                            {formatSeconds(personalBestRow.avgCorrectMs)}
                          </div>
                          <div className="text-center text-xs font-semibold text-slate-300">
                            {formatDurationSec(personalBestRow.durationSec)}
                          </div>
                          <div className="text-center text-base font-black text-sky-100">
                            {formatScore(personalBestRow.score)}
                          </div>
                        </div>
                        <div className="xl:hidden">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-2">
                              <div className="text-base font-black text-sky-100">#{personalBestRow.rank}</div>
                              <PlayerAvatar
                                username={personalBestRow.username}
                                clientId={personalBestRow.clientId}
                                avatarUrl={personalBestRow.avatarUrl}
                                size={30}
                                rank={personalBestRow.rank}
                                combo={personalBestRow.combo}
                                isMe
                                hideRankMark
                                loading="lazy"
                              />
                              <div className="min-w-0">
                                <div className="truncate text-sm font-semibold text-[var(--mc-text)]">
                                  {personalBestRow.username}（你）
                                </div>
                                <div className="mt-0.5 text-xs text-[var(--mc-text-muted)]">
                                  答對 / 答錯 {personalBestRow.correctCount} / {Math.max(playedQuestionCount - personalBestRow.correctCount, 0)}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-base font-black text-sky-100">
                                {formatScore(personalBestRow.score)}
                              </div>
                              <div className="mt-0.5 text-xs text-violet-300">
                                Combo x{personalBestRow.combo}
                              </div>
                            </div>
                          </div>
                          <div className="mt-2 text-xs text-[var(--mc-text-muted)]">
                            平均答題 {formatSeconds(personalBestRow.avgCorrectMs)} · 耗時 {formatDurationSec(personalBestRow.durationSec)}
                          </div>
                        </div>
                      </div>
                    )}
                  </article>
                ) : null}

              </div>
              {(isDesktopLayout || mobileSettlementPanel === "review") ? (
                <aside className="min-w-0">
                  <article className="rounded-[24px] bg-transparent p-0 shadow-none">
                    <div className="overflow-hidden rounded-[20px] bg-[linear-gradient(180deg,rgba(24,20,14,0.96),rgba(12,12,14,0.96))]">
                      <div className="relative h-[100px] w-full overflow-hidden bg-[linear-gradient(145deg,rgba(59,130,246,0.25),rgba(147,51,234,0.18))]">
                        {coverThumbnail ? (
                          <img
                            src={coverThumbnail}
                            alt={playlistSummary.title}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-amber-100/80">
                            <BarChartRoundedIcon sx={{ fontSize: 30 }} />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
                        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 px-3 pb-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-black tracking-[0.04em] text-white drop-shadow-[0_1px_6px_rgba(0,0,0,0.9)]">
                              {playlistSummary.title}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={onToggleFavorite}
                            disabled={!onToggleFavorite}
                            className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border transition disabled:cursor-not-allowed disabled:opacity-40 ${isFavorited
                              ? "border-amber-300/60 bg-amber-500/22 text-amber-300 hover:bg-amber-500/16"
                              : "border-white/30 bg-black/40 text-white hover:bg-black/60"
                              }`}
                            aria-label={isFavorited ? "取消收藏" : "加入收藏"}
                            aria-pressed={isFavorited ?? false}
                          >
                            {isFavorited ? <StarRoundedIcon sx={{ fontSize: 18 }} /> : <StarBorderRoundedIcon sx={{ fontSize: 18 }} />}
                          </button>
                        </div>
                      </div>

                      <div className="p-3 sm:p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-[18px] bg-white/[0.02] px-3 py-3">
                          <div className="flex shrink-0 flex-wrap items-center gap-1.5 text-xs">
                            <button
                              type="button"
                              onClick={() => setQuestionFilter(
                                questionFilter === "correct" ? null : "correct",
                              )}
                              className={`rounded-full border px-2.5 py-1 font-semibold transition ${questionFilter === "correct"
                                ? "border-emerald-300/55 bg-emerald-500/18 text-emerald-100"
                                : "border-emerald-300/30 bg-emerald-500/10 text-emerald-100/70 hover:bg-emerald-500/14"
                                }`}
                              aria-pressed={questionFilter === "correct"}
                            >
                              答對 {answerOverview.correct}
                            </button>
                            <button
                              type="button"
                              onClick={() => setQuestionFilter(
                                questionFilter === "wrong" ? null : "wrong",
                              )}
                              className={`rounded-full border px-2.5 py-1 font-semibold transition ${questionFilter === "wrong"
                                ? "border-rose-300/55 bg-rose-500/18 text-rose-100"
                                : "border-rose-300/30 bg-rose-500/10 text-rose-100/70 hover:bg-rose-500/14"
                                }`}
                              aria-pressed={questionFilter === "wrong"}
                            >
                              答錯 {answerOverview.wrong}
                            </button>
                            <button
                              type="button"
                              onClick={() => setQuestionFilter(
                                questionFilter === "unanswered" ? null : "unanswered",
                              )}
                              className={`rounded-full border px-2.5 py-1 font-semibold transition ${questionFilter === "unanswered"
                                ? "border-slate-500/55 bg-slate-700/50 text-slate-100"
                                : "border-slate-500/35 bg-slate-700/25 text-slate-100/70 hover:bg-slate-700/35"
                                }`}
                              aria-pressed={questionFilter === "unanswered"}
                            >
                              未作答 {answerOverview.unanswered}
                            </button>
                          </div>
                          <div className="rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1 text-xs text-[var(--mc-text-muted)]">
                            共 {questionRows.length} 題
                          </div>
                        </div>
                      </div>
                    </div>

                    <div ref={questionListRef} className="mt-3 min-h-0">
                      {filteredQuestionRows.length > 0 && questionListWidth > 0 ? (
                        <List
                          rowComponent={QuestionListRow}
                          rowCount={filteredQuestionRows.length}
                          rowHeight={listRowHeight}
                          rowProps={{ items: filteredQuestionRows, isDesktopLayout }}
                          overscanCount={5}
                          defaultHeight={questionListHeight}
                          style={{ height: questionListHeight, width: "100%" }}
                        />
                      ) : (
                        <div
                          className="flex items-center justify-center rounded-[20px] border border-dashed border-white/10 bg-white/[0.02] text-center text-sm text-[var(--mc-text-muted)]"
                          style={{ height: questionListHeight }}
                        >
                          {questionFilter !== null
                            ? filterEmptyMessages[questionFilter]
                            : "目前沒有任何題目資訊"}
                        </div>
                      )}
                    </div>
                  </article>
                </aside>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    );
  };

export default memo(LeaderboardSettlementShowcase);
