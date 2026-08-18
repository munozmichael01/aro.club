import { NextResponse } from 'next/server'
import { z } from 'zod'

import { campoDe, valido } from '@/lib/reglas'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { encolar } from '@/lib/correos'

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
  // La ruta que devolvió `/api/pago/captura`. Va aparte y no dentro de
  // `datos`: `datos` son los textos que escribió la persona para su método, y
  // meter aquí un valor que no es uno de esos campos es exactamente lo que
  // rompía el reporte cuando la pantalla colaba un booleano.
  captura: z.string().min(3).max(200).optional(),
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

  // El candado de verificar estaba SOLO al final, al reportar el pago: sin
  // verificar se recorrían cuatro pantallas, se leían los datos del banco y
  // se hacía la transferencia, y el 409 llegaba después de haber mandado el
  // dinero. El corte va donde se decide, no donde se termina.
  const { data: verificada } = await admin
    .from('v_verified_profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  const { data: evento } = await admin
    .from('events')
    .select('id, starts_at, price_usd, booking_closes_at, zone_slug')
    .eq('id', eventoId ?? '')
    .maybeSingle()

  if (!evento) return NextResponse.json({ error: 'Esa fecha no existe.' }, { status: 404 })

  // Todos, encendidos y apagados: los apagados se enseñan atenuados con
  // "Pronto". Esconderlos haría creer que no existen.
  const { data: metodosRaw } = await admin
    .from('payment_methods')
    .select('id, nombre, moneda, manual, activo, datos_cuenta, campos, captura_obligatoria')
    .order('orden')

  // `pendiente_de_datos_reales` empezó siendo una nota mía que no impedía
  // nada, y la pantalla enseñaba un teléfono de Pago Móvil inventado como si
  // fuera una cuenta a la que transferir. Durante un tiempo el método se
  // apagaba entero.
  //
  // Ahora no se esconde: se AVISA. Apagarlo hacía imposible probar el pago,
  // y esconder unos datos falsos no es lo que protege a nadie —lo que
  // protege es que se lea "esto es de prueba, no envíes dinero" justo encima
  // del número—. El día que los datos sean los de verdad, se quita la marca
  // y el aviso desaparece solo.
  const metodos = (metodosRaw ?? []).map((m) => {
    const datos = (m.datos_cuenta ?? {}) as Record<string, unknown>
    return { ...m, datosDePrueba: datos.pendiente_de_datos_reales === true }
  })

  const { data: zona } = evento.zone_slug
    ? await admin.from('zones').select('name').eq('slug', evento.zone_slug).maybeSingle()
    : { data: null }
  const nombreZona = zona?.name ?? null

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
    // La zona por nombre. La pantalla la sacaba de un parametro de la URL y,
    // sin el, caia en «Jueves 14 · Las Mercedes» de la maqueta: una fecha y
    // un sitio inventados encima del importe que va a transferir.
    evento: {
      id: evento.id,
      empiezaEn: evento.starts_at,
      cierraEn: evento.booking_closes_at,
      zona: nombreZona,
    },
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
      // Los datos de nuestra cuenta solo de los encendidos, y solo a quien
      // puede pagar: publicar los de un método apagado invita a pagar por un
      // canal que no miramos, y publicárselos a quien no está verificada
      // invita a transferir por un puesto que no se le va a apartar.
      cuenta: m.activo && verificada ? m.datos_cuenta : null,
      // Para que la pantalla pueda avisar encima del numero.
      datosDePrueba: m.datosDePrueba,
      campos: m.campos,
      capturaObligatoria: m.captura_obligatoria,
    })),
    // Para que la pantalla corte al principio y diga qué falta, en vez de
    // dejar llegar hasta el final.
    verificada: !!verificada,
    pago: pagoVivo
      ? { estado: pagoVivo.status, metodo: pagoVivo.metodo, reportadoEn: pagoVivo.reportado_en }
      : null,
  })
}

/** Definición de un campo del método, tal como viene del catálogo. */
type Campo = { campo: string; tipo?: string }

/** La referencia: el campo que el propio método llama `ref`. */
const refDe = (campos: Campo[], datos: Record<string, string>) => {
  const c = campos.find((x) => x.campo === 'ref')
  return c ? (datos[c.campo]?.trim() || null) : null
}

/** El banco emisor: el campo declarado de tipo `banco`. */
const bancoDe = (campos: Campo[], datos: Record<string, string>) => {
  const c = campos.find((x) => x.tipo === 'banco')
  return c ? (datos[c.campo]?.trim() || null) : null
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

  const { eventoId, metodo, datos, captura } = parsed.data

  // La captura tiene que ser de quien reporta. La ruta la escribe el servidor
  // con el id delante, así que comprobarlo es comparar el prefijo: sin esto,
  // mandar la ruta de otro adjuntaría su comprobante a este pago.
  if (captura && !captura.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: 'Esa captura no es tuya.' }, { status: 403 })
  }
  const admin = createAdminClient()

  const { data: m } = await admin
    .from('payment_methods')
    .select('id, nombre, moneda, activo, manual, campos, captura_obligatoria, datos_cuenta')
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
  const campos = (m.campos ?? []) as {
    campo: string
    etiqueta: string
    requerido?: boolean
    tipo?: string
    prefijo?: string
    largo?: number
  }[]

  const faltan = campos.filter((c) => c.requerido !== false && !datos[c.campo]?.trim())
  if (faltan.length) {
    return NextResponse.json(
      { error: `Falta ${faltan[0].etiqueta.toLowerCase()}.`, campo: faltan[0].campo },
      { status: 400 },
    )
  }

  // Y la FORMA, con las mismas reglas que usa la pantalla para filtrar al
  // teclear. Antes solo se comprobaba que no vinieran vacíos: un teléfono
  // de tres dígitos entraba, y luego nadie encontraba el pago en el banco.
  for (const c of campos) {
    const regla = campoDe(c)
    const valor = datos[c.campo]
    if (!regla || !valor) continue
    if (!valido(regla, valor)) {
      return NextResponse.json(
        { error: `${c.etiqueta} no tiene el formato correcto.`, campo: c.campo },
        { status: 400 },
      )
    }
  }

  // La letra del documento: V o E, y aquí también. Hay extranjeros
  // residentes pagando con cédula E, y sin la letra operación busca en el
  // banco un V-18442019 que no existe. Si la pantalla no la manda, no se
  // asume V: se pide.
  const pideDoc = campos.find((c) => (c as { conTipo?: boolean }).conTipo)
  if (pideDoc) {
    const letra = (datos.doc_tipo ?? '').toUpperCase()
    if (letra !== 'V' && letra !== 'E') {
      return NextResponse.json(
        { error: 'Elige si tu documento es V o E.', campo: 'doc_tipo' },
        { status: 400 },
      )
    }
    datos.doc_tipo = letra
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

  // Verificada, o no hay puesto.
  //
  // Esta comprobación estaba en `/api/reservar` y NO estaba aquí, y eso
  // dejaba la regla abierta por el lado que importa: reportar un pago es lo
  // que aparta el puesto y lo que dispara el correo de «tu puesto está
  // apartado». Una cuenta sin verificar podía llegar hasta ahí —se comprobó
  // con una de verdad, que recibió el correo sin haber pasado por revisión—.
  //
  // Es la regla que sostiene todo lo demás: cinco desconocidos se sientan
  // con alguien porque una persona miró su cédula. Con una sola puerta sin
  // candado, la promesa no vale.
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
    // El metodo real, por su id. Antes aqui iba ademas `method: 'pago_movil'`
    // FIJO —un Bizum quedaba registrado como pago movil— y esa columna se
    // quito: el enum en paralelo a la tabla de metodos era la misma
    // duplicacion, y habia divergido en el 100% de las filas.
    metodo: m.id,
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
    captura_path: captura ?? null,
    // La referencia y el banco viven en su columna ADEMÁS de en `datos`.
    // Estaban siempre en null porque nadie las escribía, y cuadrar un pago
    // contra el banco se hace justo por la referencia: el histórico del panel
    // la enseñaba vacía en todas las filas.
    //
    // Cuál es cada una lo dice el catálogo del método, no una lista escrita
    // aquí: el campo que se llama `ref` y el que es de tipo `banco`. Bizum no
    // tiene referencia —por eso su captura es obligatoria— y ahí queda null,
    // que es la verdad.
    reference_code: refDe(campos, datos),
    payer_bank: bancoDe(campos, datos),
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
  await encolar(
    { perfil: user.id },
    m.manual ? 'pago_en_revision' : 'pago_confirmado',
    { metodo: m.id, monto: usd },
    { eventoId: evento.id },
  )

  return NextResponse.json({
    estado: m.manual ? 'reportado' : 'confirmado',
    // Lo primero que tiene que leer: su puesto está apartado.
    puestoApartado: true,
  })
}
