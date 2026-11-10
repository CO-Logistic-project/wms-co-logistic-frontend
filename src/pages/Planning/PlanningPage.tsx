import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, CalendarRange, Gauge, RefreshCw, UsersRound, Warehouse } from "lucide-react";
import { getApiMessage } from "../../features/access/api";
import { getCapacityPlan } from "../../features/planning/api";
import type { CapacityPlan, PlanningFilters, WarehousePlan } from "../../features/planning/types";

function isoDate(value: Date) { return value.toISOString().slice(0, 10); }
const today = new Date();
const end = new Date(today); end.setDate(today.getDate() + 30);
const INITIAL_FILTERS: PlanningFilters = { fecha_desde: isoDate(today), fecha_hasta: isoDate(end), almacen: "", cliente: "", umbral: "85" };
function shortDate(value: string) { return new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short" }).format(new Date(`${value}T12:00:00`)); }

function linePoints(warehouse: WarehousePlan, key: "porcentaje_planificado" | "porcentaje_real") {
  const width = 1000;
  const points = warehouse.serie.map((row, index) => {
    const x = warehouse.serie.length === 1 ? 0 : index / (warehouse.serie.length - 1) * width;
    const value = row[key];
    if (value === null) return null;
    return `${x},${250 - Math.min(Number(value), 120) / 120 * 220}`;
  });
  return points.filter(Boolean).join(" ");
}

export default function PlanningPage() {
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [applied, setApplied] = useState(INITIAL_FILTERS);
  const [data, setData] = useState<CapacityPlan | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const response = await getCapacityPlan(applied);
      setData(response);
      setSelectedId((current) => response.almacenes.some((item) => item.id_almacen === current) ? current : response.almacenes[0]?.id_almacen ?? null);
    } catch (currentError) { setError(getApiMessage(currentError)); }
    finally { setLoading(false); }
  }, [applied]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  const selected = data?.almacenes.find((item) => item.id_almacen === selectedId) ?? null;
  const summary = useMemo(() => ({
    capacity: data?.almacenes.reduce((sum, item) => sum + item.capacidad, 0) ?? 0,
    used: data?.almacenes.reduce((sum, item) => sum + item.ocupacion_actual, 0) ?? 0,
    available: data?.almacenes.reduce((sum, item) => sum + item.disponible_actual, 0) ?? 0,
    peak: Math.max(0, ...(data?.almacenes.map((item) => item.pico_planificado) ?? [])),
    inbound: data?.operaciones.filter((item) => item.tipo === "RECEPCION").reduce((sum, item) => sum + item.pallets, 0) ?? 0,
    outbound: data?.operaciones.filter((item) => item.tipo === "DESPACHO").reduce((sum, item) => sum + item.pallets, 0) ?? 0,
  }), [data]);

  function submit(event: FormEvent) { event.preventDefault(); setApplied(filters); }

  return <section className="management-page planning-page">
    <header className="page-heading"><div><span className="page-eyebrow">EP-07 · Planificación y capacidad operativa</span><h1>Planificador de ocupación</h1><p>Anticipa la carga del almacén, detecta saturación y compara la capacidad prevista con la real.</p></div><button className="secondary-button" type="button" onClick={() => void load()} disabled={loading}><RefreshCw size={15}/>Actualizar</button></header>
    {error && <div className="inline-alert" role="alert"><span>{error}</span><button type="button" onClick={() => void load()}>Reintentar</button></div>}

    <form className="product-filters planning-filters" onSubmit={submit}><label>Desde<input type="date" value={filters.fecha_desde} onChange={(event) => setFilters((current) => ({ ...current, fecha_desde: event.target.value }))} required/></label><label>Hasta<input type="date" value={filters.fecha_hasta} onChange={(event) => setFilters((current) => ({ ...current, fecha_hasta: event.target.value }))} required/></label><label>Almacén<input value={filters.almacen} onChange={(event) => setFilters((current) => ({ ...current, almacen: event.target.value }))} placeholder="Código o nombre"/></label><label>Cliente<input value={filters.cliente} onChange={(event) => setFilters((current) => ({ ...current, cliente: event.target.value }))} placeholder="Razón social o RUC"/></label><label>Umbral de alerta<div className="threshold-input"><input type="number" min="1" max="100" value={filters.umbral} onChange={(event) => setFilters((current) => ({ ...current, umbral: event.target.value }))}/><span>%</span></div></label><div className="filter-actions"><button className="action-button" type="submit">Calcular proyección</button></div></form>

    {loading || !data ? <div className="content-loading"><span className="loading-spinner"/>Calculando capacidad…</div> : <>
      <div className="planning-metrics"><article><span className="metric-symbol blue"><Warehouse size={20}/></span><div><small>Capacidad total</small><strong>{summary.capacity}</strong><span>{summary.used} pallets ocupados</span></div></article><article><span className="metric-symbol green"><Gauge size={20}/></span><div><small>Disponible actual</small><strong>{summary.available}</strong><span>Posiciones estimadas</span></div></article><article><span className="metric-symbol violet"><CalendarRange size={20}/></span><div><small>Pico planificado</small><strong>{summary.peak}%</strong><span>Durante el periodo</span></div></article><article><span className="metric-symbol amber"><UsersRound size={20}/></span><div><small>Carga programada</small><strong>{data.operaciones.length}</strong><span>{summary.inbound} entrada · {summary.outbound} salida</span></div></article><article><span className="metric-symbol red"><AlertTriangle size={20}/></span><div><small>Alertas</small><strong>{data.alertas.length}</strong><span>Desde {data.umbral}% de ocupación</span></div></article></div>

      <div className="warehouse-tabs">{data.almacenes.map((item) => <button type="button" className={item.id_almacen === selectedId ? "active" : ""} key={item.id_almacen} onClick={() => setSelectedId(item.id_almacen)}><span>{item.codigo}</span><strong>{item.nombre}</strong><small>{item.porcentaje_actual}% actual · {item.pico_planificado}% pico</small></button>)}</div>

      {selected ? <>
        <div className="planning-main-grid"><section className="capacity-chart-panel"><header><div><h2>Ocupación real vs. planificada</h2><p>Porcentaje de capacidad utilizado por día.</p></div><div className="capacity-legend"><span className="planned">Planificada</span><span className="actual">Real</span><span className="threshold">Umbral {data.umbral}%</span></div></header><div className="capacity-chart"><svg viewBox="0 0 1000 270" preserveAspectRatio="none" role="img" aria-label="Tendencia de ocupación"><line className="grid-line" x1="0" y1="66.7" x2="1000" y2="66.7"/><line className="grid-line" x1="0" y1="158.3" x2="1000" y2="158.3"/><line className="threshold-line" x1="0" y1={250 - data.umbral / 120 * 220} x2="1000" y2={250 - data.umbral / 120 * 220}/><polyline className="planned-line" points={linePoints(selected, "porcentaje_planificado")}/><polyline className="actual-line" points={linePoints(selected, "porcentaje_real")}/></svg><div className="capacity-axis"><span>{shortDate(selected.serie[0]?.fecha)}</span><span>60%</span><span>{shortDate(selected.serie.at(-1)?.fecha ?? "")}</span></div></div></section>
          <aside className="capacity-summary"><header><Warehouse size={20}/><div><h2>{selected.nombre}</h2><p>{selected.codigo}</p></div></header><div className="capacity-donut" style={{ background: `conic-gradient(#3475df ${Math.min(selected.porcentaje_actual, 100)}%, #edf0f5 0)` }}><span><b>{selected.porcentaje_actual}%</b>ocupación actual</span></div><dl><div><dt>Capacidad</dt><dd>{selected.capacidad}</dd></div><div><dt>Utilizada</dt><dd>{selected.ocupacion_actual}</dd></div><div><dt>Disponible</dt><dd>{selected.disponible_actual}</dd></div><div><dt>Pico previsto</dt><dd className={selected.pico_planificado >= data.umbral ? "danger" : ""}>{selected.pico_planificado}%</dd></div></dl></aside></div>

        <section className="capacity-comparison"><header><div><h2>Detalle diario de capacidad</h2><p>Ingresos, salidas y diferencia entre ocupación real y planificada.</p></div></header><div className="data-card"><table className="data-table"><thead><tr><th>Fecha</th><th>Ingresos prog.</th><th>Salidas prog.</th><th>Planificada</th><th>Real</th><th>Diferencia</th><th>Nivel</th></tr></thead><tbody>{selected.serie.map((row) => <tr key={row.fecha}><td><strong>{shortDate(row.fecha)}</strong></td><td className="positive-value">+{row.ingresos_programados}</td><td className="negative-value">-{row.salidas_programadas}</td><td>{row.ocupacion_planificada} · {row.porcentaje_planificado}%</td><td>{row.ocupacion_real === null ? "Pendiente" : `${row.ocupacion_real} · ${row.porcentaje_real}%`}</td><td>{row.diferencia === null ? "—" : row.diferencia > 0 ? `+${row.diferencia}` : row.diferencia}</td><td><span className={`capacity-level ${row.porcentaje_planificado >= 100 ? "saturated" : row.porcentaje_planificado >= data.umbral ? "warning" : "normal"}`}>{row.porcentaje_planificado >= 100 ? "Saturado" : row.porcentaje_planificado >= data.umbral ? "Alerta" : "Normal"}</span></td></tr>)}</tbody></table></div></section>
      </> : <div className="data-card empty-state"><Warehouse size={32}/><strong>No existen almacenes para la consulta</strong><span>Revisa el filtro o configura un almacén activo.</span></div>}

      <div className="planning-bottom-grid"><section className="planning-list-panel"><header><div><h2>Alertas de saturación</h2><p>Días que superan el umbral configurado.</p></div><AlertTriangle size={19}/></header>{data.alertas.length === 0 ? <div className="empty-inline">No se proyectan periodos de riesgo.</div> : <div className="risk-list">{data.alertas.slice(0, 12).map((alert) => <article key={`${alert.id_almacen}-${alert.fecha}`}><span className={alert.nivel.toLowerCase()}><AlertTriangle size={16}/></span><div><strong>{alert.almacen}</strong><small>{shortDate(alert.fecha)} · {alert.ocupacion} de {alert.capacidad} posiciones</small></div><b>{alert.porcentaje}%</b></article>)}</div>}</section>
        <section className="planning-list-panel"><header><div><h2>Operaciones programadas</h2><p>Carga prevista para organizar espacio y recursos.</p></div><CalendarRange size={19}/></header>{data.operaciones.length === 0 ? <div className="empty-inline">No hay operaciones en el periodo.</div> : <div className="operation-list">{data.operaciones.slice(0, 15).map((operation, index) => <article key={`${operation.tipo}-${operation.documento}-${index}`}><span className={operation.tipo === "RECEPCION" ? "incoming" : "outgoing"}>{operation.tipo === "RECEPCION" ? <ArrowDownToLine size={16}/> : <ArrowUpFromLine size={16}/>}</span><div><strong>{operation.documento} · {operation.producto}</strong><small>{shortDate(operation.fecha)} · {operation.estado}</small></div><b>{operation.pallets} plt</b></article>)}</div>}</section></div>
    </>}
  </section>;
}
