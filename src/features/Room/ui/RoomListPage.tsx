import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";

import type { RoomSummary } from "../model/types";
import { useRoom } from "../model/useRoom";
import { apiFetchRoomById } from "../model/roomApi";
import { API_URL } from "../model/roomConstants";

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

const RoomListPage: React.FC = () => {
  const navigate = useNavigate();
  const [sortMode, setSortMode] = useState<"latest" | "popular">("latest");
  const [filterMode, setFilterMode] = useState<"all" | "open" | "locked">(
    "all",
  );
  const [statusMode, setStatusMode] = useState<"online" | "quiet">("online");
  const {
    username,
    rooms,
    currentRoom,
    currentRoomId,
    setJoinPasswordInput,
    handleJoinRoom,
  } = useRoom();
  const [passwordDialog, setPasswordDialog] = useState<{
    roomId: string;
    roomName: string;
  } | null>(null);
  const [joinConfirmDialog, setJoinConfirmDialog] = useState<{
    roomId: string;
    roomName: string;
    hasPassword: boolean;
    playerCount: number;
    maxPlayers?: number | null;
    questionCount?: number;
    currentQuestionNo?: number | null;
    completedQuestionCount?: number;
    totalQuestionCount?: number;
  } | null>(null);
  const [passwordDraft, setPasswordDraft] = useState("");
  const [joinProbeRoomId, setJoinProbeRoomId] = useState<string | null>(null);

  useEffect(() => {
    if (currentRoom?.id) {
      navigate(`/rooms/${currentRoom.id}`, { replace: true });
    }
  }, [currentRoom?.id, navigate]);

  const sortLabel = useMemo(
    () => (sortMode === "latest" ? "最新建立" : "最熱房間"),
    [sortMode],
  );
  const filterLabel = useMemo(() => {
    if (filterMode === "open") return "公開房間";
    if (filterMode === "locked") return "私密房間";
    return "全部房間";
  }, [filterMode]);
  const statusLabel = useMemo(
    () => (statusMode === "online" ? "目前在線" : "安靜時段"),
    [statusMode],
  );
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
  const proceedJoinRoom = (roomId: string, roomName: string, hasPassword: boolean) => {
    if (hasPassword) {
      openPasswordDialog(roomId, roomName);
      return;
    }
    setJoinPasswordInput("");
    handleJoinRoom(roomId, false);
  };
  const openInProgressJoinDialog = (room: RoomSummary) => {
    setJoinConfirmDialog({
      roomId: room.id,
      roomName: room.name,
      hasPassword: room.hasPassword,
      playerCount: room.playerCount,
      maxPlayers: room.maxPlayers,
      questionCount: room.gameSettings?.questionCount,
      currentQuestionNo:
        typeof room.currentQuestionNo === "number" ? room.currentQuestionNo : null,
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
  const handleJoinRoomClick = async (room: RoomSummary, isPlayingRoom: boolean) => {
    if (joinProbeRoomId === room.id) return;
    if (isPlayingRoom) {
      openInProgressJoinDialog(room);
      return;
    }
    if (!API_URL) {
      proceedJoinRoom(room.id, room.name, room.hasPassword);
      return;
    }
    setJoinProbeRoomId(room.id);
    try {
      const result = await apiFetchRoomById(API_URL, room.id);
      const fetchedRoom = (result.payload as { room?: RoomSummary } | null)?.room;
      if (result.ok && fetchedRoom && isRoomCurrentlyPlaying(fetchedRoom)) {
        openInProgressJoinDialog({ ...room, ...fetchedRoom });
        return;
      }
      proceedJoinRoom(room.id, room.name, room.hasPassword);
    } catch {
      proceedJoinRoom(room.id, room.name, room.hasPassword);
    } finally {
      setJoinProbeRoomId((prev) => (prev === room.id ? null : prev));
    }
  };
  const handleConfirmJoinInProgress = () => {
    if (!joinConfirmDialog) return;
    proceedJoinRoom(
      joinConfirmDialog.roomId,
      joinConfirmDialog.roomName,
      joinConfirmDialog.hasPassword,
    );
    closeJoinConfirmDialog();
  };
  const handleConfirmJoinWithPassword = () => {
    if (!passwordDialog) return;
    const trimmed = passwordDraft.trim();
    if (!trimmed) return;
    if (!/^[a-zA-Z0-9]*$/.test(trimmed)) return;
    setJoinPasswordInput(trimmed);
    handleJoinRoom(passwordDialog.roomId, true);
    closePasswordDialog();
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-6 pt-4 text-[var(--mc-text)]">
      {!currentRoom?.id && username && (
        <section className="w-full">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-[var(--mc-text)]">
                房間列表
              </h2>
            </div>
            <button
              className="inline-flex items-center gap-2 rounded-full border border-[var(--mc-accent)]/60 bg-[var(--mc-accent)]/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--mc-text)] transition hover:border-[var(--mc-accent)] hover:bg-[var(--mc-accent)]/30"
              onClick={() => navigate("/rooms/create", { replace: true })}
            >
              <span className="text-base leading-none">＋</span>
              建立新房間
            </button>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="rounded-full border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/70 px-4 py-2 text-xs text-[var(--mc-text)] transition hover:border-slate-700 hover:bg-[var(--mc-surface-strong)]/90"
                onClick={() =>
                  setSortMode((prev) =>
                    prev === "latest" ? "popular" : "latest",
                  )
                }
              >
                <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--mc-text-muted)]">
                  排序
                </span>
                <span className="ml-2 font-semibold text-[var(--mc-text)]">
                  {sortLabel}
                </span>
              </button>
              <button
                type="button"
                className="rounded-full border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/70 px-4 py-2 text-xs text-[var(--mc-text)] transition hover:border-slate-700 hover:bg-[var(--mc-surface-strong)]/90"
                onClick={() =>
                  setFilterMode((prev) => {
                    if (prev === "all") return "open";
                    if (prev === "open") return "locked";
                    return "all";
                  })
                }
              >
                <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--mc-text-muted)]">
                  篩選
                </span>
                <span className="ml-2 font-semibold text-[var(--mc-text)]">
                  {filterLabel}
                </span>
              </button>
              <button
                type="button"
                className="rounded-full border border-[var(--mc-accent-2)]/40 bg-[var(--mc-accent-2)]/10 px-4 py-2 text-xs text-emerald-200 transition hover:border-emerald-400/70 hover:bg-emerald-500/20"
                onClick={() =>
                  setStatusMode((prev) =>
                    prev === "online" ? "quiet" : "online",
                  )
                }
              >
                <span className="text-[10px] uppercase tracking-[0.2em] text-emerald-300/80">
                  狀態
                </span>
                <span className="ml-2 font-semibold">{statusLabel}</span>
              </button>
            </div>
          </div>

          <div className="relative rounded-3xl border border-[var(--mc-border)] bg-gradient-to-br from-[var(--mc-bg)] via-[var(--mc-bg)] to-[var(--mc-surface)] p-1 shadow-[0_24px_60px_-32px_rgba(15,23,42,0.9)]">
            <div className="absolute inset-0 rounded-3xl border border-white/5" />
            <div className="relative space-y-3 rounded-[22px] bg-[var(--mc-surface)]/70 p-4">
              {rooms.length === 0 ? (
                <div className="flex min-h-56 flex-col items-center justify-center gap-4 text-center text-[var(--mc-text-muted)]">
                  <div className="flex items-end gap-1">
                    {Array.from({ length: 8 }).map((_, index) => (
                      <span
                        key={index}
                        className="h-6 w-1.5 rounded-full bg-[var(--mc-surface-strong)]/70"
                        style={{
                          animationDelay: `${index * 120}ms`,
                          animation: "room-eq 1.6s ease-in-out infinite",
                        }}
                      />
                    ))}
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-[var(--mc-text)]">
                      目前沒有房間
                    </div>
                    <div className="text-sm text-[var(--mc-text-muted)]">
                      建立一個新的房間，或稍後再回來看看。
                    </div>
                  </div>
                </div>
              ) : (
                rooms.map((room, index) => {
                  const isCurrent = currentRoomId === room.id;
                  const isFull = Boolean(
                    room.maxPlayers && room.playerCount >= room.maxPlayers,
                  );
                  const isPlayingRoom = isRoomCurrentlyPlaying(room);
                  return (
                    <div
                      key={room.id}
                      className={`group relative overflow-hidden rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface)]/80 px-4 py-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-700 hover:bg-[var(--mc-surface-strong)]/80 ${
                        isCurrent ? "ring-1 ring-sky-400/60" : ""
                      }`}
                      style={{ animationDelay: `${index * 80}ms` }}
                    >
                      <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                        <div className="absolute -left-16 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-[var(--mc-accent)]/10 blur-2xl" />
                        <div className="absolute -right-16 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-[var(--mc-accent-2)]/10 blur-2xl" />
                      </div>

                      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-semibold text-[var(--mc-text)]">
                              {room.name}
                            </h3>
                            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-200">
                              題數 {room.gameSettings?.questionCount ?? "-"}
                            </span>
                            {isCurrent && (
                              <span className="rounded-full border border-sky-400/60 bg-sky-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-200">
                                目前房間
                              </span>
                            )}
                            {isPlayingRoom && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/45 bg-amber-300/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-100">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-300 shadow-[0_0_8px_rgba(252,211,77,0.9)] animate-pulse" />
                                遊玩中
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--mc-text-muted)]">
                            <span>
                              玩家 {room.playerCount}
                              {room.maxPlayers ? `/${room.maxPlayers}` : ""}
                            </span>
                            <span>播放清單 {room.playlistCount}</span>
                            <span>
                              建立{" "}
                              {new Date(room.createdAt).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {isFull && (
                            <span className="rounded-full border border-rose-400/40 bg-rose-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-200">
                              已滿
                            </span>
                          )}
                          <button
                            onClick={() => {
                              void handleJoinRoomClick(room, isPlayingRoom);
                            }}
                            disabled={!username || isFull || joinProbeRoomId === room.id}
                            className="inline-flex items-center gap-2 rounded-full border border-[var(--mc-accent)]/60 bg-[var(--mc-accent)]/30 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--mc-text)] transition hover:border-[var(--mc-accent)] hover:bg-[var(--mc-accent)]/40 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {joinProbeRoomId === room.id ? "確認中..." : "進入"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <style>
            {`
              @keyframes room-eq {
                0%, 100% { transform: scaleY(0.4); opacity: 0.4; }
                50% { transform: scaleY(1); opacity: 0.9; }
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
              <Typography variant="body2" sx={{ mb: 1.5, color: "text.secondary" }}>
                {joinConfirmDialog
                  ? `房間「${joinConfirmDialog.roomName}」目前已開始遊戲。加入後會從目前進度開始參與。`
                  : ""}
              </Typography>
              {joinConfirmDialog && (
                <div className="space-y-1">
                  <Typography variant="caption" sx={{ display: "block", color: "text.secondary" }}>
                    玩家 {joinConfirmDialog.playerCount}
                    {joinConfirmDialog.maxPlayers
                      ? `/${joinConfirmDialog.maxPlayers}`
                      : ""}
                    {typeof joinConfirmDialog.questionCount === "number"
                      ? ` · 本局題數 ${joinConfirmDialog.questionCount}`
                      : ""}
                  </Typography>
                  {(typeof joinConfirmDialog.currentQuestionNo === "number" ||
                    typeof joinConfirmDialog.completedQuestionCount === "number") && (
                    <Typography variant="caption" sx={{ display: "block", color: "warning.main" }}>
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
              <Button variant="contained" color="warning" onClick={handleConfirmJoinInProgress}>
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
            <DialogTitle>輸入房間密碼</DialogTitle>
            <DialogContent>
              <Typography
                variant="body2"
                sx={{ mb: 1.5, color: "text.secondary" }}
              >
                {passwordDialog
                  ? `房間「${passwordDialog.roomName}」需要密碼才能加入。`
                  : ""}
              </Typography>
              <TextField
                autoFocus
                fullWidth
                size="small"
                label="房間密碼"
                value={passwordDraft}
                onChange={(e) => {
                  const next = e.target.value;
                  if (!/^[a-zA-Z0-9]*$/.test(next)) return;
                  setPasswordDraft(next);
                }}
                inputProps={{
                  inputMode: "text",
                  pattern: "[A-Za-z0-9]*",
                }}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={closePasswordDialog}>取消</Button>
              <Button
                variant="contained"
                onClick={handleConfirmJoinWithPassword}
                disabled={!passwordDraft.trim()}
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
