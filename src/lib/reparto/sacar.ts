import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/supabase/database.types'

/**
 * Quien cancela sale de la propuesta que todavía no se ha publicado.
 *
 * La propuesta guardada es una FOTO del momento en que alguien pulsó
 * repartir. Hasta ahora, quien cancelaba después se quedaba dentro de la
 * foto, y eso dejaba a operación en un callejón sin salida que se vio el
 * 30-10 con la mesa 01 del viernes:
 *
 *  - publicar se negaba, con razón, porque no se sienta a quien ya no está
 *    («vuelve a repartir antes de publicar»);
 *  - y arrastrarla a la espera para sacarla a mano también se negaba, porque
 *    `/api/operacion/propuesta` solo conoce a quien tiene reserva viva y
 *    contestaba «esa persona no está». Desde el panel eso se lee como que el
 *    arrastre no funciona.
 *
 * Michael, 30-10: «si cancela debería moverse automáticamente al bloque de
 * cancelados». Así que sale sola, al cancelar, y la mesa queda con los que de
 * verdad van. Repartir sigue estando ahí para rearmarla, pero ya no es
 * obligatorio para poder publicar.
 *
 * LO QUE NO TOCA, A PROPÓSITO:
 *
 *  - **Las mesas ya publicadas.** Ahí la verdad es `table_members`, no la
 *    foto, y quien cancela ya se borra de esa tabla. Pisar la foto de una
 *    mesa publicada borraría a quien el panel necesita seguir pintando con
 *    su chip de «ya no está» para ver a quién le falta sitio.
 *  - **Las corridas viejas.** Solo la última, que es la que el panel abre.
 *    Las anteriores son historia y reescribirlas sería mentir sobre lo que
 *    se propuso aquel día.
 *  - **Los números de las mesas.** Renumerar es del panel, donde hay alguien
 *    mirando. Una mesa que se queda vacía sí se quita: publicarla crearía una
 *    mesa de verdad sin nadie dentro.
 */

type Integrante = { profileId: string }

type Mesa = {
  numero: number
  publicada?: boolean
  integrantes: Integrante[]
}

export type Sacada = {
  /** Los números de las mesas sin publicar de las que salió. */
  mesas: number[]
  /** Si además estaba en la espera de esa corrida. */
  deLaEspera: boolean
  /** Las mesas que se quedaron sin nadie y se quitaron. */
  vaciadas: number[]
}

export async function sacarDeLaPropuesta(
  admin: SupabaseClient<Database>,
  eventoId: string,
  profileId: string,
): Promise<Sacada | null> {
  const { data: corrida, error: errorLeyendo } = await admin
    .from('matching_runs')
    .select('id, proposal, unmatched')
    .eq('event_id', eventoId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (errorLeyendo) {
    console.error('[sacar] no se pudo leer la corrida', eventoId, errorLeyendo)
    return null
  }
  if (!corrida) return null

  const mesas = ((corrida.proposal ?? []) as unknown as Mesa[]) ?? []
  const espera = ((corrida.unmatched ?? []) as unknown as Integrante[]) ?? []

  const salio: number[] = []
  for (const m of mesas) {
    // Publicada: manda `table_members`. La foto se deja como está.
    if (m.publicada) continue
    const antes = (m.integrantes ?? []).length
    m.integrantes = (m.integrantes ?? []).filter((i) => i.profileId !== profileId)
    if (m.integrantes.length !== antes) salio.push(m.numero)
  }

  const enLaEspera = espera.findIndex((e) => e.profileId === profileId)
  if (enLaEspera >= 0) espera.splice(enLaEspera, 1)

  if (!salio.length && enLaEspera < 0) {
    return { mesas: [], deLaEspera: false, vaciadas: [] }
  }

  // Una mesa sin publicar que se queda sin nadie se quita: publicarla sería
  // crear una mesa de verdad vacía. Las publicadas no entran aquí.
  const vaciadas = mesas
    .filter((m) => !m.publicada && (m.integrantes ?? []).length === 0)
    .map((m) => m.numero)
  const quedan = mesas.filter((m) => m.publicada || (m.integrantes ?? []).length > 0)

  const { error } = await admin
    .from('matching_runs')
    .update({ proposal: quedan as never, unmatched: espera as never })
    .eq('id', corrida.id)

  if (error) {
    console.error('[sacar] no se pudo guardar la propuesta', corrida.id, error)
    return null
  }

  return { mesas: salio, deLaEspera: enLaEspera >= 0, vaciadas }
}
