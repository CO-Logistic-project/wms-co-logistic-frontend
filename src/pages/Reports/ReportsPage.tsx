import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Activity, AlertTriangle, ArrowDownToLine, ArrowRightLeft, BarChart3, Boxes, Clock3, FileDown, RefreshCw, Truck, Warehouse } from "lucide-react";
import { getApiMessage } from "../../features/access/api";
import { downloadReport, getDashboardReport, getMovementReport } from "../../features/reports/api";
import type { DashboardReport, ExportFormat, ExportReportType, MovementReportFilters, ReportFilters, ReportMovement } from "../../features/reports/types";

type ViewMode = "dashboard" | "movimientos";

function isoDate(value: Date) { return value.toISOString().slice(0, 10); }
const today = new Date();
const monthAgo = new Date(today); monthAgo.setDate(today.getDate() - 29);
const INITIAL_FILTERS: ReportFilters = { fecha_desde: isoDate(monthAgo), fecha_hasta: isoDate(today), almacen: "" };
const INITIAL_MOVEMENT_FILTERS: MovementReportFilters = { fecha_desde: isoDate(monthAgo), fecha_hasta: isoDate(today), producto: "", cliente: "", ubicacion: "", responsable: "", tipo_operacion: "", estado: "" };

function number(value: string | number) { return new Intl.NumberFormat("es-PE", { maximumFractionDigits: 2 }).format(Number(value)); }
function minutes(value: number) { return value >= 60 ? `${Math.floor(value / 60)} h ${Math.round(value % 60)} min` : `${Math.round(value)} min`; }
function shortDate(value: string) { return new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short" }).format(new Date(`${value}T12:00:00`)); }
function dateTime(value: string | null) { return value ? new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—"; }

export default function ReportsPage() {
  const [mode, setMode] = useState<ViewMode>("dashboard");
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [applied, setApplied] = useState(INITIAL_FILTERS);
  const [movementFilters, setMovementFilters] = useState(INITIAL_MOVEMENT_FILTERS);
  const [appliedMovement, setAppliedMovement] = useState(INITIAL_MOVEMENT_FILTERS);
  const [dashboard, setDashboard] = useState<DashboardReport | null>(null);
  const [movements, setMovements] = useState<ReportMovement[]>([]);
  const [exportType, setExportType] = useState<ExportReportType>("inventario");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [dashboardData, movementData] = await Promise.all([getDashboardReport(applied), getMovementReport(appliedMovement)]);
      setDashboard(dashboardData); setMovements(movementData);
    } catch (currentError) { setError(getApiMessage(currentError)); }
    finally { setLoading(false); }
  }, [applied, appliedMovement]);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  const chartMax = useMemo(() => Math.max(1, ...(dashboard?.tendencia.flatMap((item) => [item.recepciones, item.despachos, item.movimientos]) ?? [1])), [dashboard]);

  function applyDashboard(event: FormEvent) { event.preventDefault(); setApplied(filters); }
  function applyMovements(event: FormEvent) { event.preventDefault(); setAppliedMovement(movementFilters); }
  async function exportFile(format: ExportFormat) {
    setExporting(true); setError(null);
    try { await downloadReport(exportType, format, { ...appliedMovement, almacen: applied.almacen }); }
    catch (currentError) { setError(getApiMessage(currentError)); }
    finally { setExporting(false); }
  }

  return <section className="management-page reports-page">
    <header className="page-heading"><div><span className="page-eyebrow">EP-06 · Reportes y BI</span><h1>Inteligencia logística</h1><p>KPIs, ocupación, desempeño y análisis histórico con datos operativos en tiempo real.</p></div><div className="page-actions"><button className="secondary-button" type="button" onClick={() => setMode((current) => current === "dashboard" ? "movimientos" : "dashboard")}><ArrowRightLeft size={15}/>{mode === "dashboard" ? "Historial de movimientos" : "Ver dashboard"}</button><button className="secondary-button" type="button" onClick={() => void load()} disabled={loading}><RefreshCw size={15}/>Actualizar</button></div></header>
    {error && <div className="inline-alert" role="alert"><span>{error}</span><button type="button" onClick={() => void load()}>Reintentar</button></div>}

    {mode === "dashboard" ? <>
      <form className="product-filters report-filters" onSubmit={applyDashboard}>
        <label>Desde<input type="date" value={filters.fecha_desde} onChange={(event) => setFilters((current) => ({ ...current, fecha_desde: event.target.value }))}/></label>
        <label>Hasta<input type="date" value={filters.fecha_hasta} onChange={(event) => setFilters((current) => ({ ...current, fecha_hasta: event.target.value }))}/></label>
        <label>Almacén<input value={filters.almacen} onChange={(event) => setFilters((current) => ({ ...current, almacen: event.target.value }))} placeholder="Todos los almacenes"/></label>
        <div className="filter-actions"><button className="action-button" type="submit">Actualizar periodo</button></div>
      </form>
      {loading || !dashboard ? <div className="content-loading"><span className="loading-spinner"/>Calculando indicadores…</div> : <>
        <div className="bi-kpi-grid">
          <article><span className="metric-symbol blue"><Boxes size={20}/></span><div><small>Stock disponible</small><strong>{number(dashboard.kpis.inventario_disponible)}</strong><span>{number(dashboard.kpis.inventario_reservado)} reservado</span></div></article>
          <article><span className="metric-symbol violet"><Warehouse size={20}/></span><div><small>Ocupación</small><strong>{dashboard.kpis.ocupacion_porcentaje}%</strong><span>{dashboard.kpis.ubicaciones_ocupadas} ubicaciones con stock</span></div></article>
          <article><span className="metric-symbol green"><ArrowDownToLine size={20}/></span><div><small>Recepciones</small><strong>{dashboard.kpis.recepciones}</strong><span>{number(dashboard.kpis.unidades_recibidas)} unidades</span></div></article>
          <article><span className="metric-symbol amber"><Truck size={20}/></span><div><small>Despachos</small><strong>{dashboard.kpis.despachos}</strong><span>{number(dashboard.kpis.unidades_despachadas)} unidades</span></div></article>
          <article><span className="metric-symbol blue"><ArrowRightLeft size={20}/></span><div><small>Movimientos</small><strong>{dashboard.kpis.movimientos_internos}</strong><span>En el periodo</span></div></article>
          <article><span className="metric-symbol red"><AlertTriangle size={20}/></span><div><small>Incidencias</small><strong>{dashboard.kpis.incidencias}</strong><span>Recepción y despacho</span></div></article>
        </div>

        <div className="bi-dashboard-grid">
          <section className="bi-panel trend-panel"><header><div><h2>Actividad operativa</h2><p>Recepciones, despachos y movimientos por día.</p></div><BarChart3 size={20}/></header><div className="trend-legend"><span className="inbound">Recepciones</span><span className="outbound">Despachos</span><span className="movement">Movimientos</span></div><div className="trend-chart">{dashboard.tendencia.map((item, index) => <div className="trend-day" key={item.fecha} title={`${item.fecha}: ${item.recepciones} recepciones, ${item.despachos} despachos, ${item.movimientos} movimientos`}><div className="trend-bars"><i className="inbound" style={{ height: `${Math.max(3, item.recepciones / chartMax * 100)}%` }}/><i className="outbound" style={{ height: `${Math.max(3, item.despachos / chartMax * 100)}%` }}/><i className="movement" style={{ height: `${Math.max(3, item.movimientos / chartMax * 100)}%` }}/></div>{(index === 0 || index === dashboard.tendencia.length - 1 || index % 7 === 0) && <small>{shortDate(item.fecha)}</small>}</div>)}</div></section>
          <section className="bi-panel performance-panel"><header><div><h2>Eficiencia del proceso</h2><p>Promedios calculados para el periodo.</p></div><Clock3 size={20}/></header><div className="duration-list"><article><span>Recepción</span><strong>{minutes(dashboard.desempeno.tiempo_recepcion_minutos)}</strong></article><article><span>Preparación</span><strong>{minutes(dashboard.desempeno.tiempo_preparacion_minutos)}</strong></article><article><span>Despacho total</span><strong>{minutes(dashboard.desempeno.tiempo_despacho_minutos)}</strong></article></div><h3>Operaciones por responsable</h3><div className="operator-list">{dashboard.desempeno.operaciones_por_responsable.slice(0, 6).map((item) => <div key={item.id_usuario}><span>{item.responsable}</span><b>{item.operaciones}</b></div>)}{!dashboard.desempeno.operaciones_por_responsable.length && <p>Sin actividad registrada.</p>}</div></section>
        </div>

        <section className="bi-panel occupancy-report"><header><div><h2>Capacidad y ocupación</h2><p>Disponibilidad por almacén y desglose por zona.</p></div><Warehouse size={20}/></header><div className="occupancy-report-grid">{dashboard.ocupacion.map((item) => <article key={item.id_almacen}><div className="occupancy-heading"><div><strong>{item.nombre}</strong><small>{item.utilizada} usadas · {item.disponible} disponibles</small></div><b className={item.porcentaje >= 85 ? "danger" : ""}>{item.porcentaje}%</b></div><div className="occupancy-track"><span className={item.porcentaje >= 85 ? "danger" : ""} style={{ width: `${Math.min(item.porcentaje, 100)}%` }}/></div><div className="zone-grid">{item.zonas.map((zone) => <span key={zone.id_zona}><b>{zone.codigo}</b><small>{zone.utilizada}/{zone.capacidad} · {zone.porcentaje}%</small></span>)}</div></article>)}</div></section>
      </>}
    </> : <>
      <form className="product-filters movement-report-filters" onSubmit={applyMovements}>
        <label>Desde<input type="date" value={movementFilters.fecha_desde} onChange={(event) => setMovementFilters((current) => ({ ...current, fecha_desde: event.target.value }))}/></label><label>Hasta<input type="date" value={movementFilters.fecha_hasta} onChange={(event) => setMovementFilters((current) => ({ ...current, fecha_hasta: event.target.value }))}/></label><label>Producto<input value={movementFilters.producto} onChange={(event) => setMovementFilters((current) => ({ ...current, producto: event.target.value }))} placeholder="SKU o nombre"/></label><label>Cliente<input value={movementFilters.cliente} onChange={(event) => setMovementFilters((current) => ({ ...current, cliente: event.target.value }))} placeholder="Cliente o RUC"/></label><label>Ubicación<input value={movementFilters.ubicacion} onChange={(event) => setMovementFilters((current) => ({ ...current, ubicacion: event.target.value }))} placeholder="Origen o destino"/></label><label>Responsable<input value={movementFilters.responsable} onChange={(event) => setMovementFilters((current) => ({ ...current, responsable: event.target.value }))} placeholder="Nombre o correo"/></label><label>Operación<select value={movementFilters.tipo_operacion} onChange={(event) => setMovementFilters((current) => ({ ...current, tipo_operacion: event.target.value }))}><option value="">Todas</option><option value="TRASLADO">Traslado</option><option value="REEMPAQUE">Reempaque</option></select></label><label>Estado<select value={movementFilters.estado} onChange={(event) => setMovementFilters((current) => ({ ...current, estado: event.target.value }))}><option value="">Todos</option><option value="PENDIENTE">Pendiente</option><option value="CONFIRMADO">Confirmado</option><option value="CANCELADO">Cancelado</option></select></label><div className="filter-actions"><button className="action-button" type="submit">Filtrar</button></div>
      </form>
      <div className="data-card">{loading ? <div className="content-loading"><span className="loading-spinner"/>Consultando movimientos…</div> : movements.length === 0 ? <div className="empty-state"><Activity size={30}/><strong>No hay movimientos para los filtros</strong><span>Amplía el periodo o modifica los criterios.</span></div> : <table className="data-table"><thead><tr><th>Movimiento</th><th>Producto / cliente</th><th>Origen → destino</th><th>Responsable</th><th>Fecha</th><th>Cantidad</th><th>Estado</th></tr></thead><tbody>{movements.map((item) => <tr key={item.id_movimiento}><td><strong>{item.tipo}</strong><br/><small>#{item.id_movimiento}</small></td><td>{item.lineas[0]?.producto?.nombre ?? "—"}<br/><small>{item.lineas[0]?.cliente?.razon_social ?? "—"}</small></td><td>{item.lineas[0]?.origen?.codigo ?? "—"} → {item.lineas[0]?.destino?.codigo ?? "—"}</td><td>{item.responsable_registro ? `${item.responsable_registro.nombre} ${item.responsable_registro.apellido}` : "—"}</td><td>{dateTime(item.fecha_registro)}</td><td>{number(item.cantidad_total)}</td><td><span className={`reception-status ${item.estado === "CONFIRMADO" ? "received" : "pending"}`}><i/>{item.estado}</span></td></tr>)}</tbody></table>}</div>
    </>}

    <section className="export-panel"><div><span className="metric-symbol violet"><FileDown size={20}/></span><div><h2>Centro de exportación</h2><p>Descarga inventario, recepciones, movimientos, despachos, ocupación o trazabilidad.</p></div></div><select value={exportType} onChange={(event) => setExportType(event.target.value as ExportReportType)}><option value="inventario">Inventario</option><option value="recepciones">Recepciones</option><option value="movimientos">Movimientos</option><option value="despachos">Despachos</option><option value="ocupacion">Ocupación</option><option value="trazabilidad">Trazabilidad</option></select><button className="secondary-button" type="button" disabled={exporting} onClick={() => void exportFile("pdf")}>PDF</button><button className="action-button" type="button" disabled={exporting} onClick={() => void exportFile("xlsx")}>Excel</button></section>
  </section>;
}
