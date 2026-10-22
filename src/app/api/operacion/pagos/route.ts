import { NextResponse } from 'next/server'
import { z } from 'zod'

import { anotarPagoDeEvento } from '@/lib/creditos'
import { DESDE_QUE_ES_REAL, exigirOps } from '@/lib/ops'
import { createAdminClient } from '@/lib/supabase/admin'
import { anotar } from '@/lib/auditoria'
import { encolar } from '@/lib/correos'

/**
 * La cola de conciliación.
 *
 * Cada reporte trae lo que la persona dijo; alguien lo cuadra contra el
 * movimiento del banco. Dos salidas:
 *
 *  - **confirmado**: la reserva pasa a confirmada y el puesto es suyo.
 *  - **no cuadra**: NO libera el puesto. Se lo guarda 24 h más para que
 *    corrija, porque un pago que no cuadra es un error nuestro tanto como
 *    suyo: mal tecleada una referencia, o el banco tardó.
 */


const decision = z.discriminatedUnion('accion', [
  z.object({ accion: z.literal('confirmar'), pagoId: z.string().uuid() }),
  z.object({
    accion: z.literal('no-cuadra'),
    pagoId: z.string().uuid(),
    motivo: z.string().min(1).max(400),
  }),
])

export async function GET() {
  const actor = await exigirOps()
  if (!actor) return new NextResponse(null, { status: 404 })

  const admin = createAdminClient()

  const { data: pagos, error } = await admin
    .from('payments')
    // Nada anterior al 12/10: antes de esa fecha son pagos de ensayo.
    // Se filtra aquí y no al pintar, para que ni siquiera viajen.
    // `profiles!payments_profile_id_fkey` y no `profiles` a secas: payments
    // tiene DOS claves hacia profiles —quien paga y quien revisa— y sin
    // decir cual, PostgREST responde 300 y la cola llega vacia. Es la
    // tercera vez que este mismo embed ambiguo muerde en el proyecto.
    .select(
      'id, metodo, moneda, amount_usd, amount_local, fx_rate, reportado_en, datos, captura_path, status, rejection_note, profile_id, booking_id, profiles!payments_profile_id_fkey(display_name, full_name, phone_e164), bookings(event_id, status, hold_until, events(starts_at))',
    )
    .gte('created_at', DESDE_QUE_ES_REAL)
    .in('status', ['under_review', 'rejected'])
    .order('reportado_en', { ascending: true })

  if (error) {
    console.error('[pagos] cola', error)
    return NextResponse.json({ error: 'No pudimos leer la cola.' }, { status: 500 })
  }

  const { data: metodos } = await admin
    .from('payment_methods')
    .select('id, nombre, moneda, activo, manual, orden, datos_cuenta')
    .order('orden')

  // La captura, con URL firmada de cinco minutos: el tiempo de mirarla.
  const firmadas = new Map<string, string>()
  for (const p of pagos ?? []) {
    if (!p.captura_path) continue
    const { data } = await admin.storage.from('comprobantes').createSignedUrl(p.captura_path, 300)
    if (data?.signedUrl) firmadas.set(p.id, data.signedUrl)
  }

  // El resumen del dia. Estaba escrito a mano en la pantalla —"14.976 Bs",
  // "12 puestos", "tasa 62,40"— justo donde se mira cuanto ha entrado.
  const hoy = new Date(Date.now() - 4 * 3600_000).toISOString().slice(0, 10)

  /**
   * Y el día de Caracas EMPIEZA A LAS CUATRO EN UTC, no a las cero.
   *
   * `hoy` ya venía bien —se calcula restando las cuatro horas— pero después
   * se comparaba contra `hoy + 'T00:00:00Z'`, que es medianoche de UTC. Entre
   * esas dos medianoches caben las últimas cuatro horas de la víspera, o sea
   * de ocho de la noche a doce en Caracas, que es justo cuando la gente paga.
   *
   * Michael, 19-10: «¿por qué no cuadran los totales con los gráficos?». Esa
   * mañana la tarjeta decía 14 puestos y 138.600,05 Bs y la barra del mismo
   * día decía 11 y 109.028,15. La diferencia eran tres pagos de las 8:07, las
   * 8:33 y las 9:41 de la noche ANTERIOR. La barra estaba bien: agrupa por
   * día de Caracas desde que se escribió. La tarjeta era la que contaba un
   * día que empezaba cuatro horas antes de tiempo.
   */
  const desdeMedianoche = hoy + 'T04:00:00Z'

  const { data: delDia } = await admin
    .from('payments')
    .select('amount_usd, amount_local, moneda, status')
    .gte('created_at', desdeMedianoche)

  const confirmados = (delDia ?? []).filter((p) => p.status === 'confirmed')
  const { data: tasaHoy } = await admin
    .from('fx_rates')
    .select('rate_date, ves_por_ref')
    .order('rate_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { count: pendientes } = await admin
    .from('payments')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'under_review')

  // Lo devuelto va por la misma medianoche: tenía el mismo corte de más.
  const { data: devueltos } = await admin
    .from('payments')
    .select('amount_local')
    .eq('status', 'refunded')
    .gte('created_at', desdeMedianoche)

  /**
   * LO COBRADO, DÍA A DÍA.
   *
   * El panel enseñaba lo de hoy y una lista de filas, y la pregunta que de
   * verdad se hace mirando pagos —«¿cómo venimos?»— no se podía contestar sin
   * sumar a mano.
   *
   * Se agrupa aquí y no en SQL por el día de CARACAS. Un pago de las nueve de
   * la noche es `created_at` del día siguiente en UTC, así que `date_trunc`
   * lo pondría en la casilla de mañana: con el grueso de las reservas entre
   * las ocho y la medianoche, eso corre casi media jornada de sitio.
   *
   * En memoria porque son sesenta y cinco filas. El día que sean miles, esto
   * pasa a una vista con la zona dentro; mientras tanto, una consulta y una
   * vuelta.
   */
  const { data: todosLosPagos } = await admin
    .from('payments')
    .select('created_at, amount_local, amount_usd, status')
    .eq('status', 'confirmed')
    // Desde que el club es de verdad: antes del 12 son pagos de ensayo y
    // ponen una joroba en la gráfica que no es dinero de nadie.
    .gte('created_at', DESDE_QUE_ES_REAL)
    .order('created_at')

  const diaCaracas = (iso: string) =>
    new Date(new Date(iso).getTime() - 4 * 3600_000).toISOString().slice(0, 10)

  const porDia = new Map<string, { bolivares: number; puestos: number }>()
  for (const p of todosLosPagos ?? []) {
    const d = diaCaracas(p.created_at)
    const y = porDia.get(d) ?? { bolivares: 0, puestos: 0 }
    y.bolivares += Number(p.amount_local ?? 0)
    y.puestos += 1
    porDia.set(d, y)
  }

  const serie = [...porDia.entries()]
    .map(([dia, v]) => ({ dia, ...v }))
    .sort((a, b) => (a.dia < b.dia ? -1 : 1))

  // Lo ya decidido: quién pagó, con qué y cómo quedó.
  //
  // La cola de arriba es lo que falta por conciliar; esto es lo que ya pasó,
  // que es lo que se mira cuando alguien pregunta por su pago o cuando hay
  // que cuadrar el día. La pantalla lo tenía escrito a mano con seis nombres
  // inventados y seis veces el mismo importe.
  const { data: yaDecididos } = await admin
    .from('payments')
    .select('id, metodo, moneda, amount_usd, amount_local, status, datos, reference_code, created_at, profiles!payments_profile_id_fkey(display_name, full_name)')
    .in('status', ['confirmed', 'refunded', 'rejected'])
    /**
     * DESDE EL 12/10 Y NADA ANTES.
     *
     * Michael me lo dijo el 19-10 —«tanto en pagos como en historial muestra
     * datos solo a partir del 10/10»— y lo que hice entonces fue subir el
     * límite de treinta a doscientos, que es exactamente lo contrario: en
     * vez de recortar lo viejo, enseñé más. Me lo volvió a decir el 21 con
     * la fecha afinada al 12.
     *
     * Son veintitrés pagos de ensayo de ciento treinta y dos, con nombres
     * como «Candidato» o «Prueba» y referencias tipo «123455». Mezclados con
     * los de verdad, cuadrar un día es imposible.
     */
    .gte('created_at', DESDE_QUE_ES_REAL)
    .order('created_at', { ascending: false })
    /**
     * Doscientos cubre de sobra lo que queda después del corte, y sigue
     * siendo una consulta sola. El día que no quepa, esto pide paginación de
     * verdad, no un número más grande.
     */
    .limit(200)

  const ESTADO: Record<string, string> = {
    confirmed: 'confirmado',
    refunded: 'devuelto',
    // Decía «pendiente», así que un pago RECHAZADO y uno sin decidir se leían
    // igual en el histórico: quien repasa la lista no distinguía el que ya se
    // miró y no cuadraba del que nadie ha tocado.
    rejected: 'rechazado',
  }

  const historico = (yaDecididos ?? []).map((p) => {
    const quien = p.profiles as unknown as { display_name: string | null; full_name: string | null } | null
    const datos = (p.datos ?? {}) as Record<string, unknown>
    // La referencia sale de su columna. Antes se buscaba en `datos` por tres
    // claves —`referencia`, `codigo`, `telefono`— que NINGÚN método usa: los
    // campos se llaman `ref`, `tel` y `banco`, así que el histórico enseñaba
    // la referencia vacía en todas las filas y cuadrar contra el banco se
    // hace justo por ahí. Se deja `datos.ref` como respaldo para los pagos
    // reportados antes de que la columna se empezara a escribir.
    const ref = p.reference_code ?? datos.ref ?? null
    return {
      nombre: quien?.display_name || quien?.full_name || '—',
      metodo: p.metodo,
      referencia: ref != null ? String(ref) : null,
      moneda: p.moneda,
      montoUsd: p.amount_usd != null ? Number(p.amount_usd) : null,
      montoLocal: p.amount_local != null ? Number(p.amount_local) : null,
      estado: ESTADO[p.status] ?? 'pendiente',
    }
  })

  return NextResponse.json({
    // Lo cobrado por día y el total de siempre, para la gráfica.
    serie,
    todo: {
      bolivares: (todosLosPagos ?? []).reduce((t, p) => t + Number(p.amount_local ?? 0), 0),
      puestos: (todosLosPagos ?? []).length,
      desde: serie[0]?.dia ?? null,
    },
    resumen: {
      historico,
      tasa: tasaHoy ? Number(tasaHoy.ves_por_ref) : null,
      tasaFecha: tasaHoy?.rate_date ?? null,
      cobradoLocal: confirmados.reduce((t, p) => t + Number(p.amount_local ?? 0), 0),
      cobradoUsd: confirmados.reduce((t, p) => t + Number(p.amount_usd ?? 0), 0),
      puestos: confirmados.length,
      pendientes: pendientes ?? 0,
      devueltoLocal: (devueltos ?? []).reduce((t, p) => t + Number(p.amount_local ?? 0), 0),
    },
    cola: (pagos ?? []).map((p) => {
      const quien = p.profiles as unknown as {
        display_name: string | null
        full_name: string | null
        phone_e164: string | null
      } | null
      const reserva = p.bookings as unknown as {
        status: string
        hold_until: string | null
        events: { starts_at: string } | null
      } | null
      return {
        id: p.id,
        nombre: quien?.display_name || quien?.full_name || '—',
        telefono: quien?.phone_e164 ?? null,
        metodo: p.metodo,
        moneda: p.moneda,
        montoUsd: p.amount_usd,
        montoLocal: p.amount_local,
        tasa: p.fx_rate,
        reportadoEn: p.reportado_en,
        // Lo que declaró, tal cual. Es lo que hay que buscar en el banco.
        datos: p.datos,
        captura: firmadas.get(p.id) ?? null,
        estado: p.status === 'rejected' ? 'no-cuadra' : 'pendiente',
        motivo: p.rejection_note,
        // Cuándo se le acaba el margen para corregir.
        guardadoHasta: reserva?.hold_until ?? null,
        cenaEn: reserva?.events?.starts_at ?? null,
      }
    }),
    metodos: (metodos ?? []).map((m) => ({
      id: m.id,
      nombre: m.nombre,
      moneda: m.moneda,
      activo: m.activo,
      manual: m.manual,
      cuenta: m.datos_cuenta,
    })),
  })
}

export async function POST(request: Request) {
  const actor = await exigirOps()
  if (!actor) return new NextResponse(null, { status: 404 })

  const parsed = decision.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Petición inválida.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const d = parsed.data
  const ahora = new Date().toISOString()

  const { data: pago } = await admin
    .from('payments')
    // El evento viaja con el pago porque los dos correos que salen de aquí
    // —confirmado y no cuadra— nombran la fecha en su primera frase.
    .select('id, booking_id, status, profile_id, bookings(event_id)')
    .eq('id', d.pagoId)
    .maybeSingle()

  if (!pago) return NextResponse.json({ error: 'Ese pago no existe.' }, { status: 404 })
  if (pago.status === 'confirmed') {
    return NextResponse.json({ error: 'Ese pago ya está confirmado.' }, { status: 409 })
  }

  // De qué fecha es este pago, para los correos que la nombran.
  const eventoId =
    (pago.bookings as unknown as { event_id: string } | null)?.event_id ?? null

  if (d.accion === 'confirmar') {
    await admin
      .from('payments')
      .update({
        status: 'confirmed',
        reviewed_by: actor,
        reviewed_at: ahora,
        paid_at: ahora,
        rejection_note: null,
      })
      .eq('id', pago.id)

    /**
     * ¿Y si canceló mientras esperaba que miráramos su pago?
     *
     * Desde el 13-10 el crédito ya no vuelve al cancelar si el pago estaba
     * en revisión: espera a esta decisión. Así que aquí hay dos caminos.
     */
    const { data: reservaDelPago } = pago.booking_id
      ? await admin.from('bookings').select('status').eq('id', pago.booking_id).maybeSingle()
      : { data: null }
    /**
     * CANCELADA de verdad, no «cualquier cosa que no sea confirmada».
     *
     * Escribí `status !== 'confirmed'` y eso es todo lo contrario de lo que
     * quería decir: una reserva que ESPERA el pago está en
     * `pending_payment`, que es justamente el caso normal al llegar aquí.
     * Así que cada confirmación corriente entraba por la rama de «canceló
     * mientras tanto»: le abonaba un crédito que no le toca, marcaba su pago
     * como devuelto y NO confirmaba su reserva, mientras el correo le decía
     * que su puesto estaba apartado.
     *
     * Le pasó a dos personas en los cuatro minutos que estuvo vivo.
     */
    const CANCELADAS = ['cancelled_by_user', 'cancelled_by_ops']
    const canceloMientrasTanto =
      !!reservaDelPago && CANCELADAS.includes(String(reservaDelPago.status))

    if (pago.booking_id && !canceloMientrasTanto) {
      await admin
        .from('bookings')
        .update({ status: 'confirmed', confirmed_at: ahora, hold_until: null })
        .eq('id', pago.booking_id)
    }

    if (pago.profile_id && !canceloMientrasTanto) {
      // Y el libro de créditos, que hasta ahora no se escribía al pagar por
      // evento: la compra y el cargo, neto cero. Sin esto, una devolución
      // posterior era un crédito que aparecía de la nada.
      await anotarPagoDeEvento(pago.profile_id, pago.booking_id)
    }

    if (pago.profile_id && canceloMientrasTanto) {
      /**
       * Canceló y su dinero sí era bueno: le queda un crédito.
       *
       * Solo la compra, sin el cargo: la silla que pagó no se gastó en
       * ninguna cena, así que el saldo sube uno de verdad. Y la reserva NO
       * se reconfirma —se fue a propósito— ni se le devuelve el puesto.
       *
       * Idempotente por `booking_id`: confirmar dos veces no puede regalar
       * dos créditos.
       */
      const { data: yaAbonado } = await admin
        .from('credit_ledger')
        .select('id')
        .eq('booking_id', pago.booking_id ?? '')
        .eq('reason', 'refund')
        .limit(1)
        .maybeSingle()

      if (!yaAbonado) {
        await admin.from('credit_ledger').insert({
          profile_id: pago.profile_id,
          delta: 1,
          reason: 'refund',
          booking_id: pago.booking_id,
          note: 'Pago confirmado después de cancelar: el crédito que estaba esperando',
        })
      }

      await admin.from('payments').update({ status: 'refunded' }).eq('id', pago.id)
    }

    // CON su evento. Iba con `{}`, y sin evento no hay fecha: la plantilla
    // dice «Tu reserva del {{ cuando }} pasa de pendiente a confirmada» y al
    // miembro le llegaba «Tu reserva del pasa de pendiente a confirmada».
    // Se ve por contraste con «Recibimos tu pago», que sí se encola con el
    // evento y sí dice «tu puesto del jueves 20».
    await encolar({ perfil: pago.profile_id }, 'pago_confirmado', {}, { eventoId })

    await anotar(actor, 'pago_confirmado', 'pago', pago.id, { reserva: pago.booking_id })
    return NextResponse.json({ estado: 'confirmado' })
  }

  // No cuadra: se le guarda el puesto 24 h más. Liberarlo aquí castigaría
  // a quien tecleó mal una referencia igual que a quien no pagó.
  const limite = new Date(Date.now() + 24 * 3600_000).toISOString()

  await admin
    .from('payments')
    .update({
      status: 'rejected',
      reviewed_by: actor,
      reviewed_at: ahora,
      rejection_note: d.motivo,
    })
    .eq('id', pago.id)

  if (pago.booking_id) {
    await admin.from('bookings').update({ hold_until: limite }).eq('id', pago.booking_id)
  }

  // El aviso, con el motivo dentro. Es el unico de los tres del que Design
  // no tiene plantilla, y el correo 06 le promete que se lo diriamos.
  // Con su evento, por lo mismo: esta plantilla tambien nombra la fecha.
  await encolar({ perfil: pago.profile_id }, 'pago_no_cuadra', {
    motivo: d.motivo,
    guardadoHasta: limite,
  }, { eventoId })

  await anotar(actor, 'pago_no_cuadra', 'pago', pago.id, { motivo: d.motivo, guardadoHasta: limite })
  return NextResponse.json({ estado: 'no-cuadra', guardadoHasta: limite })
}
