import axios, { type InternalAxiosRequestConfig } from "axios";
import { getAccessToken, setAccessToken } from "../features/auth/token";

export const authEvents = new EventTarget();
export interface TokenResponse { access: string; expires_in: number; debe_cambiar_password: boolean }
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || "/api/", withCredentials: true, headers: { "Content-Type": "application/json" } });
let refreshPromise: Promise<TokenResponse> | null = null;
export function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = api.post<TokenResponse>("auth/refresh/").then(({ data }) => {
      setAccessToken(data.access);
      if (data.debe_cambiar_password) authEvents.dispatchEvent(new Event("password-required"));
      return data;
    }).catch((error: unknown) => {
      setAccessToken(null);
      authEvents.dispatchEvent(new Event("session-expired"));
      throw error;
    }).finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  else config.headers.delete("Authorization");
  return config;
});
api.interceptors.response.use((response) => response, async (error) => {
  const config = error.config as (InternalAxiosRequestConfig & { retried?: boolean }) | undefined;
  if (error.response?.status === 403 && error.response.data?.code === "password_change_required") {
    authEvents.dispatchEvent(new Event("password-required"));
  }
  if (error.response?.status !== 401 || !config || /auth\/(login|refresh|logout)\/?$/.test(config.url || "")) throw error;
  if (config.retried) {
    setAccessToken(null);
    authEvents.dispatchEvent(new Event("session-expired"));
    throw error;
  }
  config.retried = true;
  // A late 401 for an old token can reuse the refresh that already completed.
  if (config.headers.Authorization === `Bearer ${getAccessToken()}` || !getAccessToken()) await refreshSession();
  return api(config);
});
export default api;
