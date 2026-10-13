# SuperPOS · Frontend de los seis microservicios

Aplicación React para operar un punto de venta y administrar los servicios de los Equipos 1, 2 y 3. Se publica en el **puerto 2222** y consume las seis APIs REST mediante el navegador.

## Funciones

- **Punto de venta:** catálogo, carrito, selección de cliente y método de pago. La venta se envía a Pedidos, que coordina la validación del cliente y producto, el registro de pago, el descuento de inventario y las notificaciones.
- **Clientes:** CRUD (listar, crear, editar y eliminar) conectado a Equipo 1.
- **Productos:** CRUD del catálogo conectado a Equipo 1.
- **Inventario:** CRUD de existencias conectado a Equipo 3. Inventario es la fuente oficial de stock.
- **Pedidos:** historial de ventas de Equipo 2.
- **Pagos:** consulta de pagos de Equipo 2.
- **Notificaciones:** consulta y eliminación de eventos de Equipo 3.
- **Resumen:** métricas y estado de conectividad de los seis servicios.
- **Conexiones API:** configuración de URLs por equipo, guardada en localStorage del navegador.

## Puertos públicos esperados

| Microservicio | Puerto |
|---|---:|
| Clientes (E1) | 2501 |
| Productos (E1) | 2502 |
| Pedidos (E2) | 2503 |
| Pagos (E2) | 2504 |
| Inventario (E3) | 2506 |
| Notificaciones (E3) | 2507 |
| Frontend SuperPOS | **2222** |

## Ejecutar con Docker

Clona este repositorio en la computadora donde se ejecutará el frontend y, desde su carpeta, ejecuta:

```bash
docker compose up --build -d
docker compose ps
```

Abre en el navegador:

```text
http://localhost:2222
```

Para acceder desde otra computadora, usa la IPv4 del equipo donde corre Docker, por ejemplo `http://192.168.1.50:2222`, y abre el puerto TCP 2222 en el firewall.

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

## Conectar los equipos

Por defecto, la app usa el hostname del navegador y los puertos conocidos. Para URLs por defecto en build, copia `.env.example` a `.env`, ajusta `VITE_CLIENTES_URL`, `VITE_PRODUCTOS_URL`, `VITE_PEDIDOS_URL`, `VITE_PAGOS_URL`, `VITE_INVENTARIO_URL` y `VITE_NOTIFICACIONES_URL`, y reconstruye con `docker compose up --build -d`. También puedes editar las URLs desde **Conexiones API**. Si los microservicios están en computadoras distintas, utiliza sus DNS o IP actuales, por ejemplo:

- Clientes: `http://192.168.1.51:2501`
- Productos: `http://192.168.1.51:2502`
- Pedidos: `http://192.168.1.52:2503`
- Pagos: `http://192.168.1.52:2504`
- Inventario: `http://192.168.1.53:2506`
- Notificaciones: `http://192.168.1.53:2507`

Los ejemplos son ilustrativos; sustitúyelos por las direcciones IPv4 reales. Todos los servicios deben permitir solicitudes CORS desde el navegador. Los servicios existentes incluyen CORS.

**Importante:** configura también el archivo `.env` del Equipo 2 con `CLIENTES_URL`, `PRODUCTOS_URL`, `INVENTARIO_URL` y `NOTIFICACIONES_URL` para que el microservicio Pedidos pueda orquestar la venta. En ese archivo las URLs deben ser alcanzables desde el contenedor de Equipo 2.

## Contrato de venta e inventario

- Los campos de clientes y productos utilizan el contrato español: `id`, `nombre`, `correo`, `precio`, `stock`.
- Para vender, el ID de Producto en Equipo 1 debe corresponder al ID del artículo en Inventario de Equipo 3, porque Pedidos usa ese ID para consultar y descontar stock.
- El campo `stock` del catálogo de Productos es informativo. Las existencias reales se consultan y modifican en Inventario.
- La venta se procesa por línea de producto mediante `POST /pedidos`. Pedidos consulta clientes/productos/inventario, crea el pago, descuenta existencias y registra notificaciones según la configuración de Equipo 2.
- Esta interfaz es una aplicación de demostración educativa; no integra una pasarela bancaria real ni debe usarse para procesar cobros reales.

## Comprobaciones

El frontend expone `/health` dentro del contenedor Nginx. En el panel Resumen se puede comprobar la conectividad de cada API. Un servicio desconectado mostrará su estado y el error de consulta en el panel de conexiones.


Consulta [`ROUTES.md`](./ROUTES.md) para el catálogo centralizado de rutas y métodos HTTP.
