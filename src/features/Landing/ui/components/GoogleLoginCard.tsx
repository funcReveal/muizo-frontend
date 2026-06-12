import React from "react";

import AuthEntryPanel from "@shared/ui/auth/AuthEntryPanel";

interface GoogleLoginCardProps {
  onGoogleLogin: () => void;
  onEmailLogin: (
    email: string,
    password: string,
  ) => Promise<{ ok: boolean; error?: string | null }>;
  onEmailRegister: (
    email: string,
    password: string,
    displayName?: string | null,
  ) => Promise<{ ok: boolean; error?: string | null }>;
  onPasswordResetRequest: (email: string) => Promise<boolean>;
  onResendVerification: (email: string) => Promise<boolean>;
  authLoading: boolean;
}

const GoogleLoginCard: React.FC<GoogleLoginCardProps> = (props) => {
  return (
    <article className="landing-auth-card" aria-label="登入 Muizo">
      <AuthEntryPanel {...props} />
    </article>
  );
};

export default GoogleLoginCard;
