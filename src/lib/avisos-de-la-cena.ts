import 'server-only'

import { SEGUNDO_ACTO } from '@/lib/reglas'
import type { createAdminClient } from '@/lib/supabase/admin'

type Admin = ReturnType<typeof createAdminClient>

/**
 * Los avisos con hora de la cena: el juego y el bar del segundo acto.
 *
 * Vivían dentro de `publicar`, y por eso quien entraba a una mesa ya
 * publicada —el hueco que rellena `rellenarHueco` cuando alguien cancela—
 * no tenía ninguno: recibía su mesa y nada más. Michael, 03-11: quien entra
 * tarde recibe TODO. Así que hay una sola función y la llaman los dos.
 *
 *  - `juego`, veinte minutos después de la hora. Solo push.
 *  - `segundo_acto`, a `barEn`, si la fecha tiene bar. Push y correo.
 *
 * Lo que dicen se lee al ENVIAR (`correos-datos.ts`): la mesa del juego, el
 * bar, los minutos y si la persona sigue sentada. La fila no lleva nada que
 * pueda quedarse viejo; el `mesaId` del payload es solo el rastro.
 *
 * Leer y luego insertar, no `upsert`: el índice de «uno por persona y fecha»
 * es parcial y supabase-js no sabe usarlo de árbitro (el 42P10 que dejó el
 * juego sin encolar NUNCA, ver `publicar`). El índice sigue siendo la red si
 * dos llamadas llegan a la vez.
 *
 * Y nada que ya pasó: si la hora del aviso quedó atrás hace más de una hora,
 * no se encola. Es el mismo margen con el que `correos-datos` deja de mandar
 * el del bar, y alguien sentado a las once no necesita «¿ya pidieron?».
 */

const MARGEN_MS = 60 * 60_000

export type Sentados = { mesaId: string; perfiles: string[] }[]

export async function encolarAvisosDeLaCena(
  admin: Admin,
  evento: { id: string; starts_at: string; after_venue_id?: string | null },
  sentados: Sentados,
): Promise<void> {
  const vigente = (iso: string) => Date.now() < Date.parse(iso) + MARGEN_MS

  const alJuego = new Date(Date.parse(evento.starts_at) + 20 * 60_000).toISOString()
  const barEn = evento.after_venue_id ? SEGUNDO_ACTO.barEn(evento.starts_at) : null

  const tipos: { kind: 'juego' | 'segundo_acto'; sendAt: string }[] = []
  if (vigente(alJuego)) tipos.push({ kind: 'juego', sendAt: alJuego })
  if (barEn && vigente(barEn)) tipos.push({ kind: 'segundo_acto', sendAt: barEn })

  for (const { kind, sendAt } of tipos) {
    const { data: yaTienen, error: errorLeyendo } = await admin
      .from('scheduled_emails')
      .select('profile_id')
      .eq('event_id', evento.id)
      .eq('kind', kind as never)
    if (errorLeyendo) {
      console.error(`[avisos de la cena] no se pudo leer la cola de ${kind}`, errorLeyendo)
      continue
    }

    const conAviso = new Set((yaTienen ?? []).map((f) => f.profile_id))
    const nuevas = sentados.flatMap((m) =>
      m.perfiles
        .filter((perfilId) => !conAviso.has(perfilId))
        .map((perfilId) => ({
          profile_id: perfilId,
          kind,
          event_id: evento.id,
          send_at: sendAt,
          payload: kind === 'juego' ? { mesaId: m.mesaId } : {},
        })),
    )

    const { error } = nuevas.length
      ? await admin.from('scheduled_emails').insert(nuevas as never)
      : { error: null }
    // No tumba a quien llama: las mesas ya están puestas, y estos avisos son
    // lo último que debe impedir que alguien sepa dónde cena.
    if (error) console.error(`[avisos de la cena] no se encoló ${kind}`, error)
  }
}
