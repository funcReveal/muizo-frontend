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
  <div className="flex h-full min-h-[240px] flex-col items-center justify-center rounded-xl bg-[var(--mc-surface)] px-5 py-8 text-center sm:min-h-[420px] lg:min-h-0">
    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--mc-accent-soft)] text-[var(--mc-accent)]">
      {icon}
    </div>
    <p className="mt-4 text-base font-semibold text-[var(--mc-text)]">
      {title}
    </p>
    <p className="mx-auto mt-2 max-w-[48ch] text-sm leading-6 text-[var(--mc-text-muted)]">
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
