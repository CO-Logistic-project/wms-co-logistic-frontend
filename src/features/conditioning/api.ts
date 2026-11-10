import api from "../../services/api";
import type { ConditioningOptions, ConditioningService, ReboxingPayload, RepalletExecutionPayload, RepalletRequestPayload } from "./types";

export async function getConditioningServices(params: Record<string, string> = {}) {
  return (await api.get<ConditioningService[]>("conditioning/services/", { params })).data;
}

export async function getConditioningOptions() {
  return (await api.get<ConditioningOptions>("conditioning/options/")).data;
}

export async function createRepalletRequest(payload: RepalletRequestPayload) {
  return (await api.post<ConditioningService>("conditioning/repallet-requests/", payload)).data;
}

export async function executeRepallet(id: number, payload: RepalletExecutionPayload) {
  return (await api.post<ConditioningService>(`conditioning/services/${id}/execute-repallet/`, payload)).data;
}

export async function createReboxing(payload: ReboxingPayload) {
  return (await api.post<ConditioningService>("conditioning/reboxing/", payload)).data;
}

export async function sendConditioningToBilling(id: number) {
  return (await api.post<ConditioningService>(`conditioning/services/${id}/send-billing/`)).data;
}

async function download(path: string, filename: string) {
  const response = await api.get<Blob>(path, { responseType: "blob" });
  const url = URL.createObjectURL(response.data);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadConditioningService(id: number, code: string, format: "pdf" | "xlsx") {
  return download(`conditioning/services/${id}/report/?formato=${format}`, `${code}.${format}`);
}

export function downloadConditioningBilling(format: "pdf" | "xlsx") {
  return download(`conditioning/billing-report/?formato=${format}`, `acondicionamiento-facturacion.${format}`);
}
