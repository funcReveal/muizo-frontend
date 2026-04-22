import React from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import MeetingRoomRoundedIcon from "@mui/icons-material/MeetingRoomRounded";
import QuizRoundedIcon from "@mui/icons-material/QuizRounded";
import TimerRoundedIcon from "@mui/icons-material/TimerRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import VideogameAssetRoundedIcon from "@mui/icons-material/VideogameAssetRounded";
import {
  PLAYER_MAX,
  PLAYER_MIN,
  QUESTION_MAX,
  QUESTION_STEP,
} from "@domain/room/constants";
import type { PlaybackExtensionMode } from "@features/RoomSession";
import QuestionCountControls from "./QuestionCountControls";
import RoomAccessSettingsFields from "./RoomAccessSettingsFields";

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
  leaderboardQuestionHelpText: string | null;
  settingsError: string | null;
  onClose: () => void;
  onSave: () => void;
}

type SectionProps = {
  title: string;
  icon: React.ReactNode;
  headerAside?: React.ReactNode;
  locked?: boolean;
  lockedReason?: string;
  children: React.ReactNode;
};

const plainFieldSx = {
  "& .MuiInputBase-root": {
    borderRadius: 0,
    backgroundColor: "transparent",
    paddingLeft: 0,
    paddingRight: 0,
    color: "#f8fafc",
  },
  "& .MuiInputBase-input": {
    paddingLeft: 0,
    paddingRight: 0,
    fontSize: "0.98rem",
    fontWeight: 600,
  },
  "& .MuiInputLabel-root": {
    color: "rgba(148,163,184,0.82)",
  },
  "& .MuiInputLabel-root.Mui-focused": {
    color: "rgba(125,211,252,0.95)",
  },
  "& .MuiInput-underline:before": {
    borderBottomColor: "rgba(148,163,184,0.26)",
  },
  "& .MuiInput-underline:hover:not(.Mui-disabled):before": {
    borderBottomColor: "rgba(125,211,252,0.42)",
  },
  "& .MuiInput-underline:after": {
    borderBottomColor: "rgba(56,189,248,0.78)",
  },
} as const;

const Section = ({
  title,
  icon,
  headerAside,
  locked = false,
  lockedReason = "排行挑戰模式下，這個區塊無法在 lobby 修改。",
  children,
}: SectionProps) => (
  <Box className="relative py-3 sm:py-4">
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

    <div className={locked ? "opacity-50" : ""}>{children}</div>

    {locked ? (
      <div
        aria-hidden="true"
        className="pointer-events-auto absolute inset-0 z-20 flex cursor-not-allowed items-center justify-center rounded-3xl bg-slate-950/58 px-4 backdrop-blur-[2px]"
      >
        <div className="inline-flex max-w-[320px] items-center gap-3 rounded-2xl border border-amber-200/24 bg-amber-300/12 px-4 py-3 text-amber-50 shadow-[0_18px_34px_-28px_rgba(251,191,36,0.72)]">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-100/24 bg-amber-200/14">
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

const roomModeOptions: Array<{
  key: RoomPlayMode;
  label: string;
  icon: React.ReactNode;
}> = [
  {
    key: "casual",
    label: "休閒派對",
    icon: <MeetingRoomRoundedIcon sx={{ fontSize: 18 }} />,
  },
  {
    key: "leaderboard",
    label: "排行挑戰",
    icon: <EmojiEventsRoundedIcon sx={{ fontSize: 18 }} />,
  },
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

  const handleDialogClose = () => {
    if (settingsSaving) return;
    onClose();
  };

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
                  {settingsMaxPlayers || "未設定"}
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
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.02fr)_minmax(0,1.18fr)]">
          <Section
            icon={<MeetingRoomRoundedIcon sx={{ fontSize: 20, color: "#7dd3fc" }} />}
            title="房間核心設定"
          >
            <div className="flex h-full flex-col gap-6">
              <div className="grid gap-2 sm:grid-cols-2">
                {roomModeOptions.map((option) => {
                  const selected = roomPlayMode === option.key;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => onRoomPlayModeChange(option.key)}
                      disabled={settingsLocked}
                      className={`rounded-2xl px-4 py-3 text-left transition ${
                        selected
                          ? option.key === "leaderboard"
                            ? "bg-amber-300/10 text-amber-50 ring-1 ring-amber-300/35"
                            : "bg-emerald-400/12 text-emerald-50 ring-1 ring-emerald-300/35"
                          : "bg-white/5 text-slate-300 hover:bg-white/[0.07]"
                      } ${settingsLocked ? "cursor-not-allowed opacity-60" : ""}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-950/35">
                          {option.icon}
                        </span>
                        <span className="text-sm font-semibold">{option.label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <TextField
                label="房間名稱"
                variant="standard"
                slotProps={{ input: { disableUnderline: false } }}
                className="room-lobby-settings-field"
                sx={plainFieldSx}
                value={settingsName}
                onChange={(event) => onSettingsNameChange(event.target.value)}
                disabled={settingsLocked}
                fullWidth
              />

              <RoomAccessSettingsFields
                visibility={settingsVisibility}
                password={settingsPassword}
                disabled={settingsLocked}
                allowPasswordWhenPublic
                passwordFieldVariant="standard"
                passwordFieldLabelShrink
                passwordFieldSize="medium"
                onVisibilityChange={onSettingsVisibilityChange}
                onPasswordChange={onSettingsPasswordChange}
                onPasswordClear={onSettingsPasswordClear}
                classes={{
                  visibilityRow: "room-lobby-settings-visibility-row",
                  visibilityButton: "room-lobby-settings-visibility-btn",
                  helperText: "room-lobby-settings-helper",
                  passwordField: "room-lobby-settings-field",
                  noteText: "room-lobby-settings-helper",
                }}
              />

              <Stack spacing={0.75}>
                <TextField
                  label="人數上限"
                  type="number"
                  variant="standard"
                  slotProps={{ input: { disableUnderline: false } }}
                  className="room-lobby-settings-field"
                  sx={plainFieldSx}
                  value={settingsMaxPlayers}
                  onChange={(event) =>
                    onSettingsMaxPlayersChange(event.target.value)
                  }
                  inputProps={{
                    min: PLAYER_MIN,
                    max: PLAYER_MAX,
                    inputMode: "numeric",
                  }}
                  placeholder="未設定"
                  disabled={settingsLocked}
                  fullWidth
                />
                <Typography variant="caption" className="text-slate-400">
                  可設定範圍：{PLAYER_MIN} - {PLAYER_MAX}
                </Typography>
              </Stack>
            </div>
          </Section>

          <Stack spacing={4}>
            {!isLeaderboardRoom ? (
              <Section
                icon={<QuizRoundedIcon sx={{ fontSize: 20, color: "#fbbf24" }} />}
                title="題數"
                headerAside={
                  <div className="flex flex-wrap justify-start gap-1.5 sm:justify-end sm:gap-2">
                    {questionPresetButtons.map((count) => (
                      <button
                        key={count}
                        type="button"
                        className={`room-lobby-settings-preset-button min-h-[32px] min-w-[56px] px-2.5 text-xs sm:min-h-[38px] sm:min-w-[70px] sm:px-3 sm:text-sm ${
                          settingsQuestionCount === count ? "is-active" : ""
                        }`}
                        onClick={() => onSettingsQuestionCountChange(count)}
                        disabled={settingsLocked || settingsQuestionCount === count}
                      >
                        {count} 題
                      </button>
                    ))}
                  </div>
                }
              >
                <Stack spacing={1.1}>
                  <QuestionCountControls
                    value={settingsQuestionCount}
                    min={questionMinLimit}
                    max={questionMaxLimit}
                    step={QUESTION_STEP}
                    compact
                    showRangeHint={false}
                    showSummaryRow={false}
                    disabled={settingsLocked}
                    onChange={onSettingsQuestionCountChange}
                  />

                  <Typography variant="caption" className="text-slate-400">
                    可設定範圍：{questionMinLimit} -{" "}
                    {Math.min(questionMaxLimit, QUESTION_MAX)} 題
                  </Typography>
                </Stack>
              </Section>
            ) : (
              <Section
                icon={<EmojiEventsRoundedIcon sx={{ fontSize: 20, color: "#fbbf24" }} />}
                title="挑戰模式"
              >
                <div className="grid gap-3 sm:grid-cols-3">
                  {challengeOptions.map((option) => {
                    const selected = leaderboardVariant === option.key;
                    const disabled =
                      settingsLocked ||
                      (option.key === "30q" && !canUseLeaderboard30) ||
                      (option.key === "50q" && !canUseLeaderboard50);

                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => onLeaderboardVariantChange(option.key)}
                        disabled={disabled}
                        className={`rounded-2xl border px-4 py-4 text-left transition ${
                          selected
                            ? "border-amber-300/45 bg-amber-300/12 text-amber-50"
                            : "border-white/8 bg-white/5 text-slate-300 hover:border-amber-300/28 hover:bg-white/[0.07]"
                        } ${disabled ? "cursor-not-allowed opacity-55" : ""}`}
                      >
                        <div className="flex flex-col gap-1">
                          <span className="text-base font-semibold">
                            {option.label}
                          </span>
                          <span className="text-xs text-slate-400">
                            {option.summary}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </Section>
            )}

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
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => onSettingsAllowCollectionClipTimingChange(true)}
                    disabled={settingsLocked || !canUseCollectionTiming}
                    className={`rounded-2xl px-3 py-3 text-left text-sm transition ${
                      useCollectionTimingForSettings
                        ? "border border-emerald-300/40 bg-emerald-300/10 text-emerald-50"
                        : "border border-white/8 bg-white/5 text-slate-300"
                    } ${
                      settingsLocked || !canUseCollectionTiming
                        ? "cursor-not-allowed opacity-55"
                        : ""
                    }`}
                  >
                    使用收藏庫時間
                  </button>

                  <button
                    type="button"
                    onClick={() => onSettingsAllowCollectionClipTimingChange(false)}
                    disabled={settingsLocked}
                    className={`rounded-2xl px-3 py-3 text-left text-sm transition ${
                      !useCollectionTimingForSettings
                        ? "border border-cyan-300/40 bg-cyan-300/10 text-cyan-50"
                        : "border border-white/8 bg-white/5 text-slate-300"
                    } ${settingsLocked ? "cursor-not-allowed opacity-55" : ""}`}
                  >
                    自訂播放時間
                  </button>
                </div>

                {!canUseCollectionTiming ? (
                  <Typography variant="caption" className="text-slate-400">
                    目前未使用收藏庫，無法套用收藏庫時間。
                  </Typography>
                ) : null}

                <div className="grid gap-3 md:grid-cols-3">
                  <TextField
                    label="播放時間"
                    type="number"
                    className="room-lobby-settings-field"
                    value={settingsPlayDurationSec}
                    onChange={(event) =>
                      onSettingsPlayDurationSecChange(Number(event.target.value))
                    }
                    disabled={settingsLocked || useCollectionTimingForSettings}
                    fullWidth
                  />
                  <TextField
                    label="起始時間"
                    type="number"
                    className="room-lobby-settings-field"
                    value={settingsStartOffsetSec}
                    onChange={(event) =>
                      onSettingsStartOffsetSecChange(Number(event.target.value))
                    }
                    disabled={settingsLocked || useCollectionTimingForSettings}
                    fullWidth
                  />
                  <TextField
                    label="揭曉時間"
                    type="number"
                    className="room-lobby-settings-field"
                    value={settingsRevealDurationSec}
                    onChange={(event) =>
                      onSettingsRevealDurationSecChange(Number(event.target.value))
                    }
                    disabled={settingsLocked}
                    fullWidth
                  />
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
