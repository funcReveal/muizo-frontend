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
  disabled?: boolean;
  meta?: ReactNode;
};

type MuizoSelectProps = {
  value: string;
  options: MuizoSelectOption[];
  placeholder: string;
  disabled?: boolean;
  loading?: boolean;
  emptyText?: string;
  label?: string;
  helperText?: string;
  errorText?: string | null;
  className?: string;
  onOpen?: () => void;
  onChange: (value: string) => void;
};

export default function MuizoSelect({
  value,
  options,
  placeholder,
  disabled = false,
  loading = false,
  emptyText = "No options available",
  label,
  helperText,
  errorText,
  className,
  onOpen,
  onChange,
}: MuizoSelectProps) {
  const selectedOption = options.find((option) => option.value === value);
  const hasError = Boolean(errorText);

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
              <div className="flex min-w-0 items-center gap-3">
                {selectedOption.thumbnail ? (
                  <img
                    src={selectedOption.thumbnail}
                    alt=""
                    className="h-9 w-12 shrink-0 rounded-lg object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-9 w-12 shrink-0 items-center justify-center rounded-lg border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/70 text-[11px] font-semibold text-[var(--mc-text-muted)]">
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
                  <div className="shrink-0 text-xs text-[var(--mc-text-muted)]">
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
                overflow: "hidden",
              },
            },
            MenuListProps: {
              sx: {
                p: 1,
                maxHeight: 360,
              },
            },
          }}
          sx={{
            minHeight: 54,
            borderRadius: "20px",
            backgroundColor: "rgba(2, 6, 23, 0.32)",
            color: "var(--mc-text)",
            boxShadow:
              "0 0 0 1px rgba(148, 163, 184, 0.12), 0 10px 28px rgba(2, 6, 23, 0.18)",
            transition:
              "background-color 180ms ease, box-shadow 180ms ease, border-color 180ms ease",
            "& .MuiSelect-select": {
              display: "flex",
              alignItems: "center",
              minHeight: "54px",
              py: 0.75,
              pr: "44px !important",
            },
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: hasError
                ? "rgba(248, 113, 113, 0.5)"
                : "rgba(148, 163, 184, 0.2)",
            },
            "&:hover": {
              backgroundColor: "rgba(15, 23, 42, 0.52)",
              boxShadow: hasError
                ? "0 0 0 1px rgba(248, 113, 113, 0.26), 0 18px 38px rgba(127, 29, 29, 0.18)"
                : "0 0 0 1px rgba(34, 211, 238, 0.16), 0 16px 34px rgba(8, 47, 73, 0.2)",
            },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: hasError
                ? "rgba(248, 113, 113, 0.66)"
                : "rgba(34, 211, 238, 0.34)",
            },
            "&.Mui-focused": {
              backgroundColor: "rgba(15, 23, 42, 0.62)",
              boxShadow: hasError
                ? "0 0 0 1px rgba(248, 113, 113, 0.28), 0 18px 38px rgba(127, 29, 29, 0.18)"
                : "0 0 0 1px rgba(251, 191, 36, 0.28), 0 18px 38px rgba(120, 53, 15, 0.18)",
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: hasError
                ? "rgba(248, 113, 113, 0.72)"
                : "rgba(251, 191, 36, 0.72)",
            },
            "& .MuiSelect-icon": {
              color: "var(--mc-text-muted)",
              right: 14,
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
                  px: 1.25,
                  py: 1,
                  color: "var(--mc-text)",
                  "&.Mui-selected": {
                    backgroundColor: "rgba(251, 191, 36, 0.14)",
                  },
                  "&.Mui-selected:hover": {
                    backgroundColor: "rgba(251, 191, 36, 0.2)",
                  },
                  "&:hover": {
                    backgroundColor: "rgba(34, 211, 238, 0.1)",
                  },
                }}
              >
                <div className="flex min-w-0 w-full items-center gap-3">
                  {option.thumbnail ? (
                    <img
                      src={option.thumbnail}
                      alt=""
                      className="h-10 w-14 shrink-0 rounded-xl object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-10 w-14 shrink-0 items-center justify-center rounded-xl border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/70 text-[11px] font-semibold text-[var(--mc-text-muted)]">
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
                    <div className="shrink-0 text-xs text-[var(--mc-text-muted)]">
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
