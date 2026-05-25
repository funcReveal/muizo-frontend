import React from "react";

interface SettingsSectionCardProps {
  id?: string;
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const SettingsSectionCard: React.FC<SettingsSectionCardProps> = ({
  id,
  icon,
  title,
  description,
  actions,
  children,
  className,
}) => {
  return (
    <section
      id={id}
      className={`relative overflow-hidden pt-2 ${className ?? ""}`}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {icon ? (
            <div className="mt-0.5 inline-flex h-9 w-9 flex-none items-center justify-center text-cyan-200">
              {icon}
            </div>
          ) : null}
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-100">{title}</h2>
            {description ? (
              <p className="mt-1 text-sm leading-5 text-slate-400">
                {description}
              </p>
            ) : null}
          </div>
        </div>
        {actions ? (
          <div className="flex items-center gap-2">{actions}</div>
        ) : null}
      </div>
      {children}
    </section>
  );
};

export default SettingsSectionCard;
