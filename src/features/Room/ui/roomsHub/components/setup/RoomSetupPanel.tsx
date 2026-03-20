import { Button, Slider, TextField } from "@mui/material";
import {
  AccessTimeRounded,
  BookmarkBorderRounded,
  EditRounded,
  GroupsRounded,
  LinkRounded,
  LockRounded,
  PasswordRounded,
  PlayCircleOutlineRounded,
  PublicOutlined,
  QuizRounded,
  ScheduleRounded,
  TimerRounded,
  TuneRounded,
  YouTube,
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
import type { RoomCreateSourceMode } from "../../../../model/RoomContext";
import type {
  CreatePresetCard,
  CreateSettingsCard,
  SourceSummary,
} from "../../roomsHubViewModels";

type RoomSetupPanelProps = {
  playlistItemsLength: number;
  activeCreatePreset: { label: string; hint: string } | null;
  createPresetCards: CreatePresetCard[];
  roomNameInput: string;
  setRoomNameInput: (value: string) => void;
  roomVisibilityInput: "public" | "private";
  setRoomVisibilityInput: (value: "public" | "private") => void;
  roomPasswordInput: string;
  setRoomPasswordInput: (value: string) => void;
  roomMaxPlayersInput: string;
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
  selectedCreateSourceSummary: SourceSummary;
  roomCreateSourceMode: RoomCreateSourceMode;
  createSettingsCards: CreateSettingsCard[];
  createRequirementsHintText: string | null;
  canCreateRoom: boolean;
  isCreatingRoom: boolean;
  onCreateRoom: () => void;
};

const RoomSetupPanel = ({
  playlistItemsLength,
  activeCreatePreset,
  createPresetCards,
  roomNameInput,
  setRoomNameInput,
  roomVisibilityInput,
  setRoomVisibilityInput,
  roomPasswordInput,
  setRoomPasswordInput,
  roomMaxPlayersInput,
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
  selectedCreateSourceSummary,
  roomCreateSourceMode,
  createSettingsCards,
  createRequirementsHintText,
  canCreateRoom,
  isCreatingRoom,
  onCreateRoom,
}: RoomSetupPanelProps) => {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.24em] text-[var(--mc-text-muted)]">
            房間設置
          </p>
          <h3 className="hidden">調整這場房間的規則與節奏</h3>
        </div>
        <div className="rounded-full border border-cyan-300/25 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-100">
          {playlistItemsLength > 0
            ? `已載入 ${playlistItemsLength} 首歌曲`
            : "尚未準備題庫"}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_320px]">
        <div className="order-2 space-y-4 xl:order-none">
          <section className="rounded-3xl border border-[var(--mc-border)] bg-[var(--mc-surface)]/35 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--mc-text)]">
                  快速預設
                </p>
                <p className="mt-1 text-xs text-[var(--mc-text-muted)]">
                  先選一組節奏，再微調題數與秒數。
                </p>
              </div>
              <span className="rounded-full border border-[var(--mc-border)] px-3 py-1 text-[11px] text-[var(--mc-text-muted)]">
                一鍵套用常用配置
              </span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {createPresetCards.map((preset) => (
                <button
                  key={preset.key}
                  type="button"
                  onClick={preset.onApply}
                  className={`rounded-2xl border px-4 py-3 text-left transition ${
                    preset.active
                      ? "border-amber-300/60 bg-amber-300/10 shadow-[0_14px_32px_-24px_rgba(251,191,36,0.55)]"
                      : "border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/35 hover:border-amber-300/35 hover:bg-[var(--mc-surface-strong)]/55"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-[var(--mc-text)]">
                      {preset.label}
                    </span>
                    {preset.active ? (
                      <span className="rounded-full border border-amber-300/40 bg-amber-300/12 px-2 py-0.5 text-[10px] text-amber-100">
                        使用中
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-xs text-[var(--mc-text-muted)]">
                    {preset.hint}
                  </p>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-[var(--mc-border)] bg-[var(--mc-surface)]/35 p-5">
            <div className="flex items-center gap-2">
              <EditRounded sx={{ fontSize: 18, color: "#7dd3fc" }} />
              <p className="text-sm font-semibold text-[var(--mc-text)]">
                房間身份
              </p>
            </div>
            <div className="mt-4 space-y-4">
              <TextField
                size="small"
                fullWidth
                label="房間名稱"
                value={roomNameInput}
                onChange={(event) => setRoomNameInput(event.target.value)}
              />

              <div className="grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                <div className="rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/25 p-4">
                  <div className="flex items-center gap-2">
                    {roomVisibilityInput === "private" ? (
                      <LockRounded sx={{ fontSize: 18, color: "#fbbf24" }} />
                    ) : (
                      <PublicOutlined sx={{ fontSize: 18, color: "#7dd3fc" }} />
                    )}
                    <p className="text-sm font-semibold text-[var(--mc-text)]">
                      房間可見性
                    </p>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setRoomVisibilityInput("public")}
                      className={`rounded-2xl border px-4 py-3 text-left transition ${
                        roomVisibilityInput === "public"
                          ? "border-cyan-300/60 bg-cyan-500/12 text-cyan-50"
                          : "border-[var(--mc-border)] bg-[var(--mc-surface)]/30 text-[var(--mc-text-muted)] hover:border-cyan-300/35 hover:text-[var(--mc-text)]"
                      }`}
                    >
                      <span className="inline-flex items-center gap-2 text-sm font-semibold">
                        <PublicOutlined sx={{ fontSize: 18 }} />
                        公開房
                      </span>
                      <p className="mt-1 text-xs opacity-80">
                        房間會出現在大廳列表，也能透過代碼加入。
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRoomVisibilityInput("private")}
                      className={`rounded-2xl border px-4 py-3 text-left transition ${
                        roomVisibilityInput === "private"
                          ? "border-amber-300/60 bg-amber-400/12 text-amber-50"
                          : "border-[var(--mc-border)] bg-[var(--mc-surface)]/30 text-[var(--mc-text-muted)] hover:border-amber-300/35 hover:text-[var(--mc-text)]"
                      }`}
                    >
                      <span className="inline-flex items-center gap-2 text-sm font-semibold">
                        <LockRounded sx={{ fontSize: 18 }} />
                        私人房
                      </span>
                      <p className="mt-1 text-xs opacity-80">
                        不會出現在大廳列表，需透過代碼加入。
                      </p>
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/25 p-4">
                  <div className="flex items-center gap-2">
                    <PasswordRounded sx={{ fontSize: 18, color: "#fbbf24" }} />
                    <p className="text-sm font-semibold text-[var(--mc-text)]">
                      4 位 PIN
                    </p>
                  </div>
                  <p className="mt-3 text-xs text-[var(--mc-text-muted)]">
                    設定後，玩家加入時需輸入 4 位 PIN。
                  </p>
                  <TextField
                    size="small"
                    fullWidth
                    className="mt-4"
                    label="PIN"
                    placeholder="例如 1234"
                    value={roomPasswordInput}
                    onChange={(event) =>
                      setRoomPasswordInput(
                        event.target.value.replace(/\D/g, "").slice(0, 4),
                      )
                    }
                    slotProps={{
                      htmlInput: {
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
            </div>
          </section>

          <section className="rounded-3xl border border-[var(--mc-border)] bg-[var(--mc-surface)]/35 p-5">
            <div className="flex items-center gap-2">
              <GroupsRounded sx={{ fontSize: 18, color: "#7dd3fc" }} />
              <p className="text-sm font-semibold text-[var(--mc-text)]">
                遊戲規模
              </p>
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/25 p-4">
                <p className="text-xs text-[var(--mc-text-muted)]">玩家上限</p>
                <div className="mt-2 flex items-end justify-between gap-3">
                  <div className="text-2xl font-semibold text-[var(--mc-text)]">
                    {parsedMaxPlayers ?? PLAYER_MIN}
                    <span className="ml-1 text-sm text-[var(--mc-text-muted)]">
                      人
                    </span>
                  </div>
                  <TextField
                    size="small"
                    type="number"
                    label={`人數（${PLAYER_MIN}-${PLAYER_MAX}）`}
                    value={roomMaxPlayersInput}
                    onChange={(event) =>
                      setRoomMaxPlayersInput(event.target.value)
                    }
                    slotProps={{
                      htmlInput: {
                        min: PLAYER_MIN,
                        max: PLAYER_MAX,
                        inputMode: "numeric",
                        lang: "en",
                        autoCorrect: "off",
                        style: { imeMode: "disabled" },
                      },
                    }}
                    sx={{ width: 152 }}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/25 p-4">
                <p className="text-xs text-[var(--mc-text-muted)]">題數</p>
                <div className="mt-2 text-2xl font-semibold text-[var(--mc-text)]">
                  {questionCount}
                  <span className="ml-1 text-sm text-[var(--mc-text-muted)]">
                    題
                  </span>
                </div>
                <TextField
                  size="small"
                  fullWidth
                  className="mt-4"
                  type="number"
                  label={`題數（${questionMin}-${questionMaxLimit}）`}
                  value={questionCount}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    if (!Number.isFinite(next)) return;
                    updateQuestionCount(next);
                  }}
                  slotProps={{
                    htmlInput: {
                      min: questionMin,
                      max: questionMaxLimit,
                      inputMode: "numeric",
                      lang: "en",
                      autoCorrect: "off",
                      style: { imeMode: "disabled" },
                    },
                  }}
                />
                <div className="mt-3 flex flex-wrap gap-2">
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

          <section className="rounded-3xl border border-[var(--mc-border)] bg-[var(--mc-surface)]/35 p-5">
            <div className="flex items-center gap-2">
              <TimerRounded sx={{ fontSize: 18, color: "#c084fc" }} />
              <p className="text-sm font-semibold text-[var(--mc-text)]">
                遊戲節奏
              </p>
            </div>
            <div className="mt-4 space-y-4">
              <button
                type="button"
                onClick={() =>
                  updateAllowCollectionClipTiming(!allowCollectionClipTiming)
                }
                className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                  allowCollectionClipTiming
                    ? "border-emerald-300/35 bg-emerald-400/10"
                    : "border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/25 hover:border-emerald-300/28 hover:bg-[var(--mc-surface-strong)]/40"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--mc-text)]">
                      沿用收藏庫片段時間
                    </p>
                    <p className="mt-1 text-xs text-[var(--mc-text-muted)]">
                      建立房間時使用目前題庫裡選擇的播放與起始秒數。
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 text-[11px] ${
                      allowCollectionClipTiming
                        ? "border-emerald-300/35 bg-emerald-300/14 text-emerald-100"
                        : "border-white/10 bg-white/5 text-[var(--mc-text-muted)]"
                    }`}
                  >
                    {allowCollectionClipTiming ? "目前開啟" : "已關閉"}
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
                <div className="rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/25 p-4">
                  <div className="flex items-center gap-2">
                    <AccessTimeRounded sx={{ fontSize: 18, color: "#fbbf24" }} />
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

                {!allowCollectionClipTiming ? (
                  <div className="rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/25 p-4">
                    <div className="flex items-center gap-2">
                      <ScheduleRounded sx={{ fontSize: 18, color: "#c084fc" }} />
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
              </div>
            </div>
          </section>
        </div>

        <aside className="order-1 space-y-4 xl:order-none xl:sticky xl:top-6 xl:self-start">
          <section className="rounded-3xl border border-[var(--mc-border)] bg-[linear-gradient(180deg,rgba(8,15,28,0.96),rgba(15,23,42,0.82))] p-5 shadow-[0_24px_60px_-36px_rgba(14,165,233,0.5)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.24em] text-[var(--mc-text-muted)]">
                  Create Snapshot
                </p>
                <h4 className="mt-2 text-base font-semibold text-[var(--mc-text)]">
                  建立前確認
                </h4>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <span className="rounded-full border border-cyan-300/18 bg-cyan-500/8 px-3 py-1 text-[11px] text-cyan-100/90">
                  {playlistItemsLength > 0
                    ? `已載入 ${playlistItemsLength} 首`
                    : "等待題庫"}
                </span>
                <span className="rounded-full border border-amber-300/18 bg-amber-300/10 px-3 py-1 text-[11px] text-amber-100">
                  {activeCreatePreset?.label ?? "自訂配置"}
                </span>
              </div>
            </div>
            <div className="mt-4 rounded-2xl border border-white/8 bg-white/5 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--mc-text-muted)]">
                房間名稱
              </p>
              <p className="mt-2 text-lg font-semibold text-[var(--mc-text)]">
                {roomNameInput.trim() || "未命名房間"}
              </p>
              <p className="mt-2 text-xs text-[var(--mc-text-muted)]">
                {activeCreatePreset
                  ? activeCreatePreset.hint
                  : "先確認房間型態、規模與節奏，再建立這場房間。"}
              </p>
            </div>
            <div className="mt-4 space-y-3">
              {selectedCreateSourceSummary ? (
                <div className="overflow-hidden rounded-2xl border border-cyan-300/18 bg-cyan-500/6">
                  {selectedCreateSourceSummary.thumbnail ? (
                    <div className="relative h-28 w-full overflow-hidden bg-slate-950/40">
                      <img
                        src={selectedCreateSourceSummary.thumbnail}
                        alt={selectedCreateSourceSummary.title}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/35 to-transparent" />
                    </div>
                  ) : null}
                  <div className="p-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-300/18 bg-slate-950/45">
                        {roomCreateSourceMode === "link" ? (
                          <LinkRounded sx={{ fontSize: 18, color: "#7dd3fc" }} />
                        ) : roomCreateSourceMode === "youtube" ? (
                          <YouTube sx={{ fontSize: 18, color: "#7dd3fc" }} />
                        ) : (
                          <BookmarkBorderRounded
                            sx={{ fontSize: 18, color: "#7dd3fc" }}
                          />
                        )}
                      </div>
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
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-slate-950/35">
                        {item.label === "房間型態" ? (
                          roomVisibilityInput === "private" ? (
                            <LockRounded sx={{ fontSize: 16, color: "#fbbf24" }} />
                          ) : (
                            <PublicOutlined sx={{ fontSize: 16, color: "#7dd3fc" }} />
                          )
                        ) : item.label === "玩家上限" ? (
                          <GroupsRounded sx={{ fontSize: 16, color: "#7dd3fc" }} />
                        ) : item.label === "題數" ? (
                          <QuizRounded sx={{ fontSize: 16, color: "#fbbf24" }} />
                        ) : (
                          <TimerRounded sx={{ fontSize: 16, color: "#c084fc" }} />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className="text-[11px] uppercase tracking-[0.18em] text-[var(--mc-text-muted)]">
                          {item.label}
                        </span>
                        <p className="mt-1 text-sm font-semibold text-[var(--mc-text)]">
                          {item.value}
                        </p>
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
            <Button
              variant="contained"
              fullWidth
              onClick={onCreateRoom}
              disabled={!canCreateRoom}
              className="mt-5"
            >
              {isCreatingRoom ? "建立中..." : "建立房間"}
            </Button>
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
