import { useState } from "react";

import { Slider, TextField, Tooltip } from "@mui/material";
import {
  AccessTimeRounded,
  AddRounded,
  CelebrationRounded,
  EditNoteRounded,
  EmojiEventsRounded,
  GroupsRounded,
  KeyboardArrowDownRounded,
  LockRounded,
  LockOutlined,
  PinOutlined,
  PlayCircleOutlineRounded,
  PublicOutlined,
  QuizRounded,
  RemoveRounded,
  ScheduleRounded,
  TimerRounded,
  TuneRounded,
} from "@mui/icons-material";

import {
  PLAYER_MAX,
  PLAYER_MIN,
  PLAY_DURATION_MAX,
  PLAY_DURATION_MIN,
  QUESTION_STEP,
  REVEAL_DURATION_MAX,
  REVEAL_DURATION_MIN,
  START_OFFSET_MAX,
  START_OFFSET_MIN,
} from "@domain/room/constants";
import type { PlaybackExtensionMode, RoomCreateSourceMode } from "@domain/room/types";
import type { CreateSettingsCard, SourceSummary } from "../../roomsHubViewModels";
import {
  getLeaderboardModeDescription,
  leaderboardModes,
  leaderboardVariants,
  type LeaderboardModeKey,
  type LeaderboardVariantKey,
  type RoomPlayMode,
} from "../../../model/leaderboardChallengeOptions";

type RoomSetupPanelProps = {
  roomNameInput: string;
  setRoomNameInput: (value: string) => void;
  roomVisibilityInput: "public" | "private";
  setRoomVisibilityInput: (value: "public" | "private") => void;
  roomPasswordInput: string;
  setRoomPasswordInput: (value: string) => void;
  isPinProtectionEnabled: boolean;
  setIsPinProtectionEnabled: (value: boolean) => void;
  setRoomMaxPlayersInput: (value: string) => void;
  parsedMaxPlayers: number | null;
  questionCount: number;
  questionMin: number;
  questionMaxLimit: number;
  updateQuestionCount: (value: number) => void;
  roomPlayMode: RoomPlayMode;
  setRoomPlayMode: (value: RoomPlayMode) => void;
  roomCreateSourceMode: RoomCreateSourceMode;
  selectedLeaderboardMode: LeaderboardModeKey;
  selectedLeaderboardVariant: LeaderboardVariantKey;
  onLeaderboardSelectionChange: (
    mode: LeaderboardModeKey,
    variant: LeaderboardVariantKey,
  ) => void;
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
  onCreateRoom: () => void;
  pinValidationAttempted?: boolean;
  showLeaderboardMode?: boolean;
};

const RoomSetupPanel = ({
  roomNameInput,
  setRoomNameInput,
  roomVisibilityInput,
  setRoomVisibilityInput,
  roomPasswordInput,
  setRoomPasswordInput,
  isPinProtectionEnabled,
  setIsPinProtectionEnabled,
  setRoomMaxPlayersInput,
  parsedMaxPlayers,
  questionCount,
  questionMin,
  questionMaxLimit,
  updateQuestionCount,
  roomPlayMode,
  setRoomPlayMode,
  roomCreateSourceMode,
  selectedLeaderboardMode,
  selectedLeaderboardVariant,
  onLeaderboardSelectionChange,
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
  pinValidationAttempted = false,
  showLeaderboardMode = true,
}: RoomSetupPanelProps) => {
  const isPrivateRoom = roomVisibilityInput === "private";
  const [isLeaderboardSpecMenuOpen, setIsLeaderboardSpecMenuOpen] =
    useState(false);
  const isPinProtectionOpen =
    isPinProtectionEnabled || roomPasswordInput.length > 0;
  const canDecreaseQuestionCount = questionCount > questionMin;
  const canIncreaseQuestionCount = questionCount < questionMaxLimit;
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
  const activeLeaderboardModeDescription =
    getLeaderboardModeDescription(selectedLeaderboardMode);
  const isLeaderboardChallengeAvailable =
    roomCreateSourceMode === "publicCollection";
  const isLeaderboardRoom =
    roomPlayMode === "leaderboard" && isLeaderboardChallengeAvailable;
  const effectiveMaxPlayers = parsedMaxPlayers ?? PLAYER_MIN;
  const canDecreaseMaxPlayers = effectiveMaxPlayers > PLAYER_MIN;
  const canIncreaseMaxPlayers = effectiveMaxPlayers < PLAYER_MAX;
  const isLeaderboardSettingsLocked = isLeaderboardRoom;
  const isQuestionCountLocked = isLeaderboardSettingsLocked;
  const hasPinLengthError =
    pinValidationAttempted &&
    isPinProtectionOpen &&
    roomPasswordInput.length !== 4;
  const pinTooltipOpen = hasPinLengthError;
  const playDurationMarks = [
    { value: PLAY_DURATION_MIN, label: `${PLAY_DURATION_MIN}s` },
    { value: 30, label: "30s" },
    { value: 60, label: "60s" },
    { value: PLAY_DURATION_MAX, label: `${PLAY_DURATION_MAX}s` },
  ];
  const startOffsetMarks = [
    { value: START_OFFSET_MIN, label: "0s" },
    { value: 60, label: "1m" },
    { value: 180, label: "3m" },
    { value: 300, label: "5m" },
    { value: START_OFFSET_MAX, label: "10m" },
  ];
  const controlSliderSx = {
    height: 8,
    py: 1.5,
    "& .MuiSlider-rail": {
      height: 10,
      borderRadius: 999,
      backgroundColor: "rgba(148,163,184,0.22)",
      opacity: 1,
    },
    "& .MuiSlider-track": {
      height: 10,
      borderRadius: 999,
      background:
        "linear-gradient(90deg, rgba(34,211,238,0.88), rgba(52,211,153,0.82))",
      border: "none",
    },
    "& .MuiSlider-thumb": {
      width: 28,
      height: 28,
      border: "2px solid rgba(226,232,240,0.95)",
      backgroundColor: "#0f172a",
      boxShadow: "0 10px 24px -14px rgba(34,211,238,0.9)",
      "&:hover, &.Mui-focusVisible": {
        boxShadow: "0 0 0 8px rgba(34,211,238,0.12)",
      },
    },
  };

  const leaderboardLockedOverlay = isLeaderboardSettingsLocked ? (
    <div
      aria-hidden="true"
      className="pointer-events-auto absolute inset-0 z-20 flex cursor-not-allowed items-center justify-center rounded-2xl border border-amber-200/18 bg-slate-950/62 px-4 backdrop-blur-[2px]"
    >
      <div className="inline-flex items-center gap-3 rounded-2xl border border-amber-200/24 bg-amber-300/12 px-4 py-3 text-amber-50 shadow-[0_18px_34px_-28px_rgba(251,191,36,0.72)]">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-100/24 bg-amber-200/14">
          <LockOutlined sx={{ fontSize: 18 }} />
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

  const playbackExtensionOptions: Array<{
    key: PlaybackExtensionMode;
    label: string;
    hint: string;
  }> = [
    { key: "manual_vote", label: "投票延長", hint: "玩家投票決定是否延長播放" },
    { key: "auto_once", label: "自動延長一次", hint: "時間到時自動延長一次" },
    { key: "disabled", label: "不開放延長", hint: "歌曲結束後直接進入結算" },
  ];

  return (
    <div className="space-y-4">
      <section className="px-1 py-1">
        <div className="rounded-2xl border border-white/8 bg-white/[0.035] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center text-cyan-100">
                <EditNoteRounded sx={{ fontSize: 21 }} />
              </span>
              <p className="text-sm font-semibold text-[var(--mc-text)]">
                房間資訊
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isPrivateRoom}
              onClick={() =>
                setRoomVisibilityInput(isPrivateRoom ? "public" : "private")
              }
              className="inline-flex items-center gap-2 px-1 py-1 transition"
            >
              {isPrivateRoom ? (
                <LockRounded sx={{ fontSize: 16, color: "#fbbf24" }} />
              ) : (
                <PublicOutlined sx={{ fontSize: 16, color: "#7dd3fc" }} />
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
              value={roomNameInput}
              onChange={(event) => setRoomNameInput(event.target.value)}
            />

            <div className="rounded-xl border border-white/8 bg-slate-950/18 px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <PinOutlined sx={{ fontSize: 17, color: "#fbbf24" }} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--mc-text)]">
                      密碼保護
                    </p>
                  </div>
                  <div
                    className={`ml-1 w-[108px] max-w-full transition sm:w-[132px] ${
                      isPinProtectionOpen
                        ? "opacity-100"
                        : "pointer-events-none opacity-0"
                    }`}
                  >
                    <Tooltip
                      title="請輸入 4 位數 PIN"
                      open={pinTooltipOpen}
                      placement="top"
                      arrow
                    >
                      <span className="block">
                        <TextField
                          variant="standard"
                          size="small"
                          fullWidth
                          disabled={!isPinProtectionOpen}
                          placeholder="4 位數 PIN"
                          autoComplete="off"
                          value={roomPasswordInput}
                          error={hasPinLengthError}
                          onChange={(event) =>
                            setRoomPasswordInput(
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
                      </span>
                    </Tooltip>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isPinProtectionOpen}
                  onClick={() => {
                    if (isPinProtectionOpen) {
                      setRoomPasswordInput("");
                      setIsPinProtectionEnabled(false);
                      return;
                    }
                    setIsPinProtectionEnabled(true);
                  }}
                  className="inline-flex shrink-0 items-center px-0.5 py-1 transition"
                >
                  <span
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition ${
                      isPinProtectionOpen
                        ? "border-emerald-300/40 bg-emerald-300/18"
                        : "border-white/10 bg-white/5"
                    }`}
                  >
                    <span
                      className={`absolute top-1/2 h-[18px] w-[18px] -translate-y-1/2 rounded-full shadow-[0_10px_22px_-16px_rgba(15,23,42,0.95)] transition ${
                        isPinProtectionOpen
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
      </section>

      <section className="px-1 py-2">
        <div className="flex items-center gap-2">
          <CelebrationRounded sx={{ fontSize: 18, color: "#34d399" }} />
          <p className="text-sm font-semibold text-[var(--mc-text)]">
            房間模式
          </p>
        </div>

        <div
          className={`mt-3 grid gap-2 ${
            showLeaderboardMode ? "sm:grid-cols-2" : ""
          }`}
        >
          <button
            type="button"
            onClick={() => setRoomPlayMode("casual")}
            className={`rounded-2xl border px-3 py-3 text-left transition ${
              !isLeaderboardRoom
                ? "border-emerald-300/45 bg-emerald-400/12 text-emerald-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                : "border-white/8 bg-white/5 text-[var(--mc-text-muted)] hover:border-emerald-300/28 hover:bg-white/[0.07] hover:text-[var(--mc-text)]"
            }`}
          >
            <div className="flex items-start gap-3">
              <span
                className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                  !isLeaderboardRoom
                    ? "border-emerald-200/24 bg-emerald-300/14 text-emerald-100"
                    : "border-white/10 bg-slate-950/35 text-slate-300"
                }`}
              >
                <CelebrationRounded sx={{ fontSize: 18 }} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">休閒派對</span>
                <span className="mt-1 block text-xs leading-5 opacity-80">
                  自由調整題數、人數與播放節奏。
                </span>
              </span>
            </div>
          </button>

          {showLeaderboardMode ? (
            <div
            className={`relative rounded-2xl border px-3 py-3 transition ${
              isLeaderboardRoom && isLeaderboardChallengeAvailable
                ? "border-amber-300/38 bg-amber-300/10 text-amber-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                : "border-white/8 bg-white/5 text-[var(--mc-text-muted)] hover:border-amber-300/28 hover:bg-white/[0.07]"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                disabled={!isLeaderboardChallengeAvailable}
                onClick={() => {
                  if (!isLeaderboardChallengeAvailable) return;
                  setRoomPlayMode("leaderboard");
                }}
                className="flex min-w-0 flex-1 items-start gap-3 text-left disabled:cursor-not-allowed"
              >
                <span
                  className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                    isLeaderboardRoom && isLeaderboardChallengeAvailable
                      ? "border-amber-200/24 bg-amber-300/14 text-amber-100"
                      : "border-white/10 bg-slate-950/35 text-slate-300"
                  }`}
                >
                  <EmojiEventsRounded sx={{ fontSize: 18 }} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">
                    排行挑戰
                  </span>
                  <span className="mt-1 block text-xs leading-5 opacity-80">
                    {activeLeaderboardModeDescription}
                  </span>
                </span>
              </button>

              {isLeaderboardChallengeAvailable ? (
                <div
                  className="relative shrink-0"
                  onBlur={(event) => {
                    if (
                      !event.currentTarget.contains(
                        event.relatedTarget as Node | null,
                      )
                    ) {
                      setIsLeaderboardSpecMenuOpen(false);
                    }
                  }}
                >
                  <button
                    type="button"
                    aria-haspopup="listbox"
                    aria-expanded={isLeaderboardSpecMenuOpen}
                    onClick={() =>
                      setIsLeaderboardSpecMenuOpen((current) => !current)
                    }
                    className={`inline-flex h-10 w-[124px] items-center justify-between gap-2.5 rounded-xl border px-3 text-left text-sm font-semibold outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:border-amber-100/36 hover:bg-slate-950/44 focus:border-amber-100/50 focus:ring-2 focus:ring-amber-200/10 ${
                      isLeaderboardRoom
                        ? "border-amber-100/22 bg-[linear-gradient(180deg,rgba(15,23,42,0.62),rgba(2,6,23,0.44))] text-amber-50"
                        : "border-white/10 bg-slate-950/30 text-amber-100/86"
                    }`}
                  >
                    <span className="min-w-0 truncate">
                      {activeLeaderboardOption.label}
                    </span>
                    <KeyboardArrowDownRounded
                      sx={{ fontSize: 19 }}
                      className={`shrink-0 text-amber-100/72 transition ${
                        isLeaderboardSpecMenuOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {isLeaderboardSpecMenuOpen ? (
                    <div className="absolute right-0 top-[calc(100%+0.45rem)] z-30 w-[216px] max-w-[calc(100vw-3rem)] overflow-hidden rounded-2xl border border-amber-100/20 bg-slate-950/96 p-2 shadow-[0_22px_50px_-28px_rgba(251,191,36,0.72),0_18px_36px_-28px_rgba(2,6,23,0.95)] backdrop-blur-xl">
                      <div
                        role="listbox"
                        aria-label="挑戰規格"
                        className="space-y-1"
                      >
                        {leaderboardChallengeGroups.map((group) => (
                          <div key={group.modeKey}>
                            <div className="px-3 pb-1 pt-1.5 text-[10px] font-semibold tracking-[0.16em] text-amber-100/45">
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
                                    onMouseDown={(event) =>
                                      event.preventDefault()
                                    }
                                    onClick={() => {
                                      setRoomPlayMode("leaderboard");
                                      onLeaderboardSelectionChange(
                                        option.modeKey,
                                        option.variantKey,
                                      );
                                      setIsLeaderboardSpecMenuOpen(false);
                                    }}
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
                                    {selected ? (
                                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-200" />
                                    ) : null}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
            {!isLeaderboardChallengeAvailable ? (
              <div className="absolute inset-0 z-10 flex items-center justify-end rounded-2xl bg-slate-950/66 px-3 backdrop-blur-[2px]">
                <div className="inline-flex max-w-[13rem] items-center gap-2 rounded-xl border border-amber-100/18 bg-slate-950/84 px-3 py-2 text-xs font-semibold text-amber-50 shadow-[0_16px_34px_-24px_rgba(251,191,36,0.72)]">
                  <LockOutlined sx={{ fontSize: 16 }} />
                  <span className="leading-5">僅公開收藏庫可用</span>
                </div>
              </div>
            ) : null}
            </div>
          ) : null}
        </div>
      </section>

      <section className="px-1 py-2">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="relative select-none overflow-hidden rounded-2xl px-1 py-2">
            <div className="flex items-center justify-between gap-3">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--mc-text)]">
                <GroupsRounded sx={{ fontSize: 18, color: "#7dd3fc" }} />
                人數限制
              </p>
              <span className="text-[11px] text-[var(--mc-text-muted)]">
                {PLAYER_MIN}-{PLAYER_MAX} 人
              </span>
            </div>
            <div className="mt-5 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() =>
                  setRoomMaxPlayersInput(
                    String(Math.max(PLAYER_MIN, effectiveMaxPlayers - 1)),
                  )
                }
                disabled={!canDecreaseMaxPlayers}
                className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border transition ${
                  canDecreaseMaxPlayers
                    ? "border-[var(--mc-border)] bg-[var(--mc-surface)]/35 text-[var(--mc-text)] hover:border-cyan-300/35 hover:text-cyan-100"
                    : "cursor-not-allowed border-white/8 bg-white/5 text-[var(--mc-text-muted)]/50"
                }`}
              >
                <RemoveRounded sx={{ fontSize: 18 }} />
              </button>
              <div className="text-2xl font-semibold text-[var(--mc-text)]">
                {effectiveMaxPlayers}
                <span className="ml-1 text-sm text-[var(--mc-text-muted)]">
                  人
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  setRoomMaxPlayersInput(
                    String(Math.min(PLAYER_MAX, effectiveMaxPlayers + 1)),
                  )
                }
                disabled={!canIncreaseMaxPlayers}
                className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border transition ${
                  canIncreaseMaxPlayers
                    ? "border-[var(--mc-border)] bg-[var(--mc-surface)]/35 text-[var(--mc-text)] hover:border-cyan-300/35 hover:text-cyan-100"
                    : "cursor-not-allowed border-white/8 bg-white/5 text-[var(--mc-text-muted)]/50"
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
                    onClick={() => setRoomMaxPlayersInput(String(count))}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      effectiveMaxPlayers === count
                        ? "border-cyan-300/60 bg-cyan-500/12 text-cyan-50"
                        : "border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/35 text-[var(--mc-text-muted)] hover:border-cyan-300/35 hover:text-[var(--mc-text)]"
                    }`}
                  >
                    {count} 人
                  </button>
                ))}
            </div>
          </div>

          <div className="relative select-none overflow-hidden rounded-2xl px-1 py-2">
            <div className="flex items-center justify-between gap-3">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--mc-text)]">
                <QuizRounded sx={{ fontSize: 18, color: "#fbbf24" }} />
                題數
              </p>
              <span className="text-[11px] text-[var(--mc-text-muted)]">
                {questionMin}-{questionMaxLimit} 題
              </span>
            </div>
            <div
              className={`mt-5 flex items-center justify-between gap-3 ${
                isLeaderboardSettingsLocked ? "opacity-60" : ""
              }`}
            >
              <button
                type="button"
                aria-label="減少 1 題"
                onClick={() =>
                  updateQuestionCount(Math.max(questionMin, questionCount - 1))
                }
                disabled={isQuestionCountLocked || !canDecreaseQuestionCount}
                className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border transition ${
                  !isQuestionCountLocked && canDecreaseQuestionCount
                    ? "border-[var(--mc-border)] bg-[var(--mc-surface)]/35 text-[var(--mc-text)] hover:border-cyan-300/35 hover:text-cyan-100"
                    : "cursor-not-allowed border-white/8 bg-white/5 text-[var(--mc-text-muted)]/50"
                }`}
              >
                <RemoveRounded sx={{ fontSize: 18 }} />
              </button>
              <div className="text-2xl font-semibold text-[var(--mc-text)]">
                {questionCount}
                <span className="ml-1 text-sm text-[var(--mc-text-muted)]">
                  題
                </span>
              </div>
              <button
                type="button"
                aria-label="增加 1 題"
                onClick={() =>
                  updateQuestionCount(
                    Math.min(questionMaxLimit, questionCount + 1),
                  )
                }
                disabled={isQuestionCountLocked || !canIncreaseQuestionCount}
                className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border transition ${
                  !isQuestionCountLocked && canIncreaseQuestionCount
                    ? "border-[var(--mc-border)] bg-[var(--mc-surface)]/35 text-[var(--mc-text)] hover:border-cyan-300/35 hover:text-cyan-100"
                    : "cursor-not-allowed border-white/8 bg-white/5 text-[var(--mc-text-muted)]/50"
                }`}
              >
                <AddRounded sx={{ fontSize: 18 }} />
              </button>
            </div>
            <div
              className={`mt-4 flex flex-wrap justify-center gap-2 ${
                isLeaderboardSettingsLocked ? "opacity-60" : ""
              }`}
            >
              <button
                type="button"
                onClick={() =>
                  updateQuestionCount(
                    Math.max(questionMin, questionCount - QUESTION_STEP),
                  )
                }
                disabled={isQuestionCountLocked || !canDecreaseQuestionCount}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  !isQuestionCountLocked && canDecreaseQuestionCount
                    ? "border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/35 text-[var(--mc-text-muted)] hover:border-cyan-300/35 hover:text-[var(--mc-text)]"
                    : "cursor-not-allowed border-white/8 bg-white/5 text-[var(--mc-text-muted)]/50"
                }`}
              >
                -{QUESTION_STEP}
              </button>
              {[10, 15, 20].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => updateQuestionCount(count)}
                  disabled={isQuestionCountLocked}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    questionCount === count
                      ? "border-cyan-300/60 bg-cyan-500/12 text-cyan-50"
                      : "border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/35 text-[var(--mc-text-muted)] hover:border-cyan-300/35 hover:text-[var(--mc-text)]"
                  }`}
                >
                  {count} 題
                </button>
              ))}
              <button
                type="button"
                onClick={() =>
                  updateQuestionCount(
                    Math.min(questionMaxLimit, questionCount + QUESTION_STEP),
                  )
                }
                disabled={isQuestionCountLocked || !canIncreaseQuestionCount}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  !isQuestionCountLocked && canIncreaseQuestionCount
                    ? "border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/35 text-[var(--mc-text-muted)] hover:border-cyan-300/35 hover:text-[var(--mc-text)]"
                    : "cursor-not-allowed border-white/8 bg-white/5 text-[var(--mc-text-muted)]/50"
                }`}
              >
                +{QUESTION_STEP}
              </button>
            </div>
            {leaderboardLockedOverlay}
          </div>
        </div>
      </section>

      <section className="relative select-none overflow-hidden rounded-2xl px-1 py-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <TimerRounded sx={{ fontSize: 18, color: "#c084fc" }} />
            <p className="text-sm font-semibold text-[var(--mc-text)]">
              遊戲節奏
            </p>
          </div>
          {supportsCollectionClipTiming ? (
            <button
              type="button"
              role="switch"
              aria-checked={allowCollectionClipTiming}
              disabled={isLeaderboardSettingsLocked}
              onClick={() =>
                updateAllowCollectionClipTiming(!allowCollectionClipTiming)
              }
              className="inline-flex items-center gap-2 px-1 py-1.5 transition disabled:cursor-not-allowed"
            >
              <TuneRounded sx={{ fontSize: 16, color: "#34d399" }} />
              <span className="hidden text-xs font-semibold text-emerald-100 sm:inline">
                使用收藏庫片段
              </span>
              <span
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition ${
                  allowCollectionClipTiming
                    ? "border-emerald-300/40 bg-emerald-300/18"
                    : "border-white/10 bg-white/5"
                }`}
              >
                <span
                  className={`absolute top-1/2 h-[18px] w-[18px] -translate-y-1/2 rounded-full shadow-[0_10px_22px_-16px_rgba(15,23,42,0.95)] transition ${
                    allowCollectionClipTiming
                      ? "left-[1.3rem] bg-emerald-200"
                      : "left-1 bg-slate-200"
                  }`}
                />
              </span>
            </button>
          ) : null}
        </div>

        <div
          className={`mt-4 grid gap-4 lg:grid-cols-2 ${
            isLeaderboardSettingsLocked
              ? "pointer-events-none opacity-55 saturate-75"
              : ""
          }`}
        >
          <div>
            <div className="rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/25 p-3">
              {supportsCollectionClipTiming ? (
                <>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      {allowCollectionClipTiming ? (
                        <TuneRounded sx={{ fontSize: 18, color: "#34d399" }} />
                      ) : (
                        <TimerRounded sx={{ fontSize: 18, color: "#7dd3fc" }} />
                      )}
                      <p className="text-sm font-semibold text-[var(--mc-text)]">
                        {allowCollectionClipTiming ? "收藏庫片段" : "手動節奏"}
                      </p>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-[var(--mc-text-muted)]">
                    {allowCollectionClipTiming
                      ? "建立房間時使用目前題庫裡設定好的播放起始與作答秒數。"
                      : "已改為手動設定作答時間與起始秒數。"}
                  </p>
                </>
              ) : null}

              {allowCollectionClipTiming ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    disabled={isLeaderboardSettingsLocked}
                    onClick={() => updateAllowCollectionClipTiming(false)}
                    className="rounded-xl border border-white/8 bg-white/5 px-3 py-2 text-left transition hover:border-emerald-300/35 hover:bg-white/[0.07] disabled:cursor-not-allowed"
                  >
                    <p className="text-sm font-semibold text-emerald-100">
                      作答時間 · 依題庫設定
                    </p>
                    <p className="mt-1 text-[11px] text-[var(--mc-text-muted)]">
                      點擊改為手動設定
                    </p>
                  </button>
                  <button
                    type="button"
                    disabled={isLeaderboardSettingsLocked}
                    onClick={() => updateAllowCollectionClipTiming(false)}
                    className="rounded-xl border border-white/8 bg-white/5 px-3 py-2 text-left transition hover:border-emerald-300/35 hover:bg-white/[0.07] disabled:cursor-not-allowed"
                  >
                    <p className="text-sm font-semibold text-emerald-100">
                      起始秒數 · 依題庫設定
                    </p>
                    <p className="mt-1 text-[11px] text-[var(--mc-text-muted)]">
                      點擊改為手動設定
                    </p>
                  </button>
                </div>
              ) : (
                <div className="mt-3 grid gap-3">
                  <div className="rounded-2xl border border-white/8 bg-white/5 px-3 py-3">
                    <div className="flex items-center gap-2">
                      <PlayCircleOutlineRounded
                        sx={{ fontSize: 18, color: "#7dd3fc" }}
                      />
                      <p className="text-sm font-semibold text-[var(--mc-text)]">
                        作答時間
                      </p>
                    </div>
                    <p className="mt-2 text-xs text-[var(--mc-text-muted)]">
                      每題開始播放後，玩家可以作答的秒數。
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        disabled={isLeaderboardSettingsLocked}
                        onClick={() =>
                          updatePlayDurationSec(
                            Math.max(PLAY_DURATION_MIN, playDurationSec - 1),
                          )
                        }
                        className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200 transition hover:border-cyan-300/35 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <RemoveRounded sx={{ fontSize: 16 }} />
                      </button>
                      <div className="text-xl font-semibold text-[var(--mc-text)]">
                        {playDurationSec}s
                      </div>
                      <button
                        type="button"
                        disabled={isLeaderboardSettingsLocked}
                        onClick={() =>
                          updatePlayDurationSec(
                            Math.min(PLAY_DURATION_MAX, playDurationSec + 1),
                          )
                        }
                        className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200 transition hover:border-cyan-300/35 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <AddRounded sx={{ fontSize: 16 }} />
                      </button>
                    </div>
                    <div className="mt-2 px-2 pb-3">
                      <Slider
                        value={playDurationSec}
                        min={PLAY_DURATION_MIN}
                        max={PLAY_DURATION_MAX}
                        step={1}
                        shiftStep={5}
                        marks={playDurationMarks}
                        disabled={isLeaderboardSettingsLocked}
                        sx={controlSliderSx}
                        onChange={(_event, value) =>
                          updatePlayDurationSec(
                            Array.isArray(value) ? value[0] : value,
                          )
                        }
                        valueLabelDisplay="off"
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/8 bg-white/5 px-3 py-3">
                    <div className="flex items-center gap-2">
                      <ScheduleRounded sx={{ fontSize: 18, color: "#c084fc" }} />
                      <p className="text-sm font-semibold text-[var(--mc-text)]">
                        起始秒數
                      </p>
                    </div>
                    <p className="mt-2 text-xs text-[var(--mc-text-muted)]">
                      從歌曲的第幾秒開始播放，讓玩家從指定片段開始作答。
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        disabled={isLeaderboardSettingsLocked}
                        onClick={() =>
                          updateStartOffsetSec(
                            Math.max(START_OFFSET_MIN, startOffsetSec - 5),
                          )
                        }
                        className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200 transition hover:border-cyan-300/35 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <RemoveRounded sx={{ fontSize: 16 }} />
                      </button>
                      <div className="text-xl font-semibold text-[var(--mc-text)]">
                        {startOffsetSec}s
                      </div>
                      <button
                        type="button"
                        disabled={isLeaderboardSettingsLocked}
                        onClick={() =>
                          updateStartOffsetSec(
                            Math.min(START_OFFSET_MAX, startOffsetSec + 5),
                          )
                        }
                        className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200 transition hover:border-cyan-300/35 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <AddRounded sx={{ fontSize: 16 }} />
                      </button>
                    </div>
                    <div className="mt-2 px-2 pb-3">
                      <Slider
                        value={startOffsetSec}
                        min={START_OFFSET_MIN}
                        max={START_OFFSET_MAX}
                        step={1}
                        shiftStep={5}
                        marks={startOffsetMarks}
                        disabled={isLeaderboardSettingsLocked}
                        sx={controlSliderSx}
                        onChange={(_event, value) =>
                          updateStartOffsetSec(
                            Array.isArray(value) ? value[0] : value,
                          )
                        }
                        valueLabelDisplay="off"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/25 p-4">
              <div className="flex items-center gap-2">
                <AccessTimeRounded sx={{ fontSize: 18, color: "#fbbf24" }} />
                <p className="text-sm font-semibold text-[var(--mc-text)]">
                  公布答案
                </p>
              </div>
              <p className="mt-3 text-xs text-[var(--mc-text-muted)]">
                題目結束後保留給大家查看答案的時間。
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
                  shiftStep={1}
                  disabled={isLeaderboardSettingsLocked}
                  sx={controlSliderSx}
                  onChange={(_event, value) =>
                    updateRevealDurationSec(
                      Array.isArray(value) ? value[0] : value,
                    )
                  }
                  valueLabelDisplay="off"
                />
              </div>
            </div>
          </div>
        </div>

        <div
          className={`mt-4 rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/25 p-4 ${
            isLeaderboardSettingsLocked
              ? "pointer-events-none opacity-55 saturate-75"
              : ""
          }`}
        >
          <div className="flex items-center gap-2">
            <TuneRounded sx={{ fontSize: 18, color: "#34d399" }} />
            <p className="text-sm font-semibold text-[var(--mc-text)]">
              投票設定
            </p>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {playbackExtensionOptions.map((option) => {
              const selected = playbackExtensionMode === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  disabled={isLeaderboardSettingsLocked}
                  onClick={() => setPlaybackExtensionMode(option.key)}
                  className={`rounded-xl border px-3 py-2.5 text-left transition ${
                    selected
                      ? "border-amber-300/45 bg-amber-300/12 text-amber-50"
                      : "border-white/8 bg-white/5 text-slate-300 hover:border-amber-300/28 hover:bg-white/[0.07]"
                  }`}
                >
                  <span className="block text-sm font-semibold">
                    {option.label}
                  </span>
                  <span className="mt-1 block text-[11px] leading-4 text-slate-400">
                    {option.hint}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        {leaderboardLockedOverlay}
      </section>
    </div>
  );
};

export default RoomSetupPanel;
