import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Login from "./Login";

const signIn = vi.fn();

vi.mock("../../features/auth/auth-context", () => ({
  useAuth: () => ({
    configured: true,
    profile: null,
    signIn,
    status: "anonymous",
  }),
}));

describe("Login", () => {
  beforeEach(() => {
    signIn.mockReset();
  });

  it("requires both credentials before submitting", () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /ingresar$/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Ingresa tu correo y contraseña.",
    );
    expect(signIn).not.toHaveBeenCalled();
  });

  it("shows the error detail when credentials are rejected", async () => {
    signIn.mockRejectedValueOnce(new Error("Correo o contraseña incorrectos."));
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("Correo electrónico"), {
      target: { value: "persona@empresa.com" },
    });
    fireEvent.change(screen.getByLabelText("Contraseña"), {
      target: { value: "incorrecta" },
    });
    fireEvent.click(screen.getByRole("button", { name: /ingresar$/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Correo o contraseña incorrectos.",
      );
    });
    expect(signIn).toHaveBeenCalledWith(
      "persona@empresa.com",
      "incorrecta",
    );
  });

  it("allows users to reveal and hide the password", () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );
    const password = screen.getByLabelText("Contraseña");

    expect(password).toHaveAttribute("type", "password");
    fireEvent.click(screen.getByRole("button", { name: "Mostrar contraseña" }));
    expect(password).toHaveAttribute("type", "text");
    fireEvent.click(screen.getByRole("button", { name: "Ocultar contraseña" }));
    expect(password).toHaveAttribute("type", "password");
  });
});
