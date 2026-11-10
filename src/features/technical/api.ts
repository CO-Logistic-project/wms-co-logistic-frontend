import api from "../../services/api";
import type { AuditEvent, BackupData, BackupRecord, BackupSchedule, DeploymentRecord, IntegrationExecution, PerformanceData, ReleaseVersion, RetentionPolicy, TechnicalOverview } from "./types";

export async function getTechnicalOverview() { return (await api.get<TechnicalOverview>("technical/overview/")).data; }
export async function runHealthCheck() { return (await api.post<TechnicalOverview["salud"]>("technical/health/check/")).data; }
export async function getBackups() { return (await api.get<BackupData>("technical/backups/")).data; }
export async function createBackup() { return (await api.post<BackupRecord>("technical/backups/")).data; }
export async function validateBackup(id: number) { return (await api.post<BackupRecord>(`technical/backups/${id}/validate/`)).data; }
export async function restoreBackup(id: number, confirmacion: string) { return (await api.post(`technical/backups/${id}/restore/`, { confirmacion })).data; }
export async function getBackupSchedule() { return (await api.get<BackupSchedule>("technical/backups/schedule/")).data; }
export async function updateBackupSchedule(payload: Pick<BackupSchedule, "activa" | "frecuencia_horas" | "retencion_dias">) { return (await api.patch<BackupSchedule>("technical/backups/schedule/", payload)).data; }
export async function getAuditEvents(params: Record<string, string> = {}) { return (await api.get<AuditEvent[]>("technical/audit/", { params })).data; }
export async function exportAudit() { const response = await api.get<Blob>("technical/audit/export/", { responseType: "blob" }); const url = URL.createObjectURL(response.data); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "auditoria-wms.csv"; anchor.click(); URL.revokeObjectURL(url); }
export async function getPerformance(days = 7) { return (await api.get<PerformanceData>("technical/performance/", { params: { dias: days } })).data; }
export async function getRetentionPolicies() { return (await api.get<RetentionPolicy[]>("technical/retention/")).data; }
export async function saveRetentionPolicy(payload: Omit<RetentionPolicy, "id_politica" | "fecha_actualizacion">) { return (await api.post<RetentionPolicy>("technical/retention/", payload)).data; }
export async function getIntegrations() { return (await api.get<IntegrationExecution[]>("technical/integrations/")).data; }
export async function retryIntegration(id: number) { return (await api.post<IntegrationExecution>(`technical/integrations/${id}/retry/`)).data; }
export async function getReleases() { return (await api.get<ReleaseVersion[]>("technical/releases/")).data; }
export async function createRelease(payload: { version: string; descripcion: string; plan_reversion: string }) { return (await api.post<ReleaseVersion>("technical/releases/", payload)).data; }
export async function approveRelease(id: number) { return (await api.post<ReleaseVersion>(`technical/releases/${id}/approve/`)).data; }
export async function getDeployments() { return (await api.get<DeploymentRecord[]>("technical/deployments/")).data; }
export async function deployRelease(id_version: number, confirmacion: string) { return (await api.post<DeploymentRecord>("technical/deployments/", { id_version, ambiente: "PRODUCCION", confirmacion })).data; }
export async function rollbackDeployment(id: number, confirmacion: string) { return (await api.post<DeploymentRecord>(`technical/deployments/${id}/rollback/`, { confirmacion })).data; }
