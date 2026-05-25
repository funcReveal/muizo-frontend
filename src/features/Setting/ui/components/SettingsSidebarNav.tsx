import React from "react";
import {
  AccessibilityNewRounded,
  KeyboardRounded,
  TuneRounded,
  VisibilityRounded,
} from "@mui/icons-material";

import type {
  SettingsCategoryId,
  SettingsCategoryMeta,
  SettingsSectionMeta,
} from "../../model/settingsTypes";

type SettingsSidebarNavProps = {
  categories: SettingsCategoryMeta[];
  activeCategoryId: SettingsCategoryId;
  onCategoryChange: (categoryId: SettingsCategoryId) => void;
  categorySections: SettingsSectionMeta[];
  compactMobile?: boolean;
};

const SettingsSidebarNav: React.FC<SettingsSidebarNavProps> = ({
  categories,
  activeCategoryId,
  onCategoryChange,
  categorySections,
  compactMobile = false,
}) => {
  const getCategoryIcon = (categoryId: SettingsCategoryId) => {
    switch (categoryId) {
      case "controls":
        return <KeyboardRounded fontSize="inherit" />;
      case "audio":
        return <TuneRounded fontSize="inherit" />;
      case "display":
        return <VisibilityRounded fontSize="inherit" />;
      case "accessibility":
        return <AccessibilityNewRounded fontSize="inherit" />;
      default:
        return null;
    }
  };

  return (
    <aside className="flex h-full min-h-0 flex-col gap-3 sm:gap-4">
      <section className={compactMobile ? "p-0" : ""}>
        <div
          className={
            compactMobile
              ? "grid grid-cols-4 gap-2"
              : "grid grid-cols-2 gap-2 lg:grid-cols-1"
          }
        >
          {categories.map((category) => {
            const active = category.id === activeCategoryId;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => onCategoryChange(category.id)}
                className={
                  compactMobile
                    ? `flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-2xl border px-2 py-2 text-center transition ${
                        active
                          ? "border-cyan-300/35 bg-cyan-400/10 text-cyan-50 shadow-[0_0_0_1px_rgba(34,211,238,0.08)]"
                          : "border-slate-700/60 bg-slate-950/35 text-slate-300 hover:border-slate-500/70"
                      }`
                    : `rounded-xl border px-3 py-3 text-left transition ${
                        active
                          ? "border-cyan-300/35 bg-cyan-400/10 shadow-[0_0_0_1px_rgba(34,211,238,0.08)]"
                          : "border-slate-700/60 bg-slate-950/35 hover:border-slate-500/70"
                      }`
                }
              >
                <span
                  className={`${
                    compactMobile
                      ? "flex h-8 w-8 items-center justify-center rounded-full border border-current/20 bg-white/3 text-base"
                      : "hidden"
                  }`}
                  aria-hidden={!compactMobile}
                >
                  {getCategoryIcon(category.id)}
                </span>
                <span
                  className={`block ${
                    compactMobile
                      ? "text-[11px] font-semibold tracking-[0.08em]"
                      : "text-sm font-bold text-slate-100"
                  }`}
                >
                  {category.title}
                </span>
                {!compactMobile ? (
                  <span className="mt-1 block text-xs leading-4 text-slate-400">
                    {category.subtitle}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </section>
      {!compactMobile && categorySections.length > 0 ? null : null}
    </aside>
  );
};

export default SettingsSidebarNav;
