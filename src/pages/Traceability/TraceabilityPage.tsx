import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AlertTriangle, ArrowRightLeft, Boxes, Download, MapPinned, PackageCheck, RefreshCw, Search, Truck } from "lucide-react";
import { getApiMessage } from "../../features/access/api";
import { downloadReport, getTraceability } from "../../features/reports/api";
import type { TraceabilityProduct } from "../../features/reports/types";

const EMPTY_FILTERS = { producto: "", lote: "", cliente: "" };
function quantity(value: string | number) { return new Intl.NumberFormat("es-PE", { maximumFractionDigits: 2 }).format(Number(value)); }
function dateTime(value: string) { return new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
function eventIcon(type: string) {
  if (type === "RECEPCION") return <PackageCheck size={17}/>;
  if (type === "MOVIMIENTO") return <ArrowRightLeft size={17}/>;
  if (type === "DESPACHO") return <Truck size={17}/>;
  return <AlertTriangle size={17}/>;
}

export default function TraceabilityPage() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [applied, setApplied] = useState(EMPTY_FILTERS);
  const [results, setResults] = useState<TraceabilityProduct[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await getTraceability(applied);
      setResults(data);
      setSelectedId((current) => data.some((item) => item.producto.id_producto === current) ? current : data[0]?.producto.id_producto ?? null);
    } catch (currentError) { setError(getApiMessage(currentError)); }
    finally { setLoading(false); }
  }, [applied]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  const selected = results.find((item) => item.producto.id_producto === selectedId) ?? null;

  function submit(event: FormEvent) { event.preventDefault(); setApplied(filters); }
  async function exportTraceability() {
    try { await downloadReport("trazabilidad", "xlsx", applied); }
    catch (currentError) { setError(getApiMessage(currentError)); }
  }

  return <section className="management-page traceability-page">
    <header className="page-heading"><div><span className="page-eyebrow">EP-06 · Trazabilidad</span><h1>Historial del producto</h1><p>Sigue cada SKU y lote desde la recepción hasta su ubicación, incidencias y despacho.</p></div><div className="page-actions"><button className="secondary-button" type="button" onClick={() => void exportTraceability()}><Download size={15}/>Exportar Excel</button><button className="secondary-button" type="button" onClick={() => void load()} disabled={loading}><RefreshCw size={15}/>Actualizar</button></div></header>
    {error && <div className="inline-alert" role="alert"><span>{error}</span><button type="button" onClick={() => void load()}>Reintentar</button></div>}
    <form className="product-filters traceability-filters" onSubmit={submit}><label>Producto / SKU<input value={filters.producto} onChange={(event) => setFilters((current) => ({ ...current, producto: event.target.value }))} placeholder="Nombre, SKU o EAN"/></label><label>Lote<input value={filters.lote} onChange={(event) => setFilters((current) => ({ ...current, lote: event.target.value }))} placeholder="Código de lote"/></label><label>Cliente<input value={filters.cliente} onChange={(event) => setFilters((current) => ({ ...current, cliente: event.target.value }))} placeholder="Razón social o RUC"/></label><div className="filter-actions"><button className="secondary-button" type="button" onClick={() => { setFilters(EMPTY_FILTERS); setApplied(EMPTY_FILTERS); }}>Limpiar</button><button className="action-button" type="submit"><Search size={14}/>Buscar</button></div></form>

    {loading ? <div className="content-loading"><span className="loading-spinner"/>Reconstruyendo trazabilidad…</div> : results.length === 0 ? <div className="data-card empty-state"><Boxes size={34}/><strong>No encontramos productos</strong><span>Prueba con otro SKU, lote o cliente.</span></div> : <div className="traceability-layout">
      <aside className="traceability-products"><header><strong>{results.length} productos</strong><small>Selecciona uno para ver su historia</small></header>{results.map((item) => <button className={item.producto.id_producto === selectedId ? "active" : ""} type="button" key={item.producto.id_producto} onClick={() => setSelectedId(item.producto.id_producto)}><span className="table-avatar"><Boxes size={16}/></span><span><strong>{item.producto.nombre}</strong><small>{item.producto.sku} · {item.cliente?.razon_social ?? "Sin cliente"}</small></span></button>)}</aside>
      {selected && <div className="traceability-detail"><header><div><span className="page-eyebrow">{selected.producto.sku}</span><h2>{selected.producto.nombre}</h2><p>{selected.cliente?.razon_social ?? "Cliente no disponible"} · EAN {selected.producto.codigo_ean}</p></div><div className="traceability-totals"><span><b>{selected.lotes.length}</b>Lotes</span><span><b>{selected.stock_actual.length}</b>Stocks</span><span><b>{selected.eventos.length}</b>Eventos</span></div></header>
        <section className="current-stock"><h3><MapPinned size={17}/>Stock y ubicación actual</h3><div>{selected.stock_actual.length === 0 ? <p>Sin existencias actuales.</p> : selected.stock_actual.map((stock) => <article key={stock.id_stock}><div><strong>{stock.ubicacion?.codigo ?? "Sin ubicación"}</strong><small>{stock.almacen?.nombre} · {stock.zona?.nombre}</small></div><span>{stock.lote?.codigo ?? "Sin lote"}</span><b>{quantity(stock.cantidad_disponible)} disp.</b></article>)}</div></section>
        <section className="traceability-timeline"><h3>Secuencia completa</h3>{selected.eventos.length === 0 ? <p>Este producto todavía no tiene eventos operativos.</p> : selected.eventos.map((event, index) => <article className={event.tipo.toLowerCase()} key={`${event.tipo}-${event.documento}-${index}`}><span className="timeline-icon">{eventIcon(event.tipo)}</span><div><header><strong>{event.titulo}</strong><time>{dateTime(event.fecha)}</time></header><p>{event.detalle}</p><footer><span>{event.documento}</span><b>{quantity(event.cantidad)} unidades</b></footer></div></article>)}</section>
      </div>}
    </div>}
  </section>;
}
