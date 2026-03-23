import type { ReactNode } from "react";

type LibraryEmptyStateProps = {
  icon: ReactNode;
  title: string;
  description: string;
  actions?: ReactNode;
};

const LibraryEmptyState = ({
  icon,
  title,
  description,
  actions,
}: LibraryEmptyStateProps) => (
  <div className="rounded-2xl border border-white/8 bg-[linear-gradient(180deg,rgba(2,6,23,0.46),rgba(15,23,42,0.28))] px-5 py-8 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-100 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.8)]">
      {icon}
    </div>
    <p className="mt-4 text-base font-semibold text-[var(--mc-text)]">
      {title}
    </p>
    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--mc-text-muted)]">
      {description}
    </p>
    {actions ? (
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        {actions}
      </div>
    ) : null}
  </div>
);

export default LibraryEmptyState;
