/**
 * Cómo se ve la carga en la web (entrega «carga» de Design, 03-11).
 *
 * Las mismas piezas que la app —el aro que se llena, los huesos, el botón
 * que trabaja y «No pudimos cargar…»— y los mismos tiempos y textos, que
 * viven en `AroReglas.CARGA` (reglas.js) para que no diverjan. Esta pieza
 * solo los pinta. Se carga DESPUÉS de reglas.js.
 *
 * La regla, que es de Design y no se reabre aquí:
 *   - menos de 0,4 s → nada;
 *   - sabemos la forma → esqueleto (clase `aro-hueso` en el markup de cada
 *     pantalla, con la medida de la línea que reemplaza);
 *   - es un paso → el aro de 20 dentro del botón, sin cambiar su texto
 *     (`AroCarga.paso` + `AroCarga.enBoton`);
 *   - no sabemos qué pintar → velo con el aro de 54 y «Un momento».
 *
 * «Reducir movimiento» lo resuelve el CSS de abajo: nada late ni gira, los
 * huesos quietos al 8 %, el aro con los seis puntos encendidos, y el
 * fundido de 180 ms sin tandas.
 */
(function () {
  if (typeof window === 'undefined') return;
  if (window.AroCarga) return;

  var C = (window.AroReglas && window.AroReglas.CARGA) || null;
  if (!C) {
    // Sin reglas.js no hay tiempos ni textos: mejor fallar alto que pintar
    // un aro con números inventados.
    throw new Error('carga.js necesita reglas.js cargado antes');
  }
  var T = C.tiempo;
  var X = C.texto;
  var A = C.aro;

  // ── El CSS, una vez por página ────────────────────────────────────────
  var pct = function (f) { return Math.round(f * 100) + '%'; };
  var apagado = A.puntoApagado;
  var css = '';
  A.enciende.forEach(function (e, i) {
    css += '@keyframes aroCargaP' + i + '{0%,' + pct(e - 0.01) + '{opacity:' + apagado + '}' +
      pct(e) + ',' + pct(A.mantiene) + '{opacity:1}' + pct(A.apaga) + ',100%{opacity:' + apagado + '}}';
    css += '.aro-carga .p' + i + '{opacity:' + apagado + ';animation:aroCargaP' + i + ' ' + T.vueltaAro + 'ms linear infinite}';
  });
  css +=
    '@keyframes aroHuesoLatido{0%,100%{opacity:1}50%{opacity:.5}}' +
    '@keyframes aroEntra{from{opacity:0}to{opacity:1}}' +
    '.aro-hueso{background:rgba(20,52,42,' + C.hueso.sobreCrema + ');border-radius:7px;animation:aroHuesoLatido ' + T.latido + 'ms ease-in-out infinite}' +
    '.aro-hueso.verde{background:rgba(250,243,228,' + C.hueso.sobreVerde + ')}' +
    '.aro-entra{animation:aroEntra ' + T.transicion + 'ms ease-out both}' +
    '.aro-entra.t2{animation-delay:' + T.escalon + 'ms}' +
    '.aro-entra.t3{animation-delay:' + (T.escalon * 2) + 'ms}' +
    // El velo y el aro suelto no se enseñan antes del umbral: entran con
    // un retraso del umbral, así que si la página llega antes, no se ven.
    '.aro-tras-umbral{animation:aroEntra ' + T.transicion + 'ms ease-out ' + T.umbral + 'ms both}' +
    '.aro-apagado{pointer-events:none;opacity:.55}' +
    '@media (prefers-reduced-motion: reduce){' +
    '.aro-hueso{animation:none}' +
    '.aro-carga circle[class^="p"]{animation:none!important;opacity:1!important}' +
    '.aro-entra.t2,.aro-entra.t3{animation-delay:0ms}' +
    '}';
  var meter = function () {
    if (document.getElementById('aro-carga-css')) return;
    var s = document.createElement('style');
    s.id = 'aro-carga-css';
    s.textContent = css;
    (document.head || document.documentElement).appendChild(s);
  };
  if (document.head) meter();
  else document.addEventListener('DOMContentLoaded', meter);

  var e = function () {
    var R = window.React;
    return R.createElement.apply(R, arguments);
  };

  var PUNTOS = [[20.6, 12], [16.3, 19.45], [7.7, 19.45], [3.4, 12], [7.7, 4.55], [16.3, 4.55]];
  var tamano = function (t) {
    // Solo cuatro tamaños. 36 → 40; 18 y 22 → 20.
    var ok = A.tamanos;
    if (ok.indexOf(t) >= 0) return t;
    return ok.reduce(function (m, x) { return Math.abs(x - t) < Math.abs(m - t) ? x : m; }, ok[0]);
  };

  /**
   * El aro. `verde`: sobre el verde oscuro (puntos en crema y el tuyo en
   * terracota clara). Siempre `aria-hidden`: lo que se anuncia lo dice
   * quien lo contiene (el botón ocupado, «Un momento»).
   */
  var aro = function (t, op) {
    op = op || {};
    var n = tamano(t || 20);
    var verde = !!op.verde;
    var tinta = op.tinta || (verde ? '#FAF3E4' : '#14342A');
    var tuyo = verde ? A.tuyoSobreVerde : '#8F4515';
    var anillo = verde ? 'rgba(250,243,228,' + A.anillo + ')' : 'rgba(20,52,42,' + A.anillo + ')';
    var hijos = [e('circle', { key: 'a', cx: 12, cy: 12, r: 8.6, stroke: anillo, strokeWidth: 1.5 })];
    PUNTOS.forEach(function (p, i) {
      hijos.push(e('circle', { key: i, className: 'p' + i, cx: p[0], cy: p[1], r: 2.5, fill: i === 0 ? tuyo : tinta }));
    });
    return e('svg', {
      className: 'aro-carga', width: n, height: n, viewBox: '0 0 24 24', fill: 'none',
      'aria-hidden': 'true', style: { display: 'block', flex: 'none' },
    }, hijos);
  };

  var check = function (color) {
    return e('svg', { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: color || 'currentColor', strokeWidth: 2.4, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true', style: { display: 'block', flex: 'none' } },
      e('path', { d: 'M5 12.5l4.5 4.5L19 7.5' }));
  };

  /**
   * Lo que va a la izquierda del texto de un botón según su estado:
   * 'trabajando' → el aro de 20; 'listo' → el check; si no, nada.
   * El texto del botón NO cambia; lo que oye un lector de pantalla lo pone
   * `atributos()`.
   */
  var enBoton = function (estado, op) {
    if (estado === 'trabajando') return aro(20, op);
    if (estado === 'listo') return check((op && op.verde) ? (op.tinta || '#FAF3E4') : (op && op.tinta) || 'currentColor');
    return null;
  };

  /** ¿Bloquea el toque? Desde el primer instante, aunque el aro aún no salga. */
  var ocupado = function (estado) { return estado === 'ocupado' || estado === 'trabajando' || estado === 'listo'; };

  /**
   * El estilo de un botón que trabaja: mismo color, mismo texto; el relleno
   * izquierdo pasa de 24 a 18 para dejar sitio al aro (18 + aro + 10).
   * Recibe el estilo en texto (como lo llevan los .dc.html) y lo devuelve.
   */
  var estiloBoton = function (estilo, estado) {
    var s = String(estilo || '');
    if (estado === 'trabajando' || estado === 'listo') {
      s += ';display:inline-flex;align-items:center;justify-content:center;gap:10px;padding-left:18px;cursor:default';
    } else if (estado === 'ocupado') {
      s += ';cursor:default';
    }
    return s;
  };

  /**
   * El paso de un botón, con los tiempos de la entrega:
   *   - bloquea el toque al instante (`ocupado`);
   *   - el aro solo sale si tarda más del umbral (0,4 s);
   *   - una vez a la vista, se queda al menos 0,5 s;
   *   - al salir bien, check 0,6 s si `check` (sin cambio de pantalla);
   *   - si falla, vuelve al reposo y se re-lanza el error: el aviso lo pone
   *     la pantalla, encima del botón, y lo escrito se conserva.
   *
   * `comp` es la pantalla (DCLogic), `clave` el campo de su estado que
   * guarda el del botón. Devuelve lo que devuelva `trabajo`.
   */
  var paso = function (comp, clave, trabajo, op) {
    op = op || {};
    var actual = comp.state && comp.state[clave];
    if (ocupado(actual)) return Promise.resolve(undefined);
    var poner = function (v) { try { var o = {}; o[clave] = v; comp.setState(o); } catch { /* desmontada */ } };
    var visto = 0;
    poner('ocupado');
    var t = setTimeout(function () { visto = Date.now(); poner('trabajando'); }, T.umbral);
    var resto = function () {
      clearTimeout(t);
      if (!visto) return Promise.resolve();
      var falta = T.minimoVisible - (Date.now() - visto);
      return falta > 0 ? new Promise(function (r) { setTimeout(r, falta); }) : Promise.resolve();
    };
    return Promise.resolve()
      .then(trabajo)
      .then(function (res) {
        return resto().then(function () {
          if (op.check && res !== false) {
            poner('listo');
            setTimeout(function () { if (comp.state && comp.state[clave] === 'listo') poner('reposo'); }, T.check);
          } else {
            poner('reposo');
          }
          return res;
        });
      }, function (err) {
        return resto().then(function () { poner('reposo'); throw err; });
      });
  };

  /**
   * Para las pantallas que ya llevan su propio «ocupado» como booleano
   * (`guardando`, `reservandoYa`…): lo traduce al estado del botón con los
   * mismos tiempos que `paso`, sin tocar su lógica. Se llama desde
   * `renderVals` y repinta solo cuando toca (al cruzar el umbral, y al
   * cumplirse el mínimo visible).
   *   const e = AroCarga.estado(this, 'guardando');   // 'reposo' | 'ocupado' | 'trabajando'
   */
  var registro = typeof WeakMap === 'function' ? new WeakMap() : null;
  var estado = function (comp, clave, valor) {
    var v = valor !== undefined ? !!valor : !!(comp.state && comp.state[clave]);
    if (!registro) return v ? 'trabajando' : 'reposo';
    var m = registro.get(comp);
    if (!m) { m = {}; registro.set(comp, m); }
    var r = m[clave] || (m[clave] = { desde: 0, visto: 0, t: null });
    var ahora = Date.now();
    var repintar = function (ms) {
      clearTimeout(r.t);
      r.t = setTimeout(function () { try { comp.forceUpdate(); } catch { /* desmontada */ } }, ms);
    };
    if (v) {
      if (!r.desde) { r.desde = ahora; r.visto = 0; }
      var pasado = ahora - r.desde;
      if (pasado < T.umbral) { repintar(T.umbral - pasado + 10); return 'ocupado'; }
      if (!r.visto) r.visto = r.desde + T.umbral;
      return 'trabajando';
    }
    if (r.visto) {
      var falta = T.minimoVisible - (ahora - r.visto);
      if (falta > 0) { repintar(falta + 10); return 'trabajando'; }
    }
    r.desde = 0; r.visto = 0;
    return 'reposo';
  };

  /**
   * Todo lo que el markup de un botón necesita, de una vez:
   *   <button style="{{ b.estilo }}" aria-busy="{{ b.busy }}" aria-label="{{ b.etiqueta }}">{{ b.aro }}Texto fijo</button>
   * `fuente` es el estado ('reposo'|'ocupado'|'trabajando'|'listo') o el
   * nombre del booleano de la pantalla (se pasa por `estado`).
   * `accion` es lo que oye el lector de pantalla mientras trabaja
   * («Apartando tu puesto»); el texto visible no cambia.
   */
  var boton = function (comp, fuente, estilo, accion, op) {
    var e = /^(reposo|ocupado|trabajando|listo)$/.test(fuente) ? fuente : estado(comp, fuente);
    var o = ocupado(e);
    return {
      estado: e,
      ocupado: o,
      estilo: estiloBoton(estilo, e),
      aro: enBoton(e, op),
      busy: o ? 'true' : 'false',
      etiqueta: o && accion ? accion : undefined,
    };
  };

  /** Atributos de accesibilidad de un botón que trabaja. */
  var atributos = function (estado, accion) {
    var o = ocupado(estado);
    return { busy: o ? 'true' : 'false', etiqueta: o && accion ? accion : null };
  };

  /**
   * Por qué no llegó algo. `fetch` que lanza → sin red. Respuesta 5xx (o
   * cualquier otra que no sea la esperada) → es nuestro.
   */
  var motivoDe = function (err) {
    if (err && err.status) return err.status >= 500 ? 'servidor' : 'otro';
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'red';
    return err && err.name === 'TypeError' ? 'red' : 'servidor';
  };

  /** Un `fetch` que distingue «no hay red» de «el servidor dijo que no». */
  var pedir = function (url, init) {
    return fetch(url, init).then(function (r) {
      if (!r.ok) { var er = new Error('HTTP ' + r.status); er.status = r.status; er.respuesta = r; throw er; }
      return r;
    });
  };

  var ICONO_SIN_RED = 'M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.6 16a5 5 0 0 1 6.8 0';
  var iconoSinRed = function (n) {
    return e('svg', { width: n, height: n, viewBox: '0 0 24 24', fill: 'none', stroke: '#8F4515', strokeWidth: n > 20 ? 1.9 : 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true', style: { flex: 'none', display: 'block' } },
      e('path', { d: ICONO_SIN_RED }), e('circle', { cx: 12, cy: 19.3, r: 1, fill: '#8F4515' }), e('path', { d: 'M3.5 3.5l17 17' }));
  };

  /**
   * «No pudimos cargar {qué}.» Sin nada guardado: el bloque, en el sitio
   * del esqueleto. `que` es la clave de `CARGA.texto.que` (o el texto ya
   * hecho). `motivo`: 'red' | 'servidor'. `textoBoton`: Pasadas deja
   * «Volver a intentar».
   */
  var sinRespuesta = function (op) {
    op = op || {};
    var que = (X.que && X.que[op.que]) || op.que || 'esto';
    var estado = op.estado || 'reposo';
    var boton = e('button', {
      type: 'button',
      onClick: ocupado(estado) ? undefined : op.alReintentar,
      'aria-busy': ocupado(estado) ? 'true' : 'false',
      style: {
        alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 10, minHeight: 52,
        padding: estado === 'trabajando' ? '0 24px 0 18px' : '0 24px', borderRadius: 999,
        border: '1px solid rgba(20,52,42,.22)', background: 'transparent', color: '#1B5138',
        font: "600 15px/1 'Inter Tight',sans-serif", marginTop: 6, cursor: ocupado(estado) ? 'default' : 'pointer',
      },
    }, enBoton(estado), op.textoBoton || X.reintentar);
    return e('div', {
      role: 'alert',
      className: 'aro-entra',
      style: { background: '#FFFBF0', borderRadius: 22, padding: '24px 22px', display: 'flex', flexDirection: 'column', gap: 12, color: '#14342A' },
    },
      e('div', { style: { width: 44, height: 44, borderRadius: 22, background: 'rgba(143,69,21,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' } }, iconoSinRed(22)),
      e('div', { style: { font: "400 23px/1.25 'Young Serif',Georgia,serif", letterSpacing: '-.02em', marginTop: 4 } }, X.noPudimos(que)),
      e('div', { style: { font: "400 15px/1.6 'Inter Tight',sans-serif", color: '#33513F' } }, op.motivo === 'servidor' ? X.esNuestro : X.sinRed),
      boton);
  };

  /**
   * «Sin conexión. Esto es de las 3:40 p.m.» Con algo ya en pantalla: la
   * franja en crema fría bajo la cabecera. `desde` es cuándo llegaron los
   * datos que se ven (ms o ISO); `zona`, la de la ciudad.
   */
  var cuandoDe = function (desde, zona) {
    var R = window.AroReglas;
    var iso = new Date(desde || Date.now()).toISOString();
    var z = zona || 'America/Caracas';
    var hoy = R.partesDe(new Date().toISOString(), z);
    var p = R.partesDe(iso, z);
    var mismoDia = hoy && p && hoy.numero === p.numero && hoy.mesNumero === p.mesNumero;
    if (mismoDia) {
      var h = R.horaDe(iso, z);
      return (/^1(:|\s)/.test(h) ? 'la ' : 'las ') + h;
    }
    return 'el ' + String(p.dia || '').toLowerCase() + ' ' + p.numero;
  };
  var franja = function (op) {
    op = op || {};
    var estado = op.estado || 'reposo';
    return e('div', {
      role: 'status',
      style: { display: 'flex', alignItems: 'center', gap: 10, background: '#F2E9D5', padding: '10px 16px', borderTop: '1px solid rgba(20,52,42,.08)', borderBottom: '1px solid rgba(20,52,42,.08)', borderRadius: op.redonda ? 14 : 0 },
    },
      iconoSinRed(18),
      e('span', { style: { flex: 1, font: "500 13.5px/1.35 'Inter Tight',sans-serif", color: '#14342A' } }, X.franja(cuandoDe(op.desde, op.zona))),
      e('button', {
        type: 'button', onClick: ocupado(estado) ? undefined : op.alReintentar, 'aria-busy': ocupado(estado) ? 'true' : 'false',
        style: { display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 44, border: 'none', background: 'transparent', padding: 0, font: "600 13.5px/1 'Inter Tight',sans-serif", color: '#1B5138', textDecoration: 'underline', textUnderlineOffset: 3, cursor: 'pointer' },
      }, enBoton(estado), X.reintentar));
  };

  /**
   * El velo: aro de 54 y «Un momento», solo donde no sabemos qué pintar.
   * Entra pasado el umbral (CSS), así que si la pantalla llega antes no se
   * ve. `verde` para las pantallas sobre verde.
   */
  var velo = function (op) {
    op = op || {};
    return e('div', {
      'aria-busy': 'true', 'aria-live': 'polite', className: 'aro-tras-umbral',
      style: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, minHeight: op.alto || 320 },
    }, aro(54, op), e('span', { style: { font: "400 15px/1.5 'Inter Tight',sans-serif", color: op.verde ? '#9CBBA6' : '#566A5D' } }, X.unMomento));
  };

  /**
   * «Está tardando más de lo normal.» Arranca un reloj de `tiempo.tarda`;
   * `alTardar` se llama si nadie lo para antes. Devuelve el que lo para.
   */
  var vigilar = function (alTardar) {
    var t = setTimeout(alTardar, T.tarda);
    return function () { clearTimeout(t); };
  };

  /** Al volver la red, se reintenta solo. Devuelve el que lo quita. */
  var alVolverLaRed = function (fn) {
    window.addEventListener('online', fn);
    return function () { window.removeEventListener('online', fn); };
  };

  /**
   * Un hueso que mide su línea. `tam` es el tamaño de la letra que
   * reemplaza (también un `clamp()`), `lh` su interlineado y `ancho` el del
   * texto que vendrá. Devuelve dos estilos: `caja`, con la altura real de la
   * línea, y `hueso`, centrado dentro al 75 % de la letra. Así, al llegar el
   * texto, nada se mueve.
   *   <div style="{{ l.caja }}"><div class="aro-hueso" style="{{ l.hueso }}"></div></div>
   */
  var linea = function (tam, lh, ancho, extra) {
    var f = String(tam);
    var alto = (C.hueso.alto[0] + C.hueso.alto[1]) / 2;
    return {
      caja: 'padding:calc(' + f + ' * ' + ((lh - alto) / 2).toFixed(3) + ') 0;' + (extra || ''),
      hueso: 'height:calc(' + f + ' * ' + alto + ');width:' + ancho + ';max-width:100%;border-radius:calc(' + f + ' * .28)',
    };
  };

  /**
   * Un hueso suelto, para meterlo donde iría un dato dentro de un texto que
   * ya está pintado (el importe de un recibo, por ejemplo). `ancho` y `alto`
   * en CSS; `alto` por defecto, el 75 % de la letra que lo rodea.
   */
  var hueso = function (ancho, alto, op) {
    op = op || {};
    return e('span', {
      className: 'aro-hueso' + (op.verde ? ' verde' : ''),
      'aria-hidden': 'true',
      style: { display: 'inline-block', verticalAlign: 'middle', width: ancho, height: alto || '0.75em', borderRadius: op.radio || 6 },
    });
  };

  window.AroCarga = {
    T: T,
    linea: linea,
    hueso: hueso,
    texto: X,
    aro: aro,
    check: check,
    enBoton: enBoton,
    ocupado: ocupado,
    estiloBoton: estiloBoton,
    atributos: atributos,
    paso: paso,
    estado: estado,
    boton: boton,
    pedir: pedir,
    motivoDe: motivoDe,
    sinRespuesta: sinRespuesta,
    franja: franja,
    cuandoDe: cuandoDe,
    velo: velo,
    vigilar: vigilar,
    alVolverLaRed: alVolverLaRed,
  };
})();
