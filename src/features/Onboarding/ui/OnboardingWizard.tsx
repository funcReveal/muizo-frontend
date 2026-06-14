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
  MenuItem,
  Stack,
  TextField,
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

const GENDER_OPTIONS: Array<{
  value: OnboardingGender;
  label: string;
  detail: string;
}> = [
  { value: "male", label: "男性", detail: "用於推薦與統計分析" },
  { value: "female", label: "女性", detail: "用於推薦與統計分析" },
  { value: "non_binary", label: "非二元", detail: "保留更貼近你的選項" },
  { value: "other", label: "其他", detail: "使用自訂或未列出的身分" },
  { value: "prefer_not_to_say", label: "不願透露", detail: "仍可完成帳號設定" },
];

type Props = {
  state: OnboardingState;
  onClose: () => void;
  presentation?: "dialog" | "page";
};

const currentYear = new Date().getFullYear();
const birthYears = Array.from({ length: 101 }, (_, index) =>
  String(currentYear - index),
);
const birthMonths = Array.from({ length: 12 }, (_, index) =>
  String(index + 1).padStart(2, "0"),
);

const parseBirthDate = (value: string | null) => {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return {
    year: match?.[1] ?? "",
    month: match?.[2] ?? "",
    day: match?.[3] ?? "",
  };
};

const getDaysInMonth = (year: string, month: string) => {
  if (!year || !month) return 31;
  return new Date(Number(year), Number(month), 0).getDate();
};

const buildBirthDate = (year: string, month: string, day: string) => {
  if (!year || !month || !day) return "";
  return `${year}-${month}-${day}`;
};

const OnboardingWizard: React.FC<Props> = ({
  state,
  onClose,
  presentation = "dialog",
}) => {
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
  const initialBirthDate = useMemo(
    () => parseBirthDate(state.birthDate),
    [state.birthDate],
  );
  const [birthYear, setBirthYear] = useState(initialBirthDate.year);
  const [birthMonth, setBirthMonth] = useState(initialBirthDate.month);
  const [birthDay, setBirthDay] = useState(initialBirthDate.day);
  const birthDate = buildBirthDate(birthYear, birthMonth, birthDay);
  const birthDays = useMemo(
    () =>
      Array.from({ length: getDaysInMonth(birthYear, birthMonth) }, (_, index) =>
        String(index + 1).padStart(2, "0"),
      ),
    [birthMonth, birthYear],
  );
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

  useEffect(() => {
    if (!birthDay) return;
    if (Number(birthDay) <= getDaysInMonth(birthYear, birthMonth)) return;
    setBirthDay("");
  }, [birthDay, birthMonth, birthYear]);

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

  const title = (
    <>
        {step === "verify" && "驗證你的 Email"}
        {step === "profile" && "完善你的個人資料"}
        {step === "interests" && "選擇感興趣的題庫分類"}
    </>
  );

  const content = (
    <>
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
            <div className="grid gap-2 sm:grid-cols-2">
              {GENDER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setGender(option.value)}
                  className={`min-h-16 rounded-2xl border px-4 py-3 text-left transition ${
                    gender === option.value
                      ? "border-teal-200/60 bg-teal-200/12 text-teal-50 shadow-[0_18px_42px_-34px_rgba(45,212,191,0.9),inset_0_1px_0_rgba(255,255,255,0.12)]"
                      : "border-white/10 bg-slate-950/42 text-slate-200 hover:border-amber-200/26 hover:bg-white/[0.045]"
                  }`}
                >
                  <span className="block text-sm font-black">{option.label}</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-400">
                    {option.detail}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              生日
            </Typography>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1.15fr_0.9fr_0.9fr]">
              <TextField
                select
                label="年份"
                value={birthYear}
                onChange={(event) => setBirthYear(event.target.value)}
                size="small"
                fullWidth
              >
                {birthYears.map((year) => (
                  <MenuItem key={year} value={year}>
                    {year}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="月份"
                value={birthMonth}
                onChange={(event) => setBirthMonth(event.target.value)}
                size="small"
                fullWidth
              >
                {birthMonths.map((month) => (
                  <MenuItem key={month} value={month}>
                    {Number(month)} 月
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="日期"
                value={birthDay}
                onChange={(event) => setBirthDay(event.target.value)}
                size="small"
                fullWidth
                disabled={!birthYear || !birthMonth}
              >
                {birthDays.map((day) => (
                  <MenuItem key={day} value={day}>
                    {Number(day)} 日
                  </MenuItem>
                ))}
              </TextField>
            </div>
            <Typography
              variant="caption"
              sx={{ mt: 0.75, display: "block", color: "rgba(203,213,225,0.66)" }}
            >
              生日只用於年齡判斷與內容推薦，不會公開顯示。
            </Typography>
          </div>

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
    </>
  );

  const actions = (
    <>
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
    </>
  );

  if (presentation === "page") {
    return (
      <main className="mx-auto grid w-full max-w-4xl gap-4 px-1 pb-10 pt-2 text-[var(--mc-text)] sm:px-3">
        <section className="overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(520px_280px_at_12%_0%,rgba(45,212,191,0.12),transparent_66%),linear-gradient(135deg,rgba(255,255,255,0.075),rgba(255,255,255,0.018)_44%,rgba(5,8,12,0.72))] p-4 shadow-[0_30px_90px_-64px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.08)] sm:p-7">
          <div className="mb-5 flex flex-col gap-2 sm:mb-7">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-200/78">
              Account Setup
            </p>
            <h1 className="text-2xl font-black leading-tight text-slate-50 sm:text-4xl">
              {title}
            </h1>
            <p className="max-w-[64ch] text-sm leading-6 text-slate-300/78">
              補上基本資料後，Muizo 才能把題庫推薦、排行榜與帳號內容綁定到正確的會員資料。
            </p>
          </div>

          <div className="rounded-[22px] border border-white/10 bg-slate-950/42 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:p-6">
            {content}
          </div>

          <div className="mt-5 flex justify-end gap-2">{actions}</div>
        </section>
      </main>
    );
  }

  return (
    <Dialog open fullWidth maxWidth="sm" disableEscapeKeyDown>
      <DialogTitle>{title}</DialogTitle>

      <DialogContent dividers>{content}</DialogContent>

      <DialogActions>
        {actions}
      </DialogActions>
    </Dialog>
  );
};

export default OnboardingWizard;
