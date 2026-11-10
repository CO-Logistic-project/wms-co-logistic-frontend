import { createBrowserRouter } from "react-router-dom";

import Login from "../pages/Login/Login";
import DashboardLayout from "../layouts/DashboardLayout";
import AppShell from "../layouts/AppShell";
import UsersPage from "../pages/Users/UsersPage";
import RolesPage from "../pages/Roles/RolesPage";
import ForgotPasswordPage from "../pages/PasswordRecovery/ForgotPasswordPage";
import ResetPasswordPage from "../pages/PasswordRecovery/ResetPasswordPage";
import ClientsPage from "../pages/Clients/ClientsPage";
import ProductsPage from "../pages/Products/ProductsPage";
import WarehousesPage from "../pages/Warehouses/WarehousesPage";
import LocationsPage from "../pages/Locations/LocationsPage";
import MasterDataImportPage from "../pages/Imports/MasterDataImportPage";
import ReceptionsPage from "../pages/Receptions/ReceptionsPage";
import InventoryPage from "../pages/Inventory/InventoryPage";
import MovementsPage from "../pages/Movements/MovementsPage";
import OrdersPage from "../pages/Orders/OrdersPage";
import DispatchesPage from "../pages/Dispatches/DispatchesPage";
import ReportsPage from "../pages/Reports/ReportsPage";
import TraceabilityPage from "../pages/Traceability/TraceabilityPage";
import PlanningPage from "../pages/Planning/PlanningPage";
import TechnicalOperationsPage from "../pages/TechnicalOperations/TechnicalOperationsPage";
import ConditioningPage from "../pages/Conditioning/ConditioningPage";
import ProtectedRoute from "./ProtectedRoute";
import PermissionRoute from "./PermissionRoute";

const router = createBrowserRouter([
	{
		path: "/login",
		element: <Login />,
	},
	{
		path: "/recuperar-contrasena",
		element: <ForgotPasswordPage />,
	},
	{
		path: "/restablecer-contrasena",
		element: <ResetPasswordPage />,
	},
	{
		path: "/",
		element: (
			<ProtectedRoute>
				<AppShell />
			</ProtectedRoute>
		),
		children: [
			{ index: true, element: <DashboardLayout /> },
			{
				path: "recepciones",
				element: <PermissionRoute permission="recepciones.ver"><ReceptionsPage /></PermissionRoute>,
			},
			{
				path: "inventario",
				element: <PermissionRoute permission="inventario.ver"><InventoryPage /></PermissionRoute>,
			},
			{
				path: "movimientos",
				element: <PermissionRoute permission="movimientos.ver"><MovementsPage /></PermissionRoute>,
			},
			{
				path: "pedidos",
				element: <PermissionRoute permission="pedidos.ver"><OrdersPage /></PermissionRoute>,
			},
			{
				path: "despachos",
				element: <PermissionRoute permission="despachos.ver"><DispatchesPage /></PermissionRoute>,
			},
			{
				path: "reportes",
				element: <PermissionRoute permission="reportes.ver"><ReportsPage /></PermissionRoute>,
			},
			{
				path: "trazabilidad",
				element: <PermissionRoute permission="trazabilidad.ver"><TraceabilityPage /></PermissionRoute>,
			},
			{
				path: "planificacion",
				element: <PermissionRoute permission="planificacion.ver"><PlanningPage /></PermissionRoute>,
			},
			{
				path: "acondicionamiento",
				element: <PermissionRoute permission="acondicionamiento.ver"><ConditioningPage /></PermissionRoute>,
			},
			{
				path: "operaciones-tecnicas",
				element: <PermissionRoute permission="operaciones_tecnicas.ver"><TechnicalOperationsPage /></PermissionRoute>,
			},
			{
				path: "usuarios",
				element: <PermissionRoute permission="usuarios.ver"><UsersPage /></PermissionRoute>,
			},
			{
				path: "roles",
				element: <PermissionRoute permission="roles.ver"><RolesPage /></PermissionRoute>,
			},
			{
				path: "clientes",
				element: <PermissionRoute permission="clientes.ver"><ClientsPage /></PermissionRoute>,
			},
			{
				path: "productos",
				element: <PermissionRoute permission="productos.ver"><ProductsPage /></PermissionRoute>,
			},
			{
				path: "almacenes",
				element: <PermissionRoute permission="almacenes.ver"><WarehousesPage /></PermissionRoute>,
			},
			{
				path: "ubicaciones",
				element: <PermissionRoute permission="ubicaciones.ver"><LocationsPage /></PermissionRoute>,
			},
			{
				path: "importaciones",
				element: <PermissionRoute permission="importaciones.ejecutar"><MasterDataImportPage /></PermissionRoute>,
			},
		],
	},
]);

export default router;
