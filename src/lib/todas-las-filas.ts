/**
 * Leer una tabla entera cuando PostgREST solo da mil filas.
 *
 * `select()` sin `range` devuelve **mil filas como máximo y no avisa**. No
 * hay error, no hay aviso y no hay nada en los registros: la consulta parece
 * haber ido bien y simplemente le faltan filas. Eso es lo que lo hace caro.
 *
 * Michael, 27-10, sobre el envío de «vamos a equilibrar las mesas»: le dije
 * que treinta y cinco hombres ya tenían cena y era mentira. Solo tres la
 * tenían. Los otros treinta y dos eran hombres **verificados** que la ruta
 * no veía, porque `verifications` tiene mil doscientas sesenta filas y la
 * ruta leía las mil primeras. A los que caían en `pending_verification` el
 * correo les habría pedido una cédula que ya les habíamos aprobado.
 *
 * Esta función vivía copiada dos veces —en el histórico de mesas y en la
 * pantalla de gente—, y es justo la forma de fallo que este repositorio ya
 * ha pagado con los correos: la misma idea escrita en varios sitios acaba
 * aplicada en unos y olvidada en otros. Aquí hay una sola.
 *
 * Se usa así, pasándole el trozo de consulta sin ejecutar:
 *
 * ```ts
 * const filas = await todasLasFilas<{ profile_id: string; status: string }>(
 *   (desde, hasta) => admin.from('verifications')
 *     .select('profile_id, status').range(desde, hasta),
 * )
 * ```
 *
 * No hace falta para una consulta acotada a una fecha o a una persona: una
 * cena tiene seis comensales y nunca va a pasar de mil. Hace falta para todo
 * lo que lee una tabla completa, aunque hoy quepa, porque el día que no
 * quepa nadie se va a enterar.
 */

/** El tope de PostgREST, que es lo que obliga a leer por tramos. */
const TRAMO = 1000

/**
 * Lee una tabla entera, en tramos de mil.
 *
 * Se para cuando un tramo viene incompleto, que es cómo se sabe que era el
 * último sin preguntar el total.
 *
 * ORDENA TÚ, por `id`, y eso no es decoración.
 *
 * `range()` sin `ORDER BY` deja el orden a criterio de Postgres, y entre un
 * tramo y el siguiente pasa tiempo: si alguien escribe en esa tabla en
 * medio, las filas se recolocan y el segundo tramo puede saltarse una o
 * devolver otra dos veces. Nada falla, simplemente falta gente. En el envío
 * de «equilibrar las mesas» una fila saltada es un correo que no sale o que
 * sale repetido, y `verifications` ya se lee en dos tramos hoy.
 *
 * Ordenar desde aquí dentro no se puede: la consulta la arma quien llama y
 * llega ya con su `range` puesto. Así que es responsabilidad suya, y por eso
 * está escrito aquí arriba, que es donde se lee antes de usarla.
 *
 * Solo importa de verdad en lo que pasa de mil filas, que hoy es
 * `verifications`. En lo que cabe en un tramo da igual, y se pone igual:
 * la que no lo lleve el día que crezca será la que falle en silencio.
 *
 * Lo cazó el agente de la app auditando, el 29-10.
 */
export async function todasLasFilas<T>(
  leer: (desde: number, hasta: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const filas: T[] = []
  for (let desde = 0; ; desde += TRAMO) {
    const { data, error } = await leer(desde, desde + TRAMO - 1)
    if (error) throw error
    const tramo = data ?? []
    filas.push(...tramo)
    if (tramo.length < TRAMO) return filas
  }
}
