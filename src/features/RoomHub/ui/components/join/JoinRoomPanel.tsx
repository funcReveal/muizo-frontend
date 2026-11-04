import {
  useEffect,
  useMemo,
  useState,
  type RefObject,
  type UIEvent,
} from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { List } from "react-window";
import GroupsRounded from "@mui/icons-material/GroupsRounded";
import LibraryMusicRounded from "@mui/icons-material/LibraryMusicRounded";
import LockRounded from "@mui/icons-material/LockRounded";
import LoginRounded from "@mui/icons-material/LoginRounded";
import QuizRounded from "@mui/icons-material/QuizRounded";
import EmojiEventsRounded from "@mui/icons-material/EmojiEventsRounded";
import AccessTimeRounded from "@mui/icons-material/AccessTimeRounded";
import ContentCutRounded from "@mui/icons-material/ContentCutRounded";
import FastForwardRounded from "@mui/icons-material/FastForwardRounded";
import GridViewRounded from "@mui/icons-material/GridViewRounded";
import MeetingRoomRounded from "@mui/icons-material/MeetingRoomRounded";
import TipsAndUpdatesRounded from "@mui/icons-material/TipsAndUpdatesRounded";
import VisibilityRounded from "@mui/icons-material/VisibilityRounded";
import ViewAgendaRounded from "@mui/icons-material/ViewAgendaRounded";
import BlockRounded from "@mui/icons-material/BlockRounded";
import TimerRounded from "@mui/icons-material/TimerRounded";

import type {
  PlaybackExtensionMode,
  RoomSummary,
  RoomViewerAccess,
} from "@domain/room/types";
import { formatPlaylistAvailabilityLabel } from "@features/RoomSession/model/playlistAvailability";
import RoomCodeInput from "./RoomCodeInput";
import { MuizoSelect } from "@shared/ui/select";
import CloseRounded from "@mui/icons-material/CloseRounded";
import "./joinRoomExplorer.css";
import VirtualJoinRoomRow, {
  type VirtualJoinRoomRowProps,
} from "./VirtualJoinRoomRow";

type JoinPasswordFilter = "all" | "no_password" | "password_required";
type JoinStatusFilter = "all" | "waiting" | "playing";
type JoinSortMode = "latest" | "players_desc";
type JoinRoomsView = "grid" | "list";

type PasswordDialogState = {
  roomId: string;
  roomName: string;
} | null;

type JoinConfirmDialogState = {
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
} | null;

type JoinRoomPaginationState = {
  key: string;
  count: number;
};

type JoinRoomPanelProps = {
  directJoinError: string | null;
  directJoinLoading: boolean;
  normalizedDirectRoomCode: string;
  directRoomCodeInputRef: RefObject<HTMLInputElement | null>;
  setDirectRoomIdInput: (value: string) => void;
  setDirectJoinPreviewRoom: (value: RoomSummary | null) => void;
  setDirectJoinError: (value: string | null) => void;
  setDirectJoinNeedsPassword: (value: boolean) => void;
  normalizeRoomCodeInput: (value: string) => string;
  handleDirectJoinById: () => void | Promise<void>;
  resolvedDirectJoinRoom: RoomSummary | null;
  directJoinNeedsPassword: boolean;
  joinPasswordFilter: JoinPasswordFilter;
  setJoinPasswordFilter: (value: JoinPasswordFilter) => void;
  joinStatusFilter: JoinStatusFilter;
  setJoinStatusFilter: (value: JoinStatusFilter) => void;
  joinSortMode: JoinSortMode;
  setJoinSortMode: (value: JoinSortMode) => void;
  filteredJoinRooms: RoomSummary[];
  viewerAccessByRoomId: Record<string, RoomViewerAccess>;
  serverOffsetMs: number;
  filteredJoinPlayerTotal: number;
  siteOnlineCount: number | null;
  joinRoomsView: JoinRoomsView;
  setJoinRoomsView: (value: JoinRoomsView) => void;
  handleJoinRoomEntry: (room: RoomSummary) => void;
  onBlockedRoomClick: (room: RoomSummary, remainingLabel: string | null) => void;
  roomRequiresPin: (room: RoomSummary) => boolean;
  roomIsLeaderboardChallenge: (room: RoomSummary) => boolean;
  isRoomCurrentlyPlaying: (room: RoomSummary) => boolean;
  getRoomStatusLabel: (room: RoomSummary) => string;
  getRoomPlaylistLabel: (room: RoomSummary) => string;
  formatRoomCodeDisplay: (value: string) => string;
  isAuthenticated?: boolean;
  isAuthLoading?: boolean;
  onLoginRequired?: () => void;
  joinConfirmDialog: JoinConfirmDialogState;
  closeJoinConfirmDialog: () => void;
  handleConfirmJoinInProgress: () => void;
  passwordDialog: PasswordDialogState;
  closePasswordDialog: () => void;
  passwordDraft: string;
  setPasswordDraft: (value: string) => void;
  handleConfirmJoinWithPassword: () => void;
};

const JoinRoomPanel = ({
  directJoinError,
  directJoinLoading,
  normalizedDirectRoomCode,
  directRoomCodeInputRef,
  setDirectRoomIdInput,
  setDirectJoinPreviewRoom,
  setDirectJoinError,
  setDirectJoinNeedsPassword,
  normalizeRoomCodeInput,
  handleDirectJoinById,
  resolvedDirectJoinRoom,
  joinPasswordFilter,
  setJoinPasswordFilter,
  joinStatusFilter,
  setJoinStatusFilter,
  joinSortMode,
  setJoinSortMode,
  filteredJoinRooms,
  viewerAccessByRoomId,
  serverOffsetMs,
  filteredJoinPlayerTotal,
  siteOnlineCount,
  joinRoomsView,
  setJoinRoomsView,
  handleJoinRoomEntry,
  onBlockedRoomClick,
  roomRequiresPin,
  roomIsLeaderboardChallenge,
  isRoomCurrentlyPlaying,
  getRoomStatusLabel,
  getRoomPlaylistLabel,
  formatRoomCodeDisplay,
  isAuthenticated = false,
  joinConfirmDialog,
  closeJoinConfirmDialog,
  handleConfirmJoinInProgress,
  passwordDialog,
  closePasswordDialog,
  passwordDraft,
  setPasswordDraft,
  handleConfirmJoinWithPassword,
}: JoinRoomPanelProps) => {
  const JOIN_ROOM_BATCH_SIZE = 12;
  const JOIN_ROOM_LIST_ROW_HEIGHT = 148;
  const isMobileLayout = useMediaQuery("(max-width: 1023.95px)");
  const [clockNow, setClockNow] = useState(() => Date.now());
  const [shakingRoomId, setShakingRoomId] = useState<string | null>(null);
  const serverNow = clockNow + serverOffsetMs;
  const hasActiveKickCountdown = useMemo(
    () =>
      Object.values(viewerAccessByRoomId).some(
        (access) =>
          typeof access.kickedUntil === "number" &&
          access.kickedUntil > serverNow,
      ),
    [serverNow, viewerAccessByRoomId],
  );

  useEffect(() => {
    if (!hasActiveKickCountdown) return;
    const timeoutId = window.setTimeout(() => {
      setClockNow(Date.now());
    }, 1000);
    return () => window.clearTimeout(timeoutId);
  }, [clockNow, hasActiveKickCountdown]);

  const formatKickRemainingLabel = (kickedUntil: number) => {
    const totalSeconds = Math.max(0, Math.ceil((kickedUntil - serverNow) / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const restMinutes = minutes % 60;
      return `${hours}:${String(restMinutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  };

  const getRoomKickState = (room: RoomSummary) => {
    const access = viewerAccessByRoomId[room.id];
    if (!access) return null;
    if (access.kickedUntil === null) {
      return { blocked: true, label: null };
    }
    if (access.kickedUntil <= serverNow) return null;
    return {
      blocked: true,
      label: formatKickRemainingLabel(access.kickedUntil),
    };
  };

  const triggerBlockedRoomFeedback = (room: RoomSummary, label: string | null) => {
    setShakingRoomId(room.id);
    window.setTimeout(() => {
      setShakingRoomId((current) => (current === room.id ? null : current));
    }, 460);
    onBlockedRoomClick(room, label);
  };
  const joinStatusOptions: Array<{
    key: JoinStatusFilter;
    label: string;
    shortLabel: string;
  }> = [
    { key: "all", label: "全部狀態", shortLabel: "全部狀態" },
    { key: "waiting", label: "等待中", shortLabel: "等待中" },
    { key: "playing", label: "遊戲中", shortLabel: "遊戲中" },
  ];
  const joinPasswordOptions: Array<{
    key: JoinPasswordFilter;
    label: string;
    shortLabel: string;
  }> = [
    { key: "all", label: "全部", shortLabel: "全部" },
    { key: "no_password", label: "免 PIN", shortLabel: "免 PIN" },
    { key: "password_required", label: "需要 PIN", shortLabel: "需要 PIN" },
  ];
  const joinSortOptions: Array<{
    key: JoinSortMode;
    label: string;
    shortLabel: string;
  }> = [
    { key: "latest", label: "最新建立", shortLabel: "最新建立" },
    { key: "players_desc", label: "人數最多", shortLabel: "人數最多" },
  ];

  const getPlaybackExtensionLabel = (
    mode: PlaybackExtensionMode | undefined | null,
  ) => {
    switch (mode) {
      case "manual_vote":
        return "投票延長";
      case "auto_once":
        return "自動延長";
      default:
        return "不延長";
    }
  };

  const getRoomSourceTypeLabel = (room: RoomSummary) => {
    const source = room as RoomSummary &
      Record<string, unknown> & {
        playlist?: { sourceType?: unknown; source_type?: unknown } | null;
      };

    const candidates = [
      room.playlistSourceType,
      source.playlistSourceType,
      source.playlist_source_type,
      source.sourceType,
      source.source_type,
      source.playlist?.sourceType,
      source.playlist?.source_type,
    ];

    for (const candidate of candidates) {
      if (typeof candidate !== "string") continue;
      const normalized = candidate.trim().toLowerCase();
      if (!normalized) continue;

      if (normalized === "public_collection") return "公開收藏庫";
      if (normalized === "private_collection") return "私人收藏庫";
      if (normalized === "youtube_google_import") return "匯入 YT 播放清單";
      if (normalized === "youtube_pasted_link") return "貼上連結";

      if (
        normalized === "playlist" ||
        normalized.includes("playlist_link") ||
        normalized.includes("link_playlist") ||
        normalized.includes("imported_playlist") ||
        normalized.includes("url")
      ) {
        return "貼上連結";
      }
      if (normalized.includes("youtube")) return "匯入 YT 播放清單";
      if (
        normalized.includes("public_collection") ||
        normalized.includes("collection_public") ||
        (normalized.includes("collection") && normalized.includes("public"))
      ) {
        return "公開收藏庫";
      }
      if (
        normalized.includes("owner_collection") ||
        normalized.includes("private_collection") ||
        normalized.includes("collection_private") ||
        (normalized.includes("collection") &&
          (normalized.includes("owner") || normalized.includes("private")))
      ) {
        return "私人收藏庫";
      }
      if (normalized.includes("collection")) return "收藏庫";
    }

    return null;
  };

  const getRoomProgressLabel = (room: RoomSummary) => {
    if (!isRoomCurrentlyPlaying(room)) return null;
    const current =
      typeof room.currentQuestionNo === "number"
        ? room.currentQuestionNo
        : typeof room.completedQuestionCount === "number"
          ? room.completedQuestionCount + 1
          : null;
    const total =
      typeof room.totalQuestionCount === "number"
        ? room.totalQuestionCount
        : (room.gameSettings?.questionCount ?? null);
    if (!current || !total) return "進行中";
    return `第 ${current}/${total} 題`;
  };

  const getRoomPlaylistCoverUrl = (room: RoomSummary) => {
    if (room.playlistCoverThumbnailUrl) return room.playlistCoverThumbnailUrl;
    if (room.playlistCoverSourceId) {
      return `https://i.ytimg.com/vi/${room.playlistCoverSourceId}/hqdefault.jpg`;
    }
    return null;
  };

  const isCodeSearch = normalizedDirectRoomCode.length === 6;
  const clearCodeSearch = () => {
    setDirectRoomIdInput("");
    setDirectJoinPreviewRoom(null);
    setDirectJoinError(null);
    setDirectJoinNeedsPassword(false);
  };

  const joinRoomPaginationKey = useMemo(
    () =>
      [
              joinPasswordFilter,
        joinRoomsView,
        joinSortMode,
        joinStatusFilter,
        filteredJoinRooms.map((room) => room.id).join("|"),
      ].join("::"),
    [
      filteredJoinRooms,
          joinPasswordFilter,
      joinRoomsView,
      joinSortMode,
      joinStatusFilter,
    ],
  );

  const [joinRoomPagination, setJoinRoomPagination] =
    useState<JoinRoomPaginationState>({
      key: joinRoomPaginationKey,
      count: JOIN_ROOM_BATCH_SIZE,
    });

  const visibleJoinRoomCount =
    joinRoomPagination.key === joinRoomPaginationKey
      ? joinRoomPagination.count
      : JOIN_ROOM_BATCH_SIZE;

  const visibleJoinRooms = useMemo(
    () => filteredJoinRooms.slice(0, visibleJoinRoomCount),
    [filteredJoinRooms, visibleJoinRoomCount],
  );

  const hasMoreJoinRooms = visibleJoinRooms.length < filteredJoinRooms.length;

  const loadMoreJoinRooms = () => {
    if (!hasMoreJoinRooms) return;
    setJoinRoomPagination({
      key: joinRoomPaginationKey,
      count: Math.min(
        visibleJoinRoomCount + JOIN_ROOM_BATCH_SIZE,
        filteredJoinRooms.length,
      ),
    });
  };

  const handleJoinRoomGridScroll = (event: UIEvent<HTMLElement>) => {
    if (!hasMoreJoinRooms) return;
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    if (scrollHeight - (scrollTop + clientHeight) <= 120) {
      loadMoreJoinRooms();
    }
  };

  const renderJoinRoomLoader = () => (
    <div className="rounded-2xl border border-[var(--mc-border)] border-dashed bg-slate-950/18 px-4 py-5 text-center text-sm text-[var(--mc-text-muted)]/85">
      載入更多房間中...
    </div>
  );

  const renderJoinRoomCard = (
    room: RoomSummary,
    _itemIndex: number,
    view: "grid" | "list",
    directMatch = false,
  ) => {
    const isLeaderboardRoom = roomIsLeaderboardChallenge(room);
    const requiresLogin = !isAuthenticated;
    const kickState = getRoomKickState(room);
    const isViewerBlocked = Boolean(kickState?.blocked);
    const maxPlayers =
      typeof room.maxPlayers === "number" && room.maxPlayers > 0
        ? room.maxPlayers
        : null;
    const isRoomFull = maxPlayers !== null && room.playerCount >= maxPlayers;
    const roomProgressLabel = getRoomProgressLabel(room);
    const playlistCoverUrl = getRoomPlaylistCoverUrl(room);
    const playerCapacityLabel = `${room.playerCount}${maxPlayers ? `/${maxPlayers}` : ""}`;
    const handleRoomAction = () => {
      if (isViewerBlocked) {
        triggerBlockedRoomFeedback(room, kickState?.label ?? null);
        return;
      }
      if (isRoomFull) return;
      if (directMatch) {
        void handleDirectJoinById();
      } else {
        handleJoinRoomEntry(room);
      }
    };
    const statusPillClass = isViewerBlocked
      ? "border-rose-200/45 bg-rose-400/12 text-rose-100"
      : isRoomFull
      ? "border-rose-300/45 bg-rose-400/12 text-rose-100"
      : isRoomCurrentlyPlaying(room)
        ? "border-emerald-300/40 bg-emerald-400/10 text-emerald-100"
        : "border-slate-300/20 bg-slate-400/10 text-slate-200";

    if (view === "list") {
      return (
        <div
          key={room.id}
          data-room-card="true"
          role="button"
          tabIndex={isRoomFull ? -1 : 0}
          aria-disabled={isRoomFull}
          onClick={handleRoomAction}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              handleRoomAction();
            }
          }}
          className={`relative h-[140px] rounded-2xl border px-3 py-3 text-left transition focus:outline-none focus-visible:ring-2 ${
            isViewerBlocked
              ? "cursor-pointer border-rose-300/45 bg-[linear-gradient(180deg,rgba(127,29,29,0.22),rgba(15,23,42,0.3))] text-slate-200 hover:border-rose-200/65 focus-visible:border-rose-200/70 focus-visible:ring-rose-300/25"
              : isRoomFull
              ? "cursor-not-allowed border-rose-300/35 bg-[linear-gradient(180deg,rgba(127,29,29,0.18),rgba(15,23,42,0.28))] text-slate-300"
              : isLeaderboardRoom
                ? "cursor-pointer border-amber-300/22 bg-[linear-gradient(180deg,rgba(31,22,8,0.34),rgba(15,23,42,0.25))] hover:border-amber-300/42 hover:bg-slate-900/34 focus-visible:border-amber-300/60 focus-visible:ring-amber-300/25"
                : "cursor-pointer border-[var(--mc-border)] bg-slate-950/25 hover:border-amber-300/35 hover:bg-slate-900/30 focus-visible:border-amber-300/55 focus-visible:ring-amber-300/25"
          } ${shakingRoomId === room.id ? "animate-[room-card-denied-shake_420ms_cubic-bezier(0.36,0.07,0.19,0.97)]" : ""}`}
        >
          <div className="flex h-full min-w-0 items-stretch gap-3">
            <div
              className={`flex w-[4.25rem] shrink-0 flex-col items-center justify-center rounded-xl border ${
                isRoomFull
                  ? "border-rose-300/35 bg-rose-400/10 text-rose-50"
                  : "border-white/10 bg-white/[0.04] text-amber-50"
              }`}
            >
              <GroupsRounded sx={{ fontSize: 18 }} />
              <span className="mt-1 text-sm font-semibold leading-none">
                {playerCapacityLabel}
              </span>
              <span className="mt-1 text-[10px] font-semibold text-[var(--mc-text-muted)]/85">
                {isRoomFull ? "滿房" : "玩家"}
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold leading-5 text-[var(--mc-text)]">
                    {room.name}
                  </p>
                  <div className="mt-1 flex min-w-0 items-center gap-2">
                    <div className="h-8 w-11 shrink-0 overflow-hidden rounded-md border border-white/10 bg-slate-950/45">
                      {playlistCoverUrl ? (
                        <img
                          src={playlistCoverUrl}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-amber-100/75">
                          <LibraryMusicRounded sx={{ fontSize: 14 }} />
                        </div>
                      )}
                    </div>
                    <p
                      className="min-w-0 truncate text-[11px] text-[var(--mc-text-muted)]/82"
                      title={getRoomPlaylistLabel(room)}
                    >
                      {getRoomPlaylistLabel(room)}
                    </p>
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] ${statusPillClass}`}
                >
                  {isViewerBlocked ? "限制中" : getRoomStatusLabel(room)}
                </span>
              </div>

              <div className="mt-2 flex min-h-6 flex-wrap items-center gap-1.5 text-[11px]">
                {isLeaderboardRoom ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/24 bg-amber-300/10 px-2 py-0.5 font-semibold text-amber-100">
                    <EmojiEventsRounded sx={{ fontSize: 13 }} />
                    排行
                  </span>
                ) : null}
                {roomRequiresPin(room) ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/20 bg-amber-300/8 px-2 py-0.5 font-semibold text-amber-100">
                    <LockRounded sx={{ fontSize: 13 }} />
                    PIN
                  </span>
                ) : null}
                {roomProgressLabel ? (
                  <span className="truncate text-emerald-200/85">
                    {roomProgressLabel}
                  </span>
                ) : null}
              </div>

              <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-[var(--mc-text-muted)]">
                <span className="truncate">
                  {room.gameSettings?.questionCount ?? "-"} 題
                </span>
                <span className="truncate">
                  公布 {room.gameSettings?.revealDurationSec ?? "-"}s
                </span>
                <span className="truncate text-right">
                  {formatRoomCodeDisplay(room.roomCode)}
                </span>
              </div>

            </div>
          </div>
          {isViewerBlocked ? (
            <div className="pointer-events-none absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full border border-rose-200/35 bg-slate-950/88 px-2 py-1 text-[11px] font-semibold text-rose-50 shadow-[0_12px_26px_-20px_rgba(251,113,133,0.95)]">
              {kickState?.label ? (
                <TimerRounded sx={{ fontSize: 13 }} />
              ) : (
                <BlockRounded sx={{ fontSize: 13 }} />
              )}
              <span>{kickState?.label ?? "封鎖"}</span>
            </div>
          ) : null}
        </div>
      );
    }

    return (
      <div
        key={room.id}
        data-room-card="true"
        role="button"
        tabIndex={isRoomFull ? -1 : 0}
        aria-disabled={isRoomFull}
        onClick={handleRoomAction}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleRoomAction();
          }
        }}
        className={`relative rounded-2xl border p-4 text-left transition focus:outline-none focus-visible:ring-2 ${
          isViewerBlocked
            ? "cursor-pointer border-rose-300/45 bg-[linear-gradient(180deg,rgba(127,29,29,0.22),rgba(15,23,42,0.3))] text-slate-200 hover:border-rose-200/65 focus-visible:border-rose-200/70 focus-visible:ring-rose-300/25"
            : isRoomFull
            ? "cursor-not-allowed border-rose-300/35 bg-[linear-gradient(180deg,rgba(127,29,29,0.18),rgba(15,23,42,0.28))] text-slate-300"
            : isLeaderboardRoom
            ? "border-amber-300/22 bg-[linear-gradient(180deg,rgba(31,22,8,0.34),rgba(15,23,42,0.25))] hover:border-amber-300/42 hover:bg-slate-900/34 focus-visible:border-amber-300/60 focus-visible:ring-amber-300/25"
            : "border-[var(--mc-border)] bg-slate-950/25 hover:border-amber-300/35 hover:bg-slate-900/30 focus-visible:border-amber-300/55 focus-visible:ring-amber-300/25"
        } ${shakingRoomId === room.id ? "animate-[room-card-denied-shake_420ms_cubic-bezier(0.36,0.07,0.19,0.97)]" : ""}`}
      >
        <div className="space-y-3">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--mc-text)] sm:text-[15px]">
                  {room.name}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--mc-text-muted)]/82">
                  {isLeaderboardRoom ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/24 bg-amber-300/10 px-2 py-0.5 font-semibold text-amber-100">
                      <EmojiEventsRounded sx={{ fontSize: 13 }} />
                      排行挑戰
                    </span>
                  ) : null}
                  {roomProgressLabel ? (
                    <span className="text-emerald-200/85">
                      {roomProgressLabel}
                    </span>
                  ) : null}
                </div>
              </div>
              <span
                className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] ${statusPillClass}`}
              >
                {isViewerBlocked ? "限制中" : getRoomStatusLabel(room)}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-[var(--mc-text-muted)]">
                <span className="inline-flex items-center gap-1.5">
                  <GroupsRounded
                    sx={{
                      fontSize: 15,
                      color: isRoomFull ? "rgba(254, 202, 202, 0.95)" : undefined,
                    }}
                  />
                  <span
                    className={
                      isRoomFull ? "font-semibold text-rose-100" : undefined
                    }
                  >
                    {playerCapacityLabel} 人{isRoomFull ? "，已滿" : ""}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <QuizRounded sx={{ fontSize: 15 }} />
                  <span>{room.gameSettings?.questionCount ?? "-"} 題</span>
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-[var(--mc-text-muted)]/90">
              <span className="inline-flex items-center gap-1.5">
                <VisibilityRounded sx={{ fontSize: 15 }} />
                <span>公布 {room.gameSettings?.revealDurationSec ?? "-"}s</span>
              </span>
              {room.gameSettings?.allowCollectionClipTiming ? (
                <span className="inline-flex items-center gap-1.5">
                  <ContentCutRounded sx={{ fontSize: 15 }} />
                  <span>沿用題庫片段</span>
                </span>
              ) : (
                <>
                  <span className="inline-flex items-center gap-1.5">
                    <AccessTimeRounded sx={{ fontSize: 15 }} />
                    <span>
                      作答 {room.gameSettings?.playDurationSec ?? "-"}s
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <FastForwardRounded sx={{ fontSize: 15 }} />
                    <span>
                      起始 {room.gameSettings?.startOffsetSec ?? "-"}s
                    </span>
                  </span>
                </>
              )}
              <span className="inline-flex items-center gap-1.5">
                <TipsAndUpdatesRounded sx={{ fontSize: 15 }} />
                <span>
                  {getPlaybackExtensionLabel(
                    room.gameSettings?.playbackExtensionMode,
                  )}
                </span>
              </span>
            </div>

            <div className="flex items-start gap-3 rounded-xl bg-white/[0.03] px-3 py-2">
              <div className="h-12 w-16 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-slate-950/45">
                {playlistCoverUrl ? (
                  <img
                    src={playlistCoverUrl}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-amber-100/75">
                    <LibraryMusicRounded sx={{ fontSize: 18 }} />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--mc-text-muted)]/80">
                  {getRoomSourceTypeLabel(room) ?? "題庫名稱"}
                </p>
                <p
                  className="truncate text-sm font-medium leading-snug text-[var(--mc-text)]"
                  title={getRoomPlaylistLabel(room)}
                >
                  {getRoomPlaylistLabel(room)}
                </p>
                <p className="mt-1 text-[11px] text-[var(--mc-text-muted)]/80">
                  題庫題數：{formatPlaylistAvailabilityLabel(room)}
                </p>
              </div>
            </div>
            <p className="text-[11px] text-[var(--mc-text-muted)]/80">
              房間代碼：{formatRoomCodeDisplay(room.roomCode)}
            </p>
          </div>
        </div>
        {isViewerBlocked ? (
          <div className="pointer-events-none absolute inset-x-3 bottom-3 flex justify-end">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200/35 bg-slate-950/88 px-2.5 py-1 text-[11px] font-semibold text-rose-50 shadow-[0_12px_26px_-20px_rgba(251,113,133,0.95)]">
              {kickState?.label ? (
                <TimerRounded sx={{ fontSize: 14 }} />
              ) : (
                <BlockRounded sx={{ fontSize: 14 }} />
              )}
              {kickState?.label ? `剩 ${kickState.label}` : "已封鎖"}
            </span>
          </div>
        ) : null}
        {requiresLogin && !isRoomFull && !isViewerBlocked ? (
          <div className="pointer-events-none absolute inset-x-3 bottom-3 flex justify-end">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--mc-accent)]/10 px-2.5 py-1 text-[11px] font-semibold text-[var(--mc-accent)]">
              <LoginRounded sx={{ fontSize: 14 }} />
              點擊登入
            </span>
          </div>
        ) : null}
        {roomRequiresPin(room) ? (
          <LockRounded
            sx={{
              fontSize: 18,
              color: "rgba(250, 204, 21, 0.92)",
            }}
            className={`pointer-events-none absolute right-3 ${
              requiresLogin || isRoomFull || isViewerBlocked
                ? "bottom-10"
                : "bottom-3"
            }`}
          />
        ) : null}
      </div>
    );
  };

  return (
    <>
      <style>
        {`
          @keyframes room-card-denied-shake {
            0%, 100% { transform: translateX(0); }
            20% { transform: translateX(-4px); }
            40% { transform: translateX(4px); }
            60% { transform: translateX(-3px); }
            80% { transform: translateX(3px); }
          }
        `}
      </style>
      <section className="join-explorer" aria-label="瀏覽房間列表" onScroll={isMobileLayout ? handleJoinRoomGridScroll : undefined}>
        <header className="join-explorer__header">
          <div>
            <h2>尋找房間</h2>
            <p>瀏覽公開房間，或輸入代碼找到朋友。</p>
          </div>
          <span className="join-explorer__presence"><i aria-hidden="true" />{siteOnlineCount ?? "--"} 人在線</span>
        </header>

        <div className="join-explorer__toolbar">
          <div className="join-explorer__code">
            <label htmlFor="join-explorer-code">房間代碼</label>
            <div className="join-explorer__code-row">
              <RoomCodeInput
                id="join-explorer-code"
                value={normalizedDirectRoomCode}
                inputRef={directRoomCodeInputRef}
                error={directJoinError}
                loading={directJoinLoading}
                onChange={(value) => {
                  setDirectRoomIdInput(normalizeRoomCodeInput(value));
                  setDirectJoinPreviewRoom(null);
                  setDirectJoinError(null);
                  setDirectJoinNeedsPassword(false);
                }}
                onSubmit={() => { void handleDirectJoinById(); }}
              />
              <button type="button" className="join-explorer__clear" aria-label="清除房間代碼" disabled={!normalizedDirectRoomCode} onClick={() => { clearCodeSearch(); directRoomCodeInputRef.current?.focus(); }}>
                <CloseRounded sx={{ fontSize: 18 }} />
              </button>
            </div>
          </div>
          <fieldset className="join-explorer__filters" disabled={isCodeSearch}>
            <legend className="sr-only">公開房間篩選</legend>
            <MuizoSelect<JoinStatusFilter>
              label="狀態"
              ariaLabel="房間狀態"
              placeholder="全部狀態"
              size="compact"
              value={joinStatusFilter}
              options={joinStatusOptions.map((option) => ({ value: option.key, label: option.label, hideThumbnail: true }))}
              disabled={isCodeSearch}
              onChange={setJoinStatusFilter}
            />
            <MuizoSelect<JoinPasswordFilter>
              label="PIN"
              ariaLabel="房間 PIN"
              placeholder="全部"
              size="compact"
              value={joinPasswordFilter}
              options={joinPasswordOptions.map((option) => ({ value: option.key, label: option.label, hideThumbnail: true }))}
              disabled={isCodeSearch}
              onChange={setJoinPasswordFilter}
            />
            <MuizoSelect<JoinSortMode>
              label="排序"
              ariaLabel="房間排序"
              placeholder="最新建立"
              size="compact"
              value={joinSortMode}
              options={joinSortOptions.map((option) => ({ value: option.key, label: option.label, hideThumbnail: true }))}
              disabled={isCodeSearch}
              onChange={setJoinSortMode}
            />
          </fieldset>
        </div>

        <div className="join-explorer__results-bar">
          <div className="join-explorer__result-label" role="status">
            <h3>{isCodeSearch ? "代碼查詢結果" : "公開房間"}</h3>
            <span>{isCodeSearch ? (directJoinLoading ? "查詢中…" : resolvedDirectJoinRoom ? "找到 1 間房間" : "") : `${filteredJoinRooms.length} 間房間 · ${filteredJoinPlayerTotal} 人正在玩`}</span>
          </div>
          {isCodeSearch ? (
            <button type="button" className="join-explorer__back" onClick={clearCodeSearch}>返回公開房間</button>
          ) : (
            <div className="join-explorer__view" aria-label="房間顯示方式">
              <button type="button" aria-label="圖示檢視" aria-pressed={joinRoomsView === "grid"} onClick={() => setJoinRoomsView("grid")}><GridViewRounded sx={{ fontSize: 17 }} /></button>
              <button type="button" aria-label="清單檢視" aria-pressed={joinRoomsView === "list"} onClick={() => setJoinRoomsView("list")}><ViewAgendaRounded sx={{ fontSize: 17 }} /></button>
            </div>
          )}
        </div>
        <div className="join-explorer__results" aria-busy={isCodeSearch && directJoinLoading}>
          {isCodeSearch ? (
            resolvedDirectJoinRoom ? (
              <div className="join-explorer__match">
                {renderJoinRoomCard(resolvedDirectJoinRoom, 0, "grid", true)}
              </div>
            ) : directJoinError ? (
              <div className="join-explorer__empty">
                <MeetingRoomRounded sx={{ fontSize: 28 }} />
                <h3>無法取得房間資訊</h3>
                <p>請確認代碼與連線狀態，或請朋友確認房間仍在開放中。</p>
                <button type="button" className="join-explorer__back" onClick={clearCodeSearch}>瀏覽公開房間</button>
              </div>
            ) : (
              <div className="join-explorer__skeleton" role="status" aria-label="正在查詢房間"><span /><span /><span /></div>
            )
          ) : filteredJoinRooms.length === 0 ? (
            <div className="join-explorer__empty">
              <MeetingRoomRounded sx={{ fontSize: 28 }} />
              <h3>{joinStatusFilter !== "all" || joinPasswordFilter !== "all" ? "沒有符合條件的房間" : "目前還沒有公開房間"}</h3>
              <p>{joinStatusFilter !== "all" || joinPasswordFilter !== "all" ? "試著放寬篩選條件，看看其他房間。" : "有朋友的房間代碼嗎？在上方輸入 6 碼即可找到房間。"}</p>
              {joinStatusFilter !== "all" || joinPasswordFilter !== "all" ? <button type="button" className="join-explorer__back" onClick={() => { setJoinStatusFilter("all"); setJoinPasswordFilter("all"); }}>清除篩選</button> : null}
            </div>

            ) : joinRoomsView === "grid" || isMobileLayout ? (
              <div
                className="join-explorer__room-list mt-4 min-h-0 flex-1 overflow-y-auto pb-4 pr-1"
                onScroll={!isMobileLayout ? handleJoinRoomGridScroll : undefined}
              >
                <div className={joinRoomsView === "grid" ? "grid gap-2 sm:grid-cols-2 lg:grid-cols-3" : "grid gap-2"}>
                  {visibleJoinRooms.map((room, index) =>
                    renderJoinRoomCard(room, index, joinRoomsView),
                  )}
                  {hasMoreJoinRooms ? renderJoinRoomLoader() : null}
                </div>
              </div>
            ) : (
              <div className="mt-4 min-h-0 flex-1">
                <List<VirtualJoinRoomRowProps>
                  style={{
                    height: "100%",
                    width: "100%",
                  }}
                  rowCount={
                    visibleJoinRooms.length + (hasMoreJoinRooms ? 1 : 0)
                  }
                  rowHeight={JOIN_ROOM_LIST_ROW_HEIGHT}
                  rowProps={{
                    items: visibleJoinRooms,
                    renderItem: renderJoinRoomCard,
                    hasMore: hasMoreJoinRooms,
                    onLoadMore: loadMoreJoinRooms,
                    renderLoader: renderJoinRoomLoader,
                  }}
                  rowComponent={VirtualJoinRoomRow as never}
                />
              </div>
            )}
        </div>
      </section>

      <Dialog
        open={Boolean(joinConfirmDialog)}
        onClose={closeJoinConfirmDialog}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>此對戰已進行中</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1.5, color: "text.secondary" }}>
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
                  {typeof joinConfirmDialog.completedQuestionCount === "number"
                    ? `（已完成 ${joinConfirmDialog.completedQuestionCount} 題${
                        typeof joinConfirmDialog.totalQuestionCount === "number"
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
          <Typography variant="body2" sx={{ mb: 1.5, color: "text.secondary" }}>
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
              lang: "en",
              autoCorrect: "off",
              pattern: "\\d{4}",
              maxLength: 4,
              style: { imeMode: "disabled" },
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
    </>
  );
};

export default JoinRoomPanel;
