import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/**
 * F6 · Apuntarse a una fecha.
 *
 * Se elige la FECHA. Las zonas NO se preguntan aquí.
 *
 * Ya nos dijo en el cuestionario a qué zonas puede ir sin problema, así que
 * volver a preguntárselo cada semana es pedirle dos veces lo mismo. Se
 * cruzan las suyas con las que abrimos esa fecha, y nosotros decidimos
 * dónde se sienta dentro de ese conjunto.
 *
 * Esto es deliberado y va contra la pantalla de Timeleft, que hace elegir
 * una zona: con poco volumen, partir el pool en tantos trozos como zonas
 * deja mesas sin llenar. El parametro `zonas` existe para el dia que se
 * quiera acotar una fecha concreta desde operacion, no para pedirselo a
 * ella.
 */

const cuerpo = z.object({
  eventoId: z.string().uuid(),
  // Opcional a propósito. Por defecto valen las zonas que ya declaró en el
  // cuestionario: no se le vuelve a preguntar.
  zonas: z.array(z.string().regex(/^[a-z-]+$/)).optional(),
})

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sin sesión.' }, { status: 401 })

  const eventoId = new URL(request.url).searchParams.get('evento')
  const admin = createAdminClient()

  const { data: evento } = await admin
    .from('events')
    .select('id, starts_at, booking_closes_at, credit_cost, status')
    .eq('id', eventoId ?? '')
    .maybeSingle()

  if (!evento) return NextResponse.json({ error: 'Esa fecha no existe.' }, { status: 404 })

  const { data: sedes } = await admin
    .from('event_venues')
    .select('zone_slug')
    .eq('event_id', evento.id)

  const abiertas = [...new Set((sedes ?? []).map((v) => v.zone_slug))]

  const { data: zonas } = await admin
    .from('zones')
    .select('slug, name, municipality')
    .in('slug', abiertas.length ? abiertas : ['__ninguna__'])
    .order('sort_order')

  // Las que declaró en el cuestionario vienen premarcadas: es lo que ya
  // contestó, y volver a preguntárselo de cero cada semana sobra.
  const { data: traits } = await admin
    .from('profile_traits')
    .select('zones')
    .eq('profile_id', user.id)
    .maybeSingle()

  const suyas = new Set(traits?.zones ?? [])

  const { data: reserva } = await admin
    .from('bookings')
    .select('id, status')
    .eq('event_id', evento.id)
    .eq('profile_id', user.id)
    .maybeSingle()

  const { data: elegidas } = reserva
    ? await admin.from('booking_zones').select('zone_slug').eq('booking_id', reserva.id)
    : { data: null }

  const yaElegidas = new Set((elegidas ?? []).map((z) => z.zone_slug))

  return NextResponse.json({
    evento: {
      id: evento.id,
      empiezaEn: evento.starts_at,
      cierraEn: evento.booking_closes_at,
      creditos: evento.credit_cost,
    },
    // Solo las que abrimos. Las demás no se enseñan apagadas: una opción
    // que no se puede elegir es ruido, no información.
    zonas: (zonas ?? []).map((z) => ({
      codigo: z.slug,
      nombre: z.name,
      municipio: z.municipality,
      marcada: reserva ? yaElegidas.has(z.slug) : suyas.has(z.slug),
    })),
    reservada: reserva?.status === 'confirmed',
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
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Petición inválida.' },
      { status: 400 },
    )
  }

  const { eventoId, zonas } = parsed.data
  const admin = createAdminClient()

  const { data: evento } = await admin
    .from('events')
    .select('id, booking_closes_at, credit_cost, status')
    .eq('id', eventoId)
    .maybeSingle()

  if (!evento) return NextResponse.json({ error: 'Esa fecha no existe.' }, { status: 404 })

  if (new Date(evento.booking_closes_at).getTime() < Date.now()) {
    return NextResponse.json({ error: 'Esa fecha ya cerró.' }, { status: 409 })
  }

  // Y el cierre A MANO, que hasta ahora no lo miraba nadie. Esta ruta solo
  // comprobaba el reloj, así que una fecha cerrada desde el panel seguía
  // aceptando apuntados por API: la pantalla escondía el botón y el candado
  // no existía. Un candado que solo está en la pantalla no es un candado.
  if (evento.status !== 'open' && evento.status !== 'draft') {
    return NextResponse.json(
      { error: 'Esa fecha está cerrada. Mira la siguiente en tu inicio.' },
      { status: 409 },
    )
  }

  // Solo zonas que se abrieron. Aceptar una que no existe esa noche la
  // dejaría fuera de todas las mesas sin que se entere.
  const { data: sedes } = await admin
    .from('event_venues')
    .select('zone_slug')
    .eq('event_id', evento.id)

  const abiertas = new Set((sedes ?? []).map((v) => v.zone_slug))

  // Las suyas, salvo que se pasen otras a propósito.
  const { data: rasgos } = await admin
    .from('profile_traits')
    .select('zones')
    .eq('profile_id', user.id)
    .maybeSingle()

  const suyas = zonas ?? rasgos?.zones ?? []
  const validas = suyas.filter((z: string) => abiertas.has(z))

  if (!validas.length) {
    // No es un error suyo: es que esta fecha no abre ninguna de las zonas a
    // las que dijo que puede ir. Se dice cual es el caso, no "revisa tus
    // datos".
    return NextResponse.json(
      {
        error: 'Esta fecha no abre ninguna de tus zonas. Te avisamos cuando haya una que te sirva.',
        motivo: 'sin-zona',
      },
      { status: 409 },
    )
  }

  // Verificada, o no hay mesa. Es la regla que sostiene que cinco
  // desconocidos se sienten con ella.
  const { data: verificada } = await admin
    .from('v_verified_profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (!verificada) {
    return NextResponse.json({ error: 'Verifica tu identidad antes de reservar.' }, { status: 409 })
  }

  const { data: saldo } = await admin
    .from('v_credit_balance')
    .select('balance')
    .eq('profile_id', user.id)
    .maybeSingle()

  const coste = evento.credit_cost ?? 1
  const { data: yaTiene } = await admin
    .from('bookings')
    .select('id, status')
    .eq('event_id', evento.id)
    .eq('profile_id', user.id)
    .maybeSingle()

  // Una reserva CANCELADA no es una reserva. Antes se reutilizaba tal cual:
  // quien cancelaba y se volvia a apuntar recibia un "apuntada" y seguia
  // cancelado, sin cobro y sin puesto. La fila se revive y se vuelve a
  // cobrar el credito, porque el anterior ya se le devolvio.
  const estabaCancelada =
    yaTiene?.status === 'cancelled_by_user' || yaTiene?.status === 'cancelled_by_ops'

  // Apuntarse NO tiene tope.
  //
  // `max_seats` existe y recorta mesas, pero eso se decide en el reparto, no
  // aquí: apuntarse está abierto y a quien no entre lo sostiene la lista de
  // espera. Rechazar una reserva por aforo sería cerrar la puerta a alguien
  // que sí puede acabar sentado —basta con que otra persona cancele o con
  // que abramos una mesa más— y perder justo a quien tenemos que colocar la
  // semana siguiente.

  // El crédito se cobra una vez: quien cambia de zonas no vuelve a pagar.
  // Pero quien se reapunta después de cancelar sí, porque el suyo volvió.
  if ((!yaTiene || estabaCancelada) && (saldo?.balance ?? 0) < coste) {
    return NextResponse.json({ error: 'No te quedan encuentros.' }, { status: 409 })
  }

  let bookingId = yaTiene && !estabaCancelada ? yaTiene.id : null

  if (estabaCancelada && yaTiene) {
    await admin
      .from('bookings')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        cancelled_at: null,
        cancel_reason: null,
      })
      .eq('id', yaTiene.id)

    await admin.from('credit_ledger').insert({
      profile_id: user.id,
      delta: -coste,
      reason: 'event_charge',
      booking_id: yaTiene.id,
    })

    bookingId = yaTiene.id
  }

  if (!bookingId) {
    const { data: creada, error } = await admin
      .from('bookings')
      .insert({
        event_id: evento.id,
        profile_id: user.id,
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (error || !creada) {
      console.error('[reservar] no se creó', error)
      return NextResponse.json({ error: 'No pudimos apuntarte.' }, { status: 500 })
    }
    bookingId = creada.id

    await admin.from('credit_ledger').insert({
      profile_id: user.id,
      delta: -coste,
      reason: 'event_charge',
      booking_id: bookingId,
    })
  }

  // Se reemplazan enteras: si quita una zona, tiene que desaparecer.
  await admin.from('booking_zones').delete().eq('booking_id', bookingId)
  const { error: errorZonas } = await admin
    .from('booking_zones')
    .insert(validas.map((z) => ({ booking_id: bookingId as string, zone_slug: z })))

  if (errorZonas) {
    console.error('[reservar] zonas', errorZonas)
    return NextResponse.json({ error: 'No pudimos guardar tus zonas.' }, { status: 500 })
  }

  return NextResponse.json({ estado: 'apuntada', zonas: validas })
}
