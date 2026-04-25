type Props = {
  totalItems: number;
  readyItems: number;
  longItems: number;
  removedDuplicateCount: number;
  skippedCount: number;
  isDraftOverflow: boolean;
  draftOverflowCount: number;
  collectionItemLimit: number | null;

  collectionsCount: number;
  privateCollectionsCount: number;
  remainingCollectionSlots: number;
  remainingPrivateCollectionSlots: number;
  maxCollectionsPerUser: number;
  maxPrivateCollectionsPerUser: number;
  reachedCollectionLimit: boolean;
  reachedPrivateCollectionLimit: boolean;
  isAdmin: boolean;

  visibility: "private" | "public";
  createError: string | null;
};

const StatRow = ({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "warning" | "danger" | "success";
}) => {
  const toneClass =
    tone === "danger"
      ? "text-rose-200"
      : tone === "warning"
        ? "text-amber-200"
        : tone === "success"
          ? "text-emerald-200"
          : "text-[var(--mc-text)]";

  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-[var(--mc-text-muted)]">{label}</span>
      <span className={`font-semibold tabular-nums ${toneClass}`}>{value}</span>
    </div>
  );
};

export default function CollectionCreateInspectorPanel({
  totalItems,
  readyItems,
  longItems,
  removedDuplicateCount,
  skippedCount,
  isDraftOverflow,
  draftOverflowCount,
  collectionItemLimit,
  collectionsCount,
  privateCollectionsCount,
  remainingCollectionSlots,
  remainingPrivateCollectionSlots,
  maxCollectionsPerUser,
  maxPrivateCollectionsPerUser,
  reachedCollectionLimit,
  reachedPrivateCollectionLimit,
  isAdmin,
  visibility,
  createError,
}: Props) {
  const readyTone = readyItems > 0 && !isDraftOverflow ? "success" : "default";

  return (
    <aside className="space-y-3 lg:sticky lg:top-4 lg:self-start">
      <section className="rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface)]/65 p-4">
        <div className="text-sm font-semibold text-[var(--mc-text)]">
          Import Summary
        </div>

        <div className="mt-3 space-y-2">
          <StatRow label="Total items" value={totalItems} />
          <StatRow label="Ready items" value={readyItems} tone={readyTone} />
          <StatRow label="Long tracks" value={longItems} />
          <StatRow label="Duplicates removed" value={removedDuplicateCount} />
          <StatRow
            label="Skipped items"
            value={skippedCount}
            tone={skippedCount > 0 ? "warning" : "default"}
          />
        </div>

        {collectionItemLimit !== null && (
          <div className="mt-4 rounded-xl border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/35 px-3 py-2 text-xs text-[var(--mc-text-muted)]">
            Item limit: {readyItems} / {collectionItemLimit}
          </div>
        )}

        {isDraftOverflow && (
          <div className="mt-3 rounded-xl border border-amber-300/35 bg-amber-300/10 px-3 py-2 text-xs text-amber-100">
            還需要移除 {draftOverflowCount} 首才能建立收藏庫。
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface)]/65 p-4">
        <div className="text-sm font-semibold text-[var(--mc-text)]">
          Publish Readiness
        </div>

        <div className="mt-3 space-y-2">
          <StatRow
            label="Visibility"
            value={visibility === "public" ? "Public" : "Private"}
          />

          {!isAdmin && (
            <>
              <StatRow
                label="Collections"
                value={`${collectionsCount}/${maxCollectionsPerUser}`}
                tone={reachedCollectionLimit ? "danger" : "default"}
              />
              <StatRow
                label="Private collections"
                value={`${privateCollectionsCount}/${maxPrivateCollectionsPerUser}`}
                tone={reachedPrivateCollectionLimit ? "warning" : "default"}
              />
              <StatRow
                label="Collection slots"
                value={remainingCollectionSlots}
              />
              <StatRow
                label="Private slots"
                value={remainingPrivateCollectionSlots}
              />
            </>
          )}
        </div>

        {reachedCollectionLimit && (
          <div className="mt-3 rounded-xl border border-rose-300/35 bg-rose-300/10 px-3 py-2 text-xs text-rose-100">
            已達收藏庫建立上限，請先整理現有收藏庫。
          </div>
        )}

        {!reachedCollectionLimit && reachedPrivateCollectionLimit && (
          <div className="mt-3 rounded-xl border border-amber-300/35 bg-amber-300/10 px-3 py-2 text-xs text-amber-100">
            私人收藏已達上限，目前只能建立公開收藏。
          </div>
        )}

        {createError && (
          <div className="mt-3 rounded-xl border border-rose-300/35 bg-rose-300/10 px-3 py-2 text-xs text-rose-100">
            {createError}
          </div>
        )}
      </section>
    </aside>
  );
}
