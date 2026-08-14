import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { encolar } from '@/lib/correos'

/**
 * Cancelar un puesto.
 *
 * Con más de 24 horas el crédito vuelve entero. Con menos se pierde,
 * porque a esas alturas la mesa ya está armada con su nombre, el
 * restaurante tiene la reserva y los otros cinco contaban con seis.
 *
 * El margen se mide contra la HORA DE LA CENA, no contra el cierre de la
 * fecha: son cosas distintas y la que le importa a la mesa es la primera.
 */

const cuerpo = z.object({
  reservaId: z.string().uuid(),
  motivo: z.string().max(200).optional(),
})

const HORAS_DE_MARGEN = 24

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sin sesión.' }, { status: 401 })

  const reservaId = new URL(request.url).searchParams.get('reserva')
  const admin = createAdminClient()

  let q = admin
    .from('bookings')
    .select(
      'id, status, event_id, events(starts_at, reveal_at, format, restaurants!events_restaurant_id_fkey(name, zone_slug)), table_members(table_id)',
    )
    .eq('profile_id', user.id)
    .in('status', ['pending_payment', 'confirmed'])

  if (reservaId) q = q.eq('id', reservaId)

  const { data: reserva, error } = await q
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Se registra el error en vez de tragarlo: un embed mal escrito devuelve
  // data null igual que "no hay reserva", y eso me ha costado ya tres
  // ratos en este proyecto.
  if (error) {
    console.error('[cancelar] no se pudo leer la reserva', error)
    return NextResponse.json({ error: 'No pudimos leer tu reserva.' }, { status: 500 })
  }
  if (!reserva) return NextResponse.json({ error: 'No tienes ninguna reserva viva.' }, { status: 404 })

  const evento = reserva.events as unknown as {
    starts_at: string
    reveal_at: string | null
    format: string | null
    restaurants: { name: string; zone_slug: string | null } | null
  } | null

  const faltan = evento
    ? (new Date(evento.starts_at).getTime() - Date.now()) / 3600_000
    : 0

  // Qué cena es, para que la pantalla no la escriba a mano. Estaban fijos en
  // el marcado —«Cena · jueves 14», «7:00 p.m. · Las Mercedes»— así que
  // quien iba a soltar su puesto leía la fecha de otra persona. En la
  // pantalla donde renuncias a algo, eso es lo último que puede fallar.
  //
  // El RESTAURANTE solo después de revelar, como en el resto: cancelar no
  // puede ser la puerta de atrás para saber dónde es.
  const revelado = evento?.reveal_at ? Date.now() >= new Date(evento.reveal_at).getTime() : false

  let zona: string | null = null
  const slug = evento?.restaurants?.zone_slug ?? null
  if (slug) {
    const { data: z } = await admin.from('zones').select('name').eq('slug', slug).maybeSingle()
    zona = z?.name ?? null
  }

  return NextResponse.json({
    reservaId: reserva.id,
    empiezaEn: evento?.starts_at ?? null,
    formato: evento?.format ?? 'dinner',
    zona,
    restaurante: revelado ? (evento?.restaurants?.name ?? null) : null,
    horasQueFaltan: Math.max(0, Math.round(faltan)),
    // Lo único que cambia el resultado, y por eso se decide aquí.
    conMargen: faltan >= HORAS_DE_MARGEN,
    // Si ya tiene mesa, cancelar la deja en cinco: nadie ocupa su sitio a
    // estas alturas.
    yaTieneMesa: ((reserva.table_members ?? []) as unknown[]).length > 0,
  })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sin sesión.' }, { status: 401 })

  const parsed = cuerpo.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Petición inválida.' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: reserva } = await admin
    .from('bookings')
    .select('id, status, event_id, profile_id, events(starts_at)')
    .eq('id', parsed.data.reservaId)
    .maybeSingle()

  if (!reserva || reserva.profile_id !== user.id) {
    // 404 y no 403: confirmar que la reserva existe pero es de otro ya dice
    // demasiado.
    return NextResponse.json({ error: 'Esa reserva no existe.' }, { status: 404 })
  }
  // Dos estados de cancelacion en el enum: quien cancela y por que. Esta
  // ruta es la del miembro, asi que siempre `cancelled_by_user`; operacion
  // tiene la suya.
  if (reserva.status === 'cancelled_by_user' || reserva.status === 'cancelled_by_ops') {
    return NextResponse.json({ error: 'Esa reserva ya está cancelada.' }, { status: 409 })
  }

  const evento = reserva.events as unknown as { starts_at: string } | null
  const faltan = evento ? (new Date(evento.starts_at).getTime() - Date.now()) / 3600_000 : 0
  const conMargen = faltan >= HORAS_DE_MARGEN
  const ahora = new Date().toISOString()

  await admin
    .from('bookings')
    .update({
      status: 'cancelled_by_user',
      cancelled_at: ahora,
      cancel_reason: parsed.data.motivo ?? null,
      hold_until: null,
    })
    .eq('id', reserva.id)

  // Sale de la mesa si ya la tenía. La mesa se queda en cinco: a menos de
  // 24 horas no hay a quién meter, y a más de 24 el reparto se rehace solo
  // cuando se vuelva a repartir.
  await admin.from('table_members').delete().eq('booking_id', reserva.id)

  if (conMargen) {
    // El crédito vuelve al libro mayor. No se "suma un crédito": se anota
    // una devolución, que es lo que permite auditar el saldo después.
    await admin.from('credit_ledger').insert({
      profile_id: user.id,
      delta: 1,
      reason: 'refund',
      booking_id: reserva.id,
      note: 'Cancelación con más de 24 horas',
    })
  }

  // Y el pago, si lo había: se marca devuelto para que operación lo vea y
  // haga la transferencia de vuelta. El dinero no se mueve solo.
  if (conMargen) {
    await admin
      .from('payments')
      .update({ status: 'refunded' })
      .eq('booking_id', reserva.id)
      .in('status', ['under_review', 'confirmed'])
  }

  await encolar(
    { perfil: user.id },
    'cancelacion',
    { conMargen, creditoDevuelto: conMargen },
    { eventoId: reserva.event_id },
  )

  return NextResponse.json({
    estado: 'cancelada',
    creditoDevuelto: conMargen,
    horasQueFaltaban: Math.max(0, Math.round(faltan)),
  })
}
