import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { USERNAME_MAX } from "../../Room/model/roomConstants";
import { useRoom } from "../../Room/model/useRoom";
import LandingPage from "./LandingPage";

const LandingHomePage: React.FC = () => {
  const navigate = useNavigate();
  const {
    authUser,
    username,
    usernameInput,
    setUsernameInput,
    handleSetUsername,
    loginWithGoogle,
    authLoading,
  } = useRoom();

  useEffect(() => {
    if (authUser || username) {
      navigate("/rooms", { replace: true });
    }
  }, [authUser, navigate, username]);

  const handleGuestContinue = () => {
    const trimmed = usernameInput.trim();
    if (!trimmed) return;
    handleSetUsername();
    navigate("/rooms", { replace: true });
  };

  const handleGoogleLogin = () => {
    loginWithGoogle();
  };

  return (
    <LandingPage
      usernameInput={usernameInput}
      onInputChange={setUsernameInput}
      onConfirm={handleGuestContinue}
      onGoogleLogin={handleGoogleLogin}
      googleLoading={authLoading}
      nicknameMaxLength={USERNAME_MAX}
    />
  );
};

export default LandingHomePage;
