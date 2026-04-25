import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { USERNAME_MAX } from "@domain/room/constants";
import { generateGuestUsername } from "@domain/room/guestUsername";
import { useAuth } from "../../../shared/auth/AuthContext";
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
  } = useAuth();

  const [suggestedGuestUsername, setSuggestedGuestUsername] = useState(() =>
    generateGuestUsername(),
  );

  useEffect(() => {
    if (authUser || username) {
      navigate("/rooms", { replace: true });
    }
  }, [authUser, navigate, username]);

  const handleGuestContinue = () => {
    const fallbackName = suggestedGuestUsername;
    const nextUsername = usernameInput.trim() || fallbackName;

    if (!nextUsername) return;

    if (!usernameInput.trim()) {
      setUsernameInput(nextUsername);
    }

    handleSetUsername(nextUsername);
    navigate("/rooms", { replace: true });
  };

  const handleGoogleLogin = () => {
    loginWithGoogle();
  };

  const handleUseSuggestedUsername = () => {
    const nextGuestUsername = generateGuestUsername();

    setSuggestedGuestUsername(nextGuestUsername);
    setUsernameInput(nextGuestUsername);
  };

  return (
    <LandingPage
      usernameInput={usernameInput}
      onInputChange={setUsernameInput}
      onConfirm={handleGuestContinue}
      onGoogleLogin={handleGoogleLogin}
      googleLoading={authLoading}
      nicknameMaxLength={USERNAME_MAX}
      suggestedGuestUsername={suggestedGuestUsername}
      onUseSuggestedUsername={handleUseSuggestedUsername}
    />
  );
};

export default LandingHomePage;
