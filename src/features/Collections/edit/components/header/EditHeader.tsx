import { useEffect, useRef } from "react";
import { Switch, TextField, Tooltip } from "@mui/material";
import ArrowBackIosNew from "@mui/icons-material/ArrowBackIosNew";
import EditOutlined from "@mui/icons-material/EditOutlined";
import CloudDoneOutlined from "@mui/icons-material/CloudDoneOutlined";
import CloudUploadOutlined from "@mui/icons-material/CloudUploadOutlined";
import CloudOffOutlined from "@mui/icons-material/CloudOffOutlined";
import SaveOutlined from "@mui/icons-material/SaveOutlined";
import FolderOpenOutlined from "@mui/icons-material/FolderOpenOutlined";
import AutoFixHighOutlined from "@mui/icons-material/AutoFixHighOutlined";
import ShareRounded from "@mui/icons-material/ShareRounded";

const PUBLIC_SWITCH_ICON = encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#0f172a"><path d="M12 2a10 10 0 1 0 10 10A10.01 10.01 0 0 0 12 2Zm6.93 9h-3.1a15.9 15.9 0 0 0-1.38-5.02A8.02 8.02 0 0 1 18.93 11ZM12 4.04c.83 1.2 1.86 3.63 2.16 6.96H9.84C10.14 7.67 11.17 5.24 12 4.04ZM4.07 13h3.1a15.9 15.9 0 0 0 1.38 5.02A8.02 8.02 0 0 1 4.07 13Zm3.1-2h-3.1a8.02 8.02 0 0 1 4.48-5.02A15.9 15.9 0 0 0 7.17 11Zm4.83 8.96c-.83-1.2-1.86-3.63-2.16-6.96h4.32c-.3 3.33-1.33 5.76-2.16 6.96ZM14.45 18.02A15.9 15.9 0 0 0 15.83 13h3.1a8.02 8.02 0 0 1-4.48 5.02Z"/></svg>',
);
const PRIVATE_SWITCH_ICON = encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#0f172a"><path d="M17 8h-1V6a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2Zm-6 8.73V17a1 1 0 1 0 2 0v-.27a2 2 0 1 0-2 0ZM10 8V6a2 2 0 0 1 4 0v2Z"/></svg>',
);

type EditHeaderProps = {
  title: string;
  titleDraft: string;
  isTitleEditing: boolean;
  onTitleDraftChange: (value: string) => void;
  onTitleSave: () => void;
  onTitleCancel: () => void;
  onStartEdit: () => void;
  showApplyPlaylistTitle: boolean;
  onApplyPlaylistTitle: () => void;
  onBack: () => void;
  onSave: () => void;
  isSaving: boolean;
  isReadOnly: boolean;
  savingLabel: string;
  savedLabel: string;
  saveErrorLabel: string;
  saveStatus: "idle" | "saving" | "saved" | "error";
  saveError: string | null;
  autoSaveNotice: { type: "success" | "error"; message: string } | null;
  hasUnsavedChanges: boolean;
  visibility: "private" | "public";
  onVisibilityChange: (value: "private" | "public") => void;
  collectionCount: number;
  onShare: () => void;
  shareCopied: boolean;
  shareDisabled: boolean;
  onCollectionButtonClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onAiBatchEditClick: () => void;
  aiBatchDisabled: boolean;
  collectionMenuOpen: boolean;
};

const EditHeader = ({
  title,
  titleDraft,
  isTitleEditing,
  onTitleDraftChange,
  onTitleSave,
  onTitleCancel,
  onStartEdit,
  showApplyPlaylistTitle,
  onApplyPlaylistTitle,
  onBack,
  onSave,
  isSaving,
  isReadOnly,
  savingLabel,
  savedLabel,
  saveErrorLabel,
  saveStatus,
  saveError,
  autoSaveNotice,
  hasUnsavedChanges,
  visibility,
  onVisibilityChange,
  collectionCount,
  onShare,
  shareCopied,
  shareDisabled,
  onCollectionButtonClick,
  onAiBatchEditClick,
  aiBatchDisabled,
  collectionMenuOpen,
}: EditHeaderProps) => {
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const trimmedTitleDraft = titleDraft.trim();
  const showSaved =
    !hasUnsavedChanges && !isSaving && saveStatus !== "error" && !saveError;
  const isAutoSaving = isSaving && autoSaveNotice?.type === "success";
  const isAutoSaveError = autoSaveNotice?.type === "error";
  const buttonLabel = isAutoSaving
    ? "自動儲存中"
    : isSaving
      ? savingLabel
      : saveStatus === "error"
        ? saveErrorLabel
        : showSaved
          ? autoSaveNotice?.type === "success"
            ? "已自動儲存"
            : savedLabel
          : "儲存";
  const buttonIcon = isAutoSaving ? (
    <CloudUploadOutlined fontSize="medium" />
  ) : saveStatus === "error" || isAutoSaveError ? (
    <CloudOffOutlined fontSize="medium" />
  ) : showSaved ? (
    <CloudDoneOutlined fontSize="medium" />
  ) : (
    <SaveOutlined fontSize="medium" />
  );

  useEffect(() => {
    if (!isTitleEditing) return;
    window.requestAnimationFrame(() => {
      const input = titleInputRef.current;
      if (!input) return;
      input.focus();
      const end = input.value.length;
      input.setSelectionRange(end, end);
    });
  }, [isTitleEditing]);

  const handleTitleCommit = () => {
    if (!trimmedTitleDraft) {
      onTitleCancel();
      return;
    }
    onTitleSave();
  };

  const handleTitleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onTitleCancel();
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      handleTitleCommit();
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            aria-label="返回收藏庫"
            className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[var(--mc-surface-strong)]/40 text-xs text-[var(--mc-text)] transition hover:bg-[var(--mc-surface-strong)]/60"
          >
            <ArrowBackIosNew fontSize="inherit" />
          </button>
          {isTitleEditing ? (
            <form
              className="flex min-w-0 flex-1 items-center"
              onSubmit={(event) => {
                event.preventDefault();
                handleTitleCommit();
              }}
            >
              <TextField
                variant="standard"
                value={titleDraft}
                onChange={(event) => onTitleDraftChange(event.target.value)}
                onKeyDown={handleTitleKeyDown}
                onBlur={handleTitleCommit}
                inputRef={titleInputRef}
                placeholder="請輸入收藏庫名稱"
                className="min-w-0 flex-1"
                sx={{
                  "& .MuiInputBase-root": {
                    minHeight: 44,
                    color: "var(--mc-text)",
                    fontSize: {
                      xs: "1.125rem",
                      sm: "1.25rem",
                    },
                    fontWeight: 600,
                    lineHeight: 1.15,
                  },
                  "& .MuiInputBase-input": {
                    padding: "8px 0 7px",
                  },
                  "& .MuiInput-underline:before": {
                    borderBottomColor: "rgba(148, 163, 184, 0.35)",
                  },
                  "& .MuiInput-underline:after": {
                    borderBottomColor: "rgba(251, 191, 36, 0.75)",
                  },
                  "& .MuiInput-underline:hover:not(.Mui-disabled):before": {
                    borderBottomColor: "rgba(148, 163, 184, 0.55)",
                  },
                  "& .MuiInputBase-input::placeholder": {
                    color: "var(--mc-text-muted)",
                    opacity: 1,
                  },
                }}
              />
            </form>
          ) : (
            <div className="flex min-w-0 items-center gap-1">
              <button
                type="button"
                onClick={onStartEdit}
                className="flex min-h-11 min-w-0 cursor-pointer items-center text-left"
                aria-label="編輯收藏庫名稱"
              >
                <h2 className="min-w-0 truncate text-lg font-semibold leading-[1.15] text-[var(--mc-text)] sm:text-xl">
                  {title || "未命名收藏庫"}
                </h2>
              </button>
              <button
                type="button"
                onClick={onStartEdit}
                aria-label="編輯名稱"
                className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[var(--mc-surface-strong)]/40 text-xs text-[var(--mc-text)] transition hover:bg-[var(--mc-surface-strong)]/60"
              >
                <EditOutlined fontSize="inherit" />
              </button>
            </div>
          )}
        </div>
        <div className="inline-flex shrink-0 items-center">
          <Tooltip title={visibility === "public" ? "公開中" : "私人"}>
            <Switch
              size="small"
              checked={visibility === "public"}
              onChange={(_, checked) =>
                onVisibilityChange(checked ? "public" : "private")
              }
              inputProps={{
                "aria-label": "切換收藏庫公開狀態",
              }}
              sx={{
                width: 52,
                height: 32,
                padding: 0,
                "& .MuiSwitch-switchBase": {
                  padding: "4px",
                  transitionDuration: "200ms",
                },
                "& .MuiSwitch-switchBase.Mui-checked": {
                  transform: "translateX(20px)",
                  color: "#fff",
                },
                "& .MuiSwitch-thumb": {
                  position: "relative",
                  width: 24,
                  height: 24,
                  boxShadow: "none",
                  backgroundColor: "var(--mc-text)",
                  "&::before": {
                    content: '""',
                    position: "absolute",
                    inset: 0,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "center",
                    backgroundSize: "16px 16px",
                    backgroundImage: `url("data:image/svg+xml,${visibility === "public" ? PUBLIC_SWITCH_ICON : PRIVATE_SWITCH_ICON}")`,
                  },
                },
                "& .MuiSwitch-track": {
                  borderRadius: 999,
                  backgroundColor: "rgba(148, 163, 184, 0.28)",
                  opacity: 1,
                },
                "& .Mui-checked + .MuiSwitch-track": {
                  backgroundColor: "var(--mc-accent)",
                  opacity: 0.65,
                },
              }}
            />
          </Tooltip>
        </div>
      </div>

      {showApplyPlaylistTitle && !isTitleEditing ? (
        <div className="flex justify-start">
          <button
            type="button"
            onClick={onApplyPlaylistTitle}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/70 px-3 py-1 text-xs text-[var(--mc-text)] transition hover:border-[var(--mc-accent)]/60"
          >
            套用播放清單名稱
          </button>
        </div>
      ) : null}

      <div className="flex w-full flex-wrap items-center gap-2 lg:justify-end">
        <div className="inline-flex items-center gap-2">
          <span className="text-sm font-semibold tabular-nums text-[var(--mc-text-muted)]">
            {collectionCount}
          </span>
          <Tooltip title={`收藏庫 (${collectionCount})`}>
            <button
              type="button"
              onClick={onCollectionButtonClick}
              aria-label="收藏庫"
              className={`inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-[var(--mc-text)] transition ${
                collectionMenuOpen
                  ? "bg-[var(--mc-surface-strong)]/95 ring-1 ring-[var(--mc-accent)]/45"
                  : "bg-[var(--mc-surface-strong)]/70 hover:bg-[var(--mc-surface-strong)]/90"
              }`}
            >
              <FolderOpenOutlined fontSize="medium" />
            </button>
          </Tooltip>
        </div>
        <Tooltip title={shareCopied ? "已複製分享連結" : "分享收藏庫"}>
          <button
            type="button"
            onClick={onShare}
            disabled={shareDisabled}
            aria-label="分享收藏庫"
            className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[var(--mc-surface-strong)]/70 text-[var(--mc-text)] transition hover:bg-[var(--mc-surface-strong)]/90 disabled:cursor-not-allowed disabled:bg-[var(--mc-surface)]/40 disabled:text-[var(--mc-text-muted)] disabled:opacity-70"
          >
            <ShareRounded fontSize="medium" />
          </button>
        </Tooltip>
        <Tooltip title="AI 批次編輯">
          <button
            type="button"
            onClick={onAiBatchEditClick}
            disabled={aiBatchDisabled}
            aria-label="AI 批次編輯"
            className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[var(--mc-surface-strong)]/70 text-[var(--mc-text)] transition hover:bg-[var(--mc-surface-strong)]/90 disabled:cursor-not-allowed disabled:bg-[var(--mc-surface)]/40 disabled:text-[var(--mc-text-muted)] disabled:opacity-70"
          >
            <AutoFixHighOutlined fontSize="medium" />
          </button>
        </Tooltip>
        <Tooltip title={saveError ? `${buttonLabel}：${saveError}` : buttonLabel}>
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving || isReadOnly || !hasUnsavedChanges}
            aria-label={buttonLabel}
            className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[var(--mc-surface-strong)]/70 text-[var(--mc-text)] transition hover:bg-[var(--mc-surface-strong)]/90 disabled:cursor-not-allowed disabled:bg-[var(--mc-surface)]/40 disabled:text-[var(--mc-text-muted)] disabled:opacity-70"
          >
            {buttonIcon}
          </button>
        </Tooltip>
      </div>
    </div>
  );
};

export default EditHeader;
