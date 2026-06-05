import React, { useMemo, useState } from "react";

import LockOutlined from "@mui/icons-material/LockOutlined";
import type { RoomSettlementHistorySummary } from "@features/RoomSession";
import type {
  CareerCollectionRankShortcutItem,
  CareerCompositeScope,
  CareerCompositeStats,
} from "../../../types/career";
import {
  formatCareerPercent,
  formatCareerScore,
} from "../../../model/careerUiFormatters";
import CareerSurface, { careerMiniCardClass } from "./CareerSurface";
import CareerRecentPlaysList from "./CareerRecentPlaysList";

interface CareerCompositeSectionProps {
  composite: CareerCompositeStats;
  compositeScopes: CareerCompositeScope[];
  totalMatches: number;
  activeScopeKey: string;
  onActiveScopeChange: (scopeKey: string) => void;
  collectionShortcuts: CareerCollectionRankShortcutItem[];
  onOpenCollectionRanks: () => void;
  onOpenRecentMatch: (summary: RoomSettlementHistorySummary) => void;
}

const CareerCompositeSection: React.FC<CareerCompositeSectionProps> = ({
  composite,
  compositeScopes,
  totalMatches,
  activeScopeKey,
  onActiveScopeChange,
  collectionShortcuts,
  onOpenCollectionRanks,
  onOpenRecentMatch,
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
  const requiredMatchCount = 10;
  const safeTotalMatches = Number.isFinite(totalMatches)
    ? Math.max(0, Math.floor(totalMatches))
    : 0;
  const isOverviewLocked = safeTotalMatches < requiredMatchCount;
  const remainingMatches = Math.max(0, requiredMatchCount - safeTotalMatches);

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
    ...(activeScope?.kind === "leaderboard"
      ? []
      : [
          {
            label: "平均名次",
            value: activeComposite.averagePlacement?.toFixed(1) ?? "-",
          },
        ]),
    {
      label: "平均得分",
      value: formatCareerScore(activeComposite.averageScore),
    },
    ...(activeScope?.kind === "leaderboard"
      ? []
      : [
          {
            label: "Top 3 率",
            value: formatCareerPercent(activeComposite.top3Rate),
          },
          {
            label: "第一名",
            value: activeComposite.firstPlaceCount.toLocaleString("zh-TW"),
          },
        ]),
    {
      label: "平均答對率",
      value: formatCareerPercent(activeComposite.averageAccuracyRate),
    },
  ];

  return (
    <CareerSurface className="flex min-h-full flex-1 flex-col sm:min-h-[360px] xl:min-h-[420px]">
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

      {isOverviewLocked ? (
        <div className="mt-2.5 flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden rounded-[18px] border border-amber-200/16 bg-[radial-gradient(circle_at_50%_0%,rgba(245,158,11,0.18),transparent_38%),linear-gradient(180deg,rgba(24,18,10,0.8),rgba(8,7,5,0.62))] px-4 py-8 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
          <div className="flex h-12 w-12 items-center justify-center rounded-[16px] border border-amber-200/24 bg-amber-200/12 text-amber-100 shadow-[0_16px_34px_-24px_rgba(245,158,11,0.8)]">
            <LockOutlined fontSize="small" />
          </div>

          <div className="mt-4 text-lg font-semibold tracking-tight text-[var(--mc-text)]">
            完成 10 場後解鎖總覽
          </div>
          <div className="mt-1 max-w-[420px] text-sm leading-6 text-[var(--mc-text-muted)]">
            目前累積 {safeTotalMatches.toLocaleString("zh-TW")} 場，還差{" "}
            {remainingMatches.toLocaleString("zh-TW")} 場即可解鎖穩定的綜合表現與近期遊玩分析。
          </div>

          <div className="mt-5 h-2 w-full max-w-[320px] overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-amber-200 shadow-[0_0_18px_rgba(245,158,11,0.45)]"
              style={{
                width: `${Math.min(
                  100,
                  (safeTotalMatches / requiredMatchCount) * 100,
                )}%`,
              }}
            />
          </div>
          <div className="mt-2 text-xs font-semibold text-amber-100/78">
            {safeTotalMatches}/{requiredMatchCount}
          </div>
        </div>
      ) : (
        <>
          <div className="mt-2.5 flex shrink-0 flex-wrap gap-1.5 sm:gap-2">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className={`${careerMiniCardClass} min-h-0 w-[calc(50%-3px)] overflow-hidden sm:w-[148px]`}
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

          <div className="mt-2.5 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[16px] bg-black/16 p-2 sm:rounded-[18px] sm:p-2.5">
            <div className="mb-2 flex shrink-0 items-center justify-between gap-3">
              <h4 className="text-sm font-semibold tracking-tight text-[var(--mc-text)]">
                近期遊玩
              </h4>

              <button
                type="button"
                onClick={onOpenCollectionRanks}
                className="rounded-full border border-[var(--mc-border)] bg-amber-300/12 px-3 py-1.5 text-[11px] font-semibold text-[var(--mc-text)] transition hover:border-[var(--mc-accent)] hover:bg-amber-300/20"
              >
                全部
              </button>
            </div>

            <CareerRecentPlaysList
              items={collectionShortcuts}
              activeScopeKind={activeScope?.kind ?? "casual"}
              onOpenCollectionRanks={onOpenCollectionRanks}
              onOpenMatch={onOpenRecentMatch}
              compact
            />
          </div>
        </>
      )}
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
