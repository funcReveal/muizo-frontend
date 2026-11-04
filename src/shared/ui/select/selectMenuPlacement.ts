import type { MenuProps } from "@mui/material/Menu";
import { useEffect, useState } from "react";

/** Keep a select menu aligned to its anchor, including near mobile viewport edges. */
export const selectMenuPlacement: Pick<MenuProps, "anchorOrigin" | "transformOrigin" | "marginThreshold"> = {
  anchorOrigin: { vertical: "bottom", horizontal: "left" },
  transformOrigin: { vertical: "top", horizontal: "left" },
  marginThreshold: 0,
};

/** Keep the popup width in sync with its trigger, including while open on rotation. */
export function useSelectMenuAnchor() {
  const [anchor, setAnchor] = useState<HTMLDivElement | null>(null);
  const [width, setWidth] = useState<number>();
  useEffect(() => {
    if (!anchor) return;
    const measure = () => {
      const next = anchor.getBoundingClientRect().width;
      if (next > 0) setWidth(next);
    };
    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(anchor);
    window.addEventListener("resize", measure);
    return () => { observer?.disconnect(); window.removeEventListener("resize", measure); };
  }, [anchor]);
  return { anchorRef: setAnchor, menuWidth: width };
}
