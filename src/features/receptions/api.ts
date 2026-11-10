import api from "../../services/api";
import type {
  IncidentPayload,
  LocationAssignmentPayload,
  ReceptionCreatePayload,
  ReceptionDetail,
  ReceptionDocument,
  ReceptionFilters,
  ReceptionOptions,
  ReceptionLotsPayload,
  ReceptionSummary,
  ReceptionValidationPayload,
} from "./types";

export async function listReceptions(filters: ReceptionFilters) {
  const response = await api.get<ReceptionSummary[]>("receipts/", {
    params: Object.fromEntries(
      Object.entries(filters).filter(([, value]) => value.trim()),
    ),
  });
  return response.data;
}

export async function getReception(receiptId: number) {
  const response = await api.get<ReceptionDetail>(`receipts/${receiptId}/`);
  return response.data;
}

export async function getReceptionDocument(receiptId: number) {
  const response = await api.get<ReceptionDocument>(
    `receipts/${receiptId}/document/`,
  );
  return response.data;
}

export async function createReception(payload: ReceptionCreatePayload) {
  const response = await api.post<ReceptionDetail>("receipts/", payload);
  return response.data;
}

export async function validateReception(
  receiptId: number,
  payload: ReceptionValidationPayload,
) {
  const response = await api.post<ReceptionDetail>(
    `receipts/${receiptId}/validate/`,
    payload,
  );
  return response.data;
}

export async function assignReceptionLocation(
  receiptId: number,
  payload: LocationAssignmentPayload,
) {
  const response = await api.post<ReceptionDetail>(
    `receipts/${receiptId}/assign-location/`,
    payload,
  );
  return response.data;
}

export async function registerReceptionLots(
  receiptId: number,
  payload: ReceptionLotsPayload,
) {
  const response = await api.post<ReceptionDetail>(
    `receipts/${receiptId}/lots/`,
    payload,
  );
  return response.data;
}

export async function createReceptionIncident(
  receiptId: number,
  payload: IncidentPayload,
) {
  const response = await api.post<{ id_incidencia: number; recepcion: ReceptionDetail }>(
    `receipts/${receiptId}/incidents/`,
    payload,
  );
  return response.data.recepcion;
}

export async function getReceptionOptions() {
  const response = await api.get<ReceptionOptions>(
    "catalogs/reception-options/",
  );
  return response.data;
}
