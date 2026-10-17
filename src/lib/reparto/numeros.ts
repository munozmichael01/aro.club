import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Las mesas de una fecha, de 1 a N y sin huecos.
 *
 * Quitar la 3 de cuatro dejaba 1, 2 y 4, y la siguiente que se añadía era la
 * 5. Peor: al volver a repartir, las nuevas se numeraban a partir del número
 * más alto de las publicadas, así que una fecha con las mesas 1, 4 y 5
 * publicadas paría la 6 y la 7. La cena del viernes 16 llegó a tener las
 * mesas 1, 4, 5, 6 y 7, y el número es lo que se dice en voz alta al llegar
 * —«la mesa de Aro, la cuatro»—.
 *
 * Michael, 16-10: «siempre renombra las mesas de menor a mayor, no puede
 * quedar 1 y 4. Hasta la revelación; a partir de ahí no cambia nunca».
 *
 * Compacta hacia abajo y en orden ascendente, así que el número nuevo nunca
 * choca con uno que todavía exista: cuando le toca a la 4, el 3 ya quedó
 * libre.
 *
 * Toca `dinner_tables` si la mesa ya está publicada, porque ahí vive el
 * número de verdad: el correo de la mesa y la push lo leen al enviarse, no al
 * encolarse. Y la base se toca ANTES que la propuesta: si falla, la propuesta
 * no se queda diciendo un número que la base no tiene.
 *
 * NUNCA después de la revelación. Quien llama comprueba `reveal_at` antes:
 * a partir de ahí el número está en una pantalla, en un correo y en la cabeza
 * de seis personas.
 */
export type ConNumero = { numero: number; publicada?: boolean }

export async function renumerar(
  admin: ReturnType<typeof createAdminClient>,
  eventoId: string,
  mesas: ConNumero[],
): Promise<string | null> {
  /**
   * Los números son de la NOCHE, no de la fecha.
   *
   * El 17-10 hubo dos cenas la misma noche —la normal y la de mayores de
   * 40— y las dos numeraban desde el 1. En Vittoria acabaron dos mesas 01
   * a la misma hora, y a las doce personas les dijimos «la mesa de Aro».
   *
   * Quien llega al restaurante no sabe que son dos fechas: ve un sitio, una
   * hora y un número. Así que el número tiene que ser único esa noche.
   *
   * Las de las otras fechas NO se tocan: pueden estar publicadas y su
   * número ya está en el correo de alguien. Se esquivan.
   */
  const { data: suya } = await admin
    .from('events')
    .select('starts_at')
    .eq('id', eventoId)
    .maybeSingle()

  const ocupados = new Set<number>()
  if (suya?.starts_at) {
    const { data: vecinas } = await admin
      .from('dinner_tables')
      .select('table_number, event_id, events!inner(starts_at)')
      .eq('events.starts_at', suya.starts_at)
      .neq('event_id', eventoId)

    for (const v of vecinas ?? []) ocupados.add(v.table_number)
  }

  // El siguiente número libre de la noche, en orden.
  let siguiente = 0
  const libre = () => {
    do { siguiente += 1 } while (ocupados.has(siguiente))
    return siguiente
  }

  const plan = [...mesas]
    .sort((a, b) => a.numero - b.numero)
    .map((mesa) => ({ mesa, de: mesa.numero, a: libre() }))
    .filter((c) => c.de !== c.a)

  if (!plan.length) return null

  for (const c of plan) {
    if (c.mesa.publicada !== true) continue
    const { error } = await admin
      .from('dinner_tables')
      .update({ table_number: c.a })
      .eq('event_id', eventoId)
      .eq('table_number', c.de)

    if (error) {
      console.error('[numeros] no se pudo renumerar la mesa publicada', c, error)
      return 'No pudimos renumerar las mesas.'
    }
  }

  for (const c of plan) c.mesa.numero = c.a
  return null
}

/** Si esa fecha ya se reveló. Sin fecha de revelación se trata como revelada. */
export function yaSeRevelo(revelaEn: string | null | undefined): boolean {
  return !revelaEn || new Date(revelaEn) <= new Date()
}
