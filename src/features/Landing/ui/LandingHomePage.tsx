import React from "react";

import { useAuth } from "../../../shared/auth/AuthContext";
import LandingPage from "./LandingPage";

const LandingHomePage: React.FC = () => {
  const {
    loginWithGoogle,
    loginWithEmail,
    registerWithEmail,
    resendEmailVerification,
    requestPasswordReset,
    authLoading,
  } = useAuth();

  const handleGoogleLogin = () => {
    loginWithGoogle();
  };

  return (
    <LandingPage
      onGoogleLogin={handleGoogleLogin}
      onEmailLogin={loginWithEmail}
      onEmailRegister={registerWithEmail}
      onPasswordResetRequest={requestPasswordReset}
      onResendVerification={resendEmailVerification}
      authLoading={authLoading}
    />
  );
};

export default LandingHomePage;
