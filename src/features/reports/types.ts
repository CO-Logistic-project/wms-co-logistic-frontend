import type { MovementItem, StockItem } from "../inventory/types";
import type { OrderItem } from "../orders/types";
import type { ReceptionSummary } from "../receptions/types";

export interface ReportFilters {
  fecha_desde: string;
  fecha_hasta: string;
  almacen: string;
}

export interface OccupancyReport {
  id_almacen: number;
  codigo: string;
  nombre: string;
  capacidad: number;
  utilizada: number;
  disponible: number;
  porcentaje: number;
  ubicaciones_ocupadas: number;
  ubicaciones_libres: number;
  zonas: Array<{
    id_zona: number;
    codigo: string;
    nombre: string;
    tipo: string;
    capacidad: number;
    utilizada: number;
    disponible: number;
    porcentaje: number;
  }>;
}

export interface DashboardReport {
  periodo: { desde: string; hasta: string };
  kpis: {
    inventario_total: string;
    inventario_disponible: string;
    inventario_reservado: string;
    productos_con_stock: number;
    ubicaciones_ocupadas: number;
    ocupacion_porcentaje: number;
    recepciones: number;
    unidades_recibidas: string;
    despachos: number;
    unidades_despachadas: string;
    movimientos_internos: number;
    incidencias: number;
  };
  ocupacion: OccupancyReport[];
  alertas_ocupacion: OccupancyReport[];
  tendencia: Array<{ fecha: string; recepciones: number; despachos: number; movimientos: number }>;
  desempeno: {
    tiempo_recepcion_minutos: number;
    tiempo_preparacion_minutos: number;
    tiempo_despacho_minutos: number;
    operaciones_por_responsable: Array<{ id_usuario: string; responsable: string; operaciones: number }>;
  };
  recepciones_recientes: ReceptionSummary[];
  despachos_en_proceso: OrderItem[];
}

export interface MovementReportFilters {
  fecha_desde: string;
  fecha_hasta: string;
  producto: string;
  cliente: string;
  ubicacion: string;
  responsable: string;
  tipo_operacion: string;
  estado: string;
}

export interface TraceabilityEvent {
  tipo: "RECEPCION" | "MOVIMIENTO" | "DESPACHO" | "INCIDENCIA";
  fecha: string;
  titulo: string;
  documento: string;
  cantidad: string;
  detalle: string;
}

export interface TraceabilityProduct {
  producto: { id_producto: number; sku: string; nombre: string; codigo_ean: string };
  cliente: { id_cliente: number; razon_social: string; ruc: string } | null;
  lotes: Array<{ id_lote: number; codigo: string; fecha_vencimiento: string | null }>;
  stock_actual: StockItem[];
  eventos: TraceabilityEvent[];
}

export type ReportMovement = MovementItem;
export type ExportReportType = "inventario" | "recepciones" | "movimientos" | "despachos" | "ocupacion" | "trazabilidad";
export type ExportFormat = "pdf" | "xlsx";
