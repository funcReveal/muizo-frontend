import "../../shared/components/collectionTools.css";
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
      className="collection-studio-dialog"
      aria-labelledby="clear-playlist-title"
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle id="clear-playlist-title" sx={{ pb: 1 }}>
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
        <div className="text-sm leading-6 text-[var(--mc-text-muted)]">
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

        <Button variant="contained" onClick={onConfirm}>
          {t("source.clearPlaylistDialogConfirm")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
