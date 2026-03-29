import React from "react";
import { Tooltip, type TooltipProps } from "@mui/material";

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
    <Tooltip
      title={title}
      placement={placement}
      arrow
      enterTouchDelay={0}
      leaveTouchDelay={2200}
    >
      <span className={wrapperClassName}>{children}</span>
    </Tooltip>
  );
};

export default RoomUiTooltip;
