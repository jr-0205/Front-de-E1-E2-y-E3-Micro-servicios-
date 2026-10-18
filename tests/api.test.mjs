/*
 * Pruebas de la capa HTTP del front (sin dependencias: solo Node).
 *
 *   npm test
 *
 * Levanta servicios simulados en puertos efímeros y comprueba el contrato que
 * usa la interfaz: disponibilidad de las seis APIs, caída a la ruta heredada
 * cuando la canónica no existe, propagación de errores reales y utilidades.
 */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { after, describe, it } from 'node:test';
import { ErrorServicio, api, apiServicio, comoLista, configPorDefecto, esRutaAusente } from '../src/lib/api.js';

const servidores = [];

/** Levanta un servidor de prueba con un mapa { ruta: () => ({ status, body }) }. */
function levantar(rutas) {
  const peticiones = [];
  const servidor = createServer((req, res) => {
    const { pathname } = new URL(req.url, 'http://127.0.0.1');
    peticiones.push(pathname);

    const ruta = rutas[pathname];
    if (!ruta) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Ruta no encontrada' }));
      return;
    }

    const { status = 200, body } = ruta();
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
  });

  return new Promise(resolve => servidor.listen(0, '127.0.0.1', () => {
    const base = `http://127.0.0.1:${servidor.address().port}`;
    servidores.push(servidor);
    resolve({ base, peticiones });
  }));
}

/** Atajo: promesa que debe fallar, devolviendo el error capturado. */
async function capturarError(accion) {
  try {
    await accion();
    return null;
  } catch (error) {
    return error;
  }
}

after(() => {
  for (const servidor of servidores) servidor.close();
});

describe('Cliente HTTP de SuperPOS', () => {
  it('obtiene la lista de cada servicio en su ruta canónica', async () => {
    const clientes = await levantar({ '/clientes': () => ({ body: [{ id: 1, nombre: 'Ana Gómez', correo: 'ana@example.com' }] }) });
    const productos = await levantar({ '/productos': () => ({ body: [{ id: 1, nombre: 'Laptop Dell', precio: 12999, stock: 8 }] }) });
    const pedidos = await levantar({ '/pedidos': () => ({ body: [{ id: 1, producto_id: 1, total: 12999, estado: 'PAGADO' }] }) });
    const pagos = await levantar({ '/pagos': () => ({ body: [{ id: 1, pedido_id: 1, monto: 12999, estado: 'APROBADO' }] }) });
    const notificaciones = await levantar({ '/notificaciones': () => ({ body: [{ id: 1, servicio: 'inventario', mensaje: 'Stock actualizado' }] }) });

    assert.equal((await apiServicio(clientes.base, 'clientes'))[0].nombre, 'Ana Gómez');
    assert.equal((await apiServicio(productos.base, 'productos'))[0].precio, 12999);
    assert.equal((await apiServicio(pedidos.base, 'pedidos'))[0].estado, 'PAGADO');
    assert.equal((await apiServicio(pagos.base, 'pagos'))[0].monto, 12999);
    assert.equal((await apiServicio(notificaciones.base, 'notificaciones'))[0].mensaje, 'Stock actualizado');
    assert.deepEqual(notificaciones.peticiones, ['/notificaciones'], 'no se pidió el alias');
  });

  it('cae al alias heredado cuando la ruta canónica no existe (Equipo 3 antiguo)', async () => {
    const inventario = await levantar({ '/api/products': () => ({ body: [{ id: 1, stock: 3 }] }) });

    const lista = await apiServicio(inventario.base, 'inventario');

    assert.equal(lista[0].stock, 3);
    assert.deepEqual(inventario.peticiones, ['/inventario', '/api/products']);
  });

  it('usa el alias para leer un registro concreto y para escribir', async () => {
    const inventario = await levantar({ '/api/products/7': () => ({ body: { id: 7, stock: 4 } }) });
    const notificaciones = await levantar({ '/api/notifications/9': () => ({ body: { mensaje: 'eliminada', id: 9 } }) });

    assert.equal((await apiServicio(inventario.base, 'inventario', '/7')).stock, 4);
    assert.equal((await apiServicio(notificaciones.base, 'notificaciones', '/9', { method: 'DELETE' })).id, 9);
    assert.deepEqual(inventario.peticiones, ['/inventario/7', '/api/products/7']);
    assert.deepEqual(notificaciones.peticiones, ['/notificaciones/9', '/api/notifications/9']);
  });

  it('no reintenta con el alias ante un error interno real', async () => {
    const servicio = await levantar({ '/inventario': () => ({ status: 500, body: { error: 'Falla interna del inventario' } }) });

    const error = await capturarError(() => apiServicio(servicio.base, 'inventario'));

    assert.ok(error instanceof ErrorServicio);
    assert.equal(error.status, 500);
    assert.equal(error.message, 'Falla interna del inventario');
    assert.deepEqual(servicio.peticiones, ['/inventario'], 'un 500 no debe reintentarse');
    assert.equal(esRutaAusente(error), false);
  });

  it('expone el detalle de un 400 del servicio', async () => {
    const servicio = await levantar({ '/clientes': () => ({ status: 400, body: { error: "El campo 'correo' no tiene un formato válido" } }) });

    const error = await capturarError(() => apiServicio(servicio.base, 'clientes'));

    assert.equal(error.status, 400);
    assert.match(error.message, /formato válido/);
  });

  it('informa con claridad cuando el servicio está apagado', async () => {
    const error = await capturarError(() => apiServicio('http://127.0.0.1:1', 'clientes'));

    assert.ok(error instanceof ErrorServicio);
    assert.equal(error.status, 0);
    assert.match(error.message, /No se pudo conectar/);
  });

  it('envía el cuerpo como JSON con su cabecera', async () => {
    let recibido = null;
    const servidor = createServer((req, res) => {
      let crudo = '';
      req.on('data', trozo => { crudo += trozo; });
      req.on('end', () => {
        recibido = { tipo: req.headers['content-type'], cuerpo: JSON.parse(crudo || '{}') };
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ id: 3 }));
      });
    });

    const base = await new Promise(resolve => servidor.listen(0, '127.0.0.1', () => {
      servidores.push(servidor);
      resolve(`http://127.0.0.1:${servidor.address().port}`);
    }));

    const creado = await api(base, '/inventario', { method: 'POST', body: JSON.stringify({ productoId: 3, stock: 7 }) });

    assert.equal(creado.id, 3);
    assert.equal(recibido.tipo, 'application/json');
    assert.deepEqual(recibido.cuerpo, { productoId: 3, stock: 7 });
  });
});

describe('Utilidades', () => {
  it('comoLista acepta arrays y respuestas envueltas', () => {
    assert.deepEqual(comoLista([1, 2]), [1, 2]);
    assert.deepEqual(comoLista({ data: [1] }), [1]);
    assert.deepEqual(comoLista({ items: [1] }), [1]);
    assert.deepEqual(comoLista({ resultado: [1] }), [1]);
    assert.deepEqual(comoLista(null), []);
    assert.deepEqual(comoLista({}), []);
  });

  it('configPorDefecto usa el host del navegador y los puertos publicados de reglas.md', () => {
    const locationOriginal = globalThis.location;
    globalThis.location = { protocol: 'http:', hostname: '10.0.0.5' };

    try {
      assert.deepEqual(configPorDefecto(), {
        clientes: 'http://10.0.0.5:2501',
        productos: 'http://10.0.0.5:2502',
        pedidos: 'http://10.0.0.5:2503',
        pagos: 'http://10.0.0.5:2504',
        inventario: 'http://10.0.0.5:2506',
        notificaciones: 'http://10.0.0.5:2507',
      });
    } finally {
      globalThis.location = locationOriginal;
    }
  });
});
