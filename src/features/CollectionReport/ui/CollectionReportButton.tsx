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
};

export const CollectionReportButton = ({
  collectionId,
  isAuthenticated,
  onLoginRequired,
}: CollectionReportButtonProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { myReport } = useCollectionReport({
    collectionId,
    enabled: isAuthenticated,
  });

  // Only an OPEN (pending) report shows as "已檢舉" — after review the
  // user may file a new report, so the button returns to its default state.
  const hasReported = myReport?.status === "pending";

  const handleClick = () => {
    if (!isAuthenticated) {
      onLoginRequired?.();
      return;
    }
    setIsDialogOpen(true);
  };

  return (
    <>
      <Button
        size="small"
        variant="outlined"
        startIcon={
          hasReported ? (
            <FlagRounded sx={{ fontSize: 17 }} />
          ) : (
            <OutlinedFlagRounded sx={{ fontSize: 17 }} />
          )
        }
        onClick={handleClick}
        className={`!rounded-full !px-2.5 !text-xs !font-semibold !normal-case !transition sm:!px-3 ${
          hasReported
            ? "!border-amber-300/35 !bg-amber-400/14 !text-amber-100 hover:!border-amber-200/50 hover:!bg-amber-400/18"
            : "!border-white/10 !bg-white/[0.03] !text-slate-100 hover:!border-amber-200/24 hover:!bg-amber-400/10"
        }`}
      >
        <span className="whitespace-nowrap">
          {hasReported ? "已檢舉" : "檢舉"}
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
