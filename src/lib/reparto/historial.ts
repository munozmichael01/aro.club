import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/supabase/database.types'
import { DESDE_QUE_ES_REAL } from '@/lib/ops'
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

/** Cuántos ids caben en la URL por vuelta. El corte real ronda los 600. */
const POR_TROZO_DE_IDS = 150

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

  /**
   * POR TROZOS DE IDS, además de por tramos. Son dos topes distintos.
   *
   * El `in` viaja dentro de la URL, y con unos seiscientos uuid la petición
   * se pasa de largo: PostgREST contesta 400, el cliente NO lanza y deja
   * `data` en nulo. O sea, «esta gente no ha cenado nunca» para todo el
   * pool. Es lo que dejó al club sin un solo «abrimos zona» desde el 17-10,
   * y por eso existe `enTrozos`.
   *
   * Hoy un pool son treinta personas y no se nota. El día de una fecha
   * grande sí, y entonces el veto de local dejaría de ver historia de nadie
   * sin que fallara nada. Lo cazó el agente de la app auditando.
   */
  const sentados: { profile_id: string; dinner_tables: unknown }[] = []
  for (let i = 0; i < ids.length; i += POR_TROZO_DE_IDS) {
    const trozo = ids.slice(i, i + POR_TROZO_DE_IDS)
    sentados.push(...await todasLasFilas<{ profile_id: string; dinner_tables: unknown }>(
      (desde, hasta) => admin
        .from('table_members')
        .select('profile_id, dinner_tables!inner(restaurant_id, events!inner(starts_at))')
        .in('profile_id', trozo)
        .order('table_id')
        .range(desde, hasta),
    ))
  }

  const desdeCuandoCuenta = cuandoEs - DIAS_SIN_REPETIR_LOCAL * 86400_000

  for (const fila of sentados) {
    const mesa = fila.dinner_tables as {
      restaurant_id?: string | null
      events?: { starts_at?: string | null; status?: string | null; es_prueba?: boolean | null } | null
    } | null

    const cuando = mesa?.events?.starts_at ? Date.parse(mesa.events.starts_at) : null

    /**
     * LAS QUE NO CUENTAN COMO HABER CENADO.
     *
     * Una mesa de una fecha de PRUEBA, una de una fecha CANCELADA, y
     * cualquiera anterior al 12-10, que es desde cuando hay gente real.
     * Sentarse en una mesa de prueba no es haber cenado, y contarlo tiene
     * dos efectos: le dice a quien reparte «2ª cena» de alguien que no ha
     * venido nunca, y le frena una mesa por un local donde «ya cenó» en una
     * prueba de principios de octubre.
     *
     * Y tiene que ser ANTERIOR a la cena que se mira: la mesa de esa misma
     * fecha, si ya estaba publicada, no es historia suya, es ella misma.
     *
     * Lo cazó el agente de la app auditando.
     */
    if (cuando == null) continue
    if (mesa?.events?.es_prueba) continue
    if (mesa?.events?.status === 'cancelled') continue
    if (cuando < Date.parse(DESDE_QUE_ES_REAL)) continue
    if (cuando >= cuandoEs) continue

    cenasDe.set(fila.profile_id, (cenasDe.get(fila.profile_id) ?? 0) + 1)

    const local = mesa?.restaurant_id
    if (!local) continue
    // Y de lo que cuenta, solo lo que cae dentro de la ventana del veto.
    if (cuando < desdeCuandoCuenta) continue
    if (!localesRecientesDe.has(fila.profile_id)) {
      localesRecientesDe.set(fila.profile_id, new Set())
    }
    localesRecientesDe.get(fila.profile_id)!.add(local)
  }

  return { cenasDe, localesRecientesDe }
}
