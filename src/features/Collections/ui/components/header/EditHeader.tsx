import { useEffect, useRef } from "react";
import { Button, Switch, TextField, Tooltip } from "@mui/material";
import ArrowBackIosNew from "@mui/icons-material/ArrowBackIosNew";
import EditOutlined from "@mui/icons-material/EditOutlined";
import CloudDoneOutlined from "@mui/icons-material/CloudDoneOutlined";
import CloudUploadOutlined from "@mui/icons-material/CloudUploadOutlined";
import CloudOffOutlined from "@mui/icons-material/CloudOffOutlined";
import SaveOutlined from "@mui/icons-material/SaveOutlined";
import FolderOpenOutlined from "@mui/icons-material/FolderOpenOutlined";
import AutoFixHighOutlined from "@mui/icons-material/AutoFixHighOutlined";
import ShareRounded from "@mui/icons-material/ShareRounded";
import ExpandMore from "@mui/icons-material/ExpandMore";
import ExpandLess from "@mui/icons-material/ExpandLess";

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
    ? "\u81ea\u52d5\u5132\u5b58\u4e2d"
    : isSaving
      ? savingLabel
      : saveStatus === "error"
        ? saveErrorLabel
        : showSaved
          ? autoSaveNotice?.type === "success"
            ? "\u5df2\u81ea\u52d5\u5132\u5b58"
            : savedLabel
          : "\u5132\u5b58";
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
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            aria-label="\u8fd4\u56de\u6536\u85cf\u5eab"
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
                placeholder="\u8acb\u8f38\u5165\u6536\u85cf\u5eab\u540d\u7a31"
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
                aria-label="\u7de8\u8f2f\u6536\u85cf\u5eab\u540d\u7a31"
              >
                <h2 className="min-w-0 truncate text-lg font-semibold leading-[1.15] text-[var(--mc-text)] sm:text-xl">
                  {title || "\u672a\u547d\u540d\u6536\u85cf\u5eab"}
                </h2>
              </button>
              <button
                type="button"
                onClick={onStartEdit}
                aria-label="\u7de8\u8f2f\u540d\u7a31"
                className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[var(--mc-surface-strong)]/40 text-xs text-[var(--mc-text)] transition hover:bg-[var(--mc-surface-strong)]/60"
              >
                <EditOutlined fontSize="inherit" />
              </button>
            </div>
          )}
        </div>
        <div className="inline-flex shrink-0 items-center">
          <Tooltip
            title={
              visibility === "public"
                ? "\u516c\u958b\u4e2d"
                : "\u79c1\u4eba"
            }
          >
            <Switch
              size="small"
              checked={visibility === "public"}
              onChange={(_, checked) =>
                onVisibilityChange(checked ? "public" : "private")
              }
              inputProps={{
                "aria-label": "\u5207\u63db\u6536\u85cf\u5eab\u516c\u958b\u72c0\u614b",
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
            {"\u5957\u7528\u64ad\u653e\u6e05\u55ae\u540d\u7a31"}
          </button>
        </div>
      ) : null}

      <div className="flex w-full flex-wrap items-center gap-2 lg:justify-end">
        <button
          type="button"
          onClick={onCollectionButtonClick}
          className="inline-flex min-w-0 flex-1 items-center justify-between gap-2 rounded-full border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/70 px-3 py-1 text-xs text-[var(--mc-text)] transition hover:border-[var(--mc-accent)]/60 sm:flex-none sm:justify-start"
        >
          <FolderOpenOutlined fontSize="inherit" />
          {"\u6536\u85cf\u5eab"}
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
          className="inline-flex min-w-0 flex-1 items-center justify-between gap-2 rounded-full border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/70 px-3 py-1 text-xs text-[var(--mc-text)] transition hover:border-[var(--mc-accent)]/60 sm:flex-none sm:justify-start"
        >
          {"\u64ad\u653e\u6e05\u55ae"}
          {playlistMenuOpen ? (
            <ExpandLess fontSize="inherit" />
          ) : (
            <ExpandMore fontSize="inherit" />
          )}
        </button>
        <Tooltip
          title={
            shareCopied
              ? "\u5df2\u8907\u88fd\u5206\u4eab\u9023\u7d50"
              : "\u5206\u4eab\u6536\u85cf\u5eab"
          }
        >
          <button
            type="button"
            onClick={onShare}
            disabled={shareDisabled}
            aria-label="\u5206\u4eab\u6536\u85cf\u5eab"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--mc-surface-strong)]/70 text-[var(--mc-text)] transition hover:bg-[var(--mc-surface-strong)]/90 disabled:cursor-not-allowed disabled:bg-[var(--mc-surface)]/40 disabled:text-[var(--mc-text-muted)] disabled:opacity-70"
          >
            <ShareRounded fontSize="small" />
          </button>
        </Tooltip>
        <button
          type="button"
          onClick={onAiBatchEditClick}
          disabled={aiBatchDisabled}
          className="inline-flex min-w-[calc(50%-0.25rem)] items-center justify-center gap-2 rounded-full border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/70 px-3 py-1 text-xs text-[var(--mc-text)] transition hover:border-[var(--mc-accent)]/60 disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-0"
        >
          <AutoFixHighOutlined fontSize="inherit" />
          {"AI \u6279\u6b21\u7de8\u8f2f"}
        </button>
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
