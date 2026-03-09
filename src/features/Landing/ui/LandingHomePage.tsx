import React from "react";

import { USERNAME_MAX } from "../../Room/model/roomConstants";
import { useRoom } from "../../Room/model/useRoom";
import LandingPage from "./LandingPage";

const LandingHomePage: React.FC = () => {
  const { usernameInput, setUsernameInput, handleSetUsername, loginWithGoogle, authLoading } =
    useRoom();

  return (
    <LandingPage
      usernameInput={usernameInput}
      onInputChange={setUsernameInput}
      onConfirm={handleSetUsername}
      onGoogleLogin={loginWithGoogle}
      googleLoading={authLoading}
      nicknameMaxLength={USERNAME_MAX}
    />
  );
};

export default LandingHomePage;
