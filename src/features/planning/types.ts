export interface CapacityDay {
  fecha: string;
  ingresos_programados: number;
  salidas_programadas: number;
  ingresos_reales: number;
  salidas_reales: number;
  ocupacion_planificada: number;
  porcentaje_planificado: number;
  ocupacion_real: number | null;
  porcentaje_real: number | null;
  diferencia: number | null;
}

export interface WarehousePlan {
  id_almacen: number;
  codigo: string;
  nombre: string;
  capacidad: number;
  ocupacion_actual: number;
  disponible_actual: number;
  porcentaje_actual: number;
  pico_planificado: number;
  serie: CapacityDay[];
}

export interface CapacityAlert {
  id_almacen: number;
  almacen: string;
  codigo: string;
  fecha: string;
  porcentaje: number;
  ocupacion: number;
  capacidad: number;
  nivel: "ALERTA" | "CRITICO" | "SATURADO";
}

export interface ScheduledOperation {
  tipo: "RECEPCION" | "DESPACHO";
  documento: string;
  fecha: string;
  almacen_id: number;
  producto: string;
  pallets: number;
  estado: string;
}

export interface CapacityPlan {
  periodo: { desde: string; hasta: string };
  umbral: number;
  almacenes: WarehousePlan[];
  alertas: CapacityAlert[];
  operaciones: ScheduledOperation[];
}

export interface PlanningFilters {
  fecha_desde: string;
  fecha_hasta: string;
  almacen: string;
  cliente: string;
  umbral: string;
}
