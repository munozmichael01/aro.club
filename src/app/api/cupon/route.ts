import { NextResponse } from 'next/server'
import { z } from 'zod'

import { anotarPagoDeEvento } from '@/lib/creditos'
import { encolar } from '@/lib/correos'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { declararZonasAlReservar } from '@/lib/zonas-declaradas'

/**
 * Canjear un cupón: aparta el puesto y lo confirma, sin cobrar.
 *
 * Vive aparte de `/api/pago` y no dentro, aunque comparta la mitad de arriba
 * —sesión, fecha abierta, verificada, apartar el puesto—, porque lo de abajo
 * es otro camino entero: no hay método que elegir, ni tasa que congelar, ni
 * referencia que cuadrar, ni captura, ni conciliación. Meterlo en la misma
 * ruta habría sido un `if` gigante encima de un cuerpo que ya valida quince
 * campos que aquí no existen.
 *
 * Lo que sí reutiliza es la idea del método `manual = false`, que ya estaba
 * escrita: confirmar en el acto y mandar el acuse. El cupón es un método de
 * pago que no cobra.
 *
 * ## El orden importa
 *
 * El puesto se aparta ANTES de dar el cupón por gastado. Si el orden fuera al
 * revés y algo fallara por el camino, alguien se quedaría sin código y sin
 * sitio, que es el peor de los dos fallos posibles.
 */

const cuerpo = z.object({
  eventoId: z.string().uuid(),
  codigo: z.string().min(1).max(40),
})

/** Mayúsculas y sin espacios: nadie teclea un código como está guardado. */
function normalizar(codigo: string): string {
  return codigo.trim().toUpperCase().replace(/\s+/g, '')
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sin sesión.' }, { status: 401 })

  const parsed = cuerpo.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Petición inválida.' }, { status: 400 })
  }

  const codigo = normalizar(parsed.data.codigo)
  const admin = createAdminClient()

  // --- la fecha ---------------------------------------------------------
  const { data: evento } = await admin
    .from('events')
    .select('id, starts_at, booking_closes_at, status, credit_cost')
    .eq('id', parsed.data.eventoId)
    .maybeSingle()

  if (!evento) return NextResponse.json({ error: 'Esa fecha no existe.' }, { status: 404 })

  if (new Date(evento.booking_closes_at).getTime() < Date.now()) {
    return NextResponse.json({ error: 'Esa fecha ya cerró.' }, { status: 409 })
  }

  if (evento.status !== 'open' && evento.status !== 'draft') {
    return NextResponse.json(
      { error: 'Esa fecha está cerrada. Mira la siguiente en tu inicio.' },
      { status: 409 },
    )
  }

  // --- verificada, o no hay mesa ----------------------------------------
  //
  // El mismo candado que `/api/reservar` y `/api/pago`. Un cupón no lo abre:
  // es la regla que sostiene que cinco desconocidos se sienten con alguien, y
  // un invitado sin verificar rompe la mesa igual que cualquiera.
  const { data: verificada } = await admin
    .from('v_verified_profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (!verificada) {
    return NextResponse.json(
      { error: 'Verifica tu identidad antes de apartar tu puesto.' },
      { status: 409 },
    )
  }

  // --- el cupón ---------------------------------------------------------
  const { data: cupon } = await admin
    .from('coupons')
    .select('code, descuento_pct, max_usos, usados, caduca_at, event_id, activo')
    .eq('code', codigo)
    .maybeSingle()

  // Un código que no existe y uno apagado dicen lo MISMO a quien lo teclea.
  // Distinguirlos le contaría a un desconocido qué códigos existen.
  if (!cupon || !cupon.activo) {
    return NextResponse.json({ error: 'Ese código no vale.' }, { status: 404 })
  }

  if (cupon.caduca_at && new Date(cupon.caduca_at).getTime() < Date.now()) {
    return NextResponse.json({ error: 'Ese código ya caducó.' }, { status: 409 })
  }

  if (cupon.max_usos != null && cupon.usados >= cupon.max_usos) {
    return NextResponse.json({ error: 'Ese código ya se agotó.' }, { status: 409 })
  }

  if (cupon.event_id && cupon.event_id !== evento.id) {
    return NextResponse.json({ error: 'Ese código no vale para esta fecha.' }, { status: 409 })
  }

  // Hoy solo existe el del 100%. La columna admite parciales para el día que
  // hagan falta, pero cobrar el resto es otro camino —tasa, referencia,
  // conciliación— y prometerlo a medias sería peor que no tenerlo.
  if (cupon.descuento_pct !== 100) {
    return NextResponse.json(
      { error: 'Ese código es de descuento parcial y todavía no podemos aplicarlo.' },
      { status: 409 },
    )
  }

  // --- ¿ya lo usó? ------------------------------------------------------
  //
  // Se pregunta antes aunque el índice único lo impida igual: el mensaje que
  // sale de una violación de índice no se le puede enseñar a nadie.
  const { data: yaCanjeo } = await admin
    .from('coupon_redemptions')
    .select('id')
    .eq('code', codigo)
    .eq('profile_id', user.id)
    .maybeSingle()

  if (yaCanjeo) {
    return NextResponse.json({ error: 'Ya usaste ese código.' }, { status: 409 })
  }

  // --- el puesto, primero -----------------------------------------------
  const { data: yaTiene } = await admin
    .from('bookings')
    .select('id, status')
    .eq('event_id', evento.id)
    .eq('profile_id', user.id)
    .maybeSingle()

  if (yaTiene && yaTiene.status === 'confirmed') {
    return NextResponse.json(
      { error: 'Ya tienes tu puesto en esta fecha.' },
      { status: 409 },
    )
  }

  let bookingId = yaTiene?.id ?? null
  if (!bookingId) {
    const { data: creada, error } = await admin
      .from('bookings')
      .insert({ event_id: evento.id, profile_id: user.id, status: 'pending_payment' })
      .select('id')
      .single()

    if (error || !creada) {
      console.error('[cupon] no se apartó el puesto', error)
      return NextResponse.json({ error: 'No pudimos apartarte el puesto.' }, { status: 500 })
    }
    bookingId = creada.id
  }

  // Igual que al pagar: apuntarse a esta fecha es declarar interés en su
  // zona, y perder esa declaración no puede tumbar el canje.
  await declararZonasAlReservar(user.id, evento.id, bookingId)

  // --- el pago que no cobra ---------------------------------------------
  const ahora = new Date().toISOString()
  const { data: pago, error: errorPago } = await admin
    .from('payments')
    .insert({
      profile_id: user.id,
      booking_id: bookingId,
      metodo: 'cupon',
      moneda: 'USD',
      amount_usd: 0,
      amount_local: null,
      reportado_en: ahora,
      paid_at: ahora,
      datos: { cupon: codigo } as never,
      // Confirmado de salida: no hay nada que cuadrar con ningún banco.
      status: 'confirmed',
    })
    .select('id')
    .single()

  if (errorPago) {
    // El puesto ya está apartado —en `pending_payment`— así que no se pierde:
    // se puede reintentar o pagarlo. Lo que no se hace es confirmar sin
    // dejar rastro del canje.
    console.error('[cupon] no se registró el canje como pago', errorPago)
    return NextResponse.json({ error: 'No pudimos aplicar el código.' }, { status: 500 })
  }

  // --- y ahora sí, el cupón se da por gastado ---------------------------
  const { error: errorCanje } = await admin.from('coupon_redemptions').insert({
    code: codigo,
    profile_id: user.id,
    booking_id: bookingId,
    payment_id: pago.id,
  })

  if (errorCanje) {
    // 23505 es el índice de un uso por persona: dos pestañas a la vez. El
    // puesto ya está, así que no se le dice que falló nada.
    if (errorCanje.code !== '23505') {
      console.error('[cupon] no se anotó el canje', errorCanje)
    }
  } else {
    await admin
      .from('coupons')
      .update({ usados: cupon.usados + 1 })
      .eq('code', codigo)
  }

  await anotarPagoDeEvento(user.id, bookingId, evento.credit_cost ?? 1, 'coupon')

  await admin
    .from('bookings')
    .update({ status: 'confirmed', confirmed_at: ahora })
    .eq('id', bookingId)

  await encolar({ perfil: user.id }, 'puesto_con_cupon', { cupon: codigo }, { eventoId: evento.id })

  return NextResponse.json({ estado: 'confirmado', puestoApartado: true })
}
