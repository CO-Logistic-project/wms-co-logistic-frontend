export type StockStatus = "DISP" | "RES" | "BLOQ" | "INV";
export type MovementStatus = "PENDIENTE" | "CONFIRMADO" | "CANCELADO";

export interface StockItem {
  id_stock: number;
  producto: { id_producto: number; sku: string; nombre: string } | null;
  cliente: { id_cliente: number; razon_social: string } | null;
  almacen: { id_almacen: number; codigo: string; nombre: string } | null;
  zona: { id_zona: number; codigo: string; nombre: string } | null;
  ubicacion: {
    id_ubicacion: number;
    codigo: string;
    pasillo: string;
    rack: string;
    nivel: string;
    posicion: string;
  } | null;
  lote: { id_lote: number; codigo: string; fecha_vencimiento: string } | null;
  pallet: { id_pallet: number; codigo_barras: string; id_pallet_padre: number | null } | null;
  cantidad_total: string;
  cantidad_reservada: string;
  cantidad_disponible: string;
  estado: StockStatus;
  estado_nombre: string;
  fecha_actualizacion: string;
}

export interface InventoryFilters {
  producto: string;
  cliente: string;
  almacen: string;
  ubicacion: string;
  lote: string;
  fecha_vencimiento: string;
  estado: string;
}

export interface InventoryOptions {
  almacenes: Array<{ id_almacen: number; codigo: string; nombre: string }>;
  ubicaciones: Array<{ id_ubicacion: number; codigo: string; id_almacen: number | null }>;
  estados_stock: Array<{ codigo: StockStatus; nombre: string }>;
  estados_movimiento: MovementStatus[];
}

export interface WarehouseOccupancy {
  id_almacen: number;
  codigo: string;
  nombre: string;
  capacidad: number;
  utilizada: number;
  disponible: number;
  porcentaje: number;
  ubicaciones: Array<{
    id_ubicacion: number;
    codigo: string;
    zona: string;
    ocupada: boolean;
    pallets: number;
    cantidad_stock: string;
  }>;
}

export interface ExpirationAlert extends StockItem {
  dias_restantes: number;
  nivel: "VENCIDO" | "CRITICO" | "PROXIMO";
}

export interface MovementDetail {
  id_movimiento_detalle: number;
  id_stock_origen: number;
  id_stock_destino: number | null;
  producto: StockItem["producto"];
  cliente: StockItem["cliente"];
  lote: StockItem["lote"];
  pallet_origen: StockItem["pallet"];
  id_pallet_destino: number | null;
  origen: { id_ubicacion: number; codigo: string } | null;
  destino: { id_ubicacion: number; codigo: string } | null;
  cantidad: string;
}

export interface MovementItem {
  id_movimiento: number;
  tipo: "TRASLADO" | "REEMPAQUE";
  motivo: string;
  estado: MovementStatus;
  responsable_registro: { nombre: string; apellido: string; correo: string } | null;
  responsable_confirmacion: { nombre: string; apellido: string; correo: string } | null;
  fecha_registro: string;
  fecha_confirmacion: string | null;
  lineas: MovementDetail[];
  cantidad_total: string;
}

export interface MovementFilters {
  fecha_desde: string;
  fecha_hasta: string;
  tipo: string;
  producto: string;
  origen: string;
  destino: string;
  responsable: string;
  estado: string;
}

export interface MovementCreatePayload {
  motivo: string;
  lineas: Array<{
    id_stock_origen: number;
    id_ubicacion_destino: number;
    id_pallet_destino?: number | null;
    cantidad: string;
  }>;
}

export interface RepackingPayload {
  id_stock_origen: number;
  motivo: string;
  fracciones: Array<{ codigo_pallet: string; cantidad: string }>;
}
