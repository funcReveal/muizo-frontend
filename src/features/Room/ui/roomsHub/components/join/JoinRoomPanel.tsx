import { type RefObject } from "react";
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

import type { RoomSummary } from "../../../../model/types";

type JoinPasswordFilter = "all" | "no_password" | "password_required";
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
  joinSortMode: JoinSortMode;
  setJoinSortMode: (value: JoinSortMode) => void;
  joinPreviewRoom: RoomSummary | null;
  filteredJoinRooms: RoomSummary[];
  filteredJoinPlayerTotal: number;
  joinRoomsView: JoinRoomsView;
  setJoinRoomsView: (value: JoinRoomsView) => void;
  selectedJoinRoomId: string | null;
  setSelectedJoinRoomId: (value: string | null) => void;
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
  joinSortMode,
  setJoinSortMode,
  joinPreviewRoom,
  filteredJoinRooms,
  filteredJoinPlayerTotal,
  joinRoomsView,
  setJoinRoomsView,
  selectedJoinRoomId,
  setSelectedJoinRoomId,
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
  return (
    <>
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
                                onClick={() =>
                                  directRoomCodeInputRef.current?.focus()
                                }
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
                                  lang="en"
                                  autoCapitalize="characters"
                                  autoComplete="off"
                                  autoCorrect="off"
                                  spellCheck={false}
                                  maxLength={6}
                                  style={{ imeMode: "disabled" }}
                                  className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0"
                                />
                                <div className="pointer-events-none flex items-center justify-center gap-2.5 sm:gap-3">
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
                                <div
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => {
                                    setSelectedJoinRoomId(room.id);
                                  }}
                                  onKeyDown={(event) => {
                                    if (
                                      event.key === "Enter" ||
                                      event.key === " "
                                    ) {
                                      event.preventDefault();
                                      setSelectedJoinRoomId(room.id);
                                    }
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
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
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
