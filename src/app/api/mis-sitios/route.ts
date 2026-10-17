import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/**
 * Los sitios a los que no quiere volver.
 *
 * Lo pidió Leonor en la encuesta del 17-10 —«así como permite excluir
 * personas, que también permita excluir restaurantes»— y se marca al
 * contestar. Esto es la otra mitad: poder verlos y quitarlos.
 *
 * Michael, el mismo día: «ojo, lo ponemos muy fácil porque la gente es muy
 * quejona». Por eso la lista se enseña, con el nombre del sitio y cuándo se
 * marcó: una preferencia que se puede mirar y deshacer es una preferencia;
 * una que se marca en un botón y desaparece es un rencor que nadie revisa.
 *
 * Vive en `table_feedback.sitio_no_repetir`, que es por MESA. Un local puede
 * tener varias filas de la misma persona —dos cenas en el mismo sitio— y
 * quitarlo las limpia todas: lo que ella dice es «ahí no», no «esa noche no».
 */

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sin sesión.' }, { status: 401 })

  const admin = createAdminClient()

  const { data } = await admin
    .from('table_feedback')
    .select('created_at, dinner_tables!inner(restaurant_id, restaurants(name))')
    .eq('profile_id', user.id)
    .eq('sitio_no_repetir', true)
    .order('created_at', { ascending: false })

  type Fila = {
    created_at: string
    dinner_tables: { restaurant_id: string | null; restaurants: { name: string } | null } | null
  }

  // Uno por local, aunque haya cenado ahí dos veces.
  const vistos = new Set<string>()
  const sitios = []
  for (const f of (data ?? []) as unknown as Fila[]) {
    const id = f.dinner_tables?.restaurant_id
    if (!id || vistos.has(id)) continue
    vistos.add(id)
    sitios.push({
      id,
      nombre: f.dinner_tables?.restaurants?.name ?? 'Un sitio',
      desde: f.created_at,
    })
  }

  return NextResponse.json({ sitios })
}

const cuerpo = z.object({
  restauranteId: z.string().uuid(),
  // Hoy solo se quita desde aquí: marcarlo se hace al contestar la encuesta,
  // que es cuando la persona tiene la noche fresca.
  quitar: z.literal(true),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sin sesión.' }, { status: 401 })

  const parsed = cuerpo.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Petición inválida.' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Las mesas suyas en ese local. Se filtra por las dos cosas: sin el
  // `profile_id` esto limpiaría la marca de otra persona.
  const { data: suyas } = await admin
    .from('table_feedback')
    .select('table_id, dinner_tables!inner(restaurant_id)')
    .eq('profile_id', user.id)
    .eq('sitio_no_repetir', true)

  type Fila = { table_id: string; dinner_tables: { restaurant_id: string | null } | null }
  const mesas = ((suyas ?? []) as unknown as Fila[])
    .filter((f) => f.dinner_tables?.restaurant_id === parsed.data.restauranteId)
    .map((f) => f.table_id)

  if (!mesas.length) return NextResponse.json({ estado: 'ya-no-estaba' })

  const { error } = await admin
    .from('table_feedback')
    .update({ sitio_no_repetir: false } as never)
    .eq('profile_id', user.id)
    .in('table_id', mesas)

  if (error) {
    console.error('[mis-sitios] no se pudo quitar', error)
    return NextResponse.json({ error: 'No pudimos quitarlo.' }, { status: 500 })
  }

  return NextResponse.json({ estado: 'quitado' })
}
