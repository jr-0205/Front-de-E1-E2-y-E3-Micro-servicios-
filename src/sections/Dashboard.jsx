import { AlertTriangle, CircleDollarSign, Package, RefreshCw, ShoppingBag, ShoppingCart, Users } from 'lucide-react';
import { SERVICE_LIST, dinero, fecha, numero } from '../lib/api.js';
import { EmptyState, Metric, Notice, Pill, tonoEstado } from '../components/ui.jsx';

export default function Dashboard({ app }) {
  const { config, services, data, busy, reload, go } = app;
  const { clientes, productos, inventario, pedidos, pagos } = data;

  const conectados = SERVICE_LIST.filter(servicio => services[servicio.key]?.ok).length;
  const ingresos = pagos.reduce((suma, item) => suma + numero((item.pago || item).monto), 0);
  const bajoStock = inventario.filter(item => numero(item.stock) <= 5);

  return (
    <>
      <div className="welcome">
        <div>
          <span className="kicker">Vista general</span>
          <h2>Estado de la operación</h2>
          <p className="panel-sub">Actividad del punto de venta y conectividad de la arquitectura distribuida.</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={() => reload()} disabled={busy}>
          <RefreshCw size={14} className={busy ? 'spin' : undefined} aria-hidden="true" />
          {busy ? 'Actualizando…' : 'Actualizar datos'}
        </button>
      </div>

      {bajoStock.length > 0 && (
        <Notice kind="warn" icon={AlertTriangle}>
          <b>{bajoStock.length}</b> {bajoStock.length === 1 ? 'producto tiene' : 'productos tienen'} 5 unidades o menos.
          <span className="notice-meta">
            {bajoStock.slice(0, 4).map(item => item.nombre).join(' · ')}
            {bajoStock.length > 4 ? ` y ${bajoStock.length - 4} más` : ''}
          </span>
          <button type="button" className="notice-action" onClick={() => go('inventario')}>Revisar inventario</button>
        </Notice>
      )}

      <div className="metric-grid">
        <Metric icon={ShoppingCart} label="Pedidos registrados" value={pedidos.length} note="Historial de ventas" tone="neutral" />
        <Metric icon={CircleDollarSign} label="Ingresos registrados" value={dinero(ingresos)} note={`${pagos.length} pagos procesados`} tone="blue" />
        <Metric icon={Package} label="Productos en catálogo" value={productos.length} note="Servicio Productos (E1)" tone="neutral" />
        <Metric icon={Users} label="Clientes" value={clientes.length} note="Base de clientes (E1)" tone="neutral" />
      </div>

      <div className="dash-grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Estado de microservicios</h2>
              <p className="panel-sub">Conectividad comprobada desde este navegador.</p>
            </div>
            <Pill tone={conectados === SERVICE_LIST.length ? 'ok' : 'warn'}>{conectados}/{SERVICE_LIST.length} activos</Pill>
          </div>

          <div className="service-list">
            {SERVICE_LIST.map(servicio => {
              const estado = services[servicio.key];
              const activo = Boolean(estado?.ok);
              return (
                <div className="service-row" key={servicio.key}>
                  <span className={`conn-dot${activo ? '' : ' down'}`} aria-hidden="true" />
                  <div className="service-name">
                    <b>{servicio.label}</b>
                    <small title={estado?.error || config[servicio.key]}>
                      {activo ? config[servicio.key] : (estado?.error || 'Sin conexión')}
                    </small>
                  </div>
                  <span className={`status-text${activo ? ' ok' : ' error'}`}>{activo ? 'Conectado' : 'Sin conexión'}</span>
                </div>
              );
            })}
          </div>

          <button type="button" className="link-btn" onClick={() => go('settings')}>Configurar conexiones</button>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Últimos pedidos</h2>
              <p className="panel-sub">Actividad reciente del punto de venta.</p>
            </div>
            <button type="button" className="link-btn" onClick={() => go('pedidos')}>Ver todos</button>
          </div>

          <div className="activity-list">
            {pedidos.slice(0, 5).map(pedido => (
              <div className="activity-row" key={pedido.id}>
                <div className="activity-icon" aria-hidden="true"><ShoppingBag size={16} /></div>
                <div className="activity-main">
                  <b>Pedido #{pedido.id}</b>
                  <small>Cliente #{pedido.clienteId ?? pedido.cliente_id} · {fecha(pedido.creadoEn || pedido.creado_en)}</small>
                </div>
                <div className="activity-amount">
                  <b>{dinero(pedido.total)}</b>
                  <Pill tone={tonoEstado(pedido.estado)}>{pedido.estado || 'Registrado'}</Pill>
                </div>
              </div>
            ))}

            {!pedidos.length && (
              <EmptyState
                icon={ShoppingBag}
                title="Todavía no hay ventas"
                text="Las ventas registradas desde el punto de venta aparecerán aquí."
              />
            )}
          </div>
        </section>
      </div>
    </>
  );
}
