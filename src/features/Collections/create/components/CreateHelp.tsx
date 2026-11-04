import { useState, type ReactNode } from "react";
import HelpOutlineRounded from "@mui/icons-material/HelpOutlineRounded";
import ClickAwayListener from "@mui/material/ClickAwayListener";
import useMediaQuery from "@mui/material/useMediaQuery";
import SiteTooltip from "@shared/ui/SiteTooltip";

export default function CreateHelp({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const canHover = useMediaQuery("(hover: hover) and (pointer: fine)");
  const close = () => {
    setOpen(false);
    setPinned(false);
  };
  return (
    <ClickAwayListener onClickAway={close}>
      <span className="create-help-wrap">
        <SiteTooltip
          title={children}
          open={open}
          onOpen={() => setOpen(true)}
          onClose={(event) => {
            if (event.type === "keydown") close();
            else if (canHover || !pinned) setOpen(false);
          }}
        >
          <button
            type="button"
            className="create-help"
            style={{ cursor: canHover ? "help" : "pointer" }}
            aria-label={label}
            aria-expanded={open}
            onMouseDown={(event) => {
              // Mouse clicks must not focus and latch the focus-triggered tooltip.
              if (canHover) event.preventDefault();
            }}
            onClick={() => {
              if (canHover) return;
              setPinned(!pinned);
              setOpen(!pinned);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") close();
            }}
          >
            <HelpOutlineRounded fontSize="small" />
          </button>
        </SiteTooltip>
      </span>
    </ClickAwayListener>
  );
}
