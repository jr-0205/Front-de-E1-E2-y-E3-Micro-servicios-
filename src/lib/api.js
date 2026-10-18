/*
 * Catálogo de los seis microservicios y utilidades HTTP compartidas.
 *
 * Cada servicio declara su ruta canónica (`ruta`) y, si existe, la ruta heredada
 * (`alias`). `apiServicio()` intenta la canónica y, cuando el servicio no la
 * reconoce (404/405), reintenta con el alias. Así el front funciona tanto con la
 * versión canónica acordada en reglas.md como con despliegues anteriores.
 */

const TIMEOUT_MS = 8000;

export const SERVICE_LIST = [
  {
    key: 'clientes',
    label: 'Clientes',
    equipo: 'Equipo 1',
    port: 2501,
    ruta: '/clientes',
    alias: null,
    descripcion: 'Directorio de clientes',
  },
  {
    key: 'productos',
    label: 'Productos',
    equipo: 'Equipo 1',
    port: 2502,
    ruta: '/productos',
    alias: null,
    descripcion: 'Catálogo comercial',
  },
  {
    key: 'pedidos',
    label: 'Pedidos',
    equipo: 'Equipo 2',
    port: 2503,
    ruta: '/pedidos',
    alias: null,
    descripcion: 'Órdenes de venta',
  },
  {
    key: 'pagos',
    label: 'Pagos',
    equipo: 'Equipo 2',
    port: 2504,
    ruta: '/pagos',
    alias: null,
    descripcion: 'Cobros registrados',
  },
  {
    key: 'inventario',
    label: 'Inventario',
    equipo: 'Equipo 3',
    port: 2506,
    ruta: '/inventario',
    alias: '/api/products',
    descripcion: 'Existencias (fuente oficial de stock)',
  },
  {
    key: 'notificaciones',
    label: 'Notificaciones',
    equipo: 'Equipo 3',
    port: 2507,
    ruta: '/notificaciones',
    alias: '/api/notifications',
    descripcion: 'Eventos del sistema',
  },
];

export const SERVICE_KEYS = SERVICE_LIST.map(servicio => servicio.key);
export const SERVICIO = Object.fromEntries(SERVICE_LIST.map(servicio => [servicio.key, servicio]));

/** Direcciones por defecto: misma computadora que sirve el front, puerto publicado. */
export function configPorDefecto() {
  const origen = `${location.protocol}//${location.hostname}`;
  return Object.fromEntries(SERVICE_LIST.map(servicio => [servicio.key, `${origen}:${servicio.port}`]));
}

export class ErrorServicio extends Error {
  constructor(mensaje, status = 0, url = '') {
    super(mensaje);
    this.name = 'ErrorServicio';
    this.status = status;
    this.url = url;
  }
}

const RUTA_AUSENTE = new Set([404, 405]);

export const esRutaAusente = error => error instanceof ErrorServicio && RUTA_AUSENTE.has(error.status);

function mensajeDeRed(error, url) {
  if (error?.name === 'TimeoutError') {
    return `El servicio no respondió a tiempo (${url}). Revisa que esté encendido en otra computadora.`;
  }
  return `No se pudo conectar con ${url}. Comprueba que el servicio esté activo y permita CORS.`;
}

/** Petición JSON a un servicio concreto. Normaliza errores en `ErrorServicio`. */
export async function api(base, path, options = {}) {
  const url = String(base || '').replace(/\/+$/, '') + path;
  let response;

  try {
    response = await fetch(url, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {}),
      },
      signal: options.signal || AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    throw new ErrorServicio(mensajeDeRed(error, url), 0, url);
  }

  const raw = await response.text();
  let data = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = { error: raw || 'Respuesta no válida del servicio' };
  }

  if (!response.ok) {
    const detalle = data?.detalle || data?.error || data?.mensaje || `HTTP ${response.status}`;
    throw new ErrorServicio(detalle, response.status, url);
  }

  return data;
}

/**
 * Llama a un servicio usando su ruta canónica y, si no existe, su alias heredado.
 * `suffix` se agrega a ambas rutas (por ejemplo `/3` para un registro concreto).
 */
export async function apiServicio(base, serviceKey, suffix = '', options = {}) {
  const servicio = SERVICIO[serviceKey];
  if (!servicio) throw new ErrorServicio(`Servicio desconocido: ${serviceKey}`);

  const rutas = [servicio.ruta + suffix];
  if (servicio.alias) rutas.push(servicio.alias + suffix);

  let ultimoError = null;

  for (const ruta of rutas) {
    try {
      return await api(base, ruta, options);
    } catch (error) {
      if (!esRutaAusente(error)) throw error;
      ultimoError = error;
    }
  }

  throw ultimoError;
}

/** Extrae una lista de una respuesta que puede venir como array o envuelta. */
export function comoLista(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.resultado)) return data.resultado;
  return [];
}

export const json = valor => JSON.stringify(valor);

const formatoMoneda = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
export const dinero = valor => formatoMoneda.format(Number(valor || 0));

export function fecha(valor) {
  if (!valor) return '—';
  const date = new Date(valor);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
}

export const texto = valor => (valor === null || valor === undefined ? '' : String(valor));

/** Valor numérico seguro, útil para ordenar columnas. */
export const numero = valor => {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
};
