import { NextResponse } from 'next/server'
import { z } from 'zod'

import { anotar } from '@/lib/auditoria'
import { exigirOps } from '@/lib/ops'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Quién vino. Lo marca operación, y solo operación.
 *
 * `bookings.status` tiene el valor 'attended' desde el esquema inicial, el
 * Histórico lo lee para pintar «· no vino», la ficha del miembro lo traduce a
 * «Fue» y `events_attended` cuenta cenas con él. Y NADIE lo escribía: no hay
 * un solo `attended` de escritura en todo `src/`. Todas esas pantallas
 * enseñaban una columna que nunca cambiaba de valor.
 *
 * No se le pregunta a quien cenó, y esa decisión es de fondo, no de comodidad:
 *
 *  - Quien no fue tampoco contesta la encuesta, así que preguntarlo ahí deja
 *    fuera justo el caso que interesa.
 *  - Marcar la ausencia de otro es una acusación, y la encuesta es anónima.
 *  - `events_attended` decide reincidencias y el veto de tres meses. Un dato
 *    que decide eso no puede depender de que a alguien le apetezca contestar.
 *
 * Se guarda en la reserva y no en `table_members` porque la ausencia existe
 * aunque la mesa se rehaga: quien no vino el jueves no vino, y la mesa en la
 * que estuviera sentado es otra cosa.
 */

const cuerpo = z.object({
  reservaId: z.string().uuid(),
  // `null` es «todavía no se sabe», que es un estado de verdad y no un hueco:
  // el jueves a las nueve de la noche nadie ha venido todavía.
  vino: z.union([z.literal(true), z.literal(false), z.null()]),
})

/** De lo que dice el interruptor al estado de la reserva. */
const ESTADO = {
  true: 'attended',
  false: 'no_show',
  null: 'confirmed',
} as const

export async function POST(request: Request) {
  const actorId = await exigirOps()
  if (!actorId) return new NextResponse(null, { status: 404 })

  const parsed = cuerpo.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Petición inválida.' }, { status: 400 })
  }
  const { reservaId, vino } = parsed.data

  const admin = createAdminClient()

  const { data: reserva } = await admin
    .from('bookings')
    .select('id, status, profile_id, event_id, events(starts_at)')
    .eq('id', reservaId)
    .maybeSingle()

  if (!reserva) return NextResponse.json({ error: 'Esa reserva no existe.' }, { status: 404 })

  // Una reserva cancelada no se marca como asistida. Quien canceló no vino, y
  // pisar 'cancelled_by_user' con 'attended' borraría por qué no vino.
  if (reserva.status === 'cancelled_by_user' || reserva.status === 'cancelled_by_ops') {
    return NextResponse.json(
      { error: 'Esa reserva está cancelada. La asistencia no la deshace.' },
      { status: 409 },
    )
  }

  // Antes de la cena no hay nada que marcar, y marcarlo sería inventárselo.
  const empieza = (reserva.events as unknown as { starts_at: string } | null)?.starts_at
  if (vino !== null && empieza && new Date(empieza).getTime() > Date.now()) {
    return NextResponse.json(
      { error: 'Esa cena todavía no ha empezado.' },
      { status: 409 },
    )
  }

  const nuevo = ESTADO[String(vino) as keyof typeof ESTADO]
  if (nuevo === reserva.status) return NextResponse.json({ estado: reserva.status })

  const { error } = await admin
    .from('bookings')
    .update({ status: nuevo } as never)
    .eq('id', reservaId)

  if (error) {
    console.error('[asistencia] no se pudo marcar', error)
    return NextResponse.json({ error: 'No pudimos guardarlo.' }, { status: 500 })
  }

  // Queda quién lo marcó: es el dato que decide vetos, y un veto sin firma no
  // se puede discutir con la persona a la que se le aplica.
  await anotar(actorId, 'asistencia_marcada', 'reserva', reservaId, {
    perfil: reserva.profile_id,
    de: reserva.status,
    a: nuevo,
  })

  return NextResponse.json({ estado: nuevo })
}
