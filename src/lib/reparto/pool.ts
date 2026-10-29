import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/supabase/database.types'

import { todasLasFilas } from '@/lib/todas-las-filas'

import { historialDeMesas } from './historial'
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
  /**
   * Qué se come ahí y cuánto cuesta, para poder elegir sitio por la mesa.
   *
   * Michael, 17-10: «el sitio se elige por lo que come la mesa». Hasta hoy
   * se elegía por zona y aforo, y los dos datos estaban guardados sin que
   * nadie los leyera: de los locales activos, seis tienen cocinas puestas y
   * ocho tienen tramo.
   */
  cocinas: string[]
  tramo: number | null
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
    .select('seats_per_table, format, starts_at')
    .eq('id', eventoId)
    .maybeSingle()

  const { data: sedesRaw } = await admin
    .from('event_venues')
    .select('zone_slug, restaurant_id, max_tables, restaurants(name, max_tables, is_active, formats, noise_level, address, contact_name, contact_phone, cuisines, budget_tier), zones(name)')
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
    cuisines: string[] | null
    budget_tier: number | null
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

  // `restaurant_id` es nulo mientras el sitio no se ha elegido —eso es lo
  // normal ahora—, y una sede sin sitio no es asignable: no se puede sentar a
  // nadie ahí. Se filtra aquí y no en el tipo para que la zona siga abierta.
  const sedes: Sede[] = (sedesRaw ?? [])
    .filter((v) => v.restaurant_id != null && puedeRecibir(v.restaurants as unknown as Local | null))
    .map((v) => ({
      zona: v.zone_slug,
      zonaNombre: (v.zones as unknown as { name: string } | null)?.name ?? v.zone_slug,
      restaurantId: v.restaurant_id as string,
      nombre: (v.restaurants as unknown as Local | null)?.name ?? null,
      cocinas: ((v.restaurants as unknown as Local | null)?.cuisines ?? []) as string[],
      tramo: (v.restaurants as unknown as Local | null)?.budget_tier ?? null,
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

  // El nombre de la empresa sin normalizar, solo para enseñarlo.
  const { data: rasgosTexto } = await admin
    .from('profile_traits')
    .select('profile_id, employer')
    .in('profile_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000'])

  const empresaTextoDe = new Map((rasgosTexto ?? []).map((r) => [r.profile_id, r.employer]))

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
  /**
   * LAS PAREJAS DE ESTA GENTE, no la tabla entera.
   *
   * `pair_encounters` crece al cuadrado: cada cena de seis añade quince
   * filas, y no se borra ninguna porque el término de novedad mira toda la
   * historia. Leerla entera en cada reparto era pedir la historia del club
   * completo para sentar a treinta personas, y además PostgREST corta en
   * mil filas sin avisar: pasadas unas sesenta y siete mesas el veto habría
   * empezado a leer solo una parte y a sentar junta a gente que no debe
   * coincidir, sin que fallara nada.
   *
   * Las dos cosas se arreglan con la misma idea, y es que `vetados` y
   * `conocidos` SOLO se preguntan entre gente de la misma mesa
   * —`repartir.ts:263` y `:531`— y toda mesa sale de este pool. O sea que
   * las únicas parejas que importan son las que tienen a los dos dentro.
   *
   * Y como la tabla guarda cada pareja una sola vez, si los dos están en el
   * pool entonces el que esté en `profile_a` también lo está: preguntando
   * por `profile_a` no se escapa ninguna.
   *
   * Así la consulta deja de depender del tamaño del club y pasa a depender
   * del de la fecha. Por trozos de ids por la URL, y por tramos dentro de
   * cada trozo por el tope de las mil: son dos topes distintos y hacen
   * falta los dos.
   */
  const enElPool = new Set(ids)
  const POR_TROZO_DE_IDS = 150

  async function parejasDe<T extends { profile_a: string; profile_b: string }>(
    tabla: 'pair_encounters' | 'exclusions',
    columnas: string,
  ): Promise<T[]> {
    const salida: T[] = []
    for (let i = 0; i < ids.length; i += POR_TROZO_DE_IDS) {
      const trozo = ids.slice(i, i + POR_TROZO_DE_IDS)
      const filas = await todasLasFilas<T>((desde, hasta) => admin
        .from(tabla)
        .select(columnas)
        .in('profile_a', trozo)
        .order('profile_a')
        .order('profile_b')
        .range(desde, hasta) as never)
      // Y de esas, las que tienen al otro también dentro.
      salida.push(...filas.filter((f) => enElPool.has(f.profile_b)))
    }
    return salida
  }

  const todos = ids.length
    ? await parejasDe<{ profile_a: string; profile_b: string; last_met_at: string }>(
      'pair_encounters', 'profile_a, profile_b, last_met_at')
    : []

  const corte = Date.now() - MESES_SIN_REPETIR * 30 * 86400_000
  const encuentros = todos.filter((e) => new Date(e.last_met_at).getTime() > corte)

  const exclusiones = ids.length
    ? await parejasDe<{ profile_a: string; profile_b: string }>('exclusions', 'profile_a, profile_b')
    : []

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

  const vetos = emparejar([...encuentros, ...exclusiones])
  const yaSeConocen = emparejar(todos)

  const nombreDe = new Map(
    (perfiles ?? []).map((p) => [p.id, p.display_name || p.full_name?.split(' ')[0] || '—']),
  )

  /**
   * Dónde se ha sentado ya cada uno, y cuántas veces. Michael, 28-10.
   *
   * La cuenta vive en `historialDeMesas` y no aquí porque el panel la pide
   * también por otro camino, sin pasar por `Persona`.
   */
  const { cenasDe, localesRecientesDe } = await historialDeMesas(
    admin,
    ids,
    evento?.starts_at ? Date.parse(evento.starts_at) : Date.now(),
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
    empresaTexto: empresaTextoDe.get(p.profile_id as string) ?? p.employer_key,
    energia: p.social_energy,
    // Si bebe y cuanto. Lo que BEBE —`drinks`— no sube a la vista: eso
    // elige sitio y lo lee el panel aparte, no reparte.
    copas: p.drink_level,
    tramoGasto: p.budget_tier,
    intereses: p.interests ?? [],
    temas: p.conversation_topics ?? [],
    idiomas: p.languages ?? ['es'],
    /**
     * TODAS LAS ZONAS QUE ESTA FECHA ABRIÓ.
     *
     * Era «las que aceptó Y abrimos», y eso convertía las zonas declaradas en
     * un candado por mesa. Pero la zona es de la FECHA, no de la persona: la
     * pantalla de reservar enseña «Chacao o Los Palos Grandes» antes de
     * apuntarse, con esas palabras, así que quien se apunta acepta las dos.
     * Si ya las había declarado, mejor; si no, se las da el apuntarse.
     *
     * Lo que provocaba, el viernes 16: la mesa 02 quedaba clavada en Los
     * Palos Grandes por dos de sus seis —Abel y Mónica, que no habían marcado
     * Chacao— y la 03 por otros dos. Doce personas atrapadas en una zona SIN
     * LOCAL mientras Chacao tenía tres, y el panel diciendo «falta el sitio»
     * sin salida. Y la mesa 04 salía «sin zona en común» con cinco personas
     * que podían cenar juntas perfectamente.
     *
     * Michael lo dijo dos veces antes de que yo lo entendiera: el cupo y la
     * zona son decisiones nuestras de logística, no filtros sobre la gente.
     * El local se consigue; a la gente no se la deja sin mesa por un barrio.
     *
     * No se pierde nada de lo declarado: `zonasAbiertas` ya limita a lo que
     * de verdad hay esta noche, y fuera de este reparto las zonas de cada uno
     * siguen siendo suyas —deciden a qué fechas se le avisa—.
     */
    zonas: [...zonasAbiertas],
    dietas: p.dietary ?? [],
    vetados: vetos.get(p.profile_id as string) ?? new Set<string>(),
    conocidos: yaSeConocen.get(p.profile_id as string) ?? new Set<string>(),
    localesRecientes: localesRecientesDe.get(p.profile_id as string) ?? new Set<string>(),
    cenas: cenasDe.get(p.profile_id as string) ?? 0,
  }))

  return { personas, sedes, zonas, porMesa: evento?.seats_per_table ?? 6 }
}
