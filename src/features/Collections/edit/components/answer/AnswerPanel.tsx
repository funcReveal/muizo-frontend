import { TextField } from "@mui/material";

type AnswerPanelProps = {
  title: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  hint?: string;
  maxLength?: number;
};

const AnswerPanel = ({
  title,
  value,
  placeholder,
  onChange,
  disabled,
  maxLength,
}: AnswerPanelProps) => {
  const lengthHint =
    typeof maxLength === "number" ? `${value.length}/${maxLength}` : null;

  return (
    <section className="space-y-2 py-2 px-1">
      <header className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-[var(--mc-text)]">{title}</h3>
        {lengthHint ? (
          <span className="shrink-0 text-[11px] text-[var(--mc-text-muted)]">
            {lengthHint}
          </span>
        ) : null}
      </header>

      <TextField
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        fullWidth
        variant="outlined"
        slotProps={{
          htmlInput: {
            maxLength,
          },
        }}
        sx={{
          "& .MuiOutlinedInput-root": {
            borderRadius: "0.875rem",
            backgroundColor: "rgba(15, 23, 42, 0.45)",
            color: "rgb(241 245 249)",
            fontSize: "14px",
            "&:hover fieldset": {
              borderColor: "rgba(100, 116, 139, 0.85)",
            },
            "&.Mui-focused fieldset": {
              borderColor: "rgba(148, 163, 184, 0.95)",
            },
            "&.Mui-disabled": {
              opacity: 0.6,
            },
          },
          "& .MuiOutlinedInput-input": {
            padding: "12px 14px",
          },
          "& .MuiOutlinedInput-input::placeholder": {
            color: "rgb(148 163 184)",
            opacity: 1,
          },
        }}
      />

      <footer className="flex items-center justify-between gap-3"></footer>
    </section>
  );
};

export default AnswerPanel;
