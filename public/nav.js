/**
 * La navegación de la zona de cuenta.
 *
 * Se llegaba a las secciones desde el inicio y desde dentro no había manera
 * de moverse: solo volver atrás. Cada pantalla era un callejón con una
 * puerta.
 *
 * Vive aquí y no copiada en cada pantalla porque son tres sitios y ya hemos
 * visto cómo acaba eso: el día que cambie una etiqueta, cambiaría en dos de
 * los tres. Cada pantalla la compone; la definición es una sola.
 *
 * NO aparece en los flujos con principio y final —datos personales,
 * cuestionario, verificación, pago, cancelar—. Ahí una barra invita a irse a
 * mitad de algo que hay que terminar, y volver cuesta más que seguir.
 */
(function (raiz) {
  'use strict'

  var VERDE = '#1B5138'
  var APAGADO = '#566A5D'

  /**
   * Los destinos, según dónde estás y qué tienes.
   *
   * `hayMesa` decide si «Mi mesa» aparece: sin reserva esa pantalla te
   * devuelve a Inicio, y una pestaña que rebota a donde ya estabas no es
   * navegación, es una puerta pintada en la pared.
   *
   * Y `formato` decide cómo se llama. Para la caminata del domingo no hay
   * ninguna mesa: la pestaña dice «Mi grupo». La tabla está en reglas.js,
   * que es de donde la leen también la pantalla, el panel y los correos.
   */
  function items(activa, hayMesa, formato) {
    var voz = (raiz.AroReglas && raiz.AroReglas.vozDe) ? raiz.AroReglas.vozDe(formato) : { mia: 'Mi mesa' }
    var todos = [
      { id: 'inicio', texto: 'Inicio', enlace: '/cuenta' },
      { id: 'mesa', texto: voz.mia, enlace: '/mesa', requiereMesa: true },
      { id: 'perfil', texto: 'Perfil', enlace: '/perfil' },
    ]
    return todos
      .filter(function (t) { return !t.requiereMesa || hayMesa })
      .map(function (t) {
        var on = t.id === activa
        return {
          texto: t.texto,
          // La que ya estás mirando no se enlaza a sí misma.
          enlace: on ? '#top' : t.enlace,
          actual: on ? 'page' : 'false',
          estilo:
            'display:inline-flex;align-items:center;min-height:44px;padding:0 2px;' +
            'font:' + (on ? '600' : '500') + " 15px/1 'Inter Tight',sans-serif;" +
            'color:' + (on ? '#14342A' : APAGADO) + ';' +
            'border-bottom:2px solid ' + (on ? VERDE : 'transparent') + ';' +
            'transition:color 180ms ease,border-color 180ms ease',
        }
      })
  }

  /**
   * Cerrar sesión, en la barra y en las tres pantallas.
   *
   * Estaba en UNA sola —abajo del todo del Inicio, detrás de todas las
   * tarjetas— así que desde Perfil o desde Mi mesa había que volver al
   * Inicio y bajar hasta el pie para salir. Michael lo pidió tres veces:
   * uno solo, y en la barra.
   *
   * NO es un enlace. Llama al servidor, que borra la cookie, y solo
   * entonces navega. Cuando era un `<a>` a la portada la sesión seguía
   * viva: se veía «Entrar» el instante que tarda el fetch y volvía a «Mi
   * cuenta».
   *
   * `alCambiar(saliendo)` lo llama la pantalla para pintar «Cerrando…» y no
   * dejar pulsar dos veces; si no se pasa, sale igual.
   */
  function salir(alCambiar) {
    if (typeof alCambiar === 'function') alCambiar(true)
    fetch('/api/salir', { method: 'POST' })
      .then(function () { try { raiz.localStorage.removeItem('aro-sesion') } catch (e) {} })
      .catch(function () {})
      .then(function () { raiz.location.href = '/' })
  }

  /** Cómo se pinta. `margin-left:auto` la manda al extremo de la fila. */
  function salida(saliendo) {
    return {
      texto: saliendo ? 'Cerrando…' : 'Cerrar sesión',
      estilo:
        'margin-left:auto;display:inline-flex;align-items:center;min-height:44px;' +
        'padding:0;background:transparent;border:none;cursor:pointer;' +
        "font:500 15px/1 'Inter Tight',sans-serif;color:" + APAGADO + ';' +
        'transition:color 180ms ease',
    }
  }

  var api = { items: items, salir: salir, salida: salida }
  raiz.AroNav = api
  if (typeof module !== 'undefined' && module.exports) module.exports = api
})(typeof globalThis !== 'undefined' ? globalThis : this)
