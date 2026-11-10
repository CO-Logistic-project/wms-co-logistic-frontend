import api from "../../services/api";
import type { DashboardReport, ExportFormat, ExportReportType, MovementReportFilters, ReportFilters, ReportMovement, TraceabilityProduct } from "./types";

function compactParams(values: object) {
  return Object.fromEntries(Object.entries(values).filter(([, value]) => String(value ?? "").trim()));
}

export async function getDashboardReport(filters: ReportFilters) {
  const response = await api.get<DashboardReport>("reports/dashboard/", { params: compactParams(filters) });
  return response.data;
}

export async function getMovementReport(filters: MovementReportFilters) {
  const response = await api.get<ReportMovement[]>("reports/movements/", { params: compactParams(filters) });
  return response.data;
}

export async function getTraceability(filters: { producto: string; lote: string; cliente: string }) {
  const response = await api.get<TraceabilityProduct[]>("reports/traceability/", { params: compactParams(filters) });
  return response.data;
}

export async function downloadReport(type: ExportReportType, format: ExportFormat, filters: Record<string, string>) {
  const response = await api.get<Blob>("reports/export/", {
    params: compactParams({ tipo: type, formato: format, ...filters }),
    responseType: "blob",
  });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = `wms-${type}.${format}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
