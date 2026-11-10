import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  ClipboardCheck,
  MapPin,
  PackagePlus,
  Plus,
  Printer,
  Trash2,
} from "lucide-react";
import Modal from "../../components/Modal";
import { getApiMessage } from "../../features/access/api";
import { useAuth } from "../../features/auth/auth-context";
import {
  assignReceptionLocation,
  createReception,
  createReceptionIncident,
  getReception,
  getReceptionDocument,
  getReceptionOptions,
  listReceptions,
  registerReceptionLots,
  validateReception,
} from "../../features/receptions/api";
import type {
  IncidentPayload,
  LocationAssignmentPayload,
  ReceptionCreatePayload,
  ReceptionDetail,
  ReceptionDocument,
  ReceptionFilters,
  ReceptionOptions,
  ReceptionLotsPayload,
  ReceptionStatus,
  ReceptionSummary,
  ReceptionValidationPayload,
} from "../../features/receptions/types";

const EMPTY_FILTERS: ReceptionFilters = {
  documento: "",
  cliente: "",
  producto: "",
  estado: "",
  responsable: "",
  fecha_desde: "",
  fecha_hasta: "",
};

const EMPTY_OPTIONS: ReceptionOptions = {
  clientes: [],
  productos: [],
  ubicaciones: [],
  estados: [],
};

function today() {
  const current = new Date();
  const local = new Date(current.getTime() - current.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function emptyReceipt(): ReceptionCreatePayload {
  return {
    id_cliente: 0,
    codigo_documento: "",
    fecha_programada: today(),
    transporte_placa: "",
    transporte_conductor: "",
    transporte_brevete: "",
    lineas: [{ id_producto: 0, cantidad_esperada: "1", cantidad_pallets: "0" }],
  };
}

function futureDate(days = 30) {
  const value = new Date();
  value.setDate(value.getDate() + days);
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function formatDate(value: string | null, withTime = false) {
  if (!value) return "—";
  const normalizedValue = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T12:00:00`
    : value;
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(new Date(normalizedValue));
}

function statusClass(value: ReceptionStatus) {
  if (value === "Recibido") return "received";
  if (value === "Con Discrepancia") return "discrepancy";
  if (value === "Cancelado") return "cancelled";
  if (value === "En Proceso") return "progress";
  return "pending";
}

type ActionModal = "validate" | "assign" | "incident" | "lots" | null;

export default function ReceptionsPage() {
  const { profile } = useAuth();
  const permissions = useMemo(() => new Set(profile?.permisos ?? []), [profile?.permisos]);
  const canCreate = permissions.has("recepciones.crear");
  const canValidate = permissions.has("recepciones.validar");
  const canAssign = permissions.has("recepciones.asignar_ubicacion");
  const canReportIncident = permissions.has("recepciones.incidencias");
  const canRegisterLots = permissions.has("recepciones.lotes");
  const canPrint = permissions.has("recepciones.imprimir");

  const [receipts, setReceipts] = useState<ReceptionSummary[]>([]);
  const [options, setOptions] = useState<ReceptionOptions>(EMPTY_OPTIONS);
  const [filters, setFilters] = useState<ReceptionFilters>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<ReceptionFilters>(EMPTY_FILTERS);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<ReceptionCreatePayload>(emptyReceipt());
  const [detail, setDetail] = useState<ReceptionDetail | null>(null);
  const [printDocument, setPrintDocument] = useState<ReceptionDocument | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionModal, setActionModal] = useState<ActionModal>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [validation, setValidation] = useState<ReceptionValidationPayload>({
    documento_verificado: false,
    lineas: [],
  });
  const [assignment, setAssignment] = useState<LocationAssignmentPayload>({
    id_pedido_ingreso_detalle: 0,
    id_pedido_ingreso_lote: null,
    id_ubicacion: 0,
    cantidad: "",
  });
  const [incident, setIncident] = useState<IncidentPayload>({
    id_pedido_ingreso_detalle: 0,
    tipo: "DIFERENCIA",
    descripcion: "",
    cantidad_afectada: "1",
  });
  const [lotForm, setLotForm] = useState<ReceptionLotsPayload>({
    id_pedido_ingreso_detalle: 0,
    lotes: [],
  });

  const loadData = useCallback(async (currentFilters: ReceptionFilters) => {
    setLoading(true);
    setPageError(null);
    try {
      const [receiptData, optionData] = await Promise.all([
        listReceptions(currentFilters),
        getReceptionOptions(),
      ]);
      setReceipts(receiptData);
      setOptions(optionData);
    } catch (error) {
      setPageError(getApiMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadData(appliedFilters), 0);
    return () => window.clearTimeout(timer);
  }, [appliedFilters, loadData]);

  const metrics = useMemo(() => ({
    total: receipts.length,
    pending: receipts.filter((item) => ["Pendiente", "En Proceso"].includes(item.estado)).length,
    discrepancies: receipts.filter((item) => item.estado === "Con Discrepancia").length,
    completed: receipts.filter((item) => item.estado === "Recibido").length,
  }), [receipts]);

  const clientProducts = options.productos.filter(
    (product) => product.id_cliente === createForm.id_cliente,
  );

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAppliedFilters(filters);
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
  }

  function openCreate() {
    setCreateForm(emptyReceipt());
    setFormError(null);
    setCreateOpen(true);
  }

  async function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    if (!createForm.id_cliente || !createForm.codigo_documento.trim() || !createForm.fecha_programada) {
      setFormError("Completa el cliente, la guía de remisión y la fecha programada.");
      return;
    }
    if (createForm.lineas.some((line) => {
      const product = options.productos.find(
        (item) => item.id_producto === line.id_producto,
      );
      return !line.id_producto
        || Number(line.cantidad_esperada) <= 0
        || (product?.factor_conversion && Number(line.cantidad_pallets) <= 0);
    })) {
      setFormError("Selecciona el producto y una cantidad válida en cada línea.");
      return;
    }
    setSaving(true);
    try {
      const created = await createReception({
        ...createForm,
        codigo_documento: createForm.codigo_documento.trim().toUpperCase(),
        transporte_placa: createForm.transporte_placa.trim().toUpperCase(),
        transporte_conductor: createForm.transporte_conductor.trim(),
        transporte_brevete: createForm.transporte_brevete.trim().toUpperCase(),
      });
      setCreateOpen(false);
      setDetail(created);
      await loadData(appliedFilters);
    } catch (error) {
      setFormError(getApiMessage(error));
    } finally {
      setSaving(false);
    }
  }

  function addLine() {
    setCreateForm((current) => ({
      ...current,
      lineas: [
        ...current.lineas,
        { id_producto: 0, cantidad_esperada: "1", cantidad_pallets: "0" },
      ],
    }));
  }

  function removeLine(index: number) {
    setCreateForm((current) => ({
      ...current,
      lineas: current.lineas.filter((_, currentIndex) => currentIndex !== index),
    }));
  }

  async function openDetail(receiptId: number) {
    setDetailLoading(true);
    setPageError(null);
    try {
      setDetail(await getReception(receiptId));
    } catch (error) {
      setPageError(getApiMessage(error));
    } finally {
      setDetailLoading(false);
    }
  }

  function openValidation() {
    if (!detail) return;
    setValidation({
      documento_verificado: false,
      lineas: detail.lineas.map((line) => ({
        id_pedido_ingreso_detalle: line.id_pedido_ingreso_detalle,
        cantidad_recibida: line.cantidad_esperada,
        cantidad_rechazada: "0",
        observacion: "",
      })),
    });
    setFormError(null);
    setActionModal("validate");
  }

  function openAssignment() {
    if (!detail?.lineas[0]) return;
    const line = detail.lineas.find(
      (item) => !item.controla_lote || item.lotes.length > 0,
    ) ?? detail.lineas[0];
    const selectedLot = line.controla_lote ? line.lotes[0] : null;
    const assigned = line.asignaciones
      .filter((item) => !selectedLot || item.lote?.id_lote === selectedLot.id_lote)
      .reduce((sum, item) => sum + Number(item.cantidad), 0);
    const available = selectedLot
      ? Number(selectedLot.cantidad) - assigned
      : Number(line.cantidad_recibida) - Number(line.cantidad_rechazada) - assigned;
    setAssignment({
      id_pedido_ingreso_detalle: line.id_pedido_ingreso_detalle,
      id_pedido_ingreso_lote: selectedLot?.id_pedido_ingreso_lote ?? null,
      id_ubicacion: 0,
      cantidad: String(Math.max(0, available)),
    });
    setFormError(null);
    setActionModal("assign");
  }

  function openIncident() {
    if (!detail?.lineas[0]) return;
    setIncident({
      id_pedido_ingreso_detalle: detail.lineas[0].id_pedido_ingreso_detalle,
      tipo: "DIFERENCIA",
      descripcion: "",
      cantidad_afectada: "1",
    });
    setFormError(null);
    setActionModal("incident");
  }

  function openLots() {
    const line = detail?.lineas.find((item) => item.controla_lote);
    if (!line) return;
    setLotForm({
      id_pedido_ingreso_detalle: line.id_pedido_ingreso_detalle,
      lotes: line.lotes.length
        ? line.lotes.map((lot) => ({
            codigo: lot.codigo,
            fecha_fabricacion: lot.fecha_fabricacion,
            fecha_vencimiento: lot.fecha_vencimiento,
            cantidad: lot.cantidad,
          }))
        : [{ codigo: "", fecha_fabricacion: null, fecha_vencimiento: futureDate(), cantidad: "" }],
    });
    setFormError(null);
    setActionModal("lots");
  }

  async function printReceipt() {
    if (!detail) return;
    setSaving(true);
    setFormError(null);
    try {
      setPrintDocument(await getReceptionDocument(detail.id_pedido_ingreso));
      window.setTimeout(() => window.print(), 0);
    } catch (error) {
      setFormError(getApiMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function refreshAfterAction(updated: ReceptionDetail) {
    setDetail(updated);
    setActionModal(null);
    const [, optionData] = await Promise.all([
      loadData(appliedFilters),
      getReceptionOptions(),
    ]);
    setOptions(optionData);
  }

  async function submitValidation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail) return;
    setSaving(true);
    setFormError(null);
    try {
      await refreshAfterAction(await validateReception(detail.id_pedido_ingreso, validation));
    } catch (error) {
      setFormError(getApiMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function submitAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail) return;
    setSaving(true);
    setFormError(null);
    try {
      await refreshAfterAction(await assignReceptionLocation(detail.id_pedido_ingreso, assignment));
    } catch (error) {
      setFormError(getApiMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function submitIncident(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail) return;
    setSaving(true);
    setFormError(null);
    try {
      await refreshAfterAction(await createReceptionIncident(detail.id_pedido_ingreso, incident));
    } catch (error) {
      setFormError(getApiMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function submitLots(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail) return;
    setSaving(true);
    setFormError(null);
    try {
      await refreshAfterAction(
        await registerReceptionLots(detail.id_pedido_ingreso, lotForm),
      );
    } catch (error) {
      setFormError(getApiMessage(error));
    } finally {
      setSaving(false);
    }
  }

  const selectedAssignmentLine = detail?.lineas.find(
    (line) => line.id_pedido_ingreso_detalle === assignment.id_pedido_ingreso_detalle,
  );
  const selectedAssignedQuantity = selectedAssignmentLine?.asignaciones.reduce(
    (sum, item) => (
      assignment.id_pedido_ingreso_lote === null
      || selectedAssignmentLine.lotes.find(
        (lot) => lot.id_pedido_ingreso_lote === assignment.id_pedido_ingreso_lote,
      )?.id_lote === item.lote?.id_lote
        ? sum + Number(item.cantidad)
        : sum
    ), 0,
  ) ?? 0;
  const selectedAssignmentLot = selectedAssignmentLine?.lotes.find(
    (lot) => lot.id_pedido_ingreso_lote === assignment.id_pedido_ingreso_lote,
  );
  const selectedAvailableQuantity = selectedAssignmentLine
    ? Math.max(
        0,
        Number(selectedAssignmentLot?.cantidad
          ?? (Number(selectedAssignmentLine.cantidad_recibida)
            - Number(selectedAssignmentLine.cantidad_rechazada)))
          - selectedAssignedQuantity,
      )
    : 0;

  return (
    <section className="management-page reception-page">
      <header className="page-heading management-heading">
        <div>
          <span className="page-eyebrow">Recepción y almacenamiento</span>
          <h1>Recepciones</h1>
          <p>Controla guías, conteos físicos, discrepancias y ubicación de la mercancía.</p>
        </div>
        {canCreate && (
          <button className="action-button" type="button" onClick={openCreate} disabled={!options.clientes.length || !options.productos.length}>
            <Plus size={17} /> Nueva recepción
          </button>
        )}
      </header>

      <div className="reception-metrics">
        <article><span className="metric-symbol blue"><ClipboardCheck size={19} /></span><div><small>Total registradas</small><strong>{metrics.total}</strong><span>Historial consultable</span></div></article>
        <article><span className="metric-symbol amber"><Boxes size={19} /></span><div><small>Pendientes</small><strong>{metrics.pending}</strong><span>Por validar</span></div></article>
        <article><span className="metric-symbol red"><AlertTriangle size={19} /></span><div><small>Discrepancias</small><strong>{metrics.discrepancies}</strong><span>Requieren seguimiento</span></div></article>
        <article><span className="metric-symbol green"><CheckCircle2 size={19} /></span><div><small>Completadas</small><strong>{metrics.completed}</strong><span>Recepción conforme</span></div></article>
      </div>

      <form className="product-filters reception-filters" onSubmit={applyFilters}>
        <label><span>Guía</span><input value={filters.documento} onChange={(event) => setFilters({ ...filters, documento: event.target.value })} placeholder="GR-001" /></label>
        <label><span>Cliente</span><input value={filters.cliente} onChange={(event) => setFilters({ ...filters, cliente: event.target.value })} placeholder="Razón social o RUC" /></label>
        <label><span>Producto</span><input value={filters.producto} onChange={(event) => setFilters({ ...filters, producto: event.target.value })} placeholder="SKU o nombre" /></label>
        <label><span>Estado</span><select value={filters.estado} onChange={(event) => setFilters({ ...filters, estado: event.target.value })}><option value="">Todos</option>{options.estados.map((state) => <option key={state}>{state}</option>)}</select></label>
        <label><span>Responsable</span><input value={filters.responsable} onChange={(event) => setFilters({ ...filters, responsable: event.target.value })} placeholder="Nombre o correo" /></label>
        <label><span>Desde</span><input type="date" value={filters.fecha_desde} onChange={(event) => setFilters({ ...filters, fecha_desde: event.target.value })} /></label>
        <label><span>Hasta</span><input type="date" value={filters.fecha_hasta} onChange={(event) => setFilters({ ...filters, fecha_hasta: event.target.value })} /></label>
        <div className="filter-actions"><button className="secondary-button" type="button" onClick={clearFilters}>Limpiar</button><button className="action-button" type="submit">Filtrar</button></div>
      </form>

      {pageError && <div className="inline-alert" role="alert">{pageError}<button type="button" onClick={() => void loadData(appliedFilters)}>Reintentar</button></div>}
      {canCreate && !loading && (!options.clientes.length || !options.productos.length) && <div className="info-alert">Registra clientes y productos activos antes de crear una recepción.</div>}

      {loading ? <div className="content-loading"><span className="loading-spinner" /> Cargando recepciones…</div> : (
        <div className="data-card reception-list-card">
          <table className="data-table reception-table">
            <thead><tr><th>Recepción</th><th>Cliente</th><th>Registro</th><th>Mercancía</th><th>Estado</th><th>Responsable</th><th><span className="sr-only">Acciones</span></th></tr></thead>
            <tbody>
              {receipts.map((receipt) => (
                <tr key={receipt.id_pedido_ingreso}>
                  <td><div className="stacked-cell"><strong className="primary-cell">REC-{String(receipt.id_pedido_ingreso).padStart(5, "0")}</strong><small>{receipt.codigo_documento}</small></div></td>
                  <td><div className="stacked-cell"><span>{receipt.cliente?.razon_social ?? "—"}</span><small>{receipt.cliente?.ruc}</small></div></td>
                  <td><div className="stacked-cell"><span>{formatDate(receipt.fecha_registro, true)}</span><small>Programada {formatDate(receipt.fecha_programada)}</small></div></td>
                  <td><div className="stacked-cell"><span>{receipt.cantidad_lineas} línea{receipt.cantidad_lineas === 1 ? "" : "s"}</span><small>{receipt.cantidad_recibida} / {receipt.cantidad_esperada} unidades</small></div></td>
                  <td><span className={`reception-status ${statusClass(receipt.estado)}`}><i />{receipt.estado}</span></td>
                  <td><div className="stacked-cell"><span>{receipt.responsable ? `${receipt.responsable.nombre} ${receipt.responsable.apellido}` : "—"}</span><small>{receipt.cantidad_incidencias ? `${receipt.cantidad_incidencias} incidencia(s)` : "Sin incidencias"}</small></div></td>
                  <td><button className="table-action" type="button" onClick={() => void openDetail(receipt.id_pedido_ingreso)} disabled={detailLoading}>Ver detalle</button></td>
                </tr>
              ))}
              {!receipts.length && <tr><td colSpan={7}><div className="empty-state"><ClipboardCheck size={30} /><strong>No hay recepciones registradas</strong><span>Crea la primera desde una guía de remisión o cambia los filtros.</span></div></td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {createOpen && (
        <Modal className="modal-panel-wide" title="Nueva recepción" description="Registra la guía de remisión y todas sus líneas declaradas." onClose={() => !saving && setCreateOpen(false)}>
          <form className="management-form" onSubmit={submitCreate}>
            <div className="form-grid"><label><span>Cliente propietario</span><select value={createForm.id_cliente} onChange={(event) => setCreateForm({ ...createForm, id_cliente: Number(event.target.value), lineas: [{ id_producto: 0, cantidad_esperada: "1", cantidad_pallets: "0" }] })} required autoFocus><option value={0}>Selecciona un cliente</option>{options.clientes.map((client) => <option key={client.id_cliente} value={client.id_cliente}>{client.razon_social} · {client.ruc}</option>)}</select></label><label><span>Guía de remisión</span><input value={createForm.codigo_documento} onChange={(event) => setCreateForm({ ...createForm, codigo_documento: event.target.value.toUpperCase() })} placeholder="T001-000123" required /></label></div>
            <div className="form-grid"><label><span>Fecha programada</span><input type="date" value={createForm.fecha_programada} onChange={(event) => setCreateForm({ ...createForm, fecha_programada: event.target.value })} required /></label><label><span>Placa</span><input value={createForm.transporte_placa} onChange={(event) => setCreateForm({ ...createForm, transporte_placa: event.target.value.toUpperCase() })} placeholder="ABC-123" /></label></div>
            <div className="form-grid"><label><span>Conductor</span><input value={createForm.transporte_conductor} onChange={(event) => setCreateForm({ ...createForm, transporte_conductor: event.target.value })} placeholder="Nombre del conductor" /></label><label><span>Brevete</span><input value={createForm.transporte_brevete} onChange={(event) => setCreateForm({ ...createForm, transporte_brevete: event.target.value.toUpperCase() })} placeholder="Q12345678" /></label></div>
            <section className="reception-lines-editor">
              <header><div><strong>Mercancía declarada</strong><small>Una línea por producto de la guía</small></div><button className="secondary-button compact-button" type="button" onClick={addLine} disabled={!createForm.id_cliente}><Plus size={15} /> Añadir línea</button></header>
              {createForm.lineas.map((line, index) => {
                const selectedProduct = clientProducts.find(
                  (product) => product.id_producto === line.id_producto,
                );
                const factor = Number(selectedProduct?.factor_conversion ?? 0);
                return (
                  <div className="reception-line-form" key={`line-${index}`}>
                    <label><span>Producto / código</span><select value={line.id_producto} onChange={(event) => setCreateForm({ ...createForm, lineas: createForm.lineas.map((item, itemIndex) => itemIndex === index ? { ...item, id_producto: Number(event.target.value), cantidad_esperada: "1", cantidad_pallets: "0" } : item) })} required><option value={0}>Selecciona un producto</option>{clientProducts.map((product) => <option key={product.id_producto} value={product.id_producto} disabled={createForm.lineas.some((item, itemIndex) => itemIndex !== index && item.id_producto === product.id_producto)}>{product.sku} · {product.nombre}{product.controla_lote ? " · Por lote" : ""}</option>)}</select></label>
                    {factor > 0 ? <label><span>Pallets</span><input type="number" min="0.01" step="0.01" value={line.cantidad_pallets} onChange={(event) => { const pallets = event.target.value; setCreateForm({ ...createForm, lineas: createForm.lineas.map((item, itemIndex) => itemIndex === index ? { ...item, cantidad_pallets: pallets, cantidad_esperada: pallets ? String(Number(pallets) * factor) : "" } : item) }); }} required /><small>{line.cantidad_pallets || 0} pallets × {factor} = {line.cantidad_esperada || 0} cajas</small></label> : <label><span>Cantidad</span><input type="number" min="0.01" step="0.01" value={line.cantidad_esperada} onChange={(event) => setCreateForm({ ...createForm, lineas: createForm.lineas.map((item, itemIndex) => itemIndex === index ? { ...item, cantidad_esperada: event.target.value, cantidad_pallets: "0" } : item) })} required /></label>}
                    <button className="icon-button line-delete" type="button" onClick={() => removeLine(index)} disabled={createForm.lineas.length === 1} aria-label="Eliminar línea"><Trash2 size={17} /></button>
                  </div>
                );
              })}
              {createForm.id_cliente > 0 && !clientProducts.length && <div className="info-alert compact">Este cliente no tiene productos activos asociados.</div>}
            </section>
            {formError && <div className="inline-alert compact" role="alert">{formError}</div>}
            <footer className="modal-actions"><button className="secondary-button" type="button" onClick={() => setCreateOpen(false)} disabled={saving}>Cancelar</button><button className="action-button" type="submit" disabled={saving || !clientProducts.length}>{saving ? "Registrando…" : "Registrar recepción"}</button></footer>
          </form>
        </Modal>
      )}

      {detail && !actionModal && (
        <Modal className="modal-panel-wide" title={`Recepción REC-${String(detail.id_pedido_ingreso).padStart(5, "0")}`} description={`${detail.codigo_documento} · ${detail.cliente?.razon_social ?? "Cliente no disponible"}`} onClose={() => setDetail(null)}>
          <div className="reception-detail">
            <div className="detail-summary"><div><span>Estado</span><strong className={`reception-status ${statusClass(detail.estado)}`}><i />{detail.estado}</strong></div><div><span>Fecha de registro</span><strong>{formatDate(detail.fecha_registro, true)}</strong></div><div><span>Responsable</span><strong>{detail.responsable ? `${detail.responsable.nombre} ${detail.responsable.apellido}` : "—"}</strong></div><div><span>Transporte</span><strong>{detail.transporte_placa || "Sin placa"}</strong><small>{detail.transporte_brevete ? `Brevete ${detail.transporte_brevete}` : detail.transporte_conductor}</small></div></div>
            <section className="detail-section"><header><div><strong>Líneas y trazabilidad</strong><small>Comparación física, lotes y ubicación asignada</small></div></header><div className="detail-lines">{detail.lineas.map((line) => <article key={line.id_pedido_ingreso_detalle}><div className="detail-product"><span className="product-icon"><Boxes size={18} /></span><div><strong>{line.descripcion_producto}</strong><small>{line.codigo_producto} · {line.unidad_medida?.codigo}{line.controla_lote ? " · Control por lote" : ""}</small>{line.factor_conversion && <small>{line.cantidad_pallets} pallets × {line.factor_conversion} = {line.cantidad_cajas} cajas</small>}</div></div><div className="quantity-comparison"><span>Guía <strong>{line.cantidad_esperada}</strong></span><span>Recibido <strong>{line.cantidad_recibida}</strong></span><span>Rechazado <strong>{line.cantidad_rechazada}</strong></span></div>{line.lotes.map((lot) => <div className="line-lot" key={lot.id_pedido_ingreso_lote}><Boxes size={14} /><span>Lote {lot.codigo}: {lot.cantidad} · vence {formatDate(lot.fecha_vencimiento)}</span></div>)}{line.discrepancias.map((item) => <div className="line-warning" key={item.id_discrepancia}><AlertTriangle size={14} /><span>{item.tipo}: {item.cantidad} · {item.descripcion}</span></div>)}{line.asignaciones.map((item) => <div className="line-location" key={item.id_asignacion}><MapPin size={14} /><span>{item.cantidad} unidades{item.lote ? ` del lote ${item.lote.codigo}` : ""} en {item.ubicacion?.codigo ?? "ubicación no disponible"}</span></div>)}</article>)}</div></section>
            <section className="detail-section"><header><div><strong>Incidencias</strong><small>Daños, documentos, calidad y diferencias</small></div></header>{detail.incidencias.length ? <div className="incident-list">{detail.incidencias.map((item) => <article key={item.id_incidencia}><span className="incident-type">{item.tipo}</span><div><strong>{item.descripcion}</strong><small>{item.cantidad_afectada} unidades · {formatDate(item.fecha_registro, true)} · {item.responsable?.nombre ?? "Usuario"}</small></div></article>)}</div> : <div className="empty-inline">Sin incidencias registradas.</div>}</section>
            {formError && <div className="inline-alert compact" role="alert">{formError}</div>}
            <footer className="reception-detail-actions"><button className="secondary-button" type="button" onClick={() => setDetail(null)}>Cerrar</button>{canPrint && <button className="secondary-button" type="button" onClick={() => void printReceipt()} disabled={saving}><Printer size={16} /> Imprimir pedido</button>}{canReportIncident && <button className="secondary-button" type="button" onClick={openIncident}><AlertTriangle size={16} /> Registrar incidencia</button>}{canRegisterLots && ["Recibido", "Con Discrepancia"].includes(detail.estado) && detail.lineas.some((line) => line.controla_lote) && <button className="secondary-button" type="button" onClick={openLots}><Boxes size={16} /> Registrar lotes</button>}{canAssign && ["Recibido", "Con Discrepancia"].includes(detail.estado) && <button className="secondary-button" type="button" onClick={openAssignment} disabled={!options.ubicaciones.length || detail.lineas.every((line) => line.controla_lote && !line.lotes.length)}><MapPin size={16} /> Asignar ubicación</button>}{canValidate && !["Recibido", "Con Discrepancia", "Cancelado"].includes(detail.estado) && <button className="action-button" type="button" onClick={openValidation}><ClipboardCheck size={16} /> Validar recepción</button>}</footer>
          </div>
        </Modal>
      )}

      {detail && actionModal === "validate" && (
        <Modal className="modal-panel-wide" title="Validar cantidades recibidas" description={`${detail.codigo_documento} · registra el conteo físico de todas las líneas.`} onClose={() => !saving && setActionModal(null)}>
          <form className="management-form" onSubmit={submitValidation}>
            <label className="document-check"><input type="checkbox" checked={validation.documento_verificado} onChange={(event) => setValidation({ ...validation, documento_verificado: event.target.checked })} /><span><strong>Guía de remisión verificada</strong><small>Confirmo que el documento corresponde al cliente y mercancía declarados.</small></span></label>
            <div className="validation-lines">{validation.lineas.map((line, index) => { const source = detail.lineas.find((item) => item.id_pedido_ingreso_detalle === line.id_pedido_ingreso_detalle); return <article key={line.id_pedido_ingreso_detalle}><header><strong>{source?.descripcion_producto}</strong><small>{source?.codigo_producto} · Guía: {source?.cantidad_esperada}</small></header><div className="form-grid"><label><span>Cantidad física</span><input type="number" min="0" step="0.01" value={line.cantidad_recibida} onChange={(event) => setValidation({ ...validation, lineas: validation.lineas.map((item, itemIndex) => itemIndex === index ? { ...item, cantidad_recibida: event.target.value } : item) })} required /></label><label><span>Cantidad rechazada</span><input type="number" min="0" step="0.01" value={line.cantidad_rechazada} onChange={(event) => setValidation({ ...validation, lineas: validation.lineas.map((item, itemIndex) => itemIndex === index ? { ...item, cantidad_rechazada: event.target.value } : item) })} required /></label></div><label><span>Observación de diferencia</span><input value={line.observacion} onChange={(event) => setValidation({ ...validation, lineas: validation.lineas.map((item, itemIndex) => itemIndex === index ? { ...item, observacion: event.target.value } : item) })} placeholder="Opcional si las cantidades coinciden" /></label></article>; })}</div>
            {formError && <div className="inline-alert compact" role="alert">{formError}</div>}
            <footer className="modal-actions"><button className="secondary-button" type="button" onClick={() => setActionModal(null)} disabled={saving}>Volver</button><button className="action-button" type="submit" disabled={saving || !validation.documento_verificado}>{saving ? "Validando…" : "Confirmar recepción"}</button></footer>
          </form>
        </Modal>
      )}

      {detail && actionModal === "assign" && (
        <Modal title="Asignar ubicación" description="Registra dónde quedará almacenada la mercancía recibida." onClose={() => !saving && setActionModal(null)}>
          <form className="management-form" onSubmit={submitAssignment}>
            <label><span>Producto recibido</span><select value={assignment.id_pedido_ingreso_detalle} onChange={(event) => { const lineId = Number(event.target.value); const line = detail.lineas.find((item) => item.id_pedido_ingreso_detalle === lineId); const lot = line?.controla_lote ? line.lotes[0] : null; const assigned = line?.asignaciones.filter((item) => !lot || item.lote?.id_lote === lot.id_lote).reduce((sum, item) => sum + Number(item.cantidad), 0) ?? 0; const total = lot ? Number(lot.cantidad) : line ? Number(line.cantidad_recibida) - Number(line.cantidad_rechazada) : 0; setAssignment({ ...assignment, id_pedido_ingreso_detalle: lineId, id_pedido_ingreso_lote: lot?.id_pedido_ingreso_lote ?? null, cantidad: String(Math.max(0, total - assigned)) }); }}><option value={0}>Selecciona una línea</option>{detail.lineas.map((line) => <option key={line.id_pedido_ingreso_detalle} value={line.id_pedido_ingreso_detalle} disabled={line.controla_lote && !line.lotes.length}>{line.codigo_producto} · {line.descripcion_producto}{line.controla_lote && !line.lotes.length ? " · registra lotes primero" : ""}</option>)}</select></label>
            {selectedAssignmentLine?.controla_lote && <label><span>Lote</span><select value={assignment.id_pedido_ingreso_lote ?? 0} onChange={(event) => { const lotId = Number(event.target.value); const lot = selectedAssignmentLine.lotes.find((item) => item.id_pedido_ingreso_lote === lotId); const assigned = selectedAssignmentLine.asignaciones.filter((item) => item.lote?.id_lote === lot?.id_lote).reduce((sum, item) => sum + Number(item.cantidad), 0); setAssignment({ ...assignment, id_pedido_ingreso_lote: lotId || null, cantidad: lot ? String(Math.max(0, Number(lot.cantidad) - assigned)) : "" }); }} required><option value={0}>Selecciona un lote</option>{selectedAssignmentLine.lotes.map((lot) => <option key={lot.id_pedido_ingreso_lote} value={lot.id_pedido_ingreso_lote}>{lot.codigo} · vence {formatDate(lot.fecha_vencimiento)}</option>)}</select></label>}
            <small className="assignment-available">Disponible para ubicar: <strong>{selectedAvailableQuantity}</strong></small>
            <label><span>Ubicación disponible</span><select value={assignment.id_ubicacion} onChange={(event) => setAssignment({ ...assignment, id_ubicacion: Number(event.target.value) })} required><option value={0}>Selecciona una ubicación</option>{options.ubicaciones.map((location) => <option key={location.id_ubicacion} value={location.id_ubicacion}>{location.codigo} · {location.almacen} / {location.zona} / Rack {location.rack}</option>)}</select></label>
            <label><span>Cantidad a ubicar</span><input type="number" min="0.01" step="0.01" value={assignment.cantidad} onChange={(event) => setAssignment({ ...assignment, cantidad: event.target.value })} required /></label>
            {formError && <div className="inline-alert compact" role="alert">{formError}</div>}
            <footer className="modal-actions"><button className="secondary-button" type="button" onClick={() => setActionModal(null)} disabled={saving}>Volver</button><button className="action-button" type="submit" disabled={saving || !assignment.id_ubicacion || Number(assignment.cantidad) <= 0 || (selectedAssignmentLine?.controla_lote && !assignment.id_pedido_ingreso_lote)}>{saving ? "Asignando…" : "Asignar ubicación"}</button></footer>
          </form>
        </Modal>
      )}

      {detail && actionModal === "lots" && (
        <Modal className="modal-panel-wide" title="Registrar lotes y vencimientos" description="La suma de lotes debe coincidir con la cantidad aceptada del producto." onClose={() => !saving && setActionModal(null)}>
          <form className="management-form" onSubmit={submitLots}>
            <label><span>Producto con trazabilidad</span><select value={lotForm.id_pedido_ingreso_detalle} onChange={(event) => { const lineId = Number(event.target.value); const line = detail.lineas.find((item) => item.id_pedido_ingreso_detalle === lineId); setLotForm({ id_pedido_ingreso_detalle: lineId, lotes: line?.lotes.length ? line.lotes.map((lot) => ({ codigo: lot.codigo, fecha_fabricacion: lot.fecha_fabricacion, fecha_vencimiento: lot.fecha_vencimiento, cantidad: lot.cantidad })) : [{ codigo: "", fecha_fabricacion: null, fecha_vencimiento: futureDate(), cantidad: "" }] }); }}><option value={0}>Selecciona una línea</option>{detail.lineas.filter((line) => line.controla_lote).map((line) => <option key={line.id_pedido_ingreso_detalle} value={line.id_pedido_ingreso_detalle}>{line.codigo_producto} · {line.descripcion_producto} · aceptado {Number(line.cantidad_recibida) - Number(line.cantidad_rechazada)}</option>)}</select></label>
            <section className="reception-lines-editor">
              <header><div><strong>Desglose por lotes</strong><small>Código, fabricación, vencimiento y cantidad</small></div><button className="secondary-button compact-button" type="button" onClick={() => setLotForm({ ...lotForm, lotes: [...lotForm.lotes, { codigo: "", fecha_fabricacion: null, fecha_vencimiento: futureDate(), cantidad: "" }] })}><Plus size={15} /> Añadir lote</button></header>
              {lotForm.lotes.map((lot, index) => <div className="lot-form-row" key={`lot-${index}`}><label><span>Código de lote</span><input value={lot.codigo} onChange={(event) => setLotForm({ ...lotForm, lotes: lotForm.lotes.map((item, itemIndex) => itemIndex === index ? { ...item, codigo: event.target.value.toUpperCase() } : item) })} required /></label><label><span>Fabricación</span><input type="date" value={lot.fecha_fabricacion ?? ""} onChange={(event) => setLotForm({ ...lotForm, lotes: lotForm.lotes.map((item, itemIndex) => itemIndex === index ? { ...item, fecha_fabricacion: event.target.value || null } : item) })} /></label><label><span>Vencimiento</span><input type="date" min={today()} value={lot.fecha_vencimiento} onChange={(event) => setLotForm({ ...lotForm, lotes: lotForm.lotes.map((item, itemIndex) => itemIndex === index ? { ...item, fecha_vencimiento: event.target.value } : item) })} required /></label><label><span>Cantidad</span><input type="number" min="0.01" step="0.01" value={lot.cantidad} onChange={(event) => setLotForm({ ...lotForm, lotes: lotForm.lotes.map((item, itemIndex) => itemIndex === index ? { ...item, cantidad: event.target.value } : item) })} required /></label><button className="icon-button line-delete" type="button" onClick={() => setLotForm({ ...lotForm, lotes: lotForm.lotes.filter((_, itemIndex) => itemIndex !== index) })} disabled={lotForm.lotes.length === 1} aria-label="Eliminar lote"><Trash2 size={17} /></button></div>)}
              <div className="lot-total"><span>Total declarado en lotes</span><strong>{lotForm.lotes.reduce((sum, lot) => sum + Number(lot.cantidad || 0), 0)}</strong></div>
            </section>
            {formError && <div className="inline-alert compact" role="alert">{formError}</div>}
            <footer className="modal-actions"><button className="secondary-button" type="button" onClick={() => setActionModal(null)} disabled={saving}>Volver</button><button className="action-button" type="submit" disabled={saving || !lotForm.id_pedido_ingreso_detalle || !lotForm.lotes.length}>{saving ? "Guardando…" : "Guardar lotes"}</button></footer>
          </form>
        </Modal>
      )}

      {detail && actionModal === "incident" && (
        <Modal title="Registrar incidencia" description="Documenta el problema detectado durante el ingreso." onClose={() => !saving && setActionModal(null)}>
          <form className="management-form" onSubmit={submitIncident}>
            <label><span>Producto afectado</span><select value={incident.id_pedido_ingreso_detalle} onChange={(event) => setIncident({ ...incident, id_pedido_ingreso_detalle: Number(event.target.value) })} required>{detail.lineas.map((line) => <option key={line.id_pedido_ingreso_detalle} value={line.id_pedido_ingreso_detalle}>{line.codigo_producto} · {line.descripcion_producto}</option>)}</select></label>
            <div className="form-grid"><label><span>Tipo</span><select value={incident.tipo} onChange={(event) => setIncident({ ...incident, tipo: event.target.value as IncidentPayload["tipo"] })}><option value="DIFERENCIA">Diferencia</option><option value="DANO">Daño</option><option value="DOCUMENTO">Documento</option><option value="CALIDAD">Calidad</option><option value="OTRO">Otro</option></select></label><label><span>Cantidad afectada</span><input type="number" min="0.01" step="0.01" value={incident.cantidad_afectada} onChange={(event) => setIncident({ ...incident, cantidad_afectada: event.target.value })} required /></label></div>
            <label><span>Descripción</span><textarea rows={4} value={incident.descripcion} onChange={(event) => setIncident({ ...incident, descripcion: event.target.value })} placeholder="Describe el daño, diferencia o problema encontrado" required /></label>
            {formError && <div className="inline-alert compact" role="alert">{formError}</div>}
            <footer className="modal-actions"><button className="secondary-button" type="button" onClick={() => setActionModal(null)} disabled={saving}>Volver</button><button className="action-button" type="submit" disabled={saving || !incident.descripcion.trim()}>{saving ? "Registrando…" : "Registrar incidencia"}</button></footer>
          </form>
        </Modal>
      )}

      {detailLoading && <div className="floating-loading"><span className="loading-spinner" /> Consultando historial…</div>}
      {canCreate && <button className="floating-create" type="button" onClick={openCreate} aria-label="Nueva recepción"><PackagePlus size={22} /></button>}
      {printDocument && (
        <article className="reception-print-sheet" aria-hidden="true">
          <header><div><strong>WMS Pro</strong><span>Control de recepción y almacenamiento</span></div><div><h1>Pedido de ingreso</h1><strong>{printDocument.numero_pedido_ingreso}</strong></div></header>
          <section className="print-document-data"><div><span>Guía de remisión</span><strong>{printDocument.codigo_documento}</strong></div><div><span>Cliente propietario</span><strong>{printDocument.cliente?.razon_social}</strong><small>RUC {printDocument.cliente?.ruc}</small></div><div><span>Fecha y hora</span><strong>{formatDate(printDocument.fecha_registro, true)}</strong></div><div><span>Usuario responsable</span><strong>{printDocument.responsable ? `${printDocument.responsable.nombre} ${printDocument.responsable.apellido}` : "—"}</strong></div><div><span>Transporte</span><strong>{printDocument.transporte_placa || "Sin placa"}</strong><small>{printDocument.transporte_conductor || "Sin conductor"}</small></div><div><span>Brevete</span><strong>{printDocument.transporte_brevete || "—"}</strong></div></section>
          <table><thead><tr><th>Código</th><th>Descripción</th><th>Lote</th><th>F. vencimiento</th><th>Pallets</th><th>Factor</th><th>Cajas / unidades</th></tr></thead><tbody>{printDocument.lineas.flatMap((line) => line.lotes.length ? line.lotes.map((lot, index) => <tr key={`${line.id_pedido_ingreso_detalle}-${lot.id_lote}`}><td>{line.codigo_producto}</td><td>{line.descripcion_producto}</td><td>{lot.codigo}</td><td>{formatDate(lot.fecha_vencimiento)}</td><td>{index === 0 ? line.cantidad_pallets : ""}</td><td>{index === 0 ? line.factor_conversion ?? "—" : ""}</td><td>{lot.cantidad}</td></tr>) : [<tr key={line.id_pedido_ingreso_detalle}><td>{line.codigo_producto}</td><td>{line.descripcion_producto}</td><td>—</td><td>—</td><td>{line.cantidad_pallets}</td><td>{line.factor_conversion ?? "—"}</td><td>{line.cantidad_cajas ?? line.cantidad_esperada}</td></tr>])}</tbody></table>
          <footer><div><span>Responsable de recepción</span></div><div><span>Conductor / transportista</span></div></footer>
          <small className="print-association">Documento asociado a la guía de remisión {printDocument.codigo_documento}.</small>
        </article>
      )}
    </section>
  );
}
