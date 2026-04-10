import React from "react";
import {
  Box,
  Button,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import {
  DEFAULT_PLAYBACK_EXTENSION_MODE,
  PLAYER_MAX,
  PLAYER_MIN,
  PLAY_DURATION_MAX,
  PLAY_DURATION_MIN,
  QUESTION_MAX,
  QUESTION_MIN,
  QUESTION_STEP,
  REVEAL_DURATION_MAX,
  REVEAL_DURATION_MIN,
  START_OFFSET_MAX,
  START_OFFSET_MIN,
} from "../../model/roomConstants";
import type { PlaybackExtensionMode } from "../../model/types";
import QuestionCountControls from "./QuestionCountControls";
import RoomAccessSettingsFields from "./RoomAccessSettingsFields";

interface RoomLobbySettingsDialogProps {
  open: boolean;
  settingsDisabled: boolean;
  settingsSaving: boolean;
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
  useCollectionTimingForSettings: boolean;
  settingsPlayDurationSec: number;
  onSettingsPlayDurationSecChange: (value: number) => void;
  settingsStartOffsetSec: number;
  onSettingsStartOffsetSecChange: (value: number) => void;
  settingsError: string | null;
  onClose: () => void;
  onSave: () => void;
}

type SettingsSectionKey = "room" | "question" | "playback" | "timing";

const PLAYBACK_MODE_ORDER: PlaybackExtensionMode[] = [
  "manual_vote",
  "auto_once",
  "disabled",
];

const RoomLobbySettingsDialog: React.FC<RoomLobbySettingsDialogProps> = ({
  open,
  settingsDisabled,
  settingsSaving,
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
  useCollectionTimingForSettings,
  settingsPlayDurationSec,
  onSettingsPlayDurationSecChange,
  settingsStartOffsetSec,
  onSettingsStartOffsetSecChange,
  settingsError,
  onClose,
  onSave,
}) => {
  const isMobileDialog = useMediaQuery("(max-width:900px)");
  const isWideDialog = useMediaQuery("(min-width:1180px)");
  const settingsLocked = settingsDisabled || settingsSaving;
  const [mobileSummaryExpanded, setMobileSummaryExpanded] =
    React.useState(false);

  const playbackModeCopy: Record<
    PlaybackExtensionMode,
    { title: string; meta: string; description: string }
  > = {
    manual_vote: {
      title: "延長投票",
      meta: "猜歌中投票決定",
      description: "猜歌中可投票延長本題播放。",
    },
    auto_once: {
      title: "播放結束後自動延長",
      meta: "未作答時自動補時",
      description: "若仍有人未答，系統會自動補一次。",
    },
    disabled: {
      title: "關閉延長功能",
      meta: "不補時，直接揭曉",
      description: "不開放補時，依原節奏直接公布答案。",
    },
  };

  const selectedMode =
    settingsPlaybackExtensionMode ?? DEFAULT_PLAYBACK_EXTENSION_MODE;
  const selectedModeCopy = playbackModeCopy[selectedMode];
  const accessSummary =
    settingsVisibility === "public"
      ? settingsMaxPlayers.trim()
        ? `公開 · 上限 ${settingsMaxPlayers} 人`
        : "公開 · 不限人數"
      : settingsMaxPlayers.trim()
        ? `私人 · 上限 ${settingsMaxPlayers} 人`
        : "私人 · 不限人數";
  const timingSummary = useCollectionTimingForSettings
    ? `揭曉 ${settingsRevealDurationSec}s（收藏庫時間）`
    : `播放 ${settingsPlayDurationSec}s · 起始 ${settingsStartOffsetSec}s · 揭曉 ${settingsRevealDurationSec}s`;
  const summaryItems = [
    { label: "題數", value: `${settingsQuestionCount} 題` },
    { label: "房間", value: accessSummary },
    { label: "答題節奏", value: timingSummary, accent: true },
    { label: "延長模式", value: selectedModeCopy.title },
  ];
  const mobileSummaryItems = summaryItems;
  const mobileSummaryPreviewItems = [
    `${settingsQuestionCount} 題`,
    settingsVisibility === "public" ? "公開房" : "私人房",
    useCollectionTimingForSettings
      ? `揭曉 ${settingsRevealDurationSec}s`
      : `播放 ${settingsPlayDurationSec}s`,
    selectedModeCopy.title,
  ];
  const questionCountPresets = Array.from(
    new Set(
      [10, 20, 30, 50].filter(
        (count) => count >= questionMinLimit && count <= questionMaxLimit,
      ),
    ),
  ).sort((left, right) => left - right);
  const roomInfoRef = React.useRef<HTMLDivElement | null>(null);
  const questionCountRef = React.useRef<HTMLDivElement | null>(null);
  const playbackModeRef = React.useRef<HTMLDivElement | null>(null);
  const timingRef = React.useRef<HTMLDivElement | null>(null);
  const settingsSections = [
    {
      key: "room",
      label: "房間資訊",
      note: "名稱、公開狀態與人數",
    },
    {
      key: "question",
      label: "題數設定",
      note: "題數捷徑與增減控制",
    },
    {
      key: "playback",
      label: "延長模式",
      note: "投票、自動或關閉",
    },
    {
      key: "timing",
      label: "時間設定",
      note: "揭曉、播放與起始秒數",
    },
  ] as const satisfies ReadonlyArray<{
    key: SettingsSectionKey;
    label: string;
    note: string;
  }>;
  const mobileJumpSections = settingsSections.filter(
    (section) => section.key === "playback" || section.key === "timing",
  );

  const handleDialogClose = () => {
    if (settingsSaving) return;
    onClose();
  };

  const clampOnBlur = React.useCallback(
    (
      value: number,
      min: number,
      max: number,
      onChange: (next: number) => void,
    ) => {
      if (!Number.isFinite(value)) {
        onChange(min);
        return;
      }
      onChange(Math.min(max, Math.max(min, value)));
    },
    [],
  );

  const scrollToSection = (sectionKey: SettingsSectionKey) => {
    const targetRef =
      sectionKey === "room"
        ? roomInfoRef
        : sectionKey === "question"
          ? questionCountRef
          : sectionKey === "playback"
            ? playbackModeRef
            : timingRef;
    targetRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

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
        className="room-lobby-settings-dialog__head"
        sx={{
          px: { xs: 2, sm: 3 },
          pt: { xs: 2, sm: 2.5 },
          pb: { xs: 1.5, sm: 2 },
          borderBottom: "1px solid rgba(245,158,11,0.12)",
        }}
      >
        <Stack spacing={1.35}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1.25}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", md: "center" }}
          >
            <Stack spacing={0.55}>
              <Typography variant="h5" className="font-semibold text-slate-50">
                房間設定
              </Typography>
              <Typography variant="caption" className="text-slate-400">
                調整後會立即同步到房間，建議在開局前完成設定。
              </Typography>
            </Stack>

            {settingsDisabled && !isMobileDialog ? (
              <Box className="room-lobby-settings-warning">
                <Typography variant="caption" className="text-amber-200">
                  遊戲進行中無法修改房主設定，請在下一局開始前調整。
                </Typography>
              </Box>
            ) : null}
          </Stack>

          {!isMobileDialog ? (
            <div className="room-lobby-settings-summary-rail">
              {summaryItems.map((item) => (
                <div
                  key={item.label}
                  className={`room-lobby-settings-summary-pill ${
                    item.accent ? "is-accent" : ""
                  }`}
                >
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          ) : null}
        </Stack>
      </DialogTitle>

      <DialogContent
        className="room-lobby-settings-dialog__body"
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
        <Stack spacing={isMobileDialog ? 1.5 : 2}>
          {settingsDisabled && isMobileDialog ? (
            <Box className="room-lobby-settings-warning">
              <Typography variant="caption" className="text-amber-200">
                遊戲進行中無法修改房主設定，請在下一局開始前調整。
              </Typography>
            </Box>
          ) : null}

          {isMobileDialog ? (
            <div className="room-lobby-settings-mobile-summary-wrap">
              <button
                type="button"
                className={`room-lobby-settings-mobile-summary-toggle ${
                  mobileSummaryExpanded ? "is-open" : ""
                }`}
                onClick={() => setMobileSummaryExpanded((current) => !current)}
              >
                <span className="room-lobby-settings-mobile-summary-toggle__icon">
                  <TuneRoundedIcon sx={{ fontSize: 18 }} />
                </span>
                <span className="room-lobby-settings-mobile-summary-toggle__body">
                  <span className="room-lobby-settings-mobile-summary-toggle__eyebrow">
                    設定摘要
                  </span>
                  <strong>
                    {mobileSummaryExpanded ? "收起目前設定" : "查看目前設定"}
                  </strong>
                  <span className="room-lobby-settings-mobile-summary-toggle__preview">
                    {mobileSummaryPreviewItems.map((item) => (
                      <span key={item}>{item}</span>
                    ))}
                  </span>
                </span>
                <span className="room-lobby-settings-mobile-summary-toggle__arrow">
                  <KeyboardArrowDownRoundedIcon sx={{ fontSize: 18 }} />
                </span>
              </button>

              <Collapse in={mobileSummaryExpanded} timeout={180}>
                <div className="room-lobby-settings-mobile-summary room-lobby-settings-mobile-summary--secondary">
                  {mobileSummaryItems.map((item) => (
                    <div
                      key={item.label}
                      className={`room-lobby-settings-mobile-summary-item ${
                        item.accent ? "is-accent" : ""
                      }`}
                    >
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                </div>
              </Collapse>
            </div>
          ) : null}

          {isMobileDialog ? (
            <div className="room-lobby-settings-mobile-jump-grid">
              {mobileJumpSections.map((section, index) => (
                <button
                  key={section.key}
                  type="button"
                  className="room-lobby-settings-mobile-jump-chip"
                  onClick={() => scrollToSection(section.key)}
                >
                  <span className="room-lobby-settings-mobile-jump-chip__index">
                    {(index + 1).toString().padStart(2, "0")}
                  </span>
                  <span className="room-lobby-settings-mobile-jump-chip__body">
                    <strong>{section.label}</strong>
                    <small>{section.note}</small>
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          <Box className="room-lobby-settings-layout">
            {!isMobileDialog ? (
              <Box className="room-lobby-settings-sidebar">
                <div className="room-lobby-settings-anchor-list">
                  {settingsSections.map((section, index) => (
                    <button
                      key={section.key}
                      type="button"
                      className="room-lobby-settings-anchor"
                      onClick={() => scrollToSection(section.key)}
                    >
                      <span className="room-lobby-settings-anchor__index">
                        {(index + 1).toString().padStart(2, "0")}
                      </span>
                      <span className="room-lobby-settings-anchor__body">
                        <strong>{section.label}</strong>
                        <small>{section.note}</small>
                      </span>
                    </button>
                  ))}
                </div>
              </Box>
            ) : null}

            <Stack spacing={isMobileDialog ? 1.5 : 1.75} className="min-w-0">
              <Box
                ref={roomInfoRef}
                className="room-lobby-settings-card room-lobby-settings-section-card"
              >
                <Stack spacing={1.4}>
                  <div className="room-lobby-settings-section-head">
                    <Typography variant="subtitle2" className="text-slate-100">
                      房間資訊
                    </Typography>
                    <Typography variant="caption" className="text-slate-400">
                      先決定房間可見性與玩家容量，再進行題數與時間微調。
                    </Typography>
                  </div>

                  <TextField
                    label="房間名稱"
                    className="room-lobby-settings-field"
                    value={settingsName}
                    onChange={(event) =>
                      onSettingsNameChange(event.target.value)
                    }
                    disabled={settingsLocked}
                    fullWidth
                  />

                  <RoomAccessSettingsFields
                    visibility={settingsVisibility}
                    password={settingsPassword}
                    disabled={settingsLocked}
                    allowPasswordWhenPublic
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
                      label="玩家上限"
                      type="number"
                      className="room-lobby-settings-field"
                      value={settingsMaxPlayers}
                      onChange={(event) =>
                        onSettingsMaxPlayersChange(event.target.value)
                      }
                      inputProps={{
                        min: PLAYER_MIN,
                        max: PLAYER_MAX,
                        inputMode: "numeric",
                      }}
                      placeholder="留空代表不限制"
                      disabled={settingsLocked}
                      fullWidth
                    />
                    <Typography variant="caption" className="text-slate-400">
                      可設定範圍：{PLAYER_MIN} - {PLAYER_MAX} 人
                    </Typography>
                  </Stack>
                </Stack>
              </Box>

              <Box
                ref={questionCountRef}
                className="room-lobby-settings-card room-lobby-settings-section-card"
              >
                <Stack spacing={1.4}>
                  <div className="room-lobby-settings-section-head">
                    <Typography variant="subtitle2" className="text-slate-100">
                      題數設定
                    </Typography>
                    <Typography variant="caption" className="text-slate-400">
                      保留快速調整節奏，題數上限會跟著目前房間曲目數量收斂。
                    </Typography>
                  </div>

                  <Stack
                    direction={{ xs: "column", xl: "row" }}
                    justifyContent="space-between"
                    alignItems={{ xs: "flex-start", xl: "center" }}
                    spacing={1}
                  >
                    <Stack
                      direction="row"
                      spacing={1}
                      useFlexGap
                      flexWrap="wrap"
                      alignItems="center"
                    >
                      <Chip
                        size="small"
                        variant="outlined"
                        label={`目前 ${settingsQuestionCount} 題`}
                        className="room-lobby-settings-chip"
                      />
                      <Typography variant="caption" className="text-slate-500">
                        可設定範圍：{QUESTION_MIN} - {QUESTION_MAX} 題
                      </Typography>
                    </Stack>

                    <div className="room-lobby-settings-preset-strip">
                      {questionCountPresets.map((count) => (
                        <button
                          key={count}
                          type="button"
                          className={`room-lobby-settings-preset-button ${
                            settingsQuestionCount === count ? "is-active" : ""
                          }`}
                          onClick={() => onSettingsQuestionCountChange(count)}
                          disabled={
                            settingsLocked || settingsQuestionCount === count
                          }
                        >
                          {count} 題
                        </button>
                      ))}
                    </div>
                  </Stack>

                  <QuestionCountControls
                    value={settingsQuestionCount}
                    min={questionMinLimit}
                    max={questionMaxLimit}
                    step={QUESTION_STEP}
                    compact={!isWideDialog}
                    showRangeHint={!isWideDialog}
                    showSummaryRow={false}
                    disabled={settingsLocked}
                    onChange={onSettingsQuestionCountChange}
                  />

                  {questionMaxLimit < QUESTION_MAX ? (
                    <Typography variant="caption" className="text-slate-500">
                      目前房間可用曲目較少，題數會先依可用上限收斂到{" "}
                      {questionMaxLimit} 題。
                    </Typography>
                  ) : null}
                </Stack>
              </Box>

              <Box
                ref={playbackModeRef}
                className="room-lobby-settings-card room-lobby-settings-section-card"
              >
                <Stack spacing={1.25}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="flex-start"
                    spacing={1}
                  >
                    <div className="room-lobby-settings-section-head">
                      <Typography
                        variant="subtitle2"
                        className="text-slate-100"
                      >
                        延長播放模式
                      </Typography>
                      <Typography variant="caption" className="text-slate-400">
                        決定這個房間是否開放補時，以及補時由誰觸發。
                      </Typography>
                    </div>

                    <Tooltip
                      arrow
                      placement="top"
                      title="延長功能只影響猜歌階段；目前提供延長播放時間，不會直接重播整首歌曲。"
                      slotProps={{ popper: { style: { zIndex: 1510 } } }}
                    >
                      <IconButton
                        size="small"
                        className="room-lobby-settings-mode-info"
                      >
                        <InfoOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>

                  <div className="room-lobby-settings-mode-grid">
                    {PLAYBACK_MODE_ORDER.map((mode) => {
                      const selected = selectedMode === mode;
                      const modeCopy = playbackModeCopy[mode];

                      return (
                        <button
                          key={mode}
                          type="button"
                          className={`room-lobby-settings-mode-card ${
                            selected ? "is-selected" : ""
                          }`}
                          onClick={() =>
                            onSettingsPlaybackExtensionModeChange(mode)
                          }
                          disabled={settingsLocked}
                          aria-pressed={selected}
                        >
                          <span className="room-lobby-settings-mode-card__head">
                            <span className="room-lobby-settings-mode-card__title">
                              {modeCopy.title}
                            </span>
                            <span
                              className="room-lobby-settings-mode-card__check"
                              aria-hidden
                            >
                              {selected ? "✓" : ""}
                            </span>
                          </span>
                          <span className="room-lobby-settings-mode-card__meta">
                            {modeCopy.meta}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </Stack>
              </Box>

              <Box
                ref={timingRef}
                className="room-lobby-settings-card room-lobby-settings-section-card"
              >
                <Stack spacing={1.4}>
                  <div className="room-lobby-settings-section-head">
                    <Typography variant="subtitle2" className="text-slate-100">
                      時間設定
                    </Typography>
                    <Typography variant="caption" className="text-slate-400">
                      作答與揭曉規則會立即同步；若啟用收藏庫時間，播放片段會以歌曲設定為準。
                    </Typography>
                  </div>

                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Chip
                      size="small"
                      variant="outlined"
                      label={timingSummary}
                      className="room-lobby-settings-chip room-lobby-settings-chip--accent"
                    />
                  </Stack>

                  <TextField
                    label="公布答案時間（秒）"
                    type="number"
                    className="room-lobby-settings-field"
                    value={settingsRevealDurationSec}
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      if (!Number.isFinite(next)) return;
                      onSettingsRevealDurationSecChange(next);
                    }}
                    onBlur={() =>
                      clampOnBlur(
                        settingsRevealDurationSec,
                        REVEAL_DURATION_MIN,
                        REVEAL_DURATION_MAX,
                        onSettingsRevealDurationSecChange,
                      )
                    }
                    inputProps={{
                      min: REVEAL_DURATION_MIN,
                      max: REVEAL_DURATION_MAX,
                      inputMode: "numeric",
                    }}
                    disabled={settingsLocked}
                    fullWidth
                  />

                  <Typography variant="caption" className="text-slate-400">
                    可設定範圍：{REVEAL_DURATION_MIN} - {REVEAL_DURATION_MAX} 秒
                  </Typography>

                  {settingsUseCollectionSource ? (
                    <>
                      <FormControlLabel
                        control={
                          <Switch
                            size="small"
                            checked={settingsAllowCollectionClipTiming}
                            onChange={(_event, checked) =>
                              onSettingsAllowCollectionClipTimingChange(checked)
                            }
                            disabled={settingsLocked}
                          />
                        }
                        label="使用收藏庫時間設定"
                        className="room-lobby-settings-switch"
                      />

                      {useCollectionTimingForSettings ? (
                        <Typography
                          variant="caption"
                          className="text-cyan-200/90"
                        >
                          已啟用收藏庫時間，作答片段與起始時間將依歌曲片段設定帶入。
                        </Typography>
                      ) : null}
                    </>
                  ) : null}

                  {!useCollectionTimingForSettings ? (
                    <Stack spacing={1}>
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1}
                      >
                        <TextField
                          label="作答播放時間（秒）"
                          type="number"
                          className="room-lobby-settings-field"
                          value={settingsPlayDurationSec}
                          onChange={(event) => {
                            const next = Number(event.target.value);
                            if (!Number.isFinite(next)) return;
                            onSettingsPlayDurationSecChange(next);
                          }}
                          onBlur={() =>
                            clampOnBlur(
                              settingsPlayDurationSec,
                              PLAY_DURATION_MIN,
                              PLAY_DURATION_MAX,
                              onSettingsPlayDurationSecChange,
                            )
                          }
                          inputProps={{
                            min: PLAY_DURATION_MIN,
                            max: PLAY_DURATION_MAX,
                            inputMode: "numeric",
                          }}
                          disabled={settingsLocked}
                          fullWidth
                        />

                        <TextField
                          label="起始秒數（秒）"
                          type="number"
                          className="room-lobby-settings-field"
                          value={settingsStartOffsetSec}
                          onChange={(event) => {
                            const next = Number(event.target.value);
                            if (!Number.isFinite(next)) return;
                            onSettingsStartOffsetSecChange(next);
                          }}
                          onBlur={() =>
                            clampOnBlur(
                              settingsStartOffsetSec,
                              START_OFFSET_MIN,
                              START_OFFSET_MAX,
                              onSettingsStartOffsetSecChange,
                            )
                          }
                          inputProps={{
                            min: START_OFFSET_MIN,
                            max: START_OFFSET_MAX,
                            inputMode: "numeric",
                          }}
                          disabled={settingsLocked}
                          fullWidth
                        />
                      </Stack>

                      <Typography variant="caption" className="text-slate-400">
                        作答時間範圍：{PLAY_DURATION_MIN} - {PLAY_DURATION_MAX}{" "}
                        秒 · 起始時間範圍：{START_OFFSET_MIN} -{" "}
                        {START_OFFSET_MAX} 秒
                      </Typography>

                      <Typography variant="caption" className="text-slate-400">
                        播放時間會從起始秒數開始計算，適合用來收斂題目的辨識難度。
                      </Typography>
                    </Stack>
                  ) : null}
                </Stack>
              </Box>
            </Stack>
          </Box>

          {settingsError ? (
            <Typography variant="caption" className="text-rose-300">
              {settingsError}
            </Typography>
          ) : null}
        </Stack>
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
            {settingsSaving ? (
              <>
                <span
                  className="room-lobby-settings-primary-btn__loader"
                  aria-hidden="true"
                >
                  <span />
                  <span />
                  <span />
                </span>
                <span>儲存中...</span>
              </>
            ) : (
              <span>儲存設定</span>
            )}
          </span>
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RoomLobbySettingsDialog;
