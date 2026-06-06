import {
  type CollectionMetaChip,
  type CollectionMetaChipSource,
  useCollectionMetaChips,
} from "./collectionMetaChipsModel";

type CollectionMetaChipsProps = {
  collection: CollectionMetaChipSource | null | undefined;
  /**
   * Render only chips of this tone.
   *  - "category" → the collection's main category chip (at most one)
   *  - "language"  → all sub-tag / language chips
   * Omit to render all chips.
   */
  toneFilter?: CollectionMetaChip["tone"];
  maxVisible?: number;
  showOverflowCount?: boolean;
  /**
   * When true the wrapper collapses before the sibling title does.
   *
   * Mechanism: `flex-shrink:999` on the wrapper (vs title's default flex-shrink:1)
   * means the language group absorbs ~999× more of any overflow than the title.
   * `overflow-hidden` on the wrapper clips the inner `shrink-0` chips cleanly to zero
   * once the wrapper collapses. Result: language disappears first, title stays readable.
   *
   * Use for language chips so that the priority order is:
   *   category chip (shrink-0) > title (min-w-[3rem]) > language (lowPriority)
   */
  lowPriority?: boolean;
  variant?: "title" | "overlay" | "menu";
  className?: string;
};

const chipClassName = (
  tone: CollectionMetaChip["tone"] | "more",
  variant: NonNullable<CollectionMetaChipsProps["variant"]>,
) => {
  const base =
    "max-w-[9.5rem] shrink-0 items-center truncate rounded-full border font-semibold leading-none";
  const size =
    variant === "overlay"
      ? "px-2 py-0.5 text-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.4)] backdrop-blur-md"
      : "px-1.5 py-0.5 text-[10px]";
  const palette =
    tone === "category"
      ? variant === "overlay"
        ? "border-cyan-300/40 bg-slate-950/85 text-cyan-100"
        : "border-cyan-300/28 bg-cyan-500/12 text-cyan-100"
      : tone === "language"
        ? variant === "overlay"
          ? "border-white/20 bg-slate-950/85 text-slate-100"
          : "border-white/12 bg-white/[0.06] text-slate-300"
        : variant === "overlay"
          ? "border-white/20 bg-slate-950/85 text-slate-100"
          : "border-white/12 bg-white/[0.06] text-slate-300";

  return `${base} ${size} ${palette}`;
};

export const CollectionMetaChips = ({
  collection,
  toneFilter,
  maxVisible,
  showOverflowCount = true,
  lowPriority = false,
  variant = "title",
  className = "",
}: CollectionMetaChipsProps) => {
  const chips = useCollectionMetaChips(collection);
  const subset = toneFilter ? chips.filter((c) => c.tone === toneFilter) : chips;
  if (subset.length === 0) return null;

  const visibleLimit =
    typeof maxVisible === "number" && maxVisible > 0
      ? Math.floor(maxVisible)
      : subset.length;
  const visibleChips = subset.slice(0, visibleLimit);
  const hiddenCount = Math.max(0, subset.length - visibleChips.length);

  // lowPriority: high flex-shrink collapses this wrapper before title shrinks;
  // overflow-hidden clips the inner shrink-0 chips cleanly when width → 0.
  // default (category): shrink-0 so it is always fully visible.
  const wrapperClass = lowPriority
    ? "inline-flex min-w-0 overflow-hidden items-center gap-1 [flex-shrink:999]"
    : "inline-flex shrink-0 items-center gap-1";

  return (
    <span
      className={`${wrapperClass} ${className}`}
      aria-label={subset.map((chip) => chip.label).join("、")}
    >
      {visibleChips.map((chip) => (
        <span
          key={chip.key}
          className={`inline-flex ${chipClassName(chip.tone, variant)}`}
        >
          <span className="truncate">{chip.label}</span>
        </span>
      ))}
      {showOverflowCount && hiddenCount > 0 ? (
        <span className={`inline-flex ${chipClassName("more", variant)}`}>
          +{hiddenCount}
        </span>
      ) : null}
    </span>
  );
};
