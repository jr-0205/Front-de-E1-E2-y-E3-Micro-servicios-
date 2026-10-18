import { useState } from 'react';
import { Boxes, Package, Save, X } from 'lucide-react';
import { dinero, json, numero } from '../lib/api.js';
import { DataTable, Field, Notice, PageIntro, Pill, RowActions, ServiceAlert } from '../components/ui.jsx';

const SIN_REGISTRO = 'Sin registrar';

export default function Inventario({ app }) {
  const { services, data, api, run, confirm, reload, notify } = app;
  const { inventario, productos } = data;

  const [form, setForm] = useState({ productoId: '', stock: '0', descripcion: '' });
  const [editando, setEditando] = useState(null);
  const [errorStock, setErrorStock] = useState('');

  const catalogoCaido = services.productos && !services.productos.ok;
  const inventarioCaido = services.inventario && !services.inventario.ok;
  const productoSeleccionado = productos.find(p => Number(p.id) === Number(form.productoId));

  const estadoDe = item => {
    const stock = numero(item.stock);
    if (!item.creado_en) return { tono: 'neutral', texto: SIN_REGISTRO };
    if (stock <= 0) return { tono: 'danger', texto: 'Agotado' };
    if (stock <= 5) return { tono: 'warn', texto: 'Stock bajo' };
    return { tono: 'ok', texto: 'Disponible' };
  };

  const guardar = async event => {
    event.preventDefault();
    const stock = Number(form.stock);
    const descripcion = form.descripcion.trim();

    if (!Number.isInteger(stock) || stock < 0) {
      setErrorStock('Las existencias deben ser un número entero mayor o igual a cero.');
      return;
    }
    if (!editando && !form.productoId) {
      notify('Selecciona el producto del catálogo al que corresponden las existencias.', 'error');
      return;
    }

    setErrorStock('');
    const cuerpo = editando
      ? { stock, descripcion }
      : { productoId: Number(form.productoId), stock, descripcion };

    const ok = await run(
      () => api('inventario', editando ? `/${editando.id}` : '', {
        method: editando ? 'PUT' : 'POST',
        body: json(cuerpo),
      }),
      editando ? 'Existencias actualizadas.' : 'Existencias registradas.'
    );

    if (ok) {
      setForm({ productoId: '', stock: '0', descripcion: '' });
      setEditando(null);
    }
  };

  const editar = item => {
    setEditando(item);
    setForm({ productoId: String(item.id), stock: String(numero(item.stock)), descripcion: item.descripcion || '' });
    setErrorStock('');
  };

  const cancelar = () => {
    setEditando(null);
    setForm({ productoId: '', stock: '0', descripcion: '' });
    setErrorStock('');
  };

  const eliminar = item => confirm({
    title: 'Eliminar existencias',
    message: `Se borrará el registro de existencias de “${item.nombre}”. El producto seguirá en el catálogo del Equipo 1.`,
    success: 'Registro de existencias eliminado.',
    action: () => api('inventario', `/${item.id}`, { method: 'DELETE' }),
  });

  const columnas = [
    {
      key: 'nombre',
      header: 'Artículo',
      render: item => (
        <div className="cell-main">
          <b>{item.nombre}</b>
          <small>ID compartido #{item.id}</small>
        </div>
      ),
    },
    {
      key: 'stock',
      header: 'Existencias',
      align: 'right',
      sortValue: item => numero(item.stock),
      render: item => <b>{numero(item.stock)} u.</b>,
    },
    {
      key: 'precio',
      header: 'Precio (catálogo)',
      align: 'right',
      sortValue: item => numero(item.precio),
      render: item => <span className="cell-muted">{dinero(item.precio)}</span>,
    },
    {
      key: 'estado',
      header: 'Estado',
      sortable: false,
      render: item => {
        const estado = estadoDe(item);
        return <Pill tone={estado.tono}>{estado.texto}</Pill>;
      },
    },
    {
      key: 'acciones',
      header: 'Acciones',
      sortable: false,
      width: '110px',
      render: item => (
        <RowActions
          onEdit={() => editar(item)}
          onRemove={item.creado_en ? () => eliminar(item) : undefined}
          removeLabel="Eliminar registro de existencias"
        />
      ),
    },
  ];

  return (
    <>
      <PageIntro
        kicker="Control de existencias"
        title="Inventario"
        description="Inventario (Equipo 3) es la única fuente oficial de stock. El nombre y el precio se leen del catálogo del Equipo 1."
      />

      <div className="management-grid">
        <form className="panel form-panel" onSubmit={guardar}>
          <h2>{editando ? 'Ajustar existencias' : 'Registrar existencias'}</h2>
          <p className="panel-sub">
            {editando
              ? 'Solo se modifican las existencias; el precio pertenece al catálogo.'
              : 'Elige un producto del catálogo y captura cuántas unidades hay disponibles.'}
          </p>

          {catalogoCaido && <ServiceAlert serviceKey="productos" error={services.productos.error} onRetry={reload} />}

          {editando ? (
            <Field label="Producto (definido por el catálogo)">
              <input className="input" value={editando.nombre || ''} readOnly disabled />
            </Field>
          ) : (
            <Field
              label="Producto del catálogo"
              id="inventario-producto"
              hint={productoSeleccionado ? `Precio de referencia: ${dinero(productoSeleccionado.precio)}` : 'El ID del catálogo es la llave compartida con Pedidos.'}
            >
              <div className="select-wrap select-plain">
                <select
                  id="inventario-producto"
                  value={form.productoId}
                  disabled={catalogoCaido || !productos.length}
                  onChange={event => setForm(actual => ({ ...actual, productoId: event.target.value }))}
                >
                  <option value="">Seleccionar producto…</option>
                  {productos.map(producto => {
                    const registro = inventario.find(item => Number(item.id) === Number(producto.id));
                    const marca = registro?.creado_en ? ` — ya registrado (${numero(registro.stock)} u.)` : '';
                    return (
                      <option key={producto.id} value={producto.id}>
                        {producto.nombre} · {dinero(producto.precio)}{marca}
                      </option>
                    );
                  })}
                </select>
              </div>
            </Field>
          )}

          <Field label="Existencias (unidades)" id="inventario-stock" error={errorStock}>
            <input
              id="inventario-stock"
              className="input"
              type="number"
              min="0"
              step="1"
              required
              value={form.stock}
              onChange={event => setForm(actual => ({ ...actual, stock: event.target.value }))}
            />
          </Field>

          <Field label="Descripción (opcional)" id="inventario-descripcion" hint="Ubicación, lote o nota interna.">
            <textarea
              id="inventario-descripcion"
              className="input"
              rows="2"
              value={form.descripcion}
              onChange={event => setForm(actual => ({ ...actual, descripcion: event.target.value }))}
              placeholder="Ej. Estante A-3"
            />
          </Field>

          <Notice kind="info" icon={Boxes}>
            Para vender, el producto debe existir en el catálogo del Equipo 1: Inventario reutiliza su módulo de Productos.
          </Notice>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={catalogoCaido}>
              <Save size={14} aria-hidden="true" />
              {editando ? 'Guardar existencias' : 'Registrar en inventario'}
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
              <h2>Existencias actuales</h2>
              <p className="panel-sub">Catálogo del Equipo 1 enriquecido con el stock del Equipo 3.</p>
            </div>
          </div>

          {inventarioCaido && (
            <ServiceAlert serviceKey="inventario" error={services.inventario.error} onRetry={reload} />
          )}

          <DataTable
            columns={columnas}
            rows={inventario}
            searchPlaceholder="Buscar por nombre o ID…"
            initialSort={{ key: 'nombre', dir: 'asc' }}
            empty={{ icon: Package, title: 'Sin existencias registradas', text: 'Registra unidades para los productos del catálogo.' }}
          />
        </div>
      </div>
    </>
  );
}
