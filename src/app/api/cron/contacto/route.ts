import { NextResponse } from 'next/server'

import { repasoDeContacto } from '@/lib/contacto'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * El repaso de «Seguir en contacto», cada hora.
 *
 * Dos cosas: crear las coincidencias que la encuesta no vio (dos personas
 * contestando en el mismo segundo) y cerrar las que vencieron sus 7 días,
 * mandando «No se cruzaron» a quien había confirmado.
 *
 * Cada hora y no cada día: el plazo se dice con su fecha, y «hoy es el último
 * día» no puede seguir abierto hasta el día siguiente.
 *
 * **`?seco=1` calcula sin escribir.** No hay staging: esta base es la de
 * producción, y un cierre de prueba manda el correo de verdad.
 */
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const secreto = process.env.CRON_SECRET
  const cabecera = request.headers.get('authorization')
  if (!secreto || cabecera !== `Bearer ${secreto}`) {
    return new NextResponse(null, { status: 404 })
  }
  const seco = new URL(request.url).searchParams.get('seco') === '1'
  return NextResponse.json(await repasoDeContacto(createAdminClient(), seco))
}
