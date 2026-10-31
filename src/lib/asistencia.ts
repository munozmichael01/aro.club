import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import { encolar } from '@/lib/correos'
import { trasMarcarAsistencia } from '@/lib/referidos'
import type { Database } from '@/lib/supabase/database.types'

/**
 * Quién vino a una mesa, decidido por la mesa.
 *
 * Hasta el 31-10 esto era medio producto: la encuesta sabía marcar que
 * alguien FALTÓ —con dos marcas— y no sabía marcar que alguien VINO. Lo
 * segundo solo lo escribía operación a mano, así que una reserva que nadie
 * tocaba se quedaba «confirmada» para siempre aunque esa persona cenara.
 *
 * No era un detalle: de `attended` cuelgan las cenas de cada quien, el veto
 * de tres meses, los reincidentes y —desde hoy— el premio de los referidos,
 * que se gana cuando tres invitados van a su PRIMERA cena. Si nadie marca,
 * nadie gana nunca y no falla nada: simplemente no ocurre.
 *
 * Michael, 31-10: «si el 50% de la mesa o más lo marca como no vino, y lo
 * mismo si no se marca interpretamos que vino y lo marcamos. El manual sigue
 * funcionando igual».
 *
 * ## Las tres reglas, y por qué están escritas así
 *
 * 1. **El denominador es quien RESPONDIÓ**, no la mesa entera. «La mitad de
 *    la mesa» con seis sentados y dos respuestas significa tres marcas, que
 *    nunca van a llegar: la regla se volvería más estricta que la de antes
 *    —dos marcas— justo cuando se buscaba lo contrario. Con dos respuestas,
 *    las dos de acuerdo, se marca.
 * 2. **Nunca con una sola respuesta.** Una persona sola no decide que otra
 *    no vino: eso no es la mesa, es alguien.
 * 3. **Solo se tocan las reservas sin decidir.** Lo que puso operación a
 *    mano manda siempre, en los dos sentidos.
 *
 * Y si NADIE respondió, no se escribe nada. Dar por asistido a todo el mundo
 * porque nadie dijo lo contrario sería inventarse el único dato del producto
 * que tiene que ser verdad.
 */

/** Las que todavía no dicen si vino o no: son las únicas que se tocan. */
const SIN_DECIDIR = ['confirmed', 'pending_payment'] as const

export type Cierre = {
  /** Cuántas respuestas de la encuesta había en esa mesa. */
  respondieron: number
  /** A cuántos se les marcó que vinieron. */
  vinieron: string[]
  /** A cuántos se les marcó que no. */
  faltaron: string[]
  /** Si no se tocó nada, por qué. */
  motivo?: 'sin-respuestas' | 'nada-que-decidir'
}

/**
 * Cuántas marcas hacen falta para dar a alguien por ausente.
 *
 * La mitad de quienes respondieron, redondeando hacia arriba, y nunca menos
 * de dos. Con tres respuestas hacen falta dos; con cuatro, dos; con cinco,
 * tres.
 */
export function marcasNecesarias(respondieron: number): number {
  return Math.max(2, Math.ceil(respondieron / 2))
}

/**
 * Cierra la asistencia de UNA mesa.
 *
 * Se llama cuando esa cena ya está lo bastante lejos como para que la foto
 * no vaya a cambiar —el cron lo decide— y es idempotente: lo que ya está
 * decidido no se vuelve a tocar.
 */
export async function cerrarAsistenciaDeMesa(
  admin: SupabaseClient<Database>,
  mesaId: string,
  seco = false,
): Promise<Cierre> {
  const { data: mesa } = await admin
    .from('dinner_tables')
    .select('id, event_id')
    .eq('id', mesaId)
    .maybeSingle()

  if (!mesa?.event_id) return { respondieron: 0, vinieron: [], faltaron: [], motivo: 'sin-respuestas' }

  const { data: sentados } = await admin
    .from('table_members')
    .select('profile_id')
    .eq('table_id', mesaId)

  const miembros = (sentados ?? []).map((m) => m.profile_id).filter(Boolean) as string[]
  if (!miembros.length) return { respondieron: 0, vinieron: [], faltaron: [], motivo: 'sin-respuestas' }

  /**
   * Quién respondió DE VERDAD: contestó, no se la saltó.
   *
   * `saltada_at` es «ahora no», y quien se la salta no ha dicho nada de
   * nadie. Contarlo como respuesta subiría el listón de las marcas con una
   * opinión que no existe.
   */
  const { data: respuestas } = await admin
    .from('table_feedback')
    .select('profile_id, saltada_at')
    .eq('table_id', mesaId)

  const contestaron = new Set(
    (respuestas ?? []).filter((r) => !r.saltada_at).map((r) => r.profile_id),
  )

  /**
   * Y quién marcó a quién. También cuenta como respuesta quien solo marcó
   * ausencias sin puntuar la mesa: dijo algo de la gente, que es justo lo
   * que aquí se está contando.
   */
  const { data: senales } = await admin
    .from('peer_feedback')
    .select('rater_id, rated_id, signal')
    .eq('table_id', mesaId)

  for (const s of senales ?? []) if (s.rater_id) contestaron.add(s.rater_id)

  const respondieron = contestaron.size
  if (!respondieron) {
    return { respondieron: 0, vinieron: [], faltaron: [], motivo: 'sin-respuestas' }
  }

  const marcas = new Map<string, number>()
  for (const s of senales ?? []) {
    if (s.signal !== 'ausente' || !s.rated_id) continue
    marcas.set(s.rated_id, (marcas.get(s.rated_id) ?? 0) + 1)
  }

  const hacenFalta = marcasNecesarias(respondieron)

  const { data: reservas } = await admin
    .from('bookings')
    .select('id, profile_id, status')
    .eq('event_id', mesa.event_id)
    .in('profile_id', miembros)

  const vinieron: string[] = []
  const faltaron: string[] = []

  for (const r of reservas ?? []) {
    if (!(SIN_DECIDIR as readonly string[]).includes(r.status)) continue
    const falto = (marcas.get(r.profile_id) ?? 0) >= hacenFalta
    if (falto) faltaron.push(r.id)
    else vinieron.push(r.id)
  }

  if (!vinieron.length && !faltaron.length) {
    return { respondieron, vinieron: [], faltaron: [], motivo: 'nada-que-decidir' }
  }

  if (!seco) {
    for (const [ids, estado] of [[vinieron, 'attended'], [faltaron, 'no_show']] as const) {
      if (!ids.length) continue
      const { error } = await admin
        .from('bookings')
        // Firmado: lo que cierra el automático se puede corregir después con
        // una respuesta tardía; lo que pone una persona, no.
        .update({ status: estado, asistencia_por: 'encuesta' } as never)
        .in('id', ids)
        // Otra vez el candado, por si algo cambió entre leer y escribir: lo
        // que ya decidió una persona no se pisa.
        .in('status', [...SIN_DECIDIR])
      if (error) console.error('[asistencia] no se pudo cerrar', mesaId, estado, error)
    }
  }

  // Y el premio de quien los invitó, por cada uno que acaba de contar como
  // asistido. Después de escribir: si el premio falla, la asistencia ya está.
  if (!seco) {
    for (const id of vinieron) {
      const quien = (reservas ?? []).find((r) => r.id === id)?.profile_id
      if (quien) await premiarAQuienInvito(admin, quien)
    }
  }

  return { respondieron, vinieron, faltaron }
}

/**
 * Y lo que cuelga de marcar que alguien vino: el premio de quien lo invitó.
 *
 * Vive aquí y no en cada sitio que escribe `attended` porque son dos —el
 * panel y el cierre de la mesa— y el día que haya un tercero tiene que
 * heredar esto sin acordarse.
 *
 * El correo se elige por lo que pasó: si con esta persona llegó a tres, el
 * de «tu próxima reserva es gratis»; si no, el de «llevas 2 de 3». Y si no
 * la invitó nadie, no pasa nada, que es el caso normal.
 *
 * Nunca revienta: marcar la asistencia es lo que importa.
 */
export async function premiarAQuienInvito(
  admin: SupabaseClient<Database>,
  perfilId: string,
): Promise<void> {
  try {
    const r = await trasMarcarAsistencia(admin, perfilId)
    if (!r) return

    await encolar(
      { perfil: r.quienInvita },
      r.premio.nuevos > 0 ? 'referido_premio' : 'referido_avanza',
      {
        // Quién acaba de ir, para poder decir su nombre. Va el id y no el
        // nombre: el correo lo resuelve al mandar, como todo lo demás.
        porQuien: perfilId,
        asistieron: r.premio.asistieron,
        avance: r.premio.avance,
        premios: r.premio.premios,
      },
    )
  } catch (e) {
    // Incluye el caso de que la migración de los dos tipos nuevos todavía no
    // esté aplicada: el correo no sale, la asistencia sí queda marcada.
    console.error('[asistencia] no se pudo avisar del referido', perfilId, e)
  }
}
