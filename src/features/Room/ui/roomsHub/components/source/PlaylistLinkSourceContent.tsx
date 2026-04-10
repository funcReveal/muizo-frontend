import type { ReactElement } from "react";
import {
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  TextField,
  Tooltip,
} from "@mui/material";
import { CloseRounded } from "@mui/icons-material";
import { List, type RowComponentProps } from "react-window";

import type {
  PlaylistIssueListItem,
  PlaylistIssueSummary,
  PlaylistPreviewItem,
} from "./PlaylistPreviewRows";

type PlaylistPreviewRowData = {
  items: PlaylistPreviewItem[];
};

type PlaylistIssueRowData = {
  items: PlaylistIssueListItem[];
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
  playlistPreviewMetaSkippedCount: number;
  PlaylistPreviewRow: (
    props: RowComponentProps<PlaylistPreviewRowData>,
  ) => ReactElement;
  PlaylistIssueRow: (
    props: RowComponentProps<PlaylistIssueRowData>,
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
  playlistPreviewMetaSkippedCount,
  PlaylistPreviewRow,
  PlaylistIssueRow,
}: PlaylistLinkSourceContentProps) => {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-3">
      <div className="rounded-xl border border-transparent bg-transparent p-0 sm:rounded-2xl sm:border-[var(--mc-border)] sm:bg-[linear-gradient(180deg,rgba(2,6,23,0.34),rgba(15,23,42,0.22))] sm:p-5">
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
                "& .MuiInputLabel-root": {
                  color: "rgba(248, 250, 252, 0.72)",
                  transition: "color 180ms ease, transform 180ms ease",
                },
                "& .MuiInputLabel-root.Mui-focused": {
                  color: "rgba(251, 191, 36, 0.96)",
                },
                "& .MuiOutlinedInput-root": {
                  borderRadius: "20px",
                  backgroundColor: "rgba(2, 6, 23, 0.32)",
                  boxShadow:
                    "0 0 0 1px rgba(148, 163, 184, 0.12), 0 10px 28px rgba(2, 6, 23, 0.18)",
                  transition:
                    "background-color 180ms ease, box-shadow 180ms ease, border-color 180ms ease",
                  "& fieldset": {
                    borderColor: showPlaylistUrlWarning
                      ? "rgba(251, 191, 36, 0.4)"
                      : showPlaylistUrlError
                        ? "rgba(248, 113, 113, 0.5)"
                        : "rgba(148, 163, 184, 0.2)",
                  },
                  "&:hover": {
                    backgroundColor: "rgba(15, 23, 42, 0.52)",
                    boxShadow: showPlaylistUrlWarning
                      ? "0 0 0 1px rgba(251, 191, 36, 0.24), 0 16px 34px rgba(120, 53, 15, 0.18)"
                      : showPlaylistUrlError
                        ? "0 0 0 1px rgba(248, 113, 113, 0.26), 0 18px 38px rgba(127, 29, 29, 0.18)"
                        : "0 0 0 1px rgba(34, 211, 238, 0.16), 0 16px 34px rgba(8, 47, 73, 0.2)",
                  },
                  "&:hover fieldset": {
                    borderColor: showPlaylistUrlWarning
                      ? "rgba(251, 191, 36, 0.58)"
                      : showPlaylistUrlError
                        ? "rgba(248, 113, 113, 0.66)"
                        : "rgba(34, 211, 238, 0.34)",
                  },
                  "&.Mui-focused": {
                    backgroundColor: "rgba(15, 23, 42, 0.62)",
                    boxShadow: showPlaylistUrlWarning
                      ? "0 0 0 1px rgba(251, 191, 36, 0.34), 0 18px 38px rgba(120, 53, 15, 0.2)"
                      : showPlaylistUrlError
                        ? "0 0 0 1px rgba(248, 113, 113, 0.28), 0 18px 38px rgba(127, 29, 29, 0.18)"
                        : "0 0 0 1px rgba(251, 191, 36, 0.28), 0 18px 38px rgba(120, 53, 15, 0.18)",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: showPlaylistUrlWarning
                      ? "rgba(251, 191, 36, 0.82)"
                      : showPlaylistUrlError
                        ? "rgba(248, 113, 113, 0.72)"
                        : "rgba(251, 191, 36, 0.72)",
                  },
                  "&.Mui-error": {
                    boxShadow:
                      "0 0 0 1px rgba(248, 113, 113, 0.18), 0 16px 34px rgba(127, 29, 29, 0.16)",
                  },
                },
                "& .MuiOutlinedInput-input": {
                  transition: "color 180ms ease",
                  cursor: linkPreviewLocked ? "default" : "text",
                },
                "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-input": {
                  color: "rgba(255, 255, 255, 0.98)",
                },
              }}
            />
          </Tooltip>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-transparent bg-transparent p-0 sm:border-[var(--mc-border)]/70 sm:bg-slate-950/18 sm:p-2">
        {(linkPlaylistTitle || linkPlaylistPreviewItems.length > 0) && (
          <div className="shrink-0 flex flex-wrap items-start justify-between gap-3 rounded-xl border border-white/10 bg-slate-950/20 px-3 py-2.5">
            <div className="min-w-0">
              <h3 className="truncate text-lg font-semibold tracking-[0.01em] text-[var(--mc-text)] sm:text-[1.25rem]">
                {linkPlaylistTitle || "播放清單預覽"}
              </h3>
            </div>
            <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
              <span className="inline-flex items-center rounded-full border border-cyan-300/28 bg-cyan-300/10 px-3 py-1 text-[11px] font-semibold tracking-[0.18em] text-cyan-100/90">
                {linkPlaylistCount} 首曲目
              </span>
              {isLinkSourceActive && (
                <Button
                  variant="contained"
                  onClick={handlePickLinkSource}
                  disabled={playlistItemsLength === 0}
                  sx={{
                    borderRadius: "999px",
                    px: 2.25,
                    py: 0.85,
                    minHeight: 0,
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                    boxShadow: "0 10px 24px rgba(245, 158, 11, 0.18)",
                  }}
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
          <div className="mt-3 flex min-h-0 flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-cyan-300/16 bg-slate-950/12 px-3 text-center">
            <CircularProgress
              size={34}
              thickness={4}
              sx={{ color: "#38bdf8" }}
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
            <div className="shrink-0 rounded-[22px] border border-[var(--mc-border)]/70 bg-slate-950/20">
              <List<PlaylistPreviewRowData>
                style={{ height: 260, width: "100%" }}
                rowCount={linkPlaylistPreviewItems.length}
                rowHeight={64}
                rowProps={{ items: linkPlaylistPreviewItems }}
                rowComponent={PlaylistPreviewRow as never}
              />
            </div>
            <div className="mt-4 space-y-3 pb-1">
              {[
                {
                  title: "隱私限制",
                  tone: "border-fuchsia-300/30 bg-fuchsia-300/10 text-fuchsia-100",
                  items: linkPlaylistIssueSummary.privateRestricted,
                },
                {
                  title: "嵌入限制",
                  tone: "border-rose-300/30 bg-rose-300/10 text-rose-100",
                  items: linkPlaylistIssueSummary.embedBlocked,
                },
                {
                  title: "其他不可用",
                  tone: "border-red-300/30 bg-red-300/10 text-red-100",
                  items: [
                    ...linkPlaylistIssueSummary.unavailable,
                    ...linkPlaylistIssueSummary.unknown,
                  ],
                },
              ]
                .filter((group) => group.items.length > 0)
                .map((group) => (
                  <div
                    key={group.title}
                    className={`rounded-xl border p-2.5 ${group.tone}`}
                  >
                    <p className="text-xs font-semibold">
                      {group.title}：{group.items.length} 首
                    </p>
                    <div className="mt-2 rounded-xl border border-white/10 bg-slate-950/15">
                      <List<PlaylistIssueRowData>
                        style={{
                          height: Math.min(group.items.length * 64, 256),
                          width: "100%",
                        }}
                        rowCount={group.items.length}
                        rowHeight={64}
                        rowProps={{ items: group.items }}
                        rowComponent={PlaylistIssueRow as never}
                      />
                    </div>
                  </div>
                ))}
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
          <div className="mt-3 flex min-h-0 flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-cyan-300/16 bg-slate-950/12 px-3 text-center">
            <p className="text-sm text-[var(--mc-text-muted)]">
              貼上連結後，顯示曲目預覽
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlaylistLinkSourceContent;
