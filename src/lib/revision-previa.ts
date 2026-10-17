import 'server-only'

import type { createAdminClient } from '@/lib/supabase/admin'

type Admin = ReturnType<typeof createAdminClient>

/**
 * Qué se va a quedar fuera si nadie toca nada antes de revelar.
 *
 * El 17-10 cinco personas pagaron, tuvieron su mesa armada, y esa mesa no se
 * publicó: rompía tres reglas y el panel la frena a propósito, porque forzar
 * es una decisión de alguien. A las doce salió la revelación de las otras
 * cuatro mesas y a ellas no les llegó nada —ni mesa, ni «esta vez no», ni el
 * crédito de vuelta— porque las dos cosas van pegadas a publicar. Se supo
 * porque una de ellas escribió por Instagram.
 *
 * El panel lo enseñaba. Lo que faltaba era que alguien lo mirara, y eso no
 * es una tarea: es una alarma.
 *
 * Esto es la comprobación, y vive aparte del cron porque el correo la vuelve
 * a hacer al componerse. Si la lista se guardara en el payload, el correo
 * diría lo que pasaba hace diez minutos, que es justo cuando alguien puede
 * haberlo arreglado ya.
 */
export async function problemasDe(admin: Admin, eventoId: string): Promise<string[]> {
  const problemas: string[] = []

  const { data: reservas } = await admin
    .from('bookings')
    .select('profile_id')
    .eq('event_id', eventoId)
    .eq('status', 'confirmed')

  const confirmados = new Set((reservas ?? []).map((b) => b.profile_id))
  if (!confirmados.size) return problemas

  const { data: mesas } = await admin
    .from('dinner_tables')
    .select('id, table_number, restaurant_id, table_members(profile_id)')
    .eq('event_id', eventoId)
    .order('table_number')

  const sentados = new Set(
    (mesas ?? []).flatMap((t) =>
      ((t.table_members ?? []) as unknown as { profile_id: string }[]).map((m) => m.profile_id),
    ),
  )

  // --- 1 · mesas armadas y sin publicar ---------------------------------
  //
  // Lo que pasó. La corrida viva tiene la mesa entera y nadie la publicó,
  // así que esas personas no existen para el resto del producto.
  const { data: corrida } = await admin
    .from('matching_runs')
    .select('proposal')
    .eq('event_id', eventoId)
    .is('descartada_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const propuesta = ((corrida?.proposal ?? []) as unknown as {
    numero: number
    publicada?: boolean
    restaurante?: string | null
    roturas?: { detalle: string }[]
    integrantes?: { nombre?: string }[]
  }[]).filter((m) => !m.publicada)

  for (const m of propuesta) {
    const gente = (m.integrantes ?? []).map((p) => p.nombre || 'sin nombre')
    const porque = (m.roturas ?? []).map((r) => r.detalle)
    problemas.push(
      `<strong>Mesa ${m.numero}, armada y sin publicar</strong>: ${gente.join(', ')}` +
        (m.restaurante ? ` · ${m.restaurante}` : ' · <strong>sin local</strong>') +
        (porque.length ? `<br />Rompe: ${porque.join(' · ')}` : ''),
    )
  }

  // --- 2 · quien paga y no está en ninguna mesa, ni armada ---------------
  const enPropuesta = new Set(
    propuesta.flatMap((m) => (m.integrantes ?? []).map((p) => p.nombre || '')),
  )
  const sueltos: string[] = []
  for (const id of confirmados) {
    if (sentados.has(id)) continue
    const { data: p } = await admin
      .from('profiles')
      .select('full_name, display_name')
      .eq('id', id)
      .maybeSingle()
    const nombre = p?.full_name || p?.display_name || 'Sin nombre'
    if (!enPropuesta.has(nombre)) sueltos.push(nombre)
  }

  if (sueltos.length) {
    problemas.push(
      `<strong>${sueltos.length} ${sueltos.length === 1 ? 'persona pagó y no tiene mesa' : 'personas pagaron y no tienen mesa'}</strong>: ${sueltos.join(', ')}.` +
        '<br />Si se quedan así, reciben «esta vez no entraste» y se les devuelve el crédito al publicar.',
    )
  }

  // --- 3 · mesas publicadas sin sitio ------------------------------------
  //
  // Una mesa sin local sale con el correo diciendo dónde, y no hay dónde.
  const sinSitio = (mesas ?? []).filter((t) => !t.restaurant_id)
  if (sinSitio.length) {
    problemas.push(
      `<strong>${sinSitio.length === 1 ? 'Una mesa publicada sin local' : sinSitio.length + ' mesas publicadas sin local'}</strong>: ` +
        sinSitio.map((t) => 'mesa ' + t.table_number).join(', ') + '.',
    )
  }

  return problemas
}
