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
  onUseSuggestedUsername,
}) => {
  const canUseSuggestedUsername = Boolean(
    suggestedGuestUsername && onUseSuggestedUsername,
  );

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
          <input
            id="nickname"
            value={usernameInput}
            onChange={(e) =>
              onInputChange(e.target.value.slice(0, nicknameMaxLength))
            }
            autoComplete="off"
            placeholder={
              suggestedGuestUsername
                ? `例如 ${suggestedGuestUsername}`
                : `上限 ${nicknameMaxLength} 字...`
            }
            maxLength={nicknameMaxLength}
            className="landing-input w-full rounded-2xl px-4 py-3 text-sm"
          />

          {canUseSuggestedUsername ? (
            <button
              type="button"
              onClick={onUseSuggestedUsername}
              className="landing-button landing-button-random cursor-pointer rounded-2xl px-4 py-3 text-xs font-medium whitespace-nowrap"
              title={`使用 ${suggestedGuestUsername}`}
            >
              隨機產生
            </button>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onConfirm}
          className="landing-button landing-button-guest cursor-pointer w-full rounded-2xl px-4 py-3 text-sm uppercase tracking-[0.18em]"
        >
          以訪客進入
        </button>
      </div>
    </article>
  );
};

export default GuestEntryCard;
