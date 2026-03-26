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
      ? "私人房需要房號或邀請連結加入，也可以額外設定 4 位 PIN。"
      : "公開房會出現在房間列表，你也可以加上 4 位 PIN 提高進房門檻。";

  const pinHint = password.trim()
    ? "儲存後會更新目前房間的 PIN；清空即可移除密碼。"
    : "未設定 PIN 時，房間不需要輸入密碼即可加入。";

  const inputLabelSlotProps =
    passwordFieldLabelShrink === undefined
      ? undefined
      : { shrink: passwordFieldLabelShrink };

  return (
    <Stack spacing={1.25} className={classes?.root}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        alignItems={{ xs: "stretch", sm: "center" }}
        className={classes?.visibilityRow}
      >
        <Button
          variant={visibility === "public" ? "contained" : "outlined"}
          onClick={() => onVisibilityChange("public")}
          disabled={disabled}
          className={classes?.visibilityButton}
          sx={{ width: { xs: "100%", sm: "auto" } }}
        >
          公開
        </Button>
        <Button
          variant={visibility === "private" ? "contained" : "outlined"}
          onClick={() => onVisibilityChange("private")}
          disabled={disabled}
          className={classes?.visibilityButton}
          sx={{ width: { xs: "100%", sm: "auto" } }}
        >
          私人
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
        label="房間 PIN"
        value={password}
        onChange={(event) =>
          onPasswordChange(event.target.value.replace(/\D/g, "").slice(0, 4))
        }
        placeholder="輸入 4 位數 PIN（選填）"
        disabled={!pinEnabled}
        fullWidth
        className={classes?.passwordField}
        inputProps={{
          inputMode: "numeric",
          pattern: "\\d{4}",
          maxLength: 4,
        }}
      />

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        alignItems={{ xs: "stretch", sm: "center" }}
      >
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
