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
 *
 * ## Y lo que no es nuestro
 *
 * Llegó un aviso de «Una pantalla se rompió en /» con «Error invoking
 * postMessage: Java object is gone» desde
 * `iabjs://navigation_performance_logger_android`: el script que el navegador
 * interno de Instagram inyecta en Android al salir de la página. No es código
 * nuestro, no se puede arreglar desde aquí, y un buzón con avisos que nadie
 * puede atender es un buzón que se deja de mirar — que es exactamente lo que
 * este fichero vino a impedir.
 *
 * Esos se marcan `ajeno` y el servidor los cuenta sin avisar a nadie. Se
 * cuentan y no se tiran porque sí dicen algo: si un día el navegador de
 * Instagram rompe de verdad una pantalla, la cuenta estará ahí. Lo que no
 * hacen es despertar a nadie.
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

  /**
   * Los ajenos tienen su propio tope, y es UNO.
   *
   * Si compartieran el de arriba, un script inyectado que falla tres veces
   * al salir de la página se comería el cupo entero, y el error NUESTRO que
   * viniera después no se mandaría. El ruido no puede tapar la señal.
   */
  var TOPE_AJENOS = 1;
  var ajenosMandados = 0;

  /**
   * Si el fallo viene de un script que no es nuestro.
   *
   * La regla de verdad es el ORIGEN: si el fichero no es de esta página, no
   * es nuestro. Eso cubre de una vez `iabjs://`, las extensiones del
   * navegador y cualquier cosa que inyecte mañana otra app, sin tener que ir
   * ampliando una lista cada vez que aparezca una.
   *
   * La lista de esquemas es el respaldo para cuando NO hay fichero —una
   * promesa rechazada trae pila y no `filename`— y para los navegadores
   * donde `URL` no resuelve un esquema raro.
   */
  var ESQUEMAS_AJENOS = /\b(?:iabjs|chrome-extension|safari-extension|safari-web-extension|moz-extension|edge-extension|ms-browser-extension|webkit-masked-url):/i;

  /**
   * Lo que cargamos a propósito de fuera, y por tanto es NUESTRO.
   *
   * `support.js` trae React de unpkg. Si React revienta, la pantalla se queda
   * en blanco igual que si reventara nuestro código —casi siempre porque le
   * dimos algo que no esperaba— y eso hay que mirarlo. Con la regla del
   * origen a secas, ese fallo se habría quedado mudo, que es peor que el ruido
   * que esto viene a quitar.
   *
   * No entra lo de medición. Analytics y Clarity son de fuera, no sostienen
   * ninguna pantalla, y que fallen no es algo que nadie aquí pueda arreglar.
   */
  var DE_FUERA_PERO_NUESTROS = ['https://unpkg.com'];

  function deFuera(fichero, mensaje, pila) {
    // «Script error.» sin fichero: el error opaco que da un script de otro
    // dominio. Nunca dice nada —ni línea, ni pila— y nunca es accionable.
    if (!fichero && /^script error\.?$/i.test(String(mensaje || '').trim())) return true;

    if (fichero) {
      try {
        // Con `location.href` de base, una ruta relativa sale nuestra y una
        // absoluta conserva su esquema. Los esquemas raros dan origen
        // «null», que ya no coincide con el nuestro.
        var origen = new URL(fichero, location.href).origin;
        if (origen !== location.origin && DE_FUERA_PERO_NUESTROS.indexOf(origen) < 0) return true;
      } catch (e) {
        // Si no se puede ni leer como URL, desde luego no es nuestra.
        return true;
      }
    }

    // Sin fichero, lo que queda es la pila.
    return ESQUEMAS_AJENOS.test(String(fichero || '') + ' ' + String(pila || ''));
  }

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
    if (datos.ajeno) {
      if (ajenosMandados >= TOPE_AJENOS) return;
    } else if (mandados >= TOPE_POR_VISITA) {
      return;
    }

    var llave = datos.mensaje + '|' + (datos.origen || '');
    if (vistos[llave]) return;
    vistos[llave] = true;
    if (datos.ajeno) ajenosMandados++;
    else mandados++;

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

    var pila = e.error && e.error.stack ? String(e.error.stack) : undefined;

    mandar({
      pantalla: pantalla(),
      mensaje: recortar(String(e.message), 500),
      origen: recortar(
        (e.filename || '?') + ':' + (e.lineno || 0) + ':' + (e.colno || 0),
        300,
      ),
      pila: recortar(pila, 2000),
      navegador: recortar(navigator.userAgent, 300),
      tipo: 'error',
      ajeno: deFuera(e.filename, e.message, pila) || undefined,
    });
  });

  window.addEventListener('unhandledrejection', function (e) {
    var r = e ? e.reason : null;
    var mensaje = r && r.message ? String(r.message) : String(r);
    if (!mensaje || mensaje === 'undefined') return;

    var pila = r && r.stack ? String(r.stack) : undefined;

    mandar({
      pantalla: pantalla(),
      mensaje: recortar(mensaje, 500),
      pila: recortar(pila, 2000),
      navegador: recortar(navigator.userAgent, 300),
      tipo: 'promesa',
      // Sin `filename`: aquí lo único que puede delatar al de fuera es la pila.
      ajeno: deFuera(null, mensaje, pila) || undefined,
    });
  });

  /**
   * Y antes de nada: desarmar los manejadores que todavía no son nada.
   *
   * Las pantallas son `.dc.html` servidos tal cual, así que hasta que
   * DCLogic hidrata el campo del correo de la portada lleva escrito
   * literalmente `onChange="{{ onCorreo }}"`.
   *
   * Eso no es un hueco inofensivo: **`{{ onCorreo }}` es JavaScript
   * válido**. Son dos bloques anidados y una variable suelta dentro, así
   * que el navegador lo ejecuta y lanza `ReferenceError: onCorreo is not
   * defined`. Pasó esta noche con una persona de verdad en Android: tecleó
   * su correo y pulsó el botón antes de que cargara el JS, y los tres
   * manejadores —`onKeyDown`, `onChange` y `onClick`— reventaron, uno por
   * segundo. Su correo no llegó a ninguna parte.
   *
   * La ventana es corta en una computadora y larga en un teléfono lento
   * con datos, que es por donde entra la campaña. Y es justo el primer
   * campo de la primera pantalla.
   *
   * Esto solo quita el atributo. No arregla que lo tecleado se pierda al
   * hidratar —eso es de la pantalla, no de aquí— pero convierte un error
   * en no pasar nada, que es lo que la persona ya creía que estaba
   * pasando.
   *
   * Va en este fichero porque es el único nuestro que cargan las veintiuna
   * pantallas y que corre ANTES que `support.js`. Un fichero nuevo serían
   * veintiún `<head>` que tocar, que es la trampa que este repo ya conoce.
   */
  var SIN_RESOLVER = /^\s*\{\{[\s\S]*\}\}\s*$/;
  var MANEJADORES = ['onclick', 'onchange', 'oninput', 'onkeydown', 'onkeyup', 'onsubmit', 'onblur', 'onfocus'];

  function desarmarPlantillas() {
    try {
      for (var i = 0; i < MANEJADORES.length; i++) {
        var nodos = document.querySelectorAll('[' + MANEJADORES[i] + ']');
        for (var j = 0; j < nodos.length; j++) {
          var v = nodos[j].getAttribute(MANEJADORES[i]);
          if (v && SIN_RESOLVER.test(v)) nodos[j].removeAttribute(MANEJADORES[i]);
        }
      }
    } catch (e) {
      // Si esto falla, la pantalla sigue como estaba. No es parte de pintar
      // nada.
    }
  }

  // Dos veces: en cuanto se puede leer el documento, y al terminar de
  // parsearlo. Lo primero coge el campo del correo, que está arriba del
  // todo; lo segundo, lo que venga después.
  desarmarPlantillas();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', desarmarPlantillas);
  }
})();
