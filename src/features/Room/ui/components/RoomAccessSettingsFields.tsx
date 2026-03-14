import React from "react";
import { Button, Stack, TextField, Typography } from "@mui/material";

type RoomVisibility = "public" | "private";

interface RoomAccessSettingsFieldsProps {
  visibility: RoomVisibility;
  password: string;
  disabled?: boolean;
  allowPasswordWhenPublic?: boolean;
  showClearButton?: boolean;
  passwordFieldVariant?: "outlined" | "standard" | "filled";
  passwordFieldSize?: "small" | "medium";
  passwordFieldLabelShrink?: boolean;
  onVisibilityChange: (value: RoomVisibility) => void;
  onPasswordChange: (value: string) => void;
  onPasswordClear?: () => void;
  classes?: {
    root?: string;
    visibilityRow?: string;
    visibilityButton?: string;
    helperText?: string;
    passwordField?: string;
    noteText?: string;
  };
}

const RoomAccessSettingsFields: React.FC<RoomAccessSettingsFieldsProps> = ({
  visibility,
  password,
  disabled = false,
  allowPasswordWhenPublic = false,
  showClearButton = true,
  passwordFieldVariant = "outlined",
  passwordFieldSize = "small",
  passwordFieldLabelShrink,
  onVisibilityChange,
  onPasswordChange,
  onPasswordClear,
  classes,
}) => {
  const pinEnabled =
    !disabled && (allowPasswordWhenPublic || visibility === "private");

  const visibilityHint =
    visibility === "private"
      ? "私人房不會出現在公開列表中，只能透過房間代碼加入。"
      : "公開房會出現在大廳列表，也能透過房間代碼加入。";

  const pinHint = password.trim()
    ? "已啟用 4 位 PIN，加入者除了代碼外還需要輸入 PIN。"
    : "所有房間都會自動產生加入代碼；留空則不需要 PIN。";

  const inputLabelSlotProps =
    passwordFieldLabelShrink === undefined
      ? undefined
      : { shrink: passwordFieldLabelShrink };

  return (
    <Stack spacing={1.25} className={classes?.root}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        className={classes?.visibilityRow}
      >
        <Button
          variant={visibility === "public" ? "contained" : "outlined"}
          onClick={() => onVisibilityChange("public")}
          disabled={disabled}
          className={classes?.visibilityButton}
        >
          公開房
        </Button>
        <Button
          variant={visibility === "private" ? "contained" : "outlined"}
          onClick={() => onVisibilityChange("private")}
          disabled={disabled}
          className={classes?.visibilityButton}
        >
          私人房
        </Button>
      </Stack>

      <Typography variant="caption" className={classes?.helperText}>
        {visibilityHint}
      </Typography>

      <TextField
        size={passwordFieldSize}
        variant={passwordFieldVariant}
        slotProps={
          inputLabelSlotProps ? { inputLabel: inputLabelSlotProps } : undefined
        }
        label="4 位 PIN（選填）"
        value={password}
        onChange={(event) =>
          onPasswordChange(event.target.value.replace(/\D/g, "").slice(0, 4))
        }
        placeholder="例如 1234"
        disabled={!pinEnabled}
        fullWidth
        className={classes?.passwordField}
        inputProps={{
          inputMode: "numeric",
          pattern: "\\d{4}",
          maxLength: 4,
        }}
      />

      <Stack direction="row" spacing={1} alignItems="center">
        {showClearButton && (
          <Button
            size="small"
            variant="outlined"
            onClick={onPasswordClear}
            disabled={disabled || !password || !onPasswordClear}
          >
            清除
          </Button>
        )}
        <Typography variant="caption" className={classes?.noteText}>
          {pinHint}
        </Typography>
      </Stack>
    </Stack>
  );
};

export default RoomAccessSettingsFields;
