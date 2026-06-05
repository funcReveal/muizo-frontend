import KeyboardArrowDownRounded from "@mui/icons-material/KeyboardArrowDownRounded";
import {
  CircularProgress,
  FormControl,
  MenuItem,
  Select,
  type SelectChangeEvent,
} from "@mui/material";
import type { ReactNode } from "react";

export type MuizoSelectOption = {
  value: string;
  label: string;
  description?: string;
  thumbnail?: string;
  hideThumbnail?: boolean;
  disabled?: boolean;
  meta?: ReactNode;
};

type MuizoSelectProps = {
  value: string;
  options: MuizoSelectOption[];
  placeholder: string;
  tone?: "default" | "casual" | "leaderboard";
  size?: "default" | "compact";
  disabled?: boolean;
  loading?: boolean;
  emptyText?: string;
  label?: string;
  helperText?: string;
  errorText?: string | null;
  className?: string;
  opaque?: boolean;
  onOpen?: () => void;
  onChange: (value: string) => void;
};

export default function MuizoSelect({
  value,
  options,
  placeholder,
  tone = "default",
  size = "default",
  disabled = false,
  loading = false,
  emptyText = "No options available",
  label,
  helperText,
  errorText,
  className,
  opaque = false,
  onOpen,
  onChange,
}: MuizoSelectProps) {
  const selectedOption = options.find((option) => option.value === value);
  const hasError = Boolean(errorText);
  const isCompact = size === "compact";
  const toneStyles = {
    default: {
      hoverRing: "rgba(34, 211, 238, 0.16)",
      hoverBorder: "rgba(34, 211, 238, 0.34)",
      hoverShadow: "rgba(8, 47, 73, 0.2)",
      focusRing: "rgba(251, 191, 36, 0.28)",
      focusBorder: "rgba(251, 191, 36, 0.72)",
      focusShadow: "rgba(120, 53, 15, 0.18)",
      selectedBg: "rgba(251, 191, 36, 0.14)",
      selectedHoverBg: "rgba(251, 191, 36, 0.2)",
      optionHoverBg: "rgba(34, 211, 238, 0.1)",
    },
    casual: {
      hoverRing: "rgba(45, 212, 191, 0.18)",
      hoverBorder: "rgba(45, 212, 191, 0.42)",
      hoverShadow: "rgba(20, 184, 166, 0.18)",
      focusRing: "rgba(45, 212, 191, 0.28)",
      focusBorder: "rgba(45, 212, 191, 0.72)",
      focusShadow: "rgba(20, 184, 166, 0.2)",
      selectedBg: "rgba(45, 212, 191, 0.14)",
      selectedHoverBg: "rgba(45, 212, 191, 0.22)",
      optionHoverBg: "rgba(45, 212, 191, 0.1)",
    },
    leaderboard: {
      hoverRing: "rgba(251, 191, 36, 0.18)",
      hoverBorder: "rgba(251, 191, 36, 0.42)",
      hoverShadow: "rgba(180, 83, 9, 0.18)",
      focusRing: "rgba(251, 191, 36, 0.3)",
      focusBorder: "rgba(251, 191, 36, 0.74)",
      focusShadow: "rgba(120, 53, 15, 0.22)",
      selectedBg: "rgba(251, 191, 36, 0.14)",
      selectedHoverBg: "rgba(251, 191, 36, 0.22)",
      optionHoverBg: "rgba(251, 191, 36, 0.1)",
    },
  }[tone];

  const handleChange = (event: SelectChangeEvent<string>) => {
    onChange(event.target.value);
  };

  return (
    <div className={className}>
      {label && (
        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--mc-text-muted)]">
          {label}
        </div>
      )}

      <FormControl fullWidth size="small" error={hasError}>
        <Select<string>
          displayEmpty
          value={value}
          disabled={disabled || loading}
          onOpen={onOpen}
          onChange={handleChange}
          IconComponent={KeyboardArrowDownRounded}
          renderValue={() => {
            if (!selectedOption) {
              return (
                <span className="text-sm text-[var(--mc-text-muted)]">
                  {loading ? placeholder : placeholder}
                </span>
              );
            }

            return (
              <div
                className={`flex min-w-0 items-center ${
                  isCompact ? "gap-2.5" : "gap-3"
                }`}
              >
                {selectedOption.hideThumbnail ? null : selectedOption.thumbnail ? (
                  <img
                    src={selectedOption.thumbnail}
                    alt=""
                    className={`shrink-0 rounded-lg object-cover ${
                      isCompact ? "h-8 w-11" : "h-9 w-12"
                    }`}
                    loading="lazy"
                  />
                ) : (
                  <div
                    className={`flex shrink-0 items-center justify-center rounded-lg border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/70 text-[11px] font-semibold text-[var(--mc-text-muted)] ${
                      isCompact ? "h-8 w-11" : "h-9 w-12"
                    }`}
                  >
                    YT
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-[var(--mc-text)]">
                    {selectedOption.label}
                  </div>

                  {selectedOption.description && (
                    <div className="truncate text-xs text-[var(--mc-text-muted)]">
                      {selectedOption.description}
                    </div>
                  )}
                </div>

                {selectedOption.meta && (
                  <div className="ml-auto shrink-0 text-right text-xs text-[var(--mc-text-muted)]">
                    {selectedOption.meta}
                  </div>
                )}
              </div>
            );
          }}
          MenuProps={{
            PaperProps: {
              sx: {
                mt: 1,
                borderRadius: "20px",
                border: "1px solid var(--mc-border)",
                background:
                  "linear-gradient(180deg, rgba(15,23,42,0.98), rgba(2,6,23,0.98))",
                color: "var(--mc-text)",
                boxShadow:
                  "0 24px 80px rgba(2,6,23,0.55), 0 0 0 1px rgba(148,163,184,0.12)",
                maxHeight: 360,
                overflowY: "auto",
                overflowX: "hidden",
                overscrollBehavior: "contain",
              },
            },
            MenuListProps: {
              sx: {
                p: 1,
              },
            },
          }}
          sx={{
            minHeight: isCompact ? 44 : 54,
            borderRadius: isCompact ? "16px" : "20px",
            backgroundColor: opaque ? "rgb(8, 12, 20)" : "rgba(2, 6, 23, 0.32)",
            color: "var(--mc-text)",
            cursor: disabled || loading ? "not-allowed" : "pointer",
            userSelect: "none",
            boxShadow:
              "0 0 0 1px rgba(148, 163, 184, 0.12), 0 10px 28px rgba(2, 6, 23, 0.18)",
            transition:
              "background-color 180ms ease, box-shadow 180ms ease, border-color 180ms ease",
            "& .MuiSelect-select": {
              display: "flex",
              alignItems: "center",
              minHeight: isCompact ? "44px" : "54px",
              cursor: disabled || loading ? "not-allowed" : "pointer",
              py: isCompact ? 0.35 : 0.75,
              pr: isCompact ? "38px !important" : "44px !important",
            },
            "& .MuiSelect-select, & .MuiSelect-select *": {
              cursor: disabled || loading ? "not-allowed" : "pointer",
            },
            "& input": {
              cursor: disabled || loading ? "not-allowed" : "pointer",
            },
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: hasError
                ? "rgba(248, 113, 113, 0.5)"
                : "rgba(148, 163, 184, 0.2)",
              pointerEvents: "none",
            },
            "&:hover": {
              backgroundColor: opaque ? "rgb(12, 18, 30)" : "rgba(15, 23, 42, 0.52)",
              boxShadow: hasError
                ? "0 0 0 1px rgba(248, 113, 113, 0.26), 0 18px 38px rgba(127, 29, 29, 0.18)"
                : `0 0 0 1px ${toneStyles.hoverRing}, 0 16px 34px ${toneStyles.hoverShadow}`,
            },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: hasError
                ? "rgba(248, 113, 113, 0.66)"
                : toneStyles.hoverBorder,
            },
            "&.Mui-focused": {
              backgroundColor: opaque ? "rgb(13, 20, 34)" : "rgba(15, 23, 42, 0.62)",
              boxShadow: hasError
                ? "0 0 0 1px rgba(248, 113, 113, 0.28), 0 18px 38px rgba(127, 29, 29, 0.18)"
                : `0 0 0 1px ${toneStyles.focusRing}, 0 18px 38px ${toneStyles.focusShadow}`,
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: hasError
                ? "rgba(248, 113, 113, 0.72)"
                : toneStyles.focusBorder,
            },
            "& .MuiSelect-icon": {
              color: "var(--mc-text-muted)",
              pointerEvents: "none",
              right: isCompact ? 10 : 14,
            },
            "&.Mui-disabled": {
              opacity: 0.68,
              cursor: "not-allowed",
            },
          }}
        >
          {loading && (
            <MenuItem disabled value="__loading__">
              <div className="flex w-full items-center gap-3 rounded-xl px-1 py-2 text-sm text-[var(--mc-text-muted)]">
                <CircularProgress
                  size={16}
                  thickness={5}
                  sx={{ color: "var(--mc-accent)" }}
                />
                <span>{placeholder}</span>
              </div>
            </MenuItem>
          )}

          {!loading && options.length === 0 && (
            <MenuItem disabled value="__empty__">
              <div className="rounded-xl px-1 py-2 text-sm text-[var(--mc-text-muted)]">
                {emptyText}
              </div>
            </MenuItem>
          )}

          {!loading &&
            options.map((option) => (
              <MenuItem
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                sx={{
                  borderRadius: "16px",
                  my: 0.35,
                  px: 1.25,
                  py: 1,
                  color: "var(--mc-text)",
                  "&.Mui-selected": {
                    backgroundColor: toneStyles.selectedBg,
                  },
                  "&.Mui-selected:hover": {
                    backgroundColor: toneStyles.selectedHoverBg,
                  },
                  "&:hover": {
                    backgroundColor: toneStyles.optionHoverBg,
                  },
                }}
              >
                <div
                  className={`flex min-w-0 w-full items-center ${
                    isCompact ? "gap-2.5" : "gap-3"
                  }`}
                >
                  {option.hideThumbnail ? null : option.thumbnail ? (
                    <img
                      src={option.thumbnail}
                      alt=""
                      className={`shrink-0 rounded-xl object-cover ${
                        isCompact ? "h-9 w-12" : "h-10 w-14"
                      }`}
                      loading="lazy"
                    />
                  ) : (
                    <div
                      className={`flex shrink-0 items-center justify-center rounded-xl border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/70 text-[11px] font-semibold text-[var(--mc-text-muted)] ${
                        isCompact ? "h-9 w-12" : "h-10 w-14"
                      }`}
                    >
                      YT
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">
                      {option.label}
                    </div>

                    {option.description && (
                      <div className="mt-0.5 truncate text-xs text-[var(--mc-text-muted)]">
                        {option.description}
                      </div>
                    )}
                  </div>

                  {option.meta && (
                    <div className="ml-auto shrink-0 text-right text-xs text-[var(--mc-text-muted)]">
                      {option.meta}
                    </div>
                  )}
                </div>
              </MenuItem>
            ))}
        </Select>
      </FormControl>

      {(helperText || errorText) && (
        <div
          className={`mt-2 text-xs leading-5 ${
            hasError ? "text-rose-300" : "text-[var(--mc-text-muted)]"
          }`}
        >
          {errorText || helperText}
        </div>
      )}
    </div>
  );
}
