import { NextResponse } from 'next/server'

import { avisoDePago, avisoDeVerificacion } from '@/lib/avisos-equipo'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * La pasada en seco de los avisos al equipo.
 *
 * Los dos avisos se disparan dentro de lo que hace una persona: subir la
 * cédula, reportar un pago. No hay forma de verlos sin que alguien lo haga de
 * verdad —y hacerlo de verdad para mirar un correo es meter un pago falso en
 * la contabilidad—. Esto compone los MISMOS avisos a partir de las últimas
 * filas reales y, con `?seco=1`, los enseña sin mandar nada.
 *
 *   GET /api/avisos/equipo?seco=1    arma y devuelve el HTML. No escribe ni
 *                                    manda. Es como se prueba.
 *   GET /api/avisos/equipo           los manda de verdad al buzón del equipo.
 *
 * Con la llave de los crons, como el resto: esto lee datos de gente —nombres,
 * correos, importes, referencias de banco— y una ruta abierta que los pinta
 * en HTML es una fuga con forma de herramienta de pruebas.
 *
 * No toca nada: ni marca filas, ni cambia estados, ni encola. Pasarla dos
 * veces da lo mismo las dos veces.
 */
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const secreto = process.env.CRON_SECRET
  const cabecera = request.headers.get('authorization')
  if (!secreto || cabecera !== `Bearer ${secreto}`) {
    return new NextResponse(null, { status: 404 })
  }

  const seco = new URL(request.url).searchParams.get('seco') === '1'
  const admin = createAdminClient()

  // La última verificación que esté esperando, y el último pago por cuadrar.
  // Si no hay ninguno, se dice: un «0 avisos» es una respuesta, y devolver un
  // ejemplo inventado enseñaría un correo que nunca se manda.
  const { data: verif } = await admin
    .from('verifications')
    .select('profile_id, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: pago } = await admin
    .from('payments')
    .select('id, reportado_en')
    .eq('status', 'under_review')
    .order('reportado_en', { ascending: false })
    .limit(1)
    .maybeSingle()

  const avisos = []

  if (verif?.profile_id) {
    const r = await avisoDeVerificacion(verif.profile_id, seco)
    if (r) avisos.push({ de: 'verificacion', ...r })
  }

  if (pago?.id) {
    const r = await avisoDePago(pago.id, seco)
    if (r) avisos.push({ de: 'pago', ...r })
  }

  return NextResponse.json({
    seco,
    avisos: avisos.length,
    // El HTML entero, para poder mirarlo. En seco es lo único que hay que
    // mirar; mandando, es lo que salió.
    detalle: avisos,
    ...(verif ? {} : { sinVerificaciones: 'ninguna pendiente ahora mismo' }),
    ...(pago ? {} : { sinPagos: 'ninguno por cuadrar ahora mismo' }),
  })
}
