import {
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
import QuizRounded from "@mui/icons-material/QuizRounded";
import AccessTimeRounded from "@mui/icons-material/AccessTimeRounded";
import ContentCutRounded from "@mui/icons-material/ContentCutRounded";
import FastForwardRounded from "@mui/icons-material/FastForwardRounded";
import GridViewRounded from "@mui/icons-material/GridViewRounded";
import Inventory2Outlined from "@mui/icons-material/Inventory2Outlined";
import TipsAndUpdatesRounded from "@mui/icons-material/TipsAndUpdatesRounded";
import VisibilityRounded from "@mui/icons-material/VisibilityRounded";
import ViewListRounded from "@mui/icons-material/ViewListRounded";

import type {
  PlaybackExtensionMode,
  RoomSummary,
} from "../../../../model/types";
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
  joinRoomsView: JoinRoomsView;
  setJoinRoomsView: (value: JoinRoomsView) => void;
  handleJoinRoomEntry: (room: RoomSummary) => void;
  roomRequiresPin: (room: RoomSummary) => boolean;
  isRoomCurrentlyPlaying: (room: RoomSummary) => boolean;
  getRoomStatusLabel: (room: RoomSummary) => string;
  getRoomPlaylistLabel: (room: RoomSummary) => string;
  formatRoomCodeDisplay: (value: string) => string;
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
  joinRoomsView,
  setJoinRoomsView,
  handleJoinRoomEntry,
  roomRequiresPin,
  isRoomCurrentlyPlaying,
  getRoomStatusLabel,
  getRoomPlaylistLabel,
  formatRoomCodeDisplay,
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
  const JOIN_ROOM_LIST_HEIGHT = 560;
  const JOIN_ROOM_LIST_ROW_HEIGHT = 216;

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
        : room.gameSettings?.questionCount ?? null;
    if (!current || !total) return "進行中";
    return `第 ${current}/${total} 題`;
  };

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
  ) => (
    <div
      key={room.id}
      role="button"
      tabIndex={0}
      onClick={() => handleJoinRoomEntry(room)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleJoinRoomEntry(room);
        }
      }}
      className={`relative cursor-pointer rounded-2xl border border-[var(--mc-border)] bg-slate-950/25 text-left transition hover:border-amber-300/35 hover:bg-slate-900/30 focus:outline-none focus-visible:border-amber-300/55 focus-visible:ring-2 focus-visible:ring-amber-300/25 ${
        view === "grid" ? "p-4" : "h-[204px] px-4 py-3"
      }`}
    >
      <div
        className={`${
          view === "grid" ? "space-y-3" : "flex h-full flex-wrap items-center gap-4"
        }`}
      >
        <div
          className={`${
            view === "grid" ? "space-y-3" : "min-w-0 flex-1 space-y-2.5"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--mc-text)] sm:text-[15px]">
                {room.name}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--mc-text-muted)]/82">
                {getRoomProgressLabel(room) ? (
                  <span className="text-emerald-200/85">
                    {getRoomProgressLabel(room)}
                  </span>
                ) : null}
              </div>
            </div>
            <span
              className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] ${
                isRoomCurrentlyPlaying(room)
                  ? "border-emerald-300/40 bg-emerald-400/10 text-emerald-100"
                  : "border-slate-300/20 bg-slate-400/10 text-slate-200"
              }`}
            >
              {getRoomStatusLabel(room)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-[var(--mc-text-muted)]">
            <span className="inline-flex items-center gap-1.5">
              <GroupsRounded sx={{ fontSize: 15 }} />
              <span>
                {room.playerCount}
                {room.maxPlayers ? `/${room.maxPlayers}` : ""} 人
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <QuizRounded sx={{ fontSize: 15 }} />
              <span>{room.gameSettings?.questionCount ?? "-"} 題</span>
            </span>
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
                  <span>作答 {room.gameSettings?.playDurationSec ?? "-"}s</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <FastForwardRounded sx={{ fontSize: 15 }} />
                  <span>起始 {room.gameSettings?.startOffsetSec ?? "-"}s</span>
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
                題庫題數：{room.playlistCount ?? 0} 題
              </p>
            </div>
          </div>
          <p className="text-[11px] text-[var(--mc-text-muted)]/80">
            房間代碼：{formatRoomCodeDisplay(room.roomCode)}
          </p>

        </div>
      </div>
      {roomRequiresPin(room) ? (
        <LockRounded
          sx={{
            fontSize: 18,
            color: "rgba(250, 204, 21, 0.92)",
          }}
          className="pointer-events-none absolute bottom-3 right-3"
        />
      ) : null}
    </div>
  );

  return (
    <>
      <div className="space-y-3">
        <div>
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
            <div className="mx-auto max-w-3xl rounded-[28px] border border-amber-300/18 bg-[linear-gradient(180deg,rgba(120,53,15,0.2),rgba(15,23,42,0.22))] p-4 sm:p-5">
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
                      <div className="pointer-events-none flex items-center justify-center gap-2.5 sm:gap-3">
                        {directRoomCodeSlots.slice(0, 3).map((char, index) => (
                          <span
                            key={`room-code-left-${index}`}
                            className={`relative flex h-14 w-11 items-center justify-center rounded-2xl border text-lg font-semibold tracking-[0.14em] sm:h-16 sm:w-12 sm:text-xl ${
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
                          className={`px-1 text-xl font-semibold sm:text-2xl ${
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
                            className={`relative flex h-14 w-11 items-center justify-center rounded-2xl border text-lg font-semibold tracking-[0.14em] sm:h-16 sm:w-12 sm:text-xl ${
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
          <div className="rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface)]/45 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm text-[var(--mc-text-muted)]">
                  目前共 {filteredJoinRooms.length} 間房，
                  {filteredJoinPlayerTotal} 人在線
                </p>
              </div>
              <div className="inline-flex items-center gap-1 rounded-full border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/60 p-1">
                <button
                  type="button"
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs ${
                    joinRoomsView === "grid"
                      ? "cursor-pointer bg-amber-500/20 text-amber-100"
                      : "cursor-pointer text-[var(--mc-text-muted)]"
                  }`}
                  onClick={() => setJoinRoomsView("grid")}
                >
                  <GridViewRounded sx={{ fontSize: 15 }} />
                  圖示
                </button>
                <button
                  type="button"
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs ${
                    joinRoomsView === "list"
                      ? "cursor-pointer bg-amber-500/20 text-amber-100"
                      : "cursor-pointer text-[var(--mc-text-muted)]"
                  }`}
                  onClick={() => setJoinRoomsView("list")}
                >
                  <ViewListRounded sx={{ fontSize: 15 }} />
                  清單
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1.15fr)_auto]">
              <div className="rounded-2xl border border-white/8 bg-white/[0.035] px-3 py-3">
                <div className="mb-2 inline-flex items-center gap-2 text-xs text-[var(--mc-text-muted)]">
                  <Inventory2Outlined sx={{ fontSize: 15 }} />
                  房間狀態
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: "all", label: "全部" },
                    { key: "waiting", label: "等待中" },
                    { key: "playing", label: "遊戲中" },
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() =>
                        setJoinStatusFilter(
                          item.key as "all" | "waiting" | "playing",
                        )
                      }
                      className={`rounded-full border px-3 py-1 text-xs transition ${
                        joinStatusFilter === item.key
                          ? "border-amber-300/60 bg-amber-300/15 text-amber-100 shadow-[0_0_0_1px_rgba(251,191,36,0.08)]"
                          : "border-[var(--mc-border)] bg-slate-950/20 text-[var(--mc-text-muted)] hover:text-[var(--mc-text)]"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-white/8 bg-white/[0.035] px-3 py-3">
                <div className="mb-2 inline-flex items-center gap-2 text-xs text-[var(--mc-text-muted)]">
                  <LockRounded sx={{ fontSize: 15 }} />
                  PIN 篩選
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: "all", label: "全部" },
                    { key: "no_password", label: "無 PIN" },
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
                          ? "border-amber-300/60 bg-amber-300/15 text-amber-100 shadow-[0_0_0_1px_rgba(251,191,36,0.08)]"
                          : "border-[var(--mc-border)] bg-slate-950/20 text-[var(--mc-text-muted)] hover:text-[var(--mc-text)]"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-white/8 bg-white/[0.035] px-3 py-3">
                <div className="mb-2 inline-flex items-center gap-2 text-xs text-[var(--mc-text-muted)]">
                  <TipsAndUpdatesRounded sx={{ fontSize: 15 }} />
                  排序方式
                </div>
                <div className="inline-flex overflow-hidden rounded-full border border-[var(--mc-border)] bg-slate-950/20">
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
                    人數由多到少
                  </button>
                </div>
              </div>
            </div>

            {filteredJoinRooms.length === 0 ? (
              <p className="mt-4 text-sm text-[var(--mc-text-muted)]">
                目前沒有符合條件的房間。
              </p>
            ) : joinRoomsView === "grid" ? (
              <div
                className="mt-4 max-h-[560px] overflow-y-auto pr-1"
                onScroll={handleJoinRoomGridScroll}
              >
                <div className="grid gap-2 sm:grid-cols-2">
                  {visibleJoinRooms.map((room, index) =>
                    renderJoinRoomCard(room, index, "grid"),
                  )}
                  {hasMoreJoinRooms ? renderJoinRoomLoader() : null}
                </div>
              </div>
            ) : (
              <div className="mt-4">
                <List<VirtualJoinRoomRowProps>
                  style={{
                    height: JOIN_ROOM_LIST_HEIGHT,
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
