import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import axios from "axios";
import api, { authEvents, refreshSession, type TokenResponse } from "../../services/api";
import { setAccessToken } from "./token";
import { AuthContext, type AuthStatus, type UserAccessProfile } from "./auth-context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [profile, setProfile] = useState<UserAccessProfile | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const clearSession = useCallback(() => {
    setAccessToken(null); setProfile(null); setMustChangePassword(false); setStatus("anonymous");
  }, []);
  const loadAuthorizedProfile = useCallback(async () => {
    const { data } = await api.get<UserAccessProfile>("auth/me/");
    setProfile(data); setMustChangePassword(Boolean(data.debe_cambiar_password)); setStatus("authenticated");
    return data;
  }, []);
  useEffect(() => {
    let active = true;
    const required = () => setMustChangePassword(true);
    authEvents.addEventListener("session-expired", clearSession);
    authEvents.addEventListener("password-required", required);
    void refreshSession().then(async (tokens) => {
      if (!active) return;
      await loadAuthorizedProfile();
      if (active && tokens.debe_cambiar_password) setMustChangePassword(true);
    }).catch(() => { if (active) clearSession(); });
    return () => {
      active = false;
      authEvents.removeEventListener("session-expired", clearSession);
      authEvents.removeEventListener("password-required", required);
    };
  }, [clearSession, loadAuthorizedProfile]);
  const signIn = useCallback(async (correo: string, password: string) => {
    try {
      const { data } = await api.post<TokenResponse>("auth/login/", { correo: correo.trim().toLowerCase(), password });
      setAccessToken(data.access);
      const me = await loadAuthorizedProfile();
      setMustChangePassword(data.debe_cambiar_password || Boolean(me.debe_cambiar_password));
    } catch (error) {
      clearSession();
      throw new Error(axios.isAxiosError(error) && typeof error.response?.data?.detail === "string"
        ? error.response.data.detail : "No pudimos iniciar sesión. Verifica tu conexión e inténtalo nuevamente.", { cause: error });
    }
  }, [clearSession, loadAuthorizedProfile]);
  const signOut = useCallback(async () => {
    try { await api.post("auth/logout/"); } finally { clearSession(); }
  }, [clearSession]);
  const changePassword = useCallback(async (actual: string, nueva: string) => {
    const { data } = await api.post<TokenResponse>("auth/password/change/", { password_actual: actual, password_nueva: nueva });
    setAccessToken(data.access);
    await loadAuthorizedProfile();
    setMustChangePassword(data.debe_cambiar_password);
  }, [loadAuthorizedProfile]);
  const value = useMemo(() => ({ configured: true, profile, user: profile, status, loading: status === "loading", mustChangePassword,
    signIn, login: signIn, signOut, logout: signOut, changePassword, refreshProfile: async () => { await loadAuthorizedProfile(); } }),
    [profile, status, mustChangePassword, signIn, signOut, changePassword, loadAuthorizedProfile]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
