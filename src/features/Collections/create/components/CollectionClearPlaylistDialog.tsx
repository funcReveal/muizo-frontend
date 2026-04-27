import CloseRounded from "@mui/icons-material/CloseRounded";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
} from "@mui/material";
import { useTranslation } from "react-i18next";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export default function CollectionClearPlaylistDialog({
  open,
  onClose,
  onConfirm,
}: Props) {
  const { t } = useTranslation("collectionCreate");

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          border: "1px solid rgba(148, 163, 184, 0.22)",
          background:
            "linear-gradient(180deg, rgba(8,13,24,0.98), rgba(2,6,23,0.98))",
          color: "var(--mc-text)",
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <div className="flex items-center justify-between gap-3">
          <div className="text-base font-semibold">
            {t("source.clearPlaylistDialogTitle")}
          </div>

          <IconButton
            size="small"
            onClick={onClose}
            aria-label={t("source.clearPlaylistDialogCancel")}
            sx={{ color: "var(--mc-text-muted)" }}
          >
            <CloseRounded fontSize="small" />
          </IconButton>
        </div>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        <div className="rounded-2xl border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-sm leading-6 text-amber-100">
          {t("source.clearPlaylistDialogDescription")}
        </div>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          variant="text"
          onClick={onClose}
          sx={{ color: "var(--mc-text-muted)" }}
        >
          {t("source.clearPlaylistDialogCancel")}
        </Button>

        <Button
          variant="contained"
          onClick={onConfirm}
          sx={{
            borderRadius: 999,
            background:
              "linear-gradient(135deg, rgba(251,191,36,0.96), rgba(34,211,238,0.9))",
            color: "#0f172a",
            fontWeight: 800,
            boxShadow: "0 14px 32px rgba(251,191,36,0.18)",
          }}
        >
          {t("source.clearPlaylistDialogConfirm")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
