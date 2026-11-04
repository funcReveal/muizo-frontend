import { useState } from "react";
import { Popover } from "@mui/material";
import { useCategoriesQuery } from "../hooks/useCategoriesQuery";

type CategoryQuickPickerProps = {
  /** Trigger element (the chip / + button) */
  children: (open: (target: HTMLElement) => void) => React.ReactNode;
  /** Currently selected category UUID (null = none) */
  value: string | null;
  /** Called when user picks a category. Picker closes automatically. */
  onChange: (categoryId: string | null) => void | Promise<void>;
  /** Whether visibility is public — affects "clear" allowed */
  allowClear?: boolean;
  onOpenChange?: (open: boolean) => void;
};

/**
 * Lightweight popover for quickly setting a collection's primary category
 * directly from the collection card. Sub-tags are managed in the full editor.
 */
export function CategoryQuickPicker({
  children,
  value,
  onChange,
  allowClear = true,
  onOpenChange,
}: CategoryQuickPickerProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const { data: categories = [], isLoading } = useCategoriesQuery();

  const close = () => {
    setAnchorEl(null);
    onOpenChange?.(false);
  };
  const open = (target: HTMLElement) => {
    setAnchorEl(target);
    onOpenChange?.(true);
  };
  const handlePick = async (id: string | null) => {
    close();
    await onChange(id);
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
              color: "var(--mc-text)",
              borderRadius: "12px",
              boxShadow: "0 20px 40px rgba(2,6,23,0.5)",
            },
          },
        }}
      >
        <div className="p-2">
          <div className="px-2 pb-1.5 pt-0.5 text-[11px] font-medium uppercase tracking-wide text-white/40">
            選擇主分類
          </div>
          {isLoading ? (
            <div className="px-2 py-3 text-xs text-white/50">載入中…</div>
          ) : (
            <div className="flex flex-col">
              {allowClear && (
                <button
                  type="button"
                  onClick={() => void handlePick(null)}
                  className={[
                    "flex items-center gap-2 min-h-11 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                    value === null
                      ? "bg-[var(--mc-accent-soft)] text-[var(--mc-accent)]"
                      : "text-white/70 hover:bg-white/5",
                  ].join(" ")}
                >
                  <span className="text-base">∅</span>
                  <span>未分類</span>
                </button>
              )}
              {categories.map((parent) =>
                parent.children.length > 0 ? (
                  <div key={parent.key} className="mt-1.5">
                    <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-white/35">
                      {parent.label}
                    </div>
                    {parent.children.map((child) => (
                      <button
                        key={child.key}
                        type="button"
                        onClick={() => void handlePick(child.id)}
                        aria-pressed={value === child.id}
                        className={[
                          "flex w-full items-center gap-2 min-h-11 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                          value === child.id
                            ? "bg-[var(--mc-accent-soft)] text-[var(--mc-accent)]"
                            : "text-white/80 hover:bg-white/5",
                        ].join(" ")}
                      >
                        <span className="text-white/30">└</span>
                        <span>{child.label}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <button
                    key={parent.key}
                    type="button"
                    onClick={() => void handlePick(parent.id)}
                    aria-pressed={value === parent.id}
                    className={[
                      "mt-0.5 flex w-full items-center gap-2 min-h-11 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                      value === parent.id
                        ? "bg-[var(--mc-accent-soft)] text-[var(--mc-accent)]"
                        : "text-white/80 hover:bg-white/5",
                    ].join(" ")}
                  >
                    <span>{parent.label}</span>
                  </button>
                ),
              )}
            </div>
          )}
        </div>
      </Popover>
    </>
  );
}
