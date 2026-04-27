import { useTranslation } from "react-i18next";

type Props = {
  totalImportedItems: number;
  selectedItems: number;
  removedItems: number;
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
  totalImportedItems,
  selectedItems,
  removedItems,
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
  const { t } = useTranslation("collectionCreate");

  const readyTone = readyItems > 0 && !isDraftOverflow ? "success" : "default";
  const selectedTone =
    selectedItems > 0 && !isDraftOverflow ? "success" : "default";
  const removedTone = removedItems > 0 ? "warning" : "default";

  return (
    <aside className="space-y-3 lg:sticky lg:top-4 lg:self-start">
      <section className="rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface)]/65 p-4">
        <div className="text-sm font-semibold text-[var(--mc-text)]">
          {t("inspector.importSummary")}
        </div>

        <div className="mt-3 space-y-2">
          <StatRow
            label={t("inspector.totalImportedItems")}
            value={totalImportedItems}
          />
          <StatRow
            label={t("inspector.selectedItems")}
            value={selectedItems}
            tone={selectedTone}
          />
          <StatRow
            label={t("inspector.removedItems")}
            value={removedItems}
            tone={removedTone}
          />
          <StatRow
            label={t("inspector.readyItems")}
            value={readyItems}
            tone={readyTone}
          />
          <StatRow label={t("inspector.longTracks")} value={longItems} />
          <StatRow
            label={t("inspector.duplicatesRemoved")}
            value={removedDuplicateCount}
          />
          <StatRow
            label={t("inspector.skippedItems")}
            value={skippedCount}
            tone={skippedCount > 0 ? "warning" : "default"}
          />
        </div>

        {collectionItemLimit !== null && (
          <div className="mt-4 rounded-xl border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/35 px-3 py-2 text-xs text-[var(--mc-text-muted)]">
            {t("inspector.itemLimit", {
              current: selectedItems,
              limit: collectionItemLimit,
            })}
          </div>
        )}

        {removedItems > 0 && (
          <div className="mt-3 rounded-xl border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-xs text-amber-100">
            {t("inspector.removedItemsHint", { count: removedItems })}
          </div>
        )}

        {isDraftOverflow && (
          <div className="mt-3 rounded-xl border border-amber-300/35 bg-amber-300/10 px-3 py-2 text-xs text-amber-100">
            {t("inspector.overflow", { count: draftOverflowCount })}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface)]/65 p-4">
        <div className="text-sm font-semibold text-[var(--mc-text)]">
          {t("inspector.publishReadiness")}
        </div>

        <div className="mt-3 space-y-2">
          <StatRow
            label={t("inspector.visibility")}
            value={
              visibility === "public"
                ? t("inspector.public")
                : t("inspector.private")
            }
          />

          {!isAdmin && (
            <>
              <StatRow
                label={t("inspector.collections")}
                value={`${collectionsCount}/${maxCollectionsPerUser}`}
                tone={reachedCollectionLimit ? "danger" : "default"}
              />
              <StatRow
                label={t("inspector.privateCollections")}
                value={`${privateCollectionsCount}/${maxPrivateCollectionsPerUser}`}
                tone={reachedPrivateCollectionLimit ? "warning" : "default"}
              />
              <StatRow
                label={t("inspector.collectionSlots")}
                value={remainingCollectionSlots}
              />
              <StatRow
                label={t("inspector.privateSlots")}
                value={remainingPrivateCollectionSlots}
              />
            </>
          )}
        </div>

        {reachedCollectionLimit && (
          <div className="mt-3 rounded-xl border border-rose-300/35 bg-rose-300/10 px-3 py-2 text-xs text-rose-100">
            {t("inspector.collectionLimitReached")}
          </div>
        )}

        {!reachedCollectionLimit && reachedPrivateCollectionLimit && (
          <div className="mt-3 rounded-xl border border-amber-300/35 bg-amber-300/10 px-3 py-2 text-xs text-amber-100">
            {t("inspector.privateLimitReached")}
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
