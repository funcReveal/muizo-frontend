import React from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
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
} from "../../model/roomConstants";
import QuestionCountControls from "./QuestionCountControls";
import RoomAccessSettingsFields from "./RoomAccessSettingsFields";

interface RoomLobbySettingsDialogProps {
  open: boolean;
  settingsDisabled: boolean;
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
  useCollectionTimingForSettings: boolean;
  settingsPlayDurationSec: number;
  onSettingsPlayDurationSecChange: (value: number) => void;
  settingsStartOffsetSec: number;
  onSettingsStartOffsetSecChange: (value: number) => void;
  settingsError: string | null;
  onClose: () => void;
  onSave: () => void;
}

const RoomLobbySettingsDialog: React.FC<RoomLobbySettingsDialogProps> = ({
  open,
  settingsDisabled,
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
  const timingSummary = useCollectionTimingForSettings
    ? `揭曉 ${settingsRevealDurationSec}s（收藏庫）`
    : `作答 ${settingsPlayDurationSec}s / 起始 ${settingsStartOffsetSec}s / 揭曉 ${settingsRevealDurationSec}s`;
  const compactTimingSummary = useCollectionTimingForSettings
    ? `揭曉 ${settingsRevealDurationSec}s · 收藏庫`
    : `${settingsPlayDurationSec}s / ${settingsStartOffsetSec}s / ${settingsRevealDurationSec}s`;
  const maxPlayersLabel = settingsMaxPlayers.trim()
    ? `${settingsMaxPlayers} 人`
    : "不限制";
  const visibilityLabel = settingsVisibility === "public" ? "公開房間" : "私人房間";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={isMobileDialog}
      fullWidth
      maxWidth="lg"
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
          pb: isMobileDialog ? 1.25 : 0,
          borderBottom: "1px solid rgba(245,158,11,0.12)",
        }}
      >
        <Stack spacing={isMobileDialog ? 1.1 : 1.5}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={isMobileDialog ? 1 : 1.5}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "center" }}
          >
            <Stack spacing={isMobileDialog ? 0.3 : 0.6}>
              <Typography
                variant="caption"
                className="room-lobby-settings-kicker"
              >
                ROOM CONFIG
              </Typography>
              <Typography variant="h5" className="font-semibold text-slate-50">
                房主設定
              </Typography>
              {!isMobileDialog ? (
                <Typography variant="caption" className="text-slate-400">
                  調整後會立即同步到房間，建議在開局前完成設定。
                </Typography>
              ) : null}
            </Stack>
            {!isMobileDialog ? (
              <Stack direction="row" spacing={0.75} flexWrap="wrap">
                <Chip
                  size="small"
                  variant="outlined"
                  label={`題數 ${settingsQuestionCount}`}
                  className="room-lobby-settings-chip"
                />
                <Chip
                  size="small"
                  variant="outlined"
                  label={timingSummary}
                  className="room-lobby-settings-chip room-lobby-settings-chip--accent"
                />
              </Stack>
            ) : null}
          </Stack>
          {isMobileDialog ? (
            <div className="room-lobby-settings-mobile-summary">
              <Chip
                size="small"
                variant="outlined"
                label={`題數 ${settingsQuestionCount}`}
                className="room-lobby-settings-chip"
              />
              <Chip
                size="small"
                variant="outlined"
                label={visibilityLabel}
                className="room-lobby-settings-chip"
              />
              <Chip
                size="small"
                variant="outlined"
                label={maxPlayersLabel}
                className="room-lobby-settings-chip"
              />
              <Chip
                size="small"
                variant="outlined"
                label={compactTimingSummary}
                className="room-lobby-settings-chip room-lobby-settings-chip--accent"
              />
            </div>
          ) : (
            <div className="room-lobby-settings-overview">
              <div className="room-lobby-settings-overview-item">
                <span>房間狀態</span>
                <strong>{visibilityLabel}</strong>
              </div>
              <div className="room-lobby-settings-overview-item">
                <span>玩家上限</span>
                <strong>{maxPlayersLabel}</strong>
              </div>
              <div className="room-lobby-settings-overview-item">
                <span>答題節奏</span>
                <strong>{timingSummary}</strong>
              </div>
            </div>
          )}
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
        }}
      >
        <Stack spacing={2}>
          {isMobileDialog ? (
            <Box className="room-lobby-settings-mobile-tip">
              <Typography variant="caption" className="text-slate-300">
                調整後會立即同步到房間，可先快速修改後再往下細調。
              </Typography>
            </Box>
          ) : null}
          {settingsDisabled && (
            <Box className="room-lobby-settings-warning">
              <Typography variant="caption" className="text-amber-200">
                遊戲進行中無法修改房間規則，請待本輪結束後再調整。
              </Typography>
            </Box>
          )}

          <Box className="grid gap-2 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <Box className="room-lobby-settings-card">
              <Stack spacing={1.4}>
                <div className="room-lobby-settings-section-head">
                  <Typography variant="subtitle2" className="text-slate-100">
                    房間資訊
                  </Typography>
                  <Typography variant="caption" className="text-slate-400">
                    先決定房間可見性與玩家容量，再進行題數與時間微調。
                  </Typography>
                </div>
                <Typography variant="subtitle2" className="text-slate-100">
                  房間名稱
                </Typography>
                <TextField
                  label="房間名稱"
                  className="room-lobby-settings-field"
                  value={settingsName}
                  onChange={(event) => onSettingsNameChange(event.target.value)}
                  disabled={settingsDisabled}
                  fullWidth
                />
                <RoomAccessSettingsFields
                  visibility={settingsVisibility}
                  password={settingsPassword}
                  disabled={settingsDisabled}
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
                    onChange={(event) => onSettingsMaxPlayersChange(event.target.value)}
                    inputProps={{
                      min: PLAYER_MIN,
                      max: PLAYER_MAX,
                      inputMode: "numeric",
                    }}
                    placeholder="留空代表不限制"
                    disabled={settingsDisabled}
                    fullWidth
                  />
                  <Typography variant="caption" className="text-slate-400">
                    可設定範圍：{PLAYER_MIN} - {PLAYER_MAX} 人
                  </Typography>
                </Stack>
              </Stack>
            </Box>

            <Stack spacing={1.75} className="min-w-0">
              <Box className="room-lobby-settings-card">
                <Stack spacing={1.4}>
                  <div className="room-lobby-settings-section-head">
                    <Typography variant="subtitle2" className="text-slate-100">
                      題數設定
                    </Typography>
                    <Typography variant="caption" className="text-slate-400">
                      保留較快的節奏，但讓桌面版不再出現擠壓與橫向捲動。
                    </Typography>
                  </div>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Chip
                      size="small"
                      variant="outlined"
                      label={`${settingsQuestionCount} 題`}
                      className="room-lobby-settings-chip"
                    />
                  </Stack>
                  <QuestionCountControls
                    value={settingsQuestionCount}
                    min={questionMinLimit}
                    max={questionMaxLimit}
                    step={QUESTION_STEP}
                    compact={!isWideDialog}
                    showRangeHint={!isWideDialog}
                    disabled={settingsDisabled}
                    onChange={onSettingsQuestionCountChange}
                  />
                </Stack>
              </Box>

              <Box className="room-lobby-settings-card">
                <Stack spacing={1.4}>
                  <div className="room-lobby-settings-section-head">
                    <Typography variant="subtitle2" className="text-slate-100">
                      時間設定
                    </Typography>
                    <Typography variant="caption" className="text-slate-400">
                      作答、起始與揭曉拆開調整；若使用收藏庫時間，也會在這裡清楚顯示。
                    </Typography>
                  </div>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Chip
                      size="small"
                      variant="outlined"
                      label={timingSummary}
                      className="room-lobby-settings-chip"
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
                    inputProps={{
                      min: REVEAL_DURATION_MIN,
                      max: REVEAL_DURATION_MAX,
                      inputMode: "numeric",
                    }}
                    disabled={settingsDisabled}
                    fullWidth
                  />

                  {settingsUseCollectionSource && (
                    <FormControlLabel
                      control={
                        <Switch
                          size="small"
                          checked={settingsAllowCollectionClipTiming}
                          onChange={(_event, checked) =>
                            onSettingsAllowCollectionClipTimingChange(checked)
                          }
                          disabled={settingsDisabled}
                        />
                      }
                      label="使用收藏庫時間設定"
                      className="room-lobby-settings-switch"
                    />
                  )}

                  {useCollectionTimingForSettings ? (
                    <Typography variant="caption" className="text-cyan-200/90">
                      已啟用收藏庫時間，作答時間與起始時間將由收藏庫片段決定。
                    </Typography>
                  ) : (
                    <Stack spacing={1}>
                      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                        <TextField
                          label="作答時間（秒）"
                          type="number"
                          className="room-lobby-settings-field"
                          value={settingsPlayDurationSec}
                          onChange={(event) => {
                            const next = Number(event.target.value);
                            if (!Number.isFinite(next)) return;
                            onSettingsPlayDurationSecChange(next);
                          }}
                          inputProps={{
                            min: PLAY_DURATION_MIN,
                            max: PLAY_DURATION_MAX,
                            inputMode: "numeric",
                          }}
                          disabled={settingsDisabled}
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
                          inputProps={{
                            min: START_OFFSET_MIN,
                            max: START_OFFSET_MAX,
                            inputMode: "numeric",
                          }}
                          disabled={settingsDisabled}
                          fullWidth
                        />
                      </Stack>
                      <Typography variant="caption" className="text-slate-400">
                        作答階段會從起始秒數開始播放，再於作答時間結束後進入揭曉。
                      </Typography>
                    </Stack>
                  )}
                </Stack>
              </Box>
            </Stack>
          </Box>

          {settingsError && (
            <Typography variant="caption" className="text-rose-300">
              {settingsError}
            </Typography>
          )}
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
        <Button onClick={onClose} variant="text" className="room-lobby-settings-secondary-btn">
          取消
        </Button>
        <Button
          onClick={onSave}
          variant="contained"
          disabled={settingsDisabled}
          className="room-lobby-settings-primary-btn"
        >
          儲存設定
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RoomLobbySettingsDialog;
