import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/supabase/database.types'
import { todasLasFilas } from '@/lib/todas-las-filas'

/**
 * Dónde se ha sentado ya cada uno, y cuántas veces.
 *
 * De aquí salen las dos cosas que pidió Michael el 28-10: el veto de local
 * de treinta días y «que diga cuál cena es esta para esa persona».
 *
 * Vive aparte porque la piden DOS sitios con caminos distintos: el pool del
 * reparto, que construye `Persona`, y la lectura del panel, que arma sus
 * listas —la espera, los que llegaron tarde— directamente de
 * `v_matching_pool` sin pasar por `Persona`. Escrito dos veces, el día que
 * una cuente las reservas y la otra los sitios en mesas, la misma persona
 * saldría como «primera vez» en una lista y «2ª cena» en la de al lado.
 *
 * Se cuentan SITIOS EN MESAS y no reservas, a propósito: quien reservó y se
 * quedó en la espera no ha cenado, y contarle esa reserva le diría a quien
 * reparte «2ª cena» sobre alguien que no ha venido nunca.
 */

/** Treinta días sin volver al mismo sitio. Michael, 28-10. */
export const DIAS_SIN_REPETIR_LOCAL = 30

export type Historial = {
  /** Cuántas veces se sentó ANTES de la fecha que se mira. Cero es primera vez. */
  cenasDe: Map<string, number>
  /** Los locales donde se sentó dentro de la ventana del veto. */
  localesRecientesDe: Map<string, Set<string>>
}

export async function historialDeMesas(
  admin: SupabaseClient<Database>,
  ids: string[],
  /**
   * El instante de la cena que se está mirando, no «ahora».
   *
   * Una fecha se reparte con días de antelación, y medir la ventana desde
   * hoy dejaría pasar un local que para la noche de la cena todavía está
   * dentro de los treinta días.
   */
  cuandoEs: number,
): Promise<Historial> {
  const cenasDe = new Map<string, number>()
  const localesRecientesDe = new Map<string, Set<string>>()
  if (!ids.length) return { cenasDe, localesRecientesDe }

  const sentados = await todasLasFilas<{ profile_id: string; dinner_tables: unknown }>(
    (desde, hasta) => admin
      .from('table_members')
      .select('profile_id, dinner_tables!inner(restaurant_id, events!inner(starts_at))')
      .in('profile_id', ids)
      .range(desde, hasta),
  )

  const desdeCuandoCuenta = cuandoEs - DIAS_SIN_REPETIR_LOCAL * 86400_000

  for (const fila of sentados) {
    const mesa = fila.dinner_tables as {
      restaurant_id?: string | null
      events?: { starts_at?: string | null } | null
    } | null

    cenasDe.set(fila.profile_id, (cenasDe.get(fila.profile_id) ?? 0) + 1)

    const local = mesa?.restaurant_id
    const cuando = mesa?.events?.starts_at ? Date.parse(mesa.events.starts_at) : null
    if (!local || cuando == null) continue
    // Solo lo anterior a esta cena y dentro de la ventana. La mesa de ESTA
    // misma fecha, si ya estaba publicada, no es un repetido: es ella misma.
    if (cuando >= cuandoEs || cuando < desdeCuandoCuenta) continue
    if (!localesRecientesDe.has(fila.profile_id)) {
      localesRecientesDe.set(fila.profile_id, new Set())
    }
    localesRecientesDe.get(fila.profile_id)!.add(local)
  }

  return { cenasDe, localesRecientesDe }
}
