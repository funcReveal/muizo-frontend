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
} from "@mui/material";
import {
  PLAYER_MAX,
  PLAYER_MIN,
  PLAY_DURATION_MAX,
  PLAY_DURATION_MIN,
  REVEAL_DURATION_MAX,
  REVEAL_DURATION_MIN,
  START_OFFSET_MAX,
  START_OFFSET_MIN,
  QUESTION_STEP,
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
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      PaperProps={{
        sx: {
          borderRadius: 3,
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
                    ? `收藏庫時間 / 揭曉 ${settingsRevealDurationSec}s`
                    : `${settingsPlayDurationSec}s / ${settingsStartOffsetSec}s / ${settingsRevealDurationSec}s`
                }
                className="border-cyan-500/40 text-cyan-200"
              />
            </Stack>
          </Stack>
          <Typography variant="caption" className="text-slate-400">
            調整房間規則與題庫節奏，儲存後立即套用到本房間。
          </Typography>
        </Stack>
      </DialogTitle>
      <DialogContent
        dividers
        sx={{
          borderColor: "rgba(56,189,248,0.16)",
          py: 2,
          maxHeight: {
            xs: "72vh",
            md: "78vh",
          },
          overflowY: "auto",
        }}
      >
        <Stack spacing={1.75}>
          {settingsDisabled && (
            <Box className="rounded-lg border border-amber-400/45 bg-amber-500/12 px-3 py-2">
              <Typography variant="caption" className="text-amber-200">
                遊戲進行中時無法儲存設定；請於下一輪開始前調整。
              </Typography>
            </Box>
          )}
          <Box className="grid gap-1.75 lg:grid-cols-2">
            <Box className="rounded-xl border border-slate-700/70 bg-slate-950/55 p-3">
              <Stack spacing={1.25}>
                <Typography variant="subtitle2" className="text-slate-100">
                  基本資料與權限
                </Typography>
                <TextField
                  label="房間名稱"
                  value={settingsName}
                  onChange={(e) => onSettingsNameChange(e.target.value)}
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
                    onChange={(e) => onSettingsMaxPlayersChange(e.target.value)}
                    inputProps={{
                      min: PLAYER_MIN,
                      max: PLAYER_MAX,
                      inputMode: "numeric",
                    }}
                    placeholder="留空則使用房間預設"
                    disabled={settingsDisabled}
                    fullWidth
                  />
                  <Typography variant="caption" className="text-slate-400">
                    玩家上限可設定為 {PLAYER_MIN} - {PLAYER_MAX} 人
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
                          ? `揭曉 ${settingsRevealDurationSec}s（收藏庫片段）`
                          : `揭曉 ${settingsRevealDurationSec}s / 作答 ${settingsPlayDurationSec}s / 起始 ${settingsStartOffsetSec}s`
                      }
                      className="border-slate-600 text-slate-200"
                    />
                  </Stack>
                  <TextField
                    label="公布答案時間 (秒)"
                    type="number"
                    value={settingsRevealDurationSec}
                    onChange={(e) => {
                      const next = Number(e.target.value);
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
                      label="使用收藏庫設定的時間"
                    />
                  )}
                  {useCollectionTimingForSettings ? (
                    <Typography variant="caption" className="text-cyan-200/90">
                      已啟用收藏庫時間，作答時間與起始時間已隱藏。
                    </Typography>
                  ) : (
                    <Stack spacing={1}>
                      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                        <TextField
                          label="作答時間設定"
                          type="number"
                          value={settingsPlayDurationSec}
                          onChange={(e) => {
                            const next = Number(e.target.value);
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
                          label="起始時間 (秒)"
                          type="number"
                          value={settingsStartOffsetSec}
                          onChange={(e) => {
                            const next = Number(e.target.value);
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
                        若超過歌曲長度，系統會依據起始時間做循環裁切。
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
