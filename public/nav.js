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
   */
  function items(activa, hayMesa) {
    var todos = [
      { id: 'inicio', texto: 'Inicio', enlace: 'Aro Club - Mi cuenta.dc.html' },
      { id: 'mesa', texto: 'Mi mesa', enlace: 'Aro Club - Mi mesa.dc.html', requiereMesa: true },
      { id: 'perfil', texto: 'Perfil', enlace: 'Aro Club - Mi perfil.dc.html' },
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

  var api = { items: items }
  raiz.AroNav = api
  if (typeof module !== 'undefined' && module.exports) module.exports = api
})(typeof globalThis !== 'undefined' ? globalThis : this)
