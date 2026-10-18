import { useMemo, useState } from 'react';
import { Cloud, RefreshCw, RotateCcw, Save } from 'lucide-react';
import { SERVICE_LIST, configPorDefecto } from '../lib/api.js';
import { Notice, PageIntro, Pill } from '../components/ui.jsx';

const URL_VALIDA = /^https?:\/\/[^\s]+$/i;

export default function Conexiones({ app }) {
  const { config, services, busy, reload, saveConfig, notify, go } = app;
  const [form, setForm] = useState(() => ({ ...config }));
  const [errores, setErrores] = useState({});

  const valoresPorDefecto = useMemo(() => configPorDefecto(), []);

  const cambiar = (key, value) => {
    setForm(actual => ({ ...actual, [key]: value }));
    setErrores(actual => ({ ...actual, [key]: '' }));
  };

  const restaurar = () => {
    setForm({ ...valoresPorDefecto });
    setErrores({});
    notify('Se restauraron las direcciones por defecto. Guarda para aplicarlas.');
  };

  const guardar = event => {
    event.preventDefault();
    const limpio = {};
    const nuevosErrores = {};

    for (const servicio of SERVICE_LIST) {
      const valor = String(form[servicio.key] || '').trim().replace(/\/+$/, '');
      limpio[servicio.key] = valor;
      if (!URL_VALIDA.test(valor)) {
        nuevosErrores[servicio.key] = 'Escribe una URL completa, por ejemplo http://192.168.1.50:' + servicio.port;
      }
    }

    setErrores(nuevosErrores);
    if (Object.values(nuevosErrores).some(Boolean)) {
      notify('Revisa las direcciones marcadas antes de guardar.', 'error');
      return;
    }

    saveConfig(limpio);
    go('dashboard');
  };

  return (
    <>
      <PageIntro
        kicker="Configuración"
        title="Conexiones de microservicios"
        description="Define la dirección base de cada API. Los cambios se guardan en este navegador (localStorage), no en el servidor."
      />

      <form className="panel settings-panel" onSubmit={guardar}>
        <div className="settings-intro">
          <div className="settings-icon" aria-hidden="true"><Cloud size={19} /></div>
          <div>
            <h2>Direcciones de las API</h2>
            <p className="panel-sub">
              Si un equipo corre en otra computadora, sustituye <code>localhost</code> por su IP en la red local. Deja la misma
              IP en todos los navegadores que deban ver los mismos datos.
            </p>
          </div>
        </div>

        <div className="settings-grid">
          {SERVICE_LIST.map(servicio => {
            const estado = services[servicio.key];
            const activo = Boolean(estado?.ok);
            return (
              <div className="field" key={servicio.key}>
                <span className="field-label">
                  {servicio.label} · {servicio.equipo}
                  <Pill tone={activo ? 'ok' : 'danger'}>{activo ? 'En línea' : 'Sin conexión'}</Pill>
                </span>
                <input
                  className="input"
                  type="url"
                  required
                  value={form[servicio.key] || ''}
                  onChange={event => cambiar(servicio.key, event.target.value)}
                  placeholder={`http://192.168.1.50:${servicio.port}`}
                  aria-label={`Dirección del servicio ${servicio.label}`}
                  aria-invalid={Boolean(errores[servicio.key])}
                />
                {errores[servicio.key] ? (
                  <small className="field-error" role="alert">{errores[servicio.key]}</small>
                ) : (
                  <small className="field-hint">
                    {servicio.ruta}{servicio.alias ? ` · alias ${servicio.alias}` : ''} · {servicio.descripcion}
                  </small>
                )}
              </div>
            );
          })}
        </div>

        <div className="settings-footer">
          <Notice kind="warn">
            Los seis microservicios deben estar activos y permitir solicitudes CORS desde este navegador.
          </Notice>
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={restaurar}>
              <RotateCcw size={14} aria-hidden="true" /> Valores por defecto
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => reload()} disabled={busy}>
              <RefreshCw size={14} className={busy ? 'spin' : undefined} aria-hidden="true" /> Probar conexiones
            </button>
            <button type="submit" className="btn btn-primary">
              <Save size={14} aria-hidden="true" /> Guardar y comprobar
            </button>
          </div>
        </div>
      </form>

      <section className="panel help-panel">
        <h3>Antes de iniciar una venta</h3>
        <ul>
          <li>Los puertos públicos del proyecto son <b>2501, 2502, 2503, 2504, 2506 y 2507</b>; el front se publica en el <b>2222</b>.</li>
          <li>Cada equipo publica sus servicios con <code>docker compose up -d</code> y expone su IP en la red local.</li>
          <li>Inventario y Pedidos comparten el ID del catálogo de Productos: es la llave que conecta precio, stock y venta.</li>
          <li>En el Equipo 2, el archivo <code>.env</code> debe apuntar <code>CLIENTES_URL</code>, <code>PRODUCTOS_URL</code>, <code>INVENTARIO_URL</code> y <code>NOTIFICACIONES_URL</code> a las IP correctas.</li>
          <li>El botón <b>Cobrar</b> llama a Pedidos, que coordina la validación, el pago, el descuento de existencias y la notificación.</li>
        </ul>
      </section>
    </>
  );
}
