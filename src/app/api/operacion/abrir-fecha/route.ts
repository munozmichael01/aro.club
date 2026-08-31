import { NextResponse } from 'next/server'
import { z } from 'zod'

import { anotar } from '@/lib/auditoria'
import { exigirOps } from '@/lib/ops'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Abrir y cerrar una fecha a mano.
 *
 * Hasta ahora una fecha solo se cerraba sola, al llegar `booking_closes_at`
 * —48 horas antes— o al repartir. No había forma de decir «esta ya no admite
 * gente» sin esperar al reloj, y hace falta: la primera campaña manda a todo
 * el mundo a una sola fecha, y la de la semana en curso tiene que dejar de
 * recibir apuntados aunque todavía falten días.
 *
 * ESTO NO ES UN CUPO, y la diferencia importa porque el producto se apoya en
 * ella. No se limita cuánta gente entra en una fecha abierta: se apunta quien
 * quiera y el reparto arma las mesas que hagan falta. Lo que esto hace es
 * cerrar la fecha ENTERA, que es una decisión de operación y no una de aforo.
 * Por eso el miembro la ve «Cerrada» y no «Agotada»: agotada sería mentira.
 *
 * `locked` ya existía en el enum desde el esquema inicial y es el estado en
 * el que queda una fecha al cerrarse sola. Se reutiliza: un estado nuevo para
 * lo mismo serían dos verdades.
 */

const cuerpo = z.object({
  eventoId: z.string().uuid(),
  abierta: z.boolean(),
})

export async function POST(request: Request) {
  const actorId = await exigirOps()
  if (!actorId) return new NextResponse(null, { status: 404 })

  const parsed = cuerpo.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Petición inválida.' }, { status: 400 })
  }
  const { eventoId, abierta } = parsed.data

  const admin = createAdminClient()
  const { data: evento } = await admin
    .from('events')
    .select('id, status, starts_at')
    .eq('id', eventoId)
    .maybeSingle()

  if (!evento) return NextResponse.json({ error: 'Esa fecha no existe.' }, { status: 404 })

  // Una fecha ya repartida TAMBIÉN se puede reabrir, y reabrirla no toca las
  // mesas hechas: viven en `dinner_tables` y `table_members`, y el estado de
  // la fecha no las mira. Lo que hace es volver a admitir gente; a quien
  // entre después se le busca hueco con el rellenado o en el siguiente
  // reparto. Cerrar la puerta por si acaso obligaba a despublicar la fecha
  // entera —deshaciendo mesas buenas— para admitir a uno más.
  //
  // Lo cancelado sí se queda fuera: reabrir una fecha cancelada sería
  // resucitarla a espaldas de quien ya recibió el aviso.
  if (!['open', 'locked', 'matched'].includes(evento.status)) {
    return NextResponse.json(
      { error: `Esa fecha está en «${evento.status}» y esto solo abre y cierra.` },
      { status: 409 },
    )
  }

  // Al cerrar, el estado sale de si la fecha TIENE MESAS, no de en qué estado
  // está ahora. Mirando el estado actual, el viaje matched → open → locked
  // dejaba una fecha con mesas publicadas marcada como si nunca se hubiera
  // repartido: el panel dejaba de saberlo y `publicar` la habría vuelto a
  // repartir encima. Lo comprobé haciendo el viaje de ida y vuelta.
  const { count: mesas } = await admin
    .from('dinner_tables')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', eventoId)

  const nuevo = abierta ? 'open' : ((mesas ?? 0) > 0 ? 'matched' : 'locked')
  if (nuevo === evento.status) return NextResponse.json({ estado: evento.status })

  const { error } = await admin
    .from('events')
    .update({ status: nuevo } as never)
    .eq('id', eventoId)

  if (error) {
    console.error('[abrir-fecha] no se pudo', error)
    return NextResponse.json({ error: 'No pudimos cambiarla.' }, { status: 500 })
  }

  await anotar(actorId, abierta ? 'fecha_abierta' : 'fecha_cerrada', 'evento', eventoId, {
    de: evento.status,
    a: nuevo,
    empieza_en: evento.starts_at,
  })

  return NextResponse.json({ estado: nuevo })
}
