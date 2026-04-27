import {
  useCallback,
  useMemo,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { useTranslation } from "react-i18next";
import EditOutlined from "@mui/icons-material/EditOutlined";
import SearchRounded from "@mui/icons-material/SearchRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import WarningAmberRounded from "@mui/icons-material/WarningAmberRounded";
import CheckCircleOutlineRounded from "@mui/icons-material/CheckCircleOutlineRounded";
import ErrorOutlineRounded from "@mui/icons-material/ErrorOutlineRounded";
import LibraryMusicRounded from "@mui/icons-material/LibraryMusicRounded";
import FolderRounded from "@mui/icons-material/FolderRounded";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import { CircularProgress } from "@mui/material";
import { MuizoSelect, type MuizoSelectOption } from "@shared/ui/select";
import { List, type RowComponentProps } from "react-window";
import type { DraftPlaylistItem } from "../utils/createCollectionImport";
import type {
  CollectionCreateImportItem,
  CollectionCreateImportSource,
} from "../hooks/useCollectionCreateImportSources";
import CollectionReviewItemRow, {
  type CollectionReviewItemView,
} from "./CollectionReviewItemRow";

const REVIEW_ROW_HEIGHT = 80;

type ReviewFilterMode = "all" | "ready" | "long" | "removed";
type ReviewDisplayMode = "list" | "source";

type SourceReviewGroup = {
  source: CollectionCreateImportSource;
  selectedItems: CollectionReviewItemView[];
  removedItems: CollectionReviewItemView[];
  visibleItems: CollectionReviewItemView[];
  selectedCount: number;
  removedCount: number;
};

type ReviewVirtualRowProps = {
  items: CollectionReviewItemView[];
  readyLabel: string;
  longLabel: string;
  removedLabel: string;
  noCoverLabel: string;
  unknownUploaderLabel: string;
  sourceLabel: string;
  removeLabel: string;
  restoreLabel: string;
  onRemoveImportItem: (itemKey: string) => void;
  onRestoreImportItem: (itemKey: string) => void;
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

  importSources: CollectionCreateImportSource[];
  normalDraftPlaylistItems: DraftPlaylistItem[];
  longDraftPlaylistItems: DraftPlaylistItem[];
  removedImportItems: CollectionCreateImportItem[];
  removedImportItemCount: number;
  onRemoveImportSource: (sourceId: string) => void;
  onRemoveImportItem: (itemKey: string) => void;
  onRestoreImportItem: (itemKey: string) => void;

  removedDuplicateCount: number;
  onOpenDuplicateDialog: () => void;

  isDraftOverflow: boolean;
  draftOverflowCount: number;
  onOpenLimitDialog: () => void;

  playlistIssueTotal: number;
  onOpenPlaylistIssueDialog: () => void;
};

const toSelectedReviewItems = ({
  normalItems,
  longItems,
  untitledItemLabel,
}: {
  normalItems: DraftPlaylistItem[];
  longItems: DraftPlaylistItem[];
  untitledItemLabel: string;
}): CollectionReviewItemView[] => {
  const normal = normalItems.map((item) => ({
    draftKey: item.draftKey,
    importItemKey: item.importItemKey,
    sourceImportId: item.sourceImportId,
    title: item.title || item.answerText || untitledItemLabel,
    answerText: item.answerText,
    uploader: item.uploader,
    duration: item.duration,
    thumbnail: item.thumbnail,
    sourceTitle: item.sourceTitle,
    status: "ready" as const,
  }));

  const long = longItems.map((item) => ({
    draftKey: item.draftKey,
    importItemKey: item.importItemKey,
    sourceImportId: item.sourceImportId,
    title: item.title || item.answerText || untitledItemLabel,
    answerText: item.answerText,
    uploader: item.uploader,
    duration: item.duration,
    thumbnail: item.thumbnail,
    sourceTitle: item.sourceTitle,
    status: "long" as const,
  }));

  return [...normal, ...long];
};

const toRemovedReviewItems = ({
  removedItems,
  untitledItemLabel,
}: {
  removedItems: CollectionCreateImportItem[];
  untitledItemLabel: string;
}): CollectionReviewItemView[] => {
  return removedItems.map((item) => ({
    draftKey: item.importItemKey,
    importItemKey: item.importItemKey,
    sourceImportId: item.sourceImportId,
    title: item.title || item.answerText || untitledItemLabel,
    answerText: item.answerText,
    uploader: item.uploader,
    duration: item.duration,
    thumbnail: item.thumbnail,
    sourceTitle: item.sourceTitle,
    status: "removed" as const,
  }));
};

const ReviewVirtualRow = ({
  index,
  style,
  items,
  readyLabel,
  longLabel,
  removedLabel,
  noCoverLabel,
  unknownUploaderLabel,
  sourceLabel,
  removeLabel,
  restoreLabel,
  onRemoveImportItem,
  onRestoreImportItem,
}: RowComponentProps<ReviewVirtualRowProps>) => {
  const item = items[index];
  if (!item) return <div style={style} />;

  return (
    <div style={style} className="px-2">
      <CollectionReviewItemRow
        item={item}
        index={index}
        readyLabel={readyLabel}
        longLabel={longLabel}
        removedLabel={removedLabel}
        noCoverLabel={noCoverLabel}
        unknownUploaderLabel={unknownUploaderLabel}
        sourceLabel={sourceLabel}
        removeLabel={removeLabel}
        restoreLabel={restoreLabel}
        onRemoveImportItem={onRemoveImportItem}
        onRestoreImportItem={onRestoreImportItem}
      />
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
  icon: ReactNode;
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

  importSources,
  normalDraftPlaylistItems,
  longDraftPlaylistItems,
  removedImportItems,
  removedImportItemCount,
  onRemoveImportSource,
  onRemoveImportItem,
  onRestoreImportItem,

  removedDuplicateCount,
  onOpenDuplicateDialog,

  isDraftOverflow,
  draftOverflowCount,
  onOpenLimitDialog,

  playlistIssueTotal,
  onOpenPlaylistIssueDialog,
}: Props) {
  const { t } = useTranslation("collectionCreate");

  const [filterMode, setFilterMode] = useState<ReviewFilterMode>("all");
  const [displayMode, setDisplayMode] = useState<ReviewDisplayMode>("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSourceId, setSelectedSourceId] = useState<string>("all");

  const selectedReviewItems = useMemo(
    () =>
      toSelectedReviewItems({
        normalItems: normalDraftPlaylistItems,
        longItems: longDraftPlaylistItems,
        untitledItemLabel: t("review.untitledItem"),
      }),
    [normalDraftPlaylistItems, longDraftPlaylistItems, t],
  );

  const removedReviewItems = useMemo(
    () =>
      toRemovedReviewItems({
        removedItems: removedImportItems,
        untitledItemLabel: t("review.untitledItem"),
      }),
    [removedImportItems, t],
  );

  const allReviewItems = useMemo(
    () => [...selectedReviewItems, ...removedReviewItems],
    [selectedReviewItems, removedReviewItems],
  );

  const normalizedSearchQuery = searchQuery.trim().toLocaleLowerCase();

  const filterReviewItem = useCallback(
    (item: CollectionReviewItemView) => {
      if (filterMode === "all" && item.status === "removed") return false;
      if (filterMode === "ready" && item.status !== "ready") return false;
      if (filterMode === "long" && item.status !== "long") return false;
      if (filterMode === "removed" && item.status !== "removed") return false;

      if (!normalizedSearchQuery) return true;

      const haystack = [
        item.title,
        item.answerText,
        item.uploader,
        item.duration,
        item.sourceTitle,
        item.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase();

      return haystack.includes(normalizedSearchQuery);
    },
    [filterMode, normalizedSearchQuery],
  );

  const filteredItems = useMemo(
    () => allReviewItems.filter(filterReviewItem),
    [allReviewItems, filterReviewItem],
  );

  const sourceGroups = useMemo<SourceReviewGroup[]>(() => {
    return importSources
      .map((source) => {
        const selectedItems = selectedReviewItems.filter(
          (item) => item.sourceImportId === source.id,
        );
        const removedItems = removedReviewItems.filter(
          (item) => item.sourceImportId === source.id,
        );
        const visibleItems = [...selectedItems, ...removedItems].filter(
          filterReviewItem,
        );

        return {
          source,
          selectedItems,
          removedItems,
          visibleItems,
          selectedCount: selectedItems.length,
          removedCount: removedItems.length,
        };
      })
      .filter((group) => {
        return (
          group.visibleItems.length > 0 || normalizedSearchQuery.length === 0
        );
      });
  }, [
    filterReviewItem,
    importSources,
    normalizedSearchQuery.length,
    removedReviewItems,
    selectedReviewItems,
  ]);

  const sourcePickerOptions = useMemo<MuizoSelectOption[]>(
    () => [
      {
        value: "all",
        label: t("review.sourcePicker.all"),
        description: t("review.sourcePicker.allDescription", {
          count: sourceGroups.length,
        }),
      },
      ...sourceGroups.map((group) => ({
        value: group.source.id,
        label: group.source.title,
        description: t("review.sourcePicker.sourceDescription", {
          selected: group.selectedCount,
          total: group.source.itemCount,
          removed: group.removedCount,
          skipped: group.source.skippedCount,
        }),
        meta:
          group.source.skippedCount > 0
            ? t("review.sourcePicker.hasSkipped")
            : undefined,
      })),
    ],
    [sourceGroups, t],
  );

  const selectedSourceGroup = useMemo(() => {
    if (selectedSourceId === "all") return null;

    return (
      sourceGroups.find((group) => group.source.id === selectedSourceId) ?? null
    );
  }, [selectedSourceId, sourceGroups]);

  const visibleSourceGroups =
    selectedSourceId === "all"
      ? sourceGroups
      : selectedSourceGroup
        ? [selectedSourceGroup]
        : [];

  const reviewRowProps = useMemo<ReviewVirtualRowProps>(
    () => ({
      items: filteredItems,
      readyLabel: t("review.summary.ready"),
      longLabel: t("review.summary.long"),
      removedLabel: t("review.summary.removed"),
      noCoverLabel: t("review.noCover"),
      unknownUploaderLabel: t("review.unknownUploader"),
      sourceLabel: t("review.sourceLabel"),
      removeLabel: t("review.removeItem"),
      restoreLabel: t("review.restoreItem"),
      onRemoveImportItem,
      onRestoreImportItem,
    }),
    [filteredItems, onRemoveImportItem, onRestoreImportItem, t],
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

  const commonRowLabels = {
    readyLabel: t("review.summary.ready"),
    longLabel: t("review.summary.long"),
    removedLabel: t("review.summary.removed"),
    noCoverLabel: t("review.noCover"),
    unknownUploaderLabel: t("review.unknownUploader"),
    sourceLabel: t("review.sourceLabel"),
    removeLabel: t("review.removeItem"),
    restoreLabel: t("review.restoreItem"),
  };

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
                  ? t("review.importing.youtubeTitle")
                  : t("review.importing.urlTitle")}
              </div>

              <div className="mt-0.5 text-xs text-[var(--mc-text-muted)]">
                {importProgressLabel ?? t("review.importing.fallback")}
              </div>

              {playlistProgressTotal > 0 && (
                <div className="mt-1 text-[11px] text-cyan-100/90">
                  {t("review.importing.hint")}
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
                {t("review.title")}
              </div>
              <div className="mt-1 text-sm text-[var(--mc-text-muted)]">
                {t("review.description")}
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
                  placeholder={t("review.titlePlaceholder")}
                  className="min-w-0 rounded-none border-0 border-b border-[var(--mc-border)] bg-transparent px-0 py-1 text-base font-semibold text-[var(--mc-text)] outline-none"
                />
              ) : (
                <div className="flex min-w-0 items-center gap-1 sm:justify-end">
                  <button
                    type="button"
                    onClick={onStartEditTitle}
                    className="min-w-0 cursor-pointer text-left sm:text-right"
                    aria-label={t("review.editTitleAria")}
                  >
                    <div className="max-w-[280px] truncate text-base font-semibold text-[var(--mc-text)]">
                      {collectionPreview.title}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={onStartEditTitle}
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[var(--mc-text-muted)] transition hover:bg-[var(--mc-surface)]/60 hover:text-[var(--mc-text)]"
                    aria-label={t("review.editTitleAria")}
                  >
                    <EditOutlined sx={{ fontSize: 16 }} />
                  </button>
                </div>
              )}

              <div className="mt-1 text-xs text-[var(--mc-text-muted)]">
                {t("review.playableItems", {
                  count: collectionPreview.count,
                })}
              </div>
            </div>
          </div>

          {!isAdmin && (
            <div className="mt-3 rounded-xl border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/30 px-3 py-2 text-[11px] text-[var(--mc-text-muted)]">
              {collectionItemLimit === null
                ? t("review.itemLimitUnlimited")
                : t("review.itemLimitHint", {
                    limit: collectionItemLimit,
                  })}
            </div>
          )}

          <div className="mt-4 grid gap-2 sm:grid-cols-4">
            <SummaryCard
              label={t("review.summary.ready")}
              value={normalDraftPlaylistItems.length}
              tone="success"
              icon={<CheckCircleOutlineRounded sx={{ fontSize: 17 }} />}
            />

            <SummaryCard
              label={t("review.summary.long")}
              value={longDraftPlaylistItems.length}
              tone={longDraftPlaylistItems.length > 0 ? "warning" : "default"}
              icon={<WarningAmberRounded sx={{ fontSize: 17 }} />}
            />

            <SummaryCard
              label={t("review.summary.duplicates")}
              value={removedDuplicateCount}
              tone={removedDuplicateCount > 0 ? "success" : "default"}
              icon={<LibraryMusicRounded sx={{ fontSize: 17 }} />}
            />

            <SummaryCard
              label={t("review.summary.skipped")}
              value={playlistIssueTotal}
              tone={playlistIssueTotal > 0 ? "danger" : "default"}
              icon={<ErrorOutlineRounded sx={{ fontSize: 17 }} />}
            />
          </div>

          <div className="mt-4 grid gap-2">
            {removedImportItemCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setFilterMode("removed");
                  setDisplayMode("list");
                  setSelectedSourceId("all");
                }}
                className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-rose-300/25 bg-rose-300/10 px-3 py-2 text-left text-xs text-rose-100 transition hover:border-rose-300/45 hover:bg-rose-300/15"
              >
                <span className="font-semibold">
                  {t("review.alerts.removedItems")}
                </span>

                <span>
                  {t("review.alerts.removedItemsDetail", {
                    count: removedImportItemCount,
                  })}
                </span>
              </button>
            )}

            {removedDuplicateCount > 0 && (
              <button
                type="button"
                onClick={onOpenDuplicateDialog}
                className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-emerald-300/25 bg-emerald-300/10 px-3 py-2 text-left text-xs text-emerald-100 transition hover:border-emerald-300/45 hover:bg-emerald-300/15"
              >
                <span className="font-semibold">
                  {t("review.alerts.duplicatesRemoved")}
                </span>

                <span>
                  {t("review.alerts.duplicatesRemovedDetail", {
                    count: removedDuplicateCount,
                  })}
                </span>
              </button>
            )}

            {isDraftOverflow && (
              <button
                type="button"
                onClick={onOpenLimitDialog}
                className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-left text-xs text-amber-100 transition hover:border-amber-300/45 hover:bg-amber-300/15"
              >
                <span className="font-semibold">
                  {t("review.alerts.itemLimitExceeded")}
                </span>

                <span>
                  {t("review.alerts.itemLimitExceededDetail", {
                    count: draftOverflowCount,
                  })}
                </span>
              </button>
            )}

            {playlistIssueTotal > 0 && (
              <button
                type="button"
                onClick={onOpenPlaylistIssueDialog}
                className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-rose-300/25 bg-rose-300/10 px-3 py-2 text-left text-xs text-rose-100 transition hover:border-rose-300/45 hover:bg-rose-300/15"
              >
                <span className="font-semibold">
                  {t("review.alerts.skippedItems")}
                </span>

                <span>
                  {t("review.alerts.skippedItemsDetail", {
                    count: playlistIssueTotal,
                  })}
                </span>
              </button>
            )}

            {!hasIssues && (
              <div className="rounded-xl border border-emerald-300/25 bg-emerald-300/10 px-3 py-2 text-xs text-emerald-100">
                {t("review.alerts.cleanResult")}
              </div>
            )}
          </div>

          <div className="mt-4 space-y-3 border-t border-[var(--mc-border)]/70 pt-4">
            <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
              <div className="inline-flex flex-wrap rounded-full border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/55 p-1 text-[11px]">
                {[
                  {
                    key: "all",
                    label: `${t("review.filters.all")} (${
                      normalDraftPlaylistItems.length +
                      longDraftPlaylistItems.length
                    })`,
                  },
                  {
                    key: "ready",
                    label: `${t("review.filters.ready")} (${normalDraftPlaylistItems.length})`,
                  },
                  {
                    key: "long",
                    label: `${t("review.filters.long")} (${longDraftPlaylistItems.length})`,
                  },
                  {
                    key: "removed",
                    label: `${t("review.filters.removed")} (${removedImportItemCount})`,
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

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                <div className="inline-flex rounded-full border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/55 p-1 text-[11px]">
                  {[
                    { key: "list", label: t("review.display.list") },
                    { key: "source", label: t("review.display.source") },
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        const nextDisplayMode = item.key as ReviewDisplayMode;
                        setDisplayMode(nextDisplayMode);

                        if (nextDisplayMode !== "source") {
                          setSelectedSourceId("all");
                        }
                      }}
                      className={`rounded-full px-3 py-1 transition ${
                        displayMode === item.key
                          ? "bg-[var(--mc-accent-2)]/15 text-[var(--mc-text)]"
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
                    placeholder={t("review.searchPlaceholder")}
                    className="min-w-0 flex-1 bg-transparent text-sm text-[var(--mc-text)] outline-none placeholder:text-[var(--mc-text-muted)]"
                  />

                  {searchQuery ? (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-[var(--mc-text-muted)] transition hover:bg-[var(--mc-surface)]/70 hover:text-[var(--mc-text)]"
                      aria-label={t("review.clearSearch")}
                    >
                      <CloseRounded sx={{ fontSize: 12 }} />
                    </button>
                  ) : null}
                </label>
              </div>
            </div>

            {displayMode === "source" ? (
              <div className="space-y-3">
                <div className="rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/30 p-3">
                  <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <div className="text-xs font-semibold text-[var(--mc-text)]">
                        {t("review.sourcePicker.title")}
                      </div>

                      <div className="mt-0.5 text-[11px] text-[var(--mc-text-muted)]">
                        {t("review.sourcePicker.description")}
                      </div>
                    </div>
                  </div>

                  <MuizoSelect
                    value={selectedSourceId}
                    options={sourcePickerOptions}
                    placeholder={t("review.sourcePicker.placeholder")}
                    onChange={setSelectedSourceId}
                  />
                </div>

                {visibleSourceGroups.length > 0 ? (
                  <>
                    {visibleSourceGroups.map((group) => (
                      <div
                        key={group.source.id}
                        className="overflow-hidden rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface)]/45"
                      >
                        <div className="flex flex-col gap-3 border-b border-[var(--mc-border)]/70 bg-[var(--mc-surface-strong)]/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex min-w-0 items-center gap-2">
                              <FolderRounded
                                sx={{ fontSize: 18 }}
                                className="shrink-0 text-cyan-100"
                              />

                              <div className="truncate text-sm font-semibold text-[var(--mc-text)]">
                                {group.source.title}
                              </div>
                            </div>

                            <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-[var(--mc-text-muted)]">
                              <span>
                                {t("review.sourceGroup.selected", {
                                  count: group.selectedCount,
                                })}
                              </span>

                              <span>
                                {t("review.sourceGroup.removed", {
                                  count: group.removedCount,
                                })}
                              </span>

                              <span>
                                {t("review.sourceGroup.total", {
                                  count: group.source.itemCount,
                                })}
                              </span>

                              {group.source.skippedCount > 0 && (
                                <span className="text-amber-200">
                                  {t("review.sourceGroup.skipped", {
                                    count: group.source.skippedCount,
                                  })}
                                </span>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              const confirmed = window.confirm(
                                t("review.removeSourceConfirm", {
                                  title: group.source.title,
                                }),
                              );

                              if (!confirmed) return;

                              onRemoveImportSource(group.source.id);
                              setSelectedSourceId("all");
                            }}
                            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full border border-rose-300/25 bg-rose-300/10 px-3 py-1.5 text-xs font-semibold text-rose-100 transition hover:bg-rose-300/15"
                          >
                            <DeleteOutlineRounded sx={{ fontSize: 15 }} />
                            {t("review.removeSource")}
                          </button>
                        </div>

                        <div className="max-h-[420px] overflow-y-auto px-2 py-2">
                          {group.visibleItems.map((item, index) => (
                            <CollectionReviewItemRow
                              key={item.importItemKey ?? item.draftKey}
                              item={item}
                              index={index}
                              {...commonRowLabels}
                              onRemoveImportItem={onRemoveImportItem}
                              onRestoreImportItem={onRestoreImportItem}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="rounded-2xl border border-dashed border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/25 px-4 py-6 text-sm text-[var(--mc-text-muted)]">
                    {t("review.emptyFilter")}
                  </div>
                )}
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
                {t("review.emptyFilter")}
              </div>
            )}
          </div>
        </div>
      ) : !(playlistLoading || isImportingYoutubePlaylist) ? (
        <div className="rounded-xl border border-dashed border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/40 p-4 text-sm text-[var(--mc-text-muted)]">
          {t("review.empty")}
        </div>
      ) : null}
    </div>
  );
}
