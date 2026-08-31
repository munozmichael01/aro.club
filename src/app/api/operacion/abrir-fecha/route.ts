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

  // Lo que ya pasó de `locked` no vuelve: si las mesas están repartidas,
  // reabrir dejaría entrar gente a una fecha que ya tiene mesas hechas y
  // nadie la volvería a repartir. Para eso está despublicar.
  if (evento.status !== 'open' && evento.status !== 'locked') {
    return NextResponse.json(
      { error: `Esa fecha está en «${evento.status}» y esto solo abre y cierra.` },
      { status: 409 },
    )
  }

  const nuevo = abierta ? 'open' : 'locked'
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
