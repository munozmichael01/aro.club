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
 * SON DOS CASOS, y el legal los distingue. Yo los trataba igual, que es
 * regalar de más en el más frecuente:
 *
 *   «Si la mesa no se llena» → «te avisamos con al menos 48 horas y tu
 *    crédito vuelve intacto». Sin cortesía: es lo normal, no un fallo.
 *
 *   «Si cancelamos nosotros» → «te devolvemos el crédito y te damos otro de
 *    cortesía». Aquí sí: le rompimos el plan por algo nuestro.
 *
 * Por eso el motivo no es texto libre: es cuál de los dos, y el texto va
 * aparte. Con texto libre, quien cancela no puede decirle al sistema qué
 * clase de cancelación es, y el sistema tiene que adivinar o dar siempre lo
 * mismo — que es lo que hacía.
 *
 * La devolución y la cortesía van en dos apuntes, no en uno con el doble:
 * son cosas distintas y el día que alguien pregunte por su saldo, la
 * respuesta tiene que poder leerse.
 *
 * Los pagos NO se tocan aquí. Si alguien pagó en bolívares, devolver ese
 * dinero es una transferencia que hace una persona; marcarlo como devuelto
 * sin haberlo movido sería mentir en la contabilidad.
 */

const cuerpo = z.object({
  eventoId: z.string().uuid(),
  // Cuál de los dos casos del legal. Decide si hay cortesía, así que no
  // puede deducirse de un texto libre.
  caso: z.enum(['no-se-lleno', 'nuestra'], { error: 'Di de qué tipo es la cancelación.' }),
  // Y el porqué, en palabras. Va en el correo y en el registro: «la
  // cancelamos» sin motivo es lo que hace que alguien no vuelva.
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

  const { eventoId, caso, motivo } = parsed.data
  // Solo cuando la culpa es nuestra. Si no se lleno la mesa, el legal
  // promete el credito intacto y nada mas.
  const conCortesia = caso === 'nuestra'
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
    const apuntes: Record<string, unknown>[] = [
      {
        profile_id: r.profile_id,
        delta: 1,
        reason: 'refund',
        booking_id: r.id,
        note: 'Cancelamos la fecha: ' + motivo,
      },
    ]

    if (conCortesia) {
      apuntes.push({
        profile_id: r.profile_id,
        delta: 1,
        reason: 'goodwill',
        booking_id: r.id,
        note: 'Cortesía por haber cancelado nosotros',
      })
    }

    await admin.from('credit_ledger').insert(apuntes as never)

    // El caso va en el correo: no se le cuenta lo mismo a quien se queda sin
    // mesa porque no se junto gente que a quien se la quitamos nosotros.
    await encolar({ perfil: r.profile_id }, 'fecha_cancelada', { caso, motivo, conCortesia }, { eventoId })
  }

  await admin.from('events').update({ status: 'cancelled' } as never).eq('id', eventoId)

  await anotar(actor, 'fecha_cancelada', 'evento', eventoId, {
    caso,
    motivo,
    conCortesia,
    afectados: (reservas ?? []).length,
  })

  return NextResponse.json({
    estado: 'cancelada',
    afectados: (reservas ?? []).length,
    creditosPorPersona: conCortesia ? 2 : 1,
    // Lo que NO hace esta ruta, para que quien la use lo sepa: el dinero de
    // quien ya pagó se devuelve a mano.
    pagosPorDevolver: (reservas ?? []).filter((r) => r.status === 'pending_payment').length,
  })
}
