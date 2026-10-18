# ROUTES — SuperPOS Frontend

El frontend se sirve por el puerto **2222** y consume las APIs desde el navegador. Las URLs se configuran en la sección **Conexiones API** (guardadas en `localStorage`) y, opcionalmente, se inyectan en compilación con las variables `VITE_*` de `.env`.

El front llama primero a la **ruta canónica** y, si el servicio responde `404`/`405`, reintenta con el **alias heredado**. Un error real (`400`, `409`, `500`, `502`…) no se reintenta: se muestra el mensaje del servicio.

| Servicio | Variable | Rutas usadas por el front | Alias heredado |
|---|---|---|---|
| Clientes | `CLIENTES_URL` / `VITE_CLIENTES_URL` | `GET/POST /clientes`, `PUT/DELETE /clientes/:id` | — |
| Productos | `PRODUCTOS_URL` / `VITE_PRODUCTOS_URL` | `GET/POST /productos`, `PUT/DELETE /productos/:id` | — |
| Pedidos | `PEDIDOS_URL` / `VITE_PEDIDOS_URL` | `GET /pedidos`, `POST /pedidos` | — |
| Pagos | `PAGOS_URL` / `VITE_PAGOS_URL` | `GET /pagos` | — |
| Inventario | `INVENTARIO_URL` / `VITE_INVENTARIO_URL` | `GET /inventario`, `POST /inventario`, `PUT/DELETE /inventario/:productoId` | `/api/products` |
| Notificaciones | `NOTIFICACIONES_URL` / `VITE_NOTIFICACIONES_URL` | `GET /notificaciones`, `DELETE /notificaciones/:id` | `/api/notifications` |

Todos los servicios exponen además `GET /health`, que el panel **Resumen** usa para indicar cuántos están conectados.

## Cuerpos que envía el front

```jsonc
// POST /clientes  ·  PUT /clientes/:id
{ "nombre": "Ana Gómez", "correo": "ana@example.com" }

// POST /productos  ·  PUT /productos/:id
{ "nombre": "Café molido 500 g", "precio": 129.5, "stock": 0 }

// POST /inventario → el ID es el del catálogo del Equipo 1; el precio lo pone el servidor.
{ "productoId": 1, "stock": 10, "descripcion": "Estante A-3" }

// PUT /inventario/:productoId → solo existencias y descripción.
{ "stock": 7, "descripcion": "Estante A-3" }

// POST /pedidos → Pedidos orquesta la venta completa.
{ "clienteId": 1, "productoId": 1, "cantidad": 2, "metodoPago": "tarjeta" }
```

`POST /pedidos` responde `201` con `{ pedido, pago, integracion, advertenciaNotificacion }`. Si la venta se
completa pero falla la notificación, el front lo informa como aviso en lugar de reportarla como error.

## Cambio de IP

1. Preferir reservas DHCP o DNS local para mantener estable el hostname.
2. La vía rápida: editar **`ip-path`** (las cuatro direcciones) y ejecutar
   `node configurar-ips.mjs`, que regenera este `.env`. Desde la raíz del proyecto,
   `node configurar-ips.mjs` configura los cuatro repositorios de una vez.
3. También se pueden actualizar las URLs a mano en **Conexiones API** (tienen prioridad,
   porque se guardan en el navegador).
4. Si las URLs se inyectan en compilación, actualizar `.env` y reconstruir
   (`docker compose up --build -d`).
5. Abrir en el firewall los puertos `2501`, `2502`, `2503`, `2504`, `2506`, `2507` y `2222` según el host.

## Contrato común

Usar `id`, `nombre`, `correo`, `precio`, `stock`, `productoId`, `clienteId`. **Inventario es la fuente oficial
de existencias**; el `stock` del catálogo de Productos es informativo. Las ventas simuladas del modo
demostración (`VITE_DEMO_SALES=true`) se marcan como tales en pantalla y no persisten en ninguna base de datos.
