import type { ReactElement } from "react";
import {
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  TextField,
  Tooltip,
} from "@mui/material";
import { primaryActionSx } from "./sourceSurfaceStyles";
import { CloseRounded, LinkRounded } from "@mui/icons-material";
import LibraryEmptyState from "./LibraryEmptyState";
import { List, type RowComponentProps } from "react-window";

import type {
  PlaylistIssueSummary,
  PlaylistPreviewItem,
} from "./PlaylistPreviewRows";

type PlaylistPreviewRowData = {
  items: PlaylistPreviewItem[];
};

type PlaylistLinkSourceContentProps = {
  playlistUrlTooltipMessage: string;
  isPlaylistUrlFieldFocused: boolean;
  setIsPlaylistUrlFieldFocused: (value: boolean) => void;
  trimmedPlaylistUrlDraft: string;
  showPlaylistUrlError: boolean;
  showPlaylistUrlWarning: boolean;
  playlistUrlDraft: string;
  isLinkSourceActive: boolean;
  handleActivateLinkSource: () => void;
  setPlaylistUrlDraft: (value: string) => void;
  playlistPreviewError: string | null;
  setPlaylistPreviewError: (value: string | null) => void;
  linkPreviewLocked: boolean;
  handlePreviewPlaylistByUrl: () => Promise<void> | void;
  playlistLoading: boolean;
  playlistUrlLooksValid: boolean;
  handleClearPlaylistUrlInput: () => void;
  linkPlaylistTitle: string | null;
  linkPlaylistCount: number;
  playlistItemsLength: number;
  handlePickLinkSource: () => void;
  linkPlaylistPreviewItems: PlaylistPreviewItem[];
  canAttemptPlaylistPreview: (value: string) => boolean;
  linkPlaylistIssueSummary: PlaylistIssueSummary;
  linkPlaylistIssueTotal: number;
  onOpenPlaylistIssueDialog: () => void;
  playlistPreviewMetaSkippedCount: number;
  PlaylistPreviewRow: (
    props: RowComponentProps<PlaylistPreviewRowData>,
  ) => ReactElement;
};

const PlaylistLinkSourceContent = ({
  playlistUrlTooltipMessage,
  isPlaylistUrlFieldFocused,
  setIsPlaylistUrlFieldFocused,
  trimmedPlaylistUrlDraft,
  showPlaylistUrlError,
  showPlaylistUrlWarning,
  playlistUrlDraft,
  isLinkSourceActive,
  handleActivateLinkSource,
  setPlaylistUrlDraft,
  playlistPreviewError,
  setPlaylistPreviewError,
  linkPreviewLocked,
  handlePreviewPlaylistByUrl,
  playlistLoading,
  playlistUrlLooksValid,
  handleClearPlaylistUrlInput,
  linkPlaylistTitle,
  linkPlaylistCount,
  playlistItemsLength,
  handlePickLinkSource,
  linkPlaylistPreviewItems,
  canAttemptPlaylistPreview,
  linkPlaylistIssueSummary,
  linkPlaylistIssueTotal,
  onOpenPlaylistIssueDialog,
  playlistPreviewMetaSkippedCount,
  PlaylistPreviewRow,
}: PlaylistLinkSourceContentProps) => {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-3">
      <div className="bg-transparent px-0 pb-2 pt-4 sm:px-3">
        <div>
          <Tooltip
            title={playlistUrlTooltipMessage}
            placement="top"
            arrow
            open={Boolean(
              isPlaylistUrlFieldFocused &&
              trimmedPlaylistUrlDraft &&
              (showPlaylistUrlError || showPlaylistUrlWarning),
            )}
            disableFocusListener
            disableHoverListener
            disableTouchListener
            slotProps={{
              tooltip: {
                sx: {
                  fontSize: "0.82rem",
                  lineHeight: 1.45,
                  px: 1.4,
                  py: 1,
                  maxWidth: 360,
                  bgcolor: showPlaylistUrlWarning
                    ? "rgba(120, 53, 15, 0.96)"
                    : undefined,
                  color: showPlaylistUrlWarning ? "#fef3c7" : undefined,
                  "& .MuiTooltip-arrow": showPlaylistUrlWarning
                    ? {
                        color: "rgba(120, 53, 15, 0.96)",
                      }
                    : undefined,
                },
              },
            }}
          >
            <TextField
              fullWidth
              size="small"
              label="YouTube 播放清單連結"
              placeholder="https://www.youtube.com/playlist?list=..."
              value={playlistUrlDraft}
              autoComplete="off"
              error={showPlaylistUrlError}
              onFocus={() => setIsPlaylistUrlFieldFocused(true)}
              onBlur={() => setIsPlaylistUrlFieldFocused(false)}
              onChange={(event) => {
                if (!isLinkSourceActive) {
                  handleActivateLinkSource();
                }
                setPlaylistUrlDraft(event.target.value);
                if (playlistPreviewError) setPlaylistPreviewError(null);
              }}
              onKeyDown={(event) => {
                if (linkPreviewLocked) return;
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handlePreviewPlaylistByUrl();
                }
              }}
              slotProps={{
                inputLabel: { shrink: true },
                input: {
                  endAdornment: trimmedPlaylistUrlDraft ? (
                    <InputAdornment position="end">
                      <Tooltip
                        title={
                          linkPreviewLocked
                            ? playlistLoading && playlistUrlLooksValid
                              ? "取消目前讀取的清單"
                              : "取消目前清單，重新貼上連結"
                            : "清除目前輸入"
                        }
                        placement="top"
                      >
                        <IconButton
                          size="small"
                          onClick={handleClearPlaylistUrlInput}
                          edge="end"
                          aria-label={
                            linkPreviewLocked
                              ? playlistLoading && playlistUrlLooksValid
                                ? "取消目前播放清單讀取"
                                : "取消目前清單預覽"
                              : "清除播放清單連結"
                          }
                          sx={{
                            color: linkPreviewLocked
                              ? "#fbbf24"
                              : "rgba(148,163,184,0.92)",
                          }}
                        >
                          <CloseRounded fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  ) : undefined,
                },
                htmlInput: {
                  lang: "en",
                  autoComplete: "off",
                  autoCorrect: "off",
                  autoCapitalize: "off",
                  inputMode: "url",
                  spellCheck: "false",
                  readOnly: linkPreviewLocked,
                  style: { imeMode: "disabled" },
                },
              }}
              sx={{
                "& .MuiInputLabel-root": { color: "var(--mc-text-muted)" },
                "& .MuiInputLabel-root.Mui-focused": { color: "var(--mc-accent)" },
                "& .MuiInputLabel-root.Mui-error": { color: "error.main" },
                "& .MuiOutlinedInput-root": {
                  borderRadius: "12px",
                  background: "var(--mc-surface-strong)",
                  "& fieldset": {
                    borderColor: showPlaylistUrlError ? "error.main" : showPlaylistUrlWarning ? "var(--mc-accent)" : "var(--mc-border)",
                  },
                  "&:hover fieldset": { borderColor: showPlaylistUrlError ? "error.main" : "var(--mc-accent-border)" },
                  "&.Mui-focused fieldset": { borderColor: showPlaylistUrlError ? "error.main" : "var(--mc-accent)" },
                },
                "& input": { cursor: linkPreviewLocked ? "default" : "text" },
              }}
            />
          </Tooltip>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-transparent p-0 sm:p-2">
        {(linkPlaylistTitle || linkPlaylistPreviewItems.length > 0) && (
          <div className="shrink-0 flex flex-wrap items-start justify-between gap-3 rounded-xl bg-[var(--mc-surface)] px-3 py-2.5">
            <div className="min-w-0">
              <h3 className="truncate text-lg font-semibold tracking-[0.01em] text-[var(--mc-text)] sm:text-[1.25rem]">
                {linkPlaylistTitle || "播放清單預覽"}
              </h3>
            </div>
            <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
              <span className="inline-flex items-center rounded-full border border-[var(--mc-accent-border)] bg-[var(--mc-accent-soft)] px-3 py-1 text-[11px] font-semibold tracking-[0.18em] text-[var(--mc-accent)]">
                {linkPlaylistCount} 首曲目
              </span>
              {isLinkSourceActive && (
                <Button
                  variant="contained"
                  onClick={handlePickLinkSource}
                  disabled={playlistItemsLength === 0}
                  sx={primaryActionSx}
                >
                  套用這份清單
                </Button>
              )}
            </div>
          </div>
        )}

        {playlistLoading &&
        canAttemptPlaylistPreview(trimmedPlaylistUrlDraft) &&
        linkPlaylistPreviewItems.length === 0 ? (
          <div className="mt-3 flex min-h-0 flex-1 flex-col items-center justify-center rounded-xl bg-[var(--mc-surface)] px-3 text-center">
            <CircularProgress
              size={34}
              thickness={4}
              sx={{ color: "var(--mc-accent)" }}
            />
            <p className="mt-4 text-sm font-semibold text-[var(--mc-text)]">
              正在讀取播放清單
            </p>
            <p className="mt-2 text-xs text-[var(--mc-text-muted)]">
              正在驗證連結並整理可匯入的曲目，請稍候。
            </p>
          </div>
        ) : linkPlaylistPreviewItems.length > 0 ? (
          <div className="mt-3 flex min-h-0 flex-1 flex-col overflow-y-auto">
            <div className="shrink-0 rounded-xl bg-[var(--mc-surface)]">
              <List<PlaylistPreviewRowData>
                style={{ height: 260, width: "100%" }}
                rowCount={linkPlaylistPreviewItems.length}
                rowHeight={64}
                rowProps={{ items: linkPlaylistPreviewItems }}
                rowComponent={PlaylistPreviewRow as never}
              />
            </div>
            <div className="mt-4 space-y-3 pb-1">
              {linkPlaylistIssueTotal > 0 && (
                <button
                  type="button"
                  onClick={onOpenPlaylistIssueDialog}
                  className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-left text-xs text-amber-100 transition hover:border-amber-300/45 hover:bg-amber-300/15"
                >
                  <span className="font-semibold">未成功匯入原因</span>
                  <span>{linkPlaylistIssueTotal} 首，查看明細</span>
                </button>
              )}
              {isLinkSourceActive &&
                playlistPreviewMetaSkippedCount > 0 &&
                !linkPlaylistIssueSummary.exact && (
                  <p className="text-[11px] text-amber-200/90">
                    後端目前只回傳略過數量，尚未提供逐首明細；待 `skippedItems`
                    上線後將顯示 100% 精準名單。
                  </p>
                )}
            </div>
          </div>
        ) : (
          <LibraryEmptyState
            icon={<LinkRounded sx={{ fontSize: 28 }} />}
            title="還沒有曲目預覽"
            description="貼上連結後，即可在這裡查看曲目。"
          />
        )}
      </div>
    </div>
  );
};

export default PlaylistLinkSourceContent;
