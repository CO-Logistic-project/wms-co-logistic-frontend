import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Ban, Boxes, CheckCircle2, ClipboardList, PackageCheck, Plus, Printer, RefreshCw, Trash2 } from "lucide-react";
import Modal from "../../components/Modal";
import { getApiMessage } from "../../features/access/api";
import { useAuth } from "../../features/auth/auth-context";
import { cancelOrder, confirmOrderPreparation, createOrder, getOrderDocument, getOrderOptions, listOrders, validateOrderStock } from "../../features/orders/api";
import type { OrderCreatePayload, OrderDocument, OrderFilters, OrderItem, OrderOptions, OrderStatus } from "../../features/orders/types";

const EMPTY_FILTERS: OrderFilters = { cliente: "", estado: "", documento: "", responsable: "", fecha_desde: "", fecha_hasta: "" };
const EMPTY_OPTIONS: OrderOptions = { clientes: [], productos: [], lotes: [], stocks: [], estados: [] };

function today() {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function emptyOrder(): OrderCreatePayload {
  return { id_cliente: 0, codigo_documento: "", fecha_programada: today(), transporte_placa: "", transporte_conductor: "", lineas: [{ id_producto: 0, id_lote: null, cantidad_solicitada: "1" }] };
}

function formatDate(value: string | null, withTime = false) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short", year: "numeric", ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}) }).format(new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value));
}

function statusClass(status: OrderStatus) {
  if (status === "Despachado") return "received";
  if (status === "Listo") return "ready";
  if (status === "En Preparacion") return "progress";
  if (status === "Cancelado") return "cancelled";
  return "pending";
}

export default function OrdersPage() {
  const { profile } = useAuth();
  const permissions = useMemo(() => new Set(profile?.permisos ?? []), [profile?.permisos]);
  const canCreate = permissions.has("pedidos.crear");
  const canValidate = permissions.has("pedidos.validar_stock");
  const canPrepare = permissions.has("pedidos.preparar");
  const canCancel = permissions.has("pedidos.cancelar");
  const canPrint = permissions.has("pedidos.imprimir");
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [options, setOptions] = useState<OrderOptions>(EMPTY_OPTIONS);
  const [filters, setFilters] = useState<OrderFilters>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<OrderFilters>(EMPTY_FILTERS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<OrderCreatePayload>(emptyOrder());
  const [detail, setDetail] = useState<OrderItem | null>(null);
  const [prepareOpen, setPrepareOpen] = useState(false);
  const [preparation, setPreparation] = useState<Array<{ id_picking_detalle: number; cantidad_confirmada: string; label: string; requested: string }>>([]);
  const [printDocument, setPrintDocument] = useState<OrderDocument | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [orderData, optionData] = await Promise.all([listOrders(appliedFilters), getOrderOptions()]);
      setOrders(orderData);
      setOptions(optionData);
      setDetail((current) => current ? orderData.find((item) => item.id_pedido_salida === current.id_pedido_salida) ?? current : null);
    } catch (currentError) { setError(getApiMessage(currentError)); }
    finally { setLoading(false); }
  }, [appliedFilters]);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  const metrics = useMemo(() => ({
    total: orders.length,
    pending: orders.filter((item) => item.estado === "Pendiente").length,
    preparing: orders.filter((item) => item.estado === "En Preparacion").length,
    ready: orders.filter((item) => item.estado === "Listo").length,
  }), [orders]);
  const clientProducts = options.productos.filter((item) => item.id_cliente === createForm.id_cliente);

  function applyFilters(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setAppliedFilters(filters); }
  function clearFilters() { setFilters(EMPTY_FILTERS); setAppliedFilters(EMPTY_FILTERS); }
  function addLine() { setCreateForm((current) => ({ ...current, lineas: [...current.lineas, { id_producto: 0, id_lote: null, cantidad_solicitada: "1" }] })); }
  function removeLine(index: number) { setCreateForm((current) => ({ ...current, lineas: current.lineas.filter((_, lineIndex) => lineIndex !== index) })); }

  async function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setModalError(null);
    if (!createForm.id_cliente || !createForm.codigo_documento.trim() || createForm.lineas.some((line) => !line.id_producto || Number(line.cantidad_solicitada) <= 0)) { setModalError("Completa la guía, cliente y todas las líneas del pedido."); return; }
    setSaving(true);
    try {
      const created = await createOrder({ ...createForm, codigo_documento: createForm.codigo_documento.trim().toUpperCase(), transporte_placa: createForm.transporte_placa.trim().toUpperCase(), transporte_conductor: createForm.transporte_conductor.trim() });
      setCreateOpen(false); setDetail(created); await load();
    } catch (currentError) { setModalError(getApiMessage(currentError)); }
    finally { setSaving(false); }
  }

  async function validateStock(order: OrderItem) {
    setSaving(true); setError(null);
    try { const updated = await validateOrderStock(order.id_pedido_salida); setDetail(updated); await load(); }
    catch (currentError) { setError(getApiMessage(currentError)); }
    finally { setSaving(false); }
  }

  async function cancelCurrentOrder(order: OrderItem) {
    if (!window.confirm(`¿Cancelar ${order.codigo_documento} y liberar sus reservas?`)) return;
    setSaving(true); setError(null);
    try { const updated = await cancelOrder(order.id_pedido_salida); setDetail(updated); await load(); }
    catch (currentError) { setError(getApiMessage(currentError)); }
    finally { setSaving(false); }
  }

  async function printOrder(order: OrderItem) {
    setSaving(true); setError(null);
    try { setPrintDocument(await getOrderDocument(order.id_pedido_salida)); window.setTimeout(() => window.print(), 0); }
    catch (currentError) { setError(getApiMessage(currentError)); }
    finally { setSaving(false); }
  }

  function openPreparation(order: OrderItem) {
    setDetail(order); setModalError(null);
    setPreparation(order.lineas.flatMap((line) => line.preparacion.map((item) => ({ id_picking_detalle: item.id_picking_detalle, cantidad_confirmada: item.cantidad_solicitada, requested: item.cantidad_solicitada, label: `${line.producto?.sku} · ${item.ubicacion?.zona?.nombre ?? "Sin zona"} / ${item.ubicacion?.codigo ?? "Sin ubicación"}` }))));
    setPrepareOpen(true);
  }

  async function submitPreparation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!detail) return; setSaving(true); setModalError(null);
    try {
      const updated = await confirmOrderPreparation(detail.id_pedido_salida, preparation.map(({ id_picking_detalle, cantidad_confirmada }) => ({ id_picking_detalle, cantidad_confirmada })));
      setDetail(updated); setPrepareOpen(false); await load();
    } catch (currentError) { setModalError(getApiMessage(currentError)); }
    finally { setSaving(false); }
  }

  return <section className="management-page orders-page">
    <header className="page-heading"><div><span className="page-eyebrow">EP-05 · Pedidos y despacho</span><h1>Panel de pedidos activos</h1><p>Genera pedidos, valida existencias y controla la preparación antes del despacho.</p></div><div className="page-actions"><button className="secondary-button" type="button" onClick={() => void load()} disabled={loading}><RefreshCw size={15}/>Actualizar</button>{canCreate && <button className="action-button" type="button" onClick={() => { setCreateForm(emptyOrder()); setModalError(null); setCreateOpen(true); }}><Plus size={16}/>Nuevo pedido</button>}</div></header>
    {error && <div className="inline-alert" role="alert"><span>{error}</span><button type="button" onClick={() => void load()}>Reintentar</button></div>}
    <div className="reception-metrics"><article><span className="metric-symbol blue"><ClipboardList size={20}/></span><div><small>Total pedidos</small><strong>{metrics.total}</strong><span>En la consulta actual</span></div></article><article><span className="metric-symbol amber"><Boxes size={20}/></span><div><small>Pendientes</small><strong>{metrics.pending}</strong><span>Por validar stock</span></div></article><article><span className="metric-symbol blue"><PackageCheck size={20}/></span><div><small>Preparación</small><strong>{metrics.preparing}</strong><span>Picking en curso</span></div></article><article><span className="metric-symbol green"><CheckCircle2 size={20}/></span><div><small>Listos</small><strong>{metrics.ready}</strong><span>Disponibles para despacho</span></div></article></div>
    <form className="product-filters order-filters" onSubmit={applyFilters}><label>Guía de salida<input value={filters.documento} onChange={(event) => setFilters((current) => ({ ...current, documento: event.target.value }))} placeholder="GRS-0001"/></label><label>Cliente<input value={filters.cliente} onChange={(event) => setFilters((current) => ({ ...current, cliente: event.target.value }))} placeholder="Razón social o RUC"/></label><label>Estado<select value={filters.estado} onChange={(event) => setFilters((current) => ({ ...current, estado: event.target.value }))}><option value="">Todos</option>{options.estados.map((item) => <option key={item}>{item}</option>)}</select></label><label>Responsable<input value={filters.responsable} onChange={(event) => setFilters((current) => ({ ...current, responsable: event.target.value }))} placeholder="Nombre o correo"/></label><label>Desde<input type="date" value={filters.fecha_desde} onChange={(event) => setFilters((current) => ({ ...current, fecha_desde: event.target.value }))}/></label><label>Hasta<input type="date" value={filters.fecha_hasta} onChange={(event) => setFilters((current) => ({ ...current, fecha_hasta: event.target.value }))}/></label><div className="filter-actions"><button className="secondary-button" type="button" onClick={clearFilters}>Limpiar</button><button className="action-button" type="submit">Filtrar</button></div></form>
    <div className="data-card order-list-card">{loading ? <div className="content-loading"><span className="loading-spinner"/>Cargando pedidos…</div> : orders.length === 0 ? <div className="empty-state"><ClipboardList size={32}/><strong>No hay pedidos para mostrar</strong><span>Crea el primero a partir de una guía de remisión de salida.</span></div> : <table className="data-table order-table"><thead><tr><th>Pedido / cliente</th><th>Programado</th><th>Estado</th><th>Progreso</th><th>Cantidad</th><th>Responsable</th><th>Acciones</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id_pedido_salida}><td><div className="table-stack"><strong>{order.codigo_documento}</strong><small>{order.cliente?.razon_social ?? "Cliente no disponible"}</small></div></td><td>{formatDate(order.fecha_programada)}</td><td><span className={`reception-status ${statusClass(order.estado)}`}><i/>{order.estado}</span></td><td><div className="order-progress"><span><i style={{ width: `${order.progreso}%` }}/></span><small>{order.progreso}%</small></div></td><td>{Number(order.cantidad_solicitada).toLocaleString("es-PE")} {order.lineas[0]?.unidad?.codigo ?? "und."}</td><td>{order.picking?.responsable ? `${order.picking.responsable.nombre} ${order.picking.responsable.apellido}` : order.responsable_registro ? `${order.responsable_registro.nombre} ${order.responsable_registro.apellido}` : "—"}</td><td><div className="table-actions"><button className="table-action" type="button" onClick={() => setDetail(order)}>Detalle</button>{canValidate && order.estado === "Pendiente" && <button className="table-action" type="button" disabled={saving} onClick={() => void validateStock(order)}>Validar stock</button>}{canPrepare && order.estado === "En Preparacion" && <button className="table-action" type="button" onClick={() => openPreparation(order)}>Confirmar</button>}</div></td></tr>)}</tbody></table>}</div>

    {createOpen && <Modal title="Nuevo pedido de salida" description="Registra la guía y la mercancía que será despachada." onClose={() => setCreateOpen(false)} className="modal-panel-wide"><form className="management-form order-form" onSubmit={submitCreate}>{modalError && <div className="info-alert error">{modalError}</div>}<div className="form-grid"><label>Cliente<select value={createForm.id_cliente || ""} onChange={(event) => setCreateForm((current) => ({ ...current, id_cliente: Number(event.target.value), lineas: [{ id_producto: 0, id_lote: null, cantidad_solicitada: "1" }] }))} required><option value="">Seleccionar cliente</option>{options.clientes.map((item) => <option key={item.id_cliente} value={item.id_cliente}>{item.razon_social} · {item.ruc}</option>)}</select></label><label>Guía de remisión de salida<input value={createForm.codigo_documento} onChange={(event) => setCreateForm((current) => ({ ...current, codigo_documento: event.target.value }))} required/></label><label>Fecha programada<input type="date" value={createForm.fecha_programada} onChange={(event) => setCreateForm((current) => ({ ...current, fecha_programada: event.target.value }))} required/></label><label>Placa<input value={createForm.transporte_placa} onChange={(event) => setCreateForm((current) => ({ ...current, transporte_placa: event.target.value }))}/></label><label>Conductor<input value={createForm.transporte_conductor} onChange={(event) => setCreateForm((current) => ({ ...current, transporte_conductor: event.target.value }))}/></label></div><section className="reception-lines-editor"><header><div><strong>Líneas del pedido</strong><small>El lote recomendado por FEFO aparece primero y puede modificarse.</small></div><button className="secondary-button compact-button" type="button" onClick={addLine}><Plus size={14}/>Agregar</button></header>{createForm.lineas.map((line, index) => { const product = options.productos.find((item) => item.id_producto === line.id_producto); const lots = options.lotes.filter((item) => item.id_producto === line.id_producto); return <div className="order-line-form" key={index}><label>Producto<select value={line.id_producto || ""} onChange={(event) => { const productId = Number(event.target.value); const suggested = options.lotes.find((item) => item.id_producto === productId && item.sugerido_fefo); setCreateForm((current) => ({ ...current, lineas: current.lineas.map((item, lineIndex) => lineIndex === index ? { ...item, id_producto: productId, id_lote: suggested?.id_lote ?? null } : item) })); }} required><option value="">Seleccionar producto</option>{clientProducts.map((item) => <option key={item.id_producto} value={item.id_producto}>{item.sku} · {item.nombre}</option>)}</select></label><label>Lote<select value={line.id_lote ?? ""} disabled={!product?.controla_lote} required={product?.controla_lote} onChange={(event) => setCreateForm((current) => ({ ...current, lineas: current.lineas.map((item, lineIndex) => lineIndex === index ? { ...item, id_lote: event.target.value ? Number(event.target.value) : null } : item) }))}><option value="">{product?.controla_lote ? "Seleccionar lote" : "No aplica"}</option>{lots.map((item) => <option key={item.id_lote} value={item.id_lote}>{item.sugerido_fefo ? "FEFO · " : ""}{item.codigo} · vence {formatDate(item.fecha_vencimiento)} · {item.cantidad_disponible} disp.</option>)}</select></label><label>Cantidad<input type="number" min="0.01" step="0.01" value={line.cantidad_solicitada} onChange={(event) => setCreateForm((current) => ({ ...current, lineas: current.lineas.map((item, lineIndex) => lineIndex === index ? { ...item, cantidad_solicitada: event.target.value } : item) }))} required/></label><button className="icon-button line-delete" type="button" disabled={createForm.lineas.length === 1} onClick={() => removeLine(index)} aria-label="Eliminar línea"><Trash2 size={15}/></button></div>; })}</section><footer className="modal-actions"><button className="secondary-button" type="button" onClick={() => setCreateOpen(false)}>Cancelar</button><button className="action-button" disabled={saving} type="submit">{saving ? "Creando…" : "Crear pedido"}</button></footer></form></Modal>}

    {detail && !prepareOpen && <Modal title={`Pedido ${detail.codigo_documento}`} description={`${detail.cliente?.razon_social ?? "Cliente"} · ${detail.estado}`} onClose={() => setDetail(null)} className="modal-panel-wide"><div className="reception-detail"><div className="detail-summary"><div><span>Fecha programada</span><strong>{formatDate(detail.fecha_programada)}</strong></div><div><span>Progreso</span><strong>{detail.progreso}% preparado</strong></div><div><span>Transporte</span><strong>{detail.transporte_placa || "Sin asignar"}</strong></div><div><span>Responsable</span><strong>{detail.picking?.responsable?.nombre ?? "Sin asignar"}</strong></div></div><section className="detail-section"><header><div><strong>Productos solicitados</strong><small>Disponibilidad, lote y reserva por zona y ubicación.</small></div></header><div className="detail-lines">{detail.lineas.map((line) => <article key={line.id_pedido_detalle}><div className="detail-product"><span className="product-icon"><Boxes size={17}/></span><div><strong>{line.producto?.nombre}</strong><small>{line.producto?.sku} · {line.lote ? `Lote ${line.lote.codigo} · vence ${formatDate(line.lote.fecha_vencimiento)}` : "Sin lote"}</small></div></div><div className="quantity-comparison"><span>Solicitado <strong>{line.cantidad_solicitada}</strong></span><span>Disponible <strong>{line.stock_disponible}</strong></span><span>Extraído <strong>{line.cantidad_preparada}</strong></span></div>{line.preparacion.map((item) => <div className="line-location" key={item.id_picking_detalle}>{item.ubicacion?.zona?.nombre ?? "Sin zona"} · {item.ubicacion?.codigo ?? "ubicación no disponible"}: reservado {item.cantidad_solicitada}, extraído {item.cantidad_confirmada}</div>)}</article>)}</div></section><div className="reception-detail-actions">{canPrint && <button className="secondary-button" type="button" disabled={saving} onClick={() => void printOrder(detail)}><Printer size={15}/>Imprimir P.S.</button>}{canCancel && !["Despachado", "Cancelado"].includes(detail.estado) && <button className="secondary-button danger-button" type="button" disabled={saving} onClick={() => void cancelCurrentOrder(detail)}><Ban size={15}/>Cancelar y liberar</button>}{canValidate && detail.estado === "Pendiente" && <button className="action-button" type="button" disabled={saving} onClick={() => void validateStock(detail)}>Validar y reservar stock</button>}{canPrepare && detail.estado === "En Preparacion" && <button className="action-button" type="button" onClick={() => openPreparation(detail)}>Confirmar extracción</button>}</div></div></Modal>}

    {prepareOpen && detail && <Modal title="Confirmar preparación" description={`Verifica las cantidades de ${detail.codigo_documento}.`} onClose={() => setPrepareOpen(false)}><form className="management-form" onSubmit={submitPreparation}>{modalError && <div className="info-alert error">{modalError}</div>}<div className="validation-lines">{preparation.map((item, index) => <article key={item.id_picking_detalle}><header><strong>{item.label}</strong><small>Reservado: {item.requested}</small></header><label>Cantidad confirmada<input type="number" min="0" max={item.requested} step="0.01" value={item.cantidad_confirmada} onChange={(event) => setPreparation((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, cantidad_confirmada: event.target.value } : line))}/></label></article>)}</div><footer className="modal-actions"><button className="secondary-button" type="button" onClick={() => setPrepareOpen(false)}>Cancelar</button><button className="action-button" type="submit" disabled={saving}>{saving ? "Guardando…" : "Confirmar picking"}</button></footer></form></Modal>}
    {printDocument && <article className="reception-print-sheet" aria-hidden="true"><header><div><strong>WMS Pro</strong><span>Control de pedidos y despacho</span></div><div><h1>Pedido de salida</h1><strong>{printDocument.numero_pedido_salida}</strong></div></header><section className="print-document-data"><div><span>Guía de remisión</span><strong>{printDocument.pedido.codigo_documento}</strong></div><div><span>Cliente</span><strong>{printDocument.pedido.cliente?.razon_social}</strong><small>RUC {printDocument.pedido.cliente?.ruc}</small></div><div><span>Fecha programada</span><strong>{formatDate(printDocument.pedido.fecha_programada)}</strong></div><div><span>Responsable</span><strong>{printDocument.pedido.picking?.responsable ? `${printDocument.pedido.picking.responsable.nombre} ${printDocument.pedido.picking.responsable.apellido}` : "—"}</strong></div><div><span>Transporte</span><strong>{printDocument.pedido.transporte_placa || "Sin placa"}</strong><small>{printDocument.pedido.transporte_conductor || "Sin conductor"}</small></div><div><span>Estado</span><strong>{printDocument.pedido.estado}</strong></div></section><table><thead><tr><th>Código</th><th>Descripción</th><th>Lote</th><th>F. vencimiento</th><th>Zona / ubicación</th><th>Cantidad</th></tr></thead><tbody>{printDocument.pedido.lineas.flatMap((line) => line.preparacion.length ? line.preparacion.map((preparation) => <tr key={preparation.id_picking_detalle}><td>{line.producto?.sku}</td><td>{line.producto?.nombre}</td><td>{line.lote?.codigo ?? "—"}</td><td>{formatDate(line.lote?.fecha_vencimiento ?? null)}</td><td>{preparation.ubicacion?.zona?.nombre ?? "—"} / {preparation.ubicacion?.codigo ?? "—"}</td><td>{preparation.cantidad_solicitada} {line.unidad?.codigo}</td></tr>) : [<tr key={line.id_pedido_detalle}><td>{line.producto?.sku}</td><td>{line.producto?.nombre}</td><td>{line.lote?.codigo ?? "—"}</td><td>{formatDate(line.lote?.fecha_vencimiento ?? null)}</td><td>Por asignar</td><td>{line.cantidad_solicitada} {line.unidad?.codigo}</td></tr>])}</tbody></table><footer><div><span>Responsable de picking</span></div><div><span>Conductor / transportista</span></div></footer><small className="print-association">Documento asociado a la guía de remisión de salida {printDocument.pedido.codigo_documento}.</small></article>}
  </section>;
}
