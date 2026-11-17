// #region MAIN

const $ = (id) => document.getElementById(id);
let avisoInicial = '';
function keymapInicial() {
  const guardado = leerGuardado('keymap', null);
  if (guardado) {
    try { return validarKeymap(guardado); }
    catch { avisoInicial = 'La configuración guardada no es válida. Recuperamos el teclado de fábrica; puedes cargar otro archivo.'; }
  } else avisoInicial = 'Usando el teclado de fábrica. Pulsa «Leer mi teclado» para cargar tus capas reales.';
  return validarKeymap(keymapPorDefecto());
}
const sistemaGuardado = leerGuardado('sistema', 'us');
const leccionGuardada = leerGuardado('leccion', 'central');
const textoGuardado = leerGuardado('propio', '');
const estado = {
  keymap: keymapInicial(),
  sistema: SISTEMAS_VALIDOS.includes(sistemaGuardado) ? sistemaGuardado : 'us',
  leccion: LECCIONES.some(([id]) => id === leccionGuardada) ? leccionGuardada : 'central',
  propio: typeof textoGuardado === 'string' ? textoGuardado.normalize('NFC').slice(0, 50000) : '',
  porCaracter: validarHistorial(leerGuardado('caracteres', {})),
  verTeclado: leerGuardado('ver', true) !== false,
  tabla: null, recetas: null, linea: '', indice: 0, cola: [],
  vista: 'auto', teclas: { shift: false, altgr: false },
  aciertos: 0, errores: 0, msActivos: 0, inicioTramo: null, fallo: false, pulsaste: '',
  componiendo: false, pasoComposicion: 0, avisoTexto: '',
};

/**
 * Caracteres que practica una lección de repetición.
 * @param {string} leccion - Identificador de la lección.
 * @returns {string[]} Caracteres disponibles en este teclado para esa lección.
 */
function caracteresDe(leccion) {
  const todos = Object.keys(estado.recetas).filter((c) => c !== ' ');
  const letras = todos.filter((c) => /^[a-zñ]$/.test(c));
  const fila = (n) => {
    const base = estado.keymap.layers[0].keys;
    const porFila = Math.floor(Math.min(base.length, 36) / 3);
    return base.slice(n * porFila, (n + 1) * porFila)
      .map((a) => (a.k && !a.s && estado.tabla[a.k] ? estado.tabla[a.k][0] : null))
      .filter((c) => c && /^[a-zñ]$/.test(c) && estado.recetas[c]);
  };
  if (leccion === 'superior') return fila(0);
  if (leccion === 'central') return fila(1);
  if (leccion === 'inferior') return fila(2);
  if (leccion === 'numeros') return todos.filter((c) => /^[0-9]$/.test(c));
  if (leccion === 'simbolos') return todos.filter((c) => !/^[\p{L}\d]$/u.test(c));
  if (leccion === 'debiles') {
    const peores = todos.filter((c) => (estado.porCaracter[c] || {}).e > 0)
      .sort((a, b) => tasaError(estado.porCaracter[b]) - tasaError(estado.porCaracter[a])).slice(0, 6);
    return peores.length >= 2 ? peores : letras;
  }
  return letras;
}

/**
 * Genera la siguiente línea de práctica de la lección activa.
 * @returns {string} Texto que solo usa caracteres que este teclado puede escribir.
 */
function generarLinea() {
  estado.avisoTexto = '';
  const escribible = (texto) => [...texto].every((c) => estado.recetas[c]);
  const separador = estado.recetas[' '] ? ' ' : '';
  const trozos = [];
  const largo = () => trozos.join(separador).length;

  if (estado.leccion === 'propio') {
    const caracteres = [...estado.propio.normalize('NFC').replace(/\s+/g, ' ')];
    const omitidos = [...new Set(caracteres.filter((c) => !estado.recetas[c]))];
    if (omitidos.length) estado.avisoTexto = 'Tu configuración no permite practicar estos caracteres: ' + omitidos.map((c) => c === ' ' ? 'espacio' : c).join(' ') + '. Se omiten del ejercicio.';
    if (!estado.cola.length) estado.cola = caracteres.filter((c) => estado.recetas[c]).join('').trim().split(' ').filter(Boolean);
    while (estado.cola.length && largo() < LARGO_LINEA) trozos.push(estado.cola.shift());
    return trozos.join(separador);
  }
  if (['palabras', 'mayusculas', 'espanol'].includes(estado.leccion)) {
    const vocabulario = estado.leccion === 'espanol' ? PALABRAS_ES : PALABRAS;
    const posibles = vocabulario.filter(escribible);
    if (estado.leccion === 'espanol' && posibles.length < vocabulario.length) estado.avisoTexto = `${vocabulario.length - posibles.length} palabras necesitan caracteres que no están disponibles en este teclado. Revisa el idioma de Windows o tus capas.`;
    while (posibles.length && largo() < LARGO_LINEA) {
      const palabra = alAzar(posibles);
      const mayus = palabra[0].toUpperCase() + palabra.slice(1);
      trozos.push(estado.leccion === 'mayusculas' && escribible(mayus) ? mayus : palabra);
    }
    return trozos.join(separador);
  }
  const juego = caracteresDe(estado.leccion);
  if (!juego.length) return '';
  const peso = (c) => 1 + 4 * tasaError(estado.porCaracter[c]);
  while (largo() < LARGO_LINEA) {
    let trozo = '';
    const n = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < n; i++) trozo += alAzar(juego, peso);
    trozos.push(trozo);
  }
  return trozos.join(separador);
}

/**
 * Dibuja el texto, la pista, el teclado y las cifras según el estado actual.
 * @returns {void}
 */
function pintar() {
  if (!$('configuracion').hidden) return;
  const { keymap, tabla, recetas, linea, indice } = estado;
  const esperado = linea[indice];
  const completa = esperado ? recetas[esperado] : null;
  const receta = completa?.pasos ? completa.pasos[Math.min(estado.pasoComposicion, completa.pasos.length - 1)] : completa;
  const capas = keymap.layers;

  $('texto').innerHTML = linea
    ? [...linea].map((c, i) => `<span class="${i < indice ? 'hecho' : i === indice ? 'actual' + (estado.fallo ? ' fallo' : '') : ''}">${c === ' ' ? '␣' : escapar(c)}</span>`).join('')
    : 'Este teclado no tiene teclas para esta lección.';

  let pista = '';
  if (receta) {
    const nombre = (pos, capa) => {
      const propia = capas[capa].keys[pos];
      return escapar(etiqueta(propia.tr ? capas[0].keys[pos] : propia, tabla, capas) || '?');
    };
    const instruccion = (paso) => {
      const mantener = [paso.mantener, paso.shift, paso.altgr].filter((pos) => pos != null);
      return (mantener.length ? 'Mantén ' + mantener.map((pos) => `<kbd class="mantener">${nombre(pos, 0)}</kbd>`).join(' + ') + ' y pulsa ' : 'Pulsa ') + `<kbd class="pulsar">${nombre(paso.pos, paso.capa)}</kbd>`;
    };
    pista = completa.pasos ? completa.pasos.map(instruccion).join(' <span class="secuencia">→ suelta y luego </span>') : instruccion(receta);
    if (estado.fallo && estado.pulsaste) pista += `<span class="pulsaste">Pulsaste ${escapar(estado.pulsaste)}</span>`;
  }
  $('pista').innerHTML = pista;
  $('avisoTexto').textContent = estado.avisoTexto;
  $('avisoTexto').hidden = !estado.avisoTexto;
  $('entrada').disabled = !linea;

  $('zonaTeclado').hidden = !estado.verTeclado;
  $('ver').textContent = estado.verTeclado ? 'Ocultar teclado' : 'Mostrar teclado';
  if (estado.verTeclado) {
    const manual = estado.vista !== 'auto';
    const verAltgr = estado.teclas.altgr || (manual ? estado.vista === 'altgr' : !!receta && receta.altgr != null);
    const capaVista = estado.vista === 'altgr' ? 0 : manual ? estado.vista : receta ? receta.capa : 0;
    const nivel = (verAltgr ? 2 : 0) + (estado.teclas.shift ? 1 : 0);
    const enVista = receta && receta.capa === capaVista;
    dibujarTeclado($('teclado'), keymap.layout, $('zonaTeclado').clientWidth - 42, (pos) => {
      const propia = capas[capaVista].keys[pos];
      const heredada = capaVista > 0 && propia && propia.tr;
      const origen = heredada ? capas[0].keys[pos] : propia;
      const deNivel = nivel && origen.k && !origen.g && !origen.s && origen.k !== 'Space' && tabla[origen.k] ? tabla[origen.k][nivel] : null;
      let clase = (heredada || (verAltgr && !deNivel) ? 'heredada' : '') + (origen.hold || (origen.k && origen.mo != null) ? ' doble' : '');
      if (enVista && pos === receta.pos) clase += estado.fallo ? ' fallo' : ' pulsar';
      else if (receta && [receta.mantener, receta.shift, receta.altgr].includes(pos)) clase += ' mantener';
      const accion = capas[0].keys[pos];
      return { texto: deNivel ? (/^\p{Ll}$/u.test(deNivel) ? deNivel.toUpperCase() : deNivel) : etiqueta(origen, tabla, capas), clase, interactiva: accion.mo != null || accion.k === 'AltRight' || accion.hold?.k === 'AltRight' };
    });
    const alcanzables = capas[0].keys.filter((a) => a.mo != null).map((a) => capas.findIndex((c) => c.id === a.mo)).filter((i) => i > 0);
    const vistas = [['auto', 'Automático'], ...[...new Set([0, ...alcanzables])].map((i) => [i, capas[i].name || 'Capa ' + i])];
    if (capas[0].keys.some((a) => a.k === 'AltRight' || a.hold?.k === 'AltRight') && Object.keys(ALTGR[estado.sistema]).length) vistas.push(['altgr', 'Español (AltGr)']);
    const mostrada = verAltgr ? 'altgr' : capaVista;
    const botones = vistas.map(([v, n]) => `<button data-vista="${v}" aria-pressed="${v === estado.vista}" class="${v === estado.vista ? 'activa' : ''}${v === mostrada ? ' vista' : ''}">${escapar(n)}</button>`).join('');
    if ($('capa').innerHTML !== botones) {
      const enfocada = document.activeElement?.dataset?.vista;
      $('capa').innerHTML = botones;
      if (enfocada !== undefined) $('capa').querySelector(`[data-vista="${enfocada}"]`)?.focus();
    }
  }

  pintarCifras();
  const peores = Object.entries(estado.porCaracter).filter(([, d]) => d.e > 0 && d.a + d.e >= 5)
    .sort((a, b) => tasaError(b[1]) - tasaError(a[1])).slice(0, 8);
  $('debiles').innerHTML = peores.length
    ? 'Donde más fallas: ' + peores.map(([c, d]) => `<code>${c === ' ' ? '␣' : escapar(c)} ${Math.round(tasaError(d) * 100)} %</code>`).join('')
    : '';
}

/**
 * Empieza una línea nueva de la lección activa.
 * @returns {void}
 */
function nuevaLinea(pausar = true) {
  if (pausar) pausarPractica();
  estado.linea = generarLinea();
  estado.indice = 0;
  estado.pasoComposicion = 0;
  estado.fallo = false;
  pintar();
}

/**
 * Recalcula lo que depende del keymap o del idioma y reinicia la línea.
 * @returns {void}
 */
function preparar() {
  estado.tabla = tablaSistema(estado.sistema);
  estado.recetas = calcularRecetas(estado.keymap, estado.tabla, estado.sistema);
  estado.cola = [];
  estado.vista = 'auto';
  nuevaLinea();
}

/**
 * Muestra un mensaje bajo la barra.
 * @param {string} mensaje - Texto a mostrar.
 * @param {boolean} [esError] - Lo pinta como error.
 * @returns {void}
 */
function avisar(mensaje, esError = false) {
  $('estado').textContent = mensaje;
  $('estado').className = esError ? 'error' : '';
}

/** Tiempo de la misma sesión cuyos aciertos se muestran, incluida la línea actual. */
function tiempoActivo(ahora = performance.now()) {
  return estado.msActivos + (estado.inicioTramo === null ? 0 : Math.max(0, ahora - estado.inicioTramo));
}

function pintarCifras() {
  const total = estado.aciertos + estado.errores;
  const ms = tiempoActivo();
  $('aciertos').textContent = estado.aciertos;
  $('errores').textContent = estado.errores;
  $('precision').textContent = total ? Math.round(estado.aciertos / total * 100) + ' %' : '–';
  $('ppm').textContent = ms > 3000 ? Math.round(estado.aciertos / 5 / (ms / 60000)) : '–';
}

function pausarPractica() {
  estado.msActivos = tiempoActivo();
  estado.inicioTramo = null;
  guardar('caracteres', estado.porCaracter);
  pintarCifras();
}

function iniciarTramo() {
  if (estado.inicioTramo === null) estado.inicioTramo = performance.now();
}

/** Solo recibe eventos del campo de práctica. Los atajos y Tab siguen siendo nativos. */
function alPulsar(evento) {
  if (evento.target !== $('entrada') || !$('configuracion').hidden || !estado.linea) return;
  if (evento.metaKey || (evento.ctrlKey && !conAltgr(evento))) return;
  if (evento.repeat && !evento.isComposing && (evento.key === 'Dead' || [...evento.key].length === 1)) { evento.preventDefault(); return; }
  if (evento.key === 'Dead' || [...evento.key].length === 1) iniciarTramo();
  if (evento.key === 'Dead') {
    estado.pasoComposicion = 1;
    pintar();
  }
}

/** Evalúa caracteres confirmados por Windows, después de componer los acentos. */
function registrarCaracter(caracter) {
  const esperado = estado.linea[estado.indice];
  if (!esperado) return;
  iniciarTramo();
  const dato = estado.porCaracter[esperado] || (estado.porCaracter[esperado] = { a: 0, e: 0 });
  estado.pasoComposicion = 0;
  if (acierta(caracter, esperado)) {
    estado.aciertos++;
    dato.a++;
    estado.fallo = false;
    estado.indice++;
    if (estado.indice >= estado.linea.length) {
      guardar('caracteres', estado.porCaracter);
      nuevaLinea(false);
      return;
    }
  } else {
    estado.errores++;
    dato.e++;
    estado.fallo = true;
    estado.pulsaste = caracter === ' ' ? '␣' : caracter;
  }
  pintar();
}

function alEscribir(evento) {
  const entrada = $('entrada');
  if (!$('configuracion').hidden || estado.componiendo || evento?.isComposing) return;
  const texto = entrada.value.normalize('NFC');
  entrada.value = '';
  for (const caracter of texto) registrarCaracter(caracter);
}

/** Prepara todos los datos antes de sustituir la configuración en uso o guardarla. */
function aplicarKeymap(dato) {
  const keymap = validarKeymap(dato);
  const tabla = tablaSistema(estado.sistema);
  const recetas = calcularRecetas(keymap, tabla, estado.sistema);
  pausarPractica();
  Object.assign(estado, { keymap, tabla, recetas, cola: [], vista: 'auto', componiendo: false });
  $('entrada').value = '';
  nuevaLinea();
  if (!$('configuracion').hidden) pintarAsistente();
  guardar('keymap', keymap);
}

/** Recupera solo respuestas válidas; una medición incompleta vuelve al inicio. */
function configuracionInicial() {
  const salida = { paso: 0, reposo: {}, nota: {}, uso: null, tildes: null, esc: null };
  const dato = leerGuardado('config', null);
  if (!dato || typeof dato !== 'object') return salida;
  for (const mano of ['L', 'R']) if (PULGARES[mano].includes(dato.reposo?.[mano])) salida.reposo[mano] = dato.reposo[mano];
  for (const pos of [...PULGARES.L, ...PULGARES.R, ...EXTERIOR.L, ...EXTERIOR.R]) if ([1, 2, 3].includes(dato.nota?.[pos])) salida.nota[pos] = dato.nota[pos];
  if (['prosa', 'ambos', 'codigo'].includes(dato.uso)) salida.uso = dato.uso;
  if (['comilla', 'altgr', 'latam'].includes(dato.tildes)) salida.tildes = dato.tildes;
  if (typeof dato.esc === 'boolean') salida.esc = dato.esc;
  const completa = ['L', 'R'].every((mano) => salida.reposo[mano] != null && [...PULGARES[mano], ...EXTERIOR[mano]].every((pos) => pos === salida.reposo[mano] || salida.nota[pos]));
  if (completa && salida.uso && salida.tildes && salida.esc !== null && Number.isInteger(dato.paso)) salida.paso = Math.max(0, Math.min(15, dato.paso));
  return salida;
}

const cfg = configuracionInicial();
let accionesCfg = { opciones: [], alClic: null };

/**
 * Pasos del asistente según lo respondido hasta ahora.
 * @returns {Array<{t: string, mano?: string, pos?: number, dedo?: string, id?: string}>} Pasos en orden.
 */
function pasosCfg() {
  const pasos = [{ t: 'intro' }, { t: 'reposo', mano: 'L' }, { t: 'reposo', mano: 'R' }];
  for (const mano of ['L', 'R']) {
    const reposo = cfg.reposo[mano] ?? PULGARES[mano][1];
    for (const pos of PULGARES[mano]) if (pos !== reposo) pasos.push({ t: 'nota', pos, mano, dedo: 'pulgar' });
  }
  for (const mano of ['L', 'R']) for (const pos of EXTERIOR[mano]) pasos.push({ t: 'nota', pos, mano, dedo: 'exterior' });
  pasos.push({ t: 'pregunta', id: 'uso' }, { t: 'pregunta', id: 'tildes' }, { t: 'pregunta', id: 'esc' }, { t: 'resultado' });
  return pasos;
}

/**
 * Función que cumple hoy una tecla de BASE.
 * @param {number} pos - Posición de la tecla.
 * @returns {string|null} Identificador de función ('space', 'nav'…) o null si es otra cosa.
 */
function funcionEn(pos) {
  const capas = estado.keymap.layers;
  const a = capas[0].keys[pos];
  if (a.mo != null && !a.k) return capas[1] && a.mo === capas[1].id ? 'nav' : capas[2] && a.mo === capas[2].id ? 'sym' : null;
  return ID_TECLA[a.k] || null;
}

/**
 * Funciones a repartir, con su uso estimado (fracción de pulsaciones) y si se pulsan (0) o se mantienen (1).
 * @param {string|null} manoNav - Mano obligada para NAV (SYM va a la contraria); null = sin restricción.
 * @param {boolean} shiftPulgar - true: un Shift en un pulgar; false: un Shift en cada meñique.
 * @returns {object[]} Funciones con peso mayor que cero.
 */
function funcionesCfg(manoNav, shiftPulgar) {
  const capas = estado.keymap.layers;
  const otra = manoNav ? (manoNav === 'L' ? 'R' : 'L') : undefined;
  const lista = [
    { id: 'space', n: 'Espacio', c: '␣', w: 0.17, t: 0, solo: 'pulgar', fijo: true },
    { id: 'bksp', n: 'Backspace', c: '⌫', w: 0.06, t: 0 },
    { id: 'nav', n: 'Capa ' + (capas[1]?.name || 'NAV'), c: capas[1]?.name || 'NAV', w: 0.04, t: 1, solo: 'pulgar', fijo: true, mano: manoNav || undefined },
    { id: 'sym', n: 'Capa ' + (capas[2]?.name || 'SYM'), c: capas[2]?.name || 'SYM', w: { prosa: 0.03, ambos: 0.05, codigo: 0.08 }[cfg.uso], t: 1, solo: 'pulgar', fijo: true, mano: otra },
    ...(shiftPulgar
      ? [{ id: 'shift', n: 'Shift', c: '⇧', w: 0.04, t: 1, solo: 'pulgar', fijo: true }]
      : [{ id: 'shiftL', n: 'Shift izquierdo', c: '⇧', w: 0.02, t: 1, solo: 'exterior', mano: 'L', fijo: true },
         { id: 'shiftR', n: 'Shift derecho', c: '⇧', w: 0.02, t: 1, solo: 'exterior', mano: 'R', fijo: true }]),
    { id: 'ctrl', n: 'Ctrl', c: 'Ctrl', w: 0.03, t: 1 },
    { id: 'enter', n: 'Enter', c: '⏎', w: 0.02, t: 0 },
    { id: 'tab', n: 'Tab', c: 'Tab', w: cfg.uso === 'prosa' ? 0.01 : 0.02, t: 0 },
    { id: 'esc', n: 'Esc', c: 'Esc', w: cfg.esc ? 0.03 : 0.005, t: 0 },
    { id: 'altgr', n: 'AltGr', c: 'AltGr', w: { altgr: 0.02, latam: 0.005, comilla: 0 }[cfg.tildes], t: 1 },
    { id: 'win', n: 'Win', c: 'Win', w: 0.003, t: 1 },
  ];
  return lista.filter((f) => f.w > 0);
}

/**
 * Calcula la distribución de menor esfuerzo y la compara con la actual.
 * @returns {{actual: number, donde: object, coste: number, funcs: object[], sitio: object, shiftPulgar: boolean}} Resultado.
 * @flow
 * 1. Convierte las notas del usuario en esfuerzo por tecla
 * 2. Evalúa la distribución actual con el mismo modelo
 * 3. Resuelve las cuatro variantes (NAV a cada mano × Shift en pulgar o meñiques) y se queda con la mejor
 */
function proponer() {
  const slots = [];
  for (const mano of ['L', 'R']) {
    for (const pos of PULGARES[mano]) slots.push({ pos, mano, tipo: 'pulgar', c: ESFUERZO.pulgar[pos === cfg.reposo[mano] ? 0 : cfg.nota[pos]] });
    for (const pos of EXTERIOR[mano]) slots.push({ pos, mano, tipo: 'exterior', c: ESFUERZO.exterior[cfg.nota[pos]] });
  }
  const donde = {};
  for (const s of slots) {
    let id = funcionEn(s.pos);
    if (id === 'shift' && s.tipo === 'exterior') id = 'shift' + s.mano;
    if (id && !donde[id]) donde[id] = s;
  }
  const evaluar = (funcs, sitio) => funcs.reduce((t, f) => t + f.w * 100 * (sitio[f.id] ? sitio[f.id].c[f.t] : SIN_SITIO), 0);
  let mejor = null;
  for (const manoNav of ['L', 'R']) {
    for (const shiftPulgar of [true, false]) {
      const funcs = funcionesCfg(manoNav, shiftPulgar);
      const sitio = resolver(funcs, slots, donde);
      const coste = evaluar(funcs, sitio);
      if (!mejor || coste < mejor.coste - 1e-9) mejor = { coste, funcs, sitio, shiftPulgar };
    }
  }
  return { actual: evaluar(funcionesCfg(null, !!donde.shift), donde), donde, ...mejor };
}

/**
 * Dibuja una mano semitransparente con las yemas sobre la fila central.
 * @param {string} lado - 'L' o 'R'.
 * @param {number} u - Píxeles por unidad de tecla.
 * @param {number} pulgar - Tecla sobre la que se dibuja el pulgar.
 * @param {number|null} menique - Tecla a la que se estira el meñique (null = fila central).
 * @returns {string} Grupo SVG.
 */
function dibujarMano(lado, u, pulgar, menique) {
  const layout = estado.keymap.layout;
  const limites = limitesDisposicion(layout);
  const c = (pos) => centro(layout[pos], u, limites);
  const base = DEDOS[lado].map(c);
  const puntas = base.slice();
  if (menique != null) puntas[0] = c(menique);
  const px = base.reduce((t, p) => t + p[0], 0) / 4;
  const py = Math.max(...base.map((p) => p[1])) + 2.7 * u;
  const hacia = lado === 'L' ? 1 : -1;
  const dedo = (x1, y1, [x2, y2], grosor) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke-width="${grosor * u}"/>`;
  return `<g class="mano"><ellipse cx="${px}" cy="${py}" rx="${1.6 * u}" ry="${1.2 * u}" stroke="none"/>` +
    puntas.map((p, i) => dedo(base[i][0] * 0.75 + px * 0.25, py - 0.8 * u, p, i === 0 ? 0.5 : 0.6)).join('') +
    dedo(px + hacia * 1.2 * u, py - 0.5 * u, c(pulgar), 0.7) + '</g>';
}

/**
 * Pinta el paso actual de «Tu configuración».
 * @returns {void}
 */
function pintarAsistente() {
  const capas = estado.keymap.layers;
  if (capas[0].keys.length !== 42 || capas.length < 3) {
    $('asistente').innerHTML = '<p>Esta sección necesita un Toucan de 42 teclas con sus capas leídas. Pulsa «Leer mi teclado» primero.</p>';
    return;
  }
  const pasos = pasosCfg();
  cfg.paso = Math.max(0, Math.min(cfg.paso, pasos.length - 1));
  guardar('config', cfg);
  const paso = pasos[cfg.paso];
  const lado = { L: 'izquierda', R: 'derecha' };
  const avanzar = () => { cfg.paso++; pintarAsistente(); $('asistente').querySelector('h3')?.focus(); };
  const textoBase = (pos) => etiqueta(capas[0].keys[pos], estado.tabla, capas);
  let titulo = '', texto = '', extra = '', manos = [], alClic = null, opciones = [];
  let porTecla = (pos) => ({ texto: textoBase(pos), clase: 'heredada' });
  let conTeclado = true;

  if (paso.t === 'intro') {
    titulo = 'Medir tu alcance';
    texto = 'Voy a medir qué teclas alcanzas sin esfuerzo y calcular con eso dónde conviene cada función. Siéntate como escribes normalmente, apoya los índices en F y J y relaja las manos. Responde lo que sientes, no lo que crees que debería ser. Durante las pruebas no importa lo que escriban las teclas; si se abre el menú de Windows, ciérralo.';
    manos = ['L', 'R'].map((m) => ({ lado: m, pulgar: cfg.reposo[m] ?? PULGARES[m][1], menique: null }));
    opciones = [['Empezar', avanzar]];
  } else if (paso.t === 'reposo') {
    titulo = `Pulgar de la mano ${lado[paso.mano]} en reposo`;
    texto = `Coloca la mano ${lado[paso.mano]} en la fila central y relájala. Sin mirar el teclado, deja caer el pulgar. Ahora mira: ¿sobre qué tecla quedó? Haz clic en ella en el dibujo.`;
    porTecla = (pos) => ({ texto: textoBase(pos), clase: PULGARES[paso.mano].includes(pos) ? 'opcion' + (cfg.reposo[paso.mano] === pos ? ' pulsar' : '') : 'heredada' });
    manos = [{ lado: paso.mano, pulgar: cfg.reposo[paso.mano] ?? PULGARES[paso.mano][1], menique: null }];
    alClic = (pos) => { if (PULGARES[paso.mano].includes(pos)) { cfg.reposo[paso.mano] = pos; avanzar(); } };
  } else if (paso.t === 'nota') {
    const esPulgar = paso.dedo === 'pulgar';
    titulo = `${esPulgar ? 'Pulgar' : 'Meñique'} de la mano ${lado[paso.mano]}: tecla marcada`;
    texto = esPulgar
      ? 'Con los cuatro dedos quietos en la fila central, pulsa la tecla marcada con el pulgar varias veces. Después mantenla pulsada y, con esa misma mano, pulsa una por una las cuatro teclas de la fila central.'
      : `Con el índice quieto en ${paso.mano === 'L' ? 'F' : 'J'}, pulsa la tecla marcada con el meñique varias veces. Después mantenla pulsada y pulsa una letra con otro dedo de esa misma mano.`;
    porTecla = (pos) => ({ texto: textoBase(pos), clase: pos === paso.pos ? 'pulsar' : 'heredada' });
    manos = [{ lado: paso.mano, pulgar: esPulgar ? paso.pos : cfg.reposo[paso.mano], menique: esPulgar ? null : paso.pos }];
    const elegida = (n) => (cfg.nota[paso.pos] === n ? ' (tu respuesta anterior)' : '');
    const poner = (n) => () => { cfg.nota[paso.pos] = n; avanzar(); };
    opciones = [
      ['Cómodo: la mano no se mueve' + elegida(1), poner(1)],
      ['Alcanzable: noto el estiramiento' + elegida(2), poner(2)],
      ['Forzado: muevo la mano o se me levanta algún dedo' + elegida(3), poner(3)],
    ];
  } else if (paso.t === 'pregunta') {
    conTeclado = false;
    const poner = (valor) => () => { cfg[paso.id] = valor; avanzar(); };
    if (paso.id === 'uso') {
      titulo = '¿Qué escribes más?';
      opciones = [['Texto: correos, documentos, chat', poner('prosa')], ['Texto y código a partes iguales', poner('ambos')], ['Código o fórmulas con muchos símbolos', poner('codigo')]];
    } else if (paso.id === 'tildes') {
      titulo = '¿Cómo escribes las tildes y la ñ?';
      opciones = [['Windows en inglés internacional: comilla y luego la vocal', poner('comilla')], ['Windows en inglés internacional: AltGr más la letra', poner('altgr')], ['Windows en español: tienen tecla propia', poner('latam')]];
    } else {
      titulo = '¿Usas Vim u otro programa donde Esc se pulsa constantemente?';
      opciones = [['No', poner(false)], ['Sí', poner(true)]];
    }
  } else {
    const r = proponer();
    const porPos = {};
    for (const f of r.funcs) if (r.sitio[f.id]) porPos[r.sitio[f.id].pos] = f;
    const familia = (id) => (id ? id.replace(/^shift.*/, 'shift') : null);
    const reasignables = [...PULGARES.L, ...PULGARES.R, ...EXTERIOR.L, ...EXTERIOR.R];
    porTecla = (pos) => {
      if (!reasignables.includes(pos)) return { texto: textoBase(pos), clase: 'heredada' };
      const f = porPos[pos];
      return { texto: f ? f.c : '·', clase: familia(f?.id) !== familia(funcionEn(pos)) ? 'cambio' : '' };
    };
    const mejora = r.actual > 0 ? Math.round((1 - r.coste / r.actual) * 100) : 0;
    const ahora = (f) => {
      const sitios = f.id.startsWith('shift') ? [r.donde.shift, r.donde.shiftL, r.donde.shiftR] : [r.donde[f.id]];
      return sitios.filter(Boolean).map((s) => NOMBRE_POS[s.pos]).join(' + ') || 'no está en BASE';
    };
    const filas = r.funcs.slice().sort((a, b) => b.w - a.w).map((f) => {
      const s = r.sitio[f.id];
      return `<tr><td>${escapar(f.n)}</td><td class="num">${(f.w * 100).toFixed(1)} %</td><td>${ahora(f)}</td><td>${s ? NOMBRE_POS[s.pos] : 'a una capa'}</td><td class="num">${(f.w * 100 * (s ? s.c[f.t] : SIN_SITIO)).toFixed(1)}</td></tr>`;
    }).join('');

    const manoDeCapa = (i) => {
      let izq = 0, der = 0;
      capas[i].keys.forEach((a, pos) => {
        if (pos >= 36 || !a.k || (ESPECIALES[a.k] && !a.k.startsWith('Arrow'))) return;
        const col = pos % 12;
        if (col >= 1 && col <= 5) izq++; else if (col >= 6 && col <= 10) der++;
      });
      return izq === der ? null : izq > der ? 'L' : 'R';
    };
    const notas = [];
    [['nav', 1], ['sym', 2]].forEach(([id, i]) => {
      if (r.sitio[id].mano === manoDeCapa(i)) notas.push(`La capa ${escapar(capas[i].name || i)} se mantiene con el pulgar de la mano ${lado[r.sitio[id].mano]} y la mayoría de sus teclas están en esa misma mano. Muévelas a la mano contraria: mantener con una mano y pulsar con la otra es más rápido.`);
    });
    [['nav', 1], ['sym', 2]].forEach(([id, i]) => {
      const tapados = r.funcs.filter((f) => f.t === 0 && r.sitio[f.id]?.tipo === 'pulgar' && r.sitio[f.id].mano === r.sitio[id].mano).map((f) => f.n);
      if (tapados.length) notas.push(`Mientras mantienes ${escapar(capas[i].name || 'la capa ' + i)} con el pulgar de la mano ${lado[r.sitio[id].mano]}, ese pulgar no puede pulsar a la vez: ${escapar(tapados.join(', '))}. Lo que necesites dentro de esa capa, repítelo en una tecla de la otra mano.`);
    });
    if (cfg.tildes === 'comilla') notas.push('AltGr no entra en el cálculo: con tu forma de escribir tildes no lo usas.');
    notas.push(r.shiftPulgar
      ? 'Un solo Shift en el pulgar sirve para las dos manos, porque el pulgar se mueve independiente de los dedos.'
      : 'Con un Shift en cada meñique, usa siempre el de la mano contraria a la letra.');
    const fuera = r.funcs.filter((f) => !r.sitio[f.id]).map((f) => f.n);
    if (fuera.length) notas.push(`No ganan sitio en BASE: ${escapar(fuera.join(', '))}. Ponlas en la capa ${escapar(capas[1].name || 'NAV')}.`);
    notas.push('Para aplicarlo: cambia BASE en zmk.studio, deja «Transparent» esas mismas teclas en las demás capas, guarda y vuelve a pulsar «Leer mi teclado».');

    titulo = 'Distribución propuesta';
    texto = 'Las teclas con borde verde cambian respecto a tu BASE actual; un punto indica una tecla que queda libre. Las letras no se tocan.';
    extra = `<div class="resumen">Esfuerzo por cada 100 pulsaciones: actual <b>${r.actual.toFixed(1)}</b> → propuesta <b>${r.coste.toFixed(1)}</b> (${mejora > 0 ? '−' + mejora + ' %' : 'sin mejora'})</div>` +
      (mejora < 3 ? '<p>Tu distribución actual ya está en el óptimo de este modelo, o muy cerca.</p>' : '') +
      `<div class="tabla-resumen" tabindex="0" role="region" aria-label="Comparación de la distribución actual y propuesta"><table><tr><th>Función</th><th class="num">Uso estimado</th><th>Ahora</th><th>Propuesta</th><th class="num">Esfuerzo</th></tr>${filas}</table></div><p class="ayuda ayuda-tabla">Desliza la tabla para ver todas las columnas.</p>` +
      `<ul class="notas">${notas.map((n) => `<li>${n}</li>`).join('')}</ul>` +
      '<p class="modelo">Modelo: esfuerzo = uso estimado × dificultad que declaraste para cada tecla; mantener pesa más que pulsar, y una función fuera de BASE cuenta 5. Reposo 1; cómodo 1,3–2; alcanzable 2–4; forzado 4–9. Los porcentajes de uso son estimaciones generales, no medidas tuyas. A igual esfuerzo se conserva la posición actual. El cálculo prueba NAV en cada mano y Shift en pulgar o en meñiques, y muestra la combinación de menor esfuerzo.</p>';
    opciones = [['Repetir la medición', () => { Object.assign(cfg, { paso: 0, reposo: {}, nota: {} }); pintarAsistente(); }]];
  }

  accionesCfg = { opciones, alClic };
  $('asistente').innerHTML = `<div class="progreso">Paso ${cfg.paso + 1} de ${pasos.length}</div><h3 tabindex="-1">${titulo}</h3><p>${texto}</p>` +
    (conTeclado ? '<div id="tecladoCfg"></div>' : '') + extra +
    `<div class="opciones">${opciones.map((o, i) => `<button data-op="${i}">${o[0]}</button>`).join('')}</div>` +
    `<div class="pie">${cfg.paso ? '<button data-ir="atras">Atrás</button>' : ''}<button data-ir="cerrar">Volver a practicar</button></div>`;
  if (!conTeclado) return;
  const caja = $('tecladoCfg');
  const u = dibujarTeclado(caja, estado.keymap.layout, $('asistente').clientWidth - 2, porTecla);
  if (manos.length) {
    caja.style.marginBottom = 2.4 * u + 'px';
    caja.insertAdjacentHTML('beforeend', `<svg>${manos.map((m) => dibujarMano(m.lado, u, m.pulgar, m.menique)).join('')}</svg>`);
  }
}

/**
 * Abre o cierra la sección «Tu configuración».
 * @param {boolean} abrir - true para mostrar el asistente, false para volver a practicar.
 * @returns {void}
 */
function alternarConfiguracion(abrir) {
  pausarPractica();
  $('configuracion').hidden = !abrir;
  $('practica').hidden = abrir;
  $('config').textContent = abrir ? 'Volver a practicar' : 'Tu configuración';
  if (abrir) pintarAsistente(); else { pintar(); $('entrada').focus(); }
}

$('config').addEventListener('click', () => alternarConfiguracion($('configuracion').hidden));
$('asistente').addEventListener('click', (e) => {
  const boton = e.target.closest('button');
  const teclaPulsada = e.target.closest('.tecla.opcion');
  if (boton?.dataset.op) accionesCfg.opciones[boton.dataset.op][1]();
  else if (boton?.dataset.ir === 'atras') { cfg.paso--; pintarAsistente(); }
  else if (boton?.dataset.ir === 'cerrar') alternarConfiguracion(false);
  else if (teclaPulsada && accionesCfg.alClic) accionesCfg.alClic(Number(teclaPulsada.dataset.pos));
});

$('leccion').innerHTML = LECCIONES.map(([id, nombre]) => `<option value="${id}">${nombre}</option>`).join('');
$('leccion').value = estado.leccion;
$('sistema').value = estado.sistema;

$('leccion').addEventListener('change', (e) => {
  if (e.target.value === 'propio') {
    const texto = prompt('Pega el texto que quieres practicar:', estado.propio);
    if (texto === null) { e.target.value = estado.leccion; return; }
    estado.propio = texto.normalize('NFC').slice(0, 50000);
    guardar('propio', estado.propio);
  }
  estado.leccion = e.target.value;
  estado.cola = [];
  guardar('leccion', estado.leccion);
  nuevaLinea();
});
$('sistema').addEventListener('change', (e) => {
  estado.sistema = e.target.value;
  guardar('sistema', estado.sistema);
  preparar();
});
$('ver').addEventListener('click', () => { estado.verTeclado = !estado.verTeclado; guardar('ver', estado.verTeclado); pintar(); });
$('reiniciar').addEventListener('click', () => {
  if (!confirm('¿Borrar todas las estadísticas guardadas?')) return;
  Object.assign(estado, { porCaracter: Object.create(null), aciertos: 0, errores: 0, msActivos: 0, inicioTramo: null });
  guardar('caracteres', {});
  nuevaLinea();
});
$('leer').addEventListener('click', async () => {
  if ($('leer').disabled) return;
  $('leer').disabled = true;
  pausarPractica();
  try {
    avisar('Elige el puerto del teclado en la ventana del navegador…');
    aplicarKeymap(await leerTeclado(avisar));
    avisar(`Listo: ${estado.keymap.layers.length} capas leídas (${estado.keymap.layers.map((c) => c.name || c.id).join(', ')}).`);
  } catch (error) {
    if (error.name === 'NotFoundError') avisar('');
    else avisar(error.name === 'NetworkError' ? 'No se pudo abrir el puerto. Cierra la pestaña de zmk.studio y vuelve a intentarlo.' : error.message, true);
  } finally { $('leer').disabled = false; }
});
$('guardar').addEventListener('click', () => {
  const enlace = document.createElement('a');
  enlace.href = URL.createObjectURL(new Blob([JSON.stringify(estado.keymap)], { type: 'application/json' }));
  enlace.download = 'toucan-keymap.json';
  enlace.click();
  URL.revokeObjectURL(enlace.href);
});
$('cargar').addEventListener('click', () => $('archivo').click());
$('archivo').addEventListener('change', async (e) => {
  const archivo = e.target.files?.[0];
  if (!archivo) return;
  try {
    if (archivo.size > LIMITE_ARCHIVO) throw new Error('El archivo supera el límite de 1 MB.');
    const leido = JSON.parse(await archivo.text());
    aplicarKeymap(leido);
    avisar('Configuración cargada.');
  } catch (error) { avisar('No se cargó el archivo. ' + (error instanceof SyntaxError ? 'El contenido no es un JSON válido.' : error.message), true); }
  e.target.value = '';
});
/**
 * Cambia la capa que muestra el dibujo; repetir la misma vuelve a «Automático».
 * @param {number|string} vista - Índice de capa, 'altgr' o 'auto'.
 * @returns {void}
 */
function elegirVista(vista) {
  estado.vista = estado.vista === vista ? 'auto' : vista;
  pintar();
}

/**
 * Sigue si Shift o AltGr están mantenidos para mostrar lo que escribirían las teclas.
 * @param {KeyboardEvent} [evento] - Pulsación o suelta; sin evento se dan por soltadas.
 * @returns {void}
 */
function alCambiarModificadores(evento) {
  const teclas = { shift: !!evento?.shiftKey, altgr: !!evento && conAltgr(evento) };
  if (teclas.shift === estado.teclas.shift && teclas.altgr === estado.teclas.altgr) return;
  estado.teclas = teclas;
  pintar();
}

$('capa').addEventListener('click', (e) => {
  const boton = e.target.closest('button');
  if (!boton) return;
  const vista = boton.dataset.vista;
  elegirVista(vista === 'auto' || vista === 'altgr' ? vista : Number(vista));
});
$('teclado').addEventListener('click', (e) => {
  const pulsada = e.target.closest('.tecla');
  if (!pulsada) return;
  const capas = estado.keymap.layers;
  const asignacion = capas[0].keys[pulsada.dataset.pos];
  if (asignacion.k === 'AltRight' || asignacion.hold?.k === 'AltRight') elegirVista('altgr');
  else if (asignacion.mo != null && capas.some((c, i) => i > 0 && c.id === asignacion.mo)) elegirVista(capas.findIndex((c) => c.id === asignacion.mo));
});
document.addEventListener('keydown', alCambiarModificadores);
document.addEventListener('keyup', alCambiarModificadores);
window.addEventListener('blur', () => { pausarPractica(); alCambiarModificadores(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) pausarPractica(); });
window.addEventListener('pagehide', pausarPractica);
$('entrada').addEventListener('keydown', alPulsar);
$('entrada').addEventListener('input', alEscribir);
$('entrada').addEventListener('compositionstart', () => { estado.componiendo = true; iniciarTramo(); });
$('entrada').addEventListener('compositionend', () => {
  estado.componiendo = false;
  // Algunos navegadores emiten el último input antes de compositionend, otros después.
  setTimeout(alEscribir, 0);
});
$('entrada').addEventListener('blur', pausarPractica);
for (const tipo of ['paste', 'drop']) $('entrada').addEventListener(tipo, (e) => {
  e.preventDefault();
  avisar('Para practicar un texto pegado, elige «Texto propio…» en Lección.');
});
setInterval(() => { if (estado.inicioTramo !== null) pintarCifras(); }, 500);
window.addEventListener('resize', () => ($('configuracion').hidden ? pintar() : pintarAsistente()));
if (avisoInicial) avisar(avisoInicial);
preparar();

// #endregion
