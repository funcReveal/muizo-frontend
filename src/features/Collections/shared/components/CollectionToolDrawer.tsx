import type { ReactNode } from "react";
import { Drawer, useMediaQuery } from "@mui/material";
import { motion, useReducedMotion } from "motion/react";
import "./collectionTools.css";

type Props = {
  open: boolean;
  onClose: () => void;
  label: string;
  width?: number;
  busy?: boolean;
  children: ReactNode;
  className?: string;
};

/** Shared workspace sheet: focus trapping, Escape and scroll locking stay with MUI. */
export default function CollectionToolDrawer({
  open,
  onClose,
  label,
  width = 560,
  busy = false,
  children,
  className = "",
}: Props) {
  const mobile = useMediaQuery("(max-width: 639px)");
  const reduce = useReducedMotion();
  const close = () => {
    if (!busy) onClose();
  };
  return (
    <Drawer
      anchor={mobile ? "bottom" : "right"}
      open={open}
      onClose={close}
      transitionDuration={reduce ? 0 : { enter: 360, exit: 260 }}
      sx={{ zIndex: 1600 }}
      slotProps={{
        backdrop: {
          sx: {
            backgroundColor: "rgba(8, 10, 7, .62)",
            backdropFilter: "blur(5px)",
          },
        },
        transition: {
          easing: {
            enter: "cubic-bezier(.22,1,.36,1)",
            exit: "cubic-bezier(.4,0,1,1)",
          },
        },
        paper: {
          role: "dialog",
          "aria-modal": true,
          "aria-label": label,
          className: `collection-tool-sheet ${className}`,
          sx: {
            width: mobile ? "100%" : `min(${width}px, calc(100vw - 32px))`,
            height: mobile
              ? "calc(100dvh - max(12px, env(safe-area-inset-top)))"
              : "calc(100dvh - 24px)",
            maxHeight: "100dvh",
            margin: mobile ? 0 : "12px",
            borderRadius: mobile ? "24px 24px 0 0" : "24px",
            background: "#20221d",
            backgroundImage: "none",
            color: "#f3f4ee",
            border: "1px solid rgba(188,197,177,.16)",
            overflow: "hidden",
            boxShadow: "0 24px 90px rgba(0,0,0,.4)",
          },
        },
      }}
    >
      {mobile && (
        <motion.button
          type="button"
          className="collection-tool-handle"
          aria-label={`關閉${label}`}
          disabled={busy}
          onClick={close}
          drag={busy ? false : "y"}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.18}
          onDragEnd={(_, info) => {
            if (
              info.offset.y > 60 ||
              (info.offset.y > 15 && info.velocity.y > 450)
            )
              close();
          }}
          whileDrag={{ cursor: "grabbing" }}
        >
          <span />
        </motion.button>
      )}
      <div className="collection-tool-content">{children}</div>
    </Drawer>
  );
}
