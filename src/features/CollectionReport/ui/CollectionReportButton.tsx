import { useState } from "react";
import { Button } from "@mui/material";
import FlagRounded from "@mui/icons-material/FlagRounded";
import OutlinedFlagRounded from "@mui/icons-material/OutlinedFlagRounded";

import { useCollectionReport } from "../model/useCollectionReport";
import { CollectionReportSheet } from "./CollectionReportSheet";

type CollectionReportButtonProps = {
  collectionId: string;
  isAuthenticated: boolean;
  onLoginRequired?: () => void;
  /**
   * "default" — pill that sits inline with the favorite / share actions.
   * "overlay" — compact translucent pill designed to float over the cover
   *   image (top-right corner). Matches CollectionMetaChips' overlay styling.
   */
  variant?: "default" | "overlay";
};

export const CollectionReportButton = ({
  collectionId,
  isAuthenticated,
  onLoginRequired,
  variant = "default",
}: CollectionReportButtonProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { myReport } = useCollectionReport({
    collectionId,
    enabled: isAuthenticated,
  });

  // Only an OPEN (pending) report shows as "已回報" — after review the
  // user may file a new report, so the button returns to its default state.
  const hasReported = myReport?.status === "pending";

  const handleClick = () => {
    if (!isAuthenticated) {
      onLoginRequired?.();
      return;
    }
    setIsDialogOpen(true);
  };

  const isOverlay = variant === "overlay";

  return (
    <>
      <Button
        size="small"
        variant="outlined"
        startIcon={
          hasReported ? (
            <FlagRounded sx={{ fontSize: isOverlay ? 14 : 17 }} />
          ) : (
            <OutlinedFlagRounded sx={{ fontSize: isOverlay ? 14 : 17 }} />
          )
        }
        onClick={handleClick}
        className={
          isOverlay
            ? `!min-w-0 !gap-1 !rounded-full !px-2 !py-0.5 !text-[11px] !font-semibold !normal-case !shadow-[0_2px_8px_rgba(0,0,0,0.4)] !backdrop-blur-md !transition ${
                hasReported
                  ? "!border-amber-300/45 !bg-slate-950/85 !text-amber-100 hover:!border-amber-200/60"
                  : "!border-white/20 !bg-slate-950/80 !text-slate-100 hover:!border-amber-200/45 hover:!text-amber-100"
              }`
            : `!rounded-full !px-2.5 !text-xs !font-semibold !normal-case !transition sm:!px-3 ${
                hasReported
                  ? "!border-amber-300/35 !bg-amber-400/14 !text-amber-100 hover:!border-amber-200/50 hover:!bg-amber-400/18"
                  : "!border-white/10 !bg-white/[0.03] !text-slate-100 hover:!border-amber-200/24 hover:!bg-amber-400/10"
              }`
        }
      >
        <span className="whitespace-nowrap">
          {hasReported ? "已回報" : "回報"}
        </span>
      </Button>

      {isAuthenticated ? (
        <CollectionReportSheet
          collectionId={collectionId}
          open={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
        />
      ) : null}
    </>
  );
};
