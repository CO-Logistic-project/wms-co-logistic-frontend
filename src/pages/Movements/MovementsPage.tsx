import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowRightLeft, Boxes, CheckCircle2, GitBranch, PackageOpen, Plus, RefreshCw } from "lucide-react";
import Modal from "../../components/Modal";
import { getApiMessage } from "../../features/access/api";
import { useAuth } from "../../features/auth/auth-context";
import {
  confirmMovement,
  createMovement,
  createRepacking,
  getInventoryOptions,
  listMovements,
  listStocks,
} from "../../features/inventory/api";
import type {
  InventoryOptions,
  MovementFilters,
  MovementItem,
  RepackingPayload,
  StockItem,
} from "../../features/inventory/types";

const EMPTY_FILTERS: MovementFilters = { fecha_desde: "", fecha_hasta: "", tipo: "", producto: "", origen: "", destino: "", responsable: "", estado: "" };
const EMPTY_OPTIONS: InventoryOptions = { almacenes: [], ubicaciones: [], estados_stock: [], estados_movimiento: [] };

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function movementClass(value: MovementItem["estado"]) {
  if (value === "CONFIRMADO") return "received";
  if (value === "CANCELADO") return "cancelled";
  return "pending";
}

export default function MovementsPage() {
  const { profile } = useAuth();
  const permissions = useMemo(() => new Set(profile?.permisos ?? []), [profile?.permisos]);
  const canCreate = permissions.has("movimientos.crear");
  const canConfirm = permissions.has("movimientos.confirmar");
  const canRepack = permissions.has("movimientos.reempaque");
  const [movements, setMovements] = useState<MovementItem[]>([]);
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [options, setOptions] = useState<InventoryOptions>(EMPTY_OPTIONS);
  const [filters, setFilters] = useState<MovementFilters>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<MovementFilters>(EMPTY_FILTERS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [repackOpen, setRepackOpen] = useState(false);
  const [transfer, setTransfer] = useState({ id_stock_origen: 0, id_ubicacion_destino: 0, cantidad: "", motivo: "" });
  const [repack, setRepack] = useState<RepackingPayload>({ id_stock_origen: 0, motivo: "", fracciones: [{ codigo_pallet: "", cantidad: "" }, { codigo_pallet: "", cantidad: "" }] });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [movementData, stockData, optionData] = await Promise.all([
        listMovements(appliedFilters),
        listStocks({ producto: "", cliente: "", almacen: "", ubicacion: "", lote: "", fecha_vencimiento: "", estado: "DISP" }),
        getInventoryOptions(),
      ]);
      setMovements(movementData);
      setStocks(stockData.filter((item) => Number(item.cantidad_disponible) > 0));
      setOptions(optionData);
    } catch (currentError) {
      setError(getApiMessage(currentError));
    } finally {
      setLoading(false);
    }
  }, [appliedFilters]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const metrics = useMemo(() => ({
    pending: movements.filter((item) => item.estado === "PENDIENTE").length,
    confirmed: movements.filter((item) => item.estado === "CONFIRMADO").length,
    transfers: movements.filter((item) => item.tipo === "TRASLADO").length,
    repacking: movements.filter((item) => item.tipo === "REEMPAQUE").length,
  }), [movements]);

  function applyFilters(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setAppliedFilters(filters); }
  function clearFilters() { setFilters(EMPTY_FILTERS); setAppliedFilters(EMPTY_FILTERS); }

  async function submitTransfer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    if (!transfer.id_stock_origen || !transfer.id_ubicacion_destino || Number(transfer.cantidad) <= 0) {
      setFormError("Selecciona origen, destino y una cantidad válida."); return;
    }
    setSaving(true);
    try {
      await createMovement({ motivo: transfer.motivo, lineas: [{ id_stock_origen: transfer.id_stock_origen, id_ubicacion_destino: transfer.id_ubicacion_destino, cantidad: transfer.cantidad }] });
      setCreateOpen(false);
      setTransfer({ id_stock_origen: 0, id_ubicacion_destino: 0, cantidad: "", motivo: "" });
      await load();
    } catch (currentError) { setFormError(getApiMessage(currentError)); } finally { setSaving(false); }
  }

  async function handleConfirm(id: number) {
    setError(null);
    try { await confirmMovement(id); await load(); } catch (currentError) { setError(getApiMessage(currentError)); }
  }

  async function submitRepacking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    if (!repack.id_stock_origen || repack.fracciones.some((item) => Number(item.cantidad) <= 0)) {
      setFormError("Selecciona el stock y completa al menos dos fracciones válidas."); return;
    }
    setSaving(true);
    try {
      await createRepacking(repack);
      setRepackOpen(false);
      setRepack({ id_stock_origen: 0, motivo: "", fracciones: [{ codigo_pallet: "", cantidad: "" }, { codigo_pallet: "", cantidad: "" }] });
      await load();
    } catch (currentError) { setFormError(getApiMessage(currentError)); } finally { setSaving(false); }
  }

  return (
    <section className="management-page movement-page">
      <header className="page-heading"><div><span className="page-eyebrow">EP-04 · Control operativo</span><h1>Registro de movimientos</h1><p>Solicita traslados, confirma su ejecución y conserva la trazabilidad de cada pallet.</p></div><div className="page-actions">{canRepack && <button className="secondary-button" type="button" onClick={() => { setFormError(null); setRepackOpen(true); }}><GitBranch size={15} /> Dividir pallet</button>}{canCreate && <button className="action-button" type="button" onClick={() => { setFormError(null); setCreateOpen(true); }}><Plus size={16} /> Nuevo traslado</button>}<button className="secondary-button icon-only" type="button" onClick={() => void load()}><RefreshCw size={15} /></button></div></header>
      {error && <div className="inline-alert" role="alert"><span>{error}</span><button type="button" onClick={() => setError(null)}>Cerrar</button></div>}

      <div className="reception-metrics"><article><span className="metric-symbol amber"><ArrowRightLeft size={20} /></span><div><small>Pendientes</small><strong>{metrics.pending}</strong><span>Esperando confirmación física</span></div></article><article><span className="metric-symbol green"><CheckCircle2 size={20} /></span><div><small>Confirmados</small><strong>{metrics.confirmed}</strong><span>Stock ya actualizado</span></div></article><article><span className="metric-symbol blue"><Boxes size={20} /></span><div><small>Traslados</small><strong>{metrics.transfers}</strong><span>Movimientos entre ubicaciones</span></div></article><article><span className="metric-symbol red"><PackageOpen size={20} /></span><div><small>Reempaques</small><strong>{metrics.repacking}</strong><span>Fracciones con trazabilidad</span></div></article></div>

      <form className="product-filters movement-filters" onSubmit={applyFilters}>
        <label>Desde<input type="date" value={filters.fecha_desde} onChange={(event) => setFilters((current) => ({ ...current, fecha_desde: event.target.value }))} /></label><label>Hasta<input type="date" value={filters.fecha_hasta} onChange={(event) => setFilters((current) => ({ ...current, fecha_hasta: event.target.value }))} /></label><label>Tipo<select value={filters.tipo} onChange={(event) => setFilters((current) => ({ ...current, tipo: event.target.value }))}><option value="">Todos</option><option value="TRASLADO">Traslado</option><option value="REEMPAQUE">Reempaque</option></select></label><label>Producto<input value={filters.producto} onChange={(event) => setFilters((current) => ({ ...current, producto: event.target.value }))} placeholder="SKU o nombre" /></label><label>Origen<input value={filters.origen} onChange={(event) => setFilters((current) => ({ ...current, origen: event.target.value }))} placeholder="Ubicación" /></label><label>Destino<input value={filters.destino} onChange={(event) => setFilters((current) => ({ ...current, destino: event.target.value }))} placeholder="Ubicación" /></label><label>Responsable<input value={filters.responsable} onChange={(event) => setFilters((current) => ({ ...current, responsable: event.target.value }))} placeholder="Nombre o correo" /></label><label>Estado<select value={filters.estado} onChange={(event) => setFilters((current) => ({ ...current, estado: event.target.value }))}><option value="">Todos</option>{options.estados_movimiento.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><div className="filter-actions"><button className="secondary-button" type="button" onClick={clearFilters}>Limpiar</button><button className="action-button" type="submit">Filtrar</button></div>
      </form>

      <div className="data-card movement-list-card">{loading ? <div className="content-loading"><span className="loading-spinner" />Cargando movimientos…</div> : movements.length === 0 ? <div className="empty-state"><ArrowRightLeft size={32} /><strong>No hay movimientos registrados</strong><span>Crea el primer traslado cuando existan stocks con ubicación asignada.</span></div> : <table className="data-table movement-table"><thead><tr><th>ID / fecha</th><th>Tipo</th><th>Producto</th><th>Origen → destino</th><th>Cantidad</th><th>Responsable</th><th>Estado</th><th>Acción</th></tr></thead><tbody>{movements.map((movement) => { const line = movement.lineas[0]; return <tr key={movement.id_movimiento}><td><div className="table-stack"><strong>#MOV-{String(movement.id_movimiento).padStart(5, "0")}</strong><small>{formatDate(movement.fecha_registro)}</small></div></td><td><span className="movement-type">{movement.tipo === "REEMPAQUE" ? "Reempaque" : "Traslado"}</span></td><td><div className="table-stack"><strong>{line?.producto?.nombre ?? "—"}</strong><small>{line?.producto?.sku ?? movement.motivo}</small></div></td><td><strong>{line?.origen?.codigo ?? "—"} → {line?.destino?.codigo ?? "—"}</strong>{movement.lineas.length > 1 && <small className="block-copy">+{movement.lineas.length - 1} líneas</small>}</td><td>{Number(movement.cantidad_total).toLocaleString("es-PE")}</td><td>{movement.responsable_confirmacion ? `${movement.responsable_confirmacion.nombre} ${movement.responsable_confirmacion.apellido}` : movement.responsable_registro ? `${movement.responsable_registro.nombre} ${movement.responsable_registro.apellido}` : "—"}</td><td><span className={`reception-status ${movementClass(movement.estado)}`}><i />{movement.estado}</span></td><td>{canConfirm && movement.estado === "PENDIENTE" ? <button className="table-action success" type="button" onClick={() => void handleConfirm(movement.id_movimiento)}>Confirmar</button> : <span className="muted-copy">Procesado</span>}</td></tr>; })}</tbody></table>}</div>

      {createOpen && <Modal title="Nuevo traslado interno" description="El stock se descuenta únicamente cuando el montacarguista confirma el movimiento." onClose={() => setCreateOpen(false)}><form className="management-form" onSubmit={submitTransfer}>{formError && <div className="inline-alert compact" role="alert">{formError}</div>}<label>Stock de origen<select value={transfer.id_stock_origen} onChange={(event) => setTransfer((current) => ({ ...current, id_stock_origen: Number(event.target.value) }))}><option value={0}>Seleccionar producto y ubicación</option>{stocks.map((item) => <option key={item.id_stock} value={item.id_stock}>{item.producto?.sku} · {item.producto?.nombre} · {item.ubicacion?.codigo} · disp. {item.cantidad_disponible}</option>)}</select></label><label>Ubicación destino<select value={transfer.id_ubicacion_destino} onChange={(event) => setTransfer((current) => ({ ...current, id_ubicacion_destino: Number(event.target.value) }))}><option value={0}>Seleccionar ubicación</option>{options.ubicaciones.map((item) => <option key={item.id_ubicacion} value={item.id_ubicacion}>{item.codigo}</option>)}</select></label><div className="form-grid"><label>Cantidad<input type="number" min="0.01" step="0.01" value={transfer.cantidad} onChange={(event) => setTransfer((current) => ({ ...current, cantidad: event.target.value }))} /></label><label>Motivo<input value={transfer.motivo} onChange={(event) => setTransfer((current) => ({ ...current, motivo: event.target.value }))} placeholder="Ej. Reabastecimiento" /></label></div><div className="modal-actions"><button className="secondary-button" type="button" onClick={() => setCreateOpen(false)}>Cancelar</button><button className="action-button" type="submit" disabled={saving}>{saving ? "Registrando…" : "Registrar traslado"}</button></div></form></Modal>}

      {repackOpen && <Modal title="Dividir o reempacar pallet" description="Las fracciones conservarán el pallet original como padre de trazabilidad." className="modal-panel-wide" onClose={() => setRepackOpen(false)}><form className="management-form" onSubmit={submitRepacking}>{formError && <div className="inline-alert compact" role="alert">{formError}</div>}<label>Stock / pallet de origen<select value={repack.id_stock_origen} onChange={(event) => setRepack((current) => ({ ...current, id_stock_origen: Number(event.target.value) }))}><option value={0}>Seleccionar stock</option>{stocks.map((item) => <option key={item.id_stock} value={item.id_stock}>{item.pallet?.codigo_barras ?? `Stock ${item.id_stock}`} · {item.producto?.nombre} · disponible {item.cantidad_disponible}</option>)}</select></label><label>Motivo<input value={repack.motivo} onChange={(event) => setRepack((current) => ({ ...current, motivo: event.target.value }))} placeholder="Ej. Pallet declarado 50 recibido como 20 + 30" /></label><section className="repack-editor"><header><div><strong>Fracciones resultantes</strong><small>La suma no puede superar el disponible del origen.</small></div><button className="secondary-button compact-button" type="button" onClick={() => setRepack((current) => ({ ...current, fracciones: [...current.fracciones, { codigo_pallet: "", cantidad: "" }] }))}><Plus size={14} /> Añadir</button></header>{repack.fracciones.map((item, index) => <div className="repack-row" key={index}><label>Código del nuevo pallet<input value={item.codigo_pallet} onChange={(event) => setRepack((current) => ({ ...current, fracciones: current.fracciones.map((fraction, currentIndex) => currentIndex === index ? { ...fraction, codigo_pallet: event.target.value.toUpperCase() } : fraction) }))} placeholder="Se genera si queda vacío" /></label><label>Cantidad<input type="number" min="0.01" step="0.01" value={item.cantidad} onChange={(event) => setRepack((current) => ({ ...current, fracciones: current.fracciones.map((fraction, currentIndex) => currentIndex === index ? { ...fraction, cantidad: event.target.value } : fraction) }))} /></label>{repack.fracciones.length > 2 && <button className="line-delete" type="button" onClick={() => setRepack((current) => ({ ...current, fracciones: current.fracciones.filter((_, currentIndex) => currentIndex !== index) }))}>×</button>}</div>)}</section><div className="modal-actions"><button className="secondary-button" type="button" onClick={() => setRepackOpen(false)}>Cancelar</button><button className="action-button" type="submit" disabled={saving}>{saving ? "Procesando…" : "Confirmar fraccionamiento"}</button></div></form></Modal>}
    </section>
  );
}
