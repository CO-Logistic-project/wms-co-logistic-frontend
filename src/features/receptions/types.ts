export type ReceptionStatus =
  | "Pendiente"
  | "En Proceso"
  | "Recibido"
  | "Con Discrepancia"
  | "Cancelado";

export interface ReceptionUser {
  id_usuario: string;
  nombre: string;
  apellido: string;
  correo: string;
}

export interface ReceptionClient {
  id_cliente: number;
  razon_social: string;
  ruc: string;
}

export interface ReceptionSummary {
  id_pedido_ingreso: number;
  codigo_documento: string;
  id_cliente: number;
  cliente: ReceptionClient | null;
  fecha_programada: string;
  fecha_recepcion: string | null;
  transporte_placa: string;
  transporte_conductor: string;
  transporte_brevete: string;
  estado: ReceptionStatus;
  responsable: ReceptionUser | null;
  cantidad_lineas: number;
  cantidad_esperada: string;
  cantidad_recibida: string;
  cantidad_discrepancia: string;
  cantidad_incidencias: number;
  fecha_registro: string;
  fecha_actualizacion: string;
}

export interface ReceptionDiscrepancy {
  id_discrepancia: number;
  tipo: "FALTANTE" | "SOBRANTE" | "RECHAZADO";
  cantidad: string;
  descripcion: string;
  fecha_registro: string;
}

export interface ReceptionAssignment {
  id_asignacion: number;
  cantidad: string;
  fecha_asignacion: string;
  ubicacion: { id_ubicacion: number; codigo: string } | null;
  lote: {
    id_lote: number;
    codigo: string;
    fecha_vencimiento: string;
  } | null;
}

export interface ReceptionLot {
  id_pedido_ingreso_lote: number;
  id_lote: number;
  codigo: string;
  fecha_fabricacion: string | null;
  fecha_vencimiento: string;
  cantidad: string;
}

export interface ReceptionLine {
  id_pedido_ingreso_detalle: number;
  id_producto: number;
  producto: { id_producto: number; sku: string; nombre: string } | null;
  codigo_producto: string;
  descripcion_producto: string;
  controla_lote: boolean;
  cantidad_pallets: string;
  factor_conversion: string | null;
  cantidad_cajas: string | null;
  id_unidad_medida: number;
  unidad_medida: { codigo: string; nombre: string } | null;
  cantidad_esperada: string;
  cantidad_recibida: string;
  cantidad_rechazada: string;
  discrepancias: ReceptionDiscrepancy[];
  asignaciones: ReceptionAssignment[];
  lotes: ReceptionLot[];
}

export interface ReceptionIncident {
  id_incidencia: number;
  id_pedido_ingreso_detalle: number;
  tipo: "DIFERENCIA" | "DANO" | "DOCUMENTO" | "CALIDAD" | "OTRO";
  descripcion: string;
  cantidad_afectada: string;
  responsable: ReceptionUser | null;
  fecha_registro: string;
}

export interface ReceptionDetail extends ReceptionSummary {
  lineas: ReceptionLine[];
  incidencias: ReceptionIncident[];
}

export interface ReceptionFilters {
  documento: string;
  cliente: string;
  producto: string;
  estado: string;
  responsable: string;
  fecha_desde: string;
  fecha_hasta: string;
}

export interface ReceptionCreatePayload {
  id_cliente: number;
  codigo_documento: string;
  fecha_programada: string;
  transporte_placa: string;
  transporte_conductor: string;
  transporte_brevete: string;
  lineas: Array<{
    id_producto: number;
    cantidad_esperada: string;
    cantidad_pallets: string;
  }>;
}

export interface ReceptionOptions {
  clientes: ReceptionClient[];
  productos: Array<{
    id_producto: number;
    id_cliente: number;
    id_unidad_medida: number;
    sku: string;
    nombre: string;
    controla_lote: boolean;
    factor_conversion: string | null;
  }>;
  ubicaciones: Array<{
    id_ubicacion: number;
    codigo: string;
    pasillo: string;
    rack: string;
    nivel: string;
    posicion: string;
    zona: string | null;
    almacen: string | null;
  }>;
  estados: ReceptionStatus[];
}

export interface ReceptionValidationPayload {
  documento_verificado: boolean;
  lineas: Array<{
    id_pedido_ingreso_detalle: number;
    cantidad_recibida: string;
    cantidad_rechazada: string;
    observacion: string;
  }>;
}

export interface LocationAssignmentPayload {
  id_pedido_ingreso_detalle: number;
  id_pedido_ingreso_lote: number | null;
  id_ubicacion: number;
  cantidad: string;
}

export interface ReceptionLotsPayload {
  id_pedido_ingreso_detalle: number;
  lotes: Array<{
    codigo: string;
    fecha_fabricacion: string | null;
    fecha_vencimiento: string;
    cantidad: string;
  }>;
}

export interface ReceptionDocument extends ReceptionDetail {
  numero_pedido_ingreso: string;
}

export interface IncidentPayload {
  id_pedido_ingreso_detalle: number;
  tipo: ReceptionIncident["tipo"];
  descripcion: string;
  cantidad_afectada: string;
}
