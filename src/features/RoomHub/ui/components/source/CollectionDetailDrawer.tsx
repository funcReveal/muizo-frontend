import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  BarChartRounded,
  ChairRounded,
  ChevronLeftRounded,
  CloseRounded,
  KeyboardArrowDownRounded,
  LoginRounded,
  LockOutlined,
  PlayArrowRounded,
  PublicOutlined,
  PublicRounded,
  QuizRounded,
  StarBorderRounded,
  StarRounded,
  AutoAwesome,
  // TimelineRounded,
} from "@mui/icons-material";
import {
  Button,
  ClickAwayListener,
  Drawer,
  IconButton,
  Popper,
  useMediaQuery,
} from "@mui/material";
import { AnimatePresence, motion } from "motion/react";
import { List, type RowComponentProps } from "react-window";

import { API_URL } from "@domain/room/constants";
import type { RoomCreateSourceMode } from "@domain/room/types";
import type { PlaybackExtensionMode } from "@domain/room/types";
import {
  apiFetchCollectionLeaderboardOverview,
  apiFetchCollectionLeaderboardRankings,
  apiFetchCollectionItemPreview,
  type CollectionLeaderboardEntry,
  type CollectionLeaderboardOverview,
  type CollectionItemPreviewRecord,
} from "@features/CollectionContent/model/collectionContentApi";
import { useAuth } from "@shared/auth/AuthContext";
import { ensureFreshAuthToken } from "@shared/auth/token";
import { useTransientScrollbar } from "@shared/hooks/useTransientScrollbar";
import PlayerAvatar from "@shared/ui/playerAvatar/PlayerAvatar";
import {
  getLeaderboardModeDescription,
  getLeaderboardModeLabel,
  getLeaderboardProfileKey,
  getLeaderboardVariant,
  leaderboardModes,
  leaderboardVariants,
  type LeaderboardModeKey,
  type LeaderboardVariantKey,
  type RoomPlayMode,
} from "../../../model/leaderboardChallengeOptions";
import RoomSetupPanel from "../setup/RoomSetupPanel";
import type {
  CreateSettingsCard,
  SourceSummary,
} from "../../roomsHubViewModels";

type CollectionDetail = {
  id: string;
  title: string;
  description?: string | null;
  visibility?: "private" | "public" | string | null;
  cover_title?: string | null;
  cover_channel_title?: string | null;
  cover_thumbnail_url?: string | null;
  cover_duration_sec?: number | null;
  cover_source_id?: string | null;
  cover_provider?: string | null;
  item_count?: number | null;
  use_count?: number | null;
  favorite_count?: number | null;
  is_favorited?: boolean | null;
  ai_edited_count?: number | null;
  has_ai_edited?: boolean | null;
};

type CollectionDrawerView = "detail" | "leaderboardSetup" | "casualSetup";
type MobileDetailTab = "collection" | "leaderboard";

type CollectionDetailDrawerProps = {
  open: boolean;
  collection: CollectionDetail | null;
  isPublicLibraryTab: boolean;
  isApplying?: boolean;
  isFavoriteUpdating?: boolean;
  onClose: () => void;
  onUseCollection: (collectionId: string) => void | Promise<void>;
  onStartCustomRoom?: (collectionId: string) => void | Promise<void>;
  onStartLeaderboardChallenge?: (collectionId: string) => void | Promise<void>;
  onConfirmCustomRoom?: (collectionId: string) => void | Promise<void>;
  onConfirmLeaderboardChallenge?: (
    collectionId: string,
  ) => void | Promise<void>;
  onToggleFavorite?: () => void | Promise<void | boolean>;
  formatDurationLabel: (value: number) => string | null;
  roomNameInput: string;
  setRoomNameInput: (value: string) => void;
  roomVisibilityInput: "public" | "private";
  setRoomVisibilityInput: (value: "public" | "private") => void;
  roomPasswordInput: string;
  setRoomPasswordInput: (value: string) => void;
  isPinProtectionEnabled: boolean;
  setIsPinProtectionEnabled: (value: boolean) => void;
  pinValidationAttempted?: boolean;
  setRoomMaxPlayersInput: (value: string) => void;
  parsedMaxPlayers: number | null;
  questionCount: number;
  questionMin: number;
  questionMaxLimit: number;
  updateQuestionCount: (value: number) => void;
  roomPlayMode: RoomPlayMode;
  setRoomPlayMode: (value: RoomPlayMode) => void;
  playDurationSec: number;
  revealDurationSec: number;
  startOffsetSec: number;
  allowCollectionClipTiming: boolean;
  updatePlayDurationSec: (value: number) => number;
  updateRevealDurationSec: (value: number) => number;
  updateStartOffsetSec: (value: number) => number;
  updateAllowCollectionClipTiming: (value: boolean) => boolean;
  playbackExtensionMode: PlaybackExtensionMode;
  setPlaybackExtensionMode: (value: PlaybackExtensionMode) => void;
  supportsCollectionClipTiming: boolean;
  selectedCreateSourceSummary: SourceSummary;
  isSourceSummaryLoading: boolean;
  createSettingsCards: CreateSettingsCard[];
  createRequirementsHintText: string | null;
  createRecommendationHintText: string | null;
  canCreateRoom: boolean;
  isCreatingRoom: boolean;
  isCustomRoomStartPending?: boolean;
  isLeaderboardStartPending?: boolean;
  selectedLeaderboardMode: LeaderboardModeKey;
  selectedLeaderboardVariant: LeaderboardVariantKey;
  onLeaderboardSelectionChange: (
    mode: LeaderboardModeKey,
    variant: LeaderboardVariantKey,
  ) => void;
  onLeaderboardModeChange: (value: LeaderboardModeKey) => void;
  onLeaderboardVariantChange: (value: LeaderboardVariantKey) => void;
  isAuthenticated?: boolean;
  isAuthLoading?: boolean;
  onLoginRequired?: () => void;
};

type LeaderboardPreviewPlayer = {
  rank: number | string;
  name: string;
  score: string;
  meta: string;
  duration: string;
  clientId: string;
  avatarUrl?: string | null;
  isCurrentUser?: boolean;
};

const leaderboardPreviewByVariant: Record<
  LeaderboardVariantKey,
  {
    summary: Array<{ label: string; value: string }>;
    players: LeaderboardPreviewPlayer[];
    currentUser: {
      rank: string;
      name: string;
      score: string;
      duration: string;
      hint: string;
    };
  }
> = {
  "30q": {
    summary: [
      { label: "最高分", value: "28,740" },
      { label: "平均命中", value: "91%" },
      { label: "挑戰局數", value: "162" },
    ],
    players: [
      {
        rank: 1,
        name: "Luna",
        score: "28,740",
        meta: "29/30 · 命中 96% · combo 18",
        duration: "06:18",
        clientId: "preview-luna",
      },
      {
        rank: 2,
        name: "Kaito",
        score: "27,920",
        meta: "28/30 · 命中 93% · combo 16",
        duration: "06:42",
        clientId: "preview-kaito",
      },
      {
        rank: 3,
        name: "Mira",
        score: "26,880",
        meta: "28/30 · 命中 93% · combo 14",
        duration: "07:05",
        clientId: "preview-mira",
      },
      {
        rank: 4,
        name: "阿哲",
        score: "25,410",
        meta: "27/30 · 命中 90% · combo 13",
        duration: "07:26",
        clientId: "preview-a-zhe",
      },
      {
        rank: 5,
        name: "Rina",
        score: "24,950",
        meta: "27/30 · 命中 90% · combo 12",
        duration: "07:44",
        clientId: "preview-rina",
      },
      {
        rank: 6,
        name: "你",
        score: "24,120",
        meta: "27/30 · 命中 90% · combo 11",
        duration: "08:03",
        clientId: "preview-you-30q",
        isCurrentUser: true,
      },
    ],
    currentUser: {
      rank: "6",
      name: "你",
      score: "24,120",
      duration: "08:03",
      hint: "27/30 正確，距離第 5 名還差 830 pts。",
    },
  },
  "50q": {
    summary: [
      { label: "最高分", value: "151,200" },
      { label: "平均命中", value: "89%" },
      { label: "挑戰局數", value: "94" },
    ],
    players: [
      {
        rank: 1,
        name: "Aki",
        score: "151,200",
        meta: "47/50 · 命中 94% · combo 26",
        duration: "10:54",
        clientId: "preview-aki",
      },
      {
        rank: 2,
        name: "Mika",
        score: "146,880",
        meta: "46/50 · 命中 92% · combo 24",
        duration: "11:18",
        clientId: "preview-mika-50q",
      },
      {
        rank: 3,
        name: "Sora",
        score: "139,540",
        meta: "44/50 · 命中 88% · combo 21",
        duration: "12:07",
        clientId: "preview-sora",
      },
      {
        rank: 4,
        name: "Rin",
        score: "133,020",
        meta: "43/50 · 命中 86% · combo 19",
        duration: "12:41",
        clientId: "preview-rin",
      },
    ],
    currentUser: {
      rank: "--",
      name: "你",
      score: "--",
      duration: "--",
      hint: "完成一次 50 題排行榜挑戰後，這裡會顯示你的紀錄。",
    },
  },
  "15m": {
    summary: [
      { label: "最高分", value: "132,800" },
      { label: "最高題數", value: "78" },
      { label: "挑戰局數", value: "96" },
    ],
    players: [
      {
        rank: 1,
        name: "Nana",
        score: "132,800",
        meta: "78 題 · 命中 91% · combo 24",
        duration: "15:00",
        clientId: "preview-nana",
      },
      {
        rank: 2,
        name: "Kai",
        score: "128,460",
        meta: "74 題 · 命中 90% · combo 22",
        duration: "15:00",
        clientId: "preview-kai-15m",
      },
      {
        rank: 3,
        name: "Mika",
        score: "124,900",
        meta: "72 題 · 命中 89% · combo 21",
        duration: "15:00",
        clientId: "preview-mika-15m",
      },
      {
        rank: 4,
        name: "Yuki",
        score: "119,320",
        meta: "70 題 · 命中 87% · combo 18",
        duration: "15:00",
        clientId: "preview-yuki",
      },
    ],
    currentUser: {
      rank: "18",
      name: "你",
      score: "92,440",
      duration: "15:00",
      hint: "15 分鐘內完成 61 題，距離前 15 名還差 4,200 pts。",
    },
  },
};

const LeaderboardPlayerRow = ({
  player,
  variant = "list",
}: {
  player: LeaderboardPreviewPlayer;
  variant?: "list" | "current";
}) => {
  const rankLabel =
    typeof player.rank === "number" ? `#${player.rank}` : `#${player.rank}`;
  const isCurrent = Boolean(player.isCurrentUser);

  return (
    <div
      className={`group relative flex min-h-[70px] items-center gap-2.5 overflow-hidden rounded-xl border px-3 py-2.5 transition duration-200 sm:min-h-[68px] sm:gap-3 sm:px-3.5 sm:py-2 ${
        isCurrent
          ? "border-cyan-100/22 bg-[linear-gradient(90deg,rgba(34,211,238,0.1),rgba(15,23,42,0.34)_42%,rgba(15,23,42,0.22))] shadow-[inset_0_1px_0_rgba(255,255,255,0.055),0_16px_34px_-30px_rgba(34,211,238,0.8)]"
          : variant === "current"
            ? "border-cyan-100/16 bg-[linear-gradient(90deg,rgba(34,211,238,0.07),rgba(15,23,42,0.36)_46%,rgba(15,23,42,0.24))] shadow-[inset_0_1px_0_rgba(255,255,255,0.045)]"
            : "border-white/8 bg-[linear-gradient(90deg,rgba(148,163,184,0.045),rgba(15,23,42,0.32)_46%,rgba(15,23,42,0.2))] hover:border-white/12 hover:bg-slate-950/42"
      }`}
    >
      <span
        aria-hidden="true"
        className={`absolute inset-y-3 left-0 w-px ${
          isCurrent || variant === "current"
            ? "bg-cyan-200/45"
            : "bg-slate-500/22 group-hover:bg-slate-300/34"
        }`}
      />
      <span
        className={`w-7 shrink-0 text-left text-[13px] font-semibold tabular-nums tracking-normal sm:w-8 sm:text-sm ${
          isCurrent || variant === "current"
            ? "text-cyan-100"
            : "text-slate-300"
        }`}
      >
        {rankLabel}
      </span>
      <PlayerAvatar
        username={player.name}
        clientId={player.clientId}
        avatarUrl={player.avatarUrl}
        rank={typeof player.rank === "number" ? player.rank : null}
        isMe={isCurrent || variant === "current"}
        size={36}
        effectLevel="simple"
        hideRankMark
      />
      <div className="min-w-0 flex-1">
        <p className="flex min-w-0 items-center gap-2 truncate text-sm font-semibold text-slate-100">
          <span className="truncate">{player.name}</span>
        </p>
        <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] leading-4 text-slate-400 sm:gap-x-2 sm:text-xs">
          <span className="min-w-0 truncate">{player.meta}</span>
          <span className="shrink-0 text-slate-600">/</span>
          <span className="shrink-0 text-slate-300">
            耗時 {player.duration}
          </span>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-[13px] font-semibold tabular-nums text-slate-50 sm:text-sm">
          {player.score}
        </p>
      </div>
    </div>
  );
};

const COLLECTION_PREVIEW_PAGE_SIZE = 12;
const COLLECTION_PREVIEW_ROW_HEIGHT = 68;
const COLLECTION_LEADERBOARD_INITIAL_LIMIT = 10;
const COLLECTION_LEADERBOARD_PAGE_SIZE = 30;
const COLLECTION_LEADERBOARD_ROW_HEIGHT = 80;

const COLLECTION_MOBILE_PREVIEW_VISIBLE_ROWS = 3;
const COLLECTION_DESKTOP_PREVIEW_VISIBLE_ROWS = 4;

const getCollectionPreviewListHeight = (isCompact: boolean) =>
  (isCompact
    ? COLLECTION_MOBILE_PREVIEW_VISIBLE_ROWS
    : COLLECTION_DESKTOP_PREVIEW_VISIBLE_ROWS) * COLLECTION_PREVIEW_ROW_HEIGHT;

const formatLeaderboardScore = (value: number) =>
  new Intl.NumberFormat("en-US").format(value);

const formatLeaderboardEntryMeta = (entry: CollectionLeaderboardEntry) => {
  const accuracy =
    entry.correctCount !== null &&
    entry.questionCount !== null &&
    entry.questionCount > 0
      ? `正確率 ${Math.round((entry.correctCount / entry.questionCount) * 100)}%`
      : null;
  const correct =
    entry.correctCount !== null && entry.questionCount !== null
      ? `${entry.correctCount}/${entry.questionCount}`
      : entry.correctCount !== null
        ? `${entry.correctCount} 題`
        : null;

  return [correct, accuracy, `Combo x${entry.maxCombo}`]
    .filter(Boolean)
    .join(" · ");
};

const toLeaderboardPreviewPlayer = (
  entry: CollectionLeaderboardEntry,
  formatDurationLabel: (value: number) => string | null,
): LeaderboardPreviewPlayer => ({
  rank: entry.rank,
  name: entry.displayName,
  score: formatLeaderboardScore(entry.score),
  meta: formatLeaderboardEntryMeta(entry),
  duration:
    entry.durationSec !== null
      ? (formatDurationLabel(entry.durationSec) ?? `${entry.durationSec}s`)
      : "--",
  clientId: entry.userId ?? `leaderboard-rank-${entry.rank}`,
  avatarUrl: entry.avatarUrl,
  isCurrentUser: entry.isMe,
});

type CollectionPreviewListRowProps = {
  items: CollectionItemPreviewRecord[];
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  formatDurationLabel: (value: number) => string | null;
};

type CollectionLeaderboardListRowProps = {
  items: CollectionLeaderboardEntry[];
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  formatDurationLabel: (value: number) => string | null;
};

const CollectionPreviewLoadingRow = ({ index }: { index: number }) => (
  <div className="flex h-full items-center gap-3 border-b border-white/8 px-2 py-3 last:border-b-0 sm:px-3">
    <div className="h-10 w-16 shrink-0 rounded-lg bg-white/8" />
    <div className="min-w-0 flex-1 space-y-2">
      <div
        className="h-3 rounded-full bg-white/10"
        style={{ width: `${72 - (index % 5) * 7}%` }}
      />
      <div
        className="h-2.5 rounded-full bg-white/6"
        style={{ width: `${40 + (index % 5) * 5}%` }}
      />
    </div>
    <span className="shrink-0 text-xs font-medium text-slate-500">
      #{index + 1}
    </span>
  </div>
);

const CollectionPreviewListRow = ({
  index,
  style,
  items,
  hasMore,
  isLoadingMore,
  onLoadMore,
  formatDurationLabel,
}: RowComponentProps<CollectionPreviewListRowProps>) => {
  const item = items[index];
  const isLoaderRow = !item && (hasMore || isLoadingMore);

  useEffect(() => {
    if (!isLoaderRow || !hasMore || isLoadingMore) return;
    onLoadMore();
  }, [hasMore, isLoaderRow, isLoadingMore, onLoadMore]);

  if (isLoaderRow) {
    return (
      <div style={style}>
        <CollectionPreviewLoadingRow index={index} />
      </div>
    );
  }

  if (!item) return <div style={style} />;

  const thumbnail =
    item.thumbnail_url ||
    (item.provider === "youtube" && item.source_id
      ? `https://i.ytimg.com/vi/${item.source_id}/hqdefault.jpg`
      : "");
  const duration =
    typeof item.duration_sec === "number"
      ? formatDurationLabel(item.duration_sec)
      : null;

  return (
    <div style={style}>
      <div className="flex h-full items-center gap-3 border-b border-white/8 px-2 py-3 last:border-b-0 sm:px-3">
        <div className="h-12 w-[72px] shrink-0 overflow-hidden rounded-lg bg-slate-900/80">
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={item.title || `題目 ${index + 1}`}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-500">
              無封面
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-100">
            {item.title || `題目 ${index + 1}`}
          </p>
          <p className="mt-1 truncate text-xs text-slate-400">
            {item.channel_title || "未知上傳者"}
            {duration ? ` · ${duration}` : ""}
          </p>
        </div>
        <span className="hidden shrink-0 text-xs font-medium text-cyan-100/70 sm:inline">
          #{index + 1}
        </span>
      </div>
    </div>
  );
};

const CollectionLeaderboardListRow = ({
  index,
  style,
  items,
  hasMore,
  isLoadingMore,
  onLoadMore,
  formatDurationLabel,
}: RowComponentProps<CollectionLeaderboardListRowProps>) => {
  const item = items[index];
  const isLoaderRow = !item && (hasMore || isLoadingMore);

  useEffect(() => {
    if (!isLoaderRow || !hasMore || isLoadingMore) return;
    onLoadMore();
  }, [hasMore, isLoaderRow, isLoadingMore, onLoadMore]);

  if (isLoaderRow) {
    return (
      <div style={style} className="box-border pb-2 sm:pb-1.5">
        <div className="flex h-full items-center gap-3 rounded-xl border border-white/8 bg-slate-950/30 px-3 py-3">
          <div className="h-4 w-8 rounded-full bg-white/8" />
          <div className="h-9 w-9 rounded-full bg-white/8" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-1/2 rounded-full bg-white/10" />
            <div className="h-2.5 w-2/3 rounded-full bg-white/6" />
          </div>
          <div className="h-3 w-12 rounded-full bg-white/8" />
        </div>
      </div>
    );
  }

  if (!item) return <div style={style} />;

  return (
    <div style={style} className="box-border pb-2 sm:pb-1.5">
      <LeaderboardPlayerRow
        player={toLeaderboardPreviewPlayer(item, formatDurationLabel)}
      />
    </div>
  );
};

const CollectionDetailDrawer = ({
  open,
  collection,
  isApplying = false,
  isFavoriteUpdating = false,
  onClose,
  onUseCollection,
  onStartCustomRoom,
  onStartLeaderboardChallenge,
  onConfirmCustomRoom,
  onConfirmLeaderboardChallenge,
  onToggleFavorite,
  formatDurationLabel,
  roomNameInput,
  setRoomNameInput,
  roomVisibilityInput,
  setRoomVisibilityInput,
  roomPasswordInput,
  setRoomPasswordInput,
  isPinProtectionEnabled,
  setIsPinProtectionEnabled,
  pinValidationAttempted = false,
  setRoomMaxPlayersInput,
  parsedMaxPlayers,
  questionCount,
  questionMin,
  questionMaxLimit,
  updateQuestionCount,
  roomPlayMode,
  setRoomPlayMode,
  playDurationSec,
  revealDurationSec,
  startOffsetSec,
  allowCollectionClipTiming,
  updatePlayDurationSec,
  updateRevealDurationSec,
  updateStartOffsetSec,
  updateAllowCollectionClipTiming,
  playbackExtensionMode,
  setPlaybackExtensionMode,
  supportsCollectionClipTiming,
  selectedCreateSourceSummary,
  isSourceSummaryLoading,
  createSettingsCards,
  createRequirementsHintText,
  createRecommendationHintText,
  canCreateRoom,
  isCreatingRoom,
  isCustomRoomStartPending = false,
  isLeaderboardStartPending = false,
  selectedLeaderboardMode,
  selectedLeaderboardVariant,
  onLeaderboardSelectionChange,
  onLeaderboardModeChange,
  onLeaderboardVariantChange,
  isAuthenticated = false,
  isAuthLoading = false,
  onLoginRequired,
}: CollectionDetailDrawerProps) => {
  const { authToken, refreshAuthToken } = useAuth();
  const isCompact = useMediaQuery("(max-width:767px)");
  const authTokenRef = useRef(authToken);
  const refreshAuthTokenRef = useRef(refreshAuthToken);
  const [previewItems, setPreviewItems] = useState<
    CollectionItemPreviewRecord[]
  >([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewLoadingMore, setPreviewLoadingMore] = useState(false);
  const [previewPage, setPreviewPage] = useState(1);
  const [previewHasMore, setPreviewHasMore] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const previewRequestIdRef = useRef(0);
  const [leaderboardOverview, setLeaderboardOverview] =
    useState<CollectionLeaderboardOverview | null>(null);
  const [leaderboardEntries, setLeaderboardEntries] = useState<
    CollectionLeaderboardEntry[]
  >([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardLoadingMore, setLeaderboardLoadingMore] = useState(false);
  const [leaderboardHasMore, setLeaderboardHasMore] = useState(false);
  const [leaderboardNextOffset, setLeaderboardNextOffset] = useState<
    number | null
  >(null);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const leaderboardRequestIdRef = useRef(0);
  const {
    transientScrollbarClassName: previewScrollbarClassName,
    revealScrollbar: revealPreviewScrollbar,
  } = useTransientScrollbar();
  const {
    transientScrollbarClassName: leaderboardScrollbarClassName,
    revealScrollbar: revealLeaderboardScrollbar,
  } = useTransientScrollbar();
  const previewThumbnail =
    collection?.cover_thumbnail_url ||
    (collection?.cover_provider === "youtube" && collection.cover_source_id
      ? `https://i.ytimg.com/vi/${collection.cover_source_id}/hqdefault.jpg`
      : "");
  const isPublic = (collection?.visibility ?? "private") === "public";
  const canStartLeaderboardChallenge = isPublic && isAuthenticated;
  const isFavorited = Boolean(collection?.is_favorited);
  const [drawerView, setDrawerView] = useState<CollectionDrawerView>("detail");
  const [mobileDetailTab, setMobileDetailTab] =
    useState<MobileDetailTab>("collection");
  const [isLeaderboardProfileMenuOpen, setIsLeaderboardProfileMenuOpen] =
    useState(false);
  const [leaderboardProfileAnchorEl, setLeaderboardProfileAnchorEl] =
    useState<HTMLDivElement | null>(null);
  const leaderboardProfileMenuRef = useRef<HTMLDivElement | null>(null);
  const isLeaderboardSetupView = drawerView === "leaderboardSetup" && isPublic;
  const isCasualSetupView = drawerView === "casualSetup";
  const isSetupView = isLeaderboardSetupView || isCasualSetupView;
  const isSetupLeaderboardMode =
    isSetupView && isPublic && roomPlayMode === "leaderboard";
  const setupRoomCreateSourceMode: RoomCreateSourceMode = isPublic
    ? "publicCollection"
    : "privateCollection";
  const setupSupportsCollectionClipTiming = isSetupView
    ? true
    : supportsCollectionClipTiming;
  const activeLeaderboardVariant = getLeaderboardVariant(
    selectedLeaderboardMode,
    selectedLeaderboardVariant,
  );
  const activeLeaderboardProfileKey = getLeaderboardProfileKey(
    selectedLeaderboardMode,
    selectedLeaderboardVariant,
  );
  const activeLeaderboardData =
    leaderboardPreviewByVariant[activeLeaderboardVariant.key];
  const activeLeaderboardEntries = leaderboardEntries;
  const activeLeaderboardMyBestEntry =
    leaderboardOverview?.activeProfile.profile.profileKey ===
    activeLeaderboardProfileKey
      ? leaderboardOverview.activeProfile.myBestEntry
      : null;
  const activeLeaderboardModeLabel = getLeaderboardModeLabel(
    selectedLeaderboardMode,
  );
  const activeLeaderboardModeDescription = getLeaderboardModeDescription(
    selectedLeaderboardMode,
  );
  const leaderboardChallengeGroups = leaderboardModes.map((mode) => ({
    modeKey: mode.key,
    label: mode.label,
    options: leaderboardVariants[mode.key].map((variant) => ({
      modeKey: mode.key,
      variantKey: variant.key,
      label: variant.label,
    })),
  }));
  const leaderboardChallengeOptions = leaderboardChallengeGroups.flatMap(
    (group) => group.options,
  );
  const activeLeaderboardOption =
    leaderboardChallengeOptions.find(
      (option) => option.variantKey === selectedLeaderboardVariant,
    ) ?? leaderboardChallengeOptions[0];
  const formatLeaderboardBestRank = (
    modeKey: LeaderboardModeKey,
    variantKey: LeaderboardVariantKey,
  ) => {
    const profileKey = getLeaderboardProfileKey(modeKey, variantKey);
    const rank = profileKey
      ? leaderboardOverview?.profiles.find(
          (profile) => profile.profileKey === profileKey,
        )?.myBestRank
      : null;
    if (leaderboardOverview) return rank ? `最佳 #${rank}` : "尚無紀錄";
    return leaderboardLoading ? "讀取中" : "尚無紀錄";
  };
  const leaderboardProfileMenuWidth = leaderboardProfileAnchorEl
    ? leaderboardProfileAnchorEl.clientWidth
    : 280;
  const currentLeaderboardPlayer = activeLeaderboardMyBestEntry
    ? toLeaderboardPreviewPlayer(
        activeLeaderboardMyBestEntry,
        formatDurationLabel,
      )
    : null;
  const currentLeaderboardRecord: LeaderboardPreviewPlayer =
    currentLeaderboardPlayer ?? {
      rank: activeLeaderboardData.currentUser.rank,
      name: activeLeaderboardData.currentUser.name,
      score: activeLeaderboardData.currentUser.score,
      meta: activeLeaderboardData.currentUser.hint,
      duration: activeLeaderboardData.currentUser.duration,
      clientId: `preview-you-${activeLeaderboardVariant.key}`,
      isCurrentUser: true,
    };
  const leaderboardPlayersToShow = activeLeaderboardEntries.map((entry) =>
    toLeaderboardPreviewPlayer(entry, formatDurationLabel),
  );
  const isPreparingLeaderboardChallenge =
    isLeaderboardStartPending || isApplying || isCreatingRoom;
  const isPreparingCustomRoom =
    isCustomRoomStartPending || isApplying || isCreatingRoom;
  const isPreparingSetup = isSetupLeaderboardMode
    ? isPreparingLeaderboardChallenge
    : isPreparingCustomRoom;
  const leaderboardStartLabel = isCreatingRoom
    ? "建立房間中..."
    : isApplying || isLeaderboardStartPending
      ? "載入題庫中..."
      : "開始挑戰";
  const leaderboardEntryLabel = !isAuthenticated
    ? isAuthLoading
      ? "確認登入中..."
      : "登入後挑戰"
    : isPreparingLeaderboardChallenge
      ? leaderboardStartLabel
      : "進行排行挑戰";
  const customRoomStartLabel = isCreatingRoom
    ? "建立房間中..."
    : isApplying || isCustomRoomStartPending
      ? "載入題庫中..."
      : "建立休閒房";
  const stats: Array<{
    key: string;
    label: string;
    value: string;
    icon: ReactNode;
  }> = [
    {
      key: "questions",
      label: "題數",
      value:
        typeof collection?.item_count === "number"
          ? `${Math.max(0, collection.item_count)} 題`
          : "未提供",
      icon: <QuizRounded sx={{ fontSize: 19 }} />,
    },
    {
      key: "plays",
      label: "使用",
      value:
        typeof collection?.use_count === "number"
          ? `${Math.max(0, collection.use_count)} 次`
          : "尚無資料",
      icon: <BarChartRounded sx={{ fontSize: 20 }} />,
    },
    {
      key: "favorites",
      label: "收藏",
      value:
        typeof collection?.favorite_count === "number"
          ? `${Math.max(0, collection.favorite_count)}`
          : "尚無資料",
      icon: isFavorited ? (
        <StarRounded sx={{ fontSize: 19 }} />
      ) : (
        <StarBorderRounded sx={{ fontSize: 19 }} />
      ),
    },
  ];
  const setupSourceSummary: SourceSummary = collection
    ? {
        label: isPublic ? "公開收藏庫" : "私人收藏庫",
        title: collection.title,
        detail:
          typeof collection.item_count === "number"
            ? `${Math.max(0, collection.item_count)} 題`
            : "題數未提供",
        thumbnail: previewThumbnail,
      }
    : selectedCreateSourceSummary;

  const handleStartCustomRoom = () => {
    if (!collection) return;
    setRoomPlayMode("casual");
    setDrawerView("casualSetup");
  };

  const handleStartLeaderboardChallenge = () => {
    if (!collection) return;
    if (!isPublic) return;
    if (!isAuthenticated) {
      onLoginRequired?.();
      return;
    }
    setRoomPlayMode("leaderboard");
    setDrawerView("leaderboardSetup");
  };

  const handleConfirmLeaderboardChallenge = () => {
    if (!collection) return;
    if (!isPublic) return;
    if (!isAuthenticated) {
      onLoginRequired?.();
      return;
    }
    void (
      onConfirmLeaderboardChallenge ??
      onStartLeaderboardChallenge ??
      onUseCollection
    )(collection.id);
  };

  const handleConfirmCustomRoom = () => {
    if (!collection) return;
    void (onConfirmCustomRoom ?? onStartCustomRoom ?? onUseCollection)(
      collection.id,
    );
  };

  const handleLeaderboardProfileCardClick = () => {
    if (!isPublic) return;
    setIsLeaderboardProfileMenuOpen((current) => !current);
  };

  const handleLeaderboardProfileCardKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
  ) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    handleLeaderboardProfileCardClick();
  };

  const handleLeaderboardProfileSelect = (
    modeKey: LeaderboardModeKey,
    variantKey: LeaderboardVariantKey,
  ) => {
    if (selectedLeaderboardMode !== modeKey) {
      onLeaderboardModeChange(modeKey);
    }
    onLeaderboardVariantChange(variantKey);
    setIsLeaderboardProfileMenuOpen(false);
  };

  useEffect(() => {
    authTokenRef.current = authToken;
    refreshAuthTokenRef.current = refreshAuthToken;
  }, [authToken, refreshAuthToken]);

  useEffect(() => {
    if (!isLeaderboardProfileMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (leaderboardProfileAnchorEl?.contains(target)) return;
      if (leaderboardProfileMenuRef.current?.contains(target)) return;
      setIsLeaderboardProfileMenuOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [isLeaderboardProfileMenuOpen, leaderboardProfileAnchorEl]);

  const fetchPreviewPage = useCallback(
    async (page: number, mode: "replace" | "append") => {
      if (!collection?.id || !API_URL) return;

      const requestId = previewRequestIdRef.current + 1;
      previewRequestIdRef.current = requestId;
      if (mode === "append") {
        setPreviewLoadingMore(true);
      } else {
        setPreviewLoading(true);
        setPreviewItems([]);
      }
      setPreviewError(null);

      try {
        const token = await ensureFreshAuthToken({
          token: authTokenRef.current,
          refreshAuthToken: refreshAuthTokenRef.current,
          leewayMs: 60_000,
        });
        const result = await apiFetchCollectionItemPreview(
          API_URL,
          token,
          collection.id,
          {
            page,
            pageSize: COLLECTION_PREVIEW_PAGE_SIZE,
          },
        );
        if (requestId !== previewRequestIdRef.current) return;
        if (!result.ok) {
          const message =
            typeof result.payload?.error === "string"
              ? result.payload.error
              : "題庫內容預覽載入失敗";
          setPreviewError(message);
          if (mode === "replace") {
            setPreviewItems([]);
          }
          return;
        }

        const data = result.payload?.data;
        const nextItems = data?.items ?? [];
        setPreviewItems((currentItems) => {
          if (mode === "replace") return nextItems;
          const existingIds = new Set(currentItems.map((item) => item.id));
          return [
            ...currentItems,
            ...nextItems.filter((item) => !existingIds.has(item.id)),
          ];
        });
        setPreviewPage(data?.page ?? page);
        setPreviewHasMore(Boolean(data?.hasMore));
      } catch (error) {
        if (requestId !== previewRequestIdRef.current) return;
        setPreviewError(
          error instanceof Error ? error.message : "題庫內容預覽載入失敗",
        );
        if (mode === "replace") {
          setPreviewItems([]);
        }
      } finally {
        if (requestId === previewRequestIdRef.current) {
          setPreviewLoading(false);
          setPreviewLoadingMore(false);
        }
      }
    },
    [collection?.id],
  );

  const handleLoadMorePreviewItems = useCallback(() => {
    if (previewLoading || previewLoadingMore || !previewHasMore) return;
    void fetchPreviewPage(previewPage + 1, "append");
  }, [
    fetchPreviewPage,
    previewHasMore,
    previewLoading,
    previewLoadingMore,
    previewPage,
  ]);

  const previewRowCount =
    previewItems.length + (previewHasMore || previewLoadingMore ? 1 : 0);
  const previewListHeight = isCompact
    ? getCollectionPreviewListHeight(true)
    : Math.min(
        430,
        Math.max(
          180,
          Math.min(
            previewRowCount || COLLECTION_DESKTOP_PREVIEW_VISIBLE_ROWS,
            COLLECTION_DESKTOP_PREVIEW_VISIBLE_ROWS,
          ) * COLLECTION_PREVIEW_ROW_HEIGHT,
        ),
      );
  const previewListRowProps = useMemo<CollectionPreviewListRowProps>(
    () => ({
      items: previewItems,
      hasMore: previewHasMore,
      isLoadingMore: previewLoadingMore,
      onLoadMore: handleLoadMorePreviewItems,
      formatDurationLabel,
    }),
    [
      formatDurationLabel,
      handleLoadMorePreviewItems,
      previewHasMore,
      previewItems,
      previewLoadingMore,
    ],
  );

  const handlePreviewListScroll = useCallback(() => {
    revealPreviewScrollbar();
  }, [revealPreviewScrollbar]);

  const fetchLeaderboardOverview = useCallback(async () => {
    if (!collection?.id || !API_URL || !isPublic) return;

    const requestId = leaderboardRequestIdRef.current + 1;
    leaderboardRequestIdRef.current = requestId;
    setLeaderboardLoading(true);
    setLeaderboardLoadingMore(false);
    setLeaderboardError(null);
    setLeaderboardOverview(null);
    setLeaderboardEntries([]);
    setLeaderboardHasMore(false);
    setLeaderboardNextOffset(null);

    try {
      const token = await ensureFreshAuthToken({
        token: authTokenRef.current,
        refreshAuthToken: refreshAuthTokenRef.current,
        leewayMs: 60_000,
      });
      const result = await apiFetchCollectionLeaderboardOverview(
        API_URL,
        token,
        collection.id,
        {
          profileKey: activeLeaderboardProfileKey,
          limit: COLLECTION_LEADERBOARD_INITIAL_LIMIT,
        },
      );
      if (requestId !== leaderboardRequestIdRef.current) return;
      if (!result.ok || !result.payload?.data) {
        setLeaderboardError(result.payload?.error ?? "排行榜資料載入失敗");
        return;
      }

      const data = result.payload.data;
      setLeaderboardOverview(data);
      setLeaderboardEntries(data.activeProfile.items);
      setLeaderboardHasMore(data.activeProfile.hasMore);
      setLeaderboardNextOffset(data.activeProfile.nextOffset);
    } catch (error) {
      if (requestId !== leaderboardRequestIdRef.current) return;
      setLeaderboardError(
        error instanceof Error ? error.message : "排行榜資料載入失敗",
      );
    } finally {
      if (requestId === leaderboardRequestIdRef.current) {
        setLeaderboardLoading(false);
      }
    }
  }, [activeLeaderboardProfileKey, collection?.id, isPublic]);

  const handleLoadMoreLeaderboardEntries = useCallback(async () => {
    if (
      !collection?.id ||
      !API_URL ||
      !leaderboardHasMore ||
      leaderboardLoadingMore ||
      leaderboardNextOffset === null
    ) {
      return;
    }

    const requestId = leaderboardRequestIdRef.current + 1;
    leaderboardRequestIdRef.current = requestId;
    setLeaderboardLoadingMore(true);
    setLeaderboardError(null);

    try {
      const token = await ensureFreshAuthToken({
        token: authTokenRef.current,
        refreshAuthToken: refreshAuthTokenRef.current,
        leewayMs: 60_000,
      });
      const result = await apiFetchCollectionLeaderboardRankings(
        API_URL,
        token,
        collection.id,
        {
          profileKey: activeLeaderboardProfileKey,
          limit: COLLECTION_LEADERBOARD_PAGE_SIZE,
          offset: leaderboardNextOffset,
        },
      );
      if (requestId !== leaderboardRequestIdRef.current) return;
      if (!result.ok || !result.payload?.data) {
        setLeaderboardError(result.payload?.error ?? "排行榜資料載入失敗");
        return;
      }

      const data = result.payload.data;
      setLeaderboardEntries((currentItems) => {
        const existingKeys = new Set(
          currentItems.map((item) => `${item.rank}:${item.userId ?? ""}`),
        );
        return [
          ...currentItems,
          ...data.items.filter(
            (item) => !existingKeys.has(`${item.rank}:${item.userId ?? ""}`),
          ),
        ];
      });
      setLeaderboardHasMore(data.hasMore);
      setLeaderboardNextOffset(data.nextOffset);
    } catch (error) {
      if (requestId !== leaderboardRequestIdRef.current) return;
      setLeaderboardError(
        error instanceof Error ? error.message : "排行榜資料載入失敗",
      );
    } finally {
      if (requestId === leaderboardRequestIdRef.current) {
        setLeaderboardLoadingMore(false);
      }
    }
  }, [
    activeLeaderboardProfileKey,
    collection?.id,
    leaderboardHasMore,
    leaderboardLoadingMore,
    leaderboardNextOffset,
  ]);

  const leaderboardRowCount =
    leaderboardEntries.length +
    (leaderboardHasMore || leaderboardLoadingMore ? 1 : 0);
  const leaderboardListRowProps = useMemo<CollectionLeaderboardListRowProps>(
    () => ({
      items: leaderboardEntries,
      hasMore: leaderboardHasMore,
      isLoadingMore: leaderboardLoadingMore,
      onLoadMore: handleLoadMoreLeaderboardEntries,
      formatDurationLabel,
    }),
    [
      formatDurationLabel,
      handleLoadMoreLeaderboardEntries,
      leaderboardEntries,
      leaderboardHasMore,
      leaderboardLoadingMore,
    ],
  );

  useEffect(() => {
    if (!open || !collection?.id || !API_URL) {
      setPreviewItems([]);
      setPreviewError(null);
      setPreviewLoading(false);
      setPreviewLoadingMore(false);
      setPreviewPage(1);
      setPreviewHasMore(false);
      return;
    }

    setPreviewPage(1);
    setPreviewHasMore(false);
    void fetchPreviewPage(1, "replace");

    return () => {
      previewRequestIdRef.current += 1;
    };
  }, [collection?.id, fetchPreviewPage, open]);

  useEffect(() => {
    if (!open || !collection?.id || !isPublic) {
      setLeaderboardOverview(null);
      setLeaderboardEntries([]);
      setLeaderboardError(null);
      setLeaderboardLoading(false);
      setLeaderboardLoadingMore(false);
      setLeaderboardHasMore(false);
      setLeaderboardNextOffset(null);
      leaderboardRequestIdRef.current += 1;
      return;
    }

    void fetchLeaderboardOverview();

    return () => {
      leaderboardRequestIdRef.current += 1;
    };
  }, [collection?.id, fetchLeaderboardOverview, isPublic, open]);

  useEffect(() => {
    setDrawerView("detail");
    setMobileDetailTab("collection");
    setIsLeaderboardProfileMenuOpen(false);
  }, [collection?.id, open]);

  useEffect(() => {
    const variants = leaderboardVariants[selectedLeaderboardMode];
    if (
      !variants.some((variant) => variant.key === selectedLeaderboardVariant)
    ) {
      onLeaderboardVariantChange(variants[0].key);
    }
  }, [
    onLeaderboardVariantChange,
    selectedLeaderboardMode,
    selectedLeaderboardVariant,
  ]);

  return (
    <Drawer
      anchor={isCompact ? "bottom" : "right"}
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            width: isCompact ? "100%" : "min(1180px, 94vw)",
            height: isCompact ? "100dvh" : "100%",
            maxHeight: "100dvh",
            borderTopLeftRadius: isCompact ? 0 : 24,
            borderBottomLeftRadius: isCompact ? 0 : 24,
            background:
              "radial-gradient(circle at 18% 0%, rgba(34,211,238,0.16), transparent 34%), radial-gradient(circle at 100% 14%, rgba(251,191,36,0.1), transparent 32%), linear-gradient(180deg, rgba(8,15,28,0.99), rgba(2,6,23,0.99))",
            borderLeft: isCompact ? 0 : "1px solid rgba(103,232,249,0.18)",
            color: "var(--mc-text)",
            boxShadow: "0 24px 70px rgba(2,6,23,0.72)",
            overflow: "hidden",
          },
        },
      }}
    >
      <div className="flex h-full min-h-0 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-cyan-300/12 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            {isSetupView ? (
              <IconButton
                aria-label="返回題庫詳情"
                onClick={() => setDrawerView("detail")}
                className="!text-slate-100 hover:!bg-white/8"
              >
                <ChevronLeftRounded />
              </IconButton>
            ) : null}
            <div className="min-w-0">
              <h2 className="mt-1 truncate text-lg font-semibold text-slate-50 sm:text-xl">
                {isSetupLeaderboardMode
                  ? "排行挑戰設定"
                  : isSetupView
                    ? "休閒房設定"
                    : (collection?.title ?? "收藏庫")}
              </h2>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden text-xs font-medium text-slate-400 sm:inline">
              Esc 關閉
            </span>
            <IconButton
              aria-label="關閉題庫詳情，或按 Esc"
              onClick={onClose}
              className="!text-slate-100 hover:!bg-white/8"
            >
              <CloseRounded />
            </IconButton>
          </div>
        </header>

        {collection ? (
          isSetupView ? (
            <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] overflow-hidden md:grid-cols-[240px_minmax(0,1fr)] md:grid-rows-none">
              <aside className="border-b border-cyan-300/12 bg-slate-950/30 px-4 py-3 md:border-b-0 md:border-r md:px-5 md:py-5">
                <div className="flex min-w-0 items-center gap-3 md:block">
                  <div className="h-14 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-900/80 md:h-auto md:w-full md:aspect-[16/9]">
                    {previewThumbnail ? (
                      <img
                        src={previewThumbnail}
                        alt={collection.cover_title ?? collection.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">
                        無封面
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 md:mt-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-slate-950/40 px-2 py-0.5 text-[11px] font-medium text-slate-300">
                      {isPublic ? (
                        <PublicOutlined sx={{ fontSize: 13 }} />
                      ) : (
                        <LockOutlined sx={{ fontSize: 13 }} />
                      )}
                      {isPublic ? "公開收藏庫" : "私人收藏庫"}
                    </span>
                    <p className="mt-2 line-clamp-2 text-sm font-semibold leading-5 text-slate-50">
                      {collection.title}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {typeof collection.item_count === "number"
                        ? `${Math.max(0, collection.item_count)} 題`
                        : "題數未提供"}
                    </p>
                  </div>
                </div>
              </aside>

              <main className="min-h-0 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
                <RoomSetupPanel
                  roomNameInput={roomNameInput}
                  setRoomNameInput={setRoomNameInput}
                  roomVisibilityInput={roomVisibilityInput}
                  setRoomVisibilityInput={setRoomVisibilityInput}
                  roomPasswordInput={roomPasswordInput}
                  setRoomPasswordInput={setRoomPasswordInput}
                  isPinProtectionEnabled={isPinProtectionEnabled}
                  setIsPinProtectionEnabled={setIsPinProtectionEnabled}
                  pinValidationAttempted={pinValidationAttempted}
                  setRoomMaxPlayersInput={setRoomMaxPlayersInput}
                  parsedMaxPlayers={parsedMaxPlayers}
                  questionCount={questionCount}
                  questionMin={questionMin}
                  questionMaxLimit={questionMaxLimit}
                  updateQuestionCount={updateQuestionCount}
                  roomPlayMode={roomPlayMode}
                  setRoomPlayMode={setRoomPlayMode}
                  roomCreateSourceMode={setupRoomCreateSourceMode}
                  selectedLeaderboardMode={selectedLeaderboardMode}
                  selectedLeaderboardVariant={selectedLeaderboardVariant}
                  onLeaderboardSelectionChange={onLeaderboardSelectionChange}
                  isAuthenticated={isAuthenticated}
                  isAuthLoading={isAuthLoading}
                  onLoginRequired={onLoginRequired}
                  playDurationSec={playDurationSec}
                  revealDurationSec={revealDurationSec}
                  startOffsetSec={startOffsetSec}
                  allowCollectionClipTiming={allowCollectionClipTiming}
                  updatePlayDurationSec={updatePlayDurationSec}
                  updateRevealDurationSec={updateRevealDurationSec}
                  updateStartOffsetSec={updateStartOffsetSec}
                  updateAllowCollectionClipTiming={
                    updateAllowCollectionClipTiming
                  }
                  playbackExtensionMode={playbackExtensionMode}
                  setPlaybackExtensionMode={setPlaybackExtensionMode}
                  supportsCollectionClipTiming={
                    setupSupportsCollectionClipTiming
                  }
                  selectedCreateSourceSummary={setupSourceSummary}
                  isSourceSummaryLoading={isSourceSummaryLoading}
                  createSettingsCards={createSettingsCards}
                  createRequirementsHintText={createRequirementsHintText}
                  createRecommendationHintText={createRecommendationHintText}
                  canCreateRoom={canCreateRoom}
                  isCreatingRoom={isCreatingRoom}
                  onCreateRoom={
                    isSetupLeaderboardMode
                      ? handleConfirmLeaderboardChallenge
                      : handleConfirmCustomRoom
                  }
                />
              </main>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden md:grid md:grid-cols-[minmax(360px,0.82fr)_minmax(420px,1.18fr)] md:grid-rows-none md:gap-0">
              {isCompact ? (
                <div
                  role="tablist"
                  aria-label="收藏庫詳情分頁"
                  className="shrink-0 px-3 pt-3"
                >
                  <div className="grid h-11 grid-cols-2 overflow-hidden rounded-2xl border border-cyan-100/14 bg-slate-950/42 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.045)]">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={mobileDetailTab === "collection"}
                      onClick={() => {
                        setMobileDetailTab("collection");
                        setIsLeaderboardProfileMenuOpen(false);
                      }}
                      className={`inline-flex h-full items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition ${
                        mobileDetailTab === "collection"
                          ? "bg-cyan-200/12 text-cyan-50 shadow-[0_10px_24px_-18px_rgba(34,211,238,0.85)]"
                          : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-100"
                      }`}
                    >
                      <QuizRounded sx={{ fontSize: 18 }} />
                      收藏庫
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={mobileDetailTab === "leaderboard"}
                      onClick={() => setMobileDetailTab("leaderboard")}
                      className={`inline-flex h-full items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition ${
                        mobileDetailTab === "leaderboard"
                          ? "bg-cyan-200/12 text-cyan-50 shadow-[0_10px_24px_-18px_rgba(34,211,238,0.85)]"
                          : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-100"
                      }`}
                    >
                      <PublicRounded sx={{ fontSize: 18 }} />
                      排行榜
                    </button>
                  </div>
                </div>
              ) : null}

              <main
                className={`flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-3 py-2.5 sm:px-6 sm:py-5 md:overflow-y-auto ${
                  isCompact && mobileDetailTab !== "collection" ? "hidden" : ""
                }`}
              >
                <section className="shrink-0 overflow-hidden rounded-[20px] border border-cyan-300/14 bg-slate-950/44 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:rounded-[22px]">
                  <div className="relative h-28 overflow-hidden bg-slate-900/80 sm:h-32 md:h-auto md:aspect-[16/5] md:min-h-32">
                    {previewThumbnail ? (
                      <img
                        src={previewThumbnail}
                        alt={collection.cover_title ?? collection.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
                        無封面
                      </div>
                    )}
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.08)_0%,rgba(2,6,23,0.18)_42%,rgba(2,6,23,0.88)_100%)]" />
                    <div className="absolute bottom-2.5 left-3 right-3 sm:bottom-3 sm:left-4 sm:right-4">
                      <div className="mb-1.5 flex flex-wrap gap-1.5 sm:mb-2 sm:gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-slate-950/56 px-2 py-0.5 text-[11px] font-medium text-slate-100 backdrop-blur sm:px-2.5 sm:py-1 sm:text-xs">
                          {isPublic ? (
                            <PublicOutlined sx={{ fontSize: 14 }} />
                          ) : (
                            <LockOutlined sx={{ fontSize: 14 }} />
                          )}
                          {isPublic ? "公開收藏庫" : "私人收藏庫"}
                        </span>
                        {/* {collection.has_ai_edited ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-200/16 bg-teal-400/10 px-2.5 py-1 text-xs font-medium text-teal-100">
                          <TimelineRounded sx={{ fontSize: 14 }} />
                          已調整片段
                        </span>
                      ) : null} */}
                      </div>
                      <p className="line-clamp-1 text-base font-semibold leading-tight text-white sm:line-clamp-2 sm:text-2xl">
                        {collection.title}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 border-b border-white/8 px-2.5 py-2 sm:flex sm:flex-wrap sm:gap-x-4 sm:gap-y-2 sm:px-4 sm:py-2.5">
                    {stats.map((item) => (
                      <div
                        key={item.key}
                        className="flex min-w-0 items-center gap-1.5 rounded-xl border border-white/8 bg-white/[0.03] px-2 py-1.5 text-xs sm:gap-2 sm:px-2.5 sm:py-2 sm:text-sm"
                      >
                        <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-cyan-300/8 text-cyan-100 sm:h-6 sm:w-6">
                          {item.icon}
                        </span>
                        <span className="hidden shrink-0 text-[11px] text-slate-400 sm:inline sm:text-xs">
                          {item.label}
                        </span>
                        <span className="truncate font-semibold text-slate-50">
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="px-3 py-2 sm:px-4 sm:py-3">
                    <p
                      className={`line-clamp-2 whitespace-pre-wrap text-xs leading-5 sm:text-sm sm:leading-6 md:line-clamp-none ${
                        collection.description
                          ? "text-slate-300"
                          : "text-slate-500"
                      }`}
                    >
                      {collection.description || "題庫未提供說明。"}
                    </p>
                  </div>
                </section>

                <section className="min-h-0 flex-1 px-0.5 sm:mt-1 sm:px-1">
                  <div className="h-full min-h-0 overflow-hidden rounded-xl bg-slate-950/22">
                    {previewLoading ? (
                      <div>
                        {Array.from({ length: isCompact ? 3 : 5 }).map(
                          (_, index) => (
                            <CollectionPreviewLoadingRow
                              key={`collection-preview-loading-${index}`}
                              index={index}
                            />
                          ),
                        )}
                      </div>
                    ) : previewError ? (
                      <div className="px-2 py-6 text-sm text-rose-200 sm:px-3">
                        {previewError}
                      </div>
                    ) : previewItems.length === 0 ? (
                      <div className="px-2 py-6 text-sm text-slate-400 sm:px-3">
                        這個題庫目前沒有可預覽的題目。
                      </div>
                    ) : (
                      <List<CollectionPreviewListRowProps>
                        className={`transient-scrollbar ${previewScrollbarClassName}`}
                        style={{
                          height: previewListHeight,
                          width: "100%",
                        }}
                        rowCount={previewRowCount}
                        rowHeight={COLLECTION_PREVIEW_ROW_HEIGHT}
                        rowProps={previewListRowProps}
                        rowComponent={CollectionPreviewListRow}
                        onScroll={handlePreviewListScroll}
                      />
                    )}
                  </div>
                </section>
              </main>

              <aside
                className={`min-h-0 flex-1 overflow-hidden border-t border-cyan-300/12 bg-slate-950/36 p-3 md:border-l md:border-t-0 md:p-5 ${
                  isCompact && mobileDetailTab !== "leaderboard" ? "hidden" : ""
                }`}
              >
                <div className="flex h-full max-h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-amber-200/12 bg-[linear-gradient(180deg,rgba(251,191,36,0.08),rgba(15,23,42,0.2))] p-3 sm:p-4">
                  <div className="flex items-center gap-3">
                    <h3 className="flex items-center gap-2 text-base font-semibold text-slate-50 sm:mt-1 sm:text-lg">
                      <PublicRounded className="text-cyan-100" />
                      全球排行榜
                    </h3>
                  </div>

                  {isPublic ? (
                    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                      <div
                        ref={setLeaderboardProfileAnchorEl}
                        role="button"
                        tabIndex={0}
                        aria-haspopup="listbox"
                        aria-expanded={isLeaderboardProfileMenuOpen}
                        onClick={handleLeaderboardProfileCardClick}
                        onKeyDown={handleLeaderboardProfileCardKeyDown}
                        className="group mt-3 shrink-0 cursor-pointer rounded-2xl border border-white/10 bg-slate-950/32 px-3.5 py-3 text-slate-300 outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.045)] transition hover:border-amber-100/22 hover:bg-slate-950/42 focus:border-amber-100/34 focus:ring-2 focus:ring-amber-200/10"
                      >
                        <div className="flex items-stretch justify-between gap-3">
                          <div className="min-w-0 flex-1 text-left">
                            <span className="block text-base font-semibold text-slate-50">
                              {activeLeaderboardModeLabel}
                            </span>
                            <span className="mt-1 block text-sm leading-5 text-slate-400">
                              {activeLeaderboardModeDescription}
                            </span>
                          </div>

                          <span className="inline-flex shrink-0 items-center gap-2 self-center text-base font-semibold text-amber-100 transition group-hover:text-amber-50">
                            <span className="max-w-[6.5rem] truncate">
                              {activeLeaderboardOption.label}
                            </span>
                            <KeyboardArrowDownRounded
                              sx={{ fontSize: 24 }}
                              className={`shrink-0 text-amber-100/72 transition ${
                                isLeaderboardProfileMenuOpen ? "rotate-180" : ""
                              }`}
                            />
                          </span>
                        </div>
                      </div>

                      <Popper
                        open={Boolean(leaderboardProfileAnchorEl)}
                        anchorEl={leaderboardProfileAnchorEl}
                        placement="bottom-end"
                        modifiers={[
                          { name: "offset", options: { offset: [0, 8] } },
                          { name: "flip", enabled: true },
                          {
                            name: "preventOverflow",
                            options: { padding: 12 },
                          },
                        ]}
                        sx={{ zIndex: 1500 }}
                      >
                        <ClickAwayListener
                          onClickAway={() =>
                            setIsLeaderboardProfileMenuOpen(false)
                          }
                        >
                          <AnimatePresence>
                            {isLeaderboardProfileMenuOpen ? (
                              <motion.div
                                ref={leaderboardProfileMenuRef}
                                key="collection-leaderboard-profile-menu"
                                initial={{ opacity: 0, y: -6, scale: 0.985 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -4, scale: 0.985 }}
                                transition={{
                                  duration: 0.16,
                                  ease: [0.22, 1, 0.36, 1],
                                }}
                                className="max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-amber-100/20 bg-slate-950/96 p-2 text-slate-100 shadow-[0_22px_50px_-28px_rgba(251,191,36,0.72),0_18px_36px_-28px_rgba(2,6,23,0.95)] backdrop-blur-xl"
                                style={{
                                  width: leaderboardProfileMenuWidth,
                                  transformOrigin: "top right",
                                }}
                                onClick={(event) => event.stopPropagation()}
                              >
                                <div
                                  role="listbox"
                                  aria-label="排行榜規格"
                                  className="space-y-1"
                                >
                                  {leaderboardChallengeGroups.map((group) => (
                                    <div key={group.modeKey}>
                                      <div className="px-3 pb-1 pt-1.5 text-xs font-semibold tracking-[0.12em] text-amber-100/55">
                                        {group.label}
                                      </div>
                                      <div className="space-y-1">
                                        {group.options.map((option) => {
                                          const selected =
                                            option.variantKey ===
                                            selectedLeaderboardVariant;
                                          return (
                                            <button
                                              key={option.variantKey}
                                              type="button"
                                              role="option"
                                              aria-selected={selected}
                                              onClick={() =>
                                                handleLeaderboardProfileSelect(
                                                  option.modeKey,
                                                  option.variantKey,
                                                )
                                              }
                                              className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-left transition ${
                                                selected
                                                  ? "bg-amber-300/14 text-amber-50 shadow-[inset_0_0_0_1px_rgba(252,211,77,0.16)]"
                                                  : "text-slate-300 hover:bg-white/[0.055] hover:text-amber-50"
                                              }`}
                                            >
                                              <span className="min-w-0">
                                                <span className="block truncate text-sm font-semibold">
                                                  {option.label}
                                                </span>
                                              </span>
                                              <span
                                                className={`shrink-0 text-xs font-semibold tabular-nums ${
                                                  selected
                                                    ? "text-amber-100"
                                                    : "text-slate-500"
                                                }`}
                                              >
                                                {formatLeaderboardBestRank(
                                                  option.modeKey,
                                                  option.variantKey,
                                                )}
                                              </span>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            ) : null}
                          </AnimatePresence>
                        </ClickAwayListener>
                      </Popper>

                      <div
                        className={`transient-scrollbar mt-3 min-h-0 flex-1 space-y-2.5 overflow-y-auto pr-1 ${leaderboardScrollbarClassName}`}
                        onMouseEnter={revealLeaderboardScrollbar}
                        onPointerDown={revealLeaderboardScrollbar}
                        onScroll={revealLeaderboardScrollbar}
                      >
                        {leaderboardLoading ? (
                          Array.from({ length: 5 }).map((_, index) => (
                            <div
                              key={`leaderboard-loading-${index}`}
                              className="flex items-center gap-3 rounded-xl border border-white/8 bg-slate-950/30 px-3 py-3"
                            >
                              <div className="h-4 w-8 rounded-full bg-white/8" />
                              <div className="h-9 w-9 rounded-full bg-white/8" />
                              <div className="min-w-0 flex-1 space-y-2">
                                <div className="h-3 w-1/2 rounded-full bg-white/10" />
                                <div className="h-2.5 w-2/3 rounded-full bg-white/6" />
                              </div>
                              <div className="h-3 w-12 rounded-full bg-white/8" />
                            </div>
                          ))
                        ) : leaderboardError ? (
                          <div className="rounded-xl border border-rose-200/14 bg-rose-500/8 px-3 py-4 text-sm text-rose-100">
                            {leaderboardError}
                          </div>
                        ) : leaderboardOverview ? (
                          leaderboardEntries.length > 0 ? (
                            <List<CollectionLeaderboardListRowProps>
                              className={`transient-scrollbar ${leaderboardScrollbarClassName}`}
                              style={{
                                height: "100%",
                                minHeight: 180,
                                width: "100%",
                              }}
                              rowCount={leaderboardRowCount}
                              rowHeight={COLLECTION_LEADERBOARD_ROW_HEIGHT}
                              rowProps={leaderboardListRowProps}
                              rowComponent={CollectionLeaderboardListRow}
                              onScroll={revealLeaderboardScrollbar}
                            />
                          ) : (
                            <div className="relative overflow-hidden rounded-xl border border-cyan-100/14 bg-[linear-gradient(135deg,rgba(34,211,238,0.08),rgba(15,23,42,0.38)_48%,rgba(251,191,36,0.07))] px-4 py-6 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.045)]">
                              <div className="mx-auto inline-flex h-11 w-11 items-center justify-center text-cyan-100">
                                <AutoAwesome sx={{ fontSize: 24 }} />
                              </div>
                              <p className="mt-3 text-sm font-semibold text-slate-50">
                                此模式尚無紀錄
                              </p>
                              <p className="mx-auto mt-1 max-w-[15rem] text-xs leading-5 text-slate-400">
                                成為第一位挑戰者！
                              </p>
                            </div>
                          )
                        ) : (
                          leaderboardPlayersToShow.map((player) => (
                            <LeaderboardPlayerRow
                              key={`${activeLeaderboardVariant.key}-${player.rank}`}
                              player={player}
                            />
                          ))
                        )}
                      </div>

                      <div className="shrink-0 pt-3">
                        <div className="mb-3 h-px bg-gradient-to-r from-transparent via-cyan-100/18 to-transparent" />
                        {activeLeaderboardMyBestEntry ? (
                          <LeaderboardPlayerRow
                            player={currentLeaderboardRecord}
                            variant="current"
                          />
                        ) : (
                          <div className="rounded-xl border border-cyan-100/14 bg-slate-950/26 px-3 py-3 text-sm text-slate-400">
                            完成一次挑戰後，這裡會顯示你的最佳紀錄。
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex min-h-0 flex-1 items-center justify-center py-10">
                      <div className="max-w-sm rounded-2xl border border-white/10 bg-slate-950/42 p-5 text-center">
                        <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-100/18 bg-amber-300/10 text-amber-100">
                          <LockOutlined sx={{ fontSize: 22 }} />
                        </span>
                        <p className="mt-4 text-base font-semibold text-slate-50">
                          收藏庫目前非公開
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-400">
                          排行榜與排行挑戰僅支援公開收藏庫。將收藏庫設為公開後，這裡會顯示排行榜資料。
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </aside>
            </div>
          )
        ) : null}

        {collection ? (
          <footer className="grid shrink-0 gap-3 border-t border-cyan-200/14 bg-[linear-gradient(90deg,rgba(8,47,73,0.16),rgba(15,23,42,0.7)_44%,rgba(120,53,15,0.1))] px-4 py-3 shadow-[0_-18px_48px_-42px_rgba(34,211,238,0.75)] sm:px-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            {isSetupView ? (
              <>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold tracking-[0.16em] text-cyan-100/55">
                    {isSetupLeaderboardMode ? "確認挑戰" : "確認房間"}
                  </p>
                  <p className="mt-1 truncate text-sm font-semibold text-slate-100">
                    {isSetupLeaderboardMode
                      ? `${activeLeaderboardModeLabel} · ${activeLeaderboardVariant.label}`
                      : "休閒派對"}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-end">
                  <Button
                    variant="outlined"
                    startIcon={<ChevronLeftRounded />}
                    disabled={isPreparingSetup}
                    onClick={() => setDrawerView("detail")}
                    className="!min-w-[7.25rem] !rounded-xl !border-white/14 !bg-slate-950/20 !px-4 !py-2 !font-semibold !text-slate-100 !normal-case hover:!border-cyan-100/26 hover:!bg-cyan-300/8"
                  >
                    返回
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={
                      isSetupLeaderboardMode && !isAuthenticated ? (
                        <LoginRounded />
                      ) : (
                        <PlayArrowRounded />
                      )
                    }
                    disabled={
                      isPreparingSetup ||
                      (isSetupLeaderboardMode && isAuthLoading)
                    }
                    onClick={
                      isSetupLeaderboardMode
                        ? handleConfirmLeaderboardChallenge
                        : handleConfirmCustomRoom
                    }
                    className="!min-w-[9.5rem] !rounded-xl !bg-[linear-gradient(135deg,#22d3ee,#fbbf24)] !px-4 !py-2 !font-semibold !text-slate-950 !normal-case !shadow-[0_16px_34px_-22px_rgba(34,211,238,0.95)] hover:!shadow-[0_18px_42px_-22px_rgba(251,191,36,0.75)] disabled:!bg-slate-700 disabled:!text-slate-400 disabled:!shadow-none"
                  >
                    {isSetupLeaderboardMode && !isAuthenticated
                      ? isAuthLoading
                        ? "確認登入中..."
                        : "登入後挑戰"
                      : isSetupLeaderboardMode
                        ? leaderboardStartLabel
                        : customRoomStartLabel}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="flex min-w-0 items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold tracking-[0.16em] text-slate-500">
                      {isPublic ? "挑戰模式" : "房間模式"}
                    </p>
                    <p className="mt-1 truncate text-sm font-semibold text-slate-100">
                      {isPublic
                        ? `${activeLeaderboardModeLabel} · ${activeLeaderboardVariant.label}`
                        : "私人收藏庫僅可建立休閒房"}
                    </p>
                  </div>
                  {isPublic ? (
                    <Button
                      variant="text"
                      size="small"
                      startIcon={
                        isFavorited ? <StarRounded /> : <StarBorderRounded />
                      }
                      disabled={isFavoriteUpdating || !onToggleFavorite}
                      onClick={() => {
                        void onToggleFavorite?.();
                      }}
                      className="!shrink-0"
                    >
                      {isFavorited ? "取消收藏" : "收藏"}
                    </Button>
                  ) : null}
                </div>

                <div
                  className={`grid gap-2 sm:flex sm:items-center sm:justify-end ${
                    isPublic ? "grid-cols-2" : "grid-cols-1"
                  }`}
                >
                  <Button
                    variant="outlined"
                    startIcon={<ChairRounded />}
                    disabled={isApplying}
                    onClick={handleStartCustomRoom}
                    className="!min-w-[8.5rem] !rounded-xl !border-slate-100/14 !bg-slate-950/24 !px-4 !py-2 !font-semibold !text-slate-100 !normal-case hover:!border-cyan-100/30 hover:!bg-cyan-300/8"
                  >
                    {isApplying
                      ? "載入中..."
                      : isPublic
                        ? "休閒派對"
                        : "建立休閒房"}
                  </Button>
                  {isPublic ? (
                    <Button
                      variant="contained"
                      startIcon={
                        canStartLeaderboardChallenge ? (
                          <PlayArrowRounded />
                        ) : (
                          <LoginRounded />
                        )
                      }
                      disabled={
                        isPreparingLeaderboardChallenge || isAuthLoading
                      }
                      onClick={handleStartLeaderboardChallenge}
                      className="!min-w-[9.5rem] !rounded-xl !bg-[linear-gradient(135deg,#22d3ee,#fbbf24)] !px-4 !py-2 !font-semibold !text-slate-950 !normal-case !shadow-[0_16px_34px_-22px_rgba(34,211,238,0.95)] hover:!shadow-[0_18px_42px_-22px_rgba(251,191,36,0.75)] disabled:!bg-slate-700 disabled:!text-slate-400 disabled:!shadow-none"
                    >
                      {leaderboardEntryLabel}
                    </Button>
                  ) : null}
                </div>
              </>
            )}
          </footer>
        ) : null}
      </div>
    </Drawer>
  );
};

export default CollectionDetailDrawer;
