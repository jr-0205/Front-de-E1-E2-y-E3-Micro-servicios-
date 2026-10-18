import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle, AlertTriangle, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight,
  ChevronsUpDown, ChevronUp, Inbox, Pencil, RefreshCw, Search, Trash2, X,
} from 'lucide-react';
import { SERVICIO, texto } from '../lib/api.js';

/* ------------------------------------------------------------------ */
/* Primitivas de contenido                                             */
/* ------------------------------------------------------------------ */

export function PageIntro({ kicker, title, description, actions }) {
  return (
    <div className="page-intro">
      <div>
        <span className="kicker">{kicker}</span>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="page-intro-actions">{actions}</div>}
    </div>
  );
}

export function Metric({ icon: Icon, label, value, note, tone = 'neutral' }) {
  return (
    <div className="metric-card">
      <div className={`metric-icon tone-${tone}`} aria-hidden="true"><Icon size={17} /></div>
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      {note && <div className="metric-note">{note}</div>}
    </div>
  );
}

export function Field({ label, hint, error, children, id }) {
  return (
    <label className="field" htmlFor={id}>
      <span className="field-label">{label}</span>
      {children}
      {hint && !error && <small className="field-hint">{hint}</small>}
      {error && <small className="field-error" role="alert">{error}</small>}
    </label>
  );
}

export function Pill({ tone = 'neutral', children }) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}

/** Traduce el estado de pedidos y pagos a un tono semántico. */
export function tonoEstado(estado) {
  const valor = texto(estado).toUpperCase();
  if (!valor) return 'neutral';
  if (/(PAGAD|COMPLET|APROB|OK|ENTREGAD)/.test(valor)) return 'ok';
  if (/(PENDIENTE|PROCES|PARCIAL)/.test(valor)) return 'warn';
  if (/(CANCEL|RECHAZ|ERROR|FALLID|ANULAD)/.test(valor)) return 'danger';
  return 'neutral';
}

export function EmptyState({ title, text, icon: Icon = Inbox }) {
  return (
    <div className="empty-state">
      <div className="empty-icon" aria-hidden="true"><Icon size={18} /></div>
      <b>{title}</b>
      {text && <p>{text}</p>}
    </div>
  );
}

export function Notice({ kind = 'info', icon: Icon, children, action }) {
  const Predeterminado = kind === 'error' ? AlertCircle : kind === 'warn' ? AlertTriangle : kind === 'ok' ? CheckCircle2 : Inbox;
  const Icono = Icon || Predeterminado;
  return (
    <div className={`notice notice-${kind}`} role={kind === 'error' ? 'alert' : undefined}>
      <Icono size={15} aria-hidden="true" />
      <div className="notice-text">{children}</div>
      {action}
    </div>
  );
}

/** Aviso reutilizable cuando la API de una sección no respondió. */
export function ServiceAlert({ serviceKey, error, onRetry }) {
  const servicio = SERVICIO[serviceKey];
  return (
    <Notice kind="error">
      <b>No se pudo consultar {servicio?.label || serviceKey}.</b> {error}
      <span className="notice-meta">{servicio ? `${servicio.equipo} · puerto ${servicio.port}` : null}</span>
      {onRetry && (
        <button type="button" className="notice-action" onClick={() => onRetry()}>
          <RefreshCw size={13} /> Reintentar
        </button>
      )}
    </Notice>
  );
}

export function RowActions({ onEdit, onRemove, editLabel = 'Editar', removeLabel = 'Eliminar' }) {
  return (
    <div className="row-actions">
      {onEdit && (
        <button type="button" className="row-icon" title={editLabel} aria-label={editLabel} onClick={onEdit}>
          <Pencil size={14} />
        </button>
      )}
      {onRemove && (
        <button type="button" className="row-icon danger" title={removeLabel} aria-label={removeLabel} onClick={onRemove}>
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tabla de datos con búsqueda, orden y paginación                     */
/* ------------------------------------------------------------------ */

export function DataTable({
  columns,
  rows,
  rowKey = row => row.id,
  searchPlaceholder = 'Buscar…',
  searchable = true,
  toolbar = null,
  empty = { title: 'Sin registros', text: 'Todavía no hay información para mostrar.' },
  pageSize = 12,
  initialSort = null,
}) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState(initialSort);
  const [page, setPage] = useState(1);

  const textoDeFila = useCallback(
    row => columns.map(col => texto(col.value ? col.value(row) : row[col.key])).join(' ').toLocaleLowerCase(),
    [columns]
  );

  const ordenadas = useMemo(() => {
    const buscado = query.trim().toLocaleLowerCase();
    const lista = buscado ? rows.filter(row => textoDeFila(row).includes(buscado)) : rows;

    if (!sort) return lista;
    const columna = columns.find(col => col.key === sort.key);
    if (!columna) return lista;

    const factor = sort.dir === 'desc' ? -1 : 1;
    const valorDe = row => (columna.sortValue ? columna.sortValue(row) : columna.value ? columna.value(row) : row[columna.key]);

    return [...lista].sort((a, b) => {
      const valorA = valorDe(a);
      const valorB = valorDe(b);
      if (typeof valorA === 'number' && typeof valorB === 'number') return (valorA - valorB) * factor;
      return texto(valorA).localeCompare(texto(valorB), 'es', { numeric: true, sensitivity: 'base' }) * factor;
    });
  }, [rows, query, sort, columns, textoDeFila]);

  const totalPaginas = Math.max(1, Math.ceil(ordenadas.length / pageSize));
  const pagina = Math.min(page, totalPaginas);
  const visibles = ordenadas.slice((pagina - 1) * pageSize, pagina * pageSize);

  const alternarOrden = key => setSort(actual => {
    if (!actual || actual.key !== key) return { key, dir: 'asc' };
    return actual.dir === 'asc' ? { key, dir: 'desc' } : null;
  });

  return (
    <div className="table-block">
      {(searchable || toolbar) && (
        <div className="table-toolbar">
          {searchable && (
            <div className="search-field">
              <Search size={15} aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
              />
              {query && (
                <button type="button" className="search-clear" onClick={() => setQuery('')} aria-label="Limpiar búsqueda">
                  <X size={13} />
                </button>
              )}
            </div>
          )}
          {toolbar}
        </div>
      )}

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {columns.map(col => {
                const activo = sort?.key === col.key;
                const ordenable = col.sortable !== false;
                return (
                  <th
                    key={col.key}
                    className={col.align ? `align-${col.align}` : undefined}
                    style={col.width ? { width: col.width } : undefined}
                    aria-sort={activo ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                  >
                    {ordenable ? (
                      <button
                        type="button"
                        className={`th-sort${activo ? ' active' : ''}`}
                        onClick={() => alternarOrden(col.key)}
                      >
                        <span>{col.header}</span>
                        {activo
                          ? (sort.dir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)
                          : <ChevronsUpDown size={12} />}
                      </button>
                    ) : (
                      <span className="th-plain">{col.header}</span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visibles.map(row => (
              <tr key={rowKey(row)}>
                {columns.map(col => (
                  <td key={col.key} className={[col.cellClass, col.align ? `align-${col.align}` : ''].filter(Boolean).join(' ') || undefined}>
                    {col.render ? col.render(row) : texto(col.value ? col.value(row) : row[col.key]) || '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {!visibles.length && <EmptyState {...empty} />}
      </div>

      {ordenadas.length > pageSize && (
        <div className="table-foot">
          <span>
            Mostrando {(pagina - 1) * pageSize + 1}–{Math.min(pagina * pageSize, ordenadas.length)} de {ordenadas.length}
          </span>
          <div className="pager">
            <button type="button" className="btn btn-ghost btn-sm" disabled={pagina <= 1} onClick={() => setPage(pagina - 1)}>
              <ChevronLeft size={14} /> Anterior
            </button>
            <span className="pager-page">{pagina} / {totalPaginas}</span>
            <button type="button" className="btn btn-ghost btn-sm" disabled={pagina >= totalPaginas} onClick={() => setPage(pagina + 1)}>
              Siguiente <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Diálogo de confirmación y avisos flotantes                          */
/* ------------------------------------------------------------------ */

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Eliminar',
  cancelLabel = 'Cancelar',
  danger = true,
  busy = false,
  onConfirm,
  onCancel,
}) {
  const botonConfirmar = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    botonConfirmar.current?.focus();
    const alPresionarTecla = event => {
      if (event.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', alPresionarTecla);
    return () => document.removeEventListener('keydown', alPresionarTecla);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="modal" onMouseDown={event => { if (event.target === event.currentTarget) onCancel(); }}>
      <div className="modal-card" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-text">
        <div className={`modal-icon${danger ? ' danger' : ''}`} aria-hidden="true"><AlertTriangle size={18} /></div>
        <h2 id="confirm-title">{title}</h2>
        <p id="confirm-text">{message}</p>
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>{cancelLabel}</button>
          <button
            type="button"
            ref={botonConfirmar}
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            disabled={busy}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Toasts({ toast, onClose }) {
  if (!toast) return null;
  const esError = toast.kind === 'error';
  const esAviso = toast.kind === 'warn';
  const Icono = esError ? AlertCircle : esAviso ? AlertTriangle : CheckCircle2;

  return (
    <div
      className={`toast toast-${toast.kind || 'success'}`}
      role={esError ? 'alert' : 'status'}
      aria-live={esError ? 'assertive' : 'polite'}
    >
      <Icono size={17} />
      <span>{toast.message}</span>
      <button type="button" onClick={onClose} aria-label="Cerrar aviso"><X size={14} /></button>
    </div>
  );
}
