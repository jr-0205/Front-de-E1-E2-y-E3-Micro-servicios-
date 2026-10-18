import { useState } from 'react';
import { Boxes, Package, Save, X } from 'lucide-react';
import { dinero, json, numero } from '../lib/api.js';
import { DataTable, Field, Notice, PageIntro, Pill, RowActions, ServiceAlert } from '../components/ui.jsx';

export default function Productos({ app }) {
  const { services, data, api, run, confirm, reload, go } = app;
  const { productos, inventario } = data;

  const [form, setForm] = useState({ nombre: '', precio: '', stock: '0' });
  const [editando, setEditando] = useState(null);
  const [errorPrecio, setErrorPrecio] = useState('');

  const stockEnInventario = id => {
    const registro = inventario.find(item => Number(item.id) === Number(id));
    return registro ? numero(registro.stock) : null;
  };

  const guardar = async event => {
    event.preventDefault();
    const nombre = form.nombre.trim();
    const precio = Number(form.precio);
    const stock = Number(form.stock || 0);

    if (!nombre) return;
    if (!Number.isFinite(precio) || precio < 0) {
      setErrorPrecio('El precio debe ser un número mayor o igual a cero.');
      return;
    }
    if (!Number.isInteger(stock) || stock < 0) return;

    setErrorPrecio('');
    const ok = await run(
      () => api('productos', editando ? `/${editando.id}` : '', {
        method: editando ? 'PUT' : 'POST',
        body: json({ nombre, precio, stock }),
      }),
      editando ? 'Producto actualizado.' : 'Producto creado en el catálogo.'
    );

    if (ok) {
      setForm({ nombre: '', precio: '', stock: '0' });
      setEditando(null);
    }
  };

  const editar = producto => {
    setEditando(producto);
    setForm({ nombre: producto.nombre, precio: String(producto.precio), stock: String(producto.stock ?? 0) });
    setErrorPrecio('');
  };

  const cancelar = () => {
    setEditando(null);
    setForm({ nombre: '', precio: '', stock: '0' });
    setErrorPrecio('');
  };

  const eliminar = producto => confirm({
    title: 'Eliminar producto',
    message: `Se eliminará “${producto.nombre}” del catálogo del Equipo 1. Las ventas ya registradas no se modifican.`,
    success: 'Producto eliminado.',
    action: () => api('productos', `/${producto.id}`, { method: 'DELETE' }),
  });

  const columnas = [
    {
      key: 'nombre',
      header: 'Producto',
      render: producto => (
        <div className="cell-main">
          <b>{producto.nombre}</b>
          <small>SKU-{String(producto.id).padStart(4, '0')}</small>
        </div>
      ),
    },
    { key: 'precio', header: 'Precio', align: 'right', sortValue: p => numero(p.precio), render: p => <b>{dinero(p.precio)}</b> },
    {
      key: 'stock',
      header: 'Stock catálogo',
      align: 'right',
      sortValue: p => numero(p.stock),
      render: p => <span className="cell-muted">{numero(p.stock)} (informativo)</span>,
    },
    {
      key: 'inventario',
      header: 'Existencias reales',
      align: 'right',
      sortable: false,
      render: producto => {
        const stock = stockEnInventario(producto.id);
        if (stock === null) return <Pill tone="neutral">Sin registro</Pill>;
        return <Pill tone={stock <= 0 ? 'danger' : stock <= 5 ? 'warn' : 'ok'}>{stock} u.</Pill>;
      },
    },
    {
      key: 'acciones',
      header: 'Acciones',
      sortable: false,
      width: '110px',
      render: producto => <RowActions onEdit={() => editar(producto)} onRemove={() => eliminar(producto)} />,
    },
  ];

  return (
    <>
      <PageIntro
        kicker="Catálogo"
        title="Productos"
        description="Administra nombres y precios del catálogo comercial del Equipo 1. Las existencias reales viven en Inventario."
      />

      <div className="management-grid">
        <form className="panel form-panel" onSubmit={guardar}>
          <h2>{editando ? 'Editar producto' : 'Nuevo producto'}</h2>
          <p className="panel-sub">El ID que asigna este catálogo es el mismo que usa Inventario y Pedidos.</p>

          <Field label="Nombre del producto" id="producto-nombre">
            <input
              id="producto-nombre"
              className="input"
              required
              value={form.nombre}
              onChange={event => setForm(actual => ({ ...actual, nombre: event.target.value }))}
              placeholder="Ej. Café molido 500 g"
            />
          </Field>

          <div className="form-row">
            <Field label="Precio (MXN)" id="producto-precio" error={errorPrecio}>
              <input
                id="producto-precio"
                className="input"
                type="number"
                min="0"
                step="0.01"
                required
                value={form.precio}
                onChange={event => setForm(actual => ({ ...actual, precio: event.target.value }))}
                placeholder="0.00"
              />
            </Field>

            <Field label="Stock informativo" id="producto-stock" hint="No descuenta existencias">
              <input
                id="producto-stock"
                className="input"
                type="number"
                min="0"
                step="1"
                value={form.stock}
                onChange={event => setForm(actual => ({ ...actual, stock: event.target.value }))}
              />
            </Field>
          </div>

          <Notice kind="info" icon={Boxes}>
            Para registrar o ajustar existencias usa el módulo Inventario.
            <button type="button" className="notice-action" onClick={() => go('inventario')}>Ir a Inventario</button>
          </Notice>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              <Save size={14} aria-hidden="true" />
              {editando ? 'Guardar cambios' : 'Crear producto'}
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
              <h2>Catálogo</h2>
              <p className="panel-sub">{productos.length} {productos.length === 1 ? 'producto' : 'productos'} registrados.</p>
            </div>
          </div>

          {services.productos && !services.productos.ok && (
            <ServiceAlert serviceKey="productos" error={services.productos.error} onRetry={reload} />
          )}

          <DataTable
            columns={columnas}
            rows={productos}
            searchPlaceholder="Buscar producto…"
            initialSort={{ key: 'id', dir: 'asc' }}
            empty={{ icon: Package, title: 'Catálogo vacío', text: 'Agrega productos para que aparezcan aquí.' }}
          />
        </div>
      </div>
    </>
  );
}
