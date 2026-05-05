import { useMemo, useState, type RefObject, type UIEvent } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
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
import RadioButtonCheckedRounded from "@mui/icons-material/RadioButtonCheckedRounded";
import MeetingRoomRounded from "@mui/icons-material/MeetingRoomRounded";
import SyncAltRounded from "@mui/icons-material/SyncAltRounded";
import SwapVertRounded from "@mui/icons-material/SwapVertRounded";
import TipsAndUpdatesRounded from "@mui/icons-material/TipsAndUpdatesRounded";
import VisibilityRounded from "@mui/icons-material/VisibilityRounded";
import ViewAgendaRounded from "@mui/icons-material/ViewAgendaRounded";

import type { PlaybackExtensionMode, RoomSummary } from "@domain/room/types";
import { formatPlaylistAvailabilityLabel } from "@features/RoomSession/model/playlistAvailability";
import VirtualJoinRoomRow, {
  type VirtualJoinRoomRowProps,
} from "./VirtualJoinRoomRow";

type JoinPasswordFilter = "all" | "no_password" | "password_required";
type JoinStatusFilter = "all" | "waiting" | "playing";
type JoinSortMode = "latest" | "players_desc";
type JoinEntryTab = "code" | "browser";
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
  joinEntryTab: JoinEntryTab;
  setJoinEntryTab: (value: JoinEntryTab) => void;
  directJoinError: string | null;
  directJoinLoading: boolean;
  normalizedDirectRoomCode: string;
  directRoomCodeInputRef: RefObject<HTMLInputElement | null>;
  isDirectRoomCodeFocused: boolean;
  setIsDirectRoomCodeFocused: (value: boolean) => void;
  directRoomCodeSlots: string[];
  activeDirectRoomCodeIndex: number;
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
  filteredJoinPlayerTotal: number;
  siteOnlineCount: number | null;
  joinRoomsView: JoinRoomsView;
  setJoinRoomsView: (value: JoinRoomsView) => void;
  handleJoinRoomEntry: (room: RoomSummary) => void;
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
  joinEntryTab,
  setJoinEntryTab,
  directJoinError,
  directJoinLoading,
  normalizedDirectRoomCode,
  directRoomCodeInputRef,
  isDirectRoomCodeFocused,
  setIsDirectRoomCodeFocused,
  directRoomCodeSlots,
  activeDirectRoomCodeIndex,
  setDirectRoomIdInput,
  setDirectJoinPreviewRoom,
  setDirectJoinError,
  setDirectJoinNeedsPassword,
  normalizeRoomCodeInput,
  handleDirectJoinById,
  resolvedDirectJoinRoom,
  directJoinNeedsPassword,
  joinPasswordFilter,
  setJoinPasswordFilter,
  joinStatusFilter,
  setJoinStatusFilter,
  joinSortMode,
  setJoinSortMode,
  filteredJoinRooms,
  filteredJoinPlayerTotal,
  siteOnlineCount,
  joinRoomsView,
  setJoinRoomsView,
  handleJoinRoomEntry,
  roomRequiresPin,
  roomIsLeaderboardChallenge,
  isRoomCurrentlyPlaying,
  getRoomStatusLabel,
  getRoomPlaylistLabel,
  formatRoomCodeDisplay,
  isAuthenticated = false,
  isAuthLoading = false,
  onLoginRequired,
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
  const joinStatusOptions: Array<{
    key: JoinStatusFilter;
    label: string;
    shortLabel: string;
  }> = [
    { key: "all", label: "全部狀態", shortLabel: "全部狀態" },
    { key: "waiting", label: "等待中", shortLabel: "等待中" },
  ];
  const joinPasswordOptions: Array<{
    key: JoinPasswordFilter;
    label: string;
    shortLabel: string;
  }> = [
    { key: "all", label: "全部", shortLabel: "全部" },
    { key: "no_password", label: "免 PIN", shortLabel: "免 PIN" },
  ];
  const joinSortOptions: Array<{
    key: JoinSortMode;
    label: string;
    shortLabel: string;
  }> = [
    { key: "latest", label: "最新建立", shortLabel: "最新建立" },
    { key: "players_desc", label: "人數最多", shortLabel: "人數最多" },
  ];

  const cycleOption = <T extends string>(
    options: readonly T[],
    current: T,
  ): T => {
    const currentIndex = options.indexOf(current);
    return options[(currentIndex + 1) % options.length] ?? options[0];
  };

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

  const currentJoinStatusOption =
    joinStatusOptions.find((item) => item.key === joinStatusFilter) ??
    joinStatusOptions[0];
  const currentJoinPasswordOption =
    joinPasswordOptions.find((item) => item.key === joinPasswordFilter) ??
    joinPasswordOptions[0];
  const currentJoinSortOption =
    joinSortOptions.find((item) => item.key === joinSortMode) ??
    joinSortOptions[0];
  const isStatusFilterActive = joinStatusFilter !== "all";
  const isPinFilterActive = joinPasswordFilter !== "all";

  const joinRoomPaginationKey = useMemo(
    () =>
      [
        joinEntryTab,
        joinPasswordFilter,
        joinRoomsView,
        joinSortMode,
        joinStatusFilter,
        filteredJoinRooms.map((room) => room.id).join("|"),
      ].join("::"),
    [
      filteredJoinRooms,
      joinEntryTab,
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

  const handleJoinRoomGridScroll = (event: UIEvent<HTMLDivElement>) => {
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
  ) => {
    const isLeaderboardRoom = roomIsLeaderboardChallenge(room);
    const requiresLogin = isLeaderboardRoom && !isAuthenticated;
    const maxPlayers =
      typeof room.maxPlayers === "number" && room.maxPlayers > 0
        ? room.maxPlayers
        : null;
    const isRoomFull = maxPlayers !== null && room.playerCount >= maxPlayers;
    const roomProgressLabel = getRoomProgressLabel(room);
    const playerCapacityLabel = `${room.playerCount}${maxPlayers ? `/${maxPlayers}` : ""}`;
    const handleRoomAction = () => {
      if (isRoomFull) return;
      handleJoinRoomEntry(room);
    };
    const statusPillClass = isRoomFull
      ? "border-rose-300/45 bg-rose-400/12 text-rose-100"
      : isRoomCurrentlyPlaying(room)
        ? "border-emerald-300/40 bg-emerald-400/10 text-emerald-100"
        : "border-slate-300/20 bg-slate-400/10 text-slate-200";

    if (view === "list") {
      return (
        <div
          key={room.id}
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
            isRoomFull
              ? "cursor-not-allowed border-rose-300/35 bg-[linear-gradient(180deg,rgba(127,29,29,0.18),rgba(15,23,42,0.28))] text-slate-300"
              : isLeaderboardRoom
                ? "cursor-pointer border-amber-300/22 bg-[linear-gradient(180deg,rgba(31,22,8,0.34),rgba(15,23,42,0.25))] hover:border-amber-300/42 hover:bg-slate-900/34 focus-visible:border-amber-300/60 focus-visible:ring-amber-300/25"
                : "cursor-pointer border-[var(--mc-border)] bg-slate-950/25 hover:border-amber-300/35 hover:bg-slate-900/30 focus-visible:border-amber-300/55 focus-visible:ring-amber-300/25"
          }`}
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
                  <p
                    className="mt-0.5 truncate text-[11px] text-[var(--mc-text-muted)]/82"
                    title={getRoomPlaylistLabel(room)}
                  >
                    {getRoomPlaylistLabel(room)}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] ${statusPillClass}`}
                >
                  {getRoomStatusLabel(room)}
                </span>
              </div>

              <div className="mt-2 flex min-h-6 flex-wrap items-center gap-1.5 text-[11px]">
                {isLeaderboardRoom ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/24 bg-amber-300/10 px-2 py-0.5 font-semibold text-amber-100">
                    <EmojiEventsRounded sx={{ fontSize: 13 }} />
                    排行
                  </span>
                ) : null}
                {requiresLogin && !isRoomFull ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-cyan-200/22 bg-cyan-300/8 px-2 py-0.5 font-semibold text-cyan-100">
                    <LoginRounded sx={{ fontSize: 13 }} />
                    需登入
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
        </div>
      );
    }

    return (
      <div
        key={room.id}
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
          isRoomFull
            ? "cursor-not-allowed border-rose-300/35 bg-[linear-gradient(180deg,rgba(127,29,29,0.18),rgba(15,23,42,0.28))] text-slate-300"
            : isLeaderboardRoom
            ? "border-amber-300/22 bg-[linear-gradient(180deg,rgba(31,22,8,0.34),rgba(15,23,42,0.25))] hover:border-amber-300/42 hover:bg-slate-900/34 focus-visible:border-amber-300/60 focus-visible:ring-amber-300/25"
            : "border-[var(--mc-border)] bg-slate-950/25 hover:border-amber-300/35 hover:bg-slate-900/30 focus-visible:border-amber-300/55 focus-visible:ring-amber-300/25"
        }`}
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
                  {requiresLogin && !isRoomFull ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-cyan-200/22 bg-cyan-300/8 px-2 py-0.5 font-semibold text-cyan-100">
                      <LoginRounded sx={{ fontSize: 13 }} />
                      登入後可加入
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
                {getRoomStatusLabel(room)}
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

            <div className="flex items-start gap-2 rounded-xl bg-white/[0.03] px-3 py-2">
              <LibraryMusicRounded
                sx={{
                  fontSize: 17,
                  color: "rgba(250, 204, 21, 0.92)",
                }}
              />
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
        {requiresLogin && !isRoomFull ? (
          <div className="pointer-events-none absolute inset-x-3 bottom-3 flex justify-end">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-200/20 bg-slate-950/80 px-2.5 py-1 text-[11px] font-semibold text-cyan-50 shadow-[0_12px_26px_-22px_rgba(34,211,238,0.85)]">
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
              requiresLogin || isRoomFull ? "bottom-10" : "bottom-3"
            }`}
          />
        ) : null}
      </div>
    );
  };

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="shrink-0">
          <div className="flex flex-col gap-3">
            <div className="rounded-2xl border border-[var(--mc-border)] bg-slate-950/22 p-1">
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
          <>
            <div className="mx-auto rounded-[28px] border border-amber-300/18 bg-[linear-gradient(180deg,rgba(120,53,15,0.2),rgba(15,23,42,0.22))] p-4 sm:p-5">
              <div className="flex flex-col items-center gap-4">
                <div className="w-full">
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
                          border: "1px solid rgba(251, 113, 133, 0.28)",
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
                      onClick={() => directRoomCodeInputRef.current?.focus()}
                      lang="en"
                      className={`relative mx-auto w-full max-w-full cursor-text overflow-hidden rounded-[26px] border bg-slate-950/35 px-2.5 py-3 outline-none transition sm:max-w-[34rem] sm:px-4 sm:py-4 ${
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
                        type="text"
                        lang="en"
                        value={normalizedDirectRoomCode}
                        onFocus={() => setIsDirectRoomCodeFocused(true)}
                        onBlur={() => {
                          setIsDirectRoomCodeFocused(false);
                        }}
                        onChange={(e) => {
                          const next = normalizeRoomCodeInput(e.target.value);
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
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck={false}
                        maxLength={6}
                        // style={{ imeMode: "disabled" }}
                        className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0"
                      />
                      <div className="pointer-events-none flex min-w-0 items-center justify-center gap-1.5 min-[360px]:gap-2 sm:gap-3">
                        {directRoomCodeSlots.slice(0, 3).map((char, index) => (
                          <span
                            key={`room-code-left-${index}`}
                            className={`relative flex h-11 w-8 shrink-0 items-center justify-center rounded-xl border text-base font-semibold tracking-[0.08em] min-[360px]:h-12 min-[360px]:w-9 min-[390px]:h-14 min-[390px]:w-11 min-[390px]:rounded-2xl min-[390px]:tracking-[0.14em] sm:h-16 sm:w-12 sm:text-xl ${
                              directJoinError
                                ? "border-rose-300/35 bg-rose-400/8 text-rose-50"
                                : isDirectRoomCodeFocused &&
                                    activeDirectRoomCodeIndex === index
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
                          className={`shrink-0 px-0.5 text-base font-semibold min-[390px]:px-1 min-[390px]:text-xl sm:text-2xl ${
                            directJoinError
                              ? "text-rose-200/90"
                              : "text-amber-200/80"
                          }`}
                        >
                          -
                        </span>
                        {directRoomCodeSlots.slice(3).map((char, index) => (
                          <span
                            key={`room-code-right-${index}`}
                            className={`relative flex h-11 w-8 shrink-0 items-center justify-center rounded-xl border text-base font-semibold tracking-[0.08em] min-[360px]:h-12 min-[360px]:w-9 min-[390px]:h-14 min-[390px]:w-11 min-[390px]:rounded-2xl min-[390px]:tracking-[0.14em] sm:h-16 sm:w-12 sm:text-xl ${
                              directJoinError
                                ? "border-rose-300/35 bg-rose-400/8 text-rose-50"
                                : isDirectRoomCodeFocused &&
                                    activeDirectRoomCodeIndex === index + 3
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
                  className="min-h-[48px] w-full max-w-[34rem] text-sm sm:min-h-[52px]"
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
                    <div className="flex flex-wrap items-center justify-between gap-3">
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
                            isRoomCurrentlyPlaying(resolvedDirectJoinRoom)
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
                        {resolvedDirectJoinRoom.gameSettings?.questionCount ??
                          "-"}
                      </p>
                    </div>
                    {roomIsLeaderboardChallenge(resolvedDirectJoinRoom) ? (
                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-300/18 bg-amber-300/8 px-3 py-2 text-xs">
                        <span className="inline-flex items-center gap-1.5 font-semibold text-amber-100">
                          <EmojiEventsRounded sx={{ fontSize: 15 }} />
                          排行挑戰
                        </span>
                        {isAuthenticated ? (
                          <span className="text-[var(--mc-text-muted)]">
                            已登入，可加入挑戰
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={isAuthLoading}
                            onClick={onLoginRequired}
                            className="inline-flex items-center gap-1.5 rounded-full border border-cyan-200/20 bg-cyan-300/10 px-2.5 py-1 font-semibold text-cyan-50 transition hover:border-cyan-200/34 hover:bg-cyan-300/14 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <LoginRounded sx={{ fontSize: 14 }} />
                            {isAuthLoading ? "確認登入中..." : "登入後加入"}
                          </button>
                        )}
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {directJoinNeedsPassword && (
                  <p className="mt-2 text-xs text-amber-200">
                    此房間需要 4 位 PIN，按下加入後會請你輸入。
                  </p>
                )}
              </div>
            )}
          </>
        )}
        {joinEntryTab === "browser" && (
          <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface)]/45 p-3">
            <div className="flex min-h-12 shrink-0 flex-wrap items-center justify-between gap-3">
              <p className="text-[13px] text-[var(--mc-text-muted)]">
                目前共 {filteredJoinRooms.length} 間房，房內{" "}
                {filteredJoinPlayerTotal} 人，
                {siteOnlineCount ?? "--"} 人在線
              </p>
              <div className="inline-flex items-center gap-1 rounded-full border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/60 p-0.5">
                <button
                  type="button"
                  aria-label="圖示檢視"
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${
                    joinRoomsView === "grid"
                      ? "cursor-pointer bg-amber-500/20 text-amber-100"
                      : "cursor-pointer text-[var(--mc-text-muted)]"
                  }`}
                  onClick={() => setJoinRoomsView("grid")}
                >
                  <GridViewRounded sx={{ fontSize: 14 }} />
                </button>
                <button
                  type="button"
                  aria-label="清單檢視"
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${
                    joinRoomsView === "list"
                      ? "cursor-pointer bg-amber-500/20 text-amber-100"
                      : "cursor-pointer text-[var(--mc-text-muted)]"
                  }`}
                  onClick={() => setJoinRoomsView("list")}
                >
                  <ViewAgendaRounded sx={{ fontSize: 14 }} />
                </button>
              </div>
            </div>

            <div className="mt-3 flex shrink-0 flex-nowrap gap-2">
              <button
                type="button"
                onClick={() =>
                  setJoinStatusFilter(
                    cycleOption(
                      joinStatusOptions.map((item) => item.key),
                      joinStatusFilter,
                    ),
                  )
                }
                className={`inline-flex w-[104px] shrink-0 flex-col items-start rounded-[18px] border px-2.5 py-1.5 text-left transition ${
                  isStatusFilterActive
                    ? "border-cyan-300/35 bg-cyan-400/[0.08] hover:border-cyan-300/45 hover:bg-cyan-400/[0.11]"
                    : "border-white/8 bg-white/[0.035] hover:border-amber-300/30 hover:bg-amber-300/[0.06]"
                }`}
              >
                <span
                  className={`inline-flex items-center gap-1 text-[10px] ${
                    isStatusFilterActive
                      ? "text-cyan-100/88"
                      : "text-[var(--mc-text-muted)]"
                  }`}
                >
                  <RadioButtonCheckedRounded
                    sx={{
                      fontSize: 14,
                      color: isStatusFilterActive
                        ? "rgba(103, 232, 249, 0.92)"
                        : "rgba(148, 163, 184, 0.9)",
                    }}
                  />
                  <span>狀態</span>
                </span>
                <span
                  className={`mt-1 flex w-full items-center justify-between gap-1 text-[11px] font-medium ${
                    isStatusFilterActive
                      ? "text-cyan-50"
                      : "text-[var(--mc-text)]"
                  }`}
                >
                  <span className="min-w-0 truncate">
                    {currentJoinStatusOption.shortLabel}
                  </span>
                  <SyncAltRounded
                    sx={{
                      fontSize: 14,
                      color: isStatusFilterActive
                        ? "rgba(103, 232, 249, 0.92)"
                        : "rgba(251, 191, 36, 0.86)",
                    }}
                  />
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setJoinPasswordFilter(
                    cycleOption(
                      joinPasswordOptions.map((item) => item.key),
                      joinPasswordFilter,
                    ),
                  )
                }
                className={`inline-flex w-[104px] shrink-0 flex-col items-start rounded-[18px] border px-2.5 py-1.5 text-left transition ${
                  isPinFilterActive
                    ? "border-amber-300/38 bg-amber-300/[0.09] hover:border-amber-300/48 hover:bg-amber-300/[0.12]"
                    : "border-white/8 bg-white/[0.035] hover:border-amber-300/30 hover:bg-amber-300/[0.06]"
                }`}
              >
                <span
                  className={`inline-flex items-center gap-1 text-[10px] ${
                    isPinFilterActive
                      ? "text-amber-100/88"
                      : "text-[var(--mc-text-muted)]"
                  }`}
                >
                  <LockRounded
                    sx={{
                      fontSize: 14,
                      color: isPinFilterActive
                        ? "rgba(251, 191, 36, 0.94)"
                        : "rgba(148, 163, 184, 0.9)",
                    }}
                  />
                  <span>PIN</span>
                </span>
                <span
                  className={`mt-1 flex w-full items-center justify-between gap-1 text-[11px] font-medium ${
                    isPinFilterActive
                      ? "text-amber-50"
                      : "text-[var(--mc-text)]"
                  }`}
                >
                  <span className="min-w-0 truncate">
                    {currentJoinPasswordOption.shortLabel}
                  </span>
                  <SyncAltRounded
                    sx={{
                      fontSize: 14,
                      color: isPinFilterActive
                        ? "rgba(251, 191, 36, 0.94)"
                        : "rgba(251, 191, 36, 0.86)",
                    }}
                  />
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setJoinSortMode(
                    cycleOption(
                      joinSortOptions.map((item) => item.key),
                      joinSortMode,
                    ),
                  )
                }
                className="inline-flex w-[104px] shrink-0 flex-col items-start rounded-[18px] border border-white/8 bg-white/[0.035] px-2.5 py-1.5 text-left transition hover:border-amber-300/30 hover:bg-amber-300/[0.06]"
              >
                <span className="inline-flex items-center gap-1 text-[10px] text-[var(--mc-text-muted)]">
                  <SwapVertRounded sx={{ fontSize: 14 }} />
                  <span>排序</span>
                </span>
                <span className="mt-1 flex w-full items-center justify-between gap-1 text-[11px] font-medium text-[var(--mc-text)]">
                  <span className="min-w-0 truncate">
                    {currentJoinSortOption.shortLabel}
                  </span>
                  <SyncAltRounded
                    sx={{ fontSize: 14, color: "rgba(251, 191, 36, 0.86)" }}
                  />
                </span>
              </button>
            </div>

            {filteredJoinRooms.length === 0 ? (
              <div className="mt-4 flex min-h-[200px] flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.025] px-4 text-center">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                  <MeetingRoomRounded
                    sx={{ fontSize: 22, color: "rgba(148, 163, 184, 0.9)" }}
                  />
                </div>
                <p className="mt-4 text-sm font-semibold text-[var(--mc-text)]">
                  目前沒有符合條件的房間
                </p>
                <p className="mt-2 whitespace-nowrap text-xs leading-6 text-[var(--mc-text-muted)]">
                  試著調整狀態、PIN 或排序條件，或稍後再重新整理房間列表。
                </p>
              </div>
            ) : joinRoomsView === "grid" ? (
              <div
                className="mt-4 min-h-0 flex-1 overflow-y-auto pb-4 pr-1"
                onScroll={handleJoinRoomGridScroll}
              >
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {visibleJoinRooms.map((room, index) =>
                    renderJoinRoomCard(room, index, "grid"),
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
        )}
      </div>

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
