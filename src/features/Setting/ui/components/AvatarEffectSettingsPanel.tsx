import React from "react";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import FlashOnRoundedIcon from "@mui/icons-material/FlashOnRounded";
import PaletteRoundedIcon from "@mui/icons-material/PaletteRounded";
import { Chip } from "@mui/material";

import { useSettingsModel } from "../../model/settingsContext";
import SettingsSectionCard from "./SettingsSectionCard";
import PlayerAvatar from "../../../../shared/ui/playerAvatar/PlayerAvatar";
import {
  AVATAR_EFFECT_LEVELS,
  type AvatarEffectLevel,
} from "../../../../shared/ui/playerAvatar/playerAvatarTheme";

interface AvatarEffectSettingsPanelProps {
  sectionId: string;
}

const AVATAR_EFFECT_LABEL: Record<AvatarEffectLevel, string> = {
  off: "關閉",
  simple: "簡單",
  full: "完整",
};

const DEMO_IMAGE_AVATAR =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#1f2937" />
          <stop offset="100%" stop-color="#0f172a" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="60" fill="url(#bg)" />
      <circle cx="60" cy="45" r="22" fill="#f4d3b1" />
      <path d="M37 95c2-19 15-31 23-31s21 12 23 31" fill="#6d28d9" />
      <path d="M39 39c6-13 35-18 42 0-3-6-7-11-20-11-12 0-18 5-22 11Z" fill="#111827" />
      <circle cx="52" cy="45" r="2.5" fill="#1f2937" />
      <circle cx="68" cy="45" r="2.5" fill="#1f2937" />
      <path d="M52 55c5 4 11 4 16 0" stroke="#7c2d12" stroke-width="3" stroke-linecap="round" fill="none" />
    </svg>
  `);

const AvatarEffectSettingsPanel: React.FC<AvatarEffectSettingsPanelProps> = ({
  sectionId,
}) => {
  const { avatarEffectLevel, setAvatarEffectLevel } = useSettingsModel();

  return (
    <SettingsSectionCard
      id={sectionId}
      icon={<PaletteRoundedIcon fontSize="small" />}
      title="玩家頭像特效"
      description="用低成本的漸層、框線與名次標記提升辨識度。這套設定會同步影響房間大廳、遊戲排行榜、揭曉列與對戰結算。"
      actions={
        <Chip
          size="small"
          label={AVATAR_EFFECT_LABEL[avatarEffectLevel]}
          variant="outlined"
          sx={{
            color: "#e0f2fe",
            border: "1px solid rgba(56,189,248,0.24)",
            background: "rgba(56,189,248,0.08)",
          }}
        />
      }
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="settings-mobile-plain-card settings-mobile-plain-card--soft rounded-[22px] border border-slate-700/70 bg-slate-950/35 p-4">
          <div className="mb-4 flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-400/18 bg-cyan-500/10 text-cyan-100">
              <AutoAwesomeRoundedIcon fontSize="small" />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Effect Level
              </p>
              <h3 className="mt-1 text-base font-black text-slate-100">
                特效層級
              </h3>
            </div>
          </div>

          <div className="grid gap-3">
            {AVATAR_EFFECT_LEVELS.map((level) => (
              <button
                key={level}
                type="button"
                className={`w-full rounded-[18px] border p-4 text-left transition duration-200 ${
                  avatarEffectLevel === level
                    ? "border-cyan-300/45 bg-cyan-400/10 shadow-[0_20px_40px_-34px_rgba(56,189,248,0.56)]"
                    : "border-slate-700/70 bg-slate-950/45 hover:border-slate-500/80 hover:bg-slate-900/70"
                }`}
                onClick={() => setAvatarEffectLevel(level)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="text-sm font-black tracking-[0.01em] text-slate-100">
                      {AVATAR_EFFECT_LABEL[level]}
                    </h4>
                    <p className="mt-1 text-sm leading-6 text-slate-300">
                      {level === "off"
                        ? "保留乾淨外框與穩定裁切，適合低階裝置或偏極簡畫面。"
                        : level === "simple"
                          ? "啟用識別色、靜態名次外框與統一頭像框架，成本最低。"
                          : "在簡單版上補一層輕量 combo 能量點與更明顯的成就感。"}
                    </p>
                  </div>
                  <span
                    className={`inline-flex h-8 w-8 flex-none items-center justify-center rounded-full border ${
                      avatarEffectLevel === level
                        ? "border-cyan-300/45 bg-cyan-300/15 text-cyan-100"
                        : "border-slate-700/80 bg-slate-900/90 text-slate-500"
                    }`}
                    aria-hidden="true"
                  >
                    <span
                      className={`h-3 w-3 rounded-full transition ${
                        avatarEffectLevel === level
                          ? "bg-cyan-200 shadow-[0_0_0_4px_rgba(34,211,238,0.14)]"
                          : "bg-slate-600"
                      }`}
                    />
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-5">
          <div className="settings-mobile-plain-card settings-mobile-plain-card--glow rounded-[22px] border border-cyan-400/18 bg-[radial-gradient(360px_180px_at_14%_0%,rgba(56,189,248,0.14),transparent_64%),linear-gradient(180deg,rgba(2,6,12,0.98),rgba(7,12,20,0.95))] p-4 shadow-[0_24px_64px_-44px_rgba(8,145,178,0.7)]">
            <div className="mb-3 flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-400/18 bg-cyan-500/10 text-cyan-100">
                <PaletteRoundedIcon fontSize="small" />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Identity Preview
                </p>
                <h3 className="mt-1 text-base font-black text-slate-100">
                  基礎辨識度
                </h3>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <PreviewIdentityCard
                title="純文字頭像"
                subtitle="固定識別色 + Monogram"
              >
                <PlayerAvatar
                  username="Astra"
                  clientId="demo-text"
                  size={58}
                  effectLevel={avatarEffectLevel}
                />
              </PreviewIdentityCard>
              <PreviewIdentityCard
                title="Google 頭像"
                subtitle="統一裁切 + 外框"
              >
                <PlayerAvatar
                  username="Mika"
                  clientId="demo-google"
                  avatarUrl={DEMO_IMAGE_AVATAR}
                  size={58}
                  effectLevel={avatarEffectLevel}
                />
              </PreviewIdentityCard>
            </div>
          </div>

          <div className="settings-mobile-plain-card settings-mobile-plain-card--soft rounded-[22px] border border-slate-700/70 bg-slate-950/35 p-4">
            <div className="mb-3 flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-300/18 bg-amber-400/10 text-amber-100">
                <EmojiEventsRoundedIcon fontSize="small" />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Rank Preview
                </p>
                <h3 className="mt-1 text-base font-black text-slate-100">
                  冠軍 / 亞軍 / 季軍
                </h3>
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-4 rounded-[18px] border border-slate-800/80 bg-slate-950/60 px-4 py-4">
              <PreviewPodiumItem
                label="亞軍"
                name="Sora"
                clientId="rank-2"
                rank={2}
                size={56}
                effectLevel={avatarEffectLevel}
              />
              <PreviewPodiumItem
                label="冠軍"
                name="Ken"
                clientId="rank-1"
                avatarUrl={DEMO_IMAGE_AVATAR}
                rank={1}
                size={70}
                effectLevel={avatarEffectLevel}
              />
              <PreviewPodiumItem
                label="季軍"
                name="Luna"
                clientId="rank-3"
                rank={3}
                size={52}
                effectLevel={avatarEffectLevel}
              />
            </div>
          </div>

          <div className="settings-mobile-plain-card settings-mobile-plain-card--soft rounded-[22px] border border-slate-700/70 bg-slate-950/35 p-4">
            <div className="mb-3 flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-sky-300/18 bg-sky-500/10 text-sky-100">
                <FlashOnRoundedIcon fontSize="small" />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Combo Preview
                </p>
                <h3 className="mt-1 text-base font-black text-slate-100">
                  連擊差異
                </h3>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <PreviewIdentityCard title="一般狀態" subtitle="Combo x0">
                <PlayerAvatar
                  username="Nova"
                  clientId="combo-off"
                  size={56}
                  combo={0}
                  effectLevel={avatarEffectLevel}
                />
              </PreviewIdentityCard>
              <PreviewIdentityCard title="進入手感" subtitle="Combo x7">
                <PlayerAvatar
                  username="Nova"
                  clientId="combo-on"
                  size={56}
                  combo={7}
                  effectLevel={avatarEffectLevel}
                />
              </PreviewIdentityCard>
            </div>
          </div>
        </div>
      </div>
    </SettingsSectionCard>
  );
};

const PreviewIdentityCard: React.FC<{
  title: string;
  subtitle: string;
  children: React.ReactNode;
}> = ({ title, subtitle, children }) => (
  <div className="rounded-[18px] border border-slate-800/80 bg-slate-950/60 px-4 py-4">
    <div className="flex items-center gap-3">
      <div className="flex h-16 w-16 items-center justify-center rounded-[20px] border border-white/6 bg-[linear-gradient(180deg,rgba(15,23,42,0.9),rgba(15,23,42,0.55))]">
        {children}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-black text-slate-100">{title}</p>
        <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
      </div>
    </div>
  </div>
);

const PreviewPodiumItem: React.FC<{
  label: string;
  name: string;
  clientId: string;
  rank: number;
  effectLevel: AvatarEffectLevel;
  size: number;
  avatarUrl?: string;
}> = ({ label, name, clientId, rank, effectLevel, size, avatarUrl }) => (
  <div className="flex min-w-[5.5rem] flex-1 flex-col items-center gap-2 text-center">
    <PlayerAvatar
      username={name}
      clientId={clientId}
      rank={rank}
      size={size}
      avatarUrl={avatarUrl}
      effectLevel={effectLevel}
    />
    <div>
      <p className="text-xs font-black text-slate-100">{label}</p>
      <p className="mt-0.5 text-[11px] text-slate-400">{name}</p>
    </div>
  </div>
);

export default AvatarEffectSettingsPanel;
