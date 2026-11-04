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
  onOpenChange?: (open: boolean) => void;
};

const MULTI_LANG_KEY = "multi";

/**
 * Lightweight popover for quickly editing a collection's language tags.
 * Multi-select with built-in mutual exclusion for "多語系".
 * Each toggle triggers onChange immediately (parent persists).
 */
export function SubTagQuickPicker({
  children,
  value,
  onChange,
  max = 5,
  onOpenChange,
}: SubTagQuickPickerProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const { data: subTags = [], isLoading } = useSubTagsQuery();

  const safe = Array.isArray(value) ? value : [];

  const close = () => {
    setAnchorEl(null);
    onOpenChange?.(false);
  };
  const open = (target: HTMLElement) => {
    setAnchorEl(target);
    onOpenChange?.(true);
  };

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
      {children(open)}
      <Popover
        sx={{ zIndex: 1700 }}
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
              maxHeight: "min(420px, calc(100dvh - 48px))",
              overflowY: "auto",
              border: "1px solid var(--mc-border)",
              backgroundColor: "var(--mc-surface-strong)",
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
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--mc-text-muted)]">
              語系
            </span>
            <span className="text-[10px] text-white/35">
              {safe.length}/{max}
            </span>
          </div>
          {isLoading ? (
            <div className="px-2 py-3 text-xs text-white/50">載入中…</div>
          ) : (
            <div className="flex flex-col gap-0.5 pb-1">
              {subTags.map((tag) => {
                const active = safe.includes(tag.key);
                const maxReached = !active && safe.length >= max;
                return (
                  <button
                    key={tag.key}
                    type="button"
                    disabled={maxReached}
                    onClick={() => toggle(tag.key)}
                    aria-pressed={active}
                    className={[
                      "flex w-full items-center min-h-11 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                      "focus:outline-none focus:ring-2 focus:ring-[var(--mc-accent)]/30 disabled:cursor-not-allowed disabled:opacity-35",
                      active
                        ? "bg-[var(--mc-accent-soft)] text-[var(--mc-accent)]"
                        : "text-white/80 hover:bg-white/5 hover:text-white",
                    ].join(" ")}
                  >
                    <span
                      className={`mr-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full ${active ? "bg-[var(--mc-accent)]" : "bg-white/15"}`}
                    />
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
