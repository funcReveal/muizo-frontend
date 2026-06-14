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
  <div className="flex h-full min-h-[240px] flex-col items-center justify-center rounded-2xl border border-cyan-300/14 bg-[linear-gradient(180deg,rgba(8,15,28,0.72),rgba(2,6,23,0.52))] px-5 py-8 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.045),0_18px_42px_-34px_rgba(34,211,238,0.55)] sm:min-h-[420px] lg:min-h-0">
    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-200/16 bg-cyan-300/[0.075] text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_14px_30px_-24px_rgba(34,211,238,0.92)]">
      {icon}
    </div>
    <p className="mt-4 text-base font-semibold text-[var(--mc-text)]">
      {title}
    </p>
    <p className="mx-auto mt-2 max-w-full text-sm leading-6 text-[var(--mc-text-muted)] lg:whitespace-nowrap">
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
