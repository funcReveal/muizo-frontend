import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../../shared/auth/AuthContext";
import LandingPage from "./LandingPage";

const LandingHomePage: React.FC = () => {
  const navigate = useNavigate();
  const {
    authUser,
    loginWithGoogle,
    loginWithEmail,
    registerWithEmail,
    resendEmailVerification,
    requestPasswordReset,
    authLoading,
  } = useAuth();

  useEffect(() => {
    if (authUser) {
      navigate("/rooms", { replace: true });
    }
  }, [authUser, navigate]);

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
