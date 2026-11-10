import { ArrowRight, Boxes, Building2, CheckCircle2, Database, MapPinned, ShieldCheck, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../features/auth/auth-context";
import ReportsPage from "../pages/Reports/ReportsPage";

const QUICK_LINKS = [
	{ permission: "clientes.ver", to: "/clientes", label: "Clientes", description: "Gestionar cuentas logísticas", icon: Building2 },
	{ permission: "productos.ver", to: "/productos", label: "Productos", description: "Consultar SKUs y catálogos", icon: Boxes },
	{ permission: "almacenes.ver", to: "/almacenes", label: "Almacenes", description: "Administrar centros operativos", icon: Database },
	{ permission: "ubicaciones.ver", to: "/ubicaciones", label: "Ubicaciones", description: "Revisar zonas y capacidades", icon: MapPinned },
	{ permission: "usuarios.ver", to: "/usuarios", label: "Usuarios", description: "Controlar accesos del equipo", icon: Users },
	{ permission: "roles.ver", to: "/roles", label: "Roles", description: "Definir matrices de autorización", icon: ShieldCheck },
];

function DashboardLayout() {
	const { profile } = useAuth();
	const permissions = new Set(profile?.permisos ?? []);
	const allowedLinks = QUICK_LINKS.filter((link) => permissions.has(link.permission));
	if (permissions.has("reportes.ver")) return <ReportsPage />;

	return (
		<section className="dashboard-page">
			<header className="page-heading dashboard-heading">
				<div><span className="page-eyebrow">Vista general</span><h1>Centro de control</h1><p>Accesos, catálogos y configuración operativa del WMS.</p></div>
				<div className="system-status"><span /><div><strong>Servicios operativos</strong><small>Autenticación y API conectadas</small></div></div>
			</header>

			<div className="summary-grid dashboard-summary">
				<article className="summary-card"><div className="metric-icon blue"><ShieldCheck size={20} /></div><span>Estado de sesión</span><strong>Autorizada</strong><small><CheckCircle2 size={13} /> Identidad validada</small></article>
				<article className="summary-card"><div className="metric-icon violet"><Users size={20} /></div><span>Roles asignados</span><strong>{profile?.roles.length ?? 0}</strong><small>{profile?.roles.map((role) => role.nombre).join(", ") || "Sin roles asignados"}</small></article>
				<article className="summary-card"><div className="metric-icon green"><CheckCircle2 size={20} /></div><span>Permisos efectivos</span><strong>{profile?.permisos.length ?? 0}</strong><small>Autorizados por Django</small></article>
				<article className="summary-card"><div className="metric-icon orange"><Boxes size={20} /></div><span>Módulos disponibles</span><strong>{allowedLinks.length}</strong><small>Según tu perfil actual</small></article>
			</div>

			<div className="dashboard-grid">
				<section className="workspace-panel">
					<header><div><h2>Accesos rápidos</h2><p>Continúa con las áreas habilitadas para tu rol.</p></div><span>{allowedLinks.length} módulos</span></header>
					<div className="quick-link-grid">
						{allowedLinks.map((link) => {
							const Icon = link.icon;
							return <Link to={link.to} key={link.to}><span className="quick-link-icon"><Icon size={20} /></span><span><strong>{link.label}</strong><small>{link.description}</small></span><ArrowRight size={17} /></Link>;
						})}
						{!allowedLinks.length && <div className="empty-state"><strong>No tienes módulos asignados</strong><span>Solicita a un administrador que configure tu rol.</span></div>}
					</div>
				</section>

				<aside className="security-panel">
					<div className="security-panel-icon"><ShieldCheck size={24} /></div>
					<span className="page-eyebrow">Seguridad auditada</span>
					<h2>Protección en dos capas</h2>
					<p>Supabase valida tu identidad y Django controla cada acción según los permisos efectivos de tu cuenta.</p>
					<ul><li><CheckCircle2 size={15} /> Sesión cifrada</li><li><CheckCircle2 size={15} /> Permisos por rol</li><li><CheckCircle2 size={15} /> Cuentas inactivas bloqueadas</li></ul>
				</aside>
			</div>
		</section>
	);
}

export default DashboardLayout;
