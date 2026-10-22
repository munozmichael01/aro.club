import { NextResponse } from 'next/server'
import { z } from 'zod'

import { encolar } from '@/lib/correos'
import { exigirOps } from '@/lib/ops'
import { enBolivares, nombreDeBanco } from '@/lib/reembolso'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Los reembolsos, desde el panel.
 *
 * Quien se quedó sin mesa puede pedir el dinero en vez del crédito. Aquí se
 * ve lo que hay que pagar y se marca pagado.
 *
 * NO hay «devolver el crédito». Michael, 21-10: «la misma persona que le
 * daría a ese botón es la que devolvería el pago, así que no, se hace el
 * pago». El botón resolvía un problema que no existe y daba una salida
 * cómoda para no pagar.
 *
 * Y marcar pagado no es un botón: es el mismo formulario que rellena quien
 * paga, con el comprobante adjunto. Sin comprobante no se marca, porque la
 * referencia sola es lo que se escribe mal y después no hay nada que
 * rastrear.
 */

const marcar = z.object({
  solicitudId: z.string().uuid(),
  referencia: z.string().min(3).max(40),
  /** La ruta que devolvió `/api/pago/captura`, igual que un pago. */
  comprobante: z.string().min(3).max(200),
})

export async function GET() {
  const actor = await exigirOps()
  if (!actor) return new NextResponse(null, { status: 404 })

  const admin = createAdminClient()

  const { data: filas, error } = await admin
    .from('refund_requests')
    .select('id, profile_id, telefono, cedula, banco, precio_usd, tasa, monto_ves, estado, solicitado_at, reembolsado_at, referencia, comprobante_path')
    .order('solicitado_at', { ascending: false })
    .limit(200)

  if (error) {
    console.error('[reembolsos] leer', error)
    return NextResponse.json({ filas: [], error: 'No pudimos leerlos.' }, { status: 500 })
  }

  const ids = [...new Set((filas ?? []).map((f) => f.profile_id))]
  const { data: gente } = ids.length
    ? await admin.from('profiles').select('id, display_name, full_name, email').in('id', ids)
    : { data: [] }

  const quien = new Map(
    (gente ?? []).map((p) => [p.id, { nombre: p.display_name || p.full_name || p.email, correo: p.email }]),
  )

  return NextResponse.json({
    filas: await Promise.all((filas ?? []).map(async (f) => {
      const p = quien.get(f.profile_id)
      // El comprobante se firma al leer, como el de un pago: el bucket es
      // privado y una ruta cruda no abre nada.
      let comprobante: string | null = null
      if (f.comprobante_path) {
        const { data } = await admin.storage.from('comprobantes').createSignedUrl(f.comprobante_path, 300)
        comprobante = data?.signedUrl ?? null
      }
      return {
        id: f.id,
        quien: p?.nombre ?? 'sin nombre',
        correo: p?.correo ?? null,
        telefono: f.telefono,
        cedula: f.cedula,
        // El nombre y el código: el nombre para reconocerlo, el código
        // porque es lo que se teclea en la app del banco.
        banco: nombreDeBanco(f.banco) + ' · ' + f.banco,
        precio: Number(f.precio_usd),
        tasa: Number(f.tasa),
        montoBs: Number(f.monto_ves),
        estado: f.estado,
        pedidoEn: f.solicitado_at,
        pagadoEn: f.reembolsado_at,
        referencia: f.referencia,
        comprobante,
      }
    })),
    pendientes: (filas ?? []).filter((f) => f.estado === 'pendiente').length,
  })
}

export async function POST(request: Request) {
  const actor = await exigirOps()
  if (!actor) return new NextResponse(null, { status: 404 })

  const parsed = marcar.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Falta la referencia o el comprobante del pago.' },
      { status: 400 },
    )
  }
  const d = parsed.data

  const admin = createAdminClient()

  const { data: solicitud } = await admin
    .from('refund_requests')
    .select('id, profile_id, estado, telefono, monto_ves')
    .eq('id', d.solicitudId)
    .maybeSingle()

  if (!solicitud) {
    return NextResponse.json({ error: 'Esa solicitud no existe.' }, { status: 404 })
  }
  if (solicitud.estado !== 'pendiente') {
    return NextResponse.json({ error: 'Ese reembolso ya está pagado.' }, { status: 409 })
  }

  const { error } = await admin
    .from('refund_requests')
    .update({
      estado: 'reembolsado',
      reembolsado_at: new Date().toISOString(),
      reembolsado_por: actor,
      referencia: d.referencia.trim(),
      comprobante_path: d.comprobante,
    } as never)
    .eq('id', d.solicitudId)
    // Que no se marque dos veces si dos pestañas lo pulsan a la vez.
    .eq('estado', 'pendiente')

  if (error) {
    console.error('[reembolsos] marcar', error)
    return NextResponse.json({ error: 'No pudimos marcarlo.' }, { status: 500 })
  }

  /**
   * El correo lleva las cifras GUARDADAS, no las de hoy.
   *
   * Es lo que le prometimos al pedirlo y lo que acaba de recibir. Calcular
   * aquí con la tasa de hoy haría que el correo dijera un número distinto
   * del que está en su banco.
   */
  await encolar({ perfil: solicitud.profile_id }, 'reembolso_hecho', {
    montoBs: enBolivares(Number(solicitud.monto_ves)),
    telefono: solicitud.telefono,
    referencia: d.referencia.trim(),
  })

  return NextResponse.json({ ok: true })
}
