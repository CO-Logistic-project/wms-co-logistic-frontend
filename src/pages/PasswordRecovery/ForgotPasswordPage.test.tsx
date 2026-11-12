import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, it } from "vitest";
import ForgotPasswordPage from "./ForgotPasswordPage";
it("directs recovery to TI and links to login", () => {
 render(<MemoryRouter><ForgotPasswordPage /></MemoryRouter>);
 expect(screen.getByText("Para restablecer tu contraseña, contacta al Administrador TI.")).toBeInTheDocument();
 expect(screen.getByRole("link")).toHaveAttribute("href", "/login");
});
