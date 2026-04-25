import { useMemo, useState, type RefObject } from "react";
import EditOutlined from "@mui/icons-material/EditOutlined";
import SearchRounded from "@mui/icons-material/SearchRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import WarningAmberRounded from "@mui/icons-material/WarningAmberRounded";
import CheckCircleOutlineRounded from "@mui/icons-material/CheckCircleOutlineRounded";
import ErrorOutlineRounded from "@mui/icons-material/ErrorOutlineRounded";
import LibraryMusicRounded from "@mui/icons-material/LibraryMusicRounded";
import { CircularProgress } from "@mui/material";
import { List, type RowComponentProps } from "react-window";
import type { DraftPlaylistItem } from "../utils/createCollectionImport";

const REVIEW_ROW_HEIGHT = 72;

type ReviewFilterMode = "all" | "ready" | "long" | "issues";

type ReviewItemStatus = "ready" | "long";

type ReviewItemView = {
  draftKey: string;
  title: string;
  answerText?: string;
  uploader?: string;
  duration?: string;
  thumbnail?: string;
  status: ReviewItemStatus;
};

type ReviewVirtualRowProps = {
  items: ReviewItemView[];
};

type Props = {
  playlistLoading: boolean;
  isImportingYoutubePlaylist: boolean;
  importProgressPercent: number | null;
  importProgressLabel: string | null;
  playlistSource: "url" | "youtube";
  playlistProgressTotal: number;

  collectionPreview: {
    title: string;
    count: number;
  } | null;

  isTitleEditing: boolean;
  titleDraft: string;
  titleInputRef: RefObject<HTMLInputElement | null>;
  onTitleDraftChange: (value: string) => void;
  onStartEditTitle: () => void;
  onSaveTitle: () => void;
  onCancelTitle: () => void;

  isAdmin: boolean;
  collectionItemLimit: number | null;

  normalDraftPlaylistItems: DraftPlaylistItem[];
  longDraftPlaylistItems: DraftPlaylistItem[];

  removedDuplicateCount: number;
  onOpenDuplicateDialog: () => void;

  isDraftOverflow: boolean;
  draftOverflowCount: number;
  onOpenLimitDialog: () => void;

  playlistIssueTotal: number;
  onOpenPlaylistIssueDialog: () => void;
};

const toReviewItems = ({
  normalItems,
  longItems,
}: {
  normalItems: DraftPlaylistItem[];
  longItems: DraftPlaylistItem[];
}): ReviewItemView[] => {
  const normal = normalItems.map((item) => ({
    draftKey: item.draftKey,
    title: item.title || item.answerText || "未命名歌曲",
    answerText: item.answerText,
    uploader: item.uploader,
    duration: item.duration,
    thumbnail: item.thumbnail,
    status: "ready" as const,
  }));

  const long = longItems.map((item) => ({
    draftKey: item.draftKey,
    title: item.title || item.answerText || "未命名歌曲",
    answerText: item.answerText,
    uploader: item.uploader,
    duration: item.duration,
    thumbnail: item.thumbnail,
    status: "long" as const,
  }));

  return [...normal, ...long];
};

const StatusBadge = ({ status }: { status: ReviewItemStatus }) => {
  if (status === "long") {
    return (
      <span className="inline-flex items-center rounded-full border border-amber-300/30 bg-amber-300/10 px-2 py-0.5 text-[10px] font-semibold text-amber-100">
        Long
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full border border-emerald-300/25 bg-emerald-300/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-100">
      Ready
    </span>
  );
};

const ReviewVirtualRow = ({
  index,
  style,
  items,
}: RowComponentProps<ReviewVirtualRowProps>) => {
  const item = items[index];
  if (!item) return <div style={style} />;

  return (
    <div style={style} className="px-2">
      <div className="flex h-[64px] items-center gap-3 rounded-xl border border-transparent px-2 transition hover:border-[var(--mc-border)] hover:bg-[var(--mc-surface-strong)]/35">
        <div className="w-8 shrink-0 text-right text-[11px] tabular-nums text-[var(--mc-text-muted)]">
          {index + 1}
        </div>

        {item.thumbnail ? (
          <img
            src={item.thumbnail}
            alt={item.title || item.answerText || "歌曲封面"}
            loading="lazy"
            className="h-10 w-[72px] shrink-0 rounded-lg border border-[var(--mc-border)] object-cover"
          />
        ) : (
          <div className="flex h-10 w-[72px] shrink-0 items-center justify-center rounded-lg border border-[var(--mc-border)] bg-[linear-gradient(145deg,rgba(56,189,248,0.18),rgba(15,23,42,0.25))] text-[10px] text-[var(--mc-text-muted)]">
            No Cover
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-[var(--mc-text)]">
            {item.title || item.answerText || "未命名歌曲"}
          </div>
          <div className="mt-0.5 truncate text-[11px] text-[var(--mc-text-muted)]">
            {item.uploader || "未知上傳者"}
            {item.duration ? ` · ${item.duration}` : ""}
          </div>
        </div>

        <div className="shrink-0">
          <StatusBadge status={item.status} />
        </div>
      </div>
    </div>
  );
};

const SummaryCard = ({
  label,
  value,
  tone = "default",
  icon,
}: {
  label: string;
  value: number;
  tone?: "default" | "success" | "warning" | "danger";
  icon: React.ReactNode;
}) => {
  const toneClass =
    tone === "success"
      ? "text-emerald-100"
      : tone === "warning"
        ? "text-amber-100"
        : tone === "danger"
          ? "text-rose-100"
          : "text-[var(--mc-text)]";

  return (
    <div className="rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/35 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] font-medium text-[var(--mc-text-muted)]">
          {label}
        </div>
        <div className={toneClass}>{icon}</div>
      </div>
      <div className={`mt-2 text-xl font-semibold tabular-nums ${toneClass}`}>
        {value}
      </div>
    </div>
  );
};

export default function CollectionCreateReviewPanel({
  playlistLoading,
  isImportingYoutubePlaylist,
  importProgressPercent,
  importProgressLabel,
  playlistSource,
  playlistProgressTotal,

  collectionPreview,

  isTitleEditing,
  titleDraft,
  titleInputRef,
  onTitleDraftChange,
  onStartEditTitle,
  onSaveTitle,
  onCancelTitle,

  isAdmin,
  collectionItemLimit,

  normalDraftPlaylistItems,
  longDraftPlaylistItems,

  removedDuplicateCount,
  onOpenDuplicateDialog,

  isDraftOverflow,
  draftOverflowCount,
  onOpenLimitDialog,

  playlistIssueTotal,
  onOpenPlaylistIssueDialog,
}: Props) {
  const [filterMode, setFilterMode] = useState<ReviewFilterMode>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const allReviewItems = useMemo(
    () =>
      toReviewItems({
        normalItems: normalDraftPlaylistItems,
        longItems: longDraftPlaylistItems,
      }),
    [normalDraftPlaylistItems, longDraftPlaylistItems],
  );

  const normalizedSearchQuery = searchQuery.trim().toLocaleLowerCase();

  const filteredItems = useMemo(() => {
    return allReviewItems.filter((item) => {
      if (filterMode === "ready" && item.status !== "ready") return false;
      if (filterMode === "long" && item.status !== "long") return false;
      if (filterMode === "issues") return false;

      if (!normalizedSearchQuery) return true;

      const haystack = [
        item.title,
        item.answerText,
        item.uploader,
        item.duration,
        item.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase();

      return haystack.includes(normalizedSearchQuery);
    });
  }, [allReviewItems, filterMode, normalizedSearchQuery]);

  const reviewRowProps = useMemo<ReviewVirtualRowProps>(
    () => ({ items: filteredItems }),
    [filteredItems],
  );

  const listHeight = Math.min(
    520,
    Math.max(REVIEW_ROW_HEIGHT * 3, filteredItems.length * REVIEW_ROW_HEIGHT),
  );

  const hasIssues =
    removedDuplicateCount > 0 ||
    playlistIssueTotal > 0 ||
    isDraftOverflow ||
    longDraftPlaylistItems.length > 0;

  return (
    <div className="h-full rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface)]/60 p-4">
      {(playlistLoading || isImportingYoutubePlaylist) && (
        <div className="mb-4 rounded-2xl border border-cyan-400/25 bg-cyan-500/8 px-3 py-3">
          <div className="flex items-center gap-3">
            <div className="relative inline-flex h-12 w-12 items-center justify-center">
              <CircularProgress
                size={44}
                thickness={4}
                variant={
                  importProgressPercent === null
                    ? "indeterminate"
                    : "determinate"
                }
                value={importProgressPercent ?? undefined}
                sx={{ color: "#38bdf8" }}
              />
              <span className="absolute text-[10px] font-semibold text-[var(--mc-text)]">
                {importProgressPercent === null
                  ? "..."
                  : `${importProgressPercent}%`}
              </span>
            </div>

            <div className="min-w-0">
              <div className="text-sm font-semibold text-[var(--mc-text)]">
                {playlistSource === "youtube"
                  ? "Importing YouTube playlist"
                  : "Importing playlist"}
              </div>
              <div className="mt-0.5 text-xs text-[var(--mc-text-muted)]">
                {importProgressLabel ?? "Preparing import..."}
              </div>
              {playlistProgressTotal > 0 && (
                <div className="mt-1 text-[11px] text-cyan-100/90">
                  The review list will update automatically after import.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {collectionPreview ? (
        <div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="text-lg font-semibold text-[var(--mc-text)]">
                Review Import Result
              </div>
              <div className="mt-1 text-sm text-[var(--mc-text-muted)]">
                Check playable items, long tracks, duplicates, and skipped
                videos before publishing.
              </div>
            </div>

            <div className="shrink-0 text-left sm:text-right">
              {isTitleEditing ? (
                <input
                  ref={titleInputRef}
                  value={titleDraft}
                  onChange={(e) => onTitleDraftChange(e.target.value)}
                  onBlur={onSaveTitle}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      event.preventDefault();
                      onCancelTitle();
                      return;
                    }

                    if (event.key === "Enter") {
                      event.preventDefault();
                      onSaveTitle();
                    }
                  }}
                  placeholder="請輸入收藏標題"
                  className="min-w-0 rounded-none border-0 border-b border-[var(--mc-border)] bg-transparent px-0 py-1 text-base font-semibold text-[var(--mc-text)] outline-none"
                />
              ) : (
                <div className="flex min-w-0 items-center gap-1 sm:justify-end">
                  <button
                    type="button"
                    onClick={onStartEditTitle}
                    className="min-w-0 cursor-pointer text-left sm:text-right"
                    aria-label="編輯收藏標題"
                  >
                    <div className="max-w-[280px] truncate text-base font-semibold text-[var(--mc-text)]">
                      {collectionPreview.title}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={onStartEditTitle}
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[var(--mc-text-muted)] transition hover:bg-[var(--mc-surface)]/60 hover:text-[var(--mc-text)]"
                    aria-label="編輯收藏標題"
                  >
                    <EditOutlined sx={{ fontSize: 16 }} />
                  </button>
                </div>
              )}

              <div className="mt-1 text-xs text-[var(--mc-text-muted)]">
                {collectionPreview.count} playable items
              </div>
            </div>
          </div>

          {!isAdmin && (
            <div className="mt-3 rounded-xl border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/30 px-3 py-2 text-[11px] text-[var(--mc-text-muted)]">
              一般使用者每個收藏庫最多可收錄{" "}
              {collectionItemLimit === null ? "無上限" : collectionItemLimit}{" "}
              題。
            </div>
          )}

          <div className="mt-4 grid gap-2 sm:grid-cols-4">
            <SummaryCard
              label="Ready"
              value={normalDraftPlaylistItems.length}
              tone="success"
              icon={<CheckCircleOutlineRounded sx={{ fontSize: 17 }} />}
            />
            <SummaryCard
              label="Long"
              value={longDraftPlaylistItems.length}
              tone={longDraftPlaylistItems.length > 0 ? "warning" : "default"}
              icon={<WarningAmberRounded sx={{ fontSize: 17 }} />}
            />
            <SummaryCard
              label="Duplicates"
              value={removedDuplicateCount}
              tone={removedDuplicateCount > 0 ? "success" : "default"}
              icon={<LibraryMusicRounded sx={{ fontSize: 17 }} />}
            />
            <SummaryCard
              label="Skipped"
              value={playlistIssueTotal}
              tone={playlistIssueTotal > 0 ? "danger" : "default"}
              icon={<ErrorOutlineRounded sx={{ fontSize: 17 }} />}
            />
          </div>

          <div className="mt-4 grid gap-2">
            {removedDuplicateCount > 0 && (
              <button
                type="button"
                onClick={onOpenDuplicateDialog}
                className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-emerald-300/25 bg-emerald-300/10 px-3 py-2 text-left text-xs text-emerald-100 transition hover:border-emerald-300/45 hover:bg-emerald-300/15"
              >
                <span className="font-semibold">Duplicates removed</span>
                <span>{removedDuplicateCount} items · View details</span>
              </button>
            )}

            {isDraftOverflow && (
              <button
                type="button"
                onClick={onOpenLimitDialog}
                className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-left text-xs text-amber-100 transition hover:border-amber-300/45 hover:bg-amber-300/15"
              >
                <span className="font-semibold">Item limit exceeded</span>
                <span>Remove {draftOverflowCount} more items</span>
              </button>
            )}

            {playlistIssueTotal > 0 && (
              <button
                type="button"
                onClick={onOpenPlaylistIssueDialog}
                className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-rose-300/25 bg-rose-300/10 px-3 py-2 text-left text-xs text-rose-100 transition hover:border-rose-300/45 hover:bg-rose-300/15"
              >
                <span className="font-semibold">Skipped items</span>
                <span>{playlistIssueTotal} items · View details</span>
              </button>
            )}

            {!hasIssues && (
              <div className="rounded-xl border border-emerald-300/25 bg-emerald-300/10 px-3 py-2 text-xs text-emerald-100">
                Import result looks clean. You can continue to publish settings.
              </div>
            )}
          </div>

          <div className="mt-4 space-y-3 border-t border-[var(--mc-border)]/70 pt-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="inline-flex rounded-full border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/55 p-1 text-[11px]">
                {[
                  {
                    key: "all",
                    label: `All (${allReviewItems.length})`,
                  },
                  {
                    key: "ready",
                    label: `Ready (${normalDraftPlaylistItems.length})`,
                  },
                  {
                    key: "long",
                    label: `Long (${longDraftPlaylistItems.length})`,
                  },
                  {
                    key: "issues",
                    label: `Issues (${playlistIssueTotal})`,
                  },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setFilterMode(item.key as ReviewFilterMode)}
                    className={`rounded-full px-3 py-1 transition ${
                      filterMode === item.key
                        ? "bg-[var(--mc-accent)]/15 text-[var(--mc-text)]"
                        : "text-[var(--mc-text-muted)] hover:text-[var(--mc-text)]"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <label className="flex min-w-0 items-center gap-2 rounded-full border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/55 px-3 py-1.5 text-[var(--mc-text)] sm:w-[260px]">
                <SearchRounded sx={{ fontSize: 16 }} className="shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search title or uploader"
                  className="min-w-0 flex-1 bg-transparent text-sm text-[var(--mc-text)] outline-none placeholder:text-[var(--mc-text-muted)]"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-[var(--mc-text-muted)] transition hover:bg-[var(--mc-surface)]/70 hover:text-[var(--mc-text)]"
                    aria-label="清除搜尋"
                  >
                    <CloseRounded sx={{ fontSize: 12 }} />
                  </button>
                ) : null}
              </label>
            </div>

            {filterMode === "issues" ? (
              <div className="rounded-2xl border border-dashed border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/25 px-4 py-6 text-sm text-[var(--mc-text-muted)]">
                Issues are grouped above. Use “Skipped items”, “Duplicates
                removed”, or “Item limit exceeded” to view details and resolve
                them.
              </div>
            ) : filteredItems.length > 0 ? (
              <div className="overflow-hidden rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface)]/45">
                <List<ReviewVirtualRowProps>
                  style={{ height: listHeight, width: "100%" }}
                  rowCount={filteredItems.length}
                  rowHeight={REVIEW_ROW_HEIGHT}
                  rowProps={reviewRowProps}
                  rowComponent={ReviewVirtualRow}
                />
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/25 px-4 py-6 text-sm text-[var(--mc-text-muted)]">
                No items match the current filter.
              </div>
            )}
          </div>
        </div>
      ) : !(playlistLoading || isImportingYoutubePlaylist) ? (
        <div className="rounded-xl border border-dashed border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/40 p-4 text-sm text-[var(--mc-text-muted)]">
          Import a playlist first. The review result will appear here.
        </div>
      ) : null}
    </div>
  );
}
