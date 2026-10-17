/**
 * La encuesta del día después. Solo la traducción pantalla → base.
 *
 * Existe porque la escala va al revés y eso no se ve leyendo ninguno de los
 * dos lados. La pantalla manda el ÍNDICE del botón pulsado, y los botones
 * están ordenados de mejor a peor porque así se leen:
 *
 *     0 Excelente   1 Bien   2 Regular   3 Mala
 *
 * La columna va al derecho, más es mejor, porque es lo que espera cualquiera
 * que la promedie:
 *
 *     4 Excelente   3 Bien   2 Regular   1 Mala
 *
 * Guardar el índice tal cual mete la mesa perfecta como un 0 y la peor como
 * un 3, y el emparejamiento aprende exactamente lo contrario de lo que le
 * dijeron. Sin fallo visible, sin error en ningún sitio: solo un club que
 * junta cada vez peor.
 *
 * Por eso la vuelta está AQUÍ y en un solo sitio. Si estuviera en la pantalla
 * habría que acordarse en cada uno de los cinco bloques, y el día que Design
 * añada un sexto se guardaría del revés sin que nada avise.
 */

/** Cuántos grados tiene la escala. Los mismos en la mesa y en el sitio. */
export const GRADOS = 4

/**
 * Del índice del botón a la nota de la base. Devuelve `null` para lo que no
 * se contestó —saltarse una pregunta es normal y no es un cero—.
 */
export function notaDesdeIndice(indice: unknown): number | null {
  if (typeof indice !== 'number' || !Number.isInteger(indice)) return null
  if (indice < 0 || indice > GRADOS - 1) return null
  return GRADOS - indice
}

/** Las cuatro del sitio, con el nombre que tienen en la base. */
export const FILAS_DEL_SITIO = ['ambiente', 'servicio', 'conversar', 'comida'] as const
export type FilaDelSitio = (typeof FILAS_DEL_SITIO)[number]

/**
 * De lo que manda la pantalla —`{ambiente: 0, comida: 2}`— a las columnas.
 * Lo que no venga se queda sin escribir, que no es lo mismo que un cero.
 */
export function notasDelSitio(
  crudo: Partial<Record<FilaDelSitio, unknown>> | undefined,
): Record<string, number | null> {
  const salida: Record<string, number | null> = {}
  for (const fila of FILAS_DEL_SITIO) {
    salida[`sitio_${fila}`] = notaDesdeIndice(crudo?.[fila])
  }
  return salida
}

/** Lo que contestó una persona, tal cual vive en `table_feedback`. */
export type RespuestaCruda = {
  conversation_rating?: number | null
  sitio_ambiente?: number | null
  sitio_servicio?: number | null
  sitio_conversar?: number | null
  sitio_comida?: number | null
  would_repeat?: boolean | null
}

/**
 * La nota, como se dice.
 *
 * Michael, 17-10, mirando una ficha: «recuérdame cómo es la puntuación,
 * porque 4 y excelente no sé si es lo mismo». Lo son, y esa duda es el
 * fallo: operación no tiene por qué traducir. La pantalla pregunta con
 * palabras, así que la respuesta de una persona se devuelve con palabras.
 *
 * Las medias sí van en número, porque un 3,5 no tiene palabra, y por eso van
 * siempre con su «de 4» al lado.
 *
 * Las cuatro del sitio dicen «Mal» donde la de la mesa dice «Mala»: es como
 * están escritos los botones en la pantalla, y la ficha tiene que sonar a lo
 * que la persona pulsó.
 */
const PALABRA = ['', 'Mala', 'Regular', 'Bien', 'Excelente']
const PALABRA_SITIO = ['', 'Mal', 'Regular', 'Bien', 'Excelente']

/**
 * Lo que contestó una persona, en una línea, para operación.
 *
 * Michael, 17-10: «quiero ver las respuestas de las personas, incluyendo el
 * comentario, no es anónimo para nosotros». Esa línea hace falta en dos
 * pantallas —el Histórico de mesas y la ficha de cada miembro— y vive aquí
 * por lo de siempre: dos sitios armando la misma frase acaban diciendo cosas
 * distintas, y aquí además está escrito que la escala va al derecho.
 *
 * Solo lo contestado. Los bloques son opcionales por separado y un «—» por
 * cada hueco convierte la línea en ruido.
 */
export function resumenDeRespuesta(r: RespuestaCruda): string {
  const partes: string[] = []
  const pares: [string, number | null | undefined, string[]][] = [
    ['La mesa', r.conversation_rating, PALABRA],
    ['Ambiente', r.sitio_ambiente, PALABRA_SITIO],
    ['Servicio', r.sitio_servicio, PALABRA_SITIO],
    ['Se conversaba', r.sitio_conversar, PALABRA_SITIO],
    ['Comida', r.sitio_comida, PALABRA_SITIO],
  ]
  for (const [que, cuanto, palabras] of pares) {
    if (cuanto != null) partes.push(`${que} ${palabras[cuanto] || cuanto}`)
  }
  if (r.would_repeat === true) partes.push('Volvería a Aro')
  if (r.would_repeat === false) partes.push('No volvería a Aro')
  return partes.length ? partes.join(' · ') : 'Solo escribió, sin notas.'
}
