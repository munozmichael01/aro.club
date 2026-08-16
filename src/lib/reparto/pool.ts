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
  /** Los sitios ASIGNABLES: los que ya están elegidos y pueden recibir. */
  sedes: Sede[]
  /**
   * Las zonas que abre la fecha, tengan sitio o no.
   *
   * No es lo mismo que las sedes: una zona abierta sin sitio decidido sigue
   * siendo una zona donde puede caer una mesa. Confundirlas hacía que el
   * reparto se negara a correr —«esta fecha no tiene ninguna zona abierta»—
   * justo cuando lo que hace falta es que corra y diga dónde falta sitio.
   */
  zonas: { slug: string; nombre: string }[]
  porMesa: number
}

export async function construirPool(
  admin: SupabaseClient<Database>,
  eventoId: string,
): Promise<Pool> {
  const { data: evento } = await admin
    .from('events')
    .select('seats_per_table, format')
    .eq('id', eventoId)
    .maybeSingle()

  const { data: sedesRaw } = await admin
    .from('event_venues')
    .select('zone_slug, restaurant_id, max_tables, restaurants(name, max_tables, is_active, formats, noise_level, address, contact_name, contact_phone), zones(name)')
    .eq('event_id', eventoId)

  type Local = {
    name: string
    max_tables: number
    is_active: boolean
    formats: string[] | null
    noise_level: number | null
    address: string | null
    contact_name: string | null
    contact_phone: string | null
  }

  const formato = evento?.format ?? 'dinner'
  const esCena = ['dinner', 'foodie_dinner', 'women_dinner'].includes(formato)

  /**
   * Un sitio abierto para una fecha no basta: tiene que poder recibirla. Sin
   * esto, abrir una zona con un local de solo drinks sentaba una cena en un
   * bar, y un sitio desactivado seguia recibiendo mesas hasta que alguien se
   * acordara de quitarlo de la fecha.
   *
   * El ruido 3 no sirve para cenas: es la unica regla del local que arruina
   * la mesa entera aunque todo lo demas cuadre.
   */
  const puedeRecibir = (l: Local | null) => {
    if (!l) return false
    if (!l.is_active) return false
    if (!(l.formats ?? []).includes(formato)) return false
    if (esCena && l.noise_level === 3) return false
    // Un sitio sin direccion ni telefono no se le puede dar a nadie: la
    // direccion va en Mi mesa y el telefono es a quien se llama esa noche.
    if (!l.address || !l.contact_phone) return false
    return true
  }

  const sedes: Sede[] = (sedesRaw ?? [])
    .filter((v) => puedeRecibir(v.restaurants as unknown as Local | null))
    .map((v) => ({
      zona: v.zone_slug,
      zonaNombre: (v.zones as unknown as { name: string } | null)?.name ?? v.zone_slug,
      restaurantId: v.restaurant_id,
      nombre: (v.restaurants as unknown as Local | null)?.name ?? null,
      maxMesas:
        v.max_tables ?? (v.restaurants as unknown as Local | null)?.max_tables ?? 4,
    }))

  // Las zonas abiertas son las de la FECHA, tengan sitio o no.
  //
  // Salían de `sedes`, que es la lista de sitios asignables, así que una zona
  // sin sitio decidido todavía —lo normal ahora, porque el sitio se elige
  // cuando se sabe cuánta gente hay— dejaba de existir para el reparto: sus
  // apuntados caían a la espera como si no aceptaran ninguna zona. Y eso lee
  // como «no hay gente para una mesa» cuando lo que pasa es «falta elegir
  // dónde». La mesa se arma igual y sale marcada: falta el sitio.
  const zonasAbiertas = new Set(
    (sedesRaw ?? []).map((v) => v.zone_slug).filter((z): z is string => z != null),
  )

  // Con su nombre, que no sale de las sedes: una zona sin sitio elegido no
  // tiene sede, y el aviso «falta elegir sitio en mercedes» enseñaba el slug.
  const zonas = [...zonasAbiertas].map((slug) => ({
    slug,
    nombre:
      ((sedesRaw ?? []).find((v) => v.zone_slug === slug)?.zones as unknown as
        { name: string } | null)?.name ?? slug,
  }))

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
  // Todos los encuentros, con su fecha. Los de los últimos tres meses son
  // veto; los demás siguen contando para la novedad, que es lo que mide si
  // la mesa es gente nueva de verdad.
  const { data: todos } = await admin
    .from('pair_encounters')
    .select('profile_a, profile_b, last_met_at')

  const corte = Date.now() - MESES_SIN_REPETIR * 30 * 86400_000
  const encuentros = (todos ?? []).filter((e) => new Date(e.last_met_at).getTime() > corte)

  const { data: exclusiones } = await admin.from('exclusions').select('profile_a, profile_b')

  const emparejar = (filas: { profile_a: string; profile_b: string }[]) => {
    const m = new Map<string, Set<string>>()
    for (const { profile_a, profile_b } of filas) {
      if (!m.has(profile_a)) m.set(profile_a, new Set())
      if (!m.has(profile_b)) m.set(profile_b, new Set())
      m.get(profile_a)!.add(profile_b)
      m.get(profile_b)!.add(profile_a)
    }
    return m
  }

  const vetos = emparejar([...encuentros, ...(exclusiones ?? [])])
  const yaSeConocen = emparejar(todos ?? [])

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
    conocidos: yaSeConocen.get(p.profile_id as string) ?? new Set<string>(),
  }))

  return { personas, sedes, zonas, porMesa: evento?.seats_per_table ?? 6 }
}
