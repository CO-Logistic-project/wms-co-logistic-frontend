export interface HealthComponent { componente: string; estado: string; detalle: string }
export interface TechnicalOverview {
  salud: { estado: string; disponibilidad: number; servicios_activos: number; servicios_total: number; componentes: HealthComponent[]; consultado_en: string };
  fallos_registrados: Array<{ id_incidente: number; componente: string; estado: string; fecha_inicio: string; fecha_fin: string | null; duracion_segundos: number; detalle: string }>;
  ultimo_respaldo: BackupRecord | null;
  ultimo_despliegue: DeploymentRecord | null;
  conteos: { respaldos_validos: number; integraciones_fallidas: number; eventos_auditoria: number; incidentes_abiertos: number };
}

export interface BackupRecord { id_respaldo: number; tipo: string; estado: string; fecha_inicio: string; fecha_fin: string | null; usuario: string; archivo: string; tamano_bytes: number; checksum_sha256: string; motor: string; valido: boolean; resultado: string }
export interface BackupData { respaldos: BackupRecord[]; restauraciones: Array<{ id_restauracion: number; id_respaldo: number; estado: string; fecha_inicio: string; fecha_fin: string | null; usuario: string; resultado: string }>; restauracion_habilitada: boolean }
export interface BackupSchedule { id_programacion: number; activa: boolean; frecuencia_horas: number; retencion_dias: number; proxima_ejecucion: string | null; ultima_ejecucion: string | null; fecha_actualizacion: string }
export interface AuditEvent { id_evento: number; usuario: string; fecha: string; modulo: string; accion: string; metodo: string; ruta: string; datos_afectados: Record<string, unknown>; estado_http: number; resultado: string; direccion_ip: string }
export interface PerformanceMetric { id_metrica: number; fecha: string; metodo: string; ruta: string; estado_http: number; duracion_ms: number; memoria_mb: number | null; consultas_db: number; error: string }
export interface PerformanceData { periodo_dias: number; limite_ms: number; solicitudes: number; promedio_ms: number; maximo_ms: number; errores: number; operaciones_lentas: PerformanceMetric[]; recientes: PerformanceMetric[] }
export interface RetentionPolicy { id_politica: number; categoria: string; periodo_dias: number; eliminacion_habilitada: boolean; protege_operaciones: boolean; descripcion: string; fecha_actualizacion: string }
export interface IntegrationExecution { id_ejecucion: number; integracion: string; operacion: string; estado: string; fecha_inicio: string; fecha_fin: string | null; datos_procesados: number; detalle_error: string; reintento_de: number | null; intentos: number }
export interface ReleaseVersion { id_version: number; version: string; descripcion: string; plan_reversion: string; aprobada: boolean; fecha_registro: string; fecha_aprobacion: string | null }
export interface DeploymentRecord { id_despliegue: number; id_version: number; version: string; ambiente: string; estado: string; id_respaldo_previo: number | null; version_anterior: string; fecha_inicio: string; fecha_fin: string | null; usuario: string; resultado: string }
