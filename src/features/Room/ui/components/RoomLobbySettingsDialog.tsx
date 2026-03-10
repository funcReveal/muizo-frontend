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

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={isMobileDialog}
      fullWidth
      maxWidth="md"
      PaperProps={{
        sx: {
          borderRadius: isMobileDialog ? 0 : 3,
          border: "1px solid rgba(56,189,248,0.28)",
          background:
            "radial-gradient(680px 240px at 12% 0%, rgba(56,189,248,0.12), transparent 70%), radial-gradient(520px 220px at 88% 0%, rgba(34,197,94,0.10), transparent 68%), linear-gradient(180deg, rgba(2,6,23,0.98), rgba(2,8,26,0.97))",
          boxShadow: "0 26px 72px -38px rgba(2,132,199,0.55)",
        },
      }}
    >
      <DialogTitle
        sx={{
          pb: 1.5,
          borderBottom: "1px solid rgba(56,189,248,0.18)",
        }}
      >
        <Stack spacing={1}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "center" }}
          >
            <Typography variant="h6" className="font-semibold text-slate-100">
              房主設定
            </Typography>
            <Stack direction="row" spacing={0.75} flexWrap="wrap">
              <Chip
                size="small"
                variant="outlined"
                label={`題數 ${settingsQuestionCount}`}
                className="border-slate-500/60 text-slate-200"
              />
              <Chip
                size="small"
                variant="outlined"
                label={
                  useCollectionTimingForSettings
                    ? `揭曉 ${settingsRevealDurationSec}s（收藏庫）`
                    : `作答 ${settingsPlayDurationSec}s / 起始 ${settingsStartOffsetSec}s / 揭曉 ${settingsRevealDurationSec}s`
                }
                className="border-cyan-500/40 text-cyan-200"
              />
            </Stack>
          </Stack>
          <Typography variant="caption" className="text-slate-400">
            調整後會立即同步到房間，建議在開局前完成設定。
          </Typography>
        </Stack>
      </DialogTitle>

      <DialogContent
        dividers
        sx={{
          borderColor: "rgba(56,189,248,0.16)",
          py: 2,
          maxHeight: { xs: "76vh", md: "80vh" },
          overflowY: "auto",
        }}
      >
        <Stack spacing={1.75}>
          {settingsDisabled && (
            <Box className="rounded-lg border border-amber-400/45 bg-amber-500/12 px-3 py-2">
              <Typography variant="caption" className="text-amber-200">
                遊戲進行中無法修改房間規則，請待本輪結束後再調整。
              </Typography>
            </Box>
          )}

          <Box className="grid gap-1.75 lg:grid-cols-2">
            <Box className="rounded-xl border border-slate-700/70 bg-slate-950/55 p-3">
              <Stack spacing={1.25}>
                <Typography variant="subtitle2" className="text-slate-100">
                  房間資訊
                </Typography>
                <TextField
                  label="房間名稱"
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
                    helperText: "text-slate-400",
                    noteText: "text-slate-400",
                  }}
                />
                <Stack spacing={0.75}>
                  <TextField
                    label="玩家上限"
                    type="number"
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
              <Box className="rounded-xl border border-slate-700/70 bg-slate-950/55 p-3">
                <Stack spacing={1.25}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle2" className="text-slate-100">
                      題數設定
                    </Typography>
                    <Chip
                      size="small"
                      variant="outlined"
                      label={`${settingsQuestionCount} 題`}
                      className="border-slate-600 text-slate-200"
                    />
                  </Stack>
                  <QuestionCountControls
                    value={settingsQuestionCount}
                    min={questionMinLimit}
                    max={questionMaxLimit}
                    step={QUESTION_STEP}
                    disabled={settingsDisabled}
                    onChange={onSettingsQuestionCountChange}
                  />
                </Stack>
              </Box>

              <Box className="rounded-xl border border-slate-700/70 bg-slate-950/55 p-3">
                <Stack spacing={1.25}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle2" className="text-slate-100">
                      時間設定
                    </Typography>
                    <Chip
                      size="small"
                      variant="outlined"
                      label={
                        useCollectionTimingForSettings
                          ? `揭曉 ${settingsRevealDurationSec}s（收藏庫）`
                          : `作答 ${settingsPlayDurationSec}s / 起始 ${settingsStartOffsetSec}s / 揭曉 ${settingsRevealDurationSec}s`
                      }
                      className="border-slate-600 text-slate-200"
                    />
                  </Stack>
                  <TextField
                    label="公布答案時間（秒）"
                    type="number"
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
        sx={{
          borderTop: "1px solid rgba(56,189,248,0.12)",
          px: 2.5,
          py: 1.5,
        }}
      >
        <Button onClick={onClose} variant="text">
          取消
        </Button>
        <Button onClick={onSave} variant="contained" disabled={settingsDisabled}>
          儲存
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RoomLobbySettingsDialog;
