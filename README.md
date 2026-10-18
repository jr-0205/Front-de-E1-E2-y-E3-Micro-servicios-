# SuperPOS · Frontend de los seis microservicios

Aplicación React (Vite) para operar un punto de venta y administrar los servicios de los Equipos 1, 2 y 3. Se publica en el **puerto 2222** y consume las seis APIs REST directamente desde el navegador.

La interfaz sigue una identidad **dark premium**: superficies grafito, acento azul usado con moderación, tipografía Inter, jerarquía clara y estados reales de carga, error, vacío y éxito. No hay atajos ni controles decorativos: lo que se ve, funciona.

## Funciones

- **Punto de venta:** catálogo con búsqueda (`Ctrl/Cmd + K`), carrito con control de existencias, selección de cliente y método de pago. Cada venta se envía a Pedidos, que coordina la validación del cliente y el producto, el registro del pago, el descuento de stock y las notificaciones.
- **Resumen:** métricas reales, aviso de existencias bajas, estado de los seis servicios y últimos pedidos.
- **Clientes:** CRUD conectado al Equipo 1, con validación de correo en el propio formulario.
- **Productos:** CRUD del catálogo del Equipo 1 (nombre y precio; el stock del catálogo es informativo).
- **Inventario:** existencias del Equipo 3. El formulario **elige el producto del catálogo** y envía `productoId` + `stock`, por lo que nunca se desalinean los IDs.
- **Pedidos:** historial de ventas del Equipo 2.
- **Pagos:** cobros registrados por el Equipo 2.
- **Notificaciones:** eventos del Equipo 3, con opción de eliminar cada uno.
- **Conexiones API:** configuración de las URLs por equipo, guardada en `localStorage`.

Todas las tablas incluyen **búsqueda, ordenamiento por columna y paginación**, y las acciones destructivas piden confirmación en un diálogo accesible (no en un `window.confirm`).

## Rutas que consume

El front llama primero a la **ruta canónica** acordada en `reglas.md` y, si el servicio responde `404`/`405` (despliegue antiguo), reintenta con el **alias heredado**. Un error real (por ejemplo `500`) **no** se reintenta: se muestra el mensaje del servicio.

| Microservicio | Puerto | Rutas usadas |
|---|---:|---|
| Clientes (E1) | 2501 | `/clientes`, `/clientes/:id` |
| Productos (E1) | 2502 | `/productos`, `/productos/:id` |
| Pedidos (E2) | 2503 | `/pedidos`, `POST /pedidos` |
| Pagos (E2) | 2504 | `/pagos` |
| Inventario (E3) | 2506 | `/inventario`, `/inventario/:productoId` (alias `/api/products`) |
| Notificaciones (E3) | 2507 | `/notificaciones`, `/notificaciones/:id` (alias `/api/notifications`) |
| Frontend SuperPOS | **2222** | — |

## Estructura del código

```text
src/
├── App.jsx                  Estado global: configuración, datos, carrito, avisos y confirmaciones
├── lib/api.js               Servicios, rutas canónicas + alias, cliente HTTP y formateadores
├── components/
│   ├── Layout.jsx           Barra lateral, barra superior y pie
│   └── ui.jsx               Botones de tabla, campos, métricas, DataTable, diálogo y avisos
├── sections/                Una pantalla por sección del menú
│   ├── Pos.jsx  Dashboard.jsx  Clientes.jsx  Productos.jsx  Inventario.jsx
│   └── Pedidos.jsx  Pagos.jsx  Notificaciones.jsx  Conexiones.jsx
└── styles.css               Tokens de diseño y componentes (CSS puro, sin frameworks)
```

No se agregaron dependencias: se mantiene React, Vite y `lucide-react`.

## Ejecutar con Docker

Clona este repositorio en la computadora que mostrará el frontend y, desde su carpeta:

```bash
docker compose up --build -d
docker compose ps
```

Abre en el navegador:

```text
http://localhost:2222
```

Para acceder desde otra computadora usa la IPv4 del equipo donde corre Docker, por ejemplo `http://192.168.1.50:2222`, y abre el puerto TCP 2222 en el firewall.

## Ejecutar para desarrollo

Requiere Node.js moderno y npm:

```bash
npm install
npm run dev
```

Vite mostrará la URL local, normalmente `http://localhost:5173`. Para generar los archivos de producción:

```bash
npm run build
```

## Pruebas

Las pruebas de la capa HTTP no necesitan dependencias adicionales: levantan servicios simulados en puertos efímeros y comprueban el contrato que usa la interfaz (listas, rutas canónicas con respaldo al alias, errores reales y utilidades).

```bash
npm test
```

La integración completa (los seis servicios reales, en `2501`–`2507`) se valida aparte con el flujo descrito en `reglas.md` (Postman o la propia interfaz).

## Conectar los equipos

Por defecto la app usa la misma máquina (hostname del navegador) con los puertos publicados. Si los microservicios están en computadoras distintas, entra a **Conexiones API**, sustituye cada URL por la IPv4 correcta y pulsa **Guardar y comprobar**:

- Clientes: `http://192.168.1.51:2501`
- Productos: `http://192.168.1.51:2502`
- Pedidos: `http://192.168.1.52:2503`
- Pagos: `http://192.168.1.52:2504`
- Inventario: `http://192.168.1.53:2506`
- Notificaciones: `http://192.168.1.53:2507`

Los ejemplos son ilustrativos; sustitúyelos por las IPv4 reales. El botón **Valores por defecto** restaura las direcciones locales. Todos los servicios deben permitir solicitudes CORS desde el navegador (los servicios del proyecto ya las incluyen).

### Un solo archivo: `ip-path`

`ip-path` es la **única fuente de verdad** de las direcciones. Se escribe una vez y un comando genera el `.env` (que es local y no se versiona):

```bash
notepad ip-path                  # IP de cada laptop; deja `auto` en esta PC
node configurar-ips.mjs          # genera el .env
node configurar-ips.mjs --probar # además prueba /health de cada dirección
```

- En este repositorio, `auto` deja las URLs vacías y el navegador usa el host desde el que se abrió la interfaz, así que funciona en cualquier PC de la red.
- Si los cuatro repositorios están en la misma carpeta, se configura todo de una vez desde la raíz del proyecto con `node configurar-ips.mjs`.

### URLs por defecto en la compilación

Si prefieres que el front ya nazca con las direcciones correctas (por ejemplo, para demostrarlo sin tocar la configuración), copia `.env.example` a `.env`, ajusta `VITE_CLIENTES_URL`, `VITE_PRODUCTOS_URL`, `VITE_PEDIDOS_URL`, `VITE_PAGOS_URL`, `VITE_INVENTARIO_URL` y `VITE_NOTIFICACIONES_URL`, y reconstruye:

```bash
docker compose up --build -d
```

En redes con IP dinámica conviene un DNS local o reservas DHCP en lugar de IP fijas. La pantalla **Conexiones API** siempre tiene prioridad sobre esos valores por defecto, porque se guarda en el navegador.

**Importante:** configura también el `.env` del Equipo 2 con `CLIENTES_URL`, `PRODUCTOS_URL`, `INVENTARIO_URL` y `NOTIFICACIONES_URL`, con URLs alcanzables desde su contenedor.

## Modo demostración

`VITE_DEMO_SALES=true` (apagado por defecto) convierte el botón de cobro en **Simular venta**: la venta se muestra en pantalla marcada como simulada, no se envía a ninguna API y no descuenta existencias. La pantalla avisa siempre de que el modo está activo, para que nadie confunda una demostración con un cobro real.

## Contrato de venta e inventario

- Los campos usan el contrato en español: `id`, `nombre`, `correo`, `precio`, `stock`, `productoId`, `clienteId`.
- El ID del producto en el catálogo del Equipo 1 es el mismo `productoId` del Inventario del Equipo 3: es la llave que une precio, stock y venta.
- El `stock` del catálogo de Productos es informativo. Las existencias reales se consultan y modifican en Inventario.
- La venta se procesa por línea de producto con `POST /pedidos`; la respuesta incluye `pedido`, `pago` y `advertenciaNotificacion`. Si la venta se completa pero falla una notificación, el front lo avisa en un mensaje de advertencia en lugar de darla por perdida.
- **Una venta nunca se reporta como exitosa si no se confirmó.** Si el servicio no responde (fallo de conexión) el resultado es desconocido, así que la interfaz muestra una advertencia que pide revisar **Pedidos** antes de reintentar, en lugar de un mensaje de éxito. Solo los rechazos definitivos del servidor (`400`, `409`, `502`) se muestran como error, con el detalle que devolvió el servicio.
- Si una venta se cobra parcialmente (varias líneas y un fallo a mitad), las líneas ya registradas se retiran del carrito para no cobrarlas dos veces.
- La pantalla **Notificaciones** normaliza el campo `tipo` (incluye valores heredados como `SUCCESS` o `PAGO_APROBADO` y mayúsculas) para pintar cada evento con su tono correcto, y muestra el emisor aunque venga como `origen` en registros antiguos.
- Esta interfaz es una aplicación educativa de demostración: no integra una pasarela bancaria real ni debe usarse para cobros reales.

## Accesibilidad y responsive

- HTML semántico, etiquetas asociadas a sus controles y nombres accesibles en los botones de icono.
- Navegación completa por teclado con indicador de foco visible; `Escape` cierra el menú móvil y el diálogo de confirmación.
- Los avisos usan `role="status"`/`role="alert"` con `aria-live`.
- Se respeta `prefers-reduced-motion` para desactivar animaciones.
- Diseño adaptable: una columna en móvil, tablas con desplazamiento horizontal controlado y barra lateral desplegable.

## Comprobaciones

El frontend expone `/health` dentro del contenedor Nginx. En el panel **Resumen** se comprueba la conectividad de cada API; un servicio desconectado muestra su estado y el error de consulta, y cada sección ofrece un botón **Reintentar**.

## Documentación relacionada

- [`ROUTES.md`](./ROUTES.md): rutas, cuerpos y alias que consume esta interfaz.
- [`MICROSERVICES_STANDARD.md`](./MICROSERVICES_STANDARD.md): estándar común acordado por los tres equipos.
- `reglas.md` (repositorio de la asignatura): integración, IPs, puertos y flujo de la demostración.
