import React from "react";
import CloseRounded from "@mui/icons-material/CloseRounded";
import ShareRounded from "@mui/icons-material/ShareRounded";
import { Drawer, IconButton } from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";

import type { RoomSettlementHistorySummary } from "@features/RoomSession";
import type { CareerCollectionRankRow } from "../../../types/career";
import CareerCollectionRankExpandedPanel from "./CareerCollectionRankExpandedPanel";
import CareerCollectionRankShareDialog from "./CareerCollectionRankShareDialog";

interface CareerCollectionRankDetailDrawerProps {
  open: boolean;
  item: CareerCollectionRankRow | null;
  onClose: () => void;
  onOpenMatch: (summary: RoomSettlementHistorySummary) => void;
}

const CareerCollectionRankDetailDrawer: React.FC<
  CareerCollectionRankDetailDrawerProps
> = ({ open, item, onClose, onOpenMatch }) => {
  const isMobileDrawer = useMediaQuery("(max-width: 639.95px)");
  const [shareDialogOpen, setShareDialogOpen] = React.useState(false);
  const handleOpenMatch = React.useCallback(
    (summary: RoomSettlementHistorySummary) => {
      onClose();
      onOpenMatch(summary);
    },
    [onClose, onOpenMatch],
  );

  React.useEffect(() => {
    if (!open) {
      setShareDialogOpen(false);
    }
  }, [open]);

  return (
    <>
      <Drawer
        anchor={isMobileDrawer ? "bottom" : "right"}
        open={open}
        onClose={onClose}
        sx={{ zIndex: 1510 }}
        ModalProps={{ keepMounted: true }}
        PaperProps={{
          className:
            "!overflow-hidden !bg-slate-950 !text-slate-100 !shadow-2xl !shadow-slate-950/80 max-sm:!h-[92dvh] max-sm:!w-full max-sm:!rounded-t-[24px] max-sm:!border-t max-sm:!border-white/10 sm:!h-dvh sm:!w-[min(760px,calc(100vw-24px))] sm:!max-w-none sm:!rounded-l-[24px] sm:!border-l sm:!border-white/10",
        }}
      >
        <div className="flex h-full min-h-0 flex-col overflow-hidden p-3 sm:p-5">
          <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
            <div className="min-w-0">
              <div className="text-xs font-semibold text-amber-100/72">
                題庫戰績
              </div>
              <h2 className="mt-1 truncate text-lg font-semibold text-[var(--mc-text)] sm:text-2xl">
                {item?.title ?? "題庫詳情"}
              </h2>
              {item?.sourceLabel ? (
                <div className="mt-1 text-xs text-[var(--mc-text-muted)]">
                  {item.sourceLabel}
                </div>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <IconButton
                aria-label="分享題庫戰績"
                onClick={() => setShareDialogOpen(true)}
                size="small"
                disabled={!item}
                sx={{
                  color: "rgba(254,243,199,0.92)",
                  border: "1px solid rgba(253,230,138,0.24)",
                  backgroundColor: "rgba(253,230,138,0.1)",
                  "&:hover": {
                    backgroundColor: "rgba(253,230,138,0.16)",
                  },
                }}
              >
                <ShareRounded fontSize="small" />
              </IconButton>

              <IconButton
                aria-label="關閉題庫戰績詳情"
                onClick={onClose}
                size="small"
                sx={{
                  color: "rgba(226,232,240,0.82)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  backgroundColor: "rgba(255,255,255,0.045)",
                  "&:hover": {
                    backgroundColor: "rgba(255,255,255,0.08)",
                  },
                }}
              >
                <CloseRounded fontSize="small" />
              </IconButton>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto pt-4 [scrollbar-gutter:stable] [-webkit-overflow-scrolling:touch]">
            {item ? (
              <div className="space-y-4">
                <div className="relative h-44 overflow-hidden rounded-[22px] border border-white/10 bg-[linear-gradient(135deg,rgba(245,158,11,0.2),rgba(15,23,42,0.72))] sm:h-56">
                  {item.coverThumbnailUrl ? (
                    <img
                      src={item.coverThumbnailUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-4xl font-semibold text-amber-100/80">
                      {item.title.trim().slice(0, 1) || "題"}
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/86 to-transparent px-4 py-4">
                    <div className="truncate text-base font-semibold text-slate-50">
                      {item.title}
                    </div>
                  </div>
                </div>

                <CareerCollectionRankExpandedPanel
                  item={item}
                  onOpenMatch={handleOpenMatch}
                />
              </div>
            ) : (
              <div className="rounded-[16px] border border-white/10 bg-white/[0.035] p-4 text-sm text-[var(--mc-text-muted)]">
                尚未選擇題庫。
              </div>
            )}
          </div>
        </div>
      </Drawer>

      <CareerCollectionRankShareDialog
        open={shareDialogOpen}
        item={item}
        onClose={() => setShareDialogOpen(false)}
      />
    </>
  );
};

export default CareerCollectionRankDetailDrawer;
