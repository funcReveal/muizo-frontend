import React from "react";

interface GuestEntryCardProps {
  usernameInput: string;
  onInputChange: (value: string) => void;
  onConfirm: () => void;
  nicknameMaxLength: number;
}

const GuestEntryCard: React.FC<GuestEntryCardProps> = ({
  usernameInput,
  onInputChange,
  onConfirm,
  nicknameMaxLength,
}) => {
  return (
    <article className="landing-card landing-card-guest">
      <header className="space-y-3">
        <span className="landing-badge">快速試玩</span>
        <h3 className="landing-card-title">訪客快速進入</h3>
        <p className="landing-card-desc">不綁定帳號，輸入暱稱即可開局。</p>
      </header>

      <div className="space-y-3">
        <label
          htmlFor="nickname"
          className="text-[11px] uppercase tracking-[0.22em] text-[var(--mc-text-muted)]"
        >
          暱稱
        </label>
        <input
          id="nickname"
          value={usernameInput}
          onChange={(e) =>
            onInputChange(e.target.value.slice(0, nicknameMaxLength))
          }
          placeholder="例如：Night DJ"
          maxLength={nicknameMaxLength}
          className="landing-input w-full rounded-2xl px-4 py-3 text-sm"
        />
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
