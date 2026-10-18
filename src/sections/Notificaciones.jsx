import { Bell, Trash2 } from 'lucide-react';
import { fecha, numero } from '../lib/api.js';
import { DataTable, PageIntro, Pill, ServiceAlert } from '../components/ui.jsx';

/*
 * Los servicios envían `tipo` como success/warning/error/info, pero versiones
 * anteriores usaron otros valores ('SUCCESS', 'PAGO_APROBADO', mayúsculas…).
 * Se normalizan para que cada notificación se pinte con su tono correcto en
 * lugar de caer siempre en "neutral".
 */
const TONO_POR_TIPO = {
  success: 'ok',
  warning: 'warn',
  error: 'danger',
  info: 'info',
};

const ETIQUETA_POR_TIPO = {
  success: 'Éxito',
  warning: 'Aviso',
  error: 'Error',
  info: 'Información',
};

const SINONIMOS_TIPO = {
  success: 'success', ok: 'success', exito: 'success', 'éxito': 'success', completado: 'success',
  confirmado: 'success', aprobado: 'success', pagado: 'success', pago_aprobado: 'success', venta_confirmada: 'success',
  warning: 'warning', warn: 'warning', aviso: 'warning', pendiente: 'warning',
  error: 'error', danger: 'error', fallo: 'error', falla: 'error', fallido: 'error', fracaso: 'error',
  rechazado: 'error', pago_rechazado: 'error', cancelado: 'error', failed: 'error',
  info: 'info', informacion: 'info', 'información': 'info', simulada: 'info', simulado: 'info',
};

function describirTipo(tipo) {
  const bruto = String(tipo ?? '').trim();
  const clave = SINONIMOS_TIPO[bruto.toLowerCase()] || 'info';
  return { clave, etiqueta: ETIQUETA_POR_TIPO[clave], bruto: bruto || 'información' };
}

/** El servicio emisor puede venir como `servicio` (canónico) u `origen` (heredado). */
const origenDe = notificacion => notificacion.servicio || notificacion.service || notificacion.origen || 'aplicación';

export default function Notificaciones({ app }) {
  const { services, data, api, confirm, reload } = app;
  const { notificaciones } = data;

  const eliminar = notificacion => confirm({
    title: 'Eliminar notificación',
    message: `Se eliminará el evento #${notificacion.id} de “${origenDe(notificacion)}”.`,
    success: 'Notificación eliminada.',
    action: () => api('notificaciones', `/${notificacion.id}`, { method: 'DELETE' }),
  });

  const columnas = [
    {
      key: 'tipo',
      header: 'Tipo',
      width: '130px',
      sortValue: notificacion => describirTipo(notificacion.tipo).clave,
      render: notificacion => {
        const { clave, etiqueta, bruto } = describirTipo(notificacion.tipo);
        return <Pill tone={TONO_POR_TIPO[clave]} title={`Valor recibido: ${bruto}`}>{etiqueta}</Pill>;
      },
    },
    {
      key: 'servicio',
      header: 'Servicio',
      width: '150px',
      render: notificacion => <span className="id-tag">{origenDe(notificacion)}</span>,
    },
    { key: 'mensaje', header: 'Mensaje', render: notificacion => notificacion.mensaje || notificacion.message || '—' },
    {
      key: 'fecha',
      header: 'Fecha',
      sortValue: notificacion => new Date(notificacion.creado_en || notificacion.created_at || 0).getTime() || 0,
      render: notificacion => <span className="cell-muted">{fecha(notificacion.creado_en || notificacion.created_at)}</span>,
    },
    {
      key: 'acciones',
      header: '',
      sortable: false,
      width: '60px',
      render: notificacion => (
        <button
          type="button"
          className="row-icon danger"
          title="Eliminar notificación"
          aria-label={`Eliminar notificación ${notificacion.id}`}
          onClick={() => eliminar(notificacion)}
        >
          <Trash2 size={14} />
        </button>
      ),
    },
  ];

  return (
    <>
      <PageIntro
        kicker="Eventos del sistema"
        title="Notificaciones"
        description="Eventos emitidos por Inventario, Pedidos y Pagos, almacenados por el microservicio de Notificaciones (Equipo 3)."
      />

      <div className="panel table-panel">
        <div className="panel-head">
          <div>
            <h2>Registro de actividad</h2>
            <p className="panel-sub">
              {notificaciones.length} {notificaciones.length === 1 ? 'evento' : 'eventos'} · se listan los {numero(Math.min(notificaciones.length, 50))} más recientes.
            </p>
          </div>
        </div>

        {services.notificaciones && !services.notificaciones.ok && (
          <ServiceAlert serviceKey="notificaciones" error={services.notificaciones.error} onRetry={reload} />
        )}

        <DataTable
          columns={columnas}
          rows={notificaciones}
          searchPlaceholder="Buscar por servicio, mensaje o tipo…"
          initialSort={{ key: 'fecha', dir: 'desc' }}
          empty={{ icon: Bell, title: 'Sin notificaciones', text: 'Las acciones de inventario y pagos generarán eventos aquí.' }}
        />
      </div>
    </>
  );
}
