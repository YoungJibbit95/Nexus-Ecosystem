import React, { createContext, useContext } from "react";

const AuthContext = createContext({
  user: null,
  isAuthenticated: false,
  isLoadingAuth: false,
  isLoadingPublicSettings: false,
  authError: null,
  appPublicSettings: null,
  logout: () => {},
  navigateToLogin: () => {},
  checkAppState: () => {},
});

export const AuthProvider = ({ children }) => {
  return (
    <AuthContext.Provider
      value={{
        user: null,
        isAuthenticated: false,
        isLoadingAuth: false,
        isLoadingPublicSettings: false,
        authError: null,
        appPublicSettings: null,
        logout: () => {},
        navigateToLogin: () => {},
        checkAppState: () => {},
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
