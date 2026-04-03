import { Alert, Box, Button, Chip, TextField } from "@mui/material";
import {
  AccessTimeRounded,
  AlbumRounded,
  ContentCutRounded,
  Groups2Rounded,
  LibraryMusicRounded,
  MusicNoteRounded,
  ScheduleRounded,
} from "@mui/icons-material";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { USERNAME_MAX } from "../../Room/model/roomConstants";
import type { RoomSummary } from "../../Room/model/types";
import { useRoom } from "../../Room/model/useRoom";

const TEXT = {
  invalidInviteLink: "找不到邀請資訊，請確認連結是否正確。",
  checkingInviteRoom: "正在確認邀請房間...",
  inviteRoomMissing: "找不到邀請房間，可能已關閉或邀請失效。",
  inviteTitlePrefix: "你受邀加入",
  roomReady: "房間已準備完成",
  players: "目前玩家",
  questions: "題目數",
  identityTitle: "先設定你的顯示名稱",
  identityDesc:
    "你可以先用訪客名稱加入，也可以直接使用 Google 帳號登入。進房後其他玩家會看到這個名稱。",
  guestLabel: "訪客名稱",
  guestPlaceholder: "例如 Night DJ",
  guestAction: "使用訪客加入",
  or: "或",
  googleAction: "使用 Google 登入",
  joinNow: "加入房間",
  currentIdentity: "目前身分",
  passwordLabel: "房間密碼",
  passwordPlaceholder: "請輸入房間密碼",
  playlistCount: "曲數",
  answerTime: "作答時間",
  startOffset: "起始時間",
  collectionClipTitle: "沿用收藏庫片段",
  collectionClipDesc:
    "若歌曲本身已有收藏庫片段設定，這個房間會優先沿用每首歌曲各自的起訖時間。",
  noCover: "這個題庫目前沒有封面曲資訊",
};

const formatSeconds = (value?: number) =>
  typeof value === "number" && Number.isFinite(value) ? `${value}s` : "-";

const resolvePlaylistCover = (room: RoomSummary | null) => {
  if (!room) return null;
  if (room.playlistCoverThumbnailUrl) return room.playlistCoverThumbnailUrl;
  if (room.playlistCoverSourceId) {
    return `https://i.ytimg.com/vi/${room.playlistCoverSourceId}/hqdefault.jpg`;
  }
  return null;
};

const InvitedPage: React.FC = () => {
  const { roomId: inviteReference } = useParams<{ roomId?: string }>();
  const navigate = useNavigate();
  const {
    authLoading,
    authUser,
    loginWithGoogle,
    username,
    usernameInput,
    rooms,
    currentRoom,
    joinPasswordInput,
    inviteNotFound,
    setUsernameInput,
    setJoinPasswordInput,
    setInviteRoomId,
    setStatusText,
    fetchRoomById,
    handleJoinRoom,
    handleSetUsername,
  } = useRoom();

  const [inviteRoomApi, setInviteRoomApi] = useState<{
    roomReference: string;
    room: RoomSummary | null;
  } | null>(null);

  useEffect(() => {
    setInviteRoomId(inviteReference ?? null);
    return () => setInviteRoomId(null);
  }, [inviteReference, setInviteRoomId]);

  useEffect(() => {
    let active = true;
    if (!inviteReference) return;
    void fetchRoomById(inviteReference).then((room) => {
      if (!active) return;
      setInviteRoomApi({ roomReference: inviteReference, room });
      if (room) {
        setStatusText(null);
      }
    });
    return () => {
      active = false;
    };
  }, [fetchRoomById, inviteReference, setStatusText]);

  useEffect(() => {
    if (currentRoom?.id) {
      navigate(`/rooms/${currentRoom.id}`, { replace: true });
    }
  }, [currentRoom?.id, navigate]);

  const inviteRoom = useMemo(() => {
    const apiRoom =
      inviteRoomApi && inviteRoomApi.roomReference === inviteReference
        ? inviteRoomApi.room
        : null;
    if (apiRoom) return apiRoom;
    if (!inviteReference) return null;
    return (
      rooms.find(
        (room) => room.id === inviteReference || room.roomCode === inviteReference,
      ) ?? null
    );
  }, [inviteReference, inviteRoomApi, rooms]);

  const hasDirectInviteLookup =
    inviteRoomApi?.roomReference === inviteReference;
  const hasIdentity = Boolean(username || authUser);
  const isRoomChecking = Boolean(inviteReference) && !hasDirectInviteLookup;
  const roomMissing = Boolean(inviteReference) &&
    !isRoomChecking &&
    (hasDirectInviteLookup ? !inviteRoomApi?.room : inviteNotFound && !inviteRoom);
  const identityLabel = authUser?.display_name || username || "Guest";
  const playlistTitle =
    inviteRoom?.playlistTitle?.trim() || `題庫 ${inviteRoom?.playlistCount ?? "-"} 首`;
  const playlistCoverTitle = inviteRoom?.playlistCoverTitle?.trim() || null;
  const playlistCoverUrl = resolvePlaylistCover(inviteRoom);
  const usesCollectionClipTiming = Boolean(
    inviteRoom?.gameSettings?.allowCollectionClipTiming &&
      (inviteRoom?.playlistSourceType === "public_collection" ||
        inviteRoom?.playlistSourceType === "private_collection"),
  );

  if (!inviteReference) {
    return (
      <div className="flex min-h-[calc(100dvh-210px)] w-full items-start justify-center">
        <Box className="w-full max-w-2xl">
          <Alert severity="error" variant="outlined">
            {TEXT.invalidInviteLink}
          </Alert>
        </Box>
      </div>
    );
  }

  if (isRoomChecking) {
    return (
      <div className="flex min-h-[calc(100dvh-210px)] w-full items-start justify-center">
        <Box className="w-full max-w-2xl">
          <Alert severity="info" variant="outlined">
            {TEXT.checkingInviteRoom}
          </Alert>
        </Box>
      </div>
    );
  }

  if (roomMissing || !inviteRoom) {
    return (
      <div className="flex min-h-[calc(100dvh-210px)] w-full items-start justify-center">
        <Box className="w-full max-w-2xl">
          <Alert severity="error" variant="outlined">
            {TEXT.inviteRoomMissing}
          </Alert>
        </Box>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-[calc(100dvh-210px)] w-full justify-center overflow-hidden">
      <div className="w-full max-w-6xl px-4 py-4 sm:px-6">
        <section className="relative overflow-hidden rounded-[2rem] border border-[var(--mc-border)] bg-[linear-gradient(180deg,rgba(13,18,29,0.86),rgba(11,15,24,0.92))] p-5 shadow-[0_32px_120px_-60px_rgba(245,158,11,0.42)] sm:p-6 lg:p-7">
          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)] lg:gap-0">
            <div className="min-w-0 lg:pr-8">
              <header className="min-w-0">
                <h2 className="text-[clamp(1.7rem,3.4vw,2.45rem)] font-semibold leading-tight text-[var(--mc-text)]">
                  {TEXT.inviteTitlePrefix}
                  <span className="mt-1 block break-words text-[var(--mc-accent)]">
                    {inviteRoom.name}
                  </span>
                </h2>
                <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[11px] text-emerald-200">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" />
                  {TEXT.roomReady}
                </div>
              </header>

              <div className="mt-6 grid gap-5">
                <div className="grid items-start gap-5 rounded-[1.65rem] bg-white/[0.035] p-3 ring-1 ring-white/8 sm:p-4 md:grid-cols-[minmax(220px,0.84fr)_minmax(0,1.16fr)]">
                  <div className="overflow-hidden rounded-[1.25rem] bg-[linear-gradient(180deg,rgba(24,32,46,0.86),rgba(13,18,29,0.96))] shadow-[0_18px_45px_-28px_rgba(0,0,0,0.62)]">
                    {playlistCoverUrl ? (
                      <img
                        src={playlistCoverUrl}
                        alt={playlistCoverTitle ?? playlistTitle}
                        className="aspect-[1/1] min-h-[220px] w-full object-cover"
                      />
                    ) : (
                      <div className="flex min-h-[220px] w-full flex-col items-center justify-center gap-3 px-5 text-center">
                        <AlbumRounded sx={{ fontSize: 42, color: "rgba(250,204,21,0.9)" }} />
                        <div className="text-sm font-semibold text-[var(--mc-text)]">
                          {playlistTitle}
                        </div>
                        <div className="text-xs text-[var(--mc-text-muted)]">
                          {TEXT.noCover}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="mt-3 text-[1.35rem] font-semibold leading-tight text-[var(--mc-text)] sm:text-[1.55rem]">
                          {playlistTitle}
                        </div>
                        <div className="mt-2 text-sm text-[var(--mc-text-muted)]">
                          {playlistCoverTitle ?? "-"}
                        </div>
                      </div>
                      <Chip
                        size="small"
                        icon={<LibraryMusicRounded sx={{ fontSize: "16px !important" }} />}
                        label={`${TEXT.playlistCount} ${inviteRoom.playlistCount}`}
                        sx={{
                          flexShrink: 0,
                          color: "var(--mc-text)",
                          borderColor: "rgba(148, 163, 184, 0.22)",
                          backgroundColor: "rgba(15, 23, 42, 0.46)",
                        }}
                        variant="outlined"
                      />
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl bg-white/[0.03] px-4 py-3 ring-1 ring-white/6">
                        <div className="flex items-center gap-2 text-[var(--mc-text-muted)]">
                          <AccessTimeRounded sx={{ fontSize: 18 }} />
                          <span className="text-xs">{TEXT.answerTime}</span>
                        </div>
                        <div className="mt-2 text-[1.15rem] font-semibold text-[var(--mc-text)] sm:text-[1.25rem]">
                          {formatSeconds(inviteRoom.gameSettings?.playDurationSec)}
                        </div>
                      </div>
                      <div className="rounded-2xl bg-white/[0.03] px-4 py-3 ring-1 ring-white/6">
                        <div className="flex items-center gap-2 text-[var(--mc-text-muted)]">
                          <ScheduleRounded sx={{ fontSize: 18 }} />
                          <span className="text-xs">{TEXT.startOffset}</span>
                        </div>
                        <div className="mt-2 text-[1.15rem] font-semibold text-[var(--mc-text)] sm:text-[1.25rem]">
                          {formatSeconds(inviteRoom.gameSettings?.startOffsetSec)}
                        </div>
                      </div>
                    </div>

                    {usesCollectionClipTiming ? (
                      <div className="mt-4 rounded-2xl bg-amber-400/8 px-4 py-3 text-sm text-amber-100 ring-1 ring-amber-300/15">
                        <div className="flex items-center gap-2 font-medium">
                          <ContentCutRounded sx={{ fontSize: 18 }} />
                          <span>{TEXT.collectionClipTitle}</span>
                        </div>
                        <p className="mt-2 text-xs leading-5 text-amber-50/85">
                          {TEXT.collectionClipDesc}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-white/[0.03] px-4 py-3 ring-1 ring-white/8">
                    <div className="flex items-center gap-2 text-[var(--mc-text-muted)]">
                      <Groups2Rounded sx={{ fontSize: 18 }} />
                      <span className="text-xs">{TEXT.players}</span>
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-[var(--mc-text)]">
                      {inviteRoom.playerCount}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white/[0.03] px-4 py-3 ring-1 ring-white/8">
                    <div className="flex items-center gap-2 text-[var(--mc-text-muted)]">
                      <MusicNoteRounded sx={{ fontSize: 18 }} />
                      <span className="text-xs">{TEXT.questions}</span>
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-[var(--mc-text)]">
                      {inviteRoom.gameSettings?.questionCount ?? "-"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:border-l lg:border-white/8 lg:pl-8">
              <div className="rounded-[1.5rem] bg-white/[0.04] p-4 ring-1 ring-white/8 sm:p-5">
                {!hasIdentity ? (
                  <div className="grid gap-4">
                    <div>
                      <h3 className="text-xl font-semibold text-[var(--mc-text)]">
                        {TEXT.identityTitle}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-[var(--mc-text-muted)]">
                        {TEXT.identityDesc}
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                      <div>
                        <div className="mb-2 text-[11px] uppercase tracking-[0.2em] text-[var(--mc-text-muted)]">
                          {TEXT.guestLabel}
                        </div>
                        <TextField
                          size="small"
                          fullWidth
                          value={usernameInput}
                          onChange={(event) =>
                            setUsernameInput(event.target.value.slice(0, USERNAME_MAX))
                          }
                          placeholder={TEXT.guestPlaceholder}
                          inputProps={{ maxLength: USERNAME_MAX }}
                        />
                      </div>
                      <Button
                        variant="outlined"
                        onClick={handleSetUsername}
                        sx={{
                          borderColor: "rgba(245, 158, 11, 0.4)",
                          color: "var(--mc-text)",
                          minHeight: 40,
                          "&:hover": {
                            borderColor: "rgba(245, 158, 11, 0.7)",
                            backgroundColor: "rgba(245, 158, 11, 0.08)",
                          },
                        }}
                      >
                        {TEXT.guestAction}
                      </Button>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-[var(--mc-text-muted)]">
                      <div className="h-px flex-1 bg-white/8" />
                      <span>{TEXT.or}</span>
                      <div className="h-px flex-1 bg-white/8" />
                    </div>

                    <Button
                      variant="contained"
                      onClick={loginWithGoogle}
                      disabled={authLoading}
                      sx={{
                        background:
                          "linear-gradient(90deg, rgba(56,189,248,0.9), rgba(245,158,11,0.9))",
                        color: "#0b0a08",
                        fontWeight: 700,
                        minHeight: 46,
                        boxShadow: "0 10px 24px rgba(56,189,248,0.25)",
                        "&:hover": {
                          background:
                            "linear-gradient(90deg, rgba(56,189,248,1), rgba(245,158,11,1))",
                        },
                      }}
                    >
                      {TEXT.googleAction}
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    <div>
                      <h3 className="text-xl font-semibold text-[var(--mc-text)]">
                        {TEXT.joinNow}
                      </h3>
                      <div className="mt-3 rounded-xl bg-white/[0.03] px-3 py-2 text-sm text-[var(--mc-text)] ring-1 ring-white/8">
                        <span className="mr-2 text-[var(--mc-text-muted)]">
                          {TEXT.currentIdentity}
                        </span>
                        <span className="font-semibold">{identityLabel}</span>
                      </div>
                    </div>

                    {inviteRoom.hasPassword ? (
                      <TextField
                        size="small"
                        value={joinPasswordInput}
                        label={TEXT.passwordLabel}
                        placeholder={TEXT.passwordPlaceholder}
                        onChange={(event) => {
                          const next = event.target.value;
                          if (!/^[a-zA-Z0-9]*$/.test(next)) return;
                          setJoinPasswordInput(next);
                        }}
                        inputProps={{ inputMode: "text", pattern: "[A-Za-z0-9]*" }}
                      />
                    ) : null}

                    <Button
                      variant="contained"
                      onClick={() =>
                        handleJoinRoom(
                          inviteRoom.roomCode || inviteRoom.id,
                          inviteRoom.hasPassword,
                        )
                      }
                      sx={{
                        background:
                          "linear-gradient(90deg, rgba(245,158,11,0.95), rgba(234,179,8,0.95))",
                        color: "#0b0a08",
                        fontWeight: 700,
                        minHeight: 46,
                        boxShadow: "0 12px 26px rgba(245,158,11,0.24)",
                        "&:hover": {
                          background:
                            "linear-gradient(90deg, rgba(245,158,11,1), rgba(234,179,8,1))",
                        },
                      }}
                    >
                      {TEXT.joinNow}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default InvitedPage;
