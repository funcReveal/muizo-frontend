import React, { useMemo, useState } from "react";

import type {
  CareerCompositeScope,
  CareerCompositeStats,
  CareerHighlightItem,
} from "../../../types/career";
import {
  formatCareerPercent,
  formatCareerScore,
} from "../../../model/careerUiFormatters";
import CareerSurface, { careerMiniCardClass } from "./CareerSurface";

interface CareerCompositeSectionProps {
  composite: CareerCompositeStats;
  compositeScopes: CareerCompositeScope[];
  activeScopeKey: string;
  onActiveScopeChange: (scopeKey: string) => void;
  highlights: CareerHighlightItem[];
}

const CareerCompositeSection: React.FC<CareerCompositeSectionProps> = ({
  composite,
  compositeScopes,
  activeScopeKey,
  onActiveScopeChange,
  highlights,
}) => {
  const scopes = useMemo(
    () =>
      compositeScopes.length > 0
        ? compositeScopes
        : [
            {
              key: "overall",
              kind: "casual" as const,
              label: "總覽",
              stats: composite,
            },
          ],
    [composite, compositeScopes],
  );
  const [scopeMenuOpen, setScopeMenuOpen] = useState(false);
  const scopeMenuRef = React.useRef<HTMLDivElement | null>(null);

  const activeScope =
    scopes.find((scope) => scope.key === activeScopeKey) ?? scopes[0];
  const activeComposite = activeScope?.stats ?? composite;
  const casualScopes = scopes.filter((scope) => scope.kind === "casual");
  const leaderboardScopes = scopes.filter(
    (scope) => scope.kind === "leaderboard",
  );

  React.useEffect(() => {
    if (!scopeMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!scopeMenuRef.current) return;
      if (scopeMenuRef.current.contains(event.target as Node)) return;
      setScopeMenuOpen(false);
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [scopeMenuOpen]);

  const stats = [
    {
      label: "平均名次",
      value: activeComposite.averagePlacement?.toFixed(1) ?? "-",
    },
    {
      label: "平均得分",
      value: formatCareerScore(activeComposite.averageScore),
    },
    {
      label: "Top 3 率",
      value: formatCareerPercent(activeComposite.top3Rate),
    },
    {
      label: "第一名",
      value: activeComposite.firstPlaceCount.toLocaleString("zh-TW"),
    },
    {
      label: "平均答對率",
      value: formatCareerPercent(activeComposite.averageAccuracyRate),
    },
  ];
  const highlightToneClassByKey: Record<CareerHighlightItem["key"], string> = {
    bestScore:
      "bg-[linear-gradient(180deg,rgba(147,51,234,0.34),rgba(55,16,74,0.88))]",
    bestPlacement:
      "bg-[linear-gradient(180deg,rgba(245,158,11,0.32),rgba(69,41,11,0.9))]",
    bestCombo:
      "bg-[linear-gradient(180deg,rgba(16,185,129,0.3),rgba(6,78,59,0.88))]",
    bestAccuracy:
      "bg-[linear-gradient(180deg,rgba(244,63,94,0.3),rgba(76,5,25,0.88))]",
  };
  const highlightRowCount = Math.max(1, Math.ceil(highlights.length / 2));

  return (
    <CareerSurface className="flex min-h-0 flex-1 flex-col sm:min-h-[360px] xl:min-h-[420px]">
      <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div>
          <h3 className="text-base font-semibold tracking-tight text-[var(--mc-text)]">
            綜合表現
          </h3>
        </div>

        <div
          ref={scopeMenuRef}
          className="relative w-full sm:w-auto sm:min-w-[190px]"
        >
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={scopeMenuOpen}
            onClick={() => setScopeMenuOpen((open) => !open)}
            className="flex w-full items-center justify-between gap-3 rounded-[16px] border border-[var(--mc-border)] bg-[linear-gradient(180deg,rgba(28,22,13,0.96),rgba(12,10,7,0.98))] px-3 py-2.5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_14px_28px_-24px_var(--mc-glow)] transition hover:border-[var(--mc-accent)] hover:bg-amber-300/10"
          >
            <span className="min-w-0">
              <span className="block text-[10px] font-semibold tracking-[0.14em] text-[var(--mc-text-muted)]">
                {activeScope?.kind === "leaderboard" ? "排行模式" : "休閒模式"}
              </span>
              <span className="block truncate text-sm font-semibold text-[var(--mc-text)]">
                {activeScope?.label ?? "總覽"}
              </span>
            </span>
            <span
              className={`h-2 w-2 shrink-0 rotate-45 border-b-2 border-r-2 border-amber-200 transition-transform ${
                scopeMenuOpen ? "translate-y-0.5 rotate-[225deg]" : ""
              }`}
              aria-hidden="true"
            />
          </button>

          {scopeMenuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-[calc(100%+8px)] z-30 w-[min(280px,calc(100vw-2rem))] overflow-hidden rounded-[18px] border border-[var(--mc-border)] bg-[linear-gradient(180deg,rgba(20,17,13,0.98),rgba(8,7,5,0.99))] p-2 shadow-[0_22px_48px_-28px_rgba(0,0,0,0.92),0_14px_34px_-26px_var(--mc-glow)]"
            >
              <CareerScopeMenuGroup
                label="休閒"
                scopes={casualScopes}
                activeScopeKey={activeScope?.key ?? "overall"}
                onSelect={(scopeKey) => {
                  onActiveScopeChange(scopeKey);
                  setScopeMenuOpen(false);
                }}
              />

              {leaderboardScopes.length > 0 && (
                <CareerScopeMenuGroup
                  label="排行"
                  scopes={leaderboardScopes}
                  activeScopeKey={activeScope?.key ?? "overall"}
                  onSelect={(scopeKey) => {
                    onActiveScopeChange(scopeKey);
                    setScopeMenuOpen(false);
                  }}
                />
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-2.5 grid shrink-0 grid-cols-2 gap-1.5 sm:gap-2 lg:grid-cols-5">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`${careerMiniCardClass} min-h-0 overflow-hidden`}
          >
            <div className="text-[11px] tracking-[0.12em] text-[var(--mc-text-muted)]">
              {stat.label}
            </div>
            <div className="mt-0.5 truncate text-[15px] font-semibold text-[var(--mc-text)] sm:text-base">
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-2.5 flex min-h-[128px] flex-1 flex-col overflow-hidden rounded-[16px] bg-black/16 p-2 sm:min-h-[112px] sm:rounded-[18px] sm:p-2.5">
        <div
          className="grid min-h-0 flex-1 grid-cols-2 gap-1.5 overflow-hidden sm:gap-2"
          style={{
            gridTemplateRows:
              highlights.length > 0
                ? `repeat(${highlightRowCount}, minmax(0, 1fr))`
                : undefined,
          }}
        >
          {highlights.length > 0 ? (
            highlights.map((item) => (
              <div
                key={`${item.key}-${item.label}`}
                className={`flex min-h-0 flex-col justify-between overflow-hidden rounded-[14px] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] sm:rounded-[16px] sm:p-2.5 ${
                  highlightToneClassByKey[item.key]
                }`}
              >
                <div className="truncate text-[10px] tracking-[0.12em] text-slate-200/90">
                  {item.label}
                </div>

                <div className="mt-0.5 truncate text-sm font-semibold text-white sm:text-base xl:text-lg">
                  {item.value}
                </div>

                <div className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-200/75 sm:truncate sm:text-xs">
                  {item.subtitle}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-2 flex min-h-0 items-center justify-center rounded-[16px] bg-white/[0.035] px-4 py-5 text-center text-sm text-[var(--mc-text-muted)]">
              尚無高光紀錄
            </div>
          )}
        </div>

      </div>
    </CareerSurface>
  );
};

interface CareerScopeMenuGroupProps {
  label: string;
  scopes: CareerCompositeScope[];
  activeScopeKey: string;
  onSelect: (scopeKey: string) => void;
}

const CareerScopeMenuGroup: React.FC<CareerScopeMenuGroupProps> = ({
  label,
  scopes,
  activeScopeKey,
  onSelect,
}) => {
  if (scopes.length === 0) return null;

  return (
    <div className="py-1">
      <div className="mb-1 flex items-center gap-2 px-2 pb-1 pt-1">
        <span className="h-px flex-1 bg-[var(--mc-border)]" />
        <span className="rounded-full border border-[var(--mc-border)] bg-amber-300/10 px-2 py-0.5 text-[10px] font-semibold tracking-[0.16em] text-amber-100">
          {label}
        </span>
        <span className="h-px flex-1 bg-[var(--mc-border)]" />
      </div>

      <div className="space-y-1">
        {scopes.map((scope) => {
          const active = scope.key === activeScopeKey;

          return (
            <button
              key={scope.key}
              type="button"
              role="menuitemradio"
              aria-checked={active}
              onClick={() => onSelect(scope.key)}
              className={`flex w-full items-center justify-between gap-3 rounded-[12px] px-3 py-2 text-left text-sm transition ${
                active
                  ? "bg-amber-300/16 text-amber-50"
                  : "text-[var(--mc-text-muted)] hover:bg-white/[0.055] hover:text-[var(--mc-text)]"
              }`}
            >
              <span className="min-w-0 truncate font-semibold">
                {scope.label}
              </span>
              {active && (
                <span
                  className="h-2 w-2 shrink-0 rounded-full bg-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.65)]"
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CareerCompositeSection;
