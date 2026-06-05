import { useCategoriesQuery, useSubTagsQuery } from "@features/CollectionCategory";
import type { FilterAggregations } from "@features/CollectionContent";

const NO_CATEGORY_KEY = "__none__";

type Props = {
  /**
   * Server-authoritative cross-dimensional counts.
   * `undefined` = still loading (chips render but counts may be stale).
   */
  aggregations: FilterAggregations | undefined;
  /** Currently selected category key (single-select). null = 全部. */
  selectedCategoryKey: string | null;
  /** Currently selected sub-tag key (single-select). null = 全部. */
  selectedSubTagKey: string | null;
  /** Called when user picks a category (or null to clear). */
  onSelectCategory: (key: string | null) => void;
  /** Called when user picks a sub-tag (or null to clear). */
  onSelectSubTag: (key: string | null) => void;
  /** Optional loading indicator for refetches */
  isLoading?: boolean;
};

/**
 * Single-select filter chip bar for category + language.
 * Counts come from a dedicated server aggregations endpoint —
 * never derived from currently-loaded items.
 */
const CollectionFilterBar = ({
  aggregations,
  selectedCategoryKey,
  selectedSubTagKey,
  onSelectCategory,
  onSelectSubTag,
  isLoading = false,
}: Props) => {
  const { data: categories = [] } = useCategoriesQuery();
  const { data: subTags = [] } = useSubTagsQuery();

  const totalByCategoryFilter = aggregations?.totalByCategoryFilter ?? 0;
  const totalBySubTagFilter = aggregations?.totalBySubTagFilter ?? 0;
  const byCategory = aggregations?.byCategory ?? {};
  const bySubTag = aggregations?.bySubTag ?? {};
  const noCategoryCount = aggregations?.noCategoryCount ?? 0;

  const renderChip = (
    key: string,
    label: string,
    count: number,
    active: boolean,
    onClick: () => void,
    accent: "cyan" | "slate" = "slate",
  ) => {
    const activeBase =
      accent === "cyan"
        ? "border-cyan-400/55 bg-cyan-500/20 text-cyan-100"
        : "border-blue-400/55 bg-blue-500/20 text-blue-100";
    const inactive =
      "border-white/10 bg-slate-950/50 text-slate-300 hover:border-white/25 hover:text-white";
    return (
      <button
        key={key}
        type="button"
        onClick={onClick}
        className={[
          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-medium leading-none transition-colors",
          active ? activeBase : inactive,
        ].join(" ")}
      >
        <span>{label}</span>
        <span
          className={[
            "rounded-full px-1.5 text-[10px] font-semibold tabular-nums",
            active ? "bg-black/25 text-white/90" : "bg-white/10 text-white/60",
          ].join(" ")}
        >
          {count}
        </span>
      </button>
    );
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Category row */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-white/40">
          分類
        </span>
        {renderChip(
          "__all_cat__",
          "全部",
          totalByCategoryFilter,
          selectedCategoryKey === null,
          () => onSelectCategory(null),
        )}
        {categories.map((cat) => {
          const cnt = byCategory[cat.key] ?? 0;
          if (cnt === 0 && selectedCategoryKey !== cat.key) return null;
          return renderChip(
            cat.key,
            cat.label,
            cnt,
            selectedCategoryKey === cat.key,
            () =>
              onSelectCategory(
                selectedCategoryKey === cat.key ? null : cat.key,
              ),
          );
        })}
        {(noCategoryCount > 0 || selectedCategoryKey === NO_CATEGORY_KEY) &&
          renderChip(
            NO_CATEGORY_KEY,
            "未分類",
            noCategoryCount,
            selectedCategoryKey === NO_CATEGORY_KEY,
            () =>
              onSelectCategory(
                selectedCategoryKey === NO_CATEGORY_KEY
                  ? null
                  : NO_CATEGORY_KEY,
              ),
          )}
      </div>

      {/* Sub-tag (language) row */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-white/40">
          語言
        </span>
        {renderChip(
          "__all_lang__",
          "全部",
          totalBySubTagFilter,
          selectedSubTagKey === null,
          () => onSelectSubTag(null),
          "cyan",
        )}
        {subTags.map((tag) => {
          const cnt = bySubTag[tag.key] ?? 0;
          if (cnt === 0 && selectedSubTagKey !== tag.key) return null;
          return renderChip(
            tag.key,
            tag.label,
            cnt,
            selectedSubTagKey === tag.key,
            () =>
              onSelectSubTag(selectedSubTagKey === tag.key ? null : tag.key),
            "cyan",
          );
        })}
      </div>

      {/* Subtle loading indicator (only when counts are refetching) */}
      {isLoading && aggregations !== undefined && (
        <div className="flex justify-end text-[10px] text-cyan-300/45">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-1 w-1 animate-pulse rounded-full bg-cyan-400/60" />
            更新中
          </span>
        </div>
      )}
    </div>
  );
};

export default CollectionFilterBar;
