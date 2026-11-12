import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import UsersPage from "./UsersPage";
const mocks = vi.hoisted(() => ({ reset: vi.fn(), permissions: ["usuarios.editar"] }));
vi.mock("../../features/auth/auth-context", () => ({ useAuth: () => ({ profile: { id: "self", permisos: mocks.permissions }, refreshProfile: vi.fn() }) }));
vi.mock("../../features/access/api", () => ({
 resetUserPassword: mocks.reset, getApiMessage: () => "Error", listRoles: vi.fn(), assignUserRoles: vi.fn(), createUser: vi.fn(), setUserStatus: vi.fn(), updateUser: vi.fn(),
 listUsers: async () => ["self", "other"].map(id => ({ id_usuario: id, nombre: id, apellido: "", correo: `${id}@example.com`, roles: [], estado: true, fecha_registro: "2026-01-01" })),
}));
beforeEach(() => { mocks.permissions = ["usuarios.editar"]; mocks.reset.mockReset(); });
it("confirms admin reset, displays and copies the key once, then discards it on close", async () => {
 mocks.reset.mockResolvedValue({ id_usuario: "other", password_temporal: "Temporary123" });
 const copy = vi.fn().mockResolvedValue(undefined); Object.defineProperty(navigator, "clipboard", { value: { writeText: copy }, configurable: true });
 render(<UsersPage />);
 const reset = await screen.findByRole("button", { name: "Restablecer contraseña" });
 expect(screen.getAllByRole("button", { name: "Restablecer contraseña" })).toHaveLength(1);
 fireEvent.click(reset); expect(mocks.reset).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole("button", { name: "Confirmar restablecimiento" }));
 const key = await screen.findByText("Temporary123"); expect(key).toBeInTheDocument(); expect(mocks.reset).toHaveBeenCalledWith("other");
 expect(screen.getByText("El usuario deberá cambiarla al ingresar")).toBeInTheDocument();
 fireEvent.click(screen.getByRole("button", { name: "Copiar" })); expect(copy).toHaveBeenCalledWith("Temporary123");
 fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cerrar" }));
 expect(screen.queryByText("Temporary123")).not.toBeInTheDocument();
 fireEvent.click(reset); expect(screen.queryByText("Temporary123")).not.toBeInTheDocument();
});
it("hides reset without usuarios.editar", async () => {
 mocks.permissions = []; render(<UsersPage />); await screen.findByText("other@example.com");
 expect(screen.queryByRole("button", { name: "Restablecer contraseña" })).not.toBeInTheDocument();
});
