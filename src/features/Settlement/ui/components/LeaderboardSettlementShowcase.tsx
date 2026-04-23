import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import useMediaQuery from "@mui/material/useMediaQuery";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import BarChartRoundedIcon from "@mui/icons-material/BarChartRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import StarBorderRoundedIcon from "@mui/icons-material/StarBorderRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import TrackChangesRoundedIcon from "@mui/icons-material/TrackChangesRounded";
import TrendingDownRoundedIcon from "@mui/icons-material/TrendingDownRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import WorkspacePremiumRoundedIcon from "@mui/icons-material/WorkspacePremiumRounded";
import { List, type RowComponentProps } from "react-window";

import type {
  PlaylistItem,
  QuestionScoreBreakdown,
  RoomParticipant,
  RoomState,
} from "@features/RoomSession";
import type { SettlementQuestionRecap, SettlementQuestionResult } from "../../model/types";
import { useRankedChallengeSettlementData } from "../../model/useRankedChallengeSettlementData";
import PlayerAvatar from "@shared/ui/playerAvatar/PlayerAvatar";

type LeaderboardSettlementShowcaseProps = {
  room: RoomState["room"];
  participants: RoomParticipant[];
  playlistItems?: PlaylistItem[];
  playedQuestionCount: number;
  meClientId?: string;
  matchId?: string | null;
  questionRecaps?: SettlementQuestionRecap[];
  rankChangeByClientId?: Record<string, number | null>;
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
  isMe: boolean;
  rankChange: number | null;
};

type LeaderboardQuestionRow = {
  key: string;
  title: string;
  artist: string;
  thumbnail: string | null;
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
};

type LeaderboardListRowProps = {
  rows: LeaderboardMetricRow[];
  playedQuestionCount: number;
};

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
    <div className="grid min-w-0 grid-cols-[74px_minmax(0,1fr)] items-center gap-4 px-1 py-2">
      <div className="inline-flex h-16 w-16 items-center justify-center text-amber-100">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[11px] tracking-[0.18em] text-[var(--mc-text-muted)]">
          {label}
        </div>
        <div className="mt-1 text-[2.45rem] font-black leading-none text-amber-50">
          {value}
        </div>
        <div className="mt-2 text-base text-[var(--mc-text-muted)]">{note}</div>
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
      <span className="inline-flex min-w-[88px] items-center justify-center rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-xs text-[var(--mc-text-muted)]">
        --
      </span>
    );
  }

  if (value > 0) {
    return (
      <span className="inline-flex min-w-[88px] items-center justify-center gap-1 rounded-full border border-emerald-400/22 bg-emerald-500/10 px-3 py-1 text-sm font-semibold text-emerald-400">
        <TrendingUpRoundedIcon sx={{ fontSize: 16 }} />
        {value}
      </span>
    );
  }

  if (value < 0) {
    return (
      <span className="inline-flex min-w-[88px] items-center justify-center gap-1 rounded-full border border-rose-400/22 bg-rose-500/10 px-3 py-1 text-sm font-semibold text-rose-400">
        <TrendingDownRoundedIcon sx={{ fontSize: 16 }} />
        {Math.abs(value)}
      </span>
    );
  }

  return (
    <span className="inline-flex min-w-[88px] items-center justify-center rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-xs text-[var(--mc-text-muted)]">
      --
    </span>
  );
});

const QuestionListRow = memo(function QuestionListRow({
  index,
  style,
  items,
}: RowComponentProps<QuestionListRowProps>) {
  const item = items[index];
  if (!item) return null;

  return (
    <div style={style} className="box-border px-0 pb-3">
      <div className="grid h-[102px] grid-cols-[88px_minmax(0,1fr)_132px] items-center gap-4 rounded-[24px] border border-white/6 bg-white/[0.02] px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
        <div className="h-[72px] w-[72px] overflow-hidden rounded-2xl border border-white/8 bg-[linear-gradient(145deg,rgba(59,130,246,0.2),rgba(147,51,234,0.14))]">
          {item.thumbnail ? (
            <img
              src={item.thumbnail}
              alt={item.title}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-amber-100/80">
              <BarChartRoundedIcon />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <div className="truncate text-[1.2rem] font-semibold text-[var(--mc-text)]">
            {item.title}
          </div>
          <div className="mt-1 truncate text-lg text-[var(--mc-text-muted)]">
            {item.artist}
          </div>
        </div>
        <div className="text-right">
          <span
            className={`inline-flex min-w-[92px] items-center justify-center rounded-2xl border px-3 py-2 text-sm font-bold tracking-[0.08em] ${badgeToneClass[item.badgeTone]}`}
          >
            {item.badgeLabel}
          </span>
          <div className="mt-2 text-[1.5rem] font-semibold text-[var(--mc-text-muted)]">
            {item.answerTimeLabel}
          </div>
        </div>
      </div>
    </div>
  );
});

const LeaderboardDesktopRow = memo(function LeaderboardDesktopRow({
  index,
  style,
  rows,
  playedQuestionCount,
}: RowComponentProps<LeaderboardListRowProps>) {
  const row = rows[index];
  if (!row) return null;

  return (
    <div style={style} className="box-border pb-2">
      <div
        className={`grid grid-cols-[64px_minmax(220px,1.65fr)_132px_132px_132px_128px_132px] items-center gap-3 rounded-2xl border px-4 py-3 text-sm ${
          row.isMe
            ? "border-amber-300/45 bg-amber-500/10 shadow-[inset_0_0_0_1px_rgba(252,211,77,0.08)]"
            : "border-white/6 bg-white/[0.02]"
        }`}
      >
        <div className="text-lg font-black text-amber-100">{row.rank}</div>
        <div className="flex min-w-0 items-center gap-3">
          <PlayerAvatar
            username={row.username}
            clientId={row.clientId}
            avatarUrl={row.avatarUrl}
            size={38}
            rank={row.rank}
            combo={row.combo}
            isMe={row.isMe}
            hideRankMark
            loading="lazy"
          />
          <div className="truncate text-base font-semibold text-[var(--mc-text)]">
            {row.username}
            {row.isMe ? "（你）" : ""}
          </div>
        </div>
        <div className="text-center text-[var(--mc-text-muted)]">
          {row.correctCount} / {playedQuestionCount}
        </div>
        <div className="text-center font-semibold text-violet-300">
          x{row.combo}
        </div>
        <div className="text-center text-[var(--mc-text-muted)]">
          {formatSeconds(row.avgCorrectMs)}
        </div>
        <div className="text-center text-xl font-black text-amber-100">
          {formatScore(row.score)}
        </div>
        <div className="flex min-w-0 items-center justify-center">
          <RankChangeBadge value={row.rankChange} />
        </div>
      </div>
    </div>
  );
});

const LeaderboardMobileRow = memo(function LeaderboardMobileRow({
  index,
  style,
  rows,
  playedQuestionCount,
}: RowComponentProps<LeaderboardListRowProps>) {
  const row = rows[index];
  if (!row) return null;

  return (
    <div style={style} className="box-border pb-3">
      <div
        className={`rounded-[24px] border px-4 py-4 ${
          row.isMe
            ? "border-amber-300/45 bg-amber-500/10 shadow-[inset_0_0_0_1px_rgba(252,211,77,0.08)]"
            : "border-white/6 bg-white/[0.02]"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="text-xl font-black text-amber-100">#{row.rank}</div>
            <PlayerAvatar
              username={row.username}
              clientId={row.clientId}
              avatarUrl={row.avatarUrl}
              size={36}
              rank={row.rank}
              combo={row.combo}
              isMe={row.isMe}
              hideRankMark
              loading="lazy"
            />
            <div className="min-w-0">
              <div className="truncate text-base font-semibold text-[var(--mc-text)]">
                {row.username}
                {row.isMe ? "（你）" : ""}
              </div>
              <div className="mt-1 text-xs text-[var(--mc-text-muted)]">
                答對 {row.correctCount} / {playedQuestionCount}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-black text-amber-100">
              {formatScore(row.score)}
            </div>
            <div className="mt-1 text-xs text-violet-300">
              Combo x{row.combo}
            </div>
          </div>
        </div>
        <div className="mt-3 text-xs text-[var(--mc-text-muted)]">
          平均答題 {formatSeconds(row.avgCorrectMs)}
        </div>
      </div>
    </div>
  );
});

const LeaderboardSettlementShowcase: React.FC<
  LeaderboardSettlementShowcaseProps
> = ({
  room,
  participants,
  playlistItems = [],
  playedQuestionCount,
  meClientId,
  matchId = null,
  questionRecaps = [],
  rankChangeByClientId,
  isFavorited,
  onToggleFavorite,
  onRetry,
  onBackToLobby,
}) => {
  const isDesktopLayout = useMediaQuery("(min-width: 1280px)");
  const listRowHeight = isDesktopLayout ? 114 : 118;
  const { ref: questionListRef, width: questionListWidth } = useElementWidth();
  const [showWrongOnly, setShowWrongOnly] = useState(false);

  const challengeVariantLabel = useMemo(
    () => formatVariantLabel(room, playedQuestionCount),
    [playedQuestionCount, room],
  );

  const sortedParticipants = useMemo(
    () => sortParticipants(participants),
    [participants],
  );
  const rankedSettlement = useRankedChallengeSettlementData({
    room,
    participants,
    playedQuestionCount,
    meClientId,
    matchId,
  });

  const meSummary = useMemo<PersonalSummary>(() => {
    const myIndex = sortedParticipants.findIndex(
      (participant) => participant.clientId === meClientId,
    );
    const me =
      myIndex >= 0
        ? sortedParticipants[myIndex]
        : sortedParticipants[0] ?? null;

    if (!me) {
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
    const rank = myIndex + 1;
    const previous = myIndex > 0 ? sortedParticipants[myIndex - 1] : null;

    const rankedSummary = rankedSettlement.myRankedSummary;
    const rankedRun = rankedSettlement.currentRun;

    return {
      me,
      myRank: rankedSummary?.currentRank ?? rank,
      rankPercentile:
        rankedSummary?.surpassedPercent ??
        (total <= 1 ? 100 : Math.round(((total - rank) / (total - 1)) * 100)),
      scoreGapToPrev: previous ? previous.score - me.score : null,
      myRankChange: rankChangeByClientId
        ? (rankChangeByClientId[me.clientId] ?? null)
        : null,
      accuracy:
        playedQuestionCount > 0
          ? (((rankedRun?.correctCount ?? me.correctCount) ?? 0) /
              playedQuestionCount) *
            100
          : 0,
      combo: rankedRun?.maxCombo ?? Math.max(me.maxCombo ?? 0, me.combo ?? 0),
      avgCorrectMs:
        rankedRun?.avgCorrectMs ??
        (typeof me.avgCorrectMs === "number" && Number.isFinite(me.avgCorrectMs)
          ? me.avgCorrectMs
          : null),
    };
  }, [
    meClientId,
    playedQuestionCount,
    rankChangeByClientId,
    rankedSettlement.currentRun,
    rankedSettlement.myRankedSummary,
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

  const leaderboardRows = useMemo<LeaderboardMetricRow[]>(
    () =>
      sortedParticipants.map((participant, index) => ({
        clientId: participant.clientId,
        rank: index + 1,
        username: participant.username,
        avatarUrl: participant.avatar_url ?? participant.avatarUrl ?? null,
        score: participant.score,
        correctCount: participant.correctCount ?? 0,
        combo: Math.max(participant.maxCombo ?? 0, participant.combo ?? 0),
        avgCorrectMs:
          typeof participant.avgCorrectMs === "number" &&
          Number.isFinite(participant.avgCorrectMs)
            ? participant.avgCorrectMs
            : null,
        isMe: Boolean(meClientId && participant.clientId === meClientId),
        rankChange: rankChangeByClientId
          ? (rankChangeByClientId[participant.clientId] ?? null)
          : null,
      })),
    [meClientId, rankChangeByClientId, sortedParticipants],
  );
  const effectiveLeaderboardRows = useMemo<LeaderboardMetricRow[]>(() => {
    const rankedEntries =
      rankedSettlement.leaderboardPagedEntries.length > 0
        ? rankedSettlement.leaderboardPagedEntries
        : rankedSettlement.leaderboardTopEntries;
    if (rankedEntries.length === 0) return leaderboardRows;
    return rankedEntries.map((entry) => ({
      clientId: entry.userId ?? `ranked-${entry.rank}-${entry.displayName}`,
      rank: entry.rank,
      username: entry.displayName,
      avatarUrl: entry.avatarUrl ?? null,
      score: entry.score,
      correctCount: entry.correctCount,
      combo: entry.maxCombo,
      avgCorrectMs: entry.avgCorrectMs,
      isMe: Boolean(entry.isMe),
      rankChange: null,
    }));
  }, [
    leaderboardRows,
    rankedSettlement.leaderboardPagedEntries,
    rankedSettlement.leaderboardTopEntries,
  ]);

  const playlistSummary = useMemo(() => {
    const firstThumbnail =
      questionRecaps.find((item) => item.thumbnail)?.thumbnail ??
      playlistItems.find((item) => item.thumbnail)?.thumbnail ??
      null;

    return {
      title: room.playlist.title?.trim() || room.name || "排行榜題庫",
      thumbnail: firstThumbnail,
      count:
        room.gameSettings?.leaderboardTargetQuestionCount ??
        room.gameSettings?.questionCount ??
        playedQuestionCount,
    };
  }, [playedQuestionCount, playlistItems, questionRecaps, room]);

  const questionRows = useMemo<LeaderboardQuestionRow[]>(() => {
    if (questionRecaps.length === 0) {
      return playlistItems.slice(0, playedQuestionCount).map((item, index) => ({
        key: item.sourceId ?? item.videoId ?? item.url ?? `fallback-${index}`,
        title: item.answerText?.trim() || item.title?.trim() || `第 ${index + 1} 題`,
        artist: item.uploader?.trim() || "未知歌手",
        thumbnail: item.thumbnail ?? null,
        result: "unanswered",
        badgeLabel: "待結算",
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
          result,
          badgeLabel: "正確",
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
          result,
          badgeLabel: "錯誤",
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
      showWrongOnly
        ? questionRows.filter((item) => item.result === "wrong")
        : questionRows,
    [questionRows, showWrongOnly],
  );

  const rankingSummaryLabel = useMemo(() => {
    if (meSummary.myRank > 1 && meSummary.scoreGapToPrev !== null) {
      return `距離第 ${meSummary.myRank - 1} 名還差 ${formatScore(meSummary.scoreGapToPrev)} 分`;
    }
    if (meSummary.myRank === 1) {
      return "目前位居榜首";
    }
    return `排行榜顯示前 ${Math.min(10, effectiveLeaderboardRows.length || 10)} 名`;
  }, [
    effectiveLeaderboardRows.length,
    meSummary.myRank,
    meSummary.scoreGapToPrev,
  ]);
  const leaderboardDesktopHeight = Math.min(
    420,
    Math.max(80, effectiveLeaderboardRows.length * 80),
  );
  const leaderboardMobileHeight = Math.min(
    520,
    Math.max(128, effectiveLeaderboardRows.length * 128),
  );
  const handleLeaderboardRowsRendered = useCallback(
    ({ stopIndex }: { startIndex: number; stopIndex: number }) => {
      if (
        !rankedSettlement.hasMore ||
        rankedSettlement.loadingMore ||
        stopIndex < effectiveLeaderboardRows.length - 4
      ) {
        return;
      }
      rankedSettlement.loadMoreLeaderboardEntries();
    },
    [effectiveLeaderboardRows.length, rankedSettlement],
  );

  const scoreSummaryLabel = useMemo(() => {
    if (!meSummary.me) return "尚未取得本場分數";
    if (meSummary.scoreGapToPrev === null) return "已位居榜首";
    return `距離前一名 ${formatScore(meSummary.scoreGapToPrev)} 分`;
  }, [meSummary]);

  const questionListHeight = useMemo(() => {
    const target = filteredQuestionRows.length * listRowHeight;
    if (filteredQuestionRows.length <= 0) return 260;
    return Math.max(
      Math.min(target, isDesktopLayout ? 742 : 560),
      Math.min(filteredQuestionRows.length, 4) * listRowHeight,
    );
  }, [filteredQuestionRows.length, isDesktopLayout, listRowHeight]);

  return (
    <div className="mx-auto w-full max-w-[1820px] min-w-0 px-3 pb-8 pt-3 sm:px-4 xl:px-6">
      <section className="relative overflow-hidden rounded-[30px] border border-amber-300/14 bg-[radial-gradient(circle_at_8%_0%,rgba(245,158,11,0.16),transparent_24%),radial-gradient(circle_at_100%_20%,rgba(8,145,178,0.08),transparent_28%),linear-gradient(180deg,rgba(7,8,10,0.98),rgba(8,10,14,0.98))] px-5 py-5 text-[var(--mc-text)] shadow-[0_38px_100px_-68px_rgba(245,158,11,0.56)] sm:px-6 sm:py-6">
        <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(245,158,11,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(245,158,11,0.02)_1px,transparent_1px)] [background-size:22px_22px]" />
        <div className="relative">
          <div className="flex flex-col gap-4 border-b border-amber-300/14 pb-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-start gap-4">
                <div className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] bg-[linear-gradient(180deg,rgba(245,158,11,0.12),rgba(120,53,15,0.1))] text-amber-100">
                  <BarChartRoundedIcon sx={{ fontSize: 34 }} />
                </div>
                <div className="min-w-0">
                  <h1 className="mt-1 text-[1.95rem] font-black tracking-[0.07em] text-amber-50 sm:text-[2.45rem]">
                    排行挑戰（{challengeVariantLabel}）
                  </h1>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 lg:justify-end">
              <button
                type="button"
                onClick={onRetry}
                disabled={!onRetry}
                className="inline-flex min-w-[176px] items-center justify-center gap-2 rounded-2xl border border-amber-300/45 bg-amber-500/10 px-5 py-3 text-base font-semibold text-amber-50 transition hover:bg-amber-500/18 disabled:cursor-not-allowed disabled:border-amber-300/15 disabled:bg-white/[0.02] disabled:text-amber-100/35"
              >
                <RefreshRoundedIcon fontSize="small" />
                再挑戰一次
              </button>
              <button
                type="button"
                onClick={onBackToLobby}
                className="inline-flex min-w-[176px] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-3 text-base font-semibold text-[var(--mc-text)] transition hover:border-white/20 hover:bg-white/[0.04]"
              >
                <HomeRoundedIcon fontSize="small" />
                返回大廳
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(460px,0.7fr)]">
            <div className="min-w-0 space-y-5">
              <article className="rounded-[28px] border border-amber-300/16 bg-[radial-gradient(circle_at_12%_8%,rgba(245,158,11,0.08),transparent_28%),linear-gradient(180deg,rgba(28,20,10,0.78),rgba(8,10,14,0.92))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <div className="grid gap-5 lg:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.1fr)]">
                  <div className="border-b border-amber-300/14 pb-5 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-6">
                    <div className="text-center text-2xl font-semibold text-amber-50/92">
                      本場排名
                    </div>
                    <div className="mt-5 flex items-center justify-center gap-6">
                      <AutoAwesomeRoundedIcon className="hidden text-amber-300/65 sm:block" sx={{ fontSize: 42 }} />
                      <div className="text-[5rem] font-black leading-none text-amber-200 drop-shadow-[0_14px_32px_rgba(245,158,11,0.3)] sm:text-[6.2rem]">
                        #{meSummary.myRank || "--"}
                      </div>
                      <AutoAwesomeRoundedIcon className="hidden rotate-180 text-amber-300/65 sm:block" sx={{ fontSize: 42 }} />
                    </div>
                    <div className="mt-4 flex justify-center">
                      <span className="inline-flex items-center rounded-full border border-amber-300/30 bg-amber-500/10 px-4 py-2 text-[1.05rem] font-bold text-amber-100">
                        超越 {meSummary.rankPercentile}% 玩家
                      </span>
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="text-center text-2xl font-semibold text-amber-50/92">
                      本場分數
                    </div>
                    <div className="mt-4 text-center text-[3.7rem] font-black leading-none tracking-tight text-amber-200 drop-shadow-[0_14px_32px_rgba(245,158,11,0.28)] sm:text-[4.9rem]">
                      {formatScore(meSummary.me?.score ?? 0)}
                    </div>
                    <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-3 text-base text-[var(--mc-text-muted)]">
                      <span>共 {participants.length} 位玩家參與</span>
                      {meSummary.myRankChange !== null && (
                        <>
                          <span className="hidden h-5 w-px bg-white/10 sm:block" />
                          {meSummary.myRankChange > 0 ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-400">
                              <TrendingUpRoundedIcon sx={{ fontSize: 18 }} />
                              排名上升 {meSummary.myRankChange}
                            </span>
                          ) : meSummary.myRankChange < 0 ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-rose-400">
                              <TrendingDownRoundedIcon sx={{ fontSize: 18 }} />
                              排名下降 {Math.abs(meSummary.myRankChange)}
                            </span>
                          ) : (
                            <span className="text-[var(--mc-text-muted)]">排名不變</span>
                          )}
                        </>
                      )}
                      <span className="hidden h-5 w-px bg-white/10 sm:block" />
                      <span>{scoreSummaryLabel}</span>
                      {rankedSettlement.myRankedSummary?.previousBestBeforeRun && (
                        <>
                          <span className="hidden h-5 w-px bg-white/10 sm:block" />
                          <span>
                            前次最佳{" "}
                            {formatScore(
                              rankedSettlement.myRankedSummary
                                .previousBestBeforeRun.score,
                            )}{" "}
                            分
                          </span>
                        </>
                      )}
                      {rankedSettlement.myRankedSummary?.isNewBest && (
                        <>
                          <span className="hidden h-5 w-px bg-white/10 sm:block" />
                          <span className="font-semibold text-emerald-400">
                            新個人最佳
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-3">
                  <SummaryMetric
                    icon={<TrackChangesRoundedIcon sx={{ fontSize: 40 }} />}
                    label="答對率"
                    value={formatPercent(meSummary.accuracy)}
                    note={
                      percentileMetrics.accuracyPercentile === null
                        ? "等待更多玩家資料"
                        : `高於 ${percentileMetrics.accuracyPercentile}% 的玩家`
                    }
                  />
                  <SummaryMetric
                    icon={<WorkspacePremiumRoundedIcon sx={{ fontSize: 42 }} />}
                    label="最大 Combo"
                    value={`x${meSummary.combo}`}
                    note={
                      percentileMetrics.comboPercentile === null
                        ? "等待更多玩家資料"
                        : `超越 ${percentileMetrics.comboPercentile}% 的玩家`
                    }
                  />
                  <SummaryMetric
                    icon={<BoltRoundedIcon sx={{ fontSize: 40 }} />}
                    label="平均答題"
                    value={formatSeconds(meSummary.avgCorrectMs)}
                    note={
                      percentileMetrics.speedPercentile === null
                        ? "等待更多玩家資料"
                        : `快於 ${percentileMetrics.speedPercentile}% 的玩家`
                    }
                  />
                </div>
              </article>

              <article className="rounded-[28px] border border-amber-300/16 bg-[linear-gradient(180deg,rgba(17,18,20,0.94),rgba(11,12,16,0.96))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-300/12 pb-4">
                  <h2 className="text-[2rem] font-black tracking-[0.06em] text-amber-100">
                    排行榜
                  </h2>
                  <div className="rounded-full border border-amber-300/18 bg-amber-500/8 px-4 py-2 text-sm font-semibold text-amber-100/88">
                    {rankingSummaryLabel}
                  </div>
                </div>

                <div className="mt-4 hidden grid-cols-[64px_minmax(220px,1.65fr)_132px_132px_132px_128px_132px] gap-3 px-4 text-sm font-semibold text-amber-100/78 xl:grid">
                  <div>名次</div>
                  <div>玩家</div>
                  <div className="text-center">答對 / 題數</div>
                  <div className="text-center">最大 Combo</div>
                  <div className="text-center">平均答題</div>
                  <div className="text-center">分數</div>
                  <div className="text-center">排名變化</div>
                </div>

                <div className="mt-3 hidden xl:block">
                  <List
                    rowComponent={LeaderboardDesktopRow}
                    rowCount={effectiveLeaderboardRows.length}
                    rowHeight={80}
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

                <div className="mt-3 xl:hidden">
                  <List
                    rowComponent={LeaderboardMobileRow}
                    rowCount={effectiveLeaderboardRows.length}
                    rowHeight={128}
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
                {rankedSettlement.loadingMore && (
                  <div className="mt-2 rounded-full border border-amber-300/14 bg-amber-500/8 px-3 py-2 text-center text-xs font-semibold text-amber-100/82">
                    載入更多排行榜資料...
                  </div>
                )}

                <div className="hidden">
                  {effectiveLeaderboardRows.slice(0, 10).map((row) => (
                    <div
                      key={row.clientId}
                      className={`grid grid-cols-[64px_minmax(220px,1.65fr)_132px_132px_132px_128px_132px] items-center gap-3 rounded-2xl border px-4 py-3 text-sm ${
                        row.isMe
                          ? "border-amber-300/45 bg-amber-500/10 shadow-[inset_0_0_0_1px_rgba(252,211,77,0.08)]"
                          : "border-white/6 bg-white/[0.02]"
                      }`}
                    >
                      <div className="text-lg font-black text-amber-100">{row.rank}</div>
                      <div className="flex min-w-0 items-center gap-3">
                        <PlayerAvatar
                          username={row.username}
                          clientId={row.clientId}
                          avatarUrl={row.avatarUrl}
                          size={38}
                          rank={row.rank}
                          combo={row.combo}
                          isMe={row.isMe}
                          hideRankMark
                          loading="lazy"
                        />
                        <div className="truncate text-base font-semibold text-[var(--mc-text)]">
                          {row.username}
                          {row.isMe ? "（你）" : ""}
                        </div>
                      </div>
                      <div className="text-center text-[var(--mc-text-muted)]">
                        {row.correctCount} / {playedQuestionCount}
                      </div>
                      <div className="text-center font-semibold text-violet-300">
                        x{row.combo}
                      </div>
                      <div className="text-center text-[var(--mc-text-muted)]">
                        {formatSeconds(row.avgCorrectMs)}
                      </div>
                      <div className="text-center text-xl font-black text-amber-100">
                        {formatScore(row.score)}
                      </div>
                      <div className="flex min-w-0 items-center justify-center">
                        <RankChangeBadge value={row.rankChange} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hidden">
                  {effectiveLeaderboardRows.slice(0, 10).map((row) => (
                    <div
                      key={row.clientId}
                      className={`rounded-[24px] border px-4 py-4 ${
                        row.isMe
                          ? "border-amber-300/45 bg-amber-500/10 shadow-[inset_0_0_0_1px_rgba(252,211,77,0.08)]"
                          : "border-white/6 bg-white/[0.02]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="text-xl font-black text-amber-100">
                            #{row.rank}
                          </div>
                          <PlayerAvatar
                            username={row.username}
                            clientId={row.clientId}
                            avatarUrl={row.avatarUrl}
                            size={36}
                            rank={row.rank}
                            combo={row.combo}
                            isMe={row.isMe}
                            hideRankMark
                            loading="lazy"
                          />
                          <div className="min-w-0">
                            <div className="truncate text-base font-semibold text-[var(--mc-text)]">
                              {row.username}
                              {row.isMe ? "（你）" : ""}
                            </div>
                            <div className="mt-1 text-xs text-[var(--mc-text-muted)]">
                              答對 {row.correctCount} / {playedQuestionCount}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-black text-amber-100">
                            {formatScore(row.score)}
                          </div>
                          <div className="mt-1 text-xs text-violet-300">
                            Combo x{row.combo}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 text-xs text-[var(--mc-text-muted)]">
                        平均答題 {formatSeconds(row.avgCorrectMs)}
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            </div>

            <aside className="min-w-0">
              <article className="rounded-[28px] bg-transparent p-0 shadow-none">
                <div className="overflow-hidden rounded-[24px] bg-[linear-gradient(180deg,rgba(24,20,14,0.96),rgba(12,12,14,0.96))]">
                  <div className="h-[196px] w-full overflow-hidden bg-[linear-gradient(145deg,rgba(59,130,246,0.25),rgba(147,51,234,0.18))]">
                    {playlistSummary.thumbnail ? (
                      <img
                        src={playlistSummary.thumbnail}
                        alt={playlistSummary.title}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-amber-100/80">
                        <BarChartRoundedIcon sx={{ fontSize: 34 }} />
                      </div>
                    )}
                  </div>
                  <div className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="truncate text-[1.7rem] font-black tracking-[0.04em] text-amber-100">
                          {playlistSummary.title}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={onToggleFavorite}
                        disabled={!onToggleFavorite}
                        className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border transition disabled:cursor-not-allowed disabled:opacity-40 ${
                          isFavorited
                            ? "border-amber-300/60 bg-amber-500/22 text-amber-300 hover:bg-amber-500/16"
                            : "border-amber-300/30 bg-amber-500/10 text-amber-100 hover:bg-amber-500/16"
                        }`}
                        aria-label={isFavorited ? "移出我的收藏" : "加入我的收藏"}
                        aria-pressed={isFavorited ?? false}
                      >
                        {isFavorited ? <StarRoundedIcon /> : <StarBorderRoundedIcon />}
                      </button>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3 overflow-x-auto rounded-[22px] bg-white/[0.02] px-4 py-4">
                      <div className="flex shrink-0 items-center gap-2 text-sm">
                        <span className="rounded-full border border-emerald-300/35 bg-emerald-500/14 px-3 py-1 text-emerald-100">
                          正確 {answerOverview.correct}
                        </span>
                        <span className="rounded-full border border-rose-300/35 bg-rose-500/14 px-3 py-1 text-rose-100">
                          錯誤 {answerOverview.wrong}
                        </span>
                        <span className="rounded-full border border-slate-500/45 bg-slate-700/40 px-3 py-1 text-slate-100">
                          未作答 {answerOverview.unanswered}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <div className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-xs text-[var(--mc-text-muted)]">
                          共 {questionRows.length} 題
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowWrongOnly((prev) => !prev)}
                          className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                            showWrongOnly
                              ? "border-amber-300/55 bg-amber-500/18 text-amber-100"
                              : "border-white/10 bg-white/[0.03] text-[var(--mc-text-muted)] hover:border-white/20 hover:text-[var(--mc-text)]"
                          }`}
                          aria-pressed={showWrongOnly}
                        >
                          <span
                            className={`inline-flex h-4 w-4 items-center justify-center rounded border ${
                              showWrongOnly
                                ? "border-amber-200 bg-amber-300/20 text-amber-100"
                                : "border-white/20 bg-transparent text-transparent"
                            }`}
                          >
                            <CheckRoundedIcon sx={{ fontSize: 14 }} />
                          </span>
                          僅顯示答錯題目
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div ref={questionListRef} className="mt-4 min-h-0">
                  {filteredQuestionRows.length > 0 && questionListWidth > 0 ? (
                    <List
                      rowComponent={QuestionListRow}
                      rowCount={filteredQuestionRows.length}
                      rowHeight={listRowHeight}
                      rowProps={{ items: filteredQuestionRows }}
                      overscanCount={5}
                      defaultHeight={questionListHeight}
                      style={{ height: questionListHeight, width: "100%" }}
                    />
                  ) : (
                    <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-center text-base text-[var(--mc-text-muted)]">
                      {showWrongOnly ? "這一局沒有答錯題目。" : "目前找不到這次題目結果資料。"}
                    </div>
                  )}
                </div>
              </article>
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
};

export default memo(LeaderboardSettlementShowcase);
