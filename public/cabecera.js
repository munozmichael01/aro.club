/**
 * La cabecera pública, en un solo sitio.
 *
 * La pide la entrega de la agenda con estas palabras: «Es el mismo header en
 * la landing, la agenda y las pantallas públicas». Hasta hoy eran cuatro
 * barras parecidas escritas a mano —la portada con Entrar y Empezar, la
 * agenda con su menú, Legal y Ayuda con el logotipo solo— y el día que
 * cambiara una etiqueta cambiaría en una de las cuatro. Es exactamente el
 * motivo por el que `nav.js` existe para la zona de miembro.
 *
 * SE PINTA FUERA DE `<x-dc>`, a propósito. DCLogic reconcilia su árbol en
 * cada render y se llevaría por delante cualquier nodo que no haya puesto
 * él. Viviendo antes del árbol no se tocan nunca, y de paso la barra está
 * en pantalla antes de que hidrate el runtime.
 *
 * Cómo se usa, desde cualquier pantalla:
 *
 *     <script src="./cabecera.js"></script>
 *     ...
 *     <body>
 *     <div data-cabecera="agenda" data-ancho="1240"></div>
 *     <x-dc>...
 *
 * `data-cabecera` es la página en la que estás, para marcarla en terracota:
 * `portada`, `agenda` o vacío si no es ninguna de las dos. `data-ancho` es
 * el ancho de la columna de ESA pantalla, porque Legal y Ayuda leen a 820 y
 * una barra de 1240 encima de una columna de 820 se ve descolgada.
 *
 * Operación NO aparece aquí nunca, ni para el equipo: se entra por su propia
 * dirección.
 */
(function (raiz) {
  'use strict'

  var CREMA = '#FAF3E4'
  var VERDE = '#1B5138'
  var TINTA = '#14342A'
  var TERRACOTA = '#8F4515'
  var APAGADO = '#456352'

  var LOGO =
    '<svg width="25" height="25" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
    '<circle cx="12" cy="12" r="8.6" stroke="' + VERDE + '" stroke-width="2.4"></circle>' +
    '<circle cx="20.6" cy="12" r="2.5" fill="#C0662F"></circle>' +
    '<circle cx="16.3" cy="19.45" r="2.5" fill="' + VERDE + '"></circle>' +
    '<circle cx="7.7" cy="19.45" r="2.5" fill="' + VERDE + '"></circle>' +
    '<circle cx="3.4" cy="12" r="2.5" fill="' + VERDE + '"></circle>' +
    '<circle cx="7.7" cy="4.55" r="2.5" fill="' + VERDE + '"></circle>' +
    '<circle cx="16.3" cy="4.55" r="2.5" fill="' + VERDE + '"></circle></svg>'

  /**
   * La sesión, UNA vez por pantalla.
   *
   * La portada y la agenda ya preguntaban cada una por su cuenta y ahora la
   * barra pregunta también: tres veces lo mismo en la misma carga. La
   * promesa se guarda y se reparte.
   */
  var enCurso = null
  function sesion() {
    if (!enCurso) {
      enCurso = fetch('/api/mi-cuenta')
        .then(function (r) { return r.ok ? r.json() : null })
        .catch(function () { return null })
    }
    return enCurso
  }

  var ESTILO_ENLACE =
    "display:inline-flex;align-items:center;min-height:44px;padding:0 14px;font:500 14px/1 'Inter Tight',sans-serif;white-space:nowrap;border-radius:999px;"

  var ESTILO_BOTON =
    "display:inline-flex;align-items:center;min-height:44px;padding:0 20px;border-radius:999px;background:" + VERDE + ";color:" + CREMA + ";font:600 14px/1 'Inter Tight',sans-serif;white-space:nowrap;transition:background 220ms ease;"

  var ESTILO_MENU_ITEM =
    "display:flex;align-items:center;min-height:60px;border-bottom:1px solid rgba(20,52,42,.1);font:400 26px/1 'Young Serif',Georgia,serif;letter-spacing:-.02em;"

  /** El tramo de la derecha en computadora, según quién mire. */
  function derecha(actual, sesion, sabida) {
    var html =
      '<a href="/agenda" style="' + ESTILO_ENLACE + 'color:' +
      (actual === 'agenda' ? TERRACOTA : VERDE) + (actual === 'agenda' ? ';font-weight:600' : '') +
      '">Agenda</a>'
    if (!sabida) return html
    if (sesion) {
      return html + '<a href="/cuenta" style="' + ESTILO_BOTON + '">' + textoCuenta(sesion) + '</a>'
    }
    return html +
      '<a href="/entrar" style="' + ESTILO_ENLACE + 'color:' + VERDE + '">Entrar</a>' +
      '<a href="' + aRegistro(actual) + '" style="' + ESTILO_BOTON + '">Empezar</a>'
  }

  /**
   * Quien ya tiene mesa abierta entra a ella, no a la lista de cuentas. Es
   * lo que ya hacía la portada y se pierde si la barra decide por su cuenta.
   */
  function textoCuenta(s) {
    return s && s.estado === 'abierta' ? 'Mi mesa' : 'Mi cuenta'
  }

  /** En la portada el alta está en la misma página; fuera, hay que ir. */
  function aRegistro(actual) {
    return actual === 'portada' ? '#registro' : '/#registro'
  }

  function menu(actual, sesion, sabida) {
    var dentro =
      '<a href="/agenda" style="' + ESTILO_MENU_ITEM + 'color:' +
      (actual === 'agenda' ? TERRACOTA : TINTA) + '">Agenda</a>'
    if (!sabida) return dentro
    if (sesion) {
      return dentro +
        '<a href="/cuenta" style="' + ESTILO_MENU_ITEM + 'color:' + TINTA + '">' + textoCuenta(sesion) + '</a>' +
        '<a href="/perfil" style="' + ESTILO_MENU_ITEM + 'color:' + TINTA + '">Mi perfil</a>' +
        '<button data-salir style="display:flex;align-items:center;min-height:52px;margin-top:14px;padding:0;border:0;background:transparent;cursor:pointer;text-align:left;' +
        "font:500 15px/1 'Inter Tight',sans-serif;color:" + APAGADO + '">Cerrar sesión</button>'
    }
    return dentro +
      '<a href="/" style="' + ESTILO_MENU_ITEM + 'color:' +
      (actual === 'portada' ? TERRACOTA : TINTA) + '">Cómo funciona</a>' +
      '<a href="/entrar" style="' + ESTILO_MENU_ITEM + 'color:' + TINTA + '">Entrar</a>' +
      '<a href="' + aRegistro(actual) + '" style="display:flex;align-items:center;justify-content:center;min-height:56px;margin-top:22px;border-radius:999px;background:' +
      VERDE + ';color:' + CREMA + ";font:600 16px/1 'Inter Tight',sans-serif\">Encuentra tu mesa</a>"
  }

  function pintarUna(caja, estado) {
    var actual = caja.getAttribute('data-cabecera') || ''
    var ancho = caja.getAttribute('data-ancho') || '1240'
    var pad = ancho === '1240' ? 'clamp(16px,4vw,36px)' : 'clamp(16px,4vw,32px)'
    var abierto = estado.menu

    /**
     * FIJA Y CON SU HUECO, no pegajosa.
     *
     * `position:sticky` pega solo mientras el PADRE siga a la vista, y aquí
     * ninguno de los dos candidatos sirve: el hueco mide lo que la barra, y
     * el `body` de estas pantallas mide una pantalla —el contenedor que
     * pinta DCLogic se queda en 800px de alto y su contenido se desborda—.
     * Probado: con la portada bajada 1200px la barra ya no estaba, y
     * mudarla al hueco no cambió nada.
     *
     * Antes no pasaba porque la barra vivía DENTRO del contenedor largo de
     * cada pantalla, y ahí sí tenía contra qué pegarse. Fuera de él,
     * `fixed` con el hueco reservando su altura es lo mismo en pantalla y
     * no depende de la altura de nadie.
     */
    caja.innerHTML =
      '<div data-barra style="position:fixed;top:0;left:0;right:0;z-index:40;background:rgba(250,243,228,.92);backdrop-filter:blur(12px);border-bottom:1px solid rgba(20,52,42,.09)">' +
        '<div data-fila style="max-width:' + ancho + 'px;margin:0 auto;padding:13px ' + pad + ';display:flex;align-items:center;justify-content:space-between;gap:12px">' +
          // En la portada el logotipo sube al principio de la página, que es
          // lo que hacía antes de tener barra común. Un enlace a `/` desde
          // `/` recarga entera una página larga para no moverte de sitio.
          '<a href="' + (actual === 'portada' ? '#top' : '/') + '" style="display:flex;align-items:center;gap:9px;color:' + TINTA + ';min-height:44px;text-decoration:none">' + LOGO +
            '<span style="font:400 21px/1 \'Young Serif\',Georgia,serif;letter-spacing:-.02em;white-space:nowrap">Aro Club</span>' +
          '</a>' +
          '<div class="aro-cab-esc" style="display:flex;align-items:center;gap:4px">' + derecha(actual, estado.sesion, estado.sabida) + '</div>' +
          '<div class="aro-cab-mov" style="display:flex;align-items:center;gap:6px">' +
            (estado.sabida && !estado.sesion
              ? '<a href="' + aRegistro(actual) + '" style="' + ESTILO_BOTON.replace('padding:0 20px', 'padding:0 18px') + '">Empezar</a>'
              : '') +
            '<button data-menu aria-label="' + (abierto ? 'Cerrar menú' : 'Abrir menú') + '" aria-expanded="' + (abierto ? 'true' : 'false') + '" style="width:44px;height:44px;border-radius:999px;border:1.5px solid rgba(20,52,42,.2);background:transparent;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0">' +
              (abierto
                ? '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 4l10 10M14 4L4 14" stroke="' + TINTA + '" stroke-width="2" stroke-linecap="round"></path></svg>'
                : '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M2 5h14M2 13h14" stroke="' + TINTA + '" stroke-width="2" stroke-linecap="round"></path></svg>') +
            '</button>' +
          '</div>' +
        '</div>' +
        (abierto
          ? '<div class="aro-cab-mov" style="border-top:1px solid rgba(20,52,42,.09);background:' + CREMA + ';padding:8px ' + pad + ' 24px;display:flex;flex-direction:column">' + menu(actual, estado.sesion, estado.sabida) + '</div>'
          : '') +
      '</div>'

    /**
     * Y el hueco se queda con la altura de la FILA, no la de la barra: con
     * el menú abierto la barra crece, y si el hueco creciera con ella la
     * página entera daría un salto hacia abajo al tocar el menú.
     */
    var fila = caja.querySelector('[data-fila]')
    if (fila) caja.style.height = fila.offsetHeight + 'px'

    var boton = caja.querySelector('[data-menu]')
    if (boton) {
      boton.addEventListener('click', function () {
        estado.menu = !estado.menu
        pintarUna(caja, estado)
      })
    }
    var fuera = caja.querySelector('[data-salir]')
    if (fuera) {
      // No es un enlace: `/api/salir` es un POST y la portada ya pagó una vez
      // el «parece que saliste y la sesión seguía viva».
      fuera.addEventListener('click', function () {
        fuera.textContent = 'Cerrando…'
        fetch('/api/salir', { method: 'POST' })
          .catch(function () {})
          .then(function () { raiz.location.href = '/' })
      })
    }
  }

  var ESTILOS =
    '@media (max-width: 860px) { .aro-cab-esc { display:none !important } }' +
    '@media (min-width: 861px) { .aro-cab-mov { display:none !important } }'

  function pintar() {
    var cajas = document.querySelectorAll('[data-cabecera]')
    if (!cajas.length) return

    if (!document.getElementById('aro-cab-estilos')) {
      var hoja = document.createElement('style')
      hoja.id = 'aro-cab-estilos'
      hoja.textContent = ESTILOS
      document.head.appendChild(hoja)
    }

    var estados = []
    for (var i = 0; i < cajas.length; i++) {
      // `sabida` en falso hasta que el servidor conteste: pintar «Entrar»
      // mientras se sabe sería enseñarle la puerta a quien ya está dentro, y
      // corregirlo medio segundo después se lee como un fallo.
      var estado = { sesion: null, sabida: false, menu: false }
      estados.push([cajas[i], estado])
      pintarUna(cajas[i], estado)
    }

    sesion().then(function (s) {
      estados.forEach(function (par) {
        par[1].sesion = s
        par[1].sabida = true
        pintarUna(par[0], par[1])
      })
    })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', pintar)
  } else {
    pintar()
  }

  var api = { pintar: pintar, sesion: sesion }
  raiz.AroCabecera = api
  if (typeof module !== 'undefined' && module.exports) module.exports = api
})(typeof globalThis !== 'undefined' ? globalThis : this)
