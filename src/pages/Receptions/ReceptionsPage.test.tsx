import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ReceptionsPage from "./ReceptionsPage";

const receptionApi = vi.hoisted(() => ({
  assignReceptionLocation: vi.fn(),
  createReception: vi.fn(),
  createReceptionIncident: vi.fn(),
  getReception: vi.fn(),
  getReceptionOptions: vi.fn(),
  listReceptions: vi.fn(),
  validateReception: vi.fn(),
}));

vi.mock("../../features/receptions/api", () => receptionApi);
vi.mock("../../features/auth/auth-context", () => ({
  useAuth: () => ({
    profile: {
      permisos: [
        "recepciones.ver",
        "recepciones.crear",
        "recepciones.validar",
        "recepciones.asignar_ubicacion",
        "recepciones.incidencias",
      ],
    },
  }),
}));

describe("ReceptionsPage", () => {
  beforeEach(() => {
    receptionApi.listReceptions.mockReset().mockResolvedValue([]);
    receptionApi.createReception.mockReset();
    receptionApi.getReceptionOptions.mockReset().mockResolvedValue({
      clientes: [{ id_cliente: 1, razon_social: "Cliente Demo", ruc: "20123456789" }],
      productos: [{ id_producto: 8, id_cliente: 1, id_unidad_medida: 2, sku: "SKU-08", nombre: "Producto demo" }],
      ubicaciones: [],
      estados: ["Pendiente", "Recibido", "Con Discrepancia"],
    });
  });

  it("requires the guide and client before creating a reception", async () => {
    render(<ReceptionsPage />);
    await waitFor(() => expect(receptionApi.listReceptions).toHaveBeenCalled());

    fireEvent.click(screen.getAllByRole("button", { name: /nueva recepción/i })[0]);
    const dialog = within(screen.getByRole("dialog"));
    fireEvent.change(dialog.getByLabelText("Cliente propietario"), {
      target: { value: "1" },
    });
    const submit = dialog.getByRole("button", { name: "Registrar recepción" });
    fireEvent.submit(submit.closest("form")!);

    expect(dialog.getByRole("alert")).toHaveTextContent(
      "Completa el cliente, la guía de remisión y la fecha programada.",
    );
    expect(receptionApi.createReception).not.toHaveBeenCalled();
  });
});
