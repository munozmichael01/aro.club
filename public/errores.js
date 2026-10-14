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

  /**
   * El navegador de Instagram en iOS, que NO se delata por el origen.
   *
   * En Android ese navegador carga su medidor como `iabjs://…` y la regla
   * del origen lo caza. En iPhone lo INYECTA DENTRO del documento, así que
   * sus errores llegan con origen `https://aro.club/:1:1325` y la regla del
   * origen dice que son nuestros. Resultado: a las 3:10 de la madrugada del
   * 13-10 salió un correo por un `window.webkit.messageHandlers` que no es
   * nuestro y que no podemos arreglar.
   *
   * Lo que sí lo delata son sus nombres. `sendDataToNative`,
   * `sendPageHideMessage` y compañía son el puente de la app con lo nativo,
   * y `window.webkit.messageHandlers` es ese puente en iOS. No existe nada
   * con esos nombres en este repo, comprobado, y no puede existir: no
   * tenemos puente nativo en la web.
   */
  var PUENTES_DE_APP = /\b(?:sendDataToNative|sendPageHideMessage|sendBeforeUnloadMessage|sendJsBlockingTimeMessage|dispatchToBridge|sendPostMessage|logLoginFormFocused|webkit\.messageHandlers|ReactNativeWebView)\b/;

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

    var texto = String(fichero || '') + ' ' + String(pila || '') + ' ' + String(mensaje || '');
    if (ESQUEMAS_AJENOS.test(texto) || PUENTES_DE_APP.test(texto)) return true;

    /**
     * Y la regla que deja de ser una lista de nombres.
     *
     * Perseguir los nombres del puente de Instagram es un juego que no se
     * gana: filtré `sendDataToNative` y `sendPageHideMessage`, y a las horas
     * llegó otro con `dispatchToBridge`, `sendPostMessage` y
     * `logLoginFormFocused`. Son suyos y los cambian cuando quieren.
     *
     * Lo que NO cambia es dónde viven. Instagram en iPhone inyecta su
     * medidor minificado dentro del documento, así que todos sus marcos
     * caen en `aro.club/:1:algo` —línea 1, columna en los miles—. Nuestras
     * pantallas son `.dc.html` servidos tal cual, con saltos de línea: su
     * código empieza por el `<!doctype html>` de la línea 1 y cualquier
     * error nuestro reporta cientos de líneas más abajo. El `onCorreo` que
     * sí era nuestro salió en `/:655:323`.
     *
     * Así que: si NINGÚN marco de la pila es nuestro de verdad —ni un
     * fichero con nombre, ni una línea que no sea la 1— no hay nada que
     * podamos arreglar ahí dentro.
     *
     * Conservador a propósito: basta UN marco nuestro para que el error
     * siga avisando. Un fallo nuestro disparado desde su código se sigue
     * contando como nuestro, que es lo correcto.
     */
    var marcos = String(pila || '').split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
    if (marcos.length) {
      var hayNuestro = false;
      for (var i = 0; i < marcos.length; i++) {
        var m = marcos[i];
        if (m.indexOf('[native code]') >= 0) continue;
        // Un fichero con nombre es nuestro: support.js, reglas.js, /vendor/…
        if (/\.(js|mjs|ts|tsx)(:|\?|$)/.test(m)) { hayNuestro = true; break; }
        // Y el documento, solo si la línea NO es la 1.
        var enDoc = m.match(/:(\d+):(\d+)\)?$/);
        if (enDoc && Number(enDoc[1]) > 1) { hayNuestro = true; break; }
        // Un marco sin posición tampoco delata a nadie: no decide.
        if (!enDoc) hayNuestro = true;
      }
      if (!hayNuestro) return true;
    }

    return false;
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
   * El campo no acepta nada hasta que la pantalla está viva.
   *
   * EL FALLO. Las pantallas son `.dc.html` servidos tal cual, así que hasta
   * que DCLogic hidrata, el campo del correo de la portada lleva escrito
   * literalmente `onChange="{{ onCorreo }}"`.
   *
   * Eso no es un hueco inofensivo: **`{{ onCorreo }}` es JavaScript
   * válido**. Son dos bloques anidados con una variable suelta dentro, así
   * que el navegador lo compila como manejador y al dispararse lanza
   * `ReferenceError: onCorreo is not defined`. Y aunque no lanzara nada, lo
   * tecleado se perdería igual: al hidratar, React pinta `value` desde su
   * estado, que está vacío.
   *
   * Pasó el 12-10 a las 22:29 con una persona en Android Chrome: tecleó su
   * correo y pulsó el botón antes de que cargara el JS, y los tres
   * manejadores reventaron, uno por segundo. Su correo no llegó a ninguna
   * parte. La ventana es imperceptible en una computadora y larga en un
   * teléfono lento con datos, que es por donde entra la campaña, y es el
   * primer campo de la primera pantalla.
   *
   * LO QUE NO FUNCIONA, probado y revertido en producción: quitar esos
   * atributos. DCLogic los LEE del DOM para enlazar los manejadores, así
   * que quitarlos antes de que compile deja el formulario muerto del todo.
   * Cuatro minutos de portada sin poder dejar el correo.
   *
   * Lo que sí: no tocar nada y hacer que no se pueda escribir todavía. Un
   * campo que tarda un segundo en responder se lee como que está cargando;
   * uno que se traga lo escrito, no.
   *
   * La señal de «ya está viva» es que no quede ningún manejador con `{{`
   * sin resolver: cuando React pinta, esos atributos desaparecen. Una
   * pantalla que no tenga ninguno nace viva, que es lo correcto.
   */
  var MANEJADORES = ['onclick', 'onchange', 'oninput', 'onkeydown', 'onkeyup', 'onsubmit'];
  var SIN_RESOLVER = /\{\{/;

  /** Cuánto se espera como mucho. Pasado esto se suelta, pase lo que pase. */
  var ESPERA_MAXIMA = 8000;

  function quedanSinResolver() {
    for (var i = 0; i < MANEJADORES.length; i++) {
      var nodos = document.querySelectorAll('[' + MANEJADORES[i] + ']');
      for (var j = 0; j < nodos.length; j++) {
        if (SIN_RESOLVER.test(nodos[j].getAttribute(MANEJADORES[i]) || '')) return true;
      }
    }
    return false;
  }

  function soltar() {
    try {
      document.documentElement.classList.add('dc-viva');
    } catch (e) {
      /* da igual: lo único que pasa es que el candado se queda puesto */
    }
  }

  try {
    // El candado, antes de que se pinte nada. Solo los controles: los
    // enlaces siguen funcionando, que es lo que uno hace mientras espera.
    //
    // Sin opacidad ni spinner: es un parpadeo en una computadora y un
    // segundo en un teléfono, y meterle un estado de carga a las veintiuna
    // pantallas de Design a las once de la noche es cambiar mucho más de lo
    // que este fallo pide.
    var estilo = document.createElement('style');
    estilo.setAttribute('data-aro', 'candado-hidratacion');
    estilo.textContent =
      'html:not(.dc-viva) input,html:not(.dc-viva) textarea,' +
      'html:not(.dc-viva) select,html:not(.dc-viva) button{pointer-events:none}';
    (document.head || document.documentElement).appendChild(estilo);

    var reloj = setInterval(function () {
      if (!quedanSinResolver()) {
        clearInterval(reloj);
        soltar();
      }
    }, 60);

    // Y el tope. Si DCLogic no llegó a arrancar, dejar la pantalla
    // congelada para siempre es peor que devolverla a como estaba: al menos
    // los campos nativos vuelven a funcionar.
    setTimeout(function () {
      clearInterval(reloj);
      soltar();
    }, ESPERA_MAXIMA);
  } catch (e) {
    // Si esto falla por lo que sea, la pantalla se queda exactamente como
    // estaba antes de existir este bloque.
    soltar();
  }
})();
