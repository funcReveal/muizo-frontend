import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import RestoreRounded from "@mui/icons-material/RestoreRounded";

export type CollectionReviewItemStatus = "ready" | "long" | "removed";

export type CollectionReviewItemView = {
  draftKey: string;
  importItemKey?: string;
  sourceImportId?: string;
  title: string;
  answerText?: string;
  uploader?: string;
  duration?: string;
  thumbnail?: string;
  sourceTitle?: string;
  status: CollectionReviewItemStatus;
};

type StatusBadgeProps = {
  status: CollectionReviewItemStatus;
  readyLabel: string;
  longLabel: string;
  removedLabel: string;
};

type Props = {
  item: CollectionReviewItemView;
  index?: number;
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

function StatusBadge({
  status,
  readyLabel,
  longLabel,
  removedLabel,
}: StatusBadgeProps) {
  if (status === "removed") {
    return (
      <span className="inline-flex items-center rounded-full border border-rose-300/30 bg-rose-300/10 px-2 py-0.5 text-[10px] font-semibold text-rose-100">
        {removedLabel}
      </span>
    );
  }

  if (status === "long") {
    return (
      <span className="inline-flex items-center rounded-full border border-amber-300/30 bg-amber-300/10 px-2 py-0.5 text-[10px] font-semibold text-amber-100">
        {longLabel}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full border border-emerald-300/25 bg-emerald-300/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-100">
      {readyLabel}
    </span>
  );
}

export default function CollectionReviewItemRow({
  item,
  index,
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
}: Props) {
  const canManageItem = Boolean(item.importItemKey);
  const isRemoved = item.status === "removed";

  return (
    <div
      className={`flex h-[72px] items-center gap-3 rounded-xl border px-2 transition ${
        isRemoved
          ? "border-rose-300/15 bg-rose-950/10 opacity-80"
          : "border-transparent hover:border-[var(--mc-border)] hover:bg-[var(--mc-surface-strong)]/35"
      }`}
    >
      {typeof index === "number" && (
        <div className="w-8 shrink-0 text-right text-[11px] tabular-nums text-[var(--mc-text-muted)]">
          {index + 1}
        </div>
      )}

      {item.thumbnail ? (
        <img
          src={item.thumbnail}
          alt={item.title}
          loading="lazy"
          className="h-10 w-[72px] shrink-0 rounded-lg border border-[var(--mc-border)] object-cover"
        />
      ) : (
        <div className="flex h-10 w-[72px] shrink-0 items-center justify-center rounded-lg border border-[var(--mc-border)] bg-[linear-gradient(145deg,rgba(56,189,248,0.18),rgba(15,23,42,0.25))] text-[10px] text-[var(--mc-text-muted)]">
          {noCoverLabel}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div
          className={`truncate text-sm font-medium ${
            isRemoved
              ? "text-[var(--mc-text-muted)] line-through"
              : "text-[var(--mc-text)]"
          }`}
        >
          {item.title}
        </div>

        <div className="mt-0.5 truncate text-[11px] text-[var(--mc-text-muted)]">
          {item.uploader || unknownUploaderLabel}
          {item.duration ? ` · ${item.duration}` : ""}
          {item.sourceTitle ? ` · ${sourceLabel}: ${item.sourceTitle}` : ""}
        </div>
      </div>

      <div className="hidden shrink-0 sm:block">
        <StatusBadge
          status={item.status}
          readyLabel={readyLabel}
          longLabel={longLabel}
          removedLabel={removedLabel}
        />
      </div>

      {canManageItem && (
        <button
          type="button"
          onClick={() => {
            if (!item.importItemKey) return;

            if (isRemoved) {
              onRestoreImportItem(item.importItemKey);
              return;
            }

            onRemoveImportItem(item.importItemKey);
          }}
          className={`inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border transition ${
            isRemoved
              ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100 hover:bg-emerald-300/15"
              : "border-rose-300/25 bg-rose-300/10 text-rose-100 hover:bg-rose-300/15"
          }`}
          aria-label={isRemoved ? restoreLabel : removeLabel}
          title={isRemoved ? restoreLabel : removeLabel}
        >
          {isRemoved ? (
            <RestoreRounded sx={{ fontSize: 16 }} />
          ) : (
            <DeleteOutlineRounded sx={{ fontSize: 16 }} />
          )}
        </button>
      )}
    </div>
  );
}
