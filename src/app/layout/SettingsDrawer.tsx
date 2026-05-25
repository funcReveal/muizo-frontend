import React, { lazy, Suspense } from "react";
import { Drawer } from "@mui/material";

const SettingsPage = lazy(() => import("@features/Setting/ui/SettingsPage"));

type SettingsDrawerProps = {
  open: boolean;
  onClose: () => void;
};

const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  open,
  onClose,
}) => {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        className:
          "!h-dvh !w-screen !max-w-none !overflow-hidden !rounded-none !border-l !border-white/10 !bg-slate-950 !text-slate-100 !shadow-2xl !shadow-slate-950/80 md:!w-[min(1040px,calc(100vw-24px))] md:!rounded-l-[24px]",
      }}
      ModalProps={{
        keepMounted: true,
      }}
    >
      <Suspense fallback={null}>
        <SettingsPage onRequestClose={onClose} />
      </Suspense>
    </Drawer>
  );
};

export default SettingsDrawer;
