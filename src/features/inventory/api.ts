import api from "../../services/api";
import type {
  ExpirationAlert,
  InventoryFilters,
  InventoryOptions,
  MovementCreatePayload,
  MovementFilters,
  MovementItem,
  RepackingPayload,
  StockItem,
  WarehouseOccupancy,
} from "./types";

function compactParams(values: object) {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => String(value).trim()),
  );
}

export async function listStocks(filters: InventoryFilters) {
  const response = await api.get<StockItem[]>("inventory/stocks/", {
    params: compactParams(filters),
  });
  return response.data;
}

export async function getInventoryOptions() {
  const response = await api.get<InventoryOptions>("catalogs/inventory-options/");
  return response.data;
}

export async function getOccupancy() {
  const response = await api.get<WarehouseOccupancy[]>("inventory/occupancy/");
  return response.data;
}

export async function getExpirationAlerts(days: number, filters: InventoryFilters) {
  const response = await api.get<{ umbral_dias: number; resultados: ExpirationAlert[] }>(
    "inventory/expiration-alerts/",
    { params: compactParams({ ...filters, dias: days }) },
  );
  return response.data;
}

export async function listMovements(filters: MovementFilters) {
  const response = await api.get<MovementItem[]>("inventory/movements/", {
    params: compactParams(filters),
  });
  return response.data;
}

export async function createMovement(payload: MovementCreatePayload) {
  const response = await api.post<MovementItem>("inventory/movements/", payload);
  return response.data;
}

export async function confirmMovement(movementId: number) {
  const response = await api.post<MovementItem>(
    `inventory/movements/${movementId}/confirm/`,
  );
  return response.data;
}

export async function createRepacking(payload: RepackingPayload) {
  const response = await api.post<MovementItem>("inventory/repacking/", payload);
  return response.data;
}
