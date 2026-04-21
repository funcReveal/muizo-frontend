import React, { useEffect, useMemo, useRef } from "react";
import {
  AccessibilityNewRounded,
  ArrowBackRounded,
  KeyboardRounded,
  RestartAltRounded,
  TuneRounded,
  VisibilityRounded,
} from "@mui/icons-material";
import { Button, Chip } from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useNavigate } from "react-router-dom";

import { SETTINGS_PAGE_COPY } from "../model/settingsSchema";
import { useSettingsState } from "../model/useSettingsState";
import type { SettingsSectionId } from "../model/settingsTypes";
import KeyBindingSettings from "./components/KeyBindingSettings";
import SettingsContentPane from "./components/SettingsContentPane";
import SettingsLayoutShell from "./components/SettingsLayoutShell";
import SettingsSectionCard from "./components/SettingsSectionCard";
import SettingsSidebarNav from "./components/SettingsSidebarNav";
import SfxSettingsPanel from "./components/SfxSettingsPanel";
import AvatarEffectSettingsPanel from "./components/AvatarEffectSettingsPanel";
import ScoreboardEffectSettingsPanel from "./components/ScoreboardEffectSettingsPanel";
import {
  DEFAULT_KEY_BINDINGS,
  useKeyBindings,
} from "./components/useKeyBindings";
import "@features/RoomSession/ui/roomSessionStyles.css";

const SLOT_TITLES = ["左上", "右上", "左下", "右下"] as const;

type SettingsPageProps = {
  embedded?: boolean;
  onRequestClose?: () => void;
};

const SettingsPage: React.FC<SettingsPageProps> = ({
  embedded = false,
  onRequestClose,
}) => {
  const navigate = useNavigate();
  const isMobileSettingsLayout = useMediaQuery("(max-width: 767.95px)");
  const contentScrollRef = useRef<HTMLDivElement | null>(null);
  const { keyBindings, setKeyBindings } = useKeyBindings();
  const {
    activeCategoryId,
    setActiveCategoryId,
    activeAnchorId,
    setActiveAnchorId,
    categorySections,
    categories,
    sections,
  } = useSettingsState();

  useEffect(() => {
    if (!activeAnchorId) {
      const first = categorySections[0]?.id ?? null;
      if (first) setActiveAnchorId(first);
    }
  }, [activeAnchorId, categorySections, setActiveAnchorId]);

  useEffect(() => {
    const node = contentScrollRef.current;
    if (!node) return;
    node.scrollTo({ top: 0, behavior: "auto" });
  }, [activeCategoryId]);

  const sectionMap = useMemo(
    () => new Map(sections.map((section) => [section.id, section])),
    [sections],
  );

  const previewItems = useMemo(
    () =>
      SLOT_TITLES.map((slot, idx) => ({
        slot,
        key: (keyBindings[idx] ?? "").toUpperCase() || "未設定",
      })),
    [keyBindings],
  );

  const isDefaultBindings = useMemo(
    () =>
      Object.entries(DEFAULT_KEY_BINDINGS).every(
        ([idx, key]) => (keyBindings[Number(idx)] ?? "") === key,
      ),
    [keyBindings],
  );

  const getSectionMeta = (sectionId: SettingsSectionId) =>
    sectionMap.get(sectionId) ?? {
      id: sectionId,
      categoryId: activeCategoryId,
      title: sectionId,
      description: "",
      status: "ready" as const,
    };

  const visibleCategorySections = useMemo(
    () =>
      isMobileSettingsLayout
        ? categorySections.filter(
            (section) =>
              section.id !== "keybindings" && section.id !== "control-preview",
          )
        : categorySections,
    [categorySections, isMobileSettingsLayout],
  );

  const renderSection = (sectionId: SettingsSectionId) => {
    if (
      isMobileSettingsLayout &&
      (sectionId === "keybindings" || sectionId === "control-preview")
    ) {
      return null;
    }
    const sectionMeta = getSectionMeta(sectionId);

    switch (sectionId) {
      case "keybindings":
        return (
          <SettingsSectionCard
            key={sectionId}
            id={sectionId}
            icon={<KeyboardRounded fontSize="small" />}
            title={sectionMeta.title}
            description={sectionMeta.description}
            actions={
              <>
                <Chip
                  size="small"
                  label="即時生效"
                  variant="outlined"
                  sx={{
                    color: "#d1fae5",
                    border: "1px solid rgba(16,185,129,0.28)",
                    background: "rgba(16,185,129,0.08)",
                  }}
                />
                <Button
                  size="small"
                  variant="outlined"
                  color="inherit"
                  startIcon={<RestartAltRounded />}
                  onClick={() => setKeyBindings({ ...DEFAULT_KEY_BINDINGS })}
                  disabled={isDefaultBindings}
                  sx={{
                    borderColor: "rgba(148,163,184,0.3)",
                    color: "#e2e8f0",
                  }}
                >
                  恢復預設
                </Button>
              </>
            }
          >
            <KeyBindingSettings keyBindings={keyBindings} onChange={setKeyBindings} />
          </SettingsSectionCard>
        );

      case "control-preview":
        return (
          <SettingsSectionCard
            key={sectionId}
            id={sectionId}
            icon={<TuneRounded fontSize="small" />}
            title={sectionMeta.title}
            description={sectionMeta.description}
          >
            <div className="grid grid-cols-2 gap-2">
              {previewItems.map((item) => (
                <div
                  key={item.slot}
                  className="settings-mobile-plain-card rounded-xl border border-slate-700/60 bg-slate-950/45 p-3"
                >
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                    {item.slot}
                  </p>
                  <p className="mt-2 text-2xl font-black leading-none text-cyan-100">
                    {item.key}
                  </p>
                </div>
              ))}
            </div>
            <div className="settings-mobile-plain-card mt-3 rounded-xl border border-amber-300/15 bg-amber-400/5 p-3">
              <p className="text-xs font-semibold text-amber-100">使用提醒</p>
              <ul className="mt-2 space-y-1 text-xs leading-5 text-amber-50/85">
                <li>1. 建議使用單鍵（A-Z），避免功能鍵造成瀏覽器衝突。</li>
                <li>2. 若遊戲中鍵位不符合預期，可回此頁快速檢查。</li>
                <li>3. 若設定被瀏覽器攔截，可按 F5 或 Ctrl+R 後再測試。</li>
              </ul>
            </div>
          </SettingsSectionCard>
        );

      case "sfx":
        return <SfxSettingsPanel key={sectionId} sectionId={sectionId} />;

      case "avatar-effects":
        return (
          <AvatarEffectSettingsPanel key={sectionId} sectionId={sectionId} />
        );

      case "scoreboard-effects":
        return (
          <ScoreboardEffectSettingsPanel
            key={sectionId}
            sectionId={sectionId}
          />
        );

      case "display-presets":
        return (
          <SettingsSectionCard
            key={sectionId}
            id={sectionId}
            icon={<VisibilityRounded fontSize="small" />}
            title={sectionMeta.title}
            description={sectionMeta.description}
          >
            <ul className="space-y-2 text-sm text-slate-300">
              <li className="settings-mobile-plain-card rounded-xl border border-slate-700/60 bg-slate-950/40 px-3 py-2">
                介面密度（舒適 / 標準 / 緊湊）
              </li>
              <li className="settings-mobile-plain-card rounded-xl border border-slate-700/60 bg-slate-950/40 px-3 py-2">
                動畫強度（完整 / 精簡）
              </li>
              <li className="settings-mobile-plain-card rounded-xl border border-slate-700/60 bg-slate-950/40 px-3 py-2">
                字級預設（一般 / 放大）
              </li>
            </ul>
          </SettingsSectionCard>
        );

      case "accessibility-presets":
        return (
          <SettingsSectionCard
            key={sectionId}
            id={sectionId}
            icon={<AccessibilityNewRounded fontSize="small" />}
            title={sectionMeta.title}
            description={sectionMeta.description}
          >
            <ul className="space-y-2 text-sm text-slate-300">
              <li className="settings-mobile-plain-card rounded-xl border border-slate-700/60 bg-slate-950/40 px-3 py-2">
                高對比主題與色弱友善色盤
              </li>
              <li className="settings-mobile-plain-card rounded-xl border border-slate-700/60 bg-slate-950/40 px-3 py-2">
                降低動態效果與閃爍提示
              </li>
              <li className="settings-mobile-plain-card rounded-xl border border-slate-700/60 bg-slate-950/40 px-3 py-2">
                文字與按鈕可讀性增強模式
              </li>
            </ul>
          </SettingsSectionCard>
        );

      default:
        return null;
    }
  };

  const renderedSections = visibleCategorySections
    .map((section) => renderSection(section.id))
    .filter(Boolean);

  const handleCloseOrBack = () => {
    if (embedded) {
      onRequestClose?.();
      return;
    }
    navigate(-1);
  };

  return (
    <div
      className={`${
        embedded
          ? "h-full w-full"
          : "mx-auto w-full max-w-[1320px] px-2 sm:px-0"
      }`}
    >
      <div
        className={`settings-page-shell ${isMobileSettingsLayout ? "settings-page-shell--mobile" : ""} relative overflow-hidden rounded-[24px] border border-slate-700/60 bg-[radial-gradient(900px_380px_at_8%_-8%,rgba(34,211,238,0.12),transparent_60%),radial-gradient(760px_340px_at_100%_0%,rgba(245,158,11,0.08),transparent_58%),linear-gradient(145deg,rgba(5,8,14,0.98),rgba(8,13,22,0.96))] shadow-[0_30px_80px_-56px_rgba(0,0,0,0.95)] ${
          embedded
            ? "flex h-full min-h-0 flex-col p-3 sm:p-4"
            : "mx-auto h-[calc(100dvh-12px)] p-3 sm:h-[min(900px,calc(100dvh-20px))] sm:min-h-[620px] sm:p-5"
        }`}
      >
        <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:repeating-linear-gradient(135deg,rgba(148,163,184,0.18),rgba(148,163,184,0.18)_1px,transparent_1px,transparent_7px)]" />

        <div className="relative grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)]">
          <div className={`flex flex-wrap items-start justify-between gap-3 ${isMobileSettingsLayout ? "mb-3" : "mb-4"}`}>
            <div className="min-w-0">
              <h1 className={`font-black tracking-tight text-slate-100 ${isMobileSettingsLayout ? "text-[1.9rem]" : "text-2xl sm:text-3xl"}`}>
                {SETTINGS_PAGE_COPY.title}
              </h1>
            </div>

            <Button
              variant="outlined"
              color="inherit"
              startIcon={<ArrowBackRounded />}
              onClick={handleCloseOrBack}
              sx={{
                borderColor: "rgba(148,163,184,0.35)",
                color: "#e2e8f0",
                alignSelf: "flex-start",
              }}
            >
              {embedded ? "關閉" : "返回"}
            </Button>
          </div>

          <div className="min-h-0">
            <SettingsLayoutShell
              sidebar={
                <SettingsSidebarNav
                  categories={categories}
                  activeCategoryId={activeCategoryId}
                  onCategoryChange={setActiveCategoryId}
                  categorySections={visibleCategorySections}
                  compactMobile={isMobileSettingsLayout}
                />
              }
            >
              <SettingsContentPane scrollContainerRef={contentScrollRef}>
                {renderedSections.length > 0 ? (
                  renderedSections
                ) : isMobileSettingsLayout && activeCategoryId === "controls" ? (
                  <SettingsSectionCard
                    id="settings-mobile-controls-note"
                    icon={<KeyboardRounded fontSize="small" />}
                    title="操作設定"
                    description="手機版不提供鍵盤按鍵配置。"
                  >
                    <div className="settings-mobile-plain-card rounded-xl border border-slate-700/60 bg-slate-950/40 px-3 py-3 text-sm leading-6 text-slate-300">
                      目前裝置為手機，因此不顯示 Q/W/A/S 與操作預覽設定。
                    </div>
                  </SettingsSectionCard>
                ) : null}
              </SettingsContentPane>
            </SettingsLayoutShell>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
