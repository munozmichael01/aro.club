import { NextResponse } from 'next/server'
import { z } from 'zod'

import { anotar } from '@/lib/auditoria'
import { encolar } from '@/lib/correos'
import { exigirOps } from '@/lib/ops'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Cancelar una fecha. La cancelamos NOSOTROS, no el miembro.
 *
 * El gemelo de abrir una fecha, y tampoco existía. Pasa de verdad: «a veces
 * no hay suficiente gente compatible una semana concreta», y sin esta ruta la
 * única salida era borrar filas a mano y no avisar a nadie.
 *
 * Lo que se devuelve no me lo invento: está escrito en el legal, que es lo
 * que la gente leyó antes de pagar.
 *
 *   «Si cancelamos nosotros, te devolvemos el crédito y te damos otro de
 *    cortesía.»
 *
 * Dos apuntes en el libro mayor, no uno con el doble: la devolución y la
 * cortesía son cosas distintas y el día que alguien pregunte por su saldo,
 * la respuesta tiene que poder leerse.
 *
 * Los pagos NO se tocan aquí. Si alguien pagó en bolívares, devolver ese
 * dinero es una transferencia que hace una persona; marcarlo como devuelto
 * sin haberlo movido sería mentir en la contabilidad.
 */

const cuerpo = z.object({
  eventoId: z.string().uuid(),
  // Por qué. Va en el correo y en el registro: «la cancelamos» sin motivo es
  // exactamente lo que hace que alguien no vuelva.
  motivo: z
    .string({ error: 'Di por qué se cancela.' })
    .trim()
    .min(1, 'Di por qué se cancela.')
    .max(400),
})

export async function POST(request: Request) {
  const actor = await exigirOps()
  if (!actor) return new NextResponse(null, { status: 404 })

  const parsed = cuerpo.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Revisa los datos.' },
      { status: 400 },
    )
  }

  const { eventoId, motivo } = parsed.data
  const admin = createAdminClient()

  const { data: evento } = await admin
    .from('events')
    .select('id, starts_at, status')
    .eq('id', eventoId)
    .maybeSingle()

  if (!evento) return NextResponse.json({ error: 'Esa fecha no existe.' }, { status: 404 })
  if (evento.status === 'cancelled') {
    return NextResponse.json({ error: 'Esa fecha ya estaba cancelada.' }, { status: 409 })
  }

  // Quién se queda sin cena. `pending_payment` cuenta: su puesto estaba
  // apartado y le prometimos que no lo perdía.
  const { data: reservas } = await admin
    .from('bookings')
    .select('id, profile_id, status')
    .eq('event_id', eventoId)
    .in('status', ['pending_payment', 'confirmed'])

  const ahora = new Date().toISOString()

  await admin
    .from('bookings')
    .update({ status: 'cancelled_by_ops', cancelled_at: ahora, cancel_reason: motivo } as never)
    .eq('event_id', eventoId)
    .in('status', ['pending_payment', 'confirmed'])

  // Las mesas ya repartidas dejan de existir: nadie se sienta en ellas.
  await admin.from('dinner_tables').delete().eq('event_id', eventoId)

  for (const r of reservas ?? []) {
    // La devolución y la cortesía, por separado.
    await admin.from('credit_ledger').insert([
      {
        profile_id: r.profile_id,
        delta: 1,
        reason: 'refund',
        booking_id: r.id,
        note: 'Cancelamos la fecha: ' + motivo,
      },
      {
        profile_id: r.profile_id,
        delta: 1,
        reason: 'goodwill',
        booking_id: r.id,
        note: 'Cortesía por haber cancelado nosotros',
      },
    ] as never)

    await encolar({ perfil: r.profile_id }, 'fecha_cancelada', { motivo }, { eventoId })
  }

  await admin.from('events').update({ status: 'cancelled' } as never).eq('id', eventoId)

  await anotar(actor, 'fecha_cancelada', 'evento', eventoId, {
    motivo,
    afectados: (reservas ?? []).length,
  })

  return NextResponse.json({
    estado: 'cancelada',
    afectados: (reservas ?? []).length,
    // Lo que NO hace esta ruta, para que quien la use lo sepa: el dinero de
    // quien ya pagó se devuelve a mano.
    pagosPorDevolver: (reservas ?? []).filter((r) => r.status === 'pending_payment').length,
  })
}
