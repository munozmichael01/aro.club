import { NextResponse } from 'next/server'
import { z } from 'zod'

import { PESOS, repartir, roturas, evaluacion, desglose, resumen, zonasDe } from '@/lib/reparto/repartir'
import { exigirOps } from '@/lib/ops'
import { construirPool } from '@/lib/reparto/pool'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * El reparto PROPONE. Una persona confirma (HANDOFF-4 §4.2).
 *
 * Por eso la propuesta se guarda en `matching_runs` y no se materializa en
 * `dinner_tables` ni `table_members` hasta publicar. No es un matiz: el
 * trigger de `table_members` registra los pares en `pair_encounters`, así
 * que crear las mesas al proponer haría que dos personas figuren como
 * "ya se vieron" por una cena que nadie confirmó y que puede no ocurrir.
 */

const cuerpo = z.object({
  eventoId: z.string().uuid(),
  pesos: z
    .object({
      cohesion: z.number(),
      sector: z.number(),
      arraigo: z.number(),
      energia: z.number(),
      novedad: z.number(),
    })
    .optional(),
})

/**
 * El estado actual: la próxima fecha, quién está apuntado y la última
 * propuesta sin publicar. El panel lo lee de aquí en vez de traerse su
 * propia idea de cuánta gente hay.
 */
export async function GET(request: Request) {
  const actor = await exigirOps()
  if (!actor) return new NextResponse(null, { status: 404 })

  const admin = createAdminClient()

  // Cuál se reparte. Sin decir nada, la siguiente por fecha —que es lo que
  // hacía y sigue valiendo para el caso normal—; con `eventoId`, esa. Con
  // tres fechas abiertas a la vez, quedarse siempre con la primera dejaba las
  // otras dos sin forma de tocarlas desde el panel.
  const pedido = new URL(request.url).searchParams.get('eventoId')

  const consulta = admin
    .from('events')
    .select('id, starts_at, booking_closes_at, seats_per_table, status, format, restaurants!events_restaurant_id_fkey(name)')

  const { data: evento } = pedido
    ? await consulta.eq('id', pedido).maybeSingle()
    : await consulta
        .in('status', ['draft', 'open', 'locked', 'matched'])
        .order('starts_at', { ascending: true })
        .limit(1)
        .maybeSingle()

  if (!evento) return NextResponse.json({ evento: null })

  const { data: pool } = await admin
    .from('v_matching_pool')
    .select('profile_id')
    .eq('event_id', evento.id)

  const { count: reservas } = await admin
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', evento.id)
    .eq('status', 'confirmed')

  // Los sectores viajan por codigo estable. La etiqueta vive en las
  // opciones de la pregunta y se resuelve ahi, igual que en Mi mesa: un
  // mapa aqui seria un segundo catalogo que se desincroniza.
  const { data: preguntaSector } = await admin
    .from('questions')
    .select('options, questionnaire_versions!inner(is_active)')
    .eq('key', 'sector')
    .eq('questionnaire_versions.is_active', true)
    .maybeSingle()

  const etiquetaDe = new Map(
    ((preguntaSector?.options ?? []) as { value: string; label: string }[]).map((o) => [
      o.value,
      o.label,
    ]),
  )

  const { data: corrida } = await admin
    .from('matching_runs')
    .select('id, proposal, unmatched, avg_score, is_published, created_at')
    .eq('event_id', evento.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Las sedes abiertas, para que el panel pueda ofrecer el cambio de sitio
  // sin inventarse candidatos.
  const { data: sedesRaw } = await admin
    .from('event_venues')
    .select('zone_slug, restaurant_id, restaurants(name), zones(name)')
    .eq('event_id', evento.id)

  return NextResponse.json({
    sedes: (sedesRaw ?? []).map((v) => ({
      zona: v.zone_slug,
      zonaNombre: (v.zones as unknown as { name: string } | null)?.name ?? v.zone_slug,
      restaurantId: v.restaurant_id,
      nombre: (v.restaurants as unknown as { name: string } | null)?.name ?? null,
    })),
    evento: {
      id: evento.id,
      empiezaEn: evento.starts_at,
      cierraEn: evento.booking_closes_at,
      estado: evento.status,
      // El formato manda el vocabulario: una caminata tiene grupos y punto de
      // encuentro, no mesas y restaurante. La pantalla no puede deducirlo.
      formato: evento.format,
      // Hoy hay un restaurante por fecha. Con el modelo de zonas sera uno
      // por zona, y esto pasara a salir de la mesa.
      restaurante:
        (evento.restaurants as unknown as { name: string } | null)?.name ?? null,
    },
    apuntados: reservas ?? 0,
    // Apuntados que NO entran al reparto: sin verificar o sin rasgos. Es la
    // diferencia entre quien se apuntó y quien puede sentarse.
    fueraDelPool: Math.max(0, (reservas ?? 0) - (pool ?? []).length),
    corrida: corrida
      ? {
          id: corrida.id,
          publicada: corrida.is_published,
          propuesta: ((corrida.proposal ?? []) as unknown as {
            integrantes: { sector: string | null }[]
          }[]).map((m) => ({
            ...m,
            integrantes: (m.integrantes ?? []).map((p) => ({
              ...p,
              sector: p.sector ? (etiquetaDe.get(p.sector) ?? p.sector) : null,
            })),
          })),
          espera: corrida.unmatched,
          media: corrida.avg_score,
        }
      : null,
  })
}

export async function POST(request: Request) {
  const actor = await exigirOps()
  if (!actor) return new NextResponse(null, { status: 404 })

  const parsed = cuerpo.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Petición inválida.' }, { status: 400 })
  }

  const { eventoId } = parsed.data
  const pesos = parsed.data.pesos ?? PESOS
  const admin = createAdminClient()
  const arranque = Date.now()

  const { data: evento } = await admin
    .from('events')
    .select('id')
    .eq('id', eventoId)
    .maybeSingle()

  if (!evento) return NextResponse.json({ error: 'Esa fecha no existe.' }, { status: 404 })

  // El mismo pool que usa retocar la propuesta. Con dos construcciones, una
  // validaria contra datos distintos de los que se usaron para proponer.
  const pool = await construirPool(admin, eventoId)
  const sedes = pool.sedes

  // Las mesas YA PUBLICADAS no se tocan. Esa gente sabe con quién cena y
  // dónde, así que sale del pool: volver a repartir mueve al resto, no a
  // ellos. Es lo que permite ir cerrando grupos en tandas.
  const { data: yaSentados } = await admin
    .from('dinner_tables')
    .select(
      'id, table_number, restaurant_id, score, restaurants!dinner_tables_restaurant_id_fkey(name, zone_slug), table_members(profile_id, booking_id, profiles(display_name, full_name))',
    )
    .eq('event_id', eventoId)
    .order('table_number')

  // Los rasgos de quien ya está sentado. Sin esto la mesa publicada salía
  // con "—, null" y un rango de edades "0–0": la que YA está cerrada era la
  // que peor se veía.
  const idsCerrados = (yaSentados ?? []).flatMap((t) =>
    ((t.table_members ?? []) as unknown as { profile_id: string }[]).map((m) => m.profile_id),
  )
  const { data: rasgosCerrados } = await admin
    .from('profile_traits')
    .select('profile_id, age, gender, industry, employer')
    .in('profile_id', idsCerrados.length ? idsCerrados : ['00000000-0000-0000-0000-000000000000'])

  const rasgoDe = new Map((rasgosCerrados ?? []).map((r) => [r.profile_id, r]))

  const cerradas = (yaSentados ?? []).map((t) => {
    const miembros = (t.table_members ?? []) as unknown as {
      profile_id: string
      booking_id: string
      profiles: { display_name: string | null; full_name: string | null } | null
    }[]
    const rest = t.restaurants as unknown as { name: string; zone_slug: string | null } | null
    return {
      numero: t.table_number,
      publicada: true,
      zona: rest?.zone_slug ?? null,
      zonasPosibles: rest?.zone_slug ? [rest.zone_slug] : [],
      restaurantId: t.restaurant_id,
      restaurante: rest?.name ?? null,
      puntuacion: t.score ?? 0,
      desglose: {},
      resumen: null,
      roturas: [] as { regla: string; detalle: string }[],
      integrantes: miembros.map((m) => {
        const r = rasgoDe.get(m.profile_id)
        return {
          profileId: m.profile_id,
          bookingId: m.booking_id,
          nombre: m.profiles?.display_name || m.profiles?.full_name?.split(' ')[0] || '—',
          edad: r?.age ?? null,
          genero: r?.gender ?? null,
          empresa: r?.employer ?? null,
          sector: r?.industry ?? null,
        }
      }),
    }
  })

  const sentados = new Set(cerradas.flatMap((m) => m.integrantes.map((i) => i.profileId)))
  const personas = pool.personas.filter((p) => !sentados.has(p.profileId))
  const desdeNumero = cerradas.reduce((n, m) => Math.max(n, m.numero), 0)

  // ZONAS, no sitios. Se comprobaban los sitios elegidos, así que una fecha
  // con zonas abiertas y el sitio todavía por decidir —que es lo normal, el
  // sitio se elige cuando se sabe cuánta gente hay— no se podía repartir. Y
  // repartir es justo lo que dice cuántas mesas hacen falta en cada zona, que
  // es lo que hace falta saber para elegir bien el sitio.
  if (!pool.zonas.length) {
    return NextResponse.json(
      { error: 'Esta fecha no abre ninguna zona. Abre al menos una antes de repartir.' },
      { status: 409 },
    )
  }

  const r = repartir(personas, pool.porMesa, pesos)

  // Cada mesa cae en una de las zonas que aceptan los seis, y ahí se le da
  // sitio. El aforo se respeta: si Cardenal aguanta dos mesas, la tercera
  // va al siguiente sitio de esa zona.
  const ocupacion = new Map<string, number>()
  // Lo ya publicado ocupa aforo: si Cardenal aguanta dos y ya hay una mesa
  // cerrada allí, solo cabe una más.
  for (const m of cerradas) {
    if (m.restaurantId) ocupacion.set(m.restaurantId, (ocupacion.get(m.restaurantId) ?? 0) + 1)
  }
  const sedeDe = (zona: string) => {
    const candidatas = sedes.filter((v) => v.zona === zona)
    for (const v of candidatas) {
      const usadas = ocupacion.get(v.restaurantId) ?? 0
      if (usadas < v.maxMesas) {
        ocupacion.set(v.restaurantId, usadas + 1)
        return { restaurantId: v.restaurantId, nombre: v.nombre }
      }
    }
    return null
  }

  const nombreDeZona = new Map(pool.zonas.map((z) => [z.slug, z.nombre]))
  const nombreZonaDe = (slug: string | null) => (slug ? (nombreDeZona.get(slug) ?? slug) : null)

  const nuevas = r.mesas.map((mesa, i) => {
    const zonasPosibles = zonasDe(mesa)
    // Reparto estable: entre varias zonas válidas, la primera por orden
    // alfabético. Elegir "la que tenga más sitio" haría que el mismo pool
    // diera repartos distintos según en qué orden se procesaran las mesas.
    const zona = zonasPosibles[0] ?? null
    const sede = zona ? sedeDe(zona) : null
    return {
    numero: desdeNumero + i + 1,
    publicada: false,
    zona,
    zonasPosibles,
    restaurantId: sede?.restaurantId ?? null,
    restaurante: sede?.nombre ?? null,
    puntuacion: Number(r.puntuaciones[i].toFixed(3)),
    desglose: desglose(mesa),
    // Lo que comparten, para poder decidir con criterio y no solo con un
    // numero. Va en la propuesta y no se recalcula en la pantalla.
    resumen: resumen(mesa),
    roturas: roturas(mesa),
    // Las siete, cumplidas y rotas. El panel las enseña todas y con solo las
    // rotas tendria que volver a contarlas por su cuenta.
    reglas: evaluacion(mesa, zona, nombreZonaDe(zona)),
    // La aritmética del panel sale de aquí; nada se escribe a mano.
    integrantes: mesa.map((p) => ({
      profileId: p.profileId,
      bookingId: p.bookingId,
      nombre: p.nombre,
      edad: p.edad,
      genero: p.genero,
      empresa: p.empresaTexto || p.empresa,
      sector: p.sector,
    })),
    }
  })

  // Las cerradas van primero: el panel enseña la foto completa de la fecha,
  // no solo lo que queda por decidir.
  const propuesta = [...cerradas, ...nuevas]

  // Una mesa sin sitio no se puede publicar. Pero «sin sitio» son dos cosas
  // distintas y la salida es distinta en cada una: si no hay ninguno elegido,
  // hay que elegirlo; si los que hay están llenos, hay que añadir otro. Un
  // solo mensaje para las dos mandaba a mirar donde no era.
  for (const m of nuevas) {
    if (m.restaurantId) continue

    if (!m.zona) {
      m.roturas = [...m.roturas, { regla: 'sede', detalle: 'sin zona común' }]
      continue
    }

    const cuantos = sedes.filter((v) => v.zona === m.zona).length
    const donde = nombreDeZona.get(m.zona) ?? m.zona
    m.roturas = [
      ...m.roturas,
      {
        regla: 'sede',
        detalle: cuantos === 0
          ? 'falta elegir sitio en ' + donde
          : 'los sitios de ' + donde + ' ya están llenos: añade otro',
      },
    ]
  }

  const { data: corrida, error: errorCorrida } = await admin
    .from('matching_runs')
    .insert({
      event_id: eventoId,
      algo_version: 'v1',
      weights: pesos,
      pool_size: personas.length,
      tables_created: r.mesas.length,
      avg_score: Number(r.media.toFixed(3)),
      min_score: r.puntuaciones.length ? Number(Math.min(...r.puntuaciones).toFixed(3)) : null,
      runtime_ms: Date.now() - arranque,
      is_published: false,
      unmatched: r.espera.map((p) => ({ profileId: p.profileId, nombre: p.nombre })) as never,
      created_by: actor,
      proposal: propuesta as never,
    })
    .select('id')
    .single()

  if (errorCorrida) {
    console.error('[repartir] no se guardó la corrida', errorCorrida)
    return NextResponse.json({ error: 'No pudimos guardar la propuesta.' }, { status: 500 })
  }

  return NextResponse.json({
    corridaId: corrida.id,
    apuntados: personas.length,
    mesas: r.mesas.length,
    espera: r.espera.length,
    media: Number(r.media.toFixed(3)),
    propuesta,
  })
}
