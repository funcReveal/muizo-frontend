import { useMemo, type RefObject } from "react";
import { useTranslation } from "react-i18next";

import EditOutlined from "@mui/icons-material/EditOutlined";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import RestoreRounded from "@mui/icons-material/RestoreRounded";
import CircularProgress from "@mui/material/CircularProgress";

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
  source?: "url" | "youtube" | string;
  url?: string;
  importedCount?: number;
  itemCount?: number;
  totalCount?: number;
  skippedCount?: number;
  removedCount?: number;
};

type Props = {
  playlistLoading: boolean;
  isImportingYoutubePlaylist: boolean;
  importProgressPercent: number | null;
  importProgressLabel: string | null;
  playlistSource: "url" | "youtube";
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

function getItemTitle(item: DraftPlaylistItem) {
  return item.title || item.answerText || "未命名歌曲";
}

function getItemMeta(item: DraftPlaylistItem) {
  const uploader = item.uploader || "未知上傳者";
  return item.duration ? `${uploader} ・ ${item.duration}` : uploader;
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
    <div className={`min-w-0 rounded-xl border px-3 py-2 ${toneClassName}`}>
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
          <div className="mt-0.5 hidden text-xs text-[var(--mc-text-muted)] sm:block">
            {t("review.importSourcesHint", {
              defaultValue: "可移除不需要的來源，內容會同步更新。",
            })}
          </div>
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
              className="flex min-w-0 items-center gap-2 rounded-xl border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/25 px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <div className="overflow-hidden text-xs font-semibold leading-5 text-[var(--mc-text)] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:1] sm:text-sm">
                  {getSourceTitle(source)}
                </div>
                <div className="mt-0.5 truncate text-[11px] text-[var(--mc-text-muted)]">
                  {source.source === "youtube" ? "YouTube" : "URL"} ・{" "}
                  {getSourceCount(source)}{" "}
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

function SongRow({
  item,
  variant,
  onRemove,
  onRestore,
}: {
  item: DraftPlaylistItem;
  variant: "normal" | "long" | "removed";
  onRemove?: (item: DraftPlaylistItem) => void;
  onRestore?: (draftKey: string) => void;
}) {
  const { t } = useTranslation("collectionCreate");

  const rowTone =
    variant === "long"
      ? "border-amber-300/20 bg-amber-300/8"
      : variant === "removed"
        ? "border-slate-300/15 bg-slate-500/8 opacity-80"
        : "border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/25";

  return (
    <div
      className={`flex min-w-0 items-center gap-2.5 rounded-xl border px-2.5 py-2 sm:gap-3 sm:px-3 ${rowTone}`}
    >
      {item.thumbnail ? (
        <img
          src={item.thumbnail}
          alt={getItemTitle(item)}
          loading="lazy"
          className="h-10 w-[70px] shrink-0 rounded-lg border border-[var(--mc-border)] object-cover sm:h-11 sm:w-20"
        />
      ) : (
        <div className="flex h-10 w-[70px] shrink-0 items-center justify-center rounded-lg border border-[var(--mc-border)] bg-[linear-gradient(145deg,rgba(56,189,248,0.16),rgba(15,23,42,0.25))] text-[10px] text-[var(--mc-text-muted)] sm:h-11 sm:w-20">
          No Cover
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="overflow-hidden text-xs font-semibold leading-5 text-[var(--mc-text)] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] sm:text-sm">
          {getItemTitle(item)}
        </div>

        <div className="mt-0.5 overflow-hidden text-[11px] leading-4 text-[var(--mc-text-muted)] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:1]">
          {getItemMeta(item)}
        </div>
      </div>

      {variant !== "removed" && onRemove && (
        <button
          type="button"
          onClick={() => onRemove(item)}
          className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-[var(--mc-text-muted)] transition hover:bg-rose-400/10 hover:text-rose-200"
          aria-label={t("review.removeItem", { defaultValue: "移除曲目" })}
        >
          <DeleteOutlineRounded sx={{ fontSize: 18 }} />
        </button>
      )}

      {variant === "removed" && onRestore && (
        <button
          type="button"
          onClick={() => onRestore(item.importItemKey ?? item.draftKey)}
          className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-[var(--mc-text-muted)] transition hover:bg-emerald-400/10 hover:text-emerald-200"
          aria-label={t("review.restoreItem", { defaultValue: "復原曲目" })}
        >
          <RestoreRounded sx={{ fontSize: 18 }} />
        </button>
      )}
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
        <div
          className={`space-y-2 overflow-y-auto overscroll-contain pr-1 ${maxHeightClassName}`}
        >
          {items.map((item) => (
            <SongRow
              key={item.draftKey}
              item={item}
              variant={variant}
              onRemove={onRequestRemoveImportItem}
              onRestore={onRestoreImportItem}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-[var(--mc-border)] px-3 py-3 text-xs text-[var(--mc-text-muted)]">
          {emptyText}
        </div>
      )}
    </section>
  );
}

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
  onRequestRemoveImportItem,
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
    <div className="min-w-0 space-y-3">
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
                    defaultValue: "請輸入收藏標題",
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
                      defaultValue: "編輯收藏標題",
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
                      defaultValue: "編輯收藏標題",
                    })}
                  >
                    <EditOutlined sx={{ fontSize: 16 }} />
                  </button>
                </div>
              )}

              {!isAdmin && (
                <div className="mt-2 text-[11px] leading-5 text-[var(--mc-text-muted)]">
                  {t("review.itemLimitHint", {
                    limit:
                      collectionItemLimit === null ? "∞" : collectionItemLimit,
                    defaultValue: `一般使用者每個收藏庫最多可收錄 ${
                      collectionItemLimit === null ? "∞" : collectionItemLimit
                    } 題。`,
                  })}
                </div>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <div className="rounded-full border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/40 px-3 py-1 text-xs font-semibold text-[var(--mc-text)]">
                {t("review.songCount", {
                  count: collectionPreview.count,
                  defaultValue: `${collectionPreview.count} 首`,
                })}
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-4 gap-1.5 sm:grid-cols-4 sm:gap-2">
            {statItems.map((item) => (
              <CompactStatCard
                key={item.label}
                label={item.label}
                value={item.value}
                tone={item.tone}
              />
            ))}
          </div>
        </div>
      ) : !(playlistLoading || isImportingYoutubePlaylist) ? (
        <div className="rounded-2xl border border-dashed border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/40 p-4 text-xs leading-5 text-[var(--mc-text-muted)]">
          {t("review.empty", {
            defaultValue: "匯入播放清單後，這裡會顯示收藏內容預覽。",
          })}
        </div>
      ) : null}

      <ImportSourceList
        importSources={importSources}
        onRemoveImportSource={onRemoveImportSource}
      />

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
            title={t("review.normalTracks", { defaultValue: "一般曲目" })}
            count={normalDraftPlaylistItems.length}
            items={normalDraftPlaylistItems}
            emptyText={t("review.noNormalTracks", {
              defaultValue: "沒有一般曲目",
            })}
            variant="normal"
            maxHeightClassName="max-h-[460px] sm:max-h-[520px]"
            onRequestRemoveImportItem={onRequestRemoveImportItem}
          />

          <SongSection
            title={t("review.longTracks", {
              defaultValue: "超長曲目（> 10:00）",
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
    </div>
  );
}
