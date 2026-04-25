import { TextField } from "@mui/material";
import React from "react";

interface GuestEntryCardProps {
  usernameInput: string;
  onInputChange: (value: string) => void;
  onConfirm: () => void;
  nicknameMaxLength: number;
  suggestedGuestUsername?: string;
  onUseSuggestedUsername?: () => void;
}

const GuestEntryCard: React.FC<GuestEntryCardProps> = ({
  usernameInput,
  onInputChange,
  onConfirm,
  nicknameMaxLength,
  suggestedGuestUsername,
}) => {
  return (
    <article className="landing-card landing-card-guest">
      <header className="space-y-3">
        <span className="landing-badge">快速試玩</span>
        <h3 className="landing-card-title">訪客快速進入</h3>
        <p className="landing-card-desc">
          不綁定帳號，可以自行輸入暱稱，也可以使用隨機產生的訪客名稱。
        </p>
      </header>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <label
            htmlFor="nickname"
            className="text-[15px] uppercase tracking-[0.22em] text-[var(--mc-text-muted)]"
          >
            暱稱
          </label>
          <span className="text-[11px] text-[var(--mc-text-muted)]">
            {usernameInput.length}/{nicknameMaxLength}
          </span>
        </div>

        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <TextField
            fullWidth
            size="small"
            placeholder={suggestedGuestUsername}
            value={usernameInput}
            onChange={(e) =>
              onInputChange(e.target.value.slice(0, nicknameMaxLength))
            }
            autoComplete="off"
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "16px",
                backgroundColor: "rgba(15, 23, 42, 0.78)",
                color: "var(--mc-text)",
                "& fieldset": {
                  borderColor: "rgba(245, 158, 11, 0.28)",
                },
                "&:hover fieldset": {
                  borderColor: "rgba(251, 191, 36, 0.52)",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "rgba(251, 191, 36, 0.72)",
                  boxShadow: "0 0 0 2px rgba(245, 158, 11, 0.14)",
                },
              },
              "& .MuiInputLabel-root": {
                color: "var(--mc-text-muted)",
                letterSpacing: "0.14em",
              },
              "& .MuiInputBase-input::placeholder": {
                color: "rgba(252, 211, 77, 0.46)",
                opacity: 1,
              },
            }}
            slotProps={{
              htmlInput: { maxLength: nicknameMaxLength },
            }}
          />
        </div>

        <button
          type="button"
          onClick={onConfirm}
          className="landing-button landing-button-guest cursor-pointer w-full rounded-2xl px-4 py-3 text-sm uppercase tracking-[0.18em]"
        >
          {usernameInput.trim() ? "以訪客身份繼續" : `使用隨機暱稱開始`}
        </button>
      </div>
    </article>
  );
};

export default GuestEntryCard;
