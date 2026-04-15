import CloseRounded from "@mui/icons-material/CloseRounded";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
} from "@mui/material";

type SourceMode = "playlist" | "single";

type PlaylistSourceModalProps = {
  open: boolean;
  mode: SourceMode;
  onClose: () => void;
  onModeChange: (mode: SourceMode) => void;
  playlistUrl: string;
  onChangePlaylistUrl: (value: string) => void;
  onImportPlaylist: () => void;
  playlistLoading: boolean;
  playlistError: string | null;
  playlistAddError: string | null;
  singleTrackUrl: string;
  singleTrackTitle: string;
  singleTrackAnswer: string;
  singleTrackError: string | null;
  singleTrackLoading: boolean;
  isDuplicate: boolean;
  canEditSingleMeta: boolean;
  onSingleTrackUrlChange: (value: string) => void;
  onSingleTrackTitleChange: (value: string) => void;
  onSingleTrackAnswerChange: (value: string) => void;
  onAddSingle: () => void;
};

const tabButtonClass = (active: boolean) =>
  `rounded-full border px-3 py-1.5 text-xs transition-colors ${
    active
      ? "border-[var(--mc-accent)]/70 bg-[var(--mc-accent)]/18 text-[var(--mc-text)]"
      : "border-[var(--mc-border)] bg-[var(--mc-surface)]/55 text-[var(--mc-text-muted)] hover:text-[var(--mc-text)]"
  }`;

const textFieldSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "0.75rem",
    backgroundColor: "var(--mc-surface-strong)",
    color: "var(--mc-text)",
    fontSize: "0.875rem",
    "& fieldset": {
      borderColor: "var(--mc-border)",
    },
    "&:hover fieldset": {
      borderColor: "rgba(251, 191, 36, 0.45)",
    },
    "&.Mui-focused fieldset": {
      borderColor: "var(--mc-accent)",
    },
    "&.Mui-disabled": {
      cursor: "not-allowed",
      opacity: 0.6,
    },
  },
  "& .MuiInputBase-input::placeholder": {
    color: "var(--mc-text-muted)",
    opacity: 0.75,
  },
  "& .MuiInputLabel-root": {
    color: "var(--mc-text-muted)",
  },
  "& .MuiInputLabel-root.Mui-focused": {
    color: "var(--mc-accent)",
  },
  "& .MuiFormHelperText-root": {
    marginLeft: 0,
  },
};

const shrinkLabelSlotProps = {
  inputLabel: { shrink: true },
};

const PlaylistSourceModal = ({
  open,
  mode,
  onClose,
  onModeChange,
  playlistUrl,
  onChangePlaylistUrl,
  onImportPlaylist,
  playlistLoading,
  playlistError,
  playlistAddError,
  singleTrackUrl,
  singleTrackTitle,
  singleTrackAnswer,
  singleTrackError,
  singleTrackLoading,
  isDuplicate,
  canEditSingleMeta,
  onSingleTrackUrlChange,
  onSingleTrackTitleChange,
  onSingleTrackAnswerChange,
  onAddSingle,
}: PlaylistSourceModalProps) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      sx={{
        "& .MuiDialog-container": {
          alignItems: "flex-start",
        },
      }}
      PaperProps={{
        className:
          "!rounded-3xl !border !border-[var(--mc-border)] !bg-[#08111f] !text-[var(--mc-text)]",
        sx: {
          mt: { xs: 14, sm: 16 },
        },
      }}
    >
      <DialogTitle className="!px-6 !pt-6 !pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mt-1 text-xl font-semibold text-[var(--mc-text)]">
              新增題目來源
            </div>
            <div className="mt-1 text-sm text-[var(--mc-text-muted)]">
              匯入 YouTube 播放清單，或插入單首歌曲到目前收藏庫。
            </div>
          </div>
          <IconButton
            aria-label="關閉新增題目來源"
            onClick={onClose}
            size="small"
            sx={{
              border: "1px solid var(--mc-border)",
              color: "var(--mc-text-muted)",
              "&:hover": {
                color: "var(--mc-text)",
                backgroundColor: "rgba(255,255,255,0.06)",
              },
            }}
          >
            <CloseRounded fontSize="small" />
          </IconButton>
        </div>
      </DialogTitle>

      <DialogContent className="!px-6 !pb-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onModeChange("playlist")}
            className={tabButtonClass(mode === "playlist")}
          >
            匯入播放清單
          </button>
          <button
            type="button"
            onClick={() => onModeChange("single")}
            className={tabButtonClass(mode === "single")}
          >
            插入單曲
          </button>
        </div>

        {mode === "playlist" ? (
          <div className="rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface)]/40 p-4">
            <div className="text-[11px] text-[var(--mc-text-muted)]">
              貼上 YouTube 播放清單連結，系統會將可用歌曲加入目前收藏庫。
            </div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                value={playlistUrl}
                onChange={(e) => onChangePlaylistUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  onImportPlaylist();
                }}
                placeholder="貼上 YouTube 播放清單連結"
                className="min-w-0 flex-1 rounded-xl border border-[var(--mc-border)] bg-[var(--mc-surface-strong)] px-3 py-2 text-sm text-[var(--mc-text)]"
              />
              <button
                type="button"
                onClick={onImportPlaylist}
                disabled={playlistLoading}
                className="rounded-xl bg-[var(--mc-accent)] px-4 py-2 text-sm font-semibold text-[#1a1207] hover:bg-[var(--mc-accent-2)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {playlistLoading ? "匯入中..." : "匯入播放清單"}
              </button>
            </div>
            {playlistAddError && (
              <div className="mt-3 text-sm text-rose-300">
                {playlistAddError}
              </div>
            )}
            {playlistError && (
              <div className="mt-2 text-sm text-rose-300">{playlistError}</div>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface)]/40 p-4">
            <div className="text-[11px] text-[var(--mc-text-muted)]">
              貼上單首 YouTube 影片連結，確認歌曲資訊後插入收藏庫。
            </div>
            <div className="mt-3 space-y-3">
              <TextField
                fullWidth
                size="small"
                label="YouTube 影片連結"
                value={singleTrackUrl}
                onChange={(event) =>
                  onSingleTrackUrlChange(event.target.value)
                }
                placeholder="貼上 YouTube 影片連結"
                error={isDuplicate}
                helperText={isDuplicate ? "這首影片已在清單中。" : " "}
                slotProps={shrinkLabelSlotProps}
                sx={textFieldSx}
              />
              <TextField
                fullWidth
                size="small"
                label="歌曲名稱"
                value={singleTrackTitle}
                onChange={(event) =>
                  onSingleTrackTitleChange(event.target.value)
                }
                placeholder="輸入歌曲名稱，可自動帶入"
                disabled={!canEditSingleMeta}
                slotProps={shrinkLabelSlotProps}
                sx={textFieldSx}
              />
              <TextField
                fullWidth
                size="small"
                label="答案文字"
                value={singleTrackAnswer}
                onChange={(event) =>
                  onSingleTrackAnswerChange(event.target.value)
                }
                placeholder="輸入答案文字，預設使用曲名"
                disabled={!canEditSingleMeta}
                slotProps={shrinkLabelSlotProps}
                sx={textFieldSx}
              />
            </div>
            {singleTrackError && (
              <div className="mt-3 text-sm text-rose-300">
                {singleTrackError}
              </div>
            )}
            <div className="mt-4 flex items-center justify-between gap-2">
              <div className="text-[11px] text-[var(--mc-text-muted)]">
                {singleTrackLoading
                  ? "正在讀取歌曲資訊..."
                  : "可先貼上連結，系統會嘗試自動帶入歌曲資訊。"}
              </div>
              <button
                type="button"
                onClick={onAddSingle}
                disabled={isDuplicate}
                className="rounded-xl bg-[var(--mc-accent)] px-4 py-2 text-sm font-semibold text-[#1a1207] hover:bg-[var(--mc-accent-2)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                插入單曲
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PlaylistSourceModal;
