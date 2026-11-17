const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const raiz = path.resolve(__dirname, '..');
const propuesta = JSON.parse(fs.readFileSync(path.join(raiz, 'toucan-propuesta.json'), 'utf8'));

// Reloj y DOM mínimos: permiten comprobar regresiones sin navegador ni dependencias.
function entorno(guardado = {}) {
  let ahora = 1000;
  const datos = new Map(Object.entries(guardado).map(([k, v]) => ['entrenador-toucan-' + k, JSON.stringify(v)]));
  const elementos = new Map();
  const eventos = new Map();
  const pendientes = [];
  const documento = { activeElement: null, hidden: false, addEventListener(tipo, fn) { eventos.set('document:' + tipo, fn); } };
  const elemento = (id) => {
    if (!elementos.has(id)) elementos.set(id, {
      hidden: id === 'configuracion', disabled: false, style: {}, innerHTML: '', textContent: '', value: '', clientWidth: 850,
      dataset: {}, tagName: id === 'entrada' ? 'INPUT' : 'DIV',
      addEventListener(tipo, fn) { eventos.set(id + ':' + tipo, fn); },
      focus() { documento.activeElement = this; },
      blur() { documento.activeElement = null; },
      contains(e) { return e === this; }, querySelector() { return null; }, insertAdjacentHTML() {},
    });
    return elementos.get(id);
  };
  documento.getElementById = elemento;
  const contexto = vm.createContext({
    console, Uint8Array, TextDecoder,
    performance: { now: () => ahora }, navigator: {},
    setTimeout: (fn) => { pendientes.push(fn); return pendientes.length; }, clearTimeout() {}, setInterval() {},
    localStorage: { getItem: (k) => datos.get(k) ?? null, setItem: (k, v) => datos.set(k, v) },
    document: documento, window: { addEventListener(tipo, fn) { eventos.set('window:' + tipo, fn); } },
    confirm: () => true, prompt: () => null,
  });
  for (const archivo of ['modelo.js', 'zmk.js', 'entrenador.js']) vm.runInContext(fs.readFileSync(path.join(raiz, 'assets', archivo), 'utf8'), contexto, { filename: archivo });
  const ejecutar = (codigo) => vm.runInContext(codigo, contexto);
  return { ejecutar, contexto, elemento, eventos, datos, tiempo: (t) => { ahora = t; }, tareas: () => { while (pendientes.length) pendientes.shift()(); } };
}

test('arranca con la configuración de fábrica y admite el JSON incluido', () => {
  const e = entorno();
  assert.equal(e.ejecutar('estado.keymap.layers[0].keys.length'), 42);
  e.contexto.propuesta = propuesta;
  e.ejecutar('aplicarKeymap(propuesta)');
  assert.equal(e.ejecutar('estado.keymap.version'), 1);
  assert.equal(e.ejecutar('estado.keymap.layout.length'), 42);
});

test('rechaza configuraciones incompletas sin cambiar memoria ni almacenamiento', async () => {
  const e = entorno();
  e.contexto.propuesta = propuesta;
  e.ejecutar('aplicarKeymap(propuesta)');
  const antes = e.ejecutar('JSON.stringify(estado.keymap)');
  const original = e.datos.get('entrenador-toucan-keymap');
  const corrupciones = [
    (m) => { m.layers[0].keys[1] = null; },
    (m) => { m.layers[1].keys.pop(); },
    (m) => { m.layers[1].id = m.layers[0].id; },
    (m) => { m.layers[0].keys[0] = { mo: 999 }; },
    (m) => { m.layout[0].x = '0; color:red'; },
    (m) => { m.layout[0].w = 0; },
    (m) => { m.layers[0].keys[0].s = 'false'; },
    (m) => { m.version = 900; },
  ];
  for (const corromper of corrupciones) {
    const dato = structuredClone(propuesta);
    corromper(dato);
    await e.eventos.get('archivo:change')({ target: { files: [{ size: 5000, text: async () => JSON.stringify(dato) }], value: '' } });
    assert.equal(e.ejecutar('JSON.stringify(estado.keymap)'), antes);
    assert.equal(e.datos.get('entrenador-toucan-keymap'), original);
    assert.match(e.elemento('estado').textContent, /No se cargó/);
  }
});

test('limita el tamaño del archivo antes de leerlo', async () => {
  const e = entorno();
  let leido = false;
  await e.eventos.get('archivo:change')({ target: { files: [{ size: 2 * 1024 * 1024, text: async () => { leido = true; } }], value: '' } });
  assert.equal(leido, false);
  assert.match(e.elemento('estado').textContent, /1 MB/);
});

test('recupera datos persistidos inválidos sin impedir el arranque', () => {
  const invalido = structuredClone(propuesta);
  invalido.layers[0].keys[1] = null;
  const e = entorno({ keymap: invalido, sistema: 'desconocido', caracteres: null, config: { paso: 15, reposo: null, nota: null } });
  assert.equal(e.ejecutar('estado.sistema'), 'us');
  assert.equal(e.ejecutar('estado.keymap.layers[0].keys[1].k'), 'KeyQ');
  assert.equal(e.ejecutar('cfg.paso'), 0);
  assert.match(e.elemento('estado').textContent, /Recuperamos/);
});

test('escapa nombres importados en las pistas y en los botones de capa', () => {
  const e = entorno();
  e.ejecutar(`estado.keymap.layers[1].name = '<img src=x onerror="alert(1)">'; estado.leccion='numeros'; preparar()`);
  assert.match(e.elemento('pista').innerHTML, /&lt;img/);
  assert.doesNotMatch(e.elemento('pista').innerHTML, /<img/);
  assert.doesNotMatch(e.elemento('capa').innerHTML, /<img/);
});

test('latinoamericano conserva las 81 palabras y ofrece secuencias de acento', () => {
  const e = entorno();
  e.ejecutar("estado.sistema='latam'; preparar()");
  assert.equal(e.ejecutar("PALABRAS_ES.filter(p=>[...p].every(c=>estado.recetas[c])).length"), 81);
  for (const letra of 'áéíóúüÁÉÍÓÚÜ') {
    e.contexto.letra = letra;
    assert.equal(e.ejecutar('estado.recetas[letra].pasos.length'), 2);
  }
});

test('inglés internacional permite acentos sin AltGr y signos muertos seguidos de espacio', () => {
  const e = entorno();
  e.ejecutar("estado.keymap.layers[0].keys[41]={o:''}; preparar()");
  assert.equal(e.ejecutar("estado.recetas['á'].pasos.length"), 2);
  assert.equal(e.ejecutar("estado.recetas['ñ'].pasos.length"), 2);
  assert.equal(e.ejecutar('estado.recetas["\'"].pasos[1].pos'), 38);
  e.ejecutar("estado.sistema='us-basic'; preparar()");
  assert.equal(e.ejecutar("estado.recetas['á']"), undefined);
  assert.equal(e.ejecutar('estado.recetas["\'"].pasos'), undefined);
});

test('composición confirma un solo acierto y admite ambos órdenes de eventos', () => {
  for (const inputAntes of [true, false]) {
    const e = entorno();
    e.ejecutar("estado.linea='áa'; estado.indice=0");
    e.eventos.get('entrada:compositionstart')();
    e.elemento('entrada').value = 'a\u0301';
    e.eventos.get('entrada:input')({ isComposing: true });
    assert.equal(e.ejecutar('estado.aciertos'), 0);
    if (inputAntes) e.eventos.get('entrada:input')({ isComposing: false });
    e.eventos.get('entrada:compositionend')();
    if (!inputAntes) e.eventos.get('entrada:input')({ isComposing: false });
    e.tareas();
    assert.equal(e.ejecutar('estado.aciertos'), 1);
    assert.equal(e.ejecutar('estado.indice'), 1);
    assert.equal(e.ejecutar('estado.errores'), 0);
  }
});

test('evalúa el carácter producido por Bloq Mayús y distingue mayúsculas', () => {
  const e = entorno();
  e.ejecutar("estado.linea='Aa'; estado.indice=0");
  e.elemento('entrada').value = 'A';
  e.eventos.get('entrada:input')({});
  assert.equal(e.ejecutar('estado.aciertos'), 1);
  e.elemento('entrada').value = 'A';
  e.eventos.get('entrada:input')({});
  assert.equal(e.ejecutar('estado.errores'), 1);
  assert.equal(e.ejecutar('estado.indice'), 1);
});

test('el tiempo incluye líneas parciales, cambios de lección y excluye pausas', () => {
  const e = entorno();
  e.ejecutar("estado.linea='aaaaaaaaaa'; registrarCaracter('a')");
  e.tiempo(6000);
  e.ejecutar("registrarCaracter('a')");
  assert.equal(e.ejecutar('tiempoActivo()'), 5000);
  e.ejecutar('nuevaLinea()');
  assert.equal(e.ejecutar('estado.msActivos'), 5000);
  assert.equal(e.ejecutar('estado.aciertos'), 2);
  e.tiempo(66000);
  assert.equal(e.ejecutar('tiempoActivo()'), 5000);
  e.ejecutar("estado.linea='aa'; registrarCaracter('a')");
  e.tiempo(71000);
  e.ejecutar("registrarCaracter('a')");
  assert.equal(e.ejecutar('tiempoActivo()'), 10000);
  assert.equal(e.ejecutar('estado.aciertos'), 4);
  assert.equal(e.elemento('ppm').textContent, 5);
});

test('Tab, flechas y controles externos no cuentan errores ni pierden el foco', () => {
  const e = entorno();
  assert.equal(e.eventos.has('document:keydown') && e.eventos.get('document:keydown') === e.contexto.alPulsar, false);
  let cancelaciones = 0;
  for (const key of ['Tab', 'ArrowDown', 'Enter', 'Escape']) {
    e.eventos.get('entrada:keydown')({ key, target: e.elemento('entrada'), preventDefault: () => { cancelaciones++; } });
  }
  e.elemento('leccion').focus();
  e.eventos.get('entrada:keydown')({ key: 'a', target: e.elemento('leccion'), preventDefault: () => { cancelaciones++; } });
  assert.equal(e.ejecutar('estado.errores'), 0);
  assert.equal(cancelaciones, 0);
  assert.equal(e.contexto.document.activeElement, e.elemento('leccion'));
});

test('mod-tap conserva el modificador, permite mayúsculas y sobrevive a exportar/importar', () => {
  const e = entorno();
  e.ejecutar("estado.keymap.layers[0].keys[24]={o:''}; estado.keymap.layers[0].keys[13]=convertirAsignacion('mod-tap',0x700e1,0x70004); preparar()");
  assert.equal(e.ejecutar('estado.keymap.layers[0].keys[13].hold.k'), 'ShiftLeft');
  assert.equal(e.ejecutar("estado.recetas['B'].shift"), 13);
  assert.equal(e.ejecutar("estado.recetas['A']"), undefined, 'no debe sugerir mantener y pulsar la misma tecla');
  e.ejecutar('aplicarKeymap(JSON.parse(JSON.stringify(estado.keymap)))');
  assert.equal(e.ejecutar("estado.recetas['B'].shift"), 13);
});

test('texto propio avisa de caracteres incompatibles sin sustituirlo por otra lección', () => {
  const e = entorno();
  e.ejecutar("estado.leccion='propio'; estado.propio='🙂'; preparar()");
  assert.equal(e.ejecutar('estado.linea'), '');
  assert.match(e.elemento('avisoTexto').textContent, /🙂/);
  assert.equal(e.elemento('entrada').disabled, true);
});

test('la disposición incluye los pulgares girados y coordenadas negativas', () => {
  const e = entorno();
  e.contexto.propuesta = propuesta;
  assert.ok(e.ejecutar('limitesDisposicion(propuesta.layout).alto > Math.max(...propuesta.layout.map(k=>k.y+k.h))'));
  const limites = e.ejecutar('limitesDisposicion([{x:-100,y:-50,w:100,h:100,r:0,rx:0,ry:0}])');
  assert.equal(limites.x, -100);
  assert.equal(limites.y, -50);
  assert.equal(limites.ancho, 100);
  assert.equal(limites.alto, 100);
});
