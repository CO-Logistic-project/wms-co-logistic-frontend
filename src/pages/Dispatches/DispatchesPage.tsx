import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { AlertTriangle, CheckCircle2, Clock3, History, PackageCheck, RefreshCw, Siren, Truck } from "lucide-react";
import Modal from "../../components/Modal";
import { getApiMessage } from "../../features/access/api";
import { useAuth } from "../../features/auth/auth-context";
import { closeOrderDispatch, createDispatchIncident, getOrderOptions, listDispatchHistory, listOrders } from "../../features/orders/api";
import type { DispatchHistory, OrderFilters, OrderItem, OrderOptions, OrderStatus } from "../../features/orders/types";

type ViewMode = "active" | "history";
type HistoryFilters = Omit<OrderFilters, "estado"> & { producto: string };

const EMPTY_FILTERS: OrderFilters = { cliente: "", estado: "", documento: "", responsable: "", fecha_desde: "", fecha_hasta: "" };
const EMPTY_HISTORY_FILTERS: HistoryFilters = { cliente: "", documento: "", producto: "", responsable: "", fecha_desde: "", fecha_hasta: "" };
const EMPTY_OPTIONS: OrderOptions = { clientes: [], productos: [], lotes: [], stocks: [], estados: [] };
const EMPTY_HISTORY: DispatchHistory = { resumen: { despachos: 0, unidades: "0", preparacion_promedio_minutos: null, despacho_promedio_minutos: null, total_promedio_minutos: null }, resultados: [] };

function formatDate(value: string | null, time = false) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short", year: "numeric", ...(time ? { hour: "2-digit", minute: "2-digit" } : {}) }).format(new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value));
}

function formatDuration(value: number | null) {
  if (value === null) return "—";
  if (value < 60) return `${Math.round(value)} min`;
  return `${Math.floor(value / 60)} h ${Math.round(value % 60)} min`;
}

function statusClass(status: OrderStatus) {
  if (status === "Despachado") return "received";
  if (status === "Listo") return "ready";
  if (status === "En Preparacion") return "progress";
  if (status === "Cancelado") return "cancelled";
  return "pending";
}

export default function DispatchesPage() {
  const { profile } = useAuth();
  const permissions = useMemo(() => new Set(profile?.permisos ?? []), [profile?.permisos]);
  const canClose = permissions.has("despachos.cerrar");
  const canReportIncident = permissions.has("despachos.incidencias");
  const [mode, setMode] = useState<ViewMode>("active");
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [history, setHistory] = useState<DispatchHistory>(EMPTY_HISTORY);
  const [options, setOptions] = useState<OrderOptions>(EMPTY_OPTIONS);
  const [filters, setFilters] = useState<OrderFilters>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<OrderFilters>(EMPTY_FILTERS);
  const [historyFilters, setHistoryFilters] = useState<HistoryFilters>(EMPTY_HISTORY_FILTERS);
  const [appliedHistoryFilters, setAppliedHistoryFilters] = useState<HistoryFilters>(EMPTY_HISTORY_FILTERS);
  const [selected, setSelected] = useState<OrderItem | null>(null);
  const [detail, setDetail] = useState<OrderItem | null>(null);
  const [incidentOrder, setIncidentOrder] = useState<OrderItem | null>(null);
  const [closeForm, setCloseForm] = useState({ codigo_documento_salida: "", observaciones: "" });
  const [incidentForm, setIncidentForm] = useState({ id_pedido_detalle: 0, tipo: "FALTANTE", cantidad: "1", descripcion: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [orderData, historyData, optionData] = await Promise.all([listOrders(appliedFilters), listDispatchHistory(appliedHistoryFilters), getOrderOptions()]);
      setOrders(orderData); setHistory(historyData); setOptions(optionData);
      setDetail((current) => current ? historyData.resultados.find((item) => item.id_pedido_salida === current.id_pedido_salida) ?? current : null);
    } catch (currentError) { setError(getApiMessage(currentError)); }
    finally { setLoading(false); }
  }, [appliedFilters, appliedHistoryFilters]);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  const activeMetrics = useMemo(() => ({
    route: orders.filter((item) => ["Pendiente", "En Preparacion"].includes(item.estado)).length,
    ready: orders.filter((item) => item.estado === "Listo").length,
    closed: orders.filter((item) => item.estado === "Despachado").length,
    units: orders.filter((item) => item.estado === "Despachado").reduce((sum, item) => sum + Number(item.cantidad_despachada), 0),
  }), [orders]);
  const visibleOrders = mode === "history" ? history.resultados : orders;

  function applyFilters(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (mode === "history") setAppliedHistoryFilters(historyFilters); else setAppliedFilters(filters); }
  function clearFilters() { if (mode === "history") { setHistoryFilters(EMPTY_HISTORY_FILTERS); setAppliedHistoryFilters(EMPTY_HISTORY_FILTERS); } else { setFilters(EMPTY_FILTERS); setAppliedFilters(EMPTY_FILTERS); } }
  function openClose(order: OrderItem) { setSelected(order); setCloseForm({ codigo_documento_salida: "", observaciones: "" }); setFormError(null); }
  function openIncident(order: OrderItem) { setIncidentOrder(order); setIncidentForm({ id_pedido_detalle: order.lineas[0]?.id_pedido_detalle ?? 0, tipo: "FALTANTE", cantidad: "1", descripcion: "" }); setFormError(null); }

  async function submitClose(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selected) return; setSaving(true); setFormError(null);
    try { await closeOrderDispatch(selected.id_pedido_salida, { ...closeForm, codigo_documento_salida: closeForm.codigo_documento_salida.trim().toUpperCase() }); setSelected(null); await load(); }
    catch (currentError) { setFormError(getApiMessage(currentError)); }
    finally { setSaving(false); }
  }

  async function submitIncident(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!incidentOrder) return; setSaving(true); setFormError(null);
    try { const updated = await createDispatchIncident(incidentOrder.id_pedido_salida, incidentForm); setIncidentOrder(null); setDetail(updated); await load(); }
    catch (currentError) { setFormError(getApiMessage(currentError)); }
    finally { setSaving(false); }
  }

  return <section className="management-page dispatch-page">
    <header className="page-heading"><div><span className="page-eyebrow">EP-05 · Pedidos y despacho</span><h1>{mode === "history" ? "Historial de despachos" : "Gestión de despacho"}</h1><p>{mode === "history" ? "Consulta salidas cerradas, tiempos e incidencias con trazabilidad completa." : "Supervisa pedidos pendientes, preparados, listos y cerrados."}</p></div><div className="page-actions"><button className="secondary-button" type="button" onClick={() => setMode((current) => current === "active" ? "history" : "active")}><History size={15}/>{mode === "history" ? "Ver operación" : "Ver historial"}</button><button className="secondary-button" type="button" onClick={() => void load()} disabled={loading}><RefreshCw size={15}/>Actualizar</button></div></header>
    {error && <div className="inline-alert" role="alert"><span>{error}</span><button type="button" onClick={() => void load()}>Reintentar</button></div>}

    {mode === "active" ? <div className="reception-metrics"><article><span className="metric-symbol blue"><Truck size={20}/></span><div><small>En proceso</small><strong>{activeMetrics.route}</strong><span>Pendientes o preparando</span></div></article><article><span className="metric-symbol amber"><Clock3 size={20}/></span><div><small>Por despachar</small><strong>{activeMetrics.ready}</strong><span>Pedidos listos</span></div></article><article><span className="metric-symbol green"><CheckCircle2 size={20}/></span><div><small>Cerrados</small><strong>{activeMetrics.closed}</strong><span>Despachos confirmados</span></div></article><article><span className="metric-symbol blue"><PackageCheck size={20}/></span><div><small>Unidades salidas</small><strong>{activeMetrics.units.toLocaleString("es-PE")}</strong><span>En la consulta actual</span></div></article></div> : <div className="reception-metrics"><article><span className="metric-symbol green"><History size={20}/></span><div><small>Despachos</small><strong>{history.resumen.despachos}</strong><span>{Number(history.resumen.unidades).toLocaleString("es-PE")} unidades</span></div></article><article><span className="metric-symbol blue"><Clock3 size={20}/></span><div><small>Preparación promedio</small><strong>{formatDuration(history.resumen.preparacion_promedio_minutos)}</strong><span>Inicio a fin del picking</span></div></article><article><span className="metric-symbol amber"><Truck size={20}/></span><div><small>Despacho promedio</small><strong>{formatDuration(history.resumen.despacho_promedio_minutos)}</strong><span>Picking listo a salida</span></div></article><article><span className="metric-symbol red"><PackageCheck size={20}/></span><div><small>Proceso total</small><strong>{formatDuration(history.resumen.total_promedio_minutos)}</strong><span>Registro a salida</span></div></article></div>}

    <form className="product-filters order-filters" onSubmit={applyFilters}><label>Pedido / documento<input value={mode === "history" ? historyFilters.documento : filters.documento} onChange={(event) => mode === "history" ? setHistoryFilters((current) => ({ ...current, documento: event.target.value })) : setFilters((current) => ({ ...current, documento: event.target.value }))} placeholder="GRS o DES"/></label><label>Cliente<input value={mode === "history" ? historyFilters.cliente : filters.cliente} onChange={(event) => mode === "history" ? setHistoryFilters((current) => ({ ...current, cliente: event.target.value })) : setFilters((current) => ({ ...current, cliente: event.target.value }))} placeholder="Razón social"/></label>{mode === "history" ? <label>Producto<input value={historyFilters.producto} onChange={(event) => setHistoryFilters((current) => ({ ...current, producto: event.target.value }))} placeholder="SKU o nombre"/></label> : <label>Estado<select value={filters.estado} onChange={(event) => setFilters((current) => ({ ...current, estado: event.target.value }))}><option value="">Todos</option>{options.estados.map((item) => <option key={item}>{item}</option>)}</select></label>}<label>Responsable<input value={mode === "history" ? historyFilters.responsable : filters.responsable} onChange={(event) => mode === "history" ? setHistoryFilters((current) => ({ ...current, responsable: event.target.value })) : setFilters((current) => ({ ...current, responsable: event.target.value }))} placeholder="Nombre o correo"/></label><label>Desde<input type="date" value={mode === "history" ? historyFilters.fecha_desde : filters.fecha_desde} onChange={(event) => mode === "history" ? setHistoryFilters((current) => ({ ...current, fecha_desde: event.target.value })) : setFilters((current) => ({ ...current, fecha_desde: event.target.value }))}/></label><label>Hasta<input type="date" value={mode === "history" ? historyFilters.fecha_hasta : filters.fecha_hasta} onChange={(event) => mode === "history" ? setHistoryFilters((current) => ({ ...current, fecha_hasta: event.target.value })) : setFilters((current) => ({ ...current, fecha_hasta: event.target.value }))}/></label><div className="filter-actions"><button className="secondary-button" type="button" onClick={clearFilters}>Limpiar</button><button className="action-button" type="submit">Filtrar</button></div></form>

    <div className="data-card order-list-card">{loading ? <div className="content-loading"><span className="loading-spinner"/>Cargando despachos…</div> : visibleOrders.length === 0 ? <div className="empty-state"><Truck size={32}/><strong>No hay despachos para mostrar</strong><span>{mode === "history" ? "No existen salidas cerradas con esos filtros." : "Los pedidos creados aparecerán aquí."}</span></div> : <table className="data-table dispatch-table"><thead><tr><th>Pedido</th><th>Cliente</th><th>{mode === "history" ? "Salida" : "Programado"}</th><th>Estado</th><th>{mode === "history" ? "Tiempo total" : "Preparación"}</th><th>Documento de salida</th><th>Responsable</th><th>Acción</th></tr></thead><tbody>{visibleOrders.map((order) => <tr key={order.id_pedido_salida}><td><strong>{order.codigo_documento}</strong></td><td>{order.cliente?.razon_social ?? "—"}</td><td>{formatDate(mode === "history" ? order.fecha_despacho : order.fecha_programada, mode === "history")}</td><td><span className={`reception-status ${statusClass(order.estado)}`}><i/>{order.estado}</span></td><td>{mode === "history" ? formatDuration(order.tiempos.total_minutos) : <div className="order-progress"><span><i style={{ width: `${order.progreso}%` }}/></span><small>{order.progreso}%</small></div>}</td><td><div className="table-stack"><strong>{order.despacho?.codigo_documento_salida ?? "Pendiente"}</strong><small>{formatDate(order.despacho?.fecha_despacho ?? null, true)}</small></div></td><td>{order.despacho?.responsable ? `${order.despacho.responsable.nombre} ${order.despacho.responsable.apellido}` : order.picking?.responsable ? `${order.picking.responsable.nombre} ${order.picking.responsable.apellido}` : "—"}</td><td><div className="table-actions">{canClose && order.estado === "Listo" && <button className="table-action" type="button" onClick={() => openClose(order)}>Registrar salida</button>}{order.estado === "Despachado" && <button className="table-action" type="button" onClick={() => setDetail(order)}>Ver detalle</button>}{canReportIncident && order.estado === "Despachado" && <button className="table-action" type="button" onClick={() => openIncident(order)}>Incidencia</button>}</div></td></tr>)}</tbody></table>}</div>

    {selected && <Modal title="Registrar salida de mercancía" description={`${selected.codigo_documento} · ${selected.cliente?.razon_social ?? "Cliente"}`} onClose={() => setSelected(null)}><form className="management-form" onSubmit={submitClose}>{formError && <div className="info-alert error"><AlertTriangle size={16}/>{formError}</div>}<div className="dispatch-confirmation"><div><span>Unidades confirmadas</span><strong>{Number(selected.cantidad_preparada).toLocaleString("es-PE")}</strong></div><div><span>Productos</span><strong>{selected.lineas.length}</strong></div></div><label>Documento de salida<input value={closeForm.codigo_documento_salida} onChange={(event) => setCloseForm((current) => ({ ...current, codigo_documento_salida: event.target.value }))} placeholder="DES-0001" required/></label><label>Observaciones<textarea rows={4} value={closeForm.observaciones} onChange={(event) => setCloseForm((current) => ({ ...current, observaciones: event.target.value }))} placeholder="Observaciones del despacho"/></label><div className="info-alert">Al confirmar se consumirá la reserva, se descontará el stock y el pedido quedará cerrado.</div><footer className="modal-actions"><button className="secondary-button" type="button" onClick={() => setSelected(null)}>Cancelar</button><button className="action-button" type="submit" disabled={saving}>{saving ? "Cerrando…" : "Confirmar salida"}</button></footer></form></Modal>}

    {incidentOrder && <Modal title="Registrar incidencia de despacho" description={`${incidentOrder.codigo_documento} · ${incidentOrder.despacho?.codigo_documento_salida}`} onClose={() => setIncidentOrder(null)}><form className="management-form" onSubmit={submitIncident}>{formError && <div className="info-alert error"><AlertTriangle size={16}/>{formError}</div>}<label>Producto afectado<select value={incidentForm.id_pedido_detalle || ""} onChange={(event) => setIncidentForm((current) => ({ ...current, id_pedido_detalle: Number(event.target.value) }))} required>{incidentOrder.lineas.map((line) => <option key={line.id_pedido_detalle} value={line.id_pedido_detalle}>{line.producto?.sku} · {line.producto?.nombre}</option>)}</select></label><label>Tipo<select value={incidentForm.tipo} onChange={(event) => setIncidentForm((current) => ({ ...current, tipo: event.target.value }))}><option value="FALTANTE">Faltante</option><option value="RETRASO">Retraso</option><option value="ERROR">Error</option><option value="DANO">Daño</option><option value="OTRO">Otro</option></select></label><label>Cantidad afectada<input type="number" min="0.01" step="0.01" value={incidentForm.cantidad} onChange={(event) => setIncidentForm((current) => ({ ...current, cantidad: event.target.value }))} required/></label><label>Descripción<textarea rows={4} value={incidentForm.descripcion} onChange={(event) => setIncidentForm((current) => ({ ...current, descripcion: event.target.value }))} required/></label><footer className="modal-actions"><button className="secondary-button" type="button" onClick={() => setIncidentOrder(null)}>Cancelar</button><button className="action-button" type="submit" disabled={saving}><Siren size={15}/>{saving ? "Registrando…" : "Registrar incidencia"}</button></footer></form></Modal>}

    {detail && <Modal title={`Despacho ${detail.despacho?.codigo_documento_salida}`} description={`${detail.codigo_documento} · ${detail.cliente?.razon_social}`} onClose={() => setDetail(null)} className="modal-panel-wide"><div className="reception-detail"><div className="detail-summary"><div><span>Preparación</span><strong>{formatDuration(detail.tiempos.preparacion_minutos)}</strong></div><div><span>Despacho</span><strong>{formatDuration(detail.tiempos.despacho_minutos)}</strong></div><div><span>Proceso total</span><strong>{formatDuration(detail.tiempos.total_minutos)}</strong></div><div><span>Responsable</span><strong>{detail.despacho?.responsable?.nombre ?? "—"}</strong></div></div><section className="detail-section"><header><div><strong>Mercancía despachada</strong><small>Productos, lotes, cantidades y ubicaciones de origen.</small></div></header><div className="detail-lines">{detail.lineas.map((line) => <article key={line.id_pedido_detalle}><div className="detail-product"><span className="product-icon"><PackageCheck size={17}/></span><div><strong>{line.producto?.nombre}</strong><small>{line.producto?.sku} · lote {line.lote?.codigo ?? "—"} · vence {formatDate(line.lote?.fecha_vencimiento ?? null)}</small></div></div><div className="quantity-comparison"><span>Solicitado <strong>{line.cantidad_solicitada}</strong></span><span>Despachado <strong>{line.cantidad_despachada}</strong></span></div>{line.preparacion.map((item) => <div className="line-location" key={item.id_picking_detalle}>{item.ubicacion?.zona?.nombre ?? "Sin zona"} · {item.ubicacion?.codigo ?? "Sin ubicación"}: {item.cantidad_confirmada}</div>)}</article>)}</div></section><section className="detail-section"><header><div><strong>Incidencias</strong><small>Faltantes, retrasos, errores o daños reportados.</small></div></header><div className="incident-list">{detail.despacho?.incidencias.length ? detail.despacho.incidencias.map((incident) => <article key={incident.id_incidencia_despacho}><span className="incident-type">{incident.tipo}</span><div><strong>{incident.producto?.sku} · {incident.cantidad} afectadas</strong><small>{incident.descripcion} · {incident.responsable?.nombre ?? "Responsable no disponible"} · {formatDate(incident.fecha_registro, true)}</small></div></article>) : <div className="empty-inline">Este despacho no registra incidencias.</div>}</div></section></div></Modal>}
  </section>;
}
