/**
 * Que alguien se entere cuando una pantalla revienta.
 *
 * Un error de JavaScript deja la página en blanco: la persona se va y en los
 * registros no hay NADA, porque el servidor devolvió 200 con el fichero.
 * Hasta hoy nos enterábamos porque alguien escribiera.
 *
 * ## Por qué un fichero propio y no `support.js`
 *
 * `support.js` es GENERADO —lo dice su primera línea— desde un runtime que ni
 * siquiera vive en este repo. Lo que se escriba ahí se pierde en la siguiente
 * reconstrucción, sin avisar, y el día que pase nadie va a echarlo de menos
 * porque el silencio es exactamente lo que este fichero viene a arreglar.
 *
 * ## Y por qué va ANTES que `support.js`
 *
 * El propio arranque del runtime puede fallar: `loadReactUmd().then(init)`
 * termina en un `throw` que se convierte en una promesa rechazada. Si esto se
 * cargara después, ese fallo —el más grave de todos, porque deja la pantalla
 * completamente en blanco— sería justo el único que no se captura.
 *
 * ## Lo que NO se manda
 *
 * Nada de la persona. Ni correo, ni nombre, ni lo que haya escrito en un
 * campo, ni la query de la URL —ahí viajan los tokens de los enlaces de
 * correo—. Solo la ruta, el mensaje, dónde del código y el navegador.
 */
(function () {
  'use strict';

  var RUTA = '/api/fallo';

  // Una pantalla rota dispara un error por interacción, no solo uno por
  // visita. Con más de tres, la que sobra no cuenta nada nuevo y solo hace
  // ruido en la tabla y en la factura.
  var TOPE_POR_VISITA = 3;
  var mandados = 0;

  // Y el mismo error repetido dentro de la misma visita —un `onerror` dentro
  // de un `setInterval`— tampoco.
  var vistos = {};

  function pantalla() {
    // Solo la ruta. `location.href` lleva la query, y ahí van los tokens
    // firmados de los enlaces de correo.
    try {
      return location.pathname || '/';
    } catch (e) {
      return '(desconocida)';
    }
  }

  function recortar(v, n) {
    if (typeof v !== 'string') return undefined;
    return v.length > n ? v.slice(0, n) : v;
  }

  function mandar(datos) {
    if (mandados >= TOPE_POR_VISITA) return;

    var llave = datos.mensaje + '|' + (datos.origen || '');
    if (vistos[llave]) return;
    vistos[llave] = true;
    mandados++;

    try {
      var cuerpo = JSON.stringify(datos);
      // `sendBeacon` sobrevive a que la pantalla se cierre justo después, que
      // es lo que hace quien se encuentra una página en blanco. `fetch` se
      // cancela al descargar el documento y el aviso se pierde.
      if (navigator.sendBeacon) {
        navigator.sendBeacon(RUTA, new Blob([cuerpo], { type: 'application/json' }));
        return;
      }
      fetch(RUTA, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: cuerpo,
        keepalive: true,
      }).catch(function () {});
    } catch (e) {
      // Un fallo aquí sería un error dentro del que registra errores. Se
      // traga: convertir un fallo en dos es lo contrario de lo que se busca.
    }
  }

  window.addEventListener('error', function (e) {
    // Los errores de carga de una imagen o un script llegan por aquí sin
    // `message`. No son la pantalla rota y no valen un aviso.
    if (!e || !e.message) return;

    mandar({
      pantalla: pantalla(),
      mensaje: recortar(String(e.message), 500),
      origen: recortar(
        (e.filename || '?') + ':' + (e.lineno || 0) + ':' + (e.colno || 0),
        300,
      ),
      pila: recortar(e.error && e.error.stack ? String(e.error.stack) : undefined, 2000),
      navegador: recortar(navigator.userAgent, 300),
      tipo: 'error',
    });
  });

  window.addEventListener('unhandledrejection', function (e) {
    var r = e ? e.reason : null;
    var mensaje = r && r.message ? String(r.message) : String(r);
    if (!mensaje || mensaje === 'undefined') return;

    mandar({
      pantalla: pantalla(),
      mensaje: recortar(mensaje, 500),
      pila: recortar(r && r.stack ? String(r.stack) : undefined, 2000),
      navegador: recortar(navigator.userAgent, 300),
      tipo: 'promesa',
    });
  });
})();
