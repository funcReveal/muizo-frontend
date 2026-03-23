import { useState } from "react";

import { Button, Skeleton, Slider, TextField } from "@mui/material";
import {
  AccessTimeRounded,
  AddRounded,
  GroupsRounded,
  LockRounded,
  MeetingRoomRounded,
  PinOutlined,
  RemoveRounded,
  PlayCircleOutlineRounded,
  PublicOutlined,
  QuizRounded,
  ScheduleRounded,
  TimerRounded,
  TuneRounded,
} from "@mui/icons-material";

import {
  PLAYER_MAX,
  PLAYER_MIN,
  PLAY_DURATION_MAX,
  PLAY_DURATION_MIN,
  REVEAL_DURATION_MAX,
  REVEAL_DURATION_MIN,
  START_OFFSET_MAX,
  START_OFFSET_MIN,
} from "../../../../model/roomConstants";
import type {
  CreateSettingsCard,
  SourceSummary,
} from "../../roomsHubViewModels";

type RoomSetupPanelProps = {
  roomNameInput: string;
  setRoomNameInput: (value: string) => void;
  roomVisibilityInput: "public" | "private";
  setRoomVisibilityInput: (value: "public" | "private") => void;
  roomPasswordInput: string;
  setRoomPasswordInput: (value: string) => void;
  setRoomMaxPlayersInput: (value: string) => void;
  parsedMaxPlayers: number | null;
  questionCount: number;
  questionMin: number;
  questionMaxLimit: number;
  updateQuestionCount: (value: number) => void;
  playDurationSec: number;
  revealDurationSec: number;
  startOffsetSec: number;
  allowCollectionClipTiming: boolean;
  updatePlayDurationSec: (value: number) => number;
  updateRevealDurationSec: (value: number) => number;
  updateStartOffsetSec: (value: number) => number;
  updateAllowCollectionClipTiming: (value: boolean) => boolean;
  supportsCollectionClipTiming: boolean;
  selectedCreateSourceSummary: SourceSummary;
  isSourceSummaryLoading: boolean;
  createSettingsCards: CreateSettingsCard[];
  createRequirementsHintText: string | null;
  canCreateRoom: boolean;
  isCreatingRoom: boolean;
  onCreateRoom: () => void;
};

const RoomSetupPanel = ({
  roomNameInput,
  setRoomNameInput,
  roomVisibilityInput,
  setRoomVisibilityInput,
  roomPasswordInput,
  setRoomPasswordInput,
  setRoomMaxPlayersInput,
  parsedMaxPlayers,
  questionCount,
  questionMin,
  questionMaxLimit,
  updateQuestionCount,
  playDurationSec,
  revealDurationSec,
  startOffsetSec,
  allowCollectionClipTiming,
  updatePlayDurationSec,
  updateRevealDurationSec,
  updateStartOffsetSec,
  updateAllowCollectionClipTiming,
  supportsCollectionClipTiming,
  selectedCreateSourceSummary,
  isSourceSummaryLoading,
  createSettingsCards,
  createRequirementsHintText,
  canCreateRoom,
  isCreatingRoom,
  onCreateRoom,
}: RoomSetupPanelProps) => {
  const isPrivateRoom = roomVisibilityInput === "private";
  const [isPinProtectionEnabled, setIsPinProtectionEnabled] = useState(
    () => roomPasswordInput.length > 0,
  );
  const isPinProtectionOpen =
    isPinProtectionEnabled || roomPasswordInput.length > 0;
  const effectiveMaxPlayers = parsedMaxPlayers ?? PLAYER_MIN;
  const canDecreaseMaxPlayers = effectiveMaxPlayers > PLAYER_MIN;
  const canIncreaseMaxPlayers = effectiveMaxPlayers < PLAYER_MAX;
  const canDecreaseQuestionCount = questionCount > questionMin;
  const canIncreaseQuestionCount = questionCount < questionMaxLimit;
  const hasPinLengthError =
    isPinProtectionOpen &&
    roomPasswordInput.length > 0 &&
    roomPasswordInput.length < 4;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_320px]">
        <div className="order-2 space-y-4 xl:order-none">
          <section className="px-1 py-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <MeetingRoomRounded sx={{ fontSize: 18, color: "#7dd3fc" }} />
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
                className="inline-flex items-center gap-2 px-1 py-1.5 transition"
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
            <div className="mt-3 space-y-3">
              <TextField
                size="small"
                variant="standard"
                fullWidth
                label="房間名稱"
                value={roomNameInput}
                onChange={(event) => setRoomNameInput(event.target.value)}
              />

              <div>
                <div className="px-1 py-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
                      <PinOutlined sx={{ fontSize: 18, color: "#fbbf24" }} />
                      <p className="text-sm font-semibold text-[var(--mc-text)]">
                        密碼保護
                      </p>
                      {isPinProtectionOpen ? (
                        <div className="w-[120px] max-w-full sm:w-[148px]">
                          <TextField
                            variant="standard"
                            size="small"
                            fullWidth
                            placeholder="4 位數字"
                            autoComplete="off"
                            value={roomPasswordInput}
                            error={hasPinLengthError}
                            onChange={(event) =>
                              setRoomPasswordInput(
                                event.target.value
                                  .replace(/\D/g, "")
                                  .slice(0, 4),
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
                      ) : null}
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
                      className="ml-auto inline-flex shrink-0 items-center gap-2 px-1 py-1.5 transition"
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
                  {isPinProtectionOpen && hasPinLengthError ? (
                    <p className="mt-2 text-right text-xs text-[#f87171]">
                      PIN ?? 4 ???
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </section>

          <section className="px-1 py-2">
            <div className="space-y-5">
              <div className="px-1 py-2">
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
                    .filter(
                      (count) => count >= PLAYER_MIN && count <= PLAYER_MAX,
                    )
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

              <div className="px-1 py-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--mc-text)]">
                    <QuizRounded sx={{ fontSize: 18, color: "#fbbf24" }} />
                    題數
                  </p>
                  <span className="text-[11px] text-[var(--mc-text-muted)]">
                    {questionMin}-{questionMaxLimit} 題
                  </span>
                </div>
                <div className="mt-5 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      updateQuestionCount(
                        Math.max(questionMin, questionCount - 1),
                      )
                    }
                    disabled={!canDecreaseQuestionCount}
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border transition ${
                      canDecreaseQuestionCount
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
                    onClick={() =>
                      updateQuestionCount(
                        Math.min(questionMaxLimit, questionCount + 1),
                      )
                    }
                    disabled={!canIncreaseQuestionCount}
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border transition ${
                      canIncreaseQuestionCount
                        ? "border-[var(--mc-border)] bg-[var(--mc-surface)]/35 text-[var(--mc-text)] hover:border-cyan-300/35 hover:text-cyan-100"
                        : "cursor-not-allowed border-white/8 bg-white/5 text-[var(--mc-text-muted)]/50"
                    }`}
                  >
                    <AddRounded sx={{ fontSize: 18 }} />
                  </button>
                </div>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {[10, 15, 20].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => updateQuestionCount(count)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
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
            </div>
          </section>

          <section className="px-1 py-2">
            <div className="flex items-center gap-2">
              <TimerRounded sx={{ fontSize: 18, color: "#c084fc" }} />
              <p className="text-sm font-semibold text-[var(--mc-text)]">
                遊戲節奏
              </p>
            </div>
            <div className="mt-4 space-y-4">
              <button
                type="button"
                role="switch"
                aria-checked={allowCollectionClipTiming}
                aria-disabled={!supportsCollectionClipTiming}
                onClick={() => {
                  if (!supportsCollectionClipTiming) return;
                  updateAllowCollectionClipTiming(!allowCollectionClipTiming);
                }}
                className={`w-full rounded-2xl px-1 py-2 text-left transition ${
                  supportsCollectionClipTiming
                    ? "bg-transparent hover:bg-white/0"
                    : "cursor-not-allowed opacity-60"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--mc-text)]">
                      沿用收藏庫片段時間
                    </p>
                    <p className="mt-1 text-xs text-[var(--mc-text-muted)]">
                      {supportsCollectionClipTiming
                        ? "建立房間時使用目前題庫裡選擇的播放與起始秒數。"
                        : "只有收藏庫來源能沿用片段時間；YouTube 與貼上連結不支援。"}
                    </p>
                  </div>
                  <span className="inline-flex items-center self-center">
                    <span
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition ${
                        allowCollectionClipTiming &&
                        supportsCollectionClipTiming
                          ? "border-emerald-300/40 bg-emerald-300/18"
                          : "border-white/10 bg-white/5"
                      }`}
                    >
                      <span
                        className={`absolute top-1/2 h-[18px] w-[18px] -translate-y-1/2 rounded-full shadow-[0_10px_22px_-16px_rgba(15,23,42,0.95)] transition ${
                          allowCollectionClipTiming &&
                          supportsCollectionClipTiming
                            ? "left-[1.3rem] bg-emerald-200"
                            : "left-1 bg-slate-200"
                        }`}
                      />
                    </span>
                  </span>
                </div>
              </button>

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
                        sx={{ fontSize: 18, color: "#7dd3fc" }}
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
                            Array.isArray(value) ? value[0] : value,
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
                        <TuneRounded sx={{ fontSize: 18, color: "#6ee7b7" }} />
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
                {!allowCollectionClipTiming ? (
                  <div className="rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/25 p-4">
                    <div className="flex items-center gap-2">
                      <ScheduleRounded
                        sx={{ fontSize: 18, color: "#c084fc" }}
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
                            Array.isArray(value) ? value[0] : value,
                          )
                        }
                        valueLabelDisplay="auto"
                      />
                    </div>
                  </div>
                ) : null}

                <div className="rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/25 p-4">
                  <div className="flex items-center gap-2">
                    <AccessTimeRounded
                      sx={{ fontSize: 18, color: "#fbbf24" }}
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
                          Array.isArray(value) ? value[0] : value,
                        )
                      }
                      valueLabelDisplay="auto"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="px-1 py-2 xl:hidden">
            <div className="rounded-3xl border border-[var(--mc-border)] bg-[linear-gradient(180deg,rgba(8,15,28,0.96),rgba(15,23,42,0.82))] p-4 shadow-[0_24px_60px_-36px_rgba(14,165,233,0.35)]">
              <div className="rounded-2xl border border-white/8 bg-white/5 p-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--mc-text-muted)]">
                  房間名稱
                </p>
                <p
                  className="mt-2 truncate text-base font-semibold text-[var(--mc-text)]"
                  title={roomNameInput.trim() || "未命名房間"}
                >
                  {roomNameInput.trim() || "未命名房間"}
                </p>
              </div>

              <div className="mt-3">
                {isSourceSummaryLoading ? (
                  <div className="overflow-hidden rounded-2xl border border-cyan-300/18 bg-cyan-500/6">
                    <Skeleton
                      variant="rectangular"
                      animation="wave"
                      height={88}
                      sx={{ bgcolor: "rgba(148, 163, 184, 0.14)" }}
                    />
                  </div>
                ) : selectedCreateSourceSummary ? (
                  <div className="overflow-hidden rounded-2xl border border-cyan-300/18 bg-cyan-500/6">
                    <div className="flex items-center gap-3 p-3">
                      {selectedCreateSourceSummary.thumbnail ? (
                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-slate-950/35">
                          <img
                            src={selectedCreateSourceSummary.thumbnail}
                            alt={selectedCreateSourceSummary.title}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-200/80">
                          {selectedCreateSourceSummary.label}
                        </p>
                        <p
                          className="mt-1 truncate text-sm font-semibold text-[var(--mc-text)]"
                          title={selectedCreateSourceSummary.title}
                        >
                          {selectedCreateSourceSummary.title}
                        </p>
                        <p className="mt-1 text-xs text-[var(--mc-text-muted)]">
                          {selectedCreateSourceSummary.detail}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-cyan-300/25 bg-cyan-500/6 p-3 text-xs text-cyan-100/90">
                    尚未載入題庫資訊。
                  </div>
                )}
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {createSettingsCards.map((item) => (
                  <div
                    key={`compact-sidebar-${item.label}`}
                    className="rounded-2xl border border-white/8 bg-white/5 px-3 py-3"
                  >
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--mc-text-muted)]">
                      {item.label}
                    </p>
                    {item.label === "房間型態" && item.value.includes(" · ") ? (
                      <>
                        <p className="mt-1 text-sm font-semibold text-[var(--mc-text)]">
                          {item.value.split(" · ")[0]}
                        </p>
                        <p className="mt-1 text-xs text-[var(--mc-text-muted)]">
                          {item.value.split(" · ")[1]}
                        </p>
                      </>
                    ) : (
                      <p className="mt-1 text-sm font-semibold text-[var(--mc-text)]">
                        {item.value}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {createRequirementsHintText ? (
                <div className="mt-3 rounded-2xl border border-amber-300/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
                  {createRequirementsHintText}
                </div>
              ) : (
                <div className="mt-3 rounded-2xl border border-emerald-300/25 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-100">
                  可以建立房間了。
                </div>
              )}

              <Button
                variant="contained"
                fullWidth
                onClick={onCreateRoom}
                disabled={!canCreateRoom}
                className="mt-8"
              >
                {isCreatingRoom ? "建立房間中..." : "建立房間"}
              </Button>
            </div>
          </section>
        </div>

        <aside className="order-1 hidden space-y-4 xl:order-none xl:block xl:sticky xl:top-6 xl:self-start">
          <section className="rounded-3xl border border-[var(--mc-border)] bg-[linear-gradient(180deg,rgba(8,15,28,0.96),rgba(15,23,42,0.82))] p-5 shadow-[0_24px_60px_-36px_rgba(14,165,233,0.5)]">
            <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--mc-text-muted)]">
                房間名稱
              </p>
              <p
                className="mt-2 truncate text-lg font-semibold text-[var(--mc-text)]"
                title={roomNameInput.trim() || "未命名房間"}
              >
                {roomNameInput.trim() || "未命名房間"}
              </p>
            </div>
            <div className="mt-4 space-y-3">
              {isSourceSummaryLoading ? (
                <div className="overflow-hidden rounded-2xl border border-cyan-300/18 bg-cyan-500/6">
                  <Skeleton
                    variant="rectangular"
                    animation="wave"
                    height={112}
                    sx={{ bgcolor: "rgba(148, 163, 184, 0.14)" }}
                  />
                  <div className="p-3">
                    <Skeleton
                      variant="text"
                      animation="wave"
                      width="26%"
                      height={14}
                      sx={{ bgcolor: "rgba(148, 163, 184, 0.14)" }}
                    />
                    <div className="mt-1.5 space-y-1.5">
                      <Skeleton
                        variant="text"
                        animation="wave"
                        width="82%"
                        height={20}
                        sx={{ bgcolor: "rgba(148, 163, 184, 0.18)" }}
                      />
                      <Skeleton
                        variant="text"
                        animation="wave"
                        width="64%"
                        height={20}
                        sx={{ bgcolor: "rgba(148, 163, 184, 0.18)" }}
                      />
                    </div>
                    <Skeleton
                      variant="text"
                      animation="wave"
                      width="42%"
                      height={16}
                      sx={{
                        mt: 1,
                        bgcolor: "rgba(148, 163, 184, 0.14)",
                      }}
                    />
                    <p className="pt-2 text-xs text-cyan-100/80">
                      正在載入題庫資訊...
                    </p>
                  </div>
                </div>
              ) : selectedCreateSourceSummary ? (
                <div className="overflow-hidden rounded-2xl border border-cyan-300/18 bg-cyan-500/6">
                  {selectedCreateSourceSummary.thumbnail ? (
                    <div className="relative h-28 w-full overflow-hidden bg-slate-950/40">
                      <img
                        src={selectedCreateSourceSummary.thumbnail}
                        alt={selectedCreateSourceSummary.title}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  ) : null}
                  <div className="p-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-200/80">
                        {selectedCreateSourceSummary.label}
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm font-semibold text-[var(--mc-text)]">
                        {selectedCreateSourceSummary.title}
                      </p>
                      <p className="mt-1 text-xs text-[var(--mc-text-muted)]">
                        {selectedCreateSourceSummary.detail}
                      </p>
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
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-slate-950/35">
                        {item.label === "房間型態" ? (
                          roomVisibilityInput === "private" ? (
                            <LockRounded
                              sx={{ fontSize: 16, color: "#fbbf24" }}
                            />
                          ) : (
                            <PublicOutlined
                              sx={{ fontSize: 16, color: "#7dd3fc" }}
                            />
                          )
                        ) : item.label === "玩家上限" ? (
                          <GroupsRounded
                            sx={{ fontSize: 16, color: "#7dd3fc" }}
                          />
                        ) : item.label === "題數" ? (
                          <QuizRounded
                            sx={{ fontSize: 16, color: "#fbbf24" }}
                          />
                        ) : (
                          <TimerRounded
                            sx={{ fontSize: 16, color: "#c084fc" }}
                          />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className="text-[11px] uppercase tracking-[0.18em] text-[var(--mc-text-muted)]">
                          {item.label}
                        </span>
                        {item.label === "房間型態" &&
                        item.value.includes(" · ") ? (
                          <>
                            <p className="mt-1 text-sm font-semibold text-[var(--mc-text)]">
                              {item.value.split(" · ")[0]}
                            </p>
                            <p className="mt-1 text-xs text-[var(--mc-text-muted)]">
                              {item.value.split(" · ")[1]}
                            </p>
                          </>
                        ) : (
                          <p className="mt-1 text-sm font-semibold text-[var(--mc-text)]">
                            {item.value}
                          </p>
                        )}
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
            <div className="mt-3">
              <Button
                variant="contained"
                fullWidth
                onClick={onCreateRoom}
                disabled={!canCreateRoom}
              >
                {isCreatingRoom ? "建立中..." : "建立房間"}
              </Button>
            </div>
            <p className="mt-3 text-center text-xs text-[var(--mc-text-muted)]">
              將建立
              {roomVisibilityInput === "private" ? "私人房" : "公開房"}
              {" · "}
              {parsedMaxPlayers ?? PLAYER_MIN} 人{" · "}
              {questionCount} 題
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default RoomSetupPanel;
