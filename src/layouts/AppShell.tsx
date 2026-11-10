import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import {
  Boxes,
  Building2,
  ChevronDown,
  CircleHelp,
  Command,
  Database,
  FileUp,
  LayoutDashboard,
  LogOut,
  MapPinned,
  Menu,
  PackageSearch,
  ClipboardCheck,
  ArrowRightLeft,
  Archive,
  ShoppingCart,
  Truck,
  BarChart3,
  Route,
  CalendarRange,
  Search,
  ShieldCheck,
  ServerCog,
  PackageCheck,
  Users,
  X,
} from "lucide-react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/auth-context";

type IconComponent = ComponentType<{ size?: number; strokeWidth?: number; "aria-hidden"?: boolean }>;

interface NavigationItem {
  label: string;
  description: string;
  to: string;
  icon: IconComponent;
  permission?: string;
}

interface NavigationGroup {
  label: string;
  items: NavigationItem[];
}

const NAVIGATION: NavigationGroup[] = [
  {
    label: "General",
    items: [
      { label: "Dashboard", description: "Resumen del sistema", to: "/", icon: LayoutDashboard },
      { label: "Recepciones", description: "Ingreso y validación de mercancía", to: "/recepciones", icon: ClipboardCheck, permission: "recepciones.ver" },
      { label: "Inventario", description: "Stock, ubicabilidad y vencimientos", to: "/inventario", icon: Archive, permission: "inventario.ver" },
      { label: "Movimientos", description: "Traslados internos y reempaques", to: "/movimientos", icon: ArrowRightLeft, permission: "movimientos.ver" },
      { label: "Pedidos", description: "Pedidos de salida y preparación", to: "/pedidos", icon: ShoppingCart, permission: "pedidos.ver" },
      { label: "Despacho", description: "Salidas y cierre de despachos", to: "/despachos", icon: Truck, permission: "despachos.ver" },
      { label: "Reportes y BI", description: "Indicadores y análisis operativo", to: "/reportes", icon: BarChart3, permission: "reportes.ver" },
      { label: "Trazabilidad", description: "Historial integral por producto", to: "/trazabilidad", icon: Route, permission: "trazabilidad.ver" },
      { label: "Planificación", description: "Capacidad y carga programada", to: "/planificacion", icon: CalendarRange, permission: "planificacion.ver" },
      { label: "Acondicionamiento", description: "Repaletizados, reencajados y facturación", to: "/acondicionamiento", icon: PackageCheck, permission: "acondicionamiento.ver" },
    ],
  },
  {
    label: "Catálogos maestros",
    items: [
      { label: "Clientes", description: "Razones sociales y contactos", to: "/clientes", icon: Building2, permission: "clientes.ver" },
      { label: "Productos", description: "SKUs y unidades de medida", to: "/productos", icon: Boxes, permission: "productos.ver" },
    ],
  },
  {
    label: "Infraestructura",
    items: [
      { label: "Almacenes", description: "Centros logísticos", to: "/almacenes", icon: Database, permission: "almacenes.ver" },
      { label: "Ubicaciones", description: "Zonas, racks y posiciones", to: "/ubicaciones", icon: MapPinned, permission: "ubicaciones.ver" },
      { label: "Importaciones", description: "Carga inicial de maestros", to: "/importaciones", icon: FileUp, permission: "importaciones.ejecutar" },
    ],
  },
  {
    label: "Configuración",
    items: [
      { label: "Operaciones técnicas", description: "Monitoreo, respaldos y despliegues", to: "/operaciones-tecnicas", icon: ServerCog, permission: "operaciones_tecnicas.ver" },
      { label: "Usuarios", description: "Accesos y perfiles", to: "/usuarios", icon: Users, permission: "usuarios.ver" },
      { label: "Roles y permisos", description: "Matrices de autorización", to: "/roles", icon: ShieldCheck, permission: "roles.ver" },
    ],
  },
];

function BrandIcon() {
  return (
    <span className="app-brand-icon" aria-hidden="true">
      <PackageSearch size={22} strokeWidth={2.15} />
    </span>
  );
}

export default function AppShell() {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const searchRef = useRef<HTMLInputElement>(null);
  const permissions = useMemo(() => new Set(profile?.permisos ?? []), [profile?.permisos]);
  const visibleGroups = useMemo(
    () => NAVIGATION.map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.permission || permissions.has(item.permission)),
    })).filter((group) => group.items.length > 0),
    [permissions],
  );
  const visibleItems = visibleGroups.flatMap((group) => group.items);
  const currentItem = visibleItems.find((item) => item.to === location.pathname) ?? visibleItems[0];
  const displayName = [profile?.nombre, profile?.apellido].filter(Boolean).join(" ");
  const roleNames = profile?.roles.map((role) => role.nombre).join(", ") || "Sin rol asignado";
  const [signingOut, setSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const searchResults = search.trim()
    ? visibleItems.filter((item) => `${item.label} ${item.description}`.toLowerCase().includes(search.trim().toLowerCase())).slice(0, 6)
    : [];

  useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  function openResult(item: NavigationItem) {
    setSearch("");
    navigate(item.to);
  }

  async function handleSignOut() {
    setSigningOut(true);
    setLogoutError(null);
    try {
      await signOut();
      navigate("/login", { replace: true });
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : "No pudimos cerrar la sesión.");
      setSigningOut(false);
    }
  }

  return (
    <div className={`app-shell ${mobileOpen ? "sidebar-open" : ""}`}>
      <aside className="app-sidebar">
        <div className="app-brand">
          <BrandIcon />
          <div><strong>WMS Pro</strong><span>Enterprise Logistics</span></div>
          <button className="sidebar-close" type="button" onClick={() => setMobileOpen(false)} aria-label="Cerrar menú"><X size={20} /></button>
        </div>

        <nav className="app-navigation" aria-label="Navegación principal">
          {visibleGroups.map((group) => (
            <section className="nav-group" key={group.label}>
              <span className="nav-group-label">{group.label}</span>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    to={item.to}
                    end={item.to === "/"}
                    key={item.to}
                    title={item.description}
                    onClick={() => { setMobileOpen(false); setSearch(""); }}
                  >
                    <Icon size={18} strokeWidth={1.8} aria-hidden />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </section>
          ))}
        </nav>

        <div className="sidebar-account">
          <span className="account-avatar">{(profile?.nombre || profile?.correo || "U")[0].toUpperCase()}</span>
          <div><strong>{displayName || profile?.correo}</strong><small>{roleNames}</small></div>
        </div>
      </aside>

      {mobileOpen && <button className="sidebar-backdrop" type="button" onClick={() => setMobileOpen(false)} aria-label="Cerrar navegación" />}

      <div className="app-main">
        <header className="app-topbar">
          <button className="mobile-menu-button" type="button" onClick={() => setMobileOpen(true)} aria-label="Abrir menú"><Menu size={21} /></button>
          <div className="topbar-brand">WMS Unified</div>
          <div className="global-search">
            <Search size={17} aria-hidden />
            <input
              ref={searchRef}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && searchResults[0]) openResult(searchResults[0]);
                if (event.key === "Escape") { setSearch(""); searchRef.current?.blur(); }
              }}
              placeholder="Buscar módulos o configuración..."
              aria-label="Buscar módulos"
            />
            <kbd><Command size={11} /> K</kbd>
            {searchResults.length > 0 && (
              <div className="search-results" role="listbox">
                {searchResults.map((item) => {
                  const Icon = item.icon;
                  return <button type="button" key={item.to} onClick={() => openResult(item)}><Icon size={17} /><span><strong>{item.label}</strong><small>{item.description}</small></span></button>;
                })}
              </div>
            )}
          </div>
          <div className="topbar-actions">
            <button className="topbar-icon-button" type="button" title="Ayuda del sistema" aria-label="Ayuda del sistema"><CircleHelp size={19} /></button>
            <span className="topbar-divider" />
            <button className="account-trigger" type="button" onClick={() => setAccountOpen((current) => !current)} aria-expanded={accountOpen}>
              <span className="account-avatar">{(profile?.nombre || profile?.correo || "U")[0].toUpperCase()}</span>
              <span><strong>{displayName || profile?.correo}</strong><small>{roleNames}</small></span>
              <ChevronDown size={15} />
            </button>
            {accountOpen && (
              <div className="account-popover">
                <div><strong>{profile?.correo}</strong><small>Sesión protegida por Supabase + Django</small></div>
                {logoutError && <p role="alert">{logoutError}</p>}
                <button type="button" onClick={handleSignOut} disabled={signingOut}><LogOut size={16} />{signingOut ? "Cerrando…" : "Cerrar sesión"}</button>
              </div>
            )}
          </div>
        </header>
        <div className="app-page-context"><span>{currentItem?.label}</span><small>{currentItem?.description}</small></div>
        <main className="app-content"><Outlet /></main>
      </div>
    </div>
  );
}
