import KeyboardArrowDownRounded from "@mui/icons-material/KeyboardArrowDownRounded";
import { CircularProgress, FormControl, MenuItem, Select } from "@mui/material";
import { useReducedMotion } from "motion/react";
import { useId, type ReactNode } from "react";
import { selectMenuPlacement, useSelectMenuAnchor } from "./selectMenuPlacement";
import "./muizoSelect.css";

export type MuizoSelectOption<TValue extends string = string> = {
  value: TValue;
  label: string;
  description?: string;
  thumbnail?: string;
  hideThumbnail?: boolean;
  disabled?: boolean;
  meta?: ReactNode;
};

export type MuizoSelectProps<TValue extends string = string> = {
  value: TValue;
  options: MuizoSelectOption<TValue>[];
  placeholder: string;
  tone?: "default" | "casual" | "leaderboard";
  size?: "default" | "compact";
  disabled?: boolean;
  loading?: boolean;
  emptyText?: string;
  label?: string;
  ariaLabel?: string;
  helperText?: string;
  errorText?: string | null;
  className?: string;
  opaque?: boolean;
  name?: string;
  required?: boolean;
  onOpen?: () => void;
  onChange: (value: TValue) => void;
};

function OptionContent({ option }: { option: MuizoSelectOption }) {
  return (
    <span className="muizo-select__content">
      {!option.hideThumbnail && option.thumbnail && (
        <img className="muizo-select__thumbnail" src={option.thumbnail} alt="" loading="lazy" />
      )}
      <span className="muizo-select__text">
        <span className="muizo-select__title">{option.label}</span>
        {option.description && <span className="muizo-select__description">{option.description}</span>}
      </span>
      {option.meta != null && <span className="muizo-select__meta">{option.meta}</span>}
    </span>
  );
}

/** Shared single-value select. MUI supplies listbox navigation, typeahead and focus restoration. */
export default function MuizoSelect<TValue extends string = string>({
  value, options, placeholder, tone = "default", size = "default",
  disabled = false, loading = false, emptyText = "目前沒有可選項目",
  label, ariaLabel, helperText, errorText, className, opaque = false,
  name, required, onOpen, onChange,
}: MuizoSelectProps<TValue>) {
  const id = useId();
  const reduceMotion = useReducedMotion();
  const { anchorRef, menuWidth } = useSelectMenuAnchor();
  const selectedOption = options.find((option) => option.value === value);
  const hasError = Boolean(errorText);
  const message = errorText || helperText;
  // A missing/stale selection shows the placeholder instead of an out-of-range MUI value.
  const selectValue = selectedOption && !loading ? value : "";

  return (
    <div className={`muizo-select ${className ?? ""}`} data-size={size} data-tone={tone} data-opaque={opaque}>
      {label && <label id={`${id}-label`} htmlFor={id} className="muizo-select__label">{label}{required ? " *" : ""}</label>}
      <FormControl ref={anchorRef} fullWidth size="small" error={hasError} disabled={disabled || loading}>
        <Select<TValue | "">
          autoWidth
          id={id}
          labelId={label ? `${id}-label` : undefined}
          name={name}
          required={required}
          displayEmpty
          value={selectValue}
          disabled={disabled || loading}
          onOpen={onOpen}
          onChange={(event) => onChange(event.target.value as TValue)}
          IconComponent={KeyboardArrowDownRounded}
          SelectDisplayProps={{
            "aria-busy": loading || undefined,
            ...(ariaLabel ? { "aria-labelledby": undefined } : {}),
          }}
          inputProps={{
            "aria-label": ariaLabel || (!label ? placeholder : undefined),
            "aria-describedby": message ? `${id}-help` : undefined,
            "aria-invalid": hasError || undefined,
            "aria-busy": loading || undefined,
          }}
          renderValue={() => selectedOption && !loading ? <OptionContent option={selectedOption} /> : (
            <span className="muizo-select__placeholder">{loading && <CircularProgress size={14} color="inherit" />}<span>{loading ? "載入中…" : placeholder}</span></span>
          )}
          MenuProps={{
            ...selectMenuPlacement,
            className: "muizo-select-menu",
            disableScrollLock: true,
            transitionDuration: reduceMotion ? 0 : { enter: 180, exit: 120 },
            slotProps: {
              paper: { className: `muizo-select-menu__paper muizo-select-menu__paper--${tone}`, style: { width: menuWidth } },
              list: { className: "muizo-select-menu__list", "aria-label": ariaLabel || label || placeholder },
              transition: { easing: { enter: "cubic-bezier(0.16, 1, 0.3, 1)", exit: "cubic-bezier(0.4, 0, 1, 1)" } },
            },
          }}
        >
          {loading ? (
            <MenuItem value="" disabled className="muizo-select-menu__empty"><CircularProgress size={14} color="inherit" />載入中…</MenuItem>
          ) : options.length === 0 ? (
            <MenuItem value="" disabled className="muizo-select-menu__empty">{emptyText}</MenuItem>
          ) : null}
          {!loading && options.map((option) => (
            <MenuItem key={option.value} value={option.value} disabled={option.disabled} className="muizo-select-menu__option">
              <OptionContent option={option} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      {message && <p id={`${id}-help`} className="muizo-select__help" data-error={hasError} role={hasError ? "alert" : undefined}>{message}</p>}
    </div>
  );
}
