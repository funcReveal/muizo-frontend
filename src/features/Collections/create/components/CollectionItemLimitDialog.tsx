import CloseRounded from "@mui/icons-material/CloseRounded";
import { Button, DialogContent, DialogTitle, IconButton } from "@mui/material";
import type { DraftPlaylistItem } from "../utils/createCollectionImport";
import CollectionToolDrawer from "../../shared/components/CollectionToolDrawer";

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
    <label className="tool-selection-row cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        aria-label={`移除 ${item.title || item.answerText || "未命名歌曲"}`}
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-[var(--mc-text)]">
          {item.title || item.answerText || "未命名歌曲"}
        </div>
        <div className="mt-1 truncate text-[11px] text-[var(--mc-text-muted)]">
          {item.uploader || "未知上傳者"}
          {item.duration ? ` ・ ${item.duration}` : ""}
        </div>
      </div>
    </label>
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
    <CollectionToolDrawer
      open={open}
      onClose={onClose}
      label="整理超額歌曲"
      width={680}
    >
      <div className="flex h-full min-h-0 flex-col">
        <DialogTitle sx={{ pb: 1 }}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-lg font-semibold">整理超額歌曲</div>
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
            <Button
              variant="outlined"
              size="small"
              onClick={onReselectSuggested}
            >
              重新建議
            </Button>
            <Button variant="outlined" size="small" onClick={onSelectLongOnly}>
              只選超長曲目
            </Button>
            <Button variant="outlined" size="small" onClick={onClearSelection}>
              清除選擇
            </Button>
          </div>

          <div className="mb-4 rounded-xl border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-xs text-amber-100">
            目前已選 {selectedRemovalCount} 首，套用後會剩下 {remainingCount} 首
            <progress
              className="tool-progress mt-2 block"
              aria-label="超額歌曲整理進度"
              max={Math.max(1, overflowCount)}
              value={Math.min(selectedRemovalCount, Math.max(1, overflowCount))}
            />
          </div>

          <div className="space-y-4">
            {longItems.length > 0 && (
              <div>
                <div className="mb-2 text-sm font-semibold text-[var(--mc-text)]">
                  建議優先檢查：超長曲目（&gt; 10:00）
                </div>
                <div className="space-y-2">
                  {longItems.map((item) => (
                    <ItemRow
                      key={item.draftKey}
                      item={item}
                      checked={selectedSet.has(item.draftKey)}
                      onToggle={() => onToggleItem(item.draftKey)}
                    />
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="mb-2 text-sm font-semibold text-[var(--mc-text)]">
                {longItems.length > 0 ? "其餘曲目" : "選擇要移除的歌曲"}
              </div>
              <div className="space-y-2">
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
        <footer className="tool-limit-actions border-t border-[var(--mc-border)]">
          <span className="text-sm text-[var(--mc-text-muted)]" role="status">
            保留 {remainingCount} / {limit ?? "∞"} 首
          </span>
          <Button variant="contained" disabled={!canApply} onClick={onApply}>
            移除所選 {selectedRemovalCount} 首
          </Button>
        </footer>
      </div>
    </CollectionToolDrawer>
  );
}
