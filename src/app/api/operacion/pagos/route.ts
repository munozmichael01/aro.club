import { NextResponse } from 'next/server'
import { z } from 'zod'

import { exigirOps } from '@/lib/ops'
import { createAdminClient } from '@/lib/supabase/admin'

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

  return NextResponse.json({
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
    .select('id, booking_id, status')
    .eq('id', d.pagoId)
    .maybeSingle()

  if (!pago) return NextResponse.json({ error: 'Ese pago no existe.' }, { status: 404 })
  if (pago.status === 'confirmed') {
    return NextResponse.json({ error: 'Ese pago ya está confirmado.' }, { status: 409 })
  }

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

  return NextResponse.json({ estado: 'no-cuadra', guardadoHasta: limite })
}
