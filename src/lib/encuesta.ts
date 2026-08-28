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
