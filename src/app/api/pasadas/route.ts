import { NextResponse } from 'next/server'

import { cenasPasadas, hayQueMirar, lineaDePendientes } from '@/lib/pasadas'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/**
 * Pasadas: todas las cenas de una persona, de la más reciente a la más vieja,
 * con lo de cada una (entrega mi-mesa-pasadas, 31-10).
 *
 *   { cenas: Pasada[], linea: {...} | null, senal: boolean }
 *
 * `linea` es lo que va encima de la reserva activa en Próxima, y `senal` el
 * punto de la barra y de la pestaña: cualquier pendiente o novedad.
 *
 * El panel de contacto de una cena no viaja aquí: lo trae `/api/contacto`
 * al abrirla, que es también quien apaga el punto.
 */
export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sin sesión.' }, { status: 401 })

  const cenas = await cenasPasadas(createAdminClient(), user.id)
  return NextResponse.json({ cenas, linea: lineaDePendientes(cenas), senal: hayQueMirar(cenas) })
}
