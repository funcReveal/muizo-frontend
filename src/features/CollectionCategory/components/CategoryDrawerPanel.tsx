import { useState, useEffect } from "react";
import { Popover } from "@mui/material";
import { useCategoriesQuery } from "../hooks/useCategoriesQuery";
import { useSubTagsQuery } from "../hooks/useSubTagsQuery";
import type {
  CategoryDetectResult,
  CategoryTreeItem,
} from "../api/categoriesApi";

type CategoryDrawerPanelProps = {
  /** Currently selected category UUID */
  categoryId: string | null;
  /** Currently selected sub-tag keys */
  subTagKeys: string[];
  /** Whether the collection is public — affects required marker (kept for legacy) */
  visibility: "private" | "public";
  /** Auto-save in progress flag — shows the indicator + disables inputs */
  isSaving: boolean;
  /** Auto-detect result (managed by parent — single source of truth) */
  detectSuggestion: CategoryDetectResult | null;
  detectIsRunning: boolean;
  detectHasRun: boolean;
  /** Setters */
  onCategoryChange: (id: string | null) => void;
  onSubTagsChange: (keys: string[]) => void;
  /**
   * Layout mode.
   *  - "drawer" (default): fills parent height with internal scroll + sticky footer.
   *  - "embedded": natural content flow, no internal scroll, no footer chrome.
   *    Use this when the panel is placed inside a page layout (e.g. Create flow).
   */
  layout?: "drawer" | "embedded";
};

const MULTI_LANG_KEY = "multi";
const MAX_SUB_TAGS = 5;

type PopoverState = {
  anchorEl: HTMLElement;
  parent: CategoryTreeItem;
};

// Suggestion descriptor for inline hint chips next to section headers
type CategorySuggestionTarget = {
  id: string;
  label: string;
  parentLabel: string | null;
};

const SuggestionInline = ({
  label,
  onClick,
  title,
  disabled,
}: {
  label: string;
  onClick: () => void;
  title?: string;
  disabled: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={[
      "group/sg inline-flex items-center gap-1 rounded-full border border-cyan-300/35 bg-cyan-500/15 px-2 py-[1px] text-[10.5px] font-medium text-cyan-100",
      "transition-colors duration-150 hover:border-cyan-300/65 hover:bg-cyan-500/25",
      "focus:outline-none focus:ring-2 focus:ring-cyan-400/40 disabled:opacity-40",
    ].join(" ")}
    aria-label={`套用建議：${label}`}
  >
    <span className="text-cyan-300/85" aria-hidden>
      +
    </span>
    <span>{label}</span>
  </button>
);

const SuggestionLoading = () => (
  <span className="inline-flex items-center gap-1 text-[10.5px] text-cyan-300/55">
    <span className="inline-block h-1 w-1 animate-pulse rounded-full bg-cyan-400/70" />
    <span>偵測中</span>
  </span>
);

export function CategoryDrawerPanel({
  categoryId,
  subTagKeys,
  visibility,
  isSaving,
  detectSuggestion,
  detectIsRunning,
  detectHasRun,
  onCategoryChange,
  onSubTagsChange,
  layout = "drawer",
}: CategoryDrawerPanelProps) {
  void visibility; // category is now required for both visibilities — kept in API for backward compat

  const isEmbedded = layout === "embedded";
  const { data: categories = [], isLoading: catLoading } = useCategoriesQuery();
  const { data: subTags = [], isLoading: subTagLoading } = useSubTagsQuery();

  const safeSubTags = Array.isArray(subTagKeys) ? subTagKeys : [];

  // Popover state for sub-category selection (no document-flow impact)
  const [popoverState, setPopoverState] = useState<PopoverState | null>(null);
  const closePopover = () => setPopoverState(null);

  const toggleSubTag = (key: string) => {
    if (isSaving) return;
    if (safeSubTags.includes(key)) {
      onSubTagsChange(safeSubTags.filter((k) => k !== key));
      return;
    }
    if (key === MULTI_LANG_KEY) {
      onSubTagsChange([MULTI_LANG_KEY]);
      return;
    }
    const withoutMulti = safeSubTags.filter((k) => k !== MULTI_LANG_KEY);
    if (withoutMulti.length < MAX_SUB_TAGS) {
      onSubTagsChange([...withoutMulti, key]);
    }
  };

  // Resolve which parent contains the currently selected category (for active highlight)
  const selectedParent = (() => {
    if (!categoryId) return null;
    for (const parent of categories) {
      if (parent.id === categoryId)
        return { parent, isChild: false as const };
      for (const child of parent.children) {
        if (child.id === categoryId)
          return { parent, isChild: true as const, child };
      }
    }
    return null;
  })();

  const selectedChildLabel =
    selectedParent && selectedParent.isChild
      ? selectedParent.child.label
      : null;
  const categoryGridClassName = isEmbedded
    ? "grid grid-cols-1 gap-2 min-[520px]:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6"
    : "grid grid-cols-2 gap-2 min-[360px]:grid-cols-3";

  // ───────────────────────────────────────────────────────────
  // INLINE SUGGESTION RESOLUTION
  // ───────────────────────────────────────────────────────────

  /** Resolve detected category key → concrete target with id/label/parent */
  const categorySuggestion = ((): CategorySuggestionTarget | null => {
    if (!detectSuggestion?.categoryKey) return null;
    for (const parent of categories) {
      if (parent.key === detectSuggestion.categoryKey) {
        return { id: parent.id, label: parent.label, parentLabel: null };
      }
      for (const child of parent.children) {
        if (child.key === detectSuggestion.categoryKey) {
          return {
            id: child.id,
            label: child.label,
            parentLabel: parent.label,
          };
        }
      }
    }
    return null;
  })();

  /** Resolve detected sub-tag keys → labels with applied / unapplied state */
  const subTagSuggestions = (() => {
    if (!detectSuggestion) return [];
    return detectSuggestion.subTagKeys
      .map((key) => {
        const tag = subTags.find((t) => t.key === key);
        return tag ? { key, label: tag.label } : null;
      })
      .filter((t): t is { key: string; label: string } => t !== null);
  })();

  /** Show category suggestion only when: detection ran, target exists, not already applied */
  const showCategorySuggestion =
    detectHasRun &&
    categorySuggestion !== null &&
    categorySuggestion.id !== categoryId;

  /** Show sub-tag suggestion only when: detection ran, has unapplied tags */
  const unappliedSubTags = subTagSuggestions.filter(
    (t) => !safeSubTags.includes(t.key),
  );
  const showSubTagSuggestion = detectHasRun && unappliedSubTags.length > 0;

  const applyCategorySuggestion = () => {
    if (!categorySuggestion) return;
    onCategoryChange(categorySuggestion.id);
  };

  const applySubTagSuggestion = () => {
    if (unappliedSubTags.length === 0) return;
    // Merge unapplied suggestion tags into the current selection respecting max
    const merged = [...safeSubTags];
    for (const tag of unappliedSubTags) {
      if (merged.includes(tag.key)) continue;
      if (tag.key === MULTI_LANG_KEY) {
        // multi is exclusive — replace
        onSubTagsChange([MULTI_LANG_KEY]);
        return;
      }
      const withoutMulti = merged.filter((k) => k !== MULTI_LANG_KEY);
      if (withoutMulti.length >= MAX_SUB_TAGS) break;
      merged.splice(0, merged.length, ...withoutMulti, tag.key);
    }
    onSubTagsChange(merged);
  };

  // Close popover with Escape
  useEffect(() => {
    if (!popoverState) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePopover();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [popoverState]);
  return (
    <div
      className={
        isEmbedded
          ? "relative flex flex-col"
          : "relative flex h-full flex-col"
      }
    >
      {/* MAIN AREA — scrolls in drawer mode, natural flow in embedded mode */}
      <div
        className={
          isEmbedded
            ? "relative"
            : "relative min-h-0 flex-1 overflow-y-auto"
        }
      >
        {/* Ambient gradient */}
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          aria-hidden
          style={{
            background:
              "radial-gradient(at 0% 0%, rgba(34,211,238,0.10), transparent 50%), radial-gradient(at 100% 100%, rgba(56,189,248,0.05), transparent 50%)",
          }}
        />

        <div className="relative flex flex-col gap-5 px-5 py-4">
          {/* ───── MAIN CATEGORY SECTION ───── */}
          <section className="flex flex-col gap-2.5">
            <header className="flex items-baseline justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300/80">
                  主分類
                  <span className="ml-1 text-[10px] font-normal text-rose-300/70">
                    *
                  </span>
                </h3>
                {/* Inline detection hint for category */}
                {detectIsRunning && !showCategorySuggestion && (
                  <SuggestionLoading />
                )}
                {showCategorySuggestion && categorySuggestion && (
                  <SuggestionInline
                    label={categorySuggestion.label}
                    onClick={applyCategorySuggestion}
                    disabled={isSaving}
                    title={
                      categorySuggestion.parentLabel
                        ? `${categorySuggestion.parentLabel} › ${categorySuggestion.label}`
                        : categorySuggestion.label
                    }
                  />
                )}
              </div>
              {!categoryId && (
                <span className="text-[10px] font-medium text-rose-300/70">
                  必填
                </span>
              )}
            </header>

            {catLoading ? (
              <div className={categoryGridClassName}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-11 animate-pulse rounded-xl border border-white/5 bg-white/[0.03]"
                  />
                ))}
              </div>
            ) : (
              <div className={categoryGridClassName}>
                {categories.map((parent) => {
                  const hasChildren = parent.children.length > 0;
                  const active =
                    selectedParent?.parent.key === parent.key &&
                    (selectedParent.isChild || !hasChildren);
                  const isPopoverOpenForThis =
                    popoverState?.parent.key === parent.key;

                  return (
                    <button
                      key={parent.key}
                      type="button"
                      disabled={isSaving}
                      onClick={(e) => {
                        if (hasChildren) {
                          if (isPopoverOpenForThis) {
                            closePopover();
                          } else {
                            setPopoverState({
                              anchorEl: e.currentTarget,
                              parent,
                            });
                          }
                          return;
                        }
                        onCategoryChange(
                          parent.id === categoryId ? null : parent.id,
                        );
                      }}
                      className={[
                        // Equal column widths via calc, with the last partial row centered by parent's justify-center
                        "w-full min-w-0",
                        "group/cat relative overflow-hidden rounded-xl border px-3 py-2.5 text-left transition-all duration-200",
                        "focus:outline-none focus:ring-2 focus:ring-cyan-400/40",
                        active || isPopoverOpenForThis
                          ? "border-cyan-400/50 bg-gradient-to-br from-cyan-500/20 via-cyan-500/10 to-transparent text-cyan-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_20px_-12px_rgba(34,211,238,0.45)]"
                          : "border-white/8 bg-white/[0.02] text-slate-300 hover:border-cyan-300/30 hover:bg-cyan-500/[0.08] hover:text-cyan-100",
                        isSaving ? "opacity-50" : "",
                      ].join(" ")}
                    >
                      {(active || isPopoverOpenForThis) && (
                        <span className="absolute left-0 top-0 h-full w-[2px] bg-gradient-to-b from-cyan-300 via-cyan-400 to-transparent" />
                      )}
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex min-w-0 items-baseline gap-1">
                          <span className="shrink-0 truncate text-[13px] font-semibold">
                            {parent.label}
                          </span>
                          {active && selectedChildLabel && (
                            <span className="min-w-0 truncate text-[10.5px] font-medium text-cyan-200/85">
                              · {selectedChildLabel}
                            </span>
                          )}
                        </div>
                        {hasChildren && (
                          <span
                            className={[
                              "shrink-0 text-[10px] transition-transform duration-200",
                              isPopoverOpenForThis
                                ? "rotate-180 text-cyan-200/80"
                                : "text-white/40",
                            ].join(" ")}
                            aria-hidden
                          >
                            ▾
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* Hairline divider */}
          <div className="relative h-px">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>

          {/* ───── LANGUAGE SECTION ───── */}
          <section className="flex flex-col gap-2.5">
            <header className="flex items-baseline justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300/80">
                  語系
                </h3>
                {/* Inline detection hint for sub-tags */}
                {detectIsRunning && !showSubTagSuggestion && (
                  <SuggestionLoading />
                )}
                {showSubTagSuggestion &&
                  unappliedSubTags.map((tag) => (
                    <SuggestionInline
                      key={`sg-${tag.key}`}
                      label={tag.label}
                      onClick={applySubTagSuggestion}
                      disabled={isSaving}
                    />
                  ))}
              </div>
              <span className="text-[10px] text-white/40">
                {safeSubTags.length}/{MAX_SUB_TAGS}
              </span>
            </header>

            {subTagLoading ? (
              <div className="flex flex-wrap gap-1.5">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-7 w-14 animate-pulse rounded-full border border-white/5 bg-white/[0.03]"
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {subTags.map((tag) => {
                  const active = safeSubTags.includes(tag.key);
                  const maxReached =
                    !active && safeSubTags.length >= MAX_SUB_TAGS;
                  return (
                    <button
                      key={tag.key}
                      type="button"
                      disabled={isSaving || maxReached}
                      onClick={() => toggleSubTag(tag.key)}
                      className={[
                        "relative min-h-9 overflow-hidden rounded-full border px-3.5 py-2 text-[13px] font-medium leading-none transition-all duration-150",
                        "focus:outline-none focus:ring-2 focus:ring-cyan-400/40 disabled:cursor-not-allowed disabled:opacity-35",
                        active
                          ? "border-cyan-300/60 bg-cyan-400/20 text-cyan-50 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.15)]"
                          : "border-white/8 bg-white/[0.02] text-slate-300 hover:border-cyan-300/30 hover:bg-cyan-500/[0.08] hover:text-cyan-100",
                      ].join(" ")}
                    >
                      {active && (
                        <span className="mr-1 inline-block text-[10px] text-cyan-300/80">
                          ✓
                        </span>
                      )}
                      {tag.label}
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Sticky footer — only in drawer mode */}
      {!isEmbedded && (
        <div className="relative border-t border-white/5 bg-slate-950/40 px-5 py-2.5 backdrop-blur-sm">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-white/40">變更會自動儲存</span>
            <span
              className={[
                "inline-flex items-center gap-1.5 font-medium transition-opacity duration-200",
                isSaving
                  ? "text-cyan-300 opacity-100"
                  : "pointer-events-none select-none text-cyan-300 opacity-0",
              ].join(" ")}
            >
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
              儲存中
            </span>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────
          SUB-CATEGORY POPOVER — narrow 280px forces a tidy 3+2 rhythm
          for 5 chips; partial last row centers via justify-center.
          Absolute-positioned, no document-flow impact.
          ─────────────────────────────────────────────────────────── */}
      <Popover
        open={Boolean(popoverState)}
        anchorEl={popoverState?.anchorEl ?? null}
        onClose={closePopover}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{
          paper: {
            sx: {
              mt: 0.5,
              // 280px naturally breaks 5 chips into 3+2 (J-POP, K-POP, 國語流行 fit in
              // ~210px; 4th chip's ~85px width pushes total over 280 → wrap).
              width: "min(244px, calc(100vw - 28px))",
              maxWidth: "calc(100vw - 28px)",
              border: "1px solid rgba(34, 211, 238, 0.25)",
              backgroundColor: "rgba(2, 8, 23, 0.96)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              borderRadius: "14px",
              boxShadow:
                "0 24px 48px -16px rgba(2,6,23,0.7), 0 0 0 1px rgba(34,211,238,0.05) inset",
              color: "var(--mc-text)",
              overflow: "visible",
            },
          },
        }}
      >
        {popoverState && (
          <div className="p-1.5">
            <div className="mb-1 flex items-center justify-between px-1.5 pb-1 pt-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300/70">
                {popoverState.parent.label}
              </span>
              <span className="text-[10px] text-white/35">選擇子分類</span>
            </div>

            {/* justify-center centers any partial last row (e.g. the 2 chips below 3) */}
            <div className="flex flex-wrap justify-center gap-1.5 px-0.5 pb-0.5">
              {popoverState.parent.children.map((child) => {
                const active = categoryId === child.id;
                return (
                  <button
                    key={child.key}
                    type="button"
                    disabled={isSaving}
                    onClick={() => {
                      onCategoryChange(active ? null : child.id);
                      closePopover();
                    }}
                    className={[
                      "min-h-8 whitespace-nowrap rounded-full border px-2.5 py-1.5 text-[12px] font-medium leading-none transition-all duration-150",
                      "focus:outline-none focus:ring-2 focus:ring-cyan-400/40",
                      active
                        ? "border-cyan-400/60 bg-cyan-400/90 text-slate-900 shadow-[0_4px_12px_-6px_rgba(34,211,238,0.7)]"
                        : "border-cyan-300/20 bg-slate-900/40 text-cyan-100/85 hover:border-cyan-300/45 hover:bg-cyan-500/15 hover:text-cyan-50",
                      isSaving ? "opacity-50" : "",
                    ].join(" ")}
                  >
                    {child.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </Popover>
    </div>
  );
}
