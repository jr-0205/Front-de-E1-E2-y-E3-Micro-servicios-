import { useState } from 'react';
import { Save, Users, X } from 'lucide-react';
import { json } from '../lib/api.js';
import { DataTable, Field, PageIntro, RowActions, ServiceAlert } from '../components/ui.jsx';

const CORREO_VALIDO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default function Clientes({ app }) {
  const { services, data, api, run, confirm, reload } = app;
  const { clientes } = data;

  const [form, setForm] = useState({ nombre: '', correo: '' });
  const [editando, setEditando] = useState(null);
  const [errorCorreo, setErrorCorreo] = useState('');

  const guardar = async event => {
    event.preventDefault();
    const nombre = form.nombre.trim();
    const correo = form.correo.trim().toLowerCase();

    if (!CORREO_VALIDO.test(correo)) {
      setErrorCorreo('Escribe un correo válido, por ejemplo ana@correo.com');
      return;
    }

    setErrorCorreo('');
    const ok = await run(
      () => api('clientes', editando ? `/${editando.id}` : '', {
        method: editando ? 'PUT' : 'POST',
        body: json({ nombre, correo }),
      }),
      editando ? 'Cliente actualizado.' : 'Cliente creado.'
    );

    if (ok) {
      setForm({ nombre: '', correo: '' });
      setEditando(null);
    }
  };

  const editar = cliente => {
    setEditando(cliente);
    setForm({ nombre: cliente.nombre, correo: cliente.correo });
    setErrorCorreo('');
  };

  const cancelar = () => {
    setEditando(null);
    setForm({ nombre: '', correo: '' });
    setErrorCorreo('');
  };

  const eliminar = cliente => confirm({
    title: 'Eliminar cliente',
    message: `Se eliminará “${cliente.nombre}” (${cliente.correo}) del servicio de Clientes. Esta acción no se puede deshacer.`,
    success: 'Cliente eliminado.',
    action: () => api('clientes', `/${cliente.id}`, { method: 'DELETE' }),
  });

  const columnas = [
    {
      key: 'nombre',
      header: 'Cliente',
      render: cliente => (
        <div className="cell-main">
          <b>{cliente.nombre}</b>
          <small>{cliente.correo}</small>
        </div>
      ),
    },
    { key: 'correo', header: 'Correo', render: cliente => <span className="cell-mono">{cliente.correo}</span> },
    { key: 'id', header: 'ID', width: '90px', render: cliente => <span className="id-tag">#{cliente.id}</span> },
    {
      key: 'acciones',
      header: 'Acciones',
      sortable: false,
      width: '110px',
      render: cliente => <RowActions onEdit={() => editar(cliente)} onRemove={() => eliminar(cliente)} />,
    },
  ];

  return (
    <>
      <PageIntro
        kicker="Directorio"
        title="Clientes"
        description="Registra y mantén los clientes del microservicio Clientes (Equipo 1)."
      />

      <div className="management-grid">
        <form className="panel form-panel" onSubmit={guardar}>
          <h2>{editando ? 'Editar cliente' : 'Agregar cliente'}</h2>
          <p className="panel-sub">Los datos se guardan directamente en la API de Clientes.</p>

          <Field label="Nombre completo" id="cliente-nombre">
            <input
              id="cliente-nombre"
              className="input"
              required
              value={form.nombre}
              onChange={event => setForm(actual => ({ ...actual, nombre: event.target.value }))}
              placeholder="Ej. María González"
              autoComplete="name"
            />
          </Field>

          <Field label="Correo electrónico" id="cliente-correo" error={errorCorreo}>
            <input
              id="cliente-correo"
              className="input"
              type="email"
              required
              value={form.correo}
              onChange={event => setForm(actual => ({ ...actual, correo: event.target.value }))}
              placeholder="maria@correo.com"
              autoComplete="email"
            />
          </Field>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              <Save size={14} aria-hidden="true" />
              {editando ? 'Guardar cambios' : 'Crear cliente'}
            </button>
            {editando && (
              <button type="button" className="btn btn-secondary" onClick={cancelar}>
                <X size={14} aria-hidden="true" /> Cancelar
              </button>
            )}
          </div>
        </form>

        <div className="panel table-panel">
          <div className="panel-head">
            <div>
              <h2>Clientes registrados</h2>
              <p className="panel-sub">{clientes.length} {clientes.length === 1 ? 'registro' : 'registros'} en el directorio.</p>
            </div>
          </div>

          {services.clientes && !services.clientes.ok && (
            <ServiceAlert serviceKey="clientes" error={services.clientes.error} onRetry={reload} />
          )}

          <DataTable
            columns={columnas}
            rows={clientes}
            searchPlaceholder="Buscar por nombre o correo…"
            initialSort={{ key: 'id', dir: 'asc' }}
            empty={{ icon: Users, title: 'Sin clientes', text: 'Crea el primer cliente con el formulario.' }}
          />
        </div>
      </div>
    </>
  );
}
