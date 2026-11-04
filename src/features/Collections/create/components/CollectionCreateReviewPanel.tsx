import type { ReactNode } from "react";
import CreateHelp from "./CreateHelp";
import SiteTooltip from "@shared/ui/SiteTooltip";
import { useMemo, type RefObject } from "react";
import { useTranslation } from "react-i18next";

import EditOutlined from "@mui/icons-material/EditOutlined";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import GraphicEqRounded from "@mui/icons-material/GraphicEqRounded";
import AutoFixHighOutlined from "@mui/icons-material/AutoFixHighOutlined";
import CircularProgress from "@mui/material/CircularProgress";

import VirtualPlaylistItemList, {
  type VirtualPlaylistItemStatus,
  type VirtualPlaylistItemView,
} from "../../shared/components/VirtualPlaylistItemList";
import type { CollectionCreateImportSourceType } from "../hooks/useCollectionCreateImportSources";
import type { DraftPlaylistItem } from "../utils/createCollectionImport";

type CollectionPreview = {
  title: string;
  count: number;
};

type ImportSourceSummary = {
  id?: string;
  key?: string;
  sourceKey?: string;
  playlistId?: string;
  title?: string;
  label?: string;
  sourceTitle?: string;
  type?: CollectionCreateImportSourceType;
  source?: "url" | "youtube" | string;
  url?: string;
  importedCount?: number;
  itemCount?: number;
  totalCount?: number;
  skippedCount?: number;
  removedCount?: number;
  items?: Array<{ thumbnail?: string; title?: string }>;
};

type Props = {
  actions?: ReactNode;
  playlistLoading: boolean;
  isImportingYoutubePlaylist: boolean;
  importProgressPercent: number | null;
  importProgressLabel: string | null;
  playlistSource: "url" | "youtube" | "favorites";
  playlistProgressTotal: number;

  collectionPreview: CollectionPreview | null;

  isTitleEditing: boolean;
  titleDraft: string;
  titleInputRef: RefObject<HTMLInputElement | null>;
  onTitleDraftChange: (value: string) => void;
  onStartEditTitle: () => void;
  onSaveTitle: () => void;
  onCancelTitle: () => void;

  isAdmin: boolean;
  collectionItemLimit: number | null;

  importSources: ImportSourceSummary[];
  normalDraftPlaylistItems: DraftPlaylistItem[];
  longDraftPlaylistItems: DraftPlaylistItem[];

  removedImportItems: DraftPlaylistItem[];
  removedImportItemCount: number;
  onRemoveImportSource: (sourceKey: string) => void;
  onRequestRemoveImportItem: (item: DraftPlaylistItem) => void;
  onRestoreImportItem: (draftKey: string) => void;

  removedDuplicateCount: number;
  onOpenDuplicateDialog: () => void;

  isDraftOverflow: boolean;
  draftOverflowCount: number;
  onOpenLimitDialog: () => void;

  playlistIssueTotal: number;
  onOpenPlaylistIssueDialog: () => void;
  onOpenBulkPlayback: () => void;
  onOpenAiBatch: () => void;
};

function getSourceKey(source: ImportSourceSummary, index: number) {
  return (
    source.sourceKey ||
    source.id ||
    source.key ||
    source.playlistId ||
    `source-${index}`
  );
}

function getSourceTitle(source: ImportSourceSummary) {
  return (
    source.title ||
    source.label ||
    source.sourceTitle ||
    source.url ||
    "未命名來源"
  );
}

function getSourceCount(source: ImportSourceSummary) {
  return source.importedCount ?? source.itemCount ?? source.totalCount ?? 0;
}

function getSourceTypeLabel(source: ImportSourceSummary) {
  if (
    source.type === "youtube_account_playlist" ||
    source.source === "youtube"
  ) {
    return "YouTube 清單";
  }

  return "播放清單連結";
}

function getSourceThumbnail(source: ImportSourceSummary) {
  return source.items?.find((item) => item.thumbnail)?.thumbnail ?? null;
}

function getItemTitle(item: DraftPlaylistItem) {
  return item.title || item.answerText || "未命名歌曲";
}

function ImportProgressCard({
  playlistLoading,
  isImportingYoutubePlaylist,
  importProgressPercent,
  importProgressLabel,
  playlistSource,
  playlistProgressTotal,
}: Pick<
  Props,
  | "playlistLoading"
  | "isImportingYoutubePlaylist"
  | "importProgressPercent"
  | "importProgressLabel"
  | "playlistSource"
  | "playlistProgressTotal"
>) {
  const { t } = useTranslation("collectionCreate");

  if (!playlistLoading && !isImportingYoutubePlaylist) return null;

  return (
    <div className="rounded-2xl border border-cyan-400/25 bg-cyan-500/8 px-3 py-3">
      <div className="flex items-center gap-3">
        <div className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center">
          <CircularProgress
            size={40}
            thickness={4}
            variant={
              importProgressPercent === null ? "indeterminate" : "determinate"
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
              ? t("review.importingYoutube", {
                  defaultValue: "正在匯入 YouTube 清單",
                })
              : t("review.importingPlaylist", {
                  defaultValue: "正在匯入播放清單",
                })}
          </div>

          <div className="mt-0.5 overflow-hidden text-xs leading-5 text-[var(--mc-text-muted)] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
            {importProgressLabel ||
              t("review.importPreparing", {
                defaultValue: "正在準備匯入內容...",
              })}
          </div>

          {playlistProgressTotal > 0 && (
            <div className="mt-1 hidden text-[11px] text-cyan-100/90 sm:block">
              {t("review.importAfterDone", {
                defaultValue: "完成後會自動更新清單預覽",
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CompactStatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "warning" | "danger" | "success";
}) {
  const toneClassName = {
    default:
      "border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/35 text-[var(--mc-text)]",
    warning: "border-amber-300/25 bg-amber-300/10 text-amber-100",
    danger: "border-rose-300/25 bg-rose-300/10 text-rose-100",
    success: "border-emerald-300/25 bg-emerald-300/10 text-emerald-100",
  }[tone];

  return (
    <div className={`create-review-stat min-w-0 px-3 py-2 ${toneClassName}`}>
      <div className="truncate text-[11px] leading-4 opacity-75">{label}</div>
      <div className="mt-0.5 truncate text-base font-semibold leading-6">
        {value}
      </div>
    </div>
  );
}

function ReviewActionCard({
  tone,
  title,
  description,
  actionLabel,
  onClick,
}: {
  tone: "emerald" | "amber" | "rose";
  title: string;
  description: string;
  actionLabel: string;
  onClick: () => void;
}) {
  if (tone !== "emerald") {
    return <SiteTooltip title={description}><button type="button" className="create-secondary" onClick={onClick} aria-label={`${title}：${description}`}><span>{title}</span><span>{actionLabel}</span></button></SiteTooltip>;
  }
  const toneClassName = {
    emerald:
      "border-emerald-300/25 bg-emerald-300/10 text-emerald-100 hover:border-emerald-300/45 hover:bg-emerald-300/15",
    amber:
      "border-amber-300/25 bg-amber-300/10 text-amber-100 hover:border-amber-300/45 hover:bg-amber-300/15",
    rose: "border-rose-300/25 bg-rose-300/10 text-rose-100 hover:border-rose-300/45 hover:bg-rose-300/15",
  }[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full cursor-pointer flex-col items-start gap-1 rounded-xl border px-3 py-2 text-left text-xs transition sm:flex-row sm:items-center sm:justify-between ${toneClassName}`}
    >
      <span className="font-semibold">{title}</span>
      <span className="leading-5 opacity-90">{description}</span>
      <span className="text-[11px] font-semibold underline underline-offset-4 sm:hidden">
        {actionLabel}
      </span>
    </button>
  );
}

function ImportSourceList({
  importSources,
  onRemoveImportSource,
}: {
  importSources: ImportSourceSummary[];
  onRemoveImportSource: (sourceKey: string) => void;
}) {
  const { t } = useTranslation("collectionCreate");

  if (importSources.length <= 0) return null;

  return (
    <div className="rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface)]/55 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-[var(--mc-text)]">
            {t("review.importSources", { defaultValue: "已匯入來源" })}
          </div>
          <CreateHelp label="管理匯入來源">
            移除來源會同步移除這次匯入的歌曲，不會更動 YouTube 的原始歌單。
          </CreateHelp>
        </div>

        <div className="shrink-0 rounded-full border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/35 px-2 py-1 text-[11px] text-[var(--mc-text-muted)]">
          {importSources.length}
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {importSources.map((source, index) => {
          const sourceKey = getSourceKey(source, index);

          return (
            <div
              key={sourceKey}
              className="flex min-w-0 items-center gap-2.5 rounded-xl border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/25 px-2.5 py-2"
            >
              {getSourceThumbnail(source) ? (
                <img
                  src={getSourceThumbnail(source) ?? ""}
                  alt={getSourceTitle(source)}
                  loading="lazy"
                  className="h-11 w-[78px] shrink-0 rounded-lg border border-[var(--mc-border)] object-cover"
                />
              ) : (
                <div className="flex h-11 w-[78px] shrink-0 items-center justify-center rounded-lg border border-[var(--mc-border)] bg-[linear-gradient(145deg,rgba(56,189,248,0.16),rgba(15,23,42,0.25))] text-[10px] text-[var(--mc-text-muted)]">
                  No Cover
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="overflow-hidden text-xs font-semibold leading-5 text-[var(--mc-text)] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:1] sm:text-sm">
                  {getSourceTitle(source)}
                </div>
                <div className="mt-0.5 truncate text-[11px] text-[var(--mc-text-muted)]">
                  {getSourceTypeLabel(source)} ・ {getSourceCount(source)}{" "}
                  {t("common.items", { defaultValue: "首" })}
                  {source.skippedCount ? ` ・ 略過 ${source.skippedCount}` : ""}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onRemoveImportSource(sourceKey)}
                className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-[var(--mc-text-muted)] transition hover:bg-rose-400/10 hover:text-rose-200"
                aria-label={t("review.removeImportSource", {
                  defaultValue: "移除匯入來源",
                })}
              >
                <DeleteOutlineRounded sx={{ fontSize: 18 }} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SongSection({
  title,
  count,
  items,
  emptyText,
  variant,
  maxHeightClassName = "max-h-[420px]",
  onRequestRemoveImportItem,
  onRestoreImportItem,
}: {
  title: string;
  count: number;
  items: DraftPlaylistItem[];
  emptyText: string;
  variant: "normal" | "long" | "removed";
  maxHeightClassName?: string;
  onRequestRemoveImportItem?: (item: DraftPlaylistItem) => void;
  onRestoreImportItem?: (draftKey: string) => void;
}) {
  const { t } = useTranslation("collectionCreate");
  const listItems = useMemo<VirtualPlaylistItemView[]>(
    () =>
      items.map((item) => ({
        key: item.draftKey,
        title: getItemTitle(item),
        answerText: item.answerText,
        uploader: item.uploader,
        duration: item.duration,
        thumbnail: item.thumbnail,
        sourceTitle: item.sourceTitle,
        startSec: item.startSec,
        endSec: item.endSec,
        status: variant as VirtualPlaylistItemStatus,
        raw: item,
      })),
    [items, variant],
  );

  return (
    <section className="rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface)]/55 p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-[var(--mc-text)]">
            {title}
          </div>
        </div>

        <div className="shrink-0 rounded-full border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/35 px-2 py-1 text-[11px] text-[var(--mc-text-muted)]">
          {count}
        </div>
      </div>

      {items.length > 0 ? (
        <VirtualPlaylistItemList
          items={listItems}
          emptyText={emptyText}
          labels={{
            noCover: "♪",
            unknownUploader: t("review.unknownUploader", {
              defaultValue: "未知上傳者",
            }),
            answer: t("review.answerLabel", { defaultValue: "答案" }),
            playbackRange: t("review.playbackRangeLabel", {
              defaultValue: "播放區間",
            }),
            fullTrack: t("review.fullTrackRange", {
              defaultValue: "播放整首",
            }),
            remove: t("review.removeItem", { defaultValue: "移除曲目" }),
            restore: t("review.restoreItem", { defaultValue: "復原曲目" }),
          }}
          height={
            maxHeightClassName.includes("260")
              ? 260
              : maxHeightClassName.includes("320")
                ? 320
                : 520
          }
          rowHeight={92}
          onRemove={
            onRequestRemoveImportItem
              ? (viewItem) => {
                  onRequestRemoveImportItem(viewItem.raw as DraftPlaylistItem);
                }
              : undefined
          }
          onRestore={
            onRestoreImportItem
              ? (viewItem) => {
                  const rawItem = viewItem.raw as DraftPlaylistItem;
                  onRestoreImportItem(
                    rawItem.importItemKey ?? rawItem.draftKey,
                  );
                }
              : undefined
          }
        />
      ) : (
        <div className="rounded-xl border border-dashed border-[var(--mc-border)] px-3 py-3 text-xs text-[var(--mc-text-muted)]">
          {emptyText}
        </div>
      )}
    </section>
  );
}

export default function CollectionCreateReviewPanel({
  actions,
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
  onRequestRemoveImportItem,
  onRestoreImportItem,

  removedDuplicateCount,
  onOpenDuplicateDialog,

  isDraftOverflow,
  draftOverflowCount,
  onOpenLimitDialog,

  playlistIssueTotal,
  onOpenPlaylistIssueDialog,
  onOpenBulkPlayback,
  onOpenAiBatch,
}: Props) {
  const { t } = useTranslation("collectionCreate");

  const totalReadyItems =
    normalDraftPlaylistItems.length + longDraftPlaylistItems.length;

  const statItems = useMemo(
    () => [
      {
        label: t("review.stats.normal", { defaultValue: "一般" }),
        value: normalDraftPlaylistItems.length,
        tone: "success" as const,
      },
      {
        label: t("review.stats.long", { defaultValue: "超長" }),
        value: longDraftPlaylistItems.length,
        tone:
          longDraftPlaylistItems.length > 0
            ? ("warning" as const)
            : ("default" as const),
      },
      {
        label: t("review.stats.removed", { defaultValue: "移除" }),
        value: removedImportItemCount,
        tone:
          removedImportItemCount > 0
            ? ("warning" as const)
            : ("default" as const),
      },
      {
        label: t("review.stats.skipped", { defaultValue: "略過" }),
        value: playlistIssueTotal,
        tone:
          playlistIssueTotal > 0 ? ("warning" as const) : ("default" as const),
      },
    ],
    [
      longDraftPlaylistItems.length,
      normalDraftPlaylistItems.length,
      playlistIssueTotal,
      removedImportItemCount,
      t,
    ],
  );

  return (
    <div className="create-review-workspace min-w-0 space-y-3">
      <ImportProgressCard
        playlistLoading={playlistLoading}
        isImportingYoutubePlaylist={isImportingYoutubePlaylist}
        importProgressPercent={importProgressPercent}
        importProgressLabel={importProgressLabel}
        playlistSource={playlistSource}
        playlistProgressTotal={playlistProgressTotal}
      />

      {collectionPreview ? (
        <div className="rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface)]/60 p-3 sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              {isTitleEditing ? (
                <input
                  ref={titleInputRef}
                  value={titleDraft}
                  onChange={(event) => onTitleDraftChange(event.target.value)}
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
                  placeholder={t("review.titlePlaceholder", {
                    defaultValue: "輸入題庫名稱",
                  })}
                  className="w-full min-w-0 rounded-none border-0 border-b border-[var(--mc-border)] bg-transparent px-0 py-1 text-base font-semibold text-[var(--mc-text)] outline-none"
                />
              ) : (
                <div className="flex min-w-0 items-start gap-2">
                  <button
                    type="button"
                    onClick={onStartEditTitle}
                    className="min-w-0 cursor-pointer text-left"
                    aria-label={t("review.editTitle", {
                      defaultValue: "編輯題庫名稱",
                    })}
                  >
                    <div className="overflow-hidden text-base font-semibold leading-6 text-[var(--mc-text)] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] sm:text-lg">
                      {collectionPreview.title}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={onStartEditTitle}
                    className="mt-0.5 inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-[var(--mc-text-muted)] transition hover:bg-[var(--mc-surface)]/60 hover:text-[var(--mc-text)]"
                    aria-label={t("review.editTitle", {
                      defaultValue: "編輯題庫名稱",
                    })}
                  >
                    <EditOutlined sx={{ fontSize: 16 }} />
                  </button>
                  {!isAdmin && (
                    <CreateHelp label="題庫曲目上限">
                      每份題庫最多{" "}
                      {collectionItemLimit === null ? "∞" : collectionItemLimit}{" "}
                      首歌曲。
                    </CreateHelp>
                  )}
                </div>
              )}
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={onOpenBulkPlayback}
                className="create-review-tool"
                aria-label="批量修改播放區間"
              >
                <GraphicEqRounded sx={{ fontSize: 17 }} />
                <span>
                  播放片段<small>設定起點與長度</small>
                </span>
              </button>
              <button
                type="button"
                onClick={onOpenAiBatch}
                className="create-review-tool"
                aria-label="AI 批次編輯答案"
              >
                <AutoFixHighOutlined sx={{ fontSize: 17 }} />
                <span>
                  AI 整理答案<small>批次修正歌曲名稱</small>
                </span>
              </button>
              <div className="rounded-full border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/40 px-3 py-1 text-xs font-semibold text-[var(--mc-text)]">
                {t("review.songCount", {
                  count: collectionPreview.count,
                  defaultValue: `${collectionPreview.count} 首`,
                })}
              </div>
            </div>
          </div>

          {(longDraftPlaylistItems.length > 0 ||
            removedImportItemCount > 0 ||
            playlistIssueTotal > 0) && (
            <div className="mt-3 grid grid-cols-4 gap-1.5 sm:grid-cols-4 sm:gap-2">
              {statItems
                .filter((item) => item.value > 0)
                .map((item) => (
                  <CompactStatCard
                    key={item.label}
                    label={item.label}
                    value={item.value}
                    tone={item.tone}
                  />
                ))}
            </div>
          )}
        </div>
      ) : !(playlistLoading || isImportingYoutubePlaylist) ? (
        <div className="rounded-2xl border border-dashed border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/40 p-4 text-xs leading-5 text-[var(--mc-text-muted)]">
          {t("review.empty", {
            defaultValue: "匯入播放清單後，這裡會顯示收藏內容預覽。",
          })}
        </div>
      ) : null}

      <details className="create-disclosure">
        <summary>
          匯入來源 <span>{importSources.length} 份</span>
        </summary>
        <ImportSourceList
          importSources={importSources}
          onRemoveImportSource={onRemoveImportSource}
        />
      </details>

      {collectionPreview && (
        <>
          <div className="grid grid-cols-1 gap-2">
            {removedDuplicateCount > 0 && (
              <ReviewActionCard
                tone="emerald"
                title={t("review.duplicatesRemoved", {
                  defaultValue: "已自動移除重複歌曲",
                })}
                description={t("review.duplicatesRemovedDescription", {
                  count: removedDuplicateCount,
                  defaultValue: `${removedDuplicateCount} 首，查看明細`,
                })}
                actionLabel={t("review.viewDetails", {
                  defaultValue: "查看明細",
                })}
                onClick={onOpenDuplicateDialog}
              />
            )}

            {isDraftOverflow && (
              <ReviewActionCard
                tone="rose"
                title={t("review.overflow", {
                  defaultValue: "已超過收藏上限",
                })}
                description={t("review.overflowDescription", {
                  count: draftOverflowCount,
                  defaultValue: `還需移除 ${draftOverflowCount} 首`,
                })}
                actionLabel={t("review.adjustItems", {
                  defaultValue: "調整曲目",
                })}
                onClick={onOpenLimitDialog}
              />
            )}

            {playlistIssueTotal > 0 && (
              <ReviewActionCard
                tone="amber"
                title={t("review.skippedReason", {
                  defaultValue: "未成功匯入原因",
                })}
                description={t("review.skippedReasonDescription", {
                  count: playlistIssueTotal,
                  defaultValue: `${playlistIssueTotal} 首，查看明細`,
                })}
                actionLabel={t("review.viewDetails", {
                  defaultValue: "查看明細",
                })}
                onClick={onOpenPlaylistIssueDialog}
              />
            )}
          </div>

          <SongSection
            title={t("review.normalTracks", { defaultValue: "歌曲與答案" })}
            count={normalDraftPlaylistItems.length}
            items={normalDraftPlaylistItems}
            emptyText={t("review.noNormalTracks", {
              defaultValue: "沒有一般曲目",
            })}
            variant="normal"
            maxHeightClassName="max-h-[460px] sm:max-h-[520px]"
            onRequestRemoveImportItem={onRequestRemoveImportItem}
          />

          {longDraftPlaylistItems.length > 0 && (
            <SongSection
              title={t("review.longTracks", {
                defaultValue: "超長歌曲 · 超過 10 分鐘",
              })}
              count={longDraftPlaylistItems.length}
              items={longDraftPlaylistItems}
              emptyText={t("review.noLongTracks", {
                defaultValue: "沒有超長曲目",
              })}
              variant="long"
              maxHeightClassName="max-h-[320px]"
              onRequestRemoveImportItem={onRequestRemoveImportItem}
            />
          )}

          {removedImportItems.length > 0 && (
            <SongSection
              title={t("review.removedTracks", {
                defaultValue: "已移除曲目",
              })}
              count={removedImportItems.length}
              items={removedImportItems}
              emptyText={t("review.noRemovedTracks", {
                defaultValue: "沒有已移除曲目",
              })}
              variant="removed"
              maxHeightClassName="max-h-[260px]"
              onRestoreImportItem={onRestoreImportItem}
            />
          )}

          {totalReadyItems <= 0 && (
            <div className="rounded-xl border border-amber-300/25 bg-amber-300/10 px-3 py-3 text-xs leading-5 text-amber-100">
              {t("review.noReadyItemsWarning", {
                defaultValue:
                  "目前沒有可建立的曲目，請回到匯入來源重新選擇播放清單。",
              })}
            </div>
          )}
        </>
      )}
      {actions}
    </div>
  );
}
