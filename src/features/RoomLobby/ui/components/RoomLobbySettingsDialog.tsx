import React from "react";
import {
  Box,
  Button,
  ClickAwayListener,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Popper,
  Slider,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import AddRounded from "@mui/icons-material/AddRounded";
import ChairRoundedIcon from "@mui/icons-material/ChairRounded";
import ContentCutRoundedIcon from "@mui/icons-material/ContentCutRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import FastForwardRounded from "@mui/icons-material/FastForwardRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import HourglassTopRounded from "@mui/icons-material/HourglassTopRounded";
import KeyboardArrowDownRounded from "@mui/icons-material/KeyboardArrowDownRounded";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import MeetingRoomRoundedIcon from "@mui/icons-material/MeetingRoomRounded";
import PinOutlinedIcon from "@mui/icons-material/PinOutlined";
import PublicOutlinedIcon from "@mui/icons-material/PublicOutlined";
import QuizRoundedIcon from "@mui/icons-material/QuizRounded";
import RemoveRounded from "@mui/icons-material/RemoveRounded";
import TimerRoundedIcon from "@mui/icons-material/TimerRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import VideogameAssetRoundedIcon from "@mui/icons-material/VideogameAssetRounded";
import {
  PLAYER_MAX,
  PLAYER_MIN,
  PLAY_DURATION_MAX,
  PLAY_DURATION_MIN,
  QUESTION_MAX,
  QUESTION_STEP,
  REVEAL_DURATION_MAX,
  REVEAL_DURATION_MIN,
  START_OFFSET_MAX,
  START_OFFSET_MIN,
} from "@domain/room/constants";
import type { PlaybackExtensionMode } from "@features/RoomSession";
import { AnimatePresence, motion } from "motion/react";

type RoomPlayMode = "casual" | "leaderboard";
type LeaderboardVariantKey = "30q" | "50q" | "15m";

interface RoomLobbySettingsDialogProps {
  open: boolean;
  settingsDisabled: boolean;
  settingsSaving: boolean;
  roomPlayMode: RoomPlayMode;
  onRoomPlayModeChange: (value: RoomPlayMode) => void;
  leaderboardVariant: LeaderboardVariantKey;
  onLeaderboardVariantChange: (value: LeaderboardVariantKey) => void;
  settingsName: string;
  onSettingsNameChange: (value: string) => void;
  settingsVisibility: "public" | "private";
  settingsPassword: string;
  onSettingsVisibilityChange: (nextVisibility: "public" | "private") => void;
  onSettingsPasswordChange: (value: string) => void;
  onSettingsPasswordClear: () => void;
  settingsMaxPlayers: string;
  onSettingsMaxPlayersChange: (value: string) => void;
  settingsQuestionCount: number;
  questionMinLimit: number;
  questionMaxLimit: number;
  onSettingsQuestionCountChange: (value: number) => void;
  settingsRevealDurationSec: number;
  onSettingsRevealDurationSecChange: (value: number) => void;
  settingsUseCollectionSource: boolean;
  settingsAllowCollectionClipTiming: boolean;
  onSettingsAllowCollectionClipTimingChange: (value: boolean) => void;
  settingsPlaybackExtensionMode: PlaybackExtensionMode;
  onSettingsPlaybackExtensionModeChange: (value: PlaybackExtensionMode) => void;
  settingsPlayDurationSec: number;
  onSettingsPlayDurationSecChange: (value: number) => void;
  settingsStartOffsetSec: number;
  onSettingsStartOffsetSecChange: (value: number) => void;
  canUseLeaderboard30: boolean;
  canUseLeaderboard50: boolean;
  canUseLeaderboard15m: boolean;
  leaderboardQuestionHelpText: string | null;
  settingsError: string | null;
  onClose: () => void;
  onSave: () => void;
}

type SectionProps = {
  title: string;
  icon: React.ReactNode;
  headerAside?: React.ReactNode;
  hideHeader?: boolean;
  locked?: boolean;
  lockedReason?: string;
  children: React.ReactNode;
};

const drawerFieldSx = {
  "& .MuiInputBase-root": {
    color: "#f8fafc",
  },
  "& .MuiInputBase-input": {
    fontSize: "0.95rem",
    fontWeight: 600,
    paddingBottom: "6px",
  },
  "& .MuiInputLabel-root": {
    color: "rgba(148,163,184,0.82)",
  },
  "& .MuiInputLabel-root.Mui-focused": {
    color: "rgba(125,211,252,0.95)",
  },
  "& .MuiInput-underline:before": {
    borderBottomColor: "rgba(148,163,184,0.24)",
  },
  "& .MuiInput-underline:hover:not(.Mui-disabled):before": {
    borderBottomColor: "rgba(125,211,252,0.38)",
  },
  "& .MuiInput-underline:after": {
    borderBottomColor: "rgba(56,189,248,0.72)",
  },
} as const;

const statCardClassName =
  "rounded-2xl border border-white/8 bg-white/[0.035] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";

const controlSliderSx = {
  color: "#7dd3fc",
  height: 4,
  px: 0,
  "& .MuiSlider-rail": {
    opacity: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  "& .MuiSlider-track": {
    border: 0,
    background:
      "linear-gradient(90deg, rgba(125,211,252,0.88), rgba(52,211,153,0.78))",
  },
  "& .MuiSlider-thumb": {
    width: 16,
    height: 16,
    backgroundColor: "#f8fafc",
    border: "2px solid rgba(125,211,252,0.9)",
    boxShadow: "0 10px 24px -18px rgba(56,189,248,0.95)",
    "&:hover, &.Mui-focusVisible": {
      boxShadow: "0 0 0 6px rgba(125,211,252,0.14)",
    },
    "&.Mui-active": {
      boxShadow: "0 0 0 8px rgba(125,211,252,0.18)",
    },
  },
  "& .MuiSlider-mark": {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.18)",
    top: "50%",
    transform: "translate(-50%, -50%)",
  },
  "& .MuiSlider-markActive": {
    backgroundColor: "rgba(125,211,252,0.78)",
  },
  "& .MuiSlider-markLabel": {
    top: 24,
    color: "rgba(148,163,184,0.82)",
    fontSize: "0.7rem",
    fontWeight: 600,
  },
  "& .Mui-disabled": {
    opacity: 0.45,
  },
} as const;

const Section = ({
  title,
  icon,
  headerAside,
  hideHeader = false,
  locked = false,
  lockedReason = "排行挑戰模式下，這個區塊無法在 lobby 修改。",
  children,
}: SectionProps) => (
  <Box className="relative py-3 sm:py-4">
    {!hideHeader ? (
      <div className="mb-3 flex flex-col gap-2 sm:mb-4 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="flex items-center gap-3">
          <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/5 text-slate-100 sm:h-10 sm:w-10">
            {icon}
          </div>
          <Typography variant="subtitle1" className="font-semibold text-slate-50">
            {title}
          </Typography>
        </div>
        {headerAside ? <div className="min-w-0">{headerAside}</div> : null}
      </div>
    ) : null}

    <div className={locked ? "opacity-50" : ""}>{children}</div>

    {locked ? (
      <div
        aria-hidden="true"
        className="pointer-events-auto absolute inset-0 z-20 flex cursor-not-allowed items-start justify-start rounded-3xl bg-slate-950/54 px-4 pt-14 backdrop-blur-[2px]"
      >
        <div className="inline-flex w-full items-center gap-3 rounded-2xl border border-amber-200/24 bg-amber-300/12 px-4 py-3 text-amber-50 shadow-[0_18px_34px_-28px_rgba(251,191,36,0.72)]">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-amber-100/24 bg-amber-200/14">
            <LockOutlinedIcon sx={{ fontSize: 18 }} />
          </span>
          <span className="min-w-0 text-sm font-semibold">{lockedReason}</span>
        </div>
      </div>
    ) : null}
  </Box>
);

const challengeOptions: Array<{
  key: LeaderboardVariantKey;
  label: string;
  summary: string;
}> = [
  { key: "30q", label: "30 題", summary: "固定 30 題" },
  { key: "50q", label: "50 題", summary: "固定 50 題" },
  { key: "15m", label: "15 分鐘", summary: "限時模式" },
];

const playbackExtensionOptions: Array<{
  key: PlaybackExtensionMode;
  label: string;
}> = [
  { key: "manual_vote", label: "投票延長" },
  { key: "auto_once", label: "自動延長一次" },
  { key: "disabled", label: "不開放延長" },
];

const RoomLobbySettingsDialog: React.FC<RoomLobbySettingsDialogProps> = ({
  open,
  settingsDisabled,
  settingsSaving,
  roomPlayMode,
  onRoomPlayModeChange,
  leaderboardVariant,
  onLeaderboardVariantChange,
  settingsName,
  onSettingsNameChange,
  settingsVisibility,
  settingsPassword,
  onSettingsVisibilityChange,
  onSettingsPasswordChange,
  onSettingsPasswordClear,
  settingsMaxPlayers,
  onSettingsMaxPlayersChange,
  settingsQuestionCount,
  questionMinLimit,
  questionMaxLimit,
  onSettingsQuestionCountChange,
  settingsRevealDurationSec,
  onSettingsRevealDurationSecChange,
  settingsUseCollectionSource,
  settingsAllowCollectionClipTiming,
  onSettingsAllowCollectionClipTimingChange,
  settingsPlaybackExtensionMode,
  onSettingsPlaybackExtensionModeChange,
  settingsPlayDurationSec,
  onSettingsPlayDurationSecChange,
  settingsStartOffsetSec,
  onSettingsStartOffsetSecChange,
  canUseLeaderboard30,
  canUseLeaderboard50,
  canUseLeaderboard15m,
  settingsError,
  onClose,
  onSave,
}) => {
  const isMobileDialog = useMediaQuery("(max-width:900px)");
  const settingsLocked = settingsDisabled || settingsSaving;
  const isLeaderboardRoom = roomPlayMode === "leaderboard";
  const canUseCollectionTiming = settingsUseCollectionSource;
  const useCollectionTimingForSettings =
    settingsAllowCollectionClipTiming && canUseCollectionTiming;
  const challengeQuestionSummary =
    challengeOptions.find((option) => option.key === leaderboardVariant)?.label ??
    "30 題";
  const parsedMaxPlayers = settingsMaxPlayers.trim()
    ? Number(settingsMaxPlayers)
    : PLAYER_MIN;
  const effectiveMaxPlayers = Number.isFinite(parsedMaxPlayers)
    ? Math.min(PLAYER_MAX, Math.max(PLAYER_MIN, Math.floor(parsedMaxPlayers)))
    : PLAYER_MIN;
  const canDecreaseMaxPlayers = effectiveMaxPlayers > PLAYER_MIN;
  const canIncreaseMaxPlayers = effectiveMaxPlayers < PLAYER_MAX;
  const canDecreaseQuestionCount = settingsQuestionCount > questionMinLimit;
  const canIncreaseQuestionCount = settingsQuestionCount < questionMaxLimit;
  const canEditPin = !settingsLocked;
  const isPrivateRoom = settingsVisibility === "private";
  const pinEnabled = settingsPassword.trim().length > 0;
  const isTimeAttackLeaderboard = isLeaderboardRoom && leaderboardVariant === "15m";
  const [leaderboardMenuOpen, setLeaderboardMenuOpen] = React.useState(false);
  const [leaderboardAnchorEl, setLeaderboardAnchorEl] =
    React.useState<HTMLDivElement | null>(null);
  const leaderboardMenuRef = React.useRef<HTMLDivElement | null>(null);
  const leaderboardMenuWidth = leaderboardAnchorEl?.offsetWidth;
  const handleLeaderboardAnchorRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      setLeaderboardAnchorEl((current) => (current === node ? current : node));
    },
    [],
  );
  const activeChallengeOption =
    challengeOptions.find((option) => option.key === leaderboardVariant) ??
    challengeOptions[0];
  const getNextAvailableLeaderboardVariant = React.useCallback((): LeaderboardVariantKey => {
    if (leaderboardVariant === "30q" && canUseLeaderboard30) return "30q";
    if (leaderboardVariant === "50q" && canUseLeaderboard50) return "50q";
    if (leaderboardVariant === "15m" && canUseLeaderboard15m) return "15m";
    if (canUseLeaderboard30) return "30q";
    if (canUseLeaderboard50) return "50q";
    if (canUseLeaderboard15m) return "15m";
    return leaderboardVariant;
  }, [
    canUseLeaderboard15m,
    canUseLeaderboard30,
    canUseLeaderboard50,
    leaderboardVariant,
  ]);
  const displayedMaxPlayers = isTimeAttackLeaderboard ? 1 : effectiveMaxPlayers;
  const isMaxPlayersLocked = settingsLocked || isTimeAttackLeaderboard;
  const isQuestionSettingsLocked = settingsLocked || isLeaderboardRoom;
  const playDurationMarks = React.useMemo(
    () => [
      { value: PLAY_DURATION_MIN, label: `${PLAY_DURATION_MIN}s` },
      { value: 30, label: "30s" },
      { value: 60, label: "60s" },
      { value: PLAY_DURATION_MAX, label: `${PLAY_DURATION_MAX}s` },
    ],
    [],
  );
  const startOffsetMarks = React.useMemo(
    () => [
      { value: START_OFFSET_MIN, label: "0s" },
      { value: 60, label: "1m" },
      { value: 180, label: "3m" },
      { value: START_OFFSET_MAX, label: "10m" },
    ],
    [],
  );
  const revealDurationMarks = React.useMemo(
    () => [
      { value: REVEAL_DURATION_MIN, label: `${REVEAL_DURATION_MIN}s` },
      { value: 5, label: "5s" },
      { value: 10, label: "10s" },
      { value: REVEAL_DURATION_MAX, label: `${REVEAL_DURATION_MAX}s` },
    ],
    [],
  );

  const leaderboardQuestionLockedOverlay = isLeaderboardRoom ? (
    <div
      aria-hidden="true"
      className="pointer-events-auto absolute inset-0 z-20 flex cursor-not-allowed items-center justify-center rounded-2xl border border-amber-200/18 bg-slate-950/62 px-4 backdrop-blur-[2px]"
    >
      <div className="inline-flex items-center gap-3 rounded-2xl border border-amber-200/24 bg-amber-300/12 px-4 py-3 text-amber-50 shadow-[0_18px_34px_-28px_rgba(251,191,36,0.72)]">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-100/24 bg-amber-200/14">
          <LockOutlinedIcon sx={{ fontSize: 18 }} />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold">僅休閒派對可調整</span>
          <span className="mt-0.5 block text-xs text-amber-100/72">
            排行挑戰使用固定規格
          </span>
        </span>
      </div>
    </div>
  ) : null;

  const timeAttackPlayersLockedOverlay = isTimeAttackLeaderboard ? (
    <div
      aria-hidden="true"
      className="pointer-events-auto absolute inset-0 z-20 flex cursor-not-allowed items-center justify-center rounded-2xl border border-cyan-200/16 bg-slate-950/62 px-4 backdrop-blur-[2px]"
    >
      <div className="inline-flex items-center gap-3 rounded-2xl border border-cyan-200/22 bg-cyan-300/12 px-4 py-3 text-cyan-50 shadow-[0_18px_34px_-28px_rgba(34,211,238,0.72)]">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-100/22 bg-cyan-200/14">
          <LockOutlinedIcon sx={{ fontSize: 18 }} />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold">限時挑戰固定 1 人</span>
          <span className="mt-0.5 block text-xs text-cyan-100/72">
            不會變更休閒派對的人數設定
          </span>
        </span>
      </div>
    </div>
  ) : null;

  const handleDialogClose = () => {
    if (settingsSaving) return;
    onClose();
  };

  React.useEffect(() => {
    if (!open) {
      setLeaderboardMenuOpen(false);
    }
  }, [open]);

  React.useEffect(() => {
    if (!settingsSaving) return;
    setLeaderboardMenuOpen(false);
  }, [settingsSaving]);

  React.useEffect(() => {
    if (roomPlayMode !== "leaderboard") {
      setLeaderboardMenuOpen(false);
    }
  }, [roomPlayMode]);

  React.useEffect(() => {
    if (!leaderboardMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (leaderboardAnchorEl?.contains(target)) return;
      if (leaderboardMenuRef.current?.contains(target)) return;
      setLeaderboardMenuOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [leaderboardMenuOpen, leaderboardAnchorEl]);

  const questionPresetButtons = [10, 20, 30, 50].filter(
    (count) => count >= questionMinLimit && count <= questionMaxLimit,
  );

  return (
    <Dialog
      open={open}
      onClose={handleDialogClose}
      fullScreen={isMobileDialog}
      fullWidth
      maxWidth="lg"
      sx={{ zIndex: 1505 }}
      PaperProps={{
        className: "room-lobby-settings-dialog",
        sx: {
          borderRadius: isMobileDialog ? 0 : 4,
          border: "1px solid rgba(245,158,11,0.18)",
          background:
            "radial-gradient(720px 320px at 0% 0%, rgba(245,158,11,0.14), transparent 62%), radial-gradient(560px 280px at 100% 0%, rgba(34,211,238,0.14), transparent 64%), linear-gradient(180deg, rgba(6,10,16,0.985), rgba(3,6,11,0.985))",
          boxShadow:
            "0 34px 90px -48px rgba(0,0,0,0.92), 0 0 0 1px rgba(255,255,255,0.03)",
        },
      }}
    >
      <DialogTitle
        sx={{
          px: { xs: 2, sm: 3 },
          pt: { xs: 1.5, sm: 2.5 },
          pb: { xs: 1.25, sm: 2 },
          borderBottom: "1px solid rgba(245,158,11,0.12)",
        }}
      >
        <Stack spacing={{ xs: 1, sm: 1.5 }}>
          <Typography variant="h5" className="font-semibold text-slate-50">
            房間設定
          </Typography>

          <div className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-4 sm:gap-4">
            <div className="flex items-start gap-2 text-slate-100">
              <VideogameAssetRoundedIcon
                sx={{ fontSize: 15, color: "#94a3b8", mt: "2px" }}
              />
              <div className="min-w-0">
                <div className="text-[10px] tracking-[0.14em] text-slate-500 sm:text-xs sm:tracking-[0.18em]">
                  房型
                </div>
                <div className="text-sm font-semibold">
                  {isLeaderboardRoom ? "排行挑戰" : "休閒派對"}
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2 text-slate-100">
              <GroupsRoundedIcon
                sx={{ fontSize: 15, color: "#94a3b8", mt: "2px" }}
              />
              <div className="min-w-0">
                <div className="text-[10px] tracking-[0.14em] text-slate-500 sm:text-xs sm:tracking-[0.18em]">
                  人數
                </div>
                <div className="text-sm font-semibold">
                  {displayedMaxPlayers}
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2 text-slate-100">
              <QuizRoundedIcon
                sx={{ fontSize: 15, color: "#94a3b8", mt: "2px" }}
              />
              <div className="min-w-0">
                <div className="text-[10px] tracking-[0.14em] text-slate-500 sm:text-xs sm:tracking-[0.18em]">
                  題數
                </div>
                <div className="text-sm font-semibold">
                  {isLeaderboardRoom
                    ? challengeQuestionSummary
                    : `${settingsQuestionCount} 題`}
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2 text-slate-100">
              <TimerRoundedIcon
                sx={{ fontSize: 15, color: "#94a3b8", mt: "2px" }}
              />
              <div className="min-w-0">
                <div className="text-[10px] tracking-[0.14em] text-slate-500 sm:text-xs sm:tracking-[0.18em]">
                  時間
                </div>
                <div className="text-sm font-semibold">
                  {useCollectionTimingForSettings
                    ? `收藏庫時間 / 揭曉 ${settingsRevealDurationSec} 秒`
                    : `播放 ${settingsPlayDurationSec} 秒 / 揭曉 ${settingsRevealDurationSec} 秒`}
                </div>
              </div>
            </div>
          </div>
        </Stack>
      </DialogTitle>

      <DialogContent
        dividers
        sx={{
          borderColor: "rgba(245,158,11,0.12)",
          py: { xs: 1.5, sm: 2.25 },
          px: { xs: 1.5, sm: 2.5 },
          maxHeight: { xs: "none", md: "82vh" },
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
        {isTimeAttackLeaderboard ? (
          <div className="mb-5 rounded-2xl border border-amber-300/18 bg-[linear-gradient(180deg,rgba(24,18,10,0.68),rgba(10,10,14,0.72))] px-4 py-3">
            <div className="text-sm font-semibold text-amber-100">
              15 分鐘限時 · 單人挑戰
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-300">
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                最多玩完整個收藏庫
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                公布答案 5 秒
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                使用收藏庫時間
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                不使用延長投票
              </span>
            </div>
          </div>
        ) : null}
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.02fr)_minmax(0,1.18fr)]">
          <Section
            icon={<MeetingRoomRoundedIcon sx={{ fontSize: 20, color: "#7dd3fc" }} />}
            title="房間核心設定"
            hideHeader
          >
            <div className="flex h-full flex-col gap-6">
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    if (settingsLocked) return;
                    setLeaderboardMenuOpen(false);
                    onRoomPlayModeChange("casual");
                  }}
                  disabled={settingsLocked}
                  className={`rounded-2xl border px-3 py-3 text-left transition ${
                    !isLeaderboardRoom
                      ? "border-emerald-300/45 bg-emerald-400/12 text-emerald-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                      : "border-white/8 bg-white/5 text-slate-300 hover:border-emerald-300/28 hover:bg-white/[0.07] hover:text-slate-100"
                  } ${settingsLocked ? "cursor-not-allowed opacity-60" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                        !isLeaderboardRoom
                          ? "border-emerald-200/24 bg-emerald-300/14 text-emerald-100"
                          : "border-white/10 bg-slate-950/35 text-slate-300"
                      }`}
                    >
                      <ChairRoundedIcon sx={{ fontSize: 18 }} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">休閒派對</span>
                      <span className="mt-1 block text-xs leading-5 opacity-80">
                        自由調整題數、人數與播放節奏。
                      </span>
                    </span>
                  </div>
                </button>

                <div
                  ref={handleLeaderboardAnchorRef}
                  role="button"
                  tabIndex={settingsLocked ? -1 : 0}
                  aria-haspopup="listbox"
                  aria-expanded={leaderboardMenuOpen}
                  onClick={() => {
                    if (settingsLocked) return;
                    if (!isLeaderboardRoom) {
                      onLeaderboardVariantChange(
                        getNextAvailableLeaderboardVariant(),
                      );
                      setLeaderboardMenuOpen(true);
                      return;
                    }
                    setLeaderboardMenuOpen((current) => !current);
                  }}
                  onKeyDown={(event) => {
                    if (settingsLocked) return;
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      if (!isLeaderboardRoom) {
                        onLeaderboardVariantChange(
                          getNextAvailableLeaderboardVariant(),
                        );
                        setLeaderboardMenuOpen(true);
                        return;
                      }
                      setLeaderboardMenuOpen((current) => !current);
                    }
                    if (event.key === "Escape") {
                      setLeaderboardMenuOpen(false);
                    }
                  }}
                  className={`relative rounded-2xl border px-3 py-3 transition ${
                    settingsLocked
                      ? "cursor-not-allowed border-white/8 bg-white/5 text-slate-500"
                      : isLeaderboardRoom
                        ? "cursor-pointer border-amber-300/38 bg-amber-300/10 text-amber-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] outline-none hover:border-amber-300/48 focus:border-amber-100/42 focus:ring-2 focus:ring-amber-200/10"
                        : "cursor-pointer border-white/8 bg-white/5 text-slate-300 outline-none hover:border-amber-300/28 hover:bg-white/[0.07] hover:text-slate-100 focus:border-amber-100/42 focus:ring-2 focus:ring-amber-200/10"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-start gap-3 text-left">
                      <span
                        className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                          isLeaderboardRoom
                            ? "border-amber-200/24 bg-amber-300/14 text-amber-100"
                            : "border-white/10 bg-slate-950/35 text-slate-300"
                        }`}
                      >
                        <EmojiEventsRoundedIcon sx={{ fontSize: 18 }} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold">
                          排行挑戰
                        </span>
                        <span className="mt-1 block text-xs leading-5 opacity-80">
                          {activeChallengeOption.summary}
                        </span>
                      </span>
                    </div>

                    <span
                      className={`inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold ${
                        isLeaderboardRoom ? "text-amber-50" : "text-amber-100/86"
                      }`}
                    >
                      <span className="truncate">{activeChallengeOption.label}</span>
                      <KeyboardArrowDownRounded
                        sx={{ fontSize: 20 }}
                        className={`shrink-0 text-amber-100/72 transition ${
                          leaderboardMenuOpen ? "rotate-180" : ""
                        }`}
                      />
                    </span>
                  </div>
                </div>
              </div>

              <div className={statCardClassName}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center text-cyan-100">
                      <MeetingRoomRoundedIcon sx={{ fontSize: 20 }} />
                    </span>
                    <p className="text-sm font-semibold text-slate-100">
                      房間資訊
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isPrivateRoom}
                    onClick={() =>
                      onSettingsVisibilityChange(isPrivateRoom ? "public" : "private")
                    }
                    disabled={settingsLocked}
                    className={`inline-flex items-center gap-2 px-1 py-1 transition ${
                      settingsLocked ? "cursor-not-allowed opacity-60" : ""
                    }`}
                  >
                    {isPrivateRoom ? (
                      <LockRoundedIcon sx={{ fontSize: 16, color: "#fbbf24" }} />
                    ) : (
                      <PublicOutlinedIcon sx={{ fontSize: 16, color: "#7dd3fc" }} />
                    )}
                    <span
                      className={`text-xs font-semibold ${
                        isPrivateRoom ? "text-amber-100" : "text-cyan-100"
                      }`}
                    >
                      {isPrivateRoom ? "私人" : "公開"}
                    </span>
                    <span
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition ${
                        isPrivateRoom
                          ? "border-amber-300/45 bg-amber-300/18"
                          : "border-cyan-300/35 bg-cyan-400/18"
                      }`}
                    >
                      <span
                        className={`absolute top-1/2 h-[18px] w-[18px] -translate-y-1/2 rounded-full shadow-[0_10px_22px_-16px_rgba(15,23,42,0.95)] transition ${
                          isPrivateRoom
                            ? "left-[1.3rem] bg-amber-200"
                            : "left-1 bg-cyan-200"
                        }`}
                      />
                    </span>
                  </button>
                </div>

                <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(240px,0.62fr)]">
                  <TextField
                    size="small"
                    variant="standard"
                    fullWidth
                    label="房間名稱"
                    value={settingsName}
                    sx={drawerFieldSx}
                    onChange={(event) => onSettingsNameChange(event.target.value)}
                    disabled={settingsLocked}
                  />

                  <div className="rounded-xl border border-white/8 bg-slate-950/18 px-3 py-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <PinOutlinedIcon sx={{ fontSize: 17, color: "#fbbf24" }} />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-100">
                            房間密碼
                          </p>
                        </div>
                        <div className="ml-1 w-[108px] max-w-full transition sm:w-[132px]">
                          <TextField
                            variant="standard"
                            size="small"
                            fullWidth
                            disabled={!canEditPin}
                            placeholder="4 位數 PIN"
                            autoComplete="off"
                            value={settingsPassword}
                            sx={drawerFieldSx}
                            onChange={(event) =>
                              onSettingsPasswordChange(
                                event.target.value.replace(/\D/g, "").slice(0, 4),
                              )
                            }
                            slotProps={{
                              htmlInput: {
                                "aria-label": "PIN",
                                inputMode: "numeric",
                                lang: "en",
                                autoCorrect: "off",
                                pattern: "\\d{4}",
                                maxLength: 4,
                                style: { imeMode: "disabled" },
                              },
                            }}
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={pinEnabled}
                        onClick={() => {
                          if (settingsLocked) return;
                          if (pinEnabled) {
                            onSettingsPasswordClear();
                          }
                        }}
                        disabled={settingsLocked}
                        className={`inline-flex shrink-0 items-center px-0.5 py-1 transition ${
                          settingsLocked ? "cursor-not-allowed opacity-60" : ""
                        }`}
                      >
                        <span
                          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition ${
                            pinEnabled
                              ? "border-emerald-300/40 bg-emerald-300/18"
                              : "border-white/10 bg-white/5"
                          }`}
                        >
                          <span
                            className={`absolute top-1/2 h-[18px] w-[18px] -translate-y-1/2 rounded-full shadow-[0_10px_22px_-16px_rgba(15,23,42,0.95)] transition ${
                              pinEnabled
                                ? "left-[1.3rem] bg-emerald-200"
                                : "left-1 bg-slate-200"
                            }`}
                          />
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative select-none overflow-hidden rounded-2xl px-1 py-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-100">
                    <GroupsRoundedIcon sx={{ fontSize: 18, color: "#7dd3fc" }} />
                    人數
                  </p>
                  <span className="text-[11px] text-slate-400">
                    {PLAYER_MIN}-{PLAYER_MAX} 人
                  </span>
                </div>
                <div className="mt-5 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      onSettingsMaxPlayersChange(
                        String(Math.max(PLAYER_MIN, effectiveMaxPlayers - 1)),
                      )
                    }
                    disabled={isMaxPlayersLocked || !canDecreaseMaxPlayers}
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border transition ${
                      !isMaxPlayersLocked && canDecreaseMaxPlayers
                        ? "border-white/10 bg-white/5 text-slate-100 hover:border-cyan-300/35 hover:text-cyan-100"
                        : "cursor-not-allowed border-white/8 bg-white/5 text-slate-500"
                    }`}
                  >
                    <RemoveRounded sx={{ fontSize: 18 }} />
                  </button>
                  <div className="text-2xl font-semibold text-slate-100">
                    {displayedMaxPlayers}
                    <span className="ml-1 text-sm text-slate-400">人</span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onSettingsMaxPlayersChange(
                        String(Math.min(PLAYER_MAX, effectiveMaxPlayers + 1)),
                      )
                    }
                    disabled={isMaxPlayersLocked || !canIncreaseMaxPlayers}
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border transition ${
                      !isMaxPlayersLocked && canIncreaseMaxPlayers
                        ? "border-white/10 bg-white/5 text-slate-100 hover:border-cyan-300/35 hover:text-cyan-100"
                        : "cursor-not-allowed border-white/8 bg-white/5 text-slate-500"
                    }`}
                  >
                    <AddRounded sx={{ fontSize: 18 }} />
                  </button>
                </div>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {[2, 4, 8, 12]
                    .filter((count) => count >= PLAYER_MIN && count <= PLAYER_MAX)
                    .map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => onSettingsMaxPlayersChange(String(count))}
                        disabled={isMaxPlayersLocked}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                          displayedMaxPlayers === count
                            ? "border-cyan-300/60 bg-cyan-500/12 text-cyan-50"
                            : isMaxPlayersLocked
                              ? "cursor-not-allowed border-white/8 bg-white/5 text-slate-500"
                              : "border-white/10 bg-white/5 text-slate-300 hover:border-cyan-300/35 hover:text-slate-100"
                        }`}
                      >
                        {count} 人
                      </button>
                    ))}
                </div>
                {timeAttackPlayersLockedOverlay}
              </div>

              <Section
                icon={<QuizRoundedIcon sx={{ fontSize: 20, color: "#fbbf24" }} />}
                title="題數"
                headerAside={
                  <span className="text-[11px] text-slate-400">
                    {questionMinLimit} - {Math.min(questionMaxLimit, QUESTION_MAX)} 題
                  </span>
                }
              >
                <div className="relative select-none overflow-hidden rounded-2xl px-1 py-2">
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      aria-label="減少 1 題"
                      onClick={() =>
                        onSettingsQuestionCountChange(
                          Math.max(questionMinLimit, settingsQuestionCount - 1),
                        )
                      }
                      disabled={isQuestionSettingsLocked || !canDecreaseQuestionCount}
                      className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border transition ${
                        !isQuestionSettingsLocked && canDecreaseQuestionCount
                          ? "border-white/10 bg-white/5 text-slate-100 hover:border-cyan-300/35 hover:text-cyan-100"
                          : "cursor-not-allowed border-white/8 bg-white/5 text-slate-500"
                      }`}
                    >
                      <RemoveRounded sx={{ fontSize: 18 }} />
                    </button>
                    <div className="text-2xl font-semibold text-slate-100">
                      {settingsQuestionCount}
                      <span className="ml-1 text-sm text-slate-400">題</span>
                    </div>
                    <button
                      type="button"
                      aria-label="增加 1 題"
                      onClick={() =>
                        onSettingsQuestionCountChange(
                          Math.min(questionMaxLimit, settingsQuestionCount + 1),
                        )
                      }
                      disabled={isQuestionSettingsLocked || !canIncreaseQuestionCount}
                      className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border transition ${
                        !isQuestionSettingsLocked && canIncreaseQuestionCount
                          ? "border-white/10 bg-white/5 text-slate-100 hover:border-cyan-300/35 hover:text-cyan-100"
                          : "cursor-not-allowed border-white/8 bg-white/5 text-slate-500"
                      }`}
                    >
                      <AddRounded sx={{ fontSize: 18 }} />
                    </button>
                  </div>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        onSettingsQuestionCountChange(
                          Math.max(questionMinLimit, settingsQuestionCount - QUESTION_STEP),
                        )
                      }
                      disabled={isQuestionSettingsLocked || !canDecreaseQuestionCount}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                        !isQuestionSettingsLocked && canDecreaseQuestionCount
                          ? "border-white/10 bg-white/5 text-slate-300 hover:border-cyan-300/35 hover:text-slate-100"
                          : "cursor-not-allowed border-white/8 bg-white/5 text-slate-500"
                      }`}
                    >
                      -{QUESTION_STEP}
                    </button>
                    {questionPresetButtons.map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => onSettingsQuestionCountChange(count)}
                        disabled={isQuestionSettingsLocked}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                          settingsQuestionCount === count
                            ? "border-cyan-300/60 bg-cyan-500/12 text-cyan-50"
                            : isQuestionSettingsLocked
                              ? "cursor-not-allowed border-white/8 bg-white/5 text-slate-500"
                              : "border-white/10 bg-white/5 text-slate-300 hover:border-cyan-300/35 hover:text-slate-100"
                        }`}
                      >
                        {count} 題
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        onSettingsQuestionCountChange(
                          Math.min(questionMaxLimit, settingsQuestionCount + QUESTION_STEP),
                        )
                      }
                      disabled={isQuestionSettingsLocked || !canIncreaseQuestionCount}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                        !isQuestionSettingsLocked && canIncreaseQuestionCount
                          ? "border-white/10 bg-white/5 text-slate-300 hover:border-cyan-300/35 hover:text-slate-100"
                          : "cursor-not-allowed border-white/8 bg-white/5 text-slate-500"
                      }`}
                    >
                      +{QUESTION_STEP}
                    </button>
                  </div>
                  {leaderboardQuestionLockedOverlay}
                </div>
              </Section>
            </div>
          </Section>

          <Stack spacing={4}>
            <Popper
              open={leaderboardMenuOpen}
              anchorEl={leaderboardAnchorEl}
              placement="bottom-end"
              modifiers={[
                { name: "offset", options: { offset: [0, 8] } },
                { name: "flip", enabled: true },
                {
                  name: "preventOverflow",
                  options: { padding: 12 },
                },
              ]}
              sx={{ zIndex: 1700 }}
            >
              <ClickAwayListener onClickAway={() => setLeaderboardMenuOpen(false)}>
                <AnimatePresence>
                  {leaderboardMenuOpen ? (
                    <motion.div
                      ref={leaderboardMenuRef}
                      key="room-lobby-leaderboard-menu"
                      initial={{ opacity: 0, y: -6, scale: 0.985 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.985 }}
                      transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                      className="max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-amber-100/20 bg-slate-950/96 p-2 text-slate-100 shadow-[0_22px_50px_-28px_rgba(251,191,36,0.72),0_18px_36px_-28px_rgba(2,6,23,0.95)] backdrop-blur-xl"
                      style={{
                        width: leaderboardMenuWidth,
                        transformOrigin: "top right",
                      }}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <div role="listbox" aria-label="挑戰規格" className="space-y-1">
                        {challengeOptions.map((option) => {
                          const selected = option.key === leaderboardVariant;
                          const disabled =
                            (option.key === "30q" && !canUseLeaderboard30) ||
                            (option.key === "50q" && !canUseLeaderboard50) ||
                            (option.key === "15m" && !canUseLeaderboard15m);

                          return (
                            <button
                              key={option.key}
                              type="button"
                              role="option"
                              aria-selected={selected}
                              disabled={disabled}
                              onClick={() => {
                                if (disabled) return;
                                onLeaderboardVariantChange(option.key);
                                setLeaderboardMenuOpen(false);
                              }}
                              className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-left transition ${
                                selected
                                  ? "bg-amber-300/14 text-amber-50 shadow-[inset_0_0_0_1px_rgba(252,211,77,0.16)]"
                                  : disabled
                                    ? "cursor-not-allowed text-slate-500"
                                    : "text-slate-300 hover:bg-white/[0.055] hover:text-amber-50"
                              }`}
                            >
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-semibold">
                                  {option.label}
                                </span>
                                <span className="mt-0.5 block truncate text-xs text-slate-400">
                                  {disabled
                                    ? option.key === "30q"
                                      ? "目前歌單不足 30 首"
                                      : option.key === "50q"
                                        ? "目前歌單不足 50 首"
                                        : "限時挑戰僅能單人進行"
                                    : option.summary}
                                </span>
                              </span>
                              {selected ? (
                                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-200" />
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </ClickAwayListener>
            </Popper>

            <Section
              icon={<TuneRoundedIcon sx={{ fontSize: 20, color: "#34d399" }} />}
              title="播放規則"
              locked={isLeaderboardRoom}
            >
              <div className="grid gap-3 sm:grid-cols-3">
                {playbackExtensionOptions.map((option) => {
                  const selected = settingsPlaybackExtensionMode === option.key;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => onSettingsPlaybackExtensionModeChange(option.key)}
                      disabled={settingsLocked}
                      className={`rounded-2xl border px-3 py-3 text-left transition ${
                        selected
                          ? "border-amber-300/45 bg-amber-300/12 text-amber-50"
                          : "border-white/8 bg-white/5 text-slate-300"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </Section>

            <Section
              icon={<TimerRoundedIcon sx={{ fontSize: 20, color: "#c084fc" }} />}
              title="時間設定"
              locked={isLeaderboardRoom}
            >
              <Stack spacing={1.4}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <TimerRoundedIcon sx={{ fontSize: 18, color: "#c084fc" }} />
                    <p className="text-sm font-semibold text-slate-100">
                      遊戲節奏
                    </p>
                  </div>
                  {canUseCollectionTiming ? (
                    <button
                      type="button"
                      role="switch"
                      aria-checked={useCollectionTimingForSettings}
                      disabled={settingsLocked}
                      onClick={() =>
                        onSettingsAllowCollectionClipTimingChange(
                          !useCollectionTimingForSettings,
                        )
                      }
                      className={`inline-flex items-center gap-2 px-1 py-1.5 transition ${
                        settingsLocked ? "cursor-not-allowed opacity-55" : ""
                      }`}
                    >
                      <TuneRoundedIcon sx={{ fontSize: 16, color: "#34d399" }} />
                      <span className="hidden text-xs font-semibold text-emerald-100 sm:inline">
                        使用收藏庫片段
                      </span>
                      <span
                        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition ${
                          useCollectionTimingForSettings
                            ? "border-emerald-300/40 bg-emerald-300/18"
                            : "border-white/10 bg-white/5"
                        }`}
                      >
                        <span
                          className={`absolute top-1/2 h-[18px] w-[18px] -translate-y-1/2 rounded-full shadow-[0_10px_22px_-16px_rgba(15,23,42,0.95)] transition ${
                            useCollectionTimingForSettings
                              ? "left-[1.3rem] bg-emerald-200"
                              : "left-1 bg-slate-200"
                          }`}
                        />
                      </span>
                    </button>
                  ) : null}
                </div>

                <div
                  className={`grid gap-3 rounded-2xl border border-white/8 bg-white/[0.035] p-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.65fr)] ${
                    settingsLocked ? "pointer-events-none opacity-55 saturate-75" : ""
                  }`}
                >
                  <div className="rounded-xl border border-white/8 bg-white/[0.035] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                    {canUseCollectionTiming ? (
                      <>
                        <div className="flex items-center gap-2">
                          {useCollectionTimingForSettings ? (
                            <TuneRoundedIcon sx={{ fontSize: 18, color: "#34d399" }} />
                          ) : (
                            <ContentCutRoundedIcon
                              sx={{ fontSize: 18, color: "#7dd3fc" }}
                            />
                          )}
                          <p className="text-sm font-semibold text-slate-100">
                            {useCollectionTimingForSettings ? "收藏庫片段" : "自訂片段"}
                          </p>
                        </div>
                        <p className="mt-2 text-xs text-slate-400">
                          {useCollectionTimingForSettings
                            ? "建立房間時使用目前題庫裡設定好的播放起始與作答秒數。"
                            : "已改為手動設定作答時間與起始秒數。"}
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-slate-400">
                        目前未使用收藏庫，無法套用收藏庫時間。
                      </p>
                    )}

                    {useCollectionTimingForSettings && canUseCollectionTiming ? (
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <button
                          type="button"
                          disabled={settingsLocked}
                          onClick={() => onSettingsAllowCollectionClipTimingChange(false)}
                          className="rounded-xl border border-white/8 bg-white/5 px-3 py-2 text-left transition hover:border-emerald-300/35 hover:bg-white/[0.07] disabled:cursor-not-allowed"
                        >
                          <p className="text-sm font-semibold text-emerald-100">
                            作答時間 · 依題庫設定
                          </p>
                          <p className="mt-1 text-[11px] text-slate-400">
                            點擊改為手動設定
                          </p>
                        </button>
                        <button
                          type="button"
                          disabled={settingsLocked}
                          onClick={() => onSettingsAllowCollectionClipTimingChange(false)}
                          className="rounded-xl border border-white/8 bg-white/5 px-3 py-2 text-left transition hover:border-emerald-300/35 hover:bg-white/[0.07] disabled:cursor-not-allowed"
                        >
                          <p className="text-sm font-semibold text-emerald-100">
                            起始秒數 · 依題庫設定
                          </p>
                          <p className="mt-1 text-[11px] text-slate-400">
                            點擊改為手動設定
                          </p>
                        </button>
                      </div>
                    ) : (
                      <div className="mt-3 grid gap-3">
                        <div className="rounded-2xl border border-white/8 bg-white/5 px-3 py-3">
                          <div className="flex items-center gap-2">
                            <HourglassTopRounded
                              sx={{ fontSize: 18, color: "#7dd3fc" }}
                            />
                            <p className="text-sm font-semibold text-slate-100">
                              作答時間
                            </p>
                          </div>
                          <p className="mt-2 text-xs text-slate-400">
                            每題開始播放後，玩家可以作答的秒數。
                          </p>
                          <div className="mt-2 flex items-center justify-between gap-3">
                            <button
                              type="button"
                              disabled={settingsLocked}
                              onClick={() =>
                                onSettingsPlayDurationSecChange(
                                  Math.max(
                                    PLAY_DURATION_MIN,
                                    settingsPlayDurationSec - 1,
                                  ),
                                )
                              }
                              className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200 transition hover:border-cyan-300/35 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <RemoveRounded sx={{ fontSize: 16 }} />
                            </button>
                            <div className="text-xl font-semibold text-slate-100">
                              {settingsPlayDurationSec}s
                            </div>
                            <button
                              type="button"
                              disabled={settingsLocked}
                              onClick={() =>
                                onSettingsPlayDurationSecChange(
                                  Math.min(
                                    PLAY_DURATION_MAX,
                                    settingsPlayDurationSec + 1,
                                  ),
                                )
                              }
                              className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200 transition hover:border-cyan-300/35 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <AddRounded sx={{ fontSize: 16 }} />
                            </button>
                          </div>
                          <div className="mt-2 px-2 pb-3">
                            <Slider
                              value={settingsPlayDurationSec}
                              min={PLAY_DURATION_MIN}
                              max={PLAY_DURATION_MAX}
                              step={1}
                              shiftStep={5}
                              marks={playDurationMarks}
                              disabled={settingsLocked}
                              sx={controlSliderSx}
                              onChange={(_event, value) =>
                                onSettingsPlayDurationSecChange(value as number)
                              }
                            />
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/8 bg-white/5 px-3 py-3">
                          <div className="flex items-center gap-2">
                            <FastForwardRounded
                              sx={{ fontSize: 18, color: "#7dd3fc" }}
                            />
                            <p className="text-sm font-semibold text-slate-100">
                              起始時間
                            </p>
                          </div>
                          <p className="mt-2 text-xs text-slate-400">
                            片段從歌曲的哪個秒數開始播放。
                          </p>
                          <div className="mt-2 flex items-center justify-between gap-3">
                            <button
                              type="button"
                              disabled={settingsLocked}
                              onClick={() =>
                                onSettingsStartOffsetSecChange(
                                  Math.max(
                                    START_OFFSET_MIN,
                                    settingsStartOffsetSec - 5,
                                  ),
                                )
                              }
                              className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200 transition hover:border-cyan-300/35 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <RemoveRounded sx={{ fontSize: 16 }} />
                            </button>
                            <div className="text-xl font-semibold text-slate-100">
                              {settingsStartOffsetSec}s
                            </div>
                            <button
                              type="button"
                              disabled={settingsLocked}
                              onClick={() =>
                                onSettingsStartOffsetSecChange(
                                  Math.min(
                                    START_OFFSET_MAX,
                                    settingsStartOffsetSec + 5,
                                  ),
                                )
                              }
                              className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200 transition hover:border-cyan-300/35 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <AddRounded sx={{ fontSize: 16 }} />
                            </button>
                          </div>
                          <div className="mt-2 px-2 pb-3">
                            <Slider
                              value={settingsStartOffsetSec}
                              min={START_OFFSET_MIN}
                              max={START_OFFSET_MAX}
                              step={5}
                              shiftStep={15}
                              marks={startOffsetMarks}
                              disabled={settingsLocked}
                              sx={controlSliderSx}
                              onChange={(_event, value) =>
                                onSettingsStartOffsetSecChange(value as number)
                              }
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-white/8 bg-white/[0.035] px-3 py-3">
                    <div className="flex items-center gap-2">
                      <TimerRoundedIcon sx={{ fontSize: 18, color: "#fbbf24" }} />
                      <p className="text-sm font-semibold text-slate-100">
                        揭曉時間
                      </p>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">
                      公布答案與過場停留的秒數。
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        disabled={settingsLocked}
                        onClick={() =>
                          onSettingsRevealDurationSecChange(
                            Math.max(
                              REVEAL_DURATION_MIN,
                              settingsRevealDurationSec - 1,
                            ),
                          )
                        }
                        className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200 transition hover:border-cyan-300/35 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <RemoveRounded sx={{ fontSize: 16 }} />
                      </button>
                      <div className="text-xl font-semibold text-slate-100">
                        {settingsRevealDurationSec}s
                      </div>
                      <button
                        type="button"
                        disabled={settingsLocked}
                        onClick={() =>
                          onSettingsRevealDurationSecChange(
                            Math.min(
                              REVEAL_DURATION_MAX,
                              settingsRevealDurationSec + 1,
                            ),
                          )
                        }
                        className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200 transition hover:border-cyan-300/35 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <AddRounded sx={{ fontSize: 16 }} />
                      </button>
                    </div>
                    <div className="mt-2 px-2 pb-3">
                      <Slider
                        value={settingsRevealDurationSec}
                        min={REVEAL_DURATION_MIN}
                        max={REVEAL_DURATION_MAX}
                        step={1}
                        shiftStep={5}
                        marks={revealDurationMarks}
                        disabled={settingsLocked}
                        sx={controlSliderSx}
                        onChange={(_event, value) =>
                          onSettingsRevealDurationSecChange(value as number)
                        }
                      />
                    </div>
                  </div>
                </div>
              </Stack>
            </Section>

            {settingsError ? (
              <Typography variant="caption" className="text-rose-300">
                {settingsError}
              </Typography>
            ) : null}
          </Stack>
        </div>
      </DialogContent>

      <DialogActions
        className="room-lobby-settings-dialog__actions"
        sx={{
          borderTop: "1px solid rgba(245,158,11,0.1)",
          px: { xs: 1.5, sm: 2.5 },
          py: { xs: 1, sm: 1.5 },
        }}
      >
        <Button
          onClick={handleDialogClose}
          variant="text"
          disabled={settingsSaving}
          className="room-lobby-settings-secondary-btn"
        >
          取消
        </Button>

        <Button
          onClick={onSave}
          variant="contained"
          disabled={settingsLocked}
          className={`room-lobby-settings-primary-btn ${
            settingsSaving ? "is-saving" : ""
          }`}
        >
          <span className="room-lobby-settings-primary-btn__content">
            {settingsSaving ? "儲存中..." : "儲存設定"}
          </span>
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RoomLobbySettingsDialog;
