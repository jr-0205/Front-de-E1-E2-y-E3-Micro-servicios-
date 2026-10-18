import {
  Bell, Boxes, ClipboardList, CreditCard, LayoutDashboard, Menu, Package,
  RefreshCw, Settings, ShoppingBag, ShoppingCart, Users, X,
} from 'lucide-react';

export const NAV_GROUPS = [
  {
    caption: 'Operación',
    items: [
      { id: 'pos', label: 'Punto de venta', icon: ShoppingCart },
      { id: 'dashboard', label: 'Resumen', icon: LayoutDashboard },
    ],
  },
  {
    caption: 'Gestión',
    items: [
      { id: 'clientes', label: 'Clientes', icon: Users },
      { id: 'productos', label: 'Productos', icon: Package },
      { id: 'inventario', label: 'Inventario', icon: Boxes },
    ],
  },
  {
    caption: 'Transacciones',
    items: [
      { id: 'pedidos', label: 'Pedidos', icon: ClipboardList },
      { id: 'pagos', label: 'Pagos', icon: CreditCard },
      { id: 'notificaciones', label: 'Notificaciones', icon: Bell },
    ],
  },
  {
    caption: 'Sistema',
    items: [
      { id: 'settings', label: 'Conexiones API', icon: Settings },
    ],
  },
];

export const NAV_ITEMS = NAV_GROUPS.flatMap(grupo => grupo.items);

export function Sidebar({ section, onNavigate, open, onClose, conectados, total, cartUnits }) {
  const completo = conectados === total;

  return (
    <aside className={`sidebar${open ? ' sidebar-open' : ''}`} aria-label="Navegación principal">
      <div className="brand">
        <div className="brand-mark" aria-hidden="true"><ShoppingBag size={19} /></div>
        <div className="brand-text">
          <strong>SuperPOS</strong>
          <span>E1 · E2 · E3</span>
        </div>
        <button type="button" className="icon-btn close-nav" onClick={onClose} aria-label="Cerrar menú">
          <X size={17} />
        </button>
      </div>

      <div className="store-pill">
        <span className={`conn-dot${completo ? '' : ' warn'}`} aria-hidden="true" />
        <div>
          <b>Punto de venta</b>
          <small>{conectados} de {total} servicios activos</small>
        </div>
      </div>

      <nav className="nav">
        {NAV_GROUPS.map(grupo => (
          <div className="nav-group" key={grupo.caption}>
            <p className="nav-caption">{grupo.caption}</p>
            {grupo.items.map(item => {
              const Icono = item.icon;
              const activo = section === item.id;
              return (
                <button
                  type="button"
                  key={item.id}
                  className={`nav-item${activo ? ' active' : ''}`}
                  aria-current={activo ? 'page' : undefined}
                  onClick={() => onNavigate(item.id)}
                >
                  <Icono size={17} aria-hidden="true" />
                  <span>{item.label}</span>
                  {item.id === 'pos' && cartUnits > 0 && <em className="nav-badge" aria-label={`${cartUnits} artículos en el carrito`}>{cartUnits}</em>}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <span className="version">SUPERPOS · v1.1</span>
      </div>
    </aside>
  );
}

export function Topbar({ section, busy, onRefresh, onOpenNav, conectados, total }) {
  const item = NAV_ITEMS.find(nav => nav.id === section);
  const completo = conectados === total;

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button type="button" className="icon-btn open-nav" onClick={onOpenNav} aria-label="Abrir menú">
          <Menu size={19} />
        </button>
        <div className="topbar-title">
          <span className="eyebrow">Administración / {item?.label || 'Panel'}</span>
          <h1>{item?.label || 'Panel'}</h1>
        </div>
      </div>

      <div className="topbar-actions">
        <span className={`status-inline${completo ? '' : ' warn'}`}>
          <span className="conn-dot" aria-hidden="true" />
          {conectados}/{total} APIs
        </span>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onRefresh} disabled={busy}>
          <RefreshCw size={14} className={busy ? 'spin' : undefined} aria-hidden="true" />
          {busy ? 'Actualizando…' : 'Actualizar'}
        </button>
      </div>
    </header>
  );
}

export function AppFooter({ conectados, total }) {
  return (
    <footer className="app-footer">
      <span>SuperPOS · plataforma de microservicios · {new Date().getFullYear()}</span>
      <span className={`status-inline${conectados === total ? '' : ' warn'}`}>
        <span className="conn-dot" aria-hidden="true" />
        {conectados}/{total} APIs conectadas
      </span>
    </footer>
  );
}
