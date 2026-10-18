import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, ArrowLeftRight, ChevronDown, CircleDollarSign, CreditCard, Package, Plus,
  ShoppingCart, Trash2, Users, X,
} from 'lucide-react';
import { VENTAS_SIMULADAS, dinero, esFalloDeConexion, json, numero } from '../lib/api.js';
import { EmptyState, Notice, Pill, ServiceAlert } from '../components/ui.jsx';

const METODOS = [
  { id: 'tarjeta', label: 'Tarjeta', Icon: CreditCard },
  { id: 'efectivo', label: 'Efectivo', Icon: CircleDollarSign },
  { id: 'transferencia', label: 'Transferencia', Icon: ArrowLeftRight },
];

export default function Pos({ app }) {
  const { services, data, api, notify, go, cart, reload } = app;
  const { productos, inventario, clientes } = data;

  const [busqueda, setBusqueda] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [metodoPago, setMetodoPago] = useState('tarjeta');
  const [cobrando, setCobrando] = useState(false);
  const [simuladas, setSimuladas] = useState([]);
  const buscador = useRef(null);

  /* Atajo real de teclado: Ctrl/Cmd + K enfoca la búsqueda del catálogo. */
  useEffect(() => {
    const alPresionarTecla = event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        buscador.current?.focus();
        buscador.current?.select();
      }
    };
    document.addEventListener('keydown', alPresionarTecla);
    return () => document.removeEventListener('keydown', alPresionarTecla);
  }, []);

  useEffect(() => {
    if (!clienteId && clientes.length) setClienteId(String(clientes[0].id));
  }, [clientes, clienteId]);

  const stockDe = useCallback(
    id => numero(inventario.find(item => Number(item.id) === Number(id))?.stock),
    [inventario]
  );
  const unidadesEnCarrito = useCallback(
    id => cart.rows.find(linea => Number(linea.id) === Number(id))?.cantidad || 0,
    [cart.rows]
  );

  const visibles = useMemo(() => {
    const buscado = busqueda.trim().toLocaleLowerCase();
    return buscado ? productos.filter(p => String(p.nombre || '').toLocaleLowerCase().includes(buscado)) : productos;
  }, [productos, busqueda]);

  const agregar = producto => {
    const registro = inventario.find(item => Number(item.id) === Number(producto.id));
    const stock = numero(registro?.stock);

    if (!registro) return notify('Este producto no tiene registro de existencias en Inventario.', 'error');
    if (stock <= 0) return notify(`Sin existencias de “${producto.nombre}”. Registra stock en Inventario.`, 'error');
    if (unidadesEnCarrito(producto.id) >= stock) return notify(`Ya agregaste las ${stock} unidades disponibles.`, 'error');

    cart.add(producto);
  };

  const cobrar = async () => {
    if (!clienteId) return notify('Selecciona un cliente antes de cobrar.', 'error');
    if (!cart.rows.length) return notify('Agrega al menos un producto al carrito.', 'error');

    const lineas = [...cart.rows];

    /* Modo demostración (VITE_DEMO_SALES=true): no se llama a ninguna API. */
    if (VENTAS_SIMULADAS) {
      const total = cart.total;
      setSimuladas(prev => [{ id: Date.now(), total, articulos: lineas.length, metodoPago }, ...prev].slice(0, 4));
      cart.clear();
      notify(`Venta simulada por ${dinero(total)}. No se registró ningún cobro ni se descontó inventario.`, 'warn');
      return;
    }

    if (services.pedidos && !services.pedidos.ok) {
      return notify(`Pedidos no está disponible: ${services.pedidos.error}. Revisa Conexiones API.`, 'error');
    }
    if (services.inventario && !services.inventario.ok) {
      return notify(`Inventario no está disponible: ${services.inventario.error}. Revisa Conexiones API.`, 'error');
    }

    // Última comprobación local antes de cobrar; Pedidos vuelve a validar del lado del servidor.
    for (const linea of lineas) {
      const stock = stockDe(linea.id);
      if (stock < linea.cantidad) {
        return notify(`No hay existencias suficientes de “${linea.nombre}” (disponibles: ${stock}). Actualiza Inventario antes de cobrar.`, 'error');
      }
    }

    setCobrando(true);
    const completadas = [];
    const respuestas = [];

    try {
      // Pedidos es el orquestador: valida cliente y producto, registra el pago,
      // descuenta existencias en Inventario y genera las notificaciones.
      for (const linea of lineas) {
        respuestas.push(await api('pedidos', '', {
          method: 'POST',
          body: json({
            clienteId: Number(clienteId),
            productoId: Number(linea.id),
            cantidad: linea.cantidad,
            metodoPago,
          }),
        }));
        completadas.push(linea.id);
      }

      // Pedidos responde { pedido, pago, integracion, advertenciaNotificacion }.
      const pedidosCreados = respuestas.map(r => r?.pedido?.id ?? r?.id).filter(Boolean);
      const avisos = respuestas.map(r => r?.advertenciaNotificacion).filter(Boolean);
      const resumen = [
        `${lineas.length} ${lineas.length === 1 ? 'producto' : 'productos'}`,
        pedidosCreados.length ? `${pedidosCreados.length === 1 ? 'pedido' : 'pedidos'} ${pedidosCreados.join(', ')}` : null,
      ].filter(Boolean).join(' · ');

      cart.clear();
      await reload(true);

      if (avisos.length) {
        notify(`Venta registrada (${resumen}), pero hubo avisos: ${avisos[0]}`, 'warn');
      } else {
        notify(`Venta registrada (${resumen}). Pedidos, pagos, inventario y notificaciones se actualizaron.`);
      }
    } catch (error) {
      // Las líneas ya cobradas se retiran del carrito para no cobrarlas dos veces.
      if (completadas.length) cart.removeMany(completadas);
      await reload(true);

      const parcial = completadas.length
        ? `Se cobraron ${completadas.length} de ${lineas.length} líneas antes del error; se retiraron del carrito. `
        : '';

      if (esFalloDeConexion(error)) {
        // Sin respuesta del servicio el resultado es desconocido: se avisa como
        // advertencia y se pide verificar Pedidos. Nunca se muestra como éxito.
        notify(
          `${parcial}No hubo respuesta de ${error.url}, así que la venta no se pudo confirmar. ` +
          'Revisa Pedidos antes de reintentar para no cobrar dos veces.',
          'warn'
        );
        return;
      }

      notify(parcial + error.message, 'error');
    } finally {
      setCobrando(false);
    }
  };

  const productosCaidos = services.productos && !services.productos.ok;
  const inventarioCaido = services.inventario && !services.inventario.ok;
  const pedidosCaidos = services.pedidos && !services.pedidos.ok;
  const catalogoVacio = !productos.length && !productosCaidos;

  return (
    <section className="pos-layout">
      {VENTAS_SIMULADAS && (
        <div className="pos-banner">
          <Notice kind="warn" icon={AlertTriangle}>
            <b>Modo demostración activo.</b> El botón de cobro no envía nada a los servicios: registra la venta solo en
            esta pantalla y no descuenta existencias. Se activa con <code>VITE_DEMO_SALES=true</code> al compilar.
          </Notice>
        </div>
      )}

      <div className="panel catalog-panel">
        <div className="panel-head">
          <div>
            <span className="kicker">Venta rápida</span>
            <h2>Catálogo de productos</h2>
            <p className="panel-sub">Precios y nombres provienen del microservicio de Productos (Equipo 1).</p>
          </div>
          <span className="count-badge">{productos.length} artículos</span>
        </div>

        {productosCaidos && <ServiceAlert serviceKey="productos" error={services.productos.error} onRetry={reload} />}

        <div className="search-field search-field-lg">
          <Package size={15} aria-hidden="true" />
          <input
            ref={buscador}
            type="search"
            value={busqueda}
            onChange={event => setBusqueda(event.target.value)}
            placeholder="Buscar producto por nombre…"
            aria-label="Buscar producto por nombre"
          />
          {busqueda ? (
            <button type="button" className="search-clear" onClick={() => setBusqueda('')} aria-label="Limpiar búsqueda">
              <X size={13} />
            </button>
          ) : (
            <kbd className="search-kbd" title="Atajo de búsqueda">Ctrl K</kbd>
          )}
        </div>

        <div className="product-grid">
          {visibles.map(producto => {
            const stock = stockDe(producto.id);
            const enCarrito = unidadesEnCarrito(producto.id);
            const agotado = stock <= 0;
            const alTope = enCarrito >= stock;
            const tono = agotado ? 'danger' : stock <= 5 ? 'warn' : 'ok';

            return (
              <article className="product-card" key={producto.id}>
                <div className="product-tile" aria-hidden="true">
                  <Package size={19} />
                  <span className="product-sku">SKU-{String(producto.id).padStart(4, '0')}</span>
                </div>
                <div className="product-body">
                  <h3 className="product-name" title={producto.nombre}>{producto.nombre}</h3>
                  <div className="product-meta">
                    <strong>{dinero(producto.precio)}</strong>
                    <Pill tone={tono}>
                      {agotado ? 'Sin existencias' : `${stock} disponibles`}
                    </Pill>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-block btn-sm"
                    disabled={agotado || alTope || !producto.nombre}
                    onClick={() => agregar(producto)}
                  >
                    <Plus size={14} />
                    {agotado ? 'Sin existencias' : alTope ? 'Sin más unidades' : 'Agregar al carrito'}
                  </button>
                </div>
              </article>
            );
          })}

          {!visibles.length && (
            <div className="grid-empty">
              <EmptyState
                title={catalogoVacio ? 'El catálogo está vacío' : 'Sin resultados'}
                text={
                  catalogoVacio
                    ? 'Crea productos en el módulo Productos para poder venderlos.'
                    : 'Ningún producto coincide con la búsqueda. Prueba con otro nombre.'
                }
              />
            </div>
          )}
        </div>
      </div>

      <aside className="panel cart-panel" aria-label="Venta actual">
        <div className="cart-head">
          <div className="cart-icon" aria-hidden="true"><ShoppingCart size={17} /></div>
          <div>
            <h2>Venta actual</h2>
            <p className="panel-sub">
              {cart.units} {cart.units === 1 ? 'artículo' : 'artículos'} · {dinero(cart.total)}
            </p>
          </div>
          <button
            type="button"
            className="icon-btn"
            title="Vaciar carrito"
            aria-label="Vaciar carrito"
            disabled={!cart.rows.length}
            onClick={cart.clear}
          >
            <Trash2 size={15} />
          </button>
        </div>

        <div className="field compact-field">
          <span className="field-label">Cliente</span>
          <div className="select-wrap">
            <Users size={15} aria-hidden="true" />
            <select value={clienteId} onChange={event => setClienteId(event.target.value)} aria-label="Cliente de la venta">
              <option value="">Seleccionar cliente</option>
              {clientes.map(cliente => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nombre} · {cliente.correo}
                </option>
              ))}
            </select>
            <ChevronDown size={14} aria-hidden="true" />
          </div>
        </div>

        {!clientes.length && (
          <div className="inline-note">
            No hay clientes disponibles.
            <button type="button" className="link-btn" onClick={() => go('clientes')}>Crear uno</button>
          </div>
        )}

        <div className="cart-lines">
          {cart.rows.map(linea => (
            <div className="cart-line" key={linea.id}>
              <div className="cart-line-name">
                <b>{linea.nombre}</b>
                <small>{dinero(linea.precio)} c/u</small>
                <div className="qty">
                  <button type="button" onClick={() => cart.changeQuantity(linea.id, -1)} aria-label={`Quitar una unidad de ${linea.nombre}`}>−</button>
                  <span>{linea.cantidad}</span>
                  <button type="button" onClick={() => cart.changeQuantity(linea.id, 1)} aria-label={`Agregar una unidad de ${linea.nombre}`}>+</button>
                </div>
              </div>
              <div className="cart-line-total">
                <b>{dinero(linea.precio * linea.cantidad)}</b>
                <button type="button" onClick={() => cart.remove(linea.id)} aria-label={`Quitar ${linea.nombre} del carrito`}>
                  <X size={13} />
                </button>
              </div>
            </div>
          ))}

          {!cart.rows.length && (
            <EmptyState
              icon={ShoppingCart}
              title="El carrito está vacío"
              text="Agrega productos del catálogo para comenzar la venta."
            />
          )}
        </div>

        <div className="pay-choice">
          <span className="field-label">Método de pago</span>
          <div className="pay-options" role="group" aria-label="Método de pago">
            {METODOS.map(({ id, label, Icon }) => (
              <button
                type="button"
                key={id}
                className={`pay-option${metodoPago === id ? ' selected' : ''}`}
                aria-pressed={metodoPago === id}
                onClick={() => setMetodoPago(id)}
              >
                <Icon size={15} aria-hidden="true" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="totals">
          <div><span>Subtotal</span><span>{dinero(cart.total)}</span></div>
          <div><span>Impuestos</span><span>Incluidos</span></div>
          <div className="grand-total"><strong>Total a cobrar</strong><strong>{dinero(cart.total)}</strong></div>
        </div>

        <button
          type="button"
          className="btn btn-primary btn-block checkout-btn"
          disabled={cobrando || !cart.rows.length || !clienteId || (!VENTAS_SIMULADAS && (productosCaidos || pedidosCaidos))}
          onClick={cobrar}
        >
          <CreditCard size={16} aria-hidden="true" />
          {cobrando ? 'Procesando venta…' : VENTAS_SIMULADAS ? 'Simular venta' : 'Cobrar y registrar venta'}
        </button>

        <p className="secure-note">
          {VENTAS_SIMULADAS
            ? 'Modo demostración: la venta no se envía a los servicios y no se descuenta inventario.'
            : 'El pago, el descuento de existencias y las notificaciones los coordina el microservicio de Pedidos.'}
        </p>

        {simuladas.length > 0 && (
          <div className="demo-sales">
            <span className="field-label">Ventas simuladas de esta sesión</span>
            {simuladas.map(venta => (
              <div className="demo-row" key={venta.id}>
                <b>{dinero(venta.total)}</b>
                <small>{venta.articulos} {venta.articulos === 1 ? 'artículo' : 'artículos'} · {venta.metodoPago} · sin cobro real</small>
              </div>
            ))}
          </div>
        )}

        {inventarioCaido && (
          <div className="inline-note warn">
            Inventario no respondió: las existencias mostradas pueden no ser las reales.
          </div>
        )}
      </aside>
    </section>
  );
}
