import {
  CampaignRounded,
  CloseRounded,
  ConstructionRounded,
  NewReleasesRounded,
  WarningAmberRounded,
} from "@mui/icons-material";
import { Drawer, IconButton } from "@mui/material";
import { useState } from "react";

import {
  isSiteAnnouncementActive,
  SITE_ANNOUNCEMENT,
  type SiteAnnouncement,
  type SiteAnnouncementSeverity,
} from "./siteAnnouncement";

type SiteAnnouncementNoticeProps = {
  announcement?: SiteAnnouncement;
  className?: string;
};

const severityConfig: Record<
  SiteAnnouncementSeverity,
  {
    label: string;
    icon: typeof CampaignRounded;
    dotClassName: string;
    iconClassName: string;
    borderClassName: string;
    backgroundClassName: string;
    drawerAccentClassName: string;
  }
> = {
  info: {
    label: "公告",
    icon: CampaignRounded,
    dotClassName: "bg-sky-300",
    iconClassName: "text-sky-200",
    borderClassName: "border-sky-200/18",
    backgroundClassName:
      "bg-[linear-gradient(90deg,rgba(14,165,233,0.12),rgba(15,23,42,0.55))]",
    drawerAccentClassName: "from-sky-300/22",
  },
  maintenance: {
    label: "維護",
    icon: ConstructionRounded,
    dotClassName: "bg-amber-300",
    iconClassName: "text-amber-200",
    borderClassName: "border-amber-200/24",
    backgroundClassName:
      "bg-[linear-gradient(90deg,rgba(245,158,11,0.16),rgba(15,23,42,0.58))]",
    drawerAccentClassName: "from-amber-300/24",
  },
  update: {
    label: "更新",
    icon: NewReleasesRounded,
    dotClassName: "bg-cyan-300",
    iconClassName: "text-cyan-200",
    borderClassName: "border-cyan-200/18",
    backgroundClassName:
      "bg-[linear-gradient(90deg,rgba(34,211,238,0.12),rgba(15,23,42,0.55))]",
    drawerAccentClassName: "from-cyan-300/22",
  },
  warning: {
    label: "提醒",
    icon: WarningAmberRounded,
    dotClassName: "bg-rose-300",
    iconClassName: "text-rose-200",
    borderClassName: "border-rose-200/22",
    backgroundClassName:
      "bg-[linear-gradient(90deg,rgba(251,113,133,0.13),rgba(15,23,42,0.58))]",
    drawerAccentClassName: "from-rose-300/24",
  },
};

const InfoBlock = ({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) => {
  if (!value) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3">
      <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-100">{value}</p>
    </div>
  );
};

const BulletList = ({ title, items }: { title: string; items?: string[] }) => {
  if (!items || items.length === 0) return null;

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
      <h4 className="text-sm font-semibold text-slate-100">{title}</h4>

      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li
            key={item}
            className="flex gap-2 text-sm leading-6 text-slate-300"
          >
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-200/70" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
};

const SiteAnnouncementNotice = ({
  announcement = SITE_ANNOUNCEMENT,
  className = "",
}: SiteAnnouncementNoticeProps) => {
  const [open, setOpen] = useState(false);

  if (!isSiteAnnouncementActive(announcement)) return null;

  const config = severityConfig[announcement.severity];
  const Icon = config.icon;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={[
          "group relative flex h-9 min-w-0 max-w-[520px] items-center gap-2 overflow-hidden rounded-full border px-3",
          "shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md transition",
          "hover:border-amber-100/34 hover:bg-white/[0.055]",
          config.borderClassName,
          config.backgroundClassName,
          className,
        ].join(" ")}
        title={`${announcement.title}：${announcement.shortMessage}`}
      >
        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${config.dotClassName}`}
        />
        <Icon
          className={`${config.iconClassName} shrink-0`}
          sx={{ fontSize: 17 }}
        />

        <span className="shrink-0 text-[11px] font-semibold tracking-[0.14em] text-slate-300">
          {config.label}
        </span>

        <span className="h-3 w-px shrink-0 bg-white/10" />

        <span className="min-w-0 truncate text-xs font-medium text-slate-300">
          {announcement.shortMessage}
        </span>

        <span className="ml-1 hidden shrink-0 text-[11px] font-medium text-slate-500 lg:inline">
          詳細
        </span>
      </button>

      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: "100%", sm: 420 },
            maxWidth: "100vw",
            borderLeft: "1px solid rgba(245, 158, 11, 0.16)",
            background:
              "linear-gradient(180deg, rgba(15,23,42,0.98), rgba(2,6,23,0.99))",
            color: "#e2e8f0",
          },
        }}
      >
        <div className="flex h-full min-h-0 flex-col">
          <div
            className={[
              "relative overflow-hidden border-b border-white/10 px-5 pb-5 pt-5",
              "bg-[linear-gradient(135deg,var(--tw-gradient-stops),rgba(15,23,42,0.4)_42%,rgba(2,6,23,0.8))]",
              config.drawerAccentClassName,
            ].join(" ")}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/8 ${config.iconClassName}`}
                  >
                    <Icon sx={{ fontSize: 18 }} />
                  </span>

                  <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] font-semibold tracking-[0.16em] text-slate-300">
                    {announcement.title}
                  </span>
                </div>

                <h3 className="mt-4 text-xl font-semibold tracking-tight text-slate-50">
                  {announcement.detailTitle}
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-300">
                  {announcement.detailDescription}
                </p>
              </div>

              <IconButton
                size="small"
                onClick={() => setOpen(false)}
                sx={{
                  color: "rgba(226,232,240,0.82)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(15,23,42,0.48)",
                  "&:hover": {
                    background: "rgba(255,255,255,0.08)",
                  },
                }}
              >
                <CloseRounded fontSize="small" />
              </IconButton>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            <div className="grid grid-cols-2 gap-3">
              <InfoBlock
                label="維護時間"
                value={announcement.maintenanceWindowLabel}
              />
              <InfoBlock
                label="預估時間"
                value={announcement.expectedDurationLabel}
              />
            </div>

            <div className="mt-4 space-y-4">
              <BulletList title="可能影響" items={announcement.impactItems} />
              <BulletList title="本次更新" items={announcement.updateItems} />

              {announcement.note && (
                <section className="rounded-2xl border border-amber-200/16 bg-amber-200/[0.055] p-4">
                  <h4 className="text-sm font-semibold text-amber-100">
                    注意事項
                  </h4>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    {announcement.note}
                  </p>
                </section>
              )}
            </div>
          </div>

          <div className="border-t border-white/10 px-5 py-4">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/[0.08]"
            >
              我知道了
            </button>
          </div>
        </div>
      </Drawer>
    </>
  );
};

export default SiteAnnouncementNotice;
