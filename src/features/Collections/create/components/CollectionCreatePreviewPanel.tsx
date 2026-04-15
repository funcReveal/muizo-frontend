import { useMemo, type RefObject } from "react";
import EditOutlined from "@mui/icons-material/EditOutlined";
import { CircularProgress } from "@mui/material";
import { List, type RowComponentProps } from "react-window";
import type { DraftPlaylistItem } from "../utils/createCollectionImport";

const PREVIEW_ROW_HEIGHT = 60;

type PreviewVirtualRowProps = {
  items: Array<{
    title: string;
    answerText?: string;
    uploader?: string;
    duration?: string;
    thumbnail?: string;
  }>;
};

const toPreviewItems = (
  items: DraftPlaylistItem[],
): PreviewVirtualRowProps["items"] =>
  items.map((item) => ({
    title: item.title || item.answerText || "未命名歌曲",
    answerText: item.answerText,
    uploader: item.uploader,
    duration: item.duration,
    thumbnail: item.thumbnail,
  }));

const PreviewVirtualRow = ({
  index,
  style,
  items,
}: RowComponentProps<PreviewVirtualRowProps>) => {
  const item = items[index];
  if (!item) return <div style={style} />;

  return (
    <div style={style} className="px-2">
      <div className="flex items-center gap-3 px-1">
        {item.thumbnail ? (
          <img
            src={item.thumbnail}
            alt={item.title || item.answerText || "歌曲封面"}
            loading="lazy"
            className="h-9 w-16 shrink-0 rounded-md border border-[var(--mc-border)] object-cover"
          />
        ) : (
          <div className="flex h-9 w-16 shrink-0 items-center justify-center rounded-md border border-[var(--mc-border)] bg-[linear-gradient(145deg,rgba(56,189,248,0.18),rgba(15,23,42,0.25))] text-[10px] text-[var(--mc-text-muted)]">
            No Cover
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-medium text-[var(--mc-text)]">
            {item.title || item.answerText || "未命名歌曲"}
          </div>
          <div className="mt-0.5 truncate text-[11px] text-[var(--mc-text-muted)]">
            {item.uploader || "未知上傳者"}
            {item.duration ? ` ． ${item.duration}` : ""}
          </div>
        </div>
      </div>
    </div>
  );
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

export default function CollectionCreatePreviewPanel({
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
  const buildPreviewListHeight = (count: number) =>
    Math.min(240, Math.max(PREVIEW_ROW_HEIGHT * 2, count * PREVIEW_ROW_HEIGHT));

  const normalPreviewListHeight = useMemo(
    () => buildPreviewListHeight(normalDraftPlaylistItems.length),
    [normalDraftPlaylistItems.length],
  );

  const longPreviewListHeight = useMemo(
    () => buildPreviewListHeight(longDraftPlaylistItems.length),
    [longDraftPlaylistItems.length],
  );

  const normalPreviewRowProps = useMemo<PreviewVirtualRowProps>(
    () => ({ items: toPreviewItems(normalDraftPlaylistItems) }),
    [normalDraftPlaylistItems],
  );

  const longPreviewRowProps = useMemo<PreviewVirtualRowProps>(
    () => ({ items: toPreviewItems(longDraftPlaylistItems) }),
    [longDraftPlaylistItems],
  );

  return (
    <div className="h-full rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface)]/55 p-3">
      {(playlistLoading || isImportingYoutubePlaylist) && (
        <div className="rounded-xl border border-cyan-400/25 bg-cyan-500/8 px-3 py-3">
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
                  ? "正在匯入 YouTube 清單"
                  : "正在匯入播放清單"}
              </div>
              <div className="mt-0.5 text-xs text-[var(--mc-text-muted)]">
                {importProgressLabel ?? "正在準備匯入內容..."}
              </div>
              {playlistProgressTotal > 0 && (
                <div className="mt-1 text-[11px] text-cyan-100/90">
                  完成後會自動更新右側清單預覽
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {collectionPreview ? (
        <div
          className={
            playlistLoading || isImportingYoutubePlaylist ? "mt-3" : ""
          }
        >
          <div className="mt-1 flex items-center justify-between text-xs text-[var(--mc-text-muted)]">
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
                className="min-w-0 flex-1 rounded-none border-0 border-b border-[var(--mc-border)] bg-transparent px-0 py-1 text-base font-semibold text-[var(--mc-text)] outline-none"
              />
            ) : (
              <div className="flex min-w-0 items-center gap-1">
                <button
                  type="button"
                  onClick={onStartEditTitle}
                  className="min-w-0 cursor-pointer text-left"
                  aria-label="編輯收藏標題"
                >
                  <div className="truncate text-base font-semibold text-[var(--mc-text)]">
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
            <span>{`${collectionPreview.count} 首歌曲`}</span>
          </div>

          {!isAdmin && (
            <div className="mt-2 text-[11px] text-[var(--mc-text-muted)]">
              一般使用者每個收藏庫最多可收錄{" "}
              {collectionItemLimit === null ? "無上限" : collectionItemLimit}{" "}
              題。
            </div>
          )}

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/35 px-3 py-2">
              <div className="text-[11px] text-[var(--mc-text-muted)]">
                一般曲目
              </div>
              <div className="mt-1 text-sm font-semibold text-[var(--mc-text)]">
                {normalDraftPlaylistItems.length} 首
              </div>
            </div>
            <div className="rounded-xl border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/35 px-3 py-2">
              <div className="text-[11px] text-[var(--mc-text-muted)]">
                超長曲目（&gt; 10:00）
              </div>
              <div className="mt-1 text-sm font-semibold text-[var(--mc-text)]">
                {longDraftPlaylistItems.length} 首
              </div>
            </div>
          </div>

          {removedDuplicateCount > 0 && (
            <button
              type="button"
              onClick={onOpenDuplicateDialog}
              className="mt-3 flex w-full cursor-pointer items-center justify-between rounded-xl border border-emerald-300/25 bg-emerald-300/10 px-3 py-2 text-left text-xs text-emerald-100 transition hover:border-emerald-300/45 hover:bg-emerald-300/15"
            >
              <span className="font-semibold">已自動移除重複歌曲</span>
              <span>{removedDuplicateCount} 首，查看明細</span>
            </button>
          )}

          {isDraftOverflow && (
            <button
              type="button"
              onClick={onOpenLimitDialog}
              className="mt-3 flex w-full cursor-pointer items-center justify-between rounded-xl border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-left text-xs text-amber-100 transition hover:border-amber-300/45 hover:bg-amber-300/15"
            >
              <span className="font-semibold">已超過收藏上限</span>
              <span>還需移除 {draftOverflowCount} 首</span>
            </button>
          )}

          <div className="mt-3 space-y-4 border-t border-[var(--mc-border)]/70 pt-3">
            <div>
              <div className="mb-2 text-[11px] font-semibold text-[var(--mc-text-muted)]">
                一般曲目
              </div>
              {normalDraftPlaylistItems.length > 0 ? (
                <div className="h-full w-full overflow-hidden rounded-lg">
                  <List<PreviewVirtualRowProps>
                    style={{ height: normalPreviewListHeight, width: "100%" }}
                    rowCount={normalDraftPlaylistItems.length}
                    rowHeight={PREVIEW_ROW_HEIGHT}
                    rowProps={normalPreviewRowProps}
                    rowComponent={PreviewVirtualRow}
                  />
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-[var(--mc-border)] px-3 py-2 text-[11px] text-[var(--mc-text-muted)]">
                  沒有一般曲目
                </div>
              )}
            </div>

            <div>
              <div className="mb-2 text-[11px] font-semibold text-[var(--mc-text-muted)]">
                超長曲目（&gt; 10:00）
              </div>
              {longDraftPlaylistItems.length > 0 ? (
                <div className="h-full w-full overflow-hidden rounded-lg">
                  <List<PreviewVirtualRowProps>
                    style={{ height: longPreviewListHeight, width: "100%" }}
                    rowCount={longDraftPlaylistItems.length}
                    rowHeight={PREVIEW_ROW_HEIGHT}
                    rowProps={longPreviewRowProps}
                    rowComponent={PreviewVirtualRow}
                  />
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-[var(--mc-border)] px-3 py-2 text-[11px] text-[var(--mc-text-muted)]">
                  沒有超長曲目
                </div>
              )}
            </div>
          </div>

          {playlistIssueTotal > 0 && (
            <button
              type="button"
              onClick={onOpenPlaylistIssueDialog}
              className="mt-3 flex w-full cursor-pointer items-center justify-between rounded-xl border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-left text-xs text-amber-100 transition hover:border-amber-300/45 hover:bg-amber-300/15"
            >
              <span className="font-semibold">未成功匯入原因</span>
              <span>{playlistIssueTotal} 首，查看明細</span>
            </button>
          )}
        </div>
      ) : !(playlistLoading || isImportingYoutubePlaylist) ? (
        <div className="mt-3 rounded-xl border border-dashed border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/40 p-3 text-[11px] text-[var(--mc-text-muted)]">
          匯入播放清單後，這裡會顯示收藏內容預覽
        </div>
      ) : null}
    </div>
  );
}
