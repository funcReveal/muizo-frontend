import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Link,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";

import { USERNAME_MAX } from "@domain/room/constants";
import { useAuth } from "@shared/auth/AuthContext";
import { categoriesApi } from "@features/CollectionCategory/api/categoriesApi";
import {
  onboardingApi,
  type OnboardingGender,
  type OnboardingState,
} from "../model/onboardingApi";

type Step = "verify" | "profile" | "interests";

const GENDER_OPTIONS: Array<{ value: OnboardingGender; label: string }> = [
  { value: "male", label: "男性" },
  { value: "female", label: "女性" },
  { value: "non_binary", label: "非二元" },
  { value: "other", label: "其他" },
  { value: "prefer_not_to_say", label: "不願透露" },
];

type Props = {
  state: OnboardingState;
  onClose: () => void;
};

const OnboardingWizard: React.FC<Props> = ({ state, onClose }) => {
  const {
    authToken,
    refreshAuthToken,
    resendEmailVerification,
    authUser,
    updateDisplayName,
  } = useAuth();
  const authParams = useMemo(
    () => ({ authToken, refreshAuthToken }),
    [authToken, refreshAuthToken],
  );

  const steps = useMemo<Step[]>(
    () =>
      state.emailVerified
        ? ["profile", "interests"]
        : ["profile", "verify", "interests"],
    [state.emailVerified],
  );
  const [stepIndex, setStepIndex] = useState(0);
  const step = steps[stepIndex];

  const [gender, setGender] = useState<OnboardingGender | null>(
    (state.gender as OnboardingGender | null) ?? null,
  );
  const [birthDate, setBirthDate] = useState(state.birthDate ?? "");
  const [displayName, setDisplayName] = useState(
    (authUser?.display_name ?? "").slice(0, USERNAME_MAX),
  );
  const [consent, setConsent] = useState(state.marketingConsent);

  const [categories, setCategories] = useState<Array<{ key: string; label: string }>>([]);
  const [selected, setSelected] = useState<Set<string>>(
    new Set(Array.isArray(state.interestedCategories) ? state.interestedCategories : []),
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendNote, setResendNote] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    categoriesApi
      .getCategories()
      .then((tree) => {
        if (active) {
          setCategories(tree.map((c) => ({ key: c.key, label: c.label })));
        }
      })
      .catch(() => {
        /* interests are optional — a failed taxonomy load just shows none */
      });
    return () => {
      active = false;
    };
  }, []);

  const advance = () => setStepIndex((i) => Math.min(i + 1, steps.length - 1));

  const handleResend = async () => {
    setResendNote(null);
    const ok = authUser?.email ? await resendEmailVerification(authUser.email) : false;
    setResendNote(ok ? "已重新寄出驗證信，請查看信箱。" : "寄送失敗，請稍後再試。");
  };

  const submitProfile = async () => {
    const trimmedDisplayName = displayName.trim();
    if (!trimmedDisplayName) {
      setError("請填寫顯示名稱");
      return;
    }
    if (!gender) {
      setError("請選擇性別");
      return;
    }
    if (!birthDate) {
      setError("請填寫生日");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const nameSaved = await updateDisplayName(trimmedDisplayName);
      if (!nameSaved) return;
      await onboardingApi.updateProfile(authParams, { gender, birthDate, marketingConsent: consent });
      advance();
    } catch (e) {
      setError(e instanceof Error ? e.message : "儲存失敗");
    } finally {
      setSubmitting(false);
    }
  };

  const finishInterests = async (skip: boolean) => {
    setSubmitting(true);
    setError(null);
    try {
      if (!skip) {
        await onboardingApi.updateInterests(authParams, Array.from(selected));
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "儲存失敗");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleCategory = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <Dialog open fullWidth maxWidth="sm" disableEscapeKeyDown>
      <DialogTitle>
        {step === "verify" && "驗證你的 Email"}
        {step === "profile" && "完善你的個人資料"}
        {step === "interests" && "選擇感興趣的題庫分類"}
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {step === "verify" && (
          <Stack spacing={2}>
            <Typography variant="body2">
              我們已寄出驗證信到 <b>{authUser?.email ?? "你的信箱"}</b>。
              驗證後才能建立公開題庫、發表評論並登上排行榜；你現在仍可先繼續使用。
            </Typography>
            {resendNote && <Alert severity="info">{resendNote}</Alert>}
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" onClick={handleResend}>
                重寄驗證信
              </Button>
            </Stack>
          </Stack>
        )}

        {step === "profile" && (
          <Stack spacing={3}>
            <TextField
              label="顯示名稱"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value.slice(0, USERNAME_MAX))}
              placeholder="朋友會在房間與排行榜看到這個名稱"
              inputProps={{ maxLength: USERNAME_MAX }}
              helperText={`${displayName.length}/${USERNAME_MAX}`}
              fullWidth
            />

            <div>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                性別
              </Typography>
              <ToggleButtonGroup
                exclusive
                value={gender}
                onChange={(_, value) => value && setGender(value)}
                size="small"
                sx={{ flexWrap: "wrap" }}
              >
                {GENDER_OPTIONS.map((opt) => (
                  <ToggleButton key={opt.value} value={opt.value}>
                    {opt.label}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </div>

            <TextField
              type="date"
              label="生日"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />

            <div>
              <Typography variant="body2" sx={{ mb: 1 }}>
                我們用你的性別、年齡與興趣<b>推薦更適合你的題庫與內容</b>。
              </Typography>
              <FormControlLabel
                control={<Checkbox checked={consent} onChange={(e) => setConsent(e.target.checked)} />}
                label={
                  <Typography variant="body2">
                    我同意 Muizo 以<b>彙總／去識別</b>的形式，將我的資料用於內容分析與商業合作（可隨時在設定關閉）。詳見{" "}
                    <Link href="/privacy" target="_blank" rel="noopener">
                      隱私政策
                    </Link>
                    。
                  </Typography>
                }
              />
            </div>
          </Stack>
        )}

        {step === "interests" && (
          <Stack spacing={2}>
            <Typography variant="body2">選擇你感興趣的分類，我們會優先推薦相關題庫（可略過）。</Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
              {categories.map((c) => (
                <Chip
                  key={c.key}
                  label={c.label}
                  color={selected.has(c.key) ? "primary" : "default"}
                  variant={selected.has(c.key) ? "filled" : "outlined"}
                  onClick={() => toggleCategory(c.key)}
                />
              ))}
              {categories.length === 0 && (
                <Typography variant="caption" color="text.secondary">
                  暫無可選分類
                </Typography>
              )}
            </Stack>
          </Stack>
        )}
      </DialogContent>

      <DialogActions>
        {step === "verify" && (
          <Button variant="contained" onClick={advance}>
            下一步
          </Button>
        )}
        {step === "profile" && (
          <Button variant="contained" onClick={submitProfile} disabled={submitting}>
            {submitting ? <CircularProgress size={20} /> : "下一步"}
          </Button>
        )}
        {step === "interests" && (
          <>
            <Button onClick={() => finishInterests(true)} disabled={submitting}>
              略過
            </Button>
            <Button variant="contained" onClick={() => finishInterests(false)} disabled={submitting}>
              {submitting ? <CircularProgress size={20} /> : "完成"}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default OnboardingWizard;
