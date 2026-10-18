import { CircleDollarSign, CreditCard } from 'lucide-react';
import { dinero, fecha, numero } from '../lib/api.js';
import { DataTable, Metric, PageIntro, Pill, ServiceAlert, tonoEstado } from '../components/ui.jsx';

export default function Pagos({ app }) {
  const { services, data, reload } = app;
  const { pagos } = data;

  const normalizar = item => (item && item.pago ? { ...item.pago } : item) || {};
  const importeTotal = pagos.reduce((suma, item) => suma + numero(normalizar(item).monto), 0);

  const columnas = [
    {
      key: 'id',
      header: 'Pago',
      width: '110px',
      sortValue: item => numero(normalizar(item).id),
      render: item => <span className="id-tag">#{normalizar(item).id}</span>,
    },
    {
      key: 'pedido',
      header: 'Pedido',
      sortValue: item => numero(normalizar(item).pedidoId ?? normalizar(item).pedido_id),
      render: item => <>#{normalizar(item).pedidoId ?? normalizar(item).pedido_id}</>,
    },
    {
      key: 'monto',
      header: 'Monto',
      align: 'right',
      sortValue: item => numero(normalizar(item).monto),
      render: item => <b>{dinero(normalizar(item).monto)}</b>,
    },
    {
      key: 'metodo',
      header: 'Método',
      render: item => <span className="cell-capitalize">{normalizar(item).metodoPago || normalizar(item).metodo_pago || normalizar(item).metodo || '—'}</span>,
    },
    {
      key: 'estado',
      header: 'Estado',
      sortable: false,
      render: item => <Pill tone={tonoEstado(normalizar(item).estado)}>{normalizar(item).estado || 'Registrado'}</Pill>,
    },
    {
      key: 'referencia',
      header: 'Referencia',
      render: item => <span className="cell-mono">{normalizar(item).referencia || '—'}</span>,
    },
    {
      key: 'fecha',
      header: 'Fecha',
      sortValue: item => new Date(normalizar(item).creadoEn || normalizar(item).creado_en || 0).getTime() || 0,
      render: item => <span className="cell-muted">{fecha(normalizar(item).creadoEn || normalizar(item).creado_en)}</span>,
    },
  ];

  return (
    <>
      <PageIntro
        kicker="Caja y cobros"
        title="Pagos"
        description="Consulta los cobros registrados por el microservicio de Pagos (Equipo 2)."
      />

      <div className="metric-grid two-metrics">
        <Metric icon={CreditCard} label="Pagos registrados" value={pagos.length} note="Registros en PostgreSQL" tone="neutral" />
        <Metric icon={CircleDollarSign} label="Importe total" value={dinero(importeTotal)} note="Suma de los montos registrados" tone="blue" />
      </div>

      <div className="panel table-panel">
        <div className="panel-head">
          <div>
            <h2>Transacciones</h2>
            <p className="panel-sub">Cada venta genera un pago asociado a su pedido.</p>
          </div>
        </div>

        {services.pagos && !services.pagos.ok && (
          <ServiceAlert serviceKey="pagos" error={services.pagos.error} onRetry={reload} />
        )}

        <DataTable
          columns={columnas}
          rows={pagos}
          searchPlaceholder="Buscar por pago, pedido, método o referencia…"
          initialSort={{ key: 'id', dir: 'desc' }}
          empty={{ icon: CreditCard, title: 'No hay pagos', text: 'Los cobros de las ventas aparecerán aquí.' }}
        />
      </div>
    </>
  );
}
