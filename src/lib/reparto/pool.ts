import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/supabase/database.types'

import type { Persona } from './repartir'

/**
 * El pool de una fecha: quién puede sentarse, con qué datos y dónde se cena.
 *
 * Vive aquí y no dentro de la ruta de repartir porque hay dos sitios que
 * necesitan exactamente el mismo pool: proponer y retocar la propuesta a
 * mano. Con dos copias, retocar validaría contra datos ligeramente
 * distintos de los que se usaron para proponer, y las roturas dejarían de
 * cuadrar sin que nadie sepa por qué.
 */

export type Sede = {
  zona: string
  zonaNombre: string
  restaurantId: string
  nombre: string | null
  maxMesas: number
}

export type Pool = {
  personas: Persona[]
  sedes: Sede[]
  porMesa: number
}

export async function construirPool(
  admin: SupabaseClient<Database>,
  eventoId: string,
): Promise<Pool> {
  const { data: evento } = await admin
    .from('events')
    .select('seats_per_table')
    .eq('id', eventoId)
    .maybeSingle()

  const { data: sedesRaw } = await admin
    .from('event_venues')
    .select('zone_slug, restaurant_id, max_tables, restaurants(name, max_tables), zones(name)')
    .eq('event_id', eventoId)

  const sedes: Sede[] = (sedesRaw ?? []).map((v) => ({
    zona: v.zone_slug,
    zonaNombre: (v.zones as unknown as { name: string } | null)?.name ?? v.zone_slug,
    restaurantId: v.restaurant_id,
    nombre: (v.restaurants as unknown as { name: string } | null)?.name ?? null,
    maxMesas:
      v.max_tables ?? (v.restaurants as unknown as { max_tables: number } | null)?.max_tables ?? 4,
  }))

  const zonasAbiertas = new Set(sedes.map((v) => v.zona))

  const { data: pool } = await admin.from('v_matching_pool').select('*').eq('event_id', eventoId)

  const ids = (pool ?? []).map((p) => p.profile_id).filter((id): id is string => id != null)

  const { data: perfiles } = await admin
    .from('profiles')
    .select('id, display_name, full_name')
    .in('id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000'])

  // Tres meses. Quien cenó con alguien en mayo no vuelve a coincidir hasta
  // agosto: es lo que hace que la siguiente mesa sea gente nueva.
  //
  // Empezó en seis y se bajó a tres a propósito, para ver qué pasa: con
  // poca gente, seis meses de veto agota el pool y deja mesas sin armar.
  // Es el número que hay que vigilar cuando crezca la base.
  const MESES_SIN_REPETIR = 3
  const { data: encuentros } = await admin
    .from('pair_encounters')
    .select('profile_a, profile_b')
    .gt(
      'last_met_at',
      new Date(Date.now() - MESES_SIN_REPETIR * 30 * 86400_000).toISOString(),
    )

  const { data: exclusiones } = await admin.from('exclusions').select('profile_a, profile_b')

  const vetos = new Map<string, Set<string>>()
  for (const { profile_a, profile_b } of [...(encuentros ?? []), ...(exclusiones ?? [])]) {
    if (!vetos.has(profile_a)) vetos.set(profile_a, new Set())
    if (!vetos.has(profile_b)) vetos.set(profile_b, new Set())
    vetos.get(profile_a)!.add(profile_b)
    vetos.get(profile_b)!.add(profile_a)
  }

  const nombreDe = new Map(
    (perfiles ?? []).map((p) => [p.id, p.display_name || p.full_name?.split(' ')[0] || '—']),
  )

  const personas: Persona[] = (pool ?? []).map((p) => ({
    profileId: p.profile_id as string,
    bookingId: p.booking_id as string,
    nombre: nombreDe.get(p.profile_id as string) ?? '—',
    edad: p.age,
    genero: p.gender,
    arraigo: p.rootedness,
    sector: p.industry,
    empresa: p.employer_key,
    energia: p.social_energy,
    tramoGasto: p.budget_tier,
    intereses: p.interests ?? [],
    temas: p.conversation_topics ?? [],
    idiomas: p.languages ?? ['es'],
    // Solo las que aceptó Y abrimos: quien acepta una zona que no se abre
    // esta noche es, para este reparto, alguien que no la acepta.
    zonas: (p.zones ?? []).filter((z: string) => zonasAbiertas.has(z)),
    dietas: p.dietary ?? [],
    vetados: vetos.get(p.profile_id as string) ?? new Set<string>(),
  }))

  return { personas, sedes, porMesa: evento?.seats_per_table ?? 6 }
}
