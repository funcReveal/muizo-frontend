import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type UIEvent,
} from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  MenuItem,
  Slider,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { List, type RowComponentProps } from "react-window";
import {
  AddCircleOutlineRounded,
  AccessTimeRounded,
  BarChartRounded,
  BookmarkBorderRounded,
  ChevronLeftRounded,
  ChevronRightRounded,
  CloseRounded,
  EditRounded,
  GroupsRounded,
  KeyboardDoubleArrowLeftRounded,
  KeyboardDoubleArrowRightRounded,
  LockRounded,
  LinkRounded,
  LockOutlined,
  PasswordRounded,
  PlayCircleOutlineRounded,
  SearchRounded,
  ScheduleRounded,
  StarBorderRounded,
  TimerRounded,
  TuneRounded,
  PublicOutlined,
  QuizRounded,
  MeetingRoomRounded,
  YouTube,
} from "@mui/icons-material";

import type { RoomSummary } from "../model/types";
import { useRoom } from "../model/useRoom";
import { apiFetchRoomById } from "../model/roomApi";
import {
  API_URL,
  PLAYER_MAX,
  PLAYER_MIN,
  PLAY_DURATION_MAX,
  PLAY_DURATION_MIN,
  REVEAL_DURATION_MAX,
  REVEAL_DURATION_MIN,
  START_OFFSET_MAX,
  START_OFFSET_MIN,
  USERNAME_MAX,
} from "../model/roomConstants";

const isRoomCurrentlyPlaying = (room: RoomSummary) => {
  const source = room as RoomSummary &
    Record<string, unknown> & {
      gameState?: { status?: unknown } | null;
    };

  const boolCandidates = [
    source.isPlaying,
    source.playing,
    source.inGame,
    source.hasActiveGame,
  ];
  if (boolCandidates.some((value) => value === true)) return true;

  const stringCandidates = [
    source.gameStatus,
    source.game_status,
    source.status,
    source.liveStatus,
    source.roomStatus,
    source.gameState?.status,
  ];
  for (const value of stringCandidates) {
    if (typeof value !== "string") continue;
    const normalized = value.trim().toLowerCase();
    if (
      normalized === "playing" ||
      normalized === "in_progress" ||
      normalized === "active" ||
      normalized === "started" ||
      normalized === "running"
    ) {
      return true;
    }
  }

  return false;
};

type PlaylistPreviewRowProps = {
  items: Array<{
    title: string;
    uploader?: string;
    duration?: string;
    thumbnail?: string;
  }>;
};

type PlaylistIssueListItem = {
  title: string;
  reason: string;
  thumbnail?: string;
};

const PlaylistPreviewRow = ({
  index,
  style,
  items,
}: RowComponentProps<PlaylistPreviewRowProps>) => {
  const item = items[index];
  return (
    <div style={style} className="px-2 py-1">
      <div className="flex items-center gap-3 rounded-lg border border-[var(--mc-border)]/70 bg-slate-950/25 px-2 py-2">
        <img
          src={
            item.thumbnail || "https://img.youtube.com/vi/default/hqdefault.jpg"
          }
          alt={item.title}
          className="h-10 w-16 rounded object-cover"
          loading="lazy"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[var(--mc-text)]">
            {item.title}
          </p>
          <p className="truncate text-xs text-[var(--mc-text-muted)]">
            {item.uploader || "未知作者"}
            {item.duration ? ` · ${item.duration}` : ""}
          </p>
        </div>
      </div>
    </div>
  );
};

type PlaylistIssueRowProps = {
  items: PlaylistIssueListItem[];
};

const PlaylistIssueRow = ({
  index,
  style,
  items,
}: RowComponentProps<PlaylistIssueRowProps>) => {
  const item = items[index];
  return (
    <div style={style} className="px-2 py-1">
      <div className="flex items-center gap-3 rounded-lg border border-[var(--mc-border)]/70 bg-slate-950/25 px-2 py-2">
        <img
          src={
            item.thumbnail || "https://img.youtube.com/vi/default/hqdefault.jpg"
          }
          alt={item.title}
          className="h-10 w-16 rounded object-cover"
          loading="lazy"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[var(--mc-text)]">
            {item.title}
          </p>
          <p className="truncate text-xs text-[var(--mc-text-muted)]">
            {item.reason}
          </p>
        </div>
      </div>
    </div>
  );
};

const skeletonWaveClass =
  "relative overflow-hidden rounded-xl border border-cyan-300/18 bg-[linear-gradient(180deg,rgba(8,15,28,0.94),rgba(15,23,42,0.78))] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_12px_30px_-24px_rgba(6,182,212,0.6)]";

const skeletonPulseClass =
  "before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_18%_22%,rgba(56,189,248,0.18),transparent_30%),radial-gradient(circle_at_78%_12%,rgba(34,197,94,0.08),transparent_24%),linear-gradient(90deg,rgba(148,163,184,0.08),rgba(148,163,184,0.02))] before:animate-[skeleton-breathe_3.4s_ease-in-out_infinite]";

const skeletonShimmerClass =
  "after:pointer-events-none after:absolute after:inset-y-0 after:left-[-35%] after:w-[42%] after:-skew-x-[22deg] after:bg-[linear-gradient(90deg,transparent,rgba(125,211,252,0.18),rgba(255,255,255,0.34),rgba(125,211,252,0.18),transparent)] after:blur-[1px] after:animate-[skeleton-sheen_1.9s_cubic-bezier(0.22,1,0.36,1)_infinite]";

const buildSkeletonClassName = (shapeClassName: string) =>
  `${skeletonWaveClass} ${skeletonPulseClass} ${skeletonShimmerClass} ${shapeClassName}`;

const skeletonLineClass =
  "rounded-full bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]";

const renderYoutubeSkeletonCard = (idx: number, view: "grid" | "list") => {
  if (view === "grid") {
    return (
      <div key={`yt-skeleton-${idx}`} className={buildSkeletonClassName("p-3")}>
        <div className="mb-3 h-28 w-full rounded-md bg-white/8" />
        <div className="space-y-2">
          <div className={`${skeletonLineClass} h-4 w-[72%]`} />
          <div className={`${skeletonLineClass} h-3 w-[44%]`} />
          <div className={`${skeletonLineClass} h-3 w-[24%]`} />
        </div>
      </div>
    );
  }

  return (
    <div
      key={`yt-skeleton-${idx}`}
      className={buildSkeletonClassName("flex items-center gap-3 px-3 py-2")}
    >
      <div className="h-10 w-16 shrink-0 rounded-md bg-white/8" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className={`${skeletonLineClass} h-4 w-[68%]`} />
        <div className={`${skeletonLineClass} h-3 w-[38%]`} />
      </div>
      <div className={`${skeletonLineClass} h-3 w-10 shrink-0`} />
    </div>
  );
};

const renderCollectionSkeletonCard = (idx: number, view: "grid" | "list") => {
  if (view === "grid") {
    return (
      <div
        key={`collection-skeleton-${idx}`}
        className={buildSkeletonClassName("p-3")}
      >
        <div className="mb-3 h-28 w-full rounded-md bg-white/8" />
        <div className="space-y-2">
          <div className={`${skeletonLineClass} h-4 w-[76%]`} />
          <div className={`${skeletonLineClass} h-3 w-[52%]`} />
          <div className={`${skeletonLineClass} h-3 w-[48%]`} />
        </div>
      </div>
    );
  }

  return (
    <div
      key={`collection-skeleton-${idx}`}
      className={buildSkeletonClassName("flex items-center gap-3 px-3 py-2")}
    >
      <div className="h-11 w-16 shrink-0 rounded-md bg-white/8" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className={`${skeletonLineClass} h-4 w-[72%]`} />
        <div className={`${skeletonLineClass} h-3 w-[46%]`} />
        <div className={`${skeletonLineClass} h-3 w-[54%]`} />
      </div>
    </div>
  );
};

type LibraryEmptyStateProps = {
  icon: ReactNode;
  title: string;
  description: string;
  actions?: ReactNode;
};

const LibraryEmptyState = ({
  icon,
  title,
  description,
  actions,
}: LibraryEmptyStateProps) => (
  <div className="rounded-2xl border border-white/8 bg-[linear-gradient(180deg,rgba(2,6,23,0.46),rgba(15,23,42,0.28))] px-5 py-8 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-100 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.8)]">
      {icon}
    </div>
    <p className="mt-4 text-base font-semibold text-[var(--mc-text)]">
      {title}
    </p>
    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--mc-text-muted)]">
      {description}
    </p>
    {actions ? (
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        {actions}
      </div>
    ) : null}
  </div>
);

type VirtualLibraryListRowProps = {
  items: unknown[];
  renderItem: (item: unknown, itemIndex: number, view: "list") => ReactNode;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  renderLoader?: () => ReactNode;
};

const VirtualLibraryListRow = ({
  index,
  style,
  items,
  renderItem,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
  renderLoader,
}: RowComponentProps<VirtualLibraryListRowProps>) => {
  const item = items[index];
  const isLoaderRow = typeof item === "undefined" && (hasMore || isLoadingMore);

  useEffect(() => {
    if (!isLoaderRow || !hasMore || isLoadingMore || !onLoadMore) return;
    onLoadMore();
  }, [hasMore, isLoaderRow, isLoadingMore, onLoadMore]);

  if (isLoaderRow) {
    return (
      <div style={style} className="pr-1">
        {renderLoader ? renderLoader() : null}
      </div>
    );
  }

  return (
    <div style={style} className="pr-1">
      {item ? renderItem(item, index, "list") : null}
    </div>
  );
};

const GUIDE_MODE_STORAGE_KEY = "mq_room_guide_mode";
const JOIN_ENTRY_TAB_STORAGE_KEY = "mq_room_join_entry_tab";
const CREATE_PLAYER_QUICK_OPTIONS = [4, 8, 12];
const CREATE_QUESTION_QUICK_OPTIONS = [10, 15, 20, 30];

const formatDurationLabel = (durationSec?: number | null) => {
  if (!durationSec || durationSec <= 0) return null;
  const minutes = Math.floor(durationSec / 60);
  const seconds = durationSec % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

const getRoomPlaylistLabel = (room: RoomSummary) => {
  const source = room as RoomSummary &
    Record<string, unknown> & {
      playlist?: { title?: unknown } | null;
    };

  const candidates = [
    room.playlistTitle,
    source.playlist_title,
    source.sourceTitle,
    source.source_title,
    source.collectionTitle,
    source.collection_title,
    source.playlist?.title,
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const trimmed = candidate.trim();
    if (trimmed) return trimmed;
  }

  return room.playlistCount > 0
    ? `共 ${room.playlistCount} 首題目`
    : "題庫資訊未提供";
};

const getRoomStatusLabel = (room: RoomSummary) =>
  isRoomCurrentlyPlaying(room) ? "遊玩中" : "待機中";

const roomRequiresPin = (room: RoomSummary) =>
  Boolean(room.hasPin ?? room.hasPassword);

const normalizeRoomCodeInput = (value: string) =>
  value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);

const formatRoomCodeDisplay = (value: string) => {
  const normalized = normalizeRoomCodeInput(value);
  if (normalized.length <= 3) return normalized;
  return `${normalized.slice(0, 3)}-${normalized.slice(3)}`;
};

const RoomListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    username,
    usernameInput,
    setUsernameInput,
    handleSetUsername,
    loginWithGoogle,
    authLoading,
    authUser,
    rooms,
    collections,
    collectionsLoading,
    collectionsLoadingMore,
    collectionsHasMore,
    collectionsError,
    collectionItemsError,
    collectionScope,
    publicCollectionsSort,
    fetchCollections,
    loadMoreCollections,
    loadCollectionItems,
    youtubePlaylists,
    youtubePlaylistsLoading,
    fetchYoutubePlaylists,
    importYoutubePlaylist,
    playlistItems,
    playlistLoading,
    playlistError,
    playlistPreviewMeta,
    lastFetchedPlaylistTitle,
    handleFetchPlaylistByUrl,
    handleResetPlaylist,
    currentRoom,
    roomNameInput,
    setRoomNameInput,
    roomVisibilityInput,
    setRoomVisibilityInput,
    roomPasswordInput,
    setRoomPasswordInput,
    roomMaxPlayersInput,
    setRoomMaxPlayersInput,
    questionCount,
    questionMin,
    questionMaxLimit,
    updateQuestionCount,
    playDurationSec,
    updatePlayDurationSec,
    revealDurationSec,
    updateRevealDurationSec,
    startOffsetSec,
    updateStartOffsetSec,
    allowCollectionClipTiming,
    updateAllowCollectionClipTiming,
    roomCreateSourceMode,
    setRoomCreateSourceMode,
    isCreatingRoom,
    handleCreateRoom,
    setJoinPasswordInput,
    handleJoinRoom,
  } = useRoom();
  const isLibraryGridWide = useMediaQuery("(min-width:640px)");
  const [passwordDialog, setPasswordDialog] = useState<{
    roomId: string;
    roomName: string;
  } | null>(null);
  const [joinConfirmDialog, setJoinConfirmDialog] = useState<{
    roomCode: string;
    roomName: string;
    hasPassword: boolean;
    playlistTitle: string;
    playerCount: number;
    maxPlayers?: number | null;
    questionCount?: number;
    currentQuestionNo?: number | null;
    completedQuestionCount?: number;
    totalQuestionCount?: number;
  } | null>(null);
  const [passwordDraft, setPasswordDraft] = useState("");
  const [directRoomIdInput, setDirectRoomIdInput] = useState("");
  const [joinEntryTab, setJoinEntryTab] = useState<"code" | "browser">(() => {
    if (typeof window === "undefined") return "code";
    const stored = window.sessionStorage.getItem(JOIN_ENTRY_TAB_STORAGE_KEY);
    return stored === "browser" ? "browser" : "code";
  });
  const [isDirectRoomCodeFocused, setIsDirectRoomCodeFocused] = useState(false);
  const [directJoinLoading, setDirectJoinLoading] = useState(false);
  const [directJoinPreviewRoom, setDirectJoinPreviewRoom] =
    useState<RoomSummary | null>(null);
  const [directJoinError, setDirectJoinError] = useState<string | null>(null);
  const [directJoinNeedsPassword, setDirectJoinNeedsPassword] = useState(false);
  const [guideMode, setGuideMode] = useState<"create" | "join">(() => {
    if (typeof window === "undefined") return "create";
    const stored = window.sessionStorage.getItem(GUIDE_MODE_STORAGE_KEY);
    return stored === "join" ? "join" : "create";
  });
  const [createLibraryTab, setCreateLibraryTab] = useState<
    "public" | "personal" | "youtube" | "link"
  >("public");
  const [sharedCollectionMeta, setSharedCollectionMeta] = useState<{
    id: string;
    title: string;
    scope: "public" | "private";
  } | null>(null);
  const [createLibraryView, setCreateLibraryView] = useState<"grid" | "list">(
    "grid",
  );
  const [createLibrarySearch, setCreateLibrarySearch] = useState("");
  const [createLeftTab, setCreateLeftTab] = useState<"library" | "settings">(
    "library",
  );
  const [joinRoomsView, setJoinRoomsView] = useState<"grid" | "list">("list");
  const [selectedJoinRoomId, setSelectedJoinRoomId] = useState<string | null>(
    null,
  );
  const [playlistUrlDraft, setPlaylistUrlDraft] = useState("");
  const [playlistPreviewError, setPlaylistPreviewError] = useState<
    string | null
  >(null);
  const [isPlaylistUrlFieldFocused, setIsPlaylistUrlFieldFocused] =
    useState(false);
  const [isPublicLibrarySearchExpanded, setIsPublicLibrarySearchExpanded] =
    useState(false);
  const previousCreateLibraryTabRef = useRef(createLibraryTab);
  const handledSharedCollectionRef = useRef<string | null>(null);
  const [joinPasswordFilter, setJoinPasswordFilter] = useState<
    "all" | "no_password" | "password_required"
  >("all");
  const [joinSortMode, setJoinSortMode] = useState<"latest" | "players_desc">(
    "latest",
  );
  const [selectedCreateCollectionId, setSelectedCreateCollectionId] = useState<
    string | null
  >(null);
  const [selectedCreateYoutubeId, setSelectedCreateYoutubeId] = useState<
    string | null
  >(null);
  const lastAutoPreviewUrlRef = useRef("");
  const hasRequestedYoutubePlaylistsRef = useRef(false);
  const createLibraryScrollRef = useRef<HTMLDivElement | null>(null);
  const directRoomCodeInputRef = useRef<HTMLInputElement | null>(null);
  const publicLibrarySearchPanelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (currentRoom?.id) {
      navigate(`/rooms/${currentRoom.id}`, { replace: true });
    }
  }, [currentRoom?.id, navigate]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(GUIDE_MODE_STORAGE_KEY, guideMode);
  }, [guideMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(JOIN_ENTRY_TAB_STORAGE_KEY, joinEntryTab);
  }, [joinEntryTab]);

  const normalizedDirectRoomCode = normalizeRoomCodeInput(directRoomIdInput);
  const directRoomCodeSlots = normalizedDirectRoomCode.padEnd(6, "_").split("");
  const activeDirectRoomCodeIndex =
    normalizedDirectRoomCode.length >= 6 ? 5 : normalizedDirectRoomCode.length;
  const resolvedDirectJoinRoom = directJoinPreviewRoom;

  useEffect(() => {
    if (guideMode !== "join" || joinEntryTab !== "code") return;
    const frame = window.requestAnimationFrame(() => {
      directRoomCodeInputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [guideMode, joinEntryTab]);

  useEffect(() => {
    if (guideMode !== "join" || joinEntryTab !== "code") return;
    if (normalizedDirectRoomCode.length < 6) {
      setDirectJoinLoading(false);
      setDirectJoinPreviewRoom(null);
      setDirectJoinNeedsPassword(false);
      if (!normalizedDirectRoomCode.length) {
        setDirectJoinError(null);
      }
      return;
    }
    if (!API_URL) {
      setDirectJoinLoading(false);
      setDirectJoinPreviewRoom(null);
      setDirectJoinError("目前無法驗證房間，請稍後再試。");
      return;
    }

    let isActive = true;
    setDirectJoinLoading(true);
    setDirectJoinError(null);
    setDirectJoinPreviewRoom(null);
    setDirectJoinNeedsPassword(false);

    void (async () => {
      try {
        const result = await apiFetchRoomById(
          API_URL,
          normalizedDirectRoomCode,
        );
        const fetchedRoom = (result.payload as { room?: RoomSummary } | null)
          ?.room;
        if (!isActive) return;
        if (!result.ok || !fetchedRoom) {
          setDirectJoinError("找不到該房間，請確認房間代碼是否正確。");
          return;
        }
        setDirectJoinPreviewRoom(fetchedRoom);
        setDirectJoinNeedsPassword(roomRequiresPin(fetchedRoom));
      } catch {
        if (!isActive) return;
        setDirectJoinError("查詢房間失敗，請稍後再試。");
      } finally {
        if (isActive) {
          setDirectJoinLoading(false);
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, [guideMode, joinEntryTab, normalizedDirectRoomCode]);

  const canUseGoogleLibraries = Boolean(authUser);
  const selectedJoinRoom = useMemo(
    () => rooms.find((room) => room.id === selectedJoinRoomId) ?? null,
    [rooms, selectedJoinRoomId],
  );
  const filteredJoinRooms = useMemo(() => {
    const next = [...rooms].filter((room) => {
      if (joinPasswordFilter === "no_password") return !roomRequiresPin(room);
      if (joinPasswordFilter === "password_required")
        return roomRequiresPin(room);
      return true;
    });
    if (joinSortMode === "players_desc") {
      next.sort((a, b) => b.playerCount - a.playerCount);
      return next;
    }
    next.sort((a, b) => {
      const aTs = new Date(a.createdAt).getTime();
      const bTs = new Date(b.createdAt).getTime();
      return bTs - aTs;
    });
    return next;
  }, [joinPasswordFilter, joinSortMode, rooms]);
  const filteredJoinPlayerTotal = useMemo(
    () =>
      filteredJoinRooms.reduce(
        (total, room) => total + Math.max(0, room.playerCount ?? 0),
        0,
      ),
    [filteredJoinRooms],
  );
  const joinPreviewRoom = selectedJoinRoom;
  const playlistPreviewItems = useMemo(
    () =>
      playlistItems.map((item) => ({
        title: item.title,
        uploader: item.uploader,
        duration: item.duration,
        thumbnail: item.thumbnail,
        url: item.url,
        videoId: item.videoId,
      })),
    [playlistItems],
  );
  const playlistIssueSummary = useMemo(() => {
    if (playlistPreviewMeta?.skippedItems?.length) {
      const removed: PlaylistIssueListItem[] = [];
      const privateRestricted: PlaylistIssueListItem[] = [];
      const embedBlocked: PlaylistIssueListItem[] = [];
      const unavailable: PlaylistIssueListItem[] = [];
      const unknown: PlaylistIssueListItem[] = [];
      const normalizeBlockedReason = (reason?: string | null) => {
        const normalized = reason?.trim() ?? "";
        const lower = normalized.toLowerCase();
        if (
          lower.includes("age") ||
          lower.includes("mature") ||
          lower.includes("adult") ||
          normalized.includes("年齡") ||
          normalized.includes("限制級")
        ) {
          return "因年齡限制，不允許嵌入播放";
        }
        if (
          lower.includes("copyright") ||
          lower.includes("rights") ||
          lower.includes("owner") ||
          normalized.includes("版權") ||
          normalized.includes("權利") ||
          normalized.includes("擁有者")
        ) {
          return "因版權或權利設定，不允許嵌入播放";
        }
        if (
          lower.includes("embedding disabled") ||
          lower.includes("embed") ||
          normalized.includes("嵌入")
        ) {
          return "此影片不允許嵌入播放";
        }
        return "此影片不允許嵌入播放";
      };
      playlistPreviewMeta.skippedItems.forEach((item) => {
        const title = item.title?.trim() || item.videoId || "未知項目";
        const thumbnail = item.videoId
          ? `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`
          : undefined;
        const fallbackReason =
          item.status === "removed"
            ? "影片已移除"
            : item.status === "private"
              ? "私人或受限制，無法匯入"
              : item.status === "blocked"
                ? normalizeBlockedReason(item.reason)
                : item.status === "unavailable"
                  ? "影片目前不可用"
                  : "無法判斷匯入原因";
        const issueItem = {
          title,
          thumbnail,
          reason:
            item.status === "blocked"
              ? normalizeBlockedReason(item.reason)
              : item.reason?.trim() || fallbackReason,
        };
        if (item.status === "removed") {
          removed.push(issueItem);
          return;
        }
        if (item.status === "private") {
          privateRestricted.push(issueItem);
          return;
        }
        if (item.status === "blocked") {
          embedBlocked.push(issueItem);
          return;
        }
        if (item.status === "unavailable") {
          unavailable.push(issueItem);
          return;
        }
        unknown.push(issueItem);
      });
      return {
        removed,
        privateRestricted,
        embedBlocked,
        unavailable,
        unknown,
        unknownCount: 0,
        exact: true,
      };
    }
    if ((playlistPreviewMeta?.skippedCount ?? 0) > 0) {
      return {
        removed: [],
        privateRestricted: [],
        embedBlocked: [],
        unavailable: [],
        unknown: [],
        unknownCount: playlistPreviewMeta?.skippedCount ?? 0,
        exact: false,
      };
    }
    return {
      removed: [],
      privateRestricted: [],
      embedBlocked: [],
      unavailable: [],
      unknown: [],
      unknownCount: 0,
      exact: false,
    };
  }, [playlistPreviewMeta]);
  const canAttemptPlaylistPreview = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return false;
    try {
      const parsed = new URL(trimmed);
      return Boolean(parsed.searchParams.get("list"));
    } catch {
      return false;
    }
  };
  const isLinkSourceActive = roomCreateSourceMode === "link";
  const trimmedPlaylistUrlDraft = playlistUrlDraft.trim();
  const playlistUrlLooksValid = canAttemptPlaylistPreview(
    trimmedPlaylistUrlDraft,
  );
  const linkPreviewLocked =
    isLinkSourceActive &&
    ((playlistLoading && playlistUrlLooksValid) ||
      Boolean(lastFetchedPlaylistTitle) ||
      playlistItems.length > 0);
  const linkPlaylistTitle = isLinkSourceActive
    ? lastFetchedPlaylistTitle
    : null;
  const linkPlaylistPreviewItems = isLinkSourceActive
    ? playlistPreviewItems
    : [];
  const linkPlaylistIssueSummary = isLinkSourceActive
    ? playlistIssueSummary
    : {
        removed: [],
        privateRestricted: [],
        embedBlocked: [],
        unavailable: [],
        unknown: [],
        unknownCount: 0,
        exact: false,
      };
  const publicLibrarySearchActive =
    createLibraryTab === "public" && isPublicLibrarySearchExpanded;
  const normalizedMaxPlayersInput = roomMaxPlayersInput.trim();
  const parsedMaxPlayers = normalizedMaxPlayersInput
    ? Number(normalizedMaxPlayersInput)
    : null;
  const maxPlayersInvalid =
    parsedMaxPlayers !== null &&
    (!Number.isInteger(parsedMaxPlayers) ||
      parsedMaxPlayers < PLAYER_MIN ||
      parsedMaxPlayers > PLAYER_MAX);
  const canCreateRoom =
    Boolean(roomNameInput.trim()) &&
    playlistItems.length > 0 &&
    !playlistLoading &&
    !maxPlayersInvalid &&
    !isCreatingRoom;
  const createRequirementsHint = !roomNameInput.trim()
    ? "請先填寫房間名稱。"
    : playlistItems.length === 0
      ? "請先選擇題庫來源並載入歌曲。"
      : maxPlayersInvalid
        ? `人數需介於 ${PLAYER_MIN}-${PLAYER_MAX}。`
        : null;
  const canDecreaseQuestionCount = questionCount > questionMin;
  const canIncreaseQuestionCount = questionCount < questionMaxLimit;
  const createSettingsSummary = useMemo(
    () => [
      {
        label: "房間類型",
        value: roomVisibilityInput === "private" ? "私人房" : "公開房",
      },
      {
        label: "玩家上限",
        value: parsedMaxPlayers ? `${parsedMaxPlayers} 人` : "未設定",
      },
      {
        label: "題數",
        value: `${questionCount} 題`,
      },
      {
        label: "節奏",
        value: allowCollectionClipTiming
          ? `揭示 ${revealDurationSec}s / 題庫片段`
          : `播放 ${playDurationSec}s / 揭示 ${revealDurationSec}s / 起點 ${startOffsetSec}s`,
      },
    ],
    [
      allowCollectionClipTiming,
      parsedMaxPlayers,
      playDurationSec,
      questionCount,
      revealDurationSec,
      roomVisibilityInput,
      startOffsetSec,
    ],
  );
  const createSettingPresets = useMemo(
    () => [
      {
        key: "casual",
        label: "輕鬆局",
        hint: "10 題、慢一點、適合暖身",
        active:
          questionCount === 10 &&
          playDurationSec === 18 &&
          revealDurationSec === 12 &&
          startOffsetSec === 0,
        onApply: () => {
          updateQuestionCount(10);
          updatePlayDurationSec(18);
          updateRevealDurationSec(12);
          updateStartOffsetSec(0);
        },
      },
      {
        key: "standard",
        label: "標準局",
        hint: "15 題、平衡節奏、最通用",
        active:
          questionCount === 15 &&
          playDurationSec === 15 &&
          revealDurationSec === 10 &&
          startOffsetSec === 0,
        onApply: () => {
          updateQuestionCount(15);
          updatePlayDurationSec(15);
          updateRevealDurationSec(10);
          updateStartOffsetSec(0);
        },
      },
      {
        key: "tempo",
        label: "快節奏",
        hint: "20 題、偏刺激、老手向",
        active:
          questionCount === 20 &&
          playDurationSec === 12 &&
          revealDurationSec === 8 &&
          startOffsetSec === 3,
        onApply: () => {
          updateQuestionCount(20);
          updatePlayDurationSec(12);
          updateRevealDurationSec(8);
          updateStartOffsetSec(3);
        },
      },
    ],
    [
      playDurationSec,
      questionCount,
      revealDurationSec,
      startOffsetSec,
      updatePlayDurationSec,
      updateQuestionCount,
      updateRevealDurationSec,
      updateStartOffsetSec,
    ],
  );
  const isCreateSourceReady = playlistItems.length > 0;
  const selectedYoutubePlaylist = useMemo(
    () =>
      selectedCreateYoutubeId
        ? (youtubePlaylists.find(
            (item) => item.id === selectedCreateYoutubeId,
          ) ?? null)
        : null,
    [selectedCreateYoutubeId, youtubePlaylists],
  );
  const selectedCollection = useMemo(
    () =>
      selectedCreateCollectionId
        ? (collections.find((item) => item.id === selectedCreateCollectionId) ??
            null)
        : null,
    [collections, selectedCreateCollectionId],
  );
  const selectedSharedCollection =
    selectedCreateCollectionId &&
    sharedCollectionMeta?.id === selectedCreateCollectionId
      ? sharedCollectionMeta
      : null;
  const normalizedCreateLibrarySearch = createLibrarySearch
    .trim()
    .toLowerCase();
  const filteredCreateYoutubePlaylists = useMemo(() => {
    if (!normalizedCreateLibrarySearch) return youtubePlaylists;
    return youtubePlaylists.filter((playlist) =>
      playlist.title.toLowerCase().includes(normalizedCreateLibrarySearch),
    );
  }, [normalizedCreateLibrarySearch, youtubePlaylists]);
  const filteredCreateCollections = useMemo(() => {
    if (createLibraryTab === "public") return collections;
    if (!normalizedCreateLibrarySearch) return collections;
    return collections.filter((collection) => {
      const haystacks = [
        collection.title,
        collection.cover_title,
        collection.description,
        collection.cover_channel_title,
      ]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());
      return haystacks.some((value) =>
        value.includes(normalizedCreateLibrarySearch),
      );
    });
  }, [collections, createLibraryTab, normalizedCreateLibrarySearch]);
  const shouldShowCollectionSkeleton =
    collectionsLoading &&
    !(
      createLibraryTab === "public" &&
      collectionScope === "public" &&
      filteredCreateCollections.length > 0
    );
  const selectedCollectionThumb =
    selectedCollection?.cover_thumbnail_url ||
    (selectedCollection?.cover_provider === "youtube" &&
    selectedCollection?.cover_source_id
      ? `https://i.ytimg.com/vi/${selectedCollection.cover_source_id}/hqdefault.jpg`
      : "") ||
    (selectedSharedCollection ? playlistItems[0]?.thumbnail || "" : "");
  const selectedSourceSummary = useMemo(() => {
    if (!isCreateSourceReady) return null;
    if (roomCreateSourceMode === "link") {
      return {
        label: "貼上連結",
        title: lastFetchedPlaylistTitle || "YouTube 連結清單",
        detail: `已載入 ${playlistItems.length} 首`,
        thumbnail: playlistPreviewItems[0]?.thumbnail || "",
      };
    }
    if (roomCreateSourceMode === "youtube") {
      return {
        label: "YouTube 清單",
        title: selectedYoutubePlaylist?.title || "已選擇 YouTube 播放清單",
        detail: `${playlistItems.length} 首`,
        thumbnail:
          selectedYoutubePlaylist?.thumbnail ||
          playlistPreviewItems[0]?.thumbnail ||
          "",
      };
    }
    if (roomCreateSourceMode === "publicCollection") {
      return {
        label: "公開收藏庫",
        title:
          selectedCollection?.title ||
          selectedSharedCollection?.title ||
          "已選擇公開收藏",
        detail: `已載入 ${playlistItems.length} 首`,
        thumbnail: selectedCollectionThumb,
      };
    }
    if (roomCreateSourceMode === "privateCollection") {
      return {
        label: "個人收藏庫",
        title:
          selectedCollection?.title ||
          selectedSharedCollection?.title ||
          "已選擇個人收藏",
        detail: `已載入 ${playlistItems.length} 首`,
        thumbnail: selectedCollectionThumb,
      };
    }
    return null;
  }, [
    isCreateSourceReady,
    lastFetchedPlaylistTitle,
    playlistItems.length,
    playlistPreviewItems,
    roomCreateSourceMode,
    selectedCollection?.title,
    selectedSharedCollection?.title,
    selectedCollectionThumb,
    selectedYoutubePlaylist?.thumbnail,
    selectedYoutubePlaylist?.title,
  ]);
  const createSourceShowsImportIssues =
    roomCreateSourceMode === "link" || roomCreateSourceMode === "youtube";
  const createSourceHasImportIssues =
    createSourceShowsImportIssues &&
    (playlistIssueSummary.removed.length > 0 ||
      playlistIssueSummary.privateRestricted.length > 0 ||
      playlistIssueSummary.embedBlocked.length > 0 ||
      playlistIssueSummary.unavailable.length > 0 ||
      playlistIssueSummary.unknown.length > 0 ||
      playlistIssueSummary.unknownCount > 0);
  const createRequirementsHintText = !roomNameInput.trim()
    ? "請先輸入房間名稱。"
    : playlistItems.length === 0
      ? "請先準備題庫內容，才能建立房間。"
      : maxPlayersInvalid
        ? `玩家上限需介於 ${PLAYER_MIN}-${PLAYER_MAX} 人之間。`
        : null;
  const createSettingsCards = useMemo(
    () => [
      {
        label: "房間型態",
        value: roomVisibilityInput === "private" ? "私人房" : "公開房",
      },
      {
        label: "玩家上限",
        value: parsedMaxPlayers ? `${parsedMaxPlayers} 人` : "尚未設定",
      },
      {
        label: "題數",
        value: `${questionCount} 題`,
      },
      {
        label: "遊戲節奏",
        value: allowCollectionClipTiming
          ? `公布答案 ${revealDurationSec}s / 沿用題庫片段`
          : `作答時間 ${playDurationSec}s / 公布答案 ${revealDurationSec}s / 起始時間 ${startOffsetSec}s`,
      },
    ],
    [
      allowCollectionClipTiming,
      parsedMaxPlayers,
      playDurationSec,
      questionCount,
      revealDurationSec,
      roomVisibilityInput,
      startOffsetSec,
    ],
  );
  const createPresetCards = useMemo(
    () => [
      {
        key: "casual",
        label: "輕鬆局",
        hint: "10 題、較長播放與揭示時間，適合暖身。",
        active:
          questionCount === 10 &&
          playDurationSec === 18 &&
          revealDurationSec === 12 &&
          startOffsetSec === 0,
        onApply: () => {
          updateQuestionCount(10);
          updatePlayDurationSec(18);
          updateRevealDurationSec(12);
          updateStartOffsetSec(0);
        },
      },
      {
        key: "standard",
        label: "標準局",
        hint: "15 題、平衡節奏，適合大多數房間。",
        active:
          questionCount === 15 &&
          playDurationSec === 15 &&
          revealDurationSec === 10 &&
          startOffsetSec === 0,
        onApply: () => {
          updateQuestionCount(15);
          updatePlayDurationSec(15);
          updateRevealDurationSec(10);
          updateStartOffsetSec(0);
        },
      },
      {
        key: "tempo",
        label: "快節奏",
        hint: "20 題、縮短播放與揭示時間，節奏更緊湊。",
        active:
          questionCount === 20 &&
          playDurationSec === 12 &&
          revealDurationSec === 8 &&
          startOffsetSec === 3,
        onApply: () => {
          updateQuestionCount(20);
          updatePlayDurationSec(12);
          updateRevealDurationSec(8);
          updateStartOffsetSec(3);
        },
      },
    ],
    [
      playDurationSec,
      questionCount,
      revealDurationSec,
      startOffsetSec,
      updatePlayDurationSec,
      updateQuestionCount,
      updateRevealDurationSec,
      updateStartOffsetSec,
    ],
  );
  const activeCreatePreset = useMemo(
    () => createPresetCards.find((preset) => preset.active) ?? null,
    [createPresetCards],
  );
  const selectedCreateSourceSummary = useMemo(() => {
    if (!isCreateSourceReady) return null;
    if (roomCreateSourceMode === "link") {
      return {
        label: "貼上連結",
        title: lastFetchedPlaylistTitle || "YouTube 播放清單",
        detail: `共 ${playlistItems.length} 首歌曲`,
        thumbnail: playlistPreviewItems[0]?.thumbnail || "",
      };
    }
    if (roomCreateSourceMode === "youtube") {
      return {
        label: "YouTube 播放清單",
        title: selectedYoutubePlaylist?.title || "尚未選擇 YouTube 播放清單",
        detail: `${playlistItems.length} 首歌曲`,
        thumbnail:
          selectedYoutubePlaylist?.thumbnail ||
          playlistPreviewItems[0]?.thumbnail ||
          "",
      };
    }
    if (roomCreateSourceMode === "publicCollection") {
      return {
        label: "公開收藏庫",
        title:
          selectedCollection?.title ||
          selectedSharedCollection?.title ||
          "尚未選擇公開收藏庫",
        detail: `共 ${playlistItems.length} 首歌曲`,
        thumbnail: selectedCollectionThumb,
      };
    }
    if (roomCreateSourceMode === "privateCollection") {
      return {
        label: "個人收藏庫",
        title:
          selectedCollection?.title ||
          selectedSharedCollection?.title ||
          "尚未選擇個人收藏庫",
        detail: `共 ${playlistItems.length} 首歌曲`,
        thumbnail: selectedCollectionThumb,
      };
    }
    return null;
  }, [
    isCreateSourceReady,
    lastFetchedPlaylistTitle,
    playlistItems.length,
    playlistPreviewItems,
    roomCreateSourceMode,
    selectedCollection?.title,
    selectedSharedCollection?.title,
    selectedCollectionThumb,
    selectedYoutubePlaylist?.thumbnail,
    selectedYoutubePlaylist?.title,
  ]);
  const createLibraryColumns = isLibraryGridWide ? 2 : 1;
  const youtubeListRowHeight = 80;
  const youtubeListHeight = Math.min(
    640,
    Math.max(
      youtubeListRowHeight,
      filteredCreateYoutubePlaylists.length * youtubeListRowHeight,
    ),
  );
  const collectionListRowHeight = 92;
  const collectionListRowCount =
    filteredCreateCollections.length +
    (collectionsHasMore || collectionsLoadingMore ? 1 : 0);
  const collectionListHeight = Math.min(
    640,
    Math.max(
      collectionListRowHeight,
      collectionListRowCount * collectionListRowHeight,
    ),
  );

  const renderYoutubeCard = (
    playlistValue: unknown,
    _itemIndex: number,
    view: "grid" | "list",
  ) => {
    const playlist = playlistValue as (typeof youtubePlaylists)[number];
    const itemCountLabel = `${playlist.itemCount} 首`;

    if (view === "grid") {
      return (
        <button
          key={playlist.id}
          type="button"
          onClick={() => {
            void handlePickYoutubeSource(playlist.id);
          }}
          className={`group h-full overflow-hidden rounded-[22px] border text-left transition ${
            selectedCreateYoutubeId === playlist.id
              ? "border-rose-300/50 bg-slate-950/70 shadow-[0_24px_44px_-28px_rgba(251,113,133,0.4)]"
              : "border-rose-300/16 bg-slate-950/55 hover:border-rose-300/34 hover:bg-slate-950/72 hover:shadow-[0_22px_42px_-30px_rgba(251,113,133,0.28)]"
          }`}
        >
          <div className="relative h-36 w-full overflow-hidden bg-slate-900/60">
            {playlist.thumbnail ? (
              <img
                src={playlist.thumbnail}
                alt={playlist.title}
                className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[11px] text-[var(--mc-text-muted)]">
                無縮圖
              </div>
            )}
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.04)_0%,rgba(2,6,23,0.16)_46%,rgba(2,6,23,0.82)_100%)]" />
            <div className="absolute left-3 top-3">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-slate-950/55 px-2.5 py-1 text-[11px] font-medium text-rose-100 backdrop-blur-sm">
                <YouTube sx={{ fontSize: 13 }} />
                YouTube
              </span>
            </div>
          </div>
          <div className="space-y-3 px-4 py-3.5">
            <div className="space-y-1.5">
              <p className="line-clamp-1 text-[15px] font-semibold leading-6 text-[var(--mc-text)]">
                {playlist.title}
              </p>
              <p className="line-clamp-2 min-h-[2.5rem] text-[12px] leading-5 text-slate-300/88">
                YouTube 播放清單匯入來源
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-1.5 text-[14px] font-semibold leading-none text-slate-200/92">
                <PlayCircleOutlineRounded
                  sx={{ fontSize: 18, color: "rgba(251, 113, 133, 0.92)" }}
                />
                <span>{itemCountLabel}</span>
              </span>
            </div>
          </div>
        </button>
      );
    }

    return (
      <button
        key={playlist.id}
        type="button"
        onClick={() => {
          void handlePickYoutubeSource(playlist.id);
        }}
        className={`rounded-xl border text-left transition ${
          selectedCreateYoutubeId === playlist.id
            ? "border-rose-300/50 bg-rose-500/10"
            : "border-rose-300/18 bg-slate-950/25 hover:border-rose-300/34"
        } flex w-full items-center gap-3 px-3 py-2`}
      >
        <div className="h-11 w-16 shrink-0 overflow-hidden rounded-md bg-slate-900/40">
          {playlist.thumbnail ? (
            <img
              src={playlist.thumbnail}
              alt={playlist.title}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] text-[var(--mc-text-muted)]">
              無縮圖
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <span className="truncate text-sm font-semibold text-[var(--mc-text)]">
              {playlist.title}
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] leading-none text-rose-100/90">
              <YouTube sx={{ fontSize: 12, marginRight: "4px" }} />
              YouTube
            </span>
          </div>
          <p className="mt-1 truncate text-xs text-[var(--mc-text-muted)]">
            YouTube 播放清單匯入來源
          </p>
          <div className="mt-2 flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold leading-none text-slate-200/90">
              <PlayCircleOutlineRounded
                sx={{ fontSize: 17, color: "rgba(251, 113, 133, 0.92)" }}
              />
              <span>{itemCountLabel}</span>
            </span>
          </div>
        </div>
      </button>
    );
  };

  const renderCollectionCard = (
    collectionValue: unknown,
    _itemIndex: number,
    view: "grid" | "list",
  ) => {
    const collection = collectionValue as (typeof collections)[number];
    const previewThumbnail =
      collection.cover_thumbnail_url ||
      (collection.cover_provider === "youtube" && collection.cover_source_id
        ? `https://i.ytimg.com/vi/${collection.cover_source_id}/hqdefault.jpg`
        : "");
    const isPublicLibraryTab = createLibraryTab === "public";
    const visibilityLabel =
      (collection.visibility ?? "private") === "public" ? "公開" : "私人";
    const coverMetaLabel = [
      collection.cover_title ||
        (isPublicLibraryTab ? "收藏庫題目預覽" : "私人收藏庫"),
      collection.cover_duration_sec
        ? formatDurationLabel(collection.cover_duration_sec)
        : null,
    ]
      .filter(Boolean)
      .join(" · ");
    const itemCountLabel =
      typeof collection.item_count === "number"
        ? `${Math.max(0, Number(collection.item_count ?? 0))}`
        : null;
    const statsMeta = [
      itemCountLabel
        ? {
            key: "questions",
            icon: (
              <QuizRounded
                sx={{ fontSize: 17, color: "rgba(103, 232, 249, 0.94)" }}
              />
            ),
            label: `${itemCountLabel} 題`,
          }
        : null,
      typeof collection.use_count === "number"
        ? {
            key: "plays",
            icon: (
              <BarChartRounded
                sx={{ fontSize: 18, color: "rgba(125, 211, 252, 0.92)" }}
              />
            ),
            label: `${Math.max(0, Number(collection.use_count ?? 0))}`,
          }
        : null,
      typeof collection.favorite_count === "number"
        ? {
            key: "favorites",
            icon: (
              <StarBorderRounded
                sx={{ fontSize: 17, color: "rgba(250, 204, 21, 0.9)" }}
              />
            ),
            label: `${collection.favorite_count}`,
          }
        : null,
    ].filter(Boolean) as Array<{
      key: string;
      icon: ReactNode;
      label: string;
    }>;

    if (view === "grid") {
      return (
        <button
          key={collection.id}
          type="button"
          onClick={() => {
            const scope = createLibraryTab === "public" ? "public" : "owner";
            void handlePickCollectionSource(collection.id, scope);
          }}
          className={`group h-full overflow-hidden rounded-[22px] border text-left transition ${
            selectedCreateCollectionId === collection.id
              ? "border-cyan-300/55 bg-slate-950/70 shadow-[0_24px_44px_-28px_rgba(34,211,238,0.45)]"
              : "border-cyan-300/18 bg-slate-950/55 hover:border-cyan-300/38 hover:bg-slate-950/72 hover:shadow-[0_22px_42px_-30px_rgba(34,211,238,0.32)]"
          }`}
        >
          <div className="relative h-36 w-full overflow-hidden bg-slate-900/60">
            {previewThumbnail ? (
              <img
                src={previewThumbnail}
                alt={collection.cover_title ?? collection.title}
                className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[11px] text-[var(--mc-text-muted)]">
                無縮圖
              </div>
            )}
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.04)_0%,rgba(2,6,23,0.16)_46%,rgba(2,6,23,0.82)_100%)]" />
            {!isPublicLibraryTab ? (
              <div className="absolute left-3 top-3">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-slate-950/55 px-2.5 py-1 text-[11px] font-medium text-slate-100 backdrop-blur-sm">
                  {(collection.visibility ?? "private") === "public" ? (
                    <PublicOutlined sx={{ fontSize: 13 }} />
                  ) : (
                    <LockOutlined sx={{ fontSize: 13 }} />
                  )}
                  {visibilityLabel}
                </span>
              </div>
            ) : null}
          </div>
          <div className="space-y-3 px-4 py-3.5">
            <div className="space-y-1.5">
              <p className="line-clamp-1 text-[15px] font-semibold leading-6 text-[var(--mc-text)]">
                {collection.title}
              </p>
              <p className="line-clamp-2 min-h-[2.5rem] text-[12px] leading-5 text-slate-300/88">
                {coverMetaLabel}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {statsMeta.length > 0 ? (
                statsMeta.map((meta) => (
                  <span
                    key={`${collection.id}-${meta.key}`}
                    className="inline-flex items-center gap-1.5 text-[14px] font-semibold leading-none text-slate-200/92"
                  >
                    {meta.icon}
                    <span>{meta.label}</span>
                  </span>
                ))
              ) : (
                <span className="text-[11px] leading-none text-[var(--mc-text-muted)]">
                  尚無統計資料
                </span>
              )}
            </div>
          </div>
        </button>
      );
    }

    return (
      <button
        key={collection.id}
        type="button"
        onClick={() => {
          const scope = createLibraryTab === "public" ? "public" : "owner";
          void handlePickCollectionSource(collection.id, scope);
        }}
        className={`rounded-xl border px-3 py-2 text-left transition ${
          selectedCreateCollectionId === collection.id
            ? "border-cyan-300/55 bg-cyan-500/10"
            : "border-cyan-300/25 bg-slate-950/25 hover:border-cyan-300/45"
        } w-full`}
      >
        <div className="flex items-center gap-3">
          <div className="h-11 w-16 shrink-0 overflow-hidden rounded-md bg-slate-900/40">
            {previewThumbnail ? (
              <img
                src={previewThumbnail}
                alt={collection.cover_title ?? collection.title}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[10px] text-[var(--mc-text-muted)]">
                無縮圖
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <p className="truncate text-sm font-semibold text-[var(--mc-text)]">
                {collection.title}
              </p>
              {!isPublicLibraryTab ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] leading-none text-slate-200/88">
                  {(collection.visibility ?? "private") === "public" ? (
                    <PublicOutlined sx={{ fontSize: 12 }} />
                  ) : (
                    <LockOutlined sx={{ fontSize: 12 }} />
                  )}
                  {visibilityLabel}
                </span>
              ) : null}
            </div>
            <p className="mt-1 truncate text-xs text-[var(--mc-text-muted)]">
              {coverMetaLabel}
            </p>
            <div className="mt-2 flex flex-wrap gap-3">
              {statsMeta.map((meta) => (
                <span
                  key={`${collection.id}-list-${meta.key}`}
                  className="inline-flex items-center gap-1.5 text-[13px] font-semibold leading-none text-slate-200/90"
                >
                  {meta.icon}
                  <span>{meta.label}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </button>
    );
  };

  useEffect(() => {
    if (createLibraryTab === "public") {
      const switchedIntoPublic =
        previousCreateLibraryTabRef.current !== "public";
      previousCreateLibraryTabRef.current = createLibraryTab;
      if (switchedIntoPublic) {
        void fetchCollections("public", { query: createLibrarySearch });
        return;
      }
      const handle = window.setTimeout(() => {
        void fetchCollections("public", { query: createLibrarySearch });
      }, 350);
      return () => window.clearTimeout(handle);
    }
    previousCreateLibraryTabRef.current = createLibraryTab;
    if (!canUseGoogleLibraries) return;
    if (createLibraryTab === "personal") {
      void fetchCollections("owner");
      return;
    }
    if (
      createLibraryTab === "youtube" &&
      youtubePlaylists.length === 0 &&
      !youtubePlaylistsLoading &&
      !hasRequestedYoutubePlaylistsRef.current
    ) {
      hasRequestedYoutubePlaylistsRef.current = true;
      void fetchYoutubePlaylists();
    }
  }, [
    canUseGoogleLibraries,
    createLibraryTab,
    createLibrarySearch,
    fetchCollections,
    fetchYoutubePlaylists,
    publicCollectionsSort,
    youtubePlaylists.length,
    youtubePlaylistsLoading,
  ]);

  useEffect(() => {
    if (authUser) return;
    hasRequestedYoutubePlaylistsRef.current = false;
  }, [authUser]);
  useEffect(() => {
    if (
      createLibraryView !== "grid" ||
      (createLibraryTab !== "public" && createLibraryTab !== "personal") ||
      collectionsLoading ||
      collectionsLoadingMore ||
      !collectionsHasMore
    ) {
      return;
    }
    const container = createLibraryScrollRef.current;
    if (!container) return;
    if (container.scrollHeight <= container.clientHeight + 24) {
      void loadMoreCollections();
    }
  }, [
    collections.length,
    collectionsHasMore,
    collectionsLoading,
    collectionsLoadingMore,
    createLibraryTab,
    createLibraryView,
    loadMoreCollections,
  ]);
  useEffect(() => {
    setCreateLibrarySearch("");
    if (createLibraryTab !== "public") {
      setIsPublicLibrarySearchExpanded(false);
    }
  }, [createLibraryTab]);
  useEffect(() => {
    if (!publicLibrarySearchActive) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (publicLibrarySearchPanelRef.current?.contains(target)) return;
      setIsPublicLibrarySearchExpanded(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [publicLibrarySearchActive]);
  useEffect(() => {
    const sharedCollectionId = searchParams.get("sharedCollection");
    if (!sharedCollectionId) return;

    const signature = sharedCollectionId;

    if (handledSharedCollectionRef.current === signature) return;
    handledSharedCollectionRef.current = signature;

    setGuideMode("create");
    setCreateLibraryTab("public");
    setCreateLeftTab("settings");
    setRoomCreateSourceMode("publicCollection");
    setSelectedCreateYoutubeId(null);
    setSelectedCreateCollectionId(sharedCollectionId);
    setSharedCollectionMeta({
      id: sharedCollectionId,
      title: "分享收藏庫",
      scope: "public",
    });
    handleResetPlaylist();
    void loadCollectionItems(sharedCollectionId, { force: true });
  }, [
    handleResetPlaylist,
    loadCollectionItems,
    searchParams,
    setRoomCreateSourceMode,
  ]);
  useEffect(() => {
    const sharedCollectionId = searchParams.get("sharedCollection");
    if (!sharedCollectionId) return;
    if (roomCreateSourceMode !== "publicCollection") return;
    if (selectedCreateCollectionId !== sharedCollectionId) return;
    if (playlistItems.length > 0 || playlistLoading) return;
    if (collectionItemsError) return;

    void loadCollectionItems(sharedCollectionId, { force: true });
  }, [
    collectionItemsError,
    loadCollectionItems,
    playlistItems.length,
    playlistLoading,
    roomCreateSourceMode,
    searchParams,
    selectedCreateCollectionId,
  ]);
  const handlePreviewPlaylistByUrl = async () => {
    const trimmed = playlistUrlDraft.trim();
    if (!canAttemptPlaylistPreview(trimmed)) {
      setPlaylistPreviewError(null);
      return;
    }
    setPlaylistPreviewError(null);
    try {
      await handleFetchPlaylistByUrl(trimmed);
    } catch {
      setPlaylistPreviewError("清單預覽失敗，請確認連結格式。");
    }
  };
  const handleCancelLinkPreview = () => {
    handleResetPlaylist();
    setPlaylistUrlDraft("");
    setPlaylistPreviewError(null);
    lastAutoPreviewUrlRef.current = "";
  };
  const handleClearPlaylistUrlInput = () => {
    if (linkPreviewLocked) {
      handleCancelLinkPreview();
      return;
    }
    setPlaylistUrlDraft("");
    setPlaylistPreviewError(null);
    lastAutoPreviewUrlRef.current = "";
  };
  useEffect(() => {
    if (createLibraryTab !== "link" || !isLinkSourceActive) return;
    const trimmed = playlistUrlDraft.trim();
    if (
      !canAttemptPlaylistPreview(trimmed) ||
      trimmed === lastAutoPreviewUrlRef.current
    ) {
      return;
    }
    const timer = window.setTimeout(() => {
      lastAutoPreviewUrlRef.current = trimmed;
      void handleFetchPlaylistByUrl(trimmed).catch(() => {
        setPlaylistPreviewError("清單預覽失敗，請確認連結格式。");
      });
    }, 450);
    return () => window.clearTimeout(timer);
  }, [
    createLibraryTab,
    handleFetchPlaylistByUrl,
    isLinkSourceActive,
    playlistUrlDraft,
  ]);
  const playlistUrlFormatWarning =
    trimmedPlaylistUrlDraft &&
    !canAttemptPlaylistPreview(trimmedPlaylistUrlDraft)
      ? "請輸入有效的 YouTube 播放清單連結"
      : null;
  const playlistUrlErrorMessage = playlistPreviewError || playlistError || null;
  const showPlaylistUrlError =
    Boolean(trimmedPlaylistUrlDraft) && Boolean(playlistUrlErrorMessage);
  const showPlaylistUrlWarning =
    Boolean(trimmedPlaylistUrlDraft) &&
    !showPlaylistUrlError &&
    Boolean(playlistUrlFormatWarning);
  const playlistUrlTooltipMessage = showPlaylistUrlError
    ? playlistUrlErrorMessage
    : showPlaylistUrlWarning
      ? playlistUrlFormatWarning
      : "";
  const linkPlaylistCount = linkPlaylistPreviewItems.length;
  const handleActivateLinkSource = () => {
    setRoomCreateSourceMode("link");
    setSelectedCreateCollectionId(null);
    setSelectedCreateYoutubeId(null);
    setSharedCollectionMeta(null);
    handleResetPlaylist();
    setPlaylistPreviewError(null);
    lastAutoPreviewUrlRef.current = "";
  };
  const handlePickLinkSource = () => {
    setRoomCreateSourceMode("link");
    setSelectedCreateCollectionId(null);
    setSelectedCreateYoutubeId(null);
    setSharedCollectionMeta(null);
    setCreateLeftTab("settings");
  };
  const handlePickYoutubeSource = async (playlistId: string) => {
    setRoomCreateSourceMode("youtube");
    setSelectedCreateYoutubeId(playlistId);
    setSelectedCreateCollectionId(null);
    setSharedCollectionMeta(null);
    setCreateLeftTab("settings");
    await importYoutubePlaylist(playlistId);
  };
  const handlePickCollectionSource = async (
    collectionId: string,
    scope: "public" | "owner",
  ) => {
    setRoomCreateSourceMode(
      scope === "public" ? "publicCollection" : "privateCollection",
    );
    setSelectedCreateCollectionId(collectionId);
    setSelectedCreateYoutubeId(null);
    setSharedCollectionMeta(null);
    setCreateLeftTab("settings");
    await loadCollectionItems(collectionId, { force: true });
  };
  const handleBackToCreateLibrary = () => {
    setCreateLeftTab("library");
    setSelectedCreateCollectionId(null);
    setSelectedCreateYoutubeId(null);
    setSharedCollectionMeta(null);
    handledSharedCollectionRef.current = null;
    handleResetPlaylist();
    setPlaylistPreviewError(null);
    lastAutoPreviewUrlRef.current = "";

    if (searchParams.get("sharedCollection")) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("sharedCollection");
      navigate(
        {
          search: nextParams.toString() ? `?${nextParams.toString()}` : "",
        },
        { replace: true },
      );
    }
  };
  const closePasswordDialog = () => {
    setPasswordDialog(null);
    setPasswordDraft("");
  };
  const closeJoinConfirmDialog = () => {
    setJoinConfirmDialog(null);
  };
  const openPasswordDialog = (roomId: string, roomName: string) => {
    setJoinPasswordInput("");
    setPasswordDraft("");
    setPasswordDialog({ roomId, roomName });
  };
  const proceedJoinRoom = (
    roomCode: string,
    roomName: string,
    hasPassword: boolean,
  ) => {
    if (hasPassword) {
      openPasswordDialog(roomCode, roomName);
      return;
    }
    setJoinPasswordInput("");
    handleJoinRoom(roomCode, false);
  };
  const openInProgressJoinDialog = (room: RoomSummary) => {
    setJoinConfirmDialog({
      roomCode: room.roomCode,
      roomName: room.name,
      hasPassword: roomRequiresPin(room),
      playlistTitle: getRoomPlaylistLabel(room),
      playerCount: room.playerCount,
      maxPlayers: room.maxPlayers,
      questionCount: room.gameSettings?.questionCount,
      currentQuestionNo:
        typeof room.currentQuestionNo === "number"
          ? room.currentQuestionNo
          : null,
      completedQuestionCount:
        typeof room.completedQuestionCount === "number"
          ? room.completedQuestionCount
          : undefined,
      totalQuestionCount:
        typeof room.totalQuestionCount === "number"
          ? room.totalQuestionCount
          : room.gameSettings?.questionCount,
    });
  };
  const handleConfirmJoinInProgress = () => {
    if (!joinConfirmDialog) return;
    proceedJoinRoom(
      joinConfirmDialog.roomCode,
      joinConfirmDialog.roomName,
      joinConfirmDialog.hasPassword,
    );
    closeJoinConfirmDialog();
  };
  const handleConfirmJoinWithPassword = () => {
    if (!passwordDialog) return;
    const trimmed = passwordDraft.trim();
    if (!trimmed) return;
    if (!/^\d{4}$/.test(trimmed)) return;
    setJoinPasswordInput(trimmed);
    handleJoinRoom(passwordDialog.roomId, true, trimmed);
    closePasswordDialog();
  };
  const handleJoinRoomEntry = (room: RoomSummary) => {
    setSelectedJoinRoomId(room.id);
    if (isRoomCurrentlyPlaying(room)) {
      openInProgressJoinDialog(room);
      return;
    }
    proceedJoinRoom(
      room.roomCode,
      room.name || `房間 ${room.roomCode}`,
      roomRequiresPin(room),
    );
  };
  const handleDirectJoinById = async () => {
    if (directJoinLoading) return;
    const trimmed = directRoomIdInput.trim();
    if (!trimmed) {
      setDirectJoinError("請先輸入房間代碼。");
      setDirectJoinNeedsPassword(false);
      return;
    }
    if (trimmed.length < 6) {
      setDirectJoinError("請先輸入完整的 6 碼房間代碼。");
      return;
    }
    if (!resolvedDirectJoinRoom) {
      setDirectJoinError("請先等待房間資訊載入完成。");
      return;
    }
    if (isRoomCurrentlyPlaying(resolvedDirectJoinRoom)) {
      openInProgressJoinDialog(resolvedDirectJoinRoom);
      return;
    }
    proceedJoinRoom(
      resolvedDirectJoinRoom.roomCode,
      resolvedDirectJoinRoom.name || `房間 ${resolvedDirectJoinRoom.roomCode}`,
      roomRequiresPin(resolvedDirectJoinRoom),
    );
  };
  const handleCollectionGridScroll = (event: UIEvent<HTMLDivElement>) => {
    if (
      collectionsLoading ||
      collectionsLoadingMore ||
      !collectionsHasMore ||
      createLibraryView !== "grid"
    ) {
      return;
    }
    const target = event.currentTarget;
    const remaining =
      target.scrollHeight - target.scrollTop - target.clientHeight;
    if (remaining <= 180) {
      void loadMoreCollections();
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[84rem] flex-col gap-6 px-4 pb-6 pt-4 text-[var(--mc-text)]">
      {!currentRoom?.id && !username && (
        <section className="relative w-full overflow-hidden rounded-3xl border border-[var(--mc-border)] bg-[var(--mc-surface)]/80 p-5 sm:p-6">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-12 top-0 h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl" />
            <div className="absolute -right-14 bottom-0 h-44 w-44 rounded-full bg-amber-400/10 blur-3xl" />
          </div>

          <div className="relative">
            <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-300/90">
              Room Access
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--mc-text)]">
              選擇進入方式，開始遊戲
            </h2>
            <p className="mt-2 text-sm text-[var(--mc-text-muted)]">
              訪客可快速加入房間，Google 登入可保留收藏、歷史與跨裝置狀態。
            </p>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <article className="rounded-2xl border border-amber-300/30 bg-amber-400/5 p-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-amber-200/90">
                  先試玩
                </p>
                <h3 className="mt-2 text-lg font-semibold text-[var(--mc-text)]">
                  訪客快速進入
                </h3>
                <p className="mt-1 text-xs text-[var(--mc-text-muted)]">
                  設定暱稱即可加入房間，隨時可升級為 Google 登入。
                </p>
                <div className="mt-3 space-y-3">
                  <TextField
                    fullWidth
                    size="small"
                    label="訪客暱稱"
                    value={usernameInput}
                    onChange={(e) =>
                      setUsernameInput(e.target.value.slice(0, USERNAME_MAX))
                    }
                    inputProps={{ maxLength: USERNAME_MAX }}
                  />
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={handleSetUsername}
                    disabled={!usernameInput.trim()}
                  >
                    以訪客身份繼續
                  </Button>
                </div>
              </article>

              <article className="rounded-2xl border border-cyan-300/35 bg-cyan-500/5 p-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-200/90">
                  推薦登入
                </p>
                <h3 className="mt-2 text-lg font-semibold text-[var(--mc-text)]">
                  Google 登入
                </h3>
                <ul className="mt-2 space-y-1 text-xs text-[var(--mc-text-muted)]">
                  <li>同步收藏與題庫設定</li>
                  <li>保留對戰歷史與回顧</li>
                  <li>跨裝置延續狀態</li>
                </ul>
                <Button
                  fullWidth
                  variant="contained"
                  sx={{ mt: 3 }}
                  onClick={loginWithGoogle}
                  disabled={authLoading}
                >
                  {authLoading ? "登入中..." : "使用 Google 登入"}
                </Button>
              </article>
            </div>

            <div className="mt-4 text-xs text-[var(--mc-text-muted)]">
              先看看玩法？可前往
              <button
                type="button"
                onClick={() => navigate("/")}
                className="ml-1 text-cyan-300 hover:text-cyan-200"
              >
                首頁導覽
              </button>
              。
            </div>
          </div>
        </section>
      )}

      {!currentRoom?.id && username && (
        <section className="w-full">
          <div className="sm:p-5">
            <div className="relative grid w-full grid-cols-2 gap-1 rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/40 p-1">
              <div
                aria-hidden="true"
                className={`pointer-events-none absolute bottom-1 top-1 overflow-hidden rounded-xl border transition-[transform,background-color,border-color,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  guideMode === "create"
                    ? "border-cyan-300/55 bg-[linear-gradient(135deg,rgba(34,211,238,0.16),rgba(14,165,233,0.09))] shadow-[0_22px_42px_-30px_rgba(34,211,238,0.72)]"
                    : "border-amber-300/55 bg-[linear-gradient(135deg,rgba(251,191,36,0.16),rgba(245,158,11,0.1))] shadow-[0_22px_42px_-30px_rgba(251,191,36,0.68)]"
                }`}
                style={{
                  left: "0.25rem",
                  width: "calc(50% - 0.375rem)",
                  transform:
                    guideMode === "create"
                      ? "translateX(0)"
                      : "translateX(calc(100% + 0.25rem))",
                }}
              >
                <div
                  className={`absolute inset-x-[10%] top-0 h-[58%] rounded-full blur-2xl transition-opacity duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    guideMode === "create"
                      ? "bg-cyan-200/22 opacity-100"
                      : "bg-amber-100/22 opacity-100"
                  }`}
                />
                <div
                  className={`absolute inset-y-0 w-20 -skew-x-12 bg-gradient-to-r from-transparent via-white/12 to-transparent transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    guideMode === "create"
                      ? "translate-x-[-20%] opacity-90"
                      : "translate-x-[180%] opacity-90"
                  }`}
                />
              </div>
              <button
                type="button"
                className={`relative z-10 cursor-pointer rounded-xl border px-4 py-4 sm:px-5 sm:py-4.5 text-left transition-[background-color,border-color,color,transform,opacity] duration-260 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  guideMode === "create"
                    ? "border-transparent bg-transparent text-cyan-50"
                    : "border-transparent text-[var(--mc-text-muted)] hover:border-cyan-300/45 hover:bg-cyan-500/12 hover:text-cyan-100"
                }`}
                onClick={() => setGuideMode("create")}
              >
                <div
                  className={`flex items-center gap-3 transition-transform duration-260 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    guideMode === "create"
                      ? "translate-y-[-1px] scale-[1.01]"
                      : "translate-y-0 scale-100"
                  }`}
                >
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-2xl border transition-[transform,background-color,border-color,color,box-shadow] duration-260 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                      guideMode === "create"
                        ? "border-cyan-300/45 bg-cyan-400/14 text-cyan-100 shadow-[0_10px_24px_-18px_rgba(34,211,238,0.85)]"
                        : "border-[var(--mc-border)] bg-slate-900/30 text-[var(--mc-text-muted)]"
                    }`}
                  >
                    <AddCircleOutlineRounded fontSize="small" />
                  </span>
                  <p className="text-base font-semibold text-[var(--mc-text)]">
                    創建房間
                  </p>
                </div>
              </button>
              <button
                type="button"
                className={`relative z-10 cursor-pointer rounded-xl border px-4 py-4 sm:px-5 sm:py-4.5 text-left transition-[background-color,border-color,color,transform,opacity] duration-260 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  guideMode === "join"
                    ? "border-transparent bg-transparent text-amber-50"
                    : "border-transparent text-[var(--mc-text-muted)] hover:border-amber-300/45 hover:bg-amber-400/12 hover:text-amber-100"
                }`}
                onClick={() => setGuideMode("join")}
              >
                <div
                  className={`flex items-center gap-3 transition-transform duration-260 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    guideMode === "join"
                      ? "translate-y-[-1px] scale-[1.01]"
                      : "translate-y-0 scale-100"
                  }`}
                >
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-2xl border transition-[transform,background-color,border-color,color,box-shadow] duration-260 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                      guideMode === "join"
                        ? "border-amber-300/45 bg-amber-400/14 text-amber-100 shadow-[0_10px_24px_-18px_rgba(251,191,36,0.9)]"
                        : "border-[var(--mc-border)] bg-slate-900/30 text-[var(--mc-text-muted)]"
                    }`}
                  >
                    <MeetingRoomRounded fontSize="small" />
                  </span>
                  <p className="text-base font-semibold text-[var(--mc-text)]">
                    加入房間
                  </p>
                </div>
              </button>
            </div>

            <div
              key={`guide-panel-${guideMode}`}
              className="mt-4 animate-[guide-panel-enter_220ms_ease-out]"
            >
              {guideMode === "create" ? (
                <div className="rounded-2xl border border-[var(--mc-border)] p-3 sm:p-4">
                  <div className="grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)]">
                    <aside className="p-2 sm:p-2">
                      <div className=" flex items-center gap-3">
                        <p className="text-lg font-semibold tracking-wider text-[var(--mc-text)]">
                          {createLeftTab === "library"
                            ? "題庫來源"
                            : "房間設置"}
                        </p>
                      </div>

                      {createLeftTab === "library" ? (
                        <div className="mt-2 flex flex-col gap-2">
                          {[
                            {
                              key: "public",
                              label: "公開收藏庫",
                              icon: <PublicOutlined fontSize="small" />,
                            },
                            {
                              key: "personal",
                              label: "個人收藏庫",
                              icon: <BookmarkBorderRounded fontSize="small" />,
                            },
                            {
                              key: "youtube",
                              label: "從 YouTube 匯入",
                              icon: <YouTube fontSize="small" />,
                            },
                            {
                              key: "link",
                              label: "貼上清單連結",
                              icon: <LinkRounded fontSize="small" />,
                            },
                          ].map((item) => {
                            const key = item.key as
                              | "public"
                              | "personal"
                              | "youtube"
                              | "link";
                              const isActive = createLibraryTab === key;
                              const disabled =
                                !canUseGoogleLibraries &&
                                key !== "public" &&
                                key !== "link";
                            return (
                              <button
                                key={item.key}
                                type="button"
                                aria-disabled={disabled}
                                onClick={() => {
                                  if (disabled) return;
                                  setCreateLibraryTab(key);
                                }}
                                className={`rounded-xl px-3 py-2 text-left text-sm transition ${
                                  disabled
                                    ? "cursor-not-allowed bg-slate-900/40 text-slate-500"
                                    : isActive
                                      ? "cursor-pointer bg-cyan-500/10 text-cyan-100 shadow-[inset_3px_0_0_0_rgba(34,211,238,0.85)]"
                                      : "cursor-pointer bg-[var(--mc-surface)]/35 text-[var(--mc-text)] hover:bg-cyan-500/10 hover:text-cyan-100"
                                }`}
                              >
                                <span className="inline-flex w-full items-center justify-between gap-2">
                                  <span className="inline-flex items-center gap-2">
                                    <span className="text-cyan-200/90">
                                      {item.icon}
                                    </span>
                                    <span>{item.label}</span>
                                  </span>
                                  {disabled && (
                                    <Tooltip
                                      title="登入即可解鎖此功能"
                                      placement="top"
                                    >
                                      <LockOutlined
                                        sx={{ fontSize: 14, color: "#fbbf24" }}
                                      />
                                    </Tooltip>
                                  )}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="mt-2 space-y-2">
                          <button
                            type="button"
                            onClick={handleBackToCreateLibrary}
                            className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-500/8 px-3 py-1.5 text-xs text-cyan-100 transition hover:border-cyan-300/35 hover:bg-cyan-500/12"
                          >
                            <ChevronLeftRounded sx={{ fontSize: 16 }} />
                            更換題庫來源
                          </button>
                          {selectedSourceSummary ? (
                            <div className="rounded-xl border border-cyan-300/30 bg-cyan-500/8 p-3">
                              <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-200/90">
                                {selectedSourceSummary.label}
                              </p>
                              <div className="mt-2 overflow-hidden rounded-lg">
                                {selectedSourceSummary.thumbnail ? (
                                  <img
                                    src={selectedSourceSummary.thumbnail}
                                    alt={selectedSourceSummary.title}
                                    className="h-28 w-full scale-[1.08] object-cover [object-position:center_35%]"
                                    loading="lazy"
                                  />
                                ) : (
                                  <div className="flex h-28 w-full items-center justify-center text-xs text-[var(--mc-text-muted)]">
                                    無縮圖
                                  </div>
                                )}
                              </div>
                              <div className="mt-2 min-w-0">
                                <p className="truncate text-sm font-semibold text-[var(--mc-text)]">
                                  {selectedSourceSummary.title}
                                </p>
                                <p className="mt-1 text-xs text-[var(--mc-text-muted)]">
                                  {selectedSourceSummary.detail}
                                </p>
                              </div>
                              {createSourceHasImportIssues && (
                                <div className="mt-3 grid gap-2">
                                  <p className="text-[11px] font-semibold text-[var(--mc-text-muted)]">
                                    未成功匯入原因
                                  </p>
                                  <div className="rounded-md border border-amber-300/35 bg-amber-300/10 px-2 py-1.5">
                                    <p className="text-[11px] font-semibold text-amber-100">
                                      已移除：
                                      {playlistIssueSummary.removed.length} 首
                                    </p>
                                    <p className="mt-1 line-clamp-2 text-[11px] text-amber-100/90">
                                      {playlistIssueSummary.removed.length > 0
                                        ? playlistIssueSummary.removed
                                            .map((item) => item.title)
                                            .join("、")
                                        : "無"}
                                    </p>
                                  </div>
                                  <div className="rounded-md border border-fuchsia-300/35 bg-fuchsia-300/10 px-2 py-1.5">
                                    <p className="text-[11px] font-semibold text-fuchsia-100">
                                      隱私限制：
                                      {
                                        playlistIssueSummary.privateRestricted
                                          .length
                                      }{" "}
                                      首
                                    </p>
                                    <p className="mt-1 line-clamp-2 text-[11px] text-fuchsia-100/90">
                                      {playlistIssueSummary.privateRestricted
                                        .length > 0
                                        ? playlistIssueSummary.privateRestricted
                                            .map((item) => item.title)
                                            .join("、")
                                        : "無"}
                                    </p>
                                  </div>
                                  <div className="rounded-md border border-rose-300/35 bg-rose-300/10 px-2 py-1.5">
                                    <p className="text-[11px] font-semibold text-rose-100">
                                      嵌入限制：
                                      {
                                        playlistIssueSummary.embedBlocked.length
                                      }{" "}
                                      首
                                    </p>
                                    <p className="mt-1 line-clamp-2 text-[11px] text-rose-100/90">
                                      {playlistIssueSummary.embedBlocked
                                        .length > 0
                                        ? playlistIssueSummary.embedBlocked
                                            .map((item) => item.title)
                                            .join("、")
                                        : "無"}
                                    </p>
                                  </div>
                                  <div className="rounded-md border border-red-300/35 bg-red-300/10 px-2 py-1.5">
                                    <p className="text-[11px] font-semibold text-red-100">
                                      其他不可用：
                                      {playlistIssueSummary.unavailable.length +
                                        playlistIssueSummary.unknown.length +
                                        playlistIssueSummary.unknownCount}{" "}
                                      首
                                    </p>
                                    <p className="mt-1 line-clamp-2 text-[11px] text-red-100/90">
                                      {playlistIssueSummary.unavailable.length >
                                        0 ||
                                      playlistIssueSummary.unknown.length > 0
                                        ? [
                                            ...playlistIssueSummary.unavailable.map(
                                              (item) => item.title,
                                            ),
                                            ...playlistIssueSummary.unknown.map(
                                              (item) => item.title,
                                            ),
                                          ].join("、")
                                        : playlistIssueSummary.unknownCount > 0
                                          ? `共 ${playlistIssueSummary.unknownCount} 首（後端未提供明細）`
                                          : "無"}
                                    </p>
                                  </div>
                                </div>
                              )}
                              <button
                                type="button"
                                onClick={() => setCreateLeftTab("library")}
                                className="mt-2 text-xs text-cyan-200/90 hover:text-cyan-100"
                              >
                                重新選擇題庫
                              </button>
                            </div>
                          ) : (
                            <div className="rounded-xl border border-dashed border-cyan-300/30 bg-cyan-500/5 p-3 text-xs text-cyan-100/90">
                              先在上方選擇題庫來源，載入歌曲後即可切換到房間設置。
                            </div>
                          )}
                        </div>
                      )}
                    </aside>

                    <div className="rounded-2xl bg-[var(--mc-surface)]/25 p-4 lg:border-l lg:border-[var(--mc-border)]/45 lg:rounded-none lg:pl-5">
                      {createLeftTab === "settings" ? (
                        <div className="space-y-5">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-[10px] uppercase tracking-[0.24em] text-[var(--mc-text-muted)]">
                                房間設置
                              </p>
                              <h3 className="hidden">
                                調整這場房間的規則與節奏
                              </h3>
                            </div>
                            <div className="rounded-full border border-cyan-300/25 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-100">
                              {playlistItems.length > 0
                                ? `已載入 ${playlistItems.length} 首歌曲`
                                : "尚未準備題庫"}
                            </div>
                          </div>

                          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_320px]">
                            <div className="order-2 space-y-4 xl:order-none">
                              <section className="hidden">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-semibold text-[var(--mc-text)]">
                                      設定總覽
                                    </p>
                                    <p className="mt-1 text-xs text-[var(--mc-text-muted)]">
                                      先確認房間型態、題數與節奏，再決定是否微調。
                                    </p>
                                  </div>
                                  <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[11px] text-cyan-100">
                                    {createPresetCards.find(
                                      (preset) => preset.active,
                                    )?.label ?? "自訂配置"}
                                  </span>
                                </div>
                                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                  {createSettingsCards.map((item) => (
                                    <div
                                      key={item.label}
                                      className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                                    >
                                      <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--mc-text-muted)]">
                                        {item.label}
                                      </p>
                                      <p className="mt-1 text-sm font-semibold text-[var(--mc-text)]">
                                        {item.value}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </section>

                              <section className="rounded-3xl border border-[var(--mc-border)] bg-[var(--mc-surface)]/35 p-5">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-semibold text-[var(--mc-text)]">
                                      快速預設
                                    </p>
                                    <p className="mt-1 text-xs text-[var(--mc-text-muted)]">
                                      先選一組節奏，再微調題數與秒數。
                                    </p>
                                  </div>
                                  <span className="rounded-full border border-[var(--mc-border)] px-3 py-1 text-[11px] text-[var(--mc-text-muted)]">
                                    一鍵套用常用配置
                                  </span>
                                </div>
                                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                                  {createPresetCards.map((preset) => (
                                    <button
                                      key={preset.key}
                                      type="button"
                                      onClick={preset.onApply}
                                      className={`rounded-2xl border px-4 py-3 text-left transition ${
                                        preset.active
                                          ? "border-amber-300/60 bg-amber-300/10 shadow-[0_14px_32px_-24px_rgba(251,191,36,0.55)]"
                                          : "border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/35 hover:border-amber-300/35 hover:bg-[var(--mc-surface-strong)]/55"
                                      }`}
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="text-sm font-semibold text-[var(--mc-text)]">
                                          {preset.label}
                                        </span>
                                        {preset.active ? (
                                          <span className="rounded-full border border-amber-300/40 bg-amber-300/12 px-2 py-0.5 text-[10px] text-amber-100">
                                            使用中
                                          </span>
                                        ) : null}
                                      </div>
                                      <p className="mt-2 text-xs text-[var(--mc-text-muted)]">
                                        {preset.hint}
                                      </p>
                                    </button>
                                  ))}
                                </div>
                              </section>

                              <section className="rounded-3xl border border-[var(--mc-border)] bg-[var(--mc-surface)]/35 p-5">
                                <div className="flex items-center gap-2">
                                  <EditRounded
                                    sx={{ fontSize: 18, color: "#7dd3fc" }}
                                  />
                                  <p className="text-sm font-semibold text-[var(--mc-text)]">
                                    房間身份
                                  </p>
                                </div>
                                <div className="mt-4 space-y-4">
                                  <TextField
                                    size="small"
                                    fullWidth
                                    label="房間名稱"
                                    value={roomNameInput}
                                    onChange={(event) =>
                                      setRoomNameInput(event.target.value)
                                    }
                                  />

                                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                                    <div className="rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/25 p-4">
                                      <div className="flex items-center gap-2">
                                        {roomVisibilityInput === "private" ? (
                                          <LockRounded
                                            sx={{
                                              fontSize: 18,
                                              color: "#fbbf24",
                                            }}
                                          />
                                        ) : (
                                          <PublicOutlined
                                            sx={{
                                              fontSize: 18,
                                              color: "#7dd3fc",
                                            }}
                                          />
                                        )}
                                        <p className="text-sm font-semibold text-[var(--mc-text)]">
                                          房間可見性
                                        </p>
                                      </div>
                                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setRoomVisibilityInput("public")
                                          }
                                          className={`rounded-2xl border px-4 py-3 text-left transition ${
                                            roomVisibilityInput === "public"
                                              ? "border-cyan-300/60 bg-cyan-500/12 text-cyan-50"
                                              : "border-[var(--mc-border)] bg-[var(--mc-surface)]/30 text-[var(--mc-text-muted)] hover:border-cyan-300/35 hover:text-[var(--mc-text)]"
                                          }`}
                                        >
                                          <span className="inline-flex items-center gap-2 text-sm font-semibold">
                                            <PublicOutlined
                                              sx={{ fontSize: 18 }}
                                            />
                                            公開房
                                          </span>
                                          <p className="mt-1 text-xs opacity-80">
                                            房間會出現在大廳列表，也能透過代碼加入。
                                          </p>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setRoomVisibilityInput("private")
                                          }
                                          className={`rounded-2xl border px-4 py-3 text-left transition ${
                                            roomVisibilityInput === "private"
                                              ? "border-amber-300/60 bg-amber-400/12 text-amber-50"
                                              : "border-[var(--mc-border)] bg-[var(--mc-surface)]/30 text-[var(--mc-text-muted)] hover:border-amber-300/35 hover:text-[var(--mc-text)]"
                                          }`}
                                        >
                                          <span className="inline-flex items-center gap-2 text-sm font-semibold">
                                            <LockRounded
                                              sx={{ fontSize: 18 }}
                                            />
                                            私人房
                                          </span>
                                          <p className="mt-1 text-xs opacity-80">
                                            不會出現在大廳列表，需透過代碼加入。
                                          </p>
                                        </button>
                                      </div>
                                    </div>

                                    <div className="rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/25 p-4">
                                      <div className="flex items-center gap-2">
                                        <PasswordRounded
                                          sx={{
                                            fontSize: 18,
                                            color: "#fbbf24",
                                          }}
                                        />
                                        <p className="text-sm font-semibold text-[var(--mc-text)]">
                                          4 位 PIN
                                        </p>
                                      </div>
                                      <TextField
                                        size="small"
                                        fullWidth
                                        label="PIN（選填）"
                                        value={roomPasswordInput}
                                        onChange={(event) =>
                                          setRoomPasswordInput(
                                            event.target.value
                                              .replace(/\D/g, "")
                                              .slice(0, 4),
                                          )
                                        }
                                        className="mt-3"
                                        inputProps={{
                                          inputMode: "numeric",
                                          pattern: "\\d{4}",
                                          maxLength: 4,
                                        }}
                                        helperText={
                                          roomPasswordInput.trim()
                                            ? "加入者需要輸入這組 4 位 PIN。"
                                            : "所有房間都會自動產生加入代碼；留空則不需要 PIN。"
                                        }
                                      />
                                    </div>
                                  </div>
                                </div>
                              </section>

                              <section className="rounded-3xl border border-[var(--mc-border)] bg-[var(--mc-surface)]/35 p-5">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <GroupsRounded
                                        sx={{ fontSize: 18, color: "#7dd3fc" }}
                                      />
                                      <p className="text-sm font-semibold text-[var(--mc-text)]">
                                        玩家規模
                                      </p>
                                    </div>
                                    <p className="mt-1 text-xs text-[var(--mc-text-muted)]">
                                      用左右箭頭調整本房最多可加入的人數。
                                    </p>
                                  </div>
                                  <div className="rounded-full border border-[var(--mc-border)] px-3 py-1 text-[11px] text-[var(--mc-text-muted)]">
                                    範圍 {PLAYER_MIN} - {PLAYER_MAX}
                                  </div>
                                </div>

                                <div className="mt-4 flex items-center justify-center gap-3 rounded-2xl border border-white/8 bg-slate-950/20 px-4 py-3">
                                  <IconButton
                                    size="small"
                                    onClick={() =>
                                      setRoomMaxPlayersInput(
                                        String(
                                          Math.max(
                                            PLAYER_MIN,
                                            (parsedMaxPlayers ?? PLAYER_MIN) -
                                              1,
                                          ),
                                        ),
                                      )
                                    }
                                    disabled={
                                      (parsedMaxPlayers ?? PLAYER_MIN) <=
                                      PLAYER_MIN
                                    }
                                  >
                                    <ChevronLeftRounded />
                                  </IconButton>
                                  <div className="min-w-24 text-center">
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--mc-text-muted)]">
                                      目前上限
                                    </p>
                                    <p className="mt-1 text-3xl font-semibold text-[var(--mc-text)]">
                                      {parsedMaxPlayers ?? PLAYER_MIN}
                                    </p>
                                  </div>
                                  <IconButton
                                    size="small"
                                    onClick={() =>
                                      setRoomMaxPlayersInput(
                                        String(
                                          Math.min(
                                            PLAYER_MAX,
                                            (parsedMaxPlayers ?? PLAYER_MIN) +
                                              1,
                                          ),
                                        ),
                                      )
                                    }
                                    disabled={
                                      (parsedMaxPlayers ?? PLAYER_MIN) >=
                                      PLAYER_MAX
                                    }
                                  >
                                    <ChevronRightRounded />
                                  </IconButton>
                                </div>

                                <div className="mt-3 flex flex-wrap justify-center gap-2">
                                  {CREATE_PLAYER_QUICK_OPTIONS.map((count) => (
                                    <button
                                      key={count}
                                      type="button"
                                      onClick={() =>
                                        setRoomMaxPlayersInput(String(count))
                                      }
                                      className={`rounded-full border px-3 py-1.5 text-xs transition ${
                                        parsedMaxPlayers === count
                                          ? "border-cyan-300/60 bg-cyan-500/12 text-cyan-50"
                                          : "border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/35 text-[var(--mc-text-muted)] hover:border-cyan-300/35 hover:text-[var(--mc-text)]"
                                      }`}
                                    >
                                      {count} 人
                                    </button>
                                  ))}
                                </div>

                                {maxPlayersInvalid ? (
                                  <p className="mt-3 text-xs text-amber-200">
                                    請輸入有效的人數範圍。
                                  </p>
                                ) : null}
                              </section>

                              <section className="rounded-3xl border border-[var(--mc-border)] bg-[var(--mc-surface)]/35 p-5">
                                <div className="flex items-center gap-2">
                                  <TimerRounded
                                    sx={{ fontSize: 18, color: "#7dd3fc" }}
                                  />
                                  <p className="text-sm font-semibold text-[var(--mc-text)]">
                                    遊戲節奏
                                  </p>
                                </div>
                                <div className="mt-4 space-y-4">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateAllowCollectionClipTiming(
                                        !allowCollectionClipTiming,
                                      )
                                    }
                                    className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                                      allowCollectionClipTiming
                                        ? "border-emerald-300/45 bg-emerald-400/10 shadow-[0_16px_34px_-26px_rgba(16,185,129,0.55)]"
                                        : "border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/25 hover:border-emerald-300/30"
                                    }`}
                                  >
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                      <div className="flex items-start gap-3">
                                        <span className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-300/18 bg-slate-950/35">
                                          <TuneRounded
                                            sx={{
                                              fontSize: 18,
                                              color: allowCollectionClipTiming
                                                ? "#6ee7b7"
                                                : "#94a3b8",
                                            }}
                                          />
                                        </span>
                                        <div>
                                          <p className="text-sm font-semibold text-[var(--mc-text)]">
                                            沿用收藏庫片段時間
                                          </p>
                                          <p className="mt-1 text-xs text-[var(--mc-text-muted)]">
                                            啟用後會直接使用題庫中每首歌已設定的播放與起始秒數。
                                          </p>
                                        </div>
                                      </div>
                                      <span
                                        className={`rounded-full px-3 py-1 text-[11px] ${
                                          allowCollectionClipTiming
                                            ? "border border-emerald-300/35 bg-emerald-300/12 text-emerald-100"
                                            : "border border-[var(--mc-border)] text-[var(--mc-text-muted)]"
                                        }`}
                                      >
                                        {allowCollectionClipTiming
                                          ? "已啟用"
                                          : "目前關閉"}
                                      </span>
                                    </div>
                                  </button>

                                  <div className="rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/25 p-4">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <div>
                                        <p className="text-sm font-semibold text-[var(--mc-text)]">
                                          題數
                                        </p>
                                        <p className="mt-1 text-xs text-[var(--mc-text-muted)]">
                                          題數越多，整局時間越長。
                                        </p>
                                      </div>
                                      <div className="flex flex-wrap items-center justify-end gap-2">
                                        <span className="rounded-full border border-[var(--mc-border)] px-3 py-1 text-[11px] text-[var(--mc-text-muted)]">
                                          範圍 {questionMin} -{" "}
                                          {questionMaxLimit}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="mt-4 flex items-center justify-center gap-3 rounded-2xl border border-white/8 bg-slate-950/20 px-4 py-3">
                                      <IconButton
                                        size="small"
                                        onClick={() =>
                                          updateQuestionCount(
                                            Math.max(
                                              questionMin,
                                              questionCount - 1,
                                            ),
                                          )
                                        }
                                        disabled={!canDecreaseQuestionCount}
                                      >
                                        <ChevronLeftRounded />
                                      </IconButton>
                                      <div className="min-w-24 text-center">
                                        <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--mc-text-muted)]">
                                          目前題數
                                        </p>
                                        <p className="mt-1 text-3xl font-semibold text-[var(--mc-text)]">
                                          {questionCount}
                                        </p>
                                      </div>
                                      <IconButton
                                        size="small"
                                        onClick={() =>
                                          updateQuestionCount(
                                            Math.min(
                                              questionMaxLimit,
                                              questionCount + 1,
                                            ),
                                          )
                                        }
                                        disabled={!canIncreaseQuestionCount}
                                      >
                                        <ChevronRightRounded />
                                      </IconButton>
                                    </div>
                                    <div className="mt-3 flex flex-wrap justify-center gap-2">
                                      <Tooltip
                                        title={`設為最小題數 ${questionMin}`}
                                      >
                                        <span>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              updateQuestionCount(questionMin)
                                            }
                                            disabled={!canDecreaseQuestionCount}
                                            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--mc-border)] px-3 py-1.5 text-xs text-[var(--mc-text-muted)] transition hover:border-cyan-300/35 hover:text-[var(--mc-text)] disabled:cursor-not-allowed disabled:opacity-40"
                                          >
                                            <KeyboardDoubleArrowLeftRounded
                                              sx={{ fontSize: 16 }}
                                            />
                                            最小
                                          </button>
                                        </span>
                                      </Tooltip>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          updateQuestionCount(
                                            Math.max(
                                              questionMin,
                                              questionCount - 10,
                                            ),
                                          )
                                        }
                                        disabled={!canDecreaseQuestionCount}
                                        className="rounded-full border border-[var(--mc-border)] px-3 py-1.5 text-xs text-[var(--mc-text-muted)] transition hover:border-cyan-300/35 hover:text-[var(--mc-text)] disabled:cursor-not-allowed disabled:opacity-40"
                                      >
                                        -10
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          updateQuestionCount(
                                            Math.min(
                                              questionMaxLimit,
                                              questionCount + 10,
                                            ),
                                          )
                                        }
                                        disabled={!canIncreaseQuestionCount}
                                        className="rounded-full border border-[var(--mc-border)] px-3 py-1.5 text-xs text-[var(--mc-text-muted)] transition hover:border-cyan-300/35 hover:text-[var(--mc-text)] disabled:cursor-not-allowed disabled:opacity-40"
                                      >
                                        +10
                                      </button>
                                      <Tooltip
                                        title={`設為最大題數 ${questionMaxLimit}`}
                                      >
                                        <span>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              updateQuestionCount(
                                                questionMaxLimit,
                                              )
                                            }
                                            disabled={!canIncreaseQuestionCount}
                                            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--mc-border)] px-3 py-1.5 text-xs text-[var(--mc-text-muted)] transition hover:border-cyan-300/35 hover:text-[var(--mc-text)] disabled:cursor-not-allowed disabled:opacity-40"
                                          >
                                            最大
                                            <KeyboardDoubleArrowRightRounded
                                              sx={{ fontSize: 16 }}
                                            />
                                          </button>
                                        </span>
                                      </Tooltip>
                                    </div>
                                    <div className="mt-3 flex flex-wrap justify-center gap-2">
                                      {CREATE_QUESTION_QUICK_OPTIONS.map(
                                        (count) => (
                                          <button
                                            key={count}
                                            type="button"
                                            onClick={() =>
                                              updateQuestionCount(count)
                                            }
                                            className={`rounded-full border px-3 py-1.5 text-xs transition ${
                                              questionCount === count
                                                ? "border-cyan-300/60 bg-cyan-500/12 text-cyan-50"
                                                : "border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/35 text-[var(--mc-text-muted)] hover:border-cyan-300/35 hover:text-[var(--mc-text)]"
                                            }`}
                                          >
                                            {count} 題
                                          </button>
                                        ),
                                      )}
                                    </div>
                                  </div>

                                  <div
                                    className={`grid gap-3 ${
                                      allowCollectionClipTiming
                                        ? "lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]"
                                        : "lg:grid-cols-3"
                                    }`}
                                  >
                                    {!allowCollectionClipTiming ? (
                                      <div className="rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/25 p-4">
                                        <div className="flex items-center gap-2">
                                          <PlayCircleOutlineRounded
                                            sx={{
                                              fontSize: 18,
                                              color: "#7dd3fc",
                                            }}
                                          />
                                          <p className="text-sm font-semibold text-[var(--mc-text)]">
                                            作答時間
                                          </p>
                                        </div>
                                        <p className="mt-3 text-xs text-[var(--mc-text-muted)]">
                                          玩家在這題可以作答的時間長度。
                                        </p>
                                        <div className="mt-3 text-xl font-semibold text-[var(--mc-text)]">
                                          {playDurationSec}s
                                        </div>
                                        <div className="mt-3 px-1">
                                          <Slider
                                            value={playDurationSec}
                                            min={PLAY_DURATION_MIN}
                                            max={PLAY_DURATION_MAX}
                                            step={1}
                                            onChange={(_event, value) =>
                                              updatePlayDurationSec(
                                                Array.isArray(value)
                                                  ? value[0]
                                                  : value,
                                              )
                                            }
                                            valueLabelDisplay="auto"
                                          />
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/8 p-4">
                                        <div className="flex items-start gap-3">
                                          <span className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-300/20 bg-slate-950/35">
                                            <TuneRounded
                                              sx={{
                                                fontSize: 18,
                                                color: "#6ee7b7",
                                              }}
                                            />
                                          </span>
                                          <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold text-[var(--mc-text)]">
                                              題庫片段時間已接管播放設定
                                            </p>
                                            <p className="mt-1 text-xs text-[var(--mc-text-muted)]">
                                              作答時間與起始時間會依每首題目在收藏庫中設定的片段時間自動決定。
                                            </p>
                                          </div>
                                        </div>
                                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                          <div className="rounded-2xl border border-white/8 bg-white/5 px-3 py-3">
                                            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--mc-text-muted)]">
                                              作答時間
                                            </p>
                                            <p className="mt-1 text-sm font-semibold text-emerald-100">
                                              依題庫設定
                                            </p>
                                          </div>
                                          <div className="rounded-2xl border border-white/8 bg-white/5 px-3 py-3">
                                            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--mc-text-muted)]">
                                              起始時間
                                            </p>
                                            <p className="mt-1 text-sm font-semibold text-emerald-100">
                                              依題庫設定
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                    <div className="rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/25 p-4">
                                      <div className="flex items-center gap-2">
                                        <AccessTimeRounded
                                          sx={{
                                            fontSize: 18,
                                            color: "#fbbf24",
                                          }}
                                        />
                                        <p className="text-sm font-semibold text-[var(--mc-text)]">
                                          公布答案
                                        </p>
                                      </div>
                                      <p className="mt-3 text-xs text-[var(--mc-text-muted)]">
                                        題目結束後保留給大家看答案的時間。
                                      </p>
                                      <div className="mt-3 text-xl font-semibold text-[var(--mc-text)]">
                                        {revealDurationSec}s
                                      </div>
                                      <div className="mt-3 px-1">
                                        <Slider
                                          value={revealDurationSec}
                                          min={REVEAL_DURATION_MIN}
                                          max={REVEAL_DURATION_MAX}
                                          step={1}
                                          onChange={(_event, value) =>
                                            updateRevealDurationSec(
                                              Array.isArray(value)
                                                ? value[0]
                                                : value,
                                            )
                                          }
                                          valueLabelDisplay="auto"
                                        />
                                      </div>
                                    </div>

                                    {!allowCollectionClipTiming ? (
                                      <div className="rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/25 p-4">
                                        <div className="flex items-center gap-2">
                                          <ScheduleRounded
                                            sx={{
                                              fontSize: 18,
                                              color: "#c084fc",
                                            }}
                                          />
                                          <p className="text-sm font-semibold text-[var(--mc-text)]">
                                            起始時間
                                          </p>
                                        </div>
                                        <p className="mt-3 text-xs text-[var(--mc-text-muted)]">
                                          從歌曲的第幾秒開始播放題目。
                                        </p>
                                        <div className="mt-3 text-xl font-semibold text-[var(--mc-text)]">
                                          {startOffsetSec}s
                                        </div>
                                        <div className="mt-3 px-1">
                                          <Slider
                                            value={startOffsetSec}
                                            min={START_OFFSET_MIN}
                                            max={START_OFFSET_MAX}
                                            step={1}
                                            onChange={(_event, value) =>
                                              updateStartOffsetSec(
                                                Array.isArray(value)
                                                  ? value[0]
                                                  : value,
                                              )
                                            }
                                            valueLabelDisplay="auto"
                                          />
                                        </div>
                                      </div>
                                    ) : null}
                                  </div>
                                </div>
                              </section>
                            </div>
                            <aside className="order-1 space-y-4 xl:order-none xl:sticky xl:top-6 xl:self-start">
                              <section className="rounded-3xl border border-[var(--mc-border)] bg-[linear-gradient(180deg,rgba(8,15,28,0.96),rgba(15,23,42,0.82))] p-5 shadow-[0_24px_60px_-36px_rgba(14,165,233,0.5)]">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div>
                                    <p className="text-[10px] uppercase tracking-[0.24em] text-[var(--mc-text-muted)]">
                                      Create Snapshot
                                    </p>
                                    <h4 className="mt-2 text-base font-semibold text-[var(--mc-text)]">
                                      建立前確認
                                    </h4>
                                  </div>
                                  <div className="flex flex-wrap items-center justify-end gap-2">
                                    <span className="rounded-full border border-cyan-300/18 bg-cyan-500/8 px-3 py-1 text-[11px] text-cyan-100/90">
                                      {playlistItems.length > 0
                                        ? `已載入 ${playlistItems.length} 首`
                                        : "等待題庫"}
                                    </span>
                                    <span className="rounded-full border border-amber-300/18 bg-amber-300/10 px-3 py-1 text-[11px] text-amber-100">
                                      {activeCreatePreset?.label ?? "自訂配置"}
                                    </span>
                                  </div>
                                </div>
                                <div className="mt-4 rounded-2xl border border-white/8 bg-white/5 p-4">
                                  <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--mc-text-muted)]">
                                    房間名稱
                                  </p>
                                  <p className="mt-2 text-lg font-semibold text-[var(--mc-text)]">
                                    {roomNameInput.trim() || "未命名房間"}
                                  </p>
                                  <p className="mt-2 text-xs text-[var(--mc-text-muted)]">
                                    {activeCreatePreset
                                      ? activeCreatePreset.hint
                                      : "先確認房間型態、規模與節奏，再建立這場房間。"}
                                  </p>
                                </div>
                                <div className="mt-4 space-y-3">
                                  {selectedCreateSourceSummary ? (
                                    <div className="overflow-hidden rounded-2xl border border-cyan-300/18 bg-cyan-500/6">
                                      {selectedCreateSourceSummary.thumbnail ? (
                                        <div className="relative h-28 w-full overflow-hidden bg-slate-950/40">
                                          <img
                                            src={
                                              selectedCreateSourceSummary.thumbnail
                                            }
                                            alt={
                                              selectedCreateSourceSummary.title
                                            }
                                            className="h-full w-full object-cover"
                                            loading="lazy"
                                          />
                                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/35 to-transparent" />
                                        </div>
                                      ) : null}
                                      <div className="p-3">
                                        <div className="flex items-start gap-3">
                                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-300/18 bg-slate-950/45">
                                            {roomCreateSourceMode === "link" ? (
                                              <LinkRounded
                                                sx={{
                                                  fontSize: 18,
                                                  color: "#7dd3fc",
                                                }}
                                              />
                                            ) : roomCreateSourceMode ===
                                              "youtube" ? (
                                              <YouTube
                                                sx={{
                                                  fontSize: 18,
                                                  color: "#7dd3fc",
                                                }}
                                              />
                                            ) : (
                                              <BookmarkBorderRounded
                                                sx={{
                                                  fontSize: 18,
                                                  color: "#7dd3fc",
                                                }}
                                              />
                                            )}
                                          </div>
                                          <div className="min-w-0 flex-1">
                                            <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-200/80">
                                              {
                                                selectedCreateSourceSummary.label
                                              }
                                            </p>
                                            <p className="mt-1 line-clamp-2 text-sm font-semibold text-[var(--mc-text)]">
                                              {
                                                selectedCreateSourceSummary.title
                                              }
                                            </p>
                                            <p className="mt-1 text-xs text-[var(--mc-text-muted)]">
                                              {
                                                selectedCreateSourceSummary.detail
                                              }
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="rounded-2xl border border-dashed border-cyan-300/25 bg-cyan-500/6 p-3 text-xs text-cyan-100/90">
                                      先在左側選擇題庫來源，這裡會同步顯示本局使用的內容。
                                    </div>
                                  )}

                                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                                    {createSettingsCards.map((item) => (
                                      <div
                                        key={`sidebar-${item.label}`}
                                        className="rounded-2xl border border-white/8 bg-white/5 px-3 py-3"
                                      >
                                        <div className="flex items-start gap-3">
                                          <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-slate-950/35">
                                            {item.label === "房間型態" ? (
                                              roomVisibilityInput ===
                                              "private" ? (
                                                <LockRounded
                                                  sx={{
                                                    fontSize: 16,
                                                    color: "#fbbf24",
                                                  }}
                                                />
                                              ) : (
                                                <PublicOutlined
                                                  sx={{
                                                    fontSize: 16,
                                                    color: "#7dd3fc",
                                                  }}
                                                />
                                              )
                                            ) : item.label === "玩家上限" ? (
                                              <GroupsRounded
                                                sx={{
                                                  fontSize: 16,
                                                  color: "#7dd3fc",
                                                }}
                                              />
                                            ) : item.label === "題數" ? (
                                              <QuizRounded
                                                sx={{
                                                  fontSize: 16,
                                                  color: "#fbbf24",
                                                }}
                                              />
                                            ) : (
                                              <TimerRounded
                                                sx={{
                                                  fontSize: 16,
                                                  color: "#c084fc",
                                                }}
                                              />
                                            )}
                                          </span>
                                          <div className="min-w-0 flex-1">
                                            <span className="text-[11px] uppercase tracking-[0.18em] text-[var(--mc-text-muted)]">
                                              {item.label}
                                            </span>
                                            <p className="mt-1 text-sm font-semibold text-[var(--mc-text)]">
                                              {item.value}
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  {createRequirementsHintText ? (
                                    <div className="rounded-2xl border border-amber-300/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
                                      {createRequirementsHintText}
                                    </div>
                                  ) : (
                                    <div className="rounded-2xl border border-emerald-300/25 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-100">
                                      條件已就緒，可以直接建立房間。
                                    </div>
                                  )}
                                </div>
                                <Button
                                  variant="contained"
                                  fullWidth
                                  onClick={() => {
                                    void handleCreateRoom();
                                  }}
                                  disabled={!canCreateRoom}
                                  className="mt-5"
                                >
                                  {isCreatingRoom ? "建立中..." : "建立房間"}
                                </Button>
                                <p className="mt-3 text-center text-xs text-[var(--mc-text-muted)]">
                                  將建立
                                  {roomVisibilityInput === "private"
                                    ? "私人房"
                                    : "公開房"}
                                  {" · "}
                                  {parsedMaxPlayers ?? PLAYER_MIN} 人{" · "}
                                  {questionCount} 題
                                </p>
                              </section>
                            </aside>
                          </div>

                          <div className="hidden">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--mc-text-muted)]">
                                房間設置
                              </p>
                              <p className="text-xs text-[var(--mc-text-muted)]">
                                題庫：
                                {playlistItems.length > 0
                                  ? `${playlistItems.length} 首`
                                  : "尚未選擇"}
                              </p>
                            </div>
                            <div className="rounded-2xl border border-[var(--mc-border)] bg-[linear-gradient(135deg,rgba(8,15,28,0.92),rgba(15,23,42,0.78))] p-4 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.95)]">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-[var(--mc-text)]">
                                    設定總覽
                                  </p>
                                  <p className="mt-1 text-xs text-[var(--mc-text-muted)]">
                                    先確認這局的房間條件與節奏，再往下微調每個欄位。
                                  </p>
                                </div>
                                <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[11px] text-cyan-100">
                                  {playlistItems.length > 0
                                    ? `已載入 ${playlistItems.length} 首`
                                    : "等待題庫"}
                                </span>
                              </div>
                              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                                {createSettingsSummary.map((item) => (
                                  <div
                                    key={item.label}
                                    className="rounded-2xl border border-white/8 bg-white/5 px-3 py-3"
                                  >
                                    <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--mc-text-muted)]">
                                      {item.label}
                                    </div>
                                    <div className="mt-1 text-sm font-semibold text-[var(--mc-text)]">
                                      {item.value}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface)]/35 p-4">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-[var(--mc-text)]">
                                    快速預設
                                  </p>
                                  <p className="mt-1 text-xs text-[var(--mc-text-muted)]">
                                    先套一個常用節奏，再視情況微調題數與秒數。
                                  </p>
                                </div>
                                <span className="rounded-full border border-[var(--mc-border)] px-3 py-1 text-[11px] text-[var(--mc-text-muted)]">
                                  不會改動房名與來源
                                </span>
                              </div>
                              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                                {createSettingPresets.map((preset) => (
                                  <button
                                    key={preset.key}
                                    type="button"
                                    onClick={preset.onApply}
                                    className={`rounded-2xl border px-4 py-3 text-left transition ${
                                      preset.active
                                        ? "border-amber-300/60 bg-amber-300/10 shadow-[0_14px_32px_-24px_rgba(251,191,36,0.55)]"
                                        : "border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/35 hover:border-amber-300/35 hover:bg-[var(--mc-surface-strong)]/55"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-sm font-semibold text-[var(--mc-text)]">
                                        {preset.label}
                                      </span>
                                      {preset.active ? (
                                        <span className="rounded-full border border-amber-300/40 bg-amber-300/12 px-2 py-0.5 text-[10px] text-amber-100">
                                          使用中
                                        </span>
                                      ) : null}
                                    </div>
                                    <p className="mt-2 text-xs text-[var(--mc-text-muted)]">
                                      {preset.hint}
                                    </p>
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="space-y-3">
                              <div className="rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface)]/35 p-4">
                                <div className="flex items-center gap-2">
                                  <EditRounded
                                    sx={{ fontSize: 18, color: "#7dd3fc" }}
                                  />
                                  <p className="text-sm font-semibold text-[var(--mc-text)]">
                                    房間名稱
                                  </p>
                                </div>
                                <TextField
                                  size="small"
                                  fullWidth
                                  label="房間名稱"
                                  value={roomNameInput}
                                  onChange={(event) =>
                                    setRoomNameInput(event.target.value)
                                  }
                                  className="mt-3"
                                />
                              </div>

                              <div className="grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                                <div className="rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface)]/35 p-4">
                                  <div className="flex items-center gap-2">
                                    {roomVisibilityInput === "private" ? (
                                      <LockRounded
                                        sx={{ fontSize: 18, color: "#fbbf24" }}
                                      />
                                    ) : (
                                      <PublicOutlined
                                        sx={{ fontSize: 18, color: "#7dd3fc" }}
                                      />
                                    )}
                                    <p className="text-sm font-semibold text-[var(--mc-text)]">
                                      房間可見性
                                    </p>
                                  </div>
                                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setRoomVisibilityInput("public")
                                      }
                                      className={`rounded-2xl border px-4 py-3 text-left transition ${
                                        roomVisibilityInput === "public"
                                          ? "border-cyan-300/60 bg-cyan-500/12 text-cyan-50"
                                          : "border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/35 text-[var(--mc-text-muted)] hover:border-cyan-300/35 hover:text-[var(--mc-text)]"
                                      }`}
                                    >
                                      <span className="inline-flex items-center gap-2 text-sm font-semibold">
                                        <PublicOutlined sx={{ fontSize: 18 }} />
                                        公開房
                                      </span>
                                      <p className="mt-1 text-xs opacity-80">
                                        可被房間列表瀏覽與加入。
                                      </p>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setRoomVisibilityInput("private")
                                      }
                                      className={`rounded-2xl border px-4 py-3 text-left transition ${
                                        roomVisibilityInput === "private"
                                          ? "border-amber-300/60 bg-amber-400/12 text-amber-50"
                                          : "border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/35 text-[var(--mc-text-muted)] hover:border-amber-300/35 hover:text-[var(--mc-text)]"
                                      }`}
                                    >
                                      <span className="inline-flex items-center gap-2 text-sm font-semibold">
                                        <LockRounded sx={{ fontSize: 18 }} />
                                        私人房
                                      </span>
                                      <p className="mt-1 text-xs opacity-80">
                                        不會出現在大廳列表，需透過代碼加入。
                                      </p>
                                    </button>
                                  </div>
                                </div>

                                <div className="rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface)]/35 p-4">
                                  <div className="flex items-center gap-2">
                                    <PasswordRounded
                                      sx={{ fontSize: 18, color: "#fbbf24" }}
                                    />
                                    <p className="text-sm font-semibold text-[var(--mc-text)]">
                                      4 位 PIN
                                    </p>
                                  </div>
                                  <TextField
                                    size="small"
                                    fullWidth
                                    label="PIN（選填）"
                                    value={roomPasswordInput}
                                    onChange={(event) =>
                                      setRoomPasswordInput(
                                        event.target.value
                                          .replace(/\D/g, "")
                                          .slice(0, 4),
                                      )
                                    }
                                    className="mt-3"
                                    inputProps={{
                                      inputMode: "numeric",
                                      pattern: "\\d{4}",
                                      maxLength: 4,
                                    }}
                                    helperText={
                                      roomPasswordInput.trim()
                                        ? "加入者需要輸入這組 4 位 PIN。"
                                        : "所有房間都會自動產生加入代碼；留空則不需要 PIN。"
                                    }
                                  />
                                </div>
                              </div>

                              <div className="rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface)]/35 p-4">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div className="flex items-center gap-2">
                                    <GroupsRounded
                                      sx={{ fontSize: 18, color: "#7dd3fc" }}
                                    />
                                    <p className="text-sm font-semibold text-[var(--mc-text)]">
                                      玩家上限
                                    </p>
                                  </div>
                                  <span className="rounded-full border border-[var(--mc-border)] px-3 py-1 text-xs text-[var(--mc-text)]">
                                    {parsedMaxPlayers ?? PLAYER_MIN} 人
                                  </span>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {CREATE_PLAYER_QUICK_OPTIONS.map((count) => (
                                    <button
                                      key={count}
                                      type="button"
                                      onClick={() =>
                                        setRoomMaxPlayersInput(String(count))
                                      }
                                      className={`rounded-full border px-3 py-1 text-xs transition ${
                                        parsedMaxPlayers === count
                                          ? "border-cyan-300/60 bg-cyan-500/12 text-cyan-50"
                                          : "border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/35 text-[var(--mc-text-muted)] hover:border-cyan-300/35 hover:text-[var(--mc-text)]"
                                      }`}
                                    >
                                      {count} 人
                                    </button>
                                  ))}
                                </div>
                                <TextField
                                  size="small"
                                  fullWidth
                                  type="number"
                                  label={`玩家上限（${PLAYER_MIN}-${PLAYER_MAX}）`}
                                  value={roomMaxPlayersInput}
                                  onChange={(event) =>
                                    setRoomMaxPlayersInput(event.target.value)
                                  }
                                  error={Boolean(maxPlayersInvalid)}
                                  helperText={
                                    maxPlayersInvalid
                                      ? "玩家數格式錯誤"
                                      : "也可以直接手動輸入"
                                  }
                                  className="mt-3"
                                  slotProps={{
                                    htmlInput: {
                                      min: PLAYER_MIN,
                                      max: PLAYER_MAX,
                                      inputMode: "numeric",
                                    },
                                  }}
                                />
                              </div>

                              <div className="rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface)]/35 p-4">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div className="flex items-center gap-2">
                                    <QuizRounded
                                      sx={{ fontSize: 18, color: "#7dd3fc" }}
                                    />
                                    <p className="text-sm font-semibold text-[var(--mc-text)]">
                                      題數
                                    </p>
                                  </div>
                                  <span className="rounded-full border border-[var(--mc-border)] px-3 py-1 text-xs text-[var(--mc-text)]">
                                    {questionCount} 題
                                  </span>
                                </div>
                                <div className="mt-4 px-1">
                                  <Slider
                                    value={questionCount}
                                    min={questionMin}
                                    max={questionMaxLimit}
                                    step={1}
                                    onChange={(_event, value) =>
                                      updateQuestionCount(
                                        Array.isArray(value) ? value[0] : value,
                                      )
                                    }
                                    valueLabelDisplay="auto"
                                  />
                                </div>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {[10, 15, 20, 30].map((count) => (
                                    <button
                                      key={count}
                                      type="button"
                                      onClick={() => updateQuestionCount(count)}
                                      className={`rounded-full border px-3 py-1 text-xs transition ${
                                        questionCount === count
                                          ? "border-cyan-300/60 bg-cyan-500/12 text-cyan-50"
                                          : "border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/35 text-[var(--mc-text-muted)] hover:border-cyan-300/35 hover:text-[var(--mc-text)]"
                                      }`}
                                    >
                                      {count} 題
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div className="grid gap-3 xl:grid-cols-3">
                                <div className="rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface)]/35 p-4">
                                  <div className="flex items-center gap-2">
                                    <TimerRounded
                                      sx={{ fontSize: 18, color: "#7dd3fc" }}
                                    />
                                    <p className="text-sm font-semibold text-[var(--mc-text)]">
                                      播放秒數
                                    </p>
                                  </div>
                                  <div className="mt-3 text-xs text-[var(--mc-text-muted)]">
                                    {playDurationSec} 秒
                                  </div>
                                  <div className="mt-3 px-1">
                                    <Slider
                                      value={playDurationSec}
                                      min={PLAY_DURATION_MIN}
                                      max={PLAY_DURATION_MAX}
                                      step={1}
                                      onChange={(_event, value) =>
                                        updatePlayDurationSec(
                                          Array.isArray(value)
                                            ? value[0]
                                            : value,
                                        )
                                      }
                                      valueLabelDisplay="auto"
                                    />
                                  </div>
                                </div>
                                <div className="rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface)]/35 p-4">
                                  <div className="flex items-center gap-2">
                                    <AccessTimeRounded
                                      sx={{ fontSize: 18, color: "#fbbf24" }}
                                    />
                                    <p className="text-sm font-semibold text-[var(--mc-text)]">
                                      揭示秒數
                                    </p>
                                  </div>
                                  <div className="mt-3 text-xs text-[var(--mc-text-muted)]">
                                    {revealDurationSec} 秒
                                  </div>
                                  <div className="mt-3 px-1">
                                    <Slider
                                      value={revealDurationSec}
                                      min={REVEAL_DURATION_MIN}
                                      max={REVEAL_DURATION_MAX}
                                      step={1}
                                      onChange={(_event, value) =>
                                        updateRevealDurationSec(
                                          Array.isArray(value)
                                            ? value[0]
                                            : value,
                                        )
                                      }
                                      valueLabelDisplay="auto"
                                    />
                                  </div>
                                </div>
                                <div className="rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface)]/35 p-4">
                                  <div className="flex items-center gap-2">
                                    <ScheduleRounded
                                      sx={{ fontSize: 18, color: "#c084fc" }}
                                    />
                                    <p className="text-sm font-semibold text-[var(--mc-text)]">
                                      起始偏移
                                    </p>
                                  </div>
                                  <div className="mt-3 text-xs text-[var(--mc-text-muted)]">
                                    {startOffsetSec} 秒
                                  </div>
                                  <div className="mt-3 px-1">
                                    <Slider
                                      value={startOffsetSec}
                                      min={START_OFFSET_MIN}
                                      max={START_OFFSET_MAX}
                                      step={1}
                                      onChange={(_event, value) =>
                                        updateStartOffsetSec(
                                          Array.isArray(value)
                                            ? value[0]
                                            : value,
                                        )
                                      }
                                      valueLabelDisplay="auto"
                                    />
                                  </div>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  updateAllowCollectionClipTiming(
                                    !allowCollectionClipTiming,
                                  )
                                }
                                className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                                  allowCollectionClipTiming
                                    ? "border-emerald-300/45 bg-emerald-400/10"
                                    : "border-[var(--mc-border)] bg-[var(--mc-surface)]/35 hover:border-emerald-300/30"
                                }`}
                              >
                                <span className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--mc-text)]">
                                  <TuneRounded
                                    sx={{
                                      fontSize: 18,
                                      color: allowCollectionClipTiming
                                        ? "#6ee7b7"
                                        : "#94a3b8",
                                    }}
                                  />
                                  題庫片段時間
                                </span>
                                <p className="mt-2 text-xs text-[var(--mc-text-muted)]">
                                  {allowCollectionClipTiming
                                    ? "建立房間時沿用收藏庫原本設定的片段時間。"
                                    : "建立房間時使用目前這裡調整的播放與起始秒數。"}
                                </p>
                              </button>
                            </div>
                            <div className="hidden grid gap-3 sm:grid-cols-2">
                              <TextField
                                size="small"
                                fullWidth
                                label="房間名稱"
                                value={roomNameInput}
                                onChange={(event) =>
                                  setRoomNameInput(event.target.value)
                                }
                              />
                              <TextField
                                size="small"
                                fullWidth
                                select
                                label="可見度"
                                value={roomVisibilityInput}
                                onChange={(event) =>
                                  setRoomVisibilityInput(
                                    event.target.value as "public" | "private",
                                  )
                                }
                              >
                                <MenuItem value="public">公開</MenuItem>
                                <MenuItem value="private">私人</MenuItem>
                              </TextField>
                              <TextField
                                size="small"
                                fullWidth
                                label="4 位 PIN（選填）"
                                value={roomPasswordInput}
                                onChange={(event) =>
                                  setRoomPasswordInput(
                                    event.target.value
                                      .replace(/\D/g, "")
                                      .slice(0, 4),
                                  )
                                }
                                inputProps={{
                                  inputMode: "numeric",
                                  pattern: "\\d{4}",
                                  maxLength: 4,
                                }}
                              />
                              <TextField
                                size="small"
                                fullWidth
                                type="number"
                                label={`人數上限（${PLAYER_MIN}-${PLAYER_MAX}）`}
                                value={roomMaxPlayersInput}
                                onChange={(event) =>
                                  setRoomMaxPlayersInput(event.target.value)
                                }
                                error={Boolean(maxPlayersInvalid)}
                                helperText={
                                  maxPlayersInvalid
                                    ? "人數格式錯誤"
                                    : "留空則使用預設"
                                }
                                slotProps={{
                                  htmlInput: {
                                    min: PLAYER_MIN,
                                    max: PLAYER_MAX,
                                    inputMode: "numeric",
                                  },
                                }}
                              />
                              <TextField
                                size="small"
                                fullWidth
                                type="number"
                                label={`題數（${questionMin}-${questionMaxLimit}）`}
                                value={questionCount}
                                onChange={(event) => {
                                  const next = Number(event.target.value);
                                  if (!Number.isFinite(next)) return;
                                  updateQuestionCount(next);
                                }}
                                slotProps={{
                                  htmlInput: {
                                    min: questionMin,
                                    max: questionMaxLimit,
                                    inputMode: "numeric",
                                  },
                                }}
                              />
                              <TextField
                                size="small"
                                fullWidth
                                type="number"
                                label={`播放秒數（${PLAY_DURATION_MIN}-${PLAY_DURATION_MAX}）`}
                                value={playDurationSec}
                                onChange={(event) => {
                                  const next = Number(event.target.value);
                                  if (!Number.isFinite(next)) return;
                                  updatePlayDurationSec(next);
                                }}
                                slotProps={{
                                  htmlInput: {
                                    min: PLAY_DURATION_MIN,
                                    max: PLAY_DURATION_MAX,
                                    inputMode: "numeric",
                                  },
                                }}
                              />
                              <TextField
                                size="small"
                                fullWidth
                                type="number"
                                label={`揭示秒數（${REVEAL_DURATION_MIN}-${REVEAL_DURATION_MAX}）`}
                                value={revealDurationSec}
                                onChange={(event) => {
                                  const next = Number(event.target.value);
                                  if (!Number.isFinite(next)) return;
                                  updateRevealDurationSec(next);
                                }}
                                slotProps={{
                                  htmlInput: {
                                    min: REVEAL_DURATION_MIN,
                                    max: REVEAL_DURATION_MAX,
                                    inputMode: "numeric",
                                  },
                                }}
                              />
                              <TextField
                                size="small"
                                fullWidth
                                type="number"
                                label={`起始秒數（${START_OFFSET_MIN}-${START_OFFSET_MAX}）`}
                                value={startOffsetSec}
                                onChange={(event) => {
                                  const next = Number(event.target.value);
                                  if (!Number.isFinite(next)) return;
                                  updateStartOffsetSec(next);
                                }}
                                slotProps={{
                                  htmlInput: {
                                    min: START_OFFSET_MIN,
                                    max: START_OFFSET_MAX,
                                    inputMode: "numeric",
                                  },
                                }}
                              />
                            </div>
                            <label className="hidden inline-flex cursor-pointer items-center gap-2 text-sm text-[var(--mc-text-muted)]">
                              <input
                                type="checkbox"
                                className="h-4 w-4"
                                checked={allowCollectionClipTiming}
                                onChange={(event) =>
                                  updateAllowCollectionClipTiming(
                                    event.target.checked,
                                  )
                                }
                              />
                              套用收藏庫曲目剪輯時間
                            </label>

                            {createRequirementsHint && (
                              <p className="text-xs text-amber-200">
                                {createRequirementsHint}
                              </p>
                            )}
                            <div>
                              <Button
                                variant="contained"
                                onClick={() => {
                                  void handleCreateRoom();
                                }}
                                disabled={!canCreateRoom}
                              >
                                {isCreatingRoom ? "建立中..." : "建立房間"}
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          {createLibraryTab !== "link" &&
                            (createLibraryTab === "public" ? (
                              <div
                                ref={publicLibrarySearchPanelRef}
                                className={`relative ${publicLibrarySearchActive ? "z-30" : "z-10"}`}
                              >
                                <div
                                  className={`relative flex flex-col gap-3 rounded-2xl border p-3 sm:flex-row sm:items-center sm:justify-between ${
                                    publicLibrarySearchActive
                                      ? "border-cyan-300/30 bg-slate-950/20 shadow-[0_12px_30px_rgba(8,47,73,0.14)]"
                                      : "border-[var(--mc-border)]/80 bg-slate-950/18"
                                  }`}
                                >
                                  <div className="min-w-0 flex-1">
                                    <TextField
                                      fullWidth
                                      size="small"
                                      value={createLibrarySearch}
                                      onChange={(event) =>
                                        setCreateLibrarySearch(
                                          event.target.value,
                                        )
                                      }
                                      placeholder="搜尋題庫名稱、封面曲名或描述"
                                      slotProps={{
                                        input: {
                                          startAdornment: (
                                            <InputAdornment position="start">
                                              <SearchRounded
                                                sx={{
                                                  fontSize: 18,
                                                  color:
                                                    "rgba(148, 163, 184, 0.85)",
                                                }}
                                              />
                                            </InputAdornment>
                                          ),
                                        },
                                      }}
                                      sx={{
                                        "& .MuiOutlinedInput-root": {
                                          borderRadius: "18px",
                                          backgroundColor:
                                            "rgba(2, 6, 23, 0.3)",
                                          boxShadow: "none",
                                          "& fieldset": {
                                            borderColor:
                                              "rgba(148,163,184,0.18)",
                                          },
                                          "&:hover fieldset": {
                                            borderColor:
                                              "rgba(34,211,238,0.32)",
                                          },
                                          "&.Mui-focused fieldset": {
                                            borderColor:
                                              "rgba(34,211,238,0.48)",
                                          },
                                        },
                                      }}
                                    />
                                  </div>
                                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                                    <div className="flex items-center gap-2">
                                      {collectionScope === "public" &&
                                      collectionsLoading &&
                                      filteredCreateCollections.length > 0 ? (
                                        <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-300/18 bg-cyan-400/8 px-2.5 py-1 text-[11px] text-cyan-100/88">
                                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300" />
                                          搜尋中
                                        </span>
                                      ) : null}
                                      <span className="rounded-full border border-cyan-300/20 bg-cyan-400/8 px-3 py-1 text-[11px] text-cyan-100/90">
                                        共 {filteredCreateCollections.length}{" "}
                                        份題庫
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <div className="inline-flex items-center gap-1 rounded-full border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/60 p-1">
                                        <button
                                          type="button"
                                          className={`rounded-full px-3 py-1 text-xs ${
                                            createLibraryView === "grid"
                                              ? "cursor-pointer bg-cyan-500/20 text-cyan-100"
                                              : "cursor-pointer text-[var(--mc-text-muted)]"
                                          }`}
                                          onClick={() =>
                                            setCreateLibraryView("grid")
                                          }
                                        >
                                          圖示
                                        </button>
                                        <button
                                          type="button"
                                          className={`rounded-full px-3 py-1 text-xs ${
                                            createLibraryView === "list"
                                              ? "cursor-pointer bg-cyan-500/20 text-cyan-100"
                                              : "cursor-pointer text-[var(--mc-text-muted)]"
                                          }`}
                                          onClick={() =>
                                            setCreateLibraryView("list")
                                          }
                                        >
                                          清單
                                        </button>
                                      </div>
                                      <button
                                        type="button"
                                        aria-label="展開公開題庫排序選項"
                                        className={`inline-flex h-9 w-9 items-center justify-center rounded-full border ${
                                          publicLibrarySearchActive
                                            ? "border-cyan-300/32 bg-cyan-500/14 text-cyan-100"
                                            : "border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/60 text-[var(--mc-text-muted)] hover:text-slate-100"
                                        }`}
                                        onClick={() =>
                                          setIsPublicLibrarySearchExpanded(
                                            (prev) => !prev,
                                          )
                                        }
                                      >
                                        <TuneRounded sx={{ fontSize: 18 }} />
                                      </button>
                                    </div>
                                  </div>
                                  {publicLibrarySearchActive && (
                                    <div className="absolute left-3 right-3 top-full z-30 -mt-3 sm:left-4 sm:right-4">
                                      <div className="rounded-[0_0_22px_22px] border border-cyan-300/24 border-t-0 bg-slate-950 px-3 pb-3 pt-6 shadow-[0_24px_48px_rgba(2,6,23,0.48)] sm:px-4">
                                        <div className="flex flex-wrap items-center gap-2">
                                          {[
                                            {
                                              key: "favorites_first" as const,
                                              label: "推薦",
                                            },
                                            {
                                              key: "popular" as const,
                                              label: "人氣遊玩",
                                            },
                                            {
                                              key: "updated" as const,
                                              label: "最新題庫",
                                            },
                                          ].map((option) => (
                                            <button
                                              key={option.key}
                                              type="button"
                                              aria-pressed={
                                                publicCollectionsSort ===
                                                option.key
                                              }
                                              onMouseDown={(event) => {
                                                event.preventDefault();
                                                event.stopPropagation();
                                              }}
                                              className={`rounded-full px-3 py-1.5 text-xs font-semibold tracking-[0.08em] ${
                                                publicCollectionsSort ===
                                                option.key
                                                  ? "bg-cyan-500/20 text-cyan-100 ring-1 ring-cyan-300/32"
                                                  : "bg-slate-900 text-[var(--mc-text-muted)] ring-1 ring-white/10 hover:bg-slate-800 hover:text-slate-100"
                                              }`}
                                              onClick={(event) => {
                                                event.stopPropagation();
                                                setPublicCollectionsSort(
                                                  option.key,
                                                );
                                              }}
                                            >
                                              {option.label}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-3 rounded-2xl border border-[var(--mc-border)]/80 bg-slate-950/18 p-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0 flex-1">
                                  <TextField
                                    fullWidth
                                    size="small"
                                    value={createLibrarySearch}
                                    onChange={(event) =>
                                      setCreateLibrarySearch(event.target.value)
                                    }
                                    placeholder={
                                      createLibraryTab === "youtube"
                                        ? "搜尋 YouTube 播放清單"
                                        : "搜尋題庫名稱、封面曲名或描述"
                                    }
                                    slotProps={{
                                      input: {
                                        startAdornment: (
                                          <InputAdornment position="start">
                                            <SearchRounded
                                              sx={{
                                                fontSize: 18,
                                                color:
                                                  "rgba(148, 163, 184, 0.85)",
                                              }}
                                            />
                                          </InputAdornment>
                                        ),
                                      },
                                    }}
                                    sx={{
                                      "& .MuiOutlinedInput-root": {
                                        borderRadius: "18px",
                                        backgroundColor: "rgba(2, 6, 23, 0.3)",
                                      },
                                    }}
                                  />
                                </div>
                                <div className="flex items-center justify-between gap-3 sm:justify-end">
                                  <div className="flex items-center gap-2">
                                    <span className="rounded-full border border-cyan-300/20 bg-cyan-400/8 px-3 py-1 text-[11px] text-cyan-100/90">
                                      {createLibraryTab === "youtube"
                                        ? `共 ${filteredCreateYoutubePlaylists.length} 份清單`
                                        : `共 ${filteredCreateCollections.length} 份題庫`}
                                    </span>
                                  </div>
                                  <div className="inline-flex items-center gap-1 rounded-full border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/60 p-1">
                                    <button
                                      type="button"
                                      className={`rounded-full px-3 py-1 text-xs ${
                                        createLibraryView === "grid"
                                          ? "cursor-pointer bg-cyan-500/20 text-cyan-100"
                                          : "cursor-pointer text-[var(--mc-text-muted)]"
                                      }`}
                                      onClick={() =>
                                        setCreateLibraryView("grid")
                                      }
                                    >
                                      圖示
                                    </button>
                                    <button
                                      type="button"
                                      className={`rounded-full px-3 py-1 text-xs ${
                                        createLibraryView === "list"
                                          ? "cursor-pointer bg-cyan-500/20 text-cyan-100"
                                          : "cursor-pointer text-[var(--mc-text-muted)]"
                                      }`}
                                      onClick={() =>
                                        setCreateLibraryView("list")
                                      }
                                    >
                                      清單
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}

                          {!canUseGoogleLibraries &&
                          (createLibraryTab === "personal" ||
                            createLibraryTab === "youtube") ? (
                            <div className="mt-3 rounded-xl border border-dashed border-slate-600/60 bg-slate-900/40 p-4 text-sm text-slate-300">
                              <div className="mt-1">
                                <Button
                                  variant="contained"
                                  onClick={loginWithGoogle}
                                  disabled={authLoading}
                                >
                                  {authLoading
                                    ? "登入中..."
                                    : "使用 Google 登入"}
                                </Button>
                              </div>
                            </div>
                          ) : createLibraryTab === "link" ? (
                            <div className="mt-3 space-y-4">
                              <div className="mx-auto max-w-4xl rounded-[26px] border border-[var(--mc-border)] bg-[linear-gradient(180deg,rgba(2,6,23,0.34),rgba(15,23,42,0.22))] p-4 sm:p-5">
                                <div>
                                  <Tooltip
                                    title={playlistUrlTooltipMessage}
                                    placement="top"
                                    arrow
                                    open={Boolean(
                                      isPlaylistUrlFieldFocused &&
                                      trimmedPlaylistUrlDraft &&
                                      (showPlaylistUrlError ||
                                        showPlaylistUrlWarning),
                                    )}
                                    disableFocusListener
                                    disableHoverListener
                                    disableTouchListener
                                    slotProps={{
                                      tooltip: {
                                        sx: {
                                          fontSize: "0.82rem",
                                          lineHeight: 1.45,
                                          px: 1.4,
                                          py: 1,
                                          maxWidth: 360,
                                          bgcolor: showPlaylistUrlWarning
                                            ? "rgba(120, 53, 15, 0.96)"
                                            : undefined,
                                          color: showPlaylistUrlWarning
                                            ? "#fef3c7"
                                            : undefined,
                                          "& .MuiTooltip-arrow":
                                            showPlaylistUrlWarning
                                              ? {
                                                  color:
                                                    "rgba(120, 53, 15, 0.96)",
                                                }
                                              : undefined,
                                        },
                                      },
                                    }}
                                  >
                                    <TextField
                                      fullWidth
                                      size="small"
                                      label="YouTube 播放清單連結"
                                      placeholder="https://www.youtube.com/playlist?list=..."
                                      value={playlistUrlDraft}
                                      autoComplete="off"
                                      error={showPlaylistUrlError}
                                      onFocus={() =>
                                        setIsPlaylistUrlFieldFocused(true)
                                      }
                                      onBlur={() =>
                                        setIsPlaylistUrlFieldFocused(false)
                                      }
                                      onChange={(event) => {
                                        if (!isLinkSourceActive) {
                                          handleActivateLinkSource();
                                        }
                                        setPlaylistUrlDraft(event.target.value);
                                        if (playlistPreviewError)
                                          setPlaylistPreviewError(null);
                                      }}
                                      onKeyDown={(event) => {
                                        if (linkPreviewLocked) return;
                                        if (event.key === "Enter") {
                                          event.preventDefault();
                                          void handlePreviewPlaylistByUrl();
                                        }
                                      }}
                                      slotProps={{
                                        inputLabel: { shrink: true },
                                        input: {
                                          endAdornment:
                                            trimmedPlaylistUrlDraft ? (
                                              <InputAdornment position="end">
                                                <Tooltip
                                                  title={
                                                    linkPreviewLocked
                                                      ? playlistLoading &&
                                                        playlistUrlLooksValid
                                                        ? "取消目前讀取的清單"
                                                        : "取消目前清單，重新貼上連結"
                                                      : "清除目前輸入"
                                                  }
                                                  placement="top"
                                                >
                                                  <IconButton
                                                    size="small"
                                                    onClick={
                                                      handleClearPlaylistUrlInput
                                                    }
                                                    edge="end"
                                                    aria-label={
                                                      linkPreviewLocked
                                                        ? playlistLoading &&
                                                          playlistUrlLooksValid
                                                          ? "取消目前播放清單讀取"
                                                          : "取消目前清單預覽"
                                                        : "清除播放清單連結"
                                                    }
                                                    sx={{
                                                      color: linkPreviewLocked
                                                        ? "#fbbf24"
                                                        : "rgba(148,163,184,0.92)",
                                                    }}
                                                  >
                                                    <CloseRounded fontSize="small" />
                                                  </IconButton>
                                                </Tooltip>
                                              </InputAdornment>
                                            ) : undefined,
                                        },
                                        htmlInput: {
                                          autoComplete: "off",
                                          spellCheck: "false",
                                          readOnly: linkPreviewLocked,
                                        },
                                      }}
                                      sx={{
                                        "& .MuiInputLabel-root": {
                                          color: "rgba(248, 250, 252, 0.72)",
                                          transition:
                                            "color 180ms ease, transform 180ms ease",
                                        },
                                        "& .MuiInputLabel-root.Mui-focused": {
                                          color: "rgba(251, 191, 36, 0.96)",
                                        },
                                        "& .MuiOutlinedInput-root": {
                                          borderRadius: "20px",
                                          backgroundColor:
                                            "rgba(2, 6, 23, 0.32)",
                                          boxShadow:
                                            "0 0 0 1px rgba(148, 163, 184, 0.12), 0 10px 28px rgba(2, 6, 23, 0.18)",
                                          transition:
                                            "background-color 180ms ease, box-shadow 180ms ease, border-color 180ms ease",
                                          "& fieldset": {
                                            borderColor: showPlaylistUrlWarning
                                              ? "rgba(251, 191, 36, 0.4)"
                                              : showPlaylistUrlError
                                                ? "rgba(248, 113, 113, 0.5)"
                                                : "rgba(148, 163, 184, 0.2)",
                                          },
                                          "&:hover": {
                                            backgroundColor:
                                              "rgba(15, 23, 42, 0.52)",
                                            boxShadow: showPlaylistUrlWarning
                                              ? "0 0 0 1px rgba(251, 191, 36, 0.24), 0 16px 34px rgba(120, 53, 15, 0.18)"
                                              : showPlaylistUrlError
                                                ? "0 0 0 1px rgba(248, 113, 113, 0.26), 0 18px 38px rgba(127, 29, 29, 0.18)"
                                                : "0 0 0 1px rgba(34, 211, 238, 0.16), 0 16px 34px rgba(8, 47, 73, 0.2)",
                                          },
                                          "&:hover fieldset": {
                                            borderColor: showPlaylistUrlWarning
                                              ? "rgba(251, 191, 36, 0.58)"
                                              : showPlaylistUrlError
                                                ? "rgba(248, 113, 113, 0.66)"
                                                : "rgba(34, 211, 238, 0.34)",
                                          },
                                          "&.Mui-focused": {
                                            backgroundColor:
                                              "rgba(15, 23, 42, 0.62)",
                                            boxShadow: showPlaylistUrlWarning
                                              ? "0 0 0 1px rgba(251, 191, 36, 0.34), 0 18px 38px rgba(120, 53, 15, 0.2)"
                                              : showPlaylistUrlError
                                                ? "0 0 0 1px rgba(248, 113, 113, 0.28), 0 18px 38px rgba(127, 29, 29, 0.18)"
                                                : "0 0 0 1px rgba(251, 191, 36, 0.28), 0 18px 38px rgba(120, 53, 15, 0.18)",
                                          },
                                          "&.Mui-focused fieldset": {
                                            borderColor: showPlaylistUrlWarning
                                              ? "rgba(251, 191, 36, 0.82)"
                                              : showPlaylistUrlError
                                                ? "rgba(248, 113, 113, 0.72)"
                                                : "rgba(251, 191, 36, 0.72)",
                                          },
                                          "&.Mui-error": {
                                            boxShadow:
                                              "0 0 0 1px rgba(248, 113, 113, 0.18), 0 16px 34px rgba(127, 29, 29, 0.16)",
                                          },
                                        },
                                        "& .MuiOutlinedInput-input": {
                                          transition: "color 180ms ease",
                                          cursor: linkPreviewLocked
                                            ? "default"
                                            : "text",
                                        },
                                        "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-input":
                                          {
                                            color: "rgba(255, 255, 255, 0.98)",
                                          },
                                      }}
                                    />
                                  </Tooltip>
                                </div>
                              </div>
                              <div className="mx-auto max-w-4xl rounded-[26px] border border-cyan-300/25 bg-slate-950/25 p-4 sm:p-5">
                                {(linkPlaylistTitle ||
                                  linkPlaylistPreviewItems.length > 0) && (
                                  <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/25 px-4 py-3">
                                    <div className="min-w-0">
                                      {linkPlaylistTitle ? (
                                        <h3 className="truncate text-lg font-semibold tracking-[0.01em] text-[var(--mc-text)] sm:text-[1.25rem]">
                                          {linkPlaylistTitle}
                                        </h3>
                                      ) : (
                                        <h3 className="text-lg font-semibold tracking-[0.01em] text-[var(--mc-text)] sm:text-[1.25rem]">
                                          播放清單預覽
                                        </h3>
                                      )}
                                    </div>
                                    <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
                                      <span className="inline-flex items-center rounded-full border border-cyan-300/28 bg-cyan-300/10 px-3 py-1 text-[11px] font-semibold tracking-[0.18em] text-cyan-100/90">
                                        {linkPlaylistCount} 首曲目
                                      </span>
                                      {isLinkSourceActive && (
                                        <Button
                                          variant="contained"
                                          onClick={handlePickLinkSource}
                                          disabled={playlistItems.length === 0}
                                          sx={{
                                            borderRadius: "999px",
                                            px: 2.25,
                                            py: 0.85,
                                            minHeight: 0,
                                            fontWeight: 700,
                                            letterSpacing: "0.04em",
                                            boxShadow:
                                              "0 10px 24px rgba(245, 158, 11, 0.18)",
                                          }}
                                        >
                                          套用這份清單
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                )}
                                {playlistLoading &&
                                canAttemptPlaylistPreview(
                                  trimmedPlaylistUrlDraft,
                                ) &&
                                linkPlaylistPreviewItems.length === 0 ? (
                                  <div className="mt-3 flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-cyan-300/16 bg-slate-950/15 px-4 text-center">
                                    <CircularProgress
                                      size={34}
                                      thickness={4}
                                      sx={{ color: "#38bdf8" }}
                                    />
                                    <p className="mt-4 text-sm font-semibold text-[var(--mc-text)]">
                                      正在讀取播放清單
                                    </p>
                                    <p className="mt-2 text-xs text-[var(--mc-text-muted)]">
                                      正在驗證連結並整理可匯入的曲目，請稍候。
                                    </p>
                                  </div>
                                ) : linkPlaylistPreviewItems.length > 0 ? (
                                  <>
                                    <div
                                      className={`${linkPlaylistTitle || linkPlaylistPreviewItems.length > 0 ? "mt-3" : ""} rounded-[22px] border border-[var(--mc-border)]/70 bg-slate-950/20`}
                                    >
                                      <List<PlaylistPreviewRowProps>
                                        style={{ height: 320, width: "100%" }}
                                        rowCount={
                                          linkPlaylistPreviewItems.length
                                        }
                                        rowHeight={64}
                                        rowProps={{
                                          items: linkPlaylistPreviewItems,
                                        }}
                                        rowComponent={PlaylistPreviewRow}
                                      />
                                    </div>
                                    <div className="mt-4 space-y-3">
                                      {[
                                        {
                                          title: "已移除歌曲",
                                          tone: "border-amber-300/30 bg-amber-300/10 text-amber-100",
                                          items:
                                            linkPlaylistIssueSummary.removed,
                                        },
                                        {
                                          title: "隱私限制",
                                          tone: "border-fuchsia-300/30 bg-fuchsia-300/10 text-fuchsia-100",
                                          items:
                                            linkPlaylistIssueSummary.privateRestricted,
                                        },
                                        {
                                          title: "嵌入限制",
                                          tone: "border-rose-300/30 bg-rose-300/10 text-rose-100",
                                          items:
                                            linkPlaylistIssueSummary.embedBlocked,
                                        },
                                        {
                                          title: "其他不可用",
                                          tone: "border-red-300/30 bg-red-300/10 text-red-100",
                                          items: [
                                            ...linkPlaylistIssueSummary.unavailable,
                                            ...linkPlaylistIssueSummary.unknown,
                                          ],
                                        },
                                      ]
                                        .filter(
                                          (group) => group.items.length > 0,
                                        )
                                        .map((group) => (
                                          <div
                                            key={group.title}
                                            className={`rounded-2xl border p-3 ${group.tone}`}
                                          >
                                            <p className="text-xs font-semibold">
                                              {group.title}：
                                              {group.items.length} 首
                                            </p>
                                            <div className="mt-2 rounded-xl border border-white/10 bg-slate-950/15">
                                              <List<PlaylistIssueRowProps>
                                                style={{
                                                  height: Math.min(
                                                    group.items.length * 64,
                                                    256,
                                                  ),
                                                  width: "100%",
                                                }}
                                                rowCount={group.items.length}
                                                rowHeight={64}
                                                rowProps={{
                                                  items: group.items,
                                                }}
                                                rowComponent={PlaylistIssueRow}
                                              />
                                            </div>
                                          </div>
                                        ))}
                                      {isLinkSourceActive &&
                                        playlistPreviewMeta &&
                                        playlistPreviewMeta.skippedCount > 0 &&
                                        !linkPlaylistIssueSummary.exact && (
                                          <p className="text-[11px] text-amber-200/90">
                                            後端目前只回傳略過數量，尚未提供逐首明細；待
                                            `skippedItems` 上線後將顯示 100%
                                            精準名單。
                                          </p>
                                        )}
                                    </div>
                                  </>
                                ) : (
                                  <div className="mt-3 flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-cyan-300/16 bg-slate-950/15 px-4 text-center">
                                    <p className="text-sm text-[var(--mc-text-muted)]">
                                      貼上連結後，顯示曲目預覽
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : createLibraryTab === "youtube" ? (
                            <div className="mt-3">
                              {youtubePlaylistsLoading ? (
                                <div
                                  className={
                                    createLibraryView === "grid"
                                      ? "grid gap-2 sm:grid-cols-2"
                                      : "space-y-2"
                                  }
                                >
                                  {Array.from({
                                    length:
                                      createLibraryView === "grid" ? 6 : 4,
                                  }).map((_, idx) =>
                                    renderYoutubeSkeletonCard(
                                      idx,
                                      createLibraryView,
                                    ),
                                  )}
                                </div>
                              ) : filteredCreateYoutubePlaylists.length ===
                                0 ? (
                                <LibraryEmptyState
                                  icon={
                                    normalizedCreateLibrarySearch ? (
                                      <SearchRounded sx={{ fontSize: 28 }} />
                                    ) : (
                                      <PlayCircleOutlineRounded
                                        sx={{ fontSize: 28 }}
                                      />
                                    )
                                  }
                                  title={
                                    normalizedCreateLibrarySearch
                                      ? "找不到符合的播放清單"
                                      : "目前還沒有可用的 YouTube 清單"
                                  }
                                  description={
                                    normalizedCreateLibrarySearch
                                      ? "試試不同關鍵字，或清除搜尋後重新瀏覽你的 YouTube 播放清單。"
                                      : "你可以先貼上播放清單連結，或改用公開/個人題庫建立房間。"
                                  }
                                  actions={
                                    normalizedCreateLibrarySearch ? undefined : (
                                      <>
                                        <Button
                                          size="small"
                                          variant="outlined"
                                          onClick={handleActivateLinkSource}
                                        >
                                          改用貼上連結
                                        </Button>
                                        <Button
                                          size="small"
                                          variant="text"
                                          onClick={() =>
                                            setCreateLibraryTab("public")
                                          }
                                        >
                                          瀏覽公開題庫
                                        </Button>
                                      </>
                                    )
                                  }
                                />
                              ) : (
                                <div className="rounded-xl border border-[var(--mc-border)]/70 bg-slate-950/18 p-2">
                                  {createLibraryView === "grid" ? (
                                    <div className="max-h-[640px] overflow-y-auto pr-1">
                                      <div
                                        className="grid gap-2"
                                        style={{
                                          gridTemplateColumns: `repeat(${createLibraryColumns}, minmax(0, 1fr))`,
                                        }}
                                      >
                                        {filteredCreateYoutubePlaylists.map(
                                          (playlist, index) =>
                                            renderYoutubeCard(
                                              playlist,
                                              index,
                                              "grid",
                                            ),
                                        )}
                                      </div>
                                    </div>
                                  ) : (
                                    <List<VirtualLibraryListRowProps>
                                      style={{
                                        height: youtubeListHeight,
                                        width: "100%",
                                      }}
                                      rowCount={
                                        filteredCreateYoutubePlaylists.length
                                      }
                                      rowHeight={youtubeListRowHeight}
                                      rowProps={{
                                        items: filteredCreateYoutubePlaylists,
                                        renderItem: renderYoutubeCard,
                                      }}
                                      rowComponent={VirtualLibraryListRow}
                                    />
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="mt-3">
                              {shouldShowCollectionSkeleton ? (
                                <div
                                  className={
                                    createLibraryView === "grid"
                                      ? "grid gap-2 sm:grid-cols-2"
                                      : "space-y-2"
                                  }
                                >
                                  {Array.from({
                                    length:
                                      createLibraryView === "grid" ? 6 : 4,
                                  }).map((_, idx) =>
                                    renderCollectionSkeletonCard(
                                      idx,
                                      createLibraryView,
                                    ),
                                  )}
                                </div>
                              ) : collectionsError ? (
                                <p className="text-sm text-rose-300">
                                  {collectionsError}
                                </p>
                              ) : filteredCreateCollections.length === 0 ? (
                                <LibraryEmptyState
                                  icon={
                                    normalizedCreateLibrarySearch ? (
                                      <SearchRounded sx={{ fontSize: 28 }} />
                                    ) : (
                                      <BookmarkBorderRounded
                                        sx={{ fontSize: 28 }}
                                      />
                                    )
                                  }
                                  title={
                                    normalizedCreateLibrarySearch
                                      ? "找不到符合的題庫"
                                      : "你目前還沒有個人題庫"
                                  }
                                  description={
                                    normalizedCreateLibrarySearch
                                      ? "試試不同關鍵字，或清除搜尋後重新瀏覽題庫列表。"
                                      : "你可以先切換到公開題庫，或直接貼上 YouTube 播放清單連結。"
                                  }
                                  actions={
                                    normalizedCreateLibrarySearch ? undefined : (
                                      <>
                                        <Button
                                          size="small"
                                          variant="outlined"
                                          onClick={() =>
                                            setCreateLibraryTab("public")
                                          }
                                        >
                                          瀏覽公開題庫
                                        </Button>
                                        <Button
                                          size="small"
                                          variant="text"
                                          onClick={handleActivateLinkSource}
                                        >
                                          改用貼上連結
                                        </Button>
                                      </>
                                    )
                                  }
                                />
                              ) : (
                                <div className="rounded-xl border border-[var(--mc-border)]/70 bg-slate-950/18 p-2">
                                  {createLibraryView === "grid" ? (
                                    <div
                                      ref={createLibraryScrollRef}
                                      className="max-h-[640px] overflow-y-auto pr-1"
                                      onScroll={handleCollectionGridScroll}
                                    >
                                      <div
                                        className="grid gap-2"
                                        style={{
                                          gridTemplateColumns: `repeat(${createLibraryColumns}, minmax(0, 1fr))`,
                                        }}
                                      >
                                        {filteredCreateCollections.map(
                                          (collection, index) =>
                                            renderCollectionCard(
                                              collection,
                                              index,
                                              "grid",
                                            ),
                                        )}
                                        {collectionsLoadingMore
                                          ? Array.from({
                                              length: createLibraryColumns,
                                            }).map((_, idx) =>
                                              renderCollectionSkeletonCard(
                                                idx + 1000,
                                                "grid",
                                              ),
                                            )
                                          : null}
                                      </div>
                                    </div>
                                  ) : (
                                    <List<VirtualLibraryListRowProps>
                                      style={{
                                        height: collectionListHeight,
                                        width: "100%",
                                      }}
                                      rowCount={collectionListRowCount}
                                      rowHeight={collectionListRowHeight}
                                      rowProps={{
                                        items: filteredCreateCollections,
                                        renderItem: renderCollectionCard,
                                        hasMore: collectionsHasMore,
                                        isLoadingMore: collectionsLoadingMore,
                                        onLoadMore: () => {
                                          void loadMoreCollections();
                                        },
                                        renderLoader: () => (
                                          <div className="space-y-2">
                                            {renderCollectionSkeletonCard(
                                              1000,
                                              "list",
                                            )}
                                          </div>
                                        ),
                                      }}
                                      rowComponent={VirtualLibraryListRow}
                                    />
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-[var(--mc-border)] bg-[linear-gradient(135deg,rgba(251,191,36,0.12),rgba(15,23,42,0.22))] p-4">
                    <div className="flex flex-col gap-3">
                      <div className="rounded-2xl border border-white/10 bg-slate-950/22 p-1">
                        <Tabs
                          value={joinEntryTab}
                          onChange={(_, next: "code" | "browser") =>
                            setJoinEntryTab(next)
                          }
                          variant="fullWidth"
                          TabIndicatorProps={{ style: { display: "none" } }}
                          sx={{
                            minHeight: 0,
                            "& .MuiTabs-flexContainer": {
                              gap: "0.5rem",
                            },
                          }}
                        >
                          <Tab
                            disableRipple
                            value="code"
                            label="輸入代碼"
                            sx={{
                              minHeight: 0,
                              borderRadius: "999px",
                              px: 2,
                              py: 1.25,
                              textTransform: "none",
                              fontSize: 14,
                              fontWeight: 700,
                              color: "rgba(226, 232, 240, 0.72)",
                              transition: "all 0.2s ease",
                              "&.Mui-selected": {
                                color: "#fef3c7",
                                backgroundColor: "rgba(251, 191, 36, 0.16)",
                              },
                            }}
                          />
                          <Tab
                            disableRipple
                            value="browser"
                            label="房間列表"
                            sx={{
                              minHeight: 0,
                              borderRadius: "999px",
                              px: 2,
                              py: 1.25,
                              textTransform: "none",
                              fontSize: 14,
                              fontWeight: 700,
                              color: "rgba(226, 232, 240, 0.72)",
                              transition: "all 0.2s ease",
                              "&.Mui-selected": {
                                color: "#fef3c7",
                                backgroundColor: "rgba(251, 191, 36, 0.16)",
                              },
                            }}
                          />
                        </Tabs>
                      </div>
                    </div>
                  </div>

                  {joinEntryTab === "code" && (
                    <div className="rounded-2xl border border-amber-300/30 bg-amber-400/5 p-4 sm:p-5">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-amber-200/90">
                        輸入代碼
                      </p>
                      <div className="mx-auto mt-3 max-w-3xl rounded-[28px] border border-amber-300/18 bg-[linear-gradient(180deg,rgba(120,53,15,0.2),rgba(15,23,42,0.22))] p-4 sm:p-5">
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-full max-w-2xl">
                            <Tooltip
                              open={Boolean(directJoinError)}
                              title={
                                directJoinError ? (
                                  <div className="space-y-1">
                                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-200/80">
                                      房間代碼無效
                                    </div>
                                    <div className="text-sm font-medium text-rose-50">
                                      {directJoinError}
                                    </div>
                                  </div>
                                ) : (
                                  ""
                                )
                              }
                              arrow
                              placement="top"
                              disableFocusListener
                              disableHoverListener
                              disableTouchListener
                              slotProps={{
                                popper: {
                                  modifiers: [
                                    {
                                      name: "offset",
                                      options: { offset: [0, 12] },
                                    },
                                  ],
                                },
                                tooltip: {
                                  sx: {
                                    maxWidth: 320,
                                    borderRadius: "16px",
                                    border:
                                      "1px solid rgba(251, 113, 133, 0.28)",
                                    background:
                                      "linear-gradient(180deg, rgba(127, 29, 29, 0.96), rgba(69, 10, 10, 0.98))",
                                    boxShadow:
                                      "0 18px 40px rgba(15, 23, 42, 0.45), 0 0 0 1px rgba(251, 113, 133, 0.08)",
                                    px: 1.75,
                                    py: 1.25,
                                  },
                                },
                                arrow: {
                                  sx: {
                                    color: "rgba(127, 29, 29, 0.98)",
                                  },
                                },
                              }}
                            >
                              <div
                                role="button"
                                tabIndex={0}
                                onClick={() =>
                                  directRoomCodeInputRef.current?.focus()
                                }
                                onKeyDown={(event) => {
                                  if (
                                    event.key === "Enter" ||
                                    event.key === " "
                                  ) {
                                    event.preventDefault();
                                    directRoomCodeInputRef.current?.focus();
                                  }
                                }}
                                className={`relative mx-auto w-full max-w-[34rem] cursor-text rounded-[26px] border bg-slate-950/35 px-4 py-4 outline-none transition ${
                                  directJoinError
                                    ? "border-rose-300/70 shadow-[0_0_0_4px_rgba(251,113,133,0.16)]"
                                    : isDirectRoomCodeFocused
                                      ? "border-amber-300/60 shadow-[0_0_0_4px_rgba(251,191,36,0.14)]"
                                      : "border-amber-300/20 hover:border-amber-300/35"
                                }`}
                              >
                                <input
                                  ref={directRoomCodeInputRef}
                                  aria-label="輸入房間代碼"
                                  value={normalizedDirectRoomCode}
                                  onFocus={() =>
                                    setIsDirectRoomCodeFocused(true)
                                  }
                                  onBlur={() => {
                                    setIsDirectRoomCodeFocused(false);
                                  }}
                                  onChange={(e) => {
                                    const next = normalizeRoomCodeInput(
                                      e.target.value,
                                    );
                                    setDirectRoomIdInput(next);
                                    setDirectJoinPreviewRoom(null);
                                    setDirectJoinError(null);
                                    setDirectJoinNeedsPassword(false);
                                  }}
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                      event.preventDefault();
                                      void handleDirectJoinById();
                                    }
                                  }}
                                  inputMode="text"
                                  autoCapitalize="characters"
                                  spellCheck={false}
                                  maxLength={6}
                                  className="absolute inset-0 h-full w-full opacity-0"
                                />
                                <div className="flex items-center justify-center gap-2.5 sm:gap-3">
                                  {directRoomCodeSlots
                                    .slice(0, 3)
                                    .map((char, index) => (
                                      <span
                                        key={`room-code-left-${index}`}
                                        className={`relative flex h-14 w-11 items-center justify-center rounded-2xl border text-lg font-semibold tracking-[0.14em] sm:h-16 sm:w-12 sm:text-xl ${
                                          directJoinError
                                            ? "border-rose-300/35 bg-rose-400/8 text-rose-50"
                                            : isDirectRoomCodeFocused &&
                                                activeDirectRoomCodeIndex ===
                                                  index
                                              ? "border-amber-200 bg-amber-300/16 text-amber-50 shadow-[0_0_0_2px_rgba(251,191,36,0.12)]"
                                              : char === "_"
                                                ? "border-white/10 bg-white/5 text-slate-500"
                                                : "border-amber-300/30 bg-amber-400/10 text-amber-50"
                                        }`}
                                      >
                                        {char}
                                      </span>
                                    ))}
                                  <span
                                    className={`px-1 text-xl font-semibold sm:text-2xl ${
                                      directJoinError
                                        ? "text-rose-200/90"
                                        : "text-amber-200/80"
                                    }`}
                                  >
                                    -
                                  </span>
                                  {directRoomCodeSlots
                                    .slice(3)
                                    .map((char, index) => (
                                      <span
                                        key={`room-code-right-${index}`}
                                        className={`relative flex h-14 w-11 items-center justify-center rounded-2xl border text-lg font-semibold tracking-[0.14em] sm:h-16 sm:w-12 sm:text-xl ${
                                          directJoinError
                                            ? "border-rose-300/35 bg-rose-400/8 text-rose-50"
                                            : isDirectRoomCodeFocused &&
                                                activeDirectRoomCodeIndex ===
                                                  index + 3
                                              ? "border-amber-200 bg-amber-300/16 text-amber-50 shadow-[0_0_0_2px_rgba(251,191,36,0.12)]"
                                              : char === "_"
                                                ? "border-white/10 bg-white/5 text-slate-500"
                                                : "border-amber-300/30 bg-amber-400/10 text-amber-50"
                                        }`}
                                      >
                                        {char}
                                      </span>
                                    ))}
                                </div>
                              </div>
                            </Tooltip>
                          </div>
                          <Button
                            variant="contained"
                            color="warning"
                            onClick={handleDirectJoinById}
                            disabled={
                              directJoinLoading ||
                              normalizedDirectRoomCode.length < 6 ||
                              !resolvedDirectJoinRoom
                            }
                            className="min-h-[48px] w-full max-w-xs text-sm sm:min-h-[52px]"
                          >
                            {directJoinLoading
                              ? "查詢房間中..."
                              : resolvedDirectJoinRoom
                                ? "加入這個房間"
                                : "輸入完整代碼以查詢"}
                          </Button>
                        </div>
                      </div>
                      {(resolvedDirectJoinRoom || directJoinNeedsPassword) && (
                        <div className="mt-3 rounded-2xl border border-[var(--mc-border)]/70 bg-slate-950/20 p-3 sm:p-4">
                          {resolvedDirectJoinRoom ? (
                            <div className="space-y-3">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <p className="text-base font-semibold text-[var(--mc-text)]">
                                    {resolvedDirectJoinRoom.name}
                                  </p>
                                  <p className="mt-1 text-xs text-[var(--mc-text-muted)]">
                                    代碼{" "}
                                    {formatRoomCodeDisplay(
                                      resolvedDirectJoinRoom.roomCode,
                                    )}
                                  </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="rounded-full border border-[var(--mc-border)] px-2 py-0.5 text-[11px] text-[var(--mc-text-muted)]">
                                    {resolvedDirectJoinRoom.playerCount}
                                    {resolvedDirectJoinRoom.maxPlayers
                                      ? `/${resolvedDirectJoinRoom.maxPlayers}`
                                      : ""}{" "}
                                    人
                                  </span>
                                  <span className="rounded-full border border-[var(--mc-border)] px-2 py-0.5 text-[11px] text-[var(--mc-text-muted)]">
                                    {roomRequiresPin(resolvedDirectJoinRoom)
                                      ? "需 PIN"
                                      : "免 PIN"}
                                  </span>
                                  <span
                                    className={`rounded-full border px-2 py-0.5 text-[11px] ${
                                      isRoomCurrentlyPlaying(
                                        resolvedDirectJoinRoom,
                                      )
                                        ? "border-emerald-300/40 bg-emerald-400/10 text-emerald-100"
                                        : "border-slate-300/20 bg-slate-400/10 text-slate-200"
                                    }`}
                                  >
                                    {getRoomStatusLabel(resolvedDirectJoinRoom)}
                                  </span>
                                </div>
                              </div>
                              <div className="grid gap-2 text-sm text-[var(--mc-text-muted)] sm:grid-cols-2">
                                <p>
                                  題庫：
                                  {getRoomPlaylistLabel(resolvedDirectJoinRoom)}
                                </p>
                                <p>
                                  題數：
                                  {resolvedDirectJoinRoom.gameSettings
                                    ?.questionCount ?? "-"}
                                </p>
                              </div>
                            </div>
                          ) : null}
                          {directJoinNeedsPassword && (
                            <p className="mt-2 text-xs text-amber-200">
                              此房間需要 4 位 PIN，按下加入後會請你輸入。
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {joinEntryTab === "browser" && (
                    <div className="grid gap-3 lg:grid-cols-[0.92fr_1.08fr]">
                      <div className="rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface)]/45 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--mc-text-muted)]">
                              房間條件
                            </p>
                            <p className="mt-1 text-sm font-semibold text-[var(--mc-text)]">
                              確認你要加入哪一間房
                            </p>
                          </div>
                          <p className="text-xs text-[var(--mc-text-muted)]">
                            左側確認條件，右側挑房間
                          </p>
                        </div>
                        <div className="mt-3 space-y-3">
                          <div>
                            <p className="text-xs text-[var(--mc-text-muted)]">
                              PIN 篩選
                            </p>
                            <div className="mt-1 flex flex-wrap gap-2">
                              {[
                                { key: "all", label: "全部" },
                                { key: "no_password", label: "免 PIN" },
                                { key: "password_required", label: "需 PIN" },
                              ].map((item) => (
                                <button
                                  key={item.key}
                                  type="button"
                                  onClick={() =>
                                    setJoinPasswordFilter(
                                      item.key as
                                        | "all"
                                        | "no_password"
                                        | "password_required",
                                    )
                                  }
                                  className={`rounded-full border px-3 py-1 text-xs transition ${
                                    joinPasswordFilter === item.key
                                      ? "border-amber-300/60 bg-amber-300/15 text-amber-100"
                                      : "border-[var(--mc-border)] text-[var(--mc-text-muted)] hover:text-[var(--mc-text)]"
                                  }`}
                                >
                                  {item.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <p className="text-xs text-[var(--mc-text-muted)]">
                              排序方式
                            </p>
                            <div className="mt-1 inline-flex overflow-hidden rounded-full border border-[var(--mc-border)]">
                              <button
                                type="button"
                                className={`px-3 py-1 text-xs transition ${
                                  joinSortMode === "latest"
                                    ? "bg-amber-400/15 text-amber-100"
                                    : "text-[var(--mc-text-muted)]"
                                }`}
                                onClick={() => setJoinSortMode("latest")}
                              >
                                最新建立
                              </button>
                              <button
                                type="button"
                                className={`px-3 py-1 text-xs transition ${
                                  joinSortMode === "players_desc"
                                    ? "bg-amber-400/15 text-amber-100"
                                    : "text-[var(--mc-text-muted)]"
                                }`}
                                onClick={() => setJoinSortMode("players_desc")}
                              >
                                玩家數優先
                              </button>
                            </div>
                          </div>

                          <div className="rounded-xl border border-dashed border-[var(--mc-border)] p-3 text-xs text-[var(--mc-text-muted)]">
                            題庫/題庫類型篩選（規劃中）：未來可依曲風、題庫來源快速篩選房間。
                          </div>
                        </div>

                        <div className="mt-4 rounded-2xl border border-[var(--mc-border)] bg-slate-950/20 p-3">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--mc-text-muted)]">
                            已選房間
                          </p>
                          {joinPreviewRoom ? (
                            <div className="mt-2 space-y-2 text-sm">
                              <p className="text-lg font-semibold text-[var(--mc-text)]">
                                {joinPreviewRoom.name}
                              </p>
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`rounded-full border px-2 py-0.5 text-[11px] ${
                                    isRoomCurrentlyPlaying(joinPreviewRoom)
                                      ? "border-emerald-300/40 bg-emerald-400/10 text-emerald-100"
                                      : "border-slate-300/20 bg-slate-400/10 text-slate-200"
                                  }`}
                                >
                                  {getRoomStatusLabel(joinPreviewRoom)}
                                </span>
                                <span className="rounded-full border border-[var(--mc-border)] px-2 py-0.5 text-[11px] text-[var(--mc-text-muted)]">
                                  {roomRequiresPin(joinPreviewRoom)
                                    ? "需 PIN"
                                    : "免 PIN"}
                                </span>
                              </div>
                              <p className="text-[var(--mc-text-muted)]">
                                代碼：{joinPreviewRoom.roomCode.slice(0, 3)}-
                                {joinPreviewRoom.roomCode.slice(3)}
                              </p>
                              <p className="text-[var(--mc-text-muted)]">
                                玩家 {joinPreviewRoom.playerCount}
                                {joinPreviewRoom.maxPlayers
                                  ? `/${joinPreviewRoom.maxPlayers}`
                                  : ""}
                              </p>
                              <p className="text-[var(--mc-text-muted)]">
                                題數{" "}
                                {joinPreviewRoom.gameSettings?.questionCount ??
                                  "-"}{" "}
                                · 題庫 {getRoomPlaylistLabel(joinPreviewRoom)}
                              </p>
                              <div className="pt-1">
                                <Button
                                  variant="contained"
                                  size="small"
                                  onClick={() =>
                                    handleJoinRoomEntry(joinPreviewRoom)
                                  }
                                >
                                  直接加入這間房
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <p className="mt-2 text-sm text-[var(--mc-text-muted)]">
                              尚未選擇房間。你可以先輸入代碼，或從右側列表挑選一間公開房。
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface)]/45 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--mc-text-muted)]">
                              房間列表
                            </p>
                            <p className="mt-1 text-sm font-semibold text-[var(--mc-text)]">
                              從公開房間列表直接加入
                            </p>
                            <p className="mt-1 text-xs text-[var(--mc-text-muted)]">
                              目前共 {filteredJoinRooms.length} 間房，
                              {filteredJoinPlayerTotal} 人在線
                            </p>
                          </div>
                          <div className="inline-flex items-center gap-1 rounded-full border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/60 p-1">
                            <button
                              type="button"
                              className={`rounded-full px-3 py-1 text-xs ${
                                joinRoomsView === "list"
                                  ? "cursor-pointer bg-amber-500/20 text-amber-100"
                                  : "cursor-pointer text-[var(--mc-text-muted)]"
                              }`}
                              onClick={() => setJoinRoomsView("list")}
                            >
                              清單
                            </button>
                            <button
                              type="button"
                              className={`rounded-full px-3 py-1 text-xs ${
                                joinRoomsView === "grid"
                                  ? "cursor-pointer bg-amber-500/20 text-amber-100"
                                  : "cursor-pointer text-[var(--mc-text-muted)]"
                              }`}
                              onClick={() => setJoinRoomsView("grid")}
                            >
                              圖示
                            </button>
                          </div>
                        </div>
                        {filteredJoinRooms.length === 0 ? (
                          <p className="mt-3 text-sm text-[var(--mc-text-muted)]">
                            目前沒有符合條件的房間。
                          </p>
                        ) : (
                          <div
                            className={`mt-3 ${
                              joinRoomsView === "grid"
                                ? "grid gap-2 sm:grid-cols-2"
                                : "space-y-2"
                            }`}
                          >
                            {filteredJoinRooms.slice(0, 12).map((room) => (
                              <div
                                key={room.id}
                                className={`rounded-2xl border transition ${
                                  selectedJoinRoomId === room.id
                                    ? "border-amber-300/60 bg-amber-300/14 shadow-[0_12px_30px_rgba(251,191,36,0.08)]"
                                    : "border-[var(--mc-border)] bg-slate-950/25 hover:border-amber-300/35 hover:bg-slate-900/30"
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedJoinRoomId(room.id);
                                  }}
                                  className={`w-full text-left ${
                                    joinRoomsView === "grid"
                                      ? "p-4"
                                      : "px-4 py-3"
                                  }`}
                                >
                                  <div
                                    className={`${
                                      joinRoomsView === "grid"
                                        ? "space-y-3"
                                        : "flex flex-wrap items-center gap-4"
                                    }`}
                                  >
                                    <div
                                      className={`${
                                        joinRoomsView === "grid"
                                          ? "space-y-3"
                                          : "min-w-0 flex-1 space-y-2"
                                      }`}
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                          <p className="truncate text-sm font-semibold text-[var(--mc-text)] sm:text-[15px]">
                                            {room.name}
                                          </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          {selectedJoinRoomId === room.id && (
                                            <span className="rounded-full border border-amber-300/35 bg-amber-300/14 px-2 py-0.5 text-[11px] font-medium text-amber-100">
                                              已選擇
                                            </span>
                                          )}
                                          <span
                                            className={`rounded-full border px-2 py-0.5 text-[11px] ${
                                              isRoomCurrentlyPlaying(room)
                                                ? "border-emerald-300/40 bg-emerald-400/10 text-emerald-100"
                                                : "border-slate-300/20 bg-slate-400/10 text-slate-200"
                                            }`}
                                          >
                                            {getRoomStatusLabel(room)}
                                          </span>
                                        </div>
                                      </div>

                                      <div className="flex flex-wrap items-center gap-2 text-[11px]">
                                        <span className="rounded-full border border-[var(--mc-border)] px-2.5 py-0.5 text-[var(--mc-text-muted)]">
                                          {room.playerCount}
                                          {room.maxPlayers
                                            ? `/${room.maxPlayers}`
                                            : ""}{" "}
                                          人
                                        </span>
                                        <span className="rounded-full border border-[var(--mc-border)] px-2.5 py-0.5 text-[var(--mc-text-muted)]">
                                          {roomRequiresPin(room)
                                            ? "需 PIN"
                                            : "免 PIN"}
                                        </span>
                                      </div>

                                      <div
                                        className={`${
                                          joinRoomsView === "grid"
                                            ? "grid gap-2 text-sm text-[var(--mc-text-muted)]"
                                            : "flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[var(--mc-text-muted)]"
                                        }`}
                                      >
                                        <p>
                                          題數：
                                          {room.gameSettings?.questionCount ??
                                            "-"}
                                        </p>
                                        <p className="truncate">
                                          題庫：{getRoomPlaylistLabel(room)}
                                        </p>
                                      </div>

                                      <p className="text-[11px] text-[var(--mc-text-muted)]/80">
                                        代碼：
                                        {formatRoomCodeDisplay(room.roomCode)}
                                      </p>
                                    </div>

                                    <div
                                      className={`${
                                        joinRoomsView === "grid"
                                          ? "pt-1"
                                          : "ml-auto flex shrink-0 items-center"
                                      }`}
                                    >
                                      <Button
                                        variant="contained"
                                        size="small"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          handleJoinRoomEntry(room);
                                        }}
                                      >
                                        加入
                                      </Button>
                                    </div>
                                  </div>
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <style>
            {`
              @keyframes guide-panel-enter {
                0% { opacity: 0; transform: translateY(8px) scale(0.995); }
                100% { opacity: 1; transform: translateY(0) scale(1); }
              }
              @keyframes skeleton-breathe {
                0% {
                  opacity: 0.52;
                  transform: scale(1);
                  filter: saturate(0.92);
                }
                50% {
                  opacity: 0.92;
                  transform: scale(1.015);
                  filter: saturate(1.08);
                }
                100% {
                  opacity: 0.58;
                  transform: scale(1);
                  filter: saturate(0.96);
                }
              }
              @keyframes skeleton-sheen {
                0% {
                  transform: translate3d(0, 0, 0) skewX(-22deg);
                  opacity: 0;
                }
                12% {
                  opacity: 0.28;
                }
                48% {
                  opacity: 0.82;
                }
                100% {
                  transform: translate3d(320%, 0, 0) skewX(-22deg);
                  opacity: 0;
                }
              }
            `}
          </style>

          <Dialog
            open={Boolean(joinConfirmDialog)}
            onClose={closeJoinConfirmDialog}
            fullWidth
            maxWidth="xs"
          >
            <DialogTitle>此對戰已進行中</DialogTitle>
            <DialogContent>
              <Typography
                variant="body2"
                sx={{ mb: 1.5, color: "text.secondary" }}
              >
                {joinConfirmDialog
                  ? `房間「${joinConfirmDialog.roomName}」目前已開始遊戲。加入後會從目前進度開始參與。`
                  : ""}
              </Typography>
              {joinConfirmDialog && (
                <div className="space-y-1">
                  <Typography
                    variant="caption"
                    sx={{ display: "block", color: "text.secondary" }}
                  >
                    玩家 {joinConfirmDialog.playerCount}
                    {joinConfirmDialog.maxPlayers
                      ? `/${joinConfirmDialog.maxPlayers}`
                      : ""}
                    {typeof joinConfirmDialog.questionCount === "number"
                      ? ` · 本局題數 ${joinConfirmDialog.questionCount}`
                      : ""}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ display: "block", color: "text.secondary" }}
                  >
                    題庫 {joinConfirmDialog.playlistTitle}
                  </Typography>
                  {(typeof joinConfirmDialog.currentQuestionNo === "number" ||
                    typeof joinConfirmDialog.completedQuestionCount ===
                      "number") && (
                    <Typography
                      variant="caption"
                      sx={{ display: "block", color: "warning.main" }}
                    >
                      {typeof joinConfirmDialog.currentQuestionNo === "number"
                        ? `目前第 ${joinConfirmDialog.currentQuestionNo} 題`
                        : "對戰進行中"}
                      {typeof joinConfirmDialog.completedQuestionCount ===
                      "number"
                        ? `（已完成 ${joinConfirmDialog.completedQuestionCount} 題${
                            typeof joinConfirmDialog.totalQuestionCount ===
                            "number"
                              ? ` / 共 ${joinConfirmDialog.totalQuestionCount} 題`
                              : ""
                          }）`
                        : ""}
                    </Typography>
                  )}
                </div>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={closeJoinConfirmDialog}>取消</Button>
              <Button
                variant="contained"
                color="warning"
                onClick={handleConfirmJoinInProgress}
              >
                仍要加入
              </Button>
            </DialogActions>
          </Dialog>

          <Dialog
            open={Boolean(passwordDialog)}
            onClose={closePasswordDialog}
            fullWidth
            maxWidth="xs"
          >
            <DialogTitle>輸入 4 位 PIN</DialogTitle>
            <DialogContent>
              <Typography
                variant="body2"
                sx={{ mb: 1.5, color: "text.secondary" }}
              >
                {passwordDialog
                  ? `房間「${passwordDialog.roomName}」需要 4 位 PIN 才能加入。`
                  : ""}
              </Typography>
              <TextField
                autoFocus
                fullWidth
                size="small"
                label="4 位 PIN"
                value={passwordDraft}
                onChange={(e) => {
                  const next = e.target.value.replace(/\D/g, "").slice(0, 4);
                  setPasswordDraft(next);
                }}
                inputProps={{
                  inputMode: "numeric",
                  pattern: "\\d{4}",
                  maxLength: 4,
                }}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={closePasswordDialog}>取消</Button>
              <Button
                variant="contained"
                onClick={handleConfirmJoinWithPassword}
                disabled={!/^\d{4}$/.test(passwordDraft.trim())}
              >
                進入
              </Button>
            </DialogActions>
          </Dialog>
        </section>
      )}
    </div>
  );
};

export default RoomListPage;
