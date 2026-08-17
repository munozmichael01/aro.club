import { NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Las zonas de Caracas, ordenadas por cuánta gente las acepta.
 *
 * El cuestionario las tenía escritas a mano y siempre en el mismo orden, con
 * Las Mercedes arriba porque alguien la escribió primero. Y el orden de una
 * lista de trece casillas no es neutro: lo de arriba se marca más.
 *
 * Ordenarlas por demanda hace lo que nos conviene, que es **concentrar**. Una
 * mesa necesita seis personas de la misma zona; con la demanda repartida en
 * trece partes no se llega a seis en ninguna, y sin seis no hay cena. Que las
 * que ya tienen gente salgan primero es lo que hace que alguna cruce el
 * umbral.
 *
 * Es pública y no lleva llave: son trece nombres de barrio y un número de
 * cuánta gente los acepta. No dice quién es nadie.
 */

// Se cachea diez minutos. El orden cambia con cada persona que contesta, pero
// no hace falta que cambie al segundo, y esto lo pide cada visita al
// cuestionario.
export const revalidate = 600

export async function GET() {
  const admin = createAdminClient()

  const { data: zonas, error } = await admin
    .from('zones')
    .select('slug, name')
    .eq('city_slug', 'caracas')
    .eq('is_active', true)

  if (error || !zonas) {
    console.error('[zonas] no se pudieron leer', error)
    return NextResponse.json({ zonas: [] })
  }

  // Cuánta gente acepta cada una. Se cuenta sobre `profile_traits`, que es
  // donde el cuestionario deja las zonas de cada persona.
  const { data: gente } = await admin.from('profile_traits').select('zones')

  const cuenta = new Map<string, number>()
  for (const fila of gente ?? []) {
    for (const z of (fila.zones ?? []) as string[]) {
      cuenta.set(z, (cuenta.get(z) ?? 0) + 1)
    }
  }

  // A igualdad de demanda, por nombre: sin este desempate el orden baila
  // entre peticiones y la lista se reordena sola delante de quien la mira.
  const ordenadas = zonas
    .map((z) => ({ slug: z.slug, nombre: z.name, apuntados: cuenta.get(z.slug) ?? 0 }))
    .sort((a, b) => b.apuntados - a.apuntados || a.nombre.localeCompare(b.nombre, 'es'))

  return NextResponse.json({ zonas: ordenadas })
}
