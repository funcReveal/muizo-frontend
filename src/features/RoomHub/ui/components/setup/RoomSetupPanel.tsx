import { useState } from "react";

import { Slider, TextField } from "@mui/material";
import {
  AccessTimeRounded,
  AddRounded,
  GroupsRounded,
  LockRounded,
  MeetingRoomRounded,
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
  REVEAL_DURATION_MAX,
  REVEAL_DURATION_MIN,
  START_OFFSET_MAX,
  START_OFFSET_MIN,
} from "@domain/room/constants";
import type { CreateSettingsCard, SourceSummary } from "../../roomsHubViewModels";

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
  createRecommendationHintText: string | null;
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
    <div className="space-y-4">
      <section className="px-1 py-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
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
            className="inline-flex items-center gap-1.5 px-1 py-1 transition"
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

        <div className="mt-2 space-y-2">
          <TextField
            size="small"
            variant="standard"
            fullWidth
            label="房間名稱"
            value={roomNameInput}
            onChange={(event) => setRoomNameInput(event.target.value)}
          />

          <div className="px-1 py-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                <PinOutlined sx={{ fontSize: 18, color: "#fbbf24" }} />
                <p className="text-sm font-semibold text-[var(--mc-text)]">
                  密碼保護
                </p>
                {isPinProtectionOpen ? (
                  <div className="w-[108px] max-w-full sm:w-[132px]">
                    <TextField
                      variant="standard"
                      size="small"
                      fullWidth
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
                className="ml-auto inline-flex shrink-0 items-center gap-1.5 px-1 py-1 transition"
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
              <p className="mt-1 text-right text-[11px] text-[#f87171]">
                PIN 必須為 4 位數
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="px-1 py-2">
        <div className="grid gap-5 lg:grid-cols-2">
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
                  updateQuestionCount(Math.max(questionMin, questionCount - 1))
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

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <div className="rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/25 p-4">
              {supportsCollectionClipTiming ? (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <TuneRounded sx={{ fontSize: 18, color: "#34d399" }} />
                      <p className="text-sm font-semibold text-[var(--mc-text)]">
                        沿用收藏庫片段時間
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={allowCollectionClipTiming}
                      onClick={() =>
                        updateAllowCollectionClipTiming(!allowCollectionClipTiming)
                      }
                      className="inline-flex items-center gap-2 px-1 py-1.5 transition"
                    >
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
                  </div>
                  <p className="mt-3 text-xs text-[var(--mc-text-muted)]">
                    建立房間時使用目前題庫裡設定好的播放起始與作答秒數。
                  </p>
                </>
              ) : null}

              {allowCollectionClipTiming ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => updateAllowCollectionClipTiming(false)}
                    className="rounded-2xl border border-white/8 bg-white/5 px-3 py-3 text-left transition hover:border-emerald-300/35 hover:bg-white/[0.07]"
                  >
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--mc-text-muted)]">
                      作答時間
                    </p>
                    <p className="mt-1 text-sm font-semibold text-emerald-100">
                      依題庫設定
                    </p>
                    <p className="mt-2 text-[11px] text-[var(--mc-text-muted)]">
                      點擊後改為手動設定
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateAllowCollectionClipTiming(false)}
                    className="rounded-2xl border border-white/8 bg-white/5 px-3 py-3 text-left transition hover:border-emerald-300/35 hover:bg-white/[0.07]"
                  >
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--mc-text-muted)]">
                      起始秒數
                    </p>
                    <p className="mt-1 text-sm font-semibold text-emerald-100">
                      依題庫設定
                    </p>
                    <p className="mt-2 text-[11px] text-[var(--mc-text-muted)]">
                      點擊後改為手動設定
                    </p>
                  </button>
                </div>
              ) : (
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-white/8 bg-white/5 px-3 py-3">
                    <div className="flex items-center gap-2">
                      <PlayCircleOutlineRounded
                        sx={{ fontSize: 18, color: "#7dd3fc" }}
                      />
                      <p className="text-sm font-semibold text-[var(--mc-text)]">
                        作答時間
                      </p>
                    </div>
                    <p className="mt-3 text-xs text-[var(--mc-text-muted)]">
                      每題開始播放後，玩家可以作答的秒數。
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

                  <div className="rounded-2xl border border-white/8 bg-white/5 px-3 py-3">
                    <div className="flex items-center gap-2">
                      <ScheduleRounded sx={{ fontSize: 18, color: "#c084fc" }} />
                      <p className="text-sm font-semibold text-[var(--mc-text)]">
                        起始秒數
                      </p>
                    </div>
                    <p className="mt-3 text-xs text-[var(--mc-text-muted)]">
                      從歌曲的第幾秒開始播放，讓玩家從指定片段開始作答。
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
    </div>
  );
};

export default RoomSetupPanel;
