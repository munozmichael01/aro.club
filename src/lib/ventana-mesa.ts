/**
 * Cuándo una cena está "recién pasada".
 *
 * Estas dos cifras deciden dos cosas distintas en dos pantallas —cuál de tus
 * reservas es "tu mesa" en Mi mesa, y si Mi cuenta te enseña la tarjeta de
 * valorar— y tienen que ser la misma cifra. Si la portada ofreciera valorar
 * durante 72 horas y Mi mesa cerrara a las 48, el botón llevaría a una
 * pantalla que ya no deja hacerlo.
 */

/** La cena se da por terminada cinco horas después de empezar. */
export const FIN_CENA = 5 * 3600 * 1000

/** Y se puede valorar hasta dos días después de que empezara. */
export const VENTANA_VALORAR = 48 * 3600 * 1000

/**
 * Si esa cena está dentro de la ventana para valorarla: ya terminó, y no
 * han pasado aún las 48 horas.
 */
export function sePuedeValorar(empiezaEn: string | Date | number, ahora = Date.now()): boolean {
  const inicio = typeof empiezaEn === 'number' ? empiezaEn : new Date(empiezaEn).getTime()
  const desde = ahora - inicio
  return desde > FIN_CENA && desde < VENTANA_VALORAR
}
