import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext(null);
const API_URL = import.meta.env.VITE_BACKEND_URL;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(localStorage.getItem('veras_user') || null);
  const [token, setToken] = useState(localStorage.getItem('veras_token') || null);

  const login = (jwtToken, username) => {
    localStorage.setItem('veras_token', jwtToken);
    localStorage.setItem('veras_user', username);
    setToken(jwtToken);
    setUser(username);
  };

  const logout = () => {
    localStorage.removeItem('veras_token');
    localStorage.removeItem('veras_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);