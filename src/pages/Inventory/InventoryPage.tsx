import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  Boxes,
  CalendarClock,
  MapPinned,
  PackageCheck,
  RefreshCw,
  Warehouse,
} from "lucide-react";
import { getApiMessage } from "../../features/access/api";
import { useAuth } from "../../features/auth/auth-context";
import {
  getExpirationAlerts,
  getInventoryOptions,
  getOccupancy,
  listStocks,
} from "../../features/inventory/api";
import type {
  ExpirationAlert,
  InventoryFilters,
  InventoryOptions,
  StockItem,
  WarehouseOccupancy,
} from "../../features/inventory/types";

const EMPTY_FILTERS: InventoryFilters = {
  producto: "",
  cliente: "",
  almacen: "",
  ubicacion: "",
  lote: "",
  fecha_vencimiento: "",
  estado: "",
};

const EMPTY_OPTIONS: InventoryOptions = {
  almacenes: [],
  ubicaciones: [],
  estados_stock: [],
  estados_movimiento: [],
};

function formatQuantity(value: string | number) {
  return new Intl.NumberFormat("es-PE", { maximumFractionDigits: 2 }).format(Number(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value));
}

function stockStatusClass(value: StockItem["estado"]) {
  if (value === "DISP") return "received";
  if (value === "BLOQ") return "discrepancy";
  if (value === "RES") return "pending";
  return "progress";
}

export default function InventoryPage() {
  const { profile } = useAuth();
  const permissions = useMemo(() => new Set(profile?.permisos ?? []), [profile?.permisos]);
  const canSeeOccupancy = permissions.has("inventario.ocupacion");
  const canSeeExpirations = permissions.has("inventario.vencimientos");
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [occupancy, setOccupancy] = useState<WarehouseOccupancy[]>([]);
  const [alerts, setAlerts] = useState<ExpirationAlert[]>([]);
  const [options, setOptions] = useState<InventoryOptions>(EMPTY_OPTIONS);
  const [filters, setFilters] = useState<InventoryFilters>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<InventoryFilters>(EMPTY_FILTERS);
  const [threshold, setThreshold] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [stockData, optionData, occupancyData, expirationData] = await Promise.all([
        listStocks(appliedFilters),
        getInventoryOptions(),
        canSeeOccupancy ? getOccupancy() : Promise.resolve([]),
        canSeeExpirations
          ? getExpirationAlerts(threshold, appliedFilters)
          : Promise.resolve({ umbral_dias: threshold, resultados: [] }),
      ]);
      setStocks(stockData);
      setOptions(optionData);
      setOccupancy(occupancyData);
      setAlerts(expirationData.resultados);
    } catch (currentError) {
      setError(getApiMessage(currentError));
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, canSeeExpirations, canSeeOccupancy, threshold]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const metrics = useMemo(() => ({
    total: stocks.reduce((sum, item) => sum + Number(item.cantidad_total), 0),
    available: stocks.reduce((sum, item) => sum + Number(item.cantidad_disponible), 0),
    locations: new Set(stocks.map((item) => item.ubicacion?.id_ubicacion).filter(Boolean)).size,
    alerts: alerts.length,
  }), [alerts.length, stocks]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAppliedFilters(filters);
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
  }

  return (
    <section className="management-page inventory-page">
      <header className="page-heading">
        <div>
          <span className="page-eyebrow">EP-04 · Inventario y movimientos</span>
          <h1>Inventario global</h1>
          <p>Existencias actualizadas, ubicación, ocupación y vencimientos en una sola vista.</p>
        </div>
        <button className="secondary-button" type="button" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={15} /> Actualizar
        </button>
      </header>

      {error && <div className="inline-alert" role="alert"><span>{error}</span><button type="button" onClick={() => void load()}>Reintentar</button></div>}

      <div className="reception-metrics">
        <article><span className="metric-symbol blue"><Boxes size={20} /></span><div><small>Stock total</small><strong>{formatQuantity(metrics.total)}</strong><span>Unidades registradas</span></div></article>
        <article><span className="metric-symbol green"><PackageCheck size={20} /></span><div><small>Disponible</small><strong>{formatQuantity(metrics.available)}</strong><span>Descontando reservas</span></div></article>
        <article><span className="metric-symbol amber"><MapPinned size={20} /></span><div><small>Ubicaciones</small><strong>{metrics.locations}</strong><span>Con existencias</span></div></article>
        <article><span className="metric-symbol red"><CalendarClock size={20} /></span><div><small>Alertas</small><strong>{metrics.alerts}</strong><span>Dentro de {threshold} días</span></div></article>
      </div>

      <form className="product-filters inventory-filters" onSubmit={applyFilters}>
        <label>Producto / SKU<input value={filters.producto} onChange={(event) => setFilters((current) => ({ ...current, producto: event.target.value }))} placeholder="Buscar producto" /></label>
        <label>Cliente<input value={filters.cliente} onChange={(event) => setFilters((current) => ({ ...current, cliente: event.target.value }))} placeholder="Razón social o RUC" /></label>
        <label>Almacén<select value={filters.almacen} onChange={(event) => setFilters((current) => ({ ...current, almacen: event.target.value }))}><option value="">Todos</option>{options.almacenes.map((item) => <option key={item.id_almacen} value={item.codigo}>{item.nombre}</option>)}</select></label>
        <label>Ubicación<input value={filters.ubicacion} onChange={(event) => setFilters((current) => ({ ...current, ubicacion: event.target.value }))} placeholder="Zona, rack o código" /></label>
        <label>Lote<input value={filters.lote} onChange={(event) => setFilters((current) => ({ ...current, lote: event.target.value }))} placeholder="Código de lote" /></label>
        <label>Vencimiento<input type="date" value={filters.fecha_vencimiento} onChange={(event) => setFilters((current) => ({ ...current, fecha_vencimiento: event.target.value }))} /></label>
        <label>Estado<select value={filters.estado} onChange={(event) => setFilters((current) => ({ ...current, estado: event.target.value }))}><option value="">Todos</option>{options.estados_stock.map((item) => <option key={item.codigo} value={item.codigo}>{item.nombre}</option>)}</select></label>
        <div className="filter-actions"><button className="secondary-button" type="button" onClick={clearFilters}>Limpiar</button><button className="action-button" type="submit">Filtrar</button></div>
      </form>

      <div className="data-card inventory-list-card">
        {loading ? <div className="content-loading"><span className="loading-spinner" />Cargando inventario…</div> : stocks.length === 0 ? <div className="empty-state"><Boxes size={32} /><strong>No hay existencias para mostrar</strong><span>El stock aparecerá cuando se asignen ubicaciones en Recepciones.</span></div> : (
          <table className="data-table inventory-table">
            <thead><tr><th>Producto / SKU</th><th>Cliente</th><th>Almacén / ubicación</th><th>Lote / pallet</th><th>Total</th><th>Disponible</th><th>Estado</th></tr></thead>
            <tbody>{stocks.map((item) => <tr key={item.id_stock}>
              <td><div className="user-cell"><span className="table-avatar"><Boxes size={16} /></span><div><strong>{item.producto?.nombre ?? "Producto no disponible"}</strong><small>{item.producto?.sku ?? `Stock #${item.id_stock}`}</small></div></div></td>
              <td>{item.cliente?.razon_social ?? "—"}</td>
              <td><div className="table-stack"><strong>{item.ubicacion?.codigo ?? "—"}</strong><small>{item.almacen?.nombre ?? "Sin almacén"} · {item.zona?.nombre ?? "Sin zona"}</small></div></td>
              <td><div className="table-stack"><strong>{item.lote?.codigo ?? "Sin lote"}</strong><small>{item.pallet?.codigo_barras ?? "Sin pallet"}</small></div></td>
              <td>{formatQuantity(item.cantidad_total)}</td><td><strong>{formatQuantity(item.cantidad_disponible)}</strong></td>
              <td><span className={`reception-status ${stockStatusClass(item.estado)}`}><i />{item.estado_nombre}</span></td>
            </tr>)}</tbody>
          </table>
        )}
      </div>

      <div className="inventory-insights">
        {canSeeOccupancy && <section className="inventory-panel">
          <header><div><h2>Ocupación de almacenes</h2><p>Capacidad en posiciones de pallet y ubicaciones activas.</p></div><Warehouse size={20} /></header>
          <div className="occupancy-list">{occupancy.length === 0 ? <div className="empty-inline">No hay almacenes activos.</div> : occupancy.map((item) => <article key={item.id_almacen}>
            <div className="occupancy-heading"><div><strong>{item.nombre}</strong><small>{item.utilizada} utilizadas · {item.disponible} disponibles</small></div><b>{item.porcentaje}%</b></div>
            <div className="occupancy-track"><span style={{ width: `${Math.min(item.porcentaje, 100)}%` }} /></div>
            <div className="location-chips">{item.ubicaciones.slice(0, 8).map((location) => <span className={location.ocupada ? "occupied" : ""} key={location.id_ubicacion}>{location.codigo}</span>)}</div>
          </article>)}</div>
        </section>}

        {canSeeExpirations && <section className="inventory-panel expiration-panel">
          <header><div><h2>Próximos vencimientos</h2><p>Prioriza la revisión según el umbral configurado.</p></div><label className="threshold-control"><input type="number" min="0" max="3650" value={threshold} onChange={(event) => setThreshold(Math.max(0, Number(event.target.value)))} /><span>días</span></label></header>
          <div className="expiration-list">{alerts.length === 0 ? <div className="empty-inline">No existen lotes dentro del umbral.</div> : alerts.slice(0, 8).map((item) => <article key={item.id_stock}>
            <span className={`expiry-icon ${item.nivel.toLowerCase()}`}><AlertTriangle size={16} /></span>
            <div><strong>{item.producto?.nombre}</strong><small>Lote {item.lote?.codigo} · {item.ubicacion?.codigo} · {formatDate(item.lote?.fecha_vencimiento ?? "")}</small></div>
            <b>{item.dias_restantes < 0 ? `${Math.abs(item.dias_restantes)} d vencido` : `${item.dias_restantes} d`}</b>
          </article>)}</div>
        </section>}
      </div>
    </section>
  );
}
