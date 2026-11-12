# WMS Co-Logistic Frontend

Aplicación React, TypeScript y Vite con autenticación propia de la API Django.

## Configuración local

1. Ejecuta `npm ci`.
2. Copia `.env.example` a `.env`; usa `VITE_API_URL=http://localhost:8000/api/`.
3. Ejecuta `npm run dev` con el backend en localhost:8000.

El access token se conserva solo en memoria. La cookie HttpOnly restaura la sesión al recargar; axios envía credenciales a la API. Una sesión expirada vuelve al login. El cambio obligatorio de contraseña bloquea las demás rutas.

En `/cambiar-contrasena` también se puede cambiar la clave voluntariamente desde el menú de usuario. La recuperación se solicita al Administrador TI. Los administradores con `usuarios.editar` pueden restablecer otras cuentas; la clave temporal se muestra una sola vez y se descarta al cerrar el diálogo.

## Docker

Compila con `docker build --build-arg VITE_API_URL=/api/ -t wms-co-logistic-frontend .`.
Nginx sirve la SPA y reenvía `/api/` a `http://backend:8000`, conservando la ruta y las cabeceras del proxy. Las variables Vite son públicas y se incorporan al compilar. No incluyas secretos.

## EP-02: catÃ¡logos maestros

- `/clientes` permite buscar, filtrar, registrar y editar clientes segÃºn los
  permisos `clientes.ver`, `clientes.crear` y `clientes.editar`.
- `/productos` permite filtrar por SKU/EAN, nombre, cliente y estado, ademÃ¡s de
  registrar y editar productos con los permisos equivalentes.
- Los formularios validan RUC, EAN y campos obligatorios antes de llamar a la
  API; Django repite las validaciones y controla la unicidad en el servidor.
- `/almacenes` permite consultar y registrar almacenes con capacidad de
  pallets.
- `/ubicaciones` gestiona zonas y ubicaciones, permite filtrar por almacÃ©n,
  zona, rack y disponibilidad, y protege ubicaciones ocupadas.
- `/importaciones` descarga plantillas CSV e informa registros cargados y
  rechazados despuÃ©s de la validaciÃ³n.

## VerificaciÃ³n

```bash
npm run lint
npm test
npm run build
```
