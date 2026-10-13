import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertCircle, ArrowDownToLine, ArrowLeftRight, Bell, Boxes, Check,
  CheckCircle2, ChevronDown, CircleDollarSign, ClipboardList, Clock3, Cloud,
  CreditCard, Gauge, LayoutDashboard, LoaderCircle, Menu, Package, Plus, RefreshCw,
  Save, Search, Settings, ShoppingBag, ShoppingCart, Trash2, Users, X
} from 'lucide-react';

const DEFAULTS = {
  clientes: `${location.protocol}//${location.hostname}:2501`,
  productos: `${location.protocol}//${location.hostname}:2502`,
  pedidos: `${location.protocol}//${location.hostname}:2503`,
  pagos: `${location.protocol}//${location.hostname}:2504`,
  inventario: `${location.protocol}//${location.hostname}:2506`,
  notificaciones: `${location.protocol}//${location.hostname}:2507`,
};
const SERVICE_INFO = [
  { key: 'clientes', label: 'Clientes', port: 2501, path: '/health' },
  { key: 'productos', label: 'Productos', port: 2502, path: '/health' },
  { key: 'pedidos', label: 'Pedidos', port: 2503, path: '/health' },
  { key: 'pagos', label: 'Pagos', port: 2504, path: '/health' },
  { key: 'inventario', label: 'Inventario', port: 2506, path: '/health' },
  { key: 'notificaciones', label: 'Notificaciones', port: 2507, path: '/health' },
];
const money = value => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(value || 0));
const shortDate = value => value ? new Date(value).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : '—';
const readConfig = () => {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem('superpos-urls') || '{}') }; }
  catch { return DEFAULTS; }
};
const asArray = data => Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : Array.isArray(data?.items) ? data.items : [];

async function api(base, path, options = {}) {
  const response = await fetch(base.replace(/\/+$/, '') + path, {
    ...options,
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) },
    signal: AbortSignal.timeout(8000),
  });
  const raw = await response.text();
  let data = null;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = { error: raw || 'Respuesta no válida del servicio' }; }
  if (!response.ok) throw new Error(data?.detalle || data?.error || data?.mensaje || `HTTP ${response.status}`);
  return data;
}
const json = value => JSON.stringify(value);

export default function App() {
  const [config, setConfig] = useState(readConfig);
  const [section, setSection] = useState('pos');
  const [mobileNav, setMobileNav] = useState(false);
  const [toast, setToast] = useState(null);
  const [busy, setBusy] = useState(false);
  const [services, setServices] = useState({});
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [cart, setCart] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('tarjeta');
  const [clientForm, setClientForm] = useState({ nombre: '', correo: '' });
  const [productForm, setProductForm] = useState({ nombre: '', precio: '', stock: '0' });
  const [editingClient, setEditingClient] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [inventoryForm, setInventoryForm] = useState({ nombre: '', descripcion: '', stock: '0', precio: '' });
  const [editingInventory, setEditingInventory] = useState(null);
  const [settingsForm, setSettingsForm] = useState(config);

  const notify = (message, kind = 'success') => {
    setToast({ message, kind });
    window.setTimeout(() => setToast(null), 4500);
  };

  const loadAll = useCallback(async (quiet = false) => {
    if (!quiet) setBusy(true);
    const tasks = [
      ['clientes', () => api(config.clientes, '/clientes')],
      ['productos', () => api(config.productos, '/productos')],
      ['inventario', () => api(config.inventario, '/api/products')],
      ['pedidos', () => api(config.pedidos, '/pedidos')],
      ['pagos', () => api(config.pagos, '/pagos')],
      ['notificaciones', () => api(config.notificaciones, '/api/notifications')],
    ];
    const results = await Promise.all(tasks.map(async ([key, run]) => {
      try { return [key, await run(), null]; }
      catch (error) { return [key, null, error.message]; }
    }));
    const nextServices = {};
    for (const [key, data, error] of results) {
      nextServices[key] = { ok: !error, error };
      if (data !== null) {
        if (key === 'clientes') setClients(asArray(data));
        if (key === 'productos') setProducts(asArray(data));
        if (key === 'inventario') setInventory(asArray(data));
        if (key === 'pedidos') setOrders(asArray(data));
        if (key === 'pagos') setPayments(asArray(data));
        if (key === 'notificaciones') setNotifications(asArray(data));
      }
    }
    setServices(nextServices);
    if (!quiet) setBusy(false);
  }, [config]);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => {
    if (section === 'pos' && !selectedClient && clients.length) setSelectedClient(String(clients[0].id));
  }, [clients, selectedClient, section]);

  const connected = Object.values(services).filter(s => s.ok).length;
  const cartTotal = cart.reduce((sum, row) => sum + Number(row.precio || 0) * row.cantidad, 0);
  const cartUnits = cart.reduce((sum, row) => sum + row.cantidad, 0);
  const visibleProducts = useMemo(() => products.filter(p => (p.nombre || '').toLowerCase().includes(search.toLowerCase())), [products, search]);

  const doAction = async (action, successMessage) => {
    try { await action(); await loadAll(true); if (successMessage) notify(successMessage); return true; }
    catch (error) { notify(error.message, 'error'); return false; }
  };

  const addToCart = product => {
    const available = inventory.find(item => Number(item.id) === Number(product.id));
    const stock = Number(available?.stock ?? 0);
    const current = cart.find(row => Number(row.id) === Number(product.id))?.cantidad || 0;
    if (!available) return notify('No se encontró este producto en Inventario. Revisa la sincronización de IDs.', 'error');
    if (current >= stock) return notify('No hay existencias suficientes para agregar otra unidad.', 'error');
    setCart(prev => {
      const found = prev.find(row => Number(row.id) === Number(product.id));
      return found ? prev.map(row => Number(row.id) === Number(product.id) ? { ...row, cantidad: row.cantidad + 1 } : row)
        : [...prev, { ...product, cantidad: 1 }];
    });
  };
  const changeQuantity = (id, delta) => setCart(prev => prev.map(row => {
    if (Number(row.id) !== Number(id)) return row;
    const stock = Number(inventory.find(i => Number(i.id) === Number(id))?.stock || 0);
    return { ...row, cantidad: Math.min(stock, Math.max(1, row.cantidad + delta)) };
  }));
  const checkout = async () => {
    if (!selectedClient) return notify('Selecciona un cliente antes de cobrar.', 'error');
    if (!cart.length) return notify('Agrega al menos un producto al carrito.', 'error');
    const mismatched = cart.find(row => !inventory.some(i => Number(i.id) === Number(row.id)));
    if (mismatched) return notify(`El producto “${mismatched.nombre}” no tiene registro de inventario con el mismo ID.`, 'error');
    setBusy(true);
    try {
      // El microservicio Pedidos orquesta validación del cliente/producto, pago, descuento de stock y notificación.
      for (const row of cart) {
        await api(config.pedidos, '/pedidos', {
          method: 'POST',
          body: json({ clienteId: Number(selectedClient), productoId: Number(row.id), cantidad: row.cantidad, metodoPago: paymentMethod }),
        });
      }
      setCart([]);
      await loadAll(true);
      notify('Venta registrada. Pedidos, pagos, inventario y notificaciones fueron actualizados.');
    } catch (error) {
      await loadAll(true);
      notify(error.message, 'error');
    } finally { setBusy(false); }
  };

  const saveClient = async event => {
    event.preventDefault();
    const path = editingClient ? `/clientes/${editingClient.id}` : '/clientes';
    const ok = await doAction(() => api(config.clientes, path, { method: editingClient ? 'PUT' : 'POST', body: json(clientForm) }), editingClient ? 'Cliente actualizado.' : 'Cliente creado.');
    if (ok) { setClientForm({ nombre: '', correo: '' }); setEditingClient(null); }
  };
  const saveProduct = async event => {
    event.preventDefault();
    const body = { nombre: productForm.nombre.trim(), precio: Number(productForm.precio), stock: Number(productForm.stock || 0) };
    const path = editingProduct ? `/productos/${editingProduct.id}` : '/productos';
    const ok = await doAction(() => api(config.productos, path, { method: editingProduct ? 'PUT' : 'POST', body: json(body) }), editingProduct ? 'Producto actualizado.' : 'Producto creado.');
    if (ok) { setProductForm({ nombre: '', precio: '', stock: '0' }); setEditingProduct(null); }
  };
  const saveInventory = async event => {
    event.preventDefault();
    const body = { nombre: inventoryForm.nombre.trim(), descripcion: inventoryForm.descripcion, stock: Number(inventoryForm.stock), precio: Number(inventoryForm.precio) };
    const path = editingInventory ? `/api/products/${editingInventory.id}` : '/api/products';
    const ok = await doAction(() => api(config.inventario, path, { method: editingInventory ? 'PUT' : 'POST', body: json(body) }), editingInventory ? 'Inventario actualizado.' : 'Artículo agregado al inventario.');
    if (ok) { setInventoryForm({ nombre: '', descripcion: '', stock: '0', precio: '' }); setEditingInventory(null); }
  };
  const saveSettings = event => {
    event.preventDefault();
    const cleaned = Object.fromEntries(Object.entries(settingsForm).map(([key, value]) => [key, value.trim().replace(/\/+$/, '')]));
    localStorage.setItem('superpos-urls', JSON.stringify(cleaned));
    setConfig(cleaned);
    notify('Direcciones guardadas. Comprobando los seis servicios…');
    setSection('dashboard');
  };
  const nav = [
    { id: 'pos', label: 'Punto de venta', icon: ShoppingCart },
    { id: 'dashboard', label: 'Resumen', icon: LayoutDashboard },
    { id: 'clientes', label: 'Clientes', icon: Users },
    { id: 'productos', label: 'Productos', icon: Package },
    { id: 'inventario', label: 'Inventario', icon: Boxes },
    { id: 'pedidos', label: 'Pedidos', icon: ClipboardList },
    { id: 'pagos', label: 'Pagos', icon: CreditCard },
    { id: 'notificaciones', label: 'Notificaciones', icon: Bell },
    { id: 'settings', label: 'Conexiones API', icon: Settings },
  ];

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
      <div className="brand"><div className="brand-mark"><ShoppingBag size={22}/></div><div><strong>SuperPOS</strong><span>MICROSERVICIOS · E1 + E2 + E3</span></div><button className="icon-button close-nav" onClick={() => setMobileNav(false)} aria-label="Cerrar menú"><X size={18}/></button></div>
      <div className="store-pill"><span className="store-dot"/><div><b>Super Punto de Venta</b><small>Panel de operación</small></div></div>
      <p className="nav-caption">OPERACIÓN</p>
      <nav>{nav.map(item => { const Icon = item.icon; return <button key={item.id} className={`nav-item ${section === item.id ? 'active' : ''}`} onClick={() => { setSection(item.id); setMobileNav(false); }}><Icon size={18}/><span>{item.label}</span>{item.id === 'pos' && cart.length > 0 && <em>{cartUnits}</em>}</button>; })}</nav>
      <div className="sidebar-bottom"><div className="connection-mini"><span className={connected === 6 ? 'pulse-dot' : 'pulse-dot warning'}/><div><b>{connected}/6 servicios conectados</b><small>Estado de las APIs</small></div></div><span className="version">SUPERPOS · v1.0</span></div>
    </aside>
    {mobileNav && <button className="mobile-scrim" onClick={() => setMobileNav(false)} aria-label="Cerrar menú"/>}
    <main className="main-area">
      <header className="topbar"><div className="topbar-left"><button className="icon-button open-nav" onClick={() => setMobileNav(true)} aria-label="Abrir menú"><Menu size={20}/></button><div><div className="eyebrow">ADMINISTRACIÓN / {nav.find(n => n.id === section)?.label.toUpperCase()}</div><h1>{section === 'pos' ? 'Punto de venta' : nav.find(n => n.id === section)?.label}</h1></div></div><div className="topbar-actions"><span className="live-label"><span/> EN VIVO</span><button className="icon-button refresh-btn" title="Actualizar datos" onClick={() => loadAll()}><RefreshCw size={17} className={busy ? 'spin' : ''}/></button><div className="avatar">AD</div></div></header>
      <div className="content">
        {section === 'pos' && <section className="pos-layout">
          <div className="catalog-panel panel"><div className="panel-heading"><div><span className="section-kicker">VENTA RÁPIDA</span><h2>Catálogo de productos</h2><p>Selecciona artículos para agregarlos a la venta.</p></div><span className="count-badge">{visibleProducts.length} artículos</span></div>
            <div className="search-box"><Search size={17}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar producto por nombre…"/><kbd>⌘ K</kbd></div>
            <div className="product-grid">{visibleProducts.map((p, i) => { const stock = Number(inventory.find(x => Number(x.id) === Number(p.id))?.stock ?? 0); return <article className="product-card" key={p.id}><div className={`product-art art-${i % 5}`}><Package size={27}/><span className="product-id">SKU-{String(p.id).padStart(4,'0')}</span></div><div className="product-info"><h3>{p.nombre}</h3><div className="product-bottom"><strong>{money(p.precio)}</strong><span className={stock <= 5 ? 'stock low' : 'stock'}>{stock} disponibles</span></div><button className="add-button" disabled={stock <= (cart.find(c => Number(c.id) === Number(p.id))?.cantidad || 0)} onClick={() => addToCart(p)}><Plus size={16}/> Agregar al carrito</button></div></article>; })}{!visibleProducts.length && <EmptyState title="No hay productos" text="Comprueba que el servicio Productos esté conectado o cambia la búsqueda."/>}</div>
          </div>
          <aside className="cart-panel panel"><div className="cart-title"><div className="cart-icon"><ShoppingCart size={19}/></div><div><h2>Venta actual</h2><p>{cartUnits} {cartUnits === 1 ? 'artículo' : 'artículos'} en el carrito</p></div><button className="icon-button" title="Vaciar carrito" onClick={() => setCart([])}><Trash2 size={16}/></button></div>
            <label className="field-label">CLIENTE</label><div className="select-wrap"><Users size={16}/><select value={selectedClient} onChange={e => setSelectedClient(e.target.value)}><option value="">Seleccionar cliente</option>{clients.map(c => <option key={c.id} value={c.id}>{c.nombre} · {c.correo}</option>)}</select><ChevronDown size={15}/></div>
            {!clients.length && <div className="inline-warning">No hay clientes disponibles. Crea uno en el módulo Clientes.</div>}
            <div className="cart-lines">{cart.map(row => <div className="cart-line" key={row.id}><div className="cart-product-icon"><Package size={18}/></div><div className="cart-product-name"><b>{row.nombre}</b><small>{money(row.precio)} c/u</small><div className="quantity"><button onClick={() => changeQuantity(row.id,-1)} aria-label="Restar">−</button><span>{row.cantidad}</span><button onClick={() => changeQuantity(row.id,1)} aria-label="Sumar">+</button></div></div><div className="cart-line-total"><b>{money(row.precio * row.cantidad)}</b><button onClick={() => setCart(prev => prev.filter(x => x.id !== row.id))} aria-label="Quitar producto"><X size={14}/></button></div></div>)}{!cart.length && <div className="empty-cart"><div><ShoppingCart size={25}/></div><b>Tu carrito está vacío</b><p>Agrega productos del catálogo para comenzar.</p></div>}</div>
            <div className="payment-choice"><label className="field-label">MÉTODO DE PAGO</label><div className="payment-options">{[['tarjeta','Tarjeta'],['efectivo','Efectivo'],['transferencia','Transferencia']].map(([value,label]) => <button key={value} className={paymentMethod === value ? 'payment-option selected' : 'payment-option'} onClick={() => setPaymentMethod(value)}>{value === 'tarjeta' ? <CreditCard size={16}/> : value === 'efectivo' ? <CircleDollarSign size={16}/> : <ArrowLeftRight size={16}/>}<span>{label}</span></button>)}</div></div>
            <div className="totals"><div><span>Subtotal</span><span>{money(cartTotal)}</span></div><div><span>Impuestos</span><span>Incluidos</span></div><div className="grand-total"><strong>Total a cobrar</strong><strong>{money(cartTotal)}</strong></div></div>
            <button className="checkout-button" disabled={busy || !cart.length || !selectedClient} onClick={checkout}><CreditCard size={18}/>{busy ? 'Procesando venta…' : 'Cobrar y registrar venta'}<span>→</span></button><p className="secure-note"><CheckCircle2 size={13}/> Pago e inventario procesados por microservicios</p>
          </aside>
        </section>}

        {section === 'dashboard' && <><div className="welcome-row"><div><span className="section-kicker">VISTA GENERAL</span><h2>Todo en orden, administrador.</h2><p>Actividad de tu tienda y estado de la arquitectura distribuida.</p></div><button className="button-secondary" onClick={() => loadAll()}><RefreshCw size={15}/> Actualizar datos</button></div>
          <div className="metric-grid"><Metric icon={ShoppingCart} label="Pedidos registrados" value={orders.length} note="Historial de ventas" tone="violet"/><Metric icon={CircleDollarSign} label="Ingresos registrados" value={money(payments.reduce((s,p) => s + Number(p.monto || 0),0))} note={`${payments.length} pagos procesados`} tone="green"/><Metric icon={Package} label="Productos en catálogo" value={products.length} note="Servicio Productos" tone="blue"/><Metric icon={Users} label="Clientes" value={clients.length} note="Base de clientes" tone="orange"/></div>
          <div className="dashboard-grid"><div className="panel service-panel"><div className="panel-heading compact"><div><h2>Estado de microservicios</h2><p>Conectividad consultada desde el navegador.</p></div><span className={connected === 6 ? 'status-chip good' : 'status-chip warn'}>{connected}/6 activos</span></div><div className="service-list">{SERVICE_INFO.map(s => <div className="service-row" key={s.key}><div className={`service-icon ${services[s.key]?.ok ? 'online' : 'offline'}`}>{services[s.key]?.ok ? <Check size={17}/> : <AlertCircle size={17}/>}</div><div className="service-name"><b>{s.label}</b><small>{config[s.key]}</small></div><span className={services[s.key]?.ok ? 'service-status online-text' : 'service-status offline-text'}>{services[s.key]?.ok ? 'Conectado' : 'Sin conexión'}</span></div>)}</div><button className="text-link" onClick={() => setSection('settings')}>Configurar conexiones <span>→</span></button></div>
            <div className="panel activity-panel"><div className="panel-heading compact"><div><h2>Últimos pedidos</h2><p>Actividad reciente del punto de venta.</p></div><button className="text-link" onClick={() => setSection('pedidos')}>Ver todos →</button></div>{orders.slice(0,5).map(o => <div className="activity-row" key={o.id}><div className="activity-icon"><ShoppingBag size={17}/></div><div className="activity-main"><b>Pedido #{o.id}</b><small>Cliente #{o.cliente_id ?? o.clienteId} · {shortDate(o.creado_en || o.created_at)}</small></div><div className="activity-amount"><b>{money(o.total)}</b><span className={`order-state ${String(o.estado || '').includes('PAGADO') ? 'paid' : 'pending'}`}>{o.estado || 'Registrado'}</span></div></div>)}{!orders.length && <EmptyState title="Todavía no hay ventas" text="Las ventas completadas aparecerán aquí."/>}</div></div>
        </>}

        {section === 'clientes' && <><PageIntro kicker="DIRECTORIO" title="Clientes" description="Administra los clientes registrados en el microservicio de Equipo 1."/><div className="management-grid"><form className="panel form-panel" onSubmit={saveClient}><h2>{editingClient ? 'Editar cliente' : 'Agregar cliente'}</h2><p>Los datos se guardan directamente en la API de Clientes.</p><Field label="Nombre completo"><input required value={clientForm.nombre} onChange={e => setClientForm({...clientForm,nombre:e.target.value})} placeholder="Ej. María González"/></Field><Field label="Correo electrónico"><input type="email" required value={clientForm.correo} onChange={e => setClientForm({...clientForm,correo:e.target.value})} placeholder="maria@correo.com"/></Field><div className="form-actions"><button className="button-primary"><Save size={16}/>{editingClient ? 'Guardar cambios' : 'Crear cliente'}</button>{editingClient && <button type="button" className="button-secondary" onClick={() => {setEditingClient(null);setClientForm({nombre:'',correo:''});}}>Cancelar</button>}</div></form><div className="panel table-panel"><TableTitle title="Clientes registrados" count={clients.length}/><div className="table-scroll"><table><thead><tr><th>Cliente</th><th>Correo</th><th>ID</th><th>Acciones</th></tr></thead><tbody>{clients.map(c => <tr key={c.id}><td><b>{c.nombre}</b></td><td>{c.correo}</td><td><span className="id-tag">#{c.id}</span></td><td><RowActions edit={() => {setEditingClient(c);setClientForm({nombre:c.nombre,correo:c.correo});}} remove={() => doAction(() => api(config.clientes,`/clientes/${c.id}`,{method:'DELETE'}),'Cliente eliminado.')}/></td></tr>)}</tbody></table>{!clients.length && <EmptyState title="Sin clientes" text="Crea el primer cliente con el formulario."/>}</div></div></div></>}

        {section === 'productos' && <><PageIntro kicker="CATÁLOGO" title="Productos" description="Gestiona precios y datos del catálogo comercial de Equipo 1."/><div className="management-grid"><form className="panel form-panel" onSubmit={saveProduct}><h2>{editingProduct ? 'Editar producto' : 'Nuevo producto'}</h2><p>El stock aquí es informativo; Inventario es la fuente oficial de existencias.</p><Field label="Nombre del producto"><input required value={productForm.nombre} onChange={e => setProductForm({...productForm,nombre:e.target.value})} placeholder="Ej. Café molido 500 g"/></Field><div className="form-two"><Field label="Precio (MXN)"><input type="number" min="0" step="0.01" required value={productForm.precio} onChange={e => setProductForm({...productForm,precio:e.target.value})} placeholder="0.00"/></Field><Field label="Stock informativo"><input type="number" min="0" step="1" value={productForm.stock} onChange={e => setProductForm({...productForm,stock:e.target.value})}/></Field></div><div className="inline-info"><Boxes size={15}/> Para cambiar existencias, utiliza el módulo Inventario.</div><div className="form-actions"><button className="button-primary"><Save size={16}/>{editingProduct ? 'Guardar cambios' : 'Crear producto'}</button>{editingProduct && <button type="button" className="button-secondary" onClick={() => {setEditingProduct(null);setProductForm({nombre:'',precio:'',stock:'0'});}}>Cancelar</button>}</div></form><div className="panel table-panel"><TableTitle title="Catálogo" count={products.length}/><div className="table-scroll"><table><thead><tr><th>Producto</th><th>Precio</th><th>Stock catálogo</th><th>Acciones</th></tr></thead><tbody>{products.map(p => <tr key={p.id}><td><div className="table-product"><div className="table-product-icon"><Package size={17}/></div><div><b>{p.nombre}</b><small>SKU-{String(p.id).padStart(4,'0')}</small></div></div></td><td><b>{money(p.precio)}</b></td><td>{inventory.find(i=>Number(i.id)===Number(p.id))?.stock ?? '—'}</td><td><RowActions edit={() => {setEditingProduct(p);setProductForm({nombre:p.nombre,precio:String(p.precio),stock:String(p.stock ?? 0)});}} remove={() => doAction(() => api(config.productos,`/productos/${p.id}`,{method:'DELETE'}),'Producto eliminado.')}/></td></tr>)}</tbody></table>{!products.length && <EmptyState title="Catálogo vacío" text="Agrega productos para que aparezcan aquí."/>}</div></div></div></>}

        {section === 'inventario' && <><PageIntro kicker="CONTROL DE EXISTENCIAS" title="Inventario" description="Administra existencias en Equipo 3. Esta API es la fuente única de stock para las ventas."/><div className="management-grid"><form className="panel form-panel" onSubmit={saveInventory}><h2>{editingInventory ? 'Editar existencia' : 'Registrar artículo'}</h2><p>Las altas y cambios generan notificaciones desde el microservicio de Inventario.</p><Field label="Nombre"><input required value={inventoryForm.nombre} onChange={e => setInventoryForm({...inventoryForm,nombre:e.target.value})} placeholder="Nombre del artículo"/></Field><Field label="Descripción"><textarea rows="2" value={inventoryForm.descripcion} onChange={e => setInventoryForm({...inventoryForm,descripcion:e.target.value})} placeholder="Descripción opcional"/></Field><div className="form-two"><Field label="Existencias"><input type="number" required min="0" step="1" value={inventoryForm.stock} onChange={e => setInventoryForm({...inventoryForm,stock:e.target.value})}/></Field><Field label="Precio de referencia"><input type="number" required min="0" step="0.01" value={inventoryForm.precio} onChange={e => setInventoryForm({...inventoryForm,precio:e.target.value})}/></Field></div><div className="inline-warning">Para vender sin errores, crea el artículo con el mismo ID que su producto en el catálogo.</div><div className="form-actions"><button className="button-primary"><Save size={16}/>{editingInventory ? 'Guardar cambios' : 'Crear en inventario'}</button>{editingInventory && <button type="button" className="button-secondary" onClick={() => {setEditingInventory(null);setInventoryForm({nombre:'',descripcion:'',stock:'0',precio:''});}}>Cancelar</button>}</div></form><div className="panel table-panel"><TableTitle title="Existencias actuales" count={inventory.length}/><div className="table-scroll"><table><thead><tr><th>Artículo</th><th>Stock</th><th>Precio ref.</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{inventory.map(p => <tr key={p.id}><td><div className="table-product"><div className="table-product-icon"><Boxes size={17}/></div><div><b>{p.nombre}</b><small>ID compartido #{p.id}</small></div></div></td><td><b>{p.stock}</b></td><td>{money(p.precio)}</td><td><span className={Number(p.stock) <= 5 ? 'stock-pill low' : 'stock-pill'}>{Number(p.stock) <= 5 ? 'Stock bajo' : 'Disponible'}</span></td><td><RowActions edit={() => {setEditingInventory(p);setInventoryForm({nombre:p.nombre,descripcion:p.descripcion || '',stock:String(p.stock),precio:String(p.precio)});}} remove={() => doAction(() => api(config.inventario,`/api/products/${p.id}`,{method:'DELETE'}),'Artículo eliminado del inventario.')}/></td></tr>)}</tbody></table>{!inventory.length && <EmptyState title="Inventario vacío" text="Registra artículos o revisa la conexión del servicio."/>}</div></div></div></>}

        {section === 'pedidos' && <><PageIntro kicker="TRANSACCIONES" title="Pedidos y ventas" description="Historial del microservicio Pedidos. Cada línea de venta se registra y procesa mediante el flujo integrado."/><div className="panel table-panel full-table"><TableTitle title="Historial de pedidos" count={orders.length}/><div className="table-scroll"><table><thead><tr><th>Pedido</th><th>Cliente</th><th>Producto</th><th>Cantidad</th><th>Total</th><th>Estado</th><th>Fecha</th></tr></thead><tbody>{orders.map(o => <tr key={o.id}><td><span className="id-tag">#{o.id}</span></td><td>Cliente #{o.cliente_id ?? o.clienteId}</td><td>Producto #{o.producto_id ?? o.productoId}</td><td>{o.cantidad}</td><td><b>{money(o.total)}</b></td><td><span className={`order-state ${String(o.estado || '').includes('PAGADO') ? 'paid' : 'pending'}`}>{o.estado}</span></td><td>{shortDate(o.creado_en || o.created_at)}</td></tr>)}</tbody></table>{!orders.length && <EmptyState title="No hay pedidos todavía" text="Registra una venta desde Punto de venta."/>}</div></div></>}

        {section === 'pagos' && <><PageIntro kicker="CAJA Y COBROS" title="Pagos" description="Consulta los cobros registrados por el microservicio de Pagos de Equipo 2."/><div className="metric-grid two-metrics"><Metric icon={CreditCard} label="Pagos registrados" value={payments.length} note="Registros en PostgreSQL" tone="violet"/><Metric icon={CircleDollarSign} label="Importe total" value={money(payments.reduce((s,p)=>s+Number(p.monto||0),0))} note="Suma de montos registrados" tone="green"/></div><div className="panel table-panel full-table"><TableTitle title="Transacciones" count={payments.length}/><div className="table-scroll"><table><thead><tr><th>Pago</th><th>Pedido</th><th>Monto</th><th>Método</th><th>Estado</th><th>Referencia</th></tr></thead><tbody>{payments.map(item => {const p=item.pago || item;return <tr key={p.id}><td><span className="id-tag">#{p.id}</span></td><td>#{p.pedido_id ?? p.pedidoId}</td><td><b>{money(p.monto)}</b></td><td>{p.metodo_pago || p.metodo || '—'}</td><td><span className="status-chip good">{p.estado || 'Registrado'}</span></td><td className="mono">{p.referencia || '—'}</td></tr>;})}</tbody></table>{!payments.length && <EmptyState title="No hay pagos" text="Los cobros de las ventas aparecerán aquí."/>}</div></div></>}

        {section === 'notificaciones' && <><PageIntro kicker="EVENTOS DEL SISTEMA" title="Notificaciones" description="Eventos emitidos por Inventario y Pagos y almacenados por el servicio de Notificaciones."/><div className="panel table-panel full-table"><TableTitle title="Registro de actividad" count={notifications.length}/><div className="table-scroll"><table><thead><tr><th>Tipo</th><th>Servicio</th><th>Mensaje</th><th>Fecha</th><th></th></tr></thead><tbody>{notifications.map(n => <tr key={n.id}><td><span className={`notice-type ${n.tipo || 'info'}`}>{n.tipo || 'info'}</span></td><td><span className="id-tag">{n.servicio}</span></td><td>{n.mensaje}</td><td>{shortDate(n.creado_en)}</td><td><button className="row-icon danger" title="Eliminar notificación" onClick={() => doAction(() => api(config.notificaciones,`/api/notifications/${n.id}`,{method:'DELETE'}),'Notificación eliminada.') }><Trash2 size={15}/></button></td></tr>)}</tbody></table>{!notifications.length && <EmptyState title="Sin notificaciones" text="Las acciones de inventario y pagos generarán eventos aquí."/>}</div></div></>}

        {section === 'settings' && <><PageIntro kicker="CONFIGURACIÓN" title="Conexiones de microservicios" description="Configura la dirección base de cada API. Los cambios se guardan en este navegador."/><form className="panel settings-panel" onSubmit={saveSettings}><div className="settings-intro"><div className="settings-icon"><Cloud size={22}/></div><div><h2>Direcciones de las API</h2><p>Si los equipos están en otras computadoras, sustituye localhost por la IP IPv4 del equipo correspondiente.</p></div></div><div className="settings-grid">{SERVICE_INFO.map(s => <Field key={s.key} label={`${s.label} · puerto ${s.port}`}><input required type="url" value={settingsForm[s.key] || ''} onChange={e => setSettingsForm({...settingsForm,[s.key]:e.target.value})} placeholder={`http://192.168.1.10:${s.port}`}/><small className="setting-help">{s.key === 'inventario' ? 'API REST: /api/products' : s.key === 'notificaciones' ? 'API REST: /api/notifications' : s.key === 'clientes' ? 'API REST: /clientes' : s.key === 'productos' ? 'API REST: /productos' : s.key === 'pedidos' ? 'API REST: /pedidos' : 'API REST: /pagos'}</small></Field>)}</div><div className="settings-footer"><span><AlertCircle size={15}/> Los seis microservicios deben estar activos y permitir CORS.</span><button className="button-primary"><Save size={16}/> Guardar y comprobar</button></div></form><div className="panel help-panel"><h3>Antes de iniciar una venta</h3><ul><li>Los puertos públicos son <b>2501, 2502, 2503, 2504, 2506 y 2507</b>; el 2505 queda sin usar.</li><li>En Equipo 2, configura las variables <code>CLIENTES_URL</code>, <code>PRODUCTOS_URL</code>, <code>INVENTARIO_URL</code> y <code>NOTIFICACIONES_URL</code> con las IP y puertos correctos.</li><li>Los IDs de Producto e Inventario deben corresponder entre sí; el servicio Pedidos usa ese ID para consultar y descontar existencias.</li><li>El botón Cobrar llama a Pedidos, que coordina la validación, el pago y la actualización de stock.</li></ul></div></>}
      </div>
      <footer className="app-footer"><span>© 2026 SuperPOS · Plataforma de microservicios</span><span><span className={connected === 6 ? 'pulse-dot' : 'pulse-dot warning'}/>{connected}/6 APIs conectadas</span></footer>
    </main>
    {toast && <div className={`toast ${toast.kind}`}>{toast.kind === 'error' ? <AlertCircle size={19}/> : <CheckCircle2 size={19}/>}<span>{toast.message}</span><button onClick={() => setToast(null)}><X size={15}/></button></div>}
  </div>;
}

function Metric({icon:Icon,label,value,note,tone}) { return <div className="metric-card"><div className={`metric-icon ${tone}`}><Icon size={20}/></div><div className="metric-label">{label}</div><div className="metric-value">{value}</div><div className="metric-note">{note}</div></div>; }
function PageIntro({kicker,title,description}) { return <div className="page-intro"><span className="section-kicker">{kicker}</span><h2>{title}</h2><p>{description}</p></div>; }
function Field({label,children}) { return <label className="field"><span>{label}</span>{children}</label>; }
function TableTitle({title,count}) { return <div className="table-title"><h2>{title}</h2><span className="count-badge">{count} registros</span></div>; }
function RowActions({edit,remove}) { return <div className="row-actions"><button className="row-icon" title="Editar" onClick={edit}><Settings size={15}/></button><button className="row-icon danger" title="Eliminar" onClick={() => {if(window.confirm('¿Seguro que deseas eliminar este registro?')) remove();}}><Trash2 size={15}/></button></div>; }
function EmptyState({title,text}) { return <div className="empty-state"><div><ClipboardList size={22}/></div><b>{title}</b><p>{text}</p></div>; }
