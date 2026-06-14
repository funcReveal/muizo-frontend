import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@shared/auth/AuthContext";
import { onboardingApi } from "../model/onboardingApi";
import OnboardingWizard from "./OnboardingWizard";

/**
 * Shows the onboarding wizard once per session when a logged-in user has not completed
 * onboarding. Mount once inside the authenticated app shell. Reaching the wizard's later
 * steps already persists completion server-side, so dismissing for the session is safe.
 */
const OnboardingGate: React.FC = () => {
  const { authUser, authToken, refreshAuthToken } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  const { data } = useQuery({
    queryKey: ["onboarding", authUser?.id],
    queryFn: () => onboardingApi.get({ authToken, refreshAuthToken }),
    enabled: Boolean(authUser),
    staleTime: 5 * 60 * 1000,
  });

  if (!authUser || dismissed || !data || data.onboardingCompleted) {
    return null;
  }

  return <OnboardingWizard state={data} onClose={() => setDismissed(true)} />;
};

export default OnboardingGate;
