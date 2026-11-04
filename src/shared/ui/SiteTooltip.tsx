import type { ReactElement, ReactNode } from "react";
import { Tooltip, type TooltipProps } from "@mui/material";

export interface SiteTooltipProps {
  title?: ReactNode;
  children: ReactElement;
  placement?: TooltipProps["placement"];
  open?: boolean;
  onOpen?: () => void;
  onClose?: TooltipProps["onClose"];
  leaveDelay?: number;
  interactiveContent?: boolean;
}

/** Shared hover/focus hint. Rich content prevents MUI from adding a native title. */
export default function SiteTooltip({ title, children, placement = "top", open, onOpen, onClose, leaveDelay = 100, interactiveContent = false }: SiteTooltipProps) {
  if (!title) return children;
  return (
    <Tooltip
      title={<div>{title}</div>}
      placement={placement}
      open={open}
      onOpen={onOpen}
      onClose={onClose}
      describeChild
      arrow
      enterDelay={300}
      enterNextDelay={80}
      leaveDelay={leaveDelay}
      enterTouchDelay={700}
      leaveTouchDelay={2000}
      slotProps={{
        popper: { sx: { zIndex: 1900, ...(interactiveContent ? { pointerEvents: "auto" } : {}) } },
        tooltip: {
          onWheel: interactiveContent ? (event) => event.stopPropagation() : undefined,
          sx: {
            maxWidth: 280,
            m: interactiveContent ? "0 !important" : "8px !important",
            px: 1.5,
            py: 1,
            border: "1px solid var(--mc-border)",
            borderRadius: "10px",
            backgroundColor: "var(--mc-surface-strong)",
            color: "var(--mc-text)",
            fontFamily: "inherit",
            fontSize: 13,
            fontWeight: 400,
            lineHeight: 1.65,
            boxShadow: "0 8px 24px oklch(8% .008 90 / .3)",
          },
        },
        arrow: { sx: { color: "var(--mc-surface-strong)" } },
        transition: { timeout: { enter: 140, exit: 100 } },
      }}
    >
      {children}
    </Tooltip>
  );
}
