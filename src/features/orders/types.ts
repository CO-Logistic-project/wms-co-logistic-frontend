export type OrderStatus = "Pendiente" | "En Preparacion" | "Listo" | "Despachado" | "Cancelado";

export interface OrderUser {
  id_usuario: string;
  nombre: string;
  apellido: string;
  correo: string;
}

export interface PreparationLine {
  id_picking_detalle: number;
  id_reserva: number;
  id_stock: number;
  ubicacion: { id_ubicacion: number; codigo: string; zona: { id_zona: number; codigo: string; nombre: string } | null } | null;
  cantidad_solicitada: string;
  cantidad_confirmada: string;
  estado_reserva: string;
}

export interface OrderLine {
  id_pedido_detalle: number;
  producto: { id_producto: number; sku: string; nombre: string; controla_lote: boolean } | null;
  lote: { id_lote: number; codigo: string; fecha_vencimiento: string } | null;
  unidad: { codigo: string; nombre: string } | null;
  cantidad_solicitada: string;
  cantidad_preparada: string;
  cantidad_despachada: string;
  stock_disponible: string;
  preparacion: PreparationLine[];
}

export interface OrderItem {
  id_pedido_salida: number;
  codigo_documento: string;
  cliente: { id_cliente: number; razon_social: string; ruc: string } | null;
  fecha_programada: string;
  fecha_despacho: string | null;
  transporte_placa: string;
  transporte_conductor: string;
  estado: OrderStatus;
  responsable_registro: OrderUser | null;
  picking: { id_picking: number; estado: string; responsable: OrderUser | null; fecha_inicio: string | null; fecha_fin: string | null } | null;
  despacho: {
    id_despacho: number;
    codigo_documento_salida: string;
    fecha_despacho: string;
    responsable: OrderUser | null;
    observaciones: string;
    cantidad_lineas: number;
    incidencias: DispatchIncident[];
  } | null;
  cantidad_solicitada: string;
  cantidad_preparada: string;
  cantidad_despachada: string;
  progreso: number;
  tiempos: { preparacion_minutos: number | null; despacho_minutos: number | null; total_minutos: number | null };
  lineas: OrderLine[];
  fecha_registro: string;
  fecha_actualizacion: string;
}

export interface OrderFilters {
  cliente: string;
  estado: string;
  documento: string;
  responsable: string;
  fecha_desde: string;
  fecha_hasta: string;
}

export interface OrderOptions {
  clientes: Array<{ id_cliente: number; razon_social: string; ruc: string }>;
  productos: Array<{ id_producto: number; id_cliente: number; sku: string; nombre: string; controla_lote: boolean }>;
  lotes: Array<{ id_lote: number; id_producto: number; codigo: string; fecha_vencimiento: string; cantidad_disponible: string; sugerido_fefo: boolean }>;
  stocks: Array<{ id_stock: number; id_producto: number; id_lote: number | null; ubicacion: string | null; zona: string | null; cantidad_disponible: string }>;
  estados: OrderStatus[];
}

export interface DispatchIncident {
  id_incidencia_despacho: number;
  tipo: string;
  cantidad: string;
  descripcion: string;
  producto: { id_producto: number; sku: string; nombre: string } | null;
  responsable: OrderUser | null;
  fecha_registro: string;
}

export interface DispatchHistory {
  resumen: {
    despachos: number;
    unidades: string;
    preparacion_promedio_minutos: number | null;
    despacho_promedio_minutos: number | null;
    total_promedio_minutos: number | null;
  };
  resultados: OrderItem[];
}

export interface OrderDocument {
  numero_pedido_salida: string;
  pedido: OrderItem;
  generado_en: string;
}

export interface OrderCreatePayload {
  id_cliente: number;
  codigo_documento: string;
  fecha_programada: string;
  transporte_placa: string;
  transporte_conductor: string;
  lineas: Array<{ id_producto: number; id_lote: number | null; cantidad_solicitada: string }>;
}
