import { afterEach, expect, it, vi } from "vitest";
import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from "axios";
import api, { authEvents, refreshSession } from "./api";
import { getAccessToken, setAccessToken } from "../features/auth/token";
const original = api.defaults.adapter;
afterEach(() => { api.defaults.adapter = original; setAccessToken(null); });
function response(config: InternalAxiosRequestConfig, data: unknown, status = 200) {
 return { config, data, status, statusText: "", headers: new AxiosHeaders() };
}
function unauthorized(config: InternalAxiosRequestConfig) {
 return Promise.reject(new AxiosError("Unauthorized", "401", config, null, response(config, {}, 401)));
}
it("shares one refresh for parallel 401s and retries with the new token", async () => {
 setAccessToken("old"); let refreshes = 0; let retries = 0;
 api.defaults.adapter = async config => {
  expect(config.withCredentials).toBe(true);
  if (config.url === "auth/refresh/") { refreshes++; await new Promise(resolve => setTimeout(resolve, 10)); return response(config, { access: "new" }); }
  if (config.headers.Authorization === "Bearer old") return unauthorized(config);
  expect(config.headers.Authorization).toBe("Bearer new"); retries++; return response(config, {});
 };
 await Promise.all([api.get("inventory/"), api.get("users/")]);
 expect(refreshes).toBe(1); expect(retries).toBe(2); expect(getAccessToken()).toBe("new");
});
it("clears the token and notifies auth when refresh fails", async () => {
 const expired = vi.fn(); authEvents.addEventListener("session-expired", expired);
 setAccessToken("old"); api.defaults.adapter = unauthorized;
 await expect(api.get("users/")).rejects.toThrow();
 expect(getAccessToken()).toBeNull(); expect(expired).toHaveBeenCalledOnce();
 authEvents.removeEventListener("session-expired", expired);
});
it("does not refresh a failed login", async () => {
 const adapter = vi.fn(unauthorized); api.defaults.adapter = adapter;
 await expect(api.post("auth/login/", {})).rejects.toThrow(); expect(adapter).toHaveBeenCalledOnce();
});
it("signals required password changes", async () => {
 const required = vi.fn(); authEvents.addEventListener("password-required", required);
 api.defaults.adapter = config => Promise.reject(new AxiosError("Forbidden", "403", config, null, response(config, { code: "password_change_required" }, 403)));
 await expect(api.get("users/")).rejects.toThrow(); expect(required).toHaveBeenCalledOnce();
 authEvents.removeEventListener("password-required", required);
});
it("restores a token through cookie refresh", async () => {
 api.defaults.adapter = async config => response(config, { access: "restored" });
 await refreshSession(); expect(getAccessToken()).toBe("restored");
});
