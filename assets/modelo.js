// #region CONSTANTS

/** Carácter que escribe cada tecla física según el idioma de Windows: código → [normal, con Shift]. */
const SISTEMAS = {
  us: {
    Digit1: ['1', '!'], Digit2: ['2', '@'], Digit3: ['3', '#'], Digit4: ['4', '$'], Digit5: ['5', '%'],
    Digit6: ['6', '^'], Digit7: ['7', '&'], Digit8: ['8', '*'], Digit9: ['9', '('], Digit0: ['0', ')'],
    Minus: ['-', '_'], Equal: ['=', '+'], BracketLeft: ['[', '{'], BracketRight: [']', '}'],
    Backslash: ['\\', '|'], Semicolon: [';', ':'], Quote: ["'", '"'], Backquote: ['`', '~'],
    Comma: [',', '<'], Period: ['.', '>'], Slash: ['/', '?'],
  },
  latam: {
    Digit1: ['1', '!'], Digit2: ['2', '"'], Digit3: ['3', '#'], Digit4: ['4', '$'], Digit5: ['5', '%'],
    Digit6: ['6', '&'], Digit7: ['7', '/'], Digit8: ['8', '('], Digit9: ['9', ')'], Digit0: ['0', '='],
    Minus: ["'", '?'], Equal: ['¿', '¡'], BracketLeft: ['´', '¨'], BracketRight: ['+', '*'],
    Backslash: ['}', ']'], Semicolon: ['ñ', 'Ñ'], Quote: ['{', '['], Backquote: ['|', '°'],
    Comma: [',', ';'], Period: ['.', ':'], Slash: ['-', '_'], IntlBackslash: ['<', '>'],
  },
};

/** Caracteres que da AltGr según el idioma de Windows: código → [con AltGr, con AltGr y Shift]. */
const ALTGR = {
  us: { KeyA: ['á', 'Á'], KeyE: ['é', 'É'], KeyI: ['í', 'Í'], KeyO: ['ó', 'Ó'], KeyU: ['ú', 'Ú'], KeyN: ['ñ', 'Ñ'],
    KeyY: ['ü', 'Ü'], Slash: ['¿', null], Digit1: ['¡', null], Digit5: ['€', null] },
  latam: {},
  'us-basic': {},
};

/** Teclas que escriben lo mismo en cualquier idioma: código → [normal, con Shift]. */
const COMUNES = {
  Space: [' ', null], NumpadMultiply: ['*', null], NumpadAdd: ['+', null],
  NumpadSubtract: ['-', null], NumpadDivide: ['/', null], NumpadDecimal: ['.', null],
};

/** Etiqueta de las teclas que no escriben un carácter. */
const ESPECIALES = {
  Enter: '⏎', Backspace: '⌫', Tab: 'Tab', Space: '␣', Escape: 'Esc', ShiftLeft: '⇧', ShiftRight: '⇧',
  ControlLeft: 'Ctrl', ControlRight: 'Ctrl', AltLeft: 'Alt', AltRight: 'AltGr', MetaLeft: 'Win', MetaRight: 'Win',
  ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', Delete: 'Supr', Home: 'Inicio', End: 'Fin',
  PageUp: 'RePág', PageDown: 'AvPág', CapsLock: 'Bloq',
};

/** Código HID del teclado (página 7) → código de tecla del navegador. */
const HID = (() => {
  const t = { 39: 'Digit0', 40: 'Enter', 41: 'Escape', 42: 'Backspace', 43: 'Tab', 44: 'Space', 45: 'Minus',
    46: 'Equal', 47: 'BracketLeft', 48: 'BracketRight', 49: 'Backslash', 51: 'Semicolon', 52: 'Quote',
    53: 'Backquote', 54: 'Comma', 55: 'Period', 56: 'Slash', 57: 'CapsLock', 74: 'Home', 75: 'PageUp',
    76: 'Delete', 77: 'End', 78: 'PageDown', 79: 'ArrowRight', 80: 'ArrowLeft', 81: 'ArrowDown', 82: 'ArrowUp',
    84: 'NumpadDivide', 85: 'NumpadMultiply', 86: 'NumpadSubtract', 87: 'NumpadAdd', 99: 'NumpadDecimal',
    100: 'IntlBackslash', 224: 'ControlLeft', 225: 'ShiftLeft', 226: 'AltLeft', 227: 'MetaLeft',
    228: 'ControlRight', 229: 'ShiftRight', 230: 'AltRight', 231: 'MetaRight' };
  for (let i = 0; i < 26; i++) t[4 + i] = 'Key' + String.fromCharCode(65 + i);
  for (let i = 1; i <= 9; i++) t[29 + i] = 'Digit' + i;
  for (let i = 1; i <= 12; i++) t[57 + i] = 'F' + i;
  return t;
})();

const PALABRAS = ('de la que el en y a los se del las un por con no una su para es al lo como mas pero sus le ya o ' +
  'este si porque esta entre cuando muy sin sobre ser tiene tambien me hasta hay donde quien desde todo nos ' +
  'durante todos uno les ni contra otros ese eso ante ellos esto mi antes algunos unos yo otro otras otra ' +
  'tanto esa estos mucho cual poco ella estar estas algo nosotros nada casa tiempo vida mundo dia cosa hombre ' +
  'parte lugar trabajo punto mano forma caso grupo agua noche nombre tierra campo ciudad gente camino libro ' +
  'mesa puerta carta papel verde azul rojo blanco negro grande nuevo bueno largo claro decir hacer poder tener ' +
  'saber querer llegar pasar deber poner parecer quedar creer hablar llevar dejar seguir encontrar llamar venir ' +
  'pensar salir volver tomar conocer vivir sentir tratar mirar contar empezar esperar buscar entrar trabajar ' +
  'escribir perder ahora siempre nunca aqui bien mal hoy luego cerca lejos año niño señor mañana pequeño español').split(' ');

const PALABRAS_ES = ('más también está aquí así día después país según qué cómo él sí años niño señor mañana pequeño ' +
  'español canción corazón camión razón nación número música público último fácil difícil árbol lápiz café papá ' +
  'mamá sofá inglés francés jamás quizás además través único página teléfono médico rápido cuándo dónde quién ' +
  'acción información atención opinión versión sesión útil móvil débil azúcar ningún algún común jardín ' +
  'pingüino vergüenza señal dueño sueño otoño baño compañía montaña ¿qué? ¿cómo? ¿dónde? ¿cuándo? ¡hola! ¡sí! ¡qué bien!').split(' ');

const LECCIONES = [
  ['central', 'Fila central'], ['superior', 'Fila superior'], ['inferior', 'Fila inferior'],
  ['letras', 'Todas las letras'], ['palabras', 'Palabras'], ['mayusculas', 'Palabras con mayúscula'], ['espanol', 'Español: tildes y ñ'],
  ['numeros', 'Números'], ['simbolos', 'Símbolos'], ['debiles', 'Mis puntos débiles'], ['propio', 'Texto propio…'],
];

const LARGO_LINEA = 36;
const CLAVE = 'entrenador-toucan';
const SISTEMAS_VALIDOS = ['us', 'us-basic', 'latam'];
const LIMITE_ARCHIVO = 1024 * 1024;

/** Teclas muertas: primero el acento, después la letra (o espacio para el signo). */
const ACENTOS = {
  us: [["'", '\u0301', 'aeiouyAEIOUY'], ['"', '\u0308', 'aeiouyAEIOUY'], ['`', '\u0300', 'aeiouAEIOU'], ['~', '\u0303', 'anoANO'], ['^', '\u0302', 'aeiouAEIOU']],
  latam: [['´', '\u0301', 'aeiouAEIOU'], ['¨', '\u0308', 'uU']],
  'us-basic': [],
};

/** Posiciones del Toucan (42 teclas): yemas en la fila central, de meñique a índice. */
const DEDOS = { L: [13, 14, 15, 16], R: [22, 21, 20, 19] };
/** Teclas de pulgar de cada mano, de izquierda a derecha. */
const PULGARES = { L: [36, 37, 38], R: [39, 40, 41] };
/** Teclas de la columna exterior que se pueden reasignar (la comilla se queda en su sitio). */
const EXTERIOR = { L: [0, 12, 24], R: [11, 35] };
/** Esfuerzo [pulsar, mantener] según la nota del usuario; 0 = el pulgar descansa ahí. */
const ESFUERZO = {
  pulgar: { 0: [1, 1], 1: [1.3, 1.5], 2: [2, 3], 3: [4, 7] },
  exterior: { 1: [1.6, 2], 2: [2.6, 4], 3: [5, 9] },
};
/** Esfuerzo de una función que no cabe en BASE y hay que buscar en una capa. */
const SIN_SITIO = 5;
const NOMBRE_POS = {
  36: 'pulgar izq. exterior', 37: 'pulgar izq. central', 38: 'pulgar izq. interior',
  39: 'pulgar der. interior', 40: 'pulgar der. central', 41: 'pulgar der. exterior',
  0: 'esquina sup. izq.', 12: 'meñique izq., fila central', 24: 'esquina inf. izq.',
  11: 'esquina sup. der.', 35: 'esquina inf. der.',
};
const ID_TECLA = { Space: 'space', Backspace: 'bksp', Enter: 'enter', Tab: 'tab', Escape: 'esc', ControlLeft: 'ctrl',
  ControlRight: 'ctrl', MetaLeft: 'win', MetaRight: 'win', AltRight: 'altgr', ShiftLeft: 'shift', ShiftRight: 'shift' };

// #endregion

// #region HELPERS

/**
 * Crea una tecla que escribe (con o sin Shift incluido).
 * @param {string} k - Código de tecla del navegador.
 * @param {boolean} [s] - La tecla ya envía Shift por sí misma.
 * @param {boolean} [g] - La tecla ya envía AltGr por sí misma.
 * @returns {{k: string, s: boolean, g?: boolean}} Asignación de tecla.
 */
const tecla = (k, s = false, g = false) => (g ? { k, s, g } : { k, s });

/**
 * Posición física por defecto del Toucan (42 teclas), en centésimas de tecla.
 * @returns {Array<{x: number, y: number, w: number, h: number, r: number, rx: number, ry: number}>} Una entrada por tecla.
 */
function disposicionPorDefecto() {
  const escalon = [37, 37, 12, 0, 12, 24];
  const teclas = [];
  for (let fila = 0; fila < 3; fila++) {
    for (let col = 0; col < 12; col++) {
      const izquierda = col < 6;
      const x = izquierda ? col * 100 : 800 + (col - 6) * 100;
      const y = fila * 100 + escalon[izquierda ? col : 11 - col];
      teclas.push({ x, y, w: 100, h: 100, r: 0, rx: 0, ry: 0 });
    }
  }
  [330, 430, 530, 770, 870, 970].forEach((x) => teclas.push({ x, y: 345, w: 100, h: 100, r: 0, rx: 0, ry: 0 }));
  return teclas;
}

/**
 * Keymap de fábrica del Toucan2, usado hasta que se lee el teclado real.
 * @returns {{layers: Array<{id: number, name: string, keys: object[]}>, layout: object[]}} Keymap normalizado.
 */
function keymapPorDefecto() {
  const K = (l) => tecla('Key' + l);
  const D = (n, s) => tecla('Digit' + n, s);
  const T = () => ({ tr: 1 });
  const O = (o) => ({ o });
  const letras = (txt) => txt.split('').map(K);
  const repetir = (n) => Array.from({ length: n }, T);
  const base = [
    tecla('Tab'), ...letras('QWERTYUIOP'), tecla('Backspace'),
    tecla('ControlLeft'), ...letras('ASDFGHJKL'), tecla('Semicolon'), tecla('Quote'),
    tecla('ShiftLeft'), ...letras('ZXCVBNM'), tecla('Comma'), tecla('Period'), tecla('Slash'), tecla('Escape'),
    tecla('MetaLeft'), { mo: 1 }, tecla('Space'), tecla('Enter'), { mo: 2 }, tecla('AltRight'),
  ];
  const nav = [
    tecla('Tab'), ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((n) => D(n)), tecla('Backspace'),
    O('BT×'), O('BT1'), O('BT2'), O('BT3'), O('BT4'), O('BT5'),
    tecla('ArrowLeft'), tecla('ArrowDown'), tecla('ArrowUp'), tecla('ArrowRight'), T(), T(),
    tecla('ShiftLeft'), O('Studio'), ...repetir(10), ...repetir(6),
  ];
  const sym = [
    tecla('Tab'), ...[1, 2, 3, 4, 5, 6, 7].map((n) => D(n, true)), tecla('NumpadMultiply'), D(9, true), D(0, true), tecla('Backspace'),
    tecla('ControlLeft'), ...repetir(5),
    ...['Minus', 'Equal', 'BracketLeft', 'BracketRight', 'Backslash', 'Backquote'].map((c) => tecla(c)),
    tecla('ShiftLeft'), ...repetir(5),
    ...['Minus', 'Equal', 'BracketLeft', 'BracketRight', 'Backslash', 'Backquote'].map((c) => tecla(c, true)),
    ...repetir(6),
  ];
  return {
    layers: [{ id: 0, name: 'BASE', keys: base }, { id: 1, name: 'NAV', keys: nav }, { id: 2, name: 'SYM', keys: sym }],
    layout: disposicionPorDefecto(),
  };
}

/**
 * Lee un valor guardado en el navegador.
 * @param {string} nombre - Nombre del dato.
 * @param {*} porDefecto - Valor si no existe o no se puede leer.
 * @returns {*} El dato guardado o el valor por defecto.
 */
function leerGuardado(nombre, porDefecto) {
  try {
    const crudo = localStorage.getItem(CLAVE + '-' + nombre);
    return crudo ? JSON.parse(crudo) : porDefecto;
  } catch { return porDefecto; }
}

/**
 * Guarda un valor en el navegador (si falla, el entrenador sigue funcionando sin memoria).
 * @param {string} nombre - Nombre del dato.
 * @param {*} valor - Valor serializable.
 * @returns {void}
 */
function guardar(nombre, valor) {
  try { localStorage.setItem(CLAVE + '-' + nombre, JSON.stringify(valor)); } catch { /* sin almacenamiento */ }
}

/** Valida y copia únicamente los campos del formato. No modifica el objeto recibido. */
function validarKeymap(dato) {
  const objeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
  const exigir = (condicion, mensaje) => { if (!condicion) throw new Error(mensaje); };
  const codigo = (v) => typeof v === 'string' && /^[A-Za-z][A-Za-z0-9]{0,39}$/.test(v);
  exigir(objeto(dato), 'La configuración debe ser un objeto.');
  exigir(dato.version == null || dato.version === 1, 'La versión de esta configuración no es compatible.');
  exigir(Array.isArray(dato.layers) && dato.layers.length > 0 && dato.layers.length <= 32, 'Debe haber entre 1 y 32 capas.');
  exigir(Array.isArray(dato.layout) && dato.layout.length > 0 && dato.layout.length <= 256, 'La disposición debe tener entre 1 y 256 teclas.');
  const ids = new Set();
  for (const capa of dato.layers) {
    exigir(objeto(capa) && Number.isInteger(capa.id) && capa.id >= 0 && capa.id <= 65535 && !ids.has(capa.id), 'Cada capa necesita un identificador único.');
    ids.add(capa.id);
  }
  const pulsacion = (a) => {
    exigir(objeto(a) && codigo(a.k), 'Hay un código de tecla inválido.');
    for (const p of ['s', 'g']) exigir(a[p] === undefined || typeof a[p] === 'boolean', 'Los modificadores deben ser booleanos.');
    return tecla(a.k, !!a.s, !!a.g);
  };
  const layers = dato.layers.map((capa) => {
    exigir(typeof capa.name === 'string' && capa.name.length <= 100, 'Hay un nombre de capa inválido.');
    exigir(Array.isArray(capa.keys) && capa.keys.length === dato.layout.length, 'Todas las capas deben tener una asignación por tecla.');
    const keys = capa.keys.map((a) => {
      exigir(objeto(a), 'Cada tecla debe tener una asignación válida.');
      const tiene = (p) => Object.prototype.hasOwnProperty.call(a, p);
      if (tiene('tr')) {
        exigir((a.tr === 1 || a.tr === true) && !['k', 'mo', 'hold', 'o'].some(tiene), 'Hay una tecla transparente inválida.');
        return { tr: 1 };
      }
      if (tiene('o')) {
        exigir(typeof a.o === 'string' && a.o.length <= 100 && !['k', 'mo', 'hold'].some(tiene), 'Hay una etiqueta de tecla inválida.');
        return { o: a.o };
      }
      exigir(tiene('k') || tiene('mo'), 'Hay una tecla sin función.');
      const salida = tiene('k') ? pulsacion(a) : {};
      if (tiene('mo')) {
        exigir(Number.isInteger(a.mo) && ids.has(a.mo) && !tiene('hold'), 'Hay una referencia a una capa inexistente o incompatible.');
        salida.mo = a.mo;
      }
      if (tiene('hold')) {
        exigir(tiene('k'), 'Una tecla mod-tap necesita su acción al pulsar.');
        salida.hold = pulsacion(a.hold);
      }
      return salida;
    });
    return { id: capa.id, name: capa.name, keys };
  });
  const layout = dato.layout.map((k) => {
    exigir(objeto(k), 'Hay una posición de tecla inválida.');
    const salida = {};
    for (const p of ['x', 'y', 'w', 'h', 'r', 'rx', 'ry']) {
      const n = k[p] === undefined && ['r', 'rx', 'ry'].includes(p) ? 0 : k[p];
      exigir(Number.isFinite(n) && Math.abs(n) <= 100000, 'Las posiciones y dimensiones deben ser números finitos.');
      salida[p] = n;
    }
    exigir(salida.w > 0 && salida.h > 0, 'El ancho y alto de cada tecla deben ser positivos.');
    return salida;
  });
  return { version: 1, layers, layout };
}

/** Recupera un historial válido sin permitir que datos antiguos impidan el arranque. */
function validarHistorial(dato) {
  const salida = Object.create(null);
  if (!dato || typeof dato !== 'object' || Array.isArray(dato)) return salida;
  for (const [c, d] of Object.entries(dato)) {
    if ([...c].length === 1 && d && Number.isSafeInteger(d.a) && d.a >= 0 && Number.isSafeInteger(d.e) && d.e >= 0) salida[c] = { a: d.a, e: d.e };
  }
  return salida;
}

/**
 * Tabla completa de caracteres del idioma de Windows elegido.
 * @param {string} sistema - 'us' o 'latam'.
 * @returns {Object<string, [string|null, string|null]>} código → [normal, con Shift].
 */
function tablaSistema(sistema) {
  const tabla = { ...COMUNES, ...SISTEMAS[sistema === 'us-basic' ? 'us' : sistema] };
  for (let i = 0; i < 26; i++) {
    const l = String.fromCharCode(97 + i);
    tabla['Key' + l.toUpperCase()] = [l, l.toUpperCase()];
  }
  for (const [codigo, par] of Object.entries(ALTGR[sistema])) tabla[codigo] = [...tabla[codigo].slice(0, 2), ...par];
  return tabla;
}

/**
 * Etiqueta que se dibuja sobre una tecla.
 * @param {object} asignacion - Asignación normalizada de la tecla.
 * @param {object} tabla - Tabla del idioma de Windows.
 * @param {Array<{id: number, name: string}>} capas - Capas del keymap.
 * @returns {string} Texto corto para la tecla.
 */
function etiqueta(asignacion, tabla, capas) {
  if (!asignacion || asignacion.tr) return '';
  if (asignacion.k) {
    const par = tabla[asignacion.k];
    const caracter = par && asignacion.k !== 'Space' ? par[(asignacion.g ? 2 : 0) + (asignacion.s ? 1 : 0)] : null;
    const principal = caracter ? (/^\p{Ll}$/u.test(caracter) ? caracter.toUpperCase() : caracter) : ESPECIALES[asignacion.k] || asignacion.k;
    const mantener = asignacion.hold ? etiqueta(asignacion.hold, tabla, capas) : asignacion.mo != null ? etiqueta({ mo: asignacion.mo }, tabla, capas) : '';
    return principal + (mantener ? ' / ' + mantener : '');
  }
  if (asignacion.mo != null) {
    const capa = capas.find((c) => c.id === asignacion.mo);
    return capa ? capa.name || 'Capa ' + capa.id : 'Capa';
  }
  return asignacion.o || '';
}

/**
 * Calcula cómo se escribe cada carácter en este teclado.
 * @param {object} keymap - Keymap normalizado.
 * @param {object} tabla - Tabla del idioma de Windows.
 * @returns {Object<string, {capa: number, pos: number, mantener: number|null, shift: number|null, altgr: number|null}>} carácter → receta.
 * @flow
 * 1. Encuentra las capas alcanzables con una tecla de capa en BASE
 * 2. Para cada carácter busca una tecla que lo escriba directamente
 * 3. Si no hay, busca la tecla sin Shift o sin AltGr y añade la tecla que falta mantener
 * 4. Entre varios Shift elige el que no comparte pulgar con otra tecla de la receta
 */
function calcularRecetas(keymap, tabla, sistema = 'us') {
  const base = keymap.layers[0].keys;
  const alcance = [{ capa: 0, mantener: null }];
  base.forEach((a, pos) => {
    if (a.mo == null) return;
    const capa = keymap.layers.findIndex((c) => c.id === a.mo);
    if (capa > 0 && !alcance.some((x) => x.capa === capa)) alcance.push({ capa, mantener: pos });
  });
  const esModificador = (a, codigos) => codigos.includes(a.k) || codigos.includes(a.hold?.k);
  const shifts = base.map((a, i) => (esModificador(a, ['ShiftLeft', 'ShiftRight']) ? i : -1))
    .filter((i) => i >= 0).sort((a, b) => (b >= 36) - (a >= 36));
  const altgrs = base.map((a, i) => esModificador(a, ['AltRight']) ? i : -1).filter((i) => i >= 0);
  const mismoPulgar = (a, b) => a != null && a >= 36 && b >= 36 && (a < 39) === (b < 39);
  const buscar = (codigo, conShift, conAltgr, necesitaShift, necesitaAltgr) => {
    for (const { capa, mantener } of alcance) {
      for (let pos = 0; pos < base.length; pos++) {
        const propia = keymap.layers[capa].keys[pos];
        const a = propia.tr ? base[pos] : propia;
        if (a.k !== codigo || !!a.s !== conShift || !!a.g !== conAltgr || pos === mantener) continue;
        const altgr = necesitaAltgr ? altgrs.find((p) => p !== pos && p !== mantener) : null;
        if (necesitaAltgr && altgr === undefined) continue;
        const disponibles = shifts.filter((p) => ![pos, mantener, altgr].includes(p));
        const shift = necesitaShift ? disponibles.find((p) => ![pos, mantener, altgr].some((o) => mismoPulgar(o, p))) ?? disponibles[0] : null;
        if (necesitaShift && shift === undefined) continue;
        return { capa, pos, mantener, shift, altgr };
      }
    }
    return null;
  };
  const recetas = {};
  for (const [faltaShift, faltaAltgr] of [[false, false], [true, false], [false, true], [true, true]]) {
    if ((faltaShift && !shifts.length) || (faltaAltgr && !altgrs.length)) continue;
    for (const [codigo, niveles] of Object.entries(tabla)) {
      niveles.forEach((caracter, nivel) => {
        const conShift = !!(nivel & 1), conAltgr = nivel > 1;
        if (caracter == null || recetas[caracter] || (faltaShift && !conShift) || (faltaAltgr && !conAltgr)) return;
        const hallada = buscar(codigo, conShift && !faltaShift, conAltgr && !faltaAltgr, faltaShift, faltaAltgr);
        if (!hallada) return;
        recetas[caracter] = hallada;
      });
    }
  }
  const directas = { ...recetas };
  for (const [signo, marca, letras] of ACENTOS[sistema]) {
    const acento = directas[signo];
    if (!acento) continue;
    for (const letra of letras) {
      const caracter = (letra + marca).normalize('NFC');
      if ([...caracter].length !== 1 || recetas[caracter] || !directas[letra]) continue;
      recetas[caracter] = { ...acento, pasos: [{ ...acento }, { ...directas[letra] }] };
    }
    // La comilla, el acento y otros signos muertos también necesitan espacio.
    if (directas[' ']) recetas[signo] = { ...acento, pasos: [{ ...acento }, { ...directas[' '] }] };
    else delete recetas[signo];
  }
  return recetas;
}

/**
 * Indica si una pulsación llega con AltGr (Windows lo envía como Ctrl + Alt).
 * @param {KeyboardEvent} evento - Pulsación recibida.
 * @returns {boolean} true si AltGr está activo.
 */
const conAltgr = (evento) => evento.getModifierState('AltGraph') || (evento.ctrlKey && evento.altKey);

/**
 * Indica si el texto confirmado corresponde al carácter esperado.
 * @param {string} texto - Texto producido por el sistema operativo.
 * @param {string} caracter - Carácter esperado.
 * @returns {boolean} true si los caracteres coinciden tras normalizar Unicode.
 */
function acierta(texto, caracter) {
  return texto.normalize('NFC') === caracter.normalize('NFC');
}

/**
 * Elige un elemento al azar, con más probabilidad para los de mayor peso.
 * @param {string[]} opciones - Elementos candidatos.
 * @param {(o: string) => number} peso - Peso de cada elemento.
 * @returns {string} El elemento elegido.
 */
function alAzar(opciones, peso = () => 1) {
  const pesos = opciones.map(peso);
  let tiro = Math.random() * pesos.reduce((a, b) => a + b, 0);
  for (let i = 0; i < opciones.length; i++) { tiro -= pesos[i]; if (tiro <= 0) return opciones[i]; }
  return opciones[opciones.length - 1];
}

/**
 * Proporción de fallos de un carácter.
 * @param {{a: number, e: number}|undefined} dato - Aciertos y errores acumulados.
 * @returns {number} Fallos entre intentos (0 si no hay datos).
 */
const tasaError = (dato) => (dato && dato.a + dato.e > 0 ? dato.e / (dato.a + dato.e) : 0);

/**
 * Escapa un texto para insertarlo como HTML.
 * @param {string} texto - Texto plano.
 * @returns {string} Texto seguro para innerHTML.
 */
const escapar = (texto) => String(texto).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/**
 * Centro de una tecla en píxeles, teniendo en cuenta su giro.
 * @param {{x: number, y: number, w: number, h: number, r: number, rx: number, ry: number}} k - Tecla en centésimas.
 * @param {number} u - Píxeles por unidad de tecla.
 * @returns {[number, number]} Coordenadas x, y del centro.
 */
function centro(k, u, origen = { x: 0, y: 0 }) {
  let x = k.x + k.w / 2, y = k.y + k.h / 2;
  if (k.r) {
    const a = (k.r / 100) * Math.PI / 180, dx = x - k.rx, dy = y - k.ry;
    x = k.rx + dx * Math.cos(a) - dy * Math.sin(a);
    y = k.ry + dx * Math.sin(a) + dy * Math.cos(a);
  }
  return [((x - origen.x) / 100) * u, ((y - origen.y) / 100) * u];
}

/** Incluye las esquinas giradas: los pulgares no deben salir de la tarjeta. */
function limitesDisposicion(layout) {
  const puntos = layout.flatMap((k) => {
    const a = (k.r / 100) * Math.PI / 180;
    return [[k.x, k.y], [k.x + k.w, k.y], [k.x, k.y + k.h], [k.x + k.w, k.y + k.h]].map(([x, y]) => k.r
      ? [k.rx + (x - k.rx) * Math.cos(a) - (y - k.ry) * Math.sin(a), k.ry + (x - k.rx) * Math.sin(a) + (y - k.ry) * Math.cos(a)]
      : [x, y]);
  });
  const x = Math.min(0, ...puntos.map((p) => p[0]));
  const y = Math.min(0, ...puntos.map((p) => p[1]));
  return { x, y, ancho: Math.max(...puntos.map((p) => p[0])) - x, alto: Math.max(...puntos.map((p) => p[1])) - y };
}

/**
 * Dibuja las teclas del keymap dentro de una caja.
 * @param {HTMLElement} caja - Contenedor con posición relativa.
 * @param {object[]} layout - Forma física del teclado.
 * @param {number} anchoDisponible - Ancho máximo en píxeles.
 * @param {(pos: number) => {texto: string, clase: string}} porTecla - Texto y clases de cada tecla.
 * @returns {number} Píxeles por unidad de tecla usados.
 */
function dibujarTeclado(caja, layout, anchoDisponible, porTecla) {
  const enfocada = caja.contains(document.activeElement) ? document.activeElement.dataset.pos : undefined;
  const limites = limitesDisposicion(layout);
  const { ancho, alto } = limites;
  const u = Math.max(12, Math.min(58, anchoDisponible / (ancho / 100)));
  caja.style.width = (ancho / 100) * u + 'px';
  caja.style.height = (alto / 100) * u + 'px';
  caja.innerHTML = layout.map((k, pos) => {
    const { texto, clase, interactiva } = porTecla(pos);
    const giro = k.r ? `transform:rotate(${k.r / 100}deg);transform-origin:${((k.rx - k.x) / 100) * u}px ${((k.ry - k.y) / 100) * u}px;` : '';
    const tag = interactiva || clase.includes('opcion') ? 'button' : 'div';
    return `<${tag} class="tecla ${escapar(clase)}" data-pos="${pos}" ${tag === 'button' ? 'type="button" aria-label="' + escapar(texto || 'Seleccionar tecla ' + (pos + 1)) + '"' : ''} style="left:${((k.x - limites.x) / 100) * u + 2}px;top:${((k.y - limites.y) / 100) * u + 2}px;width:${(k.w / 100) * u - 4}px;height:${(k.h / 100) * u - 4}px;${giro}">${escapar(texto)}</${tag}>`;
  }).join('');
  if (enfocada !== undefined) caja.querySelector(`[data-pos="${enfocada}"]`)?.focus();
  return u;
}

/**
 * Reparte funciones entre teclas minimizando el esfuerzo total (asignación exacta por máscaras).
 * @param {Array<{id: string, w: number, t: number, solo?: string, mano?: string, fijo?: boolean}>} funcs - Funciones a colocar.
 * @param {Array<{pos: number, mano: string, tipo: string, c: number[]}>} slots - Teclas disponibles con su esfuerzo.
 * @param {Object<string, {pos: number}>} actual - Dónde está hoy cada función, para desempatar.
 * @returns {Object<string, object>} id de función → tecla asignada (ausente si no cabe).
 * @flow
 * 1. Recorre las funciones acumulando el mejor coste por conjunto de teclas ocupadas
 * 2. Cada función puede ocupar una tecla permitida o quedarse sin sitio (si no es obligatoria)
 * 3. Reconstruye la asignación del conjunto de menor coste
 */
function resolver(funcs, slots, actual) {
  let estados = new Map([[0, { c: 0, prev: null }]]);
  for (const f of funcs) {
    const nuevos = new Map();
    const poner = (mascara, e) => { const o = nuevos.get(mascara); if (!o || e.c < o.c) nuevos.set(mascara, e); };
    for (const [mascara, e] of estados) {
      if (!f.fijo) poner(mascara, { c: e.c + f.w * SIN_SITIO, prev: e });
      slots.forEach((s, j) => {
        if ((mascara >> j) & 1 || (f.solo && f.solo !== s.tipo) || (f.mano && f.mano !== s.mano)) return;
        const igual = actual[f.id] && actual[f.id].pos === s.pos ? 1e-6 : 0;
        poner(mascara | (1 << j), { c: e.c + f.w * s.c[f.t] - igual, prev: e, f, s });
      });
    }
    estados = nuevos;
  }
  let mejor = null;
  for (const e of estados.values()) if (!mejor || e.c < mejor.c) mejor = e;
  const sitio = {};
  for (let e = mejor; e; e = e.prev) if (e.s) sitio[e.f.id] = e.s;
  return sitio;
}

// #endregion

