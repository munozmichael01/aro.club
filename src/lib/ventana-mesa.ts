import { JUEGO } from '@/lib/reglas'

/**
 * Cuándo una cena está "recién pasada".
 *
 * Estas dos cifras deciden dos cosas distintas en dos pantallas —cuál de tus
 * reservas es "tu mesa" en Mi mesa, y si Mi cuenta te enseña la tarjeta de
 * valorar— y tienen que ser la misma cifra. Si la portada ofreciera valorar
 * durante 72 horas y Mi mesa cerrara a las 48, el botón llevaría a una
 * pantalla que ya no deja hacerlo.
 */

/**
 * La cena se da por terminada cinco horas después de empezar.
 *
 * Sale de `JUEGO.cierraMin` y no de un número escrito aquí: el juego de la
 * mesa se cierra cuando la cena se acaba, y eran dos cifras distintas —cuatro
 * horas y cinco— en dos ficheros. De la hora 4 a la 5, Mi mesa decía
 * «Abierto · Hoy» y el juego ya no estaba. Derivarlo es lo que hace que no
 * puedan volver a separarse.
 */
export const FIN_CENA = JUEGO.cierraMin * 60 * 1000

/**
 * Hasta cuándo se ESCRIBE pidiendo la encuesta. Dos días.
 *
 * Sigue existiendo, pero ya solo para el correo: lo usa
 * `/api/cron/encuesta` para no escribirle a nadie por una cena de hace tres
 * semanas. Escribir tiene un plazo; la pantalla, desde hoy, no.
 */
export const VENTANA_VALORAR = 48 * 3600 * 1000

/**
 * Si esa cena se puede valorar: con que haya TERMINADO basta.
 *
 * Michael, 18-10: «que no deje de mostrarse a las 48 h, sino cuando la
 * persona la conteste o se la salte». La encuesta dejaba de verse sola a los
 * dos días, así que quien la abría el miércoles no encontraba nada y su
 * respuesta se perdía sin que nadie lo supiera. Ahora la cierra ella: o la
 * contesta, o dice «Ahora no» —y eso se guarda en `table_feedback.saltada_at`—.
 *
 * Quién decide que ya no sale es, por tanto, cada pantalla mirando esas dos
 * cosas, no el reloj. Aquí solo queda el «ya terminó».
 */
export function sePuedeValorar(empiezaEn: string | Date | number, ahora = Date.now()): boolean {
  const inicio = typeof empiezaEn === 'number' ? empiezaEn : new Date(empiezaEn).getTime()
  return ahora - inicio > FIN_CENA
}
