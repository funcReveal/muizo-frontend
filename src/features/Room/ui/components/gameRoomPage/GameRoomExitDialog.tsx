import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";

type GameRoomExitDialogProps = {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

const GameRoomExitDialog = ({
  open,
  onCancel,
  onConfirm,
}: GameRoomExitDialogProps) => (
  <Dialog open={open} onClose={onCancel}>
    <DialogTitle>退出遊戲？</DialogTitle>
    <DialogContent>
      <Typography variant="body2" className="text-slate-600">
        確定要放棄本局並返回房間列表嗎？
      </Typography>
    </DialogContent>
    <DialogActions>
      <Button onClick={onCancel} variant="text">
        取消
      </Button>
      <Button onClick={onConfirm} variant="contained" color="error">
        退出遊戲
      </Button>
    </DialogActions>
  </Dialog>
);

export default GameRoomExitDialog;
