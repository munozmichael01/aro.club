import { NextResponse } from 'next/server'
import { z } from 'zod'

import { anotar } from '@/lib/auditoria'
import { anotarPagoDeEvento } from '@/lib/creditos'
import { exigirOps } from '@/lib/ops'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Sentar o sacar a alguien de una fecha, también si ya cerró.
 *
 * Existe porque esto se estaba haciendo a mano contra la base, y una fecha
 * cerrada es justo donde no conviene: hay que crear la reserva, cuadrar el
 * crédito, retirar los correos que ya estaban en cola y dejar escrito quién
 * lo hizo. Media docena de pasos en los que olvidarse de uno no falla, solo
 * deja a alguien con un correo que ya no es verdad.
 *
 * ES LA ÚNICA ACCIÓN DEL PANEL QUE SE SALTA EL CIERRE, y por eso es la que
 * más falta hace que quede anotada: `motivo` es obligatorio y va al
 * historial de operación con el nombre de quien lo hizo.
 *
 * NO REABRE LA FECHA. El cierre sigue puesto para todo el mundo: esto mueve
 * a UNA persona, no cambia el estado de la fecha.
 *
 * LO QUE NO HACE, A PROPÓSITO:
 *
 *  - No manda correo al que sale. No hay plantilla para «te sacamos de esta
 *    fecha»: las que hay son para cuando cancela la persona o cuando se cae
 *    la fecha entera, y ninguna de las dos dice la verdad aquí. La respuesta
 *    devuelve su correo para que se le escriba a mano, y el historial deja
 *    escrito que no se le avisó desde el producto.
 *  - No reparte ni publica. Quien entra se queda sin mesa hasta que se
 *    vuelva a repartir, y la respuesta lo dice si la fecha ya tenía mesas
 *    publicadas.
 */

/**
 * A quién: por id o por CORREO, y basta uno.
 *
 * El panel tiene el correo de alguien, no su uuid —es lo mismo que decidió la
 * pestaña de avisos— y pedir el id obligaría a buscarlo en otra pantalla justo
 * en la acción que se usa con prisa.
 *
 * Los dos campos van ESCRITOS en cada rama y no en un objeto compartido que se
 * esparce con `...`. Son cuatro líneas repetidas y se pagan a gusto: el
 * comprobador de «lo que el panel manda» lee las claves de los `z.object` de
 * la ruta, y un `...aQuien` lo deja sin ver `correo`. Pasó aquí — el panel
 * mandaba un campo que el esquema no declaraba y el comprobador decía que todo
 * cuadraba.
 */

const cuerpo = z.discriminatedUnion('accion', [
  z.object({
    accion: z.literal('sentar'),
    eventoId: z.string().uuid(),
    profileId: z.string().uuid().optional(),
    correo: z.string().trim().email().optional(),
    motivo: z.string().trim().min(5, 'Escribe por qué.').max(300),
    /**
     * De dónde sale el puesto.
     *
     * `credito` gasta uno suyo. `cortesia` le regala el puesto y lo anota
     * como tal: un puesto regalado apuntado como compra miente en el único
     * sitio del producto que tiene que cuadrar.
     */
    cargo: z.enum(['credito', 'cortesia']).default('credito'),
  }),
  z.object({
    accion: z.literal('quitar'),
    eventoId: z.string().uuid(),
    profileId: z.string().uuid().optional(),
    correo: z.string().trim().email().optional(),
    motivo: z.string().trim().min(5, 'Escribe por qué.').max(300),
  }),
]).refine((d) => Boolean(d.profileId || d.correo), {
  message: 'Dime a quién: su correo o su id.',
})

export async function POST(request: Request) {
  const actor = await exigirOps()
  if (!actor) return new NextResponse(null, { status: 404 })

  const parsed = cuerpo.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Petición inválida.' },
      { status: 400 },
    )
  }

  const d = parsed.data
  const admin = createAdminClient()

  const { data: evento } = await admin
    .from('events')
    .select('id, starts_at, status, credit_cost, es_prueba')
    .eq('id', d.eventoId)
    .maybeSingle()

  if (!evento) return NextResponse.json({ error: 'Esa fecha no existe.' }, { status: 404 })
  if (evento.status === 'cancelled') {
    return NextResponse.json({ error: 'Esa fecha está cancelada.' }, { status: 409 })
  }

  // El correo se busca EXACTO y no por parecido: aquí se mueve a una persona
  // de una cena, y un `ilike` que empareje a dos deja la elección al azar del
  // orden de la tabla.
  const porCorreo = admin
    .from('profiles')
    .select('id, display_name, full_name, email, es_prueba, deleted_at')
  const { data: candidatas } = await (d.profileId
    ? porCorreo.eq('id', d.profileId)
    : porCorreo.ilike('email', d.correo!))

  if (!candidatas?.length) {
    return NextResponse.json({ error: 'Esa persona no existe.' }, { status: 404 })
  }
  if (candidatas.length > 1) {
    return NextResponse.json(
      { error: 'Ese correo es de más de una cuenta. Dime el id.' },
      { status: 409 },
    )
  }

  const persona = candidatas[0]
  if (persona.deleted_at) {
    return NextResponse.json({ error: 'Esa cuenta está borrada.' }, { status: 404 })
  }

  // A partir de aquí SIEMPRE el id, venga de donde venga.
  const profileId = persona.id
  const quien = persona.display_name || persona.full_name || persona.email

  const { data: reserva } = await admin
    .from('bookings')
    .select('id, status')
    .eq('event_id', d.eventoId)
    .eq('profile_id', profileId)
    .maybeSingle()

  // --- sacar a alguien --------------------------------------------------
  if (d.accion === 'quitar') {
    const viva = reserva && ['held', 'pending_payment', 'confirmed', 'waitlisted'].includes(reserva.status)
    if (!viva) {
      return NextResponse.json({ error: `${quien} no tiene puesto en esa fecha.` }, { status: 409 })
    }

    // Si ya está sentada en una mesa PUBLICADA no se saca por aquí: esa mesa
    // ya le dijo a cinco personas con quién cenan, y sacarla por detrás deja
    // la mesa diciendo una cosa y la base otra. Primero se despublica.
    const { data: sentada } = await admin
      .from('table_members')
      .select('table_id, dinner_tables!inner(event_id)')
      .eq('profile_id', profileId)
      .eq('dinner_tables.event_id', d.eventoId)

    if (sentada?.length) {
      return NextResponse.json(
        {
          error: `${quien} ya está sentada en una mesa publicada. Despublícala primero.`,
          mesaPublicada: true,
        },
        { status: 409 },
      )
    }

    const { error } = await admin
      .from('bookings')
      .update({
        status: 'cancelled_by_ops',
        cancelled_at: new Date().toISOString(),
        cancel_reason: d.motivo,
      } as never)
      .eq('id', reserva!.id)

    if (error) {
      console.error('[asiento] no se pudo quitar', error)
      return NextResponse.json({ error: 'No pudimos quitarle el puesto.' }, { status: 500 })
    }

    // El crédito vuelve. Si no se le cobró ninguno —una cortesía, un cupón—
    // no se le devuelve uno que no gastó: se mira el cargo de ESTA reserva.
    const { data: cargo } = await admin
      .from('credit_ledger')
      .select('id, delta')
      .eq('booking_id', reserva!.id)
      .eq('reason', 'event_charge')
      .maybeSingle()

    let devuelto = 0
    if (cargo) {
      const { error: errorCredito } = await admin.from('credit_ledger').insert({
        profile_id: profileId,
        delta: Math.abs(cargo.delta),
        reason: 'refund',
        booking_id: reserva!.id,
        note: 'Puesto retirado por operación: ' + d.motivo,
      } as never)
      if (errorCredito) console.error('[asiento] no se devolvió el crédito', errorCredito)
      else devuelto = Math.abs(cargo.delta)
    }

    // Y los correos que todavía no han salido para esa fecha: sin esto le
    // llega «tu mesa» de una cena en la que ya no está.
    const { data: retirados } = await admin
      .from('scheduled_emails')
      .delete()
      .eq('event_id', d.eventoId)
      .eq('profile_id', profileId)
      .is('sent_at', null)
      .select('id')

    await anotar(actor, 'asiento_quitado', 'reserva', reserva!.id, {
      evento: d.eventoId,
      perfil: profileId,
      quien,
      motivo: d.motivo,
      creditoDevuelto: devuelto,
      correosRetirados: retirados?.length ?? 0,
      // Queda escrito que el producto NO le avisó.
      avisadaPorElProducto: false,
    })

    return NextResponse.json({
      estado: 'quitada',
      quien,
      // Para escribirle a mano, que es lo que toca.
      correo: persona.email,
      creditoDevuelto: devuelto,
      correosRetirados: retirados?.length ?? 0,
      aviso: 'No se le mandó ningún correo: no hay plantilla para esto. Escríbele tú.',
    })
  }

  // --- sentar a alguien -------------------------------------------------
  if (reserva && ['held', 'pending_payment', 'confirmed', 'attended'].includes(reserva.status)) {
    return NextResponse.json({ error: `${quien} ya tiene puesto en esa fecha.` }, { status: 409 })
  }

  // La misma vista con la que `/api/reservar` decide: si aquí se mirara otra
  // cosa, el panel sentaría a quien el producto no deja apuntarse.
  const { data: verificada } = await admin
    .from('v_verified_profiles')
    .select('id')
    .eq('id', profileId)
    .maybeSingle()

  if (!verificada) {
    return NextResponse.json({ error: `${quien} no está verificada.` }, { status: 409 })
  }

  const coste = evento.credit_cost ?? 1

  if (d.cargo === 'credito') {
    const { data: saldo } = await admin
      .from('v_credit_balance')
      .select('balance')
      .eq('profile_id', profileId)
      .maybeSingle()

    if ((saldo?.balance ?? 0) < coste) {
      return NextResponse.json(
        {
          error: `${quien} no tiene créditos. Si le das el puesto, elige cortesía.`,
          sinCreditos: true,
        },
        { status: 409 },
      )
    }
  }

  // Reactivar la suya si ya la tuvo cancelada, en vez de crear otra: el
  // índice único es (event_id, profile_id) y un insert chocaría.
  let bookingId = reserva?.id ?? null
  const ahora = new Date().toISOString()

  if (bookingId) {
    const { error } = await admin
      .from('bookings')
      .update({ status: 'confirmed', confirmed_at: ahora, cancelled_at: null, cancel_reason: null } as never)
      .eq('id', bookingId)
    if (error) {
      console.error('[asiento] no se pudo reactivar', error)
      return NextResponse.json({ error: 'No pudimos darle el puesto.' }, { status: 500 })
    }
  } else {
    const { data: creada, error } = await admin
      .from('bookings')
      .insert({ event_id: d.eventoId, profile_id: profileId, status: 'confirmed', confirmed_at: ahora } as never)
      .select('id, status')
      .single()
    if (error || !creada) {
      console.error('[asiento] no se pudo sentar', error)
      return NextResponse.json({ error: 'No pudimos darle el puesto.' }, { status: 500 })
    }
    bookingId = creada.id
    // El trigger `prueba_sin_asiento` baja el estado de una cuenta de prueba
    // en una fecha real. Si pasó, se dice en vez de devolver un «hecho» que
    // no lo es.
    if (creada.status !== 'confirmed') {
      return NextResponse.json(
        {
          error: `${quien} es una cuenta de prueba y no puede ocupar un puesto en una fecha real.`,
          esPrueba: true,
        },
        { status: 409 },
      )
    }
  }

  if (d.cargo === 'cortesia') {
    await anotarPagoDeEvento(profileId, bookingId, coste, 'goodwill')
  } else {
    await admin.from('credit_ledger').insert({
      profile_id: profileId,
      delta: -coste,
      reason: 'event_charge',
      booking_id: bookingId,
    } as never)
  }

  // Si la fecha ya tiene mesas publicadas, quien entra se queda fuera de
  // ellas hasta que se vuelva a repartir. Decirlo aquí es lo que evita que
  // alguien se quede apuntado y sin mesa sin que nadie lo note.
  const { data: mesas } = await admin
    .from('dinner_tables')
    .select('id')
    .eq('event_id', d.eventoId)

  await anotar(actor, 'asiento_dado', 'reserva', bookingId, {
    evento: d.eventoId,
    perfil: profileId,
    quien,
    motivo: d.motivo,
    cargo: d.cargo,
    fechaCerrada: evento.status !== 'open',
    habiaMesasPublicadas: mesas?.length ?? 0,
  })

  return NextResponse.json({
    estado: 'sentada',
    quien,
    cargo: d.cargo,
    hayQueRepartir: (mesas?.length ?? 0) > 0,
    aviso:
      (mesas?.length ?? 0) > 0
        ? 'Esa fecha ya tiene mesas publicadas: hay que repartir y publicar otra vez o se queda sin mesa.'
        : null,
  })
}
