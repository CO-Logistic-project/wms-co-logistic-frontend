import api from "../../services/api";
import type { DispatchHistory, OrderCreatePayload, OrderDocument, OrderFilters, OrderItem, OrderOptions } from "./types";

function compactParams(values: object) {
  return Object.fromEntries(Object.entries(values).filter(([, value]) => String(value).trim()));
}

export async function listOrders(filters: OrderFilters) {
  const response = await api.get<OrderItem[]>("orders/", { params: compactParams(filters) });
  return response.data;
}

export async function getOrderOptions() {
  const response = await api.get<OrderOptions>("catalogs/order-options/");
  return response.data;
}

export async function createOrder(payload: OrderCreatePayload) {
  const response = await api.post<OrderItem>("orders/", payload);
  return response.data;
}

export async function validateOrderStock(orderId: number) {
  const response = await api.post<OrderItem>(`orders/${orderId}/validate-stock/`);
  return response.data;
}

export async function confirmOrderPreparation(orderId: number, lines: Array<{ id_picking_detalle: number; cantidad_confirmada: string }>) {
  const response = await api.post<OrderItem>(`orders/${orderId}/prepare/`, { lineas: lines });
  return response.data;
}

export async function closeOrderDispatch(orderId: number, payload: { codigo_documento_salida: string; observaciones: string }) {
  const response = await api.post<OrderItem>(`orders/${orderId}/dispatch/`, payload);
  return response.data;
}

export async function cancelOrder(orderId: number) {
  const response = await api.post<OrderItem>(`orders/${orderId}/cancel/`);
  return response.data;
}

export async function getOrderDocument(orderId: number) {
  const response = await api.get<OrderDocument>(`orders/${orderId}/document/`);
  return response.data;
}

export async function listDispatchHistory(filters: Omit<OrderFilters, "estado"> & { producto: string }) {
  const response = await api.get<DispatchHistory>("dispatches/history/", { params: compactParams(filters) });
  return response.data;
}

export async function createDispatchIncident(orderId: number, payload: { id_pedido_detalle: number; tipo: string; cantidad: string; descripcion: string }) {
  const response = await api.post<OrderItem>(`orders/${orderId}/dispatch/incidents/`, payload);
  return response.data;
}
