import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, expect, it } from "vitest";
import { AxiosError, AxiosHeaders } from "axios";
import api, { refreshSession } from "../../services/api";
import { AuthProvider } from "./AuthContext";
import { useAuth } from "./auth-context";
import { getAccessToken, setAccessToken } from "./token";
import Login from "../../pages/Login/Login";
import ProtectedRoute from "../../routes/ProtectedRoute";
import ChangePasswordPage from "../../pages/PasswordRecovery/ChangePasswordPage";
const original = api.defaults.adapter;
afterEach(() => { api.defaults.adapter = original; setAccessToken(null); });
function setup({ restore = false, pending = false, loginError = false, changeError = false } = {}) {
 const calls: string[] = [];
 api.defaults.adapter = async config => {
  calls.push(config.url || "");
  const result = (data: unknown, status = 200) => ({ config, data, status, statusText: "", headers: new AxiosHeaders() });
  const fail = (data: unknown, status: number) => Promise.reject(new AxiosError("error", "", config, null, result(data, status)));
  if (config.url === "auth/refresh/") return restore ? result({ access: "restored", debe_cambiar_password: pending }) : fail({}, 401);
  if (config.url === "auth/login/") return loginError ? fail({ detail: "Cuenta bloqueada por TI" }, 401) : result({ access: "logged-in", debe_cambiar_password: pending });
  if (config.url === "auth/me/") return result({ id: "self", correo: "a@b.com", nombre: "Ana", apellido: "", roles: [], permisos: [], debe_cambiar_password: pending });
  if (config.url === "auth/password/change/" && changeError) return fail({ password_actual: ["La clave actual es incorrecta."] }, 400);
  return result({ access: "changed", debe_cambiar_password: false });
 };
 return calls;
}
function Probe() { const auth = useAuth(); return <><p>{auth.status}</p><p>{auth.profile?.nombre}</p><button onClick={() => void auth.signOut()}>Logout</button></>; }
it("restores session on mount and logout clears the token", async () => {
 const calls = setup({ restore: true }); render(<AuthProvider><Probe /></AuthProvider>);
 expect(screen.getByText("loading")).toBeInTheDocument();
 await screen.findByText("Ana"); expect(getAccessToken()).toBe("restored");
 expect(calls).toEqual(["auth/refresh/", "auth/me/"]);
 fireEvent.click(screen.getByText("Logout")); await screen.findByText("anonymous"); expect(getAccessToken()).toBeNull();
});
function loginForm() {
 fireEvent.change(screen.getByLabelText("Correo electrónico"), { target: { value: "a@b.com" } });
 fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "Password1" } });
 fireEvent.click(screen.getByRole("button", { name: /ingresar$/i }));
}
it("logs in with a memory token and loads me", async () => {
 const calls = setup(); render(<MemoryRouter><AuthProvider><Login /><Probe /></AuthProvider></MemoryRouter>);
 await screen.findByText("anonymous"); loginForm(); await screen.findByText("Ana");
 expect(getAccessToken()).toBe("logged-in"); expect(calls).toContain("auth/me/");
});
it("shows the backend login detail on 401", async () => {
 setup({ loginError: true }); render(<MemoryRouter><AuthProvider><Login /></AuthProvider></MemoryRouter>);
 await screen.findByLabelText("Correo electrónico"); loginForm(); expect(await screen.findByRole("alert")).toHaveTextContent("Cuenta bloqueada por TI");
});
it("blocks other routes when password change is required and displays field errors", async () => {
 setup({ restore: true, pending: true, changeError: true });
 render(<MemoryRouter initialEntries={["/inventario"]}><AuthProvider><Routes>
 <Route path="/inventario" element={<ProtectedRoute><p>Private inventory</p></ProtectedRoute>} />
 <Route path="/cambiar-contrasena" element={<ProtectedRoute><ChangePasswordPage /></ProtectedRoute>} />
 </Routes></AuthProvider></MemoryRouter>);
 await screen.findByText("Debes cambiar tu contraseña para continuar."); expect(screen.queryByText("Private inventory")).not.toBeInTheDocument();
 fireEvent.change(screen.getByLabelText("Contraseña actual"), { target: { value: "Oldpass1" } });
 fireEvent.change(screen.getByLabelText("Nueva contraseña"), { target: { value: "Newpass2" } });
 fireEvent.change(screen.getByLabelText("Confirmar contraseña"), { target: { value: "Newpass2" } });
 fireEvent.click(screen.getByRole("button", { name: "Cambiar contraseña" }));
 await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("La clave actual es incorrecta."));
});

it("redirects to login when a refresh fails during an authenticated session", async () => {
 setup({ restore: true });
 render(<MemoryRouter><AuthProvider><Routes>
 <Route path="/" element={<ProtectedRoute><Probe /></ProtectedRoute>} />
 <Route path="/login" element={<p>Login destination</p>} />
 </Routes></AuthProvider></MemoryRouter>);
 await screen.findByText("Ana"); setup();
 await refreshSession().catch(() => {});
 expect(await screen.findByText("Login destination")).toBeInTheDocument();
 expect(getAccessToken()).toBeNull();
});
it("rejects invalid passwords locally and unlocks the app after a successful change", async () => {
 setup({ restore: true, pending: true });
 render(<MemoryRouter initialEntries={["/cambiar-contrasena"]}><AuthProvider><Routes>
 <Route path="/cambiar-contrasena" element={<ProtectedRoute><ChangePasswordPage /></ProtectedRoute>} />
 <Route path="/" element={<ProtectedRoute><p>Unlocked</p></ProtectedRoute>} />
 </Routes></AuthProvider></MemoryRouter>);
 await screen.findByLabelText("Nueva contraseña");
 fireEvent.change(screen.getByLabelText("Contraseña actual"), { target: { value: "Oldpass1" } });
 fireEvent.change(screen.getByLabelText("Nueva contraseña"), { target: { value: "short" } });
 fireEvent.click(screen.getByRole("button", { name: "Cambiar contraseña" }));
 expect(screen.getByText("Debe tener al menos 8 caracteres, letras y números.")).toBeInTheDocument();
 expect(screen.getByText("Las contraseñas no coinciden.")).toBeInTheDocument();
 setup({ restore: true });
 fireEvent.change(screen.getByLabelText("Nueva contraseña"), { target: { value: "Newpass2" } });
 fireEvent.change(screen.getByLabelText("Confirmar contraseña"), { target: { value: "Newpass2" } });
 fireEvent.click(screen.getByRole("button", { name: "Cambiar contraseña" }));
 expect(await screen.findByText("Unlocked")).toBeInTheDocument();
 expect(getAccessToken()).toBe("changed");
});
