import { useAuth0 } from "@auth0/auth0-react";

export const useAuth = () => {
  const {
    loginWithRedirect,
    logout,
    user,
    isAuthenticated,
    getIdTokenClaims,
  } = useAuth0();

  return {
    login: loginWithRedirect,
    logout,
    user,
    isAuthenticated,
    getIdToken: getIdTokenClaims,
  };
};
