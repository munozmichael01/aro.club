import { NextResponse } from 'next/server'
import { z } from 'zod'

import { anotar } from '@/lib/auditoria'
import { rellenarHueco } from '@/lib/reparto/rellenar'
import { createAdminClient } from '@/lib/supabase/admin'
import { zonaDeCiudad } from '@/lib/zona-ciudad'
import { createClient } from '@/lib/supabase/server'
import { encolar } from '@/lib/correos'
import { mandarAviso } from '@/lib/avisos-equipo'

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
      'id, status, event_id, events(starts_at, reveal_at, format, city_slug, restaurants!events_restaurant_id_fkey(name, zone_slug)), table_members(table_id)',
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

  // Cuántos créditos tiene AHORA. La pantalla escribía «3» si cancelaba tarde
  // y «4» si a tiempo, sin mirar nada: dos cifras inventadas en la pantalla
  // que decide si alguien pierde su dinero. Lo encontró el agente de la app
  // al no poder copiarlas.
  const { data: saldo } = await admin
    .from('v_credit_balance')
    .select('balance')
    .eq('profile_id', user.id)
    .maybeSingle()

  return NextResponse.json({
    reservaId: reserva.id,
    creditos: saldo?.balance ?? 0,
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
    // En qué hora habla esta fecha. Lo pidió la app; sin esto formatea en
    // Caracas por defecto y desde fuera de Venezuela dice otro día.
    zonaHoraria: await zonaDeCiudad(
      (reserva.events as unknown as { city_slug?: string } | null)?.city_slug,
    ),
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

  const { data: reserva, error: errorReserva } = await admin
    .from('bookings')
    /**
     * `table_members` para saber de qué mesa se baja: hay que rellenar ESE
     * hueco, no cualquiera.
     *
     * Y `profiles` CON SU CLAVE, que es lo que rompió cancelar en producción
     * durante seis horas. `bookings` tiene dos claves hacia `profiles`
     * —`profile_id` y `attended_marked_by`— así que `profiles(...)` a secas
     * es ambiguo: PostgREST devuelve PGRST201 y no devuelve fila. Como esta
     * ruta no miraba el error, `reserva` llegaba nula y el candado de abajo
     * respondía «Esa reserva no existe» a todo el mundo.
     *
     * Lo metí yo ayer al añadir el aviso de mesa encogida (b732efd): solo
     * quería el nombre para el aviso al equipo. Lo encontró el agente de la
     * app porque Michael no podía cancelar la suya.
     */
    .select('id, status, event_id, profile_id, events(starts_at, reveal_at), table_members(table_id), profiles!bookings_profile_id_fkey(display_name, full_name)')
    .eq('id', parsed.data.reservaId)
    .maybeSingle()

  /**
   * El error ANTES del 404, como ya hacía el GET de esta misma ruta.
   *
   * «No existe» y «no pude leerla» son dos cosas distintas y las dos salían
   * por la misma puerta. Mientras una diga lo de la otra, un fallo de
   * consulta se lee como una reserva que no está, y nadie va a buscar en el
   * sitio correcto.
   */
  if (errorReserva) {
    console.error('[cancelar] no se pudo leer la reserva', errorReserva)
    return NextResponse.json(
      { error: 'No pudimos leer tu reserva. Vuelve a intentarlo.' },
      { status: 500 },
    )
  }

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

  const evento = reserva.events as unknown as { starts_at: string; reveal_at: string | null } | null
  // Si ya se le conto la mesa a la gente: lo que decide si esta cancelacion
  // es rutina o algo que operacion tiene que mirar.
  const revelado = !!evento?.reveal_at && Date.now() >= new Date(evento.reveal_at).getTime()
  const perfilSuyo = reserva.profiles as unknown as { display_name: string | null; full_name: string | null } | null
  const quien = perfilSuyo?.display_name || perfilSuyo?.full_name || 'Alguien'
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

  // Sale de la mesa si ya la tenía, y el hueco se rellena desde la espera.
  //
  // Antes la mesa se quedaba en cinco y esto decía «a más de 24 horas el
  // reparto se rehace solo cuando se vuelva a repartir». Eso mueve a gente
  // que ya leyó «tu mesa es la 2», y no es una opción: quien ya tiene mesa no
  // se cae a espera nunca. Los otros cinco no se tocan y entra alguien de la
  // espera, si encaja con esa mesa.
  const suMesa = ((reserva.table_members ?? []) as unknown as { table_id: string }[])[0] ?? null
  await admin.from('table_members').delete().eq('booking_id', reserva.id)

  // Y su correo de la mesa, si todavía no ha salido. Se quedaba en cola: quien
  // cancelaba el lunes recibía «tu mesa es la 1» el jueves a mediodía.
  // `despublicar_mesa` ya lo hacía al deshacer una mesa entera; cancelar una
  // reserva suelta, no.
  await admin
    .from('scheduled_emails')
    .delete()
    .eq('event_id', reserva.event_id)
    .eq('profile_id', user.id)
    // `juego` tambien, y faltaba. Es la push de las 7:50 que abre el juego
    // de la mesa, y le llegaba a quien habia cancelado por la tarde: una
    // notificacion invitando a jugar en una cena a la que no va. Pasó hoy
    // con tres personas que cancelaron despues de la revelacion.
    .in('kind', ['mesa_asignada', 'mesa_cambiada', 'recordatorio', 'juego'] as never[])
    .is('sent_at', null)

  // Si no encaja nadie, `rellenarHueco` devuelve null y la mesa se queda en
  // cinco a propósito: confirmarla así o cambiarla a mano es una decisión, y
  // el panel la enseña corta para que se tome.
  const relleno = suMesa ? await rellenarHueco(reserva.event_id, suMesa.table_id) : null

  /**
   * Y si la mesa ya estaba contada, operación se entera.
   *
   * El 17-10 cancelaron tres personas en la hora siguiente a la revelación y
   * no lo supimos por el producto: lo supimos porque una de ellas escribió
   * por Instagram preguntando por su crédito, y porque Michael miró el panel.
   * Una mesa que baja de seis a cinco después de contársela a la gente es
   * justo lo que hay que mirar: hay que decidir si se mueve a alguien, si se
   * avisa al restaurante, o si se deja.
   *
   * Solo DESPUÉS de revelar. Antes, una cancelación es rutina: el reparto
   * todavía no le ha dicho nada a nadie y el hueco se rellena solo.
   *
   * Y nunca tumba la cancelación: quien canceló ya canceló, y que nuestro
   * aviso falle no puede devolverle un error.
   */
  if (suMesa && revelado) {
    try {
      const { count } = await admin
        .from('table_members')
        .select('profile_id', { count: 'exact', head: true })
        .eq('table_id', suMesa.table_id)

      const { data: mesa } = await admin
        .from('dinner_tables')
        .select('table_number, restaurants(name)')
        .eq('id', suMesa.table_id)
        .maybeSingle()

      const sitio = (mesa?.restaurants as unknown as { name: string } | null)?.name ?? 'sin local'
      const quedan = count ?? 0

      await mandarAviso({
        asunto: `Una mesa se queda en ${quedan} · ${sitio}`,
        titulo: `${quien} canceló después de la revelación`,
        parrafos: [
          `La <strong>mesa ${mesa?.table_number ?? '?'}</strong> de ${sitio} se queda en <strong>${quedan}</strong>.` +
            (relleno ? ' Ya entró alguien de la espera en su sitio.' : ' No había nadie en espera que encajara.'),
          'Decide si mueves a alguien, si se lo dices al restaurante, o si se queda así. En Mi mesa ya lo ven los que siguen.',
        ],
        filas: [],
        pestana: 'mesas',
        deRevision: false,
      })
    } catch (e) {
      console.error('[cancelar] no se pudo avisar de la mesa corta', e)
    }
  }
  if (suMesa) {
    // Actor `null`: esto no lo hace operación, pasa solo al cancelar alguien.
    // Con el id del miembro, además, su perfil ya no se puede borrar — la
    // clave ajena de `ops_audit_log` lo retiene.
    await anotar(null, 'mesas_repartidas', 'evento', reserva.event_id, {
      huecoPor: user.id,
      mesa: suMesa.table_id,
      relleno: relleno ? { perfil: relleno.profileId, nombre: relleno.nombre } : null,
    })
  }

  /**
   * PRIMERO SE VERIFICA EL PAGO, Y LUEGO VUELVE EL CRÉDITO.
   *
   * Hasta hoy el crédito volvía al cancelar, pasara lo que pasara con el
   * dinero. El 13-10 alguien reservó el sábado, reportó su pago, canceló a
   * los dos minutos y reservó el viernes con el crédito que le volvió: tiene
   * un puesto confirmado sobre una transferencia que nadie llegó a mirar.
   *
   * Un crédito es dinero que VIMOS. Mientras el pago está en revisión no
   * hemos visto nada, así que no hay nada que devolver todavía.
   *
   * Cancelar sigue soltando el puesto al momento: eso no se toca, porque es
   * lo que deja la silla libre para otro. Lo que espera es el crédito.
   *
   * Tres casos:
   *
   *   pago confirmado   → el dinero es nuestro: el crédito vuelve ya.
   *   sin pago          → la pagó con un crédito que ya estaba verificado,
   *                       así que vuelve ya. No castigamos dos veces.
   *   pago en revisión  → el crédito ESPERA. Cuando operación confirme ese
   *                       pago, se lo abona; si no cuadra, nunca existió.
   */
  const { data: pagoDeLaReserva } = await admin
    .from('payments')
    .select('id, status')
    .eq('booking_id', reserva.id)
    .in('status', ['awaiting_proof', 'under_review', 'confirmed'])
    .order('reportado_en', { ascending: false })
    .limit(1)
    .maybeSingle()

  const enRevision =
    pagoDeLaReserva?.status === 'under_review' || pagoDeLaReserva?.status === 'awaiting_proof'
  const creditoVuelveYa = conMargen && !enRevision

  if (creditoVuelveYa) {
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
  //
  // El que está EN REVISIÓN no se toca: sigue en la cola para que alguien
  // diga si el dinero llegó. De esa respuesta depende el crédito.
  if (conMargen) {
    await admin
      .from('payments')
      .update({ status: 'refunded' })
      .eq('booking_id', reserva.id)
      .eq('status', 'confirmed')
  }

  await encolar(
    { perfil: user.id },
    'cancelacion',
    { conMargen, creditoDevuelto: creditoVuelveYa, creditoEnEspera: conMargen && enRevision },
    { eventoId: reserva.event_id },
  )

  /**
   * Y CUÁNTOS CRÉDITOS LE QUEDAN AHORA, con el abono ya hecho.
   *
   * La pantalla enseñaba el saldo que había pedido al ENTRAR, o sea el de
   * antes de cancelar, que para quien canceló su única reserva es cero. Así
   * que decía «Tu crédito volvió entero» y justo debajo, en grande, «0
   * disponibles».
   *
   * Lo contó Kristhina el 18-10 con la frase exacta: canceló y «no le
   * aparece el crédito». Lo tenía: en la base estaba abonado el mismo
   * segundo en que canceló. Lo que no tenía era una pantalla que se lo
   * dijera, y no hay forma de que lo supiera.
   *
   * Se devuelve desde aquí y no se vuelve a preguntar: es el saldo después
   * de esta operación, que es exactamente lo que la pantalla quiere decir.
   */
  const { data: saldoAhora } = await admin
    .from('v_credit_balance')
    .select('balance')
    .eq('profile_id', user.id)
    .maybeSingle()

  return NextResponse.json({
    estado: 'cancelada',
    creditoDevuelto: creditoVuelveYa,
    // Para que la pantalla pueda decir la verdad en vez de prometer un
    // crédito que todavía no existe.
    creditoEnEspera: conMargen && enRevision,
    horasQueFaltaban: Math.max(0, Math.round(faltan)),
    creditos: saldoAhora?.balance ?? 0,
  })
}
