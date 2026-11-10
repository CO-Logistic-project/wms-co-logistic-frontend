import type { StockItem } from "../inventory/types";

export type ConditioningType = "REPALETIZADO" | "REENCAJADO";
export type ConditioningStatus = "SOLICITADO" | "EN_PROCESO" | "COMPLETADO";
export type BillingStatus = "PENDIENTE" | "GENERADO" | "ENVIADO";

export interface ConditioningService {
  id_servicio: number;
  codigo: string;
  tipo: ConditioningType;
  estado: ConditioningStatus;
  descripcion: string;
  cantidad: string;
  facturable: boolean;
  estado_facturacion: BillingStatus;
  tarifa: string;
  unidad_facturacion: "PALLET" | "UNIDAD";
  unidades_facturables: string | number;
  importe_total: string;
  cliente: { id_cliente: number; razon_social: string; ruc: string } | null;
  stock: StockItem | null;
  detalle: {
    id_stock: number;
    id_pallet_origen?: number | null;
    id_pallet_destino?: number | null;
    codigo_pallet_destino?: string;
    numero_paletas?: number;
    cliente_provee_pallet_destino?: boolean;
    tipo_pallet_destino?: string;
    certificacion_destino?: string;
    cantidad_cajas_origen?: number;
    cantidad_cajas_destino?: number;
  } | null;
  responsable_solicitud: { nombre: string; apellido: string; correo: string } | null;
  responsable_ejecucion: { nombre: string; apellido: string; correo: string } | null;
  fecha_solicitud: string;
  fecha_ejecucion: string | null;
  fecha_reporte: string | null;
  observaciones: string;
}

export interface ConditioningOptions {
  clientes: Array<{ id_cliente: number; razon_social: string; ruc: string }>;
  stocks: StockItem[];
}

export interface RepalletRequestPayload {
  codigo: string;
  id_cliente: number;
  id_stock: number;
  descripcion: string;
  cantidad: string;
  cliente_provee_pallet_destino: boolean;
  tipo_pallet_destino: string;
  certificacion_destino: string;
  observaciones: string;
}

export interface RepalletExecutionPayload {
  cantidad: string;
  numero_paletas: number;
  tarifa: string;
  codigo_pallet_destino: string;
  tipo_pallet_destino: string;
  certificacion_destino: string;
  descripcion: string;
  observaciones: string;
}

export interface ReboxingPayload {
  codigo: string;
  id_stock: number;
  descripcion: string;
  cantidad: string;
  cantidad_cajas_origen: number;
  cantidad_cajas_destino: number;
  tarifa: string;
  observaciones: string;
}
