import { ClipboardList } from 'lucide-react';
import { dinero, fecha, numero } from '../lib/api.js';
import { DataTable, PageIntro, Pill, ServiceAlert, tonoEstado } from '../components/ui.jsx';

export default function Pedidos({ app }) {
  const { services, data, reload } = app;
  const { pedidos } = data;

  const columnas = [
    {
      key: 'id',
      header: 'Pedido',
      width: '110px',
      sortValue: pedido => numero(pedido.id),
      render: pedido => <span className="id-tag">#{pedido.id}</span>,
    },
    {
      key: 'clienteId',
      header: 'Cliente',
      sortValue: pedido => numero(pedido.clienteId ?? pedido.cliente_id),
      render: pedido => <>Cliente #{pedido.clienteId ?? pedido.cliente_id}</>,
    },
    {
      key: 'productoId',
      header: 'Producto',
      sortValue: pedido => numero(pedido.productoId ?? pedido.producto_id),
      render: pedido => <>Producto #{pedido.productoId ?? pedido.producto_id}</>,
    },
    { key: 'cantidad', header: 'Cantidad', align: 'right', sortValue: pedido => numero(pedido.cantidad) },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      sortValue: pedido => numero(pedido.total),
      render: pedido => <b>{dinero(pedido.total)}</b>,
    },
    {
      key: 'estado',
      header: 'Estado',
      sortable: false,
      render: pedido => <Pill tone={tonoEstado(pedido.estado)}>{pedido.estado || 'Registrado'}</Pill>,
    },
    {
      key: 'fecha',
      header: 'Fecha',
      sortValue: pedido => new Date(pedido.creadoEn || pedido.creado_en || 0).getTime() || 0,
      render: pedido => <span className="cell-muted">{fecha(pedido.creadoEn || pedido.creado_en)}</span>,
    },
  ];

  return (
    <>
      <PageIntro
        kicker="Transacciones"
        title="Pedidos y ventas"
        description="Historial del microservicio Pedidos (Equipo 2). Cada venta se registra por línea de producto."
      />

      <div className="panel table-panel">
        <div className="panel-head">
          <div>
            <h2>Historial de pedidos</h2>
            <p className="panel-sub">{pedidos.length} {pedidos.length === 1 ? 'pedido registrado' : 'pedidos registrados'}.</p>
          </div>
        </div>

        {services.pedidos && !services.pedidos.ok && (
          <ServiceAlert serviceKey="pedidos" error={services.pedidos.error} onRetry={reload} />
        )}

        <DataTable
          columns={columnas}
          rows={pedidos}
          searchPlaceholder="Buscar por pedido, cliente, producto o estado…"
          initialSort={{ key: 'id', dir: 'desc' }}
          empty={{ icon: ClipboardList, title: 'No hay pedidos todavía', text: 'Registra una venta desde el punto de venta.' }}
        />
      </div>
    </>
  );
}
