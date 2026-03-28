import { useEffect, useRef } from "react";
import { Button, Switch, TextField, Tooltip } from "@mui/material";
import ArrowBackIosNew from "@mui/icons-material/ArrowBackIosNew";
import EditOutlined from "@mui/icons-material/EditOutlined";
import CloudDoneOutlined from "@mui/icons-material/CloudDoneOutlined";
import CloudUploadOutlined from "@mui/icons-material/CloudUploadOutlined";
import CloudOffOutlined from "@mui/icons-material/CloudOffOutlined";
import SaveOutlined from "@mui/icons-material/SaveOutlined";
import LockOutlined from "@mui/icons-material/LockOutlined";
import PublicOutlined from "@mui/icons-material/PublicOutlined";
import FolderOpenOutlined from "@mui/icons-material/FolderOpenOutlined";
import AutoFixHighOutlined from "@mui/icons-material/AutoFixHighOutlined";
import ShareRounded from "@mui/icons-material/ShareRounded";
import ExpandMore from "@mui/icons-material/ExpandMore";
import ExpandLess from "@mui/icons-material/ExpandLess";

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
  onPlaylistButtonClick: () => void;
  onAiBatchEditClick: () => void;
  aiBatchDisabled: boolean;
  collectionMenuOpen: boolean;
  playlistMenuOpen: boolean;
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
  onPlaylistButtonClick,
  onAiBatchEditClick,
  aiBatchDisabled,
  collectionMenuOpen,
  playlistMenuOpen,
}: EditHeaderProps) => {
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const trimmedTitleDraft = titleDraft.trim();
  const showSaved =
    !hasUnsavedChanges && !isSaving && saveStatus !== "error" && !saveError;
  const isAutoSaving = isSaving && autoSaveNotice?.type === "success";
  const isAutoSaveError = autoSaveNotice?.type === "error";
  const buttonLabel = isAutoSaving
    ? "保存中"
    : isSaving
      ? savingLabel
      : saveStatus === "error"
        ? saveErrorLabel
        : showSaved
          ? autoSaveNotice?.type === "success"
            ? "已同步"
            : savedLabel
          : "保存";
  const buttonIcon = isAutoSaving ? (
    <CloudUploadOutlined fontSize="small" />
  ) : saveStatus === "error" || isAutoSaveError ? (
    <CloudOffOutlined fontSize="small" />
  ) : showSaved ? (
    <CloudDoneOutlined fontSize="small" />
  ) : (
    <SaveOutlined fontSize="small" />
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
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <Tooltip title="返回收藏庫">
            <button
              type="button"
              onClick={onBack}
              aria-label="返回收藏庫"
              className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-[var(--mc-surface-strong)]/40 text-xs text-[var(--mc-text)] transition hover:bg-[var(--mc-surface-strong)]/60"
            >
              <ArrowBackIosNew fontSize="inherit" />
            </button>
          </Tooltip>
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
                onChange={(e) => onTitleDraftChange(e.target.value)}
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
            <>
              <button
                type="button"
                onClick={onStartEdit}
                className="flex min-h-11 min-w-0 flex-1 items-center text-left"
                aria-label="編輯收藏庫名稱"
              >
                <h2 className="min-w-0 truncate text-lg font-semibold leading-[1.15] text-[var(--mc-text)] sm:text-xl">
                  {title || "未命名收藏庫"}
                </h2>
              </button>
              <Tooltip title="編輯名稱">
                <button
                  type="button"
                  onClick={onStartEdit}
                  aria-label="編輯名稱"
                  className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-[var(--mc-surface-strong)]/40 text-xs text-[var(--mc-text)] transition hover:bg-[var(--mc-surface-strong)]/60"
                >
                  <EditOutlined fontSize="inherit" />
                </button>
              </Tooltip>
              {showApplyPlaylistTitle && (
                <button
                  type="button"
                  onClick={onApplyPlaylistTitle}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/70 px-3 py-1 text-xs text-[var(--mc-text)] hover:border-[var(--mc-accent)]/60"
                >
                  套用播放清單名稱
                </button>
              )}
            </>
          )}
        </div>
      </div>
      <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:justify-end">
        <button
          type="button"
          onClick={onCollectionButtonClick}
          className="inline-flex min-w-0 flex-1 items-center justify-between gap-2 rounded-full border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/70 px-3 py-1 text-xs text-[var(--mc-text)] hover:border-[var(--mc-accent)]/60 sm:flex-none sm:justify-start"
        >
          <FolderOpenOutlined fontSize="inherit" />
          收藏庫
          <span className="text-[10px] text-[var(--mc-text-muted)]">
            {collectionCount}
          </span>
          {collectionMenuOpen ? (
            <ExpandLess fontSize="inherit" />
          ) : (
            <ExpandMore fontSize="inherit" />
          )}
        </button>
        <button
          type="button"
          onClick={onPlaylistButtonClick}
          className="inline-flex min-w-0 flex-1 items-center justify-between gap-2 rounded-full border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/70 px-3 py-1 text-xs text-[var(--mc-text)] hover:border-[var(--mc-accent)]/60 sm:flex-none sm:justify-start"
        >
          播放清單
          {playlistMenuOpen ? (
            <ExpandLess fontSize="inherit" />
          ) : (
            <ExpandMore fontSize="inherit" />
          )}
        </button>
        <Tooltip
          title={
            shareCopied ? "分享收藏庫" : "分享收藏庫"
          }
        >
          <button
            type="button"
            onClick={onShare}
            disabled={shareDisabled}
            aria-label="分享收藏庫"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--mc-surface-strong)]/70 text-[var(--mc-text)] transition hover:bg-[var(--mc-surface-strong)]/90 disabled:cursor-not-allowed disabled:bg-[var(--mc-surface)]/40 disabled:text-[var(--mc-text-muted)] disabled:opacity-70"
          >
            <ShareRounded fontSize="small" />
          </button>
        </Tooltip>
        <button
          type="button"
          onClick={onAiBatchEditClick}
          disabled={aiBatchDisabled}
          className="inline-flex min-w-[calc(50%-0.25rem)] items-center justify-center gap-2 rounded-full border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/70 px-3 py-1 text-xs text-[var(--mc-text)] hover:border-[var(--mc-accent)]/60 disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-0"
        >
          <AutoFixHighOutlined fontSize="inherit" />
          AI 批次修正答案
        </button>
        <div className="inline-flex min-w-[calc(50%-0.25rem)] items-center justify-center gap-2 rounded-full border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/70 px-2 py-1 sm:min-w-0">
          <Tooltip title={visibility === "public" ? "公開中" : "私人"}>
            <span className="inline-flex items-center gap-1 text-xs text-[var(--mc-text)]">
              {visibility === "public" ? (
                <PublicOutlined fontSize="small" />
              ) : (
                <LockOutlined fontSize="small" />
              )}
              {visibility === "public" ? "公開" : "私人"}
            </span>
          </Tooltip>
          <Switch
            size="small"
            checked={visibility === "public"}
            onChange={(_, checked) =>
              onVisibilityChange(checked ? "public" : "private")
            }
            sx={{
              "& .MuiSwitch-thumb": { backgroundColor: "var(--mc-text)" },
              "& .MuiSwitch-track": {
                backgroundColor: "var(--mc-border)",
                opacity: 1,
              },
              "& .Mui-checked + .MuiSwitch-track": {
                backgroundColor: "var(--mc-accent)",
                opacity: 0.65,
              },
            }}
          />
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Button
            variant="outlined"
            size="small"
            onClick={onSave}
            disabled={isSaving || isReadOnly || !hasUnsavedChanges}
            title={saveError ? `${saveErrorLabel}: ${saveError}` : undefined}
            startIcon={buttonIcon}
            className="!h-9 w-full shrink-0 justify-center !border-[var(--mc-border)] !bg-[var(--mc-surface-strong)]/70 !text-[var(--mc-text)] hover:!border-[var(--mc-accent)]/60 disabled:!border-[var(--mc-border)]/40 disabled:!bg-[var(--mc-surface)]/40 disabled:!text-[var(--mc-text-muted)] disabled:opacity-70 sm:!h-auto sm:min-w-[120px] sm:w-[120px]"
            sx={{
              "& .MuiButton-startIcon": {
                marginLeft: 0,
                marginRight: "6px",
                width: 20,
                justifyContent: "center",
              },
            }}
          >
            {buttonLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EditHeader;
