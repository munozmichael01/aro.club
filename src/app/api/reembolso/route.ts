import { NextResponse } from 'next/server'
import { z } from 'zod'

import { encolar } from '@/lib/correos'
import { enBolivares, reembolsable } from '@/lib/reembolso'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/**
 * «Prefiero el dinero al crédito».
 *
 * A quien el reparto deja en espera se le abona un crédito y hasta hoy esa
 * era la única salida: quien no pensaba volver se quedaba con su plata aquí.
 *
 * SOLO los créditos de quedarse sin mesa. Ni cancelaciones, ni cortesías, ni
 * cupones, que no se pagaron.
 *
 * Y el monto se fija AHORA, no al pagar. Michael: «la tasa es del día que
 * recibimos la solicitud y debe marcarse al momento de solicitarlo, así sabe
 * cuánto va a recibir». Si se calculara al pagar, lo prometido y lo recibido
 * no coincidirían y la diferencia la descubriría él en su banco.
 */

const cuerpo = z.object({
  telefono: z.string().min(6).max(20),
  cedula: z.string().min(5).max(20),
  banco: z.string().min(1).max(60),
  /** La tasa que vio la pantalla, como en `/api/pago`. */
  tasaVista: z.number().positive().optional(),
})

/** La tasa con la que se fija el monto. Misma regla que reportar un pago. */
async function laTasa(admin: ReturnType<typeof createAdminClient>, vista?: number) {
  const { data: ultimas } = await admin
    .from('fx_rates')
    .select('ves_por_ref, rate_date')
    .order('rate_date', { ascending: false })
    .limit(3)

  const hoy = (ultimas ?? [])[0]
  if (!hoy) return { error: 'no-hay-tasa' as const }

  if (vista) {
    const vale = (ultimas ?? []).some((r) => Math.abs(Number(r.ves_por_ref) - vista) < 0.0001)
    if (vale) return { tasa: vista }
    // Ni la de ahora ni ninguna reciente: se para y se le dice la buena, en
    // vez de cobrarle una que no vio.
    return { error: 'tasa-cambio' as const, tasa: Number(hoy.ves_por_ref) }
  }

  return { tasa: Number(hoy.ves_por_ref) }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sin sesión.' }, { status: 401 })

  const parsed = cuerpo.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Faltan datos del Pago Móvil.' }, { status: 400 })
  }
  const d = parsed.data

  const admin = createAdminClient()
  const puede = await reembolsable(admin, user.id)

  if (!puede) {
    return NextResponse.json(
      { error: 'No tienes ningún crédito que devolver.', motivo: 'sin-credito' },
      { status: 404 },
    )
  }
  if (puede.solicitud) {
    return NextResponse.json(
      { error: 'Ya pediste este reembolso.', motivo: 'ya-pedido' },
      { status: 409 },
    )
  }
  if (puede.saldo < 1) {
    return NextResponse.json(
      { error: 'Ese crédito ya lo usaste en una reserva.', motivo: 'ya-usado' },
      { status: 409 },
    )
  }

  const t = await laTasa(admin, d.tasaVista)
  if ('error' in t && t.error === 'no-hay-tasa') {
    return NextResponse.json(
      { error: 'Ahora mismo no tenemos la tasa del día. Inténtalo más tarde.', motivo: 'no-hay-tasa' },
      { status: 503 },
    )
  }
  if ('error' in t && t.error === 'tasa-cambio') {
    return NextResponse.json(
      {
        error: 'La tasa cambió mientras lo pedías. Revisa el monto y vuelve a confirmarlo.',
        motivo: 'tasa-cambio',
        tasa: t.tasa,
        montoBs: Number((puede.precio * t.tasa).toFixed(2)),
      },
      { status: 409 },
    )
  }

  const tasa = t.tasa!
  const montoBs = Number((puede.precio * tasa).toFixed(2))

  /**
   * El crédito sale del saldo AHORA.
   *
   * Si no, se puede pedir el dinero y reservar con el mismo crédito antes de
   * que operación pague. Se escribe primero el apunte y después la solicitud:
   * si lo segundo falla, queda un crédito de menos y un aviso en los
   * registros, que se arregla mirando. Al revés quedaría una solicitud a
   * pagar con el crédito todavía gastable, que es cobrar dos veces.
   */
  const { data: salida, error: errSalida } = await admin
    .from('credit_ledger')
    .insert({
      profile_id: user.id,
      delta: -1,
      reason: 'reembolso_pedido',
      note: 'Pidió el dinero en vez del crédito',
    } as never)
    .select('id')
    .single()

  if (errSalida || !salida) {
    console.error('[reembolso] no se pudo sacar el crédito', errSalida)
    return NextResponse.json({ error: 'No pudimos registrarlo.' }, { status: 500 })
  }

  const { error } = await admin.from('refund_requests').insert({
    profile_id: user.id,
    credito_id: puede.abono.id,
    salida_id: salida.id,
    telefono: d.telefono.trim(),
    cedula: d.cedula.trim().toUpperCase(),
    banco: d.banco.trim(),
    precio_usd: puede.precio,
    tasa,
    monto_ves: montoBs,
  } as never)

  if (error) {
    console.error('[reembolso] el crédito salió pero la solicitud no se guardó', error, salida.id)
    // Se devuelve el crédito: sin solicitud, nadie le va a pagar.
    await admin.from('credit_ledger').delete().eq('id', salida.id)
    return NextResponse.json({ error: 'No pudimos registrarlo.' }, { status: 500 })
  }

  await encolar({ perfil: user.id }, 'reembolso_pedido', {
    montoBs: enBolivares(montoBs),
    telefono: d.telefono.trim(),
    banco: d.banco.trim(),
    cedula: d.cedula.trim().toUpperCase(),
    precio: String(puede.precio),
  })

  return NextResponse.json({ estado: 'pendiente', montoBs, tasa, hasta: puede.hasta })
}
