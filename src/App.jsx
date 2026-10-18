import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SERVICE_KEYS, SERVICE_LIST, apiServicio, comoLista, configPorDefecto, numero } from './lib/api.js';
import { AppFooter, Sidebar, Topbar } from './components/Layout.jsx';
import { ConfirmDialog, Toasts } from './components/ui.jsx';
import Conexiones from './sections/Conexiones.jsx';
import Clientes from './sections/Clientes.jsx';
import Dashboard from './sections/Dashboard.jsx';
import Inventario from './sections/Inventario.jsx';
import Notificaciones from './sections/Notificaciones.jsx';
import Pagos from './sections/Pagos.jsx';
import Pedidos from './sections/Pedidos.jsx';
import Pos from './sections/Pos.jsx';
import Productos from './sections/Productos.jsx';

const CLAVE_URLS = 'superpos-urls';

const SECCIONES = {
  pos: Pos,
  dashboard: Dashboard,
  clientes: Clientes,
  productos: Productos,
  inventario: Inventario,
  pedidos: Pedidos,
  pagos: Pagos,
  notificaciones: Notificaciones,
  settings: Conexiones,
};

const DATOS_VACIOS = {
  clientes: [],
  productos: [],
  inventario: [],
  pedidos: [],
  pagos: [],
  notificaciones: [],
};

/** Direcciones guardadas en este navegador, con los valores por defecto como respaldo. */
function leerConfig() {
  const base = configPorDefecto();

  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE_URLS) || '{}');
    for (const key of SERVICE_KEYS) {
      if (typeof guardado[key] === 'string' && guardado[key].trim()) {
        base[key] = guardado[key].trim().replace(/\/+$/, '');
      }
    }
  } catch {
    /* Configuración corrupta: se usan los valores por defecto. */
  }

  return base;
}

export default function App() {
  const [config, setConfig] = useState(leerConfig);
  const [seccion, setSeccion] = useState('pos');
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [servicios, setServicios] = useState({});
  const [datos, setDatos] = useState(DATOS_VACIOS);
  const [carrito, setCarrito] = useState([]);
  const [aviso, setAviso] = useState(null);
  const [confirmacion, setConfirmacion] = useState(null);
  const [confirmando, setConfirmando] = useState(false);
  const temporizador = useRef(null);

  const avisar = useCallback((mensaje, kind = 'success') => {
    window.clearTimeout(temporizador.current);
    setAviso({ message: mensaje, kind });
    temporizador.current = window.setTimeout(() => setAviso(null), 5200);
  }, []);

  useEffect(() => () => window.clearTimeout(temporizador.current), []);

  /** Consulta las seis APIs en paralelo y expone el estado de cada servicio. */
  const cargarTodo = useCallback(async (silencioso = false) => {
    if (!silencioso) setCargando(true);

    const resultados = await Promise.all(SERVICE_LIST.map(async servicio => {
      try {
        const data = await apiServicio(config[servicio.key], servicio.key);
        return [servicio.key, comoLista(data), null];
      } catch (error) {
        return [servicio.key, null, error.message || 'Error desconocido'];
      }
    }));

    const estados = {};
    const nuevos = {};

    for (const [key, lista, error] of resultados) {
      estados[key] = { ok: !error, error };
      if (lista) nuevos[key] = lista;
    }

    setServicios(estados);
    setDatos(actual => ({ ...actual, ...nuevos }));
    if (!silencioso) setCargando(false);
  }, [config]);

  useEffect(() => { cargarTodo(); }, [cargarTodo]);

  useEffect(() => {
    if (!menuAbierto) return undefined;
    const alPresionarTecla = event => { if (event.key === 'Escape') setMenuAbierto(false); };
    document.addEventListener('keydown', alPresionarTecla);
    return () => document.removeEventListener('keydown', alPresionarTecla);
  }, [menuAbierto]);

  const api = useCallback((key, suffix = '', options) => apiServicio(config[key], key, suffix, options), [config]);

  /** Ejecuta una acción, recarga los datos y avisa del resultado. */
  const ejecutar = useCallback(async (accion, mensajeOk) => {
    try {
      await accion();
      await cargarTodo(true);
      if (mensajeOk) avisar(mensajeOk);
      return true;
    } catch (error) {
      avisar(error?.message || 'Ocurrió un error inesperado.', 'error');
      return false;
    }
  }, [avisar, cargarTodo]);

  const ir = useCallback(id => {
    setSeccion(id);
    setMenuAbierto(false);
    window.scrollTo({ top: 0 });
  }, []);

  const guardarConfig = useCallback(urls => {
    localStorage.setItem(CLAVE_URLS, JSON.stringify(urls));
    setConfig(urls);
    avisar('Direcciones guardadas. Comprobando los seis servicios…');
  }, [avisar]);

  const confirmar = useCallback(opciones => setConfirmacion(opciones), []);

  const ejecutarConfirmacion = async () => {
    if (!confirmacion) return;
    setConfirmando(true);
    await ejecutar(confirmacion.action, confirmacion.success);
    setConfirmando(false);
    setConfirmacion(null);
  };

  const stockDe = useCallback(
    id => numero(datos.inventario.find(item => Number(item.id) === Number(id))?.stock),
    [datos.inventario]
  );

  const carritoApi = useMemo(() => ({
    rows: carrito,
    units: carrito.reduce((suma, linea) => suma + linea.cantidad, 0),
    total: carrito.reduce((suma, linea) => suma + numero(linea.precio) * linea.cantidad, 0),
    add: producto => setCarrito(prev => {
      const existente = prev.find(linea => Number(linea.id) === Number(producto.id));
      return existente
        ? prev.map(linea => (Number(linea.id) === Number(producto.id) ? { ...linea, cantidad: linea.cantidad + 1 } : linea))
        : [...prev, { id: producto.id, nombre: producto.nombre, precio: numero(producto.precio), cantidad: 1 }];
    }),
    changeQuantity: (id, delta) => setCarrito(prev => prev.map(linea => {
      if (Number(linea.id) !== Number(id)) return linea;
      const maximo = Math.max(1, stockDe(id));
      return { ...linea, cantidad: Math.min(maximo, Math.max(1, linea.cantidad + delta)) };
    })),
    remove: id => setCarrito(prev => prev.filter(linea => Number(linea.id) !== Number(id))),
    clear: () => setCarrito([]),
  }), [carrito, stockDe]);

  const conectados = SERVICE_LIST.filter(servicio => servicios[servicio.key]?.ok).length;
  const total = SERVICE_LIST.length;
  const Seccion = SECCIONES[seccion] || Pos;

  const app = {
    config,
    services: servicios,
    busy: cargando,
    data: datos,
    api,
    run: ejecutar,
    notify: avisar,
    confirm: confirmar,
    reload: cargarTodo,
    go: ir,
    cart: carritoApi,
    saveConfig: guardarConfig,
  };

  return (
    <div className="app-shell">
      <Sidebar
        section={seccion}
        onNavigate={ir}
        open={menuAbierto}
        onClose={() => setMenuAbierto(false)}
        conectados={conectados}
        total={total}
        cartUnits={carritoApi.units}
      />

      {menuAbierto && (
        <button type="button" className="scrim" onClick={() => setMenuAbierto(false)} aria-label="Cerrar menú" />
      )}

      <div className="main">
        <Topbar
          section={seccion}
          busy={cargando}
          onRefresh={() => cargarTodo()}
          onOpenNav={() => setMenuAbierto(true)}
          conectados={conectados}
          total={total}
        />

        <main className="content">
          <Seccion app={app} />
        </main>

        <AppFooter conectados={conectados} total={total} />
      </div>

      <ConfirmDialog
        open={Boolean(confirmacion)}
        title={confirmacion?.title}
        message={confirmacion?.message}
        confirmLabel={confirmacion?.confirmLabel}
        busy={confirmando}
        onConfirm={ejecutarConfirmacion}
        onCancel={() => setConfirmacion(null)}
      />

      <Toasts toast={aviso} onClose={() => setAviso(null)} />
    </div>
  );
}
