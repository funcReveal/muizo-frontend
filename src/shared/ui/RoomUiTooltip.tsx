import React from "react";
import type { TooltipProps } from "@mui/material";
import SiteTooltip from "./SiteTooltip";

interface RoomUiTooltipProps {
  title?: React.ReactNode;
  children: React.ReactElement;
  placement?: TooltipProps["placement"];
  wrapperClassName?: string;
}

const RoomUiTooltip: React.FC<RoomUiTooltipProps> = ({
  title,
  children,
  placement = "top",
  wrapperClassName = "inline-flex max-w-full",
}) => {
  if (!title) return children;

  return (
    <SiteTooltip
      title={title}
      placement={placement}
    >
      <span className={wrapperClassName}>{children}</span>
    </SiteTooltip>
  );
};

export default RoomUiTooltip;
