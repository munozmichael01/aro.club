import { NextResponse } from 'next/server'
import { z } from 'zod'

import { anotarPagoDeEvento } from '@/lib/creditos'
import { exigirOps } from '@/lib/ops'
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
    // `profiles!payments_profile_id_fkey` y no `profiles` a secas: payments
    // tiene DOS claves hacia profiles —quien paga y quien revisa— y sin
    // decir cual, PostgREST responde 300 y la cola llega vacia. Es la
    // tercera vez que este mismo embed ambiguo muerde en el proyecto.
    .select(
      'id, metodo, moneda, amount_usd, amount_local, fx_rate, reportado_en, datos, captura_path, status, rejection_note, profile_id, booking_id, profiles!payments_profile_id_fkey(display_name, full_name, phone_e164), bookings(event_id, status, hold_until, events(starts_at))',
    )
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

  const { data: delDia } = await admin
    .from('payments')
    .select('amount_usd, amount_local, moneda, status')
    .gte('created_at', hoy + 'T00:00:00Z')

  const confirmados = (delDia ?? []).filter((p) => p.status === 'confirmed')
  const { data: tasaHoy } = await admin
    .from('fx_rates')
    .select('rate_date, usd_to_ves')
    .order('rate_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { count: pendientes } = await admin
    .from('payments')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'under_review')

  const { data: devueltos } = await admin
    .from('payments')
    .select('amount_local')
    .eq('status', 'refunded')
    .gte('created_at', hoy + 'T00:00:00Z')

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
    .order('created_at', { ascending: false })
    .limit(30)

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
    resumen: {
      historico,
      tasa: tasaHoy ? Number(tasaHoy.usd_to_ves) : null,
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

    if (pago.booking_id) {
      await admin
        .from('bookings')
        .update({ status: 'confirmed', confirmed_at: ahora, hold_until: null })
        .eq('id', pago.booking_id)
    }

    // Y el libro de créditos, que hasta ahora no se escribía al pagar por
    // evento: la compra y el cargo, neto cero. Sin esto, una devolución
    // posterior era un crédito que aparecía de la nada.
    if (pago.profile_id) await anotarPagoDeEvento(pago.profile_id, pago.booking_id)

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
