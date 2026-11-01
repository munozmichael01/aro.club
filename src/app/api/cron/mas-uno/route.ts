import { NextResponse } from 'next/server'

import { cerrarSinAcompanante, recordarAntesDelCierre } from '@/lib/mas-uno'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * El reloj del «+1 acompañante», cada media hora.
 *
 * Dos cosas (Michael, 01-11):
 *
 *  · A quien reservó y su acompañante todavía no está aprobado, un aviso en
 *    las 24 horas antes del cierre. Una vez por reserva.
 *  · Pasado el cierre, sin acompañante aprobado: se cancelan los dos puestos
 *    y se abonan dos créditos. Va antes del reparto: las fechas cierran a
 *    medianoche y las mesas se arman de día, así que a las 00:05 ya no queda
 *    nadie esperando a un acompañante que no llegó.
 *
 * Cada media hora y no cada hora: el cierre es a medianoche y el panel puede
 * abrir el reparto pronto, y una reserva sin acompañante no debe verse como
 * sentable ni un minuto de más.
 *
 * **`?seco=1` calcula sin escribir.** No hay staging: esta base es la de
 * producción, y un cierre de prueba cancela reservas de verdad.
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
  const avisados = await recordarAntesDelCierre(admin, seco)
  const cerrados = await cerrarSinAcompanante(admin, seco)
  return NextResponse.json({
    seco,
    avisados: avisados.map((p) => p.bookingId),
    cerrados: cerrados.map((p) => p.bookingId),
  })
}
