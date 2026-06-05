import { useState } from "react";
import { Popover } from "@mui/material";
import { useSubTagsQuery } from "../hooks/useSubTagsQuery";

type SubTagQuickPickerProps = {
  /** Trigger element renderer */
  children: (open: (target: HTMLElement) => void) => React.ReactNode;
  /** Currently selected sub-tag keys */
  value: string[];
  /** Called whenever the selection changes (multi-select) */
  onChange: (keys: string[]) => void | Promise<void>;
  /** Max selectable sub-tags */
  max?: number;
};

const MULTI_LANG_KEY = "multi";

/**
 * Lightweight popover for quickly editing a collection's language tags.
 * Multi-select with built-in mutual exclusion for "多語言".
 * Each toggle triggers onChange immediately (parent persists).
 */
export function SubTagQuickPicker({
  children,
  value,
  onChange,
  max = 5,
}: SubTagQuickPickerProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const { data: subTags = [], isLoading } = useSubTagsQuery();

  const safe = Array.isArray(value) ? value : [];

  const close = () => setAnchorEl(null);

  const toggle = (key: string) => {
    if (safe.includes(key)) {
      void onChange(safe.filter((k) => k !== key));
      return;
    }
    if (key === MULTI_LANG_KEY) {
      void onChange([MULTI_LANG_KEY]);
      return;
    }
    const withoutMulti = safe.filter((k) => k !== MULTI_LANG_KEY);
    if (withoutMulti.length < max) {
      void onChange([...withoutMulti, key]);
    }
  };

  return (
    <>
      {children((target) => setAnchorEl(target))}
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={close}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{
          paper: {
            sx: {
              mt: 0.5,
              minWidth: 240,
              maxWidth: 320,
              border: "1px solid rgba(34, 211, 238, 0.22)",
              backgroundColor: "rgba(2, 8, 23, 0.96)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              borderRadius: "12px",
              boxShadow:
                "0 20px 40px -16px rgba(2,6,23,0.7), 0 0 0 1px rgba(34,211,238,0.05) inset",
              color: "var(--mc-text)",
            },
          },
        }}
      >
        <div className="p-2">
          <div className="mb-1 flex items-center justify-between px-2 pb-1 pt-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300/70">
              語系
            </span>
            <span className="text-[10px] text-white/35">
              {safe.length}/{max}
            </span>
          </div>
          {isLoading ? (
            <div className="px-2 py-3 text-xs text-white/50">載入中…</div>
          ) : (
            <div className="flex flex-wrap gap-1.5 px-1.5 pb-1">
              {subTags.map((tag) => {
                const active = safe.includes(tag.key);
                const maxReached = !active && safe.length >= max;
                return (
                  <button
                    key={tag.key}
                    type="button"
                    disabled={maxReached}
                    onClick={() => toggle(tag.key)}
                    className={[
                      "rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition-all duration-150",
                      "focus:outline-none focus:ring-2 focus:ring-cyan-400/40 disabled:cursor-not-allowed disabled:opacity-35",
                      active
                        ? "border-cyan-300/60 bg-cyan-400/20 text-cyan-50 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.15)]"
                        : "border-white/10 bg-slate-900/40 text-cyan-100/85 hover:border-cyan-300/40 hover:bg-cyan-500/15 hover:text-cyan-50",
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
        </div>
      </Popover>
    </>
  );
}
