import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/**
 * F7 · Reportar un pago.
 *
 * Un pago reportado NO es un pago confirmado. Pago Móvil, Zelle y Bizum son
 * transferencias: la persona sale al banco, paga, vuelve y reporta. Alguien
 * cuadra ese reporte con el movimiento real.
 *
 * Tres cosas que se deciden aquí y no en la pantalla:
 *
 *  - El puesto se aparta AL REPORTAR. Esperar a la conciliación significaría
 *    que alguien paga y se queda sin sitio.
 *  - La tasa se congela al reportar. Entre reportar y confirmar pasan horas
 *    y la tasa se mueve: vale el monto que reportó.
 *  - Un método apagado no acepta reportes NI POR API. El interruptor de la
 *    pantalla no es el control: es el reflejo del control.
 */

const cuerpo = z.object({
  eventoId: z.string().uuid(),
  metodo: z.string().min(1),
  datos: z.record(z.string(), z.string()),
  // La tasa que la pantalla le ENSEÑÓ. No es un dato de adorno: es con la
  // que hizo la transferencia.
  tasaVista: z.number().positive().optional(),
})

/**
 * Los céntimos de esta persona en esta fecha. Estables entre cargas y
 * distintos entre personas, que es lo que se les pide.
 */
function centimosDe(profileId: string, eventoId: string) {
  const semilla = `${profileId}:${eventoId}`
  let h = 0
  for (let i = 0; i < semilla.length; i++) h = (h * 31 + semilla.charCodeAt(i)) % 100_000
  return h % 100
}

/** La tasa del día. Sin ella no se puede cobrar en bolívares. */
async function tasaDelDia(admin: ReturnType<typeof createAdminClient>) {
  const { data } = await admin
    .from('fx_rates')
    .select('rate_date, usd_to_ves')
    .order('rate_date', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data
}

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
    .select('id, starts_at, price_usd, booking_closes_at')
    .eq('id', eventoId ?? '')
    .maybeSingle()

  if (!evento) return NextResponse.json({ error: 'Esa fecha no existe.' }, { status: 404 })

  // Todos, encendidos y apagados: los apagados se enseñan atenuados con
  // "Pronto". Esconderlos haría creer que no existen.
  const { data: metodos } = await admin
    .from('payment_methods')
    .select('id, nombre, moneda, manual, activo, datos_cuenta, campos, captura_obligatoria')
    .order('orden')

  const tasa = await tasaDelDia(admin)
  const usd = Number(evento.price_usd ?? 8)

  // Los céntimos son un discriminador, no un capricho: hacen que monto y
  // fecha identifiquen el pago casi unívocamente contra el estado de cuenta
  // del banco, sin integrar nada.
  //
  // Y son DETERMINISTAS. Con Math.random() cambiaban en cada carga: la
  // persona veía 499,94, recargaba y veía 499,72, pagaba uno de los dos y
  // nosotros buscábamos el otro. Justo lo contrario de para lo que están.
  const centimos = centimosDe(user.id, evento.id)

  const { data: reserva } = await admin
    .from('bookings')
    .select('id, status')
    .eq('event_id', evento.id)
    .eq('profile_id', user.id)
    .maybeSingle()

  const { data: pagoVivo } = reserva
    ? await admin
        .from('payments')
        .select('id, status, metodo, amount_local, reportado_en')
        .eq('booking_id', reserva.id)
        .in('status', ['awaiting_proof', 'under_review', 'confirmed'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null }

  return NextResponse.json({
    evento: { id: evento.id, empiezaEn: evento.starts_at, cierraEn: evento.booking_closes_at },
    montoUsd: usd,
    tasa: tasa ? Number(tasa.usd_to_ves) : null,
    // El monto exacto con los céntimos ya dentro: es el que tiene que
    // transferir, y el que operación busca en el banco.
    montoLocal: tasa ? Number((usd * Number(tasa.usd_to_ves) + centimos / 100).toFixed(2)) : null,
    centimos,
    metodos: (metodos ?? []).map((m) => ({
      id: m.id,
      nombre: m.nombre,
      moneda: m.moneda,
      activo: m.activo,
      manual: m.manual,
      // Los datos de nuestra cuenta solo de los encendidos: publicar los de
      // un método apagado invita a pagar por un canal que no miramos.
      cuenta: m.activo ? m.datos_cuenta : null,
      campos: m.campos,
      capturaObligatoria: m.captura_obligatoria,
    })),
    pago: pagoVivo
      ? { estado: pagoVivo.status, metodo: pagoVivo.metodo, reportadoEn: pagoVivo.reportado_en }
      : null,
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

  const { eventoId, metodo, datos } = parsed.data
  const admin = createAdminClient()

  const { data: m } = await admin
    .from('payment_methods')
    .select('id, nombre, moneda, activo, manual, campos, captura_obligatoria')
    .eq('id', metodo)
    .maybeSingle()

  if (!m) return NextResponse.json({ error: 'Ese método no existe.' }, { status: 400 })
  if (!m.activo) {
    // Ni por API. Si solo lo impidiera la pantalla, el interruptor sería
    // decorativo.
    return NextResponse.json({ error: 'Ese método no está disponible.' }, { status: 409 })
  }

  // Cada método pide lo que de verdad genera. Se valida contra SU esquema,
  // no contra una lista fija de columnas.
  const campos = (m.campos ?? []) as { campo: string; etiqueta: string; requerido?: boolean }[]
  const faltan = campos.filter((c) => c.requerido !== false && !datos[c.campo]?.trim())
  if (faltan.length) {
    return NextResponse.json(
      { error: `Falta ${faltan[0].etiqueta.toLowerCase()}.`, campo: faltan[0].campo },
      { status: 400 },
    )
  }

  const { data: evento } = await admin
    .from('events')
    .select('id, price_usd, booking_closes_at')
    .eq('id', eventoId)
    .maybeSingle()

  if (!evento) return NextResponse.json({ error: 'Esa fecha no existe.' }, { status: 404 })
  if (new Date(evento.booking_closes_at).getTime() < Date.now()) {
    return NextResponse.json({ error: 'Esa fecha ya cerró.' }, { status: 409 })
  }

  const tasa = await tasaDelDia(admin)
  if (!tasa && m.moneda === 'VES') {
    // Sin tasa no se puede decir cuánto son ocho dólares hoy, y cobrar con
    // la de ayer es cobrar mal.
    return NextResponse.json(
      { error: 'No tenemos la tasa de hoy. Inténtalo en un rato.' },
      { status: 503 },
    )
  }

  const usd = Number(evento.price_usd ?? 8)
  const ahora = new Date().toISOString()

  // Vale la tasa que VIO, no la que hay cuando vuelve.
  //
  // Congelarla al reportar tiene un hueco que no salta a la vista: entre
  // que la pantalla le dice "transfiere 6.053,78" y que vuelve del banco a
  // reportar, el cron de medianoche puede haber cambiado la tasa. Entonces
  // ella transfirio un importe y nosotros registrabamos otro, y operacion
  // se pondria a buscar en el banco un movimiento que no existe.
  //
  // Asi que se acepta la suya, comprobando que sea una que publicamos de
  // verdad: si no, no es "la que vio", es una inventada.
  let tasaAplicada = tasa ? Number(tasa.usd_to_ves) : null

  if (m.moneda === 'VES' && parsed.data.tasaVista) {
    const { data: publicadas } = await admin
      .from('fx_rates')
      .select('usd_to_ves')
      .order('rate_date', { ascending: false })
      .limit(3)

    const vale = (publicadas ?? []).some(
      (r) => Math.abs(Number(r.usd_to_ves) - parsed.data.tasaVista!) < 0.0001,
    )

    if (vale) {
      tasaAplicada = parsed.data.tasaVista
    } else {
      // Ni la de ahora ni ninguna reciente: se para y se le dice el importe
      // nuevo, en vez de registrar en silencio uno que no pagó.
      return NextResponse.json(
        {
          error: 'La tasa cambió mientras pagabas. Revisa el monto y vuelve a reportarlo.',
          tasa: tasaAplicada,
          montoLocal: tasaAplicada
            ? Number((usd * tasaAplicada + centimosDe(user.id, evento.id) / 100).toFixed(2))
            : null,
        },
        { status: 409 },
      )
    }
  }

  // El puesto se aparta AQUÍ. Es lo primero que pasa, antes que el pago:
  // si el orden fuera al revés y algo fallara, habría pagado sin sitio.
  const { data: yaTiene } = await admin
    .from('bookings')
    .select('id, status')
    .eq('event_id', evento.id)
    .eq('profile_id', user.id)
    .maybeSingle()

  let bookingId = yaTiene?.id ?? null
  if (!bookingId) {
    const { data: creada, error } = await admin
      .from('bookings')
      .insert({
        event_id: evento.id,
        profile_id: user.id,
        // `pending_payment` y no `confirmed`: el puesto está apartado, no
        // confirmado. Lo confirma quien concilia.
        status: 'pending_payment',
      })
      .select('id')
      .single()

    if (error || !creada) {
      console.error('[pago] no se apartó el puesto', error)
      return NextResponse.json({ error: 'No pudimos apartarte el puesto.' }, { status: 500 })
    }
    bookingId = creada.id
  }

  const { error: errorPago } = await admin.from('payments').insert({
    profile_id: user.id,
    booking_id: bookingId,
    metodo: m.id,
    method: 'pago_movil',
    moneda: m.moneda,
    amount_usd: usd,
    // Con los céntimos dentro: es el importe exacto que sale de su cuenta,
    // y el que operación busca en el banco.
    amount_local:
      m.moneda === 'VES' && tasaAplicada
        ? Number((usd * tasaAplicada + centimosDe(user.id, evento.id) / 100).toFixed(2))
        : null,
    cents_token: centimosDe(user.id, evento.id),
    fx_rate: m.moneda === 'VES' ? tasaAplicada : null,
    fx_congelado_en: m.moneda === 'VES' ? ahora : null,
    reportado_en: ahora,
    datos: datos as never,
    // Manual entra a la cola. El débito lo confirma el banco y se salta
    // este estado entero.
    status: m.manual ? 'under_review' : 'confirmed',
  })

  if (errorPago) {
    console.error('[pago] no se registró el reporte', errorPago)
    return NextResponse.json({ error: 'No pudimos registrar tu pago.' }, { status: 500 })
  }

  if (!m.manual) {
    await admin
      .from('bookings')
      .update({ status: 'confirmed', confirmed_at: ahora })
      .eq('id', bookingId)
  }

  // El aviso queda EN COLA. Hoy no hay remitente y no sale nada, pero el
  // dia que exista, esto ya funciona sin volver a tocar el flujo.
  await admin.from('scheduled_emails').insert({
    profile_id: user.id,
    kind: m.manual ? 'pago_en_revision' : 'pago_confirmado',
    event_id: evento.id,
    send_at: ahora,
    payload: { metodo: m.id, monto: usd } as never,
  } as never)

  return NextResponse.json({
    estado: m.manual ? 'reportado' : 'confirmado',
    // Lo primero que tiene que leer: su puesto está apartado.
    puestoApartado: true,
  })
}
