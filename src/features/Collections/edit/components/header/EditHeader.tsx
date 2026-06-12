import { useEffect, useRef, useState, type ReactNode } from "react";
import { Drawer, IconButton, Switch, TextField, Tooltip } from "@mui/material";
import ArrowBackIosNew from "@mui/icons-material/ArrowBackIosNew";
import CloseRounded from "@mui/icons-material/CloseRounded";
import EditOutlined from "@mui/icons-material/EditOutlined";
import CloudDoneOutlined from "@mui/icons-material/CloudDoneOutlined";
import CloudUploadOutlined from "@mui/icons-material/CloudUploadOutlined";
import CloudOffOutlined from "@mui/icons-material/CloudOffOutlined";
import SaveOutlined from "@mui/icons-material/SaveOutlined";
import FolderOpenOutlined from "@mui/icons-material/FolderOpenOutlined";
import ShareRounded from "@mui/icons-material/ShareRounded";
import LabelOutlined from "@mui/icons-material/LabelOutlined";

const PUBLIC_SWITCH_ICON = encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#0f172a"><path d="M12 2a10 10 0 1 0 10 10A10.01 10.01 0 0 0 12 2Zm6.93 9h-3.1a15.9 15.9 0 0 0-1.38-5.02A8.02 8.02 0 0 1 18.93 11ZM12 4.04c.83 1.2 1.86 3.63 2.16 6.96H9.84C10.14 7.67 11.17 5.24 12 4.04ZM4.07 13h3.1a15.9 15.9 0 0 0 1.38 5.02A8.02 8.02 0 0 1 4.07 13Zm3.1-2h-3.1a8.02 8.02 0 0 1 4.48-5.02A15.9 15.9 0 0 0 7.17 11Zm4.83 8.96c-.83-1.2-1.86-3.63-2.16-6.96h4.32c-.3 3.33-1.33 5.76-2.16 6.96ZM14.45 18.02A15.9 15.9 0 0 0 15.83 13h3.1a8.02 8.02 0 0 1-4.48 5.02Z"/></svg>',
);
const PRIVATE_SWITCH_ICON = encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#0f172a"><path d="M17 8h-1V6a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2Zm-6 8.73V17a1 1 0 1 0 2 0v-.27a2 2 0 1 0-2 0ZM10 8V6a2 2 0 0 1 4 0v2Z"/></svg>',
);

type EditHeaderProps = {
  title: string;
  titleDraft: string;
  descriptionDraft: string;
  isTitleEditing: boolean;
  onTitleDraftChange: (value: string) => void;
  onDescriptionDraftChange: (value: string) => void;
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
  collectionMenuOpen: boolean;
  /** Content to render inside the category drawer (passed from parent to keep state ownership there) */
  categoryDrawerContent?: ReactNode;
  /** Whether the category has been set */
  hasCategorySet?: boolean;
  /** Whether this is a public collection (red dot when public + no category) */
  collectionIsPublic?: boolean;
  /** Whether category auto-save is in progress */
  categorySaving?: boolean;
  /** Whether auto-detect has a pending suggestion the user hasn't applied yet */
  categoryHasSuggestion?: boolean;
  /** Compact moderation indicator rendered inline in the title row */
  moderationSlot?: ReactNode;
  /** True when the collection is flagged (待處理/審核中) — on mobile the
   *  visibility switch is hidden to give the moderation chip room. */
  moderationActive?: boolean;
};

const EditHeader = ({
  title,
  titleDraft,
  descriptionDraft,
  isTitleEditing,
  onTitleDraftChange,
  onDescriptionDraftChange,
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
  collectionMenuOpen,
  categoryDrawerContent,
  hasCategorySet = false,
  collectionIsPublic = false,
  categorySaving = false,
  categoryHasSuggestion = false,
  moderationSlot,
  moderationActive = false,
}: EditHeaderProps) => {
  const [categoryDrawerOpen, setCategoryDrawerOpen] = useState(false);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const trimmedTitleDraft = titleDraft.trim();
  const TITLE_MAX_LENGTH = 80;
  const DESCRIPTION_MAX_LENGTH = 500;
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
            className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-xs text-[var(--mc-text-muted)] transition hover:text-[var(--mc-text)]"
          >
            <ArrowBackIosNew fontSize="inherit" />
          </button>
          <div className="flex min-w-0 items-center gap-1">
            <button
              type="button"
              onClick={onStartEdit}
              className="flex min-h-11 min-w-0 cursor-pointer items-center text-left"
              aria-label="編輯收藏庫資訊"
            >
              <h2 className="min-w-0 truncate text-lg font-semibold leading-[1.15] text-[var(--mc-text)] sm:text-xl">
                {title || "未命名收藏庫"}
              </h2>
            </button>
            <button
              type="button"
              onClick={onStartEdit}
              aria-label="編輯收藏庫資訊"
              className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-xs text-[var(--mc-text-muted)] transition hover:text-[var(--mc-text)]"
            >
              <EditOutlined fontSize="inherit" />
            </button>

            {/* Category button — opens the category drawer */}
            {categoryDrawerContent && (
              <Tooltip title="分類設定">
                <button
                  type="button"
                  onClick={() => setCategoryDrawerOpen(true)}
                  aria-label="分類設定"
                  className="relative inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-xs text-[var(--mc-text-muted)] transition hover:text-[var(--mc-text)]"
                >
                  <LabelOutlined fontSize="inherit" />
                  {/* Red dot: only when public collection has no category (urgent) */}
                  {/* Amber dot: saving in progress */}
                  {/* No dot: category set, or private without category (not urgent) */}
                  {categorySaving ? (
                    <span className="absolute right-0.5 top-0.5 h-2 w-2 animate-pulse rounded-full bg-amber-400" />
                  ) : !hasCategorySet && collectionIsPublic ? (
                    <span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-red-500" />
                  ) : categoryHasSuggestion ? (
                    <span className="absolute right-0.5 top-0.5 h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
                  ) : null}
                </button>
              </Tooltip>
            )}

            {moderationSlot}
          </div>
        </div>
        <div className="inline-flex shrink-0 items-center gap-1.5">
          {/* Flagged collections can't appear publicly anyway — hide the
              visibility switch on mobile so the moderation chip has room. */}
          <span
            className={
              moderationActive ? "hidden sm:inline-flex" : "inline-flex"
            }
          >
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
          </span>
          <span className="ml-1 text-sm font-semibold tabular-nums text-[var(--mc-text-muted)]">
            {collectionCount}
          </span>
          <Tooltip title={`收藏庫 (${collectionCount})`}>
            <button
              type="button"
              onClick={onCollectionButtonClick}
              aria-label="收藏庫"
              className={`inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-[var(--mc-text-muted)] transition hover:text-[var(--mc-text)] ${
                collectionMenuOpen ? "text-[var(--mc-accent)]" : ""
              }`}
            >
              <FolderOpenOutlined fontSize="small" />
            </button>
          </Tooltip>
          <Tooltip title={shareCopied ? "已複製分享連結" : "分享收藏庫"}>
            <button
              type="button"
              onClick={onShare}
              disabled={shareDisabled}
              aria-label="分享收藏庫"
              className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-[var(--mc-text-muted)] transition hover:text-[var(--mc-text)] disabled:cursor-not-allowed disabled:text-[var(--mc-text-muted)] disabled:opacity-45"
            >
              <ShareRounded fontSize="small" />
            </button>
          </Tooltip>
          <Tooltip
            title={saveError ? `${buttonLabel}：${saveError}` : buttonLabel}
          >
            <button
              type="button"
              onClick={onSave}
              disabled={isSaving || isReadOnly || !hasUnsavedChanges}
              aria-label={buttonLabel}
              className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-[var(--mc-text-muted)] transition hover:text-[var(--mc-text)] disabled:cursor-not-allowed disabled:text-[var(--mc-text-muted)] disabled:opacity-45"
            >
              {buttonIcon}
            </button>
          </Tooltip>
        </div>
      </div>

      {showApplyPlaylistTitle && !isTitleEditing ? (
        <div className="flex justify-start">
          <button
            type="button"
            onClick={onApplyPlaylistTitle}
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs text-[var(--mc-text-muted)] transition hover:text-[var(--mc-text)]"
          >
            套用播放清單名稱
          </button>
        </div>
      ) : null}

      <Drawer
        anchor="right"
        open={isTitleEditing}
        onClose={onTitleCancel}
        slotProps={{
          paper: {
            sx: {
              width: "min(420px, 100vw)",
              background:
                "linear-gradient(180deg, #10151d 0%, #0b1017 54%, #080b10 100%)",
              color: "var(--mc-text)",
              borderLeft: "1px solid rgba(148,163,184,0.22)",
            },
          },
        }}
      >
        <form
          className="flex h-full min-h-0 flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            handleTitleCommit();
          }}
        >
          <header className="flex items-start justify-between gap-3 border-b border-[var(--mc-border)]/80 px-5 py-4">
            <div>
              <div className="text-lg font-semibold text-[var(--mc-text)]">
                編輯收藏庫資訊
              </div>
              <div className="mt-1 text-sm text-[var(--mc-text-muted)]">
                調整標題與描述，方便玩家辨識題庫內容。
              </div>
            </div>
            <IconButton
              aria-label="關閉編輯收藏庫資訊"
              onClick={onTitleCancel}
              size="small"
              sx={{ color: "var(--mc-text-muted)" }}
            >
              <CloseRounded fontSize="small" />
            </IconButton>
          </header>

          <main className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <TextField
              label="收藏庫標題"
              value={titleDraft}
              onChange={(event) =>
                onTitleDraftChange(
                  event.target.value.slice(0, TITLE_MAX_LENGTH),
                )
              }
              onKeyDown={handleTitleKeyDown}
              inputRef={titleInputRef}
              placeholder="請輸入收藏庫名稱"
              fullWidth
              helperText={`${titleDraft.length}/${TITLE_MAX_LENGTH}`}
              slotProps={{
                htmlInput: { maxLength: TITLE_MAX_LENGTH },
                inputLabel: { shrink: true },
              }}
              sx={{
                mb: 2,
                "& .MuiInputBase-root": {
                  color: "var(--mc-text)",
                  backgroundColor: "var(--mc-surface-strong)",
                  borderRadius: "0.875rem",
                },
                "& .MuiInputLabel-root, & .MuiFormHelperText-root": {
                  color: "var(--mc-text-muted)",
                },
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "var(--mc-border)",
                },
              }}
            />
            <TextField
              label="描述"
              value={descriptionDraft}
              onChange={(event) =>
                onDescriptionDraftChange(
                  event.target.value.slice(0, DESCRIPTION_MAX_LENGTH),
                )
              }
              placeholder="簡短說明這份題庫的曲風、主題或適合的遊玩場合"
              fullWidth
              multiline
              minRows={5}
              helperText={`${descriptionDraft.length}/${DESCRIPTION_MAX_LENGTH}`}
              slotProps={{
                htmlInput: { maxLength: DESCRIPTION_MAX_LENGTH },
                inputLabel: { shrink: true },
              }}
              sx={{
                "& .MuiInputBase-root": {
                  color: "var(--mc-text)",
                  backgroundColor: "var(--mc-surface-strong)",
                  borderRadius: "0.875rem",
                },
                "& .MuiInputLabel-root, & .MuiFormHelperText-root": {
                  color: "var(--mc-text-muted)",
                },
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "var(--mc-border)",
                },
              }}
            />
          </main>

          <footer className="border-t border-[var(--mc-border)]/80 px-5 py-4">
            <button
              type="submit"
              disabled={!trimmedTitleDraft}
              className="inline-flex h-11 w-full items-center justify-center rounded-full bg-[var(--mc-accent)] px-4 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-[var(--mc-surface-strong)] disabled:text-[var(--mc-text-muted)]"
            >
              儲存收藏庫資訊
            </button>
          </footer>
        </form>
      </Drawer>

      {/* Category Drawer — slides from right, narrow refined panel */}
      {categoryDrawerContent && (
        <Drawer
          anchor="right"
          open={categoryDrawerOpen}
          onClose={() => setCategoryDrawerOpen(false)}
          PaperProps={{
            sx: {
              width: "min(400px, 92vw)",
              maxWidth: "92vw",
              backgroundColor: "rgba(2, 6, 23, 0.92)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              borderLeft: "1px solid rgba(34, 211, 238, 0.12)",
              color: "var(--mc-text)",
              boxShadow:
                "-24px 0 60px -20px rgba(2, 6, 23, 0.8), inset 1px 0 0 rgba(255,255,255,0.04)",
              backgroundImage:
                "linear-gradient(180deg, rgba(8,47,73,0.12) 0%, transparent 30%)",
            },
          }}
        >
          <div className="flex h-full flex-col">
            {/* Header — clean, no decoration */}
            <header className="relative flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
              <span className="text-[15px] font-semibold text-white">
                分類設定
              </span>
              <IconButton
                aria-label="關閉分類設定"
                onClick={() => setCategoryDrawerOpen(false)}
                size="small"
                sx={{
                  color: "rgba(255,255,255,0.5)",
                  "&:hover": { color: "rgba(255,255,255,0.9)" },
                }}
              >
                <CloseRounded fontSize="small" />
              </IconButton>
            </header>
            <div className="flex-1 overflow-y-auto">
              {categoryDrawerContent}
            </div>
          </div>
        </Drawer>
      )}
    </div>
  );
};

export default EditHeader;
