import React from "react";
import { PrivacyTipRounded } from "@mui/icons-material";
import { Alert, CircularProgress, FormControlLabel, Link, Switch, Typography } from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@shared/auth/AuthContext";
import { onboardingApi } from "@features/Onboarding";
import SettingsSectionCard from "./SettingsSectionCard";

type Props = { sectionId?: string };

/**
 * Account-level marketing/commercial-analytics consent toggle (opt-in). Lets a user change
 * the choice made during onboarding at any time; under-13 accounts are locked off.
 */
const MarketingConsentSettingsPanel: React.FC<Props> = ({ sectionId }) => {
  const { authUser, authToken, refreshAuthToken } = useAuth();
  const queryClient = useQueryClient();
  const auth = { authToken, refreshAuthToken };

  const { data, isLoading } = useQuery({
    queryKey: ["onboarding", authUser?.id],
    queryFn: () => onboardingApi.get(auth),
    enabled: Boolean(authUser),
  });

  const mutation = useMutation({
    mutationFn: (next: boolean) => onboardingApi.updateConsent(auth, next),
    onSuccess: (state) => queryClient.setQueryData(["onboarding", authUser?.id], state),
  });

  return (
    <SettingsSectionCard
      id={sectionId ?? "data-privacy"}
      icon={<PrivacyTipRounded fontSize="small" />}
      title="資料與隱私"
      description="管理我們如何使用你的資料。"
    >
      {!authUser ? (
        <Typography variant="body2" color="text.secondary">
          登入後即可管理資料使用偏好。
        </Typography>
      ) : isLoading || !data ? (
        <CircularProgress size={20} />
      ) : (
        <div className="space-y-2">
          <FormControlLabel
            control={
              <Switch
                checked={data.marketingConsent}
                disabled={data.ageRestricted || mutation.isPending}
                onChange={(e) => mutation.mutate(e.target.checked)}
              />
            }
            label={
              <Typography variant="body2">
                同意以<b>彙總／去識別</b>形式，將我的資料用於內容分析與商業合作。詳見{" "}
                <Link href="/privacy" target="_blank" rel="noopener">
                  隱私政策
                </Link>
                。
              </Typography>
            }
          />
          {data.ageRestricted && (
            <Alert severity="info">未滿 13 歲的帳號不適用此項，資料不會用於商業分析。</Alert>
          )}
          {mutation.isError && <Alert severity="error">更新失敗，請稍後再試。</Alert>}
        </div>
      )}
    </SettingsSectionCard>
  );
};

export default MarketingConsentSettingsPanel;
