// #region SERVICES

/**
 * Lee un entero varint de protobuf.
 * @param {Uint8Array} b - Bytes.
 * @param {number} i - Posición inicial.
 * @returns {[number, number]} Valor y posición siguiente.
 */
function leerVarint(b, i) {
  let valor = 0, factor = 1;
  for (;;) {
    const byte = b[i++];
    valor += (byte & 0x7f) * factor;
    factor *= 128;
    if (!(byte & 0x80) || i >= b.length) return [valor, i];
  }
}

/**
 * Escribe un entero como varint de protobuf.
 * @param {number} n - Entero no negativo.
 * @returns {number[]} Bytes del varint.
 */
function varint(n) {
  const bytes = [];
  while (n > 127) { bytes.push((n % 128) | 0x80); n = Math.floor(n / 128); }
  bytes.push(n);
  return bytes;
}

/**
 * Decodifica un mensaje protobuf sin esquema.
 * @param {Uint8Array} b - Bytes del mensaje.
 * @returns {Array<{f: number, v?: number, b?: Uint8Array}>} Campos en orden: número, y valor entero o bytes.
 */
function campos(b) {
  const salida = [];
  let i = 0;
  while (i < b.length) {
    let etiquetaCampo, largo, valor;
    [etiquetaCampo, i] = leerVarint(b, i);
    const f = Math.floor(etiquetaCampo / 8), tipo = etiquetaCampo & 7;
    if (tipo === 0) { [valor, i] = leerVarint(b, i); salida.push({ f, v: valor }); }
    else if (tipo === 2) { [largo, i] = leerVarint(b, i); salida.push({ f, b: b.subarray(i, i + largo) }); i += largo; }
    else if (tipo === 5) i += 4;
    else if (tipo === 1) i += 8;
    else break;
  }
  return salida;
}

/** Primer campo con ese número, o undefined. */
const campo = (lista, f) => lista.find((c) => c.f === f);
/** Entero con signo en zigzag → número. */
const zigzag = (v) => (v >>> 1) ^ -(v & 1);
/** Entero de un campo, 0 si falta (protobuf omite los ceros). */
const entero = (lista, f) => (campo(lista, f) || { v: 0 }).v;

/**
 * Convierte una asignación de ZMK Studio a la forma del entrenador.
 * @param {string} conducta - Nombre de la conducta en minúsculas ('key press', 'momentary layer'…).
 * @param {number} p1 - Primer parámetro.
 * @param {number} p2 - Segundo parámetro.
 * @returns {object} Asignación normalizada.
 */
function convertirAsignacion(conducta, p1, p2) {
  const deUso = (p) => {
    const mods = (p >>> 24) & 0xff, pagina = (p >>> 16) & 0xff || 7;
    const codigo = pagina === 7 ? HID[p & 0xffff] : null;
    if (!codigo || mods & ~0x62) return { o: codigo ? '+' + (ESPECIALES[codigo] || codigo.replace(/^Key|^Digit/, '')) : '…' };
    return tecla(codigo, !!(mods & 0x22), !!(mods & 0x40));
  };
  if (conducta === 'key press') return deUso(p1);
  if (conducta === 'mod-tap') {
    const tap = deUso(p2), hold = deUso(p1);
    return tap.k && hold.k ? { ...tap, hold } : { o: 'Mod-tap' };
  }
  if (conducta === 'layer-tap') {
    const tap = deUso(p2);
    return tap.k ? { ...tap, mo: p1 } : { mo: p1 };
  }
  if (conducta === 'momentary layer') return { mo: p1 };
  if (conducta === 'transparent') return { tr: 1 };
  if (conducta === 'none') return { o: '' };
  const cortas = { bluetooth: 'BT', 'studio unlock': 'Studio', 'mouse key press': 'Clic', 'to layer': 'Ir', 'toggle layer': 'Fijar',
    'sticky key': 'Fija', 'sticky layer': 'Capa', 'caps word': 'Mayús', bootloader: 'Boot', reset: 'Reset' };
  return { o: cortas[conducta] || conducta.slice(0, 6) };
}

/**
 * Lee el keymap y la forma física del teclado por USB con el protocolo de ZMK Studio.
 * @param {(mensaje: string) => void} avisar - Recibe mensajes de progreso.
 * @returns {Promise<{layers: object[], layout: object[]}>} Keymap normalizado.
 * @flow
 * 1. Abre el puerto serie que el usuario elige
 * 2. Espera a que el teclado esté desbloqueado
 * 3. Pide los nombres de las conductas, las capas y la forma física
 * 4. Cierra el puerto y devuelve el keymap normalizado
 */
async function leerTeclado(avisar) {
  if (!('serial' in navigator)) throw new Error('Este navegador no puede hablar con el teclado. Usa Chrome o Edge en el computador.');
  const puerto = await navigator.serial.requestPort({});
  await puerto.open({ baudRate: 12500 });
  const escritor = puerto.writable.getWriter();
  const lector = puerto.readable.getReader();
  const pendientes = new Map();
  let siguiente = 1;

  const recibir = (async () => {
    let trama = null, escapado = false;
    try {
      for (;;) {
        const { value, done } = await lector.read();
        if (done) return;
        for (const byte of value) {
          if (trama === null) { if (byte === 0xab) trama = []; continue; }
          if (escapado) { trama.push(byte); escapado = false; continue; }
          if (byte === 0xac) { escapado = true; continue; }
          if (byte !== 0xad) { trama.push(byte); continue; }
          const respuesta = campo(campos(Uint8Array.from(trama)), 1);
          trama = null;
          if (!respuesta) continue;
          const partes = campos(respuesta.b);
          const resolver = pendientes.get(entero(partes, 1));
          if (resolver) resolver(partes);
        }
      }
    } catch { /* puerto cerrado */ }
  })();

  const pedir = (subsistema, cuerpo) => new Promise((resolver, rechazar) => {
    const id = siguiente++;
    const reloj = setTimeout(() => { pendientes.delete(id); rechazar(new Error('El teclado no respondió. Comprueba que es la mitad izquierda y que zmk.studio está cerrado.')); }, 4000);
    pendientes.set(id, (partes) => {
      clearTimeout(reloj);
      pendientes.delete(id);
      const dato = campo(partes, subsistema);
      if (dato) resolver(campos(dato.b));
      else rechazar(new Error('El teclado rechazó la petición.'));
    });
    const mensaje = [0x08, ...varint(id), (subsistema << 3) | 2, ...varint(cuerpo.length), ...cuerpo];
    const trama = [0xab];
    for (const byte of mensaje) { if (byte >= 0xab && byte <= 0xad) trama.push(0xac); trama.push(byte); }
    trama.push(0xad);
    escritor.write(Uint8Array.from(trama)).catch((error) => {
      clearTimeout(reloj);
      pendientes.delete(id);
      rechazar(error);
    });
  });

  try {
    for (let intento = 0; ; intento++) {
      if (entero(await pedir(3, [0x10, 1]), 2) === 1) break;
      if (intento > 80) throw new Error('El teclado sigue bloqueado.');
      avisar('Desbloquea el teclado: mantén la tecla de la capa NAV y pulsa la tecla «Studio» (la Z de fábrica)…');
      await new Promise((r) => setTimeout(r, 750));
    }

    avisar('Leyendo las conductas…');
    const lista = campo(await pedir(4, [0x08, 1]), 1);
    const ids = [];
    for (const c of lista ? campos(lista.b) : []) {
      if (c.b) { for (let i = 0; i < c.b.length;) { let v; [v, i] = leerVarint(c.b, i); ids.push(v); } } else ids.push(c.v);
    }
    const nombres = new Map();
    for (const id of ids) {
      const interno = [0x08, ...varint(id)];
      const detalle = campo(await pedir(4, [0x12, ...varint(interno.length), ...interno]), 2);
      const nombre = detalle && campo(campos(detalle.b), 2);
      nombres.set(id, nombre ? new TextDecoder().decode(nombre.b).trim().toLowerCase() : '');
    }

    avisar('Leyendo las capas…');
    const mapa = campo(await pedir(5, [0x08, 1]), 1);
    const layers = campos(mapa.b).filter((c) => c.f === 1).map((c) => {
      const partes = campos(c.b);
      const nombre = campo(partes, 2);
      const keys = partes.filter((p) => p.f === 3).map((p) => {
        const a = campos(p.b);
        return convertirAsignacion(nombres.get(zigzag(entero(a, 1))) || '', entero(a, 2), entero(a, 3));
      });
      return { id: entero(partes, 1), name: nombre ? new TextDecoder().decode(nombre.b) : '', keys };
    });

    avisar('Leyendo la forma del teclado…');
    let layout = disposicionPorDefecto();
    const formas = campo(await pedir(5, [0x30, 1]), 6);
    if (formas) {
      const partes = campos(formas.b);
      const activa = partes.filter((p) => p.f === 2)[entero(partes, 1)];
      if (activa) {
        layout = campos(activa.b).filter((p) => p.f === 2).map((p) => {
          const k = campos(p.b);
          const z = (f) => zigzag(entero(k, f));
          return { w: z(1), h: z(2), x: z(3), y: z(4), r: z(5), rx: z(6), ry: z(7) };
        });
      }
    }
    if (!layers.length || !layers[0].keys.length) throw new Error('El teclado no devolvió ninguna capa.');
    if (layout.length !== layers[0].keys.length) layout = disposicionPorDefecto();
    return { layers, layout };
  } finally {
    try { await lector.cancel(); } catch { /* ya cerrado */ }
    await recibir;
    try { escritor.releaseLock(); lector.releaseLock(); await puerto.close(); } catch { /* ya cerrado */ }
  }
}

// #endregion

