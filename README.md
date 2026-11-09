# WMS Co-Logistic Frontend

Aplicación web del WMS construida con React, TypeScript y Vite. La identidad se
gestiona con Supabase Auth y la autorización efectiva se valida en la API de
Django.

## Configuración local

1. Instala Node.js y ejecuta `npm install`.
2. Crea un archivo local `.env` (está ignorado por Git).
3. Configura `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` desde la
   configuración API del proyecto Supabase. No guardes valores reales en
   archivos versionados.
4. Confirma que `VITE_API_URL` apunta a la API Django.
5. Ejecuta `npm run dev`.

Solo la clave pública/publishable puede configurarse en el frontend. Nunca
agregues `service_role`, el JWT secret ni credenciales de PostgreSQL a variables
que comiencen con `VITE_`.

## Despliegue con Docker

La imagen compila la aplicación con `npm ci` y `npm run build`, y sirve `dist`
con Nginx. Para compilarla, pasa las tres variables públicas que consume el
frontend:

- `VITE_API_URL`: URL base de la API Django, accesible desde el navegador del
  usuario (no uses `localhost` salvo que la API también esté en su equipo).
- `VITE_SUPABASE_URL`: URL del proyecto Supabase.
- `VITE_SUPABASE_PUBLISHABLE_KEY`: clave publishable de Supabase.

Por ejemplo, reemplaza los valores de ejemplo por la configuración de tu
entorno:

```bash
docker build \
  --build-arg VITE_API_URL=https://api.example.com \
  --build-arg VITE_SUPABASE_URL=https://project.supabase.co \
  --build-arg VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_example \
  -t wms-co-logistic-frontend .
```

Inicia el contenedor y comprueba la página inicial y una ruta de la aplicación:

```bash
docker run --rm -d --name wms-frontend -p 8080:80 wms-co-logistic-frontend
curl -i http://localhost:8080/
curl -i http://localhost:8080/usuarios
docker stop wms-frontend
```

Nginx devuelve `index.html` para rutas de cliente, de modo que recargar una
ruta interna permite que React Router la gestione. Las variables `VITE_*` se
incorporan al JavaScript durante la compilación y son visibles en el navegador:
usa solo configuración pública; nunca incluyas secretos. Cambiar cualquiera de
ellas requiere volver a construir la imagen. El flujo existente de Supabase
Auth no cambia.

## HU-001: inicio de sesión

- Supabase Auth valida correo y contraseña.
- La sesión utiliza PKCE y permanece solo durante la sesión del navegador.
- El access token se adjunta como Bearer token a las solicitudes a Django.
- Django verifica el JWT, el perfil activo, los roles y los permisos.
- La ruta `/` está protegida y los usuarios anónimos regresan a `/login`.
- SSO y recuperación de contraseña aparecen deshabilitados porque pertenecen a
  funcionalidades posteriores.

## HU-002, HU-003 y HU-004

- `/usuarios` permite buscar, registrar y editar usuarios sin duplicar correos.
- La asignación de roles está separada y exige un permiso específico.
- `/roles` permite crear o editar roles y seleccionar sus permisos.
- El menú solo muestra módulos autorizados, mientras Django valida cada
  operación nuevamente en el servidor.
- Las altas y cambios de correo se sincronizan con Supabase Auth mediante el
  backend; ninguna llave administrativa se expone en React.

## HU-005, HU-006 y HU-007

- Los usuarios autorizados pueden desactivar o reactivar cuentas desde
  `/usuarios`; la cuenta propia está protegida contra desactivación accidental.
- `/recuperar-contrasena` envía una solicitud con respuesta genérica para no
  revelar si el correo existe.
- `/restablecer-contrasena` intercambia el código PKCE, valida la nueva clave y
  cierra todas las sesiones después del cambio.
- `Cerrar sesión` elimina explícitamente la sesión local y obliga a volver a
  autenticarse.

Para probar recuperación local agrega esta URL exacta en Supabase, dentro de
`Authentication > URL Configuration > Redirect URLs`:

```text
http://localhost:5173/restablecer-contrasena
```

En producción se debe registrar también la URL HTTPS exacta del dominio real.

## EP-02: catálogos maestros

- `/clientes` permite buscar, filtrar, registrar y editar clientes según los
  permisos `clientes.ver`, `clientes.crear` y `clientes.editar`.
- `/productos` permite filtrar por SKU/EAN, nombre, cliente y estado, además de
  registrar y editar productos con los permisos equivalentes.
- Los formularios validan RUC, EAN y campos obligatorios antes de llamar a la
  API; Django repite las validaciones y controla la unicidad en el servidor.
- `/almacenes` permite consultar y registrar almacenes con capacidad de
  pallets.
- `/ubicaciones` gestiona zonas y ubicaciones, permite filtrar por almacén,
  zona, rack y disponibilidad, y protege ubicaciones ocupadas.
- `/importaciones` descarga plantillas CSV e informa registros cargados y
  rechazados después de la validación.

## Verificación

```bash
npm run lint
npm test
npm run build
```

---

## Plantilla original de Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

You can also install [eslint-plugin-react-x](https://npmx.dev/package/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://npmx.dev/package/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```
