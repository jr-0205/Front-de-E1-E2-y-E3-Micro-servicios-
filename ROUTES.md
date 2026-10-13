# ROUTES — SuperPOS Frontend

El frontend se sirve por el puerto 2222 y consume APIs desde el navegador. Configura las URLs en la sección **Conexiones API**; el navegador necesita alcanzar cada host y cada API debe permitir CORS.

| Servicio | Base URL | Rutas principales |
|---|---|---|
| Clientes | `CLIENTES_URL` | `GET/POST/PUT/DELETE /clientes`, `GET /health` |
| Productos | `PRODUCTOS_URL` | `GET/POST/PUT/DELETE /productos`, `GET /health` |
| Pedidos | `PEDIDOS_URL` | `GET /pedidos`, `POST /pedidos`, `GET /health`, `GET /gateway/status` |
| Pagos | `PAGOS_URL` | `GET /pagos`, `GET /health` |
| Inventario | `INVENTARIO_URL` | `GET /api/products`, `POST/PUT/DELETE /api/products/:id`, `GET /health` |
| Notificaciones | `NOTIFICACIONES_URL` | `GET /api/notifications`, `POST /api/notifications`, `GET /health` |

## Cambio de IP
1. Preferir reservas DHCP o DNS local para mantener estable el hostname.
2. Actualizar URLs en Conexiones API y guardar si cambian los hosts.
3. Si las URLs se inyectan en compilación, actualizar `.env` y reconstruir.
4. Abrir en firewall los puertos 2501, 2502, 2503, 2504, 2506, 2507 y 2222 según el host.

## Contrato común
Usar `id`, `nombre`, `correo`, `precio`, `stock`; Inventario es la fuente oficial de existencias. Las ventas de demostración marcadas SIMULADA no persisten en las bases de datos.
