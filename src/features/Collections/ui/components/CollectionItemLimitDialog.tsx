import CloseRounded from "@mui/icons-material/CloseRounded";
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
} from "@mui/material";
import type { DraftPlaylistItem } from "../lib/createCollectionImport";

type Props = {
  open: boolean;
  onClose: () => void;
  limit: number | null;
  totalCount: number;
  overflowCount: number;
  selectedRemovalCount: number;
  remainingCount: number;
  canApply: boolean;
  normalItems: DraftPlaylistItem[];
  longItems: DraftPlaylistItem[];
  selectedRemovalKeys: string[];
  onToggleItem: (draftKey: string) => void;
  onApply: () => void;
  onReselectSuggested: () => void;
  onSelectLongOnly: () => void;
  onClearSelection: () => void;
};

const ItemRow = ({
  item,
  checked,
  onToggle,
}: {
  item: DraftPlaylistItem;
  checked: boolean;
  onToggle: () => void;
}) => {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center gap-3 rounded-xl border border-white/8 bg-black/15 px-3 py-2 text-left transition hover:border-white/15"
    >
      <Checkbox checked={checked} tabIndex={-1} disableRipple />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-[var(--mc-text)]">
          {item.title || item.answerText || "未命名歌曲"}
        </div>
        <div className="mt-1 truncate text-[11px] text-[var(--mc-text-muted)]">
          {item.uploader || "未知上傳者"}
          {item.duration ? ` ・ ${item.duration}` : ""}
        </div>
      </div>
    </button>
  );
};

export default function CollectionItemLimitDialog({
  open,
  onClose,
  limit,
  totalCount,
  overflowCount,
  selectedRemovalCount,
  remainingCount,
  canApply,
  normalItems,
  longItems,
  selectedRemovalKeys,
  onToggleItem,
  onApply,
  onReselectSuggested,
  onSelectLongOnly,
  onClearSelection,
}: Props) {
  const selectedSet = new Set(selectedRemovalKeys);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          border: "1px solid rgba(148, 163, 184, 0.22)",
          background:
            "linear-gradient(180deg, rgba(8,13,24,0.98), rgba(2,6,23,0.98))",
          color: "var(--mc-text)",
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-base font-semibold">收藏庫曲數超過上限</div>
            <div className="mt-1 text-xs text-[var(--mc-text-muted)]">
              目前 {totalCount} 首，上限 {limit ?? "∞"} 首，至少還要移除{" "}
              {overflowCount} 首
            </div>
          </div>
          <IconButton
            size="small"
            onClick={onClose}
            aria-label="關閉收藏庫曲數上限視窗"
            sx={{ color: "var(--mc-text-muted)" }}
          >
            <CloseRounded fontSize="small" />
          </IconButton>
        </div>
      </DialogTitle>

      <DialogContent>
        <div className="mb-4 flex flex-wrap gap-2">
          <Button variant="outlined" size="small" onClick={onReselectSuggested}>
            重新建議
          </Button>
          <Button variant="outlined" size="small" onClick={onSelectLongOnly}>
            只選超長曲目
          </Button>
          <Button variant="outlined" size="small" onClick={onClearSelection}>
            清除選擇
          </Button>
          <Button
            variant="contained"
            size="small"
            disabled={!canApply}
            onClick={onApply}
          >
            套用移除
          </Button>
        </div>

        <div className="mb-4 rounded-xl border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-xs text-amber-100">
          目前已選 {selectedRemovalCount} 首，套用後會剩下 {remainingCount} 首
        </div>

        <div className="space-y-4">
          <div>
            <div className="mb-2 text-sm font-semibold text-[var(--mc-text)]">
              建議優先檢查：超長曲目（&gt; 10:00）
            </div>
            <div className="space-y-2">
              {longItems.length > 0 ? (
                longItems.map((item) => (
                  <ItemRow
                    key={item.draftKey}
                    item={item}
                    checked={selectedSet.has(item.draftKey)}
                    onToggle={() => onToggleItem(item.draftKey)}
                  />
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-[var(--mc-border)] px-3 py-3 text-xs text-[var(--mc-text-muted)]">
                  沒有超長曲目
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="mb-2 text-sm font-semibold text-[var(--mc-text)]">
              其餘曲目
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {normalItems.map((item) => (
                <ItemRow
                  key={item.draftKey}
                  item={item}
                  checked={selectedSet.has(item.draftKey)}
                  onToggle={() => onToggleItem(item.draftKey)}
                />
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
