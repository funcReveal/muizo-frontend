import KeyboardArrowDownRounded from "@mui/icons-material/KeyboardArrowDownRounded";
import { MenuItem, TextField, type TextFieldProps } from "@mui/material";
import type { ReactNode } from "react";

export type MuizoSelectFieldOption<TValue extends string = string> = {
  value: TValue;
  label: string;
  description?: string;
  disabled?: boolean;
  meta?: ReactNode;
};

type MuizoTextFieldProps = Omit<TextFieldProps, "variant"> & {
  helper?: string;
};

type MuizoSelectFieldProps<TValue extends string = string> = Omit<
  TextFieldProps,
  "onChange" | "select" | "value" | "variant"
> & {
  value: TValue;
  options: MuizoSelectFieldOption<TValue>[];
  helper?: string;
  onChange: (value: TValue) => void;
};

const fieldSx = {
  "& .MuiInputBase-root": {
    borderRadius: "14px",
    backgroundColor: "rgba(15, 23, 42, 0.46)",
    color: "var(--mc-text)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
    transition:
      "background-color 160ms ease, border-color 160ms ease, box-shadow 160ms ease",
  },
  "& .MuiInputBase-root:hover": {
    backgroundColor: "rgba(21, 30, 43, 0.78)",
  },
  "& .MuiInputBase-root.Mui-focused": {
    backgroundColor: "rgba(23, 33, 47, 0.92)",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.05), 0 0 0 1px rgba(125, 211, 252, 0.18)",
  },
  "& .MuiOutlinedInput-notchedOutline": {
    borderColor: "rgba(148, 163, 184, 0.22)",
  },
  "& .MuiInputBase-root:hover .MuiOutlinedInput-notchedOutline": {
    borderColor: "rgba(148, 163, 184, 0.38)",
  },
  "& .MuiInputBase-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
    borderColor: "rgba(125, 211, 252, 0.62)",
    borderWidth: "1px",
  },
  "& .MuiInputLabel-root": {
    color: "var(--mc-text-muted)",
    fontSize: "0.82rem",
  },
  "& .MuiInputLabel-root.Mui-focused": {
    color: "rgb(186, 230, 253)",
  },
  "& .MuiInputBase-input": {
    color: "var(--mc-text)",
  },
  "& .MuiInputBase-input::placeholder": {
    color: "rgba(148, 163, 184, 0.72)",
    opacity: 1,
  },
  "& .MuiSelect-icon": {
    color: "var(--mc-text-muted)",
    right: 12,
  },
  "& .MuiFormHelperText-root": {
    marginLeft: "4px",
    color: "var(--mc-text-muted)",
    lineHeight: 1.55,
  },
  "& .Mui-disabled": {
    opacity: 0.72,
    WebkitTextFillColor: "var(--mc-text-muted)",
  },
} as const;

const menuProps = {
  PaperProps: {
    sx: {
      mt: 1,
      borderRadius: "16px",
      border: "1px solid rgba(148, 163, 184, 0.24)",
      background: "linear-gradient(180deg, #111827, #080d14)",
      color: "var(--mc-text)",
      boxShadow:
        "0 22px 54px rgba(2, 6, 23, 0.62), inset 0 1px 0 rgba(255,255,255,0.04)",
      maxHeight: 340,
    },
  },
  MenuListProps: {
    sx: {
      p: 0.75,
    },
  },
};

export function MuizoTextField({
  helper,
  helperText,
  sx,
  ...props
}: MuizoTextFieldProps) {
  return (
    <TextField
      {...props}
      variant="outlined"
      helperText={helperText ?? helper}
      sx={[fieldSx, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}
    />
  );
}

export function MuizoSelectField<TValue extends string = string>({
  value,
  options,
  helper,
  helperText,
  onChange,
  SelectProps,
  sx,
  ...props
}: MuizoSelectFieldProps<TValue>) {
  return (
    <TextField
      {...props}
      select
      variant="outlined"
      value={value}
      helperText={helperText ?? helper}
      onChange={(event) => onChange(event.target.value as TValue)}
      SelectProps={{
        IconComponent: KeyboardArrowDownRounded,
        MenuProps: menuProps,
        renderValue: (selected) => {
          const option = options.find((item) => item.value === selected);
          return option ? option.label : String(selected ?? "");
        },
        ...SelectProps,
      }}
      sx={[fieldSx, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}
    >
      {options.map((option) => (
        <MenuItem
          key={option.value}
          value={option.value}
          disabled={option.disabled}
          sx={{
            borderRadius: "12px",
            px: 1.5,
            py: 1,
            color: "var(--mc-text)",
            "&.Mui-selected": {
              backgroundColor: "rgba(125, 211, 252, 0.12)",
            },
            "&.Mui-selected:hover": {
              backgroundColor: "rgba(125, 211, 252, 0.18)",
            },
            "&:hover": {
              backgroundColor: "rgba(148, 163, 184, 0.11)",
            },
          }}
        >
          <div className="flex min-w-0 w-full items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{option.label}</div>
              {option.description ? (
                <div className="mt-0.5 truncate text-xs text-[var(--mc-text-muted)]">
                  {option.description}
                </div>
              ) : null}
            </div>
            {option.meta ? (
              <div className="shrink-0 text-xs text-[var(--mc-text-muted)]">
                {option.meta}
              </div>
            ) : null}
          </div>
        </MenuItem>
      ))}
    </TextField>
  );
}
